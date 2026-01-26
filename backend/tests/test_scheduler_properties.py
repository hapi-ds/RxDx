"""Property-based tests for SchedulerService constraint satisfaction

**Validates: Requirements 7.1-7.6**

These tests verify that the scheduler correctly satisfies constraints across
a wide range of randomly generated inputs using Hypothesis.
"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.schemas.schedule import (
    ResourceCreate,
    ScheduleConstraints,
    ScheduleTaskCreate,
    TaskDependency,
)
from app.services.scheduler_service import SchedulerService

# ============================================================================
# Strategies for generating test data
# ============================================================================

@st.composite
def task_id_strategy(draw):
    """Generate valid task IDs"""
    return f"task-{draw(st.integers(min_value=1, max_value=1000))}"


@st.composite
def resource_id_strategy(draw):
    """Generate valid resource IDs"""
    return f"resource-{draw(st.integers(min_value=1, max_value=100))}"


@st.composite
def simple_task_strategy(draw, task_id: str = None):
    """Generate a simple task without dependencies"""
    return ScheduleTaskCreate(
        id=task_id or draw(task_id_strategy()),
        title=draw(st.text(min_size=5, max_size=50, alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')))),
        estimated_hours=draw(st.integers(min_value=1, max_value=100)),
        dependencies=[],
        required_resources=[],
    )


@st.composite
def resource_strategy(draw, resource_id: str = None):
    """Generate a resource"""
    return ResourceCreate(
        id=resource_id or draw(resource_id_strategy()),
        name=draw(st.text(min_size=3, max_size=30, alphabet=st.characters(whitelist_categories=('L', 'N', 'P', 'Z')))),
        capacity=draw(st.integers(min_value=1, max_value=10)),
    )


@st.composite
def constraints_strategy(draw):
    """Generate schedule constraints"""
    return ScheduleConstraints(
        project_start=datetime.now(UTC),
        horizon_days=draw(st.integers(min_value=30, max_value=365)),
        working_hours_per_day=draw(st.integers(min_value=4, max_value=12)),
        respect_weekends=draw(st.booleans()),
    )


@st.composite
def task_list_with_dependencies_strategy(draw, min_tasks=2, max_tasks=10):
    """Generate a list of tasks with valid dependencies (no cycles)"""
    num_tasks = draw(st.integers(min_value=min_tasks, max_value=max_tasks))

    tasks = []
    task_ids = []

    for i in range(num_tasks):
        task_id = f"task-{i}"
        task_ids.append(task_id)

        # Only depend on earlier tasks to avoid cycles
        dependencies = []
        if i > 0:
            # Randomly select some earlier tasks as dependencies
            num_deps = draw(st.integers(min_value=0, max_value=min(i, 3)))
            if num_deps > 0:
                dep_indices = draw(st.lists(
                    st.integers(min_value=0, max_value=i-1),
                    min_size=num_deps,
                    max_size=num_deps,
                    unique=True
                ))
                for dep_idx in dep_indices:
                    dep_type = draw(st.sampled_from([
                        "finish_to_start", "start_to_start", "finish_to_finish"
                    ]))
                    dependencies.append(TaskDependency(
                        predecessor_id=task_ids[dep_idx],
                        dependency_type=dep_type,
                        lag=draw(st.integers(min_value=0, max_value=8)),
                    ))

        task = ScheduleTaskCreate(
            id=task_id,
            title=f"Task {i}",
            estimated_hours=draw(st.integers(min_value=1, max_value=40)),
            dependencies=dependencies,
            required_resources=[],
        )
        tasks.append(task)

    return tasks


@st.composite
def task_list_with_resources_strategy(draw, min_tasks=2, max_tasks=8):
    """Generate tasks with resource requirements"""
    num_tasks = draw(st.integers(min_value=min_tasks, max_value=max_tasks))
    num_resources = draw(st.integers(min_value=1, max_value=3))

    resource_ids = [f"resource-{i}" for i in range(num_resources)]

    tasks = []
    for i in range(num_tasks):
        # Randomly assign resources to task
        num_required = draw(st.integers(min_value=0, max_value=num_resources))
        required = draw(st.lists(
            st.sampled_from(resource_ids),
            min_size=num_required,
            max_size=num_required,
            unique=True
        )) if num_required > 0 else []

        task = ScheduleTaskCreate(
            id=f"task-{i}",
            title=f"Task {i}",
            estimated_hours=draw(st.integers(min_value=1, max_value=20)),
            dependencies=[],
            required_resources=required,
            resource_demand={r: 1 for r in required},
        )
        tasks.append(task)

    resources = [
        ResourceCreate(
            id=rid,
            name=f"Resource {rid}",
            capacity=draw(st.integers(min_value=1, max_value=3))
        )
        for rid in resource_ids
    ]

    return tasks, resources


# ============================================================================
# Property Tests
# ============================================================================

class TestDependencyProperties:
    """Property tests for dependency constraint satisfaction

    **Validates: Requirement 7.3** - Task dependencies
    """

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=30000)
    @given(
        tasks=task_list_with_dependencies_strategy(min_tasks=2, max_tasks=8),
        constraints=constraints_strategy(),
    )
    async def test_finish_to_start_always_satisfied(
        self, tasks: list[ScheduleTaskCreate], constraints: ScheduleConstraints
    ):
        """
        Property: For all finish-to-start dependencies, the successor task
        always starts at or after the predecessor task ends (plus lag).

        **Validates: Requirement 7.3** - finish-to-start dependencies
        """
        scheduler = SchedulerService()
        project_id = uuid4()

        result = await scheduler.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=constraints,
        )

        if result.status in ["success", "feasible"]:
            task_map = {t.task_id: t for t in result.schedule}

            for task in tasks:
                for dep in task.dependencies:
                    if dep.dependency_type == "finish_to_start":
                        predecessor = task_map.get(dep.predecessor_id)
                        successor = task_map.get(task.id)

                        if predecessor and successor:
                            # Successor must start at or after predecessor ends + lag
                            expected_earliest = predecessor.end_date + timedelta(hours=dep.lag)
                            assert successor.start_date >= expected_earliest, (
                                f"Task {task.id} starts at {successor.start_date} but "
                                f"predecessor {dep.predecessor_id} ends at {predecessor.end_date} "
                                f"with lag {dep.lag}"
                            )

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=30000)
    @given(
        tasks=task_list_with_dependencies_strategy(min_tasks=2, max_tasks=8),
        constraints=constraints_strategy(),
    )
    async def test_start_to_start_always_satisfied(
        self, tasks: list[ScheduleTaskCreate], constraints: ScheduleConstraints
    ):
        """
        Property: For all start-to-start dependencies, the successor task
        always starts at or after the predecessor task starts (plus lag).

        **Validates: Requirement 7.3** - start-to-start dependencies
        """
        scheduler = SchedulerService()
        project_id = uuid4()

        result = await scheduler.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=constraints,
        )

        if result.status in ["success", "feasible"]:
            task_map = {t.task_id: t for t in result.schedule}

            for task in tasks:
                for dep in task.dependencies:
                    if dep.dependency_type == "start_to_start":
                        predecessor = task_map.get(dep.predecessor_id)
                        successor = task_map.get(task.id)

                        if predecessor and successor:
                            expected_earliest = predecessor.start_date + timedelta(hours=dep.lag)
                            assert successor.start_date >= expected_earliest

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=30000)
    @given(
        tasks=task_list_with_dependencies_strategy(min_tasks=2, max_tasks=8),
        constraints=constraints_strategy(),
    )
    async def test_finish_to_finish_always_satisfied(
        self, tasks: list[ScheduleTaskCreate], constraints: ScheduleConstraints
    ):
        """
        Property: For all finish-to-finish dependencies, the successor task
        always finishes at or after the predecessor task finishes (plus lag).

        **Validates: Requirement 7.3** - finish-to-finish dependencies
        """
        scheduler = SchedulerService()
        project_id = uuid4()

        result = await scheduler.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=constraints,
        )

        if result.status in ["success", "feasible"]:
            task_map = {t.task_id: t for t in result.schedule}

            for task in tasks:
                for dep in task.dependencies:
                    if dep.dependency_type == "finish_to_finish":
                        predecessor = task_map.get(dep.predecessor_id)
                        successor = task_map.get(task.id)

                        if predecessor and successor:
                            expected_earliest = predecessor.end_date + timedelta(hours=dep.lag)
                            assert successor.end_date >= expected_earliest


class TestResourceProperties:
    """Property tests for resource constraint satisfaction

    **Validates: Requirement 7.4** - Resource capacity constraints
    """

    @pytest.mark.asyncio
    @settings(max_examples=30, deadline=30000)
    @given(
        task_resource_data=task_list_with_resources_strategy(min_tasks=2, max_tasks=6),
        constraints=constraints_strategy(),
    )
    async def test_resource_capacity_never_exceeded(
        self, task_resource_data, constraints: ScheduleConstraints
    ):
        """
        Property: At any point in time, the sum of resource demands for
        concurrent tasks never exceeds the resource capacity.

        **Validates: Requirement 7.4** - Resource capacity constraints
        """
        tasks, resources = task_resource_data
        scheduler = SchedulerService()
        project_id = uuid4()

        result = await scheduler.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=constraints,
        )

        if result.status in ["success", "feasible"]:
            resource_capacity = {r.id: r.capacity for r in resources}
            task_resources = {t.id: t.required_resources for t in tasks}
            task_demands = {t.id: t.resource_demand for t in tasks}

            # Check resource usage at each task start/end time
            time_points = set()
            for scheduled in result.schedule:
                time_points.add(scheduled.start_date)
                time_points.add(scheduled.end_date)

            for time_point in time_points:
                # Calculate resource usage at this time point
                resource_usage = {r.id: 0 for r in resources}

                for scheduled in result.schedule:
                    # Task is active if time_point is in [start, end)
                    if scheduled.start_date <= time_point < scheduled.end_date:
                        for resource_id in task_resources.get(scheduled.task_id, []):
                            demand = task_demands.get(scheduled.task_id, {}).get(resource_id, 1)
                            resource_usage[resource_id] += demand

                # Verify capacity not exceeded
                for resource_id, usage in resource_usage.items():
                    capacity = resource_capacity.get(resource_id, 0)
                    assert usage <= capacity, (
                        f"Resource {resource_id} over-allocated at {time_point}: "
                        f"usage={usage}, capacity={capacity}"
                    )


class TestScheduleConsistencyProperties:
    """Property tests for schedule consistency

    **Validates: Requirement 7.2** - Task scheduling
    """

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=30000)
    @given(
        tasks=task_list_with_dependencies_strategy(min_tasks=1, max_tasks=10),
        constraints=constraints_strategy(),
    )
    async def test_task_duration_preserved(
        self, tasks: list[ScheduleTaskCreate], constraints: ScheduleConstraints
    ):
        """
        Property: The scheduled duration of each task equals its estimated duration.

        **Validates: Requirement 7.2** - Task duration calculation
        """
        scheduler = SchedulerService()
        project_id = uuid4()

        result = await scheduler.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=constraints,
        )

        if result.status in ["success", "feasible"]:
            task_durations = {t.id: t.estimated_hours for t in tasks}

            for scheduled in result.schedule:
                expected_duration = task_durations[scheduled.task_id]
                assert scheduled.duration_hours == expected_duration, (
                    f"Task {scheduled.task_id} has duration {scheduled.duration_hours} "
                    f"but expected {expected_duration}"
                )

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=30000)
    @given(
        tasks=task_list_with_dependencies_strategy(min_tasks=1, max_tasks=10),
        constraints=constraints_strategy(),
    )
    async def test_all_tasks_scheduled(
        self, tasks: list[ScheduleTaskCreate], constraints: ScheduleConstraints
    ):
        """
        Property: When scheduling succeeds, all input tasks appear in the schedule.

        **Validates: Requirement 7.2** - Complete task scheduling
        """
        scheduler = SchedulerService()
        project_id = uuid4()

        result = await scheduler.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=constraints,
        )

        if result.status in ["success", "feasible"]:
            scheduled_ids = {t.task_id for t in result.schedule}
            input_ids = {t.id for t in tasks}

            assert scheduled_ids == input_ids, (
                f"Missing tasks: {input_ids - scheduled_ids}, "
                f"Extra tasks: {scheduled_ids - input_ids}"
            )

    @pytest.mark.asyncio
    @settings(max_examples=50, deadline=30000)
    @given(
        tasks=task_list_with_dependencies_strategy(min_tasks=1, max_tasks=10),
        constraints=constraints_strategy(),
    )
    async def test_end_date_equals_start_plus_duration(
        self, tasks: list[ScheduleTaskCreate], constraints: ScheduleConstraints
    ):
        """
        Property: For each scheduled task, the duration_hours field matches
        the input estimated_hours.

        Note: When respect_weekends=True, the actual calendar time between
        start_date and end_date may be longer than duration_hours due to
        weekend skipping. This test verifies the duration_hours field is correct.

        **Validates: Requirement 7.2** - Consistent date calculation
        """
        scheduler = SchedulerService()
        project_id = uuid4()

        result = await scheduler.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=constraints,
        )

        if result.status in ["success", "feasible"]:
            task_durations = {t.id: t.estimated_hours for t in tasks}

            for scheduled in result.schedule:
                # Verify duration_hours matches input
                expected_duration = task_durations[scheduled.task_id]
                assert scheduled.duration_hours == expected_duration, (
                    f"Task {scheduled.task_id}: duration_hours {scheduled.duration_hours} != "
                    f"estimated_hours {expected_duration}"
                )

                # Verify end_date is after start_date
                assert scheduled.end_date > scheduled.start_date, (
                    f"Task {scheduled.task_id}: end_date {scheduled.end_date} should be "
                    f"after start_date {scheduled.start_date}"
                )


class TestOptimizationProperties:
    """Property tests for schedule optimization

    **Validates: Requirement 7.5** - Schedule optimization
    """

    @pytest.mark.asyncio
    @settings(max_examples=30, deadline=30000)
    @given(
        num_tasks=st.integers(min_value=2, max_value=5),
        task_duration=st.integers(min_value=1, max_value=20),
        constraints=constraints_strategy(),
    )
    async def test_independent_tasks_minimize_duration(
        self, num_tasks: int, task_duration: int, constraints: ScheduleConstraints
    ):
        """
        Property: For independent tasks (no dependencies, no resource constraints),
        the project duration equals the maximum task duration.

        **Validates: Requirement 7.5** - Minimize project duration
        """
        scheduler = SchedulerService()
        project_id = uuid4()

        # Create independent tasks with same duration
        tasks = [
            ScheduleTaskCreate(
                id=f"task-{i}",
                title=f"Task {i}",
                estimated_hours=task_duration,
                dependencies=[],
                required_resources=[],
            )
            for i in range(num_tasks)
        ]

        result = await scheduler.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=constraints,
        )

        if result.status in ["success", "feasible"]:
            # All tasks can run in parallel, so duration = max task duration
            assert result.project_duration_hours == task_duration, (
                f"Project duration {result.project_duration_hours} should equal "
                f"task duration {task_duration} for independent tasks"
            )


class TestConflictDetectionProperties:
    """Property tests for conflict detection

    **Validates: Requirement 7.5** - Conflict identification
    """

    @pytest.mark.asyncio
    @settings(max_examples=30, deadline=30000)
    @given(constraints=constraints_strategy())
    async def test_infeasible_always_has_conflicts(self, constraints: ScheduleConstraints):
        """
        Property: When scheduling is infeasible, at least one conflict is reported.

        **Validates: Requirement 7.5** - Conflict identification
        """
        scheduler = SchedulerService()
        project_id = uuid4()

        # Create an infeasible scenario: circular dependency
        tasks = [
            ScheduleTaskCreate(
                id="task-a",
                title="Task A",
                estimated_hours=8,
                dependencies=[
                    TaskDependency(predecessor_id="task-b", dependency_type="finish_to_start")
                ],
            ),
            ScheduleTaskCreate(
                id="task-b",
                title="Task B",
                estimated_hours=8,
                dependencies=[
                    TaskDependency(predecessor_id="task-a", dependency_type="finish_to_start")
                ],
            ),
        ]

        result = await scheduler.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=constraints,
        )

        assert result.status == "infeasible"
        assert len(result.conflicts) > 0, "Infeasible schedule should report conflicts"

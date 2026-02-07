"""Property-based tests for sprint boundary constraints in SchedulerService

**Validates: Requirements 4.4 - Sprint Boundary Constraints**

These tests verify that tasks assigned to sprints are always scheduled within
sprint boundaries, regardless of input variations.
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
)
from app.services.scheduler_service import SchedulerService


# Strategy for generating valid sprint date ranges
@st.composite
def sprint_date_range(draw):
    """Generate a valid sprint with start and end dates"""
    # Start date between Jan 1, 2024 and Dec 1, 2024
    start_day = draw(st.integers(min_value=1, max_value=335))
    start_date = datetime(2024, 1, 1, 9, 0, 0, tzinfo=UTC) + timedelta(days=start_day)

    # Sprint duration between 1 and 4 weeks
    sprint_duration_days = draw(st.integers(min_value=7, max_value=28))
    end_date = start_date + timedelta(days=sprint_duration_days)

    sprint_id = f"sprint_{draw(st.integers(min_value=1, max_value=100))}"

    return {
        "sprint_id": sprint_id,
        "start_date": start_date,
        "end_date": end_date,
        "duration_days": sprint_duration_days,
    }


# Strategy for generating tasks that fit within a sprint
@st.composite
def sprint_task(draw, sprint_info):
    """Generate a task that should fit within the given sprint"""
    # Calculate max hours that fit in sprint (with some buffer)
    sprint_duration_days = sprint_info["duration_days"]
    # Assume 5 working days per week, 8 hours per day
    max_hours = int(sprint_duration_days * 8 * (5 / 7) * 0.8)  # 80% of capacity

    # Task duration between 4 and max_hours
    estimated_hours = draw(st.integers(min_value=4, max_value=max(4, max_hours)))

    task_id = f"task_{draw(st.integers(min_value=1, max_value=1000))}"

    return ScheduleTaskCreate(
        id=task_id,
        title=f"Sprint Task {task_id}",
        estimated_hours=estimated_hours,
        sprint_id=sprint_info["sprint_id"],
        sprint_start_date=sprint_info["start_date"],
        sprint_end_date=sprint_info["end_date"],
        skills_needed=draw(
            st.lists(
                st.sampled_from(["python", "backend", "frontend", "testing"]),
                min_size=1,
                max_size=2,
                unique=True,
            )
        ),
    )


# Strategy for generating resources
@st.composite
def resource_pool(draw):
    """Generate a pool of resources with various skills"""
    num_resources = draw(st.integers(min_value=2, max_value=5))
    resources = []

    all_skills = ["python", "backend", "frontend", "testing"]

    for i in range(num_resources):
        # Each resource has 1-3 skills
        skills = draw(
            st.lists(
                st.sampled_from(all_skills), min_size=1, max_size=3, unique=True
            )
        )

        resources.append(
            ResourceCreate(
                id=f"dev{i+1}",
                name=f"Developer {i+1}",
                capacity=draw(st.integers(min_value=1, max_value=2)),
                skills=skills,
                lead=(i == 0),  # First resource is lead
            )
        )

    return resources


@pytest.fixture
def scheduler_service():
    """Create a fresh scheduler service for each test"""
    return SchedulerService()


class TestSprintBoundaryProperties:
    """Property-based tests for sprint boundary constraints"""

    @pytest.mark.asyncio
    @given(
        sprint_info=sprint_date_range(),
        num_tasks=st.integers(min_value=1, max_value=3),
        seed=st.integers(min_value=0, max_value=1000),
    )
    @settings(max_examples=20, deadline=10000)
    async def test_property_sprint_tasks_scheduled_within_boundaries(
        self, sprint_info, num_tasks, seed
    ):
        """
        Property: All tasks assigned to a sprint MUST be scheduled within sprint boundaries.

        For any valid sprint with start_date and end_date, and any set of tasks
        assigned to that sprint that fit within its capacity, the scheduler must
        schedule all tasks such that:
        - task.start_date >= sprint.start_date
        - task.end_date <= sprint.end_date
        """
        scheduler_service = SchedulerService()  # Create inside test
        project_id = uuid4()

        # Generate tasks that fit within the sprint
        tasks = []
        for i in range(num_tasks):
            task = ScheduleTaskCreate(
                id=f"task_{seed}_{i}",
                title=f"Sprint Task {i}",
                estimated_hours=min(
                    16, int(sprint_info["duration_days"] * 8 * (5 / 7) * 0.5)
                ),  # Half of sprint capacity
                sprint_id=sprint_info["sprint_id"],
                sprint_start_date=sprint_info["start_date"],
                sprint_end_date=sprint_info["end_date"],
                skills_needed=["python"],
            )
            tasks.append(task)

        # Generate resources
        resources = [
            ResourceCreate(
                id="dev1",
                name="Developer 1",
                capacity=1,
                skills=["python", "backend"],
                lead=True,
            ),
            ResourceCreate(
                id="dev2",
                name="Developer 2",
                capacity=1,
                skills=["python", "frontend"],
                lead=False,
            ),
        ]

        constraints = ScheduleConstraints(
            project_start=sprint_info["start_date"] - timedelta(days=7),
            horizon_days=365,
            working_hours_per_day=8,
            respect_weekends=True,
        )

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=constraints,
        )

        # If scheduling succeeds, all tasks must be within sprint boundaries
        if result.status in ["success", "feasible"]:
            assert len(result.schedule) == num_tasks

            for scheduled_task in result.schedule:
                # Property: Task starts at or after sprint start
                assert (
                    scheduled_task.start_date >= sprint_info["start_date"]
                ), f"Task {scheduled_task.task_id} starts before sprint start"

                # Property: Task ends at or before sprint end
                assert (
                    scheduled_task.end_date <= sprint_info["end_date"]
                ), f"Task {scheduled_task.task_id} ends after sprint end"

    @pytest.mark.asyncio
    @given(
        sprint_duration_days=st.integers(min_value=7, max_value=28),
        task_duration_multiplier=st.floats(min_value=1.1, max_value=3.0),
        seed=st.integers(min_value=0, max_value=1000),
    )
    @settings(max_examples=15, deadline=10000)
    async def test_property_task_too_long_for_sprint_fails(
        self, sprint_duration_days, task_duration_multiplier, seed
    ):
        """
        Property: Tasks that cannot fit within sprint duration MUST fail with conflict.

        For any sprint with duration D, and any task with estimated_hours > D,
        the scheduler must return status="infeasible" with a sprint_capacity_exceeded conflict.
        """
        scheduler_service = SchedulerService()  # Create inside test
        project_id = uuid4()

        sprint_start = datetime(2024, 1, 1, 9, 0, 0, tzinfo=UTC)
        sprint_end = sprint_start + timedelta(days=sprint_duration_days)

        # Calculate sprint capacity in hours (5 working days per week, 8 hours per day)
        sprint_capacity_hours = int(sprint_duration_days * 8 * (5 / 7))

        # Create a task that's definitely too long
        task_hours = int(sprint_capacity_hours * task_duration_multiplier)

        tasks = [
            ScheduleTaskCreate(
                id=f"task_{seed}",
                title="Too Long Task",
                estimated_hours=task_hours,
                sprint_id=f"sprint_{seed}",
                sprint_start_date=sprint_start,
                sprint_end_date=sprint_end,
                skills_needed=["python"],
            ),
        ]

        resources = [
            ResourceCreate(
                id="dev1",
                name="Developer 1",
                capacity=1,
                skills=["python"],
                lead=True,
            ),
        ]

        constraints = ScheduleConstraints(
            project_start=sprint_start,
            horizon_days=365,
            working_hours_per_day=8,
            respect_weekends=True,
        )

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=constraints,
        )

        # Property: Must fail with infeasible status
        assert result.status == "infeasible", (
            f"Expected infeasible status for task ({task_hours}h) "
            f"exceeding sprint capacity ({sprint_capacity_hours}h)"
        )

        # Property: Must have sprint_capacity_exceeded conflict
        assert any(
            c.conflict_type == "sprint_capacity_exceeded" for c in result.conflicts
        ), "Expected sprint_capacity_exceeded conflict"

    @pytest.mark.asyncio
    @given(
        num_sprints=st.integers(min_value=2, max_value=4),
        tasks_per_sprint=st.integers(min_value=1, max_value=2),
        seed=st.integers(min_value=0, max_value=1000),
    )
    @settings(max_examples=15, deadline=10000)
    async def test_property_multiple_sprints_isolated(
        self, num_sprints, tasks_per_sprint, seed
    ):
        """
        Property: Tasks in different sprints are scheduled within their respective boundaries.

        For any set of non-overlapping sprints, tasks assigned to sprint S must be
        scheduled within S's boundaries, independent of other sprints.
        """
        scheduler_service = SchedulerService()  # Create inside test
        project_id = uuid4()

        tasks = []
        sprint_boundaries = {}

        # Create non-overlapping sprints
        base_date = datetime(2024, 1, 1, 9, 0, 0, tzinfo=UTC)

        for sprint_idx in range(num_sprints):
            sprint_id = f"sprint_{seed}_{sprint_idx}"
            sprint_start = base_date + timedelta(days=sprint_idx * 14)  # 2 weeks apart
            sprint_end = sprint_start + timedelta(days=14)

            sprint_boundaries[sprint_id] = {
                "start": sprint_start,
                "end": sprint_end,
            }

            # Create tasks for this sprint
            for task_idx in range(tasks_per_sprint):
                tasks.append(
                    ScheduleTaskCreate(
                        id=f"task_{seed}_{sprint_idx}_{task_idx}",
                        title=f"Sprint {sprint_idx} Task {task_idx}",
                        estimated_hours=16,  # 2 days
                        sprint_id=sprint_id,
                        sprint_start_date=sprint_start,
                        sprint_end_date=sprint_end,
                        skills_needed=["python"],
                    )
                )

        resources = [
            ResourceCreate(
                id="dev1",
                name="Developer 1",
                capacity=1,
                skills=["python"],
                lead=True,
            ),
            ResourceCreate(
                id="dev2",
                name="Developer 2",
                capacity=1,
                skills=["python"],
                lead=False,
            ),
        ]

        constraints = ScheduleConstraints(
            project_start=base_date,
            horizon_days=365,
            working_hours_per_day=8,
            respect_weekends=True,
        )

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=constraints,
        )

        # If scheduling succeeds, verify sprint isolation
        if result.status in ["success", "feasible"]:
            for scheduled_task in result.schedule:
                # Find which sprint this task belongs to
                task_data = next(t for t in tasks if t.id == scheduled_task.task_id)
                sprint_id = task_data.sprint_id
                boundaries = sprint_boundaries[sprint_id]

                # Property: Task must be within its sprint's boundaries
                assert scheduled_task.start_date >= boundaries["start"], (
                    f"Task {scheduled_task.task_id} in {sprint_id} "
                    f"starts before sprint start"
                )
                assert scheduled_task.end_date <= boundaries["end"], (
                    f"Task {scheduled_task.task_id} in {sprint_id} "
                    f"ends after sprint end"
                )

    @pytest.mark.asyncio
    @given(
        sprint_info=sprint_date_range(),
        has_dependency=st.booleans(),
        seed=st.integers(min_value=0, max_value=1000),
    )
    @settings(max_examples=15, deadline=10000)
    async def test_property_sprint_boundaries_with_dependencies(
        self, sprint_info, has_dependency, seed
    ):
        """
        Property: Sprint boundaries are enforced even with task dependencies.

        For tasks with dependencies within the same sprint, both the dependency
        constraint and sprint boundary constraints must be satisfied.
        """
        scheduler_service = SchedulerService()  # Create inside test
        project_id = uuid4()

        # Calculate task duration that fits in sprint
        sprint_capacity_hours = int(sprint_info["duration_days"] * 8 * (5 / 7))
        task_hours = min(16, sprint_capacity_hours // 3)  # Each task is 1/3 of sprint

        from app.schemas.schedule import TaskDependency

        tasks = [
            ScheduleTaskCreate(
                id=f"task_{seed}_1",
                title="First Task",
                estimated_hours=task_hours,
                sprint_id=sprint_info["sprint_id"],
                sprint_start_date=sprint_info["start_date"],
                sprint_end_date=sprint_info["end_date"],
                skills_needed=["python"],
            ),
        ]

        if has_dependency:
            tasks.append(
                ScheduleTaskCreate(
                    id=f"task_{seed}_2",
                    title="Second Task (dependent)",
                    estimated_hours=task_hours,
                    dependencies=[
                        TaskDependency(
                            predecessor_id=f"task_{seed}_1",
                            dependency_type="finish_to_start",
                        )
                    ],
                    sprint_id=sprint_info["sprint_id"],
                    sprint_start_date=sprint_info["start_date"],
                    sprint_end_date=sprint_info["end_date"],
                    skills_needed=["python"],
                )
            )

        resources = [
            ResourceCreate(
                id="dev1",
                name="Developer 1",
                capacity=1,
                skills=["python"],
                lead=True,
            ),
        ]

        constraints = ScheduleConstraints(
            project_start=sprint_info["start_date"] - timedelta(days=7),
            horizon_days=365,
            working_hours_per_day=8,
            respect_weekends=True,
        )

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=constraints,
        )

        if result.status in ["success", "feasible"]:
            # Property: All tasks within sprint boundaries
            for scheduled_task in result.schedule:
                assert scheduled_task.start_date >= sprint_info["start_date"]
                assert scheduled_task.end_date <= sprint_info["end_date"]

            # Property: If dependency exists, it must be respected
            if has_dependency and len(result.schedule) == 2:
                task1 = next(
                    t for t in result.schedule if t.task_id == f"task_{seed}_1"
                )
                task2 = next(
                    t for t in result.schedule if t.task_id == f"task_{seed}_2"
                )

                # Task 2 must start after task 1 ends
                assert task2.start_date >= task1.end_date, (
                    "Dependent task must start after predecessor ends"
                )

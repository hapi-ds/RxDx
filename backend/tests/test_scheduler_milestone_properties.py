"""Property-based tests for Milestone Scheduling Modes"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from hypothesis import HealthCheck, given, settings
from hypothesis import strategies as st

from app.schemas.schedule import (
    ResourceCreate,
    ScheduleConstraints,
    ScheduleTaskCreate,
    TaskDependency,
)
from app.services.scheduler_service import SchedulerService


# Strategies for generating test data
@st.composite
def task_strategy(draw, task_id=None):
    """Generate a valid task"""
    if task_id is None:
        task_id = f"task-{draw(st.integers(min_value=1, max_value=100))}"

    return ScheduleTaskCreate(
        id=task_id,
        title=draw(st.text(min_size=5, max_size=50, alphabet=st.characters(whitelist_categories=("L",)))),
        estimated_hours=draw(st.integers(min_value=8, max_value=80)),
        dependencies=[],
        required_resources=["dev-1"],
    )


@st.composite
def milestone_strategy(draw, is_manual=None):
    """Generate a valid milestone"""
    if is_manual is None:
        is_manual = draw(st.booleans())

    return {
        "id": uuid4(),
        "title": draw(st.text(min_size=5, max_size=50, alphabet=st.characters(whitelist_categories=("L",)))),
        "target_date": datetime.now(UTC) + timedelta(days=draw(st.integers(min_value=10, max_value=100))),
        "is_manual_constraint": is_manual,
        "status": "active",
    }


@pytest.fixture
def sample_resources():
    """Create sample resources for testing"""
    return [
        ResourceCreate(id="dev-1", name="Developer 1", capacity=1),
        ResourceCreate(id="qa-1", name="QA Engineer 1", capacity=1),
    ]


@pytest.fixture
def sample_constraints():
    """Create sample constraints for testing"""
    return ScheduleConstraints(
        project_start=datetime.now(UTC),
        horizon_days=365,
        working_hours_per_day=8,
        respect_weekends=False,
    )


class TestMilestoneSchedulingProperties:
    """Property-based tests for milestone scheduling"""

    @pytest.mark.asyncio
    @given(
        num_tasks=st.integers(min_value=1, max_value=5),
        num_milestones=st.integers(min_value=0, max_value=3),
    )
    @settings(max_examples=10, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_schedule_always_includes_milestones(
        self, sample_resources, sample_constraints, num_tasks, num_milestones
    ):
        """
        Property: When milestones are provided, the schedule response
        always includes milestone data.

        **Validates: Requirements 1.8-1.9, 16.51-16.53**
        """
        scheduler_service = SchedulerService()
        project_id = uuid4()

        # Generate tasks
        tasks = [
            ScheduleTaskCreate(
                id=f"task-{i}",
                title=f"Task {i}",
                estimated_hours=20,
                dependencies=[],
                required_resources=["dev-1"],
            )
            for i in range(1, num_tasks + 1)
        ]

        # Generate milestones
        milestones = [
            {
                "id": uuid4(),
                "title": f"Milestone {i}",
                "target_date": datetime.now(UTC) + timedelta(days=30 * i),
                "is_manual_constraint": i % 2 == 0,  # Alternate between manual and auto
                "status": "active",
            }
            for i in range(1, num_milestones + 1)
        ]

        # Mock milestone dependencies
        async def mock_get_dependencies(mid):
            # Return first task as dependency for all milestones
            return ["task-1"] if tasks else []

        scheduler_service._get_milestone_dependencies = mock_get_dependencies

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=sample_resources,
            constraints=sample_constraints,
            milestones=milestones if num_milestones > 0 else None,
        )

        # Property: Schedule response includes milestones
        if num_milestones > 0:
            assert len(result.milestones) == num_milestones
            assert all(m.milestone_id is not None for m in result.milestones)
            assert all(m.title is not None for m in result.milestones)
            assert all(m.date is not None for m in result.milestones)
        else:
            assert len(result.milestones) == 0

    @pytest.mark.asyncio
    @given(
        milestone_days_ahead=st.integers(min_value=20, max_value=100),
    )
    @settings(max_examples=10, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_manual_milestone_constraints_respected(
        self, sample_resources, sample_constraints, milestone_days_ahead
    ):
        """
        Property: Manual milestone constraints (is_manual_constraint=true)
        are always respected - dependent tasks finish before target_date.

        **Validates: Requirements 1.8, 16.51**
        """
        scheduler_service = SchedulerService()
        project_id = uuid4()
        milestone_id = uuid4()

        # Create tasks
        tasks = [
            ScheduleTaskCreate(
                id="task-1",
                title="Task 1",
                estimated_hours=40,
                dependencies=[],
                required_resources=["dev-1"],
            ),
            ScheduleTaskCreate(
                id="task-2",
                title="Task 2",
                estimated_hours=40,
                dependencies=[
                    TaskDependency(predecessor_id="task-1", dependency_type="finish_to_start")
                ],
                required_resources=["dev-1"],
            ),
        ]

        # Create manual milestone with target date
        milestone_date = sample_constraints.project_start + timedelta(days=milestone_days_ahead)
        milestones = [
            {
                "id": milestone_id,
                "title": "Manual Milestone",
                "target_date": milestone_date,
                "is_manual_constraint": True,
                "status": "active",
            }
        ]

        # Mock milestone dependencies
        async def mock_get_dependencies(mid):
            if str(mid) == str(milestone_id):
                return ["task-1", "task-2"]
            return []

        scheduler_service._get_milestone_dependencies = mock_get_dependencies

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=sample_resources,
            constraints=sample_constraints,
            milestones=milestones,
        )

        # Property: If schedule is feasible, all dependent tasks finish before milestone
        if result.status in ["success", "feasible"]:
            milestone = result.milestones[0]
            assert milestone.is_manual is True
            assert milestone.date == milestone_date

            # All dependent tasks must finish before milestone target_date
            for task in result.schedule:
                if task.task_id in ["task-1", "task-2"]:
                    assert task.end_date <= milestone_date, (
                        f"Task {task.task_id} ends at {task.end_date}, "
                        f"which is after milestone target {milestone_date}"
                    )

    @pytest.mark.asyncio
    @given(
        num_dependent_tasks=st.integers(min_value=1, max_value=5),
    )
    @settings(max_examples=10, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_automatic_milestone_date_calculated_correctly(
        self, sample_resources, sample_constraints, num_dependent_tasks
    ):
        """
        Property: Automatic milestone dates (is_manual_constraint=false)
        are calculated as the maximum end_date of all dependent tasks.

        **Validates: Requirements 1.9, 16.52**
        """
        scheduler_service = SchedulerService()
        project_id = uuid4()
        milestone_id = uuid4()

        # Create tasks with sequential dependencies
        tasks = []
        for i in range(1, num_dependent_tasks + 1):
            deps = []
            if i > 1:
                deps = [
                    TaskDependency(
                        predecessor_id=f"task-{i-1}",
                        dependency_type="finish_to_start"
                    )
                ]

            tasks.append(
                ScheduleTaskCreate(
                    id=f"task-{i}",
                    title=f"Task {i}",
                    estimated_hours=20,
                    dependencies=deps,
                    required_resources=["dev-1"],
                )
            )

        # Create automatic milestone
        milestones = [
            {
                "id": milestone_id,
                "title": "Automatic Milestone",
                "target_date": datetime.now(UTC) + timedelta(days=100),
                "is_manual_constraint": False,
                "status": "active",
            }
        ]

        # Mock milestone dependencies - all tasks depend on this milestone
        async def mock_get_dependencies(mid):
            if str(mid) == str(milestone_id):
                return [f"task-{i}" for i in range(1, num_dependent_tasks + 1)]
            return []

        scheduler_service._get_milestone_dependencies = mock_get_dependencies

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=sample_resources,
            constraints=sample_constraints,
            milestones=milestones,
        )

        # Property: Automatic milestone date equals max end_date of dependent tasks
        if result.status in ["success", "feasible"]:
            milestone = result.milestones[0]
            assert milestone.is_manual is False

            # Find the latest end date among dependent tasks
            dependent_task_ids = [f"task-{i}" for i in range(1, num_dependent_tasks + 1)]
            latest_end = max(
                task.end_date
                for task in result.schedule
                if task.task_id in dependent_task_ids
            )

            assert milestone.date == latest_end, (
                f"Automatic milestone date {milestone.date} does not match "
                f"latest task end date {latest_end}"
            )

    @pytest.mark.asyncio
    @given(
        num_manual=st.integers(min_value=0, max_value=3),
        num_auto=st.integers(min_value=0, max_value=3),
    )
    @settings(max_examples=10, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_milestone_mode_preserved(
        self, sample_resources, sample_constraints, num_manual, num_auto
    ):
        """
        Property: Milestone mode (manual vs automatic) is preserved
        in the schedule response.

        **Validates: Requirements 16.53**
        """
        scheduler_service = SchedulerService()
        project_id = uuid4()

        # Create a simple task
        tasks = [
            ScheduleTaskCreate(
                id="task-1",
                title="Task 1",
                estimated_hours=40,
                dependencies=[],
                required_resources=["dev-1"],
            )
        ]

        # Create milestones with different modes
        milestones = []

        for i in range(num_manual):
            milestones.append({
                "id": uuid4(),
                "title": f"Manual Milestone {i+1}",
                "target_date": datetime.now(UTC) + timedelta(days=30 * (i + 1)),
                "is_manual_constraint": True,
                "status": "active",
            })

        for i in range(num_auto):
            milestones.append({
                "id": uuid4(),
                "title": f"Auto Milestone {i+1}",
                "target_date": datetime.now(UTC) + timedelta(days=30 * (i + 1)),
                "is_manual_constraint": False,
                "status": "active",
            })

        # Mock milestone dependencies
        async def mock_get_dependencies(mid):
            return ["task-1"]

        scheduler_service._get_milestone_dependencies = mock_get_dependencies

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=sample_resources,
            constraints=sample_constraints,
            milestones=milestones if milestones else None,
        )

        # Property: Milestone modes are preserved
        if milestones:
            assert len(result.milestones) == len(milestones)

            manual_count = sum(1 for m in result.milestones if m.is_manual)
            auto_count = sum(1 for m in result.milestones if not m.is_manual)

            assert manual_count == num_manual
            assert auto_count == num_auto

    @pytest.mark.asyncio
    @given(
        has_dependencies=st.booleans(),
    )
    @settings(max_examples=10, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    async def test_property_milestone_without_dependencies_uses_target_date(
        self, sample_resources, sample_constraints, has_dependencies
    ):
        """
        Property: Automatic milestones without dependencies use target_date.

        **Validates: Requirements 16.52**
        """
        scheduler_service = SchedulerService()
        project_id = uuid4()
        milestone_id = uuid4()

        # Create a task
        tasks = [
            ScheduleTaskCreate(
                id="task-1",
                title="Task 1",
                estimated_hours=40,
                dependencies=[],
                required_resources=["dev-1"],
            )
        ]

        target_date = datetime.now(UTC) + timedelta(days=50)

        # Create automatic milestone
        milestones = [
            {
                "id": milestone_id,
                "title": "Milestone",
                "target_date": target_date,
                "is_manual_constraint": False,
                "status": "active",
            }
        ]

        # Mock milestone dependencies
        async def mock_get_dependencies(mid):
            if has_dependencies:
                return ["task-1"]
            return []

        scheduler_service._get_milestone_dependencies = mock_get_dependencies

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=sample_resources,
            constraints=sample_constraints,
            milestones=milestones,
        )

        # Property: If no dependencies, milestone uses target_date
        if result.status in ["success", "feasible"]:
            milestone = result.milestones[0]

            if not has_dependencies:
                assert milestone.date == target_date, (
                    "Automatic milestone without dependencies should use target_date"
                )
            else:
                # With dependencies, should use task end date
                task_1 = next(t for t in result.schedule if t.task_id == "task-1")
                assert milestone.date == task_1.end_date

"""Unit tests for Milestone Scheduling Modes in SchedulerService"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.schemas.schedule import (
    ResourceCreate,
    ScheduleConstraints,
    ScheduleTaskCreate,
    TaskDependency,
)
from app.services.scheduler_service import SchedulerService


@pytest.fixture
def scheduler_service():
    """Create a fresh scheduler service for each test"""
    return SchedulerService()


@pytest.fixture
def sample_tasks():
    """Create sample tasks for testing"""
    return [
        ScheduleTaskCreate(
            id="task-1",
            title="Design Phase",
            estimated_hours=40,
            dependencies=[],
            required_resources=["dev-1"],
        ),
        ScheduleTaskCreate(
            id="task-2",
            title="Implementation",
            estimated_hours=80,
            dependencies=[
                TaskDependency(
                    predecessor_id="task-1", dependency_type="finish_to_start"
                )
            ],
            required_resources=["dev-1"],
        ),
        ScheduleTaskCreate(
            id="task-3",
            title="Testing",
            estimated_hours=40,
            dependencies=[
                TaskDependency(
                    predecessor_id="task-2", dependency_type="finish_to_start"
                )
            ],
            required_resources=["qa-1"],
        ),
    ]


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


class TestMilestoneSchedulingModes:
    """Tests for milestone scheduling modes (manual and automatic)"""

    @pytest.mark.asyncio
    async def test_schedule_without_milestones(
        self, scheduler_service, sample_tasks, sample_resources, sample_constraints
    ):
        """Test scheduling without milestones works as before"""
        project_id = uuid4()
        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=sample_tasks,
            resources=sample_resources,
            constraints=sample_constraints,
            milestones=None,
        )

        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 3
        assert len(result.milestones) == 0

    @pytest.mark.asyncio
    async def test_schedule_with_empty_milestones(
        self, scheduler_service, sample_tasks, sample_resources, sample_constraints
    ):
        """Test scheduling with empty milestones list"""
        project_id = uuid4()
        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=sample_tasks,
            resources=sample_resources,
            constraints=sample_constraints,
            milestones=[],
        )

        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 3
        assert len(result.milestones) == 0

    @pytest.mark.asyncio
    async def test_automatic_milestone_date_calculation(
        self, scheduler_service, sample_tasks, sample_resources, sample_constraints
    ):
        """Test automatic milestone date calculation from dependent tasks"""
        project_id = uuid4()
        milestone_id = uuid4()

        # Create milestone with is_manual_constraint=False (automatic mode)
        milestones = [
            {
                "id": milestone_id,
                "title": "Development Complete",
                "target_date": datetime.now(UTC) + timedelta(days=100),
                "is_manual_constraint": False,
                "status": "active",
            }
        ]

        # Mock the milestone dependencies to return task-2 (Implementation)
        # In real scenario, this would be fetched from the graph database
        async def mock_get_dependencies(mid):
            if str(mid) == str(milestone_id):
                return ["task-2"]
            return []

        scheduler_service._get_milestone_dependencies = mock_get_dependencies

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=sample_tasks,
            resources=sample_resources,
            constraints=sample_constraints,
            milestones=milestones,
        )

        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 3
        assert len(result.milestones) == 1

        # Check milestone was calculated
        milestone = result.milestones[0]
        assert milestone.milestone_id == str(milestone_id)
        assert milestone.title == "Development Complete"
        assert milestone.is_manual is False

        # Milestone date should be the end date of task-2
        task_2 = next(t for t in result.schedule if t.task_id == "task-2")
        assert milestone.date == task_2.end_date

    @pytest.mark.asyncio
    async def test_manual_milestone_constraint(
        self, scheduler_service, sample_tasks, sample_resources, sample_constraints
    ):
        """Test manual milestone constraint enforces deadline on dependent tasks"""
        project_id = uuid4()
        milestone_id = uuid4()

        # Set a tight deadline for the milestone (manual mode)
        # This should force the scheduler to respect this constraint
        milestone_date = sample_constraints.project_start + timedelta(days=30)

        milestones = [
            {
                "id": milestone_id,
                "title": "Phase 1 Complete",
                "target_date": milestone_date,
                "is_manual_constraint": True,
                "status": "active",
            }
        ]

        # Mock the milestone dependencies to return task-1 and task-2
        async def mock_get_dependencies(mid):
            if str(mid) == str(milestone_id):
                return ["task-1", "task-2"]
            return []

        scheduler_service._get_milestone_dependencies = mock_get_dependencies

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=sample_tasks,
            resources=sample_resources,
            constraints=sample_constraints,
            milestones=milestones,
        )

        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 3
        assert len(result.milestones) == 1

        # Check milestone uses target_date (manual mode)
        milestone = result.milestones[0]
        assert milestone.milestone_id == str(milestone_id)
        assert milestone.is_manual is True
        assert milestone.date == milestone_date

        # Verify dependent tasks finish before milestone target_date
        task_1 = next(t for t in result.schedule if t.task_id == "task-1")
        task_2 = next(t for t in result.schedule if t.task_id == "task-2")

        assert task_1.end_date <= milestone_date
        assert task_2.end_date <= milestone_date

    @pytest.mark.asyncio
    async def test_mixed_milestone_modes(
        self, scheduler_service, sample_tasks, sample_resources, sample_constraints
    ):
        """Test scheduling with both manual and automatic milestones"""
        project_id = uuid4()
        manual_milestone_id = uuid4()
        auto_milestone_id = uuid4()

        milestone_date = sample_constraints.project_start + timedelta(days=30)

        milestones = [
            {
                "id": manual_milestone_id,
                "title": "Phase 1 Complete (Manual)",
                "target_date": milestone_date,
                "is_manual_constraint": True,
                "status": "active",
            },
            {
                "id": auto_milestone_id,
                "title": "Testing Complete (Auto)",
                "target_date": datetime.now(UTC) + timedelta(days=100),
                "is_manual_constraint": False,
                "status": "active",
            },
        ]

        # Mock the milestone dependencies
        async def mock_get_dependencies(mid):
            if str(mid) == str(manual_milestone_id):
                return ["task-1"]
            elif str(mid) == str(auto_milestone_id):
                return ["task-3"]
            return []

        scheduler_service._get_milestone_dependencies = mock_get_dependencies

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=sample_tasks,
            resources=sample_resources,
            constraints=sample_constraints,
            milestones=milestones,
        )

        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 3
        assert len(result.milestones) == 2

        # Check manual milestone
        manual_milestone = next(
            m for m in result.milestones if m.milestone_id == str(manual_milestone_id)
        )
        assert manual_milestone.is_manual is True
        assert manual_milestone.date == milestone_date

        # Check automatic milestone
        auto_milestone = next(
            m for m in result.milestones if m.milestone_id == str(auto_milestone_id)
        )
        assert auto_milestone.is_manual is False

        # Auto milestone date should be task-3 end date
        task_3 = next(t for t in result.schedule if t.task_id == "task-3")
        assert auto_milestone.date == task_3.end_date

    @pytest.mark.asyncio
    async def test_milestone_without_dependencies(
        self, scheduler_service, sample_tasks, sample_resources, sample_constraints
    ):
        """Test milestone without dependent tasks uses target_date"""
        project_id = uuid4()
        milestone_id = uuid4()

        target_date = datetime.now(UTC) + timedelta(days=50)

        milestones = [
            {
                "id": milestone_id,
                "title": "Standalone Milestone",
                "target_date": target_date,
                "is_manual_constraint": False,
                "status": "active",
            }
        ]

        # Mock no dependencies
        async def mock_get_dependencies(mid):
            return []

        scheduler_service._get_milestone_dependencies = mock_get_dependencies

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=sample_tasks,
            resources=sample_resources,
            constraints=sample_constraints,
            milestones=milestones,
        )

        assert result.status in ["success", "feasible"]
        assert len(result.milestones) == 1

        # Milestone should use target_date when no dependencies
        milestone = result.milestones[0]
        assert milestone.date == target_date

    @pytest.mark.asyncio
    async def test_impossible_manual_milestone_constraint(
        self, scheduler_service, sample_tasks, sample_resources, sample_constraints
    ):
        """Test that impossible manual milestone constraints are detected"""
        project_id = uuid4()
        milestone_id = uuid4()

        # Set an impossible deadline (too early for tasks to complete)
        impossible_date = sample_constraints.project_start + timedelta(hours=1)

        milestones = [
            {
                "id": milestone_id,
                "title": "Impossible Milestone",
                "target_date": impossible_date,
                "is_manual_constraint": True,
                "status": "active",
            }
        ]

        # Mock dependencies to all tasks
        async def mock_get_dependencies(mid):
            if str(mid) == str(milestone_id):
                return ["task-1", "task-2", "task-3"]
            return []

        scheduler_service._get_milestone_dependencies = mock_get_dependencies

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=sample_tasks,
            resources=sample_resources,
            constraints=sample_constraints,
            milestones=milestones,
        )

        # Should be infeasible due to impossible milestone constraint
        assert result.status == "infeasible"
        assert result.message is not None

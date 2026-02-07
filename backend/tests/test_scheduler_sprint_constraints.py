"""Unit tests for sprint boundary constraints in SchedulerService"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.schemas.schedule import (
    ResourceCreate,
    ScheduleConstraints,
    ScheduleTaskCreate,
)
from app.services.scheduler_service import SchedulerService


@pytest.fixture
def scheduler_service():
    """Create a fresh scheduler service for each test"""
    return SchedulerService()


@pytest.fixture
def sample_constraints():
    """Sample schedule constraints"""
    return ScheduleConstraints(
        project_start=datetime(2024, 1, 1, 9, 0, 0, tzinfo=UTC),
        horizon_days=90,
        working_hours_per_day=8,
        respect_weekends=True,
    )


@pytest.fixture
def sample_resources():
    """Sample resources for testing"""
    return [
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
            skills=["python", "backend"],
            lead=False,
        ),
    ]


class TestSprintBoundaryConstraints:
    """Test sprint boundary constraint enforcement"""

    @pytest.mark.asyncio
    async def test_task_scheduled_within_sprint_boundaries(
        self, scheduler_service, sample_constraints, sample_resources
    ):
        """Test that tasks assigned to sprints are scheduled within sprint boundaries"""
        project_id = uuid4()

        # Sprint: Jan 1-14, 2024 (2 weeks)
        sprint_start = datetime(2024, 1, 1, 9, 0, 0, tzinfo=UTC)
        sprint_end = datetime(2024, 1, 14, 17, 0, 0, tzinfo=UTC)

        tasks = [
            ScheduleTaskCreate(
                id="task1",
                title="Sprint Task 1",
                estimated_hours=40,  # 5 days
                sprint_id="sprint1",
                sprint_start_date=sprint_start,
                sprint_end_date=sprint_end,
                skills_needed=["python"],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=sample_resources,
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 1

        scheduled_task = result.schedule[0]
        # Task should start at or after sprint start
        assert scheduled_task.start_date >= sprint_start
        # Task should end at or before sprint end
        assert scheduled_task.end_date <= sprint_end

    @pytest.mark.asyncio
    async def test_task_too_long_for_sprint_fails(
        self, scheduler_service, sample_constraints, sample_resources
    ):
        """Test that tasks longer than sprint duration fail with conflict"""
        project_id = uuid4()

        # Sprint: Jan 1-7, 2024 (1 week = ~40 working hours)
        sprint_start = datetime(2024, 1, 1, 9, 0, 0, tzinfo=UTC)
        sprint_end = datetime(2024, 1, 7, 17, 0, 0, tzinfo=UTC)

        tasks = [
            ScheduleTaskCreate(
                id="task1",
                title="Too Long Task",
                estimated_hours=80,  # 10 days - too long for 1 week sprint
                sprint_id="sprint1",
                sprint_start_date=sprint_start,
                sprint_end_date=sprint_end,
                skills_needed=["python"],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=sample_resources,
            constraints=sample_constraints,
        )

        assert result.status == "infeasible"
        assert len(result.conflicts) > 0
        assert any(
            c.conflict_type == "sprint_capacity_exceeded" for c in result.conflicts
        )

    @pytest.mark.asyncio
    async def test_multiple_tasks_in_same_sprint(
        self, scheduler_service, sample_constraints, sample_resources
    ):
        """Test scheduling multiple tasks within the same sprint"""
        project_id = uuid4()

        # Sprint: Jan 1-14, 2024 (2 weeks)
        sprint_start = datetime(2024, 1, 1, 9, 0, 0, tzinfo=UTC)
        sprint_end = datetime(2024, 1, 14, 17, 0, 0, tzinfo=UTC)

        tasks = [
            ScheduleTaskCreate(
                id="task1",
                title="Sprint Task 1",
                estimated_hours=24,  # 3 days
                sprint_id="sprint1",
                sprint_start_date=sprint_start,
                sprint_end_date=sprint_end,
                skills_needed=["python"],
            ),
            ScheduleTaskCreate(
                id="task2",
                title="Sprint Task 2",
                estimated_hours=16,  # 2 days
                sprint_id="sprint1",
                sprint_start_date=sprint_start,
                sprint_end_date=sprint_end,
                skills_needed=["backend"],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=sample_resources,
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 2

        # All tasks should be within sprint boundaries
        for scheduled_task in result.schedule:
            assert scheduled_task.start_date >= sprint_start
            assert scheduled_task.end_date <= sprint_end

    @pytest.mark.asyncio
    async def test_tasks_in_different_sprints(
        self, scheduler_service, sample_constraints, sample_resources
    ):
        """Test scheduling tasks in different sprints"""
        project_id = uuid4()

        # Sprint 1: Jan 1-14, 2024
        sprint1_start = datetime(2024, 1, 1, 9, 0, 0, tzinfo=UTC)
        sprint1_end = datetime(2024, 1, 14, 17, 0, 0, tzinfo=UTC)

        # Sprint 2: Jan 15-28, 2024
        sprint2_start = datetime(2024, 1, 15, 9, 0, 0, tzinfo=UTC)
        sprint2_end = datetime(2024, 1, 28, 17, 0, 0, tzinfo=UTC)

        tasks = [
            ScheduleTaskCreate(
                id="task1",
                title="Sprint 1 Task",
                estimated_hours=32,  # 4 days
                sprint_id="sprint1",
                sprint_start_date=sprint1_start,
                sprint_end_date=sprint1_end,
                skills_needed=["python"],
            ),
            ScheduleTaskCreate(
                id="task2",
                title="Sprint 2 Task",
                estimated_hours=24,  # 3 days
                sprint_id="sprint2",
                sprint_start_date=sprint2_start,
                sprint_end_date=sprint2_end,
                skills_needed=["backend"],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=sample_resources,
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 2

        # Task 1 should be in sprint 1 boundaries
        task1_schedule = next(t for t in result.schedule if t.task_id == "task1")
        assert task1_schedule.start_date >= sprint1_start
        assert task1_schedule.end_date <= sprint1_end

        # Task 2 should be in sprint 2 boundaries
        task2_schedule = next(t for t in result.schedule if t.task_id == "task2")
        assert task2_schedule.start_date >= sprint2_start
        assert task2_schedule.end_date <= sprint2_end

    @pytest.mark.asyncio
    async def test_sprint_task_with_dependencies(
        self, scheduler_service, sample_constraints, sample_resources
    ):
        """Test sprint tasks with dependencies respect both sprint boundaries and dependencies"""
        project_id = uuid4()

        # Sprint: Jan 1-14, 2024
        sprint_start = datetime(2024, 1, 1, 9, 0, 0, tzinfo=UTC)
        sprint_end = datetime(2024, 1, 14, 17, 0, 0, tzinfo=UTC)

        from app.schemas.schedule import TaskDependency

        tasks = [
            ScheduleTaskCreate(
                id="task1",
                title="Sprint Task 1",
                estimated_hours=16,  # 2 days
                sprint_id="sprint1",
                sprint_start_date=sprint_start,
                sprint_end_date=sprint_end,
                skills_needed=["python"],
            ),
            ScheduleTaskCreate(
                id="task2",
                title="Sprint Task 2 (depends on task1)",
                estimated_hours=16,  # 2 days
                dependencies=[
                    TaskDependency(
                        predecessor_id="task1", dependency_type="finish_to_start"
                    )
                ],
                sprint_id="sprint1",
                sprint_start_date=sprint_start,
                sprint_end_date=sprint_end,
                skills_needed=["backend"],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=sample_resources,
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 2

        task1_schedule = next(t for t in result.schedule if t.task_id == "task1")
        task2_schedule = next(t for t in result.schedule if t.task_id == "task2")

        # Both tasks should be within sprint boundaries
        assert task1_schedule.start_date >= sprint_start
        assert task1_schedule.end_date <= sprint_end
        assert task2_schedule.start_date >= sprint_start
        assert task2_schedule.end_date <= sprint_end

        # Task 2 should start after task 1 ends (dependency)
        assert task2_schedule.start_date >= task1_schedule.end_date

    @pytest.mark.asyncio
    async def test_mixed_sprint_and_non_sprint_tasks(
        self, scheduler_service, sample_constraints, sample_resources
    ):
        """Test scheduling mix of sprint and non-sprint tasks"""
        project_id = uuid4()

        # Sprint: Jan 8-21, 2024
        sprint_start = datetime(2024, 1, 8, 9, 0, 0, tzinfo=UTC)
        sprint_end = datetime(2024, 1, 21, 17, 0, 0, tzinfo=UTC)

        tasks = [
            ScheduleTaskCreate(
                id="task1",
                title="Non-Sprint Task",
                estimated_hours=16,  # 2 days
                skills_needed=["python"],
            ),
            ScheduleTaskCreate(
                id="task2",
                title="Sprint Task",
                estimated_hours=24,  # 3 days
                sprint_id="sprint1",
                sprint_start_date=sprint_start,
                sprint_end_date=sprint_end,
                skills_needed=["backend"],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=sample_resources,
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 2

        # Sprint task should be within sprint boundaries
        sprint_task = next(t for t in result.schedule if t.task_id == "task2")
        assert sprint_task.start_date >= sprint_start
        assert sprint_task.end_date <= sprint_end

        # Non-sprint task can be scheduled anytime
        non_sprint_task = next(t for t in result.schedule if t.task_id == "task1")
        assert non_sprint_task.start_date >= sample_constraints.project_start

    @pytest.mark.asyncio
    async def test_sprint_boundary_validation_in_schema(self):
        """Test that schema validates sprint date consistency"""
        # Valid: sprint dates provided together
        task = ScheduleTaskCreate(
            id="task1",
            title="Valid Sprint Task",
            estimated_hours=16,
            sprint_id="sprint1",
            sprint_start_date=datetime(2024, 1, 1, 9, 0, 0, tzinfo=UTC),
            sprint_end_date=datetime(2024, 1, 14, 17, 0, 0, tzinfo=UTC),
        )
        assert task.sprint_id == "sprint1"

        # Invalid: sprint_id without dates should raise error
        with pytest.raises(ValueError, match="sprint_start_date and sprint_end_date"):
            ScheduleTaskCreate(
                id="task2",
                title="Invalid Sprint Task",
                estimated_hours=16,
                sprint_id="sprint1",
                sprint_start_date=datetime(2024, 1, 1, 9, 0, 0, tzinfo=UTC),
                # Missing sprint_end_date
            )

        # Invalid: sprint end before start
        with pytest.raises(ValueError, match="sprint_start_date must be before"):
            ScheduleTaskCreate(
                id="task3",
                title="Invalid Sprint Task",
                estimated_hours=16,
                sprint_id="sprint1",
                sprint_start_date=datetime(2024, 1, 14, 9, 0, 0, tzinfo=UTC),
                sprint_end_date=datetime(2024, 1, 1, 17, 0, 0, tzinfo=UTC),
            )

        # Valid: task too long for sprint is allowed (scheduler will detect conflict)
        task_too_long = ScheduleTaskCreate(
            id="task4",
            title="Too Long Task",
            estimated_hours=200,  # Way too long
            sprint_id="sprint1",
            sprint_start_date=datetime(2024, 1, 1, 9, 0, 0, tzinfo=UTC),
            sprint_end_date=datetime(2024, 1, 7, 17, 0, 0, tzinfo=UTC),
        )
        assert task_too_long.estimated_hours == 200  # Schema allows it

    @pytest.mark.asyncio
    async def test_sprint_capacity_conflict_detection(
        self, scheduler_service, sample_constraints, sample_resources
    ):
        """Test that sprint capacity exceeded conflicts are properly detected"""
        project_id = uuid4()

        # Very short sprint: Jan 1-2, 2024 (1 day = 8 hours)
        sprint_start = datetime(2024, 1, 1, 9, 0, 0, tzinfo=UTC)
        sprint_end = datetime(2024, 1, 2, 17, 0, 0, tzinfo=UTC)

        tasks = [
            ScheduleTaskCreate(
                id="task1",
                title="Task exceeding sprint capacity",
                estimated_hours=40,  # 5 days - way too long for 1 day sprint
                sprint_id="sprint1",
                sprint_start_date=sprint_start,
                sprint_end_date=sprint_end,
                skills_needed=["python"],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=sample_resources,
            constraints=sample_constraints,
        )

        assert result.status == "infeasible"
        assert len(result.conflicts) > 0

        # Check for sprint capacity exceeded conflict
        sprint_conflict = next(
            (c for c in result.conflicts if c.conflict_type == "sprint_capacity_exceeded"),
            None,
        )
        assert sprint_conflict is not None
        assert "task1" in sprint_conflict.affected_tasks
        assert "sprint1" in sprint_conflict.description
        assert "cannot fit" in sprint_conflict.description.lower()

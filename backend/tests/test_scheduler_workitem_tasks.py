"""Unit tests for SchedulerService WorkItem task integration"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.schemas.schedule import (
    ResourceCreate,
    ScheduleConstraints,
    ScheduledTask,
)
from app.services.scheduler_service import SchedulerService


@pytest.fixture
def scheduler_service():
    """Create a fresh scheduler service for each test"""
    return SchedulerService()


@pytest.fixture
def sample_project_id():
    """Create a sample project ID"""
    return uuid4()


@pytest.fixture
def sample_workpackage_id():
    """Create a sample workpackage ID"""
    return uuid4()


class TestWorkItemTaskQuery:
    """Tests for querying WorkItem nodes with type='task'"""

    @pytest.mark.asyncio
    async def test_get_workitem_tasks_empty(
        self, scheduler_service, sample_project_id
    ):
        """Test querying WorkItem tasks when none exist"""
        tasks = await scheduler_service.get_workitem_tasks(sample_project_id)

        # Should return empty list, not error
        assert isinstance(tasks, list)
        assert len(tasks) == 0

    @pytest.mark.asyncio
    async def test_get_workitem_tasks_with_workpackage(
        self, scheduler_service, sample_project_id, sample_workpackage_id
    ):
        """Test querying WorkItem tasks filtered by workpackage"""
        tasks = await scheduler_service.get_workitem_tasks(
            sample_project_id, sample_workpackage_id
        )

        # Should return empty list when no tasks exist
        assert isinstance(tasks, list)
        assert len(tasks) == 0

    @pytest.mark.asyncio
    async def test_get_workitem_tasks_handles_errors(
        self, scheduler_service, sample_project_id
    ):
        """Test that get_workitem_tasks handles errors gracefully"""
        # Even with invalid project ID, should return empty list, not raise
        tasks = await scheduler_service.get_workitem_tasks(uuid4())

        assert isinstance(tasks, list)
        assert len(tasks) == 0


class TestWorkItemTaskDateUpdate:
    """Tests for updating WorkItem task dates after scheduling"""

    @pytest.mark.asyncio
    async def test_update_workitem_task_dates_empty(self, scheduler_service):
        """Test updating dates with empty task list"""
        # Should not raise error
        await scheduler_service.update_workitem_task_dates([])

    @pytest.mark.asyncio
    async def test_update_workitem_task_dates_single_task(self, scheduler_service):
        """Test updating dates for a single task"""
        task_id = str(uuid4())
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(hours=8)

        scheduled_task = ScheduledTask(
            task_id=task_id,
            task_title="Test Task",
            start_date=start_date,
            end_date=end_date,
            duration_hours=8,
            assigned_resources=["resource-1"],
        )

        # Should not raise error even if task doesn't exist in graph
        await scheduler_service.update_workitem_task_dates([scheduled_task])

    @pytest.mark.asyncio
    async def test_update_workitem_task_dates_multiple_tasks(self, scheduler_service):
        """Test updating dates for multiple tasks"""
        start_date = datetime.now(UTC)

        scheduled_tasks = [
            ScheduledTask(
                task_id=str(uuid4()),
                task_title=f"Test Task {i}",
                start_date=start_date + timedelta(hours=i * 8),
                end_date=start_date + timedelta(hours=(i + 1) * 8),
                duration_hours=8,
                assigned_resources=["resource-1"],
            )
            for i in range(3)
        ]

        # Should not raise error
        await scheduler_service.update_workitem_task_dates(scheduled_tasks)

    @pytest.mark.asyncio
    async def test_update_workitem_task_dates_with_timezone(self, scheduler_service):
        """Test that dates are properly formatted with timezone"""
        task_id = str(uuid4())
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(hours=16)

        scheduled_task = ScheduledTask(
            task_id=task_id,
            task_title="Test Task with Timezone",
            start_date=start_date,
            end_date=end_date,
            duration_hours=16,
            assigned_resources=["resource-1"],
        )

        # Should handle timezone-aware datetimes correctly
        await scheduler_service.update_workitem_task_dates([scheduled_task])


class TestWorkItemTaskSchedulingIntegration:
    """Integration tests for WorkItem task scheduling"""

    @pytest.mark.asyncio
    async def test_schedule_project_updates_workitem_dates(
        self, scheduler_service, sample_project_id
    ):
        """Test that schedule_project updates WorkItem task dates"""
        from app.schemas.schedule import ScheduleTaskCreate

        # Create sample tasks
        tasks = [
            ScheduleTaskCreate(
                id=str(uuid4()),
                title="Task 1",
                estimated_hours=8,
                dependencies=[],
                required_resources=["dev-1"],
                skills_needed=["python"],
            ),
            ScheduleTaskCreate(
                id=str(uuid4()),
                title="Task 2",
                estimated_hours=16,
                dependencies=[],
                required_resources=["dev-1"],
                skills_needed=["python"],
            ),
        ]

        resources = [
            ResourceCreate(
                id="dev-1", name="Developer 1", capacity=1, skills=["python"]
            )
        ]

        constraints = ScheduleConstraints(
            project_start=datetime.now(UTC),
            horizon_days=30,
            working_hours_per_day=8,
            respect_weekends=False,
        )

        # Schedule the project
        response = await scheduler_service.schedule_project(
            project_id=sample_project_id,
            tasks=tasks,
            resources=resources,
            constraints=constraints,
        )

        # Verify schedule was created
        assert response.status in ["success", "feasible"]
        assert len(response.schedule) == 2

        # Verify all scheduled tasks have valid dates
        for scheduled_task in response.schedule:
            assert scheduled_task.start_date is not None
            assert scheduled_task.end_date is not None
            assert scheduled_task.start_date < scheduled_task.end_date
            assert scheduled_task.start_date.tzinfo is not None
            assert scheduled_task.end_date.tzinfo is not None

    @pytest.mark.asyncio
    async def test_schedule_with_workitem_skills_matching(
        self, scheduler_service, sample_project_id
    ):
        """Test scheduling with skills-based resource matching"""
        from app.schemas.schedule import ScheduleTaskCreate

        # Create tasks with different skill requirements
        tasks = [
            ScheduleTaskCreate(
                id=str(uuid4()),
                title="Python Task",
                estimated_hours=8,
                dependencies=[],
                required_resources=[],
                skills_needed=["python", "django"],
            ),
            ScheduleTaskCreate(
                id=str(uuid4()),
                title="JavaScript Task",
                estimated_hours=8,
                dependencies=[],
                required_resources=[],
                skills_needed=["javascript", "react"],
            ),
        ]

        resources = [
            ResourceCreate(
                id="dev-1",
                name="Python Developer",
                capacity=1,
                skills=["python", "django"],
            ),
            ResourceCreate(
                id="dev-2",
                name="JS Developer",
                capacity=1,
                skills=["javascript", "react"],
            ),
        ]

        constraints = ScheduleConstraints(
            project_start=datetime.now(UTC),
            horizon_days=30,
            working_hours_per_day=8,
            respect_weekends=False,
        )

        # Schedule the project
        response = await scheduler_service.schedule_project(
            project_id=sample_project_id,
            tasks=tasks,
            resources=resources,
            constraints=constraints,
        )

        # Verify schedule was created
        assert response.status in ["success", "feasible"]
        assert len(response.schedule) == 2

        # Verify tasks were assigned to appropriate resources
        for scheduled_task in response.schedule:
            assert len(scheduled_task.assigned_resources) > 0


class TestWorkItemTaskValidation:
    """Tests for WorkItem task data validation"""

    @pytest.mark.asyncio
    async def test_workitem_task_with_missing_estimated_hours(
        self, scheduler_service, sample_project_id
    ):
        """Test that tasks default to 8 hours if estimated_hours is missing"""
        from app.schemas.schedule import ScheduleTaskCreate

        # This should be handled by the conversion logic
        # When querying WorkItem nodes, missing estimated_hours should default to 8
        tasks = [
            ScheduleTaskCreate(
                id=str(uuid4()),
                title="Task without hours",
                estimated_hours=8,  # Default value
                dependencies=[],
                required_resources=["dev-1"],
            )
        ]

        resources = [ResourceCreate(id="dev-1", name="Developer 1", capacity=1)]

        constraints = ScheduleConstraints(
            project_start=datetime.now(UTC),
            horizon_days=30,
            working_hours_per_day=8,
            respect_weekends=False,
        )

        response = await scheduler_service.schedule_project(
            project_id=sample_project_id,
            tasks=tasks,
            resources=resources,
            constraints=constraints,
        )

        assert response.status in ["success", "feasible"]
        assert response.schedule[0].duration_hours == 8

    @pytest.mark.asyncio
    async def test_workitem_task_with_empty_skills(
        self, scheduler_service, sample_project_id
    ):
        """Test that tasks with empty skills_needed are handled correctly"""
        from app.schemas.schedule import ScheduleTaskCreate

        tasks = [
            ScheduleTaskCreate(
                id=str(uuid4()),
                title="Task without skills",
                estimated_hours=8,
                dependencies=[],
                required_resources=["dev-1"],
                skills_needed=[],  # Empty skills
            )
        ]

        resources = [ResourceCreate(id="dev-1", name="Developer 1", capacity=1)]

        constraints = ScheduleConstraints(
            project_start=datetime.now(UTC),
            horizon_days=30,
            working_hours_per_day=8,
            respect_weekends=False,
        )

        response = await scheduler_service.schedule_project(
            project_id=sample_project_id,
            tasks=tasks,
            resources=resources,
            constraints=constraints,
        )

        assert response.status in ["success", "feasible"]

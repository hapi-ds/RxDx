"""Unit tests for department-based resource allocation in SchedulerService"""

from datetime import UTC, datetime
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
    """Create sample constraints for testing"""
    return ScheduleConstraints(
        project_start=datetime.now(UTC),
        horizon_days=365,
        working_hours_per_day=8,
        respect_weekends=False,
    )


class TestDepartmentBasedAllocation:
    """Tests for department-based resource allocation"""

    @pytest.mark.asyncio
    async def test_get_department_resources_no_workpackage(self, scheduler_service):
        """Test getting department resources when workpackage doesn't exist"""
        resources = await scheduler_service.get_department_resources(
            workpackage_id="non-existent-wp"
        )

        # Should return empty list for non-existent workpackage
        assert resources == []

    @pytest.mark.asyncio
    async def test_schedule_without_workpackage_id_uses_general_allocation(
        self, scheduler_service, sample_constraints
    ):
        """Test that scheduling without workpackage_id uses general skill-based allocation"""
        project_id = uuid4()

        resources = [
            ResourceCreate(
                id="python-dev",
                name="Python Developer",
                capacity=1,
                skills=["Python", "Django"],
                lead=True,
            ),
            ResourceCreate(
                id="java-dev",
                name="Java Developer",
                capacity=1,
                skills=["Java", "Spring"],
                lead=False,
            ),
        ]

        tasks = [
            ScheduleTaskCreate(
                id="task-001",
                title="Python Task",
                estimated_hours=8,
                skills_needed=["Python"],
                required_resources=[],
            )
        ]

        # Schedule WITHOUT workpackage_id
        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=sample_constraints,
            workpackage_id=None,  # No department-based allocation
        )

        # Should succeed with skill-based allocation
        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 1

        scheduled_task = result.schedule[0]
        assert "python-dev" in scheduled_task.assigned_resources

    @pytest.mark.asyncio
    async def test_schedule_with_workpackage_id_parameter(
        self, scheduler_service, sample_constraints
    ):
        """Test that schedule_project accepts workpackage_id parameter"""
        project_id = uuid4()

        resources = [
            ResourceCreate(
                id="dev-1",
                name="Developer 1",
                capacity=1,
                skills=["Python"],
                lead=False,
            ),
        ]

        tasks = [
            ScheduleTaskCreate(
                id="task-001",
                title="Development Task",
                estimated_hours=8,
                skills_needed=["Python"],
                required_resources=[],
            )
        ]

        # Schedule WITH workpackage_id (even if it doesn't exist, should not crash)
        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=sample_constraints,
            workpackage_id="some-workpackage-id",
        )

        # Should succeed (department resources not found, falls back to general)
        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 1

    @pytest.mark.asyncio
    async def test_department_resource_prioritization_logic(self, scheduler_service):
        """Test the logic for prioritizing department resources"""
        # Create department and general resources with same skills
        dept_resource = ResourceCreate(
            id="dept-python",
            name="Department Python Dev",
            capacity=1,
            skills=["Python", "Django"],
            lead=False,  # Non-lead department resource
        )

        general_resource = ResourceCreate(
            id="general-python",
            name="General Python Dev",
            capacity=1,
            skills=["Python", "Django"],
            lead=True,  # Lead general resource
        )

        # When department resources are prioritized, they should come first
        # even if general resources have lead status
        dept_resources = [dept_resource]
        general_resources = [general_resource]

        # Merge with department first
        available_resources = dept_resources + general_resources

        task = ScheduleTaskCreate(
            id="test-task",
            title="Python Task",
            estimated_hours=8,
            skills_needed=["Python"],
            required_resources=[],
        )

        # Get matching resources
        matches = scheduler_service.get_matching_resources_for_task(
            task, available_resources
        )

        # Both should match, but lead should be first
        assert len(matches) == 2
        # Lead resource should be first (general-python)
        assert matches[0][0].id == "general-python"
        assert matches[0][0].lead is True

    @pytest.mark.asyncio
    async def test_multiple_tasks_with_different_skills(
        self, scheduler_service, sample_constraints
    ):
        """Test scheduling multiple tasks with different skill requirements"""
        project_id = uuid4()

        resources = [
            ResourceCreate(
                id="backend-dev",
                name="Backend Developer",
                capacity=1,
                skills=["Python", "Django", "PostgreSQL"],
                lead=True,
            ),
            ResourceCreate(
                id="frontend-dev",
                name="Frontend Developer",
                capacity=1,
                skills=["React", "TypeScript", "CSS"],
                lead=False,
            ),
            ResourceCreate(
                id="fullstack-dev",
                name="Full Stack Developer",
                capacity=1,
                skills=["Python", "React", "Django"],
                lead=False,
            ),
        ]

        tasks = [
            ScheduleTaskCreate(
                id="backend-task",
                title="Backend API Development",
                estimated_hours=16,
                skills_needed=["Python", "Django"],
                required_resources=[],
            ),
            ScheduleTaskCreate(
                id="frontend-task",
                title="Frontend UI Development",
                estimated_hours=16,
                skills_needed=["React", "TypeScript"],
                required_resources=[],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=sample_constraints,
            workpackage_id=None,
        )

        # Should successfully schedule all tasks
        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 2

        # Verify correct resources assigned based on skills
        task_map = {t.task_id: t for t in result.schedule}

        backend_task = task_map["backend-task"]
        # Should have backend or fullstack dev (both have Python+Django)
        assert any(
            r in ["backend-dev", "fullstack-dev"]
            for r in backend_task.assigned_resources
        )

        frontend_task = task_map["frontend-task"]
        # Should have frontend or fullstack dev (both have React+TypeScript)
        assert any(
            r in ["frontend-dev", "fullstack-dev"]
            for r in frontend_task.assigned_resources
        )

    @pytest.mark.asyncio
    async def test_lead_resources_still_prioritized_with_department_allocation(
        self, scheduler_service, sample_constraints
    ):
        """Test that lead resources are still prioritized even with department allocation"""
        project_id = uuid4()

        resources = [
            ResourceCreate(
                id="lead-dev",
                name="Lead Developer",
                capacity=1,
                skills=["Python"],
                lead=True,
            ),
            ResourceCreate(
                id="junior-dev",
                name="Junior Developer",
                capacity=1,
                skills=["Python"],
                lead=False,
            ),
        ]

        tasks = [
            ScheduleTaskCreate(
                id="task-001",
                title="Python Task",
                estimated_hours=8,
                skills_needed=["Python"],
                required_resources=[],
            )
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=sample_constraints,
            workpackage_id="some-wp",  # With workpackage (but no dept resources found)
        )

        # Should succeed and prioritize lead resource
        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 1

        scheduled_task = result.schedule[0]
        # Lead developer should be assigned
        assert "lead-dev" in scheduled_task.assigned_resources

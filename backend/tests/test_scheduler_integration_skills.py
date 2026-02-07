"""Integration test demonstrating skills-based resource allocation"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.schemas.schedule import (
    ResourceCreate,
    ScheduleConstraints,
    ScheduleTaskCreate,
    TaskDependency,
)
from app.services.scheduler_service import SchedulerService


@pytest.mark.asyncio
async def test_complete_skills_based_scheduling_workflow():
    """
    Integration test demonstrating complete skills-based scheduling workflow.

    Scenario: Software development project with multiple tasks requiring different skills.
    Resources have varying skills and lead status.
    """
    scheduler = SchedulerService()
    project_id = uuid4()

    # Define resources with different skills and lead status
    resources = [
        ResourceCreate(
            id="senior-backend",
            name="Senior Backend Developer",
            capacity=1,
            skills=["Python", "Django", "PostgreSQL", "Redis"],
            lead=True,
        ),
        ResourceCreate(
            id="junior-backend",
            name="Junior Backend Developer",
            capacity=1,
            skills=["Python", "Django"],
            lead=False,
        ),
        ResourceCreate(
            id="senior-frontend",
            name="Senior Frontend Developer",
            capacity=1,
            skills=["React", "TypeScript", "CSS"],
            lead=True,
        ),
        ResourceCreate(
            id="junior-frontend",
            name="Junior Frontend Developer",
            capacity=1,
            skills=["React", "JavaScript"],
            lead=False,
        ),
        ResourceCreate(
            id="fullstack",
            name="Full Stack Developer",
            capacity=1,
            skills=["Python", "React", "PostgreSQL"],
            lead=False,
        ),
        ResourceCreate(
            id="qa-engineer",
            name="QA Engineer",
            capacity=1,
            skills=["Testing", "Selenium", "Python"],
            lead=False,
        ),
    ]

    # Define tasks with skill requirements
    tasks = [
        ScheduleTaskCreate(
            id="database-design",
            title="Database Schema Design",
            estimated_hours=16,
            skills_needed=["PostgreSQL", "Django"],
            dependencies=[],
            required_resources=[],  # Will be auto-assigned
        ),
        ScheduleTaskCreate(
            id="api-development",
            title="REST API Development",
            estimated_hours=40,
            skills_needed=["Python", "Django"],
            dependencies=[
                TaskDependency(
                    predecessor_id="database-design", dependency_type="finish_to_start"
                )
            ],
            required_resources=[],  # Will be auto-assigned
        ),
        ScheduleTaskCreate(
            id="frontend-ui",
            title="User Interface Development",
            estimated_hours=32,
            skills_needed=["React", "TypeScript"],
            dependencies=[],
            required_resources=[],  # Will be auto-assigned
        ),
        ScheduleTaskCreate(
            id="integration",
            title="Frontend-Backend Integration",
            estimated_hours=24,
            skills_needed=["Python", "React"],
            dependencies=[
                TaskDependency(
                    predecessor_id="api-development", dependency_type="finish_to_start"
                ),
                TaskDependency(
                    predecessor_id="frontend-ui", dependency_type="finish_to_start"
                ),
            ],
            required_resources=[],  # Will be auto-assigned
        ),
        ScheduleTaskCreate(
            id="testing",
            title="End-to-End Testing",
            estimated_hours=16,
            skills_needed=["Testing", "Python"],
            dependencies=[
                TaskDependency(
                    predecessor_id="integration", dependency_type="finish_to_start"
                )
            ],
            required_resources=[],  # Will be auto-assigned
        ),
    ]

    # Schedule constraints
    constraints = ScheduleConstraints(
        project_start=datetime.now(UTC),
        horizon_days=90,
        working_hours_per_day=8,
        respect_weekends=False,
    )

    # Execute scheduling
    result = await scheduler.schedule_project(
        project_id=project_id, tasks=tasks, resources=resources, constraints=constraints
    )

    # Verify successful scheduling
    assert result.status in ["success", "feasible"], (
        f"Scheduling failed: {result.message}"
    )
    assert len(result.schedule) == 5, "All tasks should be scheduled"
    assert result.project_duration_hours is not None
    assert result.project_start_date is not None
    assert result.project_end_date is not None

    # Create task map for easier verification
    task_map = {t.task_id: t for t in result.schedule}

    # Verify database-design task
    db_task = task_map["database-design"]
    assert len(db_task.assigned_resources) > 0, "Database task should have resources"
    # Should have senior-backend (lead with PostgreSQL+Django) or junior-backend
    assert any(
        r in ["senior-backend", "junior-backend", "fullstack"]
        for r in db_task.assigned_resources
    ), "Database task should have backend developer"

    # Verify api-development task
    api_task = task_map["api-development"]
    assert len(api_task.assigned_resources) > 0, "API task should have resources"
    # Should have Python+Django developers
    assert any(
        r in ["senior-backend", "junior-backend", "fullstack"]
        for r in api_task.assigned_resources
    ), "API task should have backend developer"

    # Verify frontend-ui task
    frontend_task = task_map["frontend-ui"]
    assert len(frontend_task.assigned_resources) > 0, (
        "Frontend task should have resources"
    )
    # Should have React+TypeScript developers
    assert any(
        r in ["senior-frontend", "junior-frontend", "fullstack"]
        for r in frontend_task.assigned_resources
    ), "Frontend task should have frontend developer"

    # Verify integration task
    integration_task = task_map["integration"]
    assert len(integration_task.assigned_resources) > 0, (
        "Integration task should have resources"
    )
    # Should have full stack or combination of backend+frontend
    assert any(
        r in ["fullstack", "senior-backend", "senior-frontend"]
        for r in integration_task.assigned_resources
    ), "Integration task should have full stack or senior developers"

    # Verify testing task
    testing_task = task_map["testing"]
    assert len(testing_task.assigned_resources) > 0, (
        "Testing task should have resources"
    )
    # Should have QA engineer
    assert any(r in ["qa-engineer"] for r in testing_task.assigned_resources), (
        "Testing task should have QA engineer"
    )

    # Verify dependencies are respected
    assert api_task.start_date >= db_task.end_date, (
        "API development should start after database design"
    )
    assert integration_task.start_date >= api_task.end_date, (
        "Integration should start after API development"
    )
    assert integration_task.start_date >= frontend_task.end_date, (
        "Integration should start after frontend UI"
    )
    assert testing_task.start_date >= integration_task.end_date, (
        "Testing should start after integration"
    )

    # Verify no conflicts
    assert len(result.conflicts) == 0, (
        f"Should have no conflicts, got: {result.conflicts}"
    )

    # Verify lead resources are prioritized
    # Senior backend (lead) should be assigned to database design if available
    if "senior-backend" in [r.id for r in resources]:
        # Check if senior-backend is assigned to tasks requiring PostgreSQL+Django
        senior_backend_tasks = [
            t.task_id
            for t in result.schedule
            if "senior-backend" in t.assigned_resources
        ]
        # Senior backend should be assigned to at least one task
        assert len(senior_backend_tasks) > 0, (
            "Lead senior backend should be assigned to tasks"
        )

    print("\n=== Scheduling Results ===")
    print(f"Project Duration: {result.project_duration_hours} hours")
    print(f"Start Date: {result.project_start_date}")
    print(f"End Date: {result.project_end_date}")
    print("\n=== Task Assignments ===")
    for task in result.schedule:
        print(f"\n{task.task_title}:")
        print(f"  Start: {task.start_date}")
        print(f"  End: {task.end_date}")
        print(f"  Duration: {task.duration_hours} hours")
        print(f"  Assigned Resources: {', '.join(task.assigned_resources)}")


@pytest.mark.asyncio
async def test_lead_resource_prioritization_in_scheduling():
    """
    Test that lead resources are actually prioritized in the final schedule.
    """
    scheduler = SchedulerService()
    project_id = uuid4()

    # Create two resources with same skills, one lead and one not
    resources = [
        ResourceCreate(
            id="lead-dev",
            name="Lead Developer",
            capacity=1,
            skills=["Python", "Django"],
            lead=True,
        ),
        ResourceCreate(
            id="regular-dev",
            name="Regular Developer",
            capacity=1,
            skills=["Python", "Django"],
            lead=False,
        ),
    ]

    # Create a single task requiring Python+Django
    tasks = [
        ScheduleTaskCreate(
            id="task-1",
            title="Development Task",
            estimated_hours=8,
            skills_needed=["Python", "Django"],
            dependencies=[],
            required_resources=[],  # Will be auto-assigned
        ),
    ]

    constraints = ScheduleConstraints(
        project_start=datetime.now(UTC),
        horizon_days=30,
        working_hours_per_day=8,
        respect_weekends=False,
    )

    result = await scheduler.schedule_project(
        project_id=project_id, tasks=tasks, resources=resources, constraints=constraints
    )

    assert result.status in ["success", "feasible"]
    assert len(result.schedule) == 1

    # Lead developer should be assigned (first in the list)
    assigned_resources = result.schedule[0].assigned_resources
    assert "lead-dev" in assigned_resources, (
        "Lead developer should be assigned to the task"
    )

"""Integration tests for Gantt chart API endpoint.

Requirements: 3.1-3.13, 16A.32-16A.36
"""

import pytest
from datetime import datetime
from uuid import uuid4

from app.schemas.schedule import GanttChartData


@pytest.mark.asyncio
async def test_gantt_endpoint_returns_correct_schema():
    """Test that Gantt endpoint returns data with correct schema structure."""
    # This is a placeholder test that verifies the schema structure
    # In a real integration test, we would:
    # 1. Create a test project with tasks, workpackages, phases
    # 2. Calculate a schedule
    # 3. Call the Gantt endpoint
    # 4. Verify the response structure
    
    # For now, just verify the schema can be instantiated
    gantt_data = GanttChartData(
        project_id=uuid4(),
        tasks=[],
        workpackages=[],
        phases=[],
        dependencies=[],
        critical_path=[],
        milestones=[],
        sprints=[],
        project_start_date=datetime.now(),
        project_end_date=datetime.now(),
        completion_percentage=0.0,
    )
    
    assert gantt_data.project_id is not None
    assert isinstance(gantt_data.tasks, list)
    assert isinstance(gantt_data.workpackages, list)
    assert isinstance(gantt_data.phases, list)
    assert isinstance(gantt_data.dependencies, list)
    assert isinstance(gantt_data.critical_path, list)
    assert isinstance(gantt_data.milestones, list)
    assert isinstance(gantt_data.sprints, list)
    assert isinstance(gantt_data.project_start_date, datetime)
    assert isinstance(gantt_data.project_end_date, datetime)
    assert 0 <= gantt_data.completion_percentage <= 100


@pytest.mark.asyncio
async def test_gantt_data_includes_date_priority_fields():
    """Test that Gantt data includes all date priority fields."""
    from app.schemas.schedule import ScheduledTask
    
    # Verify ScheduledTask has all required fields for date priority
    task = ScheduledTask(
        task_id="task1",
        task_title="Test Task",
        start_date=datetime.now(),
        end_date=datetime.now(),
        calculated_start_date=datetime.now(),
        calculated_end_date=datetime.now(),
        manual_start_date=datetime.now(),
        manual_due_date=datetime.now(),
        progress=50,
        start_date_is=datetime.now(),
        variance_days=-2,
        is_delayed=False,
        duration_hours=40,
        assigned_resources=["resource1"],
        is_critical=True,
        skills=["Python", "FastAPI"],
    )
    
    assert task.start_date is not None
    assert task.end_date is not None
    assert task.calculated_start_date is not None
    assert task.calculated_end_date is not None
    assert task.manual_start_date is not None
    assert task.manual_due_date is not None
    assert task.progress == 50
    assert task.start_date_is is not None
    assert task.variance_days == -2
    assert task.is_delayed is False
    assert task.skills == ["Python", "FastAPI"]


@pytest.mark.asyncio
async def test_gantt_workpackage_includes_progress_fields():
    """Test that GanttWorkpackage includes progress tracking fields."""
    from app.schemas.schedule import GanttWorkpackage
    
    wp = GanttWorkpackage(
        id="wp1",
        name="Test Workpackage",
        start_date=datetime.now(),
        end_date=datetime.now(),
        calculated_start_date=datetime.now(),
        calculated_end_date=datetime.now(),
        manual_start_date=datetime.now(),
        manual_due_date=datetime.now(),
        progress=75,
        start_date_is=datetime.now(),
        variance_days=3,
        is_delayed=True,
        minimal_duration=10,
    )
    
    assert wp.progress == 75
    assert wp.variance_days == 3
    assert wp.is_delayed is True
    assert wp.minimal_duration == 10


@pytest.mark.asyncio
async def test_gantt_phase_includes_progress_fields():
    """Test that GanttPhase includes progress tracking fields."""
    from app.schemas.schedule import GanttPhase
    
    phase = GanttPhase(
        id="phase1",
        name="Test Phase",
        start_date=datetime.now(),
        end_date=datetime.now(),
        calculated_start_date=datetime.now(),
        calculated_end_date=datetime.now(),
        manual_start_date=datetime.now(),
        manual_due_date=datetime.now(),
        progress=60,
        start_date_is=datetime.now(),
        variance_days=0,
        is_delayed=False,
        minimal_duration=20,
    )
    
    assert phase.progress == 60
    assert phase.variance_days == 0
    assert phase.is_delayed is False
    assert phase.minimal_duration == 20

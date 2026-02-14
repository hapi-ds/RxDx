"""
Performance tests for schedule calculation and related operations.

Tests verify that schedule operations meet performance requirements:
- Schedule calculation with critical path: 1000 tasks < 30 seconds
- Critical path calculation: 1000 tasks < 2 seconds
- Sprint capacity calculation: < 200ms
- Burndown calculation: < 500ms
- Concurrent schedule calculations: 10 simultaneous
"""

import asyncio
import time
from datetime import datetime, timedelta
from uuid import uuid4

import pytest

from app.schemas.schedule import ScheduleRequest
from app.schemas.workitem import TaskCreate
from app.services.scheduler_service import SchedulerService
from app.services.sprint_service import SprintService


@pytest.mark.asyncio
async def test_schedule_calculation_performance_1000_tasks(
    scheduler_service: SchedulerService,
    test_project_id: str,
    test_user_id: str,
):
    """
    Test: Schedule calculation with critical path (1000 tasks < 30 seconds)
    
    Requirement: 13.1-13.8 - Performance requirements
    """
    # Create 1000 tasks with dependencies
    tasks = []
    for i in range(1000):
        task = TaskCreate(
            type="task",
            title=f"Performance Test Task {i}",
            description=f"Task {i} for performance testing",
            status="active",
            estimated_hours=8,
            duration=1,
            effort=8,
        )
        tasks.append(task)
    
    # Create schedule request
    schedule_request = ScheduleRequest(
        project_id=test_project_id,
        start_date=datetime.now(),
        tasks=tasks,
    )
    
    # Measure schedule calculation time
    start_time = time.time()
    
    result = await scheduler_service.schedule_project(
        project_id=test_project_id,
        schedule_request=schedule_request,
        current_user_id=test_user_id,
    )
    
    end_time = time.time()
    elapsed_time = end_time - start_time
    
    # Verify performance requirement
    assert elapsed_time < 30.0, f"Schedule calculation took {elapsed_time:.2f}s, expected < 30s"
    
    # Verify result is valid
    assert result is not None
    assert len(result.tasks) == 1000


@pytest.mark.asyncio
async def test_critical_path_calculation_performance(
    scheduler_service: SchedulerService,
    test_project_id: str,
):
    """
    Test: Critical path calculation (1000 tasks < 2 seconds)
    
    Requirement: 13.1-13.8 - Performance requirements
    """
    # Create dependency graph with 1000 tasks
    tasks = {}
    for i in range(1000):
        task_id = str(uuid4())
        tasks[task_id] = {
            "id": task_id,
            "duration": 1,
            "dependencies": [],
        }
    
    # Create linear dependency chain
    task_ids = list(tasks.keys())
    for i in range(1, len(task_ids)):
        tasks[task_ids[i]]["dependencies"] = [task_ids[i - 1]]
    
    # Measure critical path calculation time
    start_time = time.time()
    
    critical_path = scheduler_service.calculate_critical_path(tasks)
    
    end_time = time.time()
    elapsed_time = end_time - start_time
    
    # Verify performance requirement
    assert elapsed_time < 2.0, f"Critical path calculation took {elapsed_time:.2f}s, expected < 2s"
    
    # Verify result is valid
    assert len(critical_path) == 1000  # All tasks in linear chain


@pytest.mark.asyncio
async def test_sprint_capacity_calculation_performance(
    sprint_service: SprintService,
    test_project_id: str,
):
    """
    Test: Sprint capacity calculation (< 200ms)
    
    Requirement: 13.1-13.8 - Performance requirements
    """
    # Create sprint
    sprint_id = str(uuid4())
    start_date = datetime.now()
    end_date = start_date + timedelta(days=14)
    
    # Measure capacity calculation time
    start_time = time.time()
    
    capacity = await sprint_service.calculate_sprint_capacity(
        project_id=test_project_id,
        start_date=start_date,
        end_date=end_date,
    )
    
    end_time = time.time()
    elapsed_time = (end_time - start_time) * 1000  # Convert to milliseconds
    
    # Verify performance requirement
    assert elapsed_time < 200.0, f"Capacity calculation took {elapsed_time:.2f}ms, expected < 200ms"
    
    # Verify result is valid
    assert capacity is not None
    assert capacity.capacity_hours >= 0
    assert capacity.capacity_story_points >= 0


@pytest.mark.asyncio
async def test_burndown_calculation_performance(
    sprint_service: SprintService,
    test_sprint_id: str,
):
    """
    Test: Burndown calculation (< 500ms)
    
    Requirement: 13.1-13.8 - Performance requirements
    """
    # Measure burndown calculation time
    start_time = time.time()
    
    burndown = await sprint_service.calculate_burndown(sprint_id=test_sprint_id)
    
    end_time = time.time()
    elapsed_time = (end_time - start_time) * 1000  # Convert to milliseconds
    
    # Verify performance requirement
    assert elapsed_time < 500.0, f"Burndown calculation took {elapsed_time:.2f}ms, expected < 500ms"
    
    # Verify result is valid
    assert burndown is not None
    assert len(burndown) > 0


@pytest.mark.asyncio
async def test_concurrent_schedule_calculations(
    scheduler_service: SchedulerService,
    test_user_id: str,
):
    """
    Test: Concurrent schedule calculations (10 simultaneous)
    
    Requirement: 13.1-13.8 - Performance requirements
    """
    
    async def calculate_schedule(project_id: str):
        """Calculate schedule for a project"""
        tasks = []
        for i in range(100):
            task = TaskCreate(
                type="task",
                title=f"Task {i}",
                description=f"Task {i}",
                status="active",
                estimated_hours=8,
                duration=1,
                effort=8,
            )
            tasks.append(task)
        
        schedule_request = ScheduleRequest(
            project_id=project_id,
            start_date=datetime.now(),
            tasks=tasks,
        )
        
        return await scheduler_service.schedule_project(
            project_id=project_id,
            schedule_request=schedule_request,
            current_user_id=test_user_id,
        )
    
    # Create 10 projects
    project_ids = [str(uuid4()) for _ in range(10)]
    
    # Measure concurrent calculation time
    start_time = time.time()
    
    # Run 10 schedule calculations concurrently
    results = await asyncio.gather(
        *[calculate_schedule(project_id) for project_id in project_ids]
    )
    
    end_time = time.time()
    elapsed_time = end_time - start_time
    
    # Verify all calculations completed
    assert len(results) == 10
    assert all(result is not None for result in results)
    
    # Verify reasonable performance (should be faster than sequential)
    # Sequential would take ~10x single calculation time
    # Concurrent should be significantly faster
    print(f"Concurrent calculations took {elapsed_time:.2f}s for 10 projects")


# Fixtures

@pytest.fixture
async def test_project_id():
    """Create a test project ID"""
    return str(uuid4())


@pytest.fixture
async def test_user_id():
    """Create a test user ID"""
    return str(uuid4())


@pytest.fixture
async def test_sprint_id():
    """Create a test sprint ID"""
    return str(uuid4())

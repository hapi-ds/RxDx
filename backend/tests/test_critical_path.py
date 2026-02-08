"""Unit tests for critical path calculation"""

from datetime import UTC, datetime, timedelta

import pytest

from app.schemas.schedule import ScheduledTask, ScheduleTaskCreate, TaskDependency
from app.services.critical_path import calculate_critical_path


def test_calculate_critical_path_simple_linear():
    """Test critical path with simple linear dependencies: A -> B -> C"""
    # Create tasks with linear dependencies
    tasks = [
        ScheduleTaskCreate(
            id="task_a",
            title="Task A",
            estimated_hours=8,
            dependencies=[],
        ),
        ScheduleTaskCreate(
            id="task_b",
            title="Task B",
            estimated_hours=16,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_a", dependency_type="finish_to_start"
                )
            ],
        ),
        ScheduleTaskCreate(
            id="task_c",
            title="Task C",
            estimated_hours=8,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_b", dependency_type="finish_to_start"
                )
            ],
        ),
    ]

    # Create scheduled tasks
    start_date = datetime(2024, 1, 1, 9, 0, tzinfo=UTC)
    scheduled_tasks = [
        ScheduledTask(
            task_id="task_a",
            task_title="Task A",
            start_date=start_date,
            end_date=start_date + timedelta(hours=8),
            duration_hours=8,
            assigned_resources=[],
        ),
        ScheduledTask(
            task_id="task_b",
            task_title="Task B",
            start_date=start_date + timedelta(hours=8),
            end_date=start_date + timedelta(hours=24),
            duration_hours=16,
            assigned_resources=[],
        ),
        ScheduledTask(
            task_id="task_c",
            task_title="Task C",
            start_date=start_date + timedelta(hours=24),
            end_date=start_date + timedelta(hours=32),
            duration_hours=8,
            assigned_resources=[],
        ),
    ]

    # Calculate critical path
    critical_path = calculate_critical_path(tasks, scheduled_tasks)

    # All tasks should be on critical path in linear sequence
    assert critical_path == ["task_a", "task_b", "task_c"]


def test_calculate_critical_path_parallel_tasks():
    """Test critical path with parallel tasks: A -> B, A -> C -> D"""
    tasks = [
        ScheduleTaskCreate(
            id="task_a",
            title="Task A",
            estimated_hours=8,
            dependencies=[],
        ),
        ScheduleTaskCreate(
            id="task_b",
            title="Task B",
            estimated_hours=4,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_a", dependency_type="finish_to_start"
                )
            ],
        ),
        ScheduleTaskCreate(
            id="task_c",
            title="Task C",
            estimated_hours=8,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_a", dependency_type="finish_to_start"
                )
            ],
        ),
        ScheduleTaskCreate(
            id="task_d",
            title="Task D",
            estimated_hours=8,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_c", dependency_type="finish_to_start"
                )
            ],
        ),
    ]

    start_date = datetime(2024, 1, 1, 9, 0, tzinfo=UTC)
    scheduled_tasks = [
        ScheduledTask(
            task_id="task_a",
            task_title="Task A",
            start_date=start_date,
            end_date=start_date + timedelta(hours=8),
            duration_hours=8,
            assigned_resources=[],
        ),
        ScheduledTask(
            task_id="task_b",
            task_title="Task B",
            start_date=start_date + timedelta(hours=8),
            end_date=start_date + timedelta(hours=12),
            duration_hours=4,
            assigned_resources=[],
        ),
        ScheduledTask(
            task_id="task_c",
            task_title="Task C",
            start_date=start_date + timedelta(hours=8),
            end_date=start_date + timedelta(hours=16),
            duration_hours=8,
            assigned_resources=[],
        ),
        ScheduledTask(
            task_id="task_d",
            task_title="Task D",
            start_date=start_date + timedelta(hours=16),
            end_date=start_date + timedelta(hours=24),
            duration_hours=8,
            assigned_resources=[],
        ),
    ]

    # Calculate critical path
    critical_path = calculate_critical_path(tasks, scheduled_tasks)

    # Critical path should be A -> C -> D (longer path)
    assert critical_path == ["task_a", "task_c", "task_d"]


def test_calculate_critical_path_complex_dependencies():
    """Test critical path with complex dependency graph"""
    tasks = [
        ScheduleTaskCreate(
            id="task_1",
            title="Task 1",
            estimated_hours=8,
            dependencies=[],
        ),
        ScheduleTaskCreate(
            id="task_2",
            title="Task 2",
            estimated_hours=16,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_1", dependency_type="finish_to_start"
                )
            ],
        ),
        ScheduleTaskCreate(
            id="task_3",
            title="Task 3",
            estimated_hours=8,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_1", dependency_type="finish_to_start"
                )
            ],
        ),
        ScheduleTaskCreate(
            id="task_4",
            title="Task 4",
            estimated_hours=8,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_2", dependency_type="finish_to_start"
                ),
                TaskDependency(
                    predecessor_id="task_3", dependency_type="finish_to_start"
                ),
            ],
        ),
    ]

    start_date = datetime(2024, 1, 1, 9, 0, tzinfo=UTC)
    scheduled_tasks = [
        ScheduledTask(
            task_id="task_1",
            task_title="Task 1",
            start_date=start_date,
            end_date=start_date + timedelta(hours=8),
            duration_hours=8,
            assigned_resources=[],
        ),
        ScheduledTask(
            task_id="task_2",
            task_title="Task 2",
            start_date=start_date + timedelta(hours=8),
            end_date=start_date + timedelta(hours=24),
            duration_hours=16,
            assigned_resources=[],
        ),
        ScheduledTask(
            task_id="task_3",
            task_title="Task 3",
            start_date=start_date + timedelta(hours=8),
            end_date=start_date + timedelta(hours=16),
            duration_hours=8,
            assigned_resources=[],
        ),
        ScheduledTask(
            task_id="task_4",
            task_title="Task 4",
            start_date=start_date + timedelta(hours=24),
            end_date=start_date + timedelta(hours=32),
            duration_hours=8,
            assigned_resources=[],
        ),
    ]

    # Calculate critical path
    critical_path = calculate_critical_path(tasks, scheduled_tasks)

    # Critical path should be 1 -> 2 -> 4 (longest path)
    assert critical_path == ["task_1", "task_2", "task_4"]


def test_calculate_critical_path_single_task():
    """Test critical path with single task"""
    tasks = [
        ScheduleTaskCreate(
            id="task_a",
            title="Task A",
            estimated_hours=8,
            dependencies=[],
        ),
    ]

    start_date = datetime(2024, 1, 1, 9, 0, tzinfo=UTC)
    scheduled_tasks = [
        ScheduledTask(
            task_id="task_a",
            task_title="Task A",
            start_date=start_date,
            end_date=start_date + timedelta(hours=8),
            duration_hours=8,
            assigned_resources=[],
        ),
    ]

    # Calculate critical path
    critical_path = calculate_critical_path(tasks, scheduled_tasks)

    # Single task is the critical path
    assert critical_path == ["task_a"]


def test_calculate_critical_path_empty_tasks():
    """Test critical path with no tasks"""
    tasks = []
    scheduled_tasks = []

    # Calculate critical path
    critical_path = calculate_critical_path(tasks, scheduled_tasks)

    # Empty list expected
    assert critical_path == []


def test_calculate_critical_path_circular_dependency():
    """Test critical path with circular dependency raises error"""
    tasks = [
        ScheduleTaskCreate(
            id="task_a",
            title="Task A",
            estimated_hours=8,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_c", dependency_type="finish_to_start"
                )
            ],
        ),
        ScheduleTaskCreate(
            id="task_b",
            title="Task B",
            estimated_hours=8,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_a", dependency_type="finish_to_start"
                )
            ],
        ),
        ScheduleTaskCreate(
            id="task_c",
            title="Task C",
            estimated_hours=8,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_b", dependency_type="finish_to_start"
                )
            ],
        ),
    ]

    start_date = datetime(2024, 1, 1, 9, 0, tzinfo=UTC)
    scheduled_tasks = [
        ScheduledTask(
            task_id="task_a",
            task_title="Task A",
            start_date=start_date,
            end_date=start_date + timedelta(hours=8),
            duration_hours=8,
            assigned_resources=[],
        ),
        ScheduledTask(
            task_id="task_b",
            task_title="Task B",
            start_date=start_date + timedelta(hours=8),
            end_date=start_date + timedelta(hours=16),
            duration_hours=8,
            assigned_resources=[],
        ),
        ScheduledTask(
            task_id="task_c",
            task_title="Task C",
            start_date=start_date + timedelta(hours=16),
            end_date=start_date + timedelta(hours=24),
            duration_hours=8,
            assigned_resources=[],
        ),
    ]

    # Should raise ValueError for circular dependency
    with pytest.raises(ValueError, match="Circular dependencies detected"):
        calculate_critical_path(tasks, scheduled_tasks)


def test_calculate_critical_path_missing_scheduled_task():
    """Test critical path when scheduled task is missing"""
    tasks = [
        ScheduleTaskCreate(
            id="task_a",
            title="Task A",
            estimated_hours=8,
            dependencies=[],
        ),
        ScheduleTaskCreate(
            id="task_b",
            title="Task B",
            estimated_hours=8,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_a", dependency_type="finish_to_start"
                )
            ],
        ),
    ]

    start_date = datetime(2024, 1, 1, 9, 0, tzinfo=UTC)
    scheduled_tasks = [
        ScheduledTask(
            task_id="task_a",
            task_title="Task A",
            start_date=start_date,
            end_date=start_date + timedelta(hours=8),
            duration_hours=8,
            assigned_resources=[],
        ),
        # task_b is missing from scheduled tasks
    ]

    # Should return empty list when tasks are missing
    critical_path = calculate_critical_path(tasks, scheduled_tasks)
    assert critical_path == []


def test_calculate_critical_path_multiple_start_tasks():
    """Test critical path with multiple tasks having no dependencies"""
    tasks = [
        ScheduleTaskCreate(
            id="task_a",
            title="Task A",
            estimated_hours=8,
            dependencies=[],
        ),
        ScheduleTaskCreate(
            id="task_b",
            title="Task B",
            estimated_hours=4,
            dependencies=[],
        ),
        ScheduleTaskCreate(
            id="task_c",
            title="Task C",
            estimated_hours=16,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_a", dependency_type="finish_to_start"
                )
            ],
        ),
        ScheduleTaskCreate(
            id="task_d",
            title="Task D",
            estimated_hours=8,
            dependencies=[
                TaskDependency(
                    predecessor_id="task_b", dependency_type="finish_to_start"
                )
            ],
        ),
    ]

    start_date = datetime(2024, 1, 1, 9, 0, tzinfo=UTC)
    scheduled_tasks = [
        ScheduledTask(
            task_id="task_a",
            task_title="Task A",
            start_date=start_date,
            end_date=start_date + timedelta(hours=8),
            duration_hours=8,
            assigned_resources=[],
        ),
        ScheduledTask(
            task_id="task_b",
            task_title="Task B",
            start_date=start_date,
            end_date=start_date + timedelta(hours=4),
            duration_hours=4,
            assigned_resources=[],
        ),
        ScheduledTask(
            task_id="task_c",
            task_title="Task C",
            start_date=start_date + timedelta(hours=8),
            end_date=start_date + timedelta(hours=24),
            duration_hours=16,
            assigned_resources=[],
        ),
        ScheduledTask(
            task_id="task_d",
            task_title="Task D",
            start_date=start_date + timedelta(hours=4),
            end_date=start_date + timedelta(hours=12),
            duration_hours=8,
            assigned_resources=[],
        ),
    ]

    # Calculate critical path
    critical_path = calculate_critical_path(tasks, scheduled_tasks)

    # Critical path should be A -> C (longest path)
    assert critical_path == ["task_a", "task_c"]

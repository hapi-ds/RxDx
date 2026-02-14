"""Unit tests for Gantt chart data preparation utilities.

Requirements: 16A.32-16A.36, 3.1-3.13
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from app.utils.gantt_utils import (
    _calculate_project_completion,
    _calculate_project_end,
    _calculate_project_start,
    _parse_datetime,
)
from app.schemas.schedule import GanttPhase, GanttWorkpackage, ScheduledTask


class TestParseDatetime:
    """Test datetime parsing utility."""
    
    def test_parse_none(self):
        """Test parsing None returns None."""
        assert _parse_datetime(None) is None
    
    def test_parse_datetime_object(self):
        """Test parsing datetime object returns as-is."""
        dt = datetime(2024, 1, 1, 12, 0, 0)
        assert _parse_datetime(dt) == dt
    
    def test_parse_iso_string(self):
        """Test parsing ISO format string."""
        dt_str = "2024-01-01T12:00:00"
        result = _parse_datetime(dt_str)
        assert result == datetime(2024, 1, 1, 12, 0, 0)
    
    def test_parse_iso_string_with_z(self):
        """Test parsing ISO format string with Z timezone."""
        dt_str = "2024-01-01T12:00:00Z"
        result = _parse_datetime(dt_str)
        assert result is not None
        assert result.year == 2024
        assert result.month == 1
        assert result.day == 1
    
    def test_parse_invalid_string(self):
        """Test parsing invalid string returns None."""
        assert _parse_datetime("invalid") is None


class TestCalculateProjectStart:
    """Test project start date calculation."""
    
    def test_empty_entities(self):
        """Test with no entities returns current time."""
        result = _calculate_project_start([], [], [])
        assert isinstance(result, datetime)
        # Should be close to now
        assert abs((result - datetime.now()).total_seconds()) < 5
    
    def test_single_task(self):
        """Test with single task."""
        start = datetime(2024, 1, 1)
        task = ScheduledTask(
            task_id="task1",
            task_title="Task 1",
            start_date=start,
            end_date=datetime(2024, 1, 10),
            duration_hours=80,
        )
        result = _calculate_project_start([task], [], [])
        assert result == start
    
    def test_multiple_entities(self):
        """Test with multiple entities returns earliest date."""
        task = ScheduledTask(
            task_id="task1",
            task_title="Task 1",
            start_date=datetime(2024, 1, 5),
            end_date=datetime(2024, 1, 10),
            duration_hours=40,
        )
        wp = GanttWorkpackage(
            id="wp1",
            name="WP 1",
            start_date=datetime(2024, 1, 1),  # Earliest
            end_date=datetime(2024, 1, 15),
        )
        phase = GanttPhase(
            id="phase1",
            name="Phase 1",
            start_date=datetime(2024, 1, 3),
            end_date=datetime(2024, 1, 20),
        )
        
        result = _calculate_project_start([task], [wp], [phase])
        assert result == datetime(2024, 1, 1)


class TestCalculateProjectEnd:
    """Test project end date calculation."""
    
    def test_empty_entities(self):
        """Test with no entities returns current time."""
        result = _calculate_project_end([], [], [])
        assert isinstance(result, datetime)
        # Should be close to now
        assert abs((result - datetime.now()).total_seconds()) < 5
    
    def test_single_task(self):
        """Test with single task."""
        end = datetime(2024, 1, 10)
        task = ScheduledTask(
            task_id="task1",
            task_title="Task 1",
            start_date=datetime(2024, 1, 1),
            end_date=end,
            duration_hours=80,
        )
        result = _calculate_project_end([task], [], [])
        assert result == end
    
    def test_multiple_entities(self):
        """Test with multiple entities returns latest date."""
        task = ScheduledTask(
            task_id="task1",
            task_title="Task 1",
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 10),
            duration_hours=80,
        )
        wp = GanttWorkpackage(
            id="wp1",
            name="WP 1",
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 15),
        )
        phase = GanttPhase(
            id="phase1",
            name="Phase 1",
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 25),  # Latest
        )
        
        result = _calculate_project_end([task], [wp], [phase])
        assert result == datetime(2024, 1, 25)


class TestCalculateProjectCompletion:
    """Test project completion percentage calculation."""
    
    def test_no_tasks(self):
        """Test with no tasks returns 0."""
        result = _calculate_project_completion([], [], [])
        assert result == 0.0
    
    def test_single_task_complete(self):
        """Test with single completed task."""
        task = ScheduledTask(
            task_id="task1",
            task_title="Task 1",
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 10),
            duration_hours=80,
            progress=100,
        )
        result = _calculate_project_completion([task], [], [])
        assert result == 100.0
    
    def test_single_task_partial(self):
        """Test with single partially complete task."""
        task = ScheduledTask(
            task_id="task1",
            task_title="Task 1",
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 10),
            duration_hours=80,
            progress=50,
        )
        result = _calculate_project_completion([task], [], [])
        assert result == 50.0
    
    def test_multiple_tasks(self):
        """Test with multiple tasks calculates average."""
        tasks = [
            ScheduledTask(
                task_id="task1",
                task_title="Task 1",
                start_date=datetime(2024, 1, 1),
                end_date=datetime(2024, 1, 10),
                duration_hours=80,
                progress=100,
            ),
            ScheduledTask(
                task_id="task2",
                task_title="Task 2",
                start_date=datetime(2024, 1, 5),
                end_date=datetime(2024, 1, 15),
                duration_hours=80,
                progress=50,
            ),
            ScheduledTask(
                task_id="task3",
                task_title="Task 3",
                start_date=datetime(2024, 1, 10),
                end_date=datetime(2024, 1, 20),
                duration_hours=80,
                progress=0,
            ),
        ]
        result = _calculate_project_completion(tasks, [], [])
        # (100 + 50 + 0) / 3 = 50.0
        assert result == 50.0
    
    def test_rounding(self):
        """Test that result is rounded to 2 decimal places."""
        tasks = [
            ScheduledTask(
                task_id="task1",
                task_title="Task 1",
                start_date=datetime(2024, 1, 1),
                end_date=datetime(2024, 1, 10),
                duration_hours=80,
                progress=33,
            ),
            ScheduledTask(
                task_id="task2",
                task_title="Task 2",
                start_date=datetime(2024, 1, 5),
                end_date=datetime(2024, 1, 15),
                duration_hours=80,
                progress=33,
            ),
            ScheduledTask(
                task_id="task3",
                task_title="Task 3",
                start_date=datetime(2024, 1, 10),
                end_date=datetime(2024, 1, 20),
                duration_hours=80,
                progress=34,
            ),
        ]
        result = _calculate_project_completion(tasks, [], [])
        # (33 + 33 + 34) / 3 = 33.333... -> 33.33
        assert result == 33.33

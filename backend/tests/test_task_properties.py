"""Unit tests for Task-specific properties on WorkItem nodes"""

import pytest
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.workitem import TaskCreate, TaskUpdate


class TestTaskPropertiesValidation:
    """Test validation of task-specific properties"""

    def test_skills_needed_valid_array(self):
        """Test that skills_needed accepts valid array of strings"""
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            status="draft",
            skills_needed=["Python", "FastAPI", "PostgreSQL"]
        )
        assert task.skills_needed == ["Python", "FastAPI", "PostgreSQL"]

    def test_skills_needed_empty_array(self):
        """Test that empty skills_needed array is converted to None"""
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            status="draft",
            skills_needed=[]
        )
        assert task.skills_needed is None

    def test_skills_needed_removes_duplicates(self):
        """Test that duplicate skills are removed (case-insensitive)"""
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            status="draft",
            skills_needed=["Python", "python", "PYTHON", "FastAPI"]
        )
        assert task.skills_needed == ["Python", "FastAPI"]

    def test_skills_needed_trims_whitespace(self):
        """Test that skills are trimmed of whitespace"""
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            status="draft",
            skills_needed=["  Python  ", "FastAPI"]
        )
        assert task.skills_needed == ["Python", "FastAPI"]

    def test_skills_needed_rejects_empty_strings(self):
        """Test that empty strings in skills_needed are rejected"""
        with pytest.raises(ValueError, match="Skills cannot be empty strings"):
            TaskCreate(
                type="task",
                title="Implement authentication",
                status="draft",
                skills_needed=["Python", "", "FastAPI"]
            )

    def test_skills_needed_rejects_non_strings(self):
        """Test that non-string values in skills_needed are rejected"""
        from pydantic import ValidationError
        with pytest.raises(ValidationError, match="Input should be a valid string"):
            TaskCreate(
                type="task",
                title="Implement authentication",
                status="draft",
                skills_needed=["Python", 123, "FastAPI"]  # type: ignore
            )

    def test_skills_needed_rejects_too_long(self):
        """Test that skills longer than 100 characters are rejected"""
        with pytest.raises(ValueError, match="Skill name cannot exceed 100 characters"):
            TaskCreate(
                type="task",
                title="Implement authentication",
                status="draft",
                skills_needed=["Python", "A" * 101]
            )

    def test_skills_needed_none_is_valid(self):
        """Test that skills_needed can be None"""
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            status="draft",
            skills_needed=None
        )
        assert task.skills_needed is None

    def test_workpackage_id_valid_uuid(self):
        """Test that workpackage_id accepts valid UUID"""
        wp_id = uuid4()
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            status="draft",
            workpackage_id=wp_id
        )
        assert task.workpackage_id == wp_id

    def test_workpackage_id_none_is_valid(self):
        """Test that workpackage_id can be None"""
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            status="draft",
            workpackage_id=None
        )
        assert task.workpackage_id is None

    def test_story_points_valid_range(self):
        """Test that story_points accepts valid values"""
        for points in [0, 1, 5, 13, 21, 50, 100]:
            task = TaskCreate(
                type="task",
                title="Implement authentication",
                status="draft",
                story_points=points
            )
            assert task.story_points == points

    def test_story_points_rejects_negative(self):
        """Test that negative story_points are rejected"""
        from pydantic import ValidationError
        with pytest.raises(ValidationError, match="Input should be greater than or equal to 0"):
            TaskCreate(
                type="task",
                title="Implement authentication",
                status="draft",
                story_points=-1
            )

    def test_story_points_rejects_too_large(self):
        """Test that story_points over 100 are rejected"""
        from pydantic import ValidationError
        with pytest.raises(ValidationError, match="Input should be less than or equal to 100"):
            TaskCreate(
                type="task",
                title="Implement authentication",
                status="draft",
                story_points=101
            )

    def test_story_points_none_is_valid(self):
        """Test that story_points can be None"""
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            status="draft",
            story_points=None
        )
        assert task.story_points is None

    def test_done_default_false(self):
        """Test that done defaults to False"""
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            status="draft"
        )
        assert task.done is False

    def test_done_can_be_set_true(self):
        """Test that done can be set to True"""
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            status="draft",
            done=True
        )
        assert task.done is True

    def test_start_date_valid_datetime(self):
        """Test that start_date accepts valid timezone-aware datetime"""
        now = datetime.now(timezone.utc)
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            status="draft",
            start_date=now
        )
        assert task.start_date == now

    def test_start_date_rejects_naive_datetime(self):
        """Test that start_date rejects timezone-naive datetime"""
        naive_dt = datetime.now()
        with pytest.raises(ValueError, match="Dates must be timezone-aware"):
            TaskCreate(
                type="task",
                title="Implement authentication",
                status="draft",
                start_date=naive_dt
            )

    def test_end_date_valid_datetime(self):
        """Test that end_date accepts valid timezone-aware datetime"""
        now = datetime.now(timezone.utc)
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            status="draft",
            end_date=now
        )
        assert task.end_date == now

    def test_end_date_rejects_naive_datetime(self):
        """Test that end_date rejects timezone-naive datetime"""
        naive_dt = datetime.now()
        with pytest.raises(ValueError, match="Dates must be timezone-aware"):
            TaskCreate(
                type="task",
                title="Implement authentication",
                status="draft",
                end_date=naive_dt
            )

    def test_due_date_valid_datetime(self):
        """Test that due_date accepts valid timezone-aware datetime"""
        now = datetime.now(timezone.utc)
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            status="draft",
            due_date=now
        )
        assert task.due_date == now

    def test_all_task_properties_together(self):
        """Test that all task properties can be set together"""
        wp_id = uuid4()
        now = datetime.now(timezone.utc)
        
        task = TaskCreate(
            type="task",
            title="Implement authentication",
            description="Add JWT-based authentication",
            status="draft",
            priority=3,
            skills_needed=["Python", "FastAPI", "JWT"],
            workpackage_id=wp_id,
            story_points=8,
            done=False,
            start_date=now,
            end_date=now,
            due_date=now,
            estimated_hours=16.0,
            actual_hours=0.0
        )
        
        assert task.type == "task"
        assert task.title == "Implement authentication"
        assert task.skills_needed == ["Python", "FastAPI", "JWT"]
        assert task.workpackage_id == wp_id
        assert task.story_points == 8
        assert task.done is False
        assert task.start_date == now
        assert task.end_date == now
        assert task.due_date == now


class TestTaskUpdateValidation:
    """Test validation of task updates"""

    def test_update_skills_needed(self):
        """Test updating skills_needed"""
        update = TaskUpdate(
            skills_needed=["Python", "Django"]
        )
        assert update.skills_needed == ["Python", "Django"]

    def test_update_skills_needed_validation(self):
        """Test that skills_needed validation works in updates"""
        with pytest.raises(ValueError, match="Skills cannot be empty strings"):
            TaskUpdate(
                skills_needed=["Python", "", "Django"]
            )

    def test_update_workpackage_id(self):
        """Test updating workpackage_id"""
        wp_id = uuid4()
        update = TaskUpdate(
            workpackage_id=wp_id
        )
        assert update.workpackage_id == wp_id

    def test_update_story_points(self):
        """Test updating story_points"""
        update = TaskUpdate(
            story_points=13
        )
        assert update.story_points == 13

    def test_update_done(self):
        """Test updating done flag"""
        update = TaskUpdate(
            done=True
        )
        assert update.done is True

    def test_update_start_date(self):
        """Test updating start_date"""
        now = datetime.now(timezone.utc)
        update = TaskUpdate(
            start_date=now
        )
        assert update.start_date == now

    def test_update_end_date(self):
        """Test updating end_date"""
        now = datetime.now(timezone.utc)
        update = TaskUpdate(
            end_date=now
        )
        assert update.end_date == now

    def test_update_all_task_properties(self):
        """Test updating all task properties together"""
        wp_id = uuid4()
        now = datetime.now(timezone.utc)
        
        update = TaskUpdate(
            title="Updated title",
            skills_needed=["Python", "FastAPI"],
            workpackage_id=wp_id,
            story_points=5,
            done=True,
            start_date=now,
            end_date=now
        )
        
        assert update.title == "Updated title"
        assert update.skills_needed == ["Python", "FastAPI"]
        assert update.workpackage_id == wp_id
        assert update.story_points == 5
        assert update.done is True
        assert update.start_date == now
        assert update.end_date == now


class TestTaskPropertiesIntegration:
    """Integration tests for task properties with WorkItem service"""
    
    # Note: Integration tests require workitem_service fixture
    # These tests will be implemented when the fixture is available
    pass

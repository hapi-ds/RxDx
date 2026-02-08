"""Unit tests for Backlog Pydantic schemas"""

import pytest
from datetime import datetime, UTC
from uuid import uuid4
from pydantic import ValidationError

from app.schemas.backlog import (
    BacklogCreate,
    BacklogUpdate,
    BacklogResponse,
    BacklogTaskResponse,
)


class TestBacklogCreate:
    """Tests for BacklogCreate schema"""

    def test_valid_backlog_create(self):
        """Test creating a valid backlog"""
        project_id = uuid4()
        backlog = BacklogCreate(
            name="Product Backlog",
            description="Main product backlog",
            project_id=project_id
        )

        assert backlog.name == "Product Backlog"
        assert backlog.description == "Main product backlog"
        assert backlog.project_id == project_id

    def test_backlog_create_without_description(self):
        """Test creating a backlog without description"""
        project_id = uuid4()
        backlog = BacklogCreate(
            name="Sprint Backlog",
            project_id=project_id
        )

        assert backlog.name == "Sprint Backlog"
        assert backlog.description is None
        assert backlog.project_id == project_id

    def test_backlog_create_name_too_short(self):
        """Test that name must be at least 3 characters"""
        project_id = uuid4()

        with pytest.raises(ValueError, match="at least 3 characters"):
            BacklogCreate(
                name="AB",
                project_id=project_id
            )

    def test_backlog_create_name_too_long(self):
        """Test that name cannot exceed 200 characters"""
        project_id = uuid4()

        with pytest.raises(ValidationError, match="at most 200 characters"):
            BacklogCreate(
                name="A" * 201,
                project_id=project_id
            )

    def test_backlog_create_empty_name(self):
        """Test that name cannot be empty or whitespace"""
        project_id = uuid4()

        with pytest.raises(ValueError, match="cannot be empty"):
            BacklogCreate(
                name="   ",
                project_id=project_id
            )

    def test_backlog_create_description_too_long(self):
        """Test that description cannot exceed 2000 characters"""
        project_id = uuid4()

        with pytest.raises(ValueError, match="cannot exceed 2000 characters"):
            BacklogCreate(
                name="Test Backlog",
                description="A" * 2001,
                project_id=project_id
            )

    def test_backlog_create_strips_whitespace(self):
        """Test that name is stripped of leading/trailing whitespace"""
        project_id = uuid4()
        backlog = BacklogCreate(
            name="  Product Backlog  ",
            description="  Main backlog  ",
            project_id=project_id
        )

        assert backlog.name == "Product Backlog"
        assert backlog.description == "Main backlog"


class TestBacklogUpdate:
    """Tests for BacklogUpdate schema"""

    def test_valid_backlog_update(self):
        """Test updating backlog fields"""
        update = BacklogUpdate(
            name="Updated Backlog",
            description="Updated description"
        )

        assert update.name == "Updated Backlog"
        assert update.description == "Updated description"

    def test_backlog_update_partial(self):
        """Test partial update (only some fields)"""
        update = BacklogUpdate(name="New Name")

        assert update.name == "New Name"
        assert update.description is None

    def test_backlog_update_name_validation(self):
        """Test that name validation works in updates"""
        with pytest.raises(ValueError, match="at least 3 characters"):
            BacklogUpdate(name="AB")

        with pytest.raises(ValidationError, match="at most 200 characters"):
            BacklogUpdate(name="A" * 201)

        with pytest.raises(ValueError, match="cannot be empty"):
            BacklogUpdate(name="   ")

    def test_backlog_update_description_validation(self):
        """Test that description validation works in updates"""
        with pytest.raises(ValueError, match="cannot exceed 2000 characters"):
            BacklogUpdate(description="A" * 2001)


class TestBacklogResponse:
    """Tests for BacklogResponse schema"""

    def test_valid_backlog_response(self):
        """Test creating a valid backlog response"""
        backlog_id = uuid4()
        project_id = uuid4()
        now = datetime.now(UTC)

        response = BacklogResponse(
            id=backlog_id,
            name="Product Backlog",
            description="Main backlog",
            project_id=project_id,
            task_count=5,
            created_at=now,
            updated_at=now
        )

        assert response.id == backlog_id
        assert response.name == "Product Backlog"
        assert response.description == "Main backlog"
        assert response.project_id == project_id
        assert response.task_count == 5
        assert response.created_at == now
        assert response.updated_at == now

    def test_backlog_response_defaults(self):
        """Test backlog response with default values"""
        backlog_id = uuid4()
        project_id = uuid4()
        now = datetime.now(UTC)

        response = BacklogResponse(
            id=backlog_id,
            name="Product Backlog",
            project_id=project_id,
            created_at=now
        )

        assert response.task_count == 0
        assert response.description is None
        assert response.updated_at is None


class TestBacklogTaskResponse:
    """Tests for BacklogTaskResponse schema"""

    def test_valid_backlog_task_response(self):
        """Test creating a valid backlog task response"""
        task_id = uuid4()
        now = datetime.now(UTC)

        task = BacklogTaskResponse(
            task_id=task_id,
            task_title="Implement feature X",
            task_type="task",
            task_status="ready",
            priority_order=1,
            added_at=now,
            estimated_hours=8.0,
            story_points=5
        )

        assert task.task_id == task_id
        assert task.task_title == "Implement feature X"
        assert task.task_type == "task"
        assert task.task_status == "ready"
        assert task.priority_order == 1
        assert task.added_at == now
        assert task.estimated_hours == 8.0
        assert task.story_points == 5

    def test_backlog_task_response_without_estimates(self):
        """Test backlog task response without estimates"""
        task_id = uuid4()
        now = datetime.now(UTC)

        task = BacklogTaskResponse(
            task_id=task_id,
            task_title="Implement feature Y",
            task_type="task",
            task_status="draft",
            priority_order=2,
            added_at=now
        )

        assert task.estimated_hours is None
        assert task.story_points is None

    def test_backlog_task_response_priority_order_non_negative(self):
        """Test that priority_order must be non-negative"""
        task_id = uuid4()
        now = datetime.now(UTC)

        with pytest.raises(ValueError):
            BacklogTaskResponse(
                task_id=task_id,
                task_title="Test task",
                task_type="task",
                task_status="ready",
                priority_order=-1,
                added_at=now
            )

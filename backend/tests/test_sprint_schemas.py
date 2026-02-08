"""Unit tests for Sprint Pydantic schemas"""

import pytest
from datetime import datetime, timedelta, UTC
from uuid import uuid4

from pydantic import ValidationError

from app.schemas.sprint import (
    SprintCreate,
    SprintUpdate,
    SprintResponse,
    SprintVelocity,
    BurndownPoint
)


def test_sprint_create_valid():
    """Test creating a valid Sprint"""
    project_id = uuid4()
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=14)
    
    sprint = SprintCreate(
        name="Sprint 1",
        goal="Implement user authentication",
        start_date=start_date,
        end_date=end_date,
        capacity_hours=320.0,
        capacity_story_points=40,
        project_id=project_id
    )
    
    assert sprint.name == "Sprint 1"
    assert sprint.goal == "Implement user authentication"
    assert sprint.status == "planning"
    assert sprint.capacity_hours == 320.0
    assert sprint.capacity_story_points == 40


def test_sprint_create_end_before_start():
    """Test that end_date must be after start_date"""
    project_id = uuid4()
    start_date = datetime.now(UTC)
    end_date = start_date - timedelta(days=1)
    
    with pytest.raises(ValidationError) as exc_info:
        SprintCreate(
            name="Sprint 1",
            start_date=start_date,
            end_date=end_date,
            project_id=project_id
        )
    
    assert "End date must be after start date" in str(exc_info.value)


def test_sprint_create_duration_too_long():
    """Test that sprint duration cannot exceed 30 days"""
    project_id = uuid4()
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=31)
    
    with pytest.raises(ValidationError) as exc_info:
        SprintCreate(
            name="Sprint 1",
            start_date=start_date,
            end_date=end_date,
            project_id=project_id
        )
    
    assert "Sprint duration cannot exceed 30 days" in str(exc_info.value)


def test_sprint_create_duration_too_short():
    """Test that sprint duration must be at least 1 day"""
    project_id = uuid4()
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(hours=12)
    
    with pytest.raises(ValidationError) as exc_info:
        SprintCreate(
            name="Sprint 1",
            start_date=start_date,
            end_date=end_date,
            project_id=project_id
        )
    
    assert "Sprint duration must be at least 1 day" in str(exc_info.value)


def test_sprint_create_name_too_short():
    """Test that sprint name must be at least 3 characters"""
    project_id = uuid4()
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=14)
    
    with pytest.raises(ValidationError) as exc_info:
        SprintCreate(
            name="S1",
            start_date=start_date,
            end_date=end_date,
            project_id=project_id
        )
    
    assert "Name must be at least 3 characters long" in str(exc_info.value)


def test_sprint_create_goal_too_short():
    """Test that sprint goal must be at least 10 characters if provided"""
    project_id = uuid4()
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=14)
    
    with pytest.raises(ValidationError) as exc_info:
        SprintCreate(
            name="Sprint 1",
            goal="Short",
            start_date=start_date,
            end_date=end_date,
            project_id=project_id
        )
    
    assert "Goal must be at least 10 characters long" in str(exc_info.value)


def test_sprint_create_invalid_status():
    """Test that sprint status must be one of allowed values"""
    project_id = uuid4()
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=14)
    
    with pytest.raises(ValidationError) as exc_info:
        SprintCreate(
            name="Sprint 1",
            start_date=start_date,
            end_date=end_date,
            status="invalid_status",
            project_id=project_id
        )
    
    assert "Status must be one of" in str(exc_info.value)


def test_sprint_create_valid_statuses():
    """Test all valid sprint statuses"""
    valid_statuses = ["planning", "active", "completed", "cancelled"]
    project_id = uuid4()
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=14)
    
    for status in valid_statuses:
        sprint = SprintCreate(
            name=f"Sprint {status}",
            start_date=start_date,
            end_date=end_date,
            status=status,
            project_id=project_id
        )
        assert sprint.status == status


def test_sprint_create_negative_capacity():
    """Test that capacity cannot be negative"""
    project_id = uuid4()
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=14)
    
    with pytest.raises(ValidationError) as exc_info:
        SprintCreate(
            name="Sprint 1",
            start_date=start_date,
            end_date=end_date,
            capacity_hours=-100.0,
            project_id=project_id
        )
    
    assert "greater than or equal to 0" in str(exc_info.value).lower()


def test_sprint_update_valid():
    """Test updating a Sprint"""
    update = SprintUpdate(
        name="Updated Sprint",
        goal="Updated goal for the sprint",
        status="active",
        capacity_hours=400.0,
        actual_velocity_hours=280.0
    )
    
    assert update.name == "Updated Sprint"
    assert update.goal == "Updated goal for the sprint"
    assert update.status == "active"
    assert update.capacity_hours == 400.0
    assert update.actual_velocity_hours == 280.0


def test_sprint_update_partial():
    """Test partial Sprint update"""
    update = SprintUpdate(status="completed")
    
    assert update.status == "completed"
    assert update.name is None
    assert update.goal is None


def test_sprint_response_valid():
    """Test Sprint response schema"""
    sprint_id = uuid4()
    project_id = uuid4()
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=14)
    created_at = datetime.now(UTC)
    
    response = SprintResponse(
        id=sprint_id,
        name="Sprint 1",
        goal="Implement features",
        start_date=start_date,
        end_date=end_date,
        capacity_hours=320.0,
        capacity_story_points=40,
        actual_velocity_hours=280.0,
        actual_velocity_story_points=35,
        status="completed",
        project_id=project_id,
        created_at=created_at
    )
    
    assert response.id == sprint_id
    assert response.name == "Sprint 1"
    assert response.actual_velocity_hours == 280.0
    assert response.actual_velocity_story_points == 35


def test_sprint_velocity_valid():
    """Test Sprint velocity schema"""
    sprint_id = uuid4()
    
    velocity = SprintVelocity(
        sprint_id=sprint_id,
        sprint_name="Sprint 1",
        actual_velocity_hours=280.0,
        actual_velocity_story_points=35,
        capacity_hours=320.0,
        capacity_story_points=40,
        completion_percentage_hours=87.5,
        completion_percentage_points=87.5
    )
    
    assert velocity.sprint_id == sprint_id
    assert velocity.actual_velocity_hours == 280.0
    assert velocity.completion_percentage_hours == 87.5


def test_burndown_point_valid():
    """Test Burndown point schema"""
    date = datetime.now(UTC)
    
    point = BurndownPoint(
        date=date,
        ideal_remaining_hours=200.0,
        actual_remaining_hours=180.0,
        ideal_remaining_points=25,
        actual_remaining_points=22
    )
    
    assert point.date == date
    assert point.ideal_remaining_hours == 200.0
    assert point.actual_remaining_hours == 180.0
    assert point.ideal_remaining_points == 25
    assert point.actual_remaining_points == 22


def test_burndown_point_negative_values():
    """Test that burndown values cannot be negative"""
    date = datetime.now(UTC)
    
    with pytest.raises(ValidationError) as exc_info:
        BurndownPoint(
            date=date,
            ideal_remaining_hours=-10.0,
            actual_remaining_hours=180.0,
            ideal_remaining_points=25,
            actual_remaining_points=22
        )
    
    assert "greater than or equal to 0" in str(exc_info.value).lower()

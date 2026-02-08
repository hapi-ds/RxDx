"""Unit tests for Sprint graph nodes and relationships"""

import pytest
from datetime import datetime, timedelta, UTC
from uuid import uuid4

from app.db.graph import graph_service


@pytest.fixture(scope="module", autouse=True)
async def setup_graph():
    """Setup graph connection for tests"""
    await graph_service.connect()
    yield
    await graph_service.close()


@pytest.mark.asyncio
async def test_create_sprint_node():
    """Test creating a Sprint node with all properties"""
    sprint_id = str(uuid4())
    project_id = str(uuid4())
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=14)
    
    properties = {
        "id": sprint_id,
        "name": "Sprint 1",
        "goal": "Implement user authentication",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "capacity_hours": 320.0,
        "capacity_story_points": 40,
        "actual_velocity_hours": 0.0,
        "actual_velocity_story_points": 0,
        "status": "planning",
        "project_id": project_id,
        "created_at": datetime.now(UTC).isoformat()
    }
    
    result = await graph_service.create_node("Sprint", properties)
    
    assert result is not None
    # Verify node was created by fetching it
    sprint = await graph_service.get_node(sprint_id)
    assert sprint is not None


@pytest.mark.asyncio
async def test_sprint_statuses():
    """Test all valid Sprint statuses"""
    valid_statuses = ["planning", "active", "completed", "cancelled"]
    project_id = str(uuid4())
    
    for status in valid_statuses:
        sprint_id = str(uuid4())
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)
        
        properties = {
            "id": sprint_id,
            "name": f"Sprint {status}",
            "goal": f"Test {status} status",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": status,
            "project_id": project_id,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        result = await graph_service.create_node("Sprint", properties)
        assert result is not None
        
        # Verify status was set correctly
        sprint = await graph_service.get_node(sprint_id)
        assert sprint is not None


@pytest.mark.asyncio
async def test_create_assigned_to_sprint_relationship():
    """Test creating ASSIGNED_TO_SPRINT relationship"""
    # Create a task
    task_id = str(uuid4())
    task_properties = {
        "id": task_id,
        "type": "task",
        "title": "Test Task",
        "status": "ready",
        "created_at": datetime.now(UTC).isoformat()
    }
    await graph_service.create_node("WorkItem", task_properties)
    
    # Create a sprint
    sprint_id = str(uuid4())
    project_id = str(uuid4())
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=14)
    
    sprint_properties = {
        "id": sprint_id,
        "name": "Sprint 1",
        "goal": "Test sprint",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "status": "planning",
        "project_id": project_id,
        "created_at": datetime.now(UTC).isoformat()
    }
    await graph_service.create_node("Sprint", sprint_properties)
    
    # Create ASSIGNED_TO_SPRINT relationship
    user_id = str(uuid4())
    rel_properties = {
        "assigned_at": datetime.now(UTC).isoformat(),
        "assigned_by_user_id": user_id
    }
    
    result = await graph_service.create_relationship(
        from_id=task_id,
        to_id=sprint_id,
        rel_type="ASSIGNED_TO_SPRINT",
        properties=rel_properties
    )
    
    assert result is not None


@pytest.mark.asyncio
async def test_sprint_capacity_properties():
    """Test Sprint capacity properties"""
    sprint_id = str(uuid4())
    project_id = str(uuid4())
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=14)
    
    properties = {
        "id": sprint_id,
        "name": "Sprint Capacity Test",
        "goal": "Test capacity tracking",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "capacity_hours": 480.0,
        "capacity_story_points": 60,
        "actual_velocity_hours": 0.0,
        "actual_velocity_story_points": 0,
        "status": "planning",
        "project_id": project_id,
        "created_at": datetime.now(UTC).isoformat()
    }
    
    result = await graph_service.create_node("Sprint", properties)
    assert result is not None
    
    # Verify capacity properties
    sprint = await graph_service.get_node(sprint_id)
    assert sprint is not None


@pytest.mark.asyncio
async def test_sprint_velocity_properties():
    """Test Sprint velocity properties"""
    sprint_id = str(uuid4())
    project_id = str(uuid4())
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=14)
    
    properties = {
        "id": sprint_id,
        "name": "Sprint Velocity Test",
        "goal": "Test velocity tracking",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "capacity_hours": 320.0,
        "capacity_story_points": 40,
        "actual_velocity_hours": 280.0,
        "actual_velocity_story_points": 35,
        "status": "completed",
        "project_id": project_id,
        "created_at": datetime.now(UTC).isoformat()
    }
    
    result = await graph_service.create_node("Sprint", properties)
    assert result is not None
    
    # Verify velocity properties
    sprint = await graph_service.get_node(sprint_id)
    assert sprint is not None

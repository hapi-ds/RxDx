"""
Integration tests for Kanban API endpoints
Tests task filtering and sprint assignment for Kanban board
"""

import pytest
from httpx import AsyncClient
from uuid import uuid4

from app.models.user import User


@pytest.mark.asyncio
async def test_get_kanban_tasks_all(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str]
):
    """Test getting all tasks for Kanban board"""
    response = await client.get(
        "/api/v1/kanban/tasks",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    tasks = response.json()
    assert isinstance(tasks, list)


@pytest.mark.asyncio
async def test_get_kanban_tasks_filter_by_status(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str]
):
    """Test filtering tasks by status"""
    response = await client.get(
        "/api/v1/kanban/tasks?status=active",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    tasks = response.json()
    assert isinstance(tasks, list)
    
    # All tasks should have status 'active'
    for task in tasks:
        assert task["status"] == "active"


@pytest.mark.asyncio
async def test_get_kanban_tasks_filter_by_sprint(
    client: AsyncClient,
    test_user: User,
    test_project,
    auth_headers: dict[str, str]
):
    """Test filtering tasks by sprint"""
    # Create a sprint
    sprint_data = {
        "name": "Test Sprint",
        "goal": "Complete features",
        "start_date": "2024-01-01",
        "end_date": "2024-01-14"
    }
    
    sprint_response = await client.post(
        f"/api/v1/projects/{test_project['id']}/sprints",
        json=sprint_data,
        headers=auth_headers
    )
    assert sprint_response.status_code == 201
    sprint = sprint_response.json()
    
    # Get tasks for this sprint
    response = await client.get(
        f"/api/v1/kanban/tasks?sprint_id={sprint['id']}",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    tasks = response.json()
    assert isinstance(tasks, list)


@pytest.mark.asyncio
async def test_get_kanban_tasks_filter_by_backlog(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str]
):
    """Test filtering tasks by backlog status"""
    response = await client.get(
        "/api/v1/kanban/tasks?in_backlog=true",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    tasks = response.json()
    assert isinstance(tasks, list)


@pytest.mark.asyncio
async def test_get_kanban_tasks_filter_by_resource(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str]
):
    """Test filtering tasks by assigned resource"""
    resource_id = uuid4()
    
    response = await client.get(
        f"/api/v1/kanban/tasks?resource_id={resource_id}",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    tasks = response.json()
    assert isinstance(tasks, list)


@pytest.mark.asyncio
async def test_assign_task_to_sprint_via_kanban(
    client: AsyncClient,
    test_user: User,
    test_project,
    test_workitem,
    auth_headers: dict[str, str]
):
    """Test assigning a task to a sprint via Kanban"""
    # Create a sprint
    sprint_data = {
        "name": "Test Sprint",
        "goal": "Complete features",
        "start_date": "2024-01-01",
        "end_date": "2024-01-14"
    }
    
    sprint_response = await client.post(
        f"/api/v1/projects/{test_project['id']}/sprints",
        json=sprint_data,
        headers=auth_headers
    )
    assert sprint_response.status_code == 201
    sprint = sprint_response.json()
    
    # Assign task to sprint
    response = await client.post(
        f"/api/v1/kanban/tasks/{test_workitem['id']}/assign-sprint?sprint_id={sprint['id']}",
        headers=auth_headers
    )
    
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_assign_task_to_sprint_not_found(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str]
):
    """Test assigning a non-existent task to a sprint"""
    task_id = uuid4()
    sprint_id = uuid4()
    
    response = await client.post(
        f"/api/v1/kanban/tasks/{task_id}/assign-sprint?sprint_id={sprint_id}",
        headers=auth_headers
    )
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_assign_task_to_sprint_unauthorized(
    client: AsyncClient
):
    """Test assigning a task without authentication"""
    task_id = uuid4()
    sprint_id = uuid4()
    
    response = await client.post(
        f"/api/v1/kanban/tasks/{task_id}/assign-sprint?sprint_id={sprint_id}"
    )
    
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_kanban_tasks_unauthorized(
    client: AsyncClient
):
    """Test getting tasks without authentication"""
    response = await client.get("/api/v1/kanban/tasks")
    
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_kanban_tasks_multiple_filters(
    client: AsyncClient,
    test_user: User,
    auth_headers: dict[str, str]
):
    """Test filtering tasks with multiple filters"""
    response = await client.get(
        "/api/v1/kanban/tasks?status=active&in_backlog=false",
        headers=auth_headers
    )
    
    assert response.status_code == 200
    tasks = response.json()
    assert isinstance(tasks, list)
    
    # All tasks should have status 'active'
    for task in tasks:
        assert task["status"] == "active"


@pytest.mark.asyncio
async def test_kanban_workflow_integration(
    client: AsyncClient,
    test_user: User,
    test_project,
    auth_headers: dict[str, str]
):
    """Test complete Kanban workflow: create task, add to backlog, assign to sprint"""
    # Create a task
    task_data = {
        "type": "task",
        "title": "Test Task for Kanban",
        "description": "Test task description",
        "status": "draft"
    }
    
    task_response = await client.post(
        "/api/v1/workitems",
        json=task_data,
        headers=auth_headers
    )
    assert task_response.status_code == 201
    task = task_response.json()
    
    # Create a backlog
    backlog_data = {
        "name": "Product Backlog",
        "description": "Main backlog"
    }
    
    backlog_response = await client.post(
        f"/api/v1/projects/{test_project['id']}/backlogs",
        json=backlog_data,
        headers=auth_headers
    )
    assert backlog_response.status_code == 201
    backlog = backlog_response.json()
    
    # Add task to backlog
    add_response = await client.post(
        f"/api/v1/backlogs/{backlog['id']}/tasks/{task['id']}",
        headers=auth_headers
    )
    assert add_response.status_code == 204
    
    # Verify task is in backlog
    backlog_tasks_response = await client.get(
        f"/api/v1/kanban/tasks?in_backlog=true",
        headers=auth_headers
    )
    assert backlog_tasks_response.status_code == 200
    backlog_tasks = backlog_tasks_response.json()
    task_ids = [t["id"] for t in backlog_tasks]
    assert task["id"] in task_ids
    
    # Create a sprint
    sprint_data = {
        "name": "Sprint 1",
        "goal": "Complete features",
        "start_date": "2024-01-01",
        "end_date": "2024-01-14"
    }
    
    sprint_response = await client.post(
        f"/api/v1/projects/{test_project['id']}/sprints",
        json=sprint_data,
        headers=auth_headers
    )
    assert sprint_response.status_code == 201
    sprint = sprint_response.json()
    
    # Assign task to sprint via Kanban
    assign_response = await client.post(
        f"/api/v1/kanban/tasks/{task['id']}/assign-sprint?sprint_id={sprint['id']}",
        headers=auth_headers
    )
    assert assign_response.status_code == 204
    
    # Verify task is in sprint
    sprint_tasks_response = await client.get(
        f"/api/v1/kanban/tasks?sprint_id={sprint['id']}",
        headers=auth_headers
    )
    assert sprint_tasks_response.status_code == 200
    sprint_tasks = sprint_tasks_response.json()
    sprint_task_ids = [t["id"] for t in sprint_tasks]
    assert task["id"] in sprint_task_ids

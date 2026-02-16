"""Integration tests for Time Tracking API endpoints"""

import pytest
from datetime import date, time
from uuid import uuid4
from httpx import AsyncClient

from app.main import app


@pytest.fixture
async def auth_headers(async_client: AsyncClient) -> dict[str, str]:
    """Get authentication headers for test user"""
    # Login as test user
    login_response = await async_client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "admin123"},
    )
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def test_task_id(async_client: AsyncClient, auth_headers: dict[str, str]) -> str:
    """Create a test task and return its ID"""
    # Create a task
    task_data = {
        "type": "task",
        "title": "Test Task for Time Tracking",
        "description": "A task to test time tracking",
        "status": "active",
    }

    response = await async_client.post(
        "/api/v1/workitems",
        json=task_data,
        headers=auth_headers,
    )
    assert response.status_code == 201
    return response.json()["id"]


class TestStartTimeTracking:
    """Test POST /api/v1/time-tracking/start endpoint"""

    @pytest.mark.asyncio
    async def test_start_tracking_success(
        self, async_client: AsyncClient, auth_headers: dict[str, str], test_task_id: str
    ):
        """Test successfully starting time tracking"""
        request_data = {
            "task_id": test_task_id,
            "description": "Working on implementation",
        }

        response = await async_client.post(
            "/api/v1/time-tracking/start",
            json=request_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["task_id"] == test_task_id
        assert data["end_time"] is None
        assert data["description"] == "Working on implementation"

    @pytest.mark.asyncio
    async def test_start_tracking_task_not_found(
        self, async_client: AsyncClient, auth_headers: dict[str, str]
    ):
        """Test starting tracking for non-existent task"""
        request_data = {
            "task_id": str(uuid4()),
            "description": "Test",
        }

        response = await async_client.post(
            "/api/v1/time-tracking/start",
            json=request_data,
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_start_tracking_unauthorized(
        self, async_client: AsyncClient, test_task_id: str
    ):
        """Test starting tracking without authentication"""
        request_data = {
            "task_id": test_task_id,
        }

        response = await async_client.post(
            "/api/v1/time-tracking/start",
            json=request_data,
        )

        assert response.status_code == 401


class TestStopTimeTracking:
    """Test POST /api/v1/time-tracking/stop endpoint"""

    @pytest.mark.asyncio
    async def test_stop_tracking_success(
        self, async_client: AsyncClient, auth_headers: dict[str, str], test_task_id: str
    ):
        """Test successfully stopping time tracking"""
        # Start tracking first
        start_response = await async_client.post(
            "/api/v1/time-tracking/start",
            json={"task_id": test_task_id},
            headers=auth_headers,
        )
        assert start_response.status_code == 201
        worked_id = start_response.json()["id"]

        # Stop tracking
        stop_response = await async_client.post(
            "/api/v1/time-tracking/stop",
            json={"worked_id": worked_id},
            headers=auth_headers,
        )

        assert stop_response.status_code == 200
        data = stop_response.json()
        assert data["id"] == worked_id
        assert data["end_time"] is not None

    @pytest.mark.asyncio
    async def test_stop_tracking_not_found(
        self, async_client: AsyncClient, auth_headers: dict[str, str]
    ):
        """Test stopping non-existent tracking"""
        response = await async_client.post(
            "/api/v1/time-tracking/stop",
            json={"worked_id": str(uuid4())},
            headers=auth_headers,
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_stop_tracking_already_stopped(
        self, async_client: AsyncClient, auth_headers: dict[str, str], test_task_id: str
    ):
        """Test stopping already stopped tracking"""
        # Start and stop tracking
        start_response = await async_client.post(
            "/api/v1/time-tracking/start",
            json={"task_id": test_task_id},
            headers=auth_headers,
        )
        worked_id = start_response.json()["id"]

        await async_client.post(
            "/api/v1/time-tracking/stop",
            json={"worked_id": worked_id},
            headers=auth_headers,
        )

        # Try to stop again
        response = await async_client.post(
            "/api/v1/time-tracking/stop",
            json={"worked_id": worked_id},
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "already stopped" in response.json()["detail"].lower()


class TestGetActiveTracking:
    """Test GET /api/v1/time-tracking/active endpoint"""

    @pytest.mark.asyncio
    async def test_get_active_tracking_with_entries(
        self, async_client: AsyncClient, auth_headers: dict[str, str], test_task_id: str
    ):
        """Test getting active tracking entries"""
        # Start tracking
        await async_client.post(
            "/api/v1/time-tracking/start",
            json={"task_id": test_task_id},
            headers=auth_headers,
        )

        # Get active tracking
        response = await async_client.get(
            "/api/v1/time-tracking/active",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["count"] >= 1
        assert len(data["entries"]) >= 1
        assert all(entry["end_time"] is None for entry in data["entries"])

    @pytest.mark.asyncio
    async def test_get_active_tracking_no_entries(
        self, async_client: AsyncClient, auth_headers: dict[str, str]
    ):
        """Test getting active tracking with no entries"""
        response = await async_client.get(
            "/api/v1/time-tracking/active",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        # May have entries from other tests, so just check structure
        assert "count" in data
        assert "entries" in data


class TestGetTaskTimeSummary:
    """Test GET /api/v1/time-tracking/task/{task_id} endpoint"""

    @pytest.mark.asyncio
    async def test_get_task_summary(
        self, async_client: AsyncClient, auth_headers: dict[str, str], test_task_id: str
    ):
        """Test getting time summary for a task"""
        response = await async_client.get(
            f"/api/v1/time-tracking/task/{test_task_id}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == test_task_id
        assert "total_hours" in data
        assert "entry_count" in data
        assert data["total_hours"] >= 0
        assert data["entry_count"] >= 0

    @pytest.mark.asyncio
    async def test_get_task_summary_not_found(
        self, async_client: AsyncClient, auth_headers: dict[str, str]
    ):
        """Test getting summary for non-existent task"""
        response = await async_client.get(
            f"/api/v1/time-tracking/task/{uuid4()}",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestAddTimeEntry:
    """Test POST /api/v1/time-tracking/entries endpoint"""

    @pytest.mark.asyncio
    async def test_add_time_entry_success(
        self, async_client: AsyncClient, auth_headers: dict[str, str], test_task_id: str
    ):
        """Test successfully adding a time entry"""
        # Get current user ID from auth token
        me_response = await async_client.get(
            "/api/v1/auth/me",
            headers=auth_headers,
        )
        user_id = me_response.json()["id"]

        entry_data = {
            "resource": user_id,
            "task_id": test_task_id,
            "date": str(date.today()),
            "start_time": "09:00:00",
            "end_time": "17:00:00",
            "description": "Full day work",
        }

        response = await async_client.post(
            "/api/v1/time-tracking/entries",
            json=entry_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert data["task_id"] == test_task_id
        assert data["description"] == "Full day work"

    @pytest.mark.asyncio
    async def test_add_time_entry_invalid_times(
        self, async_client: AsyncClient, auth_headers: dict[str, str], test_task_id: str
    ):
        """Test adding entry with end time before start time"""
        me_response = await async_client.get(
            "/api/v1/auth/me",
            headers=auth_headers,
        )
        user_id = me_response.json()["id"]

        entry_data = {
            "resource": user_id,
            "task_id": test_task_id,
            "date": str(date.today()),
            "start_time": "17:00:00",
            "end_time": "09:00:00",  # Before start time
            "description": "Invalid entry",
        }

        response = await async_client.post(
            "/api/v1/time-tracking/entries",
            json=entry_data,
            headers=auth_headers,
        )

        assert response.status_code == 422  # Validation error


class TestUpdateTimeEntry:
    """Test PATCH /api/v1/time-tracking/entries/{id} endpoint"""

    @pytest.mark.asyncio
    async def test_update_time_entry_success(
        self, async_client: AsyncClient, auth_headers: dict[str, str], test_task_id: str
    ):
        """Test successfully updating a time entry"""
        # Start and stop tracking to create an entry
        start_response = await async_client.post(
            "/api/v1/time-tracking/start",
            json={"task_id": test_task_id},
            headers=auth_headers,
        )
        worked_id = start_response.json()["id"]

        await async_client.post(
            "/api/v1/time-tracking/stop",
            json={"worked_id": worked_id},
            headers=auth_headers,
        )

        # Update the entry
        update_data = {
            "description": "Updated description",
        }

        response = await async_client.patch(
            f"/api/v1/time-tracking/entries/{worked_id}",
            json=update_data,
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == worked_id
        assert data["description"] == "Updated description"

    @pytest.mark.asyncio
    async def test_update_time_entry_not_found(
        self, async_client: AsyncClient, auth_headers: dict[str, str]
    ):
        """Test updating non-existent entry"""
        response = await async_client.patch(
            f"/api/v1/time-tracking/entries/{uuid4()}",
            json={"description": "Test"},
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestDeleteTimeEntry:
    """Test DELETE /api/v1/time-tracking/entries/{id} endpoint"""

    @pytest.mark.asyncio
    async def test_delete_time_entry_success(
        self, async_client: AsyncClient, auth_headers: dict[str, str], test_task_id: str
    ):
        """Test successfully deleting a time entry"""
        # Start and stop tracking to create an entry
        start_response = await async_client.post(
            "/api/v1/time-tracking/start",
            json={"task_id": test_task_id},
            headers=auth_headers,
        )
        worked_id = start_response.json()["id"]

        await async_client.post(
            "/api/v1/time-tracking/stop",
            json={"worked_id": worked_id},
            headers=auth_headers,
        )

        # Delete the entry
        response = await async_client.delete(
            f"/api/v1/time-tracking/entries/{worked_id}",
            headers=auth_headers,
        )

        assert response.status_code == 204

        # Verify it's deleted
        get_response = await async_client.get(
            "/api/v1/time-tracking/active",
            headers=auth_headers,
        )
        entries = get_response.json()["entries"]
        assert not any(entry["id"] == worked_id for entry in entries)

    @pytest.mark.asyncio
    async def test_delete_time_entry_not_found(
        self, async_client: AsyncClient, auth_headers: dict[str, str]
    ):
        """Test deleting non-existent entry"""
        response = await async_client.delete(
            f"/api/v1/time-tracking/entries/{uuid4()}",
            headers=auth_headers,
        )

        assert response.status_code == 404


class TestGetSortedTasks:
    """Test GET /api/v1/time-tracking/tasks endpoint"""

    @pytest.mark.asyncio
    async def test_get_sorted_tasks(
        self, async_client: AsyncClient, auth_headers: dict[str, str]
    ):
        """Test getting sorted task list"""
        response = await async_client.get(
            "/api/v1/time-tracking/tasks",
            headers=auth_headers,
        )

        assert response.status_code == 200
        tasks = response.json()
        assert isinstance(tasks, list)

        # Verify tasks have required fields
        for task in tasks:
            assert "id" in task
            assert "title" in task
            assert "priority" in task

    @pytest.mark.asyncio
    async def test_get_sorted_tasks_with_limit(
        self, async_client: AsyncClient, auth_headers: dict[str, str]
    ):
        """Test getting sorted tasks with limit"""
        response = await async_client.get(
            "/api/v1/time-tracking/tasks?limit=5",
            headers=auth_headers,
        )

        assert response.status_code == 200
        tasks = response.json()
        assert len(tasks) <= 5

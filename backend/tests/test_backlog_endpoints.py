"""Integration tests for Backlog API endpoints"""

import pytest
import pytest_asyncio
from datetime import datetime, UTC
from uuid import uuid4

from httpx import AsyncClient

from app.main import app


class TestBacklogEndpoints:
    """Test Backlog API endpoints"""

    @pytest.mark.asyncio
    async def test_create_backlog(self, client: AsyncClient, test_admin):
        """Test creating a backlog"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a project first
        project_id = str(uuid4())

        # Create backlog
        backlog_data = {
            "name": "Product Backlog",
            "description": "Main product backlog for all features",
            "project_id": project_id
        }

        response = await client.post(
            "/api/v1/backlogs",
            json=backlog_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 201
        data = response.json()

        assert data["name"] == "Product Backlog"
        assert data["description"] == "Main product backlog for all features"
        assert data["project_id"] == project_id
        assert data["task_count"] == 0
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.asyncio
    async def test_create_backlog_via_project_route(
        self, client: AsyncClient, test_admin
    ):
        """Test creating a backlog via project-scoped route"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id = str(uuid4())

        backlog_data = {
            "name": "Sprint Backlog",
            "description": "Backlog for sprint planning",
            "project_id": project_id
        }

        response = await client.post(
            f"/api/v1/projects/{project_id}/backlogs",
            json=backlog_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Sprint Backlog"
        assert data["project_id"] == project_id

    @pytest.mark.asyncio
    async def test_create_backlog_project_id_mismatch(
        self, client: AsyncClient, test_admin
    ):
        """Test creating a backlog with mismatched project IDs"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id_url = str(uuid4())
        project_id_body = str(uuid4())

        backlog_data = {
            "name": "Test Backlog",
            "project_id": project_id_body
        }

        response = await client.post(
            f"/api/v1/projects/{project_id_url}/backlogs",
            json=backlog_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert "must match" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_create_backlog_invalid_name(
        self, client: AsyncClient, test_admin
    ):
        """Test creating a backlog with invalid name"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id = str(uuid4())

        # Name too short
        backlog_data = {
            "name": "AB",  # Less than 3 characters
            "project_id": project_id
        }

        response = await client.post(
            "/api/v1/backlogs",
            json=backlog_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 422  # Validation error

    @pytest.mark.asyncio
    async def test_list_backlogs(self, client: AsyncClient, test_admin):
        """Test listing backlogs"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a project
        project_id = str(uuid4())

        # Create multiple backlogs
        for i in range(3):
            backlog_data = {
                "name": f"Backlog {i+1}",
                "project_id": project_id
            }
            await client.post(
                "/api/v1/backlogs",
                json=backlog_data,
                headers={"Authorization": f"Bearer {token}"},
            )

        # List all backlogs
        response = await client.get(
            "/api/v1/backlogs",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 3

    @pytest.mark.asyncio
    async def test_list_backlogs_by_project(
        self, client: AsyncClient, test_admin
    ):
        """Test listing backlogs filtered by project"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id = str(uuid4())

        # Create backlogs for this project
        for i in range(2):
            backlog_data = {
                "name": f"Project Backlog {i+1}",
                "project_id": project_id
            }
            await client.post(
                "/api/v1/backlogs",
                json=backlog_data,
                headers={"Authorization": f"Bearer {token}"},
            )

        # List backlogs for this project
        response = await client.get(
            f"/api/v1/backlogs?project_id={project_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        # Verify all backlogs belong to the project
        for backlog in data:
            assert backlog["project_id"] == project_id

    @pytest.mark.asyncio
    async def test_get_backlog(self, client: AsyncClient, test_admin):
        """Test getting a backlog by ID"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id = str(uuid4())

        # Create a backlog
        backlog_data = {
            "name": "Test Backlog",
            "description": "Test description",
            "project_id": project_id
        }

        create_response = await client.post(
            "/api/v1/backlogs",
            json=backlog_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        backlog_id = create_response.json()["id"]

        # Get the backlog
        response = await client.get(
            f"/api/v1/backlogs/{backlog_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == backlog_id
        assert data["name"] == "Test Backlog"
        assert data["description"] == "Test description"

    @pytest.mark.asyncio
    async def test_get_backlog_not_found(
        self, client: AsyncClient, test_admin
    ):
        """Test getting a non-existent backlog"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        fake_id = str(uuid4())

        response = await client.get(
            f"/api/v1/backlogs/{fake_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_backlog(self, client: AsyncClient, test_admin):
        """Test updating a backlog"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id = str(uuid4())

        # Create a backlog
        backlog_data = {
            "name": "Original Name",
            "description": "Original description",
            "project_id": project_id
        }

        create_response = await client.post(
            "/api/v1/backlogs",
            json=backlog_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        backlog_id = create_response.json()["id"]

        # Update the backlog
        update_data = {
            "name": "Updated Name",
            "description": "Updated description"
        }

        response = await client.patch(
            f"/api/v1/backlogs/{backlog_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["description"] == "Updated description"

    @pytest.mark.asyncio
    async def test_delete_backlog(self, client: AsyncClient, test_admin):
        """Test deleting a backlog"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id = str(uuid4())

        # Create a backlog
        backlog_data = {
            "name": "Backlog to Delete",
            "project_id": project_id
        }

        create_response = await client.post(
            "/api/v1/backlogs",
            json=backlog_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        backlog_id = create_response.json()["id"]

        # Delete the backlog
        response = await client.delete(
            f"/api/v1/backlogs/{backlog_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 204

        # Verify it's deleted
        get_response = await client.get(
            f"/api/v1/backlogs/{backlog_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_backlog_tasks_empty(
        self, client: AsyncClient, test_admin
    ):
        """Test getting tasks from an empty backlog"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id = str(uuid4())

        # Create a backlog
        backlog_data = {
            "name": "Empty Backlog",
            "project_id": project_id
        }

        create_response = await client.post(
            "/api/v1/backlogs",
            json=backlog_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        backlog_id = create_response.json()["id"]

        # Get tasks (should be empty)
        response = await client.get(
            f"/api/v1/backlogs/{backlog_id}/tasks",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    @pytest.mark.asyncio
    async def test_get_task_backlog_status_not_in_backlog(
        self, client: AsyncClient, test_admin
    ):
        """Test checking backlog status for a task not in backlog"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        task_id = str(uuid4())

        # Check backlog status
        response = await client.get(
            f"/api/v1/backlogs/tasks/{task_id}/backlog-status",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["in_backlog"] is False
        assert data["backlog_id"] is None

    @pytest.mark.asyncio
    async def test_unauthorized_access(self, client: AsyncClient):
        """Test that endpoints require authentication"""
        # Try to list backlogs without authentication
        response = await client.get("/api/v1/backlogs")
        assert response.status_code == 401

        # Try to create backlog without authentication
        backlog_data = {
            "name": "Test Backlog",
            "project_id": str(uuid4())
        }
        response = await client.post("/api/v1/backlogs", json=backlog_data)
        assert response.status_code == 401

        # Try to get backlog without authentication
        response = await client.get(f"/api/v1/backlogs/{uuid4()}")
        assert response.status_code == 401

        # Try to update backlog without authentication
        response = await client.patch(
            f"/api/v1/backlogs/{uuid4()}",
            json={"name": "Updated"}
        )
        assert response.status_code == 401

        # Try to delete backlog without authentication
        response = await client.delete(f"/api/v1/backlogs/{uuid4()}")
        assert response.status_code == 401

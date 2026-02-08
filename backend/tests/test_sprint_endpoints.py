"""Integration tests for Sprint API endpoints"""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta, UTC
from uuid import uuid4

from httpx import AsyncClient

from app.main import app


class TestSprintEndpoints:
    """Test Sprint API endpoints"""

    @pytest.mark.asyncio
    async def test_create_sprint(self, client: AsyncClient, test_admin):
        """Test creating a sprint"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a project first (assuming we need one)
        project_id = str(uuid4())

        # Create sprint
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        sprint_data = {
            "name": "Sprint 1",
            "goal": "Complete user authentication feature",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "capacity_hours": 80.0,
            "capacity_story_points": 20,
            "status": "planning",
            "project_id": project_id
        }

        response = await client.post(
            "/api/v1/sprints",
            json=sprint_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 201
        data = response.json()

        assert data["name"] == "Sprint 1"
        assert data["goal"] == "Complete user authentication feature"
        assert data["status"] == "planning"
        assert data["capacity_hours"] == 80.0
        assert data["capacity_story_points"] == 20
        assert "id" in data
        assert "created_at" in data

    @pytest.mark.asyncio
    async def test_create_sprint_via_project_route(
        self, client: AsyncClient, test_admin
    ):
        """Test creating a sprint via project-scoped route"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id = str(uuid4())
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        sprint_data = {
            "name": "Sprint 2",
            "goal": "Implement dashboard features",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": project_id
        }

        response = await client.post(
            f"/api/v1/projects/{project_id}/sprints",
            json=sprint_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Sprint 2"
        assert data["project_id"] == project_id

    @pytest.mark.asyncio
    async def test_create_sprint_project_id_mismatch(
        self, client: AsyncClient, test_admin
    ):
        """Test creating a sprint with mismatched project IDs"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id = str(uuid4())
        different_project_id = str(uuid4())
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        sprint_data = {
            "name": "Sprint 3",
            "goal": "Test mismatch handling",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": different_project_id
        }

        response = await client.post(
            f"/api/v1/projects/{project_id}/sprints",
            json=sprint_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 400
        assert "must match" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_create_sprint_unauthenticated(self, client: AsyncClient):
        """Test creating a sprint without authentication"""
        sprint_data = {
            "name": "Sprint 1",
            "goal": "Test authentication",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "planning",
            "project_id": str(uuid4())
        }

        response = await client.post("/api/v1/sprints", json=sprint_data)

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_list_sprints(self, client: AsyncClient, test_admin):
        """Test listing sprints"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        response = await client.get(
            "/api/v1/sprints",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_list_sprints_filtered_by_project(
        self, client: AsyncClient, test_admin
    ):
        """Test listing sprints filtered by project"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id = str(uuid4())

        # Create a sprint for this project
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        sprint_data = {
            "name": "Project Sprint",
            "goal": "Test project filtering",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": project_id
        }

        create_response = await client.post(
            "/api/v1/sprints",
            json=sprint_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201

        # List sprints for this project
        response = await client.get(
            f"/api/v1/sprints?project_id={project_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert all(sprint["project_id"] == project_id for sprint in data)

    @pytest.mark.asyncio
    async def test_get_sprint(self, client: AsyncClient, test_admin):
        """Test getting a sprint by ID"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a sprint first
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        sprint_data = {
            "name": "Get Test Sprint",
            "goal": "Test sprint retrieval",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": str(uuid4())
        }

        create_response = await client.post(
            "/api/v1/sprints",
            json=sprint_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        sprint_id = create_response.json()["id"]

        # Get the sprint
        response = await client.get(
            f"/api/v1/sprints/{sprint_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sprint_id
        assert data["name"] == "Get Test Sprint"

    @pytest.mark.asyncio
    async def test_get_sprint_not_found(self, client: AsyncClient, test_admin):
        """Test getting a non-existent sprint"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        fake_id = str(uuid4())
        response = await client.get(
            f"/api/v1/sprints/{fake_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_sprint(self, client: AsyncClient, test_admin):
        """Test updating a sprint"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a sprint first
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        sprint_data = {
            "name": "Update Test Sprint",
            "goal": "Test sprint updates",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": str(uuid4())
        }

        create_response = await client.post(
            "/api/v1/sprints",
            json=sprint_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        sprint_id = create_response.json()["id"]

        # Update the sprint
        update_data = {
            "name": "Updated Sprint Name",
            "goal": "Updated sprint goal for testing"
        }

        response = await client.patch(
            f"/api/v1/sprints/{sprint_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Sprint Name"
        assert data["goal"] == "Updated sprint goal for testing"

    @pytest.mark.asyncio
    async def test_delete_sprint(self, client: AsyncClient, test_admin):
        """Test deleting a sprint"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a sprint first
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        sprint_data = {
            "name": "Delete Test Sprint",
            "goal": "Test sprint deletion",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": str(uuid4())
        }

        create_response = await client.post(
            "/api/v1/sprints",
            json=sprint_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        sprint_id = create_response.json()["id"]

        # Delete the sprint
        response = await client.delete(
            f"/api/v1/sprints/{sprint_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 204

        # Verify it's deleted
        get_response = await client.get(
            f"/api/v1/sprints/{sprint_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_start_sprint(self, client: AsyncClient, test_admin):
        """Test starting a sprint"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a sprint first
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        sprint_data = {
            "name": "Start Test Sprint",
            "goal": "Test sprint start functionality",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": str(uuid4())
        }

        create_response = await client.post(
            "/api/v1/sprints",
            json=sprint_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        sprint_id = create_response.json()["id"]

        # Start the sprint
        response = await client.post(
            f"/api/v1/sprints/{sprint_id}/start",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "active"

    @pytest.mark.asyncio
    async def test_complete_sprint(self, client: AsyncClient, test_admin):
        """Test completing a sprint"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create and start a sprint
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        sprint_data = {
            "name": "Complete Test Sprint",
            "goal": "Test sprint completion",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": str(uuid4())
        }

        create_response = await client.post(
            "/api/v1/sprints",
            json=sprint_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        sprint_id = create_response.json()["id"]

        # Start the sprint
        await client.post(
            f"/api/v1/sprints/{sprint_id}/start",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Complete the sprint
        response = await client.post(
            f"/api/v1/sprints/{sprint_id}/complete",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert "actual_velocity_hours" in data
        assert "actual_velocity_story_points" in data

    @pytest.mark.asyncio
    async def test_get_sprint_velocity(self, client: AsyncClient, test_admin):
        """Test getting sprint velocity"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a sprint
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        sprint_data = {
            "name": "Velocity Test Sprint",
            "goal": "Test velocity retrieval",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": str(uuid4())
        }

        create_response = await client.post(
            "/api/v1/sprints",
            json=sprint_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        sprint_id = create_response.json()["id"]

        # Get velocity
        response = await client.get(
            f"/api/v1/sprints/{sprint_id}/velocity",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "sprint_id" in data
        assert "velocity_hours" in data
        assert "velocity_story_points" in data

    @pytest.mark.asyncio
    async def test_get_sprint_statistics(self, client: AsyncClient, test_admin):
        """Test getting sprint statistics"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a sprint
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        sprint_data = {
            "name": "Statistics Test Sprint",
            "goal": "Test statistics retrieval",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": str(uuid4())
        }

        create_response = await client.post(
            "/api/v1/sprints",
            json=sprint_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        sprint_id = create_response.json()["id"]

        # Get statistics
        response = await client.get(
            f"/api/v1/sprints/{sprint_id}/statistics",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert "sprint_id" in data
        assert "sprint_name" in data
        assert "total_tasks" in data
        assert "completed_tasks" in data
        assert "completion_rate" in data

    @pytest.mark.asyncio
    async def test_get_sprint_tasks(self, client: AsyncClient, test_admin):
        """Test getting tasks assigned to a sprint"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a sprint
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        sprint_data = {
            "name": "Tasks Test Sprint",
            "goal": "Test task retrieval",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": str(uuid4())
        }

        create_response = await client.post(
            "/api/v1/sprints",
            json=sprint_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        sprint_id = create_response.json()["id"]

        # Get tasks
        response = await client.get(
            f"/api/v1/sprints/{sprint_id}/tasks",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_create_sprint_with_active_sprint_fails(
        self, client: AsyncClient, test_admin
    ):
        """Test that creating a sprint fails if there's already an active sprint"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id = str(uuid4())
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        # Create and start first sprint
        sprint1_data = {
            "name": "Active Sprint",
            "goal": "First active sprint",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": project_id
        }

        create_response1 = await client.post(
            "/api/v1/sprints",
            json=sprint1_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response1.status_code == 201
        sprint1_id = create_response1.json()["id"]

        # Start the first sprint
        await client.post(
            f"/api/v1/sprints/{sprint1_id}/start",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Try to create a second sprint for the same project
        sprint2_data = {
            "name": "Second Sprint",
            "goal": "This should fail",
            "start_date": (start_date + timedelta(days=14)).isoformat(),
            "end_date": (start_date + timedelta(days=28)).isoformat(),
            "status": "planning",
            "project_id": project_id
        }

        create_response2 = await client.post(
            "/api/v1/sprints",
            json=sprint2_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert create_response2.status_code == 400
        assert "already has an active sprint" in create_response2.json()["detail"]

    @pytest.mark.asyncio
    async def test_start_sprint_with_active_sprint_fails(
        self, client: AsyncClient, test_admin
    ):
        """Test that starting a sprint fails if there's already an active sprint"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id = str(uuid4())
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        # Create and start first sprint
        sprint1_data = {
            "name": "First Sprint",
            "goal": "First active sprint",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": project_id
        }

        create_response1 = await client.post(
            "/api/v1/sprints",
            json=sprint1_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response1.status_code == 201
        sprint1_id = create_response1.json()["id"]

        # Start the first sprint
        start_response1 = await client.post(
            f"/api/v1/sprints/{sprint1_id}/start",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert start_response1.status_code == 200

        # Create a second sprint (in planning state)
        sprint2_data = {
            "name": "Second Sprint",
            "goal": "This should not be startable",
            "start_date": (start_date + timedelta(days=14)).isoformat(),
            "end_date": (start_date + timedelta(days=28)).isoformat(),
            "status": "planning",
            "project_id": project_id
        }

        # This should fail because there's already an active sprint
        # But first we need to complete the first sprint to create the second one
        # Let's complete the first sprint first
        await client.post(
            f"/api/v1/sprints/{sprint1_id}/complete",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Now create the second sprint
        create_response2 = await client.post(
            "/api/v1/sprints",
            json=sprint2_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response2.status_code == 201
        sprint2_id = create_response2.json()["id"]

        # Create and start a third sprint to test the validation
        sprint3_data = {
            "name": "Third Sprint",
            "goal": "For testing active sprint validation",
            "start_date": (start_date + timedelta(days=28)).isoformat(),
            "end_date": (start_date + timedelta(days=42)).isoformat(),
            "status": "planning",
            "project_id": project_id
        }

        create_response3 = await client.post(
            "/api/v1/sprints",
            json=sprint3_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response3.status_code == 201
        sprint3_id = create_response3.json()["id"]

        # Start sprint 2
        start_response2 = await client.post(
            f"/api/v1/sprints/{sprint2_id}/start",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert start_response2.status_code == 200

        # Try to start sprint 3 (should fail)
        start_response3 = await client.post(
            f"/api/v1/sprints/{sprint3_id}/start",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert start_response3.status_code == 400
        assert "already has an active sprint" in start_response3.json()["detail"]

    @pytest.mark.asyncio
    async def test_update_sprint_to_active_with_active_sprint_fails(
        self, client: AsyncClient, test_admin
    ):
        """Test that updating sprint status to active fails if there's already an active sprint"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        project_id = str(uuid4())
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)

        # Create and start first sprint
        sprint1_data = {
            "name": "Active Sprint",
            "goal": "First active sprint",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": project_id
        }

        create_response1 = await client.post(
            "/api/v1/sprints",
            json=sprint1_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response1.status_code == 201
        sprint1_id = create_response1.json()["id"]

        # Start the first sprint
        await client.post(
            f"/api/v1/sprints/{sprint1_id}/start",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Complete the first sprint to allow creating a second one
        await client.post(
            f"/api/v1/sprints/{sprint1_id}/complete",
            headers={"Authorization": f"Bearer {token}"},
        )

        # Create second sprint in planning state
        sprint2_data = {
            "name": "Second Sprint",
            "goal": "Second sprint for testing",
            "start_date": (start_date + timedelta(days=14)).isoformat(),
            "end_date": (start_date + timedelta(days=28)).isoformat(),
            "status": "planning",
            "project_id": project_id
        }

        create_response2 = await client.post(
            "/api/v1/sprints",
            json=sprint2_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response2.status_code == 201
        sprint2_id = create_response2.json()["id"]

        # Create third sprint in planning state
        sprint3_data = {
            "name": "Third Sprint",
            "goal": "Third sprint for testing",
            "start_date": (start_date + timedelta(days=28)).isoformat(),
            "end_date": (start_date + timedelta(days=42)).isoformat(),
            "status": "planning",
            "project_id": project_id
        }

        create_response3 = await client.post(
            "/api/v1/sprints",
            json=sprint3_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response3.status_code == 201
        sprint3_id = create_response3.json()["id"]

        # Update sprint 2 to active
        update_response2 = await client.patch(
            f"/api/v1/sprints/{sprint2_id}",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert update_response2.status_code == 200

        # Try to update sprint 3 to active (should fail)
        update_response3 = await client.patch(
            f"/api/v1/sprints/{sprint3_id}",
            json={"status": "active"},
            headers={"Authorization": f"Bearer {token}"},
        )

        assert update_response3.status_code == 400
        assert "already has an active sprint" in update_response3.json()["detail"]



    @pytest.mark.asyncio
    async def test_get_sprint_burndown(self, client: AsyncClient, test_admin):
        """Test getting sprint burndown chart data"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a project
        project_id = str(uuid4())

        # Create sprint
        start_date = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=7)

        sprint_data = {
            "name": "Burndown Test Sprint",
            "goal": "Test burndown calculation",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "active",
            "project_id": project_id
        }

        create_response = await client.post(
            "/api/v1/sprints",
            json=sprint_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        sprint_id = create_response.json()["id"]

        # Get burndown data
        burndown_response = await client.get(
            f"/api/v1/sprints/{sprint_id}/burndown",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert burndown_response.status_code == 200
        burndown_data = burndown_response.json()

        # Verify burndown data structure
        assert isinstance(burndown_data, list)
        
        # If there are data points, verify structure
        if len(burndown_data) > 0:
            first_point = burndown_data[0]
            assert "date" in first_point
            assert "ideal_remaining_hours" in first_point
            assert "actual_remaining_hours" in first_point
            assert "ideal_remaining_points" in first_point
            assert "actual_remaining_points" in first_point
            
            # Verify all values are non-negative
            for point in burndown_data:
                assert point["ideal_remaining_hours"] >= 0
                assert point["actual_remaining_hours"] >= 0
                assert point["ideal_remaining_points"] >= 0
                assert point["actual_remaining_points"] >= 0

    @pytest.mark.asyncio
    async def test_get_sprint_burndown_not_found(self, client: AsyncClient, test_admin):
        """Test getting burndown for non-existent sprint"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Try to get burndown for non-existent sprint
        fake_sprint_id = str(uuid4())
        response = await client.get(
            f"/api/v1/sprints/{fake_sprint_id}/burndown",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @pytest.mark.asyncio
    async def test_get_sprint_burndown_unauthorized(self, client: AsyncClient):
        """Test getting burndown without authentication"""
        fake_sprint_id = str(uuid4())
        response = await client.get(
            f"/api/v1/sprints/{fake_sprint_id}/burndown"
        )

        assert response.status_code == 401


    @pytest.mark.asyncio
    async def test_get_project_velocity(self, client: AsyncClient, test_admin):
        """Test getting project average velocity"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a project
        project_id = str(uuid4())

        # Create and complete a few sprints with velocity
        for i in range(3):
            start_date = datetime.now(UTC) + timedelta(days=i*14)
            end_date = start_date + timedelta(days=14)

            sprint_data = {
                "name": f"Sprint {i+1}",
                "goal": f"Sprint {i+1} goal",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "status": "completed",
                "project_id": project_id
            }

            create_response = await client.post(
                "/api/v1/sprints",
                json=sprint_data,
                headers={"Authorization": f"Bearer {token}"},
            )
            assert create_response.status_code == 201

        # Get project velocity
        velocity_response = await client.get(
            f"/api/v1/projects/{project_id}/sprints/velocity",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert velocity_response.status_code == 200
        velocity_data = velocity_response.json()

        # Verify velocity data structure
        assert "project_id" in velocity_data
        assert "num_sprints_analyzed" in velocity_data
        assert "avg_velocity_hours" in velocity_data
        assert "avg_velocity_story_points" in velocity_data
        assert velocity_data["project_id"] == project_id
        assert velocity_data["num_sprints_analyzed"] == 3

    @pytest.mark.asyncio
    async def test_get_project_velocity_history(self, client: AsyncClient, test_admin):
        """Test getting project velocity history"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a project
        project_id = str(uuid4())

        # Create and complete a few sprints
        sprint_ids = []
        for i in range(3):
            start_date = datetime.now(UTC) + timedelta(days=i*14)
            end_date = start_date + timedelta(days=14)

            sprint_data = {
                "name": f"History Sprint {i+1}",
                "goal": f"Sprint {i+1} goal",
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "status": "completed",
                "project_id": project_id
            }

            create_response = await client.post(
                "/api/v1/sprints",
                json=sprint_data,
                headers={"Authorization": f"Bearer {token}"},
            )
            assert create_response.status_code == 201
            sprint_ids.append(create_response.json()["id"])

        # Get velocity history
        history_response = await client.get(
            f"/api/v1/projects/{project_id}/sprints/velocity/history",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert history_response.status_code == 200
        history_data = history_response.json()

        # Verify history data structure
        assert isinstance(history_data, list)
        assert len(history_data) == 3

        # Verify each history entry
        for entry in history_data:
            assert "sprint_id" in entry
            assert "sprint_name" in entry
            assert "start_date" in entry
            assert "end_date" in entry
            assert "velocity_hours" in entry
            assert "velocity_story_points" in entry

    @pytest.mark.asyncio
    async def test_get_project_velocity_unauthorized(self, client: AsyncClient):
        """Test getting project velocity without authentication"""
        fake_project_id = str(uuid4())
        response = await client.get(
            f"/api/v1/projects/{fake_project_id}/sprints/velocity"
        )

        assert response.status_code == 401

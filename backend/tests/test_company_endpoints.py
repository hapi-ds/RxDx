"""Integration tests for Company API endpoints"""

import pytest_asyncio
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.main import app


class TestCompanyEndpoints:
    """Test Company API endpoints"""

    @pytest.mark.asyncio
    async def test_create_company(self, client: AsyncClient, test_admin):
        """Test creating a company"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        company_data = {"name": "Test Company", "description": "A test company"}

        response = await client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 201
        data = response.json()

        assert data["name"] == "Test Company"
        assert data["description"] == "A test company"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    @pytest.mark.asyncio
    async def test_create_company_minimal(
        self, client: AsyncClient, test_admin
    ):
        """Test creating a company with minimal data"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        company_data = {"name": "Minimal Company"}

        response = await client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 201
        data = response.json()

        assert data["name"] == "Minimal Company"
        assert data["description"] is None

    @pytest.mark.asyncio
    async def test_create_company_unauthorized(
        self, client: AsyncClient, test_user
    ):
        """Test creating a company without proper authorization"""
        # Login as regular user
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "TestPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        company_data = {"name": "Test Company"}

        response = await client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_create_company_unauthenticated(self, client: AsyncClient):
        """Test creating a company without authentication"""
        company_data = {"name": "Test Company"}

        response = await client.post("/api/v1/companies", json=company_data)

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_company_invalid_data(
        self, client: AsyncClient, test_admin
    ):
        """Test creating a company with invalid data"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        company_data = {"name": ""}  # Empty name

        response = await client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_company(self, client: AsyncClient, test_admin):
        """Test getting a company by ID"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a company first
        company_data = {"name": "Test Company", "description": "A test company"}

        create_response = await client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Get the company
        response = await client.get(
            f"/api/v1/companies/{company_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == company_id
        assert data["name"] == "Test Company"
        assert data["description"] == "A test company"

    @pytest.mark.asyncio
    async def test_get_company_not_found(
        self, client: AsyncClient, test_admin
    ):
        """Test getting a non-existent company"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        fake_id = str(uuid4())

        response = await client.get(
            f"/api/v1/companies/{fake_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_companies(self, client: AsyncClient, test_admin):
        """Test listing all companies"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create multiple companies
        for i in range(3):
            company_data = {"name": f"Company {i}"}
            response = await client.post(
                "/api/v1/companies",
                json=company_data,
                headers={"Authorization": f"Bearer {token}"},
            )
            assert response.status_code == 201

        # List companies
        response = await client.get(
            "/api/v1/companies",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) >= 3

    @pytest.mark.asyncio
    async def test_update_company(self, client: AsyncClient, test_admin):
        """Test updating a company"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a company
        company_data = {"name": "Original Name", "description": "Original description"}

        create_response = await client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Update the company
        update_data = {"name": "Updated Name", "description": "Updated description"}

        response = await client.put(
            f"/api/v1/companies/{company_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == company_id
        assert data["name"] == "Updated Name"
        assert data["description"] == "Updated description"

    @pytest.mark.asyncio
    async def test_update_company_partial(
        self, client: AsyncClient, test_admin
    ):
        """Test partial update of a company"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a company
        company_data = {"name": "Original Name", "description": "Original description"}

        create_response = await client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Update only the name
        update_data = {"name": "Updated Name"}

        response = await client.put(
            f"/api/v1/companies/{company_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["name"] == "Updated Name"
        # Description should remain unchanged
        assert data["description"] == "Original description"

    @pytest.mark.asyncio
    async def test_update_company_unauthorized(
        self, client: AsyncClient, test_admin, test_user
    ):
        """Test updating a company without proper authorization"""
        # Login as admin
        admin_login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert admin_login_response.status_code == 200
        admin_token = admin_login_response.json()["access_token"]

        # Create a company as admin
        company_data = {"name": "Test Company"}

        create_response = await client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Login as regular user
        user_login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "TestPassword123!"},
        )
        assert user_login_response.status_code == 200
        user_token = user_login_response.json()["access_token"]

        # Try to update as regular user
        update_data = {"name": "Updated Name"}

        response = await client.put(
            f"/api/v1/companies/{company_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_update_company_not_found(
        self, client: AsyncClient, test_admin
    ):
        """Test updating a non-existent company"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        fake_id = str(uuid4())
        update_data = {"name": "Updated Name"}

        response = await client.put(
            f"/api/v1/companies/{fake_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_company(self, client: AsyncClient, test_admin):
        """Test deleting a company"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a company
        company_data = {"name": "Test Company"}

        create_response = await client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Delete the company
        response = await client.delete(
            f"/api/v1/companies/{company_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 204

        # Verify company is deleted
        get_response = await client.get(
            f"/api/v1/companies/{company_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_company_unauthorized(
        self, client: AsyncClient, test_admin, test_user
    ):
        """Test deleting a company without proper authorization"""
        # Login as admin
        admin_login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert admin_login_response.status_code == 200
        admin_token = admin_login_response.json()["access_token"]

        # Create a company as admin
        company_data = {"name": "Test Company"}

        create_response = await client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Login as regular user
        user_login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "TestPassword123!"},
        )
        assert user_login_response.status_code == 200
        user_token = user_login_response.json()["access_token"]

        # Try to delete as regular user
        response = await client.delete(
            f"/api/v1/companies/{company_id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_company_not_found(
        self, client: AsyncClient, test_admin
    ):
        """Test deleting a non-existent company"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        fake_id = str(uuid4())

        response = await client.delete(
            f"/api/v1/companies/{fake_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_company_departments(
        self, client: AsyncClient, test_admin
    ):
        """Test getting departments for a company"""
        # Login as admin
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123!"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Create a company
        company_data = {"name": "Test Company"}

        create_response = await client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Get departments (should be empty initially)
        response = await client.get(
            f"/api/v1/companies/{company_id}/departments",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        # Initially empty, but endpoint should work

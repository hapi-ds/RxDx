"""Integration tests for Company API endpoints"""

from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.main import app


@pytest.fixture
async def admin_token(async_client: AsyncClient):
    """Get authentication token for admin user"""
    # Create admin user
    user_data = {
        "email": f"admin_{uuid4()}@example.com",
        "password": "AdminPass123!",
        "full_name": "Admin User",
        "role": "admin",
    }

    response = await async_client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 201

    # Login
    login_data = {"username": user_data["email"], "password": user_data["password"]}
    response = await async_client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200

    return response.json()["access_token"]


@pytest.fixture
async def user_token(async_client: AsyncClient):
    """Get authentication token for regular user"""
    # Create regular user
    user_data = {
        "email": f"user_{uuid4()}@example.com",
        "password": "UserPass123!",
        "full_name": "Regular User",
        "role": "user",
    }

    response = await async_client.post("/api/v1/auth/register", json=user_data)
    assert response.status_code == 201

    # Login
    login_data = {"username": user_data["email"], "password": user_data["password"]}
    response = await async_client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200

    return response.json()["access_token"]


class TestCompanyEndpoints:
    """Test Company API endpoints"""

    @pytest.mark.asyncio
    async def test_create_company(self, async_client: AsyncClient, admin_token: str):
        """Test creating a company"""
        company_data = {"name": "Test Company", "description": "A test company"}

        response = await async_client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {admin_token}"},
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
        self, async_client: AsyncClient, admin_token: str
    ):
        """Test creating a company with minimal data"""
        company_data = {"name": "Minimal Company"}

        response = await async_client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 201
        data = response.json()

        assert data["name"] == "Minimal Company"
        assert data["description"] is None

    @pytest.mark.asyncio
    async def test_create_company_unauthorized(
        self, async_client: AsyncClient, user_token: str
    ):
        """Test creating a company without proper authorization"""
        company_data = {"name": "Test Company"}

        response = await async_client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_create_company_unauthenticated(self, async_client: AsyncClient):
        """Test creating a company without authentication"""
        company_data = {"name": "Test Company"}

        response = await async_client.post("/api/v1/companies", json=company_data)

        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_create_company_invalid_data(
        self, async_client: AsyncClient, admin_token: str
    ):
        """Test creating a company with invalid data"""
        company_data = {"name": ""}  # Empty name

        response = await async_client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_get_company(self, async_client: AsyncClient, admin_token: str):
        """Test getting a company by ID"""
        # Create a company first
        company_data = {"name": "Test Company", "description": "A test company"}

        create_response = await async_client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Get the company
        response = await async_client.get(
            f"/api/v1/companies/{company_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == company_id
        assert data["name"] == "Test Company"
        assert data["description"] == "A test company"

    @pytest.mark.asyncio
    async def test_get_company_not_found(
        self, async_client: AsyncClient, admin_token: str
    ):
        """Test getting a non-existent company"""
        fake_id = str(uuid4())

        response = await async_client.get(
            f"/api/v1/companies/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_list_companies(self, async_client: AsyncClient, admin_token: str):
        """Test listing all companies"""
        # Create multiple companies
        for i in range(3):
            company_data = {"name": f"Company {i}"}
            response = await async_client.post(
                "/api/v1/companies",
                json=company_data,
                headers={"Authorization": f"Bearer {admin_token}"},
            )
            assert response.status_code == 201

        # List companies
        response = await async_client.get(
            "/api/v1/companies",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        assert len(data) >= 3

    @pytest.mark.asyncio
    async def test_update_company(self, async_client: AsyncClient, admin_token: str):
        """Test updating a company"""
        # Create a company
        company_data = {"name": "Original Name", "description": "Original description"}

        create_response = await async_client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Update the company
        update_data = {"name": "Updated Name", "description": "Updated description"}

        response = await async_client.put(
            f"/api/v1/companies/{company_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["id"] == company_id
        assert data["name"] == "Updated Name"
        assert data["description"] == "Updated description"

    @pytest.mark.asyncio
    async def test_update_company_partial(
        self, async_client: AsyncClient, admin_token: str
    ):
        """Test partial update of a company"""
        # Create a company
        company_data = {"name": "Original Name", "description": "Original description"}

        create_response = await async_client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Update only the name
        update_data = {"name": "Updated Name"}

        response = await async_client.put(
            f"/api/v1/companies/{company_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert data["name"] == "Updated Name"
        # Description should remain unchanged
        assert data["description"] == "Original description"

    @pytest.mark.asyncio
    async def test_update_company_unauthorized(
        self, async_client: AsyncClient, admin_token: str, user_token: str
    ):
        """Test updating a company without proper authorization"""
        # Create a company as admin
        company_data = {"name": "Test Company"}

        create_response = await async_client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Try to update as regular user
        update_data = {"name": "Updated Name"}

        response = await async_client.put(
            f"/api/v1/companies/{company_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_update_company_not_found(
        self, async_client: AsyncClient, admin_token: str
    ):
        """Test updating a non-existent company"""
        fake_id = str(uuid4())
        update_data = {"name": "Updated Name"}

        response = await async_client.put(
            f"/api/v1/companies/{fake_id}",
            json=update_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_company(self, async_client: AsyncClient, admin_token: str):
        """Test deleting a company"""
        # Create a company
        company_data = {"name": "Test Company"}

        create_response = await async_client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Delete the company
        response = await async_client.delete(
            f"/api/v1/companies/{company_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 204

        # Verify company is deleted
        get_response = await async_client.get(
            f"/api/v1/companies/{company_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert get_response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_company_unauthorized(
        self, async_client: AsyncClient, admin_token: str, user_token: str
    ):
        """Test deleting a company without proper authorization"""
        # Create a company as admin
        company_data = {"name": "Test Company"}

        create_response = await async_client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Try to delete as regular user
        response = await async_client.delete(
            f"/api/v1/companies/{company_id}",
            headers={"Authorization": f"Bearer {user_token}"},
        )

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_delete_company_not_found(
        self, async_client: AsyncClient, admin_token: str
    ):
        """Test deleting a non-existent company"""
        fake_id = str(uuid4())

        response = await async_client.delete(
            f"/api/v1/companies/{fake_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_company_departments(
        self, async_client: AsyncClient, admin_token: str
    ):
        """Test getting departments for a company"""
        # Create a company
        company_data = {"name": "Test Company"}

        create_response = await async_client.post(
            "/api/v1/companies",
            json=company_data,
            headers={"Authorization": f"Bearer {admin_token}"},
        )
        assert create_response.status_code == 201
        company_id = create_response.json()["id"]

        # Get departments (should be empty initially)
        response = await async_client.get(
            f"/api/v1/companies/{company_id}/departments",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        # Initially empty, but endpoint should work

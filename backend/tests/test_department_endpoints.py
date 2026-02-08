"""Integration tests for Department API endpoints"""

import uuid
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User, UserRole
from app.schemas.company import CompanyResponse
from app.schemas.department import DepartmentResponse


# Test fixtures
@pytest.fixture
def mock_user():
    """Create a mock user for testing"""
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "test@example.com"
    user.full_name = "Test User"
    user.role = UserRole.USER
    return user


@pytest.fixture
def mock_admin_user():
    """Create a mock admin user for testing"""
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "admin@example.com"
    user.full_name = "Admin User"
    user.role = UserRole.ADMIN
    return user


@pytest.fixture
def mock_project_manager():
    """Create a mock project manager user for testing"""
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "pm@example.com"
    user.full_name = "Project Manager"
    user.role = UserRole.PROJECT_MANAGER
    return user


@pytest.fixture
def sample_company():
    """Create a sample company response"""
    now = datetime.now(UTC)
    return CompanyResponse(
        id=uuid.uuid4(),
        name="Test Company",
        description="A test company",
        created_at=now,
        updated_at=now,
    )


@pytest.fixture
def sample_department(sample_company):
    """Create a sample department response"""
    return DepartmentResponse(
        id=uuid.uuid4(),
        name="Engineering",
        description="Engineering department",
        manager_user_id=uuid.uuid4(),
        company_id=sample_company.id,
        created_at=datetime.now(UTC),
        company=sample_company,
    )


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


# Mock dependencies
def override_get_current_user(user):
    """Override get_current_user dependency"""

    async def _get_current_user():
        return user

    return _get_current_user


def override_get_department_service(mock_service):
    """Override get_department_service dependency"""

    def _get_department_service():
        return mock_service

    return _get_department_service


class TestCreateDepartment:
    """Tests for POST /api/v1/departments"""

    def test_create_department_success(
        self, client, mock_project_manager, sample_department
    ):
        """Test successful department creation"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.create_department = AsyncMock(return_value=sample_department)

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_project_manager
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.post(
                "/api/v1/departments",
                json={
                    "name": "Engineering",
                    "description": "Engineering department",
                    "company_id": str(sample_department.company_id),
                    "manager_user_id": str(sample_department.manager_user_id),
                },
            )

            assert response.status_code == status.HTTP_201_CREATED
            data = response.json()
            assert "id" in data
            assert data["name"] == "Engineering"
            assert data["company_id"] == str(sample_department.company_id)
        finally:
            app.dependency_overrides.clear()

    def test_create_department_requires_company_id(self, client, mock_project_manager):
        """Test that company_id is required when creating a department"""
        from app.api.deps import get_current_user

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_project_manager
        )

        try:
            response = client.post(
                "/api/v1/departments",
                json={
                    "name": "Engineering",
                    "description": "Engineering department",
                },
            )

            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        finally:
            app.dependency_overrides.clear()

    def test_create_department_company_not_found(self, client, mock_project_manager):
        """Test creating department with non-existent company"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.create_department = AsyncMock(
            side_effect=ValueError("Company not found")
        )

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_project_manager
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.post(
                "/api/v1/departments",
                json={
                    "name": "Engineering",
                    "company_id": str(uuid.uuid4()),
                },
            )

            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Company" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()

    def test_create_department_unauthorized(self, client, mock_user):
        """Test that regular users cannot create departments"""
        from app.api.deps import get_current_user

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_user
        )

        try:
            response = client.post(
                "/api/v1/departments",
                json={
                    "name": "Engineering",
                    "company_id": str(uuid.uuid4()),
                },
            )

            assert response.status_code == status.HTTP_403_FORBIDDEN
        finally:
            app.dependency_overrides.clear()


class TestListDepartments:
    """Tests for GET /api/v1/departments"""

    def test_list_departments_success(self, client, mock_user, sample_department):
        """Test successful retrieval of departments"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.list_departments = AsyncMock(return_value=[sample_department])

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_user
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.get("/api/v1/departments")

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 1
            assert data[0]["name"] == "Engineering"
        finally:
            app.dependency_overrides.clear()

    def test_list_departments_with_limit(self, client, mock_user, sample_department):
        """Test retrieval with limit parameter"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.list_departments = AsyncMock(return_value=[sample_department])

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_user
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.get("/api/v1/departments?limit=50")

            assert response.status_code == status.HTTP_200_OK
            mock_service.list_departments.assert_called_once()
        finally:
            app.dependency_overrides.clear()

    def test_list_departments_empty(self, client, mock_user):
        """Test retrieval when no departments exist"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.list_departments = AsyncMock(return_value=[])

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_user
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.get("/api/v1/departments")

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data == []
        finally:
            app.dependency_overrides.clear()


class TestGetDepartment:
    """Tests for GET /api/v1/departments/{department_id}"""

    def test_get_department_success(self, client, mock_user, sample_department):
        """Test successful retrieval of single department with company"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.get_department = AsyncMock(return_value=sample_department)

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_user
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.get(f"/api/v1/departments/{sample_department.id}")

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["id"] == str(sample_department.id)
            assert data["name"] == "Engineering"
            # Verify company is included in response
            assert "company" in data
            if data["company"]:
                assert data["company"]["id"] == str(sample_department.company_id)
                assert data["company"]["name"] == "Test Company"
        finally:
            app.dependency_overrides.clear()

    def test_get_department_not_found(self, client, mock_user):
        """Test retrieval of non-existent department"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.get_department = AsyncMock(return_value=None)

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_user
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.get(f"/api/v1/departments/{uuid.uuid4()}")

            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            app.dependency_overrides.clear()


class TestGetDepartmentCompany:
    """Tests for GET /api/v1/departments/{department_id}/company"""

    def test_get_department_company_success(
        self, client, mock_user, sample_department, sample_company
    ):
        """Test successful retrieval of department's company"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.get_department_company = AsyncMock(
            return_value={
                "id": str(sample_company.id),
                "name": sample_company.name,
                "description": sample_company.description,
                "created_at": sample_company.created_at.isoformat(),
            }
        )

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_user
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.get(f"/api/v1/departments/{sample_department.id}/company")

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["id"] == str(sample_company.id)
            assert data["name"] == sample_company.name
        finally:
            app.dependency_overrides.clear()

    def test_get_department_company_not_found(self, client, mock_user):
        """Test retrieval of company for non-existent department"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.get_department_company = AsyncMock(return_value=None)

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_user
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.get(f"/api/v1/departments/{uuid.uuid4()}/company")

            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            app.dependency_overrides.clear()


class TestUpdateDepartment:
    """Tests for PUT /api/v1/departments/{department_id}"""

    def test_update_department_success(
        self, client, mock_project_manager, sample_department
    ):
        """Test successful update"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        updated_department = DepartmentResponse(
            id=sample_department.id,
            name="Updated Engineering",
            description=sample_department.description,
            manager_user_id=sample_department.manager_user_id,
            company_id=sample_department.company_id,
            created_at=sample_department.created_at,
            company=sample_department.company,
        )

        mock_service = MagicMock()
        mock_service.update_department = AsyncMock(return_value=updated_department)

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_project_manager
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.put(
                f"/api/v1/departments/{sample_department.id}",
                json={"name": "Updated Engineering"},
            )

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["name"] == "Updated Engineering"
        finally:
            app.dependency_overrides.clear()

    def test_update_department_not_found(self, client, mock_project_manager):
        """Test update of non-existent department"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.update_department = AsyncMock(return_value=None)

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_project_manager
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.put(
                f"/api/v1/departments/{uuid.uuid4()}",
                json={"name": "Updated"},
            )

            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            app.dependency_overrides.clear()

    def test_update_department_unauthorized(self, client, mock_user):
        """Test that regular users cannot update departments"""
        from app.api.deps import get_current_user

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_user
        )

        try:
            response = client.put(
                f"/api/v1/departments/{uuid.uuid4()}",
                json={"name": "Updated"},
            )

            assert response.status_code == status.HTTP_403_FORBIDDEN
        finally:
            app.dependency_overrides.clear()

    def test_update_department_company_not_found(
        self, client, mock_project_manager, sample_department
    ):
        """Test updating department with non-existent company"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.update_department = AsyncMock(
            side_effect=ValueError("Company not found")
        )

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_project_manager
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.put(
                f"/api/v1/departments/{sample_department.id}",
                json={"company_id": str(uuid.uuid4())},
            )

            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "Company" in response.json()["detail"]
        finally:
            app.dependency_overrides.clear()


class TestDeleteDepartment:
    """Tests for DELETE /api/v1/departments/{department_id}"""

    def test_delete_department_success(self, client, mock_admin_user):
        """Test successful deletion"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.delete_department = AsyncMock(return_value=True)

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_admin_user
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.delete(f"/api/v1/departments/{uuid.uuid4()}")

            assert response.status_code == status.HTTP_204_NO_CONTENT
        finally:
            app.dependency_overrides.clear()

    def test_delete_department_not_found(self, client, mock_admin_user):
        """Test deletion of non-existent department"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.delete_department = AsyncMock(return_value=False)

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_admin_user
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.delete(f"/api/v1/departments/{uuid.uuid4()}")

            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            app.dependency_overrides.clear()

    def test_delete_department_unauthorized_project_manager(
        self, client, mock_project_manager
    ):
        """Test that project managers cannot delete departments"""
        from app.api.deps import get_current_user

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_project_manager
        )

        try:
            response = client.delete(f"/api/v1/departments/{uuid.uuid4()}")

            assert response.status_code == status.HTTP_403_FORBIDDEN
        finally:
            app.dependency_overrides.clear()

    def test_delete_department_with_resources(self, client, mock_admin_user):
        """Test deletion of department with existing resources"""
        from app.api.deps import get_current_user
        from app.api.v1.departments import get_department_service

        mock_service = MagicMock()
        mock_service.delete_department = AsyncMock(
            side_effect=ValueError("Cannot delete department with existing resources")
        )

        app.dependency_overrides[get_current_user] = override_get_current_user(
            mock_admin_user
        )
        app.dependency_overrides[get_department_service] = (
            override_get_department_service(mock_service)
        )

        try:
            response = client.delete(f"/api/v1/departments/{uuid.uuid4()}")

            assert response.status_code == status.HTTP_400_BAD_REQUEST
            assert "resources" in response.json()["detail"].lower()
        finally:
            app.dependency_overrides.clear()

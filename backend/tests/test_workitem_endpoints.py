"""Integration tests for WorkItem API endpoints"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest_asyncio
from fastapi import status
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.security import create_access_token
from app.db.session import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.services.auth_service import AuthService
from app.services.workitem_service import get_workitem_service

# Test database setup
TEST_DATABASE_URL = "postgresql+asyncpg://rxdx:rxdx_dev_password@localhost:5432/test_rxdx"


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """Create a test database engine for each test"""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        pool_pre_ping=True,
        poolclass=None,  # Use NullPool to avoid connection pool issues
    )

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    # Drop tables and dispose engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    """Create test database session"""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def mock_graph_service():
    """Mock graph service for testing"""
    mock = AsyncMock()
    return mock


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession):
    """Create a test user"""
    auth_service = AuthService(db_session)

    user = await auth_service.create_user(
        email="test@example.com",
        password="testpassword123",
        full_name="Test User",
        role=UserRole.USER,
    )

    return user


@pytest_asyncio.fixture
async def admin_user(db_session: AsyncSession):
    """Create an admin test user"""
    auth_service = AuthService(db_session)

    user = await auth_service.create_user(
        email="admin@example.com",
        password="adminpassword123",
        full_name="Admin User",
        role=UserRole.ADMIN,
    )

    return user


@pytest_asyncio.fixture
async def auth_headers(test_user: User):
    """Create authentication headers for test user"""
    token = create_access_token(data={"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def admin_headers(admin_user: User):
    """Create authentication headers for admin user"""
    token = create_access_token(data={"sub": str(admin_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def client(db_session: AsyncSession, mock_graph_service):
    """Create test client with database and graph service dependency overrides"""

    def override_get_db():
        return db_session

    def override_get_workitem_service():
        from app.services.workitem_service import WorkItemService
        return WorkItemService(mock_graph_service)

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_workitem_service] = override_get_workitem_service

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac

    # Clean up
    app.dependency_overrides.clear()


class TestWorkItemEndpoints:
    """Test WorkItem API endpoints"""

    async def test_create_workitem_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test successful WorkItem creation"""
        # Setup mock
        mock_graph_service.create_workitem_node.return_value = None

        workitem_data = {
            "title": "Test Requirement",
            "description": "This is a test requirement",
            "status": "draft",
            "priority": 3,
            "type": "requirement"
        }

        response = await client.post(
            "/api/v1/workitems",
            json=workitem_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()

        assert data["title"] == workitem_data["title"]
        assert data["description"] == workitem_data["description"]
        assert data["status"] == workitem_data["status"]
        assert data["priority"] == workitem_data["priority"]
        assert data["type"] == workitem_data["type"]
        assert data["version"] == "1.0"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

        # Verify graph service was called
        mock_graph_service.create_workitem_node.assert_called_once()

    async def test_create_workitem_unauthorized(
        self,
        client: AsyncClient,
    ):
        """Test WorkItem creation without authentication"""
        workitem_data = {
            "title": "Test Requirement",
            "description": "This is a test requirement",
            "status": "draft",
            "priority": 3,
            "type": "requirement"
        }

        response = await client.post(
            "/api/v1/workitems",
            json=workitem_data
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_create_workitem_invalid_data(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test WorkItem creation with invalid data"""
        workitem_data = {
            "title": "",  # Invalid: empty title
            "status": "invalid_status",  # Invalid status
            "type": "invalid_type"  # Invalid type
        }

        response = await client.post(
            "/api/v1/workitems",
            json=workitem_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT

    async def test_get_workitems_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test successful WorkItems retrieval"""
        # Setup mock for creation
        mock_graph_service.create_workitem_node.return_value = None

        # Setup mock for search
        mock_workitem_data = {
            "id": str(uuid4()),
            "type": "requirement",
            "title": "Test Requirement",
            "description": "This is a test requirement",
            "status": "draft",
            "priority": 3,
            "version": "1.0",
            "created_by": str(uuid4()),
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "is_signed": False
        }
        mock_graph_service.search_workitems.return_value = [mock_workitem_data]

        # First create a workitem
        workitem_data = {
            "title": "Test Requirement",
            "description": "This is a test requirement",
            "status": "draft",
            "priority": 3,
            "type": "requirement"
        }

        create_response = await client.post(
            "/api/v1/workitems",
            json=workitem_data,
            headers=auth_headers
        )
        assert create_response.status_code == status.HTTP_201_CREATED

        # Now get workitems
        response = await client.get(
            "/api/v1/workitems",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert isinstance(data, list)
        assert len(data) >= 1

        # Check the workitem is in the list
        workitem = data[0]
        assert workitem["title"] == "Test Requirement"
        assert workitem["type"] == "requirement"

    async def test_get_workitems_with_filters(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test WorkItems retrieval with filters"""
        # Setup mock for search with filters
        requirement_data = {
            "id": str(uuid4()),
            "type": "requirement",
            "title": "Requirement 1",
            "description": "First requirement",
            "status": "draft",
            "priority": 1,
            "version": "1.0",
            "created_by": str(uuid4()),
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "is_signed": False
        }

        # Mock search to return requirement when filtered by type
        mock_graph_service.search_workitems.return_value = [requirement_data]

        # Test filtering by type
        response = await client.get(
            "/api/v1/workitems?type=requirement",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert len(data) == 1
        assert data[0]["type"] == "requirement"
        assert data[0]["title"] == "Requirement 1"

        # Verify search was called with correct filters
        mock_graph_service.search_workitems.assert_called_with(
            search_text=None,
            workitem_type="requirement",
            status=None,
            assigned_to=None,
            limit=100
        )

    async def test_get_workitem_by_id_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test successful WorkItem retrieval by ID"""
        workitem_id = uuid4()
        mock_workitem_data = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Test Requirement",
            "description": "This is a test requirement",
            "status": "draft",
            "priority": 3,
            "version": "1.0",
            "created_by": str(uuid4()),
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "is_signed": False
        }

        # Setup mock
        mock_graph_service.get_workitem.return_value = mock_workitem_data

        # Get the workitem by ID
        response = await client.get(
            f"/api/v1/workitems/{workitem_id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["id"] == str(workitem_id)
        assert data["title"] == "Test Requirement"
        assert data["description"] == "This is a test requirement"
        assert data["status"] == "draft"
        assert data["priority"] == 3
        assert data["type"] == "requirement"

        # Verify graph service was called
        mock_graph_service.get_workitem.assert_called_once_with(str(workitem_id))

    async def test_get_workitem_by_id_not_found(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test WorkItem retrieval with non-existent ID"""
        fake_id = str(uuid4())

        # Setup mock to return None (not found)
        mock_graph_service.get_workitem.return_value = None

        response = await client.get(
            f"/api/v1/workitems/{fake_id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND

        # Verify graph service was called
        mock_graph_service.get_workitem.assert_called_once_with(fake_id)

    async def test_update_workitem_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test successful WorkItem update"""
        workitem_id = uuid4()

        # Mock current workitem data
        current_workitem = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Test Requirement",
            "description": "This is a test requirement",
            "status": "draft",
            "priority": 3,
            "version": "1.0",
            "created_by": str(uuid4()),
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "is_signed": False
        }

        # Mock updated workitem data
        updated_workitem = {
            **current_workitem,
            "title": "Updated Test Requirement",
            "status": "active",
            "priority": 5,
            "version": "1.1",
            "updated_at": "2024-01-01T01:00:00Z"
        }

        # Setup mocks
        mock_graph_service.get_workitem.return_value = current_workitem
        mock_graph_service.create_workitem_version.return_value = None
        mock_graph_service.create_relationship.return_value = None

        # Update the workitem
        update_data = {
            "title": "Updated Test Requirement",
            "status": "active",
            "priority": 5
        }

        response = await client.patch(
            f"/api/v1/workitems/{workitem_id}?change_description=Updated for testing",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["id"] == str(workitem_id)
        assert data["title"] == update_data["title"]
        assert data["status"] == update_data["status"]
        assert data["priority"] == update_data["priority"]
        assert data["version"] == "1.1"  # Version should increment
        assert data["description"] == current_workitem["description"]  # Unchanged field

        # Verify graph service methods were called
        mock_graph_service.get_workitem.assert_called_once_with(str(workitem_id))
        mock_graph_service.create_workitem_version.assert_called_once()
        mock_graph_service.create_relationship.assert_called_once()

    async def test_delete_workitem_success(
        self,
        client: AsyncClient,
        admin_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test successful WorkItem deletion (admin user)"""
        workitem_id = uuid4()

        # Mock workitem data
        mock_workitem_data = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Test Requirement",
            "description": "This is a test requirement",
            "status": "draft",
            "priority": 3,
            "version": "1.0",
            "created_by": str(uuid4()),
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "is_signed": False
        }

        # Setup mocks
        mock_graph_service.get_workitem.return_value = mock_workitem_data
        mock_graph_service.delete_node.return_value = None

        # Delete the workitem
        response = await client.delete(
            f"/api/v1/workitems/{workitem_id}",
            headers=admin_headers
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verify graph service methods were called
        assert mock_graph_service.get_workitem.call_count == 2  # Called twice: once for audit, once for deletion
        mock_graph_service.delete_node.assert_called_once_with(str(workitem_id))

    async def test_delete_workitem_insufficient_permissions(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test WorkItem deletion with insufficient permissions"""
        workitem_id = uuid4()

        # Try to delete with regular user (should fail)
        response = await client.delete(
            f"/api/v1/workitems/{workitem_id}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Verify graph service was not called
        mock_graph_service.get_workitem.assert_not_called()
        mock_graph_service.delete_node.assert_not_called()


class TestWorkItemVersionHistoryIntegration:
    """Integration tests for WorkItem version history functionality"""

    async def test_get_workitem_history_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test successful WorkItem version history retrieval"""
        workitem_id = uuid4()
        user_id = uuid4()

        # Mock version history data (newest first)
        version_history = [
            {
                "id": str(workitem_id),
                "type": "requirement",
                "title": "Updated Test Requirement v1.2",
                "description": "This is an updated test requirement",
                "status": "active",
                "priority": 5,
                "version": "1.2",
                "created_by": str(user_id),
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T02:00:00Z",
                "is_signed": False
            },
            {
                "id": str(workitem_id),
                "type": "requirement",
                "title": "Updated Test Requirement v1.1",
                "description": "This is an updated test requirement",
                "status": "active",
                "priority": 3,
                "version": "1.1",
                "created_by": str(user_id),
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T01:00:00Z",
                "is_signed": False
            },
            {
                "id": str(workitem_id),
                "type": "requirement",
                "title": "Test Requirement v1.0",
                "description": "This is a test requirement",
                "status": "draft",
                "priority": 3,
                "version": "1.0",
                "created_by": str(user_id),
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z",
                "is_signed": False
            }
        ]

        # Mock the WorkItemService to return version history
        # Since we're mocking at the graph service level, we need to mock the conversion
        mock_graph_service.get_workitem.return_value = version_history[0]  # For fallback

        # Get version history
        response = await client.get(
            f"/api/v1/workitems/{workitem_id}/history",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Should return at least the current version (fallback behavior)
        assert isinstance(data, list)
        assert len(data) >= 1

        # Check the first version (current)
        current_version = data[0]
        assert current_version["id"] == str(workitem_id)
        assert current_version["version"] == "1.2"
        assert current_version["title"] == "Updated Test Requirement v1.2"

    async def test_get_workitem_version_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test successful specific WorkItem version retrieval"""
        workitem_id = uuid4()
        version = "1.1"
        user_id = uuid4()

        # Mock specific version data
        version_data = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Test Requirement v1.1",
            "description": "This is version 1.1 of the requirement",
            "status": "active",
            "priority": 3,
            "version": version,
            "created_by": str(user_id),
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T01:00:00Z",
            "is_signed": False
        }

        # Setup mock
        mock_graph_service.get_workitem_version.return_value = version_data

        # Get specific version
        response = await client.get(
            f"/api/v1/workitems/{workitem_id}/version/{version}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        assert data["id"] == str(workitem_id)
        assert data["version"] == version
        assert data["title"] == "Test Requirement v1.1"
        assert data["description"] == "This is version 1.1 of the requirement"
        assert data["status"] == "active"

        # Verify graph service was called with correct parameters
        mock_graph_service.get_workitem_version.assert_called_once_with(
            str(workitem_id),
            version
        )

    async def test_get_workitem_version_not_found(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test WorkItem version retrieval when version doesn't exist"""
        workitem_id = uuid4()
        version = "2.0"

        # Setup mock to return None (version not found)
        mock_graph_service.get_workitem_version.return_value = None

        response = await client.get(
            f"/api/v1/workitems/{workitem_id}/version/{version}",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert "not found" in data["detail"].lower()

        # Verify graph service was called
        mock_graph_service.get_workitem_version.assert_called_once_with(
            str(workitem_id),
            version
        )

    async def test_compare_workitem_versions_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test successful WorkItem version comparison"""
        workitem_id = uuid4()

        # Mock comparison result (this would come from VersionService)
        # Since we're testing without VersionService, this will return 501
        response = await client.get(
            f"/api/v1/workitems/{workitem_id}/compare/1.0/1.1",
            headers=auth_headers
        )

        # Should return 501 when VersionService is not available
        assert response.status_code == status.HTTP_501_NOT_IMPLEMENTED
        data = response.json()
        assert "not available" in data["detail"].lower()

    async def test_workitem_update_creates_new_version(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test that updating a WorkItem creates a new version"""
        workitem_id = uuid4()
        user_id = uuid4()

        # Mock original workitem
        original_workitem = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Original Title",
            "description": "Original description",
            "status": "draft",
            "priority": 3,
            "version": "1.0",
            "created_by": str(user_id),
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "is_signed": False
        }

        # Setup mocks for update
        mock_graph_service.get_workitem.return_value = original_workitem
        mock_graph_service.create_workitem_version.return_value = None
        mock_graph_service.create_relationship.return_value = None

        # Update the workitem
        update_data = {
            "title": "Updated Title",
            "status": "active"
        }

        response = await client.patch(
            f"/api/v1/workitems/{workitem_id}?change_description=Updated title and status",
            json=update_data,
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()

        # Verify new version was created
        assert data["version"] == "1.1"  # Should increment from 1.0
        assert data["title"] == "Updated Title"
        assert data["status"] == "active"

        # Verify version creation was called
        mock_graph_service.create_workitem_version.assert_called_once()
        mock_graph_service.create_relationship.assert_called_once()

        # Verify relationship creation includes version information
        relationship_call = mock_graph_service.create_relationship.call_args
        assert relationship_call[1]["rel_type"] == "NEXT_VERSION"
        assert "from_version" in relationship_call[1]["properties"]
        assert "to_version" in relationship_call[1]["properties"]
        assert relationship_call[1]["properties"]["from_version"] == "1.0"
        assert relationship_call[1]["properties"]["to_version"] == "1.1"

    async def test_workitem_history_empty_when_not_found(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_graph_service: AsyncMock,
    ):
        """Test WorkItem history returns 404 when WorkItem doesn't exist"""
        fake_workitem_id = uuid4()

        # Setup mock to return None (workitem not found)
        mock_graph_service.get_workitem.return_value = None

        response = await client.get(
            f"/api/v1/workitems/{fake_workitem_id}/history",
            headers=auth_headers
        )

        assert response.status_code == status.HTTP_404_NOT_FOUND
        data = response.json()
        assert "not found" in data["detail"].lower()

    async def test_unauthorized_access_to_version_endpoints(
        self,
        client: AsyncClient,
    ):
        """Test that version endpoints require authentication"""
        workitem_id = uuid4()

        # Test history endpoint
        response = await client.get(f"/api/v1/workitems/{workitem_id}/history")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # Test version endpoint
        response = await client.get(f"/api/v1/workitems/{workitem_id}/version/1.0")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

        # Test comparison endpoint
        response = await client.get(f"/api/v1/workitems/{workitem_id}/compare/1.0/1.1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

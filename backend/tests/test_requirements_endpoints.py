"""Integration tests for Requirements API endpoints"""

import pytest
import pytest_asyncio
from fastapi import status
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from uuid import uuid4
from unittest.mock import AsyncMock

from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.services.auth_service import AuthService
from app.services.requirement_service import get_requirement_service
from app.services.audit_service import get_audit_service


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
async def mock_requirement_service():
    """Mock requirement service for testing"""
    mock = AsyncMock()
    return mock


@pytest_asyncio.fixture
async def mock_audit_service():
    """Mock audit service for testing"""
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
async def validator_user(db_session: AsyncSession):
    """Create a validator test user"""
    auth_service = AuthService(db_session)
    
    user = await auth_service.create_user(
        email="validator@example.com",
        password="validatorpassword123",
        full_name="Validator User",
        role=UserRole.VALIDATOR,
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
async def validator_headers(validator_user: User):
    """Create authentication headers for validator user"""
    token = create_access_token(data={"sub": str(validator_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture
async def client(db_session: AsyncSession, mock_requirement_service, mock_audit_service):
    """Create test client with dependency overrides"""
    
    def override_get_db():
        return db_session
    
    def override_get_requirement_service():
        return mock_requirement_service
    
    def override_get_audit_service():
        return mock_audit_service
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_requirement_service] = override_get_requirement_service
    app.dependency_overrides[get_audit_service] = override_get_audit_service
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test"
    ) as ac:
        yield ac
    
    # Clean up
    app.dependency_overrides.clear()


class TestRequirementsEndpoints:
    """Test Requirements API endpoints"""
    
    async def test_get_requirements_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_requirement_service: AsyncMock,
        mock_audit_service: AsyncMock,
    ):
        """Test successful requirements retrieval with filtering"""
        # Setup mock response
        from app.schemas.workitem import RequirementResponse
        from datetime import datetime
        from uuid import uuid4
        
        mock_requirements = [
            RequirementResponse(
                id=uuid4(),
                type="requirement",
                title="Test Requirement 1",
                description="This is a test requirement",
                status="active",
                priority=3,
                assigned_to=None,
                version="1.0",
                created_by=uuid4(),
                created_at=datetime.now(),
                updated_at=datetime.now(),
                is_signed=False,
                acceptance_criteria="Given a user, when they perform an action, then the system should respond",
                business_value="Provides value to users",
                source="stakeholder"
            ),
            RequirementResponse(
                id=uuid4(),
                type="requirement",
                title="Test Requirement 2",
                description="This is another test requirement",
                status="draft",
                priority=2,
                assigned_to=None,
                version="1.0",
                created_by=uuid4(),
                created_at=datetime.now(),
                updated_at=datetime.now(),
                is_signed=False,
                acceptance_criteria="Given a condition, when an event occurs, then the outcome should be achieved",
                business_value="Improves system efficiency",
                source="regulation"
            )
        ]
        
        mock_requirement_service.search_requirements.return_value = mock_requirements
        
        # Test with various filters
        response = await client.get(
            "/api/v1/requirements",
            params={
                "search": "test",
                "status": "active",
                "priority": 3,
                "source": "stakeholder",
                "has_acceptance_criteria": True,
                "limit": 50,
                "offset": 0
            },
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert len(data) == 2
        assert data[0]["title"] == "Test Requirement 1"
        assert data[0]["acceptance_criteria"] == "Given a user, when they perform an action, then the system should respond"
        assert data[0]["business_value"] == "Provides value to users"
        assert data[0]["source"] == "stakeholder"
        
        # Verify service was called with correct parameters
        mock_requirement_service.search_requirements.assert_called_once_with(
            search_text="test",
            status="active",
            assigned_to=None,
            created_by=None,
            priority=3,
            source="stakeholder",
            has_acceptance_criteria=True,
            limit=50,
            offset=0
        )
        
        # Verify audit logging
        mock_audit_service.log.assert_called_once()
        audit_call = mock_audit_service.log.call_args
        assert audit_call[1]["action"] == "READ"
        assert audit_call[1]["entity_type"] == "Requirement"
    
    async def test_get_requirements_unauthorized(
        self,
        client: AsyncClient,
    ):
        """Test requirements retrieval without authentication"""
        response = await client.get("/api/v1/requirements")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    async def test_get_requirements_validator_permission(
        self,
        client: AsyncClient,
        validator_headers: dict,
        mock_requirement_service: AsyncMock,
        mock_audit_service: AsyncMock,
    ):
        """Test that validator users can read requirements"""
        mock_requirement_service.search_requirements.return_value = []
        
        response = await client.get(
            "/api/v1/requirements",
            headers=validator_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        mock_requirement_service.search_requirements.assert_called_once()
    
    async def test_create_requirement_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_requirement_service: AsyncMock,
        mock_audit_service: AsyncMock,
    ):
        """Test successful requirement creation"""
        from app.schemas.workitem import RequirementResponse
        from datetime import datetime
        from uuid import uuid4
        
        # Setup mock response
        created_requirement = RequirementResponse(
            id=uuid4(),
            type="requirement",
            title="New Test Requirement",
            description="This is a comprehensive test requirement with detailed description",
            status="draft",
            priority=3,
            assigned_to=None,
            version="1.0",
            created_by=uuid4(),
            created_at=datetime.now(),
            updated_at=datetime.now(),
            is_signed=False,
            acceptance_criteria="Given a user wants to test the system, when they submit valid data, then the requirement should be created successfully",
            business_value="Enables comprehensive testing of requirement creation functionality",
            source="stakeholder"
        )
        
        mock_requirement_service.create_requirement.return_value = created_requirement
        
        requirement_data = {
            "title": "New Test Requirement",
            "description": "This is a comprehensive test requirement with detailed description",
            "status": "draft",
            "priority": 3,
            "acceptance_criteria": "Given a user wants to test the system, when they submit valid data, then the requirement should be created successfully",
            "business_value": "Enables comprehensive testing of requirement creation functionality",
            "source": "stakeholder"
        }
        
        response = await client.post(
            "/api/v1/requirements",
            json=requirement_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        assert data["title"] == requirement_data["title"]
        assert data["description"] == requirement_data["description"]
        assert data["status"] == requirement_data["status"]
        assert data["priority"] == requirement_data["priority"]
        assert data["acceptance_criteria"] == requirement_data["acceptance_criteria"]
        assert data["business_value"] == requirement_data["business_value"]
        assert data["source"] == requirement_data["source"]
        assert data["version"] == "1.0"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
        
        # Verify service was called
        mock_requirement_service.create_requirement.assert_called_once()
        
        # Verify audit logging
        mock_audit_service.log.assert_called_once()
        audit_call = mock_audit_service.log.call_args
        assert audit_call[1]["action"] == "CREATE"
        assert audit_call[1]["entity_type"] == "Requirement"
    
    async def test_create_requirement_validation_error(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_requirement_service: AsyncMock,
    ):
        """Test requirement creation with validation errors"""
        mock_requirement_service.create_requirement.side_effect = ValueError("Title must be at least 5 characters long")
        
        requirement_data = {
            "title": "Bad",  # Too short
            "description": "Short desc",  # Too short
            "status": "draft",
            "type": "requirement"
        }
        
        response = await client.post(
            "/api/v1/requirements",
            json=requirement_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_detail = response.json()["detail"]
        assert isinstance(error_detail, list)
        assert any("Title must be at least 5 characters long" in str(error) for error in error_detail)
    
    async def test_create_requirement_validator_forbidden(
        self,
        client: AsyncClient,
        validator_headers: dict,
    ):
        """Test that validator users cannot create requirements"""
        requirement_data = {
            "title": "Test Requirement",
            "description": "This is a test requirement with sufficient length",
            "status": "draft",
            "type": "requirement"
        }
        
        response = await client.post(
            "/api/v1/requirements",
            json=requirement_data,
            headers=validator_headers
        )
        
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    async def test_get_requirement_by_id_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_requirement_service: AsyncMock,
        mock_audit_service: AsyncMock,
    ):
        """Test successful requirement retrieval by ID"""
        from app.schemas.workitem import RequirementResponse
        from datetime import datetime
        from uuid import uuid4
        
        requirement_id = uuid4()
        mock_requirement = RequirementResponse(
            id=requirement_id,
            type="requirement",
            title="Specific Test Requirement",
            description="This is a specific test requirement",
            status="active",
            priority=4,
            assigned_to=None,
            version="1.2",
            created_by=uuid4(),
            created_at=datetime.now(),
            updated_at=datetime.now(),
            is_signed=True,
            acceptance_criteria="Given specific conditions, when specific actions occur, then specific outcomes should result",
            business_value="Provides specific business value",
            source="regulation"
        )
        
        mock_requirement_service.get_requirement.return_value = mock_requirement
        
        response = await client.get(
            f"/api/v1/requirements/{requirement_id}",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["id"] == str(requirement_id)
        assert data["title"] == "Specific Test Requirement"
        assert data["version"] == "1.2"
        assert data["is_signed"] is True
        assert data["acceptance_criteria"] == "Given specific conditions, when specific actions occur, then specific outcomes should result"
        
        # Verify service was called with correct ID
        mock_requirement_service.get_requirement.assert_called_once_with(requirement_id)
        
        # Verify audit logging
        mock_audit_service.log.assert_called_once()
    
    async def test_get_requirement_by_id_not_found(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_requirement_service: AsyncMock,
    ):
        """Test requirement retrieval with non-existent ID"""
        requirement_id = uuid4()
        mock_requirement_service.get_requirement.return_value = None
        
        response = await client.get(
            f"/api/v1/requirements/{requirement_id}",
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert "not found" in response.json()["detail"]
    
    async def test_update_requirement_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_requirement_service: AsyncMock,
        mock_audit_service: AsyncMock,
    ):
        """Test successful requirement update"""
        from app.schemas.workitem import RequirementResponse
        from datetime import datetime
        from uuid import uuid4
        
        requirement_id = uuid4()
        updated_requirement = RequirementResponse(
            id=requirement_id,
            type="requirement",
            title="Updated Test Requirement",
            description="This is an updated test requirement with comprehensive details",
            status="active",
            priority=5,
            assigned_to=None,
            version="1.1",
            created_by=uuid4(),
            created_at=datetime.now(),
            updated_at=datetime.now(),
            is_signed=False,
            acceptance_criteria="Given updated conditions, when updated actions occur, then updated outcomes should result",
            business_value="Provides enhanced business value after updates",
            source="stakeholder"
        )
        
        mock_requirement_service.update_requirement.return_value = updated_requirement
        
        update_data = {
            "title": "Updated Test Requirement",
            "status": "active",
            "priority": 5,
            "acceptance_criteria": "Given updated conditions, when updated actions occur, then updated outcomes should result",
            "business_value": "Provides enhanced business value after updates"
        }
        
        response = await client.patch(
            f"/api/v1/requirements/{requirement_id}",
            json=update_data,
            params={"change_description": "Updated requirement for enhanced functionality"},
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["title"] == "Updated Test Requirement"
        assert data["status"] == "active"
        assert data["priority"] == 5
        assert data["version"] == "1.1"
        assert data["acceptance_criteria"] == "Given updated conditions, when updated actions occur, then updated outcomes should result"
        
        # Verify service was called
        mock_requirement_service.update_requirement.assert_called_once()
        
        # Verify audit logging
        mock_audit_service.log.assert_called_once()
    
    async def test_update_requirement_missing_change_description(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test requirement update without change description"""
        requirement_id = uuid4()
        update_data = {
            "title": "Updated Test Requirement",
            "status": "active"
        }
        
        response = await client.patch(
            f"/api/v1/requirements/{requirement_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    async def test_update_requirement_not_found(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_requirement_service: AsyncMock,
    ):
        """Test requirement update with non-existent ID"""
        requirement_id = uuid4()
        mock_requirement_service.update_requirement.return_value = None
        
        update_data = {
            "title": "Updated Test Requirement",
            "status": "active"
        }
        
        response = await client.patch(
            f"/api/v1/requirements/{requirement_id}",
            json=update_data,
            params={"change_description": "Update attempt"},
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    async def test_add_requirement_comment_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_requirement_service: AsyncMock,
        mock_audit_service: AsyncMock,
    ):
        """Test successful comment addition to requirement"""
        from app.schemas.workitem import CommentResponse
        from datetime import datetime
        from uuid import uuid4
        
        requirement_id = uuid4()
        comment_id = uuid4()
        user_id = uuid4()
        
        mock_comment = CommentResponse(
            id=comment_id,
            requirement_id=requirement_id,
            user_id=user_id,
            user_name="Test User",
            user_email="test@example.com",
            comment="This is a comprehensive test comment with detailed feedback",
            created_at=datetime.now(),
            updated_at=datetime.now(),
            version="1.0",
            is_edited=False,
            edit_count=0
        )
        
        mock_requirement_service.add_comment.return_value = mock_comment
        
        comment_data = {
            "comment": "This is a comprehensive test comment with detailed feedback"
        }
        
        response = await client.post(
            f"/api/v1/requirements/{requirement_id}/comments",
            json=comment_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        
        assert data["comment"] == comment_data["comment"]
        assert data["requirement_id"] == str(requirement_id)
        assert data["user_name"] == "Test User"
        assert data["is_edited"] is False
        assert data["edit_count"] == 0
        
        # Verify service was called
        mock_requirement_service.add_comment.assert_called_once()
        
        # Verify audit logging
        mock_audit_service.log.assert_called_once()
    
    async def test_add_requirement_comment_not_found(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_requirement_service: AsyncMock,
    ):
        """Test comment addition to non-existent requirement"""
        requirement_id = uuid4()
        mock_requirement_service.add_comment.side_effect = ValueError(f"Requirement {requirement_id} not found")
        
        comment_data = {
            "comment": "This is a test comment"
        }
        
        response = await client.post(
            f"/api/v1/requirements/{requirement_id}/comments",
            json=comment_data,
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    async def test_get_requirement_comments_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_requirement_service: AsyncMock,
        mock_audit_service: AsyncMock,
    ):
        """Test successful retrieval of requirement comments"""
        from app.schemas.workitem import CommentResponse, CommentListResponse
        from datetime import datetime
        from uuid import uuid4
        
        requirement_id = uuid4()
        
        mock_comments = [
            CommentResponse(
                id=uuid4(),
                requirement_id=requirement_id,
                user_id=uuid4(),
                user_name="User One",
                user_email="user1@example.com",
                comment="This is the first comprehensive comment with detailed analysis",
                created_at=datetime.now(),
                updated_at=datetime.now(),
                version="1.0",
                is_edited=False,
                edit_count=0
            ),
            CommentResponse(
                id=uuid4(),
                requirement_id=requirement_id,
                user_id=uuid4(),
                user_name="User Two",
                user_email="user2@example.com",
                comment="This is the second comprehensive comment with additional insights",
                created_at=datetime.now(),
                updated_at=datetime.now(),
                version="1.0",
                is_edited=True,
                edit_count=1
            )
        ]
        
        mock_comments_response = CommentListResponse(
            comments=mock_comments,
            total_count=2,
            page=1,
            page_size=20,
            has_next=False,
            has_previous=False
        )
        
        mock_requirement_service.get_requirement_comments.return_value = mock_comments_response
        
        response = await client.get(
            f"/api/v1/requirements/{requirement_id}/comments",
            params={
                "page": 1,
                "page_size": 20,
                "include_user_info": True
            },
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["total_count"] == 2
        assert data["page"] == 1
        assert data["page_size"] == 20
        assert data["has_next"] is False
        assert data["has_previous"] is False
        assert len(data["comments"]) == 2
        
        assert data["comments"][0]["comment"] == "This is the first comprehensive comment with detailed analysis"
        assert data["comments"][0]["user_name"] == "User One"
        assert data["comments"][0]["is_edited"] is False
        
        assert data["comments"][1]["comment"] == "This is the second comprehensive comment with additional insights"
        assert data["comments"][1]["user_name"] == "User Two"
        assert data["comments"][1]["is_edited"] is True
        assert data["comments"][1]["edit_count"] == 1
        
        # Verify service was called with correct parameters
        mock_requirement_service.get_requirement_comments.assert_called_once_with(
            requirement_id=requirement_id,
            page=1,
            page_size=20,
            include_user_info=True
        )
        
        # Verify audit logging
        mock_audit_service.log.assert_called_once()
    
    async def test_get_requirement_comments_pagination(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_requirement_service: AsyncMock,
    ):
        """Test requirement comments pagination parameters"""
        from app.schemas.workitem import CommentListResponse
        from uuid import uuid4
        
        requirement_id = uuid4()
        
        mock_comments_response = CommentListResponse(
            comments=[],
            total_count=0,
            page=2,
            page_size=10,
            has_next=False,
            has_previous=True
        )
        
        mock_requirement_service.get_requirement_comments.return_value = mock_comments_response
        
        response = await client.get(
            f"/api/v1/requirements/{requirement_id}/comments",
            params={
                "page": 2,
                "page_size": 10,
                "include_user_info": False
            },
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        
        assert data["page"] == 2
        assert data["page_size"] == 10
        assert data["has_previous"] is True
        
        # Verify service was called with correct pagination parameters
        mock_requirement_service.get_requirement_comments.assert_called_once_with(
            requirement_id=requirement_id,
            page=2,
            page_size=10,
            include_user_info=False
        )
    
    async def test_requirements_endpoint_error_handling(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_requirement_service: AsyncMock,
        mock_audit_service: AsyncMock,
    ):
        """Test error handling in requirements endpoints"""
        # Test service exception handling
        mock_requirement_service.search_requirements.side_effect = Exception("Database connection error")
        
        response = await client.get(
            "/api/v1/requirements",
            headers=auth_headers
        )
        
        assert response.status_code == 500
        assert "try again later" in response.json()["detail"]
        
        # Verify error was logged
        mock_audit_service.log.assert_called_once()
        audit_call = mock_audit_service.log.call_args
        assert audit_call[1]["action"] == "ERROR"
    
    async def test_requirements_filtering_edge_cases(
        self,
        client: AsyncClient,
        auth_headers: dict,
        mock_requirement_service: AsyncMock,
    ):
        """Test edge cases in requirements filtering"""
        mock_requirement_service.search_requirements.return_value = []
        
        # Test with maximum limit
        response = await client.get(
            "/api/v1/requirements",
            params={"limit": 1000},
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Test with invalid limit (should be handled by FastAPI validation)
        response = await client.get(
            "/api/v1/requirements",
            params={"limit": 1001},
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Test with invalid priority (should be handled by FastAPI validation)
        response = await client.get(
            "/api/v1/requirements",
            params={"priority": 6},
            headers=auth_headers
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
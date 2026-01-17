"""Integration tests for authentication API endpoints"""

import asyncio
import pytest
import pytest_asyncio
from fastapi import status
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import settings
from app.db.session import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.services.auth_service import AuthService


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
async def client(test_engine):
    """Create test client with database override"""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async def override_get_db():
        async with async_session() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
    
    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    # Clean up override
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession):
    """Create a test user"""
    auth_service = AuthService(db_session)
    user = await auth_service.create_user(
        email="test@example.com",
        password="TestPassword123!",
        full_name="Test User",
        role=UserRole.USER.value,
    )
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession):
    """Create a test admin user"""
@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession):
    """Create a test admin user"""
    auth_service = AuthService(db_session)
    admin = await auth_service.create_user(
        email="admin@example.com",
        password="AdminPassword123!",
        full_name="Admin User",
        role=UserRole.ADMIN.value,
    )
    await db_session.commit()
    await db_session.refresh(admin)
    return admin


@pytest.mark.asyncio
class TestLoginEndpoint:
    """Tests for POST /api/v1/auth/login"""
    
    async def test_login_success(self, client: AsyncClient, test_user: User):
        """Test successful login with valid credentials"""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["expires_in"] == settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    
    async def test_login_invalid_email(self, client: AsyncClient):
        """Test login with non-existent email"""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "SomePassword123!",
            },
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Incorrect email or password" in response.json()["detail"]
    
    async def test_login_invalid_password(self, client: AsyncClient, test_user: User):
        """Test login with incorrect password"""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "WrongPassword123!",
            },
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        assert "Incorrect email or password" in response.json()["detail"]
    
    async def test_login_account_locking(self, client: AsyncClient, test_user: User):
        """Test account locking after 3 failed login attempts"""
        # Attempt 1
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "WrongPassword1!",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Attempt 2
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "WrongPassword2!",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Attempt 3 - should lock account
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "WrongPassword3!",
            },
        )
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Attempt 4 - should return locked status
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",  # Even with correct password
            },
        )
        assert response.status_code == status.HTTP_423_LOCKED
        assert "locked" in response.json()["detail"].lower()
    
    async def test_login_invalid_email_format(self, client: AsyncClient):
        """Test login with invalid email format"""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "not-an-email",
                "password": "SomePassword123!",
            },
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
class TestRefreshEndpoint:
    """Tests for POST /api/v1/auth/refresh"""
    
    async def test_refresh_token_success(self, client: AsyncClient, test_user: User):
        """Test successful token refresh"""
        # First login to get token
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        token = login_response.json()["access_token"]
        
        # Wait a moment to ensure different timestamp
        await asyncio.sleep(1)
        
        # Refresh token
        response = await client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": f"Bearer {token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        # Token should be different due to different iat timestamp
        assert data["access_token"] != token
    
    async def test_refresh_token_unauthorized(self, client: AsyncClient):
        """Test token refresh without authentication"""
        response = await client.post("/api/v1/auth/refresh")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    async def test_refresh_token_invalid_token(self, client: AsyncClient):
        """Test token refresh with invalid token"""
        response = await client.post(
            "/api/v1/auth/refresh",
            headers={"Authorization": "Bearer invalid-token"},
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
class TestLogoutEndpoint:
    """Tests for POST /api/v1/auth/logout"""
    
    async def test_logout_success(self, client: AsyncClient, test_user: User):
        """Test successful logout"""
        # First login to get token
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        token = login_response.json()["access_token"]
        
        # Logout
        response = await client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {token}"},
        )
        
        assert response.status_code == status.HTTP_204_NO_CONTENT
    
    async def test_logout_unauthorized(self, client: AsyncClient):
        """Test logout without authentication"""
        response = await client.post("/api/v1/auth/logout")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.asyncio
class TestGetCurrentUserEndpoint:
    """Tests for GET /api/v1/auth/me"""
    
    async def test_get_current_user_success(self, client: AsyncClient, test_user: User):
        """Test getting current user information"""
        # First login to get token
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "test@example.com",
                "password": "TestPassword123!",
            },
        )
        token = login_response.json()["access_token"]
        
        # Get current user
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["full_name"] == "Test User"
        assert data["role"] == UserRole.USER.value
        assert data["is_active"] is True
        assert "id" in data
    
    async def test_get_current_user_admin(self, client: AsyncClient, test_admin: User):
        """Test getting admin user information"""
        # First login to get token
        login_response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "admin@example.com",
                "password": "AdminPassword123!",
            },
        )
        token = login_response.json()["access_token"]
        
        # Get current user
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["email"] == "admin@example.com"
        assert data["role"] == UserRole.ADMIN.value
    
    async def test_get_current_user_unauthorized(self, client: AsyncClient):
        """Test getting current user without authentication"""
        response = await client.get("/api/v1/auth/me")
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    async def test_get_current_user_invalid_token(self, client: AsyncClient):
        """Test getting current user with invalid token"""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid-token"},
        )
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

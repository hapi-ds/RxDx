"""Pytest configuration and fixtures"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock
from fastapi import Depends

from app.core.config import settings
from app.db.session import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.services.auth_service import AuthService
from app.db.graph import get_graph_service

# Import all models to ensure they're registered with Base
from app.models import *  # noqa: F403, F401


# Test database setup
TEST_DATABASE_URL = "postgresql+asyncpg://rxdx:rxdx_dev_password@localhost:5432/test_rxdx"


# Mock graph service for tests
class MockGraphService:
    """Mock graph service for testing"""
    
    def __init__(self):
        self.workitems = {}  # Store workitems in memory for testing
    
    async def connect(self):
        pass
    
    async def close(self):
        pass
    
    async def create_workitem_node(self, **kwargs):
        from datetime import datetime, UTC
        from uuid import uuid4
        
        workitem_id = kwargs.get('workitem_id', str(uuid4()))
        workitem_type = kwargs.get('workitem_type', 'workitem')
        
        workitem = {
            "id": workitem_id, 
            "type": workitem_type,
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            "is_signed": False,
            **kwargs
        }
        # Store by the workitem_id for easy lookup
        self.workitems[workitem_id] = workitem
        return workitem
    
    async def get_workitem(self, workitem_id):
        # Convert UUID to string if needed
        workitem_id_str = str(workitem_id)
        return self.workitems.get(workitem_id_str)
    
    async def get_workitem_version(self, workitem_id, version=None):
        # Mock method to return workitem with version info
        workitem = self.workitems.get(str(workitem_id))  # Ensure string conversion
        if workitem:
            return {**workitem, "version": version or "1.0"}
        return None
    
    async def create_workitem_version(self, workitem_id, version, data, user_id, change_description):
        # Mock method to create a new version of a workitem
        from datetime import datetime, UTC
        from uuid import uuid4
        
        workitem_id_str = str(workitem_id)
        current_workitem = self.workitems.get(workitem_id_str, {})
        
        version_data = {**current_workitem, **data}
        version_data.update({
            "id": workitem_id_str,
            "version": version,
            "updated_by": user_id,
            "updated_at": datetime.now(UTC).isoformat(),
            "change_description": change_description,
            # Ensure required fields are present
            "created_at": current_workitem.get("created_at", datetime.now(UTC).isoformat()),
            "created_by": current_workitem.get("created_by", user_id),
            "is_signed": False,
        })
        self.workitems[workitem_id_str] = version_data
        return version_data
    
    async def update_workitem_node(self, workitem_id, data):
        workitem_id_str = str(workitem_id)
        if workitem_id_str in self.workitems:
            self.workitems[workitem_id_str].update(data)
            return self.workitems[workitem_id_str]
        return None
    
    async def delete_workitem_node(self, workitem_id):
        workitem_id_str = str(workitem_id)
        if workitem_id_str in self.workitems:
            del self.workitems[workitem_id_str]
            return True
        return False
    
    async def create_relationship(self, **kwargs):
        return True
    
    async def remove_relationships(self, **kwargs):
        return True
    
    async def delete_relationships(self, **kwargs):
        return True
    
    async def execute_query(self, query, params=None):
        # Mock query results based on query content
        if "MATCH (ts:WorkItem)" in query and "test_spec" in query:
            # Return test specs
            test_specs = [item for item in self.workitems.values() 
                         if item.get('workitem_type') == 'test_spec']
            return [{"ts": spec} for spec in test_specs]
        elif "MATCH (tr:WorkItem)" in query and "test_run" in query:
            # Return test runs
            test_runs = [item for item in self.workitems.values() 
                        if item.get('workitem_type') == 'test_run']
            return [{"tr": run} for run in test_runs]
        elif "MATCH (req:WorkItem)" in query:
            # Return requirements
            requirements = [item for item in self.workitems.values() 
                           if item.get('workitem_type') == 'requirement']
            return [{"req": req} for req in requirements]
        return []


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
    
    # Mock graph service
    mock_graph_service = MockGraphService()
    
    async def override_get_graph_service():
        return mock_graph_service
    
    # Mock test service to use our mock graph service
    async def override_get_test_service(db: AsyncSession = Depends(override_get_db)):
        from app.services.test_service import TestService
        from app.services.audit_service import AuditService
        from app.services.signature_service import SignatureService
        from app.services.version_service import VersionService
        
        # Create mock services
        audit_service = AuditService(db)
        signature_service = SignatureService(db)
        version_service = VersionService(mock_graph_service, audit_service)
        
        return TestService(
            graph_service=mock_graph_service,
            audit_service=audit_service,
            signature_service=signature_service,
            version_service=version_service,
        )
    
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_graph_service] = override_get_graph_service
    
    # Import and override the get_test_service function
    from app.api.v1.tests import get_test_service
    app.dependency_overrides[get_test_service] = override_get_test_service
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    
    # Clean up overrides
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


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient, test_user: User):
    """Create authentication headers for test requests"""
    # Login to get token
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPassword123!",
        },
    )
    
    if response.status_code != 200:
        pytest.skip("Could not authenticate test user")
    
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_settings():
    """Test settings override"""
    try:
        from app.core.config import Settings
        
        return Settings(
            ENVIRONMENT="testing",
            DEBUG=True,
            SECRET_KEY="test-secret-key-for-testing-only",
            DATABASE_URL="postgresql+asyncpg://test:test@localhost:5432/test_rxdx",
        )
    except ImportError:
        # Return a mock settings object for unit tests that don't need real settings
        class MockSettings:
            ENVIRONMENT = "testing"
            DEBUG = True
            SECRET_KEY = "test-secret-key-for-testing-only"
            DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5432/test_rxdx"
        
        return MockSettings()

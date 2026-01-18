"""Integration tests for audit API endpoints"""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from uuid import uuid4
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.config import settings
from app.db.session import Base, get_db
from app.main import app
from app.models.user import User, UserRole
from app.models.audit import AuditLog
from app.services.auth_service import AuthService
from app.services.audit_service import AuditService


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


@pytest.mark.asyncio
class TestAuditEndpoints:
    """Test suite for audit API endpoints"""

    @pytest_asyncio.fixture
    async def admin_user(self, db_session: AsyncSession) -> User:
        """Create an admin user for testing"""
        auth_service = AuthService(db_session)
        user = await auth_service.create_user(
            email="admin@test.com",
            password="testpass123",
            full_name="Admin User",
            role=UserRole.ADMIN.value
        )
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest_asyncio.fixture
    async def auditor_user(self, db_session: AsyncSession) -> User:
        """Create an auditor user for testing"""
        auth_service = AuthService(db_session)
        user = await auth_service.create_user(
            email="auditor@test.com",
            password="testpass123",
            full_name="Auditor User",
            role=UserRole.AUDITOR.value
        )
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest_asyncio.fixture
    async def regular_user(self, db_session: AsyncSession) -> User:
        """Create a regular user for testing"""
        auth_service = AuthService(db_session)
        user = await auth_service.create_user(
            email="user@test.com",
            password="testpass123",
            full_name="Regular User",
            role=UserRole.USER.value
        )
        await db_session.commit()
        await db_session.refresh(user)
        return user

    @pytest_asyncio.fixture
    async def admin_token(self, admin_user: User) -> str:
        """Get JWT token for admin user"""
        auth_service = AuthService(None)  # No DB needed for token creation
        return auth_service.create_token_for_user(admin_user)

    @pytest_asyncio.fixture
    async def auditor_token(self, auditor_user: User) -> str:
        """Get JWT token for auditor user"""
        auth_service = AuthService(None)
        return auth_service.create_token_for_user(auditor_user)

    @pytest_asyncio.fixture
    async def regular_token(self, regular_user: User) -> str:
        """Get JWT token for regular user"""
        auth_service = AuthService(None)
        return auth_service.create_token_for_user(regular_user)

    @pytest_asyncio.fixture
    async def sample_audit_logs(self, db_session: AsyncSession, admin_user: User, regular_user: User) -> list[AuditLog]:
        """Create sample audit logs for testing"""
        audit_service = AuditService(db_session)
        
        logs = []
        
        # Create various types of audit logs
        logs.append(await audit_service.log(
            action="CREATE",
            entity_type="WorkItem",
            user_id=admin_user.id,
            entity_id=uuid4(),
            details={"title": "Test Requirement"}
        ))
        
        logs.append(await audit_service.log(
            action="UPDATE",
            entity_type="WorkItem",
            user_id=regular_user.id,
            entity_id=uuid4(),
            details={"changes": {"status": "completed"}}
        ))
        
        logs.append(await audit_service.log(
            action="SIGN",
            entity_type="DigitalSignature",
            user_id=admin_user.id,
            entity_id=uuid4(),
            details={"workitem_id": str(uuid4())}
        ))
        
        logs.append(await audit_service.log_auth_attempt(
            email="test@example.com",
            success=True,
            user_id=regular_user.id,
            ip_address="192.168.1.100"
        ))
        
        return logs

    async def test_get_audit_logs_admin_access(
        self, 
        client: AsyncClient, 
        admin_token: str, 
        sample_audit_logs: list[AuditLog]
    ):
        """Test that admin users can access audit logs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = await client.get("/api/v1/audit", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= len(sample_audit_logs)  # May include logs from test setup
        
        # Check that audit logs have expected structure
        if data:
            log = data[0]
            assert "id" in log
            assert "action" in log
            assert "entity_type" in log
            assert "timestamp" in log

    async def test_get_audit_logs_auditor_access(
        self, 
        client: AsyncClient, 
        auditor_token: str, 
        sample_audit_logs: list[AuditLog]
    ):
        """Test that auditor users can access audit logs"""
        headers = {"Authorization": f"Bearer {auditor_token}"}
        
        response = await client.get("/api/v1/audit", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    async def test_get_audit_logs_regular_user_denied(
        self, 
        client: AsyncClient, 
        regular_token: str
    ):
        """Test that regular users cannot access audit logs"""
        headers = {"Authorization": f"Bearer {regular_token}"}
        
        response = await client.get("/api/v1/audit", headers=headers)
        
        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]

    async def test_get_audit_logs_unauthenticated(self, client: AsyncClient):
        """Test that unauthenticated requests are rejected"""
        response = await client.get("/api/v1/audit")
        
        assert response.status_code == 401

    async def test_get_audit_logs_with_filters(
        self, 
        client: AsyncClient, 
        admin_token: str, 
        sample_audit_logs: list[AuditLog],
        admin_user: User
    ):
        """Test audit log filtering functionality"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test filter by action
        response = await client.get(
            "/api/v1/audit",
            headers=headers,
            params={"action": "CREATE"}
        )
        assert response.status_code == 200
        data = response.json()
        for log in data:
            assert log["action"] == "CREATE"
        
        # Test filter by entity_type
        response = await client.get(
            "/api/v1/audit",
            headers=headers,
            params={"entity_type": "WorkItem"}
        )
        assert response.status_code == 200
        data = response.json()
        for log in data:
            assert log["entity_type"] == "WorkItem"
        
        # Test filter by user_id
        response = await client.get(
            "/api/v1/audit",
            headers=headers,
            params={"user_id": str(admin_user.id)}
        )
        assert response.status_code == 200
        data = response.json()
        for log in data:
            if log["user_id"]:  # Some logs might not have user_id
                assert log["user_id"] == str(admin_user.id)

    async def test_get_audit_logs_with_date_filters(
        self, 
        client: AsyncClient, 
        admin_token: str
    ):
        """Test audit log date filtering"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test with date range
        start_date = (datetime.utcnow() - timedelta(days=1)).isoformat() + "Z"
        end_date = datetime.utcnow().isoformat() + "Z"
        
        response = await client.get(
            "/api/v1/audit",
            headers=headers,
            params={
                "start_date": start_date,
                "end_date": end_date
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify all logs are within date range
        for log in data:
            log_time = datetime.fromisoformat(log["timestamp"].replace("Z", "+00:00"))
            assert log_time >= datetime.fromisoformat(start_date.replace("Z", "+00:00"))
            assert log_time <= datetime.fromisoformat(end_date.replace("Z", "+00:00"))

    async def test_get_audit_logs_invalid_date_format(
        self, 
        client: AsyncClient, 
        admin_token: str
    ):
        """Test handling of invalid date formats"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = await client.get(
            "/api/v1/audit",
            headers=headers,
            params={"start_date": "invalid-date"}
        )
        assert response.status_code == 400
        assert "Invalid start_date format" in response.json()["detail"]

    async def test_get_audit_logs_pagination(
        self, 
        client: AsyncClient, 
        admin_token: str, 
        sample_audit_logs: list[AuditLog]
    ):
        """Test audit log pagination"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test with limit
        response = await client.get(
            "/api/v1/audit",
            headers=headers,
            params={"limit": 2}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 2
        
        # Test with offset
        response = await client.get(
            "/api/v1/audit",
            headers=headers,
            params={"limit": 1, "offset": 1}
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 1

    async def test_get_audit_log_count(
        self, 
        client: AsyncClient, 
        admin_token: str, 
        sample_audit_logs: list[AuditLog]
    ):
        """Test audit log count endpoint"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = await client.get("/api/v1/audit/count", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "total_count" in data
        assert isinstance(data["total_count"], int)
        assert data["total_count"] >= len(sample_audit_logs)

    async def test_get_audit_log_count_with_filters(
        self, 
        client: AsyncClient, 
        admin_token: str, 
        sample_audit_logs: list[AuditLog]
    ):
        """Test audit log count with filters"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = await client.get(
            "/api/v1/audit/count",
            headers=headers,
            params={"action": "CREATE"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "total_count" in data
        assert isinstance(data["total_count"], int)

    async def test_export_audit_logs_json(
        self, 
        client: AsyncClient, 
        admin_token: str, 
        sample_audit_logs: list[AuditLog]
    ):
        """Test audit log export in JSON format"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = await client.get(
            "/api/v1/audit/export",
            headers=headers,
            params={"format": "json"}
        )
        
        assert response.status_code == 200, f"Response: {response.status_code} - {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # Check structure of exported data
        if data:
            log = data[0]
            assert "id" in log
            assert "action" in log
            assert "entity_type" in log
            assert "timestamp" in log

    async def test_export_audit_logs_csv(
        self, 
        client: AsyncClient, 
        admin_token: str, 
        sample_audit_logs: list[AuditLog]
    ):
        """Test audit log export in CSV format"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = await client.get(
            "/api/v1/audit/export",
            headers=headers,
            params={"format": "csv"}
        )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert "attachment" in response.headers.get("content-disposition", "")
        
        # Check CSV content structure
        csv_content = response.json()  # FastAPI returns CSV as JSON string
        assert isinstance(csv_content, str)
        if csv_content.strip():  # If there's content
            lines = csv_content.strip().split('\n')
            assert len(lines) >= 1  # At least header
            # Check header contains expected columns
            header = lines[0]
            assert "id" in header
            assert "action" in header
            assert "timestamp" in header

    async def test_export_audit_logs_invalid_format(
        self, 
        client: AsyncClient, 
        admin_token: str
    ):
        """Test export with invalid format"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = await client.get(
            "/api/v1/audit/export",
            headers=headers,
            params={"format": "xml"}  # Invalid format
        )
        
        assert response.status_code == 422  # Validation error

    async def test_export_audit_logs_regular_user_denied(
        self, 
        client: AsyncClient, 
        regular_token: str
    ):
        """Test that regular users cannot export audit logs"""
        headers = {"Authorization": f"Bearer {regular_token}"}
        
        response = await client.get("/api/v1/audit/export", headers=headers)
        
        assert response.status_code == 403
        assert "Insufficient permissions" in response.json()["detail"]

    async def test_audit_operations_are_logged(
        self, 
        client: AsyncClient, 
        admin_token: str, 
        db_session: AsyncSession
    ):
        """Test that audit operations themselves are logged"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Perform an audit query
        response = await client.get("/api/v1/audit", headers=headers)
        assert response.status_code == 200
        
        # Check that the audit query was logged
        audit_service = AuditService(db_session)
        from app.schemas.audit import AuditLogFilter
        
        filters = AuditLogFilter(
            user_id=None,
            action="READ",
            entity_type="AuditLog",
            entity_id=None,
            start_date=datetime.utcnow() - timedelta(minutes=1),
            end_date=None,
            limit=10,
            offset=0
        )
        
        recent_logs = await audit_service.get_audit_logs(filters)
        
        # Should find at least one READ operation on AuditLog
        read_operations = [log for log in recent_logs if log.action == "READ" and log.entity_type == "AuditLog"]
        assert len(read_operations) >= 1

    async def test_cleanup_audit_logs_admin_only(
        self, 
        client: AsyncClient, 
        admin_token: str,
        auditor_token: str
    ):
        """Test that only admin users can cleanup audit logs"""
        # Test admin access
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = await client.post(
            "/api/v1/audit/cleanup",
            headers=headers,
            params={"retention_days": 1}  # Very short retention for testing
        )
        assert response.status_code == 200
        data = response.json()
        assert "deleted_count" in data
        assert "retention_days" in data
        assert data["retention_days"] == 1
        
        # Test auditor user denied (has audit permission but not admin)
        headers = {"Authorization": f"Bearer {auditor_token}"}
        response = await client.post(
            "/api/v1/audit/cleanup",
            headers=headers,
            params={"retention_days": 1}
        )
        assert response.status_code == 403
        assert "Only administrators" in response.json()["detail"]

    async def test_cleanup_audit_logs_validation(
        self, 
        client: AsyncClient, 
        admin_token: str
    ):
        """Test cleanup validation"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test invalid retention days (too low)
        response = await client.post(
            "/api/v1/audit/cleanup",
            headers=headers,
            params={"retention_days": 0}
        )
        assert response.status_code == 422  # Validation error
        
        # Test invalid retention days (too high)
        response = await client.post(
            "/api/v1/audit/cleanup",
            headers=headers,
            params={"retention_days": 10000}
        )
        assert response.status_code == 422  # Validation error
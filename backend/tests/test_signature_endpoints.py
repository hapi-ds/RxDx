"""Integration tests for signature API endpoints"""

import base64
from uuid import uuid4

import pytest
import pytest_asyncio
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.db.session import Base, get_db
from app.main import app
from app.models.signature import DigitalSignature
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
async def auth_headers(client: AsyncClient, test_user: User):
    """Get authentication headers for test user"""
    response = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "test@example.com",
            "password": "TestPassword123!",
        },
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def test_keypair():
    """Generate RSA key pair for testing"""
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
    )
    public_key = private_key.public_key()

    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )

    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    return {
        "private_key": private_key,
        "public_key": public_key,
        "private_pem": private_pem,
        "public_pem": public_pem,
    }


@pytest.fixture
def sample_workitem():
    """Sample WorkItem content for testing"""
    return {
        "id": str(uuid4()),
        "title": "Test Requirement",
        "description": "This is a test requirement for signature testing",
        "type": "requirement",
        "version": "1.0",
        "status": "active",
        "priority": 1,
    }


@pytest_asyncio.fixture
async def test_signature(
    db_session: AsyncSession,
    test_user: User,
    test_keypair: dict,
    sample_workitem: dict,
) -> DigitalSignature:
    """Create a test signature for testing"""
    from app.services.signature_service import SignatureService

    signature_service = SignatureService(db_session)

    signature = await signature_service.sign_workitem(
        workitem_id=sample_workitem["id"],
        workitem_version=sample_workitem["version"],
        workitem_content=sample_workitem,
        user=test_user,
        private_key_pem=test_keypair["private_pem"],
    )

    return signature


@pytest.mark.asyncio
class TestSignatureEndpoints:
    """Test suite for digital signature API endpoints"""

    async def test_create_signature_success(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        test_keypair: dict,
        sample_workitem: dict,
    ):
        """Test successful signature creation"""
        # Prepare request data
        private_key_b64 = base64.b64encode(test_keypair["private_pem"]).decode()

        request_data = {
            "workitem_id": sample_workitem["id"],
            "workitem_version": sample_workitem["version"],
            "workitem_content": sample_workitem,
            "private_key_pem": private_key_b64,
        }

        # Create signature
        response = await client.post(
            "/api/v1/signatures",
            json=request_data,
            headers=auth_headers,
        )

        assert response.status_code == 201
        signature_data = response.json()

        # Verify response structure
        assert "id" in signature_data
        assert signature_data["workitem_id"] == sample_workitem["id"]
        assert signature_data["workitem_version"] == sample_workitem["version"]
        assert signature_data["user_id"] == str(test_user.id)
        assert signature_data["is_valid"] is True
        assert "signed_at" in signature_data
        assert "signature_hash" in signature_data
        assert "content_hash" in signature_data

    async def test_create_signature_invalid_private_key(
        self,
        client: AsyncClient,
        auth_headers: dict,
        sample_workitem: dict,
    ):
        """Test signature creation with invalid private key"""
        request_data = {
            "workitem_id": sample_workitem["id"],
            "workitem_version": sample_workitem["version"],
            "workitem_content": sample_workitem,
            "private_key_pem": "invalid_key",
        }

        response = await client.post(
            "/api/v1/signatures",
            json=request_data,
            headers=auth_headers,
        )

        assert response.status_code == 400
        assert "Failed to create signature" in response.json()["detail"]

    async def test_get_signature_success(
        self,
        client: AsyncClient,
        test_user: User,
        auth_headers: dict,
        test_signature: DigitalSignature,
    ):
        """Test successful signature retrieval"""
        response = await client.get(
            f"/api/v1/signatures/{test_signature.id}",
            headers=auth_headers,
        )

        assert response.status_code == 200
        signature_data = response.json()

        assert signature_data["id"] == str(test_signature.id)
        assert signature_data["workitem_id"] == str(test_signature.workitem_id)
        assert signature_data["user_id"] == str(test_signature.user_id)

    async def test_get_signature_not_found(
        self,
        client: AsyncClient,
        auth_headers: dict,
    ):
        """Test signature retrieval with non-existent ID"""
        non_existent_id = uuid4()

        response = await client.get(
            f"/api/v1/signatures/{non_existent_id}",
            headers=auth_headers,
        )

        assert response.status_code == 404
        assert response.json()["detail"] == "Signature not found"

    async def test_get_workitem_signatures_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_signature: DigitalSignature,
    ):
        """Test successful WorkItem signatures retrieval"""
        response = await client.get(
            f"/api/v1/workitems/{test_signature.workitem_id}/signatures",
            headers=auth_headers,
        )

        assert response.status_code == 200
        signatures = response.json()

        assert isinstance(signatures, list)
        assert len(signatures) >= 1

        # Find our test signature
        test_sig = next(
            (sig for sig in signatures if sig["id"] == str(test_signature.id)),
            None,
        )
        assert test_sig is not None
        assert test_sig["workitem_id"] == str(test_signature.workitem_id)

    async def test_verify_signature_success(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_signature: DigitalSignature,
        test_keypair: dict,
        sample_workitem: dict,
    ):
        """Test successful signature verification"""
        public_key_b64 = base64.b64encode(test_keypair["public_pem"]).decode()

        request_data = {
            "current_workitem_content": sample_workitem,
            "public_key_pem": public_key_b64,
        }

        response = await client.post(
            f"/api/v1/signatures/{test_signature.id}/verify",
            json=request_data,
            headers=auth_headers,
        )

        assert response.status_code == 200
        verification_data = response.json()

        assert verification_data["signature_id"] == str(test_signature.id)
        assert "is_valid" in verification_data
        assert "verification_timestamp" in verification_data
        assert "content_matches" in verification_data
        assert "signature_intact" in verification_data

    async def test_signature_endpoints_require_authentication(
        self,
        client: AsyncClient,
        sample_workitem: dict,
    ):
        """Test that signature endpoints require authentication"""
        # Test create signature without auth
        response = await client.post(
            "/api/v1/signatures",
            json={
                "workitem_id": sample_workitem["id"],
                "workitem_version": "1.0",
                "workitem_content": sample_workitem,
                "private_key_pem": "test_key",
            },
        )
        assert response.status_code == 401

        # Test get signature without auth
        test_id = uuid4()
        response = await client.get(f"/api/v1/signatures/{test_id}")
        assert response.status_code == 401

        # Test get workitem signatures without auth
        response = await client.get(f"/api/v1/workitems/{test_id}/signatures")
        assert response.status_code == 401

        # Test verify signature without auth
        response = await client.post(
            f"/api/v1/signatures/{test_id}/verify",
            json={
                "current_workitem_content": sample_workitem,
                "public_key_pem": "test_key",
            },
        )
        assert response.status_code == 401

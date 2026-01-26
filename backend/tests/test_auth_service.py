"""Unit tests for AuthService"""

from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole
from app.services.auth_service import AccountLockedException, AuthService


@pytest.fixture
def mock_db():
    """Create a mock database session"""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def auth_service(mock_db):
    """Create an AuthService instance with mock database"""
    return AuthService(mock_db)


@pytest.fixture
def sample_user():
    """Create a sample user for testing"""
    # Use a pre-hashed password (Argon2id hash for "SecurePass123")
    return User(
        email="test@example.com",
        hashed_password="$argon2id$v=19$m=65536,t=3,p=4$knLuvbcWQghB6P2/9x6DkA$PtkIsFq1F1bvAx3qjITpjjAtx0/1mBhGzDEXICWCehU",
        full_name="Test User",
        role=UserRole.USER,
        is_active=True,
        failed_login_attempts=0,
        locked_until=None,
    )


class TestPasswordHashing:
    """Test password hashing and verification"""

    def test_password_hashing(self):
        """Test that password hashing works correctly"""
        password = "SecurePass123"
        hashed = get_password_hash(password)

        assert hashed != password
        assert len(hashed) > 0
        assert verify_password(password, hashed)

    def test_password_verification_fails_wrong_password(self):
        """Test that password verification fails with wrong password"""
        password = "SecurePass123"
        wrong_password = "WrongPass456"
        hashed = get_password_hash(password)

        assert not verify_password(wrong_password, hashed)

    def test_different_hashes_for_same_password(self):
        """Test that same password produces different hashes (salt)"""
        password = "SecurePass123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        assert hash1 != hash2
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)


class TestAuthServiceUserRetrieval:
    """Test user retrieval methods"""

    @pytest.mark.asyncio
    async def test_get_user_by_email_found(self, auth_service, mock_db, sample_user):
        """Test retrieving user by email when user exists"""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_db.execute.return_value = mock_result

        user = await auth_service.get_user_by_email("test@example.com")

        assert user == sample_user
        assert user.email == "test@example.com"

    @pytest.mark.asyncio
    async def test_get_user_by_email_not_found(self, auth_service, mock_db):
        """Test retrieving user by email when user doesn't exist"""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        user = await auth_service.get_user_by_email("nonexistent@example.com")

        assert user is None

    @pytest.mark.asyncio
    async def test_get_user_by_id_found(self, auth_service, mock_db, sample_user):
        """Test retrieving user by ID when user exists"""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_db.execute.return_value = mock_result

        user = await auth_service.get_user_by_id(sample_user.id)

        assert user == sample_user


class TestAuthServiceAuthentication:
    """Test user authentication"""

    @pytest.mark.asyncio
    async def test_authenticate_user_success(self, auth_service, mock_db, sample_user):
        """Test successful user authentication"""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_db.execute.return_value = mock_result

        user = await auth_service.authenticate_user("test@example.com", "SecurePass123")

        assert user == sample_user
        assert user.failed_login_attempts == 0

    @pytest.mark.asyncio
    async def test_authenticate_user_wrong_password(self, auth_service, mock_db, sample_user):
        """Test authentication with wrong password"""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_db.execute.return_value = mock_result

        user = await auth_service.authenticate_user("test@example.com", "WrongPass456")

        assert user is None
        assert sample_user.failed_login_attempts == 1

    @pytest.mark.asyncio
    async def test_authenticate_user_not_found(self, auth_service, mock_db):
        """Test authentication with non-existent user"""
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        user = await auth_service.authenticate_user("nonexistent@example.com", "SecurePass123")

        assert user is None

    @pytest.mark.asyncio
    async def test_authenticate_inactive_user(self, auth_service, mock_db, sample_user):
        """Test authentication with inactive user"""
        sample_user.is_active = False
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_db.execute.return_value = mock_result

        user = await auth_service.authenticate_user("test@example.com", "SecurePass123")

        assert user is None


class TestAccountLocking:
    """Test account locking after failed attempts"""

    @pytest.mark.asyncio
    async def test_increment_failed_attempts(self, auth_service, mock_db, sample_user):
        """Test incrementing failed login attempts"""
        await auth_service.increment_failed_attempts(sample_user)

        assert sample_user.failed_login_attempts == 1
        assert sample_user.locked_until is None

    @pytest.mark.asyncio
    async def test_account_locked_after_three_attempts(self, auth_service, mock_db, sample_user):
        """Test account is locked after 3 failed attempts"""
        sample_user.failed_login_attempts = 2

        await auth_service.increment_failed_attempts(sample_user)

        assert sample_user.failed_login_attempts == 3
        assert sample_user.locked_until is not None
        assert sample_user.locked_until > datetime.now(UTC)

    @pytest.mark.asyncio
    async def test_authenticate_locked_account(self, auth_service, mock_db, sample_user):
        """Test authentication fails for locked account"""
        sample_user.locked_until = datetime.now(UTC) + timedelta(hours=1)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_db.execute.return_value = mock_result

        with pytest.raises(AccountLockedException) as exc_info:
            await auth_service.authenticate_user("test@example.com", "SecurePass123")

        assert "locked until" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_authenticate_expired_lock(self, auth_service, mock_db, sample_user):
        """Test authentication succeeds after lock expires"""
        # Set lock to expired time
        sample_user.locked_until = datetime.now(UTC) - timedelta(minutes=1)
        sample_user.failed_login_attempts = 3
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = sample_user
        mock_db.execute.return_value = mock_result

        user = await auth_service.authenticate_user("test@example.com", "SecurePass123")

        assert user == sample_user
        assert sample_user.failed_login_attempts == 0
        assert sample_user.locked_until is None

    @pytest.mark.asyncio
    async def test_reset_failed_attempts(self, auth_service, mock_db, sample_user):
        """Test resetting failed login attempts"""
        sample_user.failed_login_attempts = 2

        await auth_service.reset_failed_attempts(sample_user)

        assert sample_user.failed_login_attempts == 0
        assert sample_user.locked_until is None


class TestTokenGeneration:
    """Test JWT token generation"""

    def test_create_token_for_user(self, auth_service, sample_user):
        """Test creating JWT token for user"""
        token = auth_service.create_token_for_user(sample_user)

        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0

    def test_token_contains_user_data(self, auth_service, sample_user):
        """Test that token contains user data"""
        from app.core.security import decode_access_token

        token = auth_service.create_token_for_user(sample_user)
        payload = decode_access_token(token)

        assert payload is not None
        assert payload["sub"] == str(sample_user.id)
        assert payload["email"] == sample_user.email
        assert payload["role"] == sample_user.role.value

    def test_token_has_expiration(self, auth_service, sample_user):
        """Test that token has expiration time"""
        from app.core.security import decode_access_token

        token = auth_service.create_token_for_user(sample_user)
        payload = decode_access_token(token)

        assert "exp" in payload
        assert "iat" in payload


class TestPasswordManagement:
    """Test password change and reset"""

    @pytest.mark.asyncio
    async def test_change_password_success(self, auth_service, mock_db, sample_user):
        """Test successful password change"""
        old_password = "SecurePass123"
        new_password = "NewSecure456"

        result = await auth_service.change_password(sample_user, old_password, new_password)

        assert result is True
        assert verify_password(new_password, sample_user.hashed_password)
        assert not verify_password(old_password, sample_user.hashed_password)

    @pytest.mark.asyncio
    async def test_change_password_wrong_old_password(self, auth_service, mock_db, sample_user):
        """Test password change fails with wrong old password"""
        old_password = "WrongPass456"
        new_password = "NewSecure456"

        result = await auth_service.change_password(sample_user, old_password, new_password)

        assert result is False
        assert verify_password("SecurePass123", sample_user.hashed_password)

    @pytest.mark.asyncio
    async def test_reset_password(self, auth_service, mock_db, sample_user):
        """Test admin password reset"""
        new_password = "AdminReset789"

        await auth_service.reset_password(sample_user, new_password)

        assert verify_password(new_password, sample_user.hashed_password)

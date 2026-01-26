"""Unit tests for User model and schemas"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, UserUpdate


class TestUserModel:
    """Test User SQLAlchemy model"""

    def test_user_creation(self):
        """Test creating a User instance"""
        user = User(
            email="test@example.com",
            hashed_password="hashed_password_here",
            full_name="Test User",
            role=UserRole.USER,
            is_active=True,
            failed_login_attempts=0,
        )

        assert user.email == "test@example.com"
        assert user.hashed_password == "hashed_password_here"
        assert user.full_name == "Test User"
        assert user.role == UserRole.USER
        assert user.is_active is True
        assert user.failed_login_attempts == 0
        assert user.locked_until is None

    def test_user_default_values(self):
        """Test User model default values"""
        user = User(
            email="test@example.com",
            hashed_password="hashed_password_here",
            full_name="Test User",
            role=UserRole.USER,
            is_active=True,
            failed_login_attempts=0,
        )

        assert user.role == UserRole.USER
        assert user.is_active is True
        assert user.failed_login_attempts == 0

    def test_user_repr(self):
        """Test User __repr__ method"""
        user_id = uuid4()
        user = User(
            id=user_id,
            email="test@example.com",
            hashed_password="hashed_password_here",
            full_name="Test User",
            role=UserRole.ADMIN,
        )

        repr_str = repr(user)
        assert "User" in repr_str
        assert str(user_id) in repr_str
        assert "test@example.com" in repr_str
        assert "ADMIN" in repr_str


class TestUserCreateSchema:
    """Test UserCreate Pydantic schema"""

    def test_valid_user_create(self):
        """Test creating a valid UserCreate schema"""
        user_data = {
            "email": "test@example.com",
            "full_name": "Test User",
            "password": "SecurePass123",
            "role": UserRole.USER,
        }

        user = UserCreate(**user_data)

        assert user.email == "test@example.com"
        assert user.full_name == "Test User"
        assert user.password == "SecurePass123"
        assert user.role == UserRole.USER

    def test_invalid_email(self):
        """Test UserCreate with invalid email"""
        user_data = {
            "email": "not-an-email",
            "full_name": "Test User",
            "password": "SecurePass123",
        }

        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**user_data)

        assert "email" in str(exc_info.value).lower()

    def test_password_too_short(self):
        """Test UserCreate with password too short"""
        user_data = {
            "email": "test@example.com",
            "full_name": "Test User",
            "password": "Short1",
        }

        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**user_data)

        assert "password" in str(exc_info.value).lower()

    def test_password_no_uppercase(self):
        """Test UserCreate with password missing uppercase letter"""
        user_data = {
            "email": "test@example.com",
            "full_name": "Test User",
            "password": "securepass123",
        }

        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**user_data)

        error_msg = str(exc_info.value).lower()
        assert "uppercase" in error_msg

    def test_password_no_lowercase(self):
        """Test UserCreate with password missing lowercase letter"""
        user_data = {
            "email": "test@example.com",
            "full_name": "Test User",
            "password": "SECUREPASS123",
        }

        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**user_data)

        error_msg = str(exc_info.value).lower()
        assert "lowercase" in error_msg

    def test_password_no_digit(self):
        """Test UserCreate with password missing digit"""
        user_data = {
            "email": "test@example.com",
            "full_name": "Test User",
            "password": "SecurePassword",
        }

        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**user_data)

        error_msg = str(exc_info.value).lower()
        assert "digit" in error_msg

    def test_empty_full_name(self):
        """Test UserCreate with empty full name"""
        user_data = {
            "email": "test@example.com",
            "full_name": "",
            "password": "SecurePass123",
        }

        with pytest.raises(ValidationError) as exc_info:
            UserCreate(**user_data)

        assert "full_name" in str(exc_info.value).lower()

    def test_default_role(self):
        """Test UserCreate with default role"""
        user_data = {
            "email": "test@example.com",
            "full_name": "Test User",
            "password": "SecurePass123",
        }

        user = UserCreate(**user_data)
        assert user.role == UserRole.USER


class TestUserUpdateSchema:
    """Test UserUpdate Pydantic schema"""

    def test_partial_update(self):
        """Test UserUpdate with partial fields"""
        update_data = {"full_name": "Updated Name"}

        user_update = UserUpdate(**update_data)

        assert user_update.full_name == "Updated Name"
        assert user_update.email is None
        assert user_update.role is None

    def test_update_password_validation(self):
        """Test UserUpdate password validation"""
        update_data = {"password": "weakpass"}

        with pytest.raises(ValidationError) as exc_info:
            UserUpdate(**update_data)

        error_msg = str(exc_info.value).lower()
        assert "uppercase" in error_msg or "digit" in error_msg

    def test_update_all_fields(self):
        """Test UserUpdate with all fields"""
        update_data = {
            "email": "newemail@example.com",
            "full_name": "New Name",
            "role": UserRole.ADMIN,
            "is_active": False,
            "password": "NewSecure123",
        }

        user_update = UserUpdate(**update_data)

        assert user_update.email == "newemail@example.com"
        assert user_update.full_name == "New Name"
        assert user_update.role == UserRole.ADMIN
        assert user_update.is_active is False
        assert user_update.password == "NewSecure123"


class TestUserResponseSchema:
    """Test UserResponse Pydantic schema"""

    def test_user_response_from_model(self):
        """Test creating UserResponse from User model"""
        user = User(
            id=uuid4(),
            email="test@example.com",
            hashed_password="hashed_password_here",
            full_name="Test User",
            role=UserRole.USER,
            is_active=True,
            failed_login_attempts=0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        user_response = UserResponse.model_validate(user)

        assert user_response.email == "test@example.com"
        assert user_response.full_name == "Test User"
        assert user_response.role == UserRole.USER
        assert user_response.is_active is True
        # hashed_password should not be in UserResponse
        assert not hasattr(user_response, "hashed_password")

    def test_user_response_excludes_password(self):
        """Test that UserResponse does not include password"""
        user_dict = {
            "id": uuid4(),
            "email": "test@example.com",
            "full_name": "Test User",
            "role": UserRole.USER,
            "is_active": True,
            "failed_login_attempts": 0,
            "locked_until": None,
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }

        user_response = UserResponse(**user_dict)
        response_dict = user_response.model_dump()

        assert "hashed_password" not in response_dict
        assert "password" not in response_dict

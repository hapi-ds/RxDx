"""User model for authentication and authorization"""

from datetime import datetime, UTC
from enum import Enum as PyEnum
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class UserRole(str, PyEnum):
    """User role enumeration"""

    ADMIN = "admin"
    PROJECT_MANAGER = "project_manager"
    VALIDATOR = "validator"
    AUDITOR = "auditor"
    USER = "user"


class User(Base):
    """
    User model for authentication and authorization.
    
    Attributes:
        id: Unique user identifier (UUID)
        email: User email address (unique, indexed)
        hashed_password: Bcrypt hashed password
        full_name: User's full name
        role: User role for RBAC (admin, project_manager, validator, auditor, user)
        is_active: Whether the user account is active
        failed_login_attempts: Counter for failed login attempts
        locked_until: Timestamp until which the account is locked (after 3 failed attempts)
        created_at: Account creation timestamp
        updated_at: Last update timestamp
    """

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(
        Enum(UserRole, name="user_role", create_type=True),
        nullable=False,
        default=UserRole.USER,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    failed_login_attempts = Column(Integer, default=0, nullable=False)
    locked_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(UTC), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"

"""Authentication service for user authentication and session management"""

from datetime import UTC, datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User


class AccountLockedException(Exception):
    """Exception raised when attempting to authenticate a locked account"""

    def __init__(self, locked_until: datetime):
        self.locked_until = locked_until
        super().__init__(
            f"Account is locked until {locked_until.isoformat()}. "
            f"Please try again later."
        )


class AuthService:
    """
    Service for handling user authentication and session management.
    
    Implements:
    - Password hashing and verification
    - JWT token generation
    - Failed login attempt tracking
    - Account locking after 3 failed attempts
    - Session management with 30-minute token expiration
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize the authentication service.
        
        Args:
            db: Database session for user queries
        """
        self.db = db

    async def get_user_by_email(self, email: str) -> Optional[User]:
        """
        Retrieve a user by email address.
        
        Args:
            email: User's email address
            
        Returns:
            User object if found, None otherwise
        """
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """
        Retrieve a user by ID.
        
        Args:
            user_id: User's unique identifier
            
        Returns:
            User object if found, None otherwise
        """
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def create_user(
        self, email: str, password: str, full_name: str, role: str = "user"
    ) -> User:
        """
        Create a new user with hashed password.
        
        Args:
            email: User's email address
            password: Plain text password
            full_name: User's full name
            role: User role (default: "user")
            
        Returns:
            Created User object
        """
        hashed_password = get_password_hash(password)
        user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            role=role,
        )
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def authenticate_user(
        self, email: str, password: str
    ) -> Optional[User]:
        """
        Authenticate a user with email and password.
        
        Implements:
        - Password verification
        - Failed login attempt tracking
        - Account locking after 3 failed attempts (1 hour lock)
        - Automatic unlock after lock period expires
        
        Args:
            email: User's email address
            password: Plain text password
            
        Returns:
            User object if authentication succeeds, None otherwise
            
        Raises:
            AccountLockedException: If the account is currently locked
        """
        user = await self.get_user_by_email(email)
        
        # User not found
        if not user:
            return None
        
        # Check if user is active
        if not user.is_active:
            return None
        
        # Check if account is locked
        if user.locked_until:
            if user.locked_until > datetime.now(UTC):
                raise AccountLockedException(user.locked_until)
            else:
                # Lock period expired, reset failed attempts
                user.locked_until = None
                user.failed_login_attempts = 0
                await self.db.commit()
        
        # Verify password
        if not verify_password(password, user.hashed_password):
            await self.increment_failed_attempts(user)
            return None
        
        # Authentication successful, reset failed attempts
        await self.reset_failed_attempts(user)
        return user

    async def increment_failed_attempts(self, user: User) -> None:
        """
        Increment failed login attempts and lock account if threshold reached.
        
        Locks account for 1 hour after 3 failed attempts.
        
        Args:
            user: User object to update
        """
        user.failed_login_attempts += 1
        
        if user.failed_login_attempts >= settings.MAX_LOGIN_ATTEMPTS:
            user.locked_until = datetime.now(UTC) + timedelta(
                hours=settings.ACCOUNT_LOCK_DURATION_HOURS
            )
        
        await self.db.commit()

    async def reset_failed_attempts(self, user: User) -> None:
        """
        Reset failed login attempts counter.
        
        Called after successful authentication.
        
        Args:
            user: User object to update
        """
        if user.failed_login_attempts > 0 or user.locked_until is not None:
            user.failed_login_attempts = 0
            user.locked_until = None
            await self.db.commit()

    def create_token_for_user(self, user: User) -> str:
        """
        Create a JWT access token for a user.
        
        Token expires after 30 minutes (configurable).
        
        Args:
            user: User object to create token for
            
        Returns:
            JWT access token string
        """
        token_data = {
            "sub": str(user.id),
            "email": user.email,
            "role": user.role.value,
        }
        
        expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        return create_access_token(token_data, expires_delta)

    async def change_password(
        self, user: User, old_password: str, new_password: str
    ) -> bool:
        """
        Change a user's password.
        
        Args:
            user: User object
            old_password: Current password (for verification)
            new_password: New password to set
            
        Returns:
            True if password changed successfully, False if old password incorrect
        """
        if not verify_password(old_password, user.hashed_password):
            return False
        
        user.hashed_password = get_password_hash(new_password)
        await self.db.commit()
        return True

    async def reset_password(self, user: User, new_password: str) -> None:
        """
        Reset a user's password (admin function).
        
        Args:
            user: User object
            new_password: New password to set
        """
        user.hashed_password = get_password_hash(new_password)
        await self.db.commit()

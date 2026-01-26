"""Security utilities for authentication and authorization"""

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from enum import Enum
from functools import wraps
from uuid import UUID

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings
from app.models.user import UserRole

# Password hashing context using Argon2id
# Argon2id is the recommended algorithm for password hashing (OWASP, 2023)
# Parameters: memory_cost=65536 KiB (~64 MB), time_cost=3, parallelism=4
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__memory_cost=65536,  # 64 MB
    argon2__time_cost=3,  # 3 iterations
    argon2__parallelism=4,  # 4 parallel threads
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.

    Args:
        plain_password: The plain text password to verify
        hashed_password: The hashed password to compare against

    Returns:
        True if the password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.

    Args:
        password: The plain text password to hash

    Returns:
        The hashed password
    """
    return pwd_context.hash(password)


def create_access_token(
    data: dict, expires_delta: timedelta | None = None
) -> str:
    """
    Create a JWT access token.

    Args:
        data: The data to encode in the token (typically user_id and email)
        expires_delta: Optional custom expiration time (defaults to 30 minutes)

    Returns:
        The encoded JWT token
    """
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=30)

    to_encode.update({"exp": expire, "iat": datetime.now(UTC)})

    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def decode_access_token(token: str) -> dict | None:
    """
    Decode and verify a JWT access token.

    Args:
        token: The JWT token to decode

    Returns:
        The decoded token payload, or None if invalid
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


def extract_user_id_from_token(token: str) -> UUID | None:
    """
    Extract user ID from a JWT token.

    Args:
        token: The JWT token

    Returns:
        The user ID if valid, None otherwise
    """
    payload = decode_access_token(token)
    if payload is None:
        return None

    user_id_str = payload.get("sub")
    if user_id_str is None:
        return None

    try:
        return UUID(user_id_str)
    except (ValueError, AttributeError):
        return None


# ============================================================================
# Authorization and RBAC (Role-Based Access Control)
# ============================================================================


class Permission(str, Enum):
    """
    Permission enumeration for RBAC.

    Defines all possible permissions in the system:
    - READ_WORKITEM: View work items
    - WRITE_WORKITEM: Create and modify work items
    - SIGN_WORKITEM: Digitally sign work items
    - DELETE_WORKITEM: Delete work items
    - MANAGE_USERS: Create, update, and delete users
    - VIEW_AUDIT: View audit logs and compliance reports
    """

    READ_WORKITEM = "read:workitem"
    WRITE_WORKITEM = "write:workitem"
    SIGN_WORKITEM = "sign:workitem"
    DELETE_WORKITEM = "delete:workitem"
    MANAGE_USERS = "manage:users"
    VIEW_AUDIT = "view:audit"


# Role-to-permissions mapping
# Defines which permissions each role has
ROLE_PERMISSIONS: dict[UserRole, list[Permission]] = {
    UserRole.ADMIN: [
        Permission.READ_WORKITEM,
        Permission.WRITE_WORKITEM,
        Permission.SIGN_WORKITEM,
        Permission.DELETE_WORKITEM,
        Permission.MANAGE_USERS,
        Permission.VIEW_AUDIT,
    ],
    UserRole.PROJECT_MANAGER: [
        Permission.READ_WORKITEM,
        Permission.WRITE_WORKITEM,
        Permission.SIGN_WORKITEM,
        Permission.DELETE_WORKITEM,
    ],
    UserRole.VALIDATOR: [
        Permission.READ_WORKITEM,
        Permission.SIGN_WORKITEM,
    ],
    UserRole.AUDITOR: [
        Permission.READ_WORKITEM,
        Permission.VIEW_AUDIT,
    ],
    UserRole.USER: [
        Permission.READ_WORKITEM,
        Permission.WRITE_WORKITEM,
    ],
}


def has_permission(user_role: UserRole, permission: Permission) -> bool:
    """
    Check if a user role has a specific permission.

    Args:
        user_role: The user's role
        permission: The permission to check

    Returns:
        True if the role has the permission, False otherwise
    """
    return permission in ROLE_PERMISSIONS.get(user_role, [])


def require_permission(permission: Permission) -> Callable:
    """
    Decorator to require a specific permission for an endpoint.

    Usage:
        @require_permission(Permission.WRITE_WORKITEM)
        async def create_workitem(current_user: User = Depends(get_current_user)):
            ...

    Args:
        permission: The required permission

    Returns:
        Decorator function

    Raises:
        HTTPException: 403 Forbidden if user lacks the permission
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs
            current_user = kwargs.get("current_user")
            if current_user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required",
                )

            # Check permission
            if not has_permission(current_user.role, permission):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {permission.value} required",
                )

            return await func(*args, **kwargs)

        return wrapper

    return decorator

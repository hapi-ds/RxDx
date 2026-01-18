"""FastAPI dependency injection utilities"""

from typing import AsyncGenerator
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import extract_user_id_from_token
from app.db.session import get_db
from app.models.user import User
from app.services.auth_service import AuthService
from app.services.signature_service import SignatureService

# HTTP Bearer token security scheme
security = HTTPBearer()


async def get_auth_service(
    db: AsyncSession = Depends(get_db),
) -> AuthService:
    """
    Dependency to get AuthService instance.
    
    Args:
        db: Database session
        
    Returns:
        AuthService instance
    """
    return AuthService(db)


async def get_signature_service(
    db: AsyncSession = Depends(get_db),
) -> SignatureService:
    """
    Dependency to get SignatureService instance.
    
    Args:
        db: Database session
        
    Returns:
        SignatureService instance
    """
    return SignatureService(db)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_service: AuthService = Depends(get_auth_service),
) -> User:
    """
    Dependency to get the current authenticated user.
    
    Extracts the JWT token from the Authorization header,
    validates it, and returns the corresponding user.
    
    Args:
        credentials: HTTP Bearer credentials from request header
        auth_service: Authentication service instance
        
    Returns:
        Current authenticated User object
        
    Raises:
        HTTPException: 401 if token is invalid or user not found
    """
    token = credentials.credentials
    
    # Extract user ID from token
    user_id = extract_user_id_from_token(token)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user = await auth_service.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Dependency to get the current active user.
    
    This is an alias for get_current_user that explicitly checks
    the user is active (already done in get_current_user).
    
    Args:
        current_user: Current user from get_current_user dependency
        
    Returns:
        Current active User object
    """
    return current_user

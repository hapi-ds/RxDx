"""Authentication API endpoints"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_auth_service, get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from app.services.auth_service import AccountLockedException, AuthService

router = APIRouter()


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login(
    login_data: LoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """
    Authenticate user and return JWT access token.
    
    **Requirement 1.1**: Requires valid authentication credentials
    **Requirement 1.4**: Locks account after 3 failed attempts
    
    Args:
        login_data: User email and password
        auth_service: Authentication service instance
        
    Returns:
        JWT access token with expiration time
        
    Raises:
        HTTPException 401: Invalid credentials
        HTTPException 423: Account locked due to failed attempts
    """
    try:
        # Authenticate user
        user = await auth_service.authenticate_user(
            email=login_data.email,
            password=login_data.password,
        )

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Create access token
        access_token = auth_service.create_token_for_user(user)

        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    except AccountLockedException as e:
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail=str(e),
        )


@router.post("/refresh", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def refresh_token(
    current_user: User = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> TokenResponse:
    """
    Refresh JWT access token.
    
    **Requirement 1.2**: Establishes secure session with token refresh
    
    Args:
        current_user: Current authenticated user
        auth_service: Authentication service instance
        
    Returns:
        New JWT access token with expiration time
    """
    # Create new access token
    access_token = auth_service.create_token_for_user(current_user)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    current_user: User = Depends(get_current_user),
) -> None:
    """
    Logout user (client-side token invalidation).
    
    **Requirement 1.6**: Session management
    
    Note: JWT tokens are stateless, so logout is handled client-side
    by removing the token. This endpoint exists for API consistency
    and future token blacklisting implementation.
    
    Args:
        current_user: Current authenticated user
    """
    # In a stateless JWT system, logout is handled client-side
    # Future enhancement: Implement token blacklisting with Redis
    pass


@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Get current authenticated user information.
    
    **Requirement 1.2**: Returns user information with role-based permissions
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User information including role and permissions
    """
    return UserResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role.value,
        is_active=current_user.is_active,
    )

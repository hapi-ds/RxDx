"""API v1 router"""

from fastapi import APIRouter

from app.api.v1 import auth, audit

api_router = APIRouter()

# Include authentication routes
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# Include audit routes
api_router.include_router(audit.router, tags=["audit"])

"""API v1 router"""

from fastapi import APIRouter

from app.api.v1 import auth, audit, graph, signatures, workitems

api_router = APIRouter()

# Include authentication routes
api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])

# Include audit routes
api_router.include_router(audit.router, tags=["audit"])

# Include graph routes
api_router.include_router(graph.router, prefix="/graph", tags=["graph"])

# Include workitem routes
api_router.include_router(workitems.router, tags=["workitems"])

# Include signature routes
api_router.include_router(signatures.router, tags=["signatures"])

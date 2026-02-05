"""Health check endpoints"""

import asyncio
import time
from typing import Any

import structlog
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

router = APIRouter()
logger = structlog.get_logger(__name__)


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> dict[str, str]:
    """Basic health check - always returns 200 if service is running"""
    return {"status": "healthy"}


@router.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness_check(
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    """
    Comprehensive readiness check
    Returns 200 if all dependencies are healthy, 503 otherwise
    """
    start_time = time.time()
    checks: dict[str, Any] = {}
    all_healthy = True
    
    # Check database
    try:
        await asyncio.wait_for(
            db.execute(text("SELECT 1")),
            timeout=2.0
        )
        checks["database"] = {"status": "healthy"}
        logger.debug("Database health check passed")
    except asyncio.TimeoutError:
        checks["database"] = {
            "status": "unhealthy",
            "error": "Database query timeout after 2 seconds"
        }
        all_healthy = False
        logger.error("Database health check failed: timeout")
    except Exception as e:
        checks["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        all_healthy = False
        logger.error("Database health check failed", error=str(e), error_type=type(e).__name__)
    
    # Check graph database
    try:
        from app.db.graph import graph_service
        
        # Test graph database connection with a simple Cypher query
        await asyncio.wait_for(
            graph_service.execute_query("RETURN 1"),
            timeout=2.0
        )
        checks["graph_database"] = {"status": "healthy"}
        logger.debug("Graph database health check passed")
    except asyncio.TimeoutError:
        checks["graph_database"] = {
            "status": "unhealthy",
            "error": "Graph database query timeout after 2 seconds"
        }
        all_healthy = False
        logger.error("Graph database health check failed: timeout")
    except Exception as e:
        checks["graph_database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        all_healthy = False
        logger.error("Graph database health check failed", error=str(e), error_type=type(e).__name__)
    
    duration = time.time() - start_time
    
    response_data = {
        "status": "healthy" if all_healthy else "unhealthy",
        "checks": checks,
        "duration_seconds": round(duration, 3)
    }
    
    if not all_healthy:
        logger.warning("Readiness check failed", checks=checks, duration_seconds=round(duration, 3))
        return JSONResponse(
            content=response_data,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    logger.info("Readiness check passed", duration_seconds=round(duration, 3))
    return JSONResponse(
        content=response_data,
        status_code=status.HTTP_200_OK
    )

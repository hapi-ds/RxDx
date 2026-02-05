"""FastAPI application entry point for RxDx"""

# Configure logging first, before other imports
from app.core.logging import configure_logging
configure_logging()

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings
from app.db import graph_service
from app.middleware.logging import LoggingMiddleware

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for startup and shutdown events"""
    # Startup
    logger.info("Starting RxDx Backend", version=settings.VERSION, environment=settings.ENVIRONMENT)

    # Initialize database tables
    try:
        from app.db.session import init_db
        await init_db()
        logger.info("Database tables initialized")
    except Exception as e:
        logger.warning("Could not initialize database tables", error=str(e))

    # Initialize graph database connection
    try:
        await graph_service.connect()
        logger.info("Connected to Apache AGE graph database")
    except Exception as e:
        logger.warning(
            "Could not connect to graph database",
            error=str(e),
            message="The application will start but graph features will be unavailable"
        )

    yield

    # Shutdown
    logger.info("Shutting down RxDx Backend")
    await graph_service.close()
    logger.info("Closed graph database connection")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Project Management System for Regulated Industries",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add logging middleware
app.add_middleware(LoggingMiddleware)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint"""
    return {
        "message": "RxDx API",
        "version": settings.VERSION,
        "docs": "/api/docs",
    }


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Health check endpoint"""
    return {"status": "healthy"}


# Include API v1 router
app.include_router(api_router, prefix="/api/v1")

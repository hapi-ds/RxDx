"""FastAPI application entry point for RxDx"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import api_router
from app.core.config import settings
from app.db import graph_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan manager for startup and shutdown events"""
    # Startup
    print(f"Starting RxDx Backend v{settings.VERSION}")
    print(f"Environment: {settings.ENVIRONMENT}")
    
    # Initialize graph database connection
    try:
        await graph_service.connect()
        print("✓ Connected to Apache AGE graph database")
    except Exception as e:
        print(f"⚠ Warning: Could not connect to graph database: {e}")
        print("  The application will start but graph features will be unavailable")
    
    yield
    
    # Shutdown
    print("Shutting down RxDx Backend")
    await graph_service.close()
    print("✓ Closed graph database connection")


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

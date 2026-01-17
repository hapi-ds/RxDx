"""Pytest configuration and fixtures"""

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client() -> TestClient:
    """Test client for FastAPI application"""
    return TestClient(app)


@pytest.fixture
def test_settings():
    """Test settings override"""
    from app.core.config import Settings
    
    return Settings(
        ENVIRONMENT="testing",
        DEBUG=True,
        SECRET_KEY="test-secret-key-for-testing-only",
        DATABASE_URL="postgresql+asyncpg://test:test@localhost:5432/test_rxdx",
    )

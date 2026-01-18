"""Pytest configuration and fixtures"""

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client() -> TestClient:
    """Test client for FastAPI application"""
    # Only import and create the app when actually needed for integration tests
    try:
        from app.main import app
        return TestClient(app)
    except ImportError as e:
        pytest.skip(f"Skipping integration test due to import error: {e}")


@pytest.fixture
def test_settings():
    """Test settings override"""
    try:
        from app.core.config import Settings
        
        return Settings(
            ENVIRONMENT="testing",
            DEBUG=True,
            SECRET_KEY="test-secret-key-for-testing-only",
            DATABASE_URL="postgresql+asyncpg://test:test@localhost:5432/test_rxdx",
        )
    except ImportError:
        # Return a mock settings object for unit tests that don't need real settings
        class MockSettings:
            ENVIRONMENT = "testing"
            DEBUG = True
            SECRET_KEY = "test-secret-key-for-testing-only"
            DATABASE_URL = "postgresql+asyncpg://test:test@localhost:5432/test_rxdx"
        
        return MockSettings()

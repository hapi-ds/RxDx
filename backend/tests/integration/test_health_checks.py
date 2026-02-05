"""Integration tests for health check endpoints"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.mark.asyncio
async def test_basic_health_check():
    """Test basic health check endpoint"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_api_v1_health_check():
    """Test API v1 health check endpoint"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_readiness_check_structure():
    """Test readiness check response structure"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health/ready")
        
        data = response.json()
        
        # Verify response structure
        assert "status" in data
        assert "checks" in data
        assert "duration_seconds" in data
        
        # Verify checks structure
        assert "database" in data["checks"]
        assert "graph_database" in data["checks"]
        
        # Each check should have a status
        for check_name, check_data in data["checks"].items():
            assert "status" in check_data
            assert check_data["status"] in ["healthy", "unhealthy"]


@pytest.mark.asyncio
async def test_readiness_check_response_time():
    """Test that readiness check completes within 5 seconds"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health/ready")
        
        data = response.json()
        duration = data["duration_seconds"]
        
        # Should complete within 5 seconds
        assert duration < 5.0, f"Health check took too long: {duration}s"


@pytest.mark.asyncio
async def test_health_check_no_auth_required():
    """Test that health checks don't require authentication"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Make requests without auth headers
        response1 = await client.get("/health")
        response2 = await client.get("/api/v1/health")
        response3 = await client.get("/api/v1/health/ready")
        
        # All should succeed without auth
        assert response1.status_code == 200
        assert response2.status_code == 200
        # response3 might be 503 if dependencies are down, but not 401
        assert response3.status_code in [200, 503]


@pytest.mark.asyncio
async def test_readiness_check_includes_duration():
    """Test that readiness check includes duration measurement"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/health/ready")
        
        data = response.json()
        
        assert "duration_seconds" in data
        assert isinstance(data["duration_seconds"], (int, float))
        assert data["duration_seconds"] > 0

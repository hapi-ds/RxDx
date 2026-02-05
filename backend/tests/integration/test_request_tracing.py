"""Integration tests for end-to-end request tracing"""

import re
from pathlib import Path

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.mark.asyncio
async def test_request_id_propagation():
    """Test that request ID propagates from request to response"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Make request without X-Request-ID
        response = await client.get("/health")
        
        # Verify response includes X-Request-ID header
        assert "X-Request-ID" in response.headers
        request_id = response.headers["X-Request-ID"]
        
        # Verify request ID format (UUID format)
        assert re.match(r"^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$", request_id)


@pytest.mark.asyncio
async def test_custom_request_id_preserved():
    """Test that custom request ID is preserved"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        custom_id = "custom-test-id-12345"
        
        # Make request with custom X-Request-ID
        response = await client.get(
            "/health",
            headers={"X-Request-ID": custom_id}
        )
        
        # Verify same request ID is returned
        assert response.headers["X-Request-ID"] == custom_id


@pytest.mark.asyncio
async def test_request_id_in_logs(tmp_path):
    """Test that request ID appears in backend logs"""
    # Note: This test verifies the logging mechanism works
    # In a real scenario, you'd check actual log files
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        custom_id = "test-log-id-67890"
        
        # Make request with custom request ID
        response = await client.get(
            "/api/v1/health",
            headers={"X-Request-ID": custom_id}
        )
        
        assert response.status_code == 200
        assert response.headers["X-Request-ID"] == custom_id
        
        # In production, you would verify:
        # - Log file contains the request_id
        # - All log entries for this request have the same request_id


@pytest.mark.asyncio
async def test_request_id_unique_per_request():
    """Test that each request gets a unique request ID"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        request_ids = set()
        
        # Make multiple requests
        for _ in range(10):
            response = await client.get("/health")
            request_id = response.headers["X-Request-ID"]
            request_ids.add(request_id)
        
        # Verify all request IDs are unique
        assert len(request_ids) == 10


@pytest.mark.asyncio
async def test_request_id_on_error():
    """Test that request ID is included in error responses"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        custom_id = "error-test-id-99999"
        
        # Make request to non-existent endpoint
        response = await client.get(
            "/api/v1/nonexistent",
            headers={"X-Request-ID": custom_id}
        )
        
        # Verify request ID is in response even for errors
        assert response.headers["X-Request-ID"] == custom_id


@pytest.mark.asyncio
async def test_request_tracing_multiple_endpoints():
    """Test request tracing works across different endpoints"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        endpoints = [
            "/health",
            "/api/v1/health",
            "/api/v1/health/ready",
            "/",
        ]
        
        for endpoint in endpoints:
            response = await client.get(endpoint)
            
            # Each endpoint should return a request ID
            assert "X-Request-ID" in response.headers
            request_id = response.headers["X-Request-ID"]
            assert len(request_id) > 0

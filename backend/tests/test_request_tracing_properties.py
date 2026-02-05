"""Property-based tests for request ID propagation"""

import asyncio
import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from httpx import AsyncClient, ASGITransport
from hypothesis import given, strategies as st, settings
from starlette.middleware.base import BaseHTTPMiddleware

from app.middleware.logging import LoggingMiddleware


# Create a test app with logging middleware
def create_test_app():
    """Create a test FastAPI app with logging middleware"""
    app = FastAPI()
    app.add_middleware(LoggingMiddleware)
    
    @app.get("/test")
    async def test_endpoint():
        return {"message": "test"}
    
    @app.post("/test")
    async def test_post_endpoint(request: Request):
        body = await request.json()
        return {"message": "test", "received": body}
    
    @app.put("/test/{item_id}")
    async def test_put_endpoint(item_id: str):
        return {"message": "test", "item_id": item_id}
    
    @app.delete("/test/{item_id}")
    async def test_delete_endpoint(item_id: str):
        return {"message": "deleted", "item_id": item_id}
    
    return app


# Strategy for generating valid UUIDs
uuid_strategy = st.uuids().map(str)

# Strategy for HTTP methods
http_methods = st.sampled_from(['GET', 'POST', 'PUT', 'DELETE'])

# Strategy for paths
paths = st.sampled_from(['/test', '/test/123', '/test/abc'])


@given(request_id=uuid_strategy)
@settings(max_examples=100, deadline=None)
@pytest.mark.asyncio
async def test_request_id_in_response_headers(request_id):
    """
    Property 2: Request ID Propagation
    
    For any request with X-Request-ID header, the same request_id
    must be present in the response headers.
    
    **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
    """
    app = create_test_app()
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/test",
            headers={"X-Request-ID": request_id}
        )
        
        # Verify request_id is in response headers
        assert "X-Request-ID" in response.headers, "X-Request-ID not found in response headers"
        assert response.headers["X-Request-ID"] == request_id, (
            f"Request ID mismatch: sent {request_id}, received {response.headers['X-Request-ID']}"
        )


@given(method=http_methods)
@settings(max_examples=50, deadline=None)
@pytest.mark.asyncio
async def test_request_id_generated_if_missing(method):
    """
    Property 2: Request ID Propagation
    
    For any request without X-Request-ID header, a request_id
    must be generated and returned in response headers.
    
    **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
    """
    app = create_test_app()
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Make request without X-Request-ID header
        if method == 'GET':
            response = await client.get("/test")
        elif method == 'POST':
            response = await client.post("/test", json={"data": "test"})
        elif method == 'PUT':
            response = await client.put("/test/123", json={"data": "test"})
        else:  # DELETE
            response = await client.delete("/test/123")
        
        # Verify request_id is generated and in response headers
        assert "X-Request-ID" in response.headers, "X-Request-ID not found in response headers"
        
        # Verify it's a valid UUID
        request_id = response.headers["X-Request-ID"]
        try:
            uuid.UUID(request_id)
        except ValueError:
            pytest.fail(f"Generated request_id is not a valid UUID: {request_id}")


@given(
    request_ids=st.lists(uuid_strategy, min_size=2, max_size=10, unique=True)
)
@settings(max_examples=50, deadline=None)
@pytest.mark.asyncio
async def test_concurrent_requests_have_unique_ids(request_ids):
    """
    Property 2: Request ID Propagation
    
    For any set of concurrent requests, each request must maintain
    its own unique request_id throughout the request lifecycle.
    
    **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
    """
    app = create_test_app()
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Make concurrent requests with different request IDs
        tasks = [
            client.get("/test", headers={"X-Request-ID": req_id})
            for req_id in request_ids
        ]
        
        responses = await asyncio.gather(*tasks)
        
        # Verify each response has the correct request_id
        for i, response in enumerate(responses):
            expected_id = request_ids[i]
            actual_id = response.headers.get("X-Request-ID")
            
            assert actual_id == expected_id, (
                f"Request ID mismatch for request {i}: "
                f"expected {expected_id}, got {actual_id}"
            )


@given(
    request_id=uuid_strategy,
    method=http_methods
)
@settings(max_examples=100, deadline=None)
@pytest.mark.asyncio
async def test_request_id_preserved_across_methods(request_id, method):
    """
    Property 2: Request ID Propagation
    
    For any HTTP method (GET, POST, PUT, DELETE), the request_id
    must be preserved and returned in the response.
    
    **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
    """
    app = create_test_app()
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = {"X-Request-ID": request_id}
        
        # Make request based on method
        if method == 'GET':
            response = await client.get("/test", headers=headers)
        elif method == 'POST':
            response = await client.post("/test", json={"data": "test"}, headers=headers)
        elif method == 'PUT':
            response = await client.put("/test/123", json={"data": "test"}, headers=headers)
        else:  # DELETE
            response = await client.delete("/test/123", headers=headers)
        
        # Verify request_id is preserved
        assert "X-Request-ID" in response.headers
        assert response.headers["X-Request-ID"] == request_id, (
            f"Request ID not preserved for {method}: "
            f"sent {request_id}, received {response.headers['X-Request-ID']}"
        )


@given(request_id=uuid_strategy)
@settings(max_examples=50, deadline=None)
@pytest.mark.asyncio
async def test_request_id_format_is_uuid(request_id):
    """
    Property 2: Request ID Propagation
    
    For any request, the request_id must be a valid UUID format.
    
    **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
    """
    app = create_test_app()
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test with provided UUID
        response = await client.get(
            "/test",
            headers={"X-Request-ID": request_id}
        )
        
        returned_id = response.headers.get("X-Request-ID")
        
        # Verify it's a valid UUID
        try:
            uuid.UUID(returned_id)
        except ValueError:
            pytest.fail(f"Returned request_id is not a valid UUID: {returned_id}")
        
        # Verify it matches the sent ID
        assert returned_id == request_id


@given(
    num_requests=st.integers(min_value=1, max_value=20)
)
@settings(max_examples=30, deadline=None)
@pytest.mark.asyncio
async def test_sequential_requests_maintain_unique_ids(num_requests):
    """
    Property 2: Request ID Propagation
    
    For any sequence of requests, each request must have a unique
    request_id when no ID is provided.
    
    **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
    """
    app = create_test_app()
    transport = ASGITransport(app=app)
    
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        request_ids = []
        
        # Make sequential requests without providing request IDs
        for _ in range(num_requests):
            response = await client.get("/test")
            request_id = response.headers.get("X-Request-ID")
            request_ids.append(request_id)
        
        # Verify all request IDs are unique
        unique_ids = set(request_ids)
        assert len(unique_ids) == num_requests, (
            f"Expected {num_requests} unique request IDs, got {len(unique_ids)}"
        )
        
        # Verify all are valid UUIDs
        for req_id in request_ids:
            try:
                uuid.UUID(req_id)
            except ValueError:
                pytest.fail(f"Generated request_id is not a valid UUID: {req_id}")

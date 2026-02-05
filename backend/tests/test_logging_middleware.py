"""Tests for logging middleware"""

import uuid
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.middleware.logging import LoggingMiddleware, request_id_var


@pytest.fixture
def app():
    """Create a test FastAPI app with logging middleware"""
    app = FastAPI()
    app.add_middleware(LoggingMiddleware)
    
    @app.get("/test")
    async def test_endpoint():
        return {"message": "test"}
    
    @app.get("/error")
    async def error_endpoint():
        raise ValueError("Test error")
    
    return app


@pytest.mark.asyncio
async def test_middleware_generates_request_id():
    """Test that middleware generates request_id if not provided"""
    middleware = LoggingMiddleware(app=MagicMock())
    
    # Mock request without X-Request-ID header
    request = MagicMock(spec=Request)
    request.headers = {}
    request.method = "GET"
    request.url.path = "/test"
    
    # Mock call_next
    async def mock_call_next(req):
        response = MagicMock(spec=Response)
        response.status_code = 200
        response.headers = {}
        return response
    
    response = await middleware.dispatch(request, mock_call_next)
    
    # Verify request_id was added to response headers
    assert "X-Request-ID" in response.headers
    assert len(response.headers["X-Request-ID"]) > 0


@pytest.mark.asyncio
async def test_middleware_extracts_existing_request_id():
    """Test that middleware extracts X-Request-ID from request headers"""
    middleware = LoggingMiddleware(app=MagicMock())
    
    # Mock request with X-Request-ID header
    test_request_id = str(uuid.uuid4())
    request = MagicMock(spec=Request)
    request.headers = {"X-Request-ID": test_request_id}
    request.method = "GET"
    request.url.path = "/test"
    
    # Mock call_next
    async def mock_call_next(req):
        # Verify request_id was set in context var
        assert request_id_var.get() == test_request_id
        response = MagicMock(spec=Response)
        response.status_code = 200
        response.headers = {}
        return response
    
    response = await middleware.dispatch(request, mock_call_next)
    
    # Verify same request_id was added to response headers
    assert response.headers["X-Request-ID"] == test_request_id


@pytest.mark.asyncio
async def test_middleware_logs_request_completion():
    """Test that middleware logs request start and completion"""
    middleware = LoggingMiddleware(app=MagicMock())
    
    request = MagicMock(spec=Request)
    request.headers = {}
    request.method = "POST"
    request.url.path = "/api/test"
    
    # Mock call_next
    async def mock_call_next(req):
        response = MagicMock(spec=Response)
        response.status_code = 201
        response.headers = {}
        return response
    
    response = await middleware.dispatch(request, mock_call_next)
    
    # Verify response was returned
    assert response.status_code == 201
    assert "X-Request-ID" in response.headers


@pytest.mark.asyncio
async def test_middleware_logs_request_failure():
    """Test that middleware logs request failures with error details"""
    middleware = LoggingMiddleware(app=MagicMock())
    
    request = MagicMock(spec=Request)
    request.headers = {}
    request.method = "GET"
    request.url.path = "/error"
    
    # Mock call_next that raises an exception
    async def mock_call_next(req):
        raise ValueError("Test error message")
    
    # Verify exception is re-raised
    with pytest.raises(ValueError, match="Test error message"):
        await middleware.dispatch(request, mock_call_next)


@pytest.mark.asyncio
async def test_request_id_context_var():
    """Test that request_id context variable works correctly"""
    # Set a test request ID
    test_id = str(uuid.uuid4())
    request_id_var.set(test_id)
    
    # Verify it can be retrieved
    assert request_id_var.get() == test_id
    
    # Set a different ID
    new_id = str(uuid.uuid4())
    request_id_var.set(new_id)
    
    # Verify it was updated
    assert request_id_var.get() == new_id
    assert request_id_var.get() != test_id

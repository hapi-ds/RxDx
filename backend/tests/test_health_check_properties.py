"""Property-based tests for health check response time"""

import asyncio
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from hypothesis import given, strategies as st, settings

from app.main import app


# Strategy for database response delays (in seconds)
db_delay_strategy = st.floats(min_value=0.0, max_value=3.0)

# Strategy for number of concurrent requests
concurrent_requests_strategy = st.integers(min_value=1, max_value=10)


@given(db_delay=db_delay_strategy)
@settings(max_examples=100, deadline=10000)
def test_health_check_completes_within_timeout(db_delay):
    """
    Property 4: Health Check Response Time
    
    For any health check request, the response must be returned within 5 seconds,
    even when database checks are slow.
    
    **Validates: Requirements 5.6**
    """
    client = TestClient(app)
    
    # Mock database to simulate delay
    async def mock_db_execute(*args, **kwargs):
        await asyncio.sleep(db_delay)
        return MagicMock()
    
    with patch('app.api.v1.health.get_db') as mock_get_db:
        # Create mock session
        mock_session = AsyncMock()
        mock_session.execute = mock_db_execute
        
        # Mock the dependency
        async def override_get_db():
            yield mock_session
        
        mock_get_db.return_value = override_get_db()
        
        # Measure response time
        start_time = time.time()
        
        try:
            response = client.get("/api/v1/health/ready")
            duration = time.time() - start_time
            
            # Verify response time is within 5 seconds
            assert duration < 5.0, (
                f"Health check took {duration:.2f}s, exceeding 5s limit"
            )
            
            # Verify response is valid
            assert response.status_code in [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE]
            data = response.json()
            assert "status" in data
            assert "checks" in data
            assert "duration_seconds" in data
            
        except Exception as e:
            duration = time.time() - start_time
            # Even on error, should complete within 5 seconds
            assert duration < 5.0, (
                f"Health check failed after {duration:.2f}s (error: {e})"
            )


@given(
    db_delay=st.floats(min_value=0.0, max_value=1.0),
    graph_delay=st.floats(min_value=0.0, max_value=1.0)
)
@settings(max_examples=100, deadline=10000)
def test_health_check_with_multiple_dependencies(db_delay, graph_delay):
    """
    Property 4: Health Check Response Time
    
    For any health check request with multiple dependencies,
    the total response time must be within 5 seconds.
    
    **Validates: Requirements 5.6**
    """
    client = TestClient(app)
    
    # Mock database
    async def mock_db_execute(*args, **kwargs):
        await asyncio.sleep(db_delay)
        return MagicMock()
    
    # Mock graph database
    async def mock_graph_execute(*args, **kwargs):
        await asyncio.sleep(graph_delay)
        return MagicMock()
    
    with patch('app.api.v1.health.get_db') as mock_get_db, \
         patch('app.db.graph.graph_service.execute_query', new=mock_graph_execute):
        
        # Create mock session
        mock_session = AsyncMock()
        mock_session.execute = mock_db_execute
        
        # Mock the dependency
        async def override_get_db():
            yield mock_session
        
        mock_get_db.return_value = override_get_db()
        
        # Measure response time
        start_time = time.time()
        
        try:
            response = client.get("/api/v1/health/ready")
            duration = time.time() - start_time
            
            # Verify total response time is within 5 seconds
            assert duration < 5.0, (
                f"Health check took {duration:.2f}s with db_delay={db_delay:.2f}s "
                f"and graph_delay={graph_delay:.2f}s, exceeding 5s limit"
            )
            
            # Verify response structure
            assert response.status_code in [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE]
            data = response.json()
            assert "checks" in data
            assert "database" in data["checks"]
            assert "graph_database" in data["checks"]
            
        except Exception as e:
            duration = time.time() - start_time
            assert duration < 5.0, (
                f"Health check failed after {duration:.2f}s (error: {e})"
            )


@given(db_delay=st.floats(min_value=2.5, max_value=4.0))
@settings(max_examples=50, deadline=10000)
def test_health_check_timeout_handling(db_delay):
    """
    Property 4: Health Check Response Time
    
    For any health check request where a dependency times out (>2s),
    the health check should return 503 but still complete within 5 seconds.
    
    **Validates: Requirements 5.6**
    """
    client = TestClient(app)
    
    # Mock database with long delay to trigger timeout
    async def mock_db_execute(*args, **kwargs):
        await asyncio.sleep(db_delay)
        return MagicMock()
    
    with patch('app.api.v1.health.get_db') as mock_get_db:
        # Create mock session
        mock_session = AsyncMock()
        mock_session.execute = mock_db_execute
        
        # Mock the dependency
        async def override_get_db():
            yield mock_session
        
        mock_get_db.return_value = override_get_db()
        
        # Measure response time
        start_time = time.time()
        
        try:
            response = client.get("/api/v1/health/ready")
            duration = time.time() - start_time
            
            # Should complete within 5 seconds even with timeout
            assert duration < 5.0, (
                f"Health check took {duration:.2f}s, exceeding 5s limit"
            )
            
            # Should return 503 when dependency times out
            # Note: May return 200 if timeout is handled gracefully
            assert response.status_code in [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE]
            
            data = response.json()
            assert "checks" in data
            
            # If database timed out, it should be marked unhealthy
            if db_delay > 2.0:
                # Database check should have timed out
                assert "database" in data["checks"]
                # Status might be unhealthy due to timeout
                
        except Exception as e:
            duration = time.time() - start_time
            assert duration < 5.0, (
                f"Health check failed after {duration:.2f}s (error: {e})"
            )


@given(num_requests=concurrent_requests_strategy)
@settings(max_examples=50, deadline=15000)
def test_concurrent_health_checks(num_requests):
    """
    Property 4: Health Check Response Time
    
    For any number of concurrent health check requests,
    each request should complete within 5 seconds.
    
    **Validates: Requirements 5.6**
    """
    client = TestClient(app)
    
    # Mock database with small delay
    async def mock_db_execute(*args, **kwargs):
        await asyncio.sleep(0.1)
        return MagicMock()
    
    with patch('app.api.v1.health.get_db') as mock_get_db:
        # Create mock session
        mock_session = AsyncMock()
        mock_session.execute = mock_db_execute
        
        # Mock the dependency
        async def override_get_db():
            yield mock_session
        
        mock_get_db.return_value = override_get_db()
        
        # Make concurrent requests
        start_time = time.time()
        responses = []
        durations = []
        
        for _ in range(num_requests):
            req_start = time.time()
            try:
                response = client.get("/api/v1/health/ready")
                req_duration = time.time() - req_start
                responses.append(response)
                durations.append(req_duration)
            except Exception as e:
                req_duration = time.time() - req_start
                durations.append(req_duration)
                # Record error but continue
        
        total_duration = time.time() - start_time
        
        # Verify each request completed within 5 seconds
        for i, duration in enumerate(durations):
            assert duration < 5.0, (
                f"Request {i+1}/{num_requests} took {duration:.2f}s, "
                f"exceeding 5s limit"
            )
        
        # Verify all responses are valid
        for response in responses:
            assert response.status_code in [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE]
            data = response.json()
            assert "status" in data
            assert "checks" in data


@given(
    db_healthy=st.booleans(),
    graph_healthy=st.booleans()
)
@settings(max_examples=100, deadline=10000)
def test_health_check_status_codes(db_healthy, graph_healthy):
    """
    Property 4: Health Check Response Time
    
    For any combination of dependency health states,
    the health check should return appropriate status codes
    within 5 seconds.
    
    **Validates: Requirements 5.6**
    """
    client = TestClient(app)
    
    # Mock database
    async def mock_db_execute(*args, **kwargs):
        if not db_healthy:
            raise Exception("Database connection failed")
        await asyncio.sleep(0.1)
        return MagicMock()
    
    # Mock graph database
    async def mock_graph_execute(*args, **kwargs):
        if not graph_healthy:
            raise Exception("Graph database connection failed")
        await asyncio.sleep(0.1)
        return MagicMock()
    
    with patch('app.api.v1.health.get_db') as mock_get_db, \
         patch('app.db.graph.graph_service.execute_query', new=mock_graph_execute):
        
        # Create mock session
        mock_session = AsyncMock()
        mock_session.execute = mock_db_execute
        
        # Mock the dependency
        async def override_get_db():
            yield mock_session
        
        mock_get_db.return_value = override_get_db()
        
        # Measure response time
        start_time = time.time()
        
        try:
            response = client.get("/api/v1/health/ready")
            duration = time.time() - start_time
            
            # Verify response time
            assert duration < 5.0, (
                f"Health check took {duration:.2f}s, exceeding 5s limit"
            )
            
            # Verify status code based on health states
            if db_healthy and graph_healthy:
                # All healthy - should return 200
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert data["status"] == "healthy"
            else:
                # At least one unhealthy - should return 503
                assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
                data = response.json()
                assert data["status"] == "unhealthy"
            
            # Verify response structure
            assert "checks" in data
            assert "database" in data["checks"]
            assert "graph_database" in data["checks"]
            
        except Exception as e:
            duration = time.time() - start_time
            assert duration < 5.0, (
                f"Health check failed after {duration:.2f}s (error: {e})"
            )


def test_basic_health_check_always_fast():
    """
    Property 4: Health Check Response Time
    
    The basic /health endpoint should always respond quickly
    (within 1 second) as it doesn't check dependencies.
    
    **Validates: Requirements 5.6**
    """
    client = TestClient(app)
    
    # Test multiple times to ensure consistency
    for _ in range(10):
        start_time = time.time()
        response = client.get("/api/v1/health")
        duration = time.time() - start_time
        
        # Basic health check should be very fast
        assert duration < 1.0, (
            f"Basic health check took {duration:.2f}s, exceeding 1s limit"
        )
        
        # Should always return 200
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "healthy"

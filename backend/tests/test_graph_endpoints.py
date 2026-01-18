"""Integration tests for graph API endpoints"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock
from uuid import uuid4

from app.main import app
from app.models.user import User, UserRole


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def mock_user():
    """Create mock user for testing"""
    return User(
        id=uuid4(),
        email="test@example.com",
        full_name="Test User",
        role=UserRole.USER,
        is_active=True,
        failed_login_attempts=0
    )


class TestGraphVisualizationEndpoint:
    """Test /api/v1/graph/visualization endpoint"""
    
    def test_get_graph_visualization_success(self, client, mock_user):
        """Test successful graph visualization request"""
        # Mock the graph service
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = {
            "nodes": [
                {
                    "id": "req-1",
                    "type": "requirement",
                    "label": "Test Requirement",
                    "color": "#3B82F6",
                    "size": 50,
                    "properties": {"id": "req-1", "title": "Test Requirement"},
                    "reactFlow": {"id": "req-1", "type": "custom"},
                    "r3f": {"id": "req-1", "position": [0, 0, 0]}
                }
            ],
            "edges": [],
            "metadata": {
                "total_nodes": 1,
                "total_edges": 0,
                "depth": 2,
                "center_node": None,
                "truncated": False
            }
        }
        
        # Override dependencies
        from app.api import deps
        from app.db import graph
        
        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service
        
        try:
            # Make request
            response = client.get("/api/v1/graph/visualization")
            
            # Verify response
            assert response.status_code == 200
            data = response.json()
            
            assert "nodes" in data
            assert "edges" in data
            assert "metadata" in data
            
            assert len(data["nodes"]) == 1
            
            # Check node structure
            node = data["nodes"][0]
            assert node["id"] == "req-1"
            assert node["type"] == "requirement"
            assert "reactFlow" in node
            assert "r3f" in node
            
        finally:
            # Clean up overrides
            app.dependency_overrides.clear()
        
    def test_get_graph_visualization_unauthorized(self, client):
        """Test graph visualization without authentication"""
        response = client.get("/api/v1/graph/visualization")
        assert response.status_code == 401
        
    def test_get_graph_visualization_invalid_node_types(self, client, mock_user):
        """Test graph visualization with invalid node types"""
        from app.api import deps
        
        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        
        try:
            response = client.get(
                "/api/v1/graph/visualization",
                params={"node_types": ["invalid_type", "requirement"]}
            )
            
            assert response.status_code == 400
            assert "Invalid node types" in response.json()["detail"]
            
        finally:
            app.dependency_overrides.clear()
            
    def test_get_graph_visualization_with_all_parameters(self, client, mock_user):
        """Test graph visualization with all query parameters"""
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = {
            "nodes": [],
            "edges": [],
            "metadata": {
                "total_nodes": 0,
                "total_edges": 0,
                "depth": 3,
                "center_node": "center-1",
                "truncated": False,
                "performance_stats": {
                    "query_limit_applied": 500,
                    "depth_limit_applied": 3,
                    "nodes_filtered": 0
                }
            }
        }
        
        from app.api import deps
        from app.db import graph
        
        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service
        
        try:
            response = client.get(
                "/api/v1/graph/visualization",
                params={
                    "center_node_id": "center-1",
                    "depth": 3,
                    "node_types": ["WorkItem", "Test"],  # Use valid node types
                    "relationship_types": ["TESTED_BY", "DEPENDS_ON"],
                    "limit": 500
                }
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Verify metadata includes performance stats
            assert "performance_stats" in data["metadata"]
            assert data["metadata"]["depth"] == 3
            assert data["metadata"]["center_node"] == "center-1"
            
            # Verify service was called with correct parameters
            mock_service.get_graph_for_visualization.assert_called_once_with(
                center_node_id="center-1",
                depth=3,
                node_types=["WorkItem", "Test"],
                relationship_types=["TESTED_BY", "DEPENDS_ON"],
                limit=500
            )
            
        finally:
            app.dependency_overrides.clear()
            
    def test_get_graph_visualization_performance_limits(self, client, mock_user):
        """Test that performance limits are enforced"""
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = {
            "nodes": [{"id": f"node-{i}", "type": "test"} for i in range(1000)],
            "edges": [],
            "metadata": {
                "total_nodes": 1000,
                "total_edges": 0,
                "depth": 2,
                "center_node": None,
                "truncated": True,
                "performance_stats": {
                    "query_limit_applied": 1000,
                    "depth_limit_applied": 2,
                    "nodes_filtered": 0
                }
            }
        }
        
        from app.api import deps
        from app.db import graph
        
        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service
        
        try:
            # Test with very high limit - should be capped to 5000 by FastAPI validation
            response = client.get(
                "/api/v1/graph/visualization",
                params={"limit": 5000}  # Use the maximum allowed limit
            )
            
            assert response.status_code == 200
            data = response.json()
            
            # Should indicate truncation
            assert data["metadata"]["truncated"] is True
            
        finally:
            app.dependency_overrides.clear()
            
    def test_get_graph_visualization_invalid_relationship_types(self, client, mock_user):
        """Test graph visualization with invalid relationship types"""
        from app.api import deps
        
        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        
        try:
            response = client.get(
                "/api/v1/graph/visualization",
                params={"relationship_types": ["INVALID_REL", "TESTED_BY"]}
            )
            
            assert response.status_code == 400
            assert "Invalid relationship types" in response.json()["detail"]
            
        finally:
            app.dependency_overrides.clear()
            
    def test_get_graph_visualization_parameter_validation(self, client, mock_user):
        """Test parameter validation"""
        from app.api import deps
        
        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        
        try:
            # Test depth out of range
            response = client.get("/api/v1/graph/visualization", params={"depth": 10})
            assert response.status_code == 422  # Validation error
            
            # Test limit out of range
            response = client.get("/api/v1/graph/visualization", params={"limit": 10000})
            assert response.status_code == 422  # Validation error
            
            # Test negative depth
            response = client.get("/api/v1/graph/visualization", params={"depth": 0})
            assert response.status_code == 422  # Validation error
            
        finally:
            app.dependency_overrides.clear()
            
    def test_get_graph_visualization_service_error(self, client, mock_user):
        """Test graph visualization with service error"""
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.side_effect = Exception("Database connection failed")
        
        from app.api import deps
        from app.db import graph
        
        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service
        
        try:
            response = client.get("/api/v1/graph/visualization")
            
            assert response.status_code == 500
            assert "Failed to retrieve graph visualization data" in response.json()["detail"]
            
        finally:
            app.dependency_overrides.clear()


class TestGraphVisualizationFormats:
    """Test specific formatting for react-flow and R3F"""
    
    def test_node_formatting_react_flow(self, client, mock_user):
        """Test that nodes are properly formatted for react-flow"""
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = {
            "nodes": [
                {
                    "id": "req-1",
                    "type": "requirement",
                    "label": "Test Requirement",
                    "status": "active",
                    "priority": 1,
                    "color": "#3B82F6",
                    "size": 60,
                    "reactFlow": {
                        "id": "req-1",
                        "type": "custom",
                        "position": {"x": 0, "y": 0},
                        "data": {
                            "label": "Test Requirement",
                            "type": "requirement",
                            "status": "active",
                            "priority": 1,
                            "color": "#3B82F6"
                        },
                        "style": {
                            "backgroundColor": "#3B82F6",
                            "color": "#FFFFFF",
                            "borderRadius": "8px"
                        }
                    }
                }
            ],
            "edges": [],
            "metadata": {"total_nodes": 1, "total_edges": 0}
        }
        
        from app.api import deps
        from app.db import graph
        
        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service
        
        try:
            response = client.get("/api/v1/graph/visualization")
            
            assert response.status_code == 200
            data = response.json()
            
            node = data["nodes"][0]
            react_flow = node["reactFlow"]
            
            # Verify react-flow specific formatting
            assert react_flow["type"] == "custom"
            assert "position" in react_flow
            assert "data" in react_flow
            assert "style" in react_flow
            assert react_flow["data"]["label"] == "Test Requirement"
            assert react_flow["style"]["backgroundColor"] == "#3B82F6"
            
        finally:
            app.dependency_overrides.clear()
            
    def test_node_formatting_r3f(self, client, mock_user):
        """Test that nodes are properly formatted for R3F"""
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = {
            "nodes": [
                {
                    "id": "req-1",
                    "type": "requirement",
                    "label": "Test Requirement",
                    "r3f": {
                        "id": "req-1",
                        "position": [0, 0, 0],
                        "type": "requirement",
                        "geometry": {
                            "type": "box",
                            "args": [1.2, 1.2, 1.2]
                        },
                        "material": {
                            "color": "#3B82F6",
                            "opacity": 0.8,
                            "transparent": True
                        },
                        "interactions": {
                            "hoverable": True,
                            "clickable": True,
                            "selectable": True
                        }
                    }
                }
            ],
            "edges": [],
            "metadata": {"total_nodes": 1, "total_edges": 0}
        }
        
        from app.api import deps
        from app.db import graph
        
        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service
        
        try:
            response = client.get("/api/v1/graph/visualization")
            
            assert response.status_code == 200
            data = response.json()
            
            node = data["nodes"][0]
            r3f = node["r3f"]
            
            # Verify R3F specific formatting
            assert r3f["position"] == [0, 0, 0]
            assert "geometry" in r3f
            assert "material" in r3f
            assert "interactions" in r3f
            assert r3f["geometry"]["type"] == "box"
            assert r3f["material"]["color"] == "#3B82F6"
            assert r3f["interactions"]["hoverable"] is True
            
        finally:
            app.dependency_overrides.clear()
            
    def test_edge_formatting_react_flow(self, client, mock_user):
        """Test that edges are properly formatted for react-flow"""
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = {
            "nodes": [],
            "edges": [
                {
                    "id": "req-1-test-1-TESTED_BY",
                    "source": "req-1",
                    "target": "test-1",
                    "type": "TESTED_BY",
                    "reactFlow": {
                        "id": "req-1-test-1-TESTED_BY",
                        "source": "req-1",
                        "target": "test-1",
                        "type": "smoothstep",
                        "animated": False,
                        "style": {
                            "stroke": "#F59E0B",
                            "strokeWidth": 2
                        },
                        "label": "Tested By",
                        "labelStyle": {
                            "fontSize": 10,
                            "fill": "#F59E0B"
                        }
                    }
                }
            ],
            "metadata": {"total_nodes": 0, "total_edges": 1}
        }
        
        from app.api import deps
        from app.db import graph
        
        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service
        
        try:
            response = client.get("/api/v1/graph/visualization")
            
            assert response.status_code == 200
            data = response.json()
            
            edge = data["edges"][0]
            react_flow = edge["reactFlow"]
            
            # Verify react-flow specific formatting
            assert react_flow["type"] == "smoothstep"
            assert react_flow["source"] == "req-1"
            assert react_flow["target"] == "test-1"
            assert "style" in react_flow
            assert "label" in react_flow
            assert react_flow["style"]["stroke"] == "#F59E0B"
            assert react_flow["label"] == "Tested By"
            
        finally:
            app.dependency_overrides.clear()


class TestGraphVisualizationPerformance:
    """Test performance aspects of graph visualization"""
    
    def test_large_graph_handling(self, client, mock_user):
        """Test handling of large graphs with performance optimizations"""
        # Create a large mock dataset
        large_nodes = [
            {
                "id": f"node-{i}",
                "type": "requirement" if i % 3 == 0 else "test" if i % 3 == 1 else "risk",
                "label": f"Node {i}",
                "reactFlow": {"id": f"node-{i}"},
                "r3f": {"id": f"node-{i}"}
            }
            for i in range(1000)
        ]
        
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = {
            "nodes": large_nodes,
            "edges": [],
            "metadata": {
                "total_nodes": 1000,
                "total_edges": 0,
                "depth": 2,
                "center_node": None,
                "truncated": True,
                "performance_stats": {
                    "query_limit_applied": 1000,
                    "depth_limit_applied": 2,
                    "nodes_filtered": 0
                }
            }
        }
        
        from app.api import deps
        from app.db import graph
        
        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service
        
        try:
            response = client.get("/api/v1/graph/visualization", params={"limit": 1000})
            
            assert response.status_code == 200
            data = response.json()
            
            # Should handle large dataset
            assert len(data["nodes"]) == 1000
            assert data["metadata"]["truncated"] is True
            assert "performance_stats" in data["metadata"]
            
        finally:
            app.dependency_overrides.clear()
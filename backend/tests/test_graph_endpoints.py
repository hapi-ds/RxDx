"""Integration tests for graph API endpoints"""

from unittest.mock import AsyncMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

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
        from app.db import graph

        # Mock the graph service (even though we won't reach it)
        mock_service = AsyncMock()

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

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
        from app.db import graph

        # Mock the graph service (even though we won't reach it)
        mock_service = AsyncMock()

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

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
        from app.db import graph

        # Mock the graph service (even though we won't reach it)
        mock_service = AsyncMock()

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

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



class TestGraphVisualizationResponseValidation:
    """Test API response validation for graph visualization endpoint

    Feature: fix-graph-visualization
    Tests the validation logic added in task 2.1
    """

    def test_response_validation_ensures_nodes_array(self, client, mock_user):
        """Test that response validation ensures nodes array exists"""
        # Mock service that returns response without nodes key
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = {
            "edges": [],
            "metadata": {"total_nodes": 0, "total_edges": 0}
        }

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.get("/api/v1/graph/visualization")

            assert response.status_code == 200
            data = response.json()

            # Validation should add nodes array
            assert "nodes" in data
            assert data["nodes"] == []

        finally:
            app.dependency_overrides.clear()

    def test_response_validation_ensures_edges_array(self, client, mock_user):
        """Test that response validation ensures edges array exists"""
        # Mock service that returns response without edges key
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = {
            "nodes": [],
            "metadata": {"total_nodes": 0, "total_edges": 0}
        }

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.get("/api/v1/graph/visualization")

            assert response.status_code == 200
            data = response.json()

            # Validation should add edges array
            assert "edges" in data
            assert data["edges"] == []

        finally:
            app.dependency_overrides.clear()

    def test_response_validation_ensures_metadata(self, client, mock_user):
        """Test that response validation ensures metadata exists"""
        # Mock service that returns response without metadata
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = {
            "nodes": [],
            "edges": []
        }

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.get("/api/v1/graph/visualization")

            assert response.status_code == 200
            data = response.json()

            # Validation should add metadata
            assert "metadata" in data
            assert "total_nodes" in data["metadata"]
            assert "total_edges" in data["metadata"]
            assert data["metadata"]["total_nodes"] == 0
            assert data["metadata"]["total_edges"] == 0

        finally:
            app.dependency_overrides.clear()

    def test_response_validation_adds_missing_metadata_fields(self, client, mock_user):
        """Test that validation adds missing metadata fields"""
        # Mock service that returns incomplete metadata
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = {
            "nodes": [{"id": "node-1"}],
            "edges": [{"id": "edge-1"}],
            "metadata": {
                "depth": 2,
                "center_node": None
                # Missing total_nodes and total_edges
            }
        }

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.get("/api/v1/graph/visualization")

            assert response.status_code == 200
            data = response.json()

            # Validation should add missing fields
            assert "total_nodes" in data["metadata"]
            assert "total_edges" in data["metadata"]
            assert data["metadata"]["total_nodes"] == 1
            assert data["metadata"]["total_edges"] == 1

        finally:
            app.dependency_overrides.clear()

    def test_response_validation_rejects_invalid_format(self, client, mock_user):
        """Test that validation rejects non-dict responses"""
        # Mock service that returns invalid format
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = "invalid response"

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.get("/api/v1/graph/visualization")

            # Should return 500 error for invalid format
            assert response.status_code == 500
            assert "Invalid graph data format" in response.json()["detail"]

        finally:
            app.dependency_overrides.clear()

    def test_response_validation_with_empty_graph(self, client, mock_user):
        """Test validation with completely empty graph"""
        # Mock service that returns minimal valid response
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = {}

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.get("/api/v1/graph/visualization")

            assert response.status_code == 200
            data = response.json()

            # All required fields should be present
            assert "nodes" in data
            assert "edges" in data
            assert "metadata" in data
            assert data["nodes"] == []
            assert data["edges"] == []
            assert data["metadata"]["total_nodes"] == 0
            assert data["metadata"]["total_edges"] == 0

        finally:
            app.dependency_overrides.clear()

    def test_response_validation_preserves_existing_data(self, client, mock_user):
        """Test that validation preserves existing valid data"""
        # Mock service that returns complete valid response
        mock_service = AsyncMock()
        mock_service.get_graph_for_visualization.return_value = {
            "nodes": [
                {"id": "node-1", "type": "requirement", "label": "Node 1"}
            ],
            "edges": [
                {"id": "edge-1", "source": "node-1", "target": "node-2"}
            ],
            "metadata": {
                "total_nodes": 1,
                "total_edges": 1,
                "depth": 2,
                "center_node": None,
                "truncated": False
            }
        }

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.get("/api/v1/graph/visualization")

            assert response.status_code == 200
            data = response.json()

            # All data should be preserved
            assert len(data["nodes"]) == 1
            assert len(data["edges"]) == 1
            assert data["metadata"]["total_nodes"] == 1
            assert data["metadata"]["total_edges"] == 1
            assert data["metadata"]["depth"] == 2
            assert data["metadata"]["truncated"] is False

        finally:
            app.dependency_overrides.clear()



class TestRelationshipEndpoints:
    """Test relationship CRUD endpoints"""

    def test_create_relationship_success(self, client, mock_user):
        """Test successful relationship creation"""
        mock_service = AsyncMock()
        mock_service.create_relationship.return_value = {
            "id": "rel-1",
            "source": "node-1",
            "target": "node-2",
            "type": "DEPENDS_ON",
            "properties": {}
        }

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.post(
                "/api/v1/graph/relationships",
                json={
                    "source_id": "node-1",
                    "target_id": "node-2",
                    "relationship_type": "DEPENDS_ON"
                }
            )

            assert response.status_code == 200
            data = response.json()

            assert data["id"] == "rel-1"
            assert data["source"] == "node-1"
            assert data["target"] == "node-2"
            assert data["type"] == "DEPENDS_ON"

            # Verify service was called correctly
            mock_service.create_relationship.assert_called_once_with(
                from_id="node-1",
                to_id="node-2",
                rel_type="DEPENDS_ON",
                properties=None
            )

        finally:
            app.dependency_overrides.clear()

    def test_create_relationship_with_properties(self, client, mock_user):
        """Test relationship creation with properties"""
        mock_service = AsyncMock()
        mock_service.create_relationship.return_value = {
            "id": "rel-1",
            "source": "node-1",
            "target": "node-2",
            "type": "DEPENDS_ON",
            "properties": {"weight": 5}
        }

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.post(
                "/api/v1/graph/relationships",
                json={
                    "source_id": "node-1",
                    "target_id": "node-2",
                    "relationship_type": "DEPENDS_ON",
                    "properties": {"weight": 5}
                }
            )

            assert response.status_code == 200
            data = response.json()

            assert data["properties"]["weight"] == 5

            # Verify service was called with properties
            mock_service.create_relationship.assert_called_once_with(
                from_id="node-1",
                to_id="node-2",
                rel_type="DEPENDS_ON",
                properties={"weight": 5}
            )

        finally:
            app.dependency_overrides.clear()

    def test_create_relationship_missing_fields(self, client, mock_user):
        """Test relationship creation with missing required fields"""
        from app.api import deps
        from app.db import graph

        mock_service = AsyncMock()

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            # Missing target_id
            response = client.post(
                "/api/v1/graph/relationships",
                json={
                    "source_id": "node-1",
                    "relationship_type": "DEPENDS_ON"
                }
            )

            assert response.status_code == 400
            assert "required" in response.json()["detail"].lower()

        finally:
            app.dependency_overrides.clear()

    def test_create_relationship_unauthorized(self, client):
        """Test relationship creation without authentication"""
        response = client.post(
            "/api/v1/graph/relationships",
            json={
                "source_id": "node-1",
                "target_id": "node-2",
                "relationship_type": "DEPENDS_ON"
            }
        )
        assert response.status_code == 401

    def test_update_relationship_success(self, client, mock_user):
        """Test successful relationship update"""
        mock_service = AsyncMock()
        mock_service.get_relationship.return_value = {
            "id": "rel-1",
            "source": "node-1",
            "target": "node-2",
            "type": "DEPENDS_ON"
        }
        mock_service.update_relationship.return_value = {
            "id": "rel-1",
            "source": "node-1",
            "target": "node-2",
            "type": "TESTED_BY"
        }

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.patch(
                "/api/v1/graph/relationships/rel-1",
                json={"type": "TESTED_BY"}
            )

            assert response.status_code == 200
            data = response.json()

            assert data["id"] == "rel-1"
            assert data["type"] == "TESTED_BY"

            # Verify service was called correctly
            mock_service.get_relationship.assert_called_once_with("rel-1")
            mock_service.update_relationship.assert_called_once_with(
                relationship_id="rel-1",
                new_type="TESTED_BY",
                properties=None
            )

        finally:
            app.dependency_overrides.clear()

    def test_update_relationship_not_found(self, client, mock_user):
        """Test updating non-existent relationship"""
        mock_service = AsyncMock()
        mock_service.get_relationship.return_value = None

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.patch(
                "/api/v1/graph/relationships/nonexistent",
                json={"type": "TESTED_BY"}
            )

            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

        finally:
            app.dependency_overrides.clear()

    def test_update_relationship_missing_type(self, client, mock_user):
        """Test updating relationship without type"""
        from app.api import deps
        from app.db import graph

        mock_service = AsyncMock()

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.patch(
                "/api/v1/graph/relationships/rel-1",
                json={}
            )

            assert response.status_code == 400
            assert "required" in response.json()["detail"].lower()

        finally:
            app.dependency_overrides.clear()

    def test_update_relationship_unauthorized(self, client):
        """Test relationship update without authentication"""
        response = client.patch(
            "/api/v1/graph/relationships/rel-1",
            json={"type": "TESTED_BY"}
        )
        assert response.status_code == 401

    def test_delete_relationship_success(self, client, mock_user):
        """Test successful relationship deletion"""
        mock_service = AsyncMock()
        mock_service.get_relationship.return_value = {
            "id": "rel-1",
            "source": "node-1",
            "target": "node-2",
            "type": "DEPENDS_ON"
        }
        mock_service.delete_relationship.return_value = True

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.delete("/api/v1/graph/relationships/rel-1")

            assert response.status_code == 200
            data = response.json()

            assert "message" in data
            assert "deleted successfully" in data["message"].lower()

            # Verify service was called correctly
            mock_service.get_relationship.assert_called_once_with("rel-1")
            mock_service.delete_relationship.assert_called_once_with("rel-1")

        finally:
            app.dependency_overrides.clear()

    def test_delete_relationship_not_found(self, client, mock_user):
        """Test deleting non-existent relationship"""
        mock_service = AsyncMock()
        mock_service.get_relationship.return_value = None

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.delete("/api/v1/graph/relationships/nonexistent")

            assert response.status_code == 404
            assert "not found" in response.json()["detail"].lower()

        finally:
            app.dependency_overrides.clear()

    def test_delete_relationship_unauthorized(self, client):
        """Test relationship deletion without authentication"""
        response = client.delete("/api/v1/graph/relationships/rel-1")
        assert response.status_code == 401

    def test_delete_relationship_service_error(self, client, mock_user):
        """Test relationship deletion with service error"""
        mock_service = AsyncMock()
        mock_service.get_relationship.return_value = {
            "id": "rel-1",
            "source": "node-1",
            "target": "node-2",
            "type": "DEPENDS_ON"
        }
        mock_service.delete_relationship.return_value = False

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.delete("/api/v1/graph/relationships/rel-1")

            assert response.status_code == 500
            assert "failed" in response.json()["detail"].lower()

        finally:
            app.dependency_overrides.clear()


class TestGraphSchemaEndpoint:
    """Test /api/v1/graph/schema endpoint"""

    def test_get_schema_success(self, client, mock_user):
        """Test successful schema retrieval"""
        mock_service = AsyncMock()
        mock_service.initialize_graph_schema.return_value = {
            "node_types": [
                "WorkItem", "Project", "Phase", "Workpackage", "Resource",
                "Company", "Department", "Milestone", "Sprint", "Backlog",
                "User", "Entity", "Document", "Failure"
            ],
            "relationship_types": [
                "TESTED_BY", "MITIGATES", "DEPENDS_ON", "IMPLEMENTS",
                "LEADS_TO", "RELATES_TO", "MENTIONED_IN", "REFERENCES",
                "NEXT_VERSION", "CREATED_BY", "ASSIGNED_TO", "PARENT_OF",
                "BELONGS_TO", "ALLOCATED_TO", "LINKED_TO_DEPARTMENT",
                "IN_BACKLOG", "ASSIGNED_TO_SPRINT", "has_risk",
                "implements", "BLOCKS"
            ]
        }

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.get("/api/v1/graph/schema")

            assert response.status_code == 200
            data = response.json()

            assert "node_types" in data
            assert "relationship_types" in data

            # Verify expected node types
            assert "WorkItem" in data["node_types"]
            assert "Project" in data["node_types"]
            assert "User" in data["node_types"]

            # Verify expected relationship types
            assert "TESTED_BY" in data["relationship_types"]
            assert "DEPENDS_ON" in data["relationship_types"]
            assert "IMPLEMENTS" in data["relationship_types"]

        finally:
            app.dependency_overrides.clear()

    def test_get_schema_unauthorized(self, client):
        """Test schema retrieval without authentication"""
        response = client.get("/api/v1/graph/schema")
        assert response.status_code == 401

    def test_get_schema_service_error(self, client, mock_user):
        """Test schema retrieval with service error"""
        mock_service = AsyncMock()
        mock_service.initialize_graph_schema.side_effect = Exception("Database error")

        from app.api import deps
        from app.db import graph

        app.dependency_overrides[deps.get_current_user] = lambda: mock_user
        app.dependency_overrides[graph.get_graph_service] = lambda: mock_service

        try:
            response = client.get("/api/v1/graph/schema")

            assert response.status_code == 500
            assert "Failed to retrieve graph schema" in response.json()["detail"]

        finally:
            app.dependency_overrides.clear()

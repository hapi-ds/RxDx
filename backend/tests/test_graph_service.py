"""Tests for GraphService"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.db.graph import GraphService


@pytest.fixture
def graph_service():
    """Create a GraphService instance for testing"""
    service = GraphService()
    service.pool = AsyncMock()
    return service


@pytest.fixture
def mock_connection():
    """Mock asyncpg connection"""
    conn = AsyncMock()
    return conn


class TestGraphService:
    """Test GraphService functionality"""

    @pytest.mark.asyncio
    async def test_create_workitem_node(self, graph_service):
        """Test creating a WorkItem node"""
        # Mock the create_node method
        graph_service.create_node = AsyncMock(return_value={
            "id": "test-id",
            "type": "requirement",
            "title": "Test Requirement",
            "status": "draft",
            "version": "1.0"
        })

        result = await graph_service.create_workitem_node(
            workitem_id="test-id",
            workitem_type="requirement",
            title="Test Requirement",
            description="Test description",
            status="draft",
            priority=1,
            created_by="user-123"
        )

        # Verify create_node was called with correct parameters
        graph_service.create_node.assert_called_once()
        call_args = graph_service.create_node.call_args

        assert call_args[0][0] == "WorkItem"  # label
        properties = call_args[0][1]  # properties

        assert properties["id"] == "test-id"
        assert properties["type"] == "requirement"
        assert properties["title"] == "Test Requirement"
        assert properties["description"] == "Test description"
        assert properties["status"] == "draft"
        assert properties["priority"] == 1
        assert properties["created_by"] == "user-123"
        assert "created_at" in properties
        assert "updated_at" in properties

    @pytest.mark.asyncio
    async def test_create_workitem_node_minimal(self, graph_service):
        """Test creating a WorkItem node with minimal parameters"""
        graph_service.create_node = AsyncMock(return_value={})

        await graph_service.create_workitem_node(
            workitem_id="test-id",
            workitem_type="task",
            title="Test Task"
        )

        call_args = graph_service.create_node.call_args
        properties = call_args[0][1]

        assert properties["id"] == "test-id"
        assert properties["type"] == "task"
        assert properties["title"] == "Test Task"
        assert properties["status"] == "draft"
        assert properties["version"] == "1.0"
        assert "description" not in properties
        assert "priority" not in properties

    @pytest.mark.asyncio
    async def test_get_workitem(self, graph_service):
        """Test retrieving a WorkItem by ID"""
        expected_workitem = {
            "id": "test-id",
            "type": "requirement",
            "title": "Test Requirement"
        }

        graph_service.execute_query = AsyncMock(return_value=[expected_workitem])

        result = await graph_service.get_workitem("test-id")

        assert result == expected_workitem
        graph_service.execute_query.assert_called_once_with(
            "MATCH (w:WorkItem {id: 'test-id'}) RETURN w"
        )

    @pytest.mark.asyncio
    async def test_get_workitem_not_found(self, graph_service):
        """Test retrieving a non-existent WorkItem"""
        graph_service.execute_query = AsyncMock(return_value=[])

        result = await graph_service.get_workitem("non-existent")

        assert result is None

    @pytest.mark.asyncio
    async def test_get_workitem_version(self, graph_service):
        """Test retrieving a specific version of a WorkItem"""
        expected_workitem = {
            "id": "test-id",
            "version": "1.2",
            "title": "Test Requirement v1.2"
        }

        graph_service.execute_query = AsyncMock(return_value=[expected_workitem])

        result = await graph_service.get_workitem_version("test-id", "1.2")

        assert result == expected_workitem
        graph_service.execute_query.assert_called_once_with(
            "MATCH (w:WorkItem {id: 'test-id', version: '1.2'}) RETURN w"
        )

    @pytest.mark.asyncio
    async def test_create_workitem_version(self, graph_service):
        """Test creating a new version of a WorkItem"""
        graph_service.create_node = AsyncMock(return_value={
            "id": "test-id",
            "version": "1.1",
            "title": "Updated Requirement"
        })

        original_data = {
            "id": "test-id",
            "type": "requirement",
            "title": "Original Requirement",
            "version": "1.0"
        }

        result = await graph_service.create_workitem_version(
            workitem_id="test-id",
            version="1.1",
            data=original_data,
            user_id="user-123",
            change_description="Updated title"
        )

        call_args = graph_service.create_node.call_args
        properties = call_args[0][1]

        assert properties["version"] == "1.1"
        assert properties["updated_by"] == "user-123"
        assert properties["change_description"] == "Updated title"
        assert "updated_at" in properties

    @pytest.mark.asyncio
    async def test_create_relationship(self, graph_service):
        """Test creating a relationship between nodes"""
        graph_service.execute_query = AsyncMock(return_value=[{"r": {"type": "TESTED_BY"}}])

        result = await graph_service.create_relationship(
            from_id="req-1",
            to_id="test-1",
            rel_type="TESTED_BY",
            properties={"created_at": "2024-01-01"}
        )

        expected_query = """
        MATCH (a {id: 'req-1'}), (b {id: 'test-1'})
        CREATE (a)-[r:TESTED_BY {created_at: '2024-01-01'}]->(b)
        RETURN r
        """

        graph_service.execute_query.assert_called_once()
        # Check that the query contains the essential parts
        actual_query = graph_service.execute_query.call_args[0][0]
        assert "req-1" in actual_query
        assert "test-1" in actual_query
        assert "TESTED_BY" in actual_query
        assert "created_at" in actual_query

    @pytest.mark.asyncio
    async def test_initialize_graph_schema(self, graph_service):
        """Test graph schema initialization"""
        # Mock execute_query to not be called since we removed index creation
        graph_service.execute_query = AsyncMock(return_value=[])

        result = await graph_service.initialize_graph_schema()

        assert "node_types" in result
        assert "relationship_types" in result

        # Check that expected node types are present
        expected_node_types = ["WorkItem", "Requirement", "Task", "Test", "Risk", "Failure"]
        for node_type in expected_node_types:
            assert node_type in result["node_types"]

        # Check that expected relationship types are present
        expected_rel_types = ["TESTED_BY", "MITIGATES", "DEPENDS_ON", "IMPLEMENTS"]
        for rel_type in expected_rel_types:
            assert rel_type in result["relationship_types"]

        # No index queries are executed in the current implementation
        assert graph_service.execute_query.call_count == 0

    def test_dict_to_cypher_props(self, graph_service):
        """Test converting Python dict to Cypher properties"""
        # Test empty dict
        assert graph_service._dict_to_cypher_props({}) == ""

        # Test string values
        props = {"name": "test", "status": "active"}
        result = graph_service._dict_to_cypher_props(props)
        assert "name: 'test'" in result
        assert "status: 'active'" in result

        # Test numeric values
        props = {"priority": 1, "score": 3.14}
        result = graph_service._dict_to_cypher_props(props)
        assert "priority: 1" in result
        assert "score: 3.14" in result

        # Test boolean values
        props = {"is_active": True, "is_deleted": False}
        result = graph_service._dict_to_cypher_props(props)
        assert "is_active: true" in result
        assert "is_deleted: false" in result

        # Test null values
        props = {"description": None}
        result = graph_service._dict_to_cypher_props(props)
        assert "description: null" in result

    def test_parse_agtype(self, graph_service):
        """Test parsing AGE agtype values"""
        # Test JSON string
        json_str = '{"id": "123", "name": "test"}'
        result = graph_service._parse_agtype(json_str)
        assert result == {"id": "123", "name": "test"}

        # Test invalid JSON
        invalid_json = "not json"
        result = graph_service._parse_agtype(invalid_json)
        assert result == {"value": "not json"}

        # Test non-string value
        dict_value = {"already": "parsed"}
        result = graph_service._parse_agtype(dict_value)
        assert result == dict_value


class TestGraphQueryMethods:
    """Test new graph query methods for task 4.2"""

    @pytest.mark.asyncio
    async def test_search_workitems_by_text(self, graph_service):
        """Test searching WorkItems by text"""
        expected_results = [
            {"id": "1", "title": "Test Requirement", "type": "requirement"},
            {"id": "2", "title": "Another Test", "type": "task"}
        ]

        graph_service.execute_query = AsyncMock(return_value=expected_results)

        result = await graph_service.search_workitems(search_text="test")

        assert result == expected_results

        # Verify query was called with correct parameters
        call_args = graph_service.execute_query.call_args[0][0]
        assert "toLower(w.title) CONTAINS 'test'" in call_args
        assert "toLower(w.description) CONTAINS 'test'" in call_args

    @pytest.mark.asyncio
    async def test_search_workitems_by_type(self, graph_service):
        """Test searching WorkItems by type"""
        expected_results = [
            {"id": "1", "title": "Requirement 1", "type": "requirement"}
        ]

        graph_service.execute_query = AsyncMock(return_value=expected_results)

        result = await graph_service.search_workitems(workitem_type="requirement")

        assert result == expected_results

        call_args = graph_service.execute_query.call_args[0][0]
        assert "w.type = 'requirement'" in call_args

    @pytest.mark.asyncio
    async def test_search_workitems_multiple_filters(self, graph_service):
        """Test searching WorkItems with multiple filters"""
        expected_results = [
            {"id": "1", "title": "Active Requirement", "type": "requirement", "status": "active"}
        ]

        graph_service.execute_query = AsyncMock(return_value=expected_results)

        result = await graph_service.search_workitems(
            search_text="requirement",
            workitem_type="requirement",
            status="active",
            assigned_to="user-123"
        )

        assert result == expected_results

        call_args = graph_service.execute_query.call_args[0][0]
        assert "w.type = 'requirement'" in call_args
        assert "w.status = 'active'" in call_args
        assert "w.assigned_to = 'user-123'" in call_args
        assert "toLower(w.title) CONTAINS 'requirement'" in call_args

    @pytest.mark.asyncio
    async def test_get_traceability_matrix(self, graph_service):
        """Test getting traceability matrix"""
        # Mock the three separate queries
        requirements_result = [
            {
                "r": {"id": "req-1", "title": "Requirement 1"},
                "tests": [{"id": "test-1", "title": "Test 1"}],
                "risks": [{"id": "risk-1", "title": "Risk 1"}]
            }
        ]

        tests_result = [
            {
                "t": {"id": "test-1", "title": "Test 1"},
                "requirements": [{"id": "req-1", "title": "Requirement 1"}]
            }
        ]

        risks_result = [
            {
                "risk": {"id": "risk-1", "title": "Risk 1"},
                "requirements": [{"id": "req-1", "title": "Requirement 1"}]
            }
        ]

        # Mock execute_query to return different results for each call
        graph_service.execute_query = AsyncMock(side_effect=[
            requirements_result,
            tests_result,
            risks_result
        ])

        result = await graph_service.get_traceability_matrix()

        assert "requirements" in result
        assert "tests" in result
        assert "risks" in result
        assert result["requirements"] == requirements_result
        assert result["tests"] == tests_result
        assert result["risks"] == risks_result

        # Verify three queries were made
        assert graph_service.execute_query.call_count == 3

    @pytest.mark.asyncio
    async def test_get_traceability_matrix_with_project_filter(self, graph_service):
        """Test getting traceability matrix with project filter"""
        graph_service.execute_query = AsyncMock(return_value=[])

        await graph_service.get_traceability_matrix(project_id="proj-123")

        # Verify all queries include project filter
        for call in graph_service.execute_query.call_args_list:
            query = call[0][0]
            assert "project_id = 'proj-123'" in query

    @pytest.mark.asyncio
    async def test_get_risk_chains_specific_risk(self, graph_service):
        """Test getting risk chains for specific risk"""
        expected_chains = [
            {
                "path": ["risk-1", "failure-1", "failure-2"],
                "probabilities": [0.3, 0.2],
                "chain_length": 2
            }
        ]

        graph_service.execute_query = AsyncMock(return_value=expected_chains)

        result = await graph_service.get_risk_chains(risk_id="risk-1")

        assert len(result) == 1
        assert result[0]["total_probability"] == 0.06  # 0.3 * 0.2

        call_args = graph_service.execute_query.call_args[0][0]
        assert "id: 'risk-1'" in call_args
        assert "LEADS_TO" in call_args

    @pytest.mark.asyncio
    async def test_get_risk_chains_all_risks(self, graph_service):
        """Test getting all risk chains"""
        expected_chains = [
            {
                "path": ["risk-1", "failure-1"],
                "probabilities": [0.5],
                "chain_length": 1,
                "start_risk_id": "risk-1"
            }
        ]

        graph_service.execute_query = AsyncMock(return_value=expected_chains)

        result = await graph_service.get_risk_chains()

        assert len(result) == 1
        assert result[0]["total_probability"] == 0.5
        assert result[0]["start_risk_id"] == "risk-1"

    def test_calculate_chain_probability(self, graph_service):
        """Test calculating chain probability"""
        # Test empty list
        assert graph_service._calculate_chain_probability([]) == 0.0

        # Test single probability
        assert graph_service._calculate_chain_probability([0.5]) == 0.5

        # Test multiple probabilities
        assert graph_service._calculate_chain_probability([0.3, 0.2, 0.5]) == 0.03

        # Test invalid probability (> 1)
        assert graph_service._calculate_chain_probability([0.3, 1.5]) == 0.0

        # Test invalid probability (< 0)
        assert graph_service._calculate_chain_probability([0.3, -0.1]) == 0.0

        # Test non-numeric probability
        assert graph_service._calculate_chain_probability([0.3, "invalid"]) == 0.0


class TestGraphTraversalProperties:
    """Property-based tests for graph traversal"""

    def test_search_text_escaping_property(self, graph_service):
        """Property: Search text with quotes should be properly escaped"""
        # Test various text inputs that could cause SQL injection
        test_cases = [
            "normal text",
            "text with 'quotes'",
            "text with \"double quotes\"",
            "text with '; DROP TABLE users; --",
            "text with \\ backslashes",
            ""
        ]

        for search_text in test_cases:
            # Mock execute_query to capture the query
            graph_service.execute_query = AsyncMock(return_value=[])

            # This should not raise an exception due to SQL injection
            try:
                import asyncio
                asyncio.run(graph_service.search_workitems(search_text=search_text))

                # Verify the query was called
                assert graph_service.execute_query.called

                # Verify quotes are escaped in the query
                call_args = graph_service.execute_query.call_args[0][0]
                if "'" in search_text:
                    # Should contain escaped quotes
                    escaped_text = search_text.replace("'", "\\'")
                    assert escaped_text.lower() in call_args.lower()

            except Exception as e:
                # Should only fail due to async context, not SQL injection
                assert "async" in str(e).lower() or "event loop" in str(e).lower()

    def test_probability_calculation_property(self, graph_service):
        """Property: Chain probability should always be between 0 and 1"""
        # Test various probability combinations
        test_cases = [
            [0.5, 0.3, 0.8],
            [1.0],
            [0.0, 0.5],
            [0.1, 0.2, 0.3, 0.4, 0.5],
            [0.9, 0.9, 0.9],
            []  # Empty case
        ]

        for probabilities in test_cases:
            result = graph_service._calculate_chain_probability(probabilities)
            if probabilities:  # Non-empty list
                assert 0.0 <= result <= 1.0
            else:  # Empty list should return 0
                assert result == 0.0

        # Test invalid probabilities
        invalid_cases = [
            [1.5],  # > 1
            [-0.1], # < 0
            [0.5, "invalid"], # Non-numeric
            [0.5, None] # None value
        ]

        for probabilities in invalid_cases:
            result = graph_service._calculate_chain_probability(probabilities)
            assert result == 0.0  # Should return 0 for invalid input

    def test_chain_length_property(self, graph_service):
        """Property: Risk chain depth should be respected"""
        # Test various depth values
        test_depths = [1, 2, 5, 10]

        for max_depth in test_depths:
            graph_service.execute_query = AsyncMock(return_value=[])

            try:
                import asyncio
                asyncio.run(graph_service.get_risk_chains(max_depth=max_depth))

                # Verify the query includes the correct depth limit
                call_args = graph_service.execute_query.call_args[0][0]
                assert f"*1..{max_depth}" in call_args

            except Exception as e:
                # Should only fail due to async context
                assert "async" in str(e).lower() or "event loop" in str(e).lower()


class TestGraphVisualizationMethods:
    """Test graph visualization methods for task 4.3"""

    @pytest.mark.asyncio
    async def test_get_graph_for_visualization_full_graph(self, graph_service):
        """Test getting full graph for visualization"""
        # Mock nodes and edges
        mock_nodes = [
            {"id": "req-1", "type": "requirement", "title": "Requirement 1"},
            {"id": "test-1", "type": "test", "title": "Test 1"}
        ]

        mock_edges = [
            {"start_id": "req-1", "end_id": "test-1", "type": "TESTED_BY"}
        ]

        # Mock the helper methods
        graph_service._get_full_graph = AsyncMock(return_value=(mock_nodes, mock_edges))
        graph_service._format_node_for_visualization = MagicMock(side_effect=lambda node: {
            "id": node["id"],
            "type": node["type"],
            "label": node["title"],
            "color": "#3B82F6",
            "size": 50,
            "properties": node,
            "reactFlow": {"id": node["id"], "type": "custom"},
            "r3f": {"id": node["id"], "position": [0, 0, 0]}
        })
        graph_service._format_edge_for_visualization = MagicMock(side_effect=lambda edge: {
            "id": f"{edge['start_id']}-{edge['end_id']}-{edge['type']}",
            "source": edge["start_id"],
            "target": edge["end_id"],
            "type": edge["type"],
            "color": "#F59E0B",
            "style": "solid",
            "properties": edge,
            "reactFlow": {"id": f"{edge['start_id']}-{edge['end_id']}", "source": edge["start_id"]},
            "r3f": {"id": f"{edge['start_id']}-{edge['end_id']}", "source": edge["start_id"]}
        })

        result = await graph_service.get_graph_for_visualization()

        assert "nodes" in result
        assert "edges" in result
        assert "metadata" in result

        assert len(result["nodes"]) == 2
        assert len(result["edges"]) == 1

        # Check metadata
        metadata = result["metadata"]
        assert metadata["total_nodes"] == 2
        assert metadata["total_edges"] == 1
        assert metadata["depth"] == 2
        assert metadata["center_node"] is None
        assert metadata["truncated"] is False

        # Verify helper methods were called
        graph_service._get_full_graph.assert_called_once_with(None, None, 1000)
        assert graph_service._format_node_for_visualization.call_count == 2
        assert graph_service._format_edge_for_visualization.call_count == 1

    @pytest.mark.asyncio
    async def test_get_graph_for_visualization_subgraph(self, graph_service):
        """Test getting subgraph around center node"""
        mock_nodes = [
            {"id": "center-1", "type": "requirement", "title": "Center Requirement"}
        ]
        mock_edges = []

        graph_service._get_subgraph_around_node = AsyncMock(return_value=(mock_nodes, mock_edges))
        graph_service._format_node_for_visualization = MagicMock(return_value={
            "id": "center-1", "type": "requirement", "label": "Center Requirement"
        })
        graph_service._format_edge_for_visualization = MagicMock()

        result = await graph_service.get_graph_for_visualization(
            center_node_id="center-1",
            depth=3,
            node_types=["requirement", "test"],
            relationship_types=["TESTED_BY"],
            limit=500
        )

        # Verify subgraph method was called with correct parameters
        graph_service._get_subgraph_around_node.assert_called_once_with(
            "center-1", 3, ["requirement", "test"], ["TESTED_BY"], 500
        )

        # Check metadata
        metadata = result["metadata"]
        assert metadata["center_node"] == "center-1"
        assert metadata["depth"] == 3

    @pytest.mark.asyncio
    async def test_get_subgraph_around_node(self, graph_service):
        """Test getting subgraph around a specific node"""
        # Mock center node
        center_node = {"id": "center-1", "type": "requirement", "title": "Center"}

        # Mock node query results (first query returns nodes)
        node_query_results = [
            {"id": "related-1", "type": "test", "title": "Related Test", "properties": {"id": "related-1"}}
        ]

        # Mock relationship query results (second query returns relationships)
        rel_query_results = [
            {
                "rel": {"type": "TESTED_BY", "properties": {}},
                "start_id": "center-1",
                "end_id": "related-1",
                "rel_type": "TESTED_BY"
            }
        ]

        graph_service.get_node = AsyncMock(return_value=center_node)
        # execute_query is called twice: once for nodes, once for relationships
        graph_service.execute_query = AsyncMock(side_effect=[node_query_results, rel_query_results])

        nodes, edges = await graph_service._get_subgraph_around_node(
            center_node_id="center-1",
            depth=2,
            node_types=["requirement", "test"],
            relationship_types=["TESTED_BY"],
            limit=100
        )

        # Should include center node plus related nodes
        assert len(nodes) == 2  # center + related
        assert len(edges) == 1

        # Verify center node is included
        center_found = any(node.get("id") == "center-1" for node in nodes)
        assert center_found

        # Verify first query was called with correct filters (node query)
        first_call_args = graph_service.execute_query.call_args_list[0][0][0]
        assert "center-1" in first_call_args
        assert ":TESTED_BY" in first_call_args
        assert "n:requirement OR n:test" in first_call_args
        assert "*1..2" in first_call_args
        assert "LIMIT 100" in first_call_args

    @pytest.mark.asyncio
    async def test_get_full_graph(self, graph_service):
        """Test getting full graph with filters"""
        # Mock node query results
        node_results = [
            {"id": "node-1", "type": "requirement"},
            {"id": "node-2", "type": "test"}
        ]

        # Mock relationship query results - new format with map return
        rel_results = [
            {
                "rel": {"type": "TESTED_BY", "properties": {}},
                "start_id": "node-1",
                "end_id": "node-2",
                "rel_type": "TESTED_BY"
            }
        ]

        graph_service.execute_query = AsyncMock(side_effect=[node_results, rel_results])

        nodes, edges = await graph_service._get_full_graph(
            node_types=["requirement", "test"],
            relationship_types=["TESTED_BY"],
            limit=100
        )

        assert len(nodes) == 2
        assert len(edges) == 1

        # Verify two queries were made
        assert graph_service.execute_query.call_count == 2

        # Check node query
        node_query = graph_service.execute_query.call_args_list[0][0][0]
        assert "n:requirement OR n:test" in node_query
        assert "LIMIT 100" in node_query

        # Check relationship query
        rel_query = graph_service.execute_query.call_args_list[1][0][0]
        assert "r:TESTED_BY" in rel_query
        assert "LIMIT 200" in rel_query  # limit * 2

    def test_format_node_for_visualization(self, graph_service):
        """Test formatting node for visualization libraries"""
        node = {
            "id": "req-1",
            "type": "requirement",
            "title": "Test Requirement",
            "description": "Test description",
            "status": "active",
            "priority": 3  # Default priority
        }

        result = graph_service._format_node_for_visualization(node)

        # Check basic properties
        assert result["id"] == "req-1"
        assert result["type"] == "requirement"
        assert result["label"] == "Test Requirement"
        assert result["status"] == "active"
        assert result["priority"] == 3
        assert result["description"] == "Test description"
        assert result["color"] == "#3B82F6"  # Blue for active requirements
        assert result["size"] == 80  # Base size 50 * (1 + (6-3)*0.2) = 50 * 1.6 = 80
        assert result["properties"] == node

        # Check react-flow format
        react_flow = result["reactFlow"]
        assert react_flow["id"] == "req-1"
        assert react_flow["type"] == "custom"
        assert "position" in react_flow
        assert react_flow["data"]["label"] == "Test Requirement"
        assert react_flow["data"]["type"] == "requirement"
        assert react_flow["data"]["status"] == "active"
        assert react_flow["data"]["priority"] == 3

        # Check R3F format
        r3f = result["r3f"]
        assert r3f["id"] == "req-1"
        assert r3f["position"] == [0, 0, 0]
        assert r3f["type"] == "requirement"
        assert r3f["label"] == "Test Requirement"
        assert r3f["status"] == "active"
        assert r3f["priority"] == 3

    def test_format_node_colors_by_type(self, graph_service):
        """Test that different node types get different colors"""
        # Test with default status (draft) - nodes without status get draft colors
        test_cases = [
            ("requirement", "#93C5FD"),  # Blue (draft)
            ("task", "#6EE7B7"),         # Green (draft)
            ("test", "#FCD34D"),         # Amber (draft)
            ("risk", "#FCA5A5"),         # Red (draft)
            ("document", "#C4B5FD"),     # Purple (draft)
            ("failure", "#FCA5A5"),      # Dark red (draft)
            ("entity", "#9CA3AF"),       # Gray (draft)
            ("user", "#67E8F9"),         # Cyan (draft)
            ("unknown", "#9CA3AF")       # Default gray (draft)
        ]

        for node_type, expected_color in test_cases:
            node = {"id": "test", "type": node_type, "title": "Test"}
            result = graph_service._format_node_for_visualization(node)
            assert result["color"] == expected_color

    def test_format_edge_for_visualization(self, graph_service):
        """Test formatting edge for visualization libraries"""
        edge = {
            "start_id": "req-1",
            "end_id": "test-1",
            "type": "TESTED_BY",
            "properties": {"created_at": "2024-01-01"}
        }

        result = graph_service._format_edge_for_visualization(edge)

        # Check basic properties
        assert result["id"] == "req-1-test-1-TESTED_BY"
        assert result["source"] == "req-1"
        assert result["target"] == "test-1"
        assert result["type"] == "TESTED_BY"
        assert result["color"] == "#F59E0B"  # Amber for TESTED_BY
        assert result["style"] == "solid"

        # Check react-flow format
        react_flow = result["reactFlow"]
        assert react_flow["id"] == "req-1-test-1-TESTED_BY"
        assert react_flow["source"] == "req-1"
        assert react_flow["target"] == "test-1"
        assert react_flow["type"] == "smoothstep"
        assert react_flow["label"] == "Tested By"

        # Check R3F format
        r3f = result["r3f"]
        assert r3f["source"] == "req-1"
        assert r3f["target"] == "test-1"
        assert r3f["type"] == "TESTED_BY"

    def test_format_edge_styles_by_type(self, graph_service):
        """Test that different edge types get different styles"""
        test_cases = [
            ("TESTED_BY", "#F59E0B", "solid", False),
            ("MITIGATES", "#EF4444", "dashed", False),
            ("DEPENDS_ON", "#6B7280", "solid", False),
            ("IMPLEMENTS", "#10B981", "solid", False),
            ("LEADS_TO", "#DC2626", "dotted", True),  # Animated
            ("NEXT_VERSION", "#3B82F6", "dashed", True),  # Animated
            ("RELATES_TO", "#8B5CF6", "solid", False),
            ("UNKNOWN_TYPE", "#6B7280", "solid", False)  # Default
        ]

        for edge_type, expected_color, expected_style, expected_animated in test_cases:
            edge = {
                "start_id": "a",
                "end_id": "b",
                "type": edge_type
            }

            result = graph_service._format_edge_for_visualization(edge)

            assert result["color"] == expected_color
            assert result["style"] == expected_style

            # Check animation in react-flow format
            react_flow = result["reactFlow"]
            assert react_flow["animated"] == expected_animated

            # Check stroke dash array for dashed/dotted lines
            if expected_style == "dashed":
                assert react_flow["style"]["strokeDasharray"] == "5,5"
            elif expected_style == "dotted":
                assert react_flow["style"]["strokeDasharray"] == "2,2"
            else:
                assert react_flow["style"]["strokeDasharray"] is None


class TestGraphServiceIntegration:
    """Integration tests for GraphService (require actual database)"""

    @pytest.mark.asyncio
    @pytest.mark.integration
    async def test_full_workitem_lifecycle(self):
        """Test complete WorkItem lifecycle with real database"""
        # This test would require a real database connection
        # Skip for unit tests, but useful for integration testing
        pytest.skip("Integration test - requires database")

        service = GraphService()
        await service.connect()

        try:
            # Create WorkItem
            workitem_id = str(uuid4())
            workitem = await service.create_workitem_node(
                workitem_id=workitem_id,
                workitem_type="requirement",
                title="Integration Test Requirement",
                description="Test description",
                created_by="test-user"
            )

            assert workitem["id"] == workitem_id

            # Retrieve WorkItem
            retrieved = await service.get_workitem(workitem_id)
            assert retrieved["title"] == "Integration Test Requirement"

            # Create new version
            new_version = await service.create_workitem_version(
                workitem_id=workitem_id,
                version="1.1",
                data={**retrieved, "title": "Updated Requirement"},
                user_id="test-user",
                change_description="Updated title"
            )

            assert new_version["version"] == "1.1"

            # Clean up
            await service.delete_node(workitem_id)

        finally:
            await service.close()


class TestBackendNodeFormattingResilience:
    """Property-based tests for backend node formatting resilience

    Feature: fix-graph-visualization, Property 4: Backend Node Formatting Resilience
    **Validates: Requirements 2.2, 2.4**
    """

    def test_format_node_with_none_input(self, graph_service):
        """Property: Formatting None node should return None without exception"""
        result = graph_service._format_node_for_visualization(None)
        assert result is None

    def test_format_node_with_empty_dict(self, graph_service):
        """Property: Formatting empty dict should provide default values"""
        result = graph_service._format_node_for_visualization({})

        # Should not be None - should have defaults
        assert result is not None
        assert "id" in result
        assert "type" in result
        assert result["type"] == "default"
        assert "label" in result
        assert "status" in result
        assert result["status"] == "draft"
        assert "priority" in result
        assert result["priority"] == 3

    def test_format_node_with_missing_id(self, graph_service):
        """Property: Node without id should get generated UUID"""
        node = {"type": "requirement", "title": "Test"}
        result = graph_service._format_node_for_visualization(node)

        assert result is not None
        assert "id" in result
        assert len(result["id"]) > 0  # Should have generated ID

    def test_format_node_with_missing_type(self, graph_service):
        """Property: Node without type should get default type"""
        node = {"id": "test-1", "title": "Test"}
        result = graph_service._format_node_for_visualization(node)

        assert result is not None
        assert result["type"] == "default"

    def test_format_node_with_missing_title(self, graph_service):
        """Property: Node without title should get generated label"""
        node = {"id": "test-1", "type": "requirement"}
        result = graph_service._format_node_for_visualization(node)

        assert result is not None
        assert "label" in result
        assert len(result["label"]) > 0
        assert "requirement" in result["label"].lower()

    def test_format_node_with_missing_status(self, graph_service):
        """Property: Node without status should get default status"""
        node = {"id": "test-1", "type": "requirement", "title": "Test"}
        result = graph_service._format_node_for_visualization(node)

        assert result is not None
        assert result["status"] == "draft"

    def test_format_node_with_missing_priority(self, graph_service):
        """Property: Node without priority should get default priority"""
        node = {"id": "test-1", "type": "requirement", "title": "Test"}
        result = graph_service._format_node_for_visualization(node)

        assert result is not None
        assert result["priority"] == 3

    def test_format_node_with_missing_description(self, graph_service):
        """Property: Node without description should get empty string"""
        node = {"id": "test-1", "type": "requirement", "title": "Test"}
        result = graph_service._format_node_for_visualization(node)

        assert result is not None
        assert result["description"] == ""

    def test_format_node_with_null_properties(self, graph_service):
        """Property: Node with null property values should handle gracefully"""
        node = {
            "id": "test-1",
            "type": None,
            "title": None,
            "status": None,
            "priority": None,
            "description": None
        }
        result = graph_service._format_node_for_visualization(node)

        assert result is not None
        assert result["id"] == "test-1"
        assert result["type"] == "default"  # Fallback
        assert len(result["label"]) > 0  # Generated label
        assert result["status"] == "draft"  # Default
        assert result["priority"] == 3  # Default
        assert result["description"] == ""  # Default

    def test_format_node_with_properties_nested(self, graph_service):
        """Property: Node with nested properties dict should extract correctly"""
        node = {
            "properties": {
                "id": "test-1",
                "type": "requirement",
                "title": "Test Requirement",
                "status": "active",
                "priority": 2
            }
        }
        result = graph_service._format_node_for_visualization(node)

        assert result is not None
        assert result["id"] == "test-1"
        assert result["type"] == "requirement"
        assert result["label"] == "Test Requirement"
        assert result["status"] == "active"
        assert result["priority"] == 2

    def test_format_node_always_has_reactflow_data(self, graph_service):
        """Property: All formatted nodes must have reactFlow data"""
        test_nodes = [
            {},
            {"id": "test-1"},
            {"id": "test-1", "type": "requirement"},
            {"id": "test-1", "type": "requirement", "title": "Test"},
            {"properties": {"id": "test-2", "type": "task"}},
        ]

        for node in test_nodes:
            result = graph_service._format_node_for_visualization(node)
            if result is not None:  # Skip None results
                assert "reactFlow" in result
                assert "id" in result["reactFlow"]
                assert "type" in result["reactFlow"]
                assert "position" in result["reactFlow"]
                assert "data" in result["reactFlow"]

    def test_format_node_always_has_r3f_data(self, graph_service):
        """Property: All formatted nodes must have r3f data"""
        test_nodes = [
            {},
            {"id": "test-1"},
            {"id": "test-1", "type": "requirement"},
            {"id": "test-1", "type": "requirement", "title": "Test"},
            {"properties": {"id": "test-2", "type": "task"}},
        ]

        for node in test_nodes:
            result = graph_service._format_node_for_visualization(node)
            if result is not None:  # Skip None results
                assert "r3f" in result
                assert "id" in result["r3f"]
                assert "position" in result["r3f"]
                assert "type" in result["r3f"]
                assert "label" in result["r3f"]
                assert isinstance(result["r3f"]["position"], list)
                assert len(result["r3f"]["position"]) == 3


class TestBackendEdgeFormattingResilience:
    """Property-based tests for backend edge formatting resilience

    Feature: fix-graph-visualization, Property 4: Backend Node Formatting Resilience (edges)
    **Validates: Requirements 2.2, 2.4**
    """

    def test_format_edge_with_none_input(self, graph_service):
        """Property: Formatting None edge should return None without exception"""
        result = graph_service._format_edge_for_visualization(None)
        assert result is None

    def test_format_edge_with_empty_dict(self, graph_service):
        """Property: Formatting empty dict should return None (missing required fields)"""
        result = graph_service._format_edge_for_visualization({})
        assert result is None  # Cannot create edge without source/target

    def test_format_edge_with_missing_source(self, graph_service):
        """Property: Edge without source should return None"""
        edge = {"end_id": "target-1", "type": "TESTED_BY"}
        result = graph_service._format_edge_for_visualization(edge)
        assert result is None

    def test_format_edge_with_missing_target(self, graph_service):
        """Property: Edge without target should return None"""
        edge = {"start_id": "source-1", "type": "TESTED_BY"}
        result = graph_service._format_edge_for_visualization(edge)
        assert result is None

    def test_format_edge_with_missing_type(self, graph_service):
        """Property: Edge without type should get default type"""
        edge = {"start_id": "source-1", "end_id": "target-1"}
        result = graph_service._format_edge_for_visualization(edge)

        assert result is not None
        assert result["type"] == "RELATED"  # Default type

    def test_format_edge_with_null_properties(self, graph_service):
        """Property: Edge with null property values should handle gracefully"""
        edge = {
            "start_id": "source-1",
            "end_id": "target-1",
            "type": None
        }
        result = graph_service._format_edge_for_visualization(edge)

        assert result is not None
        assert result["source"] == "source-1"
        assert result["target"] == "target-1"
        assert result["type"] == "RELATED"  # Default

    def test_format_edge_with_properties_nested(self, graph_service):
        """Property: Edge with nested properties dict should extract correctly"""
        edge = {
            "start_id": "source-1",
            "end_id": "target-1",
            "properties": {
                "type": "TESTED_BY",
                "created_at": "2024-01-01"
            }
        }
        result = graph_service._format_edge_for_visualization(edge)

        # Should work because start_id/end_id are at top level
        assert result is not None
        assert result["source"] == "source-1"
        assert result["target"] == "target-1"
        # Type comes from top level or properties
        assert result["type"] in ["TESTED_BY", "RELATED"]

    def test_format_edge_always_has_reactflow_data(self, graph_service):
        """Property: All formatted edges must have reactFlow data"""
        test_edges = [
            {"start_id": "a", "end_id": "b"},
            {"start_id": "a", "end_id": "b", "type": "TESTED_BY"},
            {"start_id": "a", "end_id": "b", "type": "MITIGATES"},
        ]

        for edge in test_edges:
            result = graph_service._format_edge_for_visualization(edge)
            if result is not None:
                assert "reactFlow" in result
                assert "id" in result["reactFlow"]
                assert "source" in result["reactFlow"]
                assert "target" in result["reactFlow"]
                assert "type" in result["reactFlow"]

    def test_format_edge_always_has_r3f_data(self, graph_service):
        """Property: All formatted edges must have r3f data"""
        test_edges = [
            {"start_id": "a", "end_id": "b"},
            {"start_id": "a", "end_id": "b", "type": "TESTED_BY"},
            {"start_id": "a", "end_id": "b", "type": "DEPENDS_ON"},
        ]

        for edge in test_edges:
            result = graph_service._format_edge_for_visualization(edge)
            if result is not None:
                assert "r3f" in result
                assert "id" in result["r3f"]
                assert "source" in result["r3f"]
                assert "target" in result["r3f"]
                assert "type" in result["r3f"]



class TestBackendVisualizationFormat:
    """Property-based tests for backend visualization format

    Feature: fix-graph-visualization, Property 5: Backend Node Visualization Format
    **Validates: Requirements 1.6**
    """

    def test_all_nodes_have_reactflow_properties(self, graph_service):
        """Property: All nodes must have properly formatted reactFlow properties"""
        test_nodes = [
            {"id": "req-1", "type": "requirement", "title": "Requirement 1"},
            {"id": "task-1", "type": "task", "title": "Task 1", "status": "active"},
            {"id": "test-1", "type": "test", "title": "Test 1", "priority": 1},
            {"id": "risk-1", "type": "risk", "title": "Risk 1", "status": "draft"},
        ]

        for node in test_nodes:
            result = graph_service._format_node_for_visualization(node)
            assert result is not None

            # Must have reactFlow property
            assert "reactFlow" in result
            react_flow = result["reactFlow"]

            # Must have required reactFlow fields
            assert "id" in react_flow
            assert "type" in react_flow
            assert "position" in react_flow
            assert "data" in react_flow

            # Position must be a dict with x and y
            assert isinstance(react_flow["position"], dict)
            assert "x" in react_flow["position"]
            assert "y" in react_flow["position"]
            assert isinstance(react_flow["position"]["x"], (int, float))
            assert isinstance(react_flow["position"]["y"], (int, float))

            # Data must contain visualization metadata
            assert "label" in react_flow["data"]
            assert "type" in react_flow["data"]
            assert "status" in react_flow["data"]
            assert "priority" in react_flow["data"]
            assert "color" in react_flow["data"]
            assert "size" in react_flow["data"]

    def test_all_nodes_have_r3f_properties(self, graph_service):
        """Property: All nodes must have properly formatted r3f properties"""
        test_nodes = [
            {"id": "req-1", "type": "requirement", "title": "Requirement 1"},
            {"id": "task-1", "type": "task", "title": "Task 1", "status": "active"},
            {"id": "test-1", "type": "test", "title": "Test 1", "priority": 1},
            {"id": "risk-1", "type": "risk", "title": "Risk 1", "status": "draft"},
        ]

        for node in test_nodes:
            result = graph_service._format_node_for_visualization(node)
            assert result is not None

            # Must have r3f property
            assert "r3f" in result
            r3f = result["r3f"]

            # Must have required r3f fields
            assert "id" in r3f
            assert "position" in r3f
            assert "type" in r3f
            assert "label" in r3f

            # Position must be a list with 3 coordinates [x, y, z]
            assert isinstance(r3f["position"], list)
            assert len(r3f["position"]) == 3
            for coord in r3f["position"]:
                assert isinstance(coord, (int, float))

            # Must have visualization metadata
            assert "status" in r3f
            assert "priority" in r3f
            assert "color" in r3f
            assert "size" in r3f
            assert "geometry" in r3f
            assert "material" in r3f

    def test_reactflow_position_is_valid(self, graph_service):
        """Property: ReactFlow position must be valid coordinates"""
        test_nodes = [
            {"id": f"node-{i}", "type": "requirement", "title": f"Node {i}"}
            for i in range(10)
        ]

        for node in test_nodes:
            result = graph_service._format_node_for_visualization(node)
            assert result is not None

            position = result["reactFlow"]["position"]
            # Position should be numeric (even if 0,0 default)
            assert isinstance(position["x"], (int, float))
            assert isinstance(position["y"], (int, float))
            # Should be finite numbers
            assert not (position["x"] == float('inf') or position["x"] == float('-inf'))
            assert not (position["y"] == float('inf') or position["y"] == float('-inf'))

    def test_r3f_position_is_valid_3d(self, graph_service):
        """Property: R3F position must be valid 3D coordinates"""
        test_nodes = [
            {"id": f"node-{i}", "type": "task", "title": f"Node {i}"}
            for i in range(10)
        ]

        for node in test_nodes:
            result = graph_service._format_node_for_visualization(node)
            assert result is not None

            position = result["r3f"]["position"]
            # Must be exactly 3 coordinates
            assert len(position) == 3
            # All must be numeric
            for coord in position:
                assert isinstance(coord, (int, float))
                # Should be finite numbers
                assert not (coord == float('inf') or coord == float('-inf'))

    def test_node_colors_are_valid_hex(self, graph_service):
        """Property: Node colors must be valid hex color codes"""
        test_nodes = [
            {"id": "req-1", "type": "requirement", "title": "Req", "status": "active"},
            {"id": "task-1", "type": "task", "title": "Task", "status": "draft"},
            {"id": "test-1", "type": "test", "title": "Test", "status": "completed"},
            {"id": "risk-1", "type": "risk", "title": "Risk", "status": "archived"},
        ]

        import re
        hex_pattern = re.compile(r'^#[0-9A-Fa-f]{6}$')

        for node in test_nodes:
            result = graph_service._format_node_for_visualization(node)
            assert result is not None

            # Check main color
            assert hex_pattern.match(result["color"])

            # Check reactFlow color
            assert hex_pattern.match(result["reactFlow"]["data"]["color"])

            # Check r3f color
            assert hex_pattern.match(result["r3f"]["color"])

    def test_node_sizes_are_positive(self, graph_service):
        """Property: Node sizes must be positive numbers"""
        test_nodes = [
            {"id": f"node-{i}", "type": "requirement", "title": f"Node {i}", "priority": i % 5 + 1}
            for i in range(10)
        ]

        for node in test_nodes:
            result = graph_service._format_node_for_visualization(node)
            assert result is not None

            # Main size must be positive
            assert result["size"] > 0
            assert isinstance(result["size"], (int, float))

            # R3F size must be positive
            assert result["r3f"]["size"] > 0
            assert isinstance(result["r3f"]["size"], (int, float))

    def test_all_edges_have_reactflow_properties(self, graph_service):
        """Property: All edges must have properly formatted reactFlow properties"""
        test_edges = [
            {"start_id": "a", "end_id": "b", "type": "TESTED_BY"},
            {"start_id": "c", "end_id": "d", "type": "MITIGATES"},
            {"start_id": "e", "end_id": "f", "type": "DEPENDS_ON"},
        ]

        for edge in test_edges:
            result = graph_service._format_edge_for_visualization(edge)
            assert result is not None

            # Must have reactFlow property
            assert "reactFlow" in result
            react_flow = result["reactFlow"]

            # Must have required reactFlow fields
            assert "id" in react_flow
            assert "source" in react_flow
            assert "target" in react_flow
            assert "type" in react_flow
            assert "label" in react_flow
            assert "style" in react_flow

            # Source and target must match original
            assert react_flow["source"] == edge["start_id"]
            assert react_flow["target"] == edge["end_id"]

    def test_all_edges_have_r3f_properties(self, graph_service):
        """Property: All edges must have properly formatted r3f properties"""
        test_edges = [
            {"start_id": "a", "end_id": "b", "type": "TESTED_BY"},
            {"start_id": "c", "end_id": "d", "type": "IMPLEMENTS"},
            {"start_id": "e", "end_id": "f", "type": "RELATES_TO"},
        ]

        for edge in test_edges:
            result = graph_service._format_edge_for_visualization(edge)
            assert result is not None

            # Must have r3f property
            assert "r3f" in result
            r3f = result["r3f"]

            # Must have required r3f fields
            assert "id" in r3f
            assert "source" in r3f
            assert "target" in r3f
            assert "type" in r3f
            assert "label" in r3f
            assert "color" in r3f
            assert "geometry" in r3f
            assert "material" in r3f

            # Source and target must match original
            assert r3f["source"] == edge["start_id"]
            assert r3f["target"] == edge["end_id"]

    def test_edge_colors_are_valid_hex(self, graph_service):
        """Property: Edge colors must be valid hex color codes"""
        test_edges = [
            {"start_id": "a", "end_id": "b", "type": "TESTED_BY"},
            {"start_id": "c", "end_id": "d", "type": "MITIGATES"},
            {"start_id": "e", "end_id": "f", "type": "LEADS_TO"},
        ]

        import re
        hex_pattern = re.compile(r'^#[0-9A-Fa-f]{6}$')

        for edge in test_edges:
            result = graph_service._format_edge_for_visualization(edge)
            assert result is not None

            # Check main color
            assert hex_pattern.match(result["color"])

            # Check r3f color
            assert hex_pattern.match(result["r3f"]["color"])

    def test_visualization_format_consistency(self, graph_service):
        """Property: Same node formatted multiple times should produce consistent results"""
        node = {"id": "test-1", "type": "requirement", "title": "Test", "status": "active", "priority": 2}

        # Format the same node multiple times
        results = [graph_service._format_node_for_visualization(node) for _ in range(5)]

        # All results should be identical
        first = results[0]
        for result in results[1:]:
            assert result["id"] == first["id"]
            assert result["type"] == first["type"]
            assert result["label"] == first["label"]
            assert result["color"] == first["color"]
            assert result["size"] == first["size"]
            assert result["status"] == first["status"]
            assert result["priority"] == first["priority"]



class TestAPIResponseStructure:
    """Property-based tests for API response structure completeness

    Feature: fix-graph-visualization, Property 1: API Response Structure Completeness
    **Validates: Requirements 7.1, 7.2, 7.3**
    """

    @pytest.mark.asyncio
    async def test_api_response_has_nodes_array(self, graph_service):
        """Property: API response must always include a nodes array"""
        # Mock empty graph
        graph_service._get_full_graph = AsyncMock(return_value=([], []))
        graph_service._format_node_for_visualization = MagicMock()
        graph_service._format_edge_for_visualization = MagicMock()

        result = await graph_service.get_graph_for_visualization()

        assert "nodes" in result
        assert isinstance(result["nodes"], list)

    @pytest.mark.asyncio
    async def test_api_response_has_edges_array(self, graph_service):
        """Property: API response must always include an edges array"""
        # Mock empty graph
        graph_service._get_full_graph = AsyncMock(return_value=([], []))
        graph_service._format_node_for_visualization = MagicMock()
        graph_service._format_edge_for_visualization = MagicMock()

        result = await graph_service.get_graph_for_visualization()

        assert "edges" in result
        assert isinstance(result["edges"], list)

    @pytest.mark.asyncio
    async def test_api_response_has_metadata(self, graph_service):
        """Property: API response must always include metadata"""
        # Mock empty graph
        graph_service._get_full_graph = AsyncMock(return_value=([], []))
        graph_service._format_node_for_visualization = MagicMock()
        graph_service._format_edge_for_visualization = MagicMock()

        result = await graph_service.get_graph_for_visualization()

        assert "metadata" in result
        assert isinstance(result["metadata"], dict)

    @pytest.mark.asyncio
    async def test_metadata_has_total_nodes(self, graph_service):
        """Property: Metadata must include total_nodes count"""
        # Mock graph with some nodes
        mock_nodes = [
            {"id": "node-1", "type": "requirement", "title": "Node 1"},
            {"id": "node-2", "type": "task", "title": "Node 2"}
        ]
        graph_service._get_full_graph = AsyncMock(return_value=(mock_nodes, []))
        graph_service._format_node_for_visualization = MagicMock(side_effect=lambda n: {
            "id": n["id"], "type": n["type"], "label": n["title"]
        })
        graph_service._format_edge_for_visualization = MagicMock()

        result = await graph_service.get_graph_for_visualization()

        assert "total_nodes" in result["metadata"]
        assert isinstance(result["metadata"]["total_nodes"], int)
        assert result["metadata"]["total_nodes"] == 2

    @pytest.mark.asyncio
    async def test_metadata_has_total_edges(self, graph_service):
        """Property: Metadata must include total_edges count"""
        # Mock graph with edges
        mock_edges = [
            {"start_id": "a", "end_id": "b", "type": "TESTED_BY"}
        ]
        graph_service._get_full_graph = AsyncMock(return_value=([], mock_edges))
        graph_service._format_node_for_visualization = MagicMock()
        graph_service._format_edge_for_visualization = MagicMock(side_effect=lambda e: {
            "id": f"{e['start_id']}-{e['end_id']}", "source": e["start_id"], "target": e["end_id"]
        })

        result = await graph_service.get_graph_for_visualization()

        assert "total_edges" in result["metadata"]
        assert isinstance(result["metadata"]["total_edges"], int)
        assert result["metadata"]["total_edges"] == 1

    @pytest.mark.asyncio
    async def test_empty_graph_returns_valid_structure(self, graph_service):
        """Property: Empty graph must return valid response structure"""
        # Mock empty graph
        graph_service._get_full_graph = AsyncMock(return_value=([], []))
        graph_service._format_node_for_visualization = MagicMock()
        graph_service._format_edge_for_visualization = MagicMock()

        result = await graph_service.get_graph_for_visualization()

        # Must have all required keys
        assert "nodes" in result
        assert "edges" in result
        assert "metadata" in result

        # Arrays must be empty
        assert result["nodes"] == []
        assert result["edges"] == []

        # Metadata must have counts
        assert result["metadata"]["total_nodes"] == 0
        assert result["metadata"]["total_edges"] == 0

    @pytest.mark.asyncio
    async def test_populated_graph_returns_valid_structure(self, graph_service):
        """Property: Populated graph must return valid response structure"""
        # Mock populated graph
        mock_nodes = [
            {"id": f"node-{i}", "type": "requirement", "title": f"Node {i}"}
            for i in range(5)
        ]
        mock_edges = [
            {"start_id": f"node-{i}", "end_id": f"node-{i+1}", "type": "DEPENDS_ON"}
            for i in range(4)
        ]

        graph_service._get_full_graph = AsyncMock(return_value=(mock_nodes, mock_edges))
        graph_service._format_node_for_visualization = MagicMock(side_effect=lambda n: {
            "id": n["id"], "type": n["type"], "label": n["title"]
        })
        graph_service._format_edge_for_visualization = MagicMock(side_effect=lambda e: {
            "id": f"{e['start_id']}-{e['end_id']}", "source": e["start_id"], "target": e["end_id"]
        })

        result = await graph_service.get_graph_for_visualization()

        # Must have all required keys
        assert "nodes" in result
        assert "edges" in result
        assert "metadata" in result

        # Arrays must have correct counts
        assert len(result["nodes"]) == 5
        assert len(result["edges"]) == 4

        # Metadata must match actual counts
        assert result["metadata"]["total_nodes"] == 5
        assert result["metadata"]["total_edges"] == 4

    @pytest.mark.asyncio
    async def test_response_structure_with_various_depths(self, graph_service):
        """Property: Response structure must be valid for any depth parameter"""
        mock_nodes = [{"id": "node-1", "type": "requirement", "title": "Node 1"}]
        graph_service._get_full_graph = AsyncMock(return_value=(mock_nodes, []))
        graph_service._get_subgraph_around_node = AsyncMock(return_value=(mock_nodes, []))
        graph_service._format_node_for_visualization = MagicMock(side_effect=lambda n: {
            "id": n["id"], "type": n["type"], "label": n["title"]
        })
        graph_service._format_edge_for_visualization = MagicMock()

        # Test various depth values
        for depth in [1, 2, 3, 5]:
            result = await graph_service.get_graph_for_visualization(depth=depth)

            assert "nodes" in result
            assert "edges" in result
            assert "metadata" in result
            assert "total_nodes" in result["metadata"]
            assert "total_edges" in result["metadata"]
            assert result["metadata"]["depth"] == depth

    @pytest.mark.asyncio
    async def test_response_structure_with_filters(self, graph_service):
        """Property: Response structure must be valid with any filter combination"""
        mock_nodes = [{"id": "node-1", "type": "requirement", "title": "Node 1"}]
        graph_service._get_full_graph = AsyncMock(return_value=(mock_nodes, []))
        graph_service._format_node_for_visualization = MagicMock(side_effect=lambda n: {
            "id": n["id"], "type": n["type"], "label": n["title"]
        })
        graph_service._format_edge_for_visualization = MagicMock()

        # Test with various filter combinations
        filter_combinations = [
            {"node_types": ["requirement"]},
            {"relationship_types": ["TESTED_BY"]},
            {"node_types": ["requirement", "task"], "relationship_types": ["TESTED_BY", "DEPENDS_ON"]},
            {"limit": 100},
        ]

        for filters in filter_combinations:
            result = await graph_service.get_graph_for_visualization(**filters)

            assert "nodes" in result
            assert "edges" in result
            assert "metadata" in result
            assert "total_nodes" in result["metadata"]
            assert "total_edges" in result["metadata"]


class TestNodeFieldCompleteness:
    """Property-based tests for node field completeness

    Feature: fix-graph-visualization, Property 2: Node Field Completeness
    **Validates: Requirements 7.4**
    """

    def test_all_nodes_have_id_field(self, graph_service):
        """Property: All returned nodes must have an id field"""
        test_nodes = [
            {"id": "req-1", "type": "requirement", "title": "Requirement 1"},
            {"id": "task-1", "type": "task", "title": "Task 1"},
            {"id": "test-1", "type": "test", "title": "Test 1"},
        ]

        for node in test_nodes:
            result = graph_service._format_node_for_visualization(node)
            assert result is not None
            assert "id" in result
            assert result["id"] is not None
            assert len(result["id"]) > 0

    def test_all_nodes_have_type_field(self, graph_service):
        """Property: All returned nodes must have a type field"""
        test_nodes = [
            {"id": "req-1", "type": "requirement", "title": "Requirement 1"},
            {"id": "task-1", "type": "task", "title": "Task 1"},
            {"id": "test-1", "type": "test", "title": "Test 1"},
        ]

        for node in test_nodes:
            result = graph_service._format_node_for_visualization(node)
            assert result is not None
            assert "type" in result
            assert result["type"] is not None
            assert len(result["type"]) > 0

    def test_all_nodes_have_label_field(self, graph_service):
        """Property: All returned nodes must have a label field"""
        test_nodes = [
            {"id": "req-1", "type": "requirement", "title": "Requirement 1"},
            {"id": "task-1", "type": "task", "title": "Task 1"},
            {"id": "test-1", "type": "test", "title": "Test 1"},
        ]

        for node in test_nodes:
            result = graph_service._format_node_for_visualization(node)
            assert result is not None
            assert "label" in result
            assert result["label"] is not None
            assert len(result["label"]) > 0

    def test_all_nodes_have_properties_field(self, graph_service):
        """Property: All returned nodes must have a properties field"""
        test_nodes = [
            {"id": "req-1", "type": "requirement", "title": "Requirement 1"},
            {"id": "task-1", "type": "task", "title": "Task 1"},
            {"id": "test-1", "type": "test", "title": "Test 1"},
        ]

        for node in test_nodes:
            result = graph_service._format_node_for_visualization(node)
            assert result is not None
            assert "properties" in result
            assert isinstance(result["properties"], dict)

    def test_nodes_with_minimal_data_have_required_fields(self, graph_service):
        """Property: Even minimal nodes must have all required fields"""
        # Test with minimal node data
        minimal_nodes = [
            {"id": "node-1"},
            {"id": "node-2", "type": "requirement"},
            {"id": "node-3", "title": "Node 3"},
        ]

        for node in minimal_nodes:
            result = graph_service._format_node_for_visualization(node)
            assert result is not None

            # Must have all required fields
            assert "id" in result
            assert "type" in result
            assert "label" in result
            assert "properties" in result

    def test_nodes_with_complete_data_have_required_fields(self, graph_service):
        """Property: Complete nodes must have all required fields"""
        complete_node = {
            "id": "req-1",
            "type": "requirement",
            "title": "Complete Requirement",
            "description": "Full description",
            "status": "active",
            "priority": 1,
            "created_by": "user-123",
            "assigned_to": "user-456"
        }

        result = graph_service._format_node_for_visualization(complete_node)
        assert result is not None

        # Must have all required fields
        assert "id" in result
        assert "type" in result
        assert "label" in result
        assert "properties" in result

        # Properties should contain original data
        assert result["properties"]["id"] == "req-1"
        assert result["properties"]["type"] == "requirement"

    def test_node_fields_are_correct_types(self, graph_service):
        """Property: Node fields must be correct data types"""
        test_nodes = [
            {"id": "req-1", "type": "requirement", "title": "Requirement 1"},
            {"id": "task-1", "type": "task", "title": "Task 1"},
        ]

        for node in test_nodes:
            result = graph_service._format_node_for_visualization(node)
            assert result is not None

            # Check field types
            assert isinstance(result["id"], str)
            assert isinstance(result["type"], str)
            assert isinstance(result["label"], str)
            assert isinstance(result["properties"], dict)


class TestEdgeFieldCompleteness:
    """Property-based tests for edge field completeness

    Feature: fix-graph-visualization, Property 3: Edge Field Completeness
    **Validates: Requirements 7.5**
    """

    def test_all_edges_have_id_field(self, graph_service):
        """Property: All returned edges must have an id field"""
        test_edges = [
            {"start_id": "a", "end_id": "b", "type": "TESTED_BY"},
            {"start_id": "c", "end_id": "d", "type": "MITIGATES"},
            {"start_id": "e", "end_id": "f", "type": "DEPENDS_ON"},
        ]

        for edge in test_edges:
            result = graph_service._format_edge_for_visualization(edge)
            assert result is not None
            assert "id" in result
            assert result["id"] is not None
            assert len(result["id"]) > 0

    def test_all_edges_have_source_field(self, graph_service):
        """Property: All returned edges must have a source field"""
        test_edges = [
            {"start_id": "a", "end_id": "b", "type": "TESTED_BY"},
            {"start_id": "c", "end_id": "d", "type": "MITIGATES"},
            {"start_id": "e", "end_id": "f", "type": "DEPENDS_ON"},
        ]

        for edge in test_edges:
            result = graph_service._format_edge_for_visualization(edge)
            assert result is not None
            assert "source" in result
            assert result["source"] is not None
            assert len(result["source"]) > 0

    def test_all_edges_have_target_field(self, graph_service):
        """Property: All returned edges must have a target field"""
        test_edges = [
            {"start_id": "a", "end_id": "b", "type": "TESTED_BY"},
            {"start_id": "c", "end_id": "d", "type": "MITIGATES"},
            {"start_id": "e", "end_id": "f", "type": "DEPENDS_ON"},
        ]

        for edge in test_edges:
            result = graph_service._format_edge_for_visualization(edge)
            assert result is not None
            assert "target" in result
            assert result["target"] is not None
            assert len(result["target"]) > 0

    def test_all_edges_have_type_field(self, graph_service):
        """Property: All returned edges must have a type field"""
        test_edges = [
            {"start_id": "a", "end_id": "b", "type": "TESTED_BY"},
            {"start_id": "c", "end_id": "d", "type": "MITIGATES"},
            {"start_id": "e", "end_id": "f", "type": "DEPENDS_ON"},
        ]

        for edge in test_edges:
            result = graph_service._format_edge_for_visualization(edge)
            assert result is not None
            assert "type" in result
            assert result["type"] is not None
            assert len(result["type"]) > 0

    def test_edges_with_minimal_data_have_required_fields(self, graph_service):
        """Property: Even minimal edges must have all required fields"""
        # Test with minimal edge data (missing type)
        minimal_edge = {"start_id": "a", "end_id": "b"}

        result = graph_service._format_edge_for_visualization(minimal_edge)
        assert result is not None

        # Must have all required fields
        assert "id" in result
        assert "source" in result
        assert "target" in result
        assert "type" in result

    def test_edges_with_complete_data_have_required_fields(self, graph_service):
        """Property: Complete edges must have all required fields"""
        complete_edge = {
            "start_id": "req-1",
            "end_id": "test-1",
            "type": "TESTED_BY",
            "properties": {
                "created_at": "2024-01-01",
                "created_by": "user-123"
            }
        }

        result = graph_service._format_edge_for_visualization(complete_edge)
        assert result is not None

        # Must have all required fields
        assert "id" in result
        assert "source" in result
        assert "target" in result
        assert "type" in result

    def test_edge_source_matches_start_id(self, graph_service):
        """Property: Edge source must match start_id"""
        test_edges = [
            {"start_id": "a", "end_id": "b", "type": "TESTED_BY"},
            {"start_id": "req-1", "end_id": "test-1", "type": "TESTED_BY"},
        ]

        for edge in test_edges:
            result = graph_service._format_edge_for_visualization(edge)
            assert result is not None
            assert result["source"] == edge["start_id"]

    def test_edge_target_matches_end_id(self, graph_service):
        """Property: Edge target must match end_id"""
        test_edges = [
            {"start_id": "a", "end_id": "b", "type": "TESTED_BY"},
            {"start_id": "req-1", "end_id": "test-1", "type": "TESTED_BY"},
        ]

        for edge in test_edges:
            result = graph_service._format_edge_for_visualization(edge)
            assert result is not None
            assert result["target"] == edge["end_id"]

    def test_edge_fields_are_correct_types(self, graph_service):
        """Property: Edge fields must be correct data types"""
        test_edges = [
            {"start_id": "a", "end_id": "b", "type": "TESTED_BY"},
            {"start_id": "c", "end_id": "d", "type": "MITIGATES"},
        ]

        for edge in test_edges:
            result = graph_service._format_edge_for_visualization(edge)
            assert result is not None

            # Check field types
            assert isinstance(result["id"], str)
            assert isinstance(result["source"], str)
            assert isinstance(result["target"], str)
            assert isinstance(result["type"], str)

    def test_edge_id_is_unique_and_deterministic(self, graph_service):
        """Property: Edge ID must be unique and deterministic"""
        edge = {"start_id": "a", "end_id": "b", "type": "TESTED_BY"}

        # Format same edge multiple times
        result1 = graph_service._format_edge_for_visualization(edge)
        result2 = graph_service._format_edge_for_visualization(edge)

        # IDs should be identical (deterministic)
        assert result1["id"] == result2["id"]

        # ID should contain source, target, and type info
        assert "a" in result1["id"]
        assert "b" in result1["id"]
        assert "TESTED_BY" in result1["id"]

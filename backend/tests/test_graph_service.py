"""Tests for GraphService"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4
from datetime import datetime

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
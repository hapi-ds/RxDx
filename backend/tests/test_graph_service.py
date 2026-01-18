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
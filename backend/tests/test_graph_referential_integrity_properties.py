"""
Property-Based Tests for Graph Referential Integrity
Feature: graph-table-ui-enhancements
Property 15: Referential Integrity on Node Deletion
Validates: Requirements 15.3

Property: For any relationship, if either the source node or target node is deleted,
the relationship should be automatically removed from the database.
"""

import pytest
from uuid import uuid4
from hypothesis import given, strategies as st, settings, assume

from app.db.graph import GraphService


# Strategy for generating node types
node_type_strategy = st.sampled_from([
    "WorkItem", "Project", "Phase", "Workpackage", "Resource",
    "Company", "Department", "Milestone", "Sprint", "Backlog",
    "User", "Entity", "Document", "Failure"
])

# Strategy for generating relationship types
relationship_type_strategy = st.sampled_from([
    "TESTED_BY", "MITIGATES", "DEPENDS_ON", "IMPLEMENTS",
    "LEADS_TO", "RELATES_TO", "MENTIONED_IN", "REFERENCES",
    "NEXT_VERSION", "CREATED_BY", "ASSIGNED_TO", "PARENT_OF",
    "BELONGS_TO", "ALLOCATED_TO", "LINKED_TO_DEPARTMENT",
    "IN_BACKLOG", "ASSIGNED_TO_SPRINT", "has_risk",
    "implements", "BLOCKS"
])

# Strategy for generating node properties
node_properties_strategy = st.fixed_dictionaries({
    "title": st.text(min_size=1, max_size=100),
    "description": st.text(min_size=0, max_size=500),
    "status": st.sampled_from(["draft", "active", "completed", "archived"]),
})


class TestGraphReferentialIntegrity:
    """Property-based tests for graph referential integrity"""

    @pytest.mark.asyncio
    @given(
        source_type=node_type_strategy,
        target_type=node_type_strategy,
        rel_type=relationship_type_strategy,
        delete_source=st.booleans()
    )
    @settings(max_examples=100, deadline=None)
    async def test_relationship_deleted_when_node_deleted(
        self,
        mock_graph_service: GraphService,
        source_type: str,
        target_type: str,
        rel_type: str,
        delete_source: bool
    ):
        """
        Property 15: Referential Integrity on Node Deletion
        
        For any relationship between two nodes, when either the source or target
        node is deleted, the relationship must be automatically removed.
        
        Test Strategy:
        1. Create two nodes (source and target)
        2. Create a relationship between them
        3. Delete either source or target node
        4. Verify the relationship no longer exists
        
        Validates: Requirements 15.3
        """
        # Generate unique IDs
        source_id = str(uuid4())
        target_id = str(uuid4())
        
        # Create source node
        await mock_graph_service.create_node(
            source_type,
            {
                "id": source_id,
                "title": f"Source {source_type}",
                "created_at": "2024-01-01T00:00:00Z",
            }
        )
        
        # Create target node
        await mock_graph_service.create_node(
            target_type,
            {
                "id": target_id,
                "title": f"Target {target_type}",
                "created_at": "2024-01-01T00:00:00Z",
            }
        )
        
        # Create relationship
        relationship = await mock_graph_service.create_relationship(
            from_id=source_id,
            to_id=target_id,
            rel_type=rel_type
        )
        
        # Verify relationship was created
        assert relationship is not None
        
        # Delete either source or target node
        if delete_source:
            await mock_graph_service.delete_node(source_id)
            deleted_node_id = source_id
            remaining_node_id = target_id
        else:
            await mock_graph_service.delete_node(target_id)
            deleted_node_id = target_id
            remaining_node_id = source_id
        
        # Verify deleted node no longer exists
        deleted_node = await mock_graph_service.get_node(deleted_node_id)
        assert deleted_node is None, f"Node {deleted_node_id} should be deleted"
        
        # Verify remaining node still exists
        remaining_node = await mock_graph_service.get_node(remaining_node_id)
        assert remaining_node is not None, f"Node {remaining_node_id} should still exist"
        
        # Verify relationship no longer exists
        # Try to find relationships from the remaining node
        if delete_source:
            # If source was deleted, check incoming relationships to target
            related_nodes = await mock_graph_service.find_related_nodes(
                node_id=remaining_node_id,
                direction="incoming",
                depth=1
            )
        else:
            # If target was deleted, check outgoing relationships from source
            related_nodes = await mock_graph_service.find_related_nodes(
                node_id=remaining_node_id,
                direction="outgoing",
                depth=1
            )
        
        # The deleted node should not appear in related nodes
        related_ids = [node.get('id') for node in related_nodes if node.get('id')]
        assert deleted_node_id not in related_ids, \
            f"Relationship to deleted node {deleted_node_id} should be removed"

    @pytest.mark.asyncio
    @given(
        num_relationships=st.integers(min_value=1, max_value=5),
        rel_type=relationship_type_strategy
    )
    @settings(max_examples=50, deadline=None)
    async def test_all_relationships_deleted_when_node_deleted(
        self,
        mock_graph_service: GraphService,
        num_relationships: int,
        rel_type: str
    ):
        """
        Property 15 (Extended): All relationships deleted when node deleted
        
        When a node with multiple relationships is deleted, ALL relationships
        (both incoming and outgoing) must be removed.
        
        Test Strategy:
        1. Create a central node
        2. Create multiple nodes connected to the central node
        3. Delete the central node
        4. Verify all relationships are removed
        
        Validates: Requirements 15.3
        """
        # Create central node
        central_id = str(uuid4())
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": central_id,
                "title": "Central Node",
                "created_at": "2024-01-01T00:00:00Z",
            }
        )
        
        # Create connected nodes and relationships
        connected_ids = []
        for i in range(num_relationships):
            node_id = str(uuid4())
            await mock_graph_service.create_node(
                "WorkItem",
                {
                    "id": node_id,
                    "title": f"Connected Node {i}",
                    "created_at": "2024-01-01T00:00:00Z",
                }
            )
            
            # Create relationship (alternating direction)
            if i % 2 == 0:
                # Outgoing from central
                await mock_graph_service.create_relationship(
                    from_id=central_id,
                    to_id=node_id,
                    rel_type=rel_type
                )
            else:
                # Incoming to central
                await mock_graph_service.create_relationship(
                    from_id=node_id,
                    to_id=central_id,
                    rel_type=rel_type
                )
            
            connected_ids.append(node_id)
        
        # Delete central node
        await mock_graph_service.delete_node(central_id)
        
        # Verify central node is deleted
        deleted_node = await mock_graph_service.get_node(central_id)
        assert deleted_node is None, "Central node should be deleted"
        
        # Verify all connected nodes still exist but have no relationships to central
        for node_id in connected_ids:
            # Node should still exist
            node = await mock_graph_service.get_node(node_id)
            assert node is not None, f"Connected node {node_id} should still exist"
            
            # Check relationships - central node should not appear
            outgoing = await mock_graph_service.find_related_nodes(
                node_id=node_id,
                direction="outgoing",
                depth=1
            )
            incoming = await mock_graph_service.find_related_nodes(
                node_id=node_id,
                direction="incoming",
                depth=1
            )
            
            all_related = outgoing + incoming
            related_ids = [n.get('id') for n in all_related if n.get('id')]
            
            assert central_id not in related_ids, \
                f"Central node {central_id} should not appear in relationships of {node_id}"

    @pytest.mark.asyncio
    @given(
        chain_length=st.integers(min_value=2, max_value=5),
        rel_type=relationship_type_strategy
    )
    @settings(max_examples=30, deadline=None)
    async def test_relationship_chain_integrity_after_deletion(
        self,
        mock_graph_service: GraphService,
        chain_length: int,
        rel_type: str
    ):
        """
        Property 15 (Chain): Relationship chain integrity after node deletion
        
        When a node in a chain of relationships is deleted, only the relationships
        directly connected to that node should be removed. Other relationships
        in the chain should remain intact.
        
        Test Strategy:
        1. Create a chain of nodes: A -> B -> C -> D
        2. Delete middle node (e.g., B)
        3. Verify A-B and B-C relationships are removed
        4. Verify C-D relationship remains intact
        
        Validates: Requirements 15.3
        """
        assume(chain_length >= 2)
        
        # Create chain of nodes
        node_ids = []
        for i in range(chain_length):
            node_id = str(uuid4())
            await mock_graph_service.create_node(
                "WorkItem",
                {
                    "id": node_id,
                    "title": f"Node {i}",
                    "created_at": "2024-01-01T00:00:00Z",
                }
            )
            node_ids.append(node_id)
        
        # Create relationships in chain
        for i in range(len(node_ids) - 1):
            await mock_graph_service.create_relationship(
                from_id=node_ids[i],
                to_id=node_ids[i + 1],
                rel_type=rel_type
            )
        
        # Delete middle node (index 1)
        deleted_node_id = node_ids[1]
        await mock_graph_service.delete_node(deleted_node_id)
        
        # Verify deleted node is gone
        deleted_node = await mock_graph_service.get_node(deleted_node_id)
        assert deleted_node is None, "Deleted node should not exist"
        
        # Verify first node has no outgoing relationships
        first_outgoing = await mock_graph_service.find_related_nodes(
            node_id=node_ids[0],
            direction="outgoing",
            depth=1
        )
        first_related_ids = [n.get('id') for n in first_outgoing if n.get('id')]
        assert deleted_node_id not in first_related_ids, \
            "First node should not have relationship to deleted node"
        
        # Verify third node (if exists) has no incoming relationships from deleted node
        if len(node_ids) > 2:
            third_incoming = await mock_graph_service.find_related_nodes(
                node_id=node_ids[2],
                direction="incoming",
                depth=1
            )
            third_related_ids = [n.get('id') for n in third_incoming if n.get('id')]
            assert deleted_node_id not in third_related_ids, \
                "Third node should not have relationship from deleted node"
            
            # Verify remaining chain relationships still exist (if chain is long enough)
            if len(node_ids) > 3:
                # Check that node 2 -> node 3 relationship still exists
                third_outgoing = await mock_graph_service.find_related_nodes(
                    node_id=node_ids[2],
                    direction="outgoing",
                    depth=1
                )
                third_out_ids = [n.get('id') for n in third_outgoing if n.get('id')]
                assert node_ids[3] in third_out_ids, \
                    "Remaining chain relationships should still exist"

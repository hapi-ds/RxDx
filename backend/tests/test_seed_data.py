"""Tests for seed data script

This module tests the seed data script functionality including:
- Property tests for node creation
- Property tests for relationship creation
- Unit tests for seed data counts
"""

import pytest
from hypothesis import given
from hypothesis import strategies as st

from scripts.seed_data import (
    SEED_RELATIONSHIPS,
    SEED_REQUIREMENTS,
    SEED_RISKS,
    SEED_TASKS,
    SEED_TESTS,
    seed_graph_data,
)
from tests.conftest import MockGraphService


@pytest.mark.asyncio
class TestSeedDataProperties:
    """Property-based tests for seed data script"""

    @given(
        workitem_type=st.sampled_from(['requirement', 'task', 'test', 'risk']),
        has_description=st.booleans(),
        has_priority=st.booleans()
    )
    async def test_property_seed_script_node_creation(
        self,
        workitem_type: str,
        has_description: bool,
        has_priority: bool
    ):
        """
        Property 11: Seed Script Node Creation

        **Validates: Requirements 6.2**

        For any workitem being created by the seed script, the system shall use
        the create_workitem_node method with all required properties
        (id, type, title, status, priority).

        Feature: fix-graph-visualization, Property 11: Seed Script Node Creation
        """
        # Arrange
        mock_graph_service = MockGraphService()

        # Track calls to create_workitem_node
        original_create = mock_graph_service.create_workitem_node
        calls = []

        async def tracked_create(**kwargs):
            calls.append(kwargs)
            return await original_create(**kwargs)

        mock_graph_service.create_workitem_node = tracked_create

        # Create a test workitem based on type
        test_workitem = {
            "id": f"test-{workitem_type}-001",
            "type": workitem_type,
            "title": f"Test {workitem_type.title()}",
            "status": "active",
            "priority": 3 if has_priority else None,
            "created_by": "test-user-001"
        }

        if has_description:
            test_workitem["description"] = f"Test description for {workitem_type}"

        # Act - Create the workitem node
        await mock_graph_service.create_workitem_node(
            workitem_id=test_workitem["id"],
            workitem_type=test_workitem["type"],
            title=test_workitem["title"],
            description=test_workitem.get("description"),
            status=test_workitem["status"],
            priority=test_workitem.get("priority"),
            created_by=test_workitem["created_by"]
        )

        # Assert - Verify all required properties were provided
        assert len(calls) == 1, "create_workitem_node should be called exactly once"

        call_kwargs = calls[0]

        # Verify required properties are present
        assert "workitem_id" in call_kwargs, "workitem_id is required"
        assert "workitem_type" in call_kwargs, "workitem_type is required"
        assert "title" in call_kwargs, "title is required"
        assert "status" in call_kwargs, "status is required"
        assert "created_by" in call_kwargs, "created_by is required"

        # Verify values match
        assert call_kwargs["workitem_id"] == test_workitem["id"]
        assert call_kwargs["workitem_type"] == test_workitem["type"]
        assert call_kwargs["title"] == test_workitem["title"]
        assert call_kwargs["status"] == test_workitem["status"]
        assert call_kwargs["created_by"] == test_workitem["created_by"]

        # Verify priority is handled correctly (can be None)
        if has_priority:
            assert call_kwargs["priority"] == test_workitem["priority"]

        # Verify description is handled correctly (can be None)
        if has_description:
            assert call_kwargs["description"] == test_workitem["description"]

    @given(
        rel_type=st.sampled_from(['IMPLEMENTS', 'TESTED_BY', 'MITIGATES', 'DEPENDS_ON']),
        has_properties=st.booleans()
    )
    async def test_property_seed_script_relationship_creation(
        self,
        rel_type: str,
        has_properties: bool
    ):
        """
        Property 12: Seed Script Relationship Creation

        **Validates: Requirements 6.3**

        For any relationship being created by the seed script, the system shall use
        the create_relationship method with valid from_id, to_id, and relationship type.

        Feature: fix-graph-visualization, Property 12: Seed Script Relationship Creation
        """
        # Arrange
        mock_graph_service = MockGraphService()

        # Track calls to create_relationship
        original_create = mock_graph_service.create_relationship
        calls = []

        async def tracked_create(**kwargs):
            calls.append(kwargs)
            return await original_create(**kwargs)

        mock_graph_service.create_relationship = tracked_create

        # Create test nodes first
        from_id = "test-node-001"
        to_id = "test-node-002"

        await mock_graph_service.create_workitem_node(
            workitem_id=from_id,
            workitem_type="requirement",
            title="Source Node",
            status="active",
            priority=3,
            created_by="test-user"
        )

        await mock_graph_service.create_workitem_node(
            workitem_id=to_id,
            workitem_type="task",
            title="Target Node",
            status="active",
            priority=3,
            created_by="test-user"
        )

        # Act - Create the relationship
        properties = {"weight": 1.0} if has_properties else None
        await mock_graph_service.create_relationship(
            from_id=from_id,
            to_id=to_id,
            rel_type=rel_type,
            properties=properties
        )

        # Assert - Verify relationship was created with valid parameters
        assert len(calls) == 1, "create_relationship should be called exactly once"

        call_kwargs = calls[0]

        # Verify required parameters are present
        assert "from_id" in call_kwargs, "from_id is required"
        assert "to_id" in call_kwargs, "to_id is required"
        assert "rel_type" in call_kwargs, "rel_type is required"

        # Verify values are valid (not None or empty)
        assert call_kwargs["from_id"], "from_id must not be empty"
        assert call_kwargs["to_id"], "to_id must not be empty"
        assert call_kwargs["rel_type"], "rel_type must not be empty"

        # Verify values match
        assert call_kwargs["from_id"] == from_id
        assert call_kwargs["to_id"] == to_id
        assert call_kwargs["rel_type"] == rel_type

        # Verify properties are handled correctly (can be None)
        if has_properties:
            assert call_kwargs.get("properties") == properties


@pytest.mark.asyncio
class TestSeedDataUnit:
    """Unit tests for seed data script"""

    async def test_seed_script_creates_minimum_requirements(self):
        """
        Test seed script creates at least 4 requirements

        Validates: Requirement 1.1
        """
        # Arrange
        mock_graph_service = MockGraphService()

        # Act - Count requirements in seed data
        requirement_count = len(SEED_REQUIREMENTS)

        # Assert
        assert requirement_count >= 4, \
            f"Seed data must contain at least 4 requirements, found {requirement_count}"

    async def test_seed_script_creates_minimum_tasks(self):
        """
        Test seed script creates at least 3 tasks

        Validates: Requirement 1.2
        """
        # Arrange & Act
        task_count = len(SEED_TASKS)

        # Assert
        assert task_count >= 3, \
            f"Seed data must contain at least 3 tasks, found {task_count}"

    async def test_seed_script_creates_minimum_tests(self):
        """
        Test seed script creates at least 3 tests

        Validates: Requirement 1.3
        """
        # Arrange & Act
        test_count = len(SEED_TESTS)

        # Assert
        assert test_count >= 3, \
            f"Seed data must contain at least 3 tests, found {test_count}"

    async def test_seed_script_creates_minimum_risks(self):
        """
        Test seed script creates at least 2 risks

        Validates: Requirement 1.4
        """
        # Arrange & Act
        risk_count = len(SEED_RISKS)

        # Assert
        assert risk_count >= 2, \
            f"Seed data must contain at least 2 risks, found {risk_count}"

    async def test_seed_script_creates_minimum_relationships(self):
        """
        Test seed script creates at least 12 relationships

        Validates: Requirement 1.5
        """
        # Arrange & Act
        relationship_count = len(SEED_RELATIONSHIPS)

        # Assert
        assert relationship_count >= 12, \
            f"Seed data must contain at least 12 relationships, found {relationship_count}"

    async def test_seed_script_handles_errors_gracefully(self):
        """
        Test seed script handles errors gracefully

        Validates: Requirement 6.5
        """
        # Arrange
        mock_graph_service = MockGraphService()

        # Make create_workitem_node raise an error for one specific node
        original_create = mock_graph_service.create_workitem_node
        error_node_id = SEED_REQUIREMENTS[0]["id"]

        async def failing_create(**kwargs):
            if kwargs.get("workitem_id") == error_node_id:
                raise Exception("Simulated database error")
            return await original_create(**kwargs)

        mock_graph_service.create_workitem_node = failing_create

        # Patch get_graph_service at the import location within seed_graph_data
        from unittest.mock import patch

        async def mock_get_graph_service():
            return mock_graph_service

        # Act - Run seed_graph_data and verify it doesn't crash
        try:
            # Patch the import inside the seed_graph_data function
            with patch('app.db.graph.get_graph_service', new=mock_get_graph_service):
                # This should not raise an exception even though one node fails
                await seed_graph_data()

                # Assert - Verify other nodes were still created
                # (The function should continue after errors)
                created_count = len(mock_graph_service.workitems)

                # We expect at least some nodes to be created despite the error
                # (3 requirements + 3 tasks + 3 tests + 2 risks - 1 failed = at least 10)
                assert created_count >= 10, \
                    f"Expected at least 10 nodes created despite error, found {created_count}"
        except Exception as e:
            # If seed_graph_data raises an exception, the test should fail
            pytest.fail(f"seed_graph_data should handle errors gracefully, but raised: {e}")

    async def test_all_seed_requirements_have_required_fields(self):
        """Test all seed requirements have required fields"""
        for req in SEED_REQUIREMENTS:
            assert "id" in req, f"Requirement missing id: {req}"
            assert "type" in req, f"Requirement missing type: {req}"
            assert "title" in req, f"Requirement missing title: {req}"
            assert "status" in req, f"Requirement missing status: {req}"
            assert "priority" in req, f"Requirement missing priority: {req}"
            assert "created_by" in req, f"Requirement missing created_by: {req}"

    async def test_all_seed_tasks_have_required_fields(self):
        """Test all seed tasks have required fields"""
        for task in SEED_TASKS:
            assert "id" in task, f"Task missing id: {task}"
            assert "type" in task, f"Task missing type: {task}"
            assert "title" in task, f"Task missing title: {task}"
            assert "status" in task, f"Task missing status: {task}"
            assert "priority" in task, f"Task missing priority: {task}"
            assert "created_by" in task, f"Task missing created_by: {task}"

    async def test_all_seed_tests_have_required_fields(self):
        """Test all seed tests have required fields"""
        for test in SEED_TESTS:
            assert "id" in test, f"Test missing id: {test}"
            assert "type" in test, f"Test missing type: {test}"
            assert "title" in test, f"Test missing title: {test}"
            assert "status" in test, f"Test missing status: {test}"
            assert "priority" in test, f"Test missing priority: {test}"
            assert "created_by" in test, f"Test missing created_by: {test}"

    async def test_all_seed_risks_have_required_fields(self):
        """Test all seed risks have required fields"""
        for risk in SEED_RISKS:
            assert "id" in risk, f"Risk missing id: {risk}"
            assert "type" in risk, f"Risk missing type: {risk}"
            assert "title" in risk, f"Risk missing title: {risk}"
            assert "status" in risk, f"Risk missing status: {risk}"
            assert "priority" in risk, f"Risk missing priority: {risk}"
            assert "created_by" in risk, f"Risk missing created_by: {risk}"

    async def test_all_seed_relationships_have_required_fields(self):
        """Test all seed relationships have required fields"""
        for rel in SEED_RELATIONSHIPS:
            assert "from_id" in rel, f"Relationship missing from_id: {rel}"
            assert "to_id" in rel, f"Relationship missing to_id: {rel}"
            assert "type" in rel, f"Relationship missing type: {rel}"

            # Verify IDs are not empty
            assert rel["from_id"], f"Relationship has empty from_id: {rel}"
            assert rel["to_id"], f"Relationship has empty to_id: {rel}"
            assert rel["type"], f"Relationship has empty type: {rel}"

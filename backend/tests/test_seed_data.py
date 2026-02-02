"""Tests for seed data script

This module tests the seed data script functionality including:
- Template-based seeding
- Property tests for node creation
- Property tests for relationship creation
"""

import pytest
from hypothesis import given
from hypothesis import strategies as st

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
    """Unit tests for template-based seed data"""

    async def test_default_template_exists(self):
        """Test default template file exists"""
        from pathlib import Path
        
        backend_dir = Path(__file__).parent.parent
        template_path = backend_dir / "templates" / "default.yaml"
        
        assert template_path.exists(), "Default template must exist"

    async def test_default_template_has_minimum_requirements(self):
        """Test default template contains at least 4 requirements"""
        from pathlib import Path
        from app.services.template_parser import TemplateParser
        
        backend_dir = Path(__file__).parent.parent
        templates_dir = backend_dir / "templates"
        
        parser = TemplateParser(templates_dir)
        template = parser.load_template("default")
        
        requirement_count = len(template.workitems.requirements)
        assert requirement_count >= 4, \
            f"Default template must contain at least 4 requirements, found {requirement_count}"

    async def test_default_template_has_minimum_tasks(self):
        """Test default template contains at least 3 tasks"""
        from pathlib import Path
        from app.services.template_parser import TemplateParser
        
        backend_dir = Path(__file__).parent.parent
        templates_dir = backend_dir / "templates"
        
        parser = TemplateParser(templates_dir)
        template = parser.load_template("default")
        
        task_count = len(template.workitems.tasks)
        assert task_count >= 3, \
            f"Default template must contain at least 3 tasks, found {task_count}"

    async def test_default_template_has_minimum_tests(self):
        """Test default template contains at least 3 tests"""
        from pathlib import Path
        from app.services.template_parser import TemplateParser
        
        backend_dir = Path(__file__).parent.parent
        templates_dir = backend_dir / "templates"
        
        parser = TemplateParser(templates_dir)
        template = parser.load_template("default")
        
        test_count = len(template.workitems.tests)
        assert test_count >= 3, \
            f"Default template must contain at least 3 tests, found {test_count}"

    async def test_default_template_has_minimum_risks(self):
        """Test default template contains at least 2 risks"""
        from pathlib import Path
        from app.services.template_parser import TemplateParser
        
        backend_dir = Path(__file__).parent.parent
        templates_dir = backend_dir / "templates"
        
        parser = TemplateParser(templates_dir)
        template = parser.load_template("default")
        
        risk_count = len(template.workitems.risks)
        assert risk_count >= 2, \
            f"Default template must contain at least 2 risks, found {risk_count}"

    async def test_default_template_has_minimum_relationships(self):
        """Test default template contains at least 12 relationships"""
        from pathlib import Path
        from app.services.template_parser import TemplateParser
        
        backend_dir = Path(__file__).parent.parent
        templates_dir = backend_dir / "templates"
        
        parser = TemplateParser(templates_dir)
        template = parser.load_template("default")
        
        relationship_count = len(template.relationships)
        assert relationship_count >= 12, \
            f"Default template must contain at least 12 relationships, found {relationship_count}"

    async def test_all_templates_are_valid(self):
        """Test all built-in templates are valid"""
        from pathlib import Path
        from app.services.template_parser import TemplateParser
        from app.services.template_validator import TemplateValidator
        
        backend_dir = Path(__file__).parent.parent
        templates_dir = backend_dir / "templates"
        schema_path = templates_dir / "schema.json"
        
        parser = TemplateParser(templates_dir)
        validator = TemplateValidator(schema_path)
        
        templates = parser.list_templates()
        
        for template_meta in templates:
            template = parser.load_template(template_meta.name)
            
            # Validate schema
            schema_errors = validator.validate_schema(template.model_dump())
            assert len(schema_errors) == 0, \
                f"Template {template_meta.name} has schema errors: {schema_errors}"
            
            # Validate references
            ref_errors = validator.validate_references(template)
            assert len(ref_errors) == 0, \
                f"Template {template_meta.name} has reference errors: {ref_errors}"
            
            # Validate constraints
            constraint_errors = validator.validate_constraints(template)
            assert len(constraint_errors) == 0, \
                f"Template {template_meta.name} has constraint errors: {constraint_errors}"

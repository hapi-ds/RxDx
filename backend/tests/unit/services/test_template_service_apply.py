"""
Unit tests for TemplateService apply methods.

Tests the template application functionality including:
- Workitem seeding (_apply_workitems)
- Relationship seeding (_apply_relationships)
- Main apply_template orchestration
"""

from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

import pytest

from app.schemas.template import (
    RelationshipType,
    TemplateDefinition,
    TemplateMetadata,
    TemplateRelationship,
    TemplateRequirement,
    TemplateRisk,
    TemplateSettings,
    TemplateTask,
    TemplateTest,
    TemplateUser,
    TemplateWorkitems,
    UserRole,
)
from app.services.template_parser import TemplateParser
from app.services.template_service import TemplateService
from app.services.template_validator import TemplateValidator


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def schema_path():
    """Path to the JSON Schema file."""
    return Path("templates/schema.json")


@pytest.fixture
def temp_templates_dir(tmp_path):
    """Create a temporary templates directory."""
    templates_dir = tmp_path / "templates"
    templates_dir.mkdir()
    return templates_dir


@pytest.fixture
def parser(temp_templates_dir):
    """Create a TemplateParser instance."""
    return TemplateParser(temp_templates_dir)


@pytest.fixture
def validator(schema_path):
    """Create a TemplateValidator instance."""
    return TemplateValidator(schema_path)


@pytest.fixture
def graph_service():
    """Create a mock graph service for testing."""
    from tests.conftest import MockGraphService
    return MockGraphService()


@pytest.fixture
async def service(parser, validator, db_session, graph_service):
    """Create a TemplateService instance with real dependencies."""
    return TemplateService(parser, validator, db_session, graph_service)


# ============================================================================
# Test _apply_workitems Method
# ============================================================================


class TestApplyWorkitems:
    """Tests for _apply_workitems method."""

    @pytest.mark.asyncio
    async def test_apply_workitems_creates_requirement(
        self, service, db_session, graph_service
    ):
        """Test creating a requirement workitem."""
        # Create a user first for the created_by reference
        from app.models.user import User
        from app.core.security import get_password_hash

        user = User(
            email="creator@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Creator User",
            role="user",
            is_active=True,
            failed_login_attempts=0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(user)
        await db_session.commit()

        # Create workitems
        workitems = TemplateWorkitems(
            requirements=[
                TemplateRequirement(
                    id="req-1",
                    title="Test Requirement",
                    description="Test description",
                    priority=3,
                    status="draft",
                    acceptance_criteria="Must work correctly",
                    business_value="High value",
                    source="Customer request",
                    created_by="user-1",
                )
            ]
        )

        user_map = {"user-1": user.id}

        # Apply workitems
        results, workitem_map = await service._apply_workitems(
            workitems=workitems,
            user_map=user_map,
            template_name="test-template",
            dry_run=False,
        )

        # Verify results
        assert len(results) == 1
        assert results[0].status == "created"
        assert results[0].type == "requirement"
        assert results[0].id == "req-1"

        # Verify workitem_map
        assert "req-1" in workitem_map
        workitem_uuid = str(workitem_map["req-1"])

        # Verify workitem was created in graph database
        workitem = await graph_service.get_workitem(workitem_uuid)
        assert workitem is not None
        assert workitem["title"] == "Test Requirement"
        assert workitem["type"] == "requirement"
        assert workitem["priority"] == 3
        assert workitem["acceptance_criteria"] == "Must work correctly"

    @pytest.mark.asyncio
    async def test_apply_workitems_creates_task(
        self, service, db_session, graph_service
    ):
        """Test creating a task workitem."""
        from app.models.user import User
        from app.core.security import get_password_hash

        user = User(
            email="taskuser@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Task User",
            role="user",
            is_active=True,
            failed_login_attempts=0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(user)
        await db_session.commit()

        workitems = TemplateWorkitems(
            tasks=[
                TemplateTask(
                    id="task-1",
                    title="Test Task",
                    priority=2,
                    status="draft",
                    estimated_hours=5.0,
                    actual_hours=3.5,
                    assigned_to="user-1",
                    created_by="user-1",
                )
            ]
        )

        user_map = {"user-1": user.id}

        results, workitem_map = await service._apply_workitems(
            workitems=workitems,
            user_map=user_map,
            template_name="test-template",
            dry_run=False,
        )

        assert len(results) == 1
        assert results[0].status == "created"
        assert results[0].type == "task"

        workitem_uuid = str(workitem_map["task-1"])
        workitem = await graph_service.get_workitem(workitem_uuid)
        assert workitem is not None
        assert workitem["title"] == "Test Task"
        assert workitem["estimated_hours"] == 5.0
        assert workitem["actual_hours"] == 3.5

    @pytest.mark.asyncio
    async def test_apply_workitems_creates_test(
        self, service, db_session, graph_service
    ):
        """Test creating a test workitem."""
        from app.models.user import User
        from app.core.security import get_password_hash

        user = User(
            email="testuser@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Test User",
            role="user",
            is_active=True,
            failed_login_attempts=0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(user)
        await db_session.commit()

        workitems = TemplateWorkitems(
            tests=[
                TemplateTest(
                    id="test-1",
                    title="Test Case",
                    priority=3,
                    status="draft",
                    test_type="unit",
                    test_steps="Step 1, Step 2",
                    expected_result="Should pass",
                    test_status="not_run",
                    created_by="user-1",
                )
            ]
        )

        user_map = {"user-1": user.id}

        results, workitem_map = await service._apply_workitems(
            workitems=workitems,
            user_map=user_map,
            template_name="test-template",
            dry_run=False,
        )

        assert len(results) == 1
        assert results[0].status == "created"

        workitem_uuid = str(workitem_map["test-1"])
        workitem = await graph_service.get_workitem(workitem_uuid)
        assert workitem is not None
        assert workitem["test_type"] == "unit"
        assert workitem["test_status"] == "not_run"

    @pytest.mark.asyncio
    async def test_apply_workitems_creates_risk_with_rpn(
        self, service, db_session, graph_service
    ):
        """Test creating a risk workitem with calculated RPN."""
        from app.models.user import User
        from app.core.security import get_password_hash

        user = User(
            email="riskuser@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Risk User",
            role="user",
            is_active=True,
            failed_login_attempts=0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(user)
        await db_session.commit()

        workitems = TemplateWorkitems(
            risks=[
                TemplateRisk(
                    id="risk-1",
                    title="Test Risk",
                    priority=4,
                    status="draft",
                    severity=7,
                    occurrence=5,
                    detection=3,
                    mitigation_actions="Implement safeguards",
                    risk_owner="user-1",
                    created_by="user-1",
                )
            ]
        )

        user_map = {"user-1": user.id}

        results, workitem_map = await service._apply_workitems(
            workitems=workitems,
            user_map=user_map,
            template_name="test-template",
            dry_run=False,
        )

        assert len(results) == 1
        assert results[0].status == "created"

        workitem_uuid = str(workitem_map["risk-1"])
        workitem = await graph_service.get_workitem(workitem_uuid)
        assert workitem is not None
        assert workitem["severity"] == 7
        assert workitem["occurrence"] == 5
        assert workitem["detection"] == 3
        assert workitem["rpn"] == 105  # 7 * 5 * 3

    @pytest.mark.asyncio
    async def test_apply_workitems_skips_existing(
        self, service, db_session, graph_service
    ):
        """Test that existing workitems are skipped."""
        from app.models.user import User
        from app.core.security import get_password_hash

        user = User(
            email="skipuser@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Skip User",
            role="user",
            is_active=True,
            failed_login_attempts=0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(user)
        await db_session.commit()

        workitems = TemplateWorkitems(
            requirements=[
                TemplateRequirement(
                    id="req-skip",
                    title="Skip Requirement",
                    priority=3,
                    created_by="user-1",
                )
            ]
        )

        user_map = {"user-1": user.id}

        # Apply first time
        results1, workitem_map1 = await service._apply_workitems(
            workitems=workitems,
            user_map=user_map,
            template_name="test-template",
            dry_run=False,
        )

        assert results1[0].status == "created"

        # Apply second time - should skip
        results2, workitem_map2 = await service._apply_workitems(
            workitems=workitems,
            user_map=user_map,
            template_name="test-template",
            dry_run=False,
        )

        assert results2[0].status == "skipped"
        assert "already exists" in results2[0].message

    @pytest.mark.asyncio
    async def test_apply_workitems_dry_run(
        self, service, db_session, graph_service
    ):
        """Test dry run mode doesn't create workitems."""
        from app.models.user import User
        from app.core.security import get_password_hash

        user = User(
            email="dryrunuser@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Dry Run User",
            role="user",
            is_active=True,
            failed_login_attempts=0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(user)
        await db_session.commit()

        workitems = TemplateWorkitems(
            requirements=[
                TemplateRequirement(
                    id="req-dry",
                    title="Dry Run Requirement",
                    priority=3,
                    created_by="user-1",
                )
            ]
        )

        user_map = {"user-1": user.id}

        results, workitem_map = await service._apply_workitems(
            workitems=workitems,
            user_map=user_map,
            template_name="test-template",
            dry_run=True,
        )

        assert len(results) == 1
        assert results[0].status == "created"
        assert "[DRY RUN]" in results[0].message

        # Verify workitem was NOT created
        workitem_uuid = str(workitem_map["req-dry"])
        workitem = await graph_service.get_workitem(workitem_uuid)
        assert workitem is None


# ============================================================================
# Test _apply_relationships Method
# ============================================================================


class TestApplyRelationships:
    """Tests for _apply_relationships method."""

    @pytest.mark.asyncio
    async def test_apply_relationships_creates_relationship(
        self, service, db_session, graph_service
    ):
        """Test creating a relationship between workitems."""
        # Create workitems first
        from app.models.user import User
        from app.core.security import get_password_hash

        user = User(
            email="reluser@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Rel User",
            role="user",
            is_active=True,
            failed_login_attempts=0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(user)
        await db_session.commit()

        # Create two workitems
        uuid1 = service._generate_deterministic_uuid("test-template", "req-1")
        uuid2 = service._generate_deterministic_uuid("test-template", "task-1")

        await graph_service.create_node(
            "WorkItem",
            {
                "id": str(uuid1),
                "type": "requirement",
                "title": "Requirement 1",
                "priority": 3,
            },
        )

        await graph_service.create_node(
            "WorkItem",
            {
                "id": str(uuid2),
                "type": "task",
                "title": "Task 1",
                "priority": 2,
            },
        )

        # Create relationship
        relationships = [
            TemplateRelationship(
                from_id="req-1",
                to_id="task-1",
                type=RelationshipType.IMPLEMENTS,
            )
        ]

        workitem_map = {"req-1": uuid1, "task-1": uuid2}

        results = await service._apply_relationships(
            relationships=relationships,
            workitem_map=workitem_map,
            template_name="test-template",
            dry_run=False,
        )

        assert len(results) == 1
        assert results[0].status == "created"
        assert results[0].type == "relationship"

    @pytest.mark.asyncio
    async def test_apply_relationships_skips_existing(
        self, service, db_session, graph_service
    ):
        """Test that existing relationships are skipped."""
        from app.models.user import User
        from app.core.security import get_password_hash

        user = User(
            email="relskip@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Rel Skip User",
            role="user",
            is_active=True,
            failed_login_attempts=0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(user)
        await db_session.commit()

        # Create workitems
        uuid1 = service._generate_deterministic_uuid("test-template", "req-2")
        uuid2 = service._generate_deterministic_uuid("test-template", "task-2")

        await graph_service.create_node(
            "WorkItem",
            {"id": str(uuid1), "type": "requirement", "title": "Req 2", "priority": 3},
        )

        await graph_service.create_node(
            "WorkItem",
            {"id": str(uuid2), "type": "task", "title": "Task 2", "priority": 2},
        )

        relationships = [
            TemplateRelationship(
                from_id="req-2",
                to_id="task-2",
                type=RelationshipType.IMPLEMENTS,
            )
        ]

        workitem_map = {"req-2": uuid1, "task-2": uuid2}

        # Apply first time
        results1 = await service._apply_relationships(
            relationships=relationships,
            workitem_map=workitem_map,
            template_name="test-template",
            dry_run=False,
        )

        assert results1[0].status == "created"

        # Apply second time - should skip
        results2 = await service._apply_relationships(
            relationships=relationships,
            workitem_map=workitem_map,
            template_name="test-template",
            dry_run=False,
        )

        assert results2[0].status == "skipped"
        assert "already exists" in results2[0].message

    @pytest.mark.asyncio
    async def test_apply_relationships_fails_missing_source(
        self, service, db_session, graph_service
    ):
        """Test that relationships with missing source fail."""
        relationships = [
            TemplateRelationship(
                from_id="nonexistent",
                to_id="task-1",
                type=RelationshipType.IMPLEMENTS,
            )
        ]

        workitem_map = {}

        results = await service._apply_relationships(
            relationships=relationships,
            workitem_map=workitem_map,
            template_name="test-template",
            dry_run=False,
        )

        assert len(results) == 1
        assert results[0].status == "failed"
        assert "not found" in results[0].message

    @pytest.mark.asyncio
    async def test_apply_relationships_dry_run(
        self, service, db_session, graph_service
    ):
        """Test dry run mode doesn't create relationships."""
        # Create workitems
        uuid1 = service._generate_deterministic_uuid("test-template", "req-3")
        uuid2 = service._generate_deterministic_uuid("test-template", "task-3")

        await graph_service.create_node(
            "WorkItem",
            {"id": str(uuid1), "type": "requirement", "title": "Req 3", "priority": 3},
        )

        await graph_service.create_node(
            "WorkItem",
            {"id": str(uuid2), "type": "task", "title": "Task 3", "priority": 2},
        )

        relationships = [
            TemplateRelationship(
                from_id="req-3",
                to_id="task-3",
                type=RelationshipType.IMPLEMENTS,
            )
        ]

        workitem_map = {"req-3": uuid1, "task-3": uuid2}

        results = await service._apply_relationships(
            relationships=relationships,
            workitem_map=workitem_map,
            template_name="test-template",
            dry_run=True,
        )

        assert len(results) == 1
        assert results[0].status == "created"
        assert "[DRY RUN]" in results[0].message

        # Verify relationship was NOT created
        query = f"""
        MATCH (a {{id: '{str(uuid1)}'}})-[r:IMPLEMENTS]->(b {{id: '{str(uuid2)}'}})
        RETURN r
        """
        rels = await graph_service.execute_query(query)
        assert len(rels) == 0


# ============================================================================
# Test apply_template Method
# ============================================================================


class TestApplyTemplate:
    """Tests for apply_template method."""

    @pytest.mark.asyncio
    async def test_apply_template_complete_workflow(
        self, service, temp_templates_dir, db_session, graph_service
    ):
        """Test complete template application workflow."""
        # Create a complete template file
        template_content = """
metadata:
  name: complete-template
  version: 1.0.0
  description: Complete test template
  author: Test Author
settings:
  default_password: password123
users:
  - id: user-1
    email: complete@example.com
    full_name: Complete User
    role: user
workitems:
  requirements:
    - id: req-1
      title: Complete Requirement
      priority: 3
      created_by: user-1
  tasks:
    - id: task-1
      title: Complete Task
      priority: 2
      created_by: user-1
relationships:
  - from_id: req-1
    to_id: task-1
    type: IMPLEMENTS
"""
        template_file = temp_templates_dir / "complete-template.yaml"
        template_file.write_text(template_content)

        # Apply template
        result = await service.apply_template("complete-template", dry_run=False)

        # Verify result
        assert result.success is True
        assert result.template_name == "complete-template"
        assert result.created_count == 4  # 1 user + 2 workitems + 1 relationship
        assert result.skipped_count == 0
        assert result.failed_count == 0

    @pytest.mark.asyncio
    async def test_apply_template_idempotent(
        self, service, temp_templates_dir, db_session, graph_service
    ):
        """Test that applying template twice is idempotent."""
        template_content = """
metadata:
  name: idempotent-template
  version: 1.0.0
  description: Idempotent test template
  author: Test Author
settings:
  default_password: password123
users:
  - id: user-1
    email: idempotent@example.com
    full_name: Idempotent User
    role: user
workitems:
  requirements:
    - id: req-1
      title: Idempotent Requirement
      priority: 3
      created_by: user-1
"""
        template_file = temp_templates_dir / "idempotent-template.yaml"
        template_file.write_text(template_content)

        # Apply first time
        result1 = await service.apply_template("idempotent-template", dry_run=False)
        assert result1.success is True
        assert result1.created_count == 2  # 1 user + 1 workitem

        # Apply second time
        result2 = await service.apply_template("idempotent-template", dry_run=False)
        assert result2.success is True
        assert result2.created_count == 0
        assert result2.skipped_count == 2  # All entities skipped

    @pytest.mark.asyncio
    async def test_apply_template_dry_run(
        self, service, temp_templates_dir, db_session, graph_service
    ):
        """Test dry run mode."""
        template_content = """
metadata:
  name: dryrun-template
  version: 1.0.0
  description: Dry run test template
  author: Test Author
settings:
  default_password: password123
users:
  - id: user-1
    email: dryrun@example.com
    full_name: Dry Run User
    role: user
"""
        template_file = temp_templates_dir / "dryrun-template.yaml"
        template_file.write_text(template_content)

        # Apply with dry_run=True
        result = await service.apply_template("dryrun-template", dry_run=True)

        assert result.success is True
        assert result.dry_run is True
        assert result.created_count == 1

        # Verify user was NOT created
        from sqlalchemy import select
        from app.models.user import User

        stmt = select(User).where(User.email == "dryrun@example.com")
        db_result = await db_session.execute(stmt)
        user = db_result.scalar_one_or_none()
        assert user is None

    @pytest.mark.asyncio
    async def test_apply_template_nonexistent(self, service):
        """Test applying a non-existent template."""
        result = await service.apply_template("nonexistent-template", dry_run=False)

        assert result.success is False
        assert result.created_count == 0
        assert result.failed_count == 1
        assert len(result.entities) == 0

    @pytest.mark.asyncio
    async def test_apply_template_invalid(
        self, service, temp_templates_dir, db_session, graph_service
    ):
        """Test applying an invalid template."""
        template_content = """
metadata:
  name: invalid-template
  version: 1.0.0
  description: Invalid test template
  author: Test Author
users:
  - id: user-1
    email: invalid-email
    full_name: Invalid User
    role: user
"""
        template_file = temp_templates_dir / "invalid-template.yaml"
        template_file.write_text(template_content)

        result = await service.apply_template("invalid-template", dry_run=False)

        assert result.success is False
        assert result.created_count == 0
        assert result.failed_count == 1
        assert len(result.entities) == 0

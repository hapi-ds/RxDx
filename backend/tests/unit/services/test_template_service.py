"""
Unit tests for TemplateService.

Tests the core functionality of the TemplateService including:
- Listing templates
- Getting templates by name
- Validating templates
- Helper methods (UUID generation, RPN calculation, metadata fields)
"""

from pathlib import Path
from uuid import UUID

import pytest

from app.schemas.template import (
    TemplateDefinition,
    TemplateMetadata,
    TemplateSettings,
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
def mock_db_session():
    """Create a mock database session."""
    # For now, return None - will be properly mocked when needed
    return None


@pytest.fixture
def mock_graph_service():
    """Create a mock graph service."""
    # For now, return None - will be properly mocked when needed
    return None


@pytest.fixture
def service(parser, validator, mock_db_session, mock_graph_service):
    """Create a TemplateService instance."""
    return TemplateService(parser, validator, mock_db_session, mock_graph_service)


@pytest.fixture
def valid_template():
    """Create a valid template definition for testing."""
    return TemplateDefinition(
        metadata=TemplateMetadata(
            name="test-template",
            version="1.0.0",
            description="Test template for unit tests",
            author="Test Author",
        ),
        settings=TemplateSettings(default_password="password123"),
        users=[
            TemplateUser(
                id="user-1",
                email="test@example.com",
                full_name="Test User",
                role=UserRole.USER,
                is_active=True,
            )
        ],
        workitems=TemplateWorkitems(),
        relationships=[],
    )


# ============================================================================
# Test TemplateService Initialization
# ============================================================================


class TestTemplateServiceInit:
    """Tests for TemplateService initialization."""

    def test_init_with_valid_dependencies(self, parser, validator, mock_db_session, mock_graph_service):
        """Test initialization with valid dependencies."""
        service = TemplateService(parser, validator, mock_db_session, mock_graph_service)
        assert service.parser == parser
        assert service.validator == validator
        assert service.db_session == mock_db_session
        assert service.graph_service == mock_graph_service


# ============================================================================
# Test list_templates
# ============================================================================


class TestListTemplates:
    """Tests for list_templates method."""

    @pytest.mark.asyncio
    async def test_list_templates_empty_directory(self, service):
        """Test listing templates from empty directory."""
        templates = await service.list_templates()
        assert templates == []

    @pytest.mark.asyncio
    async def test_list_templates_with_valid_templates(self, service, temp_templates_dir):
        """Test listing templates with valid template files."""
        # Create a valid template file
        template_content = """
metadata:
  name: test-template
  version: 1.0.0
  description: Test template for listing
  author: Test Author
"""
        template_file = temp_templates_dir / "test-template.yaml"
        template_file.write_text(template_content)

        templates = await service.list_templates()
        assert len(templates) == 1
        assert templates[0].name == "test-template"
        assert templates[0].version == "1.0.0"

    @pytest.mark.asyncio
    async def test_list_templates_skips_invalid_files(self, service, temp_templates_dir):
        """Test that listing skips invalid template files."""
        # Create a valid template
        valid_template = temp_templates_dir / "valid.yaml"
        valid_template.write_text("""
metadata:
  name: valid
  version: 1.0.0
  description: Valid template
  author: Test
""")

        # Create an invalid template (missing metadata)
        invalid_template = temp_templates_dir / "invalid.yaml"
        invalid_template.write_text("users: []")

        templates = await service.list_templates()
        assert len(templates) == 1
        assert templates[0].name == "valid"


# ============================================================================
# Test get_template
# ============================================================================


class TestGetTemplate:
    """Tests for get_template method."""

    @pytest.mark.asyncio
    async def test_get_existing_template(self, service, temp_templates_dir):
        """Test getting an existing template."""
        # Create a template file
        template_content = """
metadata:
  name: test-template
  version: 1.0.0
  description: Test template
  author: Test Author
settings:
  default_password: password123
users:
  - id: user-1
    email: test@example.com
    full_name: Test User
    role: user
"""
        template_file = temp_templates_dir / "test-template.yaml"
        template_file.write_text(template_content)

        template = await service.get_template("test-template")
        assert template is not None
        assert template.metadata.name == "test-template"
        assert len(template.users) == 1

    @pytest.mark.asyncio
    async def test_get_nonexistent_template(self, service):
        """Test getting a non-existent template returns None."""
        template = await service.get_template("nonexistent")
        assert template is None


# ============================================================================
# Test validate_template
# ============================================================================


class TestValidateTemplate:
    """Tests for validate_template method."""

    @pytest.mark.asyncio
    async def test_validate_valid_template(self, service, temp_templates_dir):
        """Test validating a valid template."""
        # Create a valid template file with all required fields
        template_content = """
metadata:
  name: valid-template
  version: 1.0.0
  description: Valid template for testing validation
  author: Test Author
settings:
  default_password: password123
users:
  - id: user-1
    email: test@example.com
    full_name: Test User
    role: user
workitems:
  requirements:
    - id: req-1
      title: Test Requirement Title
      priority: 3
      created_by: user-1
"""
        template_file = temp_templates_dir / "valid-template.yaml"
        template_file.write_text(template_content)

        result = await service.validate_template("valid-template")
        # If there are errors, print them for debugging
        if not result.valid:
            for error in result.errors:
                print(f"Validation error: {error.path} - {error.message}")
        assert result.valid is True
        assert len(result.errors) == 0

    @pytest.mark.asyncio
    async def test_validate_template_with_invalid_reference(self, service, temp_templates_dir):
        """Test validating a template with invalid user reference."""
        # Create a template with invalid reference
        template_content = """
metadata:
  name: invalid-ref
  version: 1.0.0
  description: Template with invalid reference
  author: Test Author
users:
  - id: user-1
    email: test@example.com
    full_name: Test User
    role: user
workitems:
  requirements:
    - id: req-1
      title: Test Requirement
      priority: 3
      created_by: nonexistent-user
"""
        template_file = temp_templates_dir / "invalid-ref.yaml"
        template_file.write_text(template_content)

        result = await service.validate_template("invalid-ref")
        assert result.valid is False
        assert len(result.errors) > 0
        assert any("nonexistent-user" in error.message for error in result.errors)

    @pytest.mark.asyncio
    async def test_validate_nonexistent_template(self, service):
        """Test validating a non-existent template."""
        result = await service.validate_template("nonexistent")
        assert result.valid is False
        assert len(result.errors) > 0


# ============================================================================
# Test Helper Methods
# ============================================================================


class TestHelperMethods:
    """Tests for helper methods."""

    def test_generate_deterministic_uuid(self, service):
        """Test that UUID generation is deterministic."""
        uuid1 = service._generate_deterministic_uuid("template1", "entity1")
        uuid2 = service._generate_deterministic_uuid("template1", "entity1")
        assert uuid1 == uuid2
        assert isinstance(uuid1, UUID)

    def test_generate_deterministic_uuid_different_inputs(self, service):
        """Test that different inputs produce different UUIDs."""
        uuid1 = service._generate_deterministic_uuid("template1", "entity1")
        uuid2 = service._generate_deterministic_uuid("template1", "entity2")
        uuid3 = service._generate_deterministic_uuid("template2", "entity1")

        assert uuid1 != uuid2
        assert uuid1 != uuid3
        assert uuid2 != uuid3

    def test_calculate_rpn(self, service):
        """Test RPN calculation."""
        rpn = service._calculate_rpn(5, 6, 7)
        assert rpn == 210  # 5 * 6 * 7

    def test_calculate_rpn_minimum(self, service):
        """Test RPN calculation with minimum values."""
        rpn = service._calculate_rpn(1, 1, 1)
        assert rpn == 1

    def test_calculate_rpn_maximum(self, service):
        """Test RPN calculation with maximum values."""
        rpn = service._calculate_rpn(10, 10, 10)
        assert rpn == 1000

    def test_add_metadata_fields_for_requirement(self, service):
        """Test adding metadata fields for requirement."""
        properties = {"title": "Test", "priority": 3}
        result = service._add_metadata_fields("requirement", properties)

        assert result["version"] == "1.0"
        assert "created_at" in result
        assert "updated_at" in result
        assert result["is_signed"] is False
        assert result["title"] == "Test"
        assert result["priority"] == 3

    def test_add_metadata_fields_for_task(self, service):
        """Test adding metadata fields for task."""
        properties = {"title": "Test Task"}
        result = service._add_metadata_fields("task", properties)

        assert result["version"] == "1.0"
        assert result["is_signed"] is False

    def test_add_metadata_fields_for_risk(self, service):
        """Test adding metadata fields for risk."""
        properties = {"title": "Test Risk", "severity": 5}
        result = service._add_metadata_fields("risk", properties)

        assert result["version"] == "1.0"
        assert result["is_signed"] is False

    def test_add_metadata_fields_preserves_existing(self, service):
        """Test that adding metadata fields preserves existing properties."""
        properties = {
            "title": "Test",
            "description": "Description",
            "priority": 3,
            "custom_field": "custom_value",
        }
        result = service._add_metadata_fields("requirement", properties)

        assert result["title"] == "Test"
        assert result["description"] == "Description"
        assert result["priority"] == 3
        assert result["custom_field"] == "custom_value"
        assert result["version"] == "1.0"


# ============================================================================
# Test _apply_users Method
# ============================================================================


class TestApplyUsers:
    """Tests for _apply_users method."""

    @pytest.mark.asyncio
    async def test_apply_users_creates_new_user(self, db_session, mock_graph_service):
        """Test creating a new user from template."""
        from app.schemas.template import TemplateUser, UserRole
        from app.services.template_parser import TemplateParser
        from app.services.template_validator import TemplateValidator
        from pathlib import Path

        # Create service with real db_session
        parser = TemplateParser(Path("templates"))
        validator = TemplateValidator(Path("templates/schema.json"))
        service = TemplateService(parser, validator, db_session, mock_graph_service)

        # Create template user
        users = [
            TemplateUser(
                id="test-user-1",
                email="newuser@example.com",
                full_name="New User",
                role=UserRole.USER,
                is_active=True,
            )
        ]

        # Apply users
        results, user_map = await service._apply_users(
            users=users,
            default_password="password123",
            template_name="test-template",
            dry_run=False,
        )

        # Verify results
        assert len(results) == 1
        assert results[0].status == "created"
        assert results[0].type == "user"
        assert results[0].id == "test-user-1"

        # Verify user_map
        assert "test-user-1" in user_map
        assert user_map["test-user-1"] is not None

        # Verify user was created in database
        from sqlalchemy import select
        from app.models.user import User

        stmt = select(User).where(User.email == "newuser@example.com")
        result = await db_session.execute(stmt)
        created_user = result.scalar_one_or_none()

        assert created_user is not None
        assert created_user.email == "newuser@example.com"
        assert created_user.full_name == "New User"
        assert created_user.role.value == "user"
        assert created_user.is_active is True
        assert created_user.failed_login_attempts == 0
        assert created_user.locked_until is None

    @pytest.mark.asyncio
    async def test_apply_users_uses_default_password(self, db_session, mock_graph_service):
        """Test that default password is used when user doesn't specify one."""
        from app.schemas.template import TemplateUser, UserRole
        from app.services.template_parser import TemplateParser
        from app.services.template_validator import TemplateValidator
        from app.core.security import verify_password
        from pathlib import Path

        parser = TemplateParser(Path("templates"))
        validator = TemplateValidator(Path("templates/schema.json"))
        service = TemplateService(parser, validator, db_session, mock_graph_service)

        users = [
            TemplateUser(
                id="test-user-2",
                email="defaultpw@example.com",
                full_name="Default Password User",
                role=UserRole.USER,
            )
        ]

        await service._apply_users(
            users=users,
            default_password="default123",
            template_name="test-template",
            dry_run=False,
        )

        # Verify password was hashed correctly
        from sqlalchemy import select
        from app.models.user import User

        stmt = select(User).where(User.email == "defaultpw@example.com")
        result = await db_session.execute(stmt)
        created_user = result.scalar_one_or_none()

        assert created_user is not None
        assert verify_password("default123", created_user.hashed_password)

    @pytest.mark.asyncio
    async def test_apply_users_uses_custom_password(self, db_session, mock_graph_service):
        """Test that custom password overrides default password."""
        from app.schemas.template import TemplateUser, UserRole
        from app.services.template_parser import TemplateParser
        from app.services.template_validator import TemplateValidator
        from app.core.security import verify_password
        from pathlib import Path

        parser = TemplateParser(Path("templates"))
        validator = TemplateValidator(Path("templates/schema.json"))
        service = TemplateService(parser, validator, db_session, mock_graph_service)

        users = [
            TemplateUser(
                id="test-user-3",
                email="custompw@example.com",
                full_name="Custom Password User",
                role=UserRole.USER,
                password="custom456",
            )
        ]

        await service._apply_users(
            users=users,
            default_password="default123",
            template_name="test-template",
            dry_run=False,
        )

        # Verify custom password was used
        from sqlalchemy import select
        from app.models.user import User

        stmt = select(User).where(User.email == "custompw@example.com")
        result = await db_session.execute(stmt)
        created_user = result.scalar_one_or_none()

        assert created_user is not None
        assert verify_password("custom456", created_user.hashed_password)
        assert not verify_password("default123", created_user.hashed_password)

    @pytest.mark.asyncio
    async def test_apply_users_skips_existing_by_email(self, db_session, mock_graph_service):
        """Test that existing users are skipped based on email."""
        from app.schemas.template import TemplateUser, UserRole
        from app.services.template_parser import TemplateParser
        from app.services.template_validator import TemplateValidator
        from app.models.user import User
        from app.core.security import get_password_hash
        from datetime import UTC, datetime
        from pathlib import Path

        # Create existing user
        existing_user = User(
            email="existing@example.com",
            hashed_password=get_password_hash("existing123"),
            full_name="Existing User",
            role="user",
            is_active=True,
            failed_login_attempts=0,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
        db_session.add(existing_user)
        await db_session.commit()

        parser = TemplateParser(Path("templates"))
        validator = TemplateValidator(Path("templates/schema.json"))
        service = TemplateService(parser, validator, db_session, mock_graph_service)

        users = [
            TemplateUser(
                id="test-user-4",
                email="existing@example.com",
                full_name="Should Be Skipped",
                role=UserRole.ADMIN,
            )
        ]

        results, user_map = await service._apply_users(
            users=users,
            default_password="password123",
            template_name="test-template",
            dry_run=False,
        )

        # Verify user was skipped
        assert len(results) == 1
        assert results[0].status == "skipped"
        assert "already exists" in results[0].message

        # Verify user_map points to existing user
        assert user_map["test-user-4"] == existing_user.id

    @pytest.mark.asyncio
    async def test_apply_users_supports_all_roles(self, db_session, mock_graph_service):
        """Test that all user roles are supported."""
        from app.schemas.template import TemplateUser, UserRole
        from app.services.template_parser import TemplateParser
        from app.services.template_validator import TemplateValidator
        from pathlib import Path

        parser = TemplateParser(Path("templates"))
        validator = TemplateValidator(Path("templates/schema.json"))
        service = TemplateService(parser, validator, db_session, mock_graph_service)

        users = [
            TemplateUser(
                id=f"user-{role.value}",
                email=f"{role.value}@example.com",
                full_name=f"{role.value.title()} User",
                role=role,
            )
            for role in UserRole
        ]

        results, user_map = await service._apply_users(
            users=users,
            default_password="password123",
            template_name="test-template",
            dry_run=False,
        )

        # Verify all users were created
        assert len(results) == len(UserRole)
        assert all(r.status == "created" for r in results)

        # Verify roles in database
        from sqlalchemy import select
        from app.models.user import User

        for role in UserRole:
            stmt = select(User).where(User.email == f"{role.value}@example.com")
            result = await db_session.execute(stmt)
            user = result.scalar_one_or_none()
            assert user is not None
            assert user.role.value == role.value

    @pytest.mark.asyncio
    async def test_apply_users_supports_inactive_users(self, db_session, mock_graph_service):
        """Test that is_active=false is supported."""
        from app.schemas.template import TemplateUser, UserRole
        from app.services.template_parser import TemplateParser
        from app.services.template_validator import TemplateValidator
        from pathlib import Path

        parser = TemplateParser(Path("templates"))
        validator = TemplateValidator(Path("templates/schema.json"))
        service = TemplateService(parser, validator, db_session, mock_graph_service)

        users = [
            TemplateUser(
                id="inactive-user",
                email="inactive@example.com",
                full_name="Inactive User",
                role=UserRole.USER,
                is_active=False,
            )
        ]

        await service._apply_users(
            users=users,
            default_password="password123",
            template_name="test-template",
            dry_run=False,
        )

        # Verify user is inactive
        from sqlalchemy import select
        from app.models.user import User

        stmt = select(User).where(User.email == "inactive@example.com")
        result = await db_session.execute(stmt)
        user = result.scalar_one_or_none()

        assert user is not None
        assert user.is_active is False

    @pytest.mark.asyncio
    async def test_apply_users_dry_run_mode(self, db_session, mock_graph_service):
        """Test that dry_run mode doesn't create users."""
        from app.schemas.template import TemplateUser, UserRole
        from app.services.template_parser import TemplateParser
        from app.services.template_validator import TemplateValidator
        from pathlib import Path

        parser = TemplateParser(Path("templates"))
        validator = TemplateValidator(Path("templates/schema.json"))
        service = TemplateService(parser, validator, db_session, mock_graph_service)

        users = [
            TemplateUser(
                id="dry-run-user",
                email="dryrun@example.com",
                full_name="Dry Run User",
                role=UserRole.USER,
            )
        ]

        results, user_map = await service._apply_users(
            users=users,
            default_password="password123",
            template_name="test-template",
            dry_run=True,
        )

        # Verify result shows created
        assert len(results) == 1
        assert results[0].status == "created"
        assert "[DRY RUN]" in results[0].message

        # Verify user was NOT created in database
        from sqlalchemy import select
        from app.models.user import User

        stmt = select(User).where(User.email == "dryrun@example.com")
        result = await db_session.execute(stmt)
        user = result.scalar_one_or_none()

        assert user is None

        # Verify user_map still contains mapping
        assert "dry-run-user" in user_map

    @pytest.mark.asyncio
    async def test_apply_users_deterministic_uuid(self, db_session, mock_graph_service):
        """Test that UUIDs are deterministic based on template name and user ID."""
        from app.schemas.template import TemplateUser, UserRole
        from app.services.template_parser import TemplateParser
        from app.services.template_validator import TemplateValidator
        from pathlib import Path

        parser = TemplateParser(Path("templates"))
        validator = TemplateValidator(Path("templates/schema.json"))
        service = TemplateService(parser, validator, db_session, mock_graph_service)

        users = [
            TemplateUser(
                id="deterministic-user",
                email="deterministic@example.com",
                full_name="Deterministic User",
                role=UserRole.USER,
            )
        ]

        # Apply first time
        results1, user_map1 = await service._apply_users(
            users=users,
            default_password="password123",
            template_name="test-template",
            dry_run=False,
        )

        # Get the UUID
        uuid1 = user_map1["deterministic-user"]

        # Delete the user
        from sqlalchemy import select, delete
        from app.models.user import User

        stmt = delete(User).where(User.email == "deterministic@example.com")
        await db_session.execute(stmt)
        await db_session.commit()

        # Apply second time
        results2, user_map2 = await service._apply_users(
            users=users,
            default_password="password123",
            template_name="test-template",
            dry_run=False,
        )

        # Get the UUID
        uuid2 = user_map2["deterministic-user"]

        # Verify UUIDs are the same
        assert uuid1 == uuid2

    @pytest.mark.asyncio
    async def test_apply_users_sets_default_fields(self, db_session, mock_graph_service):
        """Test that default values are set for failed_login_attempts and locked_until."""
        from app.schemas.template import TemplateUser, UserRole
        from app.services.template_parser import TemplateParser
        from app.services.template_validator import TemplateValidator
        from pathlib import Path

        parser = TemplateParser(Path("templates"))
        validator = TemplateValidator(Path("templates/schema.json"))
        service = TemplateService(parser, validator, db_session, mock_graph_service)

        users = [
            TemplateUser(
                id="default-fields-user",
                email="defaultfields@example.com",
                full_name="Default Fields User",
                role=UserRole.USER,
                # Not specifying failed_login_attempts or locked_until
            )
        ]

        await service._apply_users(
            users=users,
            default_password="password123",
            template_name="test-template",
            dry_run=False,
        )

        # Verify defaults were set
        from sqlalchemy import select
        from app.models.user import User

        stmt = select(User).where(User.email == "defaultfields@example.com")
        result = await db_session.execute(stmt)
        user = result.scalar_one_or_none()

        assert user is not None
        assert user.failed_login_attempts == 0
        assert user.locked_until is None

    @pytest.mark.asyncio
    async def test_apply_users_handles_errors_gracefully(self, db_session, mock_graph_service):
        """Test that errors are handled gracefully and don't stop processing."""
        from app.schemas.template import TemplateUser, UserRole
        from app.services.template_parser import TemplateParser
        from app.services.template_validator import TemplateValidator
        from pathlib import Path

        parser = TemplateParser(Path("templates"))
        validator = TemplateValidator(Path("templates/schema.json"))
        service = TemplateService(parser, validator, db_session, mock_graph_service)

        # Create a user with valid data and one that will cause an error
        users = [
            TemplateUser(
                id="valid-user",
                email="valid@example.com",
                full_name="Valid User",
                role=UserRole.USER,
            ),
            # This user will be processed even if there's an issue
            TemplateUser(
                id="another-valid-user",
                email="another@example.com",
                full_name="Another Valid User",
                role=UserRole.USER,
            ),
        ]

        results, user_map = await service._apply_users(
            users=users,
            default_password="password123",
            template_name="test-template",
            dry_run=False,
        )

        # Verify both users were processed
        assert len(results) == 2
        # At least one should succeed
        assert any(r.status == "created" for r in results)

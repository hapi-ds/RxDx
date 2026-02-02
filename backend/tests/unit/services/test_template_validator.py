"""
Unit tests for Template Validator Service.

Tests the validation functionality including schema validation, reference validation,
and constraint validation.
"""

from pathlib import Path

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
from app.services.template_validator import TemplateValidator


@pytest.fixture
def schema_path():
    """Fixture providing path to JSON Schema file."""
    return Path("templates/schema.json")


@pytest.fixture
def validator(schema_path):
    """Fixture providing a TemplateValidator instance."""
    return TemplateValidator(schema_path)


@pytest.fixture
def valid_template():
    """Fixture providing a valid template definition."""
    return TemplateDefinition(
        metadata=TemplateMetadata(
            name="test-template",
            version="1.0.0",
            description="A test template for validation",
            author="Test Author",
        ),
        settings=TemplateSettings(default_password="password123"),
        users=[
            TemplateUser(
                id="user-1",
                email="user1@example.com",
                full_name="User One",
                role=UserRole.ADMIN,
            )
        ],
        workitems=TemplateWorkitems(
            requirements=[
                TemplateRequirement(
                    id="req-1",
                    title="Test Requirement",
                    priority=3,
                    created_by="user-1",
                )
            ]
        ),
        relationships=[],
    )


class TestTemplateValidatorInit:
    """Tests for TemplateValidator initialization."""

    def test_init_with_valid_schema(self, schema_path):
        """Test initialization with valid schema file."""
        validator = TemplateValidator(schema_path)
        assert validator.schema is not None
        assert validator.validator is not None

    def test_init_with_nonexistent_schema(self):
        """Test initialization with non-existent schema file."""
        with pytest.raises(ValueError, match="Schema file does not exist"):
            TemplateValidator(Path("nonexistent/schema.json"))

    def test_init_with_invalid_json_schema(self, tmp_path):
        """Test initialization with invalid JSON in schema file."""
        invalid_schema = tmp_path / "invalid.json"
        invalid_schema.write_text("{ invalid json }")

        with pytest.raises(ValueError, match="Invalid JSON in schema file"):
            TemplateValidator(invalid_schema)


class TestValidateSchema:
    """Tests for schema validation."""

    def test_validate_valid_template(self, validator, valid_template):
        """Test validation of a valid template."""
        # Use exclude_none to avoid None values in optional fields
        template_dict = valid_template.model_dump(mode="json", exclude_none=True)
        errors = validator.validate_schema(template_dict)
        assert len(errors) == 0

    def test_validate_missing_required_field(self, validator):
        """Test validation with missing required field (metadata)."""
        template_dict = {
            "users": [],
            "workitems": {},
            "relationships": [],
        }
        errors = validator.validate_schema(template_dict)
        assert len(errors) > 0
        # Check that error mentions metadata is required
        assert any("required" in error.message.lower() and "metadata" in error.message.lower() for error in errors)

    def test_validate_invalid_metadata_name(self, validator, valid_template):
        """Test validation with invalid metadata name (uppercase not allowed)."""
        template_dict = valid_template.model_dump(mode="json")
        template_dict["metadata"]["name"] = "Invalid-Name"  # Uppercase not allowed
        errors = validator.validate_schema(template_dict)
        assert len(errors) > 0
        assert any("name" in error.path for error in errors)

    def test_validate_invalid_version_format(self, validator, valid_template):
        """Test validation with invalid version format."""
        template_dict = valid_template.model_dump(mode="json")
        template_dict["metadata"]["version"] = "1.0"  # Should be X.Y.Z
        errors = validator.validate_schema(template_dict)
        assert len(errors) > 0
        assert any("version" in error.path for error in errors)

    def test_validate_invalid_priority_range(self, validator, valid_template):
        """Test validation with priority out of range."""
        template_dict = valid_template.model_dump(mode="json")
        template_dict["workitems"]["requirements"][0]["priority"] = 6  # Max is 5
        errors = validator.validate_schema(template_dict)
        assert len(errors) > 0
        assert any("priority" in error.path for error in errors)

    def test_validate_collects_all_errors(self, validator):
        """Test that validation collects all errors, not just the first one."""
        template_dict = {
            "metadata": {
                "name": "Invalid-Name",  # Error 1: uppercase
                "version": "1.0",  # Error 2: invalid format
                "description": "Short",  # Error 3: too short (min 10 chars)
                "author": "Author",
            },
            "users": [
                {
                    "id": "user-1",
                    "email": "invalid-email",  # Error 4: invalid email
                    "full_name": "User",
                    "role": "admin",
                }
            ],
        }
        errors = validator.validate_schema(template_dict)
        # Should have multiple errors
        assert len(errors) >= 3


class TestValidateReferences:
    """Tests for reference validation."""

    def test_validate_valid_references(self, validator, valid_template):
        """Test validation with all valid references."""
        errors = validator.validate_references(valid_template)
        assert len(errors) == 0

    def test_validate_invalid_user_reference_in_requirement(self, validator, valid_template):
        """Test validation with invalid user reference in requirement."""
        valid_template.workitems.requirements[0].created_by = "nonexistent-user"
        errors = validator.validate_references(valid_template)
        assert len(errors) == 1
        assert "created_by" in errors[0].path
        assert "nonexistent-user" in errors[0].message

    def test_validate_invalid_user_reference_in_task(self, validator, valid_template):
        """Test validation with invalid user reference in task."""
        valid_template.workitems.tasks.append(
            TemplateTask(
                id="task-1",
                title="Test Task",
                priority=3,
                created_by="nonexistent-user",
            )
        )
        errors = validator.validate_references(valid_template)
        assert len(errors) == 1
        assert "tasks[0].created_by" in errors[0].path

    def test_validate_invalid_assigned_to_reference(self, validator, valid_template):
        """Test validation with invalid assigned_to reference."""
        valid_template.workitems.tasks.append(
            TemplateTask(
                id="task-1",
                title="Test Task",
                priority=3,
                created_by="user-1",
                assigned_to="nonexistent-user",
            )
        )
        errors = validator.validate_references(valid_template)
        assert len(errors) == 1
        assert "assigned_to" in errors[0].path

    def test_validate_invalid_workitem_reference_in_relationship(self, validator, valid_template):
        """Test validation with invalid workitem reference in relationship."""
        valid_template.relationships.append(
            TemplateRelationship(
                from_id="req-1",
                to_id="nonexistent-workitem",
                type=RelationshipType.IMPLEMENTS,
            )
        )
        errors = validator.validate_references(valid_template)
        assert len(errors) == 1
        assert "to_id" in errors[0].path
        assert "nonexistent-workitem" in errors[0].message

    def test_validate_multiple_invalid_references(self, validator, valid_template):
        """Test validation collects multiple reference errors."""
        # Add task with invalid created_by
        valid_template.workitems.tasks.append(
            TemplateTask(
                id="task-1",
                title="Test Task",
                priority=3,
                created_by="invalid-user-1",
            )
        )
        # Add test with invalid assigned_to
        valid_template.workitems.tests.append(
            TemplateTest(
                id="test-1",
                title="Test Test",
                priority=3,
                created_by="user-1",
                assigned_to="invalid-user-2",
            )
        )
        # Add relationship with invalid from_id
        valid_template.relationships.append(
            TemplateRelationship(
                from_id="invalid-workitem",
                to_id="req-1",
                type=RelationshipType.IMPLEMENTS,
            )
        )

        errors = validator.validate_references(valid_template)
        assert len(errors) == 3


class TestValidateConstraints:
    """Tests for constraint validation."""

    def test_validate_valid_constraints(self, validator, valid_template):
        """Test validation with all valid constraints."""
        errors = validator.validate_constraints(valid_template)
        assert len(errors) == 0

    def test_validate_invalid_priority_in_requirement(self, validator, valid_template):
        """Test validation with invalid priority (out of range 1-5)."""
        valid_template.workitems.requirements[0].priority = 0  # Below minimum
        errors = validator.validate_constraints(valid_template)
        assert len(errors) == 1
        assert "priority" in errors[0].path
        assert "between 1 and 5" in errors[0].message

    def test_validate_invalid_priority_high(self, validator, valid_template):
        """Test validation with priority above maximum."""
        valid_template.workitems.requirements[0].priority = 6  # Above maximum
        errors = validator.validate_constraints(valid_template)
        assert len(errors) == 1
        assert "priority" in errors[0].path

    def test_validate_invalid_severity_in_risk(self, validator, valid_template):
        """Test validation with invalid severity (out of range 1-10)."""
        # Use model_construct to bypass Pydantic validation
        invalid_risk = TemplateRisk.model_construct(
            id="risk-1",
            title="Test Risk",
            priority=3,
            severity=0,  # Below minimum
            occurrence=5,
            detection=5,
            created_by="user-1",
        )
        valid_template.workitems.risks.append(invalid_risk)
        errors = validator.validate_constraints(valid_template)
        assert len(errors) == 1
        assert "severity" in errors[0].path
        assert "between 1 and 10" in errors[0].message

    def test_validate_invalid_occurrence_in_risk(self, validator, valid_template):
        """Test validation with invalid occurrence."""
        # Use model_construct to bypass Pydantic validation
        invalid_risk = TemplateRisk.model_construct(
            id="risk-1",
            title="Test Risk",
            priority=3,
            severity=5,
            occurrence=11,  # Above maximum
            detection=5,
            created_by="user-1",
        )
        valid_template.workitems.risks.append(invalid_risk)
        errors = validator.validate_constraints(valid_template)
        assert len(errors) == 1
        assert "occurrence" in errors[0].path

    def test_validate_invalid_detection_in_risk(self, validator, valid_template):
        """Test validation with invalid detection."""
        # Use model_construct to bypass Pydantic validation
        invalid_risk = TemplateRisk.model_construct(
            id="risk-1",
            title="Test Risk",
            priority=3,
            severity=5,
            occurrence=5,
            detection=0,  # Below minimum
            created_by="user-1",
        )
        valid_template.workitems.risks.append(invalid_risk)
        errors = validator.validate_constraints(valid_template)
        assert len(errors) == 1
        assert "detection" in errors[0].path

    def test_validate_negative_hours_in_task(self, validator, valid_template):
        """Test validation with negative hours."""
        # Use model_construct to bypass Pydantic validation
        invalid_task = TemplateTask.model_construct(
            id="task-1",
            title="Test Task",
            priority=3,
            created_by="user-1",
            estimated_hours=-5.0,  # Negative not allowed
        )
        valid_template.workitems.tasks.append(invalid_task)
        errors = validator.validate_constraints(valid_template)
        assert len(errors) == 1
        assert "estimated_hours" in errors[0].path
        assert "non-negative" in errors[0].message

    def test_validate_negative_failed_login_attempts(self, validator, valid_template):
        """Test validation with negative failed login attempts."""
        valid_template.users[0].failed_login_attempts = -1
        errors = validator.validate_constraints(valid_template)
        assert len(errors) == 1
        assert "failed_login_attempts" in errors[0].path

    def test_validate_multiple_constraint_errors(self, validator, valid_template):
        """Test validation collects multiple constraint errors."""
        # Add requirement with invalid priority using model_construct
        valid_template.workitems.requirements[0] = TemplateRequirement.model_construct(
            id="req-1",
            title="Test Requirement",
            priority=0,  # Invalid
            created_by="user-1",
        )

        # Add risk with multiple invalid fields using model_construct
        invalid_risk = TemplateRisk.model_construct(
            id="risk-1",
            title="Test Risk",
            priority=6,  # Invalid
            severity=0,  # Invalid
            occurrence=11,  # Invalid
            detection=5,
            created_by="user-1",
        )
        valid_template.workitems.risks.append(invalid_risk)

        errors = validator.validate_constraints(valid_template)
        assert len(errors) >= 4  # At least 4 errors


class TestIntegration:
    """Integration tests combining multiple validation types."""

    def test_validate_template_with_all_validation_types(self, validator):
        """Test a template that fails schema, reference, and constraint validation."""
        # Create a template with multiple types of errors using model_construct
        template = TemplateDefinition(
            metadata=TemplateMetadata(
                name="test",
                version="1.0.0",
                description="Test template",
                author="Author",
            ),
            users=[
                TemplateUser.model_construct(
                    id="user-1",
                    email="user@example.com",
                    full_name="User",
                    role=UserRole.ADMIN,
                    failed_login_attempts=-1,  # Constraint error
                )
            ],
            workitems=TemplateWorkitems(
                requirements=[
                    TemplateRequirement.model_construct(
                        id="req-1",
                        title="Test",
                        priority=0,  # Constraint error
                        created_by="nonexistent-user",  # Reference error
                    )
                ]
            ),
        )

        # Validate references
        ref_errors = validator.validate_references(template)
        assert len(ref_errors) == 1

        # Validate constraints
        constraint_errors = validator.validate_constraints(template)
        assert len(constraint_errors) == 2

        # Total errors
        total_errors = ref_errors + constraint_errors
        assert len(total_errors) == 3

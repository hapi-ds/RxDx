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
        assert any(
            "required" in error.message.lower() and "metadata" in error.message.lower()
            for error in errors
        )

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

    def test_validate_invalid_user_reference_in_requirement(
        self, validator, valid_template
    ):
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

    def test_validate_invalid_workitem_reference_in_relationship(
        self, validator, valid_template
    ):
        """Test validation with invalid workitem reference in relationship."""
        # Add a task to use as the from_id for IMPLEMENTS relationship
        valid_template.workitems.tasks.append(
            TemplateTask(
                id="task-1",
                title="Test Task",
                priority=3,
                created_by="user-1",
            )
        )
        valid_template.relationships.append(
            TemplateRelationship(
                from_id="task-1",
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


class TestValidateGraphEntityReferences:
    """Tests for graph entity reference validation."""

    def test_validate_valid_graph_entity_references(self, validator):
        """Test validation with all valid graph entity references."""
        from app.schemas.template import (
            TemplateCompany,
            TemplateDepartment,
            TemplatePhase,
            TemplateProject,
            TemplateResource,
            TemplateSprint,
            TemplateWorkpackage,
            TemplateBacklog,
            TemplateMilestone,
            ResourceType,
            ResourceAvailability,
        )
        from datetime import datetime, UTC

        template = TemplateDefinition(
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
            companies=[
                TemplateCompany(
                    id="company-1",
                    name="Test Company",
                )
            ],
            departments=[
                TemplateDepartment(
                    id="dept-1",
                    name="Engineering",
                    company_id="company-1",
                    manager_user_id="user-1",
                )
            ],
            resources=[
                TemplateResource(
                    id="resource-1",
                    name="Developer",
                    type=ResourceType.PERSON,
                    department_id="dept-1",
                    availability=ResourceAvailability.AVAILABLE,
                )
            ],
            projects=[
                TemplateProject(
                    id="project-1",
                    name="Test Project",
                )
            ],
            phases=[
                TemplatePhase(
                    id="phase-1",
                    name="Phase 1",
                    order=1,
                    project_id="project-1",
                )
            ],
            workpackages=[
                TemplateWorkpackage(
                    id="wp-1",
                    name="Workpackage 1",
                    order=1,
                    phase_id="phase-1",
                )
            ],
            sprints=[
                TemplateSprint(
                    id="sprint-1",
                    name="Sprint 1",
                    start_date=datetime(2024, 1, 1, tzinfo=UTC),
                    end_date=datetime(2024, 1, 15, tzinfo=UTC),
                    project_id="project-1",
                )
            ],
            backlogs=[
                TemplateBacklog(
                    id="backlog-1",
                    name="Product Backlog",
                    project_id="project-1",
                )
            ],
            milestones=[
                TemplateMilestone(
                    id="milestone-1",
                    name="Milestone 1",
                    due_date=datetime(2024, 2, 1, tzinfo=UTC),
                    project_id="project-1",
                )
            ],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        errors = validator.validate_graph_entity_references(template)
        assert len(errors) == 0

    def test_validate_invalid_company_reference_in_department(self, validator):
        """Test validation with invalid company reference in department."""
        from app.schemas.template import TemplateDepartment

        template = TemplateDefinition(
            metadata=TemplateMetadata(
                name="test-template",
                version="1.0.0",
                description="A test template for validation",
                author="Test Author",
            ),
            settings=TemplateSettings(default_password="password123"),
            users=[],
            companies=[],
            departments=[
                TemplateDepartment(
                    id="dept-1",
                    name="Engineering",
                    company_id="nonexistent-company",
                )
            ],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        errors = validator.validate_graph_entity_references(template)
        assert len(errors) == 1
        assert "departments[0].company_id" in errors[0].path
        assert "nonexistent-company" in errors[0].message

    def test_validate_invalid_manager_user_reference_in_department(self, validator):
        """Test validation with invalid manager_user_id reference in department."""
        from app.schemas.template import TemplateCompany, TemplateDepartment

        template = TemplateDefinition(
            metadata=TemplateMetadata(
                name="test-template",
                version="1.0.0",
                description="A test template for validation",
                author="Test Author",
            ),
            settings=TemplateSettings(default_password="password123"),
            users=[],
            companies=[
                TemplateCompany(
                    id="company-1",
                    name="Test Company",
                )
            ],
            departments=[
                TemplateDepartment(
                    id="dept-1",
                    name="Engineering",
                    company_id="company-1",
                    manager_user_id="nonexistent-user",
                )
            ],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        errors = validator.validate_graph_entity_references(template)
        assert len(errors) == 1
        assert "departments[0].manager_user_id" in errors[0].path
        assert "nonexistent-user" in errors[0].message

    def test_validate_invalid_department_reference_in_resource(self, validator):
        """Test validation with invalid department reference in resource."""
        from app.schemas.template import TemplateResource, ResourceType

        template = TemplateDefinition(
            metadata=TemplateMetadata(
                name="test-template",
                version="1.0.0",
                description="A test template for validation",
                author="Test Author",
            ),
            settings=TemplateSettings(default_password="password123"),
            users=[],
            departments=[],
            resources=[
                TemplateResource(
                    id="resource-1",
                    name="Developer",
                    type=ResourceType.PERSON,
                    department_id="nonexistent-dept",
                )
            ],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        errors = validator.validate_graph_entity_references(template)
        assert len(errors) == 1
        assert "resources[0].department_id" in errors[0].path
        assert "nonexistent-dept" in errors[0].message

    def test_validate_invalid_project_references(self, validator):
        """Test validation with invalid project references in multiple entities."""
        from app.schemas.template import (
            TemplateSprint,
            TemplatePhase,
            TemplateBacklog,
            TemplateMilestone,
        )
        from datetime import datetime, UTC

        template = TemplateDefinition(
            metadata=TemplateMetadata(
                name="test-template",
                version="1.0.0",
                description="A test template for validation",
                author="Test Author",
            ),
            settings=TemplateSettings(default_password="password123"),
            users=[],
            projects=[],
            sprints=[
                TemplateSprint(
                    id="sprint-1",
                    name="Sprint 1",
                    start_date=datetime(2024, 1, 1, tzinfo=UTC),
                    end_date=datetime(2024, 1, 15, tzinfo=UTC),
                    project_id="nonexistent-project",
                )
            ],
            phases=[
                TemplatePhase(
                    id="phase-1",
                    name="Phase 1",
                    order=1,
                    project_id="nonexistent-project",
                )
            ],
            backlogs=[
                TemplateBacklog(
                    id="backlog-1",
                    name="Product Backlog",
                    project_id="nonexistent-project",
                )
            ],
            milestones=[
                TemplateMilestone(
                    id="milestone-1",
                    name="Milestone 1",
                    due_date=datetime(2024, 2, 1, tzinfo=UTC),
                    project_id="nonexistent-project",
                )
            ],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        errors = validator.validate_graph_entity_references(template)
        assert len(errors) == 4  # Sprint, phase, backlog, milestone
        assert any("sprints[0].project_id" in e.path for e in errors)
        assert any("phases[0].project_id" in e.path for e in errors)
        assert any("backlogs[0].project_id" in e.path for e in errors)
        assert any("milestones[0].project_id" in e.path for e in errors)

    def test_validate_invalid_phase_reference_in_workpackage(self, validator):
        """Test validation with invalid phase reference in workpackage."""
        from app.schemas.template import TemplateWorkpackage

        template = TemplateDefinition(
            metadata=TemplateMetadata(
                name="test-template",
                version="1.0.0",
                description="A test template for validation",
                author="Test Author",
            ),
            settings=TemplateSettings(default_password="password123"),
            users=[],
            phases=[],
            workpackages=[
                TemplateWorkpackage(
                    id="wp-1",
                    name="Workpackage 1",
                    order=1,
                    phase_id="nonexistent-phase",
                )
            ],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        errors = validator.validate_graph_entity_references(template)
        assert len(errors) == 1
        assert "workpackages[0].phase_id" in errors[0].path
        assert "nonexistent-phase" in errors[0].message


class TestValidateRelationshipConstraints:
    """Tests for relationship constraint validation."""

    def test_validate_task_sprint_backlog_mutual_exclusivity_violation(self, validator):
        """Test validation fails when task is in both sprint and backlog."""
        from app.schemas.template import (
            TemplateBacklog,
            TemplateProject,
            TemplateSprint,
        )
        from datetime import datetime, UTC

        template = TemplateDefinition(
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
            projects=[
                TemplateProject(
                    id="project-1",
                    name="Project 1",
                )
            ],
            sprints=[
                TemplateSprint(
                    id="sprint-1",
                    name="Sprint 1",
                    start_date=datetime(2024, 1, 1, tzinfo=UTC),
                    end_date=datetime(2024, 1, 15, tzinfo=UTC),
                    project_id="project-1",
                )
            ],
            backlogs=[
                TemplateBacklog(
                    id="backlog-1",
                    name="Backlog 1",
                    project_id="project-1",
                )
            ],
            workitems=TemplateWorkitems(
                tasks=[
                    TemplateTask(
                        id="task-1",
                        title="Test Task",
                        priority=3,
                        created_by="user-1",
                    )
                ]
            ),
            relationships=[
                TemplateRelationship(
                    from_id="task-1",
                    to_id="sprint-1",
                    type=RelationshipType.ASSIGNED_TO_SPRINT,
                ),
                TemplateRelationship(
                    from_id="task-1",
                    to_id="backlog-1",
                    type=RelationshipType.IN_BACKLOG,
                ),
            ],
        )

        errors = validator.validate_relationship_constraints(template)
        assert len(errors) == 1
        assert "relationships[1]" in errors[0].path
        assert "cannot be in both sprint and backlog" in errors[0].message.lower()
        assert "task-1" in errors[0].message

    def test_validate_task_backlog_sprint_mutual_exclusivity_violation(self, validator):
        """Test validation fails when task is in backlog first, then sprint."""
        from app.schemas.template import (
            TemplateBacklog,
            TemplateProject,
            TemplateSprint,
        )
        from datetime import datetime, UTC

        template = TemplateDefinition(
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
            projects=[
                TemplateProject(
                    id="project-1",
                    name="Project 1",
                )
            ],
            sprints=[
                TemplateSprint(
                    id="sprint-1",
                    name="Sprint 1",
                    start_date=datetime(2024, 1, 1, tzinfo=UTC),
                    end_date=datetime(2024, 1, 15, tzinfo=UTC),
                    project_id="project-1",
                )
            ],
            backlogs=[
                TemplateBacklog(
                    id="backlog-1",
                    name="Backlog 1",
                    project_id="project-1",
                )
            ],
            workitems=TemplateWorkitems(
                tasks=[
                    TemplateTask(
                        id="task-1",
                        title="Test Task",
                        priority=3,
                        created_by="user-1",
                    )
                ]
            ),
            relationships=[
                TemplateRelationship(
                    from_id="task-1",
                    to_id="backlog-1",
                    type=RelationshipType.IN_BACKLOG,
                ),
                TemplateRelationship(
                    from_id="task-1",
                    to_id="sprint-1",
                    type=RelationshipType.ASSIGNED_TO_SPRINT,
                ),
            ],
        )

        errors = validator.validate_relationship_constraints(template)
        assert len(errors) == 1
        assert "relationships[1]" in errors[0].path
        assert "cannot be in both sprint and backlog" in errors[0].message.lower()
        assert "task-1" in errors[0].message

    def test_validate_workpackage_single_department_constraint_violation(
        self, validator
    ):
        """Test validation fails when workpackage links to multiple departments."""
        from app.schemas.template import (
            TemplateCompany,
            TemplateDepartment,
            TemplatePhase,
            TemplateProject,
            TemplateWorkpackage,
        )

        template = TemplateDefinition(
            metadata=TemplateMetadata(
                name="test-template",
                version="1.0.0",
                description="A test template for validation",
                author="Test Author",
            ),
            settings=TemplateSettings(default_password="password123"),
            users=[],
            companies=[
                TemplateCompany(
                    id="company-1",
                    name="Company 1",
                )
            ],
            departments=[
                TemplateDepartment(
                    id="dept-1",
                    name="Department 1",
                    company_id="company-1",
                ),
                TemplateDepartment(
                    id="dept-2",
                    name="Department 2",
                    company_id="company-1",
                ),
            ],
            projects=[
                TemplateProject(
                    id="project-1",
                    name="Project 1",
                )
            ],
            phases=[
                TemplatePhase(
                    id="phase-1",
                    name="Phase 1",
                    order=1,
                    project_id="project-1",
                )
            ],
            workpackages=[
                TemplateWorkpackage(
                    id="wp-1",
                    name="Workpackage 1",
                    order=1,
                    phase_id="phase-1",
                )
            ],
            workitems=TemplateWorkitems(),
            relationships=[
                TemplateRelationship(
                    from_id="wp-1",
                    to_id="dept-1",
                    type=RelationshipType.LINKED_TO_DEPARTMENT,
                ),
                TemplateRelationship(
                    from_id="wp-1",
                    to_id="dept-2",
                    type=RelationshipType.LINKED_TO_DEPARTMENT,
                ),
            ],
        )

        errors = validator.validate_relationship_constraints(template)
        assert len(errors) == 1
        assert "relationships[1]" in errors[0].path
        assert "can only link to one department" in errors[0].message.lower()
        assert "wp-1" in errors[0].message

    def test_validate_allocated_to_missing_allocation_percentage(self, validator):
        """Test validation fails when ALLOCATED_TO lacks allocation_percentage."""
        from app.schemas.template import (
            TemplateCompany,
            TemplateDepartment,
            TemplateResource,
        )

        template = TemplateDefinition(
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
            companies=[
                TemplateCompany(
                    id="company-1",
                    name="Company 1",
                )
            ],
            departments=[
                TemplateDepartment(
                    id="dept-1",
                    name="Department 1",
                    company_id="company-1",
                )
            ],
            resources=[
                TemplateResource(
                    id="resource-1",
                    name="Resource 1",
                    type="person",
                    department_id="dept-1",
                )
            ],
            workitems=TemplateWorkitems(
                tasks=[
                    TemplateTask(
                        id="task-1",
                        title="Test Task",
                        priority=3,
                        created_by="user-1",
                    )
                ]
            ),
            relationships=[
                TemplateRelationship(
                    from_id="resource-1",
                    to_id="task-1",
                    type=RelationshipType.ALLOCATED_TO,
                    allocation_percentage=None,
                ),
            ],
        )

        errors = validator.validate_relationship_constraints(template)
        assert len(errors) == 1
        assert "relationships[0].allocation_percentage" in errors[0].path
        assert "must specify allocation_percentage" in errors[0].message.lower()

    def test_validate_allocated_to_invalid_allocation_percentage_negative(
        self, validator
    ):
        """Test that Pydantic rejects negative allocation_percentage."""
        from pydantic import ValidationError as PydanticValidationError

        # Pydantic should reject negative allocation_percentage before it reaches our validator
        with pytest.raises(PydanticValidationError) as exc_info:
            TemplateRelationship(
                from_id="resource-1",
                to_id="task-1",
                type=RelationshipType.ALLOCATED_TO,
                allocation_percentage=-10.0,
            )

        assert "greater_than_equal" in str(exc_info.value)

    def test_validate_allocated_to_invalid_allocation_percentage_over_100(
        self, validator
    ):
        """Test that Pydantic rejects allocation_percentage over 100."""
        from pydantic import ValidationError as PydanticValidationError

        # Pydantic should reject allocation_percentage > 100 before it reaches our validator
        with pytest.raises(PydanticValidationError) as exc_info:
            TemplateRelationship(
                from_id="resource-1",
                to_id="task-1",
                type=RelationshipType.ALLOCATED_TO,
                allocation_percentage=150.0,
            )

        assert "less_than_equal" in str(exc_info.value)

    def test_validate_allocated_to_valid_allocation_percentage(self, validator):
        """Test validation passes with valid allocation_percentage."""
        from app.schemas.template import (
            TemplateCompany,
            TemplateDepartment,
            TemplateResource,
        )

        template = TemplateDefinition(
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
            companies=[
                TemplateCompany(
                    id="company-1",
                    name="Company 1",
                )
            ],
            departments=[
                TemplateDepartment(
                    id="dept-1",
                    name="Department 1",
                    company_id="company-1",
                )
            ],
            resources=[
                TemplateResource(
                    id="resource-1",
                    name="Resource 1",
                    type="person",
                    department_id="dept-1",
                )
            ],
            workitems=TemplateWorkitems(
                tasks=[
                    TemplateTask(
                        id="task-1",
                        title="Test Task",
                        priority=3,
                        created_by="user-1",
                    )
                ]
            ),
            relationships=[
                TemplateRelationship(
                    from_id="resource-1",
                    to_id="task-1",
                    type=RelationshipType.ALLOCATED_TO,
                    allocation_percentage=50.0,
                ),
            ],
        )

        errors = validator.validate_relationship_constraints(template)
        assert len(errors) == 0

    def test_validate_no_relationship_constraints_violations(self, validator):
        """Test validation passes when no relationship constraints are violated."""
        from app.schemas.template import (
            TemplateBacklog,
            TemplateProject,
            TemplateSprint,
        )
        from datetime import datetime, UTC

        template = TemplateDefinition(
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
            projects=[
                TemplateProject(
                    id="project-1",
                    name="Project 1",
                )
            ],
            sprints=[
                TemplateSprint(
                    id="sprint-1",
                    name="Sprint 1",
                    start_date=datetime(2024, 1, 1, tzinfo=UTC),
                    end_date=datetime(2024, 1, 15, tzinfo=UTC),
                    project_id="project-1",
                )
            ],
            backlogs=[
                TemplateBacklog(
                    id="backlog-1",
                    name="Backlog 1",
                    project_id="project-1",
                )
            ],
            workitems=TemplateWorkitems(
                tasks=[
                    TemplateTask(
                        id="task-1",
                        title="Test Task 1",
                        priority=3,
                        created_by="user-1",
                    ),
                    TemplateTask(
                        id="task-2",
                        title="Test Task 2",
                        priority=3,
                        created_by="user-1",
                    ),
                ]
            ),
            relationships=[
                TemplateRelationship(
                    from_id="task-1",
                    to_id="sprint-1",
                    type=RelationshipType.ASSIGNED_TO_SPRINT,
                ),
                TemplateRelationship(
                    from_id="task-2",
                    to_id="backlog-1",
                    type=RelationshipType.IN_BACKLOG,
                ),
            ],
        )

        errors = validator.validate_relationship_constraints(template)
        assert len(errors) == 0


class TestValidateNewRelationshipReferences:
    """Tests for new relationship type reference validation."""

    def test_validate_assigned_to_sprint_invalid_task_reference(self, validator):
        """Test validation fails when ASSIGNED_TO_SPRINT references non-existent task."""
        from app.schemas.template import TemplateProject, TemplateSprint
        from datetime import datetime, UTC

        template = TemplateDefinition(
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
            projects=[
                TemplateProject(
                    id="project-1",
                    name="Project 1",
                )
            ],
            sprints=[
                TemplateSprint(
                    id="sprint-1",
                    name="Sprint 1",
                    start_date=datetime(2024, 1, 1, tzinfo=UTC),
                    end_date=datetime(2024, 1, 15, tzinfo=UTC),
                    project_id="project-1",
                )
            ],
            workitems=TemplateWorkitems(),
            relationships=[
                TemplateRelationship(
                    from_id="nonexistent-task",
                    to_id="sprint-1",
                    type=RelationshipType.ASSIGNED_TO_SPRINT,
                ),
            ],
        )

        errors = validator.validate_references(template)
        assert len(errors) == 1
        assert "relationships[0].from_id" in errors[0].path
        assert "nonexistent-task" in errors[0].message
        assert "not found" in errors[0].message.lower()

    def test_validate_assigned_to_sprint_invalid_sprint_reference(self, validator):
        """Test validation fails when ASSIGNED_TO_SPRINT references non-existent sprint."""
        template = TemplateDefinition(
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
                tasks=[
                    TemplateTask(
                        id="task-1",
                        title="Test Task",
                        priority=3,
                        created_by="user-1",
                    )
                ]
            ),
            relationships=[
                TemplateRelationship(
                    from_id="task-1",
                    to_id="nonexistent-sprint",
                    type=RelationshipType.ASSIGNED_TO_SPRINT,
                ),
            ],
        )

        errors = validator.validate_references(template)
        assert len(errors) == 1
        assert "relationships[0].to_id" in errors[0].path
        assert "nonexistent-sprint" in errors[0].message
        assert "sprint" in errors[0].message.lower()

    def test_validate_in_backlog_invalid_references(self, validator):
        """Test validation fails when IN_BACKLOG references are invalid."""
        template = TemplateDefinition(
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
            workitems=TemplateWorkitems(),
            relationships=[
                TemplateRelationship(
                    from_id="nonexistent-task",
                    to_id="nonexistent-backlog",
                    type=RelationshipType.IN_BACKLOG,
                ),
            ],
        )

        errors = validator.validate_references(template)
        assert len(errors) == 2
        assert any("from_id" in err.path for err in errors)
        assert any("to_id" in err.path for err in errors)

    def test_validate_linked_to_department_invalid_references(self, validator):
        """Test validation fails when LINKED_TO_DEPARTMENT references are invalid."""
        template = TemplateDefinition(
            metadata=TemplateMetadata(
                name="test-template",
                version="1.0.0",
                description="A test template for validation",
                author="Test Author",
            ),
            settings=TemplateSettings(default_password="password123"),
            users=[],
            workitems=TemplateWorkitems(),
            relationships=[
                TemplateRelationship(
                    from_id="nonexistent-workpackage",
                    to_id="nonexistent-department",
                    type=RelationshipType.LINKED_TO_DEPARTMENT,
                ),
            ],
        )

        errors = validator.validate_references(template)
        assert len(errors) == 2
        assert any("workpackage" in err.message.lower() for err in errors)
        assert any("department" in err.message.lower() for err in errors)

    def test_validate_allocated_to_invalid_resource_reference(self, validator):
        """Test validation fails when ALLOCATED_TO references non-existent resource."""
        template = TemplateDefinition(
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
                tasks=[
                    TemplateTask(
                        id="task-1",
                        title="Test Task",
                        priority=3,
                        created_by="user-1",
                    )
                ]
            ),
            relationships=[
                TemplateRelationship(
                    from_id="nonexistent-resource",
                    to_id="task-1",
                    type=RelationshipType.ALLOCATED_TO,
                    allocation_percentage=50.0,
                ),
            ],
        )

        errors = validator.validate_references(template)
        assert len(errors) == 1
        assert "relationships[0].from_id" in errors[0].path
        assert "resource" in errors[0].message.lower()

    def test_validate_allocated_to_invalid_target_reference(self, validator):
        """Test validation fails when ALLOCATED_TO references invalid target."""
        from app.schemas.template import (
            TemplateCompany,
            TemplateDepartment,
            TemplateResource,
        )

        template = TemplateDefinition(
            metadata=TemplateMetadata(
                name="test-template",
                version="1.0.0",
                description="A test template for validation",
                author="Test Author",
            ),
            settings=TemplateSettings(default_password="password123"),
            users=[],
            companies=[
                TemplateCompany(
                    id="company-1",
                    name="Company 1",
                )
            ],
            departments=[
                TemplateDepartment(
                    id="dept-1",
                    name="Department 1",
                    company_id="company-1",
                )
            ],
            resources=[
                TemplateResource(
                    id="resource-1",
                    name="Resource 1",
                    type="person",
                    department_id="dept-1",
                )
            ],
            workitems=TemplateWorkitems(),
            relationships=[
                TemplateRelationship(
                    from_id="resource-1",
                    to_id="nonexistent-project-or-task",
                    type=RelationshipType.ALLOCATED_TO,
                    allocation_percentage=50.0,
                ),
            ],
        )

        errors = validator.validate_references(template)
        assert len(errors) == 1
        assert "relationships[0].to_id" in errors[0].path
        assert "project or task" in errors[0].message.lower()

    def test_validate_parent_of_invalid_references(self, validator):
        """Test validation fails when PARENT_OF references are invalid."""
        template = TemplateDefinition(
            metadata=TemplateMetadata(
                name="test-template",
                version="1.0.0",
                description="A test template for validation",
                author="Test Author",
            ),
            settings=TemplateSettings(default_password="password123"),
            users=[],
            workitems=TemplateWorkitems(),
            relationships=[
                TemplateRelationship(
                    from_id="nonexistent-company",
                    to_id="nonexistent-department",
                    type=RelationshipType.PARENT_OF,
                ),
            ],
        )

        errors = validator.validate_references(template)
        assert len(errors) == 2
        assert any("company" in err.message.lower() for err in errors)
        assert any("department" in err.message.lower() for err in errors)

    def test_validate_belongs_to_invalid_references(self, validator):
        """Test validation fails when BELONGS_TO references are invalid."""
        template = TemplateDefinition(
            metadata=TemplateMetadata(
                name="test-template",
                version="1.0.0",
                description="A test template for validation",
                author="Test Author",
            ),
            settings=TemplateSettings(default_password="password123"),
            users=[],
            workitems=TemplateWorkitems(),
            relationships=[
                TemplateRelationship(
                    from_id="nonexistent-resource",
                    to_id="nonexistent-department",
                    type=RelationshipType.BELONGS_TO,
                ),
            ],
        )

        errors = validator.validate_references(template)
        assert len(errors) == 2
        assert "relationships[0].from_id" in errors[0].path
        assert "relationships[0].to_id" in errors[1].path

    def test_validate_all_new_relationship_types_valid(self, validator):
        """Test validation passes when all new relationship types have valid references."""
        from app.schemas.template import (
            TemplateBacklog,
            TemplateCompany,
            TemplateDepartment,
            TemplatePhase,
            TemplateProject,
            TemplateResource,
            TemplateSprint,
            TemplateWorkpackage,
        )
        from datetime import datetime, UTC

        template = TemplateDefinition(
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
            companies=[
                TemplateCompany(
                    id="company-1",
                    name="Company 1",
                )
            ],
            departments=[
                TemplateDepartment(
                    id="dept-1",
                    name="Department 1",
                    company_id="company-1",
                )
            ],
            resources=[
                TemplateResource(
                    id="resource-1",
                    name="Resource 1",
                    type="person",
                    department_id="dept-1",
                )
            ],
            projects=[
                TemplateProject(
                    id="project-1",
                    name="Project 1",
                )
            ],
            sprints=[
                TemplateSprint(
                    id="sprint-1",
                    name="Sprint 1",
                    start_date=datetime(2024, 1, 1, tzinfo=UTC),
                    end_date=datetime(2024, 1, 15, tzinfo=UTC),
                    project_id="project-1",
                )
            ],
            backlogs=[
                TemplateBacklog(
                    id="backlog-1",
                    name="Backlog 1",
                    project_id="project-1",
                )
            ],
            phases=[
                TemplatePhase(
                    id="phase-1",
                    name="Phase 1",
                    order=1,
                    project_id="project-1",
                )
            ],
            workpackages=[
                TemplateWorkpackage(
                    id="wp-1",
                    name="Workpackage 1",
                    order=1,
                    phase_id="phase-1",
                )
            ],
            workitems=TemplateWorkitems(
                tasks=[
                    TemplateTask(
                        id="task-1",
                        title="Test Task 1",
                        priority=3,
                        created_by="user-1",
                    ),
                    TemplateTask(
                        id="task-2",
                        title="Test Task 2",
                        priority=3,
                        created_by="user-1",
                    ),
                ]
            ),
            relationships=[
                # ASSIGNED_TO_SPRINT: Task -> Sprint
                TemplateRelationship(
                    from_id="task-1",
                    to_id="sprint-1",
                    type=RelationshipType.ASSIGNED_TO_SPRINT,
                ),
                # IN_BACKLOG: Task -> Backlog
                TemplateRelationship(
                    from_id="task-2",
                    to_id="backlog-1",
                    type=RelationshipType.IN_BACKLOG,
                ),
                # LINKED_TO_DEPARTMENT: Workpackage -> Department
                TemplateRelationship(
                    from_id="wp-1",
                    to_id="dept-1",
                    type=RelationshipType.LINKED_TO_DEPARTMENT,
                ),
                # ALLOCATED_TO: Resource -> Project
                TemplateRelationship(
                    from_id="resource-1",
                    to_id="project-1",
                    type=RelationshipType.ALLOCATED_TO,
                    allocation_percentage=50.0,
                ),
                # ALLOCATED_TO: Resource -> Task
                TemplateRelationship(
                    from_id="resource-1",
                    to_id="task-1",
                    type=RelationshipType.ALLOCATED_TO,
                    allocation_percentage=25.0,
                ),
                # PARENT_OF: Company -> Department
                TemplateRelationship(
                    from_id="company-1",
                    to_id="dept-1",
                    type=RelationshipType.PARENT_OF,
                ),
                # BELONGS_TO: Resource -> Department
                TemplateRelationship(
                    from_id="resource-1",
                    to_id="dept-1",
                    type=RelationshipType.BELONGS_TO,
                ),
                # BELONGS_TO: Sprint -> Project
                TemplateRelationship(
                    from_id="sprint-1",
                    to_id="project-1",
                    type=RelationshipType.BELONGS_TO,
                ),
                # BELONGS_TO: Phase -> Project
                TemplateRelationship(
                    from_id="phase-1",
                    to_id="project-1",
                    type=RelationshipType.BELONGS_TO,
                ),
                # BELONGS_TO: Workpackage -> Phase
                TemplateRelationship(
                    from_id="wp-1",
                    to_id="phase-1",
                    type=RelationshipType.BELONGS_TO,
                ),
                # BELONGS_TO: Backlog -> Project
                TemplateRelationship(
                    from_id="backlog-1",
                    to_id="project-1",
                    type=RelationshipType.BELONGS_TO,
                ),
            ],
        )

        errors = validator.validate_references(template)
        assert len(errors) == 0

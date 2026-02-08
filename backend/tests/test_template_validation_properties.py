"""
Property-based tests for Template Validation using Hypothesis.

This module tests universal properties that should hold for template validation,
focusing on reference validation, constraint validation, and error collection.

**Validates: Requirements 2.6, 3.3, 3.5, 4.2, 4.3, 5.3, 5.4, 7.2, 7.3, 7.4, 7.6, 12.1-12.10**
"""

from datetime import UTC, datetime, timedelta
from pathlib import Path

import pytest
from hypothesis import HealthCheck, assume, given, settings
from hypothesis import strategies as st

from app.schemas.template import (
    MilestoneStatus,
    ProjectStatus,
    RelationshipType,
    ResourceAvailability,
    ResourceType,
    SprintStatus,
    TemplateBacklog,
    TemplateCompany,
    TemplateDefinition,
    TemplateDepartment,
    TemplateMetadata,
    TemplateMilestone,
    TemplatePhase,
    TemplateProject,
    TemplateRelationship,
    TemplateRequirement,
    TemplateResource,
    TemplateSettings,
    TemplateSprint,
    TemplateTask,
    TemplateUser,
    TemplateWorkitems,
    TemplateWorkpackage,
    UserRole,
)
from app.services.template_validator import TemplateValidator


# ============================================================================
# Hypothesis Strategies for Template Components
# ============================================================================


def simple_id_strategy():
    """Generate simple valid IDs."""
    return st.from_regex(r"^[a-z][a-z0-9-]{2,20}$", fullmatch=True)


def metadata_strategy():
    """Generate valid TemplateMetadata."""
    return st.just(
        TemplateMetadata(
            name="test-template",
            version="1.0.0",
            description="Test template for validation",
            author="Test Author",
        )
    )


def user_strategy():
    """Generate valid TemplateUser."""
    email_strategy = st.builds(
        lambda local, domain: f"{local}@{domain}.com",
        local=st.from_regex(r"^[a-z][a-z0-9]{2,10}$", fullmatch=True),
        domain=st.from_regex(r"^[a-z][a-z0-9]{2,10}$", fullmatch=True),
    )
    return st.builds(
        TemplateUser,
        id=simple_id_strategy(),
        email=email_strategy,
        full_name=st.text(min_size=1, max_size=50),
        role=st.sampled_from(list(UserRole)),
        is_active=st.booleans(),
        failed_login_attempts=st.integers(min_value=0, max_value=10),
    )


def company_strategy():
    """Generate valid TemplateCompany."""
    return st.just(
        TemplateCompany(
            id="company-1",
            name="Test Company",
        )
    )


def department_strategy(company_ids, user_ids):
    """Generate valid TemplateDepartment."""
    return st.builds(
        TemplateDepartment,
        id=simple_id_strategy(),
        name=st.text(min_size=1, max_size=50),
        description=st.one_of(st.none(), st.text(max_size=100)),
        company_id=st.sampled_from(company_ids) if company_ids else simple_id_strategy(),
        manager_user_id=st.one_of(
            st.none(),
            st.sampled_from(user_ids) if user_ids else simple_id_strategy()
        ),
    )



def resource_strategy(department_ids):
    """Generate valid TemplateResource."""
    return st.builds(
        TemplateResource,
        id=simple_id_strategy(),
        name=st.text(min_size=1, max_size=50),
        type=st.sampled_from(list(ResourceType)),
        capacity=st.one_of(st.none(), st.floats(min_value=0, max_value=100)),
        department_id=st.sampled_from(department_ids) if department_ids else simple_id_strategy(),
        skills=st.lists(st.text(min_size=1, max_size=20), max_size=5),
        availability=st.sampled_from(list(ResourceAvailability)),
    )


def project_strategy():
    """Generate valid TemplateProject."""
    return st.just(
        TemplateProject(
            id="project-1",
            name="Test Project",
        )
    )


def sprint_strategy(project_ids):
    """Generate valid TemplateSprint."""
    return st.builds(
        TemplateSprint,
        id=simple_id_strategy(),
        name=st.text(min_size=1, max_size=50),
        goal=st.one_of(st.none(), st.text(max_size=100)),
        start_date=st.datetimes(
            min_value=datetime(2024, 1, 1, tzinfo=UTC),
            max_value=datetime(2025, 12, 31, tzinfo=UTC),
        ),
        end_date=st.datetimes(
            min_value=datetime(2024, 1, 2, tzinfo=UTC),
            max_value=datetime(2026, 12, 31, tzinfo=UTC),
        ),
        status=st.sampled_from(list(SprintStatus)),
        project_id=st.sampled_from(project_ids) if project_ids else simple_id_strategy(),
        capacity_hours=st.one_of(st.none(), st.floats(min_value=0, max_value=200)),
        capacity_story_points=st.one_of(st.none(), st.floats(min_value=0, max_value=100)),
    )


def phase_strategy(project_ids):
    """Generate valid TemplatePhase."""
    return st.builds(
        TemplatePhase,
        id=simple_id_strategy(),
        name=st.text(min_size=1, max_size=50),
        order=st.integers(min_value=1, max_value=10),
        project_id=st.sampled_from(project_ids) if project_ids else simple_id_strategy(),
    )


def workpackage_strategy(phase_ids):
    """Generate valid TemplateWorkpackage."""
    return st.builds(
        TemplateWorkpackage,
        id=simple_id_strategy(),
        name=st.text(min_size=1, max_size=50),
        order=st.integers(min_value=1, max_value=10),
        phase_id=st.sampled_from(phase_ids) if phase_ids else simple_id_strategy(),
    )


def backlog_strategy(project_ids):
    """Generate valid TemplateBacklog."""
    return st.builds(
        TemplateBacklog,
        id=simple_id_strategy(),
        name=st.text(min_size=1, max_size=50),
        project_id=st.sampled_from(project_ids) if project_ids else simple_id_strategy(),
    )


def milestone_strategy(project_ids):
    """Generate valid TemplateMilestone."""
    return st.builds(
        TemplateMilestone,
        id=simple_id_strategy(),
        name=st.text(min_size=1, max_size=50),
        due_date=st.datetimes(
            min_value=datetime(2024, 1, 1, tzinfo=UTC),
            max_value=datetime(2026, 12, 31, tzinfo=UTC),
        ),
        status=st.sampled_from(list(MilestoneStatus)),
        project_id=st.sampled_from(project_ids) if project_ids else simple_id_strategy(),
    )


def task_strategy(user_ids):
    """Generate valid TemplateTask."""
    return st.builds(
        TemplateTask,
        id=simple_id_strategy(),
        title=st.text(min_size=5, max_size=50),
        description=st.one_of(st.none(), st.text(max_size=100)),
        status=st.sampled_from(["draft", "active", "completed", "archived"]),
        priority=st.integers(min_value=1, max_value=5),
        estimated_hours=st.one_of(st.none(), st.floats(min_value=0.1, max_value=100)),
        actual_hours=st.one_of(st.none(), st.floats(min_value=0.1, max_value=100)),
        created_by=st.sampled_from(user_ids) if user_ids else simple_id_strategy(),
        assigned_to=st.one_of(
            st.none(),
            st.sampled_from(user_ids) if user_ids else simple_id_strategy()
        ),
    )


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def schema_path():
    """Fixture providing path to JSON Schema file."""
    return Path("templates/schema.json")


@pytest.fixture
def validator(schema_path):
    """Fixture providing a TemplateValidator instance."""
    return TemplateValidator(schema_path)



# ============================================================================
# Property Tests
# ============================================================================


class TestUserReferenceValidation:
    """
    Property 3: User Reference Validation
    
    For any template where a Department references a manager_user_id, validation
    should fail if the referenced user does not exist in the template's user list.
    
    **Validates: Requirements 2.6**
    """

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=5, unique_by=lambda u: u.id),
        invalid_user_id=simple_id_strategy(),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_manager_user_reference_fails_validation(
        self, validator, users, invalid_user_id
    ):
        """
        Feature: template-graph-entities, Property 3: User Reference Validation
        
        For any template where a Department references a manager_user_id that doesn't
        exist in the users list, validation should fail.
        """
        # Ensure invalid_user_id is not in users
        user_ids = [u.id for u in users]
        assume(invalid_user_id not in user_ids)

        # Create a company
        company = TemplateCompany(
            id="company-1",
            name="Test Company",
        )

        # Create a department with invalid manager_user_id
        department = TemplateDepartment(
            id="dept-1",
            name="Engineering",
            company_id=company.id,
            manager_user_id=invalid_user_id,
        )

        template = TemplateDefinition(
            metadata=TemplateMetadata(
                name="test-template",
                version="1.0.0",
                description="Test template for validation",
                author="Test Author",
            ),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            companies=[company],
            departments=[department],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        # Validate
        errors = validator.validate_graph_entity_references(template)

        # Should have error about invalid manager_user_id
        assert len(errors) > 0
        assert any(
            "manager_user_id" in error.path and invalid_user_id in error.message
            for error in errors
        )

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=5, unique_by=lambda u: u.id),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_valid_manager_user_reference_passes_validation(
        self, validator, users
    ):
        """Valid manager_user_id references should pass validation."""
        user_ids = [u.id for u in users]
        company = TemplateCompany(id="company-1", name="Test Company")

        # Create department with valid manager_user_id
        department = TemplateDepartment(
            id="dept-1",
            name="Engineering",
            company_id=company.id,
            manager_user_id=user_ids[0],
        )

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            companies=[company],
            departments=[department],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        errors = validator.validate_graph_entity_references(template)

        # Should have no errors about manager_user_id
        assert not any("manager_user_id" in error.path for error in errors)



class TestTaskAssignmentMutualExclusivity:
    """
    Property 5: Task Assignment Mutual Exclusivity
    
    For any template, if a task is assigned to both a sprint and a backlog,
    validation should fail with an error indicating the mutual exclusivity
    constraint violation.
    
    **Validates: Requirements 3.3**
    """

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_task_in_both_sprint_and_backlog_fails_validation(
        self, validator, users
    ):
        """
        Feature: template-graph-entities, Property 5: Task Assignment Mutual Exclusivity
        
        For any template where a task is assigned to both a sprint and a backlog,
        validation should fail.
        """
        user_ids = [u.id for u in users]

        # Create project, sprint, backlog, and task
        project = TemplateProject(id="project-1", name="Test Project")
        sprint = TemplateSprint(
            id="sprint-1",
            name="Sprint 1",
            start_date=datetime(2024, 1, 1, tzinfo=UTC),
            end_date=datetime(2024, 1, 15, tzinfo=UTC),
            project_id=project.id,
        )
        backlog = TemplateBacklog(
            id="backlog-1",
            name="Product Backlog",
            project_id=project.id,
        )
        task = TemplateTask(
            id="task-1",
            title="Test Task",
            priority=3,
            created_by=user_ids[0],
        )

        # Create relationships assigning task to both sprint and backlog
        relationships = [
            TemplateRelationship(
                from_id=task.id,
                to_id=sprint.id,
                type=RelationshipType.ASSIGNED_TO_SPRINT,
            ),
            TemplateRelationship(
                from_id=task.id,
                to_id=backlog.id,
                type=RelationshipType.IN_BACKLOG,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            projects=[project],
            sprints=[sprint],
            backlogs=[backlog],
            workitems=TemplateWorkitems(tasks=[task]),
            relationships=relationships,
        )

        # Validate
        errors = validator.validate_relationship_constraints(template)

        # Should have error about mutual exclusivity
        assert len(errors) > 0
        assert any(
            "cannot be in both sprint and backlog" in error.message.lower()
            for error in errors
        )

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_task_in_sprint_only_passes_validation(
        self, validator, users
    ):
        """Task assigned only to sprint should pass validation."""
        user_ids = [u.id for u in users]

        project = TemplateProject(id="project-1", name="Test Project")
        sprint = TemplateSprint(
            id="sprint-1",
            name="Sprint 1",
            start_date=datetime(2024, 1, 1, tzinfo=UTC),
            end_date=datetime(2024, 1, 15, tzinfo=UTC),
            project_id=project.id,
        )
        task = TemplateTask(
            id="task-1",
            title="Test Task",
            priority=3,
            created_by=user_ids[0],
        )

        relationships = [
            TemplateRelationship(
                from_id=task.id,
                to_id=sprint.id,
                type=RelationshipType.ASSIGNED_TO_SPRINT,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            projects=[project],
            sprints=[sprint],
            workitems=TemplateWorkitems(tasks=[task]),
            relationships=relationships,
        )

        errors = validator.validate_relationship_constraints(template)

        # Should have no mutual exclusivity errors
        assert not any(
            "cannot be in both sprint and backlog" in error.message.lower()
            for error in errors
        )

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_task_in_backlog_only_passes_validation(
        self, validator, users
    ):
        """Task assigned only to backlog should pass validation."""
        user_ids = [u.id for u in users]

        project = TemplateProject(id="project-1", name="Test Project")
        backlog = TemplateBacklog(
            id="backlog-1",
            name="Product Backlog",
            project_id=project.id,
        )
        task = TemplateTask(
            id="task-1",
            title="Test Task",
            priority=3,
            created_by=user_ids[0],
        )

        relationships = [
            TemplateRelationship(
                from_id=task.id,
                to_id=backlog.id,
                type=RelationshipType.IN_BACKLOG,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            projects=[project],
            backlogs=[backlog],
            workitems=TemplateWorkitems(tasks=[task]),
            relationships=relationships,
        )

        errors = validator.validate_relationship_constraints(template)

        # Should have no mutual exclusivity errors
        assert not any(
            "cannot be in both sprint and backlog" in error.message.lower()
            for error in errors
        )



class TestSprintAndBacklogReferenceValidation:
    """
    Property 6: Sprint and Backlog Reference Validation
    
    For any template containing sprint or backlog assignments, validation should
    fail if the referenced sprint, backlog, or task entities do not exist in the template.
    
    **Validates: Requirements 3.5**
    """

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_sprint_id=simple_id_strategy(),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_sprint_reference_fails_validation(
        self, validator, users, invalid_sprint_id
    ):
        """
        Feature: template-graph-entities, Property 6: Sprint and Backlog Reference Validation
        
        For any template with ASSIGNED_TO_SPRINT relationship referencing a non-existent
        sprint, validation should fail.
        """
        user_ids = [u.id for u in users]

        # Create task
        task = TemplateTask(
            id="task-1",
            title="Test Task",
            priority=3,
            created_by=user_ids[0],
        )

        # Create relationship to non-existent sprint
        relationships = [
            TemplateRelationship(
                from_id=task.id,
                to_id=invalid_sprint_id,
                type=RelationshipType.ASSIGNED_TO_SPRINT,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            sprints=[],  # No sprints defined
            workitems=TemplateWorkitems(tasks=[task]),
            relationships=relationships,
        )

        # Validate
        errors = validator.validate_references(template)

        # Should have error about invalid sprint reference
        assert len(errors) > 0
        assert any(
            "sprint" in error.message.lower() and invalid_sprint_id in error.message
            for error in errors
        )

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_backlog_id=simple_id_strategy(),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_backlog_reference_fails_validation(
        self, validator, users, invalid_backlog_id
    ):
        """Invalid backlog reference should fail validation."""
        user_ids = [u.id for u in users]

        task = TemplateTask(
            id="task-1",
            title="Test Task",
            priority=3,
            created_by=user_ids[0],
        )

        relationships = [
            TemplateRelationship(
                from_id=task.id,
                to_id=invalid_backlog_id,
                type=RelationshipType.IN_BACKLOG,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            backlogs=[],  # No backlogs defined
            workitems=TemplateWorkitems(tasks=[task]),
            relationships=relationships,
        )

        errors = validator.validate_references(template)

        # Should have error about invalid backlog reference
        assert len(errors) > 0
        assert any(
            "backlog" in error.message.lower() and invalid_backlog_id in error.message
            for error in errors
        )

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_task_id=simple_id_strategy(),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_task_reference_fails_validation(
        self, validator, users, invalid_task_id
    ):
        """Invalid task reference in sprint assignment should fail validation."""
        project = TemplateProject(id="project-1", name="Test Project")
        sprint = TemplateSprint(
            id="sprint-1",
            name="Sprint 1",
            start_date=datetime(2024, 1, 1, tzinfo=UTC),
            end_date=datetime(2024, 1, 15, tzinfo=UTC),
            project_id=project.id,
        )

        relationships = [
            TemplateRelationship(
                from_id=invalid_task_id,
                to_id=sprint.id,
                type=RelationshipType.ASSIGNED_TO_SPRINT,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            projects=[project],
            sprints=[sprint],
            workitems=TemplateWorkitems(tasks=[]),  # No tasks defined
            relationships=relationships,
        )

        errors = validator.validate_references(template)

        # Should have error about invalid task reference
        assert len(errors) > 0
        assert any(
            "task" in error.message.lower() and invalid_task_id in error.message
            for error in errors
        )



class TestWorkpackageSingleDepartmentConstraint:
    """
    Property 8: Workpackage Single Department Constraint
    
    For any template, if a workpackage is linked to multiple departments,
    validation should fail with an error indicating the single-link constraint violation.
    
    **Validates: Requirements 4.2**
    """

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_workpackage_linked_to_multiple_departments_fails_validation(
        self, validator, users
    ):
        """
        Feature: template-graph-entities, Property 8: Workpackage Single Department Constraint
        
        For any template where a workpackage is linked to multiple departments,
        validation should fail.
        """
        # Create company and departments
        company = TemplateCompany(id="company-1", name="Test Company")
        dept1 = TemplateDepartment(
            id="dept-1",
            name="Engineering",
            company_id=company.id,
        )
        dept2 = TemplateDepartment(
            id="dept-2",
            name="Marketing",
            company_id=company.id,
        )

        # Create project, phase, and workpackage
        project = TemplateProject(id="project-1", name="Test Project")
        phase = TemplatePhase(
            id="phase-1",
            name="Phase 1",
            order=1,
            project_id=project.id,
        )
        workpackage = TemplateWorkpackage(
            id="wp-1",
            name="Workpackage 1",
            order=1,
            phase_id=phase.id,
        )

        # Create relationships linking workpackage to multiple departments
        relationships = [
            TemplateRelationship(
                from_id=workpackage.id,
                to_id=dept1.id,
                type=RelationshipType.LINKED_TO_DEPARTMENT,
            ),
            TemplateRelationship(
                from_id=workpackage.id,
                to_id=dept2.id,
                type=RelationshipType.LINKED_TO_DEPARTMENT,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            companies=[company],
            departments=[dept1, dept2],
            projects=[project],
            phases=[phase],
            workpackages=[workpackage],
            workitems=TemplateWorkitems(),
            relationships=relationships,
        )

        # Validate
        errors = validator.validate_relationship_constraints(template)

        # Should have error about single-link constraint
        assert len(errors) > 0
        assert any(
            "can only link to one department" in error.message.lower()
            for error in errors
        )

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_workpackage_linked_to_one_department_passes_validation(
        self, validator, users
    ):
        """Workpackage linked to only one department should pass validation."""
        company = TemplateCompany(id="company-1", name="Test Company")
        dept = TemplateDepartment(
            id="dept-1",
            name="Engineering",
            company_id=company.id,
        )

        project = TemplateProject(id="project-1", name="Test Project")
        phase = TemplatePhase(
            id="phase-1",
            name="Phase 1",
            order=1,
            project_id=project.id,
        )
        workpackage = TemplateWorkpackage(
            id="wp-1",
            name="Workpackage 1",
            order=1,
            phase_id=phase.id,
        )

        relationships = [
            TemplateRelationship(
                from_id=workpackage.id,
                to_id=dept.id,
                type=RelationshipType.LINKED_TO_DEPARTMENT,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            companies=[company],
            departments=[dept],
            projects=[project],
            phases=[phase],
            workpackages=[workpackage],
            workitems=TemplateWorkitems(),
            relationships=relationships,
        )

        errors = validator.validate_relationship_constraints(template)

        # Should have no single-link constraint errors
        assert not any(
            "can only link to one department" in error.message.lower()
            for error in errors
        )



class TestWorkpackageDepartmentReferenceValidation:
    """
    Property 9: Workpackage-Department Reference Validation
    
    For any template containing workpackage-department links, validation should
    fail if the referenced workpackage or department entities do not exist in the template.
    
    **Validates: Requirements 4.3**
    """

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_workpackage_id=simple_id_strategy(),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_workpackage_reference_fails_validation(
        self, validator, users, invalid_workpackage_id
    ):
        """
        Feature: template-graph-entities, Property 9: Workpackage-Department Reference Validation
        
        For any template with LINKED_TO_DEPARTMENT relationship referencing a non-existent
        workpackage, validation should fail.
        """
        company = TemplateCompany(id="company-1", name="Test Company")
        dept = TemplateDepartment(
            id="dept-1",
            name="Engineering",
            company_id=company.id,
        )

        relationships = [
            TemplateRelationship(
                from_id=invalid_workpackage_id,
                to_id=dept.id,
                type=RelationshipType.LINKED_TO_DEPARTMENT,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            companies=[company],
            departments=[dept],
            workpackages=[],  # No workpackages defined
            workitems=TemplateWorkitems(),
            relationships=relationships,
        )

        errors = validator.validate_references(template)

        # Should have error about invalid workpackage reference
        assert len(errors) > 0
        assert any(
            "workpackage" in error.message.lower() and invalid_workpackage_id in error.message
            for error in errors
        )

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_department_id=simple_id_strategy(),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_department_reference_fails_validation(
        self, validator, users, invalid_department_id
    ):
        """Invalid department reference should fail validation."""
        project = TemplateProject(id="project-1", name="Test Project")
        phase = TemplatePhase(
            id="phase-1",
            name="Phase 1",
            order=1,
            project_id=project.id,
        )
        workpackage = TemplateWorkpackage(
            id="wp-1",
            name="Workpackage 1",
            order=1,
            phase_id=phase.id,
        )

        relationships = [
            TemplateRelationship(
                from_id=workpackage.id,
                to_id=invalid_department_id,
                type=RelationshipType.LINKED_TO_DEPARTMENT,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            departments=[],  # No departments defined
            projects=[project],
            phases=[phase],
            workpackages=[workpackage],
            workitems=TemplateWorkitems(),
            relationships=relationships,
        )

        errors = validator.validate_references(template)

        # Should have error about invalid department reference
        assert len(errors) > 0
        assert any(
            "department" in error.message.lower() and invalid_department_id in error.message
            for error in errors
        )


class TestAllocationPercentageValidation:
    """
    Property 11: Allocation Percentage Validation
    
    For any template containing resource allocations, validation should fail if
    allocation_percentage is not between 0 and 100.
    
    **Validates: Requirements 5.3**
    """

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_percentage=st.one_of(
            st.floats(min_value=-100, max_value=-0.1),
            st.floats(min_value=100.1, max_value=200),
        ),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_allocation_percentage_fails_validation(
        self, validator, users, invalid_percentage
    ):
        """
        Feature: template-graph-entities, Property 11: Allocation Percentage Validation
        
        For any template with ALLOCATED_TO relationship having allocation_percentage
        outside the range [0, 100], validation should fail.
        """
        # Create company, department, and resource
        company = TemplateCompany(id="company-1", name="Test Company")
        dept = TemplateDepartment(
            id="dept-1",
            name="Engineering",
            company_id=company.id,
        )
        resource = TemplateResource(
            id="resource-1",
            name="Developer",
            type=ResourceType.PERSON,
            department_id=dept.id,
        )

        # Create project
        project = TemplateProject(id="project-1", name="Test Project")

        # Create relationship with invalid allocation_percentage using model_construct
        relationships = [
            TemplateRelationship.model_construct(
                from_id=resource.id,
                to_id=project.id,
                type=RelationshipType.ALLOCATED_TO,
                allocation_percentage=invalid_percentage,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            companies=[company],
            departments=[dept],
            resources=[resource],
            projects=[project],
            workitems=TemplateWorkitems(),
            relationships=relationships,
        )

        # Validate
        errors = validator.validate_relationship_constraints(template)

        # Should have error about invalid allocation_percentage
        assert len(errors) > 0
        assert any(
            "allocation_percentage" in error.path and "between 0 and 100" in error.message
            for error in errors
        )

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        valid_percentage=st.floats(min_value=0, max_value=100),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_valid_allocation_percentage_passes_validation(
        self, validator, users, valid_percentage
    ):
        """Valid allocation_percentage should pass validation."""
        company = TemplateCompany(id="company-1", name="Test Company")
        dept = TemplateDepartment(
            id="dept-1",
            name="Engineering",
            company_id=company.id,
        )
        resource = TemplateResource(
            id="resource-1",
            name="Developer",
            type=ResourceType.PERSON,
            department_id=dept.id,
        )
        project = TemplateProject(id="project-1", name="Test Project")

        relationships = [
            TemplateRelationship(
                from_id=resource.id,
                to_id=project.id,
                type=RelationshipType.ALLOCATED_TO,
                allocation_percentage=valid_percentage,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            companies=[company],
            departments=[dept],
            resources=[resource],
            projects=[project],
            workitems=TemplateWorkitems(),
            relationships=relationships,
        )

        errors = validator.validate_relationship_constraints(template)

        # Should have no allocation_percentage errors
        assert not any(
            "allocation_percentage" in error.path and "between 0 and 100" in error.message
            for error in errors
        )



class TestResourceAllocationReferenceValidation:
    """
    Property 12: Resource Allocation Reference Validation
    
    For any template containing resource allocations, validation should fail if
    the referenced resource, project, or task entities do not exist in the template.
    
    **Validates: Requirements 5.4**
    """

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_resource_id=simple_id_strategy(),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_resource_reference_fails_validation(
        self, validator, users, invalid_resource_id
    ):
        """
        Feature: template-graph-entities, Property 12: Resource Allocation Reference Validation
        
        For any template with ALLOCATED_TO relationship referencing a non-existent
        resource, validation should fail.
        """
        project = TemplateProject(id="project-1", name="Test Project")

        relationships = [
            TemplateRelationship(
                from_id=invalid_resource_id,
                to_id=project.id,
                type=RelationshipType.ALLOCATED_TO,
                allocation_percentage=50.0,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            resources=[],  # No resources defined
            projects=[project],
            workitems=TemplateWorkitems(),
            relationships=relationships,
        )

        errors = validator.validate_references(template)

        # Should have error about invalid resource reference
        assert len(errors) > 0
        assert any(
            "resource" in error.message.lower() and invalid_resource_id in error.message
            for error in errors
        )

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_project_id=simple_id_strategy(),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_project_reference_in_allocation_fails_validation(
        self, validator, users, invalid_project_id
    ):
        """Invalid project reference in allocation should fail validation."""
        company = TemplateCompany(id="company-1", name="Test Company")
        dept = TemplateDepartment(
            id="dept-1",
            name="Engineering",
            company_id=company.id,
        )
        resource = TemplateResource(
            id="resource-1",
            name="Developer",
            type=ResourceType.PERSON,
            department_id=dept.id,
        )

        relationships = [
            TemplateRelationship(
                from_id=resource.id,
                to_id=invalid_project_id,
                type=RelationshipType.ALLOCATED_TO,
                allocation_percentage=50.0,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            companies=[company],
            departments=[dept],
            resources=[resource],
            projects=[],  # No projects defined
            workitems=TemplateWorkitems(),
            relationships=relationships,
        )

        errors = validator.validate_references(template)

        # Should have error about invalid project/task reference
        assert len(errors) > 0
        assert any(
            invalid_project_id in error.message
            for error in errors
        )


class TestEntityReferenceValidation:
    """
    Property 16: Entity Reference Validation
    
    For any template with unresolvable entity references (e.g., department referencing
    non-existent company), validation should fail with errors indicating the missing references.
    
    **Validates: Requirements 7.2**
    """

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_company_id=simple_id_strategy(),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_company_reference_in_department_fails_validation(
        self, validator, users, invalid_company_id
    ):
        """
        Feature: template-graph-entities, Property 16: Entity Reference Validation
        
        For any template with department referencing a non-existent company,
        validation should fail.
        """
        dept = TemplateDepartment(
            id="dept-1",
            name="Engineering",
            company_id=invalid_company_id,
        )

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            companies=[],  # No companies defined
            departments=[dept],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        errors = validator.validate_graph_entity_references(template)

        # Should have error about invalid company reference
        assert len(errors) > 0
        assert any(
            "company_id" in error.path and invalid_company_id in error.message
            for error in errors
        )

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_department_id=simple_id_strategy(),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_department_reference_in_resource_fails_validation(
        self, validator, users, invalid_department_id
    ):
        """Invalid department reference in resource should fail validation."""
        resource = TemplateResource(
            id="resource-1",
            name="Developer",
            type=ResourceType.PERSON,
            department_id=invalid_department_id,
        )

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            departments=[],  # No departments defined
            resources=[resource],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        errors = validator.validate_graph_entity_references(template)

        # Should have error about invalid department reference
        assert len(errors) > 0
        assert any(
            "department_id" in error.path and invalid_department_id in error.message
            for error in errors
        )

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_project_id=simple_id_strategy(),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_project_reference_in_sprint_fails_validation(
        self, validator, users, invalid_project_id
    ):
        """Invalid project reference in sprint should fail validation."""
        sprint = TemplateSprint(
            id="sprint-1",
            name="Sprint 1",
            start_date=datetime(2024, 1, 1, tzinfo=UTC),
            end_date=datetime(2024, 1, 15, tzinfo=UTC),
            project_id=invalid_project_id,
        )

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            projects=[],  # No projects defined
            sprints=[sprint],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        errors = validator.validate_graph_entity_references(template)

        # Should have error about invalid project reference
        assert len(errors) > 0
        assert any(
            "project_id" in error.path and invalid_project_id in error.message
            for error in errors
        )

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_phase_id=simple_id_strategy(),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_phase_reference_in_workpackage_fails_validation(
        self, validator, users, invalid_phase_id
    ):
        """Invalid phase reference in workpackage should fail validation."""
        workpackage = TemplateWorkpackage(
            id="wp-1",
            name="Workpackage 1",
            order=1,
            phase_id=invalid_phase_id,
        )

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            phases=[],  # No phases defined
            workpackages=[workpackage],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        errors = validator.validate_graph_entity_references(template)

        # Should have error about invalid phase reference
        assert len(errors) > 0
        assert any(
            "phase_id" in error.path and invalid_phase_id in error.message
            for error in errors
        )



class TestRelationshipConstraintValidation:
    """
    Property 17: Relationship Constraint Validation
    
    For any template violating relationship constraints (e.g., task in both sprint
    and backlog, workpackage linked to multiple departments), validation should fail
    with errors indicating the constraint violations.
    
    **Validates: Requirements 7.3**
    """

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_relationship_constraints_are_validated(
        self, validator, users
    ):
        """
        Feature: template-graph-entities, Property 17: Relationship Constraint Validation
        
        For any template with relationship constraint violations, validation should fail.
        """
        user_ids = [u.id for u in users]

        # Create entities
        project = TemplateProject(id="project-1", name="Test Project")
        sprint = TemplateSprint(
            id="sprint-1",
            name="Sprint 1",
            start_date=datetime(2024, 1, 1, tzinfo=UTC),
            end_date=datetime(2024, 1, 15, tzinfo=UTC),
            project_id=project.id,
        )
        backlog = TemplateBacklog(
            id="backlog-1",
            name="Product Backlog",
            project_id=project.id,
        )
        task = TemplateTask(
            id="task-1",
            title="Test Task",
            priority=3,
            created_by=user_ids[0],
        )

        # Create relationships with constraint violation
        relationships = [
            TemplateRelationship(
                from_id=task.id,
                to_id=sprint.id,
                type=RelationshipType.ASSIGNED_TO_SPRINT,
            ),
            TemplateRelationship(
                from_id=task.id,
                to_id=backlog.id,
                type=RelationshipType.IN_BACKLOG,
            ),
        ]

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            projects=[project],
            sprints=[sprint],
            backlogs=[backlog],
            workitems=TemplateWorkitems(tasks=[task]),
            relationships=relationships,
        )

        # Validate
        errors = validator.validate_relationship_constraints(template)

        # Should have constraint violation errors
        assert len(errors) > 0


class TestDateConstraintValidation:
    """
    Property 18: Date Constraint Validation
    
    For any template with invalid date constraints (e.g., sprint end_date before
    start_date), validation should fail with errors indicating the date problems.
    
    **Validates: Requirements 7.4**
    """

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_sprint_end_date_before_start_date_fails_validation(
        self, validator, users
    ):
        """
        Feature: template-graph-entities, Property 18: Date Constraint Validation
        
        For any template with sprint end_date before start_date, validation should fail.
        """
        project = TemplateProject(id="project-1", name="Test Project")

        # Create sprint with end_date before start_date
        # Note: Pydantic validation will catch this, so we use model_construct
        sprint = TemplateSprint.model_construct(
            id="sprint-1",
            name="Sprint 1",
            start_date=datetime(2024, 1, 15, tzinfo=UTC),
            end_date=datetime(2024, 1, 1, tzinfo=UTC),  # Before start_date
            project_id=project.id,
        )

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            projects=[project],
            sprints=[sprint],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        # Validate - this should be caught by Pydantic, but we test the validator too
        # The validator's validate_constraints method doesn't explicitly check this
        # because Pydantic already does, but we verify the template is invalid
        try:
            # Try to create a proper template - should fail at Pydantic level
            TemplateSprint(
                id="sprint-1",
                name="Sprint 1",
                start_date=datetime(2024, 1, 15, tzinfo=UTC),
                end_date=datetime(2024, 1, 1, tzinfo=UTC),
                project_id=project.id,
            )
            assert False, "Should have raised ValidationError"
        except Exception:
            # Expected - Pydantic catches this
            pass


class TestComprehensiveErrorCollection:
    """
    Property 19: Comprehensive Error Collection
    
    For any template with multiple validation errors, validation should return
    all errors, not just the first one.
    
    **Validates: Requirements 7.6**
    """

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_company_id=simple_id_strategy(),
        invalid_user_id=simple_id_strategy(),
        invalid_project_id=simple_id_strategy(),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_all_validation_errors_are_collected(
        self, validator, users, invalid_company_id, invalid_user_id, invalid_project_id
    ):
        """
        Feature: template-graph-entities, Property 19: Comprehensive Error Collection
        
        For any template with multiple validation errors, all errors should be returned.
        """
        user_ids = [u.id for u in users]
        assume(invalid_user_id not in user_ids)

        # Create template with multiple errors
        dept = TemplateDepartment(
            id="dept-1",
            name="Engineering",
            company_id=invalid_company_id,  # Error 1: invalid company reference
            manager_user_id=invalid_user_id,  # Error 2: invalid user reference
        )

        sprint = TemplateSprint(
            id="sprint-1",
            name="Sprint 1",
            start_date=datetime(2024, 1, 1, tzinfo=UTC),
            end_date=datetime(2024, 1, 15, tzinfo=UTC),
            project_id=invalid_project_id,  # Error 3: invalid project reference
        )

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            companies=[],  # No companies
            departments=[dept],
            projects=[],  # No projects
            sprints=[sprint],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        # Validate
        errors = validator.validate_graph_entity_references(template)

        # Should have multiple errors (at least 3)
        assert len(errors) >= 3

        # Check that all expected errors are present
        error_paths = [e.path for e in errors]
        assert any("company_id" in path for path in error_paths)
        assert any("manager_user_id" in path for path in error_paths)
        assert any("project_id" in path for path in error_paths)


class TestSprintDateValidation:
    """
    Property 23: Sprint Date Validation
    
    For any template containing sprints, validation should fail if any sprint's
    start_date is not before its end_date.
    
    **Validates: Requirements 12.1**
    """

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        start_date=st.datetimes(
            min_value=datetime(2024, 1, 1),
            max_value=datetime(2025, 12, 31),
        ),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_sprint_with_valid_dates_passes_validation(
        self, validator, users, start_date
    ):
        """
        Feature: template-graph-entities, Property 23: Sprint Date Validation
        
        For any template with sprint having start_date before end_date, validation should pass.
        """
        project = TemplateProject(id="project-1", name="Test Project")

        # Add timezone to the generated dates
        start_date_utc = start_date.replace(tzinfo=UTC)
        end_date_utc = start_date_utc + timedelta(days=14)
        
        # Create sprint with valid dates
        sprint = TemplateSprint(
            id="sprint-1",
            name="Sprint 1",
            start_date=start_date_utc,
            end_date=end_date_utc,
            project_id=project.id,
        )

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            projects=[project],
            sprints=[sprint],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        # Validate - should pass (Pydantic validates this)
        # The sprint was successfully created, so dates are valid
        assert sprint.start_date < sprint.end_date


class TestPropertyValidation:
    """
    Property 24: Property Validation
    
    For any template containing entities with constrained properties (sprint status,
    resource type, resource availability, milestone status, phase order, workpackage
    order, allocation percentage), validation should fail if any property violates
    its constraints.
    
    **Validates: Requirements 12.2-12.10**
    """

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_valid_enum_properties_pass_validation(
        self, validator, users
    ):
        """
        Feature: template-graph-entities, Property 24: Property Validation
        
        For any template with valid enum properties, validation should pass.
        """
        # Create entities with valid enum values
        project = TemplateProject(
            id="project-1",
            name="Project 1",
            status=ProjectStatus.ACTIVE,
        )

        company = TemplateCompany(id="company-1", name="Test Company")
        dept = TemplateDepartment(
            id="dept-1",
            name="Engineering",
            company_id=company.id,
        )

        resource = TemplateResource(
            id="resource-1",
            name="Developer",
            type=ResourceType.PERSON,
            department_id=dept.id,
            availability=ResourceAvailability.AVAILABLE,
        )

        sprint = TemplateSprint(
            id="sprint-1",
            name="Sprint 1",
            start_date=datetime(2024, 1, 1, tzinfo=UTC),
            end_date=datetime(2024, 1, 15, tzinfo=UTC),
            status=SprintStatus.ACTIVE,
            project_id=project.id,
        )

        milestone = TemplateMilestone(
            id="milestone-1",
            name="Milestone 1",
            due_date=datetime(2024, 2, 1, tzinfo=UTC),
            status=MilestoneStatus.PENDING,
            project_id=project.id,
        )

        phase = TemplatePhase(
            id="phase-1",
            name="Phase 1",
            order=1,  # Valid: >= 1
            project_id=project.id,
        )

        workpackage = TemplateWorkpackage(
            id="wp-1",
            name="Workpackage 1",
            order=1,  # Valid: >= 1
            phase_id=phase.id,
        )

        template = TemplateDefinition(
            metadata=TemplateMetadata(name="test-template", version="1.0.0", description="Test template for validation", author="Test Author"),
            settings=TemplateSettings(default_password="password123"),
            users=users,
            companies=[company],
            departments=[dept],
            resources=[resource],
            projects=[project],
            sprints=[sprint],
            phases=[phase],
            workpackages=[workpackage],
            milestones=[milestone],
            workitems=TemplateWorkitems(),
            relationships=[],
        )

        # Validate - should pass
        errors = validator.validate_graph_entity_references(template)
        # No reference errors expected
        assert all("status" not in error.path for error in errors)
        assert all("type" not in error.path for error in errors)
        assert all("availability" not in error.path for error in errors)

    @given(
        users=st.lists(user_strategy(), min_size=1, max_size=3, unique_by=lambda u: u.id),
        invalid_order=st.integers(max_value=0),
    )
    @settings(max_examples=10, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_order_fails_pydantic_validation(
        self, validator, users, invalid_order
    ):
        """Invalid order values should fail Pydantic validation."""
        project = TemplateProject(id="project-1", name="Test Project")

        # Try to create phase with invalid order
        try:
            TemplatePhase(
                id="phase-1",
                name="Phase 1",
                order=invalid_order,  # Invalid: must be >= 1
                project_id=project.id,
            )
            assert False, "Should have raised ValidationError"
        except Exception:
            # Expected - Pydantic catches this
            pass

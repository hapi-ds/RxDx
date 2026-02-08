"""
Property-based tests for Pydantic Schema Validation using Hypothesis.

This module tests that templates with invalid structure fail validation
with appropriate errors, focusing on Pydantic schema validation.

**Feature: template-graph-entities, Property 15: Schema Validation**
**Validates: Requirements 7.1**
"""

from datetime import UTC, datetime, timedelta

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st
from pydantic import ValidationError

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
    TemplateResource,
    TemplateSettings,
    TemplateSprint,
    TemplateWorkpackage,
    UserRole,
)


# ============================================================================
# Hypothesis Strategies for Invalid Data
# ============================================================================


def invalid_string_strategy():
    """Generate invalid strings (empty, too long, wrong type)."""
    return st.one_of(
        st.just(""),  # Empty string
        st.text(min_size=201, max_size=300),  # Too long for most fields
        st.none(),  # None when string required
    )


def invalid_id_strategy():
    """Generate invalid IDs (empty, too long)."""
    return st.one_of(
        st.just(""),  # Empty
        st.text(min_size=101, max_size=150),  # Too long
    )


def invalid_integer_strategy():
    """Generate invalid integers (negative, zero)."""
    return st.one_of(
        st.integers(max_value=-1),  # Negative
        st.just(0),  # Zero when >= 1 required
    )


def invalid_float_strategy():
    """Generate invalid floats (negative, too large)."""
    return st.one_of(
        st.floats(min_value=-100, max_value=-0.1),  # Negative when >= 0 required
        st.floats(min_value=101, max_value=200),  # > 100 for percentage
    )


def invalid_datetime_strategy():
    """Generate invalid datetime values."""
    return st.one_of(
        st.text(min_size=1, max_size=20),  # String when datetime required
        st.integers(),  # Integer when datetime required
    )


def invalid_enum_strategy():
    """Generate invalid enum values."""
    return st.text(
        min_size=1,
        max_size=20,
        alphabet=st.characters(
            whitelist_categories=("Lu", "Ll"),
            min_codepoint=65,
            max_codepoint=122,
        ),
    ).filter(
        lambda s: s
        not in [
            "person",
            "machine",
            "equipment",
            "facility",
            "other",
            "available",
            "unavailable",
            "limited",
            "planning",
            "active",
            "on_hold",
            "completed",
            "cancelled",
            "pending",
            "in_progress",
        ]
    )


# ============================================================================
# Property-Based Tests for Schema Validation
# ============================================================================


class TestPydanticSchemaValidationProperties:
    """
    Property-based tests for Pydantic schema validation.

    **Feature: template-graph-entities, Property 15: Schema Validation**
    **Validates: Requirements 7.1**
    """

    @settings(max_examples=100, deadline=2000)
    @given(invalid_id=invalid_id_strategy())
    def test_company_invalid_id_fails_validation(self, invalid_id):
        """
        Property 15: Schema Validation - Company Invalid ID

        For any template with a Company having an invalid ID (empty, too long,
        or special characters), Pydantic validation SHALL fail with an
        appropriate error message.

        **Validates: Requirements 7.1**
        """
        with pytest.raises(ValidationError) as exc_info:
            TemplateCompany(
                id=invalid_id,
                name="Valid Company Name",
                description="Valid description",
            )

        # Verify error is related to the id field
        errors = exc_info.value.errors()
        assert any(
            "id" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'id' field, got: {errors}"

    @settings(max_examples=100, deadline=2000)
    @given(invalid_name=invalid_string_strategy())
    def test_company_invalid_name_fails_validation(self, invalid_name):
        """
        Property 15: Schema Validation - Company Invalid Name

        For any template with a Company having an invalid name (empty or too long),
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        with pytest.raises(ValidationError) as exc_info:
            TemplateCompany(
                id="valid-company-id",
                name=invalid_name,
                description="Valid description",
            )

        # Verify error is related to the name field
        errors = exc_info.value.errors()
        assert any(
            "name" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'name' field, got: {errors}"

    @settings(max_examples=100, deadline=2000)
    @given(invalid_type=invalid_enum_strategy())
    def test_resource_invalid_type_fails_validation(self, invalid_type):
        """
        Property 15: Schema Validation - Resource Invalid Type

        For any template with a Resource having an invalid type (not in enum),
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        with pytest.raises(ValidationError) as exc_info:
            TemplateResource(
                id="valid-resource-id",
                name="Valid Resource Name",
                type=invalid_type,
                department_id="valid-dept-id",
            )

        # Verify error is related to the type field
        errors = exc_info.value.errors()
        assert any(
            "type" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'type' field, got: {errors}"

    @settings(max_examples=100, deadline=2000)
    @given(invalid_capacity=invalid_float_strategy())
    def test_resource_invalid_capacity_fails_validation(self, invalid_capacity):
        """
        Property 15: Schema Validation - Resource Invalid Capacity

        For any template with a Resource having an invalid capacity (negative),
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        # Skip if capacity is valid (>= 0)
        if isinstance(invalid_capacity, (int, float)) and invalid_capacity >= 0:
            pytest.skip("Generated valid capacity value")

        with pytest.raises(ValidationError) as exc_info:
            TemplateResource(
                id="valid-resource-id",
                name="Valid Resource Name",
                type=ResourceType.PERSON,
                capacity=invalid_capacity,
                department_id="valid-dept-id",
            )

        # Verify error is related to the capacity field
        errors = exc_info.value.errors()
        assert any(
            "capacity" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'capacity' field, got: {errors}"

    @settings(max_examples=100, deadline=2000)
    @given(invalid_status=invalid_enum_strategy())
    def test_project_invalid_status_fails_validation(self, invalid_status):
        """
        Property 15: Schema Validation - Project Invalid Status

        For any template with a Project having an invalid status (not in enum),
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        with pytest.raises(ValidationError) as exc_info:
            TemplateProject(
                id="valid-project-id",
                name="Valid Project Name",
                status=invalid_status,
            )

        # Verify error is related to the status field
        errors = exc_info.value.errors()
        assert any(
            "status" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'status' field, got: {errors}"

    @settings(max_examples=100, deadline=2000)
    @given(
        start_date=st.datetimes(
            min_value=datetime(2024, 1, 1),
            max_value=datetime(2025, 12, 31),
        )
    )
    def test_sprint_end_date_before_start_date_fails_validation(self, start_date):
        """
        Property 15: Schema Validation - Sprint Invalid Date Range

        For any template with a Sprint where end_date is before or equal to
        start_date, Pydantic validation SHALL fail with an appropriate error
        message.

        **Validates: Requirements 7.1**
        """
        # Add timezone to start_date
        start_date = start_date.replace(tzinfo=UTC)
        # Generate end_date that is before start_date
        end_date = start_date - timedelta(days=1)

        with pytest.raises(ValidationError) as exc_info:
            TemplateSprint(
                id="valid-sprint-id",
                name="Valid Sprint Name",
                start_date=start_date,
                end_date=end_date,
                project_id="valid-project-id",
            )

        # Verify error is related to the end_date field
        errors = exc_info.value.errors()
        assert any(
            "end_date" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'end_date' field, got: {errors}"

        # Verify error message mentions the constraint
        error_messages = [str(error.get("msg", "")) for error in errors]
        assert any(
            "after start_date" in msg.lower() for msg in error_messages
        ), f"Expected error message about end_date constraint, got: {error_messages}"

    @settings(max_examples=100, deadline=2000)
    @given(invalid_order=invalid_integer_strategy())
    def test_phase_invalid_order_fails_validation(self, invalid_order):
        """
        Property 15: Schema Validation - Phase Invalid Order

        For any template with a Phase having an invalid order (< 1),
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        # Skip if order is valid (>= 1)
        if isinstance(invalid_order, int) and invalid_order >= 1:
            pytest.skip("Generated valid order value")

        with pytest.raises(ValidationError) as exc_info:
            TemplatePhase(
                id="valid-phase-id",
                name="Valid Phase Name",
                order=invalid_order,
                project_id="valid-project-id",
            )

        # Verify error is related to the order field
        errors = exc_info.value.errors()
        assert any(
            "order" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'order' field, got: {errors}"

    @settings(max_examples=100, deadline=2000)
    @given(invalid_order=invalid_integer_strategy())
    def test_workpackage_invalid_order_fails_validation(self, invalid_order):
        """
        Property 15: Schema Validation - Workpackage Invalid Order

        For any template with a Workpackage having an invalid order (< 1),
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        # Skip if order is valid (>= 1)
        if isinstance(invalid_order, int) and invalid_order >= 1:
            pytest.skip("Generated valid order value")

        with pytest.raises(ValidationError) as exc_info:
            TemplateWorkpackage(
                id="valid-workpackage-id",
                name="Valid Workpackage Name",
                order=invalid_order,
                phase_id="valid-phase-id",
            )

        # Verify error is related to the order field
        errors = exc_info.value.errors()
        assert any(
            "order" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'order' field, got: {errors}"

    @settings(max_examples=100, deadline=2000)
    @given(invalid_percentage=invalid_float_strategy())
    def test_relationship_invalid_allocation_percentage_fails_validation(
        self, invalid_percentage
    ):
        """
        Property 15: Schema Validation - Relationship Invalid Allocation Percentage

        For any template with a Relationship having an invalid allocation_percentage
        (< 0 or > 100), Pydantic validation SHALL fail with an appropriate error
        message.

        **Validates: Requirements 7.1**
        """
        # Skip if percentage is valid (0-100)
        if (
            isinstance(invalid_percentage, (int, float))
            and 0 <= invalid_percentage <= 100
        ):
            pytest.skip("Generated valid allocation percentage")

        with pytest.raises(ValidationError) as exc_info:
            TemplateRelationship(
                from_id="resource-1",
                to_id="project-1",
                type=RelationshipType.ALLOCATED_TO,
                allocation_percentage=invalid_percentage,
            )

        # Verify error is related to the allocation_percentage field
        errors = exc_info.value.errors()
        assert any(
            "allocation_percentage" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'allocation_percentage' field, got: {errors}"

    @settings(max_examples=100, deadline=2000)
    @given(
        relationship_type=st.sampled_from(
            [
                RelationshipType.IMPLEMENTS,
                RelationshipType.TESTED_BY,
                RelationshipType.MITIGATES,
                RelationshipType.DEPENDS_ON,
            ]
        )
    )
    def test_relationship_allocation_percentage_on_wrong_type_fails_validation(
        self, relationship_type
    ):
        """
        Property 15: Schema Validation - Allocation Percentage on Wrong Type

        For any template with a Relationship having allocation_percentage set
        on a non-ALLOCATED_TO relationship type, Pydantic validation SHALL fail
        with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        with pytest.raises(ValidationError) as exc_info:
            TemplateRelationship(
                from_id="workitem-1",
                to_id="workitem-2",
                type=relationship_type,
                allocation_percentage=50.0,  # Should only be on ALLOCATED_TO
            )

        # Verify error message mentions the constraint
        errors = exc_info.value.errors()
        error_messages = [str(error.get("msg", "")) for error in errors]
        assert any(
            "ALLOCATED_TO" in msg for msg in error_messages
        ), f"Expected error about ALLOCATED_TO constraint, got: {error_messages}"

    @settings(max_examples=100, deadline=2000)
    @given(
        relationship_type=st.sampled_from(
            [
                RelationshipType.IMPLEMENTS,
                RelationshipType.TESTED_BY,
                RelationshipType.MITIGATES,
                RelationshipType.DEPENDS_ON,
            ]
        )
    )
    def test_relationship_lead_on_wrong_type_fails_validation(
        self, relationship_type
    ):
        """
        Property 15: Schema Validation - Lead on Wrong Type

        For any template with a Relationship having lead set on a non-ALLOCATED_TO
        relationship type, Pydantic validation SHALL fail with an appropriate
        error message.

        **Validates: Requirements 7.1**
        """
        with pytest.raises(ValidationError) as exc_info:
            TemplateRelationship(
                from_id="workitem-1",
                to_id="workitem-2",
                type=relationship_type,
                lead=True,  # Should only be on ALLOCATED_TO
            )

        # Verify error message mentions the constraint
        errors = exc_info.value.errors()
        error_messages = [str(error.get("msg", "")) for error in errors]
        assert any(
            "ALLOCATED_TO" in msg for msg in error_messages
        ), f"Expected error about ALLOCATED_TO constraint, got: {error_messages}"

    @settings(max_examples=100, deadline=2000)
    @given(
        missing_field=st.sampled_from(
            [
                "id",
                "name",
                "type",
                "department_id",
            ]
        )
    )
    def test_resource_missing_required_field_fails_validation(self, missing_field):
        """
        Property 15: Schema Validation - Resource Missing Required Field

        For any template with a Resource missing a required field,
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        # Build valid resource data
        resource_data = {
            "id": "valid-resource-id",
            "name": "Valid Resource Name",
            "type": "person",
            "department_id": "valid-dept-id",
        }

        # Remove the specified field
        del resource_data[missing_field]

        with pytest.raises(ValidationError) as exc_info:
            TemplateResource(**resource_data)

        # Verify error is related to the missing field
        errors = exc_info.value.errors()
        assert any(
            missing_field in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for '{missing_field}' field, got: {errors}"

    @settings(max_examples=100, deadline=2000)
    @given(
        missing_field=st.sampled_from(
            [
                "id",
                "name",
                "start_date",
                "end_date",
                "project_id",
            ]
        )
    )
    def test_sprint_missing_required_field_fails_validation(self, missing_field):
        """
        Property 15: Schema Validation - Sprint Missing Required Field

        For any template with a Sprint missing a required field,
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        # Build valid sprint data
        sprint_data = {
            "id": "valid-sprint-id",
            "name": "Valid Sprint Name",
            "start_date": datetime(2024, 1, 1, tzinfo=UTC),
            "end_date": datetime(2024, 1, 15, tzinfo=UTC),
            "project_id": "valid-project-id",
        }

        # Remove the specified field
        del sprint_data[missing_field]

        with pytest.raises(ValidationError) as exc_info:
            TemplateSprint(**sprint_data)

        # Verify error is related to the missing field
        errors = exc_info.value.errors()
        assert any(
            missing_field in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for '{missing_field}' field, got: {errors}"

    @settings(max_examples=100, deadline=2000)
    @given(invalid_skill=st.text(min_size=101, max_size=200))
    def test_resource_skill_too_long_fails_validation(self, invalid_skill):
        """
        Property 15: Schema Validation - Resource Skill Too Long

        For any template with a Resource having a skill longer than 100 characters,
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        with pytest.raises(ValidationError) as exc_info:
            TemplateResource(
                id="valid-resource-id",
                name="Valid Resource Name",
                type=ResourceType.PERSON,
                department_id="valid-dept-id",
                skills=[invalid_skill],
            )

        # Verify error is related to the skills field
        errors = exc_info.value.errors()
        assert any(
            "skills" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'skills' field, got: {errors}"

    @settings(max_examples=100, deadline=2000)
    @given(
        capacity_hours=st.floats(min_value=-100, max_value=-0.1),
    )
    def test_sprint_negative_capacity_fails_validation(self, capacity_hours):
        """
        Property 15: Schema Validation - Sprint Negative Capacity

        For any template with a Sprint having negative capacity values,
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        with pytest.raises(ValidationError) as exc_info:
            TemplateSprint(
                id="valid-sprint-id",
                name="Valid Sprint Name",
                start_date=datetime(2024, 1, 1, tzinfo=UTC),
                end_date=datetime(2024, 1, 15, tzinfo=UTC),
                project_id="valid-project-id",
                capacity_hours=capacity_hours,
            )

        # Verify error is related to the capacity field
        errors = exc_info.value.errors()
        assert any(
            "capacity" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for capacity field, got: {errors}"

    def test_department_missing_company_id_fails_validation(self):
        """
        Property 15: Schema Validation - Department Missing Company ID

        For any template with a Department missing the required company_id field,
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        with pytest.raises(ValidationError) as exc_info:
            TemplateDepartment(
                id="valid-dept-id",
                name="Valid Department Name",
                # company_id is missing
            )

        # Verify error is related to the company_id field
        errors = exc_info.value.errors()
        assert any(
            "company_id" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'company_id' field, got: {errors}"

    def test_milestone_missing_due_date_fails_validation(self):
        """
        Property 15: Schema Validation - Milestone Missing Due Date

        For any template with a Milestone missing the required due_date field,
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        with pytest.raises(ValidationError) as exc_info:
            TemplateMilestone(
                id="valid-milestone-id",
                name="Valid Milestone Name",
                project_id="valid-project-id",
                # due_date is missing
            )

        # Verify error is related to the due_date field
        errors = exc_info.value.errors()
        assert any(
            "due_date" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'due_date' field, got: {errors}"

    def test_backlog_missing_project_id_fails_validation(self):
        """
        Property 15: Schema Validation - Backlog Missing Project ID

        For any template with a Backlog missing the required project_id field,
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        with pytest.raises(ValidationError) as exc_info:
            TemplateBacklog(
                id="valid-backlog-id",
                name="Valid Backlog Name",
                # project_id is missing
            )

        # Verify error is related to the project_id field
        errors = exc_info.value.errors()
        assert any(
            "project_id" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'project_id' field, got: {errors}"

    def test_workpackage_missing_phase_id_fails_validation(self):
        """
        Property 15: Schema Validation - Workpackage Missing Phase ID

        For any template with a Workpackage missing the required phase_id field,
        Pydantic validation SHALL fail with an appropriate error message.

        **Validates: Requirements 7.1**
        """
        with pytest.raises(ValidationError) as exc_info:
            TemplateWorkpackage(
                id="valid-workpackage-id",
                name="Valid Workpackage Name",
                order=1,
                # phase_id is missing
            )

        # Verify error is related to the phase_id field
        errors = exc_info.value.errors()
        assert any(
            "phase_id" in str(error.get("loc", [])) for error in errors
        ), f"Expected validation error for 'phase_id' field, got: {errors}"

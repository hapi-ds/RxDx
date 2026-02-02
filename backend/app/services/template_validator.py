"""
Template Validator Service.

This module provides functionality for validating template definitions against
JSON Schema and business rules. It performs three types of validation:
1. Schema validation - ensures template structure matches JSON Schema
2. Reference validation - ensures all user/workitem references are resolvable
3. Constraint validation - validates field constraints (email formats, ranges, etc.)

Requirements:
- 2.2: Validate template schema against predefined JSON Schema
- 2.4: Return specific validation errors with field paths
- 11.1: Validate user email formats
- 11.2: Validate workitem field constraints (priority 1-5, severity/occurrence/detection 1-10)
- 11.3: Validate relationship type values
- 11.4: Validate user references in workitems
- 11.5: Return all validation errors, not just the first one
"""

import json
import re
from pathlib import Path

from jsonschema import Draft7Validator

from app.schemas.template import (
    RelationshipType,
    TemplateDefinition,
    UserRole,
    ValidationError,
)


class TemplateValidator:
    """
    Validates template definitions against schema and business rules.

    This class performs comprehensive validation of templates including:
    - JSON Schema validation for structure and types
    - Business rule validation for constraints
    - Reference validation for user and workitem IDs
    """

    def __init__(self, schema_path: Path):
        """
        Initialize the template validator.

        Args:
            schema_path: Path to the JSON Schema file for template validation

        Raises:
            ValueError: If schema file doesn't exist or is invalid
        """
        self.schema_path = Path(schema_path)
        self.schema = self._load_schema(schema_path)
        self.validator = Draft7Validator(self.schema)

    def _load_schema(self, schema_path: Path) -> dict:
        """
        Load JSON Schema from file.

        Args:
            schema_path: Path to the JSON Schema file

        Returns:
            Parsed JSON Schema as a dictionary

        Raises:
            ValueError: If schema file doesn't exist or is invalid JSON
        """
        if not schema_path.exists():
            raise ValueError(f"Schema file does not exist: {schema_path}")

        try:
            with open(schema_path, encoding="utf-8") as f:
                schema = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in schema file: {e}")
        except OSError as e:
            raise ValueError(f"Failed to read schema file: {e}")

        return schema

    def validate_schema(self, template: dict) -> list[ValidationError]:
        """
        Validate template against JSON Schema.

        This method validates the template structure, types, and basic constraints
        defined in the JSON Schema. It collects all validation errors rather than
        stopping at the first one.

        Args:
            template: Template data as a dictionary (parsed from YAML)

        Returns:
            List of ValidationError objects (empty if valid)

        Requirements:
            - 2.2: Validate against JSON Schema
            - 2.4: Return specific validation errors with field paths
            - 11.5: Return all validation errors
        """
        errors = []

        # Validate against JSON Schema
        for error in self.validator.iter_errors(template):
            # Build path to the invalid field
            path = ".".join(str(p) for p in error.path) if error.path else "root"

            # Get the invalid value if available
            value = None
            if error.instance is not None:
                # Convert value to string, truncate if too long
                value_str = str(error.instance)
                if len(value_str) > 100:
                    value_str = value_str[:97] + "..."
                value = value_str

            # Create validation error
            errors.append(
                ValidationError(
                    path=path,
                    message=error.message,
                    value=value,
                )
            )

        return errors

    def validate_references(self, template: TemplateDefinition) -> list[ValidationError]:
        """
        Validate that all user/workitem references are resolvable.

        This method checks that:
        - All created_by references point to users defined in the template
        - All assigned_to references point to users defined in the template
        - All risk_owner references point to users defined in the template
        - All relationship from_id/to_id references point to workitems in the template

        Args:
            template: Validated TemplateDefinition object

        Returns:
            List of ValidationError objects (empty if all references are valid)

        Requirements:
            - 11.4: Validate user references in workitems
            - 11.5: Return all validation errors
        """
        errors = []

        # Build set of user IDs defined in template
        user_ids = {user.id for user in template.users}

        # Build set of workitem IDs defined in template
        workitem_ids = set()
        for req in template.workitems.requirements:
            workitem_ids.add(req.id)
        for task in template.workitems.tasks:
            workitem_ids.add(task.id)
        for test in template.workitems.tests:
            workitem_ids.add(test.id)
        for risk in template.workitems.risks:
            workitem_ids.add(risk.id)

        # Validate user references in requirements
        for idx, req in enumerate(template.workitems.requirements):
            if req.created_by not in user_ids:
                errors.append(
                    ValidationError(
                        path=f"workitems.requirements[{idx}].created_by",
                        message=f"User reference '{req.created_by}' not found in template users",
                        value=req.created_by,
                    )
                )

        # Validate user references in tasks
        for idx, task in enumerate(template.workitems.tasks):
            if task.created_by not in user_ids:
                errors.append(
                    ValidationError(
                        path=f"workitems.tasks[{idx}].created_by",
                        message=f"User reference '{task.created_by}' not found in template users",
                        value=task.created_by,
                    )
                )
            if task.assigned_to and task.assigned_to not in user_ids:
                errors.append(
                    ValidationError(
                        path=f"workitems.tasks[{idx}].assigned_to",
                        message=f"User reference '{task.assigned_to}' not found in template users",
                        value=task.assigned_to,
                    )
                )

        # Validate user references in tests
        for idx, test in enumerate(template.workitems.tests):
            if test.created_by not in user_ids:
                errors.append(
                    ValidationError(
                        path=f"workitems.tests[{idx}].created_by",
                        message=f"User reference '{test.created_by}' not found in template users",
                        value=test.created_by,
                    )
                )
            if test.assigned_to and test.assigned_to not in user_ids:
                errors.append(
                    ValidationError(
                        path=f"workitems.tests[{idx}].assigned_to",
                        message=f"User reference '{test.assigned_to}' not found in template users",
                        value=test.assigned_to,
                    )
                )

        # Validate user references in risks
        for idx, risk in enumerate(template.workitems.risks):
            if risk.created_by not in user_ids:
                errors.append(
                    ValidationError(
                        path=f"workitems.risks[{idx}].created_by",
                        message=f"User reference '{risk.created_by}' not found in template users",
                        value=risk.created_by,
                    )
                )
            if risk.risk_owner and risk.risk_owner not in user_ids:
                errors.append(
                    ValidationError(
                        path=f"workitems.risks[{idx}].risk_owner",
                        message=f"User reference '{risk.risk_owner}' not found in template users",
                        value=risk.risk_owner,
                    )
                )

        # Validate workitem references in relationships
        for idx, rel in enumerate(template.relationships):
            if rel.from_id not in workitem_ids:
                errors.append(
                    ValidationError(
                        path=f"relationships[{idx}].from_id",
                        message=f"Workitem reference '{rel.from_id}' not found in template workitems",
                        value=rel.from_id,
                    )
                )
            if rel.to_id not in workitem_ids:
                errors.append(
                    ValidationError(
                        path=f"relationships[{idx}].to_id",
                        message=f"Workitem reference '{rel.to_id}' not found in template workitems",
                        value=rel.to_id,
                    )
                )

        return errors

    def validate_constraints(self, template: TemplateDefinition) -> list[ValidationError]:
        """
        Validate field constraints (priority ranges, email formats, etc.).

        This method performs additional business rule validation beyond what
        JSON Schema can express, including:
        - Email format validation
        - Priority range validation (1-5)
        - Severity/occurrence/detection range validation (1-10)
        - Relationship type validation
        - User role validation

        Note: Most of these validations are already handled by Pydantic models,
        but this method provides an additional layer of validation and ensures
        all errors are collected in a consistent format.

        Args:
            template: Validated TemplateDefinition object

        Returns:
            List of ValidationError objects (empty if all constraints are satisfied)

        Requirements:
            - 11.1: Validate user email formats
            - 11.2: Validate workitem field constraints
            - 11.3: Validate relationship type values
            - 11.5: Return all validation errors
        """
        errors = []

        # Email regex pattern (basic validation)
        email_pattern = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

        # Validate user constraints
        for idx, user in enumerate(template.users):
            # Email format validation (additional check beyond Pydantic)
            if not email_pattern.match(user.email):
                errors.append(
                    ValidationError(
                        path=f"users[{idx}].email",
                        message=f"Invalid email format: {user.email}",
                        value=user.email,
                    )
                )

            # Role validation (should be caught by Pydantic, but double-check)
            try:
                UserRole(user.role)
            except ValueError:
                errors.append(
                    ValidationError(
                        path=f"users[{idx}].role",
                        message=f"Invalid user role: {user.role}",
                        value=user.role,
                    )
                )

            # Failed login attempts validation
            if user.failed_login_attempts < 0:
                errors.append(
                    ValidationError(
                        path=f"users[{idx}].failed_login_attempts",
                        message="Failed login attempts must be non-negative",
                        value=str(user.failed_login_attempts),
                    )
                )

        # Validate requirement constraints
        for idx, req in enumerate(template.workitems.requirements):
            # Priority range validation
            if not (1 <= req.priority <= 5):
                errors.append(
                    ValidationError(
                        path=f"workitems.requirements[{idx}].priority",
                        message=f"Priority must be between 1 and 5, got {req.priority}",
                        value=str(req.priority),
                    )
                )

        # Validate task constraints
        for idx, task in enumerate(template.workitems.tasks):
            # Priority range validation
            if not (1 <= task.priority <= 5):
                errors.append(
                    ValidationError(
                        path=f"workitems.tasks[{idx}].priority",
                        message=f"Priority must be between 1 and 5, got {task.priority}",
                        value=str(task.priority),
                    )
                )

            # Hours validation
            if task.estimated_hours is not None and task.estimated_hours < 0:
                errors.append(
                    ValidationError(
                        path=f"workitems.tasks[{idx}].estimated_hours",
                        message="Estimated hours must be non-negative",
                        value=str(task.estimated_hours),
                    )
                )
            if task.actual_hours is not None and task.actual_hours < 0:
                errors.append(
                    ValidationError(
                        path=f"workitems.tasks[{idx}].actual_hours",
                        message="Actual hours must be non-negative",
                        value=str(task.actual_hours),
                    )
                )

        # Validate test constraints
        for idx, test in enumerate(template.workitems.tests):
            # Priority range validation
            if not (1 <= test.priority <= 5):
                errors.append(
                    ValidationError(
                        path=f"workitems.tests[{idx}].priority",
                        message=f"Priority must be between 1 and 5, got {test.priority}",
                        value=str(test.priority),
                    )
                )

        # Validate risk constraints
        for idx, risk in enumerate(template.workitems.risks):
            # Priority range validation
            if not (1 <= risk.priority <= 5):
                errors.append(
                    ValidationError(
                        path=f"workitems.risks[{idx}].priority",
                        message=f"Priority must be between 1 and 5, got {risk.priority}",
                        value=str(risk.priority),
                    )
                )

            # Severity range validation
            if not (1 <= risk.severity <= 10):
                errors.append(
                    ValidationError(
                        path=f"workitems.risks[{idx}].severity",
                        message=f"Severity must be between 1 and 10, got {risk.severity}",
                        value=str(risk.severity),
                    )
                )

            # Occurrence range validation
            if not (1 <= risk.occurrence <= 10):
                errors.append(
                    ValidationError(
                        path=f"workitems.risks[{idx}].occurrence",
                        message=f"Occurrence must be between 1 and 10, got {risk.occurrence}",
                        value=str(risk.occurrence),
                    )
                )

            # Detection range validation
            if not (1 <= risk.detection <= 10):
                errors.append(
                    ValidationError(
                        path=f"workitems.risks[{idx}].detection",
                        message=f"Detection must be between 1 and 10, got {risk.detection}",
                        value=str(risk.detection),
                    )
                )

        # Validate relationship constraints
        for idx, rel in enumerate(template.relationships):
            # Relationship type validation (should be caught by Pydantic, but double-check)
            try:
                RelationshipType(rel.type)
            except ValueError:
                errors.append(
                    ValidationError(
                        path=f"relationships[{idx}].type",
                        message=f"Invalid relationship type: {rel.type}",
                        value=rel.type,
                    )
                )

        return errors

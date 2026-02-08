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

    def validate_references(
        self, template: TemplateDefinition
    ) -> list[ValidationError]:
        """
        Validate that all user/workitem/entity references are resolvable.

        This method checks that:
        - All created_by references point to users defined in the template
        - All assigned_to references point to users defined in the template
        - All risk_owner references point to users defined in the template
        - All relationship from_id/to_id references point to valid entities based on relationship type

        Args:
            template: Validated TemplateDefinition object

        Returns:
            List of ValidationError objects (empty if all references are valid)

        Requirements:
            - 11.4: Validate user references in workitems
            - 11.5: Return all validation errors
            - 3.5: Validate entity references for sprint/backlog assignments
            - 4.3: Validate entity references for workpackage-department links
            - 5.4: Validate entity references for resource allocations
            - 7.2: Validate all entity references are resolvable
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

        # Build sets of graph entity IDs
        company_ids = {c.id for c in template.companies}
        department_ids = {d.id for d in template.departments}
        resource_ids = {r.id for r in template.resources}
        project_ids = {p.id for p in template.projects}
        sprint_ids = {s.id for s in template.sprints}
        phase_ids = {ph.id for ph in template.phases}
        workpackage_ids = {wp.id for wp in template.workpackages}
        backlog_ids = {b.id for b in template.backlogs}
        milestone_ids = {m.id for m in template.milestones}

        # Build set of task IDs (subset of workitem_ids)
        task_ids = {task.id for task in template.workitems.tasks}

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

        # Validate relationship references based on relationship type
        for idx, rel in enumerate(template.relationships):
            rel_type = rel.type

            # IMPLEMENTS: Task -> Requirement
            if rel_type == RelationshipType.IMPLEMENTS:
                if rel.from_id not in task_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].from_id",
                            message=f"Task reference '{rel.from_id}' not found in template tasks (IMPLEMENTS relationship requires Task -> Requirement)",
                            value=rel.from_id,
                        )
                    )
                if rel.to_id not in workitem_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].to_id",
                            message=f"Requirement reference '{rel.to_id}' not found in template workitems",
                            value=rel.to_id,
                        )
                    )

            # TESTED_BY: Requirement -> Test
            elif rel_type == RelationshipType.TESTED_BY:
                if rel.from_id not in workitem_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].from_id",
                            message=f"Requirement reference '{rel.from_id}' not found in template workitems",
                            value=rel.from_id,
                        )
                    )
                if rel.to_id not in workitem_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].to_id",
                            message=f"Test reference '{rel.to_id}' not found in template workitems",
                            value=rel.to_id,
                        )
                    )

            # MITIGATES: Requirement -> Risk
            elif rel_type == RelationshipType.MITIGATES:
                if rel.from_id not in workitem_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].from_id",
                            message=f"Requirement reference '{rel.from_id}' not found in template workitems",
                            value=rel.from_id,
                        )
                    )
                if rel.to_id not in workitem_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].to_id",
                            message=f"Risk reference '{rel.to_id}' not found in template workitems",
                            value=rel.to_id,
                        )
                    )

            # DEPENDS_ON: WorkItem -> WorkItem
            elif rel_type == RelationshipType.DEPENDS_ON:
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

            # ASSIGNED_TO_SPRINT: Task -> Sprint
            elif rel_type == RelationshipType.ASSIGNED_TO_SPRINT:
                if rel.from_id not in task_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].from_id",
                            message=f"Task reference '{rel.from_id}' not found in template tasks",
                            value=rel.from_id,
                        )
                    )
                if rel.to_id not in sprint_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].to_id",
                            message=f"Sprint reference '{rel.to_id}' not found in template sprints",
                            value=rel.to_id,
                        )
                    )

            # IN_BACKLOG: Task -> Backlog
            elif rel_type == RelationshipType.IN_BACKLOG:
                if rel.from_id not in task_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].from_id",
                            message=f"Task reference '{rel.from_id}' not found in template tasks",
                            value=rel.from_id,
                        )
                    )
                if rel.to_id not in backlog_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].to_id",
                            message=f"Backlog reference '{rel.to_id}' not found in template backlogs",
                            value=rel.to_id,
                        )
                    )

            # LINKED_TO_DEPARTMENT: Workpackage -> Department
            elif rel_type == RelationshipType.LINKED_TO_DEPARTMENT:
                if rel.from_id not in workpackage_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].from_id",
                            message=f"Workpackage reference '{rel.from_id}' not found in template workpackages",
                            value=rel.from_id,
                        )
                    )
                if rel.to_id not in department_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].to_id",
                            message=f"Department reference '{rel.to_id}' not found in template departments",
                            value=rel.to_id,
                        )
                    )

            # ALLOCATED_TO: Resource -> (Project or Task)
            elif rel_type == RelationshipType.ALLOCATED_TO:
                if rel.from_id not in resource_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].from_id",
                            message=f"Resource reference '{rel.from_id}' not found in template resources",
                            value=rel.from_id,
                        )
                    )
                # to_id can be either a project or a task
                if rel.to_id not in project_ids and rel.to_id not in task_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].to_id",
                            message=f"Project or Task reference '{rel.to_id}' not found in template projects or tasks",
                            value=rel.to_id,
                        )
                    )

            # PARENT_OF: Company -> Department
            elif rel_type == RelationshipType.PARENT_OF:
                if rel.from_id not in company_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].from_id",
                            message=f"Company reference '{rel.from_id}' not found in template companies",
                            value=rel.from_id,
                        )
                    )
                if rel.to_id not in department_ids:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].to_id",
                            message=f"Department reference '{rel.to_id}' not found in template departments",
                            value=rel.to_id,
                        )
                    )

            # BELONGS_TO: Multiple source types -> Multiple target types
            elif rel_type == RelationshipType.BELONGS_TO:
                # Valid BELONGS_TO relationships:
                # - Resource -> Department
                # - Sprint -> Project
                # - Phase -> Project
                # - Workpackage -> Phase
                # - Milestone -> Project
                # - Backlog -> Project

                # Check if from_id is a valid source entity
                valid_from = (
                    rel.from_id in resource_ids
                    or rel.from_id in sprint_ids
                    or rel.from_id in phase_ids
                    or rel.from_id in workpackage_ids
                    or rel.from_id in milestone_ids
                    or rel.from_id in backlog_ids
                )

                if not valid_from:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].from_id",
                            message=f"Entity reference '{rel.from_id}' not found in template (BELONGS_TO source must be Resource, Sprint, Phase, Workpackage, Milestone, or Backlog)",
                            value=rel.from_id,
                        )
                    )

                # Check if to_id is a valid target entity
                valid_to = (
                    rel.to_id in department_ids
                    or rel.to_id in project_ids
                    or rel.to_id in phase_ids
                )

                if not valid_to:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].to_id",
                            message=f"Entity reference '{rel.to_id}' not found in template (BELONGS_TO target must be Department, Project, or Phase)",
                            value=rel.to_id,
                        )
                    )

        return errors

    def validate_graph_entity_references(
        self, template: TemplateDefinition
    ) -> list[ValidationError]:
        """
        Validate all graph entity references are resolvable.

        This method checks that all entity references (foreign keys) point to
        entities that are defined in the template:
        - Department.company_id references must point to defined companies
        - Department.manager_user_id references must point to defined users
        - Resource.department_id references must point to defined departments
        - Sprint.project_id references must point to defined projects
        - Phase.project_id references must point to defined projects
        - Workpackage.phase_id references must point to defined phases
        - Backlog.project_id references must point to defined projects
        - Milestone.project_id references must point to defined projects

        Args:
            template: Validated TemplateDefinition object

        Returns:
            List of ValidationError objects (empty if all references are valid)

        Requirements:
            - 2.6: Validate manager_user_id references in departments
            - 7.2: Validate all entity references are resolvable
            - 10.4: Validate foreign key references
        """
        errors = []

        # Build ID sets for all entity types
        company_ids = {c.id for c in template.companies}
        department_ids = {d.id for d in template.departments}
        project_ids = {p.id for p in template.projects}
        phase_ids = {ph.id for ph in template.phases}
        user_ids = {u.id for u in template.users}

        # Validate department.company_id references
        for idx, dept in enumerate(template.departments):
            if dept.company_id not in company_ids:
                errors.append(
                    ValidationError(
                        path=f"departments[{idx}].company_id",
                        message=f"Company reference '{dept.company_id}' not found in template companies",
                        value=dept.company_id,
                    )
                )

            # Validate department.manager_user_id references
            if dept.manager_user_id and dept.manager_user_id not in user_ids:
                errors.append(
                    ValidationError(
                        path=f"departments[{idx}].manager_user_id",
                        message=f"User reference '{dept.manager_user_id}' not found in template users",
                        value=dept.manager_user_id,
                    )
                )

        # Validate resource.department_id references
        for idx, res in enumerate(template.resources):
            if res.department_id not in department_ids:
                errors.append(
                    ValidationError(
                        path=f"resources[{idx}].department_id",
                        message=f"Department reference '{res.department_id}' not found in template departments",
                        value=res.department_id,
                    )
                )

        # Validate sprint.project_id references
        for idx, sprint in enumerate(template.sprints):
            if sprint.project_id not in project_ids:
                errors.append(
                    ValidationError(
                        path=f"sprints[{idx}].project_id",
                        message=f"Project reference '{sprint.project_id}' not found in template projects",
                        value=sprint.project_id,
                    )
                )

        # Validate phase.project_id references
        for idx, phase in enumerate(template.phases):
            if phase.project_id not in project_ids:
                errors.append(
                    ValidationError(
                        path=f"phases[{idx}].project_id",
                        message=f"Project reference '{phase.project_id}' not found in template projects",
                        value=phase.project_id,
                    )
                )

        # Validate workpackage.phase_id references
        for idx, wp in enumerate(template.workpackages):
            if wp.phase_id not in phase_ids:
                errors.append(
                    ValidationError(
                        path=f"workpackages[{idx}].phase_id",
                        message=f"Phase reference '{wp.phase_id}' not found in template phases",
                        value=wp.phase_id,
                    )
                )

        # Validate backlog.project_id references
        for idx, backlog in enumerate(template.backlogs):
            if backlog.project_id not in project_ids:
                errors.append(
                    ValidationError(
                        path=f"backlogs[{idx}].project_id",
                        message=f"Project reference '{backlog.project_id}' not found in template projects",
                        value=backlog.project_id,
                    )
                )

        # Validate milestone.project_id references
        for idx, milestone in enumerate(template.milestones):
            if milestone.project_id not in project_ids:
                errors.append(
                    ValidationError(
                        path=f"milestones[{idx}].project_id",
                        message=f"Project reference '{milestone.project_id}' not found in template projects",
                        value=milestone.project_id,
                    )
                )

        return errors

    def validate_relationship_constraints(
        self, template: TemplateDefinition
    ) -> list[ValidationError]:
        """
        Validate relationship constraints.

        This method validates:
        - Task-sprint/backlog mutual exclusivity (task cannot be in both)
        - Workpackage single-department constraint (workpackage can only link to one department)
        - ALLOCATED_TO relationships must have allocation_percentage
        - allocation_percentage must be between 0 and 100

        Args:
            template: Validated TemplateDefinition object

        Returns:
            List of ValidationError objects (empty if all constraints are satisfied)

        Requirements:
            - 3.3: Validate task-sprint/backlog mutual exclusivity
            - 4.2: Validate workpackage single-department constraint
            - 5.3: Validate allocation_percentage is between 0 and 100
            - 7.3: Validate relationship constraints
        """
        errors = []

        # Track task assignments to sprints and backlogs
        task_sprint_assignments: dict[str, str] = {}
        task_backlog_assignments: dict[str, str] = {}
        workpackage_department_links: dict[str, str] = {}

        for idx, rel in enumerate(template.relationships):
            # Validate ASSIGNED_TO_SPRINT and IN_BACKLOG mutual exclusivity
            if rel.type == RelationshipType.ASSIGNED_TO_SPRINT:
                if rel.from_id in task_backlog_assignments:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}]",
                            message=f"Task '{rel.from_id}' cannot be in both sprint and backlog (already in backlog '{task_backlog_assignments[rel.from_id]}')",
                            value=f"{rel.from_id} -> {rel.to_id}",
                        )
                    )
                task_sprint_assignments[rel.from_id] = rel.to_id

            elif rel.type == RelationshipType.IN_BACKLOG:
                if rel.from_id in task_sprint_assignments:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}]",
                            message=f"Task '{rel.from_id}' cannot be in both sprint and backlog (already in sprint '{task_sprint_assignments[rel.from_id]}')",
                            value=f"{rel.from_id} -> {rel.to_id}",
                        )
                    )
                task_backlog_assignments[rel.from_id] = rel.to_id

            # Validate LINKED_TO_DEPARTMENT single-link constraint
            elif rel.type == RelationshipType.LINKED_TO_DEPARTMENT:
                if rel.from_id in workpackage_department_links:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}]",
                            message=f"Workpackage '{rel.from_id}' can only link to one department (already linked to '{workpackage_department_links[rel.from_id]}')",
                            value=f"{rel.from_id} -> {rel.to_id}",
                        )
                    )
                workpackage_department_links[rel.from_id] = rel.to_id

            # Validate ALLOCATED_TO has required properties
            elif rel.type == RelationshipType.ALLOCATED_TO:
                if rel.allocation_percentage is None:
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].allocation_percentage",
                            message="ALLOCATED_TO relationships must specify allocation_percentage",
                            value=None,
                        )
                    )
                elif not (0 <= rel.allocation_percentage <= 100):
                    errors.append(
                        ValidationError(
                            path=f"relationships[{idx}].allocation_percentage",
                            message=f"allocation_percentage must be between 0 and 100, got {rel.allocation_percentage}",
                            value=str(rel.allocation_percentage),
                        )
                    )

        return errors

    def validate_constraints(
        self, template: TemplateDefinition
    ) -> list[ValidationError]:
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

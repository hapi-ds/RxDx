"""
Template Service.

This module provides the main service for template management operations including
listing, loading, validating, and applying templates. It orchestrates the parser,
validator, database operations, and graph service to provide a complete template
management solution.

Requirements:
- 3.1: Discover all valid template files in the templates directory
- 3.2: Return template metadata without loading full content
- 3.4: Load and return complete template definition by name
- 4.1: Check for existing entities before creation
- 4.2: Skip existing users and log warnings
- 4.3: Skip existing workitems and log warnings
- 4.4: Skip existing relationships
- 4.5: Return summary report of created, skipped, and failed entities
- 5.1: Produce same database state when applied multiple times
- 5.2: Use deterministic UUIDs for template entities
- 5.3: Match entities by both ID and natural keys
- 6.1: Create users with Argon2 hashed passwords
- 6.2: Support all user roles
- 6.3: Support default password field
- 6.4: Support is_active=false for inactive users
- 7.1: Create workitems of all supported types
- 7.2: Store workitems in Apache AGE graph database
- 7.3: Support all workitem-specific fields
- 7.4: Resolve user references to UUIDs
- 8.1: Create relationships of all types
- 8.2: Validate that both source and target workitems exist
- 8.3: Skip relationships with non-existent workitems
- 8.4: Support relationship metadata
"""

import hashlib
import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.db.graph import GraphService
from app.models.user import User
from app.schemas.template import (
    ApplicationResult,
    EntityResult,
    TemplateDefinition,
    TemplateMetadata,
    ValidationResult,
)
from app.services.template_parser import TemplateParser
from app.services.template_validator import TemplateValidator

# Configure logging
logger = logging.getLogger(__name__)


class TemplateService:
    """
    Orchestrates template discovery, validation, and application.

    This service is the main entry point for all template operations. It:
    - Lists available templates with metadata
    - Loads and validates templates
    - Applies templates to the database (users, workitems, relationships)
    - Ensures idempotent and non-destructive application
    - Generates deterministic UUIDs for template entities
    """

    def __init__(
        self,
        parser: TemplateParser,
        validator: TemplateValidator,
        db_session: AsyncSession,
        graph_service: GraphService,
    ):
        """
        Initialize the template service.

        Args:
            parser: Template parser for loading YAML files
            validator: Template validator for schema and business rule validation
            db_session: Database session for user operations
            graph_service: Graph service for workitem and relationship operations
        """
        self.parser = parser
        self.validator = validator
        self.db_session = db_session
        self.graph_service = graph_service

    async def list_templates(self) -> list[TemplateMetadata]:
        """
        List all available templates.

        This method discovers all template files in the templates directory
        and returns their metadata without loading the full template content.

        Returns:
            List of TemplateMetadata objects for all valid templates

        Requirements:
            - 3.1: Discover all valid template files
            - 3.2: Return template metadata without loading full content
        """
        return self.parser.list_templates()

    async def get_template(self, name: str) -> TemplateDefinition | None:
        """
        Get a template by name with full content.

        This method loads a complete template definition including all users,
        workitems, and relationships.

        Args:
            name: Template name (without .yaml extension)

        Returns:
            TemplateDefinition object if found, None if not found

        Requirements:
            - 3.4: Load and return complete template definition by name
        """
        try:
            template = self.parser.load_template(name)
            return template
        except Exception as e:
            logger.error(f"Failed to load template '{name}': {e}")
            return None

    async def validate_template(self, name: str) -> ValidationResult:
        """
        Validate a template without applying it.

        This method performs comprehensive validation including:
        - Schema validation against JSON Schema
        - Reference validation (user and workitem references)
        - Constraint validation (email formats, priority ranges, etc.)

        Args:
            name: Template name to validate

        Returns:
            ValidationResult with valid status and list of errors

        Requirements:
            - 11.1: Validate user email formats
            - 11.2: Validate workitem field constraints
            - 11.3: Validate relationship type values
            - 11.4: Validate user references in workitems
            - 11.5: Return all validation errors
        """
        try:
            # Load the template
            template = self.parser.load_template(name)

            # Convert to dict for schema validation, excluding None values
            template_dict = template.model_dump(mode="json", exclude_none=True)

            # Collect all validation errors
            all_errors = []

            # Schema validation
            schema_errors = self.validator.validate_schema(template_dict)
            all_errors.extend(schema_errors)

            # Reference validation
            reference_errors = self.validator.validate_references(template)
            all_errors.extend(reference_errors)

            # Graph entity reference validation
            graph_entity_errors = self.validator.validate_graph_entity_references(
                template
            )
            all_errors.extend(graph_entity_errors)

            # Relationship constraint validation
            relationship_errors = self.validator.validate_relationship_constraints(
                template
            )
            all_errors.extend(relationship_errors)

            # Constraint validation
            constraint_errors = self.validator.validate_constraints(template)
            all_errors.extend(constraint_errors)

            # Return validation result
            return ValidationResult(
                valid=len(all_errors) == 0,
                errors=all_errors,
            )

        except Exception as e:
            logger.error(f"Validation failed for template '{name}': {e}")
            from app.schemas.template import ValidationError

            return ValidationResult(
                valid=False,
                errors=[
                    ValidationError(
                        path="root",
                        message=f"Failed to validate template: {str(e)}",
                        value=None,
                    )
                ],
            )

    def _generate_deterministic_uuid(self, template_name: str, entity_id: str) -> UUID:
        """
        Generate deterministic UUID from template name and entity ID for idempotency.

        This ensures that the same entity in the same template always gets the same UUID,
        enabling idempotent template application.

        Args:
            template_name: Name of the template
            entity_id: Entity identifier within the template

        Returns:
            Deterministic UUID based on template name and entity ID

        Requirements:
            - 5.2: Use deterministic UUIDs for template entities
            - 5.3: Match entities by both ID and natural keys
        """
        # Create a deterministic UUID using SHA-256 hash
        # Format: template_name:entity_id
        seed = f"{template_name}:{entity_id}"
        hash_bytes = hashlib.sha256(seed.encode()).digest()

        # Use first 16 bytes of hash to create UUID
        # Set version to 5 (name-based SHA-1, but we're using SHA-256)
        # and variant to RFC 4122
        uuid_bytes = bytearray(hash_bytes[:16])
        uuid_bytes[6] = (uuid_bytes[6] & 0x0F) | 0x50  # Version 5
        uuid_bytes[8] = (uuid_bytes[8] & 0x3F) | 0x80  # Variant RFC 4122

        return UUID(bytes=bytes(uuid_bytes))

    def _calculate_rpn(self, severity: int, occurrence: int, detection: int) -> int:
        """
        Calculate Risk Priority Number (RPN) for risk workitems.

        RPN is calculated as: severity × occurrence × detection

        Args:
            severity: Severity rating (1-10)
            occurrence: Occurrence rating (1-10)
            detection: Detection rating (1-10)

        Returns:
            Risk Priority Number (1-1000)

        Requirements:
            - 7.3: Support all workitem-specific fields (including calculated RPN)
        """
        return severity * occurrence * detection

    def _add_metadata_fields(self, entity_type: str, properties: dict) -> dict:
        """
        Add auto-generated metadata fields (version, timestamps, is_signed).

        These fields are not included in template YAML files but are added
        automatically during template application.

        Args:
            entity_type: Type of entity (requirement, task, test, risk, document)
            properties: Entity properties dictionary

        Returns:
            Properties dictionary with added metadata fields

        Requirements:
            - 7.3: Support all workitem-specific fields (auto-generated metadata)
        """
        # Add version
        properties["version"] = "1.0"

        # Add timestamps
        now = datetime.now(UTC).isoformat()
        properties["created_at"] = now
        properties["updated_at"] = now

        # Add is_signed for workitems
        if entity_type in ["requirement", "task", "test", "risk", "document"]:
            properties["is_signed"] = False

        return properties

    async def _apply_users(
        self,
        users: list,
        default_password: str,
        template_name: str,
        dry_run: bool = False,
    ) -> tuple[list[EntityResult], dict[str, UUID]]:
        """
        Apply users from template to the database.

        This method creates users with hashed passwords, checks for existing users
        by email, and supports default password from template settings.

        Args:
            users: List of TemplateUser objects to create
            default_password: Default password from template settings
            template_name: Name of the template (for deterministic UUID generation)
            dry_run: If True, don't actually create users

        Returns:
            Tuple of (list of EntityResult, dict mapping template user IDs to UUIDs)

        Requirements:
            - 4.2: Skip existing users and log warnings
            - 6.1: Create users with Argon2 hashed passwords
            - 6.2: Support all user roles
            - 6.3: Support default password field
            - 6.4: Support is_active=false for inactive users
        """
        results = []
        user_map = {}  # Maps template user ID to actual UUID

        for user in users:
            try:
                # Generate deterministic UUID for this user
                user_uuid = self._generate_deterministic_uuid(template_name, user.id)

                # Check if user already exists by email
                stmt = select(User).where(User.email == user.email)
                result = await self.db_session.execute(stmt)
                existing_user = result.scalar_one_or_none()

                if existing_user:
                    # User already exists, skip
                    logger.warning(
                        f"User with email '{user.email}' already exists, skipping"
                    )
                    results.append(
                        EntityResult(
                            id=user.id,
                            type="user",
                            status="skipped",
                            message=f"User with email '{user.email}' already exists",
                        )
                    )
                    # Map template ID to existing user's UUID
                    user_map[user.id] = existing_user.id
                    continue

                # Check if user with this UUID already exists
                stmt = select(User).where(User.id == user_uuid)
                result = await self.db_session.execute(stmt)
                existing_user_by_id = result.scalar_one_or_none()

                if existing_user_by_id:
                    # User with this UUID already exists, skip
                    logger.warning(
                        f"User with ID '{user_uuid}' already exists, skipping"
                    )
                    results.append(
                        EntityResult(
                            id=user.id,
                            type="user",
                            status="skipped",
                            message=f"User with ID '{user_uuid}' already exists",
                        )
                    )
                    # Map template ID to existing user's UUID
                    user_map[user.id] = existing_user_by_id.id
                    continue

                if dry_run:
                    # Dry run mode - don't actually create
                    logger.info(
                        f"[DRY RUN] Would create user: {user.email} ({user.role})"
                    )
                    results.append(
                        EntityResult(
                            id=user.id,
                            type="user",
                            status="created",
                            message=f"[DRY RUN] Would create user '{user.email}'",
                        )
                    )
                    user_map[user.id] = user_uuid
                    continue

                # Determine password to use (user-specific or default)
                password = user.password if user.password else default_password

                # Hash the password using Argon2
                hashed_password = get_password_hash(password)

                # Create new user
                new_user = User(
                    id=user_uuid,
                    email=user.email,
                    hashed_password=hashed_password,
                    full_name=user.full_name,
                    role=user.role.value,  # Convert enum to string
                    is_active=user.is_active,
                    failed_login_attempts=user.failed_login_attempts,
                    locked_until=user.locked_until,
                    created_at=datetime.now(UTC),
                    updated_at=datetime.now(UTC),
                )

                # Add to session
                self.db_session.add(new_user)

                # Commit immediately to ensure user is available for workitem references
                await self.db_session.commit()

                logger.info(f"Created user: {user.email} ({user.role})")
                results.append(
                    EntityResult(
                        id=user.id,
                        type="user",
                        status="created",
                        message=f"Created user '{user.email}'",
                    )
                )

                # Map template ID to actual UUID
                user_map[user.id] = user_uuid

            except Exception as e:
                logger.error(f"Failed to create user '{user.email}': {e}")
                results.append(
                    EntityResult(
                        id=user.id,
                        type="user",
                        status="failed",
                        message=f"Failed to create user: {str(e)}",
                    )
                )

        return results, user_map

    async def _apply_workitems(
        self,
        workitems,
        user_map: dict[str, UUID],
        template_name: str,
        dry_run: bool = False,
    ) -> tuple[list[EntityResult], dict[str, UUID]]:
        """
        Apply workitems from template to the graph database.

        This method creates workitems in the Apache AGE graph database, resolves user
        references to UUIDs, checks for existing workitems, and supports all workitem
        types with their specific fields.

        Args:
            workitems: TemplateWorkitems object containing all workitem types
            user_map: Dictionary mapping template user IDs to actual UUIDs
            template_name: Name of the template (for deterministic UUID generation)
            dry_run: If True, don't actually create workitems

        Returns:
            Tuple of (list of EntityResult, dict mapping template workitem IDs to UUIDs)

        Requirements:
            - 4.3: Skip existing workitems and log warnings
            - 7.1: Create workitems of all supported types
            - 7.2: Store workitems in Apache AGE graph database
            - 7.3: Support all workitem-specific fields
            - 7.4: Resolve user references to UUIDs
        """
        results = []
        workitem_map = {}  # Maps template workitem ID to actual UUID

        # Process all workitem types
        all_workitems = []

        # Add requirements
        for req in workitems.requirements:
            all_workitems.append(("requirement", req))

        # Add tasks
        for task in workitems.tasks:
            all_workitems.append(("task", task))

        # Add tests
        for test in workitems.tests:
            all_workitems.append(("test", test))

        # Add risks
        for risk in workitems.risks:
            all_workitems.append(("risk", risk))

        # Process each workitem
        for workitem_type, workitem in all_workitems:
            try:
                # Generate deterministic UUID for this workitem
                workitem_uuid = self._generate_deterministic_uuid(
                    template_name, workitem.id
                )
                workitem_uuid_str = str(workitem_uuid)

                # Check if workitem already exists by ID
                existing_workitem = await self.graph_service.get_workitem(
                    workitem_uuid_str
                )

                if existing_workitem:
                    # Workitem already exists, skip
                    logger.warning(
                        f"Workitem with ID '{workitem_uuid_str}' already exists, skipping"
                    )
                    results.append(
                        EntityResult(
                            id=workitem.id,
                            type=workitem_type,
                            status="skipped",
                            message=f"Workitem with ID '{workitem_uuid_str}' already exists",
                        )
                    )
                    # Map template ID to existing workitem's UUID
                    workitem_map[workitem.id] = workitem_uuid
                    continue

                if dry_run:
                    # Dry run mode - don't actually create
                    logger.info(
                        f"[DRY RUN] Would create {workitem_type}: {workitem.title}"
                    )
                    results.append(
                        EntityResult(
                            id=workitem.id,
                            type=workitem_type,
                            status="created",
                            message=f"[DRY RUN] Would create {workitem_type} '{workitem.title}'",
                        )
                    )
                    workitem_map[workitem.id] = workitem_uuid
                    continue

                # Build properties dictionary
                properties = {
                    "id": workitem_uuid_str,
                    "type": workitem_type,
                    "title": workitem.title,
                    "status": workitem.status,
                    "priority": workitem.priority,
                }

                # Add optional common fields
                if workitem.description:
                    properties["description"] = workitem.description

                # Resolve user references
                if hasattr(workitem, "created_by") and workitem.created_by:
                    if workitem.created_by in user_map:
                        properties["created_by"] = str(user_map[workitem.created_by])
                    else:
                        logger.warning(
                            f"User reference '{workitem.created_by}' not found in user_map"
                        )

                if hasattr(workitem, "assigned_to") and workitem.assigned_to:
                    if workitem.assigned_to in user_map:
                        properties["assigned_to"] = str(user_map[workitem.assigned_to])
                    else:
                        logger.warning(
                            f"User reference '{workitem.assigned_to}' not found in user_map"
                        )

                # Add type-specific fields
                if workitem_type == "requirement":
                    if workitem.acceptance_criteria:
                        properties["acceptance_criteria"] = workitem.acceptance_criteria
                    if workitem.business_value:
                        properties["business_value"] = workitem.business_value
                    if workitem.source:
                        properties["source"] = workitem.source

                elif workitem_type == "task":
                    if workitem.estimated_hours is not None:
                        properties["estimated_hours"] = workitem.estimated_hours
                    if workitem.actual_hours is not None:
                        properties["actual_hours"] = workitem.actual_hours
                    if workitem.due_date:
                        properties["due_date"] = workitem.due_date.isoformat()

                elif workitem_type == "test":
                    if workitem.test_type:
                        properties["test_type"] = workitem.test_type
                    if workitem.test_steps:
                        properties["test_steps"] = workitem.test_steps
                    if workitem.expected_result:
                        properties["expected_result"] = workitem.expected_result
                    if workitem.actual_result:
                        properties["actual_result"] = workitem.actual_result
                    properties["test_status"] = workitem.test_status

                elif workitem_type == "risk":
                    properties["severity"] = workitem.severity
                    properties["occurrence"] = workitem.occurrence
                    properties["detection"] = workitem.detection
                    # Calculate RPN
                    properties["rpn"] = self._calculate_rpn(
                        workitem.severity, workitem.occurrence, workitem.detection
                    )
                    if workitem.mitigation_actions:
                        properties["mitigation_actions"] = workitem.mitigation_actions
                    if hasattr(workitem, "risk_owner") and workitem.risk_owner:
                        if workitem.risk_owner in user_map:
                            properties["risk_owner"] = str(
                                user_map[workitem.risk_owner]
                            )

                # Add auto-generated metadata fields
                properties = self._add_metadata_fields(workitem_type, properties)

                # Create workitem in graph database
                await self.graph_service.create_node("WorkItem", properties)

                logger.info(f"Created {workitem_type}: {workitem.title}")
                results.append(
                    EntityResult(
                        id=workitem.id,
                        type=workitem_type,
                        status="created",
                        message=f"Created {workitem_type} '{workitem.title}'",
                    )
                )

                # Map template ID to actual UUID
                workitem_map[workitem.id] = workitem_uuid

            except Exception as e:
                logger.error(f"Failed to create {workitem_type} '{workitem.id}': {e}")
                results.append(
                    EntityResult(
                        id=workitem.id,
                        type=workitem_type,
                        status="failed",
                        message=f"Failed to create {workitem_type}: {str(e)}",
                    )
                )

        return results, workitem_map

    async def _apply_companies(
        self,
        companies: list,
        template_name: str,
        dry_run: bool = False,
    ) -> tuple[list[EntityResult], dict[str, UUID]]:
        """
        Apply companies from template to graph database.

        Args:
            companies: List of TemplateCompany objects to create
            template_name: Name of the template (for deterministic UUID generation)
            dry_run: If True, don't actually create companies

        Returns:
            Tuple of (list of EntityResult, dict mapping template company IDs to UUIDs)

        Requirements:
            - 2.1: Create Company nodes in the graph database
            - 4.1: Check for existing entities before creation
            - 6.1: Generate deterministic UUIDs
            - 6.3: Skip existing entities
        """
        results = []
        company_map = {}

        for company in companies:
            try:
                # Generate deterministic UUID
                company_uuid = self._generate_deterministic_uuid(
                    template_name, company.id
                )
                company_uuid_str = str(company_uuid)

                # Check if company already exists
                existing = await self.graph_service.get_node(company_uuid_str)
                if existing:
                    logger.warning(
                        f"Company '{company_uuid_str}' already exists, skipping"
                    )
                    results.append(
                        EntityResult(
                            id=company.id,
                            type="company",
                            status="skipped",
                            message="Company already exists",
                        )
                    )
                    company_map[company.id] = company_uuid
                    continue

                if dry_run:
                    logger.info(f"[DRY RUN] Would create company: {company.name}")
                    results.append(
                        EntityResult(
                            id=company.id,
                            type="company",
                            status="created",
                            message=f"[DRY RUN] Would create company '{company.name}'",
                        )
                    )
                    company_map[company.id] = company_uuid
                    continue

                # Build properties
                properties = {
                    "id": company_uuid_str,
                    "name": company.name,
                    "created_at": datetime.now(UTC).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
                if company.description:
                    properties["description"] = company.description

                # Create company node
                await self.graph_service.create_node("Company", properties)

                logger.info(f"Created company: {company.name}")
                results.append(
                    EntityResult(
                        id=company.id,
                        type="company",
                        status="created",
                        message=f"Created company '{company.name}'",
                    )
                )
                company_map[company.id] = company_uuid

            except Exception as e:
                logger.error(f"Failed to create company '{company.id}': {e}")
                results.append(
                    EntityResult(
                        id=company.id,
                        type="company",
                        status="failed",
                        message=f"Failed to create company: {str(e)}",
                    )
                )

        return results, company_map

    async def _apply_departments(
        self,
        departments: list,
        company_map: dict[str, UUID],
        user_map: dict[str, UUID],
        template_name: str,
        dry_run: bool = False,
    ) -> tuple[list[EntityResult], dict[str, UUID]]:
        """
        Apply departments from template to graph database.

        Args:
            departments: List of TemplateDepartment objects to create
            company_map: Dictionary mapping template company IDs to actual UUIDs
            user_map: Dictionary mapping template user IDs to actual UUIDs
            template_name: Name of the template (for deterministic UUID generation)
            dry_run: If True, don't actually create departments

        Returns:
            Tuple of (list of EntityResult, dict mapping template department IDs to UUIDs)

        Requirements:
            - 2.2: Create Department nodes in the graph database
            - 2.4: Create PARENT_OF relationships from companies to departments
            - 4.1: Check for existing entities before creation
            - 6.1: Generate deterministic UUIDs
            - 6.3: Skip existing entities
        """
        results = []
        department_map = {}

        for department in departments:
            try:
                # Generate deterministic UUID
                department_uuid = self._generate_deterministic_uuid(
                    template_name, department.id
                )
                department_uuid_str = str(department_uuid)

                # Check if department already exists
                existing = await self.graph_service.get_node(department_uuid_str)
                if existing:
                    logger.warning(
                        f"Department '{department_uuid_str}' already exists, skipping"
                    )
                    results.append(
                        EntityResult(
                            id=department.id,
                            type="department",
                            status="skipped",
                            message="Department already exists",
                        )
                    )
                    department_map[department.id] = department_uuid
                    continue

                if dry_run:
                    logger.info(f"[DRY RUN] Would create department: {department.name}")
                    results.append(
                        EntityResult(
                            id=department.id,
                            type="department",
                            status="created",
                            message=f"[DRY RUN] Would create department '{department.name}'",
                        )
                    )
                    department_map[department.id] = department_uuid
                    continue

                # Build properties
                properties = {
                    "id": department_uuid_str,
                    "name": department.name,
                    "created_at": datetime.now(UTC).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
                if department.description:
                    properties["description"] = department.description

                # Resolve manager_user_id if present
                if department.manager_user_id:
                    if department.manager_user_id in user_map:
                        properties["manager_user_id"] = str(
                            user_map[department.manager_user_id]
                        )
                    else:
                        logger.warning(
                            f"Manager user '{department.manager_user_id}' not found in user_map"
                        )

                # Create department node
                await self.graph_service.create_node("Department", properties)

                # Create PARENT_OF relationship from company to department
                if department.company_id:
                    if department.company_id in company_map:
                        company_uuid_str = str(company_map[department.company_id])
                        await self.graph_service.create_relationship(
                            from_id=company_uuid_str,
                            to_id=department_uuid_str,
                            rel_type="PARENT_OF",
                            properties={"created_at": datetime.now(UTC).isoformat()},
                        )
                        logger.info(
                            f"Created PARENT_OF relationship from company '{department.company_id}' to department '{department.name}'"
                        )
                    else:
                        logger.warning(
                            f"Company '{department.company_id}' not found in company_map"
                        )

                logger.info(f"Created department: {department.name}")
                results.append(
                    EntityResult(
                        id=department.id,
                        type="department",
                        status="created",
                        message=f"Created department '{department.name}'",
                    )
                )
                department_map[department.id] = department_uuid

            except Exception as e:
                logger.error(f"Failed to create department '{department.id}': {e}")
                results.append(
                    EntityResult(
                        id=department.id,
                        type="department",
                        status="failed",
                        message=f"Failed to create department: {str(e)}",
                    )
                )

        return results, department_map

    async def _apply_resources(
        self,
        resources: list,
        department_map: dict[str, UUID],
        user_map: dict[str, UUID],
        template_name: str,
        dry_run: bool = False,
    ) -> tuple[list[EntityResult], dict[str, UUID]]:
        """
        Apply resources from template to graph database.

        Args:
            resources: List of TemplateResource objects to create
            department_map: Dictionary mapping template department IDs to actual UUIDs
            user_map: Dictionary mapping template user IDs to actual UUIDs
            template_name: Name of the template (for deterministic UUID generation)
            dry_run: If True, don't actually create resources

        Returns:
            Tuple of (list of EntityResult, dict mapping template resource IDs to UUIDs)

        Requirements:
            - 2.3: Create Resource nodes in the graph database
            - 2.5: Create BELONGS_TO relationships from resources to departments
            - 4.1: Check for existing entities before creation
            - 6.1: Generate deterministic UUIDs
            - 6.3: Skip existing entities
        """
        results = []
        resource_map = {}

        for resource in resources:
            try:
                # Generate deterministic UUID
                resource_uuid = self._generate_deterministic_uuid(
                    template_name, resource.id
                )
                resource_uuid_str = str(resource_uuid)

                # Check if resource already exists
                existing = await self.graph_service.get_node(resource_uuid_str)
                if existing:
                    logger.warning(
                        f"Resource '{resource_uuid_str}' already exists, skipping"
                    )
                    results.append(
                        EntityResult(
                            id=resource.id,
                            type="resource",
                            status="skipped",
                            message="Resource already exists",
                        )
                    )
                    resource_map[resource.id] = resource_uuid
                    continue

                if dry_run:
                    logger.info(f"[DRY RUN] Would create resource: {resource.name}")
                    results.append(
                        EntityResult(
                            id=resource.id,
                            type="resource",
                            status="created",
                            message=f"[DRY RUN] Would create resource '{resource.name}'",
                        )
                    )
                    resource_map[resource.id] = resource_uuid
                    continue

                # Build properties
                properties = {
                    "id": resource_uuid_str,
                    "name": resource.name,
                    "type": "Resource",  # Node type for graph visualization
                    "resource_type": resource.type.value,  # Resource kind (person, machine, etc.)
                    "availability": resource.availability.value,
                    "created_at": datetime.now(UTC).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
                if resource.description:
                    properties["description"] = resource.description
                if resource.capacity is not None:
                    properties["capacity"] = resource.capacity
                if resource.skills:
                    properties["skills"] = resource.skills

                # Create resource node
                await self.graph_service.create_node("Resource", properties)

                # Create BELONGS_TO relationship from resource to department
                if resource.department_id:
                    if resource.department_id in department_map:
                        department_uuid_str = str(
                            department_map[resource.department_id]
                        )
                        await self.graph_service.create_relationship(
                            from_id=resource_uuid_str,
                            to_id=department_uuid_str,
                            rel_type="BELONGS_TO",
                            properties={"created_at": datetime.now(UTC).isoformat()},
                        )
                        logger.info(
                            f"Created BELONGS_TO relationship from resource '{resource.name}' to department '{resource.department_id}'"
                        )
                    else:
                        logger.warning(
                            f"Department '{resource.department_id}' not found in department_map"
                        )

                logger.info(f"Created resource: {resource.name}")
                results.append(
                    EntityResult(
                        id=resource.id,
                        type="resource",
                        status="created",
                        message=f"Created resource '{resource.name}'",
                    )
                )
                resource_map[resource.id] = resource_uuid

            except Exception as e:
                logger.error(f"Failed to create resource '{resource.id}': {e}")
                results.append(
                    EntityResult(
                        id=resource.id,
                        type="resource",
                        status="failed",
                        message=f"Failed to create resource: {str(e)}",
                    )
                )

        return results, resource_map

    async def _apply_projects(
        self,
        projects: list,
        user_map: dict[str, UUID],
        template_name: str,
        dry_run: bool = False,
    ) -> tuple[list[EntityResult], dict[str, UUID]]:
        """
        Apply projects from template to graph database.

        Args:
            projects: List of TemplateProject objects to create
            user_map: Dictionary mapping template user IDs to actual UUIDs
            template_name: Name of the template (for deterministic UUID generation)
            dry_run: If True, don't actually create projects

        Returns:
            Tuple of (list of EntityResult, dict mapping template project IDs to UUIDs)

        Requirements:
            - 1.1: Create Project nodes in the graph database
            - 4.1: Check for existing entities before creation
            - 6.1: Generate deterministic UUIDs
            - 6.3: Skip existing entities
        """
        results = []
        project_map = {}

        for project in projects:
            try:
                # Generate deterministic UUID
                project_uuid = self._generate_deterministic_uuid(
                    template_name, project.id
                )
                project_uuid_str = str(project_uuid)

                # Check if project already exists
                existing = await self.graph_service.get_node(project_uuid_str)
                if existing:
                    logger.warning(
                        f"Project '{project_uuid_str}' already exists, skipping"
                    )
                    results.append(
                        EntityResult(
                            id=project.id,
                            type="project",
                            status="skipped",
                            message="Project already exists",
                        )
                    )
                    project_map[project.id] = project_uuid
                    continue

                if dry_run:
                    logger.info(f"[DRY RUN] Would create project: {project.name}")
                    results.append(
                        EntityResult(
                            id=project.id,
                            type="project",
                            status="created",
                            message=f"[DRY RUN] Would create project '{project.name}'",
                        )
                    )
                    project_map[project.id] = project_uuid
                    continue

                # Build properties
                properties = {
                    "id": project_uuid_str,
                    "name": project.name,
                    "status": project.status.value,
                    "created_at": datetime.now(UTC).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
                if project.description:
                    properties["description"] = project.description

                # Create project node
                await self.graph_service.create_node("Project", properties)

                logger.info(f"Created project: {project.name}")
                results.append(
                    EntityResult(
                        id=project.id,
                        type="project",
                        status="created",
                        message=f"Created project '{project.name}'",
                    )
                )
                project_map[project.id] = project_uuid

            except Exception as e:
                logger.error(f"Failed to create project '{project.id}': {e}")
                results.append(
                    EntityResult(
                        id=project.id,
                        type="project",
                        status="failed",
                        message=f"Failed to create project: {str(e)}",
                    )
                )

        return results, project_map

    async def _apply_sprints(
        self,
        sprints: list,
        project_map: dict[str, UUID],
        template_name: str,
        dry_run: bool = False,
    ) -> tuple[list[EntityResult], dict[str, UUID]]:
        """
        Apply sprints from template to graph database.

        Args:
            sprints: List of TemplateSprint objects to create
            project_map: Dictionary mapping template project IDs to actual UUIDs
            template_name: Name of the template (for deterministic UUID generation)
            dry_run: If True, don't actually create sprints

        Returns:
            Tuple of (list of EntityResult, dict mapping template sprint IDs to UUIDs)

        Requirements:
            - 1.2: Create Sprint nodes in the graph database
            - 1.7: Create BELONGS_TO relationships from sprints to projects
            - 4.1: Check for existing entities before creation
            - 6.1: Generate deterministic UUIDs
            - 6.3: Skip existing entities
        """
        results = []
        sprint_map = {}

        for sprint in sprints:
            try:
                # Generate deterministic UUID
                sprint_uuid = self._generate_deterministic_uuid(
                    template_name, sprint.id
                )
                sprint_uuid_str = str(sprint_uuid)

                # Check if sprint already exists
                existing = await self.graph_service.get_node(sprint_uuid_str)
                if existing:
                    logger.warning(
                        f"Sprint '{sprint_uuid_str}' already exists, skipping"
                    )
                    results.append(
                        EntityResult(
                            id=sprint.id,
                            type="sprint",
                            status="skipped",
                            message="Sprint already exists",
                        )
                    )
                    sprint_map[sprint.id] = sprint_uuid
                    continue

                if dry_run:
                    logger.info(f"[DRY RUN] Would create sprint: {sprint.name}")
                    results.append(
                        EntityResult(
                            id=sprint.id,
                            type="sprint",
                            status="created",
                            message=f"[DRY RUN] Would create sprint '{sprint.name}'",
                        )
                    )
                    sprint_map[sprint.id] = sprint_uuid
                    continue

                # Build properties
                properties = {
                    "id": sprint_uuid_str,
                    "name": sprint.name,
                    "status": sprint.status.value,
                    "start_date": sprint.start_date.isoformat(),
                    "end_date": sprint.end_date.isoformat(),
                    "created_at": datetime.now(UTC).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
                if sprint.description:
                    properties["description"] = sprint.description
                if sprint.goal:
                    properties["goal"] = sprint.goal
                if sprint.capacity_hours is not None:
                    properties["capacity_hours"] = sprint.capacity_hours
                if sprint.capacity_story_points is not None:
                    properties["capacity_story_points"] = sprint.capacity_story_points
                if sprint.actual_velocity_hours is not None:
                    properties["actual_velocity_hours"] = sprint.actual_velocity_hours
                if sprint.actual_velocity_story_points is not None:
                    properties["actual_velocity_story_points"] = (
                        sprint.actual_velocity_story_points
                    )

                # Create sprint node
                await self.graph_service.create_node("Sprint", properties)

                # Create BELONGS_TO relationship from sprint to project
                if sprint.project_id:
                    if sprint.project_id in project_map:
                        project_uuid_str = str(project_map[sprint.project_id])
                        await self.graph_service.create_relationship(
                            from_id=sprint_uuid_str,
                            to_id=project_uuid_str,
                            rel_type="BELONGS_TO",
                            properties={"created_at": datetime.now(UTC).isoformat()},
                        )
                        logger.info(
                            f"Created BELONGS_TO relationship from sprint '{sprint.name}' to project '{sprint.project_id}'"
                        )
                    else:
                        logger.warning(
                            f"Project '{sprint.project_id}' not found in project_map"
                        )

                logger.info(f"Created sprint: {sprint.name}")
                results.append(
                    EntityResult(
                        id=sprint.id,
                        type="sprint",
                        status="created",
                        message=f"Created sprint '{sprint.name}'",
                    )
                )
                sprint_map[sprint.id] = sprint_uuid

            except Exception as e:
                logger.error(f"Failed to create sprint '{sprint.id}': {e}")
                results.append(
                    EntityResult(
                        id=sprint.id,
                        type="sprint",
                        status="failed",
                        message=f"Failed to create sprint: {str(e)}",
                    )
                )

        return results, sprint_map

    async def _apply_phases(
        self,
        phases: list,
        project_map: dict[str, UUID],
        template_name: str,
        dry_run: bool = False,
    ) -> tuple[list[EntityResult], dict[str, UUID]]:
        """
        Apply phases from template to graph database.

        Args:
            phases: List of TemplatePhase objects to create
            project_map: Dictionary mapping template project IDs to actual UUIDs
            template_name: Name of the template (for deterministic UUID generation)
            dry_run: If True, don't actually create phases

        Returns:
            Tuple of (list of EntityResult, dict mapping template phase IDs to UUIDs)

        Requirements:
            - 1.3: Create Phase nodes in the graph database
            - 1.7: Create BELONGS_TO relationships from phases to projects
            - 4.1: Check for existing entities before creation
            - 6.1: Generate deterministic UUIDs
            - 6.3: Skip existing entities
        """
        results = []
        phase_map = {}

        for phase in phases:
            try:
                # Generate deterministic UUID
                phase_uuid = self._generate_deterministic_uuid(template_name, phase.id)
                phase_uuid_str = str(phase_uuid)

                # Check if phase already exists
                existing = await self.graph_service.get_node(phase_uuid_str)
                if existing:
                    logger.warning(f"Phase '{phase_uuid_str}' already exists, skipping")
                    results.append(
                        EntityResult(
                            id=phase.id,
                            type="phase",
                            status="skipped",
                            message="Phase already exists",
                        )
                    )
                    phase_map[phase.id] = phase_uuid
                    continue

                if dry_run:
                    logger.info(f"[DRY RUN] Would create phase: {phase.name}")
                    results.append(
                        EntityResult(
                            id=phase.id,
                            type="phase",
                            status="created",
                            message=f"[DRY RUN] Would create phase '{phase.name}'",
                        )
                    )
                    phase_map[phase.id] = phase_uuid
                    continue

                # Build properties
                properties = {
                    "id": phase_uuid_str,
                    "name": phase.name,
                    "order": phase.order,
                    "created_at": datetime.now(UTC).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
                if phase.description:
                    properties["description"] = phase.description

                # Create phase node
                await self.graph_service.create_node("Phase", properties)

                # Create BELONGS_TO relationship from phase to project
                if phase.project_id:
                    if phase.project_id in project_map:
                        project_uuid_str = str(project_map[phase.project_id])
                        await self.graph_service.create_relationship(
                            from_id=phase_uuid_str,
                            to_id=project_uuid_str,
                            rel_type="BELONGS_TO",
                            properties={"created_at": datetime.now(UTC).isoformat()},
                        )
                        logger.info(
                            f"Created BELONGS_TO relationship from phase '{phase.name}' to project '{phase.project_id}'"
                        )
                    else:
                        logger.warning(
                            f"Project '{phase.project_id}' not found in project_map"
                        )

                logger.info(f"Created phase: {phase.name}")
                results.append(
                    EntityResult(
                        id=phase.id,
                        type="phase",
                        status="created",
                        message=f"Created phase '{phase.name}'",
                    )
                )
                phase_map[phase.id] = phase_uuid

            except Exception as e:
                logger.error(f"Failed to create phase '{phase.id}': {e}")
                results.append(
                    EntityResult(
                        id=phase.id,
                        type="phase",
                        status="failed",
                        message=f"Failed to create phase: {str(e)}",
                    )
                )

        return results, phase_map

    async def _apply_workpackages(
        self,
        workpackages: list,
        phase_map: dict[str, UUID],
        template_name: str,
        dry_run: bool = False,
    ) -> tuple[list[EntityResult], dict[str, UUID]]:
        """
        Apply workpackages from template to graph database.

        Args:
            workpackages: List of TemplateWorkpackage objects to create
            phase_map: Dictionary mapping template phase IDs to actual UUIDs
            template_name: Name of the template (for deterministic UUID generation)
            dry_run: If True, don't actually create workpackages

        Returns:
            Tuple of (list of EntityResult, dict mapping template workpackage IDs to UUIDs)

        Requirements:
            - 1.4: Create Workpackage nodes in the graph database
            - 1.7: Create BELONGS_TO relationships from workpackages to phases
            - 4.1: Check for existing entities before creation
            - 6.1: Generate deterministic UUIDs
            - 6.3: Skip existing entities
        """
        results = []
        workpackage_map = {}

        for workpackage in workpackages:
            try:
                # Generate deterministic UUID
                workpackage_uuid = self._generate_deterministic_uuid(
                    template_name, workpackage.id
                )
                workpackage_uuid_str = str(workpackage_uuid)

                # Check if workpackage already exists
                existing = await self.graph_service.get_node(workpackage_uuid_str)
                if existing:
                    logger.warning(
                        f"Workpackage '{workpackage_uuid_str}' already exists, skipping"
                    )
                    results.append(
                        EntityResult(
                            id=workpackage.id,
                            type="workpackage",
                            status="skipped",
                            message="Workpackage already exists",
                        )
                    )
                    workpackage_map[workpackage.id] = workpackage_uuid
                    continue

                if dry_run:
                    logger.info(
                        f"[DRY RUN] Would create workpackage: {workpackage.name}"
                    )
                    results.append(
                        EntityResult(
                            id=workpackage.id,
                            type="workpackage",
                            status="created",
                            message=f"[DRY RUN] Would create workpackage '{workpackage.name}'",
                        )
                    )
                    workpackage_map[workpackage.id] = workpackage_uuid
                    continue

                # Build properties
                properties = {
                    "id": workpackage_uuid_str,
                    "name": workpackage.name,
                    "order": workpackage.order,
                    "created_at": datetime.now(UTC).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
                if workpackage.description:
                    properties["description"] = workpackage.description

                # Create workpackage node
                await self.graph_service.create_node("Workpackage", properties)

                # Create BELONGS_TO relationship from workpackage to phase
                if workpackage.phase_id:
                    if workpackage.phase_id in phase_map:
                        phase_uuid_str = str(phase_map[workpackage.phase_id])
                        await self.graph_service.create_relationship(
                            from_id=workpackage_uuid_str,
                            to_id=phase_uuid_str,
                            rel_type="BELONGS_TO",
                            properties={"created_at": datetime.now(UTC).isoformat()},
                        )
                        logger.info(
                            f"Created BELONGS_TO relationship from workpackage '{workpackage.name}' to phase '{workpackage.phase_id}'"
                        )
                    else:
                        logger.warning(
                            f"Phase '{workpackage.phase_id}' not found in phase_map"
                        )

                logger.info(f"Created workpackage: {workpackage.name}")
                results.append(
                    EntityResult(
                        id=workpackage.id,
                        type="workpackage",
                        status="created",
                        message=f"Created workpackage '{workpackage.name}'",
                    )
                )
                workpackage_map[workpackage.id] = workpackage_uuid

            except Exception as e:
                logger.error(f"Failed to create workpackage '{workpackage.id}': {e}")
                results.append(
                    EntityResult(
                        id=workpackage.id,
                        type="workpackage",
                        status="failed",
                        message=f"Failed to create workpackage: {str(e)}",
                    )
                )

        return results, workpackage_map

    async def _apply_backlogs(
        self,
        backlogs: list,
        project_map: dict[str, UUID],
        template_name: str,
        dry_run: bool = False,
    ) -> tuple[list[EntityResult], dict[str, UUID]]:
        """
        Apply backlogs from template to graph database.

        Args:
            backlogs: List of TemplateBacklog objects to create
            project_map: Dictionary mapping template project IDs to actual UUIDs
            template_name: Name of the template (for deterministic UUID generation)
            dry_run: If True, don't actually create backlogs

        Returns:
            Tuple of (list of EntityResult, dict mapping template backlog IDs to UUIDs)

        Requirements:
            - 1.6: Create Backlog nodes in the graph database
            - 1.7: Create BELONGS_TO relationships from backlogs to projects
            - 4.1: Check for existing entities before creation
            - 6.1: Generate deterministic UUIDs
            - 6.3: Skip existing entities
        """
        results = []
        backlog_map = {}

        for backlog in backlogs:
            try:
                # Generate deterministic UUID
                backlog_uuid = self._generate_deterministic_uuid(
                    template_name, backlog.id
                )
                backlog_uuid_str = str(backlog_uuid)

                # Check if backlog already exists
                existing = await self.graph_service.get_node(backlog_uuid_str)
                if existing:
                    logger.warning(
                        f"Backlog '{backlog_uuid_str}' already exists, skipping"
                    )
                    results.append(
                        EntityResult(
                            id=backlog.id,
                            type="backlog",
                            status="skipped",
                            message="Backlog already exists",
                        )
                    )
                    backlog_map[backlog.id] = backlog_uuid
                    continue

                if dry_run:
                    logger.info(f"[DRY RUN] Would create backlog: {backlog.name}")
                    results.append(
                        EntityResult(
                            id=backlog.id,
                            type="backlog",
                            status="created",
                            message=f"[DRY RUN] Would create backlog '{backlog.name}'",
                        )
                    )
                    backlog_map[backlog.id] = backlog_uuid
                    continue

                # Build properties
                properties = {
                    "id": backlog_uuid_str,
                    "name": backlog.name,
                    "created_at": datetime.now(UTC).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
                if backlog.description:
                    properties["description"] = backlog.description

                # Create backlog node
                await self.graph_service.create_node("Backlog", properties)

                # Create BELONGS_TO relationship from backlog to project
                if backlog.project_id:
                    if backlog.project_id in project_map:
                        project_uuid_str = str(project_map[backlog.project_id])
                        await self.graph_service.create_relationship(
                            from_id=backlog_uuid_str,
                            to_id=project_uuid_str,
                            rel_type="BELONGS_TO",
                            properties={"created_at": datetime.now(UTC).isoformat()},
                        )
                        logger.info(
                            f"Created BELONGS_TO relationship from backlog '{backlog.name}' to project '{backlog.project_id}'"
                        )
                    else:
                        logger.warning(
                            f"Project '{backlog.project_id}' not found in project_map"
                        )

                logger.info(f"Created backlog: {backlog.name}")
                results.append(
                    EntityResult(
                        id=backlog.id,
                        type="backlog",
                        status="created",
                        message=f"Created backlog '{backlog.name}'",
                    )
                )
                backlog_map[backlog.id] = backlog_uuid

            except Exception as e:
                logger.error(f"Failed to create backlog '{backlog.id}': {e}")
                results.append(
                    EntityResult(
                        id=backlog.id,
                        type="backlog",
                        status="failed",
                        message=f"Failed to create backlog: {str(e)}",
                    )
                )

        return results, backlog_map

    async def _apply_milestones(
        self,
        milestones: list,
        project_map: dict[str, UUID],
        template_name: str,
        dry_run: bool = False,
    ) -> tuple[list[EntityResult], dict[str, UUID]]:
        """
        Apply milestones from template to graph database.

        Args:
            milestones: List of TemplateMilestone objects to create
            project_map: Dictionary mapping template project IDs to actual UUIDs
            template_name: Name of the template (for deterministic UUID generation)
            dry_run: If True, don't actually create milestones

        Returns:
            Tuple of (list of EntityResult, dict mapping template milestone IDs to UUIDs)

        Requirements:
            - 1.5: Create Milestone nodes in the graph database
            - 1.7: Create BELONGS_TO relationships from milestones to projects
            - 4.1: Check for existing entities before creation
            - 6.1: Generate deterministic UUIDs
            - 6.3: Skip existing entities
        """
        results = []
        milestone_map = {}

        for milestone in milestones:
            try:
                # Generate deterministic UUID
                milestone_uuid = self._generate_deterministic_uuid(
                    template_name, milestone.id
                )
                milestone_uuid_str = str(milestone_uuid)

                # Check if milestone already exists
                existing = await self.graph_service.get_node(milestone_uuid_str)
                if existing:
                    logger.warning(
                        f"Milestone '{milestone_uuid_str}' already exists, skipping"
                    )
                    results.append(
                        EntityResult(
                            id=milestone.id,
                            type="milestone",
                            status="skipped",
                            message="Milestone already exists",
                        )
                    )
                    milestone_map[milestone.id] = milestone_uuid
                    continue

                if dry_run:
                    logger.info(f"[DRY RUN] Would create milestone: {milestone.name}")
                    results.append(
                        EntityResult(
                            id=milestone.id,
                            type="milestone",
                            status="created",
                            message=f"[DRY RUN] Would create milestone '{milestone.name}'",
                        )
                    )
                    milestone_map[milestone.id] = milestone_uuid
                    continue

                # Build properties
                properties = {
                    "id": milestone_uuid_str,
                    "name": milestone.name,
                    "status": milestone.status.value,
                    "due_date": milestone.due_date.isoformat(),
                    "created_at": datetime.now(UTC).isoformat(),
                    "updated_at": datetime.now(UTC).isoformat(),
                }
                if milestone.description:
                    properties["description"] = milestone.description

                # Create milestone node
                await self.graph_service.create_node("Milestone", properties)

                # Create BELONGS_TO relationship from milestone to project
                if milestone.project_id:
                    if milestone.project_id in project_map:
                        project_uuid_str = str(project_map[milestone.project_id])
                        await self.graph_service.create_relationship(
                            from_id=milestone_uuid_str,
                            to_id=project_uuid_str,
                            rel_type="BELONGS_TO",
                            properties={"created_at": datetime.now(UTC).isoformat()},
                        )
                        logger.info(
                            f"Created BELONGS_TO relationship from milestone '{milestone.name}' to project '{milestone.project_id}'"
                        )
                    else:
                        logger.warning(
                            f"Project '{milestone.project_id}' not found in project_map"
                        )

                logger.info(f"Created milestone: {milestone.name}")
                results.append(
                    EntityResult(
                        id=milestone.id,
                        type="milestone",
                        status="created",
                        message=f"Created milestone '{milestone.name}'",
                    )
                )
                milestone_map[milestone.id] = milestone_uuid

            except Exception as e:
                logger.error(f"Failed to create milestone '{milestone.id}': {e}")
                results.append(
                    EntityResult(
                        id=milestone.id,
                        type="milestone",
                        status="failed",
                        message=f"Failed to create milestone: {str(e)}",
                    )
                )

        return results, milestone_map

    async def _apply_relationships(
        self,
        relationships: list,
        workitem_map: dict[str, UUID],
        template_name: str,
        dry_run: bool = False,
    ) -> list[EntityResult]:
        """
        Apply relationships from template to the graph database.

        This method creates relationships between workitems, validates that both
        endpoints exist, and supports all relationship types.

        Args:
            relationships: List of TemplateRelationship objects
            workitem_map: Dictionary mapping template workitem IDs to actual UUIDs
            template_name: Name of the template (for logging)
            dry_run: If True, don't actually create relationships

        Returns:
            List of EntityResult objects

        Requirements:
            - 4.4: Skip existing relationships
            - 8.1: Create relationships of all types
            - 8.2: Validate that both source and target workitems exist
            - 8.3: Skip relationships with non-existent workitems
            - 8.4: Support relationship metadata
        """
        results = []

        for rel in relationships:
            try:
                # Validate that both endpoints exist in workitem_map
                if rel.from_id not in workitem_map:
                    logger.error(
                        f"Source workitem '{rel.from_id}' not found for relationship"
                    )
                    results.append(
                        EntityResult(
                            id=f"{rel.from_id}-{rel.to_id}",
                            type="relationship",
                            status="failed",
                            message=f"Source workitem '{rel.from_id}' not found",
                        )
                    )
                    continue

                if rel.to_id not in workitem_map:
                    logger.error(
                        f"Target workitem '{rel.to_id}' not found for relationship"
                    )
                    results.append(
                        EntityResult(
                            id=f"{rel.from_id}-{rel.to_id}",
                            type="relationship",
                            status="failed",
                            message=f"Target workitem '{rel.to_id}' not found",
                        )
                    )
                    continue

                # Get actual UUIDs
                from_uuid = str(workitem_map[rel.from_id])
                to_uuid = str(workitem_map[rel.to_id])

                # Check if relationship already exists
                # Query to check if relationship exists
                query = f"""
                MATCH (a {{id: '{from_uuid}'}})-[r:{rel.type.value}]->(b {{id: '{to_uuid}'}})
                RETURN r
                """
                existing_rels = await self.graph_service.execute_query(query)

                if existing_rels:
                    # Relationship already exists, skip
                    logger.warning(
                        f"Relationship {rel.type.value} from '{rel.from_id}' to '{rel.to_id}' already exists, skipping"
                    )
                    results.append(
                        EntityResult(
                            id=f"{rel.from_id}-{rel.to_id}",
                            type="relationship",
                            status="skipped",
                            message=f"Relationship {rel.type.value} already exists",
                        )
                    )
                    continue

                if dry_run:
                    # Dry run mode - don't actually create
                    logger.info(
                        f"[DRY RUN] Would create relationship: {rel.from_id} -{rel.type.value}-> {rel.to_id}"
                    )
                    results.append(
                        EntityResult(
                            id=f"{rel.from_id}-{rel.to_id}",
                            type="relationship",
                            status="created",
                            message=f"[DRY RUN] Would create relationship {rel.type.value}",
                        )
                    )
                    continue

                # Create relationship with metadata
                properties = {
                    "created_at": datetime.now(UTC).isoformat(),
                }

                # Add ALLOCATED_TO specific properties
                if rel.type.value == "ALLOCATED_TO":
                    if (
                        hasattr(rel, "allocation_percentage")
                        and rel.allocation_percentage is not None
                    ):
                        properties["allocation_percentage"] = rel.allocation_percentage
                    if hasattr(rel, "lead") and rel.lead is not None:
                        properties["lead"] = rel.lead

                await self.graph_service.create_relationship(
                    from_id=from_uuid,
                    to_id=to_uuid,
                    rel_type=rel.type.value,
                    properties=properties,
                )

                logger.info(
                    f"Created relationship: {rel.from_id} -{rel.type.value}-> {rel.to_id}"
                )
                results.append(
                    EntityResult(
                        id=f"{rel.from_id}-{rel.to_id}",
                        type="relationship",
                        status="created",
                        message=f"Created relationship {rel.type.value}",
                    )
                )

            except Exception as e:
                logger.error(
                    f"Failed to create relationship {rel.from_id} -> {rel.to_id}: {e}"
                )
                results.append(
                    EntityResult(
                        id=f"{rel.from_id}-{rel.to_id}",
                        type="relationship",
                        status="failed",
                        message=f"Failed to create relationship: {str(e)}",
                    )
                )

        return results

    async def apply_template(
        self,
        name: str,
        dry_run: bool = False,
    ) -> ApplicationResult:
        """
        Apply a template to the database.

        This method orchestrates the complete template application process:
        1. Load and validate the template
        2. Apply users (with deterministic UUIDs)
        3. Apply workitems (with user reference resolution)
        4. Apply relationships (with endpoint validation)

        The application is idempotent - applying the same template multiple times
        produces the same result as applying it once.

        Args:
            name: Template name to apply
            dry_run: If True, simulate application without making changes

        Returns:
            ApplicationResult with summary of created, skipped, and failed entities

        Requirements:
            - 4.1: Check for existing entities before creation
            - 4.5: Return summary report of created, skipped, and failed entities
            - 5.1: Produce same database state when applied multiple times
            - 5.2: Use deterministic UUIDs for template entities
            - 5.3: Match entities by both ID and natural keys
        """
        try:
            # Load the template
            template = await self.get_template(name)
            if not template:
                return ApplicationResult(
                    success=False,
                    template_name=name,
                    dry_run=dry_run,
                    created_count=0,
                    skipped_count=0,
                    failed_count=1,
                    entities=[],
                )

            # Validate the template (constraints only, references will be resolved during application)
            # Only validate constraints, not references, since modular templates may reference
            # entities from other templates that will be resolved during application
            constraint_errors = self.validator.validate_constraints(template)
            if constraint_errors:
                # Create entity results for validation errors
                error_entities = []
                for error in constraint_errors[:10]:  # Limit to first 10 errors
                    error_entities.append(
                        EntityResult(
                            id="validation",
                            type="validation",
                            status="failed",
                            message=f"{error.path}: {error.message}",
                        )
                    )

                return ApplicationResult(
                    success=False,
                    template_name=name,
                    dry_run=dry_run,
                    created_count=0,
                    skipped_count=0,
                    failed_count=len(constraint_errors),
                    entities=error_entities,
                )

            logger.info(f"Applying template '{name}' (dry_run={dry_run})")

            all_results = []

            # Step 1: Apply users
            user_results, user_map = await self._apply_users(
                users=template.users,
                default_password=template.settings.default_password,
                template_name=name,
                dry_run=dry_run,
            )
            all_results.extend(user_results)

            # Step 2: Apply organizational entities (companies, departments, resources)
            company_map = {}
            department_map = {}
            resource_map = {}

            if hasattr(template, "companies") and template.companies:
                company_results, company_map = await self._apply_companies(
                    companies=template.companies,
                    template_name=name,
                    dry_run=dry_run,
                )
                all_results.extend(company_results)

            if hasattr(template, "departments") and template.departments:
                department_results, department_map = await self._apply_departments(
                    departments=template.departments,
                    company_map=company_map,
                    user_map=user_map,
                    template_name=name,
                    dry_run=dry_run,
                )
                all_results.extend(department_results)

            if hasattr(template, "resources") and template.resources:
                resource_results, resource_map = await self._apply_resources(
                    resources=template.resources,
                    department_map=department_map,
                    user_map=user_map,
                    template_name=name,
                    dry_run=dry_run,
                )
                all_results.extend(resource_results)

            # Step 3: Apply project management entities (projects, sprints, phases, etc.)
            project_map = {}
            sprint_map = {}
            phase_map = {}
            workpackage_map = {}
            backlog_map = {}
            milestone_map = {}

            if hasattr(template, "projects") and template.projects:
                project_results, project_map = await self._apply_projects(
                    projects=template.projects,
                    user_map=user_map,
                    template_name=name,
                    dry_run=dry_run,
                )
                all_results.extend(project_results)

            if hasattr(template, "sprints") and template.sprints:
                sprint_results, sprint_map = await self._apply_sprints(
                    sprints=template.sprints,
                    project_map=project_map,
                    template_name=name,
                    dry_run=dry_run,
                )
                all_results.extend(sprint_results)

            if hasattr(template, "phases") and template.phases:
                phase_results, phase_map = await self._apply_phases(
                    phases=template.phases,
                    project_map=project_map,
                    template_name=name,
                    dry_run=dry_run,
                )
                all_results.extend(phase_results)

            if hasattr(template, "workpackages") and template.workpackages:
                workpackage_results, workpackage_map = await self._apply_workpackages(
                    workpackages=template.workpackages,
                    phase_map=phase_map,
                    template_name=name,
                    dry_run=dry_run,
                )
                all_results.extend(workpackage_results)

            if hasattr(template, "backlogs") and template.backlogs:
                backlog_results, backlog_map = await self._apply_backlogs(
                    backlogs=template.backlogs,
                    project_map=project_map,
                    template_name=name,
                    dry_run=dry_run,
                )
                all_results.extend(backlog_results)

            if hasattr(template, "milestones") and template.milestones:
                milestone_results, milestone_map = await self._apply_milestones(
                    milestones=template.milestones,
                    project_map=project_map,
                    template_name=name,
                    dry_run=dry_run,
                )
                all_results.extend(milestone_results)

            # Step 4: Apply workitems
            workitem_results, workitem_map = await self._apply_workitems(
                workitems=template.workitems,
                user_map=user_map,
                template_name=name,
                dry_run=dry_run,
            )
            all_results.extend(workitem_results)

            # Step 5: Apply relationships
            # Combine all entity maps for relationship resolution
            all_entity_maps = {
                **workitem_map,
                **company_map,
                **department_map,
                **resource_map,
                **project_map,
                **sprint_map,
                **phase_map,
                **workpackage_map,
                **backlog_map,
                **milestone_map,
            }

            # For modular templates: Query for referenced entities that aren't in current template
            # This allows relationships to reference entities from previously applied templates
            if template.relationships:
                for rel in template.relationships:
                    # Check if from_id is missing from all_entity_maps
                    if rel.from_id not in all_entity_maps:
                        # Try to find it in the database using deterministic UUID
                        # We don't know which template created it, so we try common template names
                        for template_prefix in [
                            "modular/company-acme",
                            "modular/project-medical-device",
                            "company-acme",
                            "project-medical-device",
                        ]:
                            try_uuid = self._generate_deterministic_uuid(
                                template_prefix, rel.from_id
                            )
                            existing = await self.graph_service.get_node(str(try_uuid))
                            if existing:
                                all_entity_maps[rel.from_id] = try_uuid
                                logger.debug(
                                    f"Found existing entity '{rel.from_id}' from template '{template_prefix}'"
                                )
                                break

                    # Check if to_id is missing from all_entity_maps
                    if rel.to_id not in all_entity_maps:
                        # Try to find it in the database using deterministic UUID
                        for template_prefix in [
                            "modular/company-acme",
                            "modular/project-medical-device",
                            "company-acme",
                            "project-medical-device",
                        ]:
                            try_uuid = self._generate_deterministic_uuid(
                                template_prefix, rel.to_id
                            )
                            existing = await self.graph_service.get_node(str(try_uuid))
                            if existing:
                                all_entity_maps[rel.to_id] = try_uuid
                                logger.debug(
                                    f"Found existing entity '{rel.to_id}' from template '{template_prefix}'"
                                )
                                break

            relationship_results = await self._apply_relationships(
                relationships=template.relationships,
                workitem_map=all_entity_maps,
                template_name=name,
                dry_run=dry_run,
            )
            all_results.extend(relationship_results)

            # Calculate summary counts
            created_count = sum(1 for r in all_results if r.status == "created")
            skipped_count = sum(1 for r in all_results if r.status == "skipped")
            failed_count = sum(1 for r in all_results if r.status == "failed")

            success = failed_count == 0

            logger.info(
                f"Template '{name}' application complete: "
                f"created={created_count}, skipped={skipped_count}, failed={failed_count}"
            )

            # Commit the transaction if not a dry run
            if not dry_run and success:
                await self.db_session.commit()
                logger.info("Database transaction committed")
            elif not dry_run and not success:
                await self.db_session.rollback()
                logger.warning("Database transaction rolled back due to errors")

            return ApplicationResult(
                success=success,
                template_name=name,
                dry_run=dry_run,
                created_count=created_count,
                skipped_count=skipped_count,
                failed_count=failed_count,
                entities=all_results,
            )

        except Exception as e:
            logger.error(f"Failed to apply template '{name}': {e}")
            return ApplicationResult(
                success=False,
                template_name=name,
                dry_run=dry_run,
                created_count=0,
                skipped_count=0,
                failed_count=1,
                entities=[],
            )

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
from typing import Optional
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

    async def get_template(self, name: str) -> Optional[TemplateDefinition]:
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
        workitems: "TemplateWorkitems",
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
                            properties["risk_owner"] = str(user_map[workitem.risk_owner])

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

            # Validate the template
            validation_result = await self.validate_template(name)
            if not validation_result.valid:
                error_messages = [
                    f"{err.path}: {err.message}" for err in validation_result.errors
                ]
                return ApplicationResult(
                    success=False,
                    template_name=name,
                    dry_run=dry_run,
                    created_count=0,
                    skipped_count=0,
                    failed_count=1,
                    entities=[],
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

            # Step 2: Apply workitems
            workitem_results, workitem_map = await self._apply_workitems(
                workitems=template.workitems,
                user_map=user_map,
                template_name=name,
                dry_run=dry_run,
            )
            all_results.extend(workitem_results)

            # Step 3: Apply relationships
            relationship_results = await self._apply_relationships(
                relationships=template.relationships,
                workitem_map=workitem_map,
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

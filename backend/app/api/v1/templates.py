"""
Template Management API endpoints.

This module provides REST API endpoints for template management operations including
listing templates, getting template details, applying templates, and validating templates.

Requirements:
- 10.1: GET /api/v1/templates endpoint to list available templates
- 10.2: GET /api/v1/templates/{name} endpoint to get template details
- 10.3: POST /api/v1/templates/{name}/apply endpoint to apply a template
- 10.4: Require admin role authentication for template application
- 10.5: Return appropriate HTTP status codes (200, 404, 403, 409)
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import graph_service
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.template import (
    ApplicationResult,
    TemplateDefinition,
    TemplateMetadata,
    ValidationResult,
)
from app.services.template_parser import TemplateParser
from app.services.template_service import TemplateService
from app.services.template_validator import TemplateValidator

router = APIRouter(prefix="/templates", tags=["templates"])


def get_template_service(db: AsyncSession = Depends(get_db)) -> TemplateService:
    """
    Dependency to get TemplateService instance.

    Args:
        db: Database session

    Returns:
        TemplateService instance configured with parser, validator, and services
    """
    # Get templates directory path
    templates_dir = Path(__file__).parent.parent.parent.parent / "templates"

    # Get schema path
    schema_path = templates_dir / "schema.json"

    # Create parser and validator
    parser = TemplateParser(templates_dir)
    validator = TemplateValidator(schema_path)

    # Create and return service
    return TemplateService(
        parser=parser,
        validator=validator,
        db_session=db,
        graph_service=graph_service,
    )


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to check if user has admin role.

    Only admin users can apply templates to the database.

    Args:
        current_user: Current authenticated user

    Returns:
        Current user if they have admin role

    Raises:
        HTTPException: 403 if user is not an admin

    Requirements:
        - 10.4: Require admin role authentication for template application
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required for template operations",
        )
    return current_user


@router.get("/", response_model=list[TemplateMetadata], status_code=status.HTTP_200_OK)
async def list_templates(
    template_service: TemplateService = Depends(get_template_service),
) -> list[TemplateMetadata]:
    """
    List all available templates.

    Returns metadata for all valid template files in the templates directory
    without loading the full template content.

    **Requirement 10.1**: List available templates

    Returns:
        List of TemplateMetadata objects containing name, version, description, and author

    Example Response:
        ```json
        [
            {
                "name": "default",
                "version": "1.0.0",
                "description": "Default template with all current seed data",
                "author": "RxDx Team"
            },
            {
                "name": "medical-device",
                "version": "1.0.0",
                "description": "Medical device project template with regulatory focus",
                "author": "RxDx Team"
            }
        ]
        ```
    """
    templates = await template_service.list_templates()
    return templates


@router.get(
    "/{name}",
    response_model=TemplateDefinition,
    status_code=status.HTTP_200_OK,
    responses={
        404: {"description": "Template not found"},
    },
)
async def get_template(
    name: str,
    template_service: TemplateService = Depends(get_template_service),
) -> TemplateDefinition:
    """
    Get template details by name.

    Returns the complete template definition including metadata, settings,
    users, workitems, and relationships.

    **Requirement 10.2**: Get template details by name

    Args:
        name: Template name (without .yaml extension)

    Returns:
        Complete TemplateDefinition object

    Raises:
        HTTPException 404: Template not found

    Example Response:
        ```json
        {
            "metadata": {
                "name": "minimal",
                "version": "1.0.0",
                "description": "Minimal template for testing",
                "author": "RxDx Team"
            },
            "settings": {
                "default_password": "password123"
            },
            "users": [...],
            "workitems": {...},
            "relationships": [...]
        }
        ```
    """
    template = await template_service.get_template(name)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{name}' not found",
        )

    return template


@router.post(
    "/{name}/apply",
    response_model=ApplicationResult,
    status_code=status.HTTP_200_OK,
    responses={
        403: {"description": "Admin role required"},
        404: {"description": "Template not found"},
        409: {"description": "Template application conflicts"},
    },
)
async def apply_template(
    name: str,
    dry_run: bool = Query(
        False,
        description="If true, simulate application without making changes",
    ),
    current_user: User = Depends(require_admin),
    template_service: TemplateService = Depends(get_template_service),
) -> ApplicationResult:
    """
    Apply a template to the database.

    Applies the specified template, creating users, workitems, and relationships.
    The application is idempotent - applying the same template multiple times
    produces the same result as applying it once.

    **Requirement 10.3**: Apply template endpoint
    **Requirement 10.4**: Require admin role authentication

    Args:
        name: Template name to apply
        dry_run: If true, simulate application without making changes
        current_user: Current authenticated user (must be admin)
        template_service: Template service instance

    Returns:
        ApplicationResult with summary of created, skipped, and failed entities

    Raises:
        HTTPException 403: User is not an admin
        HTTPException 404: Template not found
        HTTPException 409: Template application conflicts

    Example Response:
        ```json
        {
            "success": true,
            "template_name": "minimal",
            "dry_run": false,
            "created_count": 5,
            "skipped_count": 0,
            "failed_count": 0,
            "entities": [
                {
                    "id": "admin-user",
                    "type": "user",
                    "status": "created",
                    "message": "Created user 'admin@example.com'"
                },
                ...
            ]
        }
        ```
    """
    # Check if template exists
    template = await template_service.get_template(name)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{name}' not found",
        )

    # Apply the template
    result = await template_service.apply_template(name, dry_run=dry_run)

    # If there were failures, return 409 Conflict
    if not result.success and result.failed_count > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Template application failed: {result.failed_count} entities failed",
        )

    return result


@router.post(
    "/{name}/validate",
    response_model=ValidationResult,
    status_code=status.HTTP_200_OK,
    responses={
        404: {"description": "Template not found"},
    },
)
async def validate_template(
    name: str,
    template_service: TemplateService = Depends(get_template_service),
) -> ValidationResult:
    """
    Validate a template without applying it.

    Performs comprehensive validation including:
    - Schema validation against JSON Schema
    - Reference validation (user and workitem references)
    - Constraint validation (email formats, priority ranges, etc.)

    This endpoint does not require authentication as it only validates
    template structure without accessing or modifying the database.

    Args:
        name: Template name to validate

    Returns:
        ValidationResult with valid status and list of errors

    Raises:
        HTTPException 404: Template not found

    Example Response:
        ```json
        {
            "valid": true,
            "errors": []
        }
        ```

    Example Error Response:
        ```json
        {
            "valid": false,
            "errors": [
                {
                    "path": "users[0].email",
                    "message": "Invalid email format",
                    "value": "not-an-email"
                },
                {
                    "path": "workitems.requirements[0].priority",
                    "message": "Priority must be between 1 and 5",
                    "value": "10"
                }
            ]
        }
        ```
    """
    # Check if template exists
    template = await template_service.get_template(name)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Template '{name}' not found",
        )

    # Validate the template
    result = await template_service.validate_template(name)

    return result

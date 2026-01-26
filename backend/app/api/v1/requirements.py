"""Requirements API endpoints"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.core.security import Permission, has_permission
from app.models.user import User
from app.schemas.workitem import (
    CommentCreate,
    CommentListResponse,
    CommentResponse,
    RequirementCreate,
    RequirementResponse,
    RequirementUpdate,
)
from app.services.audit_service import AuditService, get_audit_service
from app.services.requirement_service import RequirementService, get_requirement_service

router = APIRouter()


@router.get("/requirements", response_model=list[RequirementResponse])
async def get_requirements(
    search: str | None = Query(None, description="Search text for title, description, and acceptance criteria"),
    status: str | None = Query(None, description="Filter by status (draft, active, completed, archived, rejected)"),
    assigned_to: UUID | None = Query(None, description="Filter by assigned user UUID"),
    created_by: UUID | None = Query(None, description="Filter by creator UUID"),
    priority: int | None = Query(None, ge=1, le=5, description="Filter by priority level (1-5)"),
    source: str | None = Query(None, description="Filter by requirement source"),
    has_acceptance_criteria: bool | None = Query(None, description="Filter by presence of acceptance criteria"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip for pagination"),
    current_user: User = Depends(get_current_user),
    requirement_service: RequirementService = Depends(get_requirement_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Get Requirements with comprehensive filtering and pagination
    
    This endpoint provides access to all requirements in the system with extensive
    filtering capabilities for efficient requirement management and discovery.
    
    **Filtering Options:**
    - **search**: Full-text search across title, description, and acceptance criteria
    - **status**: Filter by requirement status (draft, active, completed, archived, rejected)
    - **assigned_to**: Filter by assigned user UUID
    - **created_by**: Filter by creator UUID  
    - **priority**: Filter by priority level (1=lowest, 5=highest)
    - **source**: Filter by requirement source (stakeholder, regulation, standard, etc.)
    - **has_acceptance_criteria**: Filter by presence of acceptance criteria (true/false)
    
    **Pagination:**
    - **limit**: Maximum number of results to return (1-1000, default: 100)
    - **offset**: Number of results to skip for pagination (default: 0)
    
    **Response:**
    Returns a list of RequirementResponse objects containing:
    - Basic WorkItem fields (id, title, description, status, priority, etc.)
    - Requirement-specific fields (acceptance_criteria, business_value, source)
    - Metadata (version, created_at, updated_at, is_signed)
    
    **Permissions:**
    Requires READ_WORKITEM permission.
    
    **Audit Logging:**
    All search operations are logged for compliance tracking.
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read requirements"
        )

    try:
        # Search requirements with comprehensive filters
        requirements = await requirement_service.search_requirements(
            search_text=search,
            status=status,
            assigned_to=assigned_to,
            created_by=created_by,
            priority=priority,
            source=source,
            has_acceptance_criteria=has_acceptance_criteria,
            limit=limit,
            offset=offset
        )

        # Log audit event for compliance
        await audit_service.log(
            user_id=current_user.id,
            action="READ",
            entity_type="Requirement",
            entity_id=None,
            details={
                "search_filters": {
                    "search": search,
                    "status": status,
                    "assigned_to": str(assigned_to) if assigned_to else None,
                    "created_by": str(created_by) if created_by else None,
                    "priority": priority,
                    "source": source,
                    "has_acceptance_criteria": has_acceptance_criteria,
                    "limit": limit,
                    "offset": offset
                },
                "result_count": len(requirements),
                "user_role": current_user.role.value,
                "endpoint": "GET /api/v1/requirements"
            }
        )

        return requirements

    except ValueError as e:
        # Handle validation errors (e.g., invalid filter values)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid filter parameters: {str(e)}"
        )
    except Exception:
        # Log error for debugging while protecting sensitive information
        await audit_service.log(
            user_id=current_user.id,
            action="ERROR",
            entity_type="Requirement",
            entity_id=None,
            details={
                "error": "Failed to retrieve requirements",
                "endpoint": "GET /api/v1/requirements",
                "user_role": current_user.role.value
            }
        )

        raise HTTPException(
            status_code=500,
            detail="Error retrieving requirements. Please try again later."
        )


@router.post("/requirements", response_model=RequirementResponse, status_code=status.HTTP_201_CREATED)
async def create_requirement(
    requirement_data: RequirementCreate,
    current_user: User = Depends(get_current_user),
    requirement_service: RequirementService = Depends(get_requirement_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Create a new Requirement with comprehensive validation
    
    Creates a new requirement in the system with full validation of requirement-specific
    fields and business rules. The requirement is created as version 1.0 and stored
    in the graph database for relationship tracking.
    
    **Request Body:**
    RequirementCreate schema with the following fields:
    - **title**: Requirement title (5-500 characters, must contain letters)
    - **description**: Optional detailed description (20+ characters if provided)
    - **status**: Requirement status (draft, active, completed, archived, rejected)
    - **priority**: Optional priority level (1-5)
    - **assigned_to**: Optional UUID of assigned user
    - **acceptance_criteria**: Optional acceptance criteria (structured format recommended)
    - **business_value**: Optional business value description
    - **source**: Optional requirement source (stakeholder, regulation, etc.)
    
    **Validation Rules:**
    - Title must be meaningful and not contain placeholder text
    - Acceptance criteria should follow structured format (Given-When-Then)
    - Business value must be descriptive if provided
    - Source must be from predefined list of valid sources
    - Status-based completeness validation (active/completed require more fields)
    
    **Response:**
    Returns the created RequirementResponse with:
    - Generated UUID and version 1.0
    - Creation timestamp and user attribution
    - All validated requirement fields
    
    **Permissions:**
    Requires WRITE_WORKITEM permission.
    
    **Audit Logging:**
    Creation is logged with full requirement details for compliance.
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create requirements"
        )

    try:
        # Create the requirement with comprehensive validation
        requirement = await requirement_service.create_requirement(
            requirement_data=requirement_data,
            current_user=current_user
        )

        # Log successful creation for audit trail
        await audit_service.log(
            user_id=current_user.id,
            action="CREATE",
            entity_type="Requirement",
            entity_id=requirement.id,
            details={
                "title": requirement.title,
                "status": requirement.status,
                "priority": requirement.priority,
                "source": requirement.source,
                "has_acceptance_criteria": bool(requirement.acceptance_criteria),
                "has_business_value": bool(requirement.business_value),
                "version": requirement.version,
                "user_role": current_user.role.value,
                "endpoint": "POST /api/v1/requirements"
            }
        )

        return requirement

    except ValueError as e:
        # Handle validation errors with detailed feedback
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requirement validation failed: {str(e)}"
        )
    except Exception:
        # Log error for debugging
        await audit_service.log(
            user_id=current_user.id,
            action="ERROR",
            entity_type="Requirement",
            entity_id=None,
            details={
                "error": "Failed to create requirement",
                "title": requirement_data.title if hasattr(requirement_data, 'title') else None,
                "endpoint": "POST /api/v1/requirements",
                "user_role": current_user.role.value
            }
        )

        raise HTTPException(
            status_code=500,
            detail="Error creating requirement. Please try again later."
        )


@router.get(
    "/requirements/{requirement_id}",
    response_model=RequirementResponse,
    responses={
        404: {"description": "Requirement not found"},
        403: {"description": "Insufficient permissions"}
    }
)
async def get_requirement(
    requirement_id: UUID,
    current_user: User = Depends(get_current_user),
    requirement_service: RequirementService = Depends(get_requirement_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Get a specific Requirement by ID
    
    Retrieves the current version of a requirement with all requirement-specific
    fields and metadata. This endpoint provides access to the complete requirement
    information including acceptance criteria, business value, and source.
    
    **Path Parameters:**
    - **requirement_id**: UUID of the requirement to retrieve
    
    **Response:**
    Returns RequirementResponse with:
    - All requirement fields (title, description, acceptance_criteria, etc.)
    - Version information and audit metadata
    - Digital signature status
    - User attribution (created_by, assigned_to)
    
    **Error Responses:**
    - **404**: Requirement not found or not of type 'requirement'
    - **403**: User lacks READ_WORKITEM permission
    - **500**: Internal server error
    
    **Permissions:**
    Requires READ_WORKITEM permission.
    
    **Audit Logging:**
    Access is logged with requirement ID and version for compliance tracking.
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read requirements"
        )

    try:
        # Get the requirement
        requirement = await requirement_service.get_requirement(requirement_id)

        if not requirement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Requirement not found"
            )

        # Log access for audit trail
        await audit_service.log(
            user_id=current_user.id,
            action="READ",
            entity_type="Requirement",
            entity_id=requirement_id,
            details={
                "title": requirement.title,
                "version": requirement.version,
                "status": requirement.status,
                "is_signed": requirement.is_signed,
                "user_role": current_user.role.value,
                "endpoint": "GET /api/v1/requirements/{id}"
            }
        )

        return requirement

    except HTTPException:
        # Re-raise HTTP exceptions (404, 403)
        raise
    except Exception:
        # Log error for debugging
        await audit_service.log(
            user_id=current_user.id,
            action="ERROR",
            entity_type="Requirement",
            entity_id=requirement_id,
            details={
                "error": "Failed to retrieve requirement",
                "endpoint": "GET /api/v1/requirements/{id}",
                "user_role": current_user.role.value
            }
        )

        raise HTTPException(
            status_code=500,
            detail="Error retrieving requirement. Please try again later."
        )


@router.patch("/requirements/{requirement_id}", response_model=RequirementResponse)
async def update_requirement(
    requirement_id: UUID,
    updates: RequirementUpdate,
    change_description: str = Query(..., description="Description of changes made (required for audit trail)"),
    current_user: User = Depends(get_current_user),
    requirement_service: RequirementService = Depends(get_requirement_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Update a Requirement (creates new version)
    
    Updates a requirement with comprehensive validation and creates a new version.
    All existing digital signatures are invalidated when a requirement is updated.
    A change description is required for audit compliance.
    
    **Path Parameters:**
    - **requirement_id**: UUID of the requirement to update
    
    **Query Parameters:**
    - **change_description**: Required description of changes for audit trail
    
    **Request Body:**
    RequirementUpdate schema with optional fields:
    - **title**: Updated title (same validation as create)
    - **description**: Updated description
    - **status**: Updated status (triggers completeness validation)
    - **priority**: Updated priority level
    - **assigned_to**: Updated assigned user
    - **acceptance_criteria**: Updated acceptance criteria
    - **business_value**: Updated business value
    - **source**: Updated requirement source
    
    **Validation:**
    - All field-level validation from creation applies
    - Status-based completeness validation
    - Cross-field validation for consistency
    - Change description cannot be empty
    
    **Versioning:**
    - Creates new version (e.g., 1.0 → 1.1)
    - Preserves complete history
    - Invalidates existing digital signatures
    - Links to previous version in graph
    
    **Response:**
    Returns updated RequirementResponse with new version number.
    
    **Permissions:**
    Requires WRITE_WORKITEM permission.
    
    **Audit Logging:**
    Update is logged with change description and affected fields.
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update requirements"
        )

    # Validate change description
    if not change_description or not change_description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Change description is required for audit compliance"
        )

    try:
        # Update the requirement
        requirement = await requirement_service.update_requirement(
            requirement_id=requirement_id,
            updates=updates,
            current_user=current_user,
            change_description=change_description.strip()
        )

        if not requirement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Requirement not found"
            )

        # Log successful update
        updated_fields = [
            field for field, value in updates.model_dump(exclude_unset=True).items()
            if value is not None
        ]

        await audit_service.log(
            user_id=current_user.id,
            action="UPDATE",
            entity_type="Requirement",
            entity_id=requirement_id,
            details={
                "title": requirement.title,
                "new_version": requirement.version,
                "change_description": change_description.strip(),
                "updated_fields": updated_fields,
                "status": requirement.status,
                "user_role": current_user.role.value,
                "endpoint": "PATCH /api/v1/requirements/{id}"
            }
        )

        return requirement

    except ValueError as e:
        # Handle validation errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requirement validation failed: {str(e)}"
        )
    except HTTPException:
        # Re-raise HTTP exceptions (404)
        raise
    except Exception:
        # Log error for debugging
        await audit_service.log(
            user_id=current_user.id,
            action="ERROR",
            entity_type="Requirement",
            entity_id=requirement_id,
            details={
                "error": "Failed to update requirement",
                "change_description": change_description,
                "endpoint": "PATCH /api/v1/requirements/{id}",
                "user_role": current_user.role.value
            }
        )

        raise HTTPException(
            status_code=500,
            detail="Error updating requirement. Please try again later."
        )


@router.post("/requirements/{requirement_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def add_requirement_comment(
    requirement_id: UUID,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    requirement_service: RequirementService = Depends(get_requirement_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Add a comment to a requirement
    
    Adds a comment to a requirement with comprehensive user attribution and
    audit tracking. Comments are linked to the current version of the requirement
    and include full user context for compliance and collaboration.
    
    **Path Parameters:**
    - **requirement_id**: UUID of the requirement to comment on
    
    **Request Body:**
    CommentCreate schema with:
    - **comment**: Comment text (1-2000 characters, no placeholder text)
    
    **Comment Features:**
    - Linked to current requirement version
    - Full user attribution (name, email, role)
    - Timestamp tracking (created_at, updated_at)
    - Edit tracking (is_edited, edit_count)
    - IP address and user agent logging (if available)
    
    **Validation:**
    - Comment cannot be empty or only whitespace
    - No placeholder text (TODO, TBD, FIXME, XXX)
    - Length limits (1-2000 characters)
    - User must have access to the requirement
    
    **Response:**
    Returns CommentResponse with:
    - Generated comment UUID
    - Full user attribution
    - Requirement version reference
    - Creation timestamp
    
    **Permissions:**
    Requires READ_WORKITEM permission (commenting requires read access).
    Additional business rules may apply (e.g., no comments on archived requirements for non-admins).
    
    **Audit Logging:**
    Comment creation is logged with requirement context and user details.
    """
    # Check read permission (commenting requires read access)
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to comment on requirements"
        )

    try:
        # Add the comment with comprehensive validation
        comment = await requirement_service.add_comment(
            requirement_id=requirement_id,
            comment_data=comment_data,
            current_user=current_user
        )

        # Log successful comment creation
        await audit_service.log(
            user_id=current_user.id,
            action="CREATE",
            entity_type="RequirementComment",
            entity_id=comment.id,
            details={
                "requirement_id": str(requirement_id),
                "comment_length": len(comment_data.comment),
                "comment_preview": comment_data.comment[:100] + "..." if len(comment_data.comment) > 100 else comment_data.comment,
                "user_role": current_user.role.value,
                "endpoint": "POST /api/v1/requirements/{id}/comments"
            }
        )

        return comment

    except ValueError as e:
        # Handle validation errors (requirement not found, validation failures)
        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Comment validation failed: {str(e)}"
            )
    except PermissionError as e:
        # Handle permission errors (e.g., commenting on archived requirements)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception:
        # Log error for debugging
        await audit_service.log(
            user_id=current_user.id,
            action="ERROR",
            entity_type="RequirementComment",
            entity_id=None,
            details={
                "error": "Failed to create comment",
                "requirement_id": str(requirement_id),
                "endpoint": "POST /api/v1/requirements/{id}/comments",
                "user_role": current_user.role.value
            }
        )

        raise HTTPException(
            status_code=500,
            detail="Error creating comment. Please try again later."
        )


@router.get("/requirements/{requirement_id}/comments", response_model=CommentListResponse)
async def get_requirement_comments(
    requirement_id: UUID,
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(20, ge=1, le=100, description="Number of comments per page"),
    include_user_info: bool = Query(True, description="Include detailed user information"),
    current_user: User = Depends(get_current_user),
    requirement_service: RequirementService = Depends(get_requirement_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Get paginated comments for a requirement
    
    Retrieves comments for a requirement with pagination and optional user information.
    Comments are returned in reverse chronological order (newest first) with
    comprehensive metadata for collaboration and audit purposes.
    
    **Path Parameters:**
    - **requirement_id**: UUID of the requirement
    
    **Query Parameters:**
    - **page**: Page number (1-based, default: 1)
    - **page_size**: Comments per page (1-100, default: 20)
    - **include_user_info**: Include detailed user information (default: true)
    
    **Response:**
    Returns CommentListResponse with:
    - **comments**: List of CommentResponse objects
    - **total_count**: Total number of comments
    - **page**: Current page number
    - **page_size**: Number of comments per page
    - **has_next**: Whether there are more comments
    - **has_previous**: Whether there are previous comments
    
    **Comment Information:**
    Each comment includes:
    - Comment text and metadata
    - User attribution (name, email if include_user_info=true)
    - Version reference (requirement version when commented)
    - Edit tracking (is_edited, edit_count)
    - Timestamps (created_at, updated_at)
    
    **Permissions:**
    Requires READ_WORKITEM permission.
    
    **Audit Logging:**
    Comment access is logged for compliance tracking.
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read requirement comments"
        )

    try:
        # Get paginated comments
        comments_response = await requirement_service.get_requirement_comments(
            requirement_id=requirement_id,
            page=page,
            page_size=page_size,
            include_user_info=include_user_info
        )

        # Log access for audit trail
        await audit_service.log(
            user_id=current_user.id,
            action="READ",
            entity_type="RequirementComment",
            entity_id=None,
            details={
                "requirement_id": str(requirement_id),
                "page": page,
                "page_size": page_size,
                "total_comments": comments_response.total_count,
                "returned_comments": len(comments_response.comments),
                "user_role": current_user.role.value,
                "endpoint": "GET /api/v1/requirements/{id}/comments"
            }
        )

        return comments_response

    except ValueError as e:
        # Handle validation errors (invalid pagination parameters)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid parameters: {str(e)}"
        )
    except Exception:
        # Log error for debugging
        await audit_service.log(
            user_id=current_user.id,
            action="ERROR",
            entity_type="RequirementComment",
            entity_id=None,
            details={
                "error": "Failed to retrieve comments",
                "requirement_id": str(requirement_id),
                "endpoint": "GET /api/v1/requirements/{id}/comments",
                "user_role": current_user.role.value
            }
        )

        raise HTTPException(
            status_code=500,
            detail="Error retrieving comments. Please try again later."
        )

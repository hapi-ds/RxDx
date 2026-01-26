"""WorkItem API endpoints"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse

from app.api.deps import get_current_user
from app.core.security import Permission, has_permission
from app.models.user import User
from app.schemas.workitem import (
    WorkItemCreate,
    WorkItemResponse,
    WorkItemUpdate,
)
from app.services.audit_service import AuditService, get_audit_service
from app.services.workitem_service import WorkItemService, get_workitem_service

router = APIRouter()


@router.get("/workitems", response_model=list[WorkItemResponse])
async def get_workitems(
    search: str | None = Query(None, description="Search text for title and description"),
    type: str | None = Query(None, description="Filter by WorkItem type"),
    status: str | None = Query(None, description="Filter by status"),
    assigned_to: UUID | None = Query(None, description="Filter by assigned user"),
    created_by: UUID | None = Query(None, description="Filter by creator"),
    priority: int | None = Query(None, ge=1, le=5, description="Filter by priority level"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    workitem_service: WorkItemService = Depends(get_workitem_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Get WorkItems with optional filtering

    Supports filtering by:
    - search: Text search in title and description
    - type: WorkItem type (requirement, task, test, risk, document)
    - status: Status (draft, active, completed, archived)
    - assigned_to: UUID of assigned user
    - created_by: UUID of creator
    - priority: Priority level (1-5)

    Supports pagination with limit and offset parameters.
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read WorkItems"
        )

    try:
        # Search WorkItems with filters
        workitems = await workitem_service.search_workitems(
            search_text=search,
            workitem_type=type,
            status=status,
            assigned_to=assigned_to,
            created_by=created_by,
            priority=priority,
            limit=limit,
            offset=offset
        )

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="READ",
            entity_type="WorkItem",
            entity_id=None,
            details={
                "search_filters": {
                    "search": search,
                    "type": type,
                    "status": status,
                    "assigned_to": str(assigned_to) if assigned_to else None,
                    "created_by": str(created_by) if created_by else None,
                    "priority": priority,
                },
                "result_count": len(workitems)
            }
        )

        return workitems

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving WorkItems: {str(e)}"
        )


@router.post("/workitems", response_model=WorkItemResponse, status_code=status.HTTP_201_CREATED)
async def create_workitem(
    workitem_data: WorkItemCreate,
    current_user: User = Depends(get_current_user),
    workitem_service: WorkItemService = Depends(get_workitem_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Create a new WorkItem

    Creates a WorkItem in the graph database with version 1.0.
    The WorkItem type determines which additional fields are available.
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create WorkItems"
        )

    try:
        # Create the WorkItem
        workitem = await workitem_service.create_workitem(
            workitem_data=workitem_data,
            current_user=current_user
        )

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="CREATE",
            entity_type="WorkItem",
            entity_id=workitem.id,
            details={
                "workitem_type": workitem.type,
                "title": workitem.title,
                "version": workitem.version
            }
        )

        return workitem

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating WorkItem: {str(e)}"
        )


@router.get(
    "/workitems/{workitem_id}",
    response_model=WorkItemResponse,
    responses={
        404: {"description": "WorkItem not found"},
        403: {"description": "Insufficient permissions"}
    }
)
async def get_workitem(
    workitem_id: UUID,
    current_user: User = Depends(get_current_user),
    workitem_service: WorkItemService = Depends(get_workitem_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Get a specific WorkItem by ID

    Returns the current version of the WorkItem.
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read WorkItems"
        )

    try:
        # Get the WorkItem
        workitem = await workitem_service.get_workitem(workitem_id)

        if not workitem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WorkItem not found"
            )

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="READ",
            entity_type="WorkItem",
            entity_id=workitem_id,
            details={
                "workitem_type": workitem.type,
                "version": workitem.version
            }
        )

        return workitem

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving WorkItem: {str(e)}"
        )


@router.patch("/workitems/{workitem_id}", response_model=WorkItemResponse)
async def update_workitem(
    workitem_id: UUID,
    updates: WorkItemUpdate,
    change_description: str = Query(..., description="Description of changes made"),
    current_user: User = Depends(get_current_user),
    workitem_service: WorkItemService = Depends(get_workitem_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Update a WorkItem (creates new version)

    Updates create a new version of the WorkItem and invalidate existing signatures.
    A change description is required for audit purposes.
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update WorkItems"
        )

    try:
        # Update the WorkItem
        workitem = await workitem_service.update_workitem(
            workitem_id=workitem_id,
            updates=updates,
            current_user=current_user,
            change_description=change_description
        )

        if not workitem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WorkItem not found"
            )

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="UPDATE",
            entity_type="WorkItem",
            entity_id=workitem_id,
            details={
                "workitem_type": workitem.type,
                "new_version": workitem.version,
                "change_description": change_description,
                "updated_fields": [
                    field for field, value in updates.model_dump(exclude_unset=True).items()
                    if value is not None
                ]
            }
        )

        return workitem

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating WorkItem: {str(e)}"
        )


@router.delete("/workitems/{workitem_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workitem(
    workitem_id: UUID,
    force: bool = Query(False, description="Force deletion even if signed (admin only)"),
    current_user: User = Depends(get_current_user),
    workitem_service: WorkItemService = Depends(get_workitem_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Delete a WorkItem

    Deletion is prevented if the WorkItem has valid digital signatures,
    unless force=True is used (requires admin permissions).
    """
    # Check delete permission
    if not has_permission(current_user.role, Permission.DELETE_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete WorkItems"
        )

    # Force deletion requires admin role
    if force and current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Force deletion requires admin permissions"
        )

    try:
        # Get WorkItem for audit logging before deletion
        workitem = await workitem_service.get_workitem(workitem_id)
        if not workitem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WorkItem not found"
            )

        # Delete the WorkItem
        success = await workitem_service.delete_workitem(
            workitem_id=workitem_id,
            current_user=current_user,
            force=force
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="WorkItem could not be deleted"
            )

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="DELETE",
            entity_type="WorkItem",
            entity_id=workitem_id,
            details={
                "workitem_type": workitem.type,
                "title": workitem.title,
                "version": workitem.version,
                "force_delete": force
            }
        )

        return JSONResponse(
            status_code=status.HTTP_204_NO_CONTENT,
            content=None
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting WorkItem: {str(e)}"
        )


@router.get("/workitems/{workitem_id}/history", response_model=list[WorkItemResponse])
async def get_workitem_history(
    workitem_id: UUID,
    current_user: User = Depends(get_current_user),
    workitem_service: WorkItemService = Depends(get_workitem_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Get complete version history for a WorkItem

    Returns all versions of the WorkItem ordered by version number.
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read WorkItems"
        )

    try:
        # Get version history
        history = await workitem_service.get_workitem_history(workitem_id)

        if not history:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WorkItem not found"
            )

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="READ",
            entity_type="WorkItem",
            entity_id=workitem_id,
            details={
                "action_type": "version_history",
                "version_count": len(history)
            }
        )

        return history

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving WorkItem history: {str(e)}"
        )


@router.get("/workitems/{workitem_id}/version/{version}", response_model=WorkItemResponse)
async def get_workitem_version(
    workitem_id: UUID,
    version: str,
    current_user: User = Depends(get_current_user),
    workitem_service: WorkItemService = Depends(get_workitem_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Get a specific version of a WorkItem

    Returns the WorkItem as it existed at the specified version.
    Version format: "major.minor" (e.g., "1.0", "1.1", "2.0")
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read WorkItems"
        )

    try:
        # Get the specific version
        workitem = await workitem_service.get_workitem_version(workitem_id, version)

        if not workitem:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"WorkItem version {version} not found"
            )

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="READ",
            entity_type="WorkItem",
            entity_id=workitem_id,
            details={
                "action_type": "version_access",
                "version": version,
                "workitem_type": workitem.type
            }
        )

        return workitem

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving WorkItem version: {str(e)}"
        )


@router.get("/workitems/{workitem_id}/compare/{version1}/{version2}")
async def compare_workitem_versions(
    workitem_id: UUID,
    version1: str,
    version2: str,
    current_user: User = Depends(get_current_user),
    workitem_service: WorkItemService = Depends(get_workitem_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Compare two versions of a WorkItem

    Returns the differences between two versions of the same WorkItem.
    Version format: "major.minor" (e.g., "1.0", "1.1", "2.0")

    Returns:
    - version1: First version identifier
    - version2: Second version identifier
    - changed_fields: Fields that differ between versions
    - added_fields: Fields present in version2 but not version1
    - removed_fields: Fields present in version1 but not version2
    - unchanged_fields: Fields that are the same in both versions
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read WorkItems"
        )

    try:
        # Compare the versions
        comparison = await workitem_service.compare_workitem_versions(
            workitem_id, version1, version2
        )

        if comparison is None:
            raise HTTPException(
                status_code=status.HTTP_501_NOT_IMPLEMENTED,
                detail="Version comparison not available (VersionService required)"
            )

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="READ",
            entity_type="WorkItem",
            entity_id=workitem_id,
            details={
                "action_type": "version_comparison",
                "version1": version1,
                "version2": version2,
                "changed_fields_count": len(comparison.get("changed_fields", {})),
                "added_fields_count": len(comparison.get("added_fields", {})),
                "removed_fields_count": len(comparison.get("removed_fields", {}))
            }
        )

        return comparison

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error comparing WorkItem versions: {str(e)}"
        )

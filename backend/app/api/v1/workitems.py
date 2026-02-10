"""WorkItem API endpoints"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from fastapi.responses import JSONResponse

from app.api.deps import get_current_user
from app.core.security import Permission, has_permission
from app.models.user import User
from app.schemas.workitem import (
    WorkItemCreate,
    WorkItemResponse,
    WorkItemUpdate,
    BulkUpdateRequest,
    BulkUpdateResponse,
    BulkUpdateFailure,
)
from app.db.graph import GraphService, get_graph_service
from app.services.audit_service import AuditService, get_audit_service
from app.services.workitem_service import WorkItemService, get_workitem_service

router = APIRouter()


@router.get("/workitems", response_model=list[WorkItemResponse])
async def get_workitems(
    search: str | None = Query(None, description="Search text for title and description"),
    type: str | None = Query(None, description="Filter by WorkItem type"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
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
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read WorkItems"
        )

    try:
        # Search WorkItems with filters
        workitems = await workitem_service.search_workitems(
            search_text=search,
            workitem_type=type,
            status=status_filter,
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
                    "status": status_filter,
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
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving WorkItems: {str(e)}"
        )


@router.post("/workitems", response_model=WorkItemResponse, status_code=http_status.HTTP_201_CREATED)
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
            status_code=http_status.HTTP_403_FORBIDDEN,
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
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
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
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read WorkItems"
        )

    try:
        # Get the WorkItem
        workitem = await workitem_service.get_workitem(workitem_id)

        if not workitem:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
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
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
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
            status_code=http_status.HTTP_403_FORBIDDEN,
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
                status_code=http_status.HTTP_404_NOT_FOUND,
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
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating WorkItem: {str(e)}"
        )


@router.delete("/workitems/{workitem_id}", status_code=http_status.HTTP_204_NO_CONTENT)
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
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete WorkItems"
        )

    # Force deletion requires admin role
    if force and current_user.role.value != "admin":
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Force deletion requires admin permissions"
        )

    try:
        # Get WorkItem for audit logging before deletion
        workitem = await workitem_service.get_workitem(workitem_id)
        if not workitem:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
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
                status_code=http_status.HTTP_400_BAD_REQUEST,
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
            status_code=http_status.HTTP_204_NO_CONTENT,
            content=None
        )

    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting WorkItem: {str(e)}"
        )


@router.patch("/workitems/bulk", response_model=BulkUpdateResponse)
async def bulk_update_workitems(
    request: BulkUpdateRequest,
    change_description: str = Query("Bulk update", description="Description of changes made"),
    current_user: User = Depends(get_current_user),
    workitem_service: WorkItemService = Depends(get_workitem_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Bulk update multiple WorkItems with the same data

    Updates multiple WorkItems at once with the same update data.
    Each item is updated individually, and permissions are checked for each item.
    Returns both successfully updated items and items that failed to update.

    Args:
        request: Bulk update request containing IDs and update data
        change_description: Description of changes made
        current_user: Authenticated user
        workitem_service: WorkItem service
        audit_service: Audit service

    Returns:
        BulkUpdateResponse with updated items and failures
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update WorkItems"
        )

    try:
        # Perform bulk update
        updated_items, failed_items = await workitem_service.bulk_update(
            workitem_ids=request.ids,
            updates=request.data,
            current_user=current_user,
            change_description=change_description
        )

        # Convert failed items to BulkUpdateFailure objects
        failures = [
            BulkUpdateFailure(id=item["id"], error=item["error"])
            for item in failed_items
        ]

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="BULK_UPDATE",
            entity_type="WorkItem",
            entity_id=None,
            details={
                "total_requested": len(request.ids),
                "total_updated": len(updated_items),
                "total_failed": len(failures),
                "change_description": change_description,
                "updated_fields": [
                    field for field, value in request.data.model_dump(exclude_unset=True).items()
                    if value is not None
                ]
            }
        )

        return BulkUpdateResponse(
            updated=updated_items,
            failed=failures,
            total_requested=len(request.ids),
            total_updated=len(updated_items),
            total_failed=len(failures)
        )

    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error performing bulk update: {str(e)}"
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
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read WorkItems"
        )

    try:
        # Get version history
        history = await workitem_service.get_workitem_history(workitem_id)

        if not history:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
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
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
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
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read WorkItems"
        )

    try:
        # Get the specific version
        workitem = await workitem_service.get_workitem_version(workitem_id, version)

        if not workitem:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
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
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
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
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read WorkItems"
        )

    try:
        # Compare the versions
        comparison = await workitem_service.compare_workitem_versions(
            workitem_id, version1, version2
        )

        if comparison is None:
            raise HTTPException(
                status_code=http_status.HTTP_501_NOT_IMPLEMENTED,
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
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error comparing WorkItem versions: {str(e)}"
        )


# Task-specific endpoints (Tasks are WorkItems with type='task')

@router.get("/tasks/{task_id}/backlog-sprint-status")
async def get_task_backlog_sprint_status(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Check if a task is in backlog or assigned to a sprint.
    
    Returns:
    - in_backlog: Boolean indicating if task is in backlog
    - backlog_id: UUID of backlog if in_backlog is true
    - in_sprint: Boolean indicating if task is assigned to sprint
    - sprint_id: UUID of sprint if in_sprint is true
    
    Note: A task can be in backlog OR sprint, never both (mutual exclusivity).
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read tasks"
        )
    
    try:
        status = await graph_service.check_task_backlog_sprint_status(str(task_id))
        
        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="READ",
            entity_type="Task",
            entity_id=task_id,
            details={
                "action_type": "check_backlog_sprint_status",
                "in_backlog": status['in_backlog'],
                "in_sprint": status['in_sprint']
            }
        )
        
        return status
    
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error checking task status: {str(e)}"
        )


@router.post("/tasks/{task_id}/move-to-backlog", status_code=http_status.HTTP_200_OK)
async def move_task_to_backlog(
    task_id: UUID,
    backlog_id: UUID = Query(..., description="Backlog UUID to move task to"),
    priority_order: int | None = Query(None, description="Optional priority order in backlog"),
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Move a task to backlog, removing any sprint assignment (mutual exclusivity).
    
    This endpoint enforces mutual exclusivity between backlog and sprint:
    - Removes any existing ASSIGNED_TO_SPRINT relationship
    - Creates IN_BACKLOG relationship
    
    Args:
    - task_id: Task UUID (WorkItem with type='task')
    - backlog_id: Backlog UUID to move task to
    - priority_order: Optional priority order in backlog
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to move tasks"
        )
    
    try:
        relationship = await graph_service.move_task_to_backlog(
            task_id=str(task_id),
            backlog_id=str(backlog_id),
            priority_order=priority_order
        )
        
        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="UPDATE",
            entity_type="Task",
            entity_id=task_id,
            details={
                "action_type": "move_to_backlog",
                "backlog_id": str(backlog_id),
                "priority_order": priority_order
            }
        )
        
        return {
            "message": "Task moved to backlog successfully",
            "task_id": str(task_id),
            "backlog_id": str(backlog_id),
            "relationship": relationship
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error moving task to backlog: {str(e)}"
        )


@router.post("/tasks/{task_id}/move-to-sprint/{sprint_id}", status_code=http_status.HTTP_200_OK)
async def move_task_to_sprint(
    task_id: UUID,
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Move a task to sprint, removing any backlog assignment (mutual exclusivity).
    
    This endpoint enforces mutual exclusivity between backlog and sprint:
    - Removes any existing IN_BACKLOG relationship
    - Creates ASSIGNED_TO_SPRINT relationship
    
    Args:
    - task_id: Task UUID (WorkItem with type='task')
    - sprint_id: Sprint UUID to assign task to
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to move tasks"
        )
    
    try:
        relationship = await graph_service.move_task_to_sprint(
            task_id=str(task_id),
            sprint_id=str(sprint_id),
            assigned_by_user_id=str(current_user.id)
        )
        
        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="UPDATE",
            entity_type="Task",
            entity_id=task_id,
            details={
                "action_type": "move_to_sprint",
                "sprint_id": str(sprint_id)
            }
        )
        
        return {
            "message": "Task moved to sprint successfully",
            "task_id": str(task_id),
            "sprint_id": str(sprint_id),
            "relationship": relationship
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error moving task to sprint: {str(e)}"
        )


@router.post("/tasks/{task_id}/link-risk/{risk_id}", status_code=http_status.HTTP_200_OK)
async def link_task_to_risk(
    task_id: UUID,
    risk_id: UUID,
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Create has_risk relationship from Task to Risk.
    
    Links a task to a risk, indicating that the task has an associated risk.
    A task can have multiple risks.
    
    Args:
    - task_id: Task UUID (WorkItem with type='task')
    - risk_id: Risk UUID (WorkItem with type='risk')
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to link tasks to risks"
        )
    
    try:
        relationship = await graph_service.link_task_to_risk(
            task_id=str(task_id),
            risk_id=str(risk_id)
        )
        
        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="CREATE",
            entity_type="TaskRiskLink",
            entity_id=None,
            details={
                "task_id": str(task_id),
                "risk_id": str(risk_id),
                "relationship_type": "has_risk"
            }
        )
        
        return {
            "message": "Task linked to risk successfully",
            "task_id": str(task_id),
            "risk_id": str(risk_id),
            "relationship": relationship
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error linking task to risk: {str(e)}"
        )


@router.delete("/tasks/{task_id}/link-risk/{risk_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def unlink_task_from_risk(
    task_id: UUID,
    risk_id: UUID,
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Remove has_risk relationship from Task to Risk.
    
    Args:
    - task_id: Task UUID (WorkItem with type='task')
    - risk_id: Risk UUID (WorkItem with type='risk')
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to unlink tasks from risks"
        )
    
    try:
        success = await graph_service.unlink_task_from_risk(
            task_id=str(task_id),
            risk_id=str(risk_id)
        )
        
        if not success:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Task-risk relationship not found"
            )
        
        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="DELETE",
            entity_type="TaskRiskLink",
            entity_id=None,
            details={
                "task_id": str(task_id),
                "risk_id": str(risk_id),
                "relationship_type": "has_risk"
            }
        )
        
        return JSONResponse(
            status_code=http_status.HTTP_204_NO_CONTENT,
            content=None
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error unlinking task from risk: {str(e)}"
        )


@router.get("/tasks/{task_id}/risks")
async def get_task_risks(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Get all risks linked to a task.
    
    Returns a list of risks (WorkItems with type='risk') that are linked to the task
    via has_risk relationships.
    
    Args:
    - task_id: Task UUID (WorkItem with type='task')
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read task risks"
        )
    
    try:
        risks = await graph_service.get_task_risks(str(task_id))
        
        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="READ",
            entity_type="Task",
            entity_id=task_id,
            details={
                "action_type": "get_risks",
                "risk_count": len(risks)
            }
        )
        
        return {
            "task_id": str(task_id),
            "risks": risks,
            "count": len(risks)
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving task risks: {str(e)}"
        )


@router.post("/tasks/{task_id}/link-requirement/{requirement_id}", status_code=http_status.HTTP_200_OK)
async def link_task_to_requirement(
    task_id: UUID,
    requirement_id: UUID,
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Create implements relationship from Task to Requirement.
    
    Links a task to a requirement, indicating that the task implements the requirement.
    A task can implement multiple requirements.
    
    Args:
    - task_id: Task UUID (WorkItem with type='task')
    - requirement_id: Requirement UUID (WorkItem with type='requirement')
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to link tasks to requirements"
        )
    
    try:
        relationship = await graph_service.link_task_to_requirement(
            task_id=str(task_id),
            requirement_id=str(requirement_id)
        )
        
        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="CREATE",
            entity_type="TaskRequirementLink",
            entity_id=None,
            details={
                "task_id": str(task_id),
                "requirement_id": str(requirement_id),
                "relationship_type": "implements"
            }
        )
        
        return {
            "message": "Task linked to requirement successfully",
            "task_id": str(task_id),
            "requirement_id": str(requirement_id),
            "relationship": relationship
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error linking task to requirement: {str(e)}"
        )


@router.delete("/tasks/{task_id}/link-requirement/{requirement_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def unlink_task_from_requirement(
    task_id: UUID,
    requirement_id: UUID,
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Remove implements relationship from Task to Requirement.
    
    Args:
    - task_id: Task UUID (WorkItem with type='task')
    - requirement_id: Requirement UUID (WorkItem with type='requirement')
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to unlink tasks from requirements"
        )
    
    try:
        success = await graph_service.unlink_task_from_requirement(
            task_id=str(task_id),
            requirement_id=str(requirement_id)
        )
        
        if not success:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Task-requirement relationship not found"
            )
        
        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="DELETE",
            entity_type="TaskRequirementLink",
            entity_id=None,
            details={
                "task_id": str(task_id),
                "requirement_id": str(requirement_id),
                "relationship_type": "implements"
            }
        )
        
        return JSONResponse(
            status_code=http_status.HTTP_204_NO_CONTENT,
            content=None
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error unlinking task from requirement: {str(e)}"
        )


@router.get("/tasks/{task_id}/requirements")
async def get_task_requirements(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Get all requirements implemented by a task.
    
    Returns a list of requirements (WorkItems with type='requirement') that are implemented
    by the task via implements relationships.
    
    Args:
    - task_id: Task UUID (WorkItem with type='task')
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read task requirements"
        )
    
    try:
        requirements = await graph_service.get_task_requirements(str(task_id))
        
        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="READ",
            entity_type="Task",
            entity_id=task_id,
            details={
                "action_type": "get_requirements",
                "requirement_count": len(requirements)
            }
        )
        
        return {
            "task_id": str(task_id),
            "requirements": requirements,
            "count": len(requirements)
        }
    
    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving task requirements: {str(e)}"
        )

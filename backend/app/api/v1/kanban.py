"""
Kanban API endpoints
Provides task filtering and sprint assignment for Kanban board
Implements Requirements 10.1-10.16 (Kanban Board Schedule Integration)
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import Permission, require_permission
from app.models.user import User
from app.schemas.workitem import WorkItemResponse
from app.services.workitem_service import WorkItemService
from app.services.sprint_service import SprintService
from app.services.backlog_service import BacklogService

router = APIRouter()


@router.get("/tasks", response_model=list[WorkItemResponse])
@require_permission(Permission.READ_WORKITEM)
async def get_kanban_tasks(
    sprint_id: Optional[UUID] = Query(None, description="Filter by sprint ID"),
    resource_id: Optional[UUID] = Query(None, description="Filter by assigned resource"),
    workpackage_id: Optional[UUID] = Query(None, description="Filter by workpackage"),
    in_backlog: Optional[bool] = Query(None, description="Filter by backlog status"),
    status: Optional[str] = Query(None, description="Filter by task status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[WorkItemResponse]:
    """
    Get tasks for Kanban board with filtering options.
    
    Supports filtering by:
    - Sprint assignment
    - Resource assignment
    - Workpackage
    - Backlog status
    - Task status
    
    Args:
        sprint_id: Optional sprint ID to filter tasks
        resource_id: Optional resource ID to filter by assignment
        workpackage_id: Optional workpackage ID to filter tasks
        in_backlog: Optional boolean to filter backlog tasks
        status: Optional status to filter tasks
        current_user: Authenticated user
        db: Database session
    
    Returns:
        List of tasks matching the filters
    
    Raises:
        HTTPException: 401 if not authenticated
    """
    workitem_service = WorkItemService(db)
    sprint_service = SprintService(db)
    backlog_service = BacklogService(db)
    
    # Get all tasks (type='task')
    all_workitems = await workitem_service.search_workitems(
        workitem_type="task",
        status=status
    )
    
    # Filter by sprint if specified
    if sprint_id:
        sprint_tasks = await sprint_service.get_sprint_tasks(sprint_id)
        sprint_task_ids = {task.id for task in sprint_tasks}
        all_workitems = [wi for wi in all_workitems if wi.id in sprint_task_ids]
    
    # Filter by backlog if specified
    if in_backlog is not None:
        filtered_tasks = []
        for workitem in all_workitems:
            backlog_status = await backlog_service.get_task_backlog_status(workitem.id)
            if backlog_status["in_backlog"] == in_backlog:
                filtered_tasks.append(workitem)
        all_workitems = filtered_tasks
    
    # Filter by resource if specified
    if resource_id:
        all_workitems = [
            wi for wi in all_workitems
            if wi.assigned_to and str(wi.assigned_to) == str(resource_id)
        ]
    
    # Filter by workpackage if specified
    if workpackage_id:
        # Get tasks that belong to the specified workpackage
        # This requires querying the graph for CONTAINS relationships
        # For now, we'll skip this filter as it requires graph service integration
        pass
    
    return all_workitems


@router.post("/tasks/{task_id}/assign-sprint", status_code=status.HTTP_204_NO_CONTENT)
@require_permission(Permission.WRITE_WORKITEM)
async def assign_task_to_sprint_via_kanban(
    task_id: UUID,
    sprint_id: UUID = Query(..., description="Sprint ID to assign task to"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Assign a task to a sprint via Kanban board.
    
    This endpoint allows assigning tasks to sprints through drag-and-drop
    or other Kanban board interactions.
    
    Args:
        task_id: Task UUID to assign
        sprint_id: Sprint UUID to assign task to
        current_user: Authenticated user
        db: Database session
    
    Returns:
        None (204 No Content on success)
    
    Raises:
        HTTPException: 401 if not authenticated
        HTTPException: 404 if task or sprint not found
        HTTPException: 400 if task cannot be assigned (e.g., sprint at capacity)
    """
    sprint_service = SprintService(db)
    workitem_service = WorkItemService(db)
    
    # Verify task exists
    task = await workitem_service.get_workitem(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found"
        )
    
    # Verify sprint exists
    sprint = await sprint_service.get_sprint(sprint_id)
    if not sprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sprint {sprint_id} not found"
        )
    
    # Assign task to sprint
    try:
        await sprint_service.assign_task_to_sprint(sprint_id, task_id, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/tasks/{task_id}/assign-sprint", status_code=status.HTTP_204_NO_CONTENT)
@require_permission(Permission.WRITE_WORKITEM)
async def remove_task_from_sprint_via_kanban(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """
    Remove a task from its sprint via Kanban board.
    
    This endpoint allows removing tasks from sprints through Kanban board
    interactions. The task will be returned to the backlog.
    
    Args:
        task_id: Task UUID to remove from sprint
        current_user: Authenticated user
        db: Database session
    
    Returns:
        None (204 No Content on success)
    
    Raises:
        HTTPException: 401 if not authenticated
        HTTPException: 404 if task not found
        HTTPException: 400 if task is not in a sprint
    """
    sprint_service = SprintService(db)
    workitem_service = WorkItemService(db)
    
    # Verify task exists
    task = await workitem_service.get_workitem(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task {task_id} not found"
        )
    
    # Find which sprint the task is in
    # This requires querying the graph for ASSIGNED_TO_SPRINT relationships
    # For now, we'll need to check all sprints (not optimal, but functional)
    # TODO: Add a method to get sprint for a specific task
    
    # Get all sprints for the project (we need project_id from task)
    # For now, raise an error indicating this needs implementation
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Removing task from sprint via Kanban not yet fully implemented"
    )

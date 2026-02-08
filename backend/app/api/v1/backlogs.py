"""API endpoints for Backlog operations"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.core.security import Permission, require_permission
from app.db.graph import GraphService, get_graph_service
from app.models.user import User
from app.schemas.backlog import (
    BacklogCreate,
    BacklogResponse,
    BacklogTaskResponse,
    BacklogUpdate,
)
from app.services.backlog_service import BacklogService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/backlogs", tags=["backlogs"])


def get_backlog_service(
    graph_service: GraphService = Depends(get_graph_service)
) -> BacklogService:
    """Dependency for getting backlog service"""
    return BacklogService(graph_service)


@router.post(
    "",
    response_model=BacklogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new backlog",
    description="Create a new backlog for a project"
)
@require_permission(Permission.WRITE_WORKITEM)
async def create_backlog(
    backlog_data: BacklogCreate,
    current_user: User = Depends(get_current_user),
    service: BacklogService = Depends(get_backlog_service)
) -> BacklogResponse:
    """
    Create a new backlog.

    Args:
        backlog_data: Backlog creation data
        current_user: Authenticated user
        service: Backlog service

    Returns:
        Created backlog with metadata

    Raises:
        HTTPException: 400 if validation fails
        HTTPException: 401 if not authenticated
    """
    try:
        backlog = await service.create_backlog(backlog_data, current_user)
        logger.info(
            f"User {current_user.id} created backlog {backlog.id} "
            f"for project {backlog_data.project_id}"
        )
        return backlog
    except ValueError as e:
        logger.error(f"Backlog creation validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Backlog creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create backlog"
        )


@router.get(
    "",
    response_model=list[BacklogResponse],
    summary="List backlogs",
    description="List backlogs with optional filter for project"
)
@require_permission(Permission.READ_WORKITEM)
async def list_backlogs(
    project_id: UUID | None = Query(None, description="Filter by project ID"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    service: BacklogService = Depends(get_backlog_service)
) -> list[BacklogResponse]:
    """
    List backlogs with optional filters.

    Args:
        project_id: Optional project ID filter
        limit: Maximum number of results
        offset: Number of results to skip
        current_user: Authenticated user
        service: Backlog service

    Returns:
        List of backlogs

    Raises:
        HTTPException: 401 if not authenticated
    """
    try:
        backlogs = await service.list_backlogs(
            project_id=project_id,
            limit=limit,
            offset=offset
        )
        return backlogs
    except Exception as e:
        logger.exception(f"Backlog list error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list backlogs"
        )


@router.get(
    "/{backlog_id}",
    response_model=BacklogResponse,
    summary="Get a backlog by ID",
    description="Retrieve a backlog by its UUID"
)
@require_permission(Permission.READ_WORKITEM)
async def get_backlog(
    backlog_id: UUID,
    current_user: User = Depends(get_current_user),
    service: BacklogService = Depends(get_backlog_service)
) -> BacklogResponse:
    """
    Get a backlog by ID.

    Args:
        backlog_id: Backlog UUID
        current_user: Authenticated user
        service: Backlog service

    Returns:
        Backlog data

    Raises:
        HTTPException: 404 if backlog not found
        HTTPException: 401 if not authenticated
    """
    backlog = await service.get_backlog(backlog_id)

    if not backlog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Backlog {backlog_id} not found"
        )

    return backlog


@router.patch(
    "/{backlog_id}",
    response_model=BacklogResponse,
    summary="Update a backlog",
    description="Update backlog details such as name or description"
)
@require_permission(Permission.WRITE_WORKITEM)
async def update_backlog(
    backlog_id: UUID,
    updates: BacklogUpdate,
    current_user: User = Depends(get_current_user),
    service: BacklogService = Depends(get_backlog_service)
) -> BacklogResponse:
    """
    Update a backlog.

    Args:
        backlog_id: Backlog UUID
        updates: Update data
        current_user: Authenticated user
        service: Backlog service

    Returns:
        Updated backlog

    Raises:
        HTTPException: 404 if backlog not found
        HTTPException: 400 if validation fails
        HTTPException: 401 if not authenticated
    """
    try:
        backlog = await service.update_backlog(backlog_id, updates, current_user)

        if not backlog:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backlog {backlog_id} not found"
            )

        logger.info(f"User {current_user.id} updated backlog {backlog_id}")
        return backlog
    except ValueError as e:
        logger.error(f"Backlog update validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Backlog update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update backlog"
        )


@router.delete(
    "/{backlog_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a backlog",
    description="Delete a backlog (removes IN_BACKLOG relationships but keeps tasks)"
)
@require_permission(Permission.DELETE_WORKITEM)
async def delete_backlog(
    backlog_id: UUID,
    current_user: User = Depends(get_current_user),
    service: BacklogService = Depends(get_backlog_service)
) -> None:
    """
    Delete a backlog.

    Args:
        backlog_id: Backlog UUID
        current_user: Authenticated user
        service: Backlog service

    Raises:
        HTTPException: 404 if backlog not found
        HTTPException: 401 if not authenticated
    """
    try:
        deleted = await service.delete_backlog(backlog_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Backlog {backlog_id} not found"
            )

        logger.info(f"User {current_user.id} deleted backlog {backlog_id}")
    except Exception as e:
        logger.exception(f"Backlog deletion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete backlog"
        )


@router.get(
    "/{backlog_id}/tasks",
    response_model=list[BacklogTaskResponse],
    summary="Get backlog tasks",
    description="Get all tasks in a backlog, ordered by priority"
)
@require_permission(Permission.READ_WORKITEM)
async def get_backlog_tasks(
    backlog_id: UUID,
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    service: BacklogService = Depends(get_backlog_service)
) -> list[BacklogTaskResponse]:
    """
    Get all tasks in a backlog.

    Args:
        backlog_id: Backlog UUID
        limit: Maximum number of results
        offset: Number of results to skip
        current_user: Authenticated user
        service: Backlog service

    Returns:
        List of tasks with priority information

    Raises:
        HTTPException: 404 if backlog not found
        HTTPException: 401 if not authenticated
    """
    # Verify backlog exists
    backlog = await service.get_backlog(backlog_id)
    if not backlog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Backlog {backlog_id} not found"
        )

    try:
        tasks = await service.get_backlog_tasks(
            backlog_id=backlog_id,
            limit=limit,
            offset=offset
        )
        return tasks
    except Exception as e:
        logger.exception(f"Get backlog tasks error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get backlog tasks"
        )


@router.post(
    "/{backlog_id}/tasks/{task_id}",
    response_model=BacklogTaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add task to backlog",
    description="Manually add a task to the backlog"
)
@require_permission(Permission.WRITE_WORKITEM)
async def add_task_to_backlog(
    backlog_id: UUID,
    task_id: UUID,
    priority_order: int | None = Query(None, ge=0, description="Priority order (lower = higher priority)"),
    current_user: User = Depends(get_current_user),
    service: BacklogService = Depends(get_backlog_service)
) -> BacklogTaskResponse:
    """
    Add a task to the backlog.

    Args:
        backlog_id: Backlog UUID
        task_id: Task UUID
        priority_order: Optional priority order
        current_user: Authenticated user
        service: Backlog service

    Returns:
        Task with backlog information

    Raises:
        HTTPException: 404 if backlog or task not found
        HTTPException: 400 if task is already in a sprint
        HTTPException: 401 if not authenticated
    """
    try:
        task = await service.add_task_to_backlog(
            backlog_id=backlog_id,
            task_id=task_id,
            priority_order=priority_order
        )
        logger.info(
            f"User {current_user.id} added task {task_id} to backlog {backlog_id}"
        )
        return task
    except ValueError as e:
        logger.error(f"Add task to backlog validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Add task to backlog error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add task to backlog"
        )


@router.delete(
    "/{backlog_id}/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove task from backlog",
    description="Remove a task from the backlog"
)
@require_permission(Permission.WRITE_WORKITEM)
async def remove_task_from_backlog(
    backlog_id: UUID,
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    service: BacklogService = Depends(get_backlog_service)
) -> None:
    """
    Remove a task from the backlog.

    Args:
        backlog_id: Backlog UUID
        task_id: Task UUID
        current_user: Authenticated user
        service: Backlog service

    Raises:
        HTTPException: 404 if task not found in backlog
        HTTPException: 401 if not authenticated
    """
    try:
        result = await service.remove_task_from_backlog(backlog_id, task_id)

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task {task_id} not found in backlog {backlog_id}"
            )

        logger.info(
            f"User {current_user.id} removed task {task_id} from backlog {backlog_id}"
        )
    except Exception as e:
        logger.exception(f"Remove task from backlog error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove task from backlog"
        )


@router.post(
    "/{backlog_id}/reorder",
    response_model=list[BacklogTaskResponse],
    summary="Reorder backlog tasks",
    description="Reorder tasks in the backlog by updating priority_order"
)
@require_permission(Permission.WRITE_WORKITEM)
async def reorder_backlog_tasks(
    backlog_id: UUID,
    task_priorities: dict[str, int],
    current_user: User = Depends(get_current_user),
    service: BacklogService = Depends(get_backlog_service)
) -> list[BacklogTaskResponse]:
    """
    Reorder tasks in the backlog.

    Args:
        backlog_id: Backlog UUID
        task_priorities: Dictionary mapping task_id (as string) to new priority_order
        current_user: Authenticated user
        service: Backlog service

    Returns:
        Updated list of tasks in new order

    Raises:
        HTTPException: 404 if backlog not found
        HTTPException: 400 if validation fails
        HTTPException: 401 if not authenticated
    """
    # Verify backlog exists
    backlog = await service.get_backlog(backlog_id)
    if not backlog:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Backlog {backlog_id} not found"
        )

    try:
        # Convert string task IDs to UUIDs
        task_priorities_uuid = {
            UUID(task_id): priority
            for task_id, priority in task_priorities.items()
        }

        tasks = await service.reorder_backlog_tasks(
            backlog_id=backlog_id,
            task_priorities=task_priorities_uuid
        )
        logger.info(
            f"User {current_user.id} reordered {len(task_priorities)} tasks "
            f"in backlog {backlog_id}"
        )
        return tasks
    except ValueError as e:
        logger.error(f"Reorder backlog tasks validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Reorder backlog tasks error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reorder backlog tasks"
        )


@router.get(
    "/tasks/{task_id}/backlog-status",
    response_model=dict,
    summary="Check if task is in backlog",
    description="Check if a task is in any backlog"
)
@require_permission(Permission.READ_WORKITEM)
async def get_task_backlog_status(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    service: BacklogService = Depends(get_backlog_service)
) -> dict:
    """
    Check if a task is in a backlog.

    Args:
        task_id: Task UUID
        current_user: Authenticated user
        service: Backlog service

    Returns:
        Dictionary with in_backlog status and backlog_id if applicable

    Raises:
        HTTPException: 401 if not authenticated
    """
    try:
        query = f"""
        MATCH (t:WorkItem {{id: '{str(task_id)}'}})-[r:IN_BACKLOG]->(b:Backlog)
        RETURN b.id as backlog_id, r.priority_order as priority_order
        """
        results = await service.graph_service.execute_query(query)

        if results and len(results) > 0:
            return {
                "in_backlog": True,
                "backlog_id": results[0].get('backlog_id'),
                "priority_order": results[0].get('priority_order')
            }
        else:
            return {
                "in_backlog": False,
                "backlog_id": None,
                "priority_order": None
            }
    except Exception as e:
        logger.exception(f"Get task backlog status error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get task backlog status"
        )


# Project-scoped backlog routes
project_router = APIRouter(prefix="/projects/{project_id}/backlogs", tags=["backlogs", "projects"])


@project_router.post(
    "",
    response_model=BacklogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a backlog for a project",
    description="Create a new backlog for a specific project"
)
@require_permission(Permission.WRITE_WORKITEM)
async def create_project_backlog(
    project_id: UUID,
    backlog_data: BacklogCreate,
    current_user: User = Depends(get_current_user),
    service: BacklogService = Depends(get_backlog_service)
) -> BacklogResponse:
    """
    Create a new backlog for a project.

    Args:
        project_id: Project UUID
        backlog_data: Backlog creation data
        current_user: Authenticated user
        service: Backlog service

    Returns:
        Created backlog with metadata

    Raises:
        HTTPException: 400 if validation fails or project_id mismatch
        HTTPException: 401 if not authenticated
    """
    # Ensure project_id matches
    if backlog_data.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project ID in URL must match project ID in request body"
        )

    return await create_backlog(backlog_data, current_user, service)


@project_router.get(
    "",
    response_model=list[BacklogResponse],
    summary="List backlogs for a project",
    description="List all backlogs for a specific project"
)
@require_permission(Permission.READ_WORKITEM)
async def list_project_backlogs(
    project_id: UUID,
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    service: BacklogService = Depends(get_backlog_service)
) -> list[BacklogResponse]:
    """
    List backlogs for a project.

    Args:
        project_id: Project UUID
        limit: Maximum number of results
        offset: Number of results to skip
        current_user: Authenticated user
        service: Backlog service

    Returns:
        List of backlogs for the project

    Raises:
        HTTPException: 401 if not authenticated
    """
    return await list_backlogs(project_id, limit, offset, current_user, service)

"""API endpoints for Milestone operations"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.security import Permission, require_permission
from app.db.graph import GraphService, get_graph_service
from app.models.user import User
from app.schemas.milestone import MilestoneCreate, MilestoneResponse, MilestoneUpdate
from app.services.milestone_service import MilestoneService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/milestones", tags=["milestones"])


def get_milestone_service(
    graph_service: GraphService = Depends(get_graph_service)
) -> MilestoneService:
    """Dependency for getting milestone service"""
    return MilestoneService(graph_service)


@router.post(
    "",
    response_model=MilestoneResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new milestone",
    description="Create a new milestone for a project with target date and completion criteria"
)
@require_permission(Permission.WRITE_WORKITEM)
async def create_milestone(
    milestone_data: MilestoneCreate,
    current_user: User = Depends(get_current_user),
    service: MilestoneService = Depends(get_milestone_service)
) -> MilestoneResponse:
    """
    Create a new milestone.

    Args:
        milestone_data: Milestone creation data
        current_user: Authenticated user
        service: Milestone service

    Returns:
        Created milestone with metadata

    Raises:
        HTTPException: 400 if validation fails
        HTTPException: 401 if not authenticated
    """
    try:
        milestone = await service.create_milestone(milestone_data, current_user)
        logger.info(
            f"User {current_user.id} created milestone {milestone.id} "
            f"for project {milestone_data.project_id}"
        )
        return milestone
    except ValueError as e:
        logger.error(f"Milestone creation validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Milestone creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create milestone"
        )


@router.get(
    "/{milestone_id}",
    response_model=MilestoneResponse,
    summary="Get a milestone by ID",
    description="Retrieve a milestone by its UUID"
)
@require_permission(Permission.READ_WORKITEM)
async def get_milestone(
    milestone_id: UUID,
    current_user: User = Depends(get_current_user),
    service: MilestoneService = Depends(get_milestone_service)
) -> MilestoneResponse:
    """
    Get a milestone by ID.

    Args:
        milestone_id: Milestone UUID
        current_user: Authenticated user
        service: Milestone service

    Returns:
        Milestone data

    Raises:
        HTTPException: 404 if milestone not found
        HTTPException: 401 if not authenticated
    """
    milestone = await service.get_milestone(milestone_id)

    if not milestone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Milestone {milestone_id} not found"
        )

    return milestone


@router.put(
    "/{milestone_id}",
    response_model=MilestoneResponse,
    summary="Update a milestone",
    description="Update milestone properties"
)
@require_permission(Permission.WRITE_WORKITEM)
async def update_milestone(
    milestone_id: UUID,
    updates: MilestoneUpdate,
    current_user: User = Depends(get_current_user),
    service: MilestoneService = Depends(get_milestone_service)
) -> MilestoneResponse:
    """
    Update a milestone.

    Args:
        milestone_id: Milestone UUID
        updates: Update data
        current_user: Authenticated user
        service: Milestone service

    Returns:
        Updated milestone

    Raises:
        HTTPException: 404 if milestone not found
        HTTPException: 400 if validation fails
        HTTPException: 401 if not authenticated
    """
    try:
        milestone = await service.update_milestone(milestone_id, updates, current_user)

        if not milestone:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Milestone {milestone_id} not found"
            )

        logger.info(f"User {current_user.id} updated milestone {milestone_id}")
        return milestone
    except ValueError as e:
        logger.error(f"Milestone update validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Milestone update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update milestone"
        )


@router.delete(
    "/{milestone_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a milestone",
    description="Delete a milestone and its relationships"
)
@require_permission(Permission.DELETE_WORKITEM)
async def delete_milestone(
    milestone_id: UUID,
    current_user: User = Depends(get_current_user),
    service: MilestoneService = Depends(get_milestone_service)
) -> None:
    """
    Delete a milestone.

    Args:
        milestone_id: Milestone UUID
        current_user: Authenticated user
        service: Milestone service

    Raises:
        HTTPException: 404 if milestone not found
        HTTPException: 401 if not authenticated
    """
    deleted = await service.delete_milestone(milestone_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Milestone {milestone_id} not found"
        )

    logger.info(f"User {current_user.id} deleted milestone {milestone_id}")


@router.get(
    "",
    response_model=list[MilestoneResponse],
    summary="List milestones",
    description="List milestones with optional filters"
)
@require_permission(Permission.READ_WORKITEM)
async def list_milestones(
    project_id: UUID | None = None,
    milestone_status: str | None = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    service: MilestoneService = Depends(get_milestone_service)
) -> list[MilestoneResponse]:
    """
    List milestones with optional filters.

    Args:
        project_id: Optional project ID filter
        milestone_status: Optional status filter
        limit: Maximum number of results (default 100)
        current_user: Authenticated user
        service: Milestone service

    Returns:
        List of milestones

    Raises:
        HTTPException: 401 if not authenticated
    """
    milestones = await service.list_milestones(
        project_id=project_id,
        status=milestone_status,
        limit=limit
    )

    return milestones


@router.post(
    "/{milestone_id}/dependencies/{task_id}",
    status_code=status.HTTP_201_CREATED,
    summary="Add task dependency to milestone",
    description="Create DEPENDS_ON relationship from milestone to task and BLOCKS relationship from task to milestone"
)
@require_permission(Permission.WRITE_WORKITEM)
async def add_milestone_dependency(
    milestone_id: UUID,
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    service: MilestoneService = Depends(get_milestone_service)
) -> dict:
    """
    Add a task dependency to a milestone.

    Args:
        milestone_id: Milestone UUID
        task_id: Task UUID (WorkItem with type='task')
        current_user: Authenticated user
        service: Milestone service

    Returns:
        Success message

    Raises:
        HTTPException: 404 if milestone or task not found
        HTTPException: 400 if dependency would create a cycle
        HTTPException: 401 if not authenticated
    """
    try:
        await service.add_dependency(milestone_id, task_id)
        logger.info(
            f"User {current_user.id} added dependency: "
            f"milestone {milestone_id} depends on task {task_id}"
        )
        return {
            "message": "Dependency added successfully",
            "milestone_id": str(milestone_id),
            "task_id": str(task_id)
        }
    except ValueError as e:
        logger.error(f"Failed to add milestone dependency: {e}")
        if "not found" in str(e):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
    except Exception as e:
        logger.exception(f"Error adding milestone dependency: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add milestone dependency"
        )


@router.delete(
    "/{milestone_id}/dependencies/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove task dependency from milestone",
    description="Remove DEPENDS_ON and BLOCKS relationships between milestone and task"
)
@require_permission(Permission.WRITE_WORKITEM)
async def remove_milestone_dependency(
    milestone_id: UUID,
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    service: MilestoneService = Depends(get_milestone_service)
) -> None:
    """
    Remove a task dependency from a milestone.

    Args:
        milestone_id: Milestone UUID
        task_id: Task UUID
        current_user: Authenticated user
        service: Milestone service

    Raises:
        HTTPException: 404 if dependency not found
        HTTPException: 401 if not authenticated
    """
    removed = await service.remove_dependency(milestone_id, task_id)

    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dependency between milestone {milestone_id} and task {task_id} not found"
        )

    logger.info(
        f"User {current_user.id} removed dependency: "
        f"milestone {milestone_id} no longer depends on task {task_id}"
    )


@router.get(
    "/{milestone_id}/dependencies",
    response_model=list[dict],
    summary="Get milestone dependencies",
    description="Get all tasks that this milestone depends on"
)
@require_permission(Permission.READ_WORKITEM)
async def get_milestone_dependencies(
    milestone_id: UUID,
    current_user: User = Depends(get_current_user),
    service: MilestoneService = Depends(get_milestone_service)
) -> list[dict]:
    """
    Get all task dependencies for a milestone.

    Args:
        milestone_id: Milestone UUID
        current_user: Authenticated user
        service: Milestone service

    Returns:
        List of tasks that the milestone depends on

    Raises:
        HTTPException: 401 if not authenticated
    """
    dependencies = await service.get_dependencies(milestone_id)

    logger.info(
        f"User {current_user.id} retrieved {len(dependencies)} dependencies "
        f"for milestone {milestone_id}"
    )

    return dependencies


# ============================================================================
# BEFORE Dependency Relationship Endpoints for Milestones (Task 1A.5)
# ============================================================================

@router.post(
    "/{milestone_id}/before/{target_id}",
    status_code=status.HTTP_200_OK,
    summary="Create BEFORE dependency for milestone",
    description="Create a BEFORE dependency relationship between two milestones"
)
@require_permission(Permission.WRITE_WORKITEM)
async def create_milestone_before_dependency(
    milestone_id: UUID,
    target_id: UUID,
    dependency_type: str = "finish-to-start",
    lag: int = 0,
    current_user: User = Depends(get_current_user),
    service: MilestoneService = Depends(get_milestone_service)
) -> dict:
    """
    Create a BEFORE dependency relationship between two milestones.
    
    This establishes that the source milestone must be completed before the target
    milestone can be reached (or other dependency types).

    Args:
        milestone_id: Source milestone UUID (predecessor)
        target_id: Target milestone UUID (successor)
        dependency_type: Type of dependency (finish-to-start, start-to-start, finish-to-finish)
        lag: Optional delay in days after predecessor completes
        current_user: Authenticated user
        service: Milestone service

    Returns:
        Dependency relationship information

    Raises:
        HTTPException: 400 if validation fails or cycle detected
        HTTPException: 404 if either milestone not found
        HTTPException: 401 if not authenticated
    """
    try:
        result = await service.create_before_relationship(
            milestone_id, target_id, dependency_type, lag
        )
        
        logger.info(
            f"User {current_user.id} created BEFORE dependency: "
            f"{milestone_id} -> {target_id} (type={dependency_type}, lag={lag})"
        )
        
        return {
            "message": "BEFORE dependency created successfully",
            "from_milestone_id": str(result["from_milestone_id"]),
            "to_milestone_id": str(result["to_milestone_id"]),
            "dependency_type": result["dependency_type"],
            "lag": result["lag"],
            "created_at": result["created_at"].isoformat(),
        }
    
    except ValueError as e:
        logger.error(f"Failed to create BEFORE dependency: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Unexpected error creating BEFORE dependency: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create BEFORE dependency"
        )


@router.delete(
    "/{milestone_id}/before/{target_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove BEFORE dependency for milestone",
    description="Remove a BEFORE dependency relationship between two milestones"
)
@require_permission(Permission.WRITE_WORKITEM)
async def remove_milestone_before_dependency(
    milestone_id: UUID,
    target_id: UUID,
    current_user: User = Depends(get_current_user),
    service: MilestoneService = Depends(get_milestone_service)
) -> None:
    """
    Remove a BEFORE dependency relationship between two milestones.

    Args:
        milestone_id: Source milestone UUID (predecessor)
        target_id: Target milestone UUID (successor)
        current_user: Authenticated user
        service: Milestone service

    Raises:
        HTTPException: 404 if relationship not found
        HTTPException: 401 if not authenticated
    """
    try:
        success = await service.remove_before_relationship(milestone_id, target_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"BEFORE dependency from {milestone_id} to {target_id} not found"
            )
        
        logger.info(
            f"User {current_user.id} removed BEFORE dependency: "
            f"{milestone_id} -> {target_id}"
        )
    
    except ValueError as e:
        logger.error(f"Failed to remove BEFORE dependency: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Unexpected error removing BEFORE dependency: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove BEFORE dependency"
        )


@router.get(
    "/{milestone_id}/before-dependencies",
    summary="Get BEFORE dependencies for milestone",
    description="Get all BEFORE dependency relationships for a milestone"
)
@require_permission(Permission.READ_WORKITEM)
async def get_milestone_before_dependencies(
    milestone_id: UUID,
    current_user: User = Depends(get_current_user),
    service: MilestoneService = Depends(get_milestone_service)
) -> dict:
    """
    Get all BEFORE dependency relationships for a milestone.
    
    Returns both predecessors (milestones that must complete before this one)
    and successors (milestones that depend on this one).

    Args:
        milestone_id: Milestone UUID
        current_user: Authenticated user
        service: Milestone service

    Returns:
        Dictionary with predecessors and successors lists

    Raises:
        HTTPException: 404 if milestone not found
        HTTPException: 401 if not authenticated
    """
    try:
        dependencies = await service.get_before_dependencies(milestone_id)
        
        logger.info(
            f"User {current_user.id} retrieved BEFORE dependencies for milestone {milestone_id}"
        )
        
        return dependencies
    
    except ValueError as e:
        logger.error(f"Failed to get milestone BEFORE dependencies: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Unexpected error getting milestone BEFORE dependencies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get milestone BEFORE dependencies"
        )

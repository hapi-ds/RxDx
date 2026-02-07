"""API endpoints for Milestone operations"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.v1.auth import get_current_user
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
async def list_milestones(
    project_id: UUID | None = None,
    status: str | None = None,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    service: MilestoneService = Depends(get_milestone_service)
) -> list[MilestoneResponse]:
    """
    List milestones with optional filters.

    Args:
        project_id: Optional project ID filter
        status: Optional status filter
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
        status=status,
        limit=limit
    )

    return milestones

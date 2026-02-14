"""API endpoints for Phase management"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.security import Permission, require_permission
from app.db.graph import GraphService, get_graph_service
from app.models.user import User
from app.schemas.phase import PhaseCreate, PhaseResponse, PhaseUpdate
from app.services.phase_service import PhaseService

logger = logging.getLogger(__name__)

router = APIRouter()


def get_phase_service(
    graph_service: GraphService = Depends(get_graph_service),
) -> PhaseService:
    """Dependency for getting phase service"""
    return PhaseService(graph_service)


@router.post(
    "/phases",
    response_model=PhaseResponse,
    status_code=status.HTTP_201_CREATED,
)
@require_permission(Permission.WRITE_WORKITEM)
async def create_phase(
    data: PhaseCreate,
    current_user: User = Depends(get_current_user),
    service: PhaseService = Depends(get_phase_service),
) -> PhaseResponse:
    """
    Create a new phase

    Args:
        data: Phase creation data
        current_user: Authenticated user
        service: Phase service

    Returns:
        Created phase

    Raises:
        HTTPException: 400 if validation fails, 401 if not authenticated
    """
    try:
        logger.info(
            f"User {current_user.id} creating phase: {data.name} for project {data.project_id}"
        )
        return await service.create_phase(data)
    except ValueError as e:
        logger.error(f"Failed to create phase: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating phase: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create phase",
        )


@router.get("/phases/{phase_id}", response_model=PhaseResponse)
@require_permission(Permission.READ_WORKITEM)
async def get_phase(
    phase_id: UUID,
    current_user: User = Depends(get_current_user),
    service: PhaseService = Depends(get_phase_service),
) -> PhaseResponse:
    """
    Get a phase by ID

    Args:
        phase_id: Phase UUID
        current_user: Authenticated user
        service: Phase service

    Returns:
        Phase details

    Raises:
        HTTPException: 404 if not found, 401 if not authenticated
    """
    phase = await service.get_phase(phase_id)
    if not phase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Phase {phase_id} not found",
        )
    return phase


@router.patch("/phases/{phase_id}", response_model=PhaseResponse)
@require_permission(Permission.WRITE_WORKITEM)
async def update_phase(
    phase_id: UUID,
    updates: PhaseUpdate,
    current_user: User = Depends(get_current_user),
    service: PhaseService = Depends(get_phase_service),
) -> PhaseResponse:
    """
    Update a phase

    Args:
        phase_id: Phase UUID
        updates: Phase update data
        current_user: Authenticated user
        service: Phase service

    Returns:
        Updated phase

    Raises:
        HTTPException: 404 if not found, 400 if validation fails, 401 if not authenticated
    """
    try:
        logger.info(f"User {current_user.id} updating phase {phase_id}")
        phase = await service.update_phase(phase_id, updates)
        if not phase:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Phase {phase_id} not found",
            )
        return phase
    except ValueError as e:
        logger.error(f"Failed to update phase: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error updating phase: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update phase",
        )


@router.delete("/phases/{phase_id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permission(Permission.WRITE_WORKITEM)
async def delete_phase(
    phase_id: UUID,
    current_user: User = Depends(get_current_user),
    service: PhaseService = Depends(get_phase_service),
) -> None:
    """
    Delete a phase

    Args:
        phase_id: Phase UUID
        current_user: Authenticated user
        service: Phase service

    Raises:
        HTTPException: 404 if not found, 401 if not authenticated
    """
    try:
        logger.info(f"User {current_user.id} deleting phase {phase_id}")
        success = await service.delete_phase(phase_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Phase {phase_id} not found",
            )
    except ValueError as e:
        logger.error(f"Failed to delete phase: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error deleting phase: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete phase",
        )


@router.get("/projects/{project_id}/phases", response_model=list[PhaseResponse])
@require_permission(Permission.READ_WORKITEM)
async def list_phases_by_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    service: PhaseService = Depends(get_phase_service),
) -> list[PhaseResponse]:
    """
    List all phases for a project, ordered by NEXT relationship chain

    Args:
        project_id: Project UUID
        current_user: Authenticated user
        service: Phase service

    Returns:
        List of phases ordered by NEXT relationships

    Raises:
        HTTPException: 401 if not authenticated
    """
    try:
        return await service.list_phases_by_project(project_id)
    except Exception as e:
        logger.error(f"Failed to list phases for project {project_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list phases",
        )


# ============================================================================
# NEXT Relationship Endpoints (Task 1A.4)
# ============================================================================

@router.post(
    "/phases/{phase_id}/next/{next_phase_id}",
    response_model=PhaseResponse,
    status_code=status.HTTP_200_OK,
)
@require_permission(Permission.WRITE_WORKITEM)
async def create_next_relationship(
    phase_id: UUID,
    next_phase_id: UUID,
    current_user: User = Depends(get_current_user),
    service: PhaseService = Depends(get_phase_service),
) -> PhaseResponse:
    """
    Create a NEXT relationship from one phase to another.
    
    This establishes sequential ordering between phases. The NEXT relationships
    must form a linear sequence (no cycles, no branches).

    Args:
        phase_id: Source phase UUID
        next_phase_id: Target phase UUID (the next phase in sequence)
        current_user: Authenticated user
        service: Phase service

    Returns:
        Updated source phase

    Raises:
        HTTPException: 400 if validation fails (cycle, branch, or different projects)
        HTTPException: 404 if either phase not found
        HTTPException: 401 if not authenticated
    """
    try:
        logger.info(
            f"User {current_user.id} creating NEXT relationship: "
            f"{phase_id} -> {next_phase_id}"
        )
        phase = await service.create_next_relationship(phase_id, next_phase_id)
        if not phase:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Phase {phase_id} not found",
            )
        return phase
    except ValueError as e:
        logger.error(f"Failed to create NEXT relationship: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating NEXT relationship: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create NEXT relationship",
        )


@router.delete(
    "/phases/{phase_id}/next",
    status_code=status.HTTP_204_NO_CONTENT,
)
@require_permission(Permission.WRITE_WORKITEM)
async def remove_next_relationship(
    phase_id: UUID,
    current_user: User = Depends(get_current_user),
    service: PhaseService = Depends(get_phase_service),
) -> None:
    """
    Remove the NEXT relationship from a phase.

    Args:
        phase_id: Source phase UUID
        current_user: Authenticated user
        service: Phase service

    Raises:
        HTTPException: 404 if phase not found or no NEXT relationship exists
        HTTPException: 401 if not authenticated
    """
    try:
        logger.info(f"User {current_user.id} removing NEXT relationship from {phase_id}")
        success = await service.remove_next_relationship(phase_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Phase {phase_id} not found or has no NEXT relationship",
            )
    except Exception as e:
        logger.error(f"Unexpected error removing NEXT relationship: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove NEXT relationship",
        )


@router.get("/phases/{phase_id}/next", response_model=PhaseResponse)
@require_permission(Permission.READ_WORKITEM)
async def get_next_phase(
    phase_id: UUID,
    current_user: User = Depends(get_current_user),
    service: PhaseService = Depends(get_phase_service),
) -> PhaseResponse:
    """
    Get the next phase in the sequence.

    Args:
        phase_id: Source phase UUID
        current_user: Authenticated user
        service: Phase service

    Returns:
        Next phase in sequence

    Raises:
        HTTPException: 404 if phase not found or has no next phase
        HTTPException: 401 if not authenticated
    """
    next_phase = await service.get_next_phase(phase_id)
    if not next_phase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Phase {phase_id} has no next phase",
        )
    return next_phase


@router.get("/phases/{phase_id}/previous", response_model=PhaseResponse)
@require_permission(Permission.READ_WORKITEM)
async def get_previous_phase(
    phase_id: UUID,
    current_user: User = Depends(get_current_user),
    service: PhaseService = Depends(get_phase_service),
) -> PhaseResponse:
    """
    Get the previous phase in the sequence.

    Args:
        phase_id: Target phase UUID
        current_user: Authenticated user
        service: Phase service

    Returns:
        Previous phase in sequence

    Raises:
        HTTPException: 404 if phase not found or has no previous phase
        HTTPException: 401 if not authenticated
    """
    previous_phase = await service.get_previous_phase(phase_id)
    if not previous_phase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Phase {phase_id} has no previous phase",
        )
    return previous_phase

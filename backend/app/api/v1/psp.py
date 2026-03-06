"""API endpoints for PSP (Project Structure Plan) management"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.db.graph import GraphService, get_graph_service
from app.models.user import User
from app.schemas.psp import (
    DepartmentResponse,
    PhaseResponse,
    PSPMatrixResponse,
    PSPStatistics,
    WorkpackageResponse,
)
from app.services.psp_service import PSPService

logger = logging.getLogger(__name__)

router = APIRouter()


def get_psp_service(
    graph_service: GraphService = Depends(get_graph_service),
) -> PSPService:
    """Dependency for getting PSP service"""
    return PSPService(graph_service)


@router.get("/matrix", response_model=PSPMatrixResponse)
async def get_psp_matrix(
    current_user: User = Depends(get_current_user),
    service: PSPService = Depends(get_psp_service),
) -> PSPMatrixResponse:
    """
    Retrieve the Project Structure Plan (PSP) Matrix.

    Returns structurally ordered Phases (via NEXT relationships),
    Departments (alphabetical), and Workpackages with their phase-department mappings.

    Args:
        current_user: Authenticated user
        service: PSP service

    Returns:
        Complete PSP matrix data

    Raises:
        HTTPException: 500 if database error occurs
    """
    try:
        logger.info(f"User {current_user.id} requesting PSP matrix")
        matrix_data = await service.get_matrix_data()
        return matrix_data
    except Exception as e:
        logger.exception(f"Error retrieving PSP matrix: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve PSP matrix data",
        )


@router.get("/phases", response_model=list[PhaseResponse])
async def get_phases(
    current_user: User = Depends(get_current_user),
    service: PSPService = Depends(get_psp_service),
) -> list[PhaseResponse]:
    """
    Get all phases ordered by NEXT relationships.

    Args:
        current_user: Authenticated user
        service: PSP service

    Returns:
        List of phases in chronological order

    Raises:
        HTTPException: 500 if database error occurs
    """
    try:
        logger.info(f"User {current_user.id} requesting phases")
        phases = await service.get_ordered_phases()
        return phases
    except Exception as e:
        logger.exception(f"Error retrieving phases: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve phases",
        )


@router.get("/departments", response_model=list[DepartmentResponse])
async def get_departments(
    current_user: User = Depends(get_current_user),
    service: PSPService = Depends(get_psp_service),
) -> list[DepartmentResponse]:
    """
    Get all departments in alphabetical order.

    Args:
        current_user: Authenticated user
        service: PSP service

    Returns:
        List of departments ordered alphabetically

    Raises:
        HTTPException: 500 if database error occurs
    """
    try:
        logger.info(f"User {current_user.id} requesting departments")
        departments = await service.get_departments()
        return departments
    except Exception as e:
        logger.exception(f"Error retrieving departments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve departments",
        )


@router.get("/workpackages", response_model=list[WorkpackageResponse])
async def get_workpackages(
    phase_id: UUID | None = None,
    department_id: UUID | None = None,
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    service: PSPService = Depends(get_psp_service),
) -> list[WorkpackageResponse]:
    """
    Get workpackages with optional filters.

    Args:
        phase_id: Optional phase ID filter
        department_id: Optional department ID filter
        status: Optional status filter (draft, active, completed, archived)
        current_user: Authenticated user
        service: PSP service

    Returns:
        List of workpackages matching the filters

    Raises:
        HTTPException: 500 if database error occurs
    """
    try:
        logger.info(
            f"User {current_user.id} requesting workpackages with filters: "
            f"phase_id={phase_id}, department_id={department_id}, status={status}"
        )
        workpackages = await service.get_workpackages(
            phase_id=str(phase_id) if phase_id else None,
            department_id=str(department_id) if department_id else None,
            status=status,
        )
        return workpackages
    except Exception as e:
        logger.exception(f"Error retrieving workpackages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve workpackages",
        )


@router.get("/statistics", response_model=PSPStatistics)
async def get_statistics(
    current_user: User = Depends(get_current_user),
    service: PSPService = Depends(get_psp_service),
) -> PSPStatistics:
    """
    Get PSP matrix statistics.

    Returns counts, coverage percentage, and status breakdown.

    Args:
        current_user: Authenticated user
        service: PSP service

    Returns:
        Matrix statistics

    Raises:
        HTTPException: 500 if database error occurs
    """
    try:
        logger.info(f"User {current_user.id} requesting PSP statistics")
        statistics = await service.get_statistics()
        return statistics
    except Exception as e:
        logger.exception(f"Error retrieving PSP statistics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve PSP statistics",
        )

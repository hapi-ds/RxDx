"""API endpoints for Workpackage management"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.db.graph import GraphService, get_graph_service
from app.models.user import User
from app.schemas.department import DepartmentResponse
from app.schemas.workpackage import (
    WorkpackageCreate,
    WorkpackageDepartmentLink,
    WorkpackageResponse,
    WorkpackageUpdate,
)
from app.services.workpackage_service import WorkpackageService

logger = logging.getLogger(__name__)

router = APIRouter()


def get_workpackage_service(
    graph_service: GraphService = Depends(get_graph_service),
) -> WorkpackageService:
    """Dependency for getting workpackage service"""
    return WorkpackageService(graph_service)


@router.post(
    "/workpackages",
    response_model=WorkpackageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_workpackage(
    data: WorkpackageCreate,
    current_user: User = Depends(get_current_user),
    service: WorkpackageService = Depends(get_workpackage_service),
) -> WorkpackageResponse:
    """
    Create a new workpackage

    Args:
        data: Workpackage creation data
        current_user: Authenticated user
        service: Workpackage service

    Returns:
        Created workpackage

    Raises:
        HTTPException: 400 if validation fails, 401 if not authenticated
    """
    try:
        logger.info(
            f"User {current_user.id} creating workpackage: {data.name} for phase {data.phase_id}"
        )
        return await service.create_workpackage(data)
    except ValueError as e:
        logger.error(f"Failed to create workpackage: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error creating workpackage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create workpackage",
        )


@router.get("/workpackages/{workpackage_id}", response_model=WorkpackageResponse)
async def get_workpackage(
    workpackage_id: UUID,
    include_stats: bool = False,
    current_user: User = Depends(get_current_user),
    service: WorkpackageService = Depends(get_workpackage_service),
) -> WorkpackageResponse:
    """
    Get a workpackage by ID

    Args:
        workpackage_id: Workpackage UUID
        include_stats: Whether to include task statistics
        current_user: Authenticated user
        service: Workpackage service

    Returns:
        Workpackage details

    Raises:
        HTTPException: 404 if not found, 401 if not authenticated
    """
    workpackage = await service.get_workpackage(workpackage_id, include_stats)
    if not workpackage:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workpackage {workpackage_id} not found",
        )
    return workpackage


@router.patch("/workpackages/{workpackage_id}", response_model=WorkpackageResponse)
async def update_workpackage(
    workpackage_id: UUID,
    updates: WorkpackageUpdate,
    current_user: User = Depends(get_current_user),
    service: WorkpackageService = Depends(get_workpackage_service),
) -> WorkpackageResponse:
    """
    Update a workpackage

    Args:
        workpackage_id: Workpackage UUID
        updates: Workpackage update data
        current_user: Authenticated user
        service: Workpackage service

    Returns:
        Updated workpackage

    Raises:
        HTTPException: 404 if not found, 400 if validation fails, 401 if not authenticated
    """
    try:
        logger.info(f"User {current_user.id} updating workpackage {workpackage_id}")
        workpackage = await service.update_workpackage(workpackage_id, updates)
        if not workpackage:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workpackage {workpackage_id} not found",
            )
        return workpackage
    except ValueError as e:
        logger.error(f"Failed to update workpackage: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error updating workpackage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update workpackage",
        )


@router.delete("/workpackages/{workpackage_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workpackage(
    workpackage_id: UUID,
    current_user: User = Depends(get_current_user),
    service: WorkpackageService = Depends(get_workpackage_service),
) -> None:
    """
    Delete a workpackage

    Args:
        workpackage_id: Workpackage UUID
        current_user: Authenticated user
        service: Workpackage service

    Raises:
        HTTPException: 404 if not found, 401 if not authenticated

    Note:
        This removes BELONGS_TO relationships from tasks but does NOT delete the tasks
    """
    logger.info(f"User {current_user.id} deleting workpackage {workpackage_id}")
    success = await service.delete_workpackage(workpackage_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Workpackage {workpackage_id} not found",
        )


@router.post(
    "/workpackages/{workpackage_id}/link-department/{department_id}",
    status_code=status.HTTP_200_OK,
)
async def link_workpackage_to_department(
    workpackage_id: UUID,
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    service: WorkpackageService = Depends(get_workpackage_service),
) -> dict:
    """
    Link a workpackage to a department for resource allocation

    Args:
        workpackage_id: Workpackage UUID
        department_id: Department UUID
        current_user: Authenticated user
        service: Workpackage service

    Returns:
        Link information

    Raises:
        HTTPException: 400 if validation fails, 404 if not found, 401 if not authenticated
    """
    try:
        logger.info(
            f"User {current_user.id} linking workpackage {workpackage_id} to department {department_id}"
        )
        result = await service.link_to_department(workpackage_id, department_id)
        return {
            "message": "Workpackage linked to department successfully",
            "workpackage_id": str(result["workpackage_id"]),
            "department_id": str(result["department_id"]),
            "linked_at": result["linked_at"].isoformat(),
        }
    except ValueError as e:
        logger.error(f"Failed to link workpackage to department: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error linking workpackage to department: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to link workpackage to department",
        )


@router.delete(
    "/workpackages/{workpackage_id}/link-department/{department_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def unlink_workpackage_from_department(
    workpackage_id: UUID,
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    service: WorkpackageService = Depends(get_workpackage_service),
) -> None:
    """
    Unlink a workpackage from a specific department

    Args:
        workpackage_id: Workpackage UUID
        department_id: Department UUID
        current_user: Authenticated user
        service: Workpackage service

    Raises:
        HTTPException: 404 if not found or not linked, 401 if not authenticated
    """
    try:
        logger.info(
            f"User {current_user.id} unlinking workpackage {workpackage_id} from department {department_id}"
        )
        success = await service.unlink_from_department(workpackage_id, department_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workpackage {workpackage_id} is not linked to department {department_id}",
            )
    except ValueError as e:
        logger.error(f"Failed to unlink workpackage from department: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error unlinking workpackage from department: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unlink workpackage from department",
        )


@router.get(
    "/workpackages/{workpackage_id}/department", response_model=DepartmentResponse
)
async def get_workpackage_department(
    workpackage_id: UUID,
    current_user: User = Depends(get_current_user),
    service: WorkpackageService = Depends(get_workpackage_service),
) -> DepartmentResponse:
    """
    Get the department linked to a workpackage

    Args:
        workpackage_id: Workpackage UUID
        current_user: Authenticated user
        service: Workpackage service

    Returns:
        Department details

    Raises:
        HTTPException: 404 if not found or not linked, 401 if not authenticated
    """
    try:
        department = await service.get_linked_department(workpackage_id)
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Workpackage {workpackage_id} is not linked to any department",
            )
        return department
    except ValueError as e:
        logger.error(f"Failed to get workpackage department: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error getting workpackage department: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get workpackage department",
        )


@router.get("/workpackages/{workpackage_id}/available-resources")
async def get_workpackage_available_resources(
    workpackage_id: UUID,
    skills: list[str] | None = None,
    current_user: User = Depends(get_current_user),
    service: WorkpackageService = Depends(get_workpackage_service),
) -> list[dict]:
    """
    Get resources available from the linked department

    Args:
        workpackage_id: Workpackage UUID
        skills: Optional list of required skills for filtering
        current_user: Authenticated user
        service: Workpackage service

    Returns:
        List of available resources

    Raises:
        HTTPException: 404 if not found or not linked, 401 if not authenticated
    """
    try:
        resources = await service.get_available_resources(workpackage_id, skills)
        return resources
    except ValueError as e:
        logger.error(f"Failed to get available resources: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Unexpected error getting available resources: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get available resources",
        )

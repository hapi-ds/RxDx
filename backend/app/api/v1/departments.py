"""API endpoints for Department management"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, get_graph_service
from app.db.graph import GraphService
from app.models.user import User
from app.schemas.department import (
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
)
from app.services.department_service import DepartmentService

logger = logging.getLogger(__name__)

router = APIRouter()


def get_department_service(
    graph_service: GraphService = Depends(get_graph_service),
) -> DepartmentService:
    """Dependency for getting department service"""
    return DepartmentService(graph_service)


@router.post(
    "",
    response_model=DepartmentResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "Department created successfully"},
        400: {"description": "Invalid input or company not found"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized"},
    },
)
async def create_department(
    data: DepartmentCreate,
    current_user: User = Depends(get_current_user),
    service: DepartmentService = Depends(get_department_service),
) -> DepartmentResponse:
    """
    Create a new department.

    Requires admin or project_manager role.

    Args:
        data: Department creation data including name, company_id, and optional description/manager
        current_user: Authenticated user
        service: Department service

    Returns:
        Created department with metadata

    Raises:
        HTTPException: 400 if company not found
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not authorized
    """
    # Check authorization
    if current_user.role not in ["admin", "project_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and project_manager roles can create departments",
        )

    try:
        department = await service.create_department(data)
        logger.info(f"Department created: {department.id} by user {current_user.id}")
        return department
    except ValueError as e:
        logger.error(f"Failed to create department: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "",
    response_model=list[DepartmentResponse],
    responses={
        200: {"description": "List of departments"},
        401: {"description": "Not authenticated"},
    },
)
async def list_departments(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    service: DepartmentService = Depends(get_department_service),
) -> list[DepartmentResponse]:
    """
    List all departments.

    Requires authentication.

    Args:
        limit: Maximum number of departments to return (default 100)
        current_user: Authenticated user
        service: Department service

    Returns:
        List of departments
    """
    departments = await service.list_departments(limit=limit)
    return departments


@router.get(
    "/{department_id}",
    response_model=DepartmentResponse,
    responses={
        200: {"description": "Department details"},
        401: {"description": "Not authenticated"},
        404: {"description": "Department not found"},
    },
)
async def get_department(
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    service: DepartmentService = Depends(get_department_service),
) -> DepartmentResponse:
    """
    Get a department by ID.

    Requires authentication.

    Args:
        department_id: Department UUID
        current_user: Authenticated user
        service: Department service

    Returns:
        Department details

    Raises:
        HTTPException: 404 if department not found
    """
    department = await service.get_department(department_id)
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Department {department_id} not found",
        )
    return department


@router.put(
    "/{department_id}",
    response_model=DepartmentResponse,
    responses={
        200: {"description": "Department updated successfully"},
        400: {"description": "Invalid input or company not found"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized"},
        404: {"description": "Department not found"},
    },
)
async def update_department(
    department_id: UUID,
    data: DepartmentUpdate,
    current_user: User = Depends(get_current_user),
    service: DepartmentService = Depends(get_department_service),
) -> DepartmentResponse:
    """
    Update a department.

    Requires admin or project_manager role.

    Args:
        department_id: Department UUID
        data: Department update data
        current_user: Authenticated user
        service: Department service

    Returns:
        Updated department

    Raises:
        HTTPException: 400 if company not found
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not authorized
        HTTPException: 404 if department not found
    """
    # Check authorization
    if current_user.role not in ["admin", "project_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and project_manager roles can update departments",
        )

    try:
        department = await service.update_department(department_id, data)
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department {department_id} not found",
            )

        logger.info(f"Department updated: {department_id} by user {current_user.id}")
        return department
    except ValueError as e:
        logger.error(f"Failed to update department: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete(
    "/{department_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        204: {"description": "Department deleted successfully"},
        400: {"description": "Cannot delete department with resources"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized"},
        404: {"description": "Department not found"},
    },
)
async def delete_department(
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    service: DepartmentService = Depends(get_department_service),
) -> None:
    """
    Delete a department.

    Requires admin role only.

    Args:
        department_id: Department UUID
        current_user: Authenticated user
        service: Department service

    Raises:
        HTTPException: 400 if department has resources
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not authorized
        HTTPException: 404 if department not found
    """
    # Check authorization - only admin can delete
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin role can delete departments",
        )

    try:
        deleted = await service.delete_department(department_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Department {department_id} not found",
            )

        logger.info(f"Department deleted: {department_id} by user {current_user.id}")
    except ValueError as e:
        logger.error(f"Failed to delete department: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/{department_id}/company",
    response_model=dict,
    responses={
        200: {"description": "Company details"},
        401: {"description": "Not authenticated"},
        404: {"description": "Department or company not found"},
    },
)
async def get_department_company(
    department_id: UUID,
    current_user: User = Depends(get_current_user),
    service: DepartmentService = Depends(get_department_service),
) -> dict:
    """
    Get the company that owns a department.

    Requires authentication.

    Args:
        department_id: Department UUID
        current_user: Authenticated user
        service: Department service

    Returns:
        Company details

    Raises:
        HTTPException: 404 if department or company not found
    """
    company = await service.get_department_company(department_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company for department {department_id} not found",
        )
    return company

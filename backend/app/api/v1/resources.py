"""API endpoints for Resource management"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user, get_graph_service
from app.db.graph import GraphService
from app.models.user import User
from app.schemas.resource import (
    ResourceAllocationCreate,
    ResourceAllocationResponse,
    ResourceAllocationUpdate,
    ResourceCreate,
    ResourceResponse,
    ResourceUpdate,
)
from app.services.resource_service import ResourceService

logger = logging.getLogger(__name__)

router = APIRouter()


def get_resource_service(
    graph_service: GraphService = Depends(get_graph_service),
) -> ResourceService:
    """Dependency for getting resource service"""
    return ResourceService(graph_service)


@router.post(
    "",
    response_model=ResourceResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "Resource created successfully"},
        400: {"description": "Invalid input or department not found"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized"},
    },
)
async def create_resource(
    data: ResourceCreate,
    current_user: User = Depends(get_current_user),
    service: ResourceService = Depends(get_resource_service),
) -> ResourceResponse:
    """
    Create a new resource.

    Requires admin or project_manager role.

    Args:
        data: Resource creation data including name, type, capacity, department_id, and optional skills
        current_user: Authenticated user
        service: Resource service

    Returns:
        Created resource with metadata

    Raises:
        HTTPException: 400 if department not found or invalid data
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not authorized
    """
    # Check authorization
    if current_user.role not in ["admin", "project_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and project_manager roles can create resources",
        )

    try:
        resource = await service.create_resource(data)
        logger.info(f"Resource created: {resource.id} by user {current_user.id}")
        return resource
    except ValueError as e:
        logger.error(f"Failed to create resource: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "",
    response_model=list[ResourceResponse],
    responses={
        200: {"description": "List of resources"},
        401: {"description": "Not authenticated"},
    },
)
async def list_resources(
    department_id: UUID | None = Query(None, description="Filter by department"),
    resource_type: str | None = Query(None, description="Filter by type"),
    availability: str | None = Query(None, description="Filter by availability"),
    skills: list[str] | None = Query(None, description="Filter by skills (must have all)"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    current_user: User = Depends(get_current_user),
    service: ResourceService = Depends(get_resource_service),
) -> list[ResourceResponse]:
    """
    List resources with optional filters.

    Requires authentication.

    Args:
        department_id: Optional department filter
        resource_type: Optional type filter (person, machine, equipment, facility, other)
        availability: Optional availability filter (available, unavailable, limited)
        skills: Optional skills filter (resources must have all specified skills)
        limit: Maximum number of resources to return (default 100)
        current_user: Authenticated user
        service: Resource service

    Returns:
        List of resources
    """
    resources = await service.list_resources(
        department_id=department_id,
        resource_type=resource_type,
        availability=availability,
        skills=skills,
        limit=limit,
    )
    return resources


@router.get(
    "/{resource_id}",
    response_model=ResourceResponse,
    responses={
        200: {"description": "Resource details"},
        401: {"description": "Not authenticated"},
        404: {"description": "Resource not found"},
    },
)
async def get_resource(
    resource_id: UUID,
    current_user: User = Depends(get_current_user),
    service: ResourceService = Depends(get_resource_service),
) -> ResourceResponse:
    """
    Get a resource by ID.

    Requires authentication.

    Args:
        resource_id: Resource UUID
        current_user: Authenticated user
        service: Resource service

    Returns:
        Resource details

    Raises:
        HTTPException: 404 if resource not found
    """
    resource = await service.get_resource(resource_id)
    if not resource:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Resource {resource_id} not found",
        )
    return resource


@router.patch(
    "/{resource_id}",
    response_model=ResourceResponse,
    responses={
        200: {"description": "Resource updated successfully"},
        400: {"description": "Invalid input"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized"},
        404: {"description": "Resource not found"},
    },
)
async def update_resource(
    resource_id: UUID,
    data: ResourceUpdate,
    current_user: User = Depends(get_current_user),
    service: ResourceService = Depends(get_resource_service),
) -> ResourceResponse:
    """
    Update a resource.

    Requires admin or project_manager role.

    Args:
        resource_id: Resource UUID
        data: Resource update data
        current_user: Authenticated user
        service: Resource service

    Returns:
        Updated resource

    Raises:
        HTTPException: 400 if invalid data
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not authorized
        HTTPException: 404 if resource not found
    """
    # Check authorization
    if current_user.role not in ["admin", "project_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and project_manager roles can update resources",
        )

    try:
        resource = await service.update_resource(resource_id, data)
        if not resource:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resource {resource_id} not found",
            )
        logger.info(f"Resource updated: {resource_id} by user {current_user.id}")
        return resource
    except ValueError as e:
        logger.error(f"Failed to update resource: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete(
    "/{resource_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        204: {"description": "Resource deleted successfully"},
        400: {"description": "Resource has active allocations"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized"},
        404: {"description": "Resource not found"},
    },
)
async def delete_resource(
    resource_id: UUID,
    current_user: User = Depends(get_current_user),
    service: ResourceService = Depends(get_resource_service),
) -> None:
    """
    Delete a resource.

    Requires admin role.
    Cannot delete resources with active allocations.

    Args:
        resource_id: Resource UUID
        current_user: Authenticated user
        service: Resource service

    Raises:
        HTTPException: 400 if resource has active allocations
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not authorized
        HTTPException: 404 if resource not found
    """
    # Check authorization
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin role can delete resources",
        )

    try:
        deleted = await service.delete_resource(resource_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Resource {resource_id} not found",
            )
        logger.info(f"Resource deleted: {resource_id} by user {current_user.id}")
    except ValueError as e:
        logger.error(f"Failed to delete resource: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/{resource_id}/allocate",
    response_model=ResourceAllocationResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        201: {"description": "Resource allocated successfully"},
        400: {"description": "Invalid allocation or resource already allocated"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized"},
        404: {"description": "Resource or target not found"},
    },
)
async def allocate_resource(
    resource_id: UUID,
    data: ResourceAllocationCreate,
    current_user: User = Depends(get_current_user),
    service: ResourceService = Depends(get_resource_service),
) -> ResourceAllocationResponse:
    """
    Allocate a resource to a project or task.

    Requires admin or project_manager role.
    A resource can be allocated to a project OR a task, not both.

    Args:
        resource_id: Resource UUID
        data: Allocation data including target_id, target_type, allocation_percentage, and lead flag
        current_user: Authenticated user
        service: Resource service

    Returns:
        Created allocation

    Raises:
        HTTPException: 400 if invalid allocation or resource already allocated to incompatible target
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not authorized
        HTTPException: 404 if resource or target not found
    """
    # Check authorization
    if current_user.role not in ["admin", "project_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and project_manager roles can allocate resources",
        )

    # Ensure resource_id matches
    if data.resource_id != resource_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Resource ID in path must match resource ID in body",
        )

    try:
        allocation = await service.allocate_resource(data)
        logger.info(
            f"Resource {resource_id} allocated to {data.target_type} {data.target_id} "
            f"by user {current_user.id} (lead={data.lead})"
        )
        return allocation
    except ValueError as e:
        logger.error(f"Failed to allocate resource: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch(
    "/{resource_id}/allocate/{target_id}",
    response_model=ResourceAllocationResponse,
    responses={
        200: {"description": "Allocation updated successfully"},
        400: {"description": "Invalid allocation data"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized"},
        404: {"description": "Allocation not found"},
    },
)
async def update_allocation(
    resource_id: UUID,
    target_id: UUID,
    data: ResourceAllocationUpdate,
    current_user: User = Depends(get_current_user),
    service: ResourceService = Depends(get_resource_service),
) -> ResourceAllocationResponse:
    """
    Update a resource allocation.

    Requires admin or project_manager role.

    Args:
        resource_id: Resource UUID
        target_id: Project or Task UUID
        data: Allocation update data
        current_user: Authenticated user
        service: Resource service

    Returns:
        Updated allocation

    Raises:
        HTTPException: 400 if invalid data
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not authorized
        HTTPException: 404 if allocation not found
    """
    # Check authorization
    if current_user.role not in ["admin", "project_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and project_manager roles can update allocations",
        )

    try:
        allocation = await service.update_allocation(resource_id, target_id, data)
        logger.info(
            f"Allocation updated: resource {resource_id} to target {target_id} "
            f"by user {current_user.id}"
        )
        return allocation
    except ValueError as e:
        logger.error(f"Failed to update allocation: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete(
    "/{resource_id}/allocate/{target_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        204: {"description": "Allocation removed successfully"},
        401: {"description": "Not authenticated"},
        403: {"description": "Not authorized"},
        404: {"description": "Allocation not found"},
    },
)
async def remove_allocation(
    resource_id: UUID,
    target_id: UUID,
    current_user: User = Depends(get_current_user),
    service: ResourceService = Depends(get_resource_service),
) -> None:
    """
    Remove a resource allocation.

    Requires admin or project_manager role.

    Args:
        resource_id: Resource UUID
        target_id: Project or Task UUID
        current_user: Authenticated user
        service: Resource service

    Raises:
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not authorized
        HTTPException: 404 if allocation not found
    """
    # Check authorization
    if current_user.role not in ["admin", "project_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin and project_manager roles can remove allocations",
        )

    removed = await service.remove_allocation(resource_id, target_id)
    if not removed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Allocation not found for resource {resource_id} and target {target_id}",
        )
    logger.info(
        f"Allocation removed: resource {resource_id} from target {target_id} "
        f"by user {current_user.id}"
    )


@router.get(
    "/{resource_id}/allocations",
    response_model=list[ResourceAllocationResponse],
    responses={
        200: {"description": "List of resource allocations"},
        401: {"description": "Not authenticated"},
    },
)
async def get_resource_allocations(
    resource_id: UUID,
    current_user: User = Depends(get_current_user),
    service: ResourceService = Depends(get_resource_service),
) -> list[ResourceAllocationResponse]:
    """
    Get all allocations for a resource.

    Requires authentication.

    Args:
        resource_id: Resource UUID
        current_user: Authenticated user
        service: Resource service

    Returns:
        List of allocations
    """
    allocations = await service.get_resource_allocations(resource_id)
    return allocations


@router.get(
    "/projects/{project_id}/lead-resources",
    response_model=list[ResourceResponse],
    responses={
        200: {"description": "List of lead resources for project"},
        401: {"description": "Not authenticated"},
    },
)
async def get_lead_resources_for_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    service: ResourceService = Depends(get_resource_service),
) -> list[ResourceResponse]:
    """
    Get all lead resources allocated to a project.

    Requires authentication.

    Args:
        project_id: Project UUID
        current_user: Authenticated user
        service: Resource service

    Returns:
        List of lead resources
    """
    resources = await service.get_lead_resources_for_project(project_id)
    return resources


@router.get(
    "/tasks/{task_id}/lead-resources",
    response_model=list[ResourceResponse],
    responses={
        200: {"description": "List of lead resources for task"},
        401: {"description": "Not authenticated"},
    },
)
async def get_lead_resources_for_task(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    service: ResourceService = Depends(get_resource_service),
) -> list[ResourceResponse]:
    """
    Get all lead resources allocated to a task.

    Requires authentication.

    Args:
        task_id: Task UUID (WorkItem with type='task')
        current_user: Authenticated user
        service: Resource service

    Returns:
        List of lead resources
    """
    resources = await service.get_lead_resources_for_task(task_id)
    return resources

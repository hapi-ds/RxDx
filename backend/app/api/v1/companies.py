"""API endpoints for Company management"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user, get_graph_service
from app.db.graph import GraphService
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyResponse, CompanyUpdate
from app.services.company_service import CompanyService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/companies", tags=["companies"])


def get_company_service(
    graph_service: GraphService = Depends(get_graph_service),
) -> CompanyService:
    """Dependency to get CompanyService instance"""
    return CompanyService(graph_service)


@router.post(
    "",
    response_model=CompanyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new company",
)
async def create_company(
    company_data: CompanyCreate,
    current_user: User = Depends(get_current_user),
    service: CompanyService = Depends(get_company_service),
) -> CompanyResponse:
    """
    Create a new company in the graph database.

    Args:
        company_data: Company creation data including name and description
        current_user: Authenticated user (requires admin role)
        service: Company service instance

    Returns:
        Created company with metadata

    Raises:
        HTTPException: 400 if validation fails
        HTTPException: 401 if not authenticated
        HTTPException: 403 if not authorized
    """
    # Check if user has admin or project_manager role
    if current_user.role not in ["admin", "project_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and project managers can create companies",
        )

    try:
        company = await service.create_company(company_data)
        logger.info(f"Company created: {company.id} by user {current_user.id}")
        return company
    except ValueError as e:
        logger.error(f"Failed to create company: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "",
    response_model=list[CompanyResponse],
    summary="List all companies",
)
async def list_companies(
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    service: CompanyService = Depends(get_company_service),
) -> list[CompanyResponse]:
    """
    List all companies.

    Args:
        limit: Maximum number of companies to return (default 100)
        current_user: Authenticated user
        service: Company service instance

    Returns:
        List of companies
    """
    companies = await service.list_companies(limit=limit)
    return companies


@router.get(
    "/{company_id}",
    response_model=CompanyResponse,
    summary="Get a company by ID",
)
async def get_company(
    company_id: UUID,
    current_user: User = Depends(get_current_user),
    service: CompanyService = Depends(get_company_service),
) -> CompanyResponse:
    """
    Get a company by ID.

    Args:
        company_id: Company UUID
        current_user: Authenticated user
        service: Company service instance

    Returns:
        Company details

    Raises:
        HTTPException: 404 if company not found
    """
    company = await service.get_company(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found",
        )
    return company


@router.put(
    "/{company_id}",
    response_model=CompanyResponse,
    summary="Update a company",
)
async def update_company(
    company_id: UUID,
    updates: CompanyUpdate,
    current_user: User = Depends(get_current_user),
    service: CompanyService = Depends(get_company_service),
) -> CompanyResponse:
    """
    Update a company.

    Args:
        company_id: Company UUID
        updates: Company update data
        current_user: Authenticated user (requires admin role)
        service: Company service instance

    Returns:
        Updated company

    Raises:
        HTTPException: 404 if company not found
        HTTPException: 403 if not authorized
    """
    # Check if user has admin or project_manager role
    if current_user.role not in ["admin", "project_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins and project managers can update companies",
        )

    company = await service.update_company(company_id, updates)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found",
        )

    logger.info(f"Company updated: {company_id} by user {current_user.id}")
    return company


@router.delete(
    "/{company_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a company",
)
async def delete_company(
    company_id: UUID,
    current_user: User = Depends(get_current_user),
    service: CompanyService = Depends(get_company_service),
) -> None:
    """
    Delete a company and cascade delete all related departments.

    Args:
        company_id: Company UUID
        current_user: Authenticated user (requires admin role)
        service: Company service instance

    Raises:
        HTTPException: 404 if company not found
        HTTPException: 403 if not authorized
    """
    # Check if user has admin role
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete companies",
        )

    success = await service.delete_company(company_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found",
        )

    logger.info(f"Company deleted: {company_id} by user {current_user.id}")


@router.get(
    "/{company_id}/departments",
    response_model=list[dict],
    summary="Get all departments for a company",
)
async def get_company_departments(
    company_id: UUID,
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service),
) -> list[dict]:
    """
    Get all departments belonging to a company.

    Args:
        company_id: Company UUID
        current_user: Authenticated user
        graph_service: Graph service instance

    Returns:
        List of departments

    Raises:
        HTTPException: 404 if company not found
    """
    # First check if company exists
    service = CompanyService(graph_service)
    company = await service.get_company(company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found",
        )

    # Query departments
    query = f"""
    MATCH (c:Company {{id: '{str(company_id)}'}})-[:PARENT_OF]->(d:Department)
    RETURN d
    ORDER BY d.name
    """

    try:
        results = await graph_service.execute_query(query)
        departments = []
        for result in results:
            dept_data = result
            if "properties" in dept_data:
                dept_data = dept_data["properties"]
            departments.append(dept_data)

        return departments
    except Exception as e:
        logger.error(f"Failed to get departments for company {company_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve departments",
        )

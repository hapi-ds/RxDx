"""
Test management API endpoints.

This module provides REST API endpoints for test specification and test run management
as per Requirement 9 (Verification and Validation Management).
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import Permission, require_permission
from app.db.graph import get_graph_service
from app.models.user import User
from app.schemas.test import (
    TestCoverageResponse,
    TestRunCreate,
    TestRunListResponse,
    TestRunResponse,
    TestRunUpdate,
    TestSpecCreate,
    TestSpecListResponse,
    TestSpecResponse,
    TestSpecUpdate,
)
from app.services.audit_service import get_audit_service
from app.services.signature_service import get_signature_service
from app.services.test_service import TestService
from app.services.version_service import get_version_service

router = APIRouter()


async def get_test_service(
    db: AsyncSession = Depends(get_db),
) -> TestService:
    """Get test service instance with dependencies."""
    graph_service = await get_graph_service()
    audit_service = await get_audit_service(db)
    signature_service = await get_signature_service(db)
    version_service = await get_version_service()

    return TestService(
        graph_service=graph_service,
        audit_service=audit_service,
        signature_service=signature_service,
        version_service=version_service,
    )


@router.get("/", response_model=TestSpecListResponse)
@require_permission(Permission.READ_WORKITEM)
async def get_test_specs(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    test_type: str | None = Query(None, description="Filter by test type"),
    linked_requirement_id: UUID | None = Query(None, description="Filter by linked requirement"),
    test_service: TestService = Depends(get_test_service),
    current_user: User = Depends(get_current_user),
) -> TestSpecListResponse:
    """
    Get test specifications with optional filtering and pagination.
    
    - **page**: Page number (1-based)
    - **size**: Number of items per page (1-100)
    - **test_type**: Filter by test type (unit, integration, system, acceptance, regression)
    - **linked_requirement_id**: Filter by linked requirement ID
    """
    offset = (page - 1) * size

    test_specs = await test_service.get_test_specs(
        limit=size,
        offset=offset,
        test_type=test_type,
        linked_requirement_id=linked_requirement_id,
    )

    # Calculate total count for pagination (simplified for now)
    total = len(test_specs)  # In production, this should be a separate count query
    pages = (total + size - 1) // size

    return TestSpecListResponse(
        items=test_specs,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get("/coverage", response_model=TestCoverageResponse)
@require_permission(Permission.READ_WORKITEM)
async def get_test_coverage(
    test_service: TestService = Depends(get_test_service),
    current_user: User = Depends(get_current_user),
) -> TestCoverageResponse:
    """
    Get test coverage metrics across all requirements.
    
    Returns:
    - **total_requirements**: Total number of requirements
    - **requirements_with_tests**: Requirements with linked test specs
    - **requirements_with_passing_tests**: Requirements with passing test runs
    - **coverage_percentage**: Test coverage percentage
    - **detailed_coverage**: Detailed coverage per requirement
    """
    return await test_service.calculate_test_coverage()


@router.post("/", response_model=TestSpecResponse, status_code=status.HTTP_201_CREATED)
@require_permission(Permission.WRITE_WORKITEM)
async def create_test_spec(
    test_spec_data: TestSpecCreate,
    test_service: TestService = Depends(get_test_service),
    current_user: User = Depends(get_current_user),
) -> TestSpecResponse:
    """
    Create a new test specification.
    
    - **title**: Test specification title (required)
    - **description**: Detailed test description
    - **test_type**: Type of test (unit, integration, system, acceptance, regression)
    - **priority**: Test priority (1=highest, 5=lowest)
    - **preconditions**: Prerequisites for test execution
    - **test_steps**: List of test steps with expected results
    - **linked_requirements**: List of requirement IDs this test validates
    """
    try:
        return await test_service.create_test_spec(test_spec_data, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{test_spec_id}", response_model=TestSpecResponse)
@require_permission(Permission.READ_WORKITEM)
async def get_test_spec(
    test_spec_id: UUID,
    test_service: TestService = Depends(get_test_service),
    current_user: User = Depends(get_current_user),
) -> TestSpecResponse:
    """
    Get a specific test specification by ID.
    
    - **test_spec_id**: Test specification UUID
    """
    test_spec = await test_service.get_test_spec(test_spec_id)
    if not test_spec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Test specification {test_spec_id} not found"
        )
    return test_spec


@router.patch("/{test_spec_id}", response_model=TestSpecResponse)
@require_permission(Permission.WRITE_WORKITEM)
async def update_test_spec(
    test_spec_id: UUID,
    updates: TestSpecUpdate,
    change_description: str = Query(..., description="Description of changes made"),
    test_service: TestService = Depends(get_test_service),
    current_user: User = Depends(get_current_user),
) -> TestSpecResponse:
    """
    Update a test specification, creating a new version.
    
    - **test_spec_id**: Test specification UUID
    - **change_description**: Required description of changes made
    - Updates create new versions and invalidate existing signatures
    """
    try:
        return await test_service.update_test_spec(
            test_spec_id, updates, current_user, change_description
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{test_spec_id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permission(Permission.DELETE_WORKITEM)
async def delete_test_spec(
    test_spec_id: UUID,
    test_service: TestService = Depends(get_test_service),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a test specification.
    
    - **test_spec_id**: Test specification UUID
    - Cannot delete test specifications with valid signatures
    """
    try:
        await test_service.delete_test_spec(test_spec_id, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/{test_spec_id}/runs", response_model=TestRunResponse, status_code=status.HTTP_201_CREATED)
@require_permission(Permission.WRITE_WORKITEM)
async def create_test_run(
    test_spec_id: UUID,
    test_run_data: TestRunCreate,
    test_service: TestService = Depends(get_test_service),
    current_user: User = Depends(get_current_user),
) -> TestRunResponse:
    """
    Create a new test run for a test specification.
    
    - **test_spec_id**: Test specification UUID
    - **test_spec_version**: Version of test spec being executed
    - **executed_by**: User executing the test
    - **environment**: Test environment details
    - **overall_status**: Overall test result (pass, fail, blocked, not_run)
    - **step_results**: Results for each test step
    - **failure_description**: Required if overall_status is 'fail'
    - **defect_workitem_ids**: Linked defect WorkItems
    """
    # Ensure test_spec_id matches the URL parameter
    if test_run_data.test_spec_id != test_spec_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Test spec ID in URL must match test spec ID in request body"
        )

    try:
        return await test_service.create_test_run(test_run_data, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{test_spec_id}/runs", response_model=TestRunListResponse)
@require_permission(Permission.READ_WORKITEM)
async def get_test_runs(
    test_spec_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    test_service: TestService = Depends(get_test_service),
    current_user: User = Depends(get_current_user),
) -> TestRunListResponse:
    """
    Get all test runs for a specific test specification.
    
    - **test_spec_id**: Test specification UUID
    - **page**: Page number (1-based)
    - **size**: Number of items per page (1-100)
    """
    offset = (page - 1) * size

    test_runs = await test_service.get_test_runs_for_spec(
        test_spec_id, limit=size, offset=offset
    )

    # Calculate total count for pagination (simplified for now)
    total = len(test_runs)  # In production, this should be a separate count query
    pages = (total + size - 1) // size

    return TestRunListResponse(
        items=test_runs,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.patch("/runs/{run_id}", response_model=TestRunResponse)
@require_permission(Permission.WRITE_WORKITEM)
async def update_test_run(
    run_id: UUID,
    updates: TestRunUpdate,
    test_service: TestService = Depends(get_test_service),
    current_user: User = Depends(get_current_user),
) -> TestRunResponse:
    """
    Update a test run with new results.
    
    - **run_id**: Test run UUID
    - **overall_status**: Updated test result
    - **step_results**: Updated results for test steps
    - **failure_description**: Required if overall_status is 'fail'
    - **defect_workitem_ids**: Updated linked defect WorkItems
    - **execution_notes**: Additional execution notes
    """
    try:
        return await test_service.update_test_run(run_id, updates, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

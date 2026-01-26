"""
Risk management API endpoints for FMEA (Failure Mode and Effects Analysis).

This module provides REST API endpoints for risk node management, failure chains,
and mitigation tracking as per Requirement 10 (Risk Management with FMEA).
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import Permission, require_permission
from app.db.graph import get_graph_service
from app.models.user import User
from app.schemas.risk import (
    FailureNodeCreate,
    LeadsToRelationshipCreate,
    LeadsToRelationshipResponse,
    MitigationActionCreate,
    MitigationActionListResponse,
    MitigationActionResponse,
    MitigationStatus,
    RiskChainResponse,
    RiskNodeCreate,
    RiskNodeListResponse,
    RiskNodeResponse,
    RiskNodeUpdate,
    RiskStatus,
    RPNAnalysisResponse,
)
from app.services.audit_service import get_audit_service
from app.services.risk_service import RiskService
from app.services.signature_service import get_signature_service
from app.services.version_service import get_version_service

router = APIRouter()


async def get_risk_service(
    db: AsyncSession = Depends(get_db),
) -> RiskService:
    """Get risk service instance with dependencies."""
    graph_service = await get_graph_service()
    audit_service = await get_audit_service(db)
    signature_service = await get_signature_service(db)
    version_service = await get_version_service()

    return RiskService(
        graph_service=graph_service,
        audit_service=audit_service,
        signature_service=signature_service,
        version_service=version_service,
    )


# ============================================================================
# Risk Node Endpoints (10.2.1 - 10.2.4)
# ============================================================================

@router.get("/", response_model=RiskNodeListResponse)
@require_permission(Permission.READ_WORKITEM)
async def get_risks(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    risk_status: RiskStatus | None = Query(None, alias="status", description="Filter by risk status"),
    min_rpn: int | None = Query(None, ge=1, le=1000, description="Minimum RPN filter"),
    max_rpn: int | None = Query(None, ge=1, le=1000, description="Maximum RPN filter"),
    risk_owner: UUID | None = Query(None, description="Filter by risk owner"),
    risk_service: RiskService = Depends(get_risk_service),
    current_user: User = Depends(get_current_user),
) -> RiskNodeListResponse:
    """
    Get risk nodes with optional filtering and pagination.

    - **page**: Page number (1-based)
    - **size**: Number of items per page (1-100)
    - **status**: Filter by risk status (draft, identified, assessed, mitigated, accepted, closed, archived)
    - **min_rpn**: Minimum Risk Priority Number filter
    - **max_rpn**: Maximum Risk Priority Number filter
    - **risk_owner**: Filter by risk owner user ID

    Returns paginated list of risk nodes with RPN calculations.
    """
    offset = (page - 1) * size

    risks = await risk_service.get_risks(
        status=risk_status,
        min_rpn=min_rpn,
        max_rpn=max_rpn,
        risk_owner=risk_owner,
        limit=size,
        offset=offset,
    )

    # Calculate total count for pagination
    total = len(risks)
    pages = (total + size - 1) // size if total > 0 else 0

    return RiskNodeListResponse(
        items=risks,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


# NOTE: /high-rpn must be defined BEFORE /{risk_id} to avoid route conflicts
@router.get("/high-rpn", response_model=list[RiskNodeResponse])
@require_permission(Permission.READ_WORKITEM)
async def get_high_rpn_risks(
    threshold: int | None = Query(None, ge=1, le=1000, description="RPN threshold (default: 100)"),
    risk_service: RiskService = Depends(get_risk_service),
    current_user: User = Depends(get_current_user),
) -> list[RiskNodeResponse]:
    """
    Get risks with RPN above threshold that require mitigation.

    - **threshold**: RPN threshold (default: 100 for high-risk)

    Returns list of risks requiring mitigation action.
    """
    return await risk_service.get_high_rpn_risks(threshold=threshold)


@router.post("/", response_model=RiskNodeResponse, status_code=status.HTTP_201_CREATED)
@require_permission(Permission.WRITE_WORKITEM)
async def create_risk(
    risk_data: RiskNodeCreate,
    risk_service: RiskService = Depends(get_risk_service),
    current_user: User = Depends(get_current_user),
) -> RiskNodeResponse:
    """
    Create a new risk node with FMEA ratings.

    - **title**: Risk title (required, 5-500 characters)
    - **description**: Detailed risk description
    - **status**: Risk status (default: draft)
    - **severity**: Severity rating 1-10 (required, 10=highest impact)
    - **occurrence**: Occurrence rating 1-10 (required, 10=most frequent)
    - **detection**: Detection rating 1-10 (required, 10=hardest to detect)
    - **risk_category**: Category (technical, schedule, resource, cost, quality, safety, etc.)
    - **failure_mode**: Description of the failure mode
    - **failure_effect**: Effect of the failure on system/user
    - **failure_cause**: Root cause of the potential failure
    - **current_controls**: Current prevention/detection controls
    - **risk_owner**: User responsible for managing this risk
    - **linked_design_items**: Design WorkItems this risk is linked to
    - **linked_process_items**: Process WorkItems this risk is linked to

    RPN (Risk Priority Number) is automatically calculated as severity × occurrence × detection.
    """
    try:
        return await risk_service.create_risk(risk_data, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{risk_id}", response_model=RiskNodeResponse)
@require_permission(Permission.READ_WORKITEM)
async def get_risk(
    risk_id: UUID,
    risk_service: RiskService = Depends(get_risk_service),
    current_user: User = Depends(get_current_user),
) -> RiskNodeResponse:
    """
    Get a specific risk node by ID.

    - **risk_id**: Risk node UUID

    Returns the risk node with calculated RPN and linked items.
    """
    risk = await risk_service.get_risk(risk_id)
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Risk {risk_id} not found"
        )
    return risk


@router.patch("/{risk_id}", response_model=RiskNodeResponse)
@require_permission(Permission.WRITE_WORKITEM)
async def update_risk(
    risk_id: UUID,
    updates: RiskNodeUpdate,
    change_description: str = Query(..., description="Description of changes made"),
    risk_service: RiskService = Depends(get_risk_service),
    current_user: User = Depends(get_current_user),
) -> RiskNodeResponse:
    """
    Update a risk node, creating a new version.

    - **risk_id**: Risk node UUID
    - **change_description**: Required description of changes made

    Updates create new versions and invalidate existing signatures.
    RPN is automatically recalculated if severity, occurrence, or detection changes.
    """
    try:
        return await risk_service.update_risk(
            risk_id, updates, current_user, change_description
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/{risk_id}", status_code=status.HTTP_204_NO_CONTENT)
@require_permission(Permission.DELETE_WORKITEM)
async def delete_risk(
    risk_id: UUID,
    risk_service: RiskService = Depends(get_risk_service),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a risk node.

    - **risk_id**: Risk node UUID

    Cannot delete risks with valid digital signatures.
    """
    try:
        await risk_service.delete_risk(risk_id, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


# ============================================================================
# Failure Chain Endpoints (10.2.5 - 10.2.6)
# ============================================================================

@router.post("/{risk_id}/failures", response_model=LeadsToRelationshipResponse, status_code=status.HTTP_201_CREATED)
@require_permission(Permission.WRITE_WORKITEM)
async def create_failure_chain(
    risk_id: UUID,
    failure_data: FailureNodeCreate,
    probability: float = Query(..., ge=0.0, le=1.0, description="Probability of failure occurring"),
    rationale: str | None = Query(None, description="Rationale for probability assessment"),
    risk_service: RiskService = Depends(get_risk_service),
    current_user: User = Depends(get_current_user),
) -> LeadsToRelationshipResponse:
    """
    Create a failure node and link it to a risk via LEADS_TO relationship.

    - **risk_id**: Source risk node UUID
    - **probability**: Probability of this failure occurring (0.0 to 1.0)
    - **rationale**: Rationale for the probability assessment
    - **failure_data**: Failure node data including description, impact, type

    Creates both the Failure node and the LEADS_TO relationship with probability attribute.
    """
    # First verify the risk exists
    risk = await risk_service.get_risk(risk_id)
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Risk {risk_id} not found"
        )

    try:
        # Create the failure node
        failure = await risk_service.create_failure(failure_data, current_user)

        # Create the LEADS_TO relationship
        relationship_data = LeadsToRelationshipCreate(
            from_id=risk_id,
            to_id=failure.id,
            probability=probability,
            rationale=rationale,
        )

        return await risk_service.create_failure_chain(relationship_data, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{risk_id}/chains", response_model=list[RiskChainResponse])
@require_permission(Permission.READ_WORKITEM)
async def get_risk_chains(
    risk_id: UUID,
    max_depth: int = Query(5, ge=1, le=10, description="Maximum chain depth to traverse"),
    risk_service: RiskService = Depends(get_risk_service),
    current_user: User = Depends(get_current_user),
) -> list[RiskChainResponse]:
    """
    Get failure chains showing risk propagation paths.

    - **risk_id**: Starting risk node UUID
    - **max_depth**: Maximum chain depth to traverse (1-10, default 5)

    Returns list of failure chains with:
    - Chain nodes (risks and failures)
    - Chain edges with probabilities
    - Total probability (product of all step probabilities)
    - Chain length
    """
    # First verify the risk exists
    risk = await risk_service.get_risk(risk_id)
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Risk {risk_id} not found"
        )

    return await risk_service.get_risk_chains(risk_id=risk_id, max_depth=max_depth)


# ============================================================================
# Mitigation Endpoints (10.2.7)
# ============================================================================

@router.post("/{risk_id}/mitigations", response_model=MitigationActionResponse, status_code=status.HTTP_201_CREATED)
@require_permission(Permission.WRITE_WORKITEM)
async def create_mitigation(
    risk_id: UUID,
    mitigation_data: MitigationActionCreate,
    risk_service: RiskService = Depends(get_risk_service),
    current_user: User = Depends(get_current_user),
) -> MitigationActionResponse:
    """
    Create a mitigation action for a risk.

    - **risk_id**: Risk node UUID
    - **title**: Mitigation action title (required)
    - **description**: Detailed description of the mitigation action
    - **action_type**: Type of mitigation (prevention, detection, contingency, transfer, acceptance)
    - **status**: Mitigation status (default: planned)
    - **assigned_to**: User responsible for implementing this mitigation
    - **due_date**: Target completion date
    - **expected_severity_reduction**: Expected reduction in severity rating (0-9)
    - **expected_occurrence_reduction**: Expected reduction in occurrence rating (0-9)
    - **expected_detection_improvement**: Expected improvement in detection rating (0-9)
    - **verification_method**: How the mitigation effectiveness will be verified
    """
    # Ensure risk_id matches the URL parameter
    if mitigation_data.risk_id != risk_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Risk ID in URL must match risk ID in request body"
        )

    # Verify the risk exists
    risk = await risk_service.get_risk(risk_id)
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Risk {risk_id} not found"
        )

    try:
        return await risk_service.create_mitigation(mitigation_data, current_user)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{risk_id}/mitigations", response_model=MitigationActionListResponse)
@require_permission(Permission.READ_WORKITEM)
async def get_risk_mitigations(
    risk_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    mitigation_status: MitigationStatus | None = Query(None, alias="status", description="Filter by mitigation status"),
    risk_service: RiskService = Depends(get_risk_service),
    current_user: User = Depends(get_current_user),
) -> MitigationActionListResponse:
    """
    Get all mitigation actions for a specific risk.

    - **risk_id**: Risk node UUID
    - **page**: Page number (1-based)
    - **size**: Number of items per page (1-100)
    - **status**: Filter by mitigation status (planned, in_progress, completed, verified, cancelled)
    """
    # Verify the risk exists
    risk = await risk_service.get_risk(risk_id)
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Risk {risk_id} not found"
        )

    mitigations = await risk_service.get_risk_mitigations(risk_id, status=mitigation_status)

    # Apply pagination
    offset = (page - 1) * size
    paginated = mitigations[offset:offset + size]

    total = len(mitigations)
    pages = (total + size - 1) // size if total > 0 else 0

    return MitigationActionListResponse(
        items=paginated,
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


# ============================================================================
# Additional Risk Analysis Endpoints
# ============================================================================

@router.get("/{risk_id}/analysis", response_model=RPNAnalysisResponse)
@require_permission(Permission.READ_WORKITEM)
async def analyze_risk(
    risk_id: UUID,
    risk_service: RiskService = Depends(get_risk_service),
    current_user: User = Depends(get_current_user),
) -> RPNAnalysisResponse:
    """
    Analyze a risk and get RPN-based recommendations.

    - **risk_id**: Risk node UUID

    Returns:
    - RPN value and breakdown (severity, occurrence, detection)
    - Risk level (critical, high, medium, low)
    - Whether mitigation is required
    - Recommended mitigation deadline (if applicable)
    """
    try:
        return await risk_service.analyze_risk(risk_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

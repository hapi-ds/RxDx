"""
Document generation API endpoints.

This module provides REST API endpoints for generating compliance documents
including design reviews, traceability matrices, FMEA reports, and invoices
as per Requirement 8 (Document Generation).
"""

import io
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.core.security import Permission, require_permission
from app.db.graph import get_graph_service
from app.models.user import User
from app.schemas.document import (
    DesignReviewRequest,
    DesignReviewResponse,
    DocumentFormat,
    DocumentType,
    FMEARequest,
    FMEAResponse,
    InvoiceRequest,
    InvoiceResponse,
    TraceabilityMatrixRequest,
    TraceabilityMatrixResponse,
)
from app.services.audit_service import get_audit_service
from app.services.document_service import DocumentService
from app.services.signature_service import get_signature_service

router = APIRouter()


async def get_document_service(
    db: AsyncSession = Depends(get_db),
) -> DocumentService:
    """Get document service instance with dependencies."""
    graph_service = await get_graph_service()
    audit_service = await get_audit_service(db)
    signature_service = await get_signature_service(db)

    return DocumentService(
        graph_service=graph_service,
        audit_service=audit_service,
        signature_service=signature_service,
    )


# ============================================================================
# Design Review Endpoint (14.2.1)
# ============================================================================

@router.post(
    "/design-review",
    response_model=DesignReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Design Review PDF",
    description="Generate a design phase review PDF document with requirements and signatures.",
)
@require_permission(Permission.READ_WORKITEM)
async def generate_design_review(
    request: DesignReviewRequest,
    document_service: DocumentService = Depends(get_document_service),
    current_user: User = Depends(get_current_user),
) -> DesignReviewResponse:
    """
    Generate a design phase review PDF document.
    
    This endpoint generates a PDF document containing:
    - All requirements for the specified project
    - Requirement details (title, description, version, status, priority)
    - Digital signatures (if include_signatures is True)
    - Version history (if include_version_history is True)
    
    The generated document is stored and can be downloaded using the
    GET /api/v1/documents/{id} endpoint.
    
    **Required Permission:** READ_WORKITEM
    """
    try:
        response = await document_service.generate_design_review_pdf(
            request=request,
            user=current_user,
        )
        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate design review document: {str(e)}",
        )


# ============================================================================
# Traceability Matrix Endpoint (14.2.2)
# ============================================================================

@router.post(
    "/traceability-matrix",
    response_model=TraceabilityMatrixResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Traceability Matrix PDF",
    description="Generate a requirements traceability matrix PDF showing requirement-test-risk relationships.",
)
@require_permission(Permission.READ_WORKITEM)
async def generate_traceability_matrix(
    request: TraceabilityMatrixRequest,
    document_service: DocumentService = Depends(get_document_service),
    current_user: User = Depends(get_current_user),
) -> TraceabilityMatrixResponse:
    """
    Generate a requirements traceability matrix PDF document.
    
    This endpoint generates a PDF document containing:
    - Requirements with their linked tests and risks
    - Test coverage information
    - Risk linkage information
    - Signature status for each item
    - Coverage percentage summary
    
    The generated document is stored and can be downloaded using the
    GET /api/v1/documents/{id} endpoint.
    
    **Required Permission:** READ_WORKITEM
    """
    try:
        response = await document_service.generate_traceability_matrix_pdf(
            request=request,
            user=current_user,
        )
        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate traceability matrix document: {str(e)}",
        )


# ============================================================================
# FMEA Endpoint (14.2.3)
# ============================================================================

@router.post(
    "/fmea",
    response_model=FMEAResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate FMEA Excel",
    description="Generate an FMEA (Failure Mode and Effects Analysis) Excel document.",
)
@require_permission(Permission.READ_WORKITEM)
async def generate_fmea(
    request: FMEARequest,
    document_service: DocumentService = Depends(get_document_service),
    current_user: User = Depends(get_current_user),
) -> FMEAResponse:
    """
    Generate an FMEA Excel document.
    
    This endpoint generates an Excel document containing:
    - All risks with severity, occurrence, and detection ratings
    - RPN (Risk Priority Number) calculations
    - Failure chains showing risk propagation paths
    - Mitigation actions and their status
    - Color-coded RPN values for quick risk assessment
    - Summary sheet with statistics
    
    The generated document is stored and can be downloaded using the
    GET /api/v1/documents/{id} endpoint.
    
    **Required Permission:** READ_WORKITEM
    """
    try:
        response = await document_service.generate_fmea_excel(
            request=request,
            user=current_user,
        )
        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate FMEA document: {str(e)}",
        )


# ============================================================================
# Invoice Endpoint (14.2.4)
# ============================================================================

@router.post(
    "/invoice",
    response_model=InvoiceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Invoice Word Document",
    description="Generate an invoice Word document based on time entries.",
)
@require_permission(Permission.READ_WORKITEM)
async def generate_invoice(
    request: InvoiceRequest,
    document_service: DocumentService = Depends(get_document_service),
    current_user: User = Depends(get_current_user),
) -> InvoiceResponse:
    """
    Generate an invoice Word document.
    
    This endpoint generates a Word document containing:
    - Invoice header with number and date
    - Client information
    - Billing period
    - Line items aggregated from time entries
    - Subtotal, tax, and total calculations
    - Custom notes
    
    The document can use a custom Word template if specified.
    
    The generated document is stored and can be downloaded using the
    GET /api/v1/documents/{id} endpoint.
    
    **Required Permission:** READ_WORKITEM
    """
    try:
        response = await document_service.generate_invoice_word(
            request=request,
            user=current_user,
        )
        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate invoice document: {str(e)}",
        )


# ============================================================================
# Document Retrieval Endpoint (14.2.5)
# ============================================================================

@router.get(
    "/{document_id}",
    summary="Get Document",
    description="Retrieve a generated document by ID.",
)
@require_permission(Permission.READ_WORKITEM)
async def get_document(
    document_id: UUID,
    document_service: DocumentService = Depends(get_document_service),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve a generated document by ID.
    
    This endpoint returns the document metadata. To download the actual
    document content, use the download_url provided in the response.
    
    **Required Permission:** READ_WORKITEM
    """
    document = await document_service.get_document(document_id, current_user)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {document_id} not found",
        )

    return document


@router.get(
    "/{document_id}/download",
    summary="Download Document",
    description="Download a generated document file.",
)
@require_permission(Permission.READ_WORKITEM)
async def download_document(
    document_id: UUID,
    document_service: DocumentService = Depends(get_document_service),
    current_user: User = Depends(get_current_user),
):
    """
    Download a generated document file.
    
    Returns the document as a file download with appropriate content type.
    
    **Required Permission:** READ_WORKITEM
    """
    document = await document_service.get_document(document_id, current_user)

    if not document:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document {document_id} not found",
        )

    content = await document_service.get_document_content(document_id, current_user)

    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document content not found for {document_id}",
        )

    # Determine content type based on format
    content_types = {
        DocumentFormat.PDF: "application/pdf",
        DocumentFormat.EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        DocumentFormat.WORD: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }

    content_type = content_types.get(document.format, "application/octet-stream")

    return StreamingResponse(
        io.BytesIO(content),
        media_type=content_type,
        headers={
            "Content-Disposition": f'attachment; filename="{document.filename}"',
            "Content-Length": str(len(content)),
        },
    )


# ============================================================================
# Document List Endpoint
# ============================================================================

@router.get(
    "/",
    summary="List Documents",
    description="List generated documents with optional filtering.",
)
@require_permission(Permission.READ_WORKITEM)
async def list_documents(
    project_id: UUID | None = Query(None, description="Filter by project ID"),
    document_type: DocumentType | None = Query(None, description="Filter by document type"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    document_service: DocumentService = Depends(get_document_service),
    current_user: User = Depends(get_current_user),
):
    """
    List generated documents with optional filtering.
    
    - **project_id**: Filter by project ID
    - **document_type**: Filter by document type (design_review, traceability_matrix, fmea, invoice)
    - **limit**: Maximum number of results (1-1000)
    - **offset**: Number of results to skip for pagination
    
    **Required Permission:** READ_WORKITEM
    """
    documents = await document_service.list_documents(
        project_id=project_id,
        document_type=document_type,
        limit=limit,
        offset=offset,
    )

    return {
        "documents": documents,
        "total": len(documents),
        "limit": limit,
        "offset": offset,
    }

"""Pydantic schemas for Document Generation.

This module defines schemas for document generation requests and responses
as per Requirement 8 (Document Generation).
"""

from datetime import date, datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class DocumentType(str, Enum):
    """Types of documents that can be generated."""
    DESIGN_REVIEW = "design_review"
    TRACEABILITY_MATRIX = "traceability_matrix"
    FMEA = "fmea"
    INVOICE = "invoice"


class DocumentFormat(str, Enum):
    """Output formats for generated documents."""
    PDF = "pdf"
    EXCEL = "excel"
    WORD = "word"


class DocumentStatus(str, Enum):
    """Status of a generated document."""
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"


# ============================================================================
# Design Review Document Schemas
# ============================================================================

class DesignReviewRequest(BaseModel):
    """Request schema for generating a design review PDF."""

    project_id: UUID = Field(..., description="ID of the project for the design review")
    include_signatures: bool = Field(
        default=True,
        description="Whether to include digital signatures in the document"
    )
    include_version_history: bool = Field(
        default=False,
        description="Whether to include version history for each requirement"
    )
    requirement_ids: list[UUID] | None = Field(
        default=None,
        description="Specific requirement IDs to include (None = all requirements)"
    )
    title: str | None = Field(
        default=None,
        max_length=200,
        description="Custom document title"
    )


class DesignReviewResponse(BaseModel):
    """Response schema for design review generation."""

    document_id: UUID
    project_id: UUID
    document_type: DocumentType = DocumentType.DESIGN_REVIEW
    format: DocumentFormat = DocumentFormat.PDF
    status: DocumentStatus
    filename: str
    file_size_bytes: int | None = None
    requirement_count: int
    signature_count: int
    generated_at: datetime
    generated_by: UUID
    download_url: str | None = None


# ============================================================================
# Traceability Matrix Document Schemas
# ============================================================================

class TraceabilityMatrixRequest(BaseModel):
    """Request schema for generating a traceability matrix PDF."""

    project_id: UUID = Field(..., description="ID of the project")
    include_tests: bool = Field(
        default=True,
        description="Include test coverage information"
    )
    include_risks: bool = Field(
        default=True,
        description="Include risk linkage information"
    )
    include_signatures: bool = Field(
        default=True,
        description="Include signature status for each item"
    )
    requirement_ids: list[UUID] | None = Field(
        default=None,
        description="Specific requirement IDs to include (None = all)"
    )


class TraceabilityMatrixResponse(BaseModel):
    """Response schema for traceability matrix generation."""

    document_id: UUID
    project_id: UUID
    document_type: DocumentType = DocumentType.TRACEABILITY_MATRIX
    format: DocumentFormat = DocumentFormat.PDF
    status: DocumentStatus
    filename: str
    file_size_bytes: int | None = None
    requirement_count: int
    test_count: int
    risk_count: int
    coverage_percentage: float
    generated_at: datetime
    generated_by: UUID
    download_url: str | None = None


# ============================================================================
# FMEA Document Schemas
# ============================================================================

class FMEARequest(BaseModel):
    """Request schema for generating an FMEA Excel document."""

    project_id: UUID = Field(..., description="ID of the project")
    include_failure_chains: bool = Field(
        default=True,
        description="Include failure chain information"
    )
    include_mitigations: bool = Field(
        default=True,
        description="Include mitigation actions"
    )
    risk_ids: list[UUID] | None = Field(
        default=None,
        description="Specific risk IDs to include (None = all)"
    )
    min_rpn: int | None = Field(
        default=None,
        ge=1,
        le=1000,
        description="Minimum RPN threshold for inclusion"
    )


class FMEAResponse(BaseModel):
    """Response schema for FMEA document generation."""

    document_id: UUID
    project_id: UUID
    document_type: DocumentType = DocumentType.FMEA
    format: DocumentFormat = DocumentFormat.EXCEL
    status: DocumentStatus
    filename: str
    file_size_bytes: int | None = None
    risk_count: int
    failure_count: int
    mitigation_count: int
    average_rpn: float
    max_rpn: int
    generated_at: datetime
    generated_by: UUID
    download_url: str | None = None


# ============================================================================
# Invoice Document Schemas
# ============================================================================

class BillingPeriod(BaseModel):
    """Billing period specification."""

    start_date: date = Field(..., description="Start date of billing period")
    end_date: date = Field(..., description="End date of billing period")


class InvoiceLineItem(BaseModel):
    """Line item in an invoice."""

    description: str
    hours: float
    rate: float
    subtotal: float


class InvoiceRequest(BaseModel):
    """Request schema for generating an invoice Word document."""

    project_id: UUID = Field(..., description="ID of the project")
    billing_period: BillingPeriod = Field(..., description="Billing period for the invoice")
    template_name: str | None = Field(
        default="default_invoice",
        max_length=100,
        description="Name of the Word template to use"
    )
    client_name: str | None = Field(
        default=None,
        max_length=200,
        description="Client name for the invoice"
    )
    client_address: str | None = Field(
        default=None,
        max_length=500,
        description="Client address for the invoice"
    )
    tax_rate: float = Field(
        default=0.19,
        ge=0.0,
        le=1.0,
        description="Tax rate to apply (e.g., 0.19 for 19%)"
    )
    currency: str = Field(
        default="EUR",
        max_length=3,
        description="Currency code (ISO 4217)"
    )
    notes: str | None = Field(
        default=None,
        max_length=1000,
        description="Additional notes for the invoice"
    )


class InvoiceResponse(BaseModel):
    """Response schema for invoice generation."""

    document_id: UUID
    project_id: UUID
    document_type: DocumentType = DocumentType.INVOICE
    format: DocumentFormat = DocumentFormat.WORD
    status: DocumentStatus
    filename: str
    file_size_bytes: int | None = None
    billing_period_start: date
    billing_period_end: date
    total_hours: float
    subtotal: float
    tax_amount: float
    total_amount: float
    line_item_count: int
    generated_at: datetime
    generated_by: UUID
    download_url: str | None = None


# ============================================================================
# Document Record Schemas
# ============================================================================

class DocumentRecord(BaseModel):
    """Schema for a stored document record."""

    id: UUID
    project_id: UUID
    document_type: DocumentType
    format: DocumentFormat
    status: DocumentStatus
    filename: str
    file_path: str
    file_size_bytes: int
    content_hash: str
    version: str
    metadata: dict
    generated_at: datetime
    generated_by: UUID
    expires_at: datetime | None = None

    model_config = {"from_attributes": True}


class DocumentFilter(BaseModel):
    """Schema for filtering documents."""

    project_id: UUID | None = None
    document_type: DocumentType | None = None
    format: DocumentFormat | None = None
    status: DocumentStatus | None = None
    generated_by: UUID | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    limit: int = Field(default=100, ge=1, le=1000)
    offset: int = Field(default=0, ge=0)


class DocumentDownloadResponse(BaseModel):
    """Response schema for document download."""

    document_id: UUID
    filename: str
    content_type: str
    file_size_bytes: int
    content: bytes

    model_config = {"arbitrary_types_allowed": True}

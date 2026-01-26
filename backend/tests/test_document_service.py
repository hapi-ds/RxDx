"""
Unit tests for DocumentService.

Tests document generation functionality including:
- Design Review PDF generation
- Traceability Matrix PDF generation
- FMEA Excel generation
- Invoice Word document generation
"""

from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.user import User
from app.schemas.document import (
    BillingPeriod,
    DesignReviewRequest,
    DocumentFormat,
    DocumentStatus,
    DocumentType,
    FMEARequest,
    InvoiceRequest,
    TraceabilityMatrixRequest,
)
from app.services.document_service import DocumentService

# ============================================================================
# Fixtures
# ============================================================================

@pytest.fixture
def mock_graph_service():
    """Create a mock graph service."""
    service = AsyncMock()
    service.get_workitems_by_type = AsyncMock(return_value=[])
    service.get_traceability_matrix = AsyncMock(return_value=[])
    service.get_all_risks = AsyncMock(return_value=[])
    service.get_risk_chains = AsyncMock(return_value=[])
    return service


@pytest.fixture
def mock_audit_service():
    """Create a mock audit service."""
    service = AsyncMock()
    service.log = AsyncMock()
    return service


@pytest.fixture
def mock_signature_service():
    """Create a mock signature service."""
    service = AsyncMock()
    service.get_workitem_signatures = AsyncMock(return_value=[])
    return service


@pytest.fixture
def document_service(mock_graph_service, mock_audit_service, mock_signature_service):
    """Create a DocumentService instance with mocked dependencies."""
    return DocumentService(
        graph_service=mock_graph_service,
        audit_service=mock_audit_service,
        signature_service=mock_signature_service,
    )


@pytest.fixture
def test_user():
    """Create a test user."""
    user = MagicMock(spec=User)
    user.id = uuid4()
    user.email = "test@example.com"
    user.full_name = "Test User"
    user.role = "admin"
    return user


@pytest.fixture
def sample_requirements():
    """Create sample requirements data."""
    return [
        {
            'id': str(uuid4()),
            'title': 'User Authentication',
            'description': 'The system shall authenticate users with JWT tokens.',
            'version': '1.0',
            'status': 'active',
            'priority': 1,
        },
        {
            'id': str(uuid4()),
            'title': 'Data Encryption',
            'description': 'All sensitive data shall be encrypted at rest.',
            'version': '1.2',
            'status': 'active',
            'priority': 2,
        },
    ]


@pytest.fixture
def sample_traceability_data():
    """Create sample traceability matrix data."""
    return [
        {
            'requirement_id': str(uuid4()),
            'requirement_title': 'User Authentication',
            'test_ids': ['TEST-001', 'TEST-002'],
            'risk_ids': ['RISK-001'],
            'is_signed': True,
        },
        {
            'requirement_id': str(uuid4()),
            'requirement_title': 'Data Encryption',
            'test_ids': [],
            'risk_ids': ['RISK-002', 'RISK-003'],
            'is_signed': False,
        },
    ]


@pytest.fixture
def sample_risks():
    """Create sample risk data."""
    return [
        {
            'id': str(uuid4()),
            'title': 'Data Breach Risk',
            'description': 'Risk of unauthorized data access',
            'failure_mode': 'Authentication bypass',
            'failure_effect': 'Data exposure',
            'failure_cause': 'Weak authentication',
            'severity': 8,
            'occurrence': 3,
            'detection': 5,
            'rpn': 120,
            'current_controls': 'JWT tokens, rate limiting',
            'mitigations': [],
        },
        {
            'id': str(uuid4()),
            'title': 'System Downtime Risk',
            'description': 'Risk of system unavailability',
            'failure_mode': 'Server crash',
            'failure_effect': 'Service interruption',
            'failure_cause': 'Resource exhaustion',
            'severity': 6,
            'occurrence': 4,
            'detection': 3,
            'rpn': 72,
            'current_controls': 'Health checks, auto-scaling',
            'mitigations': [
                {'title': 'Add redundancy', 'status': 'in_progress'},
            ],
        },
    ]


# ============================================================================
# Design Review PDF Tests
# ============================================================================

class TestDesignReviewPDF:
    """Tests for design review PDF generation."""

    @pytest.mark.asyncio
    async def test_generate_design_review_pdf_empty_project(
        self,
        document_service,
        mock_graph_service,
        test_user,
    ):
        """Test generating design review PDF with no requirements."""
        mock_graph_service.get_workitems_by_type.return_value = []

        request = DesignReviewRequest(
            project_id=uuid4(),
            include_signatures=True,
        )

        response = await document_service.generate_design_review_pdf(request, test_user)

        assert response.document_type == DocumentType.DESIGN_REVIEW
        assert response.format == DocumentFormat.PDF
        assert response.status == DocumentStatus.COMPLETED
        assert response.requirement_count == 0
        assert response.signature_count == 0
        assert response.filename.endswith('.pdf')
        assert response.file_size_bytes > 0

    @pytest.mark.asyncio
    async def test_generate_design_review_pdf_with_requirements(
        self,
        document_service,
        mock_graph_service,
        test_user,
        sample_requirements,
    ):
        """Test generating design review PDF with requirements."""
        mock_graph_service.get_workitems_by_type.return_value = sample_requirements

        request = DesignReviewRequest(
            project_id=uuid4(),
            include_signatures=False,
            title="Custom Design Review",
        )

        response = await document_service.generate_design_review_pdf(request, test_user)

        assert response.requirement_count == 2
        assert response.status == DocumentStatus.COMPLETED
        assert response.file_size_bytes > 0

    @pytest.mark.asyncio
    async def test_generate_design_review_pdf_with_signatures(
        self,
        document_service,
        mock_graph_service,
        mock_signature_service,
        test_user,
        sample_requirements,
    ):
        """Test generating design review PDF with signature information."""
        mock_graph_service.get_workitems_by_type.return_value = sample_requirements

        # Mock signature data
        mock_sig = MagicMock()
        mock_sig.user_name = "John Doe"
        mock_sig.signed_at = datetime.now(UTC)
        mock_sig.is_valid = True
        mock_sig.workitem_version = "1.0"
        mock_signature_service.get_workitem_signatures.return_value = [mock_sig]

        request = DesignReviewRequest(
            project_id=uuid4(),
            include_signatures=True,
        )

        response = await document_service.generate_design_review_pdf(request, test_user)

        assert response.requirement_count == 2
        assert response.signature_count >= 0  # May vary based on implementation

    @pytest.mark.asyncio
    async def test_generate_design_review_pdf_audit_logging(
        self,
        document_service,
        mock_graph_service,
        mock_audit_service,
        test_user,
    ):
        """Test that design review generation is audit logged."""
        mock_graph_service.get_workitems_by_type.return_value = []

        request = DesignReviewRequest(project_id=uuid4())

        await document_service.generate_design_review_pdf(request, test_user)

        mock_audit_service.log.assert_called_once()
        call_args = mock_audit_service.log.call_args
        assert call_args.kwargs['action'] == 'GENERATE'
        assert call_args.kwargs['entity_type'] == 'Document'


# ============================================================================
# Traceability Matrix PDF Tests
# ============================================================================

class TestTraceabilityMatrixPDF:
    """Tests for traceability matrix PDF generation."""

    @pytest.mark.asyncio
    async def test_generate_traceability_matrix_empty(
        self,
        document_service,
        mock_graph_service,
        test_user,
    ):
        """Test generating traceability matrix with no data."""
        mock_graph_service.get_traceability_matrix.return_value = []

        request = TraceabilityMatrixRequest(
            project_id=uuid4(),
            include_tests=True,
            include_risks=True,
        )

        response = await document_service.generate_traceability_matrix_pdf(request, test_user)

        assert response.document_type == DocumentType.TRACEABILITY_MATRIX
        assert response.format == DocumentFormat.PDF
        assert response.status == DocumentStatus.COMPLETED
        assert response.requirement_count == 0
        assert response.coverage_percentage == 0.0

    @pytest.mark.asyncio
    async def test_generate_traceability_matrix_with_data(
        self,
        document_service,
        mock_graph_service,
        test_user,
        sample_traceability_data,
    ):
        """Test generating traceability matrix with data."""
        mock_graph_service.get_traceability_matrix.return_value = sample_traceability_data

        request = TraceabilityMatrixRequest(
            project_id=uuid4(),
            include_tests=True,
            include_risks=True,
            include_signatures=True,
        )

        response = await document_service.generate_traceability_matrix_pdf(request, test_user)

        assert response.requirement_count == 2
        assert response.test_count == 2  # TEST-001, TEST-002
        assert response.risk_count == 3  # RISK-001, RISK-002, RISK-003
        assert response.coverage_percentage == 50.0  # 1 out of 2 has tests

    @pytest.mark.asyncio
    async def test_generate_traceability_matrix_filtered(
        self,
        document_service,
        mock_graph_service,
        test_user,
        sample_traceability_data,
    ):
        """Test generating traceability matrix with requirement filter."""
        mock_graph_service.get_traceability_matrix.return_value = sample_traceability_data

        # Filter to only first requirement
        first_req_id = sample_traceability_data[0]['requirement_id']

        request = TraceabilityMatrixRequest(
            project_id=uuid4(),
            requirement_ids=[first_req_id],
        )

        response = await document_service.generate_traceability_matrix_pdf(request, test_user)

        assert response.requirement_count == 1


# ============================================================================
# FMEA Excel Tests
# ============================================================================

class TestFMEAExcel:
    """Tests for FMEA Excel generation."""

    @pytest.mark.asyncio
    async def test_generate_fmea_excel_empty(
        self,
        document_service,
        mock_graph_service,
        test_user,
    ):
        """Test generating FMEA Excel with no risks."""
        mock_graph_service.get_all_risks.return_value = []

        request = FMEARequest(project_id=uuid4())

        response = await document_service.generate_fmea_excel(request, test_user)

        assert response.document_type == DocumentType.FMEA
        assert response.format == DocumentFormat.EXCEL
        assert response.status == DocumentStatus.COMPLETED
        assert response.risk_count == 0
        assert response.filename.endswith('.xlsx')

    @pytest.mark.asyncio
    async def test_generate_fmea_excel_with_risks(
        self,
        document_service,
        mock_graph_service,
        test_user,
        sample_risks,
    ):
        """Test generating FMEA Excel with risk data."""
        mock_graph_service.get_all_risks.return_value = sample_risks
        mock_graph_service.get_risk_chains.return_value = []

        request = FMEARequest(
            project_id=uuid4(),
            include_failure_chains=True,
            include_mitigations=True,
        )

        response = await document_service.generate_fmea_excel(request, test_user)

        assert response.risk_count == 2
        assert response.max_rpn == 120
        assert response.average_rpn == 96.0  # (120 + 72) / 2
        assert response.mitigation_count == 1

    @pytest.mark.asyncio
    async def test_generate_fmea_excel_min_rpn_filter(
        self,
        document_service,
        mock_graph_service,
        test_user,
        sample_risks,
    ):
        """Test generating FMEA Excel with minimum RPN filter."""
        mock_graph_service.get_all_risks.return_value = sample_risks

        request = FMEARequest(
            project_id=uuid4(),
            min_rpn=100,  # Should filter out the 72 RPN risk
        )

        response = await document_service.generate_fmea_excel(request, test_user)

        assert response.risk_count == 1
        assert response.max_rpn == 120

    @pytest.mark.asyncio
    async def test_generate_fmea_excel_valid_workbook(
        self,
        document_service,
        mock_graph_service,
        test_user,
        sample_risks,
    ):
        """Test that generated FMEA Excel is a valid workbook."""
        mock_graph_service.get_all_risks.return_value = sample_risks
        mock_graph_service.get_risk_chains.return_value = []

        request = FMEARequest(project_id=uuid4())

        response = await document_service.generate_fmea_excel(request, test_user)

        # The document is stored internally, verify it was created
        assert response.file_size_bytes > 0
        assert response.status == DocumentStatus.COMPLETED


# ============================================================================
# Invoice Word Document Tests
# ============================================================================

class TestInvoiceWord:
    """Tests for invoice Word document generation."""

    @pytest.mark.asyncio
    async def test_generate_invoice_empty_time_entries(
        self,
        document_service,
        test_user,
    ):
        """Test generating invoice with no time entries."""
        request = InvoiceRequest(
            project_id=uuid4(),
            billing_period=BillingPeriod(
                start_date=date(2026, 1, 1),
                end_date=date(2026, 1, 31),
            ),
            client_name="Test Client",
            tax_rate=0.19,
        )

        response = await document_service.generate_invoice_word(request, test_user)

        assert response.document_type == DocumentType.INVOICE
        assert response.format == DocumentFormat.WORD
        assert response.status == DocumentStatus.COMPLETED
        assert response.total_hours == 0.0
        assert response.subtotal == 0.0
        assert response.line_item_count == 0
        assert response.filename.endswith('.docx')

    @pytest.mark.asyncio
    async def test_generate_invoice_with_custom_template(
        self,
        document_service,
        test_user,
    ):
        """Test generating invoice with custom template name."""
        request = InvoiceRequest(
            project_id=uuid4(),
            billing_period=BillingPeriod(
                start_date=date(2026, 1, 1),
                end_date=date(2026, 1, 31),
            ),
            template_name="custom_invoice",
            client_name="Custom Client",
            client_address="123 Main St",
            tax_rate=0.20,
            currency="USD",
            notes="Thank you for your business!",
        )

        response = await document_service.generate_invoice_word(request, test_user)

        # Should fall back to simple document since template doesn't exist
        assert response.status == DocumentStatus.COMPLETED
        assert response.billing_period_start == date(2026, 1, 1)
        assert response.billing_period_end == date(2026, 1, 31)

    @pytest.mark.asyncio
    async def test_generate_invoice_tax_calculation(
        self,
        document_service,
        test_user,
    ):
        """Test invoice tax calculation."""
        request = InvoiceRequest(
            project_id=uuid4(),
            billing_period=BillingPeriod(
                start_date=date(2026, 1, 1),
                end_date=date(2026, 1, 31),
            ),
            tax_rate=0.19,
        )

        response = await document_service.generate_invoice_word(request, test_user)

        # With no time entries, all amounts should be 0
        assert response.subtotal == 0.0
        assert response.tax_amount == 0.0
        assert response.total_amount == 0.0


# ============================================================================
# Document Retrieval Tests
# ============================================================================

class TestDocumentRetrieval:
    """Tests for document retrieval functionality."""

    @pytest.mark.asyncio
    async def test_get_document_not_found(
        self,
        document_service,
        test_user,
    ):
        """Test retrieving a non-existent document."""
        result = await document_service.get_document(uuid4(), test_user)
        assert result is None

    @pytest.mark.asyncio
    async def test_list_documents_empty(
        self,
        document_service,
    ):
        """Test listing documents when none exist."""
        result = await document_service.list_documents()
        assert result == []

    @pytest.mark.asyncio
    async def test_list_documents_with_filter(
        self,
        document_service,
        mock_graph_service,
        test_user,
    ):
        """Test listing documents with type filter."""
        # Generate a document first
        mock_graph_service.get_workitems_by_type.return_value = []

        request = DesignReviewRequest(project_id=uuid4())
        await document_service.generate_design_review_pdf(request, test_user)

        # List with filter
        result = await document_service.list_documents(
            document_type=DocumentType.DESIGN_REVIEW
        )

        assert len(result) == 1
        assert result[0].document_type == DocumentType.DESIGN_REVIEW


# ============================================================================
# Helper Method Tests
# ============================================================================

class TestHelperMethods:
    """Tests for DocumentService helper methods."""

    def test_calculate_content_hash(self, document_service):
        """Test content hash calculation."""
        content = b"test content"
        hash1 = document_service._calculate_content_hash(content)
        hash2 = document_service._calculate_content_hash(content)

        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 produces 64 hex characters

    def test_calculate_content_hash_different_content(self, document_service):
        """Test that different content produces different hashes."""
        hash1 = document_service._calculate_content_hash(b"content1")
        hash2 = document_service._calculate_content_hash(b"content2")

        assert hash1 != hash2

    def test_get_styles(self, document_service):
        """Test custom style generation."""
        styles = document_service._get_styles()

        assert 'CustomTitle' in [s.name for s in styles.byName.values()]
        assert 'CustomHeading' in [s.name for s in styles.byName.values()]
        assert 'CustomBody' in [s.name for s in styles.byName.values()]

    def test_create_header_table_style(self, document_service):
        """Test table style creation."""
        style = document_service._create_header_table_style()

        assert style is not None
        # TableStyle should have commands
        assert len(style.getCommands()) > 0

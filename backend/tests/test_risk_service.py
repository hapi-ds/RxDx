"""
Unit tests for RiskService.

Tests risk management, failure chain creation, RPN calculation,
and mitigation tracking as per Requirement 10 (Risk Management with FMEA).
"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from hypothesis import given, settings, strategies as st

from app.models.user import User
from app.schemas.risk import (
    FailureNodeCreate,
    FailureType,
    LeadsToRelationshipCreate,
    MitigationActionCreate,
    MitigationActionUpdate,
    MitigationStatus,
    RiskNodeCreate,
    RiskNodeUpdate,
    RiskReassessmentRequest,
    RiskStatus,
    RPNThresholdConfig,
)
from app.services.risk_service import RiskService


@pytest.fixture
def mock_graph_service():
    """Mock graph service."""
    return AsyncMock()


@pytest.fixture
def mock_audit_service():
    """Mock audit service."""
    return AsyncMock()


@pytest.fixture
def mock_signature_service():
    """Mock signature service."""
    service = AsyncMock()
    service.get_workitem_signatures.return_value = []
    return service


@pytest.fixture
def mock_version_service():
    """Mock version service."""
    return AsyncMock()


@pytest.fixture
def risk_service(
    mock_graph_service,
    mock_audit_service,
    mock_signature_service,
    mock_version_service,
):
    """Risk service instance with mocked dependencies."""
    return RiskService(
        graph_service=mock_graph_service,
        audit_service=mock_audit_service,
        signature_service=mock_signature_service,
        version_service=mock_version_service,
    )


@pytest.fixture
def sample_user():
    """Sample user for testing."""
    user = MagicMock(spec=User)
    user.id = uuid4()
    user.email = "risk_manager@example.com"
    user.role = "project_manager"
    return user


@pytest.fixture
def sample_risk_create():
    """Sample risk creation data."""
    return RiskNodeCreate(
        title="Battery Overheating Risk",
        description="Risk of battery overheating during charging",
        status=RiskStatus.IDENTIFIED,
        severity=8,
        occurrence=4,
        detection=6,
        risk_category="safety",
        failure_mode="Thermal runaway during fast charging",
        failure_effect="Device damage, potential fire hazard",
        failure_cause="Insufficient thermal management",
        current_controls="Temperature monitoring",
        linked_design_items=[],
        linked_process_items=[],
    )


@pytest.fixture
def sample_failure_create():
    """Sample failure creation data."""
    return FailureNodeCreate(
        description="Battery cell thermal runaway causing device damage",
        impact="Complete device failure, potential safety hazard to user",
        failure_type=FailureType.SAFETY,
        severity_level=9,
        affected_components="Battery pack, charging circuit",
        detection_method="Temperature sensors, smoke detection",
    )


@pytest.fixture
def sample_mitigation_create():
    """Sample mitigation action creation data."""
    risk_id = uuid4()
    return MitigationActionCreate(
        risk_id=risk_id,
        title="Implement thermal throttling",
        description="Add thermal throttling to reduce charging speed when temperature exceeds threshold",
        action_type="prevention",
        status=MitigationStatus.PLANNED,
        expected_severity_reduction=2,
        expected_occurrence_reduction=3,
        expected_detection_improvement=1,
        verification_method="Thermal testing under various conditions",
    )


class TestRPNCalculation:
    """Test RPN calculation functionality."""

    def test_calculate_rpn_basic(self, risk_service):
        """Test basic RPN calculation: severity × occurrence × detection."""
        # Validates: Requirement 10.4
        assert risk_service.calculate_rpn(5, 5, 5) == 125
        assert risk_service.calculate_rpn(10, 10, 10) == 1000
        assert risk_service.calculate_rpn(1, 1, 1) == 1

    def test_calculate_rpn_edge_cases(self, risk_service):
        """Test RPN calculation with edge values."""
        # Validates: Requirement 10.4
        # Minimum RPN
        assert risk_service.calculate_rpn(1, 1, 1) == 1
        # Maximum RPN
        assert risk_service.calculate_rpn(10, 10, 10) == 1000
        # Mixed values
        assert risk_service.calculate_rpn(8, 4, 6) == 192

    def test_get_risk_level_critical(self, risk_service):
        """Test risk level determination for critical risks."""
        # Validates: Requirement 10.6
        assert risk_service.get_risk_level(200) == "critical"
        assert risk_service.get_risk_level(500) == "critical"
        assert risk_service.get_risk_level(1000) == "critical"

    def test_get_risk_level_high(self, risk_service):
        """Test risk level determination for high risks."""
        # Validates: Requirement 10.6
        assert risk_service.get_risk_level(100) == "high"
        assert risk_service.get_risk_level(150) == "high"
        assert risk_service.get_risk_level(199) == "high"

    def test_get_risk_level_medium(self, risk_service):
        """Test risk level determination for medium risks."""
        assert risk_service.get_risk_level(50) == "medium"
        assert risk_service.get_risk_level(75) == "medium"
        assert risk_service.get_risk_level(99) == "medium"

    def test_get_risk_level_low(self, risk_service):
        """Test risk level determination for low risks."""
        assert risk_service.get_risk_level(1) == "low"
        assert risk_service.get_risk_level(25) == "low"
        assert risk_service.get_risk_level(49) == "low"

    def test_requires_mitigation_high_rpn(self, risk_service):
        """Test mitigation requirement for high RPN risks."""
        # Validates: Requirement 10.6
        assert risk_service.requires_mitigation(100) is True
        assert risk_service.requires_mitigation(200) is True
        assert risk_service.requires_mitigation(500) is True

    def test_requires_mitigation_low_rpn(self, risk_service):
        """Test mitigation requirement for low RPN risks."""
        assert risk_service.requires_mitigation(50) is False
        assert risk_service.requires_mitigation(25) is False
        assert risk_service.requires_mitigation(99) is False

    def test_custom_rpn_thresholds(self, mock_graph_service, mock_audit_service,
                                    mock_signature_service, mock_version_service):
        """Test RPN calculation with custom thresholds."""
        custom_thresholds = RPNThresholdConfig(
            critical_threshold=300,
            high_threshold=150,
            medium_threshold=75
        )
        service = RiskService(
            graph_service=mock_graph_service,
            audit_service=mock_audit_service,
            signature_service=mock_signature_service,
            version_service=mock_version_service,
            rpn_thresholds=custom_thresholds,
        )

        assert service.get_risk_level(300) == "critical"
        assert service.get_risk_level(200) == "high"
        assert service.get_risk_level(100) == "medium"
        assert service.get_risk_level(50) == "low"


class TestRiskNodeManagement:
    """Test risk node management functionality."""

    @pytest.mark.asyncio
    async def test_create_risk_success(
        self,
        risk_service,
        mock_graph_service,
        mock_audit_service,
        sample_risk_create,
        sample_user,
    ):
        """Test successful risk creation with RPN calculation."""
        # Validates: Requirement 10.1, 10.4
        mock_graph_service.create_node.return_value = {}

        result = await risk_service.create_risk(sample_risk_create, sample_user)

        # Verify RPN was calculated correctly
        expected_rpn = 8 * 4 * 6  # severity × occurrence × detection = 192
        assert result.rpn == expected_rpn
        assert result.title == sample_risk_create.title
        assert result.severity == sample_risk_create.severity
        assert result.occurrence == sample_risk_create.occurrence
        assert result.detection == sample_risk_create.detection

        # Verify graph service was called
        mock_graph_service.create_node.assert_called_once()

        # Verify audit log was created
        mock_audit_service.log.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_risk_with_linked_items(
        self,
        risk_service,
        mock_graph_service,
        mock_audit_service,
        sample_user,
    ):
        """Test risk creation with linked design and process items."""
        # Validates: Requirement 10.5
        design_item_id = uuid4()
        process_item_id = uuid4()

        risk_data = RiskNodeCreate(
            title="Component Failure Risk",
            description="Risk of component failure",
            severity=7,
            occurrence=5,
            detection=4,
            linked_design_items=[design_item_id],
            linked_process_items=[process_item_id],
        )

        # Mock linked items exist
        mock_graph_service.get_workitem.side_effect = [
            {'id': str(design_item_id), 'type': 'requirement'},
            {'id': str(process_item_id), 'type': 'task'},
        ]
        mock_graph_service.create_node.return_value = {}
        mock_graph_service.create_relationship.return_value = {}

        result = await risk_service.create_risk(risk_data, sample_user)

        # Verify relationships were created
        assert mock_graph_service.create_relationship.call_count == 2

    @pytest.mark.asyncio
    async def test_create_risk_invalid_linked_item(
        self,
        risk_service,
        mock_graph_service,
        sample_user,
    ):
        """Test risk creation fails with non-existent linked item."""
        risk_data = RiskNodeCreate(
            title="Test Risk",
            description="Test description",
            severity=5,
            occurrence=5,
            detection=5,
            linked_design_items=[uuid4()],
        )

        # Mock linked item doesn't exist
        mock_graph_service.get_workitem.return_value = None

        with pytest.raises(ValueError, match="does not exist"):
            await risk_service.create_risk(risk_data, sample_user)

    @pytest.mark.asyncio
    async def test_get_risk_success(
        self,
        risk_service,
        mock_graph_service,
        mock_signature_service,
    ):
        """Test successful risk retrieval."""
        risk_id = uuid4()
        mock_graph_service.get_node.return_value = {
            'type': 'risk',
            'properties': {
                'id': str(risk_id),
                'type': 'risk',
                'title': 'Test Risk',
                'description': 'Test description',
                'status': 'identified',
                'severity': 8,
                'occurrence': 4,
                'detection': 6,
                'rpn': 192,
                'version': '1.0',
                'created_by': str(uuid4()),
                'created_at': datetime.now(UTC).isoformat(),
                'updated_at': datetime.now(UTC).isoformat(),
            }
        }
        mock_signature_service.get_workitem_signatures.return_value = []

        result = await risk_service.get_risk(risk_id)

        assert result is not None
        assert result.title == 'Test Risk'
        assert result.rpn == 192

    @pytest.mark.asyncio
    async def test_get_risk_not_found(
        self,
        risk_service,
        mock_graph_service,
    ):
        """Test risk retrieval when not found."""
        mock_graph_service.get_node.return_value = None

        result = await risk_service.get_risk(uuid4())

        assert result is None

    @pytest.mark.asyncio
    async def test_update_risk_recalculates_rpn(
        self,
        risk_service,
        mock_graph_service,
        mock_version_service,
        mock_audit_service,
        mock_signature_service,
        sample_user,
    ):
        """Test that updating risk ratings recalculates RPN."""
        # Validates: Requirement 10.4
        risk_id = uuid4()

        # Mock current risk
        mock_graph_service.get_node.return_value = {
            'type': 'risk',
            'properties': {
                'id': str(risk_id),
                'type': 'risk',
                'title': 'Test Risk',
                'severity': 5,
                'occurrence': 5,
                'detection': 5,
                'rpn': 125,
                'version': '1.0',
                'created_by': str(uuid4()),
                'created_at': datetime.now(UTC).isoformat(),
                'updated_at': datetime.now(UTC).isoformat(),
            }
        }

        # Mock version service
        mock_version_service.create_version.return_value = {
            'id': str(risk_id),
            'type': 'risk',
            'title': 'Test Risk',
            'severity': 8,
            'occurrence': 5,
            'detection': 5,
            'rpn': 200,
            'version': '1.1',
            'created_by': str(uuid4()),
            'created_at': datetime.now(UTC).isoformat(),
            'updated_at': datetime.now(UTC).isoformat(),
        }

        mock_signature_service.get_workitem_signatures.return_value = []

        updates = RiskNodeUpdate(severity=8)  # Change severity from 5 to 8

        result = await risk_service.update_risk(risk_id, updates, sample_user)

        # Verify version service was called with recalculated RPN
        call_args = mock_version_service.create_version.call_args
        assert call_args[1]['updates']['rpn'] == 200  # 8 × 5 × 5 = 200


class TestFailureChainManagement:
    """Test failure chain management functionality."""

    @pytest.mark.asyncio
    async def test_create_failure_success(
        self,
        risk_service,
        mock_graph_service,
        mock_audit_service,
        sample_failure_create,
        sample_user,
    ):
        """Test successful failure node creation."""
        # Validates: Requirement 10.2
        mock_graph_service.create_node.return_value = {}

        result = await risk_service.create_failure(sample_failure_create, sample_user)

        assert result.description == sample_failure_create.description
        assert result.impact == sample_failure_create.impact
        assert result.failure_type == sample_failure_create.failure_type

        mock_graph_service.create_node.assert_called_once()
        mock_audit_service.log.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_leads_to_relationship(
        self,
        risk_service,
        mock_graph_service,
        mock_audit_service,
        sample_user,
    ):
        """Test creating LEADS_TO relationship with probability."""
        # Validates: Requirement 10.2, 10.3
        risk_id = uuid4()
        failure_id = uuid4()

        # Mock source risk exists
        mock_graph_service.get_node.side_effect = [
            {'type': 'risk', 'properties': {'id': str(risk_id), 'type': 'risk'}},
            {'type': 'failure', 'properties': {'id': str(failure_id), 'type': 'failure'}},
        ]
        mock_graph_service.create_relationship.return_value = {}

        relationship_data = LeadsToRelationshipCreate(
            from_id=risk_id,
            to_id=failure_id,
            probability=0.75,
            rationale="High likelihood based on historical data",
        )

        result = await risk_service.create_failure_chain(relationship_data, sample_user)

        assert result.from_id == risk_id
        assert result.to_id == failure_id
        assert result.probability == 0.75
        assert result.from_type == 'risk'
        assert result.to_type == 'failure'

        # Verify relationship was created with probability
        mock_graph_service.create_relationship.assert_called_once()
        call_args = mock_graph_service.create_relationship.call_args
        assert call_args[1]['properties']['probability'] == 0.75

    @pytest.mark.asyncio
    async def test_create_leads_to_invalid_source(
        self,
        risk_service,
        mock_graph_service,
        sample_user,
    ):
        """Test LEADS_TO creation fails with invalid source type."""
        # Validates: Requirement 10.2
        mock_graph_service.get_node.return_value = {
            'type': 'requirement',
            'properties': {'id': str(uuid4()), 'type': 'requirement'}
        }

        relationship_data = LeadsToRelationshipCreate(
            from_id=uuid4(),
            to_id=uuid4(),
            probability=0.5,
        )

        with pytest.raises(ValueError, match="Source node must be Risk or Failure"):
            await risk_service.create_failure_chain(relationship_data, sample_user)

    @pytest.mark.asyncio
    async def test_create_leads_to_invalid_target(
        self,
        risk_service,
        mock_graph_service,
        sample_user,
    ):
        """Test LEADS_TO creation fails with invalid target type."""
        # Validates: Requirement 10.2
        mock_graph_service.get_node.side_effect = [
            {'type': 'risk', 'properties': {'id': str(uuid4()), 'type': 'risk'}},
            {'type': 'risk', 'properties': {'id': str(uuid4()), 'type': 'risk'}},
        ]

        relationship_data = LeadsToRelationshipCreate(
            from_id=uuid4(),
            to_id=uuid4(),
            probability=0.5,
        )

        with pytest.raises(ValueError, match="Target node must be Failure"):
            await risk_service.create_failure_chain(relationship_data, sample_user)

    @pytest.mark.asyncio
    async def test_get_risk_chains(
        self,
        risk_service,
        mock_graph_service,
    ):
        """Test retrieving failure chains from a risk."""
        # Validates: Requirement 10.9
        risk_id = uuid4()
        failure_id = uuid4()

        mock_graph_service.get_risk_chains.return_value = [
            {
                'path': [
                    {'properties': {'id': str(risk_id), 'type': 'risk', 'title': 'Test Risk', 'rpn': 192}},
                    {'properties': {'id': str(failure_id), 'type': 'failure', 'description': 'Test Failure'}},
                ],
                'probabilities': [0.75],
                'chain_length': 1,
                'total_probability': 0.75,
            }
        ]

        result = await risk_service.get_risk_chains(risk_id)

        assert len(result) == 1
        assert result[0].chain_length == 1
        assert result[0].total_probability == 0.75
        assert len(result[0].nodes) == 2
        assert len(result[0].edges) == 1


class TestMitigationManagement:
    """Test mitigation action management functionality."""

    @pytest.mark.asyncio
    async def test_create_mitigation_success(
        self,
        risk_service,
        mock_graph_service,
        mock_audit_service,
        sample_user,
    ):
        """Test successful mitigation action creation."""
        # Validates: Requirement 10.6, 10.7
        risk_id = uuid4()

        # Mock risk exists
        mock_graph_service.get_node.return_value = {
            'type': 'risk',
            'properties': {'id': str(risk_id), 'type': 'risk'}
        }
        mock_graph_service.create_node.return_value = {}
        mock_graph_service.create_relationship.return_value = {}

        mitigation_data = MitigationActionCreate(
            risk_id=risk_id,
            title="Implement thermal throttling",
            description="Add thermal throttling to reduce charging speed",
            action_type="prevention",
            status=MitigationStatus.PLANNED,
            expected_severity_reduction=2,
            expected_occurrence_reduction=3,
        )

        result = await risk_service.create_mitigation(mitigation_data, sample_user)

        assert result.title == mitigation_data.title
        assert result.action_type == "prevention"
        assert result.status == MitigationStatus.PLANNED
        assert result.risk_id == risk_id

        # Verify relationship to risk was created
        mock_graph_service.create_relationship.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_mitigation_invalid_risk(
        self,
        risk_service,
        mock_graph_service,
        sample_user,
    ):
        """Test mitigation creation fails with non-existent risk."""
        mock_graph_service.get_node.return_value = None

        mitigation_data = MitigationActionCreate(
            risk_id=uuid4(),
            title="Test Mitigation",
            description="Test description for mitigation",
            action_type="prevention",
        )

        with pytest.raises(ValueError, match="not found"):
            await risk_service.create_mitigation(mitigation_data, sample_user)

    @pytest.mark.asyncio
    async def test_update_mitigation_status(
        self,
        risk_service,
        mock_graph_service,
        mock_audit_service,
        sample_user,
    ):
        """Test updating mitigation status."""
        # Validates: Requirement 10.7
        mitigation_id = uuid4()
        risk_id = uuid4()

        mock_graph_service.get_node.return_value = {
            'type': 'mitigation',
            'properties': {
                'id': str(mitigation_id),
                'type': 'mitigation',
                'title': 'Test Mitigation',
                'description': 'Test description',
                'action_type': 'prevention',
                'status': 'planned',
                'risk_id': str(risk_id),
                'created_by': str(uuid4()),
                'created_at': datetime.now(UTC).isoformat(),
                'updated_at': datetime.now(UTC).isoformat(),
            }
        }
        mock_graph_service.update_node.return_value = {}

        updates = MitigationActionUpdate(status=MitigationStatus.COMPLETED)

        result = await risk_service.update_mitigation(mitigation_id, updates, sample_user)

        # Verify update was called
        mock_graph_service.update_node.assert_called_once()
        call_args = mock_graph_service.update_node.call_args
        assert call_args[0][1]['status'] == 'completed'


class TestRiskReassessment:
    """Test risk reassessment functionality."""

    @pytest.mark.asyncio
    async def test_reassess_risk_success(
        self,
        risk_service,
        mock_graph_service,
        mock_audit_service,
        sample_user,
    ):
        """Test successful risk reassessment after mitigation."""
        # Validates: Requirement 10.8
        risk_id = uuid4()
        mitigation_id = uuid4()

        # Mock current risk with high RPN
        mock_graph_service.get_node.return_value = {
            'type': 'risk',
            'properties': {
                'id': str(risk_id),
                'type': 'risk',
                'severity': 8,
                'occurrence': 6,
                'detection': 5,
                'rpn': 240,
            }
        }
        mock_graph_service.update_node.return_value = {}
        mock_graph_service.create_relationship.return_value = {}

        reassessment = RiskReassessmentRequest(
            risk_id=risk_id,
            new_severity=6,
            new_occurrence=3,
            new_detection=4,
            reassessment_notes="Mitigation reduced occurrence significantly",
            mitigation_ids=[mitigation_id],
        )

        result = await risk_service.reassess_risk(reassessment, sample_user)

        # Verify RPN reduction
        assert result.previous_rpn == 240  # 8 × 6 × 5
        assert result.new_rpn == 72  # 6 × 3 × 4
        assert result.rpn_reduction == 168
        assert result.rpn_reduction_percentage == 70.0

        # Verify audit log
        mock_audit_service.log.assert_called_once()

    @pytest.mark.asyncio
    async def test_reassess_risk_partial_update(
        self,
        risk_service,
        mock_graph_service,
        mock_audit_service,
        sample_user,
    ):
        """Test reassessment with only some ratings changed."""
        risk_id = uuid4()

        mock_graph_service.get_node.return_value = {
            'type': 'risk',
            'properties': {
                'id': str(risk_id),
                'type': 'risk',
                'severity': 8,
                'occurrence': 6,
                'detection': 5,
                'rpn': 240,
            }
        }
        mock_graph_service.update_node.return_value = {}

        # Only update occurrence
        reassessment = RiskReassessmentRequest(
            risk_id=risk_id,
            new_occurrence=2,
            reassessment_notes="Occurrence reduced through process improvement",
        )

        result = await risk_service.reassess_risk(reassessment, sample_user)

        # Verify only occurrence changed, others kept original values
        assert result.new_severity == 8  # Unchanged
        assert result.new_occurrence == 2  # Changed
        assert result.new_detection == 5  # Unchanged
        assert result.new_rpn == 80  # 8 × 2 × 5


class TestRiskQueryMethods:
    """Test risk query methods including list_risks functionality."""

    @pytest.mark.asyncio
    async def test_get_risks_returns_workitem_nodes(
        self,
        risk_service,
        mock_graph_service,
        mock_signature_service,
    ):
        """Test that get_risks returns risks created as WorkItem nodes."""
        # Validates: Requirements 1.1, 1.2
        risk_id_1 = uuid4()
        risk_id_2 = uuid4()

        # Mock search_nodes to return WorkItem nodes with type='risk'
        mock_graph_service.search_nodes.return_value = [
            {
                'properties': {
                    'id': str(risk_id_1),
                    'type': 'risk',
                    'title': 'Battery Overheating Risk',
                    'description': 'Risk of battery overheating',
                    'status': 'identified',
                    'severity': 8,
                    'occurrence': 4,
                    'detection': 6,
                    'rpn': 192,
                    'risk_category': 'safety',
                    'version': '1.0',
                    'created_by': str(uuid4()),
                    'created_at': datetime.now(UTC).isoformat(),
                    'updated_at': datetime.now(UTC).isoformat(),
                }
            },
            {
                'properties': {
                    'id': str(risk_id_2),
                    'type': 'risk',
                    'title': 'Component Failure Risk',
                    'description': 'Risk of component failure',
                    'status': 'assessed',
                    'severity': 7,
                    'occurrence': 5,
                    'detection': 4,
                    'rpn': 140,
                    'risk_category': 'technical',
                    'version': '1.0',
                    'created_by': str(uuid4()),
                    'created_at': datetime.now(UTC).isoformat(),
                    'updated_at': datetime.now(UTC).isoformat(),
                }
            }
        ]
        mock_signature_service.get_workitem_signatures.return_value = []
        mock_graph_service.execute_query.return_value = []

        result = await risk_service.get_risks()

        # Verify search_nodes was called with correct label
        mock_graph_service.search_nodes.assert_called_once()
        call_args = mock_graph_service.search_nodes.call_args
        assert call_args[1]['label'] == 'WorkItem'
        assert call_args[1]['properties'] == {'type': 'risk'}

        # Verify results
        assert len(result) == 2
        assert str(result[0].id) == str(risk_id_1)
        assert result[0].title == 'Battery Overheating Risk'
        assert str(result[1].id) == str(risk_id_2)
        assert result[1].title == 'Component Failure Risk'

    @pytest.mark.asyncio
    async def test_get_risks_with_status_filter(
        self,
        risk_service,
        mock_graph_service,
        mock_signature_service,
    ):
        """Test get_risks with status filter."""
        # Validates: Requirements 1.1, 1.2
        risk_id_1 = uuid4()
        risk_id_2 = uuid4()

        # Mock search_nodes to return risks with different statuses
        mock_graph_service.search_nodes.return_value = [
            {
                'properties': {
                    'id': str(risk_id_1),
                    'type': 'risk',
                    'title': 'Assessed Risk',
                    'description': 'Assessed risk description',
                    'status': 'assessed',
                    'severity': 8,
                    'occurrence': 4,
                    'detection': 6,
                    'rpn': 192,
                    'version': '1.0',
                    'created_by': str(uuid4()),
                    'created_at': datetime.now(UTC).isoformat(),
                    'updated_at': datetime.now(UTC).isoformat(),
                }
            },
            {
                'properties': {
                    'id': str(risk_id_2),
                    'type': 'risk',
                    'title': 'Identified Risk',
                    'description': 'Identified risk description',
                    'status': 'identified',
                    'severity': 7,
                    'occurrence': 5,
                    'detection': 4,
                    'rpn': 140,
                    'version': '1.0',
                    'created_by': str(uuid4()),
                    'created_at': datetime.now(UTC).isoformat(),
                    'updated_at': datetime.now(UTC).isoformat(),
                }
            }
        ]
        mock_signature_service.get_workitem_signatures.return_value = []
        mock_graph_service.execute_query.return_value = []

        # Filter by assessed status
        result = await risk_service.get_risks(status=RiskStatus.ASSESSED)

        # Verify only assessed risks returned
        assert len(result) == 1
        assert result[0].status == RiskStatus.ASSESSED
        assert result[0].title == 'Assessed Risk'

    @pytest.mark.asyncio
    async def test_get_risks_with_rpn_filters(
        self,
        risk_service,
        mock_graph_service,
        mock_signature_service,
    ):
        """Test get_risks with RPN min/max filters."""
        # Validates: Requirements 1.1, 1.2
        risk_id_1 = uuid4()
        risk_id_2 = uuid4()
        risk_id_3 = uuid4()

        # Mock search_nodes to return risks with different RPNs
        mock_graph_service.search_nodes.return_value = [
            {
                'properties': {
                    'id': str(risk_id_1),
                    'type': 'risk',
                    'title': 'Low RPN Risk',
                    'description': 'Low RPN risk',
                    'status': 'identified',
                    'severity': 3,
                    'occurrence': 3,
                    'detection': 3,
                    'rpn': 27,
                    'version': '1.0',
                    'created_by': str(uuid4()),
                    'created_at': datetime.now(UTC).isoformat(),
                    'updated_at': datetime.now(UTC).isoformat(),
                }
            },
            {
                'properties': {
                    'id': str(risk_id_2),
                    'type': 'risk',
                    'title': 'Medium RPN Risk',
                    'description': 'Medium RPN risk',
                    'status': 'identified',
                    'severity': 5,
                    'occurrence': 5,
                    'detection': 5,
                    'rpn': 125,
                    'version': '1.0',
                    'created_by': str(uuid4()),
                    'created_at': datetime.now(UTC).isoformat(),
                    'updated_at': datetime.now(UTC).isoformat(),
                }
            },
            {
                'properties': {
                    'id': str(risk_id_3),
                    'type': 'risk',
                    'title': 'High RPN Risk',
                    'description': 'High RPN risk',
                    'status': 'identified',
                    'severity': 8,
                    'occurrence': 7,
                    'detection': 6,
                    'rpn': 336,
                    'version': '1.0',
                    'created_by': str(uuid4()),
                    'created_at': datetime.now(UTC).isoformat(),
                    'updated_at': datetime.now(UTC).isoformat(),
                }
            }
        ]
        mock_signature_service.get_workitem_signatures.return_value = []
        mock_graph_service.execute_query.return_value = []

        # Filter by min_rpn
        result = await risk_service.get_risks(min_rpn=100)
        assert len(result) == 2
        assert all(r.rpn >= 100 for r in result)

        # Filter by max_rpn
        result = await risk_service.get_risks(max_rpn=200)
        assert len(result) == 2
        assert all(r.rpn <= 200 for r in result)

        # Filter by both min and max RPN
        result = await risk_service.get_risks(min_rpn=100, max_rpn=200)
        assert len(result) == 1
        assert result[0].rpn == 125

    @pytest.mark.asyncio
    async def test_get_risks_pagination(
        self,
        risk_service,
        mock_graph_service,
        mock_signature_service,
    ):
        """Test get_risks pagination with limit and offset."""
        # Validates: Requirements 1.1, 1.2
        # Create 5 mock risks
        mock_risks = []
        for i in range(5):
            risk_id = uuid4()
            mock_risks.append({
                'properties': {
                    'id': str(risk_id),
                    'type': 'risk',
                    'title': f'Risk {i+1}',
                    'description': f'Description {i+1}',
                    'status': 'identified',
                    'severity': 5,
                    'occurrence': 5,
                    'detection': 5,
                    'rpn': 125,
                    'version': '1.0',
                    'created_by': str(uuid4()),
                    'created_at': datetime.now(UTC).isoformat(),
                    'updated_at': datetime.now(UTC).isoformat(),
                }
            })

        mock_graph_service.search_nodes.return_value = mock_risks
        mock_signature_service.get_workitem_signatures.return_value = []
        mock_graph_service.execute_query.return_value = []

        # Test limit
        result = await risk_service.get_risks(limit=2)
        assert len(result) == 2
        assert result[0].title == 'Risk 1'
        assert result[1].title == 'Risk 2'

        # Test offset
        result = await risk_service.get_risks(limit=2, offset=2)
        assert len(result) == 2
        assert result[0].title == 'Risk 3'
        assert result[1].title == 'Risk 4'

        # Test offset beyond available results
        result = await risk_service.get_risks(limit=10, offset=3)
        assert len(result) == 2
        assert result[0].title == 'Risk 4'
        assert result[1].title == 'Risk 5'

    @pytest.mark.asyncio
    async def test_get_risks_empty_result(
        self,
        risk_service,
        mock_graph_service,
    ):
        """Test get_risks returns empty list when no risks found."""
        # Validates: Requirements 1.1, 1.2
        mock_graph_service.search_nodes.return_value = []

        result = await risk_service.get_risks()

        assert len(result) == 0
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_get_risks_with_risk_owner_filter(
        self,
        risk_service,
        mock_graph_service,
        mock_signature_service,
    ):
        """Test get_risks with risk_owner filter."""
        # Validates: Requirements 1.1, 1.2
        owner_id = uuid4()
        other_owner_id = uuid4()
        risk_id_1 = uuid4()
        risk_id_2 = uuid4()

        mock_graph_service.search_nodes.return_value = [
            {
                'properties': {
                    'id': str(risk_id_1),
                    'type': 'risk',
                    'title': 'Owned Risk',
                    'description': 'Risk owned by specific user',
                    'status': 'identified',
                    'severity': 5,
                    'occurrence': 5,
                    'detection': 5,
                    'rpn': 125,
                    'risk_owner': str(owner_id),
                    'version': '1.0',
                    'created_by': str(uuid4()),
                    'created_at': datetime.now(UTC).isoformat(),
                    'updated_at': datetime.now(UTC).isoformat(),
                }
            },
            {
                'properties': {
                    'id': str(risk_id_2),
                    'type': 'risk',
                    'title': 'Other Risk',
                    'description': 'Risk owned by different user',
                    'status': 'identified',
                    'severity': 5,
                    'occurrence': 5,
                    'detection': 5,
                    'rpn': 125,
                    'risk_owner': str(other_owner_id),
                    'version': '1.0',
                    'created_by': str(uuid4()),
                    'created_at': datetime.now(UTC).isoformat(),
                    'updated_at': datetime.now(UTC).isoformat(),
                }
            }
        ]
        mock_signature_service.get_workitem_signatures.return_value = []
        mock_graph_service.execute_query.return_value = []

        result = await risk_service.get_risks(risk_owner=owner_id)

        assert len(result) == 1
        assert result[0].risk_owner == owner_id
        assert result[0].title == 'Owned Risk'



class TestRiskQueryProperties:
    """Property-based tests for risk query methods."""

    @given(
        st.lists(
            st.fixed_dictionaries({
                'id': st.uuids(),
                'title': st.text(
                    alphabet=st.characters(min_codepoint=65, max_codepoint=122, blacklist_categories=('Cc', 'Cs')),
                    min_size=5,
                    max_size=100
                ),
                'description': st.text(
                    alphabet=st.characters(min_codepoint=32, max_codepoint=126),
                    min_size=10,
                    max_size=500
                ),
                'status': st.sampled_from(['identified', 'assessed', 'mitigated', 'accepted', 'closed']),
                'severity': st.integers(min_value=1, max_value=10),
                'occurrence': st.integers(min_value=1, max_value=10),
                'detection': st.integers(min_value=1, max_value=10),
                'risk_category': st.sampled_from(['safety', 'technical', 'schedule', 'cost', 'quality']),
                'version': st.just('1.0'),
                'created_by': st.uuids(),
            }),
            min_size=1,
            max_size=50
        )
    )
    @settings(max_examples=100, deadline=None)
    @pytest.mark.asyncio
    async def test_property_risk_query_returns_all_risks(self, risk_data_list):
        """
        Property 1: Risk Query Returns All Risks
        
        **Validates: Requirements 1.1, 1.2**
        
        For any database state containing risk nodes, querying with label="WorkItem" 
        and type='risk' should return all risk nodes that exist in the database.
        
        This property test generates random risk nodes with various properties,
        inserts them as WorkItem nodes with type='risk', and verifies that 
        list_risks() returns all inserted risks.
        """
        # Setup mocks
        mock_graph_service = AsyncMock()
        mock_audit_service = AsyncMock()
        mock_signature_service = AsyncMock()
        mock_version_service = AsyncMock()
        
        risk_service = RiskService(
            graph_service=mock_graph_service,
            audit_service=mock_audit_service,
            signature_service=mock_signature_service,
            version_service=mock_version_service,
        )
        
        # Calculate RPN for each risk
        mock_risks = []
        for risk_data in risk_data_list:
            rpn = risk_data['severity'] * risk_data['occurrence'] * risk_data['detection']
            created_at = datetime.now(UTC).isoformat()
            updated_at = datetime.now(UTC).isoformat()
            
            mock_risk = {
                'properties': {
                    'id': str(risk_data['id']),
                    'type': 'risk',
                    'title': risk_data['title'],
                    'description': risk_data['description'],
                    'status': risk_data['status'],
                    'severity': risk_data['severity'],
                    'occurrence': risk_data['occurrence'],
                    'detection': risk_data['detection'],
                    'rpn': rpn,
                    'risk_category': risk_data['risk_category'],
                    'version': risk_data['version'],
                    'created_by': str(risk_data['created_by']),
                    'created_at': created_at,
                    'updated_at': updated_at,
                }
            }
            mock_risks.append(mock_risk)
        
        # Mock the graph service to return all risks as WorkItem nodes with type='risk'
        mock_graph_service.search_nodes.return_value = mock_risks
        mock_signature_service.get_workitem_signatures.return_value = []
        mock_graph_service.execute_query.return_value = []
        
        # Call get_risks
        result = await risk_service.get_risks()
        
        # Verify search_nodes was called with correct label and type
        mock_graph_service.search_nodes.assert_called_once()
        call_args = mock_graph_service.search_nodes.call_args
        assert call_args[1]['label'] == 'WorkItem', "Query must use label='WorkItem'"
        assert call_args[1]['properties'] == {'type': 'risk'}, "Query must filter by type='risk'"
        
        # Verify all risks were returned
        assert len(result) == len(risk_data_list), \
            f"Expected {len(risk_data_list)} risks, but got {len(result)}"
        
        # Verify each risk has correct properties
        result_ids = {str(r.id) for r in result}
        expected_ids = {str(r['id']) for r in risk_data_list}
        assert result_ids == expected_ids, "All inserted risks must be returned"
        
        # Verify RPN was calculated correctly for each risk
        for i, risk in enumerate(result):
            original_data = risk_data_list[i]
            expected_rpn = (
                original_data['severity'] * 
                original_data['occurrence'] * 
                original_data['detection']
            )
            assert risk.rpn == expected_rpn, \
                f"Risk {risk.id} has incorrect RPN: expected {expected_rpn}, got {risk.rpn}"

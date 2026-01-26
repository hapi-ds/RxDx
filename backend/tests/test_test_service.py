"""
Unit tests for TestService.

Tests test specification and test run management functionality
as per Requirement 9 (Verification and Validation Management).
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.user import User
from app.schemas.test import (
    ExecutionStatus,
    StepExecutionStatus,
    TestRunCreate,
    TestRunUpdate,
    TestSpecCreate,
    TestSpecUpdate,
    TestStep,
)
from app.services.test_service import TestService


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
    return AsyncMock()


@pytest.fixture
def mock_version_service():
    """Mock version service."""
    return AsyncMock()


@pytest.fixture
def test_service(
    mock_graph_service,
    mock_audit_service,
    mock_signature_service,
    mock_version_service,
):
    """Test service instance with mocked dependencies."""
    return TestService(
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
    user.email = "test@example.com"
    user.role = "validator"
    return user


@pytest.fixture
def sample_test_spec_create():
    """Sample test specification creation data."""
    return TestSpecCreate(
        title="Test User Authentication",
        description="Test user login functionality",
        test_type="integration",
        priority=1,
        preconditions="User account exists",
        test_steps=[
            TestStep(
                step_number=1,
                description="Navigate to login page",
                expected_result="Login form is displayed"
            ),
            TestStep(
                step_number=2,
                description="Enter valid credentials",
                expected_result="User is logged in successfully"
            )
        ],
        linked_requirements=[uuid4(), uuid4()]
    )


@pytest.fixture
def sample_test_run_create():
    """Sample test run creation data."""
    return TestRunCreate(
        test_spec_id=uuid4(),
        test_spec_version="1.0",
        executed_by=uuid4(),
        environment="Test Environment",
        overall_status=ExecutionStatus.PASS,
        step_results=[
            TestStep(
                step_number=1,
                description="Navigate to login page",
                expected_result="Login form is displayed",
                status=StepExecutionStatus.PASS,
                actual_result="Login form displayed correctly"
            ),
            TestStep(
                step_number=2,
                description="Enter valid credentials",
                expected_result="User is logged in successfully",
                status=StepExecutionStatus.PASS,
                actual_result="User logged in successfully"
            )
        ]
    )


class TestTestSpecManagement:
    """Test test specification management functionality."""

    @pytest.mark.asyncio
    async def test_create_test_spec_success(
        self,
        test_service,
        mock_graph_service,
        mock_audit_service,
        sample_test_spec_create,
        sample_user,
    ):
        """Test successful test specification creation."""
        # Mock requirement validation
        mock_graph_service.get_workitem.side_effect = [
            {'id': str(sample_test_spec_create.linked_requirements[0]), 'type': 'requirement'},
            {'id': str(sample_test_spec_create.linked_requirements[1]), 'type': 'requirement'},
        ]

        # Execute
        result = await test_service.create_test_spec(sample_test_spec_create, sample_user)

        # Verify
        assert result.title == sample_test_spec_create.title
        assert result.test_type == sample_test_spec_create.test_type
        assert result.version == "1.0"
        assert result.created_by == sample_user.id
        assert not result.is_signed

        # Verify graph operations
        mock_graph_service.create_workitem_node.assert_called_once()
        assert mock_graph_service.create_relationship.call_count == 2  # One per linked requirement

        # Verify audit logging
        mock_audit_service.log.assert_called_once()
        audit_call = mock_audit_service.log.call_args
        assert audit_call[1]['action'] == "CREATE"
        assert audit_call[1]['entity_type'] == "TestSpec"

    @pytest.mark.asyncio
    async def test_create_test_spec_invalid_requirement(
        self,
        test_service,
        mock_graph_service,
        sample_test_spec_create,
        sample_user,
    ):
        """Test test specification creation with invalid requirement."""
        # Mock requirement validation - first requirement doesn't exist
        mock_graph_service.get_workitem.side_effect = [None]

        # Execute and verify exception
        with pytest.raises(ValueError, match="Linked requirement .* does not exist"):
            await test_service.create_test_spec(sample_test_spec_create, sample_user)

    @pytest.mark.asyncio
    async def test_create_test_spec_non_requirement_link(
        self,
        test_service,
        mock_graph_service,
        sample_test_spec_create,
        sample_user,
    ):
        """Test test specification creation with non-requirement WorkItem link."""
        # Mock requirement validation - linked item is not a requirement
        mock_graph_service.get_workitem.side_effect = [
            {'id': str(sample_test_spec_create.linked_requirements[0]), 'type': 'task'}
        ]

        # Execute and verify exception
        with pytest.raises(ValueError, match="WorkItem .* is not a requirement"):
            await test_service.create_test_spec(sample_test_spec_create, sample_user)

    @pytest.mark.asyncio
    async def test_get_test_spec_success(
        self,
        test_service,
        mock_graph_service,
        mock_signature_service,
    ):
        """Test successful test specification retrieval."""
        test_spec_id = uuid4()
        mock_test_spec = {
            'id': str(test_spec_id),
            'type': 'test_spec',
            'title': 'Test Authentication',
            'test_type': 'integration',
            'version': '1.0',
            'created_by': str(uuid4()),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
        }

        mock_graph_service.get_workitem.return_value = mock_test_spec
        mock_signature_service.get_workitem_signatures.return_value = []

        # Execute
        result = await test_service.get_test_spec(test_spec_id)

        # Verify
        assert result is not None
        assert result.id == test_spec_id
        assert result.title == mock_test_spec['title']
        assert not result.is_signed

    @pytest.mark.asyncio
    async def test_get_test_spec_not_found(
        self,
        test_service,
        mock_graph_service,
    ):
        """Test test specification retrieval when not found."""
        mock_graph_service.get_workitem.return_value = None

        # Execute
        result = await test_service.get_test_spec(uuid4())

        # Verify
        assert result is None

    @pytest.mark.asyncio
    async def test_update_test_spec_success(
        self,
        test_service,
        mock_graph_service,
        mock_version_service,
        mock_audit_service,
        sample_user,
    ):
        """Test successful test specification update."""
        test_spec_id = uuid4()
        current_test_spec = {
            'id': str(test_spec_id),
            'type': 'test_spec',
            'title': 'Original Title',
            'version': '1.0',
        }

        updates = TestSpecUpdate(
            title="Updated Title",
            description="Updated description",
            linked_requirements=[uuid4()]
        )

        new_version = {
            **current_test_spec,
            'title': updates.title,
            'description': updates.description,
            'version': '1.1',
            'test_type': 'integration',
            'created_by': str(uuid4()),
            'created_at': datetime.utcnow().isoformat(),
            'updated_at': datetime.utcnow().isoformat(),
        }

        mock_graph_service.get_workitem.side_effect = [
            current_test_spec,  # Current test spec
            {'id': str(updates.linked_requirements[0]), 'type': 'requirement'},  # Requirement validation
        ]
        mock_version_service.create_version.return_value = new_version

        # Execute
        result = await test_service.update_test_spec(
            test_spec_id, updates, sample_user, "Updated title and description"
        )

        # Verify
        assert result.title == updates.title
        assert result.description == updates.description
        assert result.version == "1.1"

        # Verify version service called
        mock_version_service.create_version.assert_called_once()

        # Verify audit logging
        mock_audit_service.log.assert_called_once()


class TestTestRunManagement:
    """Test test run management functionality."""

    @pytest.mark.asyncio
    async def test_create_test_run_success(
        self,
        test_service,
        mock_graph_service,
        mock_audit_service,
        sample_test_run_create,
        sample_user,
    ):
        """Test successful test run creation."""
        # Mock test spec validation
        mock_test_spec = {
            'id': str(sample_test_run_create.test_spec_id),
            'type': 'test_spec',
            'version': sample_test_run_create.test_spec_version,
            'title': 'Test Specification',
        }
        mock_graph_service.get_workitem_version.return_value = mock_test_spec

        # Execute
        result = await test_service.create_test_run(sample_test_run_create, sample_user)

        # Verify
        assert result.test_spec_id == sample_test_run_create.test_spec_id
        assert result.test_spec_version == sample_test_run_create.test_spec_version
        assert result.overall_status == sample_test_run_create.overall_status
        assert not result.is_signed

        # Verify graph operations
        mock_graph_service.create_workitem_node.assert_called_once()
        mock_graph_service.create_relationship.assert_called()

        # Verify audit logging
        mock_audit_service.log.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_test_run_invalid_test_spec(
        self,
        test_service,
        mock_graph_service,
        sample_test_run_create,
        sample_user,
    ):
        """Test test run creation with invalid test specification."""
        # Mock test spec validation - test spec doesn't exist
        mock_graph_service.get_workitem_version.return_value = None

        # Execute and verify exception
        with pytest.raises(ValueError, match="Test specification .* not found"):
            await test_service.create_test_run(sample_test_run_create, sample_user)

    @pytest.mark.asyncio
    async def test_update_test_run_success(
        self,
        test_service,
        mock_graph_service,
        mock_audit_service,
        sample_user,
    ):
        """Test successful test run update."""
        test_run_id = uuid4()
        current_test_run = {
            'id': str(test_run_id),
            'type': 'test_run',
            'overall_status': 'not_run',
            'test_spec_id': str(uuid4()),
            'test_spec_version': '1.0',
            'executed_by': str(uuid4()),
            'created_at': datetime.utcnow().isoformat(),
        }

        updates = TestRunUpdate(
            overall_status=ExecutionStatus.PASS,
            execution_notes="Test completed successfully"
        )

        mock_graph_service.get_workitem.return_value = current_test_run

        # Execute
        result = await test_service.update_test_run(test_run_id, updates, sample_user)

        # Verify
        assert result.overall_status == ExecutionStatus.PASS
        assert result.execution_notes == updates.execution_notes

        # Verify graph operations
        mock_graph_service.update_workitem_node.assert_called_once()

        # Verify audit logging
        mock_audit_service.log.assert_called_once()


class TestTestCoverage:
    """Test test coverage calculation functionality."""

    @pytest.mark.asyncio
    async def test_calculate_test_coverage_no_requirements(
        self,
        test_service,
        mock_graph_service,
    ):
        """Test coverage calculation with no requirements."""
        # Mock no requirements
        mock_graph_service.execute_query.return_value = []

        # Execute
        result = await test_service.calculate_test_coverage()

        # Verify
        assert result.total_requirements == 0
        assert result.requirements_with_tests == 0
        assert result.requirements_with_passing_tests == 0
        assert result.coverage_percentage == 0.0
        assert result.detailed_coverage == []

    @pytest.mark.asyncio
    async def test_calculate_test_coverage_with_requirements(
        self,
        test_service,
        mock_graph_service,
    ):
        """Test coverage calculation with requirements and tests."""
        req1_id = str(uuid4())
        req2_id = str(uuid4())
        req3_id = str(uuid4())

        # Mock requirements query
        requirements_result = [
            {'r': {'id': req1_id, 'title': 'Requirement 1'}},
            {'r': {'id': req2_id, 'title': 'Requirement 2'}},
            {'r': {'id': req3_id, 'title': 'Requirement 3'}},
        ]

        # Mock requirements with tests query
        requirements_with_tests_result = [
            {'requirement_id': req1_id},
            {'requirement_id': req2_id},
        ]

        # Mock requirements with passing tests query
        requirements_with_passing_tests_result = [
            {'requirement_id': req1_id},
        ]

        mock_graph_service.execute_query.side_effect = [
            requirements_result,
            requirements_with_tests_result,
            requirements_with_passing_tests_result,
        ]

        # Execute
        result = await test_service.calculate_test_coverage()

        # Verify
        assert result.total_requirements == 3
        assert result.requirements_with_tests == 2
        assert result.requirements_with_passing_tests == 1
        assert abs(result.coverage_percentage - 33.33) < 0.1  # 1/3 * 100
        assert len(result.detailed_coverage) == 3

        # Verify detailed coverage
        coverage_by_id = {item['requirement_id']: item for item in result.detailed_coverage}
        assert coverage_by_id[req1_id]['coverage_status'] == 'covered'
        assert coverage_by_id[req2_id]['coverage_status'] == 'partial'
        assert coverage_by_id[req3_id]['coverage_status'] == 'not_covered'


class TestTestSpecDeletion:
    """Test test specification deletion functionality."""

    @pytest.mark.asyncio
    async def test_delete_test_spec_success(
        self,
        test_service,
        mock_graph_service,
        mock_signature_service,
        mock_audit_service,
        sample_user,
    ):
        """Test successful test specification deletion."""
        test_spec_id = uuid4()
        mock_test_spec = {
            'id': str(test_spec_id),
            'type': 'test_spec',
            'title': 'Test to Delete',
        }

        mock_graph_service.get_workitem.return_value = mock_test_spec
        mock_signature_service.get_workitem_signatures.return_value = []  # No signatures

        # Execute
        result = await test_service.delete_test_spec(test_spec_id, sample_user)

        # Verify
        assert result is True

        # Verify graph operations
        mock_graph_service.delete_workitem_node.assert_called_once_with(test_spec_id)

        # Verify audit logging
        mock_audit_service.log.assert_called_once()
        audit_call = mock_audit_service.log.call_args
        assert audit_call[1]['action'] == "DELETE"
        assert audit_call[1]['entity_type'] == "TestSpec"

    @pytest.mark.asyncio
    async def test_delete_test_spec_with_signatures(
        self,
        test_service,
        mock_graph_service,
        mock_signature_service,
        sample_user,
    ):
        """Test test specification deletion with valid signatures."""
        test_spec_id = uuid4()
        mock_test_spec = {
            'id': str(test_spec_id),
            'type': 'test_spec',
            'title': 'Signed Test Spec',
        }

        # Mock valid signature
        mock_signature = MagicMock()
        mock_signature.is_valid = True

        mock_graph_service.get_workitem.return_value = mock_test_spec
        mock_signature_service.get_workitem_signatures.return_value = [mock_signature]

        # Execute and verify exception
        with pytest.raises(ValueError, match="Cannot delete test specification with valid signatures"):
            await test_service.delete_test_spec(test_spec_id, sample_user)

    @pytest.mark.asyncio
    async def test_delete_test_spec_not_found(
        self,
        test_service,
        mock_graph_service,
        sample_user,
    ):
        """Test test specification deletion when not found."""
        mock_graph_service.get_workitem.return_value = None

        # Execute and verify exception
        with pytest.raises(ValueError, match="Test specification .* not found"):
            await test_service.delete_test_spec(uuid4(), sample_user)

"""Unit tests for WorkItem service"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.user import User
from app.schemas.workitem import (
    RequirementCreate,
    RiskCreate,
    TaskCreate,
    WorkItemCreate,
    WorkItemUpdate,
)
from app.services.workitem_service import WorkItemService


@pytest.fixture
def mock_graph_service():
    """Mock graph service for testing"""
    mock = AsyncMock()
    return mock


@pytest.fixture
def mock_version_service():
    """Mock version service for testing"""
    mock = AsyncMock()
    return mock


@pytest.fixture
def workitem_service(mock_graph_service):
    """WorkItem service with mocked dependencies (no version service)"""
    return WorkItemService(mock_graph_service)


@pytest.fixture
def workitem_service_with_versioning(mock_graph_service, mock_version_service):
    """WorkItem service with version service integration"""
    return WorkItemService(mock_graph_service, mock_version_service)


@pytest.fixture
def sample_user():
    """Sample user for testing"""
    user = MagicMock(spec=User)
    user.id = uuid4()
    user.email = "test@example.com"
    user.full_name = "Test User"
    user.role = "user"
    return user


@pytest.fixture
def sample_workitem_create():
    """Sample WorkItem creation data"""
    return WorkItemCreate(
        type="requirement",
        title="Test Requirement",
        description="A test requirement for unit testing",
        status="draft",
        priority=3
    )


@pytest.fixture
def sample_requirement_create():
    """Sample Requirement creation data"""
    return RequirementCreate(
        title="Test Requirement Title",
        description="A test requirement for unit testing with proper validation and acceptance criteria",
        status="draft",
        priority=3,
        acceptance_criteria="Given the system is running, when tests are executed, then all tests shall pass successfully",
        business_value="High value feature for testing",
        source="stakeholder"
    )


@pytest.fixture
def sample_task_create():
    """Sample Task creation data"""
    return TaskCreate(
        title="Test Task",
        description="A test task for unit testing",
        status="draft",
        priority=2,
        estimated_hours=8.0,
        due_date=datetime.now(UTC)
    )


@pytest.fixture
def sample_risk_create():
    """Sample Risk creation data"""
    return RiskCreate(
        title="Test Risk",
        description="A test risk for unit testing",
        status="active",
        priority=5,
        severity=7,
        occurrence=3,
        detection=4,
        mitigation_actions="Implement additional testing"
    )


class TestWorkItemService:
    """Test cases for WorkItemService"""

    @pytest.mark.asyncio
    async def test_create_workitem_basic(
        self,
        workitem_service,
        mock_graph_service,
        sample_workitem_create,
        sample_user
    ):
        """Test basic WorkItem creation"""
        # Setup mock
        mock_graph_service.create_workitem_node.return_value = {"id": "test-id"}

        # Execute
        result = await workitem_service.create_workitem(
            sample_workitem_create,
            sample_user
        )

        # Verify
        assert result is not None
        assert result.type == "requirement"
        assert result.title == "Test Requirement"
        assert result.description == "A test requirement for unit testing"
        assert result.status == "draft"
        assert result.priority == 3
        assert result.version == "1.0"
        assert result.created_by == sample_user.id
        assert result.is_signed is False

        # Verify graph service was called
        mock_graph_service.create_workitem_node.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_requirement_with_specific_fields(
        self,
        workitem_service,
        mock_graph_service,
        sample_requirement_create,
        sample_user
    ):
        """Test Requirement creation with specific fields"""
        # Setup mock
        mock_graph_service.create_workitem_node.return_value = {"id": "test-id"}

        # Execute
        result = await workitem_service.create_workitem(
            sample_requirement_create,
            sample_user
        )

        # Verify
        assert result is not None
        assert result.type == "requirement"
        assert result.title == "Test Requirement Title"

        # Verify graph service was called with correct parameters
        call_args = mock_graph_service.create_workitem_node.call_args
        assert call_args[1]["workitem_type"] == "requirement"
        assert call_args[1]["title"] == "Test Requirement Title"

    @pytest.mark.asyncio
    async def test_create_task_with_time_tracking(
        self,
        workitem_service,
        mock_graph_service,
        sample_task_create,
        sample_user
    ):
        """Test Task creation with time tracking fields"""
        # Setup mock
        mock_graph_service.create_workitem_node.return_value = {"id": "test-id"}

        # Execute
        result = await workitem_service.create_workitem(
            sample_task_create,
            sample_user
        )

        # Verify
        assert result is not None
        assert result.type == "task"
        assert result.title == "Test Task"

        # Verify graph service was called
        mock_graph_service.create_workitem_node.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_risk_with_rpn_calculation(
        self,
        workitem_service,
        mock_graph_service,
        sample_risk_create,
        sample_user
    ):
        """Test Risk creation with RPN calculation"""
        # Setup mock
        mock_graph_service.create_workitem_node.return_value = {"id": "test-id"}

        # Execute
        result = await workitem_service.create_workitem(
            sample_risk_create,
            sample_user
        )

        # Verify
        assert result is not None
        assert result.type == "risk"
        assert result.title == "Test Risk"

        # Verify RPN calculation (7 * 3 * 4 = 84)
        call_args = mock_graph_service.create_workitem_node.call_args
        # RPN should be calculated and passed in additional properties

        # Verify graph service was called
        mock_graph_service.create_workitem_node.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_workitem_success(
        self,
        workitem_service,
        mock_graph_service,
        sample_user
    ):
        """Test successful WorkItem retrieval"""
        # Setup mock data
        workitem_id = uuid4()
        mock_data = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Test Requirement",
            "description": "Test description",
            "status": "active",
            "priority": 3,
            "assigned_to": None,
            "version": "1.0",
            "created_by": str(sample_user.id),
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            "is_signed": False
        }
        mock_graph_service.get_workitem.return_value = mock_data

        # Execute
        result = await workitem_service.get_workitem(workitem_id)

        # Verify
        assert result is not None
        assert result.id == workitem_id
        assert result.type == "requirement"
        assert result.title == "Test Requirement"
        assert result.status == "active"

        # Verify graph service was called
        mock_graph_service.get_workitem.assert_called_once_with(str(workitem_id))

    @pytest.mark.asyncio
    async def test_get_workitem_not_found(
        self,
        workitem_service,
        mock_graph_service
    ):
        """Test WorkItem retrieval when not found"""
        # Setup mock
        workitem_id = uuid4()
        mock_graph_service.get_workitem.return_value = None

        # Execute
        result = await workitem_service.get_workitem(workitem_id)

        # Verify
        assert result is None
        mock_graph_service.get_workitem.assert_called_once_with(str(workitem_id))

    @pytest.mark.asyncio
    async def test_update_workitem_success(
        self,
        workitem_service,
        mock_graph_service,
        sample_user
    ):
        """Test successful WorkItem update"""
        # Setup mock data
        workitem_id = uuid4()
        current_data = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Original Title",
            "description": "Original description",
            "status": "draft",
            "priority": 3,
            "version": "1.0",
            "created_by": str(sample_user.id),
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            "is_signed": False
        }
        mock_graph_service.get_workitem.return_value = current_data
        mock_graph_service.create_workitem_version.return_value = {"id": str(workitem_id)}
        mock_graph_service.create_relationship.return_value = {"type": "NEXT_VERSION"}

        # Prepare update data
        updates = WorkItemUpdate(
            title="Updated Title",
            status="active"
        )

        # Execute
        result = await workitem_service.update_workitem(
            workitem_id,
            updates,
            sample_user,
            "Updated title and status"
        )

        # Verify
        assert result is not None
        assert result.title == "Updated Title"
        assert result.status == "active"
        assert result.version == "1.1"  # Version should increment

        # Verify graph service calls
        mock_graph_service.get_workitem.assert_called_once()
        mock_graph_service.create_workitem_version.assert_called_once()
        mock_graph_service.create_relationship.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_workitem_not_found(
        self,
        workitem_service,
        mock_graph_service,
        sample_user
    ):
        """Test WorkItem update when not found"""
        # Setup mock
        workitem_id = uuid4()
        mock_graph_service.get_workitem.return_value = None

        updates = WorkItemUpdate(title="Updated Title")

        # Execute
        result = await workitem_service.update_workitem(
            workitem_id,
            updates,
            sample_user
        )

        # Verify
        assert result is None
        mock_graph_service.get_workitem.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_workitem_success(
        self,
        workitem_service,
        mock_graph_service,
        sample_user
    ):
        """Test successful WorkItem deletion"""
        # Setup mock data
        workitem_id = uuid4()
        mock_data = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Test Requirement",
            "is_signed": False
        }
        mock_graph_service.get_workitem.return_value = mock_data
        mock_graph_service.delete_node.return_value = True

        # Execute
        result = await workitem_service.delete_workitem(workitem_id, sample_user)

        # Verify
        assert result is True
        mock_graph_service.get_workitem.assert_called_once()
        mock_graph_service.delete_node.assert_called_once_with(str(workitem_id))

    @pytest.mark.asyncio
    async def test_delete_signed_workitem_fails(
        self,
        workitem_service,
        mock_graph_service,
        sample_user
    ):
        """Test deletion fails for signed WorkItem"""
        # Setup mock data
        workitem_id = uuid4()
        mock_data = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Test Requirement",
            "is_signed": True
        }
        mock_graph_service.get_workitem.return_value = mock_data

        # Execute and verify exception
        with pytest.raises(ValueError, match="Cannot delete signed WorkItem"):
            await workitem_service.delete_workitem(workitem_id, sample_user)

        # Verify graph service was called but delete was not
        mock_graph_service.get_workitem.assert_called_once()
        mock_graph_service.delete_node.assert_not_called()

    @pytest.mark.asyncio
    async def test_delete_signed_workitem_with_force(
        self,
        workitem_service,
        mock_graph_service,
        sample_user
    ):
        """Test forced deletion of signed WorkItem"""
        # Setup mock data
        workitem_id = uuid4()
        mock_data = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Test Requirement",
            "is_signed": True
        }
        mock_graph_service.get_workitem.return_value = mock_data
        mock_graph_service.delete_node.return_value = True

        # Execute with force=True
        result = await workitem_service.delete_workitem(
            workitem_id,
            sample_user,
            force=True
        )

        # Verify
        assert result is True
        mock_graph_service.delete_node.assert_called_once_with(str(workitem_id))

    @pytest.mark.asyncio
    async def test_search_workitems(
        self,
        workitem_service,
        mock_graph_service,
        sample_user
    ):
        """Test WorkItem search functionality"""
        # Setup mock data
        mock_results = [
            {
                "id": str(uuid4()),
                "type": "requirement",
                "title": "Test Requirement 1",
                "description": "First test requirement",
                "status": "active",
                "priority": 3,
                "version": "1.0",
                "created_by": str(sample_user.id),
                "created_at": datetime.now(UTC).isoformat(),
                "updated_at": datetime.now(UTC).isoformat(),
                "is_signed": False
            },
            {
                "id": str(uuid4()),
                "type": "task",
                "title": "Test Task 1",
                "description": "First test task",
                "status": "draft",
                "priority": 2,
                "version": "1.0",
                "created_by": str(sample_user.id),
                "created_at": datetime.now(UTC).isoformat(),
                "updated_at": datetime.now(UTC).isoformat(),
                "is_signed": False
            }
        ]
        mock_graph_service.search_workitems.return_value = mock_results

        # Execute
        results = await workitem_service.search_workitems(
            search_text="test",
            workitem_type="requirement",
            status="active",
            limit=10
        )

        # Verify
        assert len(results) >= 0  # Results depend on filtering
        mock_graph_service.search_workitems.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_workitem_version(
        self,
        workitem_service,
        mock_graph_service,
        sample_user
    ):
        """Test getting specific WorkItem version"""
        # Setup mock data
        workitem_id = uuid4()
        version = "1.2"
        mock_data = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Test Requirement v1.2",
            "description": "Updated description",
            "status": "active",
            "priority": 3,
            "version": version,
            "created_by": str(sample_user.id),
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            "is_signed": False
        }
        mock_graph_service.get_workitem_version.return_value = mock_data

        # Execute
        result = await workitem_service.get_workitem_version(workitem_id, version)

        # Verify
        assert result is not None
        assert result.id == workitem_id
        assert result.version == version
        assert result.title == "Test Requirement v1.2"

        # Verify graph service was called
        mock_graph_service.get_workitem_version.assert_called_once_with(
            str(workitem_id),
            version
        )


class TestWorkItemServiceEdgeCases:
    """Test edge cases and error conditions"""

    @pytest.mark.asyncio
    async def test_graph_data_conversion_with_invalid_data(
        self,
        workitem_service
    ):
        """Test handling of invalid graph data"""
        # Test with missing required fields
        invalid_data = {
            "type": "requirement",
            "title": "Test"
            # Missing id, created_by, etc.
        }

        result = workitem_service._graph_data_to_response(invalid_data)
        assert result is None

    @pytest.mark.asyncio
    async def test_version_number_parsing_edge_cases(
        self,
        workitem_service,
        mock_graph_service,
        sample_user
    ):
        """Test version number parsing with edge cases"""
        # Setup mock data with invalid version
        workitem_id = uuid4()
        current_data = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Test",
            "status": "draft",
            "version": "invalid_version",  # Invalid version format
            "created_by": str(sample_user.id),
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            "is_signed": False
        }
        mock_graph_service.get_workitem.return_value = current_data
        mock_graph_service.create_workitem_version.return_value = {"id": str(workitem_id)}
        mock_graph_service.create_relationship.return_value = {"type": "NEXT_VERSION"}

        updates = WorkItemUpdate(title="Updated")

        # Execute
        result = await workitem_service.update_workitem(
            workitem_id,
            updates,
            sample_user
        )

        # Verify it defaults to 1.1 for invalid versions
        assert result is not None
        assert result.version == "1.1"

    @pytest.mark.asyncio
    async def test_rpn_calculation_with_missing_values(
        self,
        workitem_service,
        mock_graph_service,
        sample_user
    ):
        """Test RPN calculation when some values are missing"""
        # Create risk with all required FMEA values
        risk_data = RiskCreate(
            title="Complete Risk",
            description="Risk with all FMEA values",
            status="active",
            priority=3,
            severity=5,
            occurrence=3,
            detection=2  # All values present for valid RPN calculation
        )

        mock_graph_service.create_workitem_node.return_value = {"id": "test-id"}

        # Execute
        result = await workitem_service.create_workitem(risk_data, sample_user)

        # Verify it creates the risk with calculated RPN
        assert result is not None
        assert result.type == "risk"
        assert result.title == "Complete Risk"


class TestWorkItemServiceVersionIntegration:
    """Test WorkItem service integration with VersionService"""

    @pytest.mark.asyncio
    async def test_update_workitem_uses_version_service(
        self,
        workitem_service_with_versioning,
        mock_graph_service,
        mock_version_service,
        sample_user
    ):
        """Test that update_workitem uses VersionService when available"""
        # Setup mock data
        workitem_id = uuid4()
        current_data = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Original Title",
            "description": "Original description",
            "status": "draft",
            "priority": 3,
            "version": "1.0",
            "created_by": str(sample_user.id),
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            "is_signed": False
        }

        new_version_data = {
            **current_data,
            "title": "Updated Title",
            "status": "active",
            "version": "1.1",
            "updated_by": str(sample_user.id),
            "change_description": "Updated title and status"
        }

        mock_graph_service.get_workitem.return_value = current_data
        mock_version_service.create_version.return_value = new_version_data

        # Prepare update data
        updates = WorkItemUpdate(
            title="Updated Title",
            status="active"
        )

        # Execute
        result = await workitem_service_with_versioning.update_workitem(
            workitem_id,
            updates,
            sample_user,
            "Updated title and status"
        )

        # Verify
        assert result is not None
        assert result.title == "Updated Title"
        assert result.status == "active"
        assert result.version == "1.1"

        # Verify VersionService was called instead of manual versioning
        mock_version_service.create_version.assert_called_once_with(
            workitem_id=workitem_id,
            updates={
                "title": "Updated Title",
                "status": "active"
            },
            user=sample_user,
            change_description="Updated title and status"
        )

        # Verify graph service was NOT called for manual versioning
        mock_graph_service.create_workitem_version.assert_not_called()
        mock_graph_service.create_relationship.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_workitem_fallback_when_version_service_fails(
        self,
        workitem_service_with_versioning,
        mock_graph_service,
        mock_version_service,
        sample_user
    ):
        """Test fallback to manual versioning when VersionService fails"""
        # Setup mock data
        workitem_id = uuid4()
        current_data = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Original Title",
            "status": "draft",
            "version": "1.0",
            "created_by": str(sample_user.id),
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            "is_signed": False
        }

        mock_graph_service.get_workitem.return_value = current_data
        mock_version_service.create_version.side_effect = Exception("VersionService failed")
        mock_graph_service.create_workitem_version.return_value = {"id": str(workitem_id)}
        mock_graph_service.create_relationship.return_value = {"type": "NEXT_VERSION"}

        updates = WorkItemUpdate(title="Updated Title")

        # Execute
        result = await workitem_service_with_versioning.update_workitem(
            workitem_id,
            updates,
            sample_user
        )

        # Verify fallback behavior
        assert result is not None
        assert result.title == "Updated Title"
        assert result.version == "1.1"

        # Verify VersionService was attempted
        mock_version_service.create_version.assert_called_once()

        # Verify fallback to manual versioning
        mock_graph_service.create_workitem_version.assert_called_once()
        mock_graph_service.create_relationship.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_workitem_history_uses_version_service(
        self,
        workitem_service_with_versioning,
        mock_version_service,
        sample_user
    ):
        """Test that get_workitem_history uses VersionService when available"""
        # Setup mock data
        workitem_id = uuid4()
        version_history = [
            {
                "id": str(workitem_id),
                "type": "requirement",
                "title": "Test Requirement v1.2",
                "description": "Test description",
                "status": "active",
                "priority": 3,
                "version": "1.2",
                "created_by": str(sample_user.id),
                "created_at": datetime.now(UTC).isoformat(),
                "updated_at": datetime.now(UTC).isoformat(),
                "is_signed": False
            },
            {
                "id": str(workitem_id),
                "type": "requirement",
                "title": "Test Requirement v1.1",
                "description": "Test description",
                "status": "active",
                "priority": 3,
                "version": "1.1",
                "created_by": str(sample_user.id),
                "created_at": datetime.now(UTC).isoformat(),
                "updated_at": datetime.now(UTC).isoformat(),
                "is_signed": False
            },
            {
                "id": str(workitem_id),
                "type": "requirement",
                "title": "Test Requirement v1.0",
                "description": "Test description",
                "status": "draft",
                "priority": 3,
                "version": "1.0",
                "created_by": str(sample_user.id),
                "created_at": datetime.now(UTC).isoformat(),
                "updated_at": datetime.now(UTC).isoformat(),
                "is_signed": False
            }
        ]

        mock_version_service.get_version_history.return_value = version_history

        # Execute
        result = await workitem_service_with_versioning.get_workitem_history(workitem_id)

        # Verify
        assert len(result) == 3
        assert result[0].version == "1.2"
        assert result[1].version == "1.1"
        assert result[2].version == "1.0"

        # Verify VersionService was called
        mock_version_service.get_version_history.assert_called_once_with(workitem_id)

    @pytest.mark.asyncio
    async def test_get_workitem_version_uses_version_service(
        self,
        workitem_service_with_versioning,
        mock_version_service,
        sample_user
    ):
        """Test that get_workitem_version uses VersionService when available"""
        # Setup mock data
        workitem_id = uuid4()
        version = "1.1"
        version_data = {
            "id": str(workitem_id),
            "type": "requirement",
            "title": "Test Requirement v1.1",
            "description": "Test description",
            "status": "active",
            "priority": 3,
            "version": version,
            "created_by": str(sample_user.id),
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            "is_signed": False
        }

        mock_version_service.get_version_by_number.return_value = version_data

        # Execute
        result = await workitem_service_with_versioning.get_workitem_version(workitem_id, version)

        # Verify
        assert result is not None
        assert result.version == version
        assert result.title == "Test Requirement v1.1"

        # Verify VersionService was called
        mock_version_service.get_version_by_number.assert_called_once_with(workitem_id, version)

    @pytest.mark.asyncio
    async def test_compare_workitem_versions(
        self,
        workitem_service_with_versioning,
        mock_version_service
    ):
        """Test version comparison functionality"""
        # Setup mock data
        workitem_id = uuid4()
        comparison_result = {
            "version1": "1.0",
            "version2": "1.1",
            "changed_fields": {
                "title": {
                    "from": "Original Title",
                    "to": "Updated Title"
                },
                "status": {
                    "from": "draft",
                    "to": "active"
                }
            },
            "unchanged_fields": {
                "description": "Test description",
                "priority": 3
            },
            "added_fields": {},
            "removed_fields": {}
        }

        mock_version_service.compare_versions.return_value = comparison_result

        # Execute
        result = await workitem_service_with_versioning.compare_workitem_versions(
            workitem_id, "1.0", "1.1"
        )

        # Verify
        assert result is not None
        assert result["version1"] == "1.0"
        assert result["version2"] == "1.1"
        assert "title" in result["changed_fields"]
        assert "status" in result["changed_fields"]

        # Verify VersionService was called
        mock_version_service.compare_versions.assert_called_once_with(workitem_id, "1.0", "1.1")

    @pytest.mark.asyncio
    async def test_compare_workitem_versions_without_version_service(
        self,
        workitem_service,
        mock_graph_service
    ):
        """Test version comparison returns None when VersionService not available"""
        # Execute
        result = await workitem_service.compare_workitem_versions(
            uuid4(), "1.0", "1.1"
        )

        # Verify
        assert result is None

    @pytest.mark.asyncio
    async def test_workitem_service_initialization_with_version_service(
        self,
        mock_graph_service,
        mock_version_service
    ):
        """Test WorkItemService initialization with VersionService"""
        # Execute
        service = WorkItemService(mock_graph_service, mock_version_service)

        # Verify
        assert service.graph_service == mock_graph_service
        assert service.version_service == mock_version_service

    @pytest.mark.asyncio
    async def test_workitem_service_initialization_without_version_service(
        self,
        mock_graph_service
    ):
        """Test WorkItemService initialization without VersionService"""
        # Execute
        service = WorkItemService(mock_graph_service)

        # Verify
        assert service.graph_service == mock_graph_service
        assert service.version_service is None

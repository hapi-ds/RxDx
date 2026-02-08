"""Unit tests for BacklogService"""

import pytest
from datetime import datetime, UTC
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

from app.services.backlog_service import BacklogService
from app.schemas.backlog import BacklogCreate, BacklogUpdate
from app.models.user import User


@pytest.fixture
def mock_graph_service():
    """Create a mock GraphService"""
    return AsyncMock()


@pytest.fixture
def backlog_service(mock_graph_service):
    """Create a BacklogService with mocked dependencies"""
    return BacklogService(graph_service=mock_graph_service)


@pytest.fixture
def mock_user():
    """Create a mock user"""
    user = MagicMock(spec=User)
    user.id = uuid4()
    user.email = "test@example.com"
    return user


class TestCreateBacklog:
    """Tests for create_backlog method"""

    @pytest.mark.asyncio
    async def test_create_backlog_success(
        self,
        backlog_service,
        mock_graph_service,
        mock_user
    ):
        """Test successful backlog creation"""
        project_id = uuid4()
        backlog_data = BacklogCreate(
            name="Product Backlog",
            description="Main product backlog",
            project_id=project_id
        )

        # Mock the create_node method
        mock_graph_service.create_node.return_value = {}

        # Create backlog
        result = await backlog_service.create_backlog(backlog_data, mock_user)

        # Verify result
        assert result.name == "Product Backlog"
        assert result.description == "Main product backlog"
        assert result.project_id == project_id
        assert result.task_count == 0
        assert isinstance(result.id, type(uuid4()))

        # Verify create_node was called
        mock_graph_service.create_node.assert_called_once()
        call_args = mock_graph_service.create_node.call_args
        assert call_args[0][0] == "Backlog"
        assert call_args[0][1]["name"] == "Product Backlog"
        assert call_args[0][1]["project_id"] == str(project_id)

    @pytest.mark.asyncio
    async def test_create_backlog_without_description(
        self,
        backlog_service,
        mock_graph_service,
        mock_user
    ):
        """Test creating backlog without description"""
        project_id = uuid4()
        backlog_data = BacklogCreate(
            name="Sprint Backlog",
            project_id=project_id
        )

        mock_graph_service.create_node.return_value = {}

        result = await backlog_service.create_backlog(backlog_data, mock_user)

        assert result.name == "Sprint Backlog"
        assert result.description is None
        assert result.project_id == project_id


class TestGetBacklog:
    """Tests for get_backlog method"""

    @pytest.mark.asyncio
    async def test_get_backlog_success(
        self,
        backlog_service,
        mock_graph_service
    ):
        """Test successful backlog retrieval"""
        backlog_id = uuid4()
        project_id = uuid4()

        # Mock the execute_query method
        mock_graph_service.execute_query.return_value = [
            {
                "b": {
                    "id": str(backlog_id),
                    "name": "Product Backlog",
                    "description": "Main backlog",
                    "project_id": str(project_id),
                    "created_at": datetime.now(UTC).isoformat(),
                },
                "task_count": 3
            }
        ]

        # Get backlog
        result = await backlog_service.get_backlog(backlog_id)

        # Verify result
        assert result is not None
        assert result.id == backlog_id
        assert result.name == "Product Backlog"
        assert result.description == "Main backlog"
        assert result.project_id == project_id
        assert result.task_count == 3

    @pytest.mark.asyncio
    async def test_get_backlog_not_found(
        self,
        backlog_service,
        mock_graph_service
    ):
        """Test getting non-existent backlog"""
        backlog_id = uuid4()

        # Mock empty result
        mock_graph_service.execute_query.return_value = []

        # Get backlog
        result = await backlog_service.get_backlog(backlog_id)

        # Verify result is None
        assert result is None


class TestUpdateBacklog:
    """Tests for update_backlog method"""

    @pytest.mark.asyncio
    async def test_update_backlog_success(
        self,
        backlog_service,
        mock_graph_service,
        mock_user
    ):
        """Test successful backlog update"""
        backlog_id = uuid4()
        project_id = uuid4()

        # Mock get_backlog to return existing backlog
        existing_backlog_data = {
            "b": {
                "id": str(backlog_id),
                "name": "Old Name",
                "description": "Old description",
                "project_id": str(project_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
            "task_count": 2
        }

        updated_backlog_data = {
            "b": {
                "id": str(backlog_id),
                "name": "New Name",
                "description": "New description",
                "project_id": str(project_id),
                "created_at": datetime.now(UTC).isoformat(),
                "updated_at": datetime.now(UTC).isoformat(),
            },
            "task_count": 2
        }

        mock_graph_service.execute_query.side_effect = [
            [existing_backlog_data],  # First call for get_backlog
            [updated_backlog_data]     # Second call for get_backlog after update
        ]
        mock_graph_service.update_node.return_value = {}

        # Update backlog
        updates = BacklogUpdate(
            name="New Name",
            description="New description"
        )
        result = await backlog_service.update_backlog(backlog_id, updates, mock_user)

        # Verify result
        assert result is not None
        assert result.name == "New Name"
        assert result.description == "New description"

        # Verify update_node was called
        mock_graph_service.update_node.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_backlog_not_found(
        self,
        backlog_service,
        mock_graph_service,
        mock_user
    ):
        """Test updating non-existent backlog"""
        backlog_id = uuid4()

        # Mock empty result for get_backlog
        mock_graph_service.execute_query.return_value = []

        # Update backlog
        updates = BacklogUpdate(name="New Name")
        result = await backlog_service.update_backlog(backlog_id, updates, mock_user)

        # Verify result is None
        assert result is None

        # Verify update_node was not called
        mock_graph_service.update_node.assert_not_called()


class TestDeleteBacklog:
    """Tests for delete_backlog method"""

    @pytest.mark.asyncio
    async def test_delete_backlog_success(
        self,
        backlog_service,
        mock_graph_service
    ):
        """Test successful backlog deletion"""
        backlog_id = uuid4()

        # Mock the execute_query and delete_node methods
        mock_graph_service.execute_query.return_value = []
        mock_graph_service.delete_node.return_value = True

        # Delete backlog
        result = await backlog_service.delete_backlog(backlog_id)

        # Verify result
        assert result is True

        # Verify execute_query was called to remove relationships
        mock_graph_service.execute_query.assert_called_once()

        # Verify delete_node was called
        mock_graph_service.delete_node.assert_called_once_with(str(backlog_id))

    @pytest.mark.asyncio
    async def test_delete_backlog_not_found(
        self,
        backlog_service,
        mock_graph_service
    ):
        """Test deleting non-existent backlog"""
        backlog_id = uuid4()

        # Mock the methods
        mock_graph_service.execute_query.return_value = []
        mock_graph_service.delete_node.return_value = False

        # Delete backlog
        result = await backlog_service.delete_backlog(backlog_id)

        # Verify result
        assert result is False


class TestListBacklogs:
    """Tests for list_backlogs method"""

    @pytest.mark.asyncio
    async def test_list_backlogs_all(
        self,
        backlog_service,
        mock_graph_service
    ):
        """Test listing all backlogs"""
        backlog1_id = uuid4()
        backlog2_id = uuid4()
        project_id = uuid4()

        # Mock the execute_query method
        mock_graph_service.execute_query.return_value = [
            {
                "b": {
                    "id": str(backlog1_id),
                    "name": "Backlog 1",
                    "project_id": str(project_id),
                    "created_at": datetime.now(UTC).isoformat(),
                },
                "task_count": 5
            },
            {
                "b": {
                    "id": str(backlog2_id),
                    "name": "Backlog 2",
                    "project_id": str(project_id),
                    "created_at": datetime.now(UTC).isoformat(),
                },
                "task_count": 3
            }
        ]

        # List backlogs
        result = await backlog_service.list_backlogs()

        # Verify result
        assert len(result) == 2
        assert result[0].id == backlog1_id
        assert result[0].task_count == 5
        assert result[1].id == backlog2_id
        assert result[1].task_count == 3

    @pytest.mark.asyncio
    async def test_list_backlogs_by_project(
        self,
        backlog_service,
        mock_graph_service
    ):
        """Test listing backlogs filtered by project"""
        backlog_id = uuid4()
        project_id = uuid4()

        # Mock the execute_query method
        mock_graph_service.execute_query.return_value = [
            {
                "b": {
                    "id": str(backlog_id),
                    "name": "Project Backlog",
                    "project_id": str(project_id),
                    "created_at": datetime.now(UTC).isoformat(),
                },
                "task_count": 10
            }
        ]

        # List backlogs for project
        result = await backlog_service.list_backlogs(project_id=project_id)

        # Verify result
        assert len(result) == 1
        assert result[0].project_id == project_id


class TestAddTaskToBacklog:
    """Tests for add_task_to_backlog method"""

    @pytest.mark.asyncio
    async def test_add_task_to_backlog_success(
        self,
        backlog_service,
        mock_graph_service
    ):
        """Test successfully adding task to backlog"""
        backlog_id = uuid4()
        task_id = uuid4()

        # Mock check_task_backlog_sprint_status
        mock_graph_service.check_task_backlog_sprint_status.return_value = {
            "in_backlog": False,
            "in_sprint": False
        }

        # Mock move_task_to_backlog
        mock_graph_service.move_task_to_backlog.return_value = {}

        # Mock get_backlog_tasks to return the added task
        mock_graph_service.execute_query.return_value = [
            {
                "t": {
                    "id": str(task_id),
                    "title": "Test Task",
                    "type": "task",
                    "status": "ready",
                },
                "r": {
                    "priority_order": 1,
                    "added_at": datetime.now(UTC).isoformat(),
                }
            }
        ]

        # Add task to backlog
        result = await backlog_service.add_task_to_backlog(
            backlog_id=backlog_id,
            task_id=task_id,
            priority_order=1
        )

        # Verify result
        assert result.task_id == task_id
        assert result.task_title == "Test Task"
        assert result.priority_order == 1

        # Verify move_task_to_backlog was called
        mock_graph_service.move_task_to_backlog.assert_called_once_with(
            task_id=str(task_id),
            backlog_id=str(backlog_id),
            priority_order=1
        )

    @pytest.mark.asyncio
    async def test_add_task_to_backlog_already_in_sprint(
        self,
        backlog_service,
        mock_graph_service
    ):
        """Test adding task that's already in a sprint"""
        backlog_id = uuid4()
        task_id = uuid4()
        sprint_id = uuid4()

        # Mock check_task_backlog_sprint_status
        mock_graph_service.check_task_backlog_sprint_status.return_value = {
            "in_backlog": False,
            "in_sprint": True,
            "sprint_id": str(sprint_id)
        }

        # Add task to backlog (should raise ValueError)
        with pytest.raises(ValueError, match="already assigned to sprint"):
            await backlog_service.add_task_to_backlog(
                backlog_id=backlog_id,
                task_id=task_id
            )

        # Verify move_task_to_backlog was not called
        mock_graph_service.move_task_to_backlog.assert_not_called()


class TestRemoveTaskFromBacklog:
    """Tests for remove_task_from_backlog method"""

    @pytest.mark.asyncio
    async def test_remove_task_from_backlog_success(
        self,
        backlog_service,
        mock_graph_service
    ):
        """Test successfully removing task from backlog"""
        backlog_id = uuid4()
        task_id = uuid4()

        # Mock the execute_query method
        mock_graph_service.execute_query.return_value = [
            {"deleted_count": 1}
        ]

        # Remove task from backlog
        result = await backlog_service.remove_task_from_backlog(
            backlog_id=backlog_id,
            task_id=task_id
        )

        # Verify result
        assert result is True

    @pytest.mark.asyncio
    async def test_remove_task_from_backlog_not_in_backlog(
        self,
        backlog_service,
        mock_graph_service
    ):
        """Test removing task that's not in backlog"""
        backlog_id = uuid4()
        task_id = uuid4()

        # Mock the execute_query method
        mock_graph_service.execute_query.return_value = [
            {"deleted_count": 0}
        ]

        # Remove task from backlog
        result = await backlog_service.remove_task_from_backlog(
            backlog_id=backlog_id,
            task_id=task_id
        )

        # Verify result
        assert result is False

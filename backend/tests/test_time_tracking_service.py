"""Unit tests for TimeTrackingService"""

import pytest
from datetime import UTC, date, datetime, time
from uuid import UUID, uuid4
from unittest.mock import AsyncMock, MagicMock

from app.services.time_tracking_service import TimeTrackingService
from app.models.user import User
from app.schemas.worked import WorkedCreate, WorkedUpdate


@pytest.fixture
def mock_graph_service():
    """Create a mock GraphService"""
    return AsyncMock()


@pytest.fixture
def time_tracking_service(mock_graph_service):
    """Create TimeTrackingService with mocked dependencies"""
    return TimeTrackingService(mock_graph_service)


@pytest.fixture
def test_user():
    """Create a test user"""
    user = MagicMock(spec=User)
    user.id = uuid4()
    user.email = "test@example.com"
    return user


@pytest.fixture
def test_task_id():
    """Create a test task ID"""
    return uuid4()


class TestStartTimeTracking:
    """Test start_time_tracking method"""

    @pytest.mark.asyncio
    async def test_start_tracking_success(
        self, time_tracking_service, mock_graph_service, test_user, test_task_id
    ):
        """Test successfully starting time tracking"""
        # Mock no active tracking
        mock_graph_service.execute_query.side_effect = [
            [],  # No active tracking
            [{"t": {"id": str(test_task_id), "type": "task"}}],  # Task exists
        ]

        # Mock create_worked_node
        worked_id = str(uuid4())
        mock_graph_service.create_worked_node.return_value = {
            "id": worked_id,
            "resource": str(test_user.id),
            "date": date.today().isoformat(),
            "from": "10:00:00",
            "to": None,
            "description": "Test work",
            "created_at": datetime.now(UTC).isoformat(),
            "task_id": str(test_task_id),
        }

        # Start tracking
        result = await time_tracking_service.start_time_tracking(
            task_id=test_task_id,
            current_user=test_user,
            description="Test work",
        )

        # Verify
        assert result.id == UUID(worked_id)
        assert result.resource == test_user.id
        assert result.end_time is None  # Use end_time instead of to_time
        mock_graph_service.create_worked_node.assert_called_once()

    @pytest.mark.asyncio
    async def test_start_tracking_with_active_entry(
        self, time_tracking_service, mock_graph_service, test_user, test_task_id
    ):
        """Test starting tracking when user already has active entry"""
        # Mock active tracking exists
        mock_graph_service.execute_query.return_value = [
            {
                "w": {
                    "id": str(uuid4()),
                    "resource": str(test_user.id),
                    "date": date.today().isoformat(),
                    "from": "09:00:00",
                    "to": None,
                    "created_at": datetime.now(UTC).isoformat(),
                    "task_id": str(test_task_id),
                }
            }
        ]

        # Should raise error
        with pytest.raises(ValueError, match="already has .* active"):
            await time_tracking_service.start_time_tracking(
                task_id=test_task_id,
                current_user=test_user,
            )

    @pytest.mark.asyncio
    async def test_start_tracking_task_not_found(
        self, time_tracking_service, mock_graph_service, test_user, test_task_id
    ):
        """Test starting tracking for non-existent task"""
        # Mock no active tracking and task not found
        mock_graph_service.execute_query.side_effect = [
            [],  # No active tracking
            [],  # Task not found
        ]

        # Should raise error
        with pytest.raises(ValueError, match="not found"):
            await time_tracking_service.start_time_tracking(
                task_id=test_task_id,
                current_user=test_user,
            )


class TestStopTimeTracking:
    """Test stop_time_tracking method"""

    @pytest.mark.asyncio
    async def test_stop_tracking_success(
        self, time_tracking_service, mock_graph_service, test_user
    ):
        """Test successfully stopping time tracking"""
        worked_id = uuid4()

        # Mock get worked node
        mock_graph_service.execute_query.return_value = [
            {
                "w": {
                    "id": str(worked_id),
                    "resource": str(test_user.id),
                    "date": date.today().isoformat(),
                    "from": "10:00:00",
                    "to": None,
                }
            }
        ]

        # Mock update
        mock_graph_service.update_worked_node.return_value = {
            "id": str(worked_id),
            "resource": str(test_user.id),
            "date": date.today().isoformat(),
            "from": "10:00:00",
            "to": "12:00:00",
            "created_at": datetime.now(UTC).isoformat(),
            "task_id": str(uuid4()),
        }

        # Stop tracking
        result = await time_tracking_service.stop_time_tracking(
            worked_id=worked_id,
            current_user=test_user,
        )

        # Verify
        assert result.id == worked_id
        assert result.end_time is not None  # Use end_time instead of to_time
        mock_graph_service.update_worked_node.assert_called_once()

    @pytest.mark.asyncio
    async def test_stop_tracking_not_found(
        self, time_tracking_service, mock_graph_service, test_user
    ):
        """Test stopping non-existent tracking"""
        worked_id = uuid4()

        # Mock worked node not found
        mock_graph_service.execute_query.return_value = []

        # Should raise error
        with pytest.raises(ValueError, match="not found"):
            await time_tracking_service.stop_time_tracking(
                worked_id=worked_id,
                current_user=test_user,
            )

    @pytest.mark.asyncio
    async def test_stop_tracking_wrong_user(
        self, time_tracking_service, mock_graph_service, test_user
    ):
        """Test stopping tracking for another user"""
        worked_id = uuid4()
        other_user_id = uuid4()

        # Mock worked node belongs to different user
        mock_graph_service.execute_query.return_value = [
            {
                "w": {
                    "id": str(worked_id),
                    "resource": str(other_user_id),
                    "from": "10:00:00",
                    "to": None,
                }
            }
        ]

        # Should raise error
        with pytest.raises(ValueError, match="another user"):
            await time_tracking_service.stop_time_tracking(
                worked_id=worked_id,
                current_user=test_user,
            )

    @pytest.mark.asyncio
    async def test_stop_tracking_already_stopped(
        self, time_tracking_service, mock_graph_service, test_user
    ):
        """Test stopping already stopped tracking"""
        worked_id = uuid4()

        # Mock worked node already has end time
        mock_graph_service.execute_query.return_value = [
            {
                "w": {
                    "id": str(worked_id),
                    "resource": str(test_user.id),
                    "from": "10:00:00",
                    "to": "12:00:00",
                }
            }
        ]

        # Should raise error
        with pytest.raises(ValueError, match="already stopped"):
            await time_tracking_service.stop_time_tracking(
                worked_id=worked_id,
                current_user=test_user,
            )


class TestGetActiveTracking:
    """Test get_active_tracking method"""

    @pytest.mark.asyncio
    async def test_get_active_tracking_with_entries(
        self, time_tracking_service, mock_graph_service, test_user
    ):
        """Test getting active tracking entries"""
        # Mock active entries
        mock_graph_service.execute_query.return_value = [
            {
                "w": {
                    "id": str(uuid4()),
                    "resource": str(test_user.id),
                    "date": date.today().isoformat(),
                    "from": "10:00:00",
                    "to": None,
                    "created_at": datetime.now(UTC).isoformat(),
                    "task_id": str(uuid4()),
                }
            },
            {
                "w": {
                    "id": str(uuid4()),
                    "resource": str(test_user.id),
                    "date": date.today().isoformat(),
                    "from": "14:00:00",
                    "to": None,
                    "created_at": datetime.now(UTC).isoformat(),
                    "task_id": str(uuid4()),
                }
            },
        ]

        # Get active tracking
        result = await time_tracking_service.get_active_tracking(test_user)

        # Verify
        assert len(result) == 2
        assert all(entry.end_time is None for entry in result)  # Use end_time instead of to_time

    @pytest.mark.asyncio
    async def test_get_active_tracking_no_entries(
        self, time_tracking_service, mock_graph_service, test_user
    ):
        """Test getting active tracking with no entries"""
        # Mock no active entries
        mock_graph_service.execute_query.return_value = []

        # Get active tracking
        result = await time_tracking_service.get_active_tracking(test_user)

        # Verify
        assert len(result) == 0


class TestGetTaskWorkedSum:
    """Test get_task_worked_sum method"""

    @pytest.mark.asyncio
    async def test_calculate_worked_sum(
        self, time_tracking_service, mock_graph_service, test_task_id
    ):
        """Test calculating total worked hours"""
        # Mock task exists
        mock_graph_service.execute_query.return_value = [
            {"t": {"id": str(test_task_id), "type": "task"}}
        ]

        # Mock worked entries
        mock_graph_service.get_worked_entries_for_task.return_value = [
            {"from": "09:00:00", "to": "12:00:00"},  # 3 hours
            {"from": "13:00:00", "to": "17:00:00"},  # 4 hours
        ]

        # Calculate sum
        result = await time_tracking_service.get_task_worked_sum(test_task_id)

        # Verify (3 + 4 = 7 hours)
        assert result == 7.0

    @pytest.mark.asyncio
    async def test_calculate_worked_sum_no_entries(
        self, time_tracking_service, mock_graph_service, test_task_id
    ):
        """Test calculating worked sum with no entries"""
        # Mock task exists
        mock_graph_service.execute_query.return_value = [
            {"t": {"id": str(test_task_id), "type": "task"}}
        ]

        # Mock no worked entries
        mock_graph_service.get_worked_entries_for_task.return_value = []

        # Calculate sum
        result = await time_tracking_service.get_task_worked_sum(test_task_id)

        # Verify
        assert result == 0.0

    @pytest.mark.asyncio
    async def test_calculate_worked_sum_task_not_found(
        self, time_tracking_service, mock_graph_service, test_task_id
    ):
        """Test calculating worked sum for non-existent task"""
        # Mock task not found
        mock_graph_service.execute_query.return_value = []

        # Should raise error
        with pytest.raises(ValueError, match="not found"):
            await time_tracking_service.get_task_worked_sum(test_task_id)


class TestAddTimeEntry:
    """Test add_time_entry method"""

    @pytest.mark.asyncio
    async def test_add_time_entry_success(
        self, time_tracking_service, mock_graph_service, test_user, test_task_id
    ):
        """Test successfully adding a time entry"""
        # Mock task exists
        mock_graph_service.execute_query.return_value = [
            {"t": {"id": str(test_task_id), "type": "task"}}
        ]

        # Mock create worked node
        worked_id = str(uuid4())
        mock_graph_service.create_worked_node.return_value = {
            "id": worked_id,
            "resource": str(test_user.id),
            "date": date.today().isoformat(),
            "from": "09:00:00",
            "to": "17:00:00",
            "description": "Full day work",
            "created_at": datetime.now(UTC).isoformat(),
            "task_id": str(test_task_id),
        }

        # Create entry data
        entry_data = WorkedCreate(
            resource=test_user.id,  # Add resource field
            task_id=test_task_id,
            date=date.today(),
            start_time=time(9, 0),  # Use start_time instead of from_time
            end_time=time(17, 0),  # Use end_time instead of to_time
            description="Full day work",
        )

        # Add entry
        result = await time_tracking_service.add_time_entry(
            entry_data=entry_data,
            current_user=test_user,
        )

        # Verify
        assert result.id == UUID(worked_id)
        assert result.description == "Full day work"
        mock_graph_service.create_worked_node.assert_called_once()


class TestUpdateTimeEntry:
    """Test update_time_entry method"""

    @pytest.mark.asyncio
    async def test_update_time_entry_success(
        self, time_tracking_service, mock_graph_service, test_user
    ):
        """Test successfully updating a time entry"""
        worked_id = uuid4()

        # Mock get worked node
        mock_graph_service.execute_query.return_value = [
            {
                "w": {
                    "id": str(worked_id),
                    "resource": str(test_user.id),
                    "from": "09:00:00",
                    "to": "17:00:00",
                }
            }
        ]

        # Mock update
        mock_graph_service.update_worked_node.return_value = {
            "id": str(worked_id),
            "resource": str(test_user.id),
            "from": "09:00:00",
            "to": "18:00:00",
            "description": "Updated description",
            "date": date.today().isoformat(),
            "created_at": datetime.now(UTC).isoformat(),
            "task_id": str(uuid4()),
        }

        # Update entry
        updates = WorkedUpdate(
            end_time=time(18, 0),  # Use end_time instead of to_time
            description="Updated description",
        )

        result = await time_tracking_service.update_time_entry(
            worked_id=worked_id,
            updates=updates,
            current_user=test_user,
        )

        # Verify
        assert result.id == worked_id
        mock_graph_service.update_worked_node.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_time_entry_wrong_user(
        self, time_tracking_service, mock_graph_service, test_user
    ):
        """Test updating entry for another user"""
        worked_id = uuid4()
        other_user_id = uuid4()

        # Mock worked node belongs to different user
        mock_graph_service.execute_query.return_value = [
            {
                "w": {
                    "id": str(worked_id),
                    "resource": str(other_user_id),
                    "from": "09:00:00",
                    "to": "17:00:00",
                }
            }
        ]

        # Should raise error
        updates = WorkedUpdate(end_time=time(18, 0))  # Use end_time instead of to_time
        with pytest.raises(ValueError, match="another user"):
            await time_tracking_service.update_time_entry(
                worked_id=worked_id,
                updates=updates,
                current_user=test_user,
            )


class TestGetSortedTasksForUser:
    """Test get_sorted_tasks_for_user method"""

    @pytest.mark.asyncio
    async def test_get_sorted_tasks(
        self, time_tracking_service, mock_graph_service, test_user
    ):
        """Test getting sorted task list"""
        # Mock query results
        started_task_id = str(uuid4())
        scheduled_task_id = str(uuid4())
        other_task_id = str(uuid4())

        mock_graph_service.execute_query.side_effect = [
            # Started tasks
            [
                {
                    "t": {
                        "id": started_task_id,
                        "title": "Started Task",
                        "type": "task",
                        "status": "active",
                    },
                    "priority": 1,
                }
            ],
            # Scheduled tasks
            [
                {
                    "t": {
                        "id": scheduled_task_id,
                        "title": "Scheduled Task",
                        "type": "task",
                        "status": "draft",
                        "scheduled_start": "2026-02-17T09:00:00",
                    },
                    "priority": 2,
                }
            ],
            # Other tasks
            [
                {
                    "t": {
                        "id": other_task_id,
                        "title": "Other Task",
                        "type": "task",
                        "status": "draft",
                    },
                    "priority": 3,
                }
            ],
        ]

        # Get sorted tasks
        result = await time_tracking_service.get_sorted_tasks_for_user(
            current_user=test_user,
            limit=100,
        )

        # Verify
        assert len(result) == 3
        assert result[0]["id"] == started_task_id
        assert result[0]["priority"] == 1
        assert result[1]["id"] == scheduled_task_id
        assert result[1]["priority"] == 2
        assert result[2]["id"] == other_task_id
        assert result[2]["priority"] == 3

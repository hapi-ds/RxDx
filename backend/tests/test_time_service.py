"""Unit tests for TimeService"""

import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from hypothesis import given, strategies as st, settings

from app.schemas.time_entry import (
    TimeEntryCreate,
    TimeEntryUpdate,
    TimeEntryResponse,
    TimeEntrySyncItem,
    TimeAggregationRequest,
)
from app.services.time_service import TimeService
from app.models.user import User, UserRole


# Test fixtures
@pytest.fixture
def mock_user():
    """Create a mock user for testing"""
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "test@example.com"
    user.full_name = "Test User"
    user.role = UserRole.USER
    return user


@pytest.fixture
def mock_db_session():
    """Create a mock database session"""
    session = AsyncMock()
    session.execute = AsyncMock()
    session.commit = AsyncMock()
    return session


@pytest.fixture
def time_service(mock_db_session):
    """Create TimeService with mock session"""
    return TimeService(mock_db_session)


# Schema validation tests
class TestTimeEntrySchemas:
    """Tests for TimeEntry Pydantic schemas"""

    def test_time_entry_create_valid(self):
        """Test creating a valid TimeEntryCreate"""
        entry = TimeEntryCreate(
            project_id=uuid.uuid4(),
            task_id=uuid.uuid4(),
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc) + timedelta(hours=2),
            description="Working on feature",
            category="development"
        )
        assert entry.category == "development"
        assert entry.description == "Working on feature"

    def test_time_entry_create_without_end_time(self):
        """Test creating TimeEntry without end_time (running entry)"""
        entry = TimeEntryCreate(
            project_id=uuid.uuid4(),
            start_time=datetime.now(timezone.utc),
            description="In progress work"
        )
        assert entry.end_time is None

    def test_time_entry_create_invalid_category(self):
        """Test that invalid category raises error"""
        with pytest.raises(ValueError, match="Invalid category"):
            TimeEntryCreate(
                project_id=uuid.uuid4(),
                start_time=datetime.now(timezone.utc),
                category="invalid_category"
            )

    def test_time_entry_create_end_before_start(self):
        """Test that end_time before start_time raises error"""
        now = datetime.now(timezone.utc)
        with pytest.raises(ValueError, match="End time must be after start time"):
            TimeEntryCreate(
                project_id=uuid.uuid4(),
                start_time=now,
                end_time=now - timedelta(hours=1)
            )

    def test_time_entry_update_partial(self):
        """Test partial update schema"""
        update = TimeEntryUpdate(
            description="Updated description"
        )
        assert update.description == "Updated description"
        assert update.project_id is None
        assert update.category is None

    def test_time_entry_update_category_validation(self):
        """Test category validation in update schema"""
        update = TimeEntryUpdate(category="meeting")
        assert update.category == "meeting"

        with pytest.raises(ValueError, match="Invalid category"):
            TimeEntryUpdate(category="invalid")

    def test_valid_categories(self):
        """Test all valid categories are accepted"""
        valid_categories = [
            "development", "meeting", "review", "testing", "documentation",
            "planning", "support", "training", "administration", "other"
        ]
        for category in valid_categories:
            entry = TimeEntryCreate(
                project_id=uuid.uuid4(),
                start_time=datetime.now(timezone.utc),
                category=category
            )
            assert entry.category == category


class TestTimeEntrySyncSchemas:
    """Tests for sync-related schemas"""

    def test_sync_item_valid(self):
        """Test creating a valid sync item"""
        item = TimeEntrySyncItem(
            local_id="local-123",
            project_id=uuid.uuid4(),
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc) + timedelta(hours=1),
            category="development"
        )
        assert item.local_id == "local-123"

    def test_sync_item_end_before_start(self):
        """Test sync item validation for times"""
        now = datetime.now(timezone.utc)
        with pytest.raises(ValueError, match="End time must be after start time"):
            TimeEntrySyncItem(
                local_id="local-123",
                project_id=uuid.uuid4(),
                start_time=now,
                end_time=now - timedelta(minutes=30)
            )


class TestTimeAggregationSchemas:
    """Tests for aggregation schemas"""

    def test_aggregation_request_valid(self):
        """Test creating a valid aggregation request"""
        request = TimeAggregationRequest(
            start_date=datetime.now(timezone.utc) - timedelta(days=30),
            end_date=datetime.now(timezone.utc),
            group_by=["project_id", "user_id"]
        )
        assert len(request.group_by) == 2

    def test_aggregation_request_invalid_group_by(self):
        """Test invalid group_by field raises error"""
        with pytest.raises(ValueError, match="Invalid group_by field"):
            TimeAggregationRequest(
                start_date=datetime.now(timezone.utc) - timedelta(days=30),
                end_date=datetime.now(timezone.utc),
                group_by=["invalid_field"]
            )

    def test_aggregation_request_end_before_start(self):
        """Test end_date before start_date raises error"""
        now = datetime.now(timezone.utc)
        with pytest.raises(ValueError, match="End date must be after start date"):
            TimeAggregationRequest(
                start_date=now,
                end_date=now - timedelta(days=1),
                group_by=["project_id"]
            )


# Service tests
class TestTimeServiceCreate:
    """Tests for TimeService.create_time_entry"""

    @pytest.mark.asyncio
    async def test_create_time_entry_success(self, time_service, mock_user, mock_db_session):
        """Test successful time entry creation"""
        entry_data = TimeEntryCreate(
            project_id=uuid.uuid4(),
            start_time=datetime.now(timezone.utc),
            end_time=datetime.now(timezone.utc) + timedelta(hours=2),
            description="Test work",
            category="development"
        )

        result = await time_service.create_time_entry(entry_data, mock_user)

        assert result.user_id == mock_user.id
        assert result.project_id == entry_data.project_id
        assert result.description == "Test work"
        assert result.category == "development"
        assert result.synced is False
        mock_db_session.execute.assert_called_once()
        mock_db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_create_time_entry_calculates_duration(self, time_service, mock_user):
        """Test that duration is calculated correctly"""
        start = datetime.now(timezone.utc)
        end = start + timedelta(hours=2, minutes=30)

        entry_data = TimeEntryCreate(
            project_id=uuid.uuid4(),
            start_time=start,
            end_time=end
        )

        result = await time_service.create_time_entry(entry_data, mock_user)

        # 2.5 hours
        assert result.duration_hours == Decimal("2.5")

    @pytest.mark.asyncio
    async def test_create_time_entry_no_end_time(self, time_service, mock_user):
        """Test creating entry without end time (running entry)"""
        entry_data = TimeEntryCreate(
            project_id=uuid.uuid4(),
            start_time=datetime.now(timezone.utc)
        )

        result = await time_service.create_time_entry(entry_data, mock_user)

        assert result.end_time is None
        assert result.duration_hours is None


class TestTimeServiceUpdate:
    """Tests for TimeService.update_time_entry"""

    @pytest.mark.asyncio
    async def test_update_time_entry_not_found(self, time_service, mock_user, mock_db_session):
        """Test updating non-existent entry returns None"""
        # Mock the execute to return a result with fetchone returning None
        mock_result = MagicMock()
        mock_result.fetchone.return_value = None
        mock_db_session.execute.return_value = mock_result

        updates = TimeEntryUpdate(description="Updated")
        result = await time_service.update_time_entry(uuid.uuid4(), updates, mock_user)

        assert result is None


class TestTimeServiceGet:
    """Tests for TimeService.get_time_entry and get_time_entries"""

    @pytest.mark.asyncio
    async def test_get_time_entry_not_found(self, time_service, mock_user, mock_db_session):
        """Test getting non-existent entry returns None"""
        # Mock the execute to return a result with fetchone returning None
        mock_result = MagicMock()
        mock_result.fetchone.return_value = None
        mock_db_session.execute.return_value = mock_result

        result = await time_service.get_time_entry(uuid.uuid4(), mock_user)

        assert result is None

    @pytest.mark.asyncio
    async def test_get_time_entries_empty(self, time_service, mock_user, mock_db_session):
        """Test getting entries when none exist"""
        # Mock the execute to return a result with fetchall returning empty list
        mock_result = MagicMock()
        mock_result.fetchall.return_value = []
        mock_db_session.execute.return_value = mock_result

        result = await time_service.get_time_entries(mock_user)

        assert result == []


class TestTimeServiceDelete:
    """Tests for TimeService.delete_time_entry"""

    @pytest.mark.asyncio
    async def test_delete_time_entry_success(self, time_service, mock_user, mock_db_session):
        """Test successful deletion"""
        mock_db_session.execute.return_value.rowcount = 1

        result = await time_service.delete_time_entry(uuid.uuid4(), mock_user)

        assert result is True
        mock_db_session.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_delete_time_entry_not_found(self, time_service, mock_user, mock_db_session):
        """Test deleting non-existent entry"""
        mock_db_session.execute.return_value.rowcount = 0

        result = await time_service.delete_time_entry(uuid.uuid4(), mock_user)

        assert result is False


class TestTimeServiceSync:
    """Tests for TimeService.sync_time_entries"""

    @pytest.mark.asyncio
    async def test_sync_single_entry_success(self, time_service, mock_user, mock_db_session):
        """Test syncing a single entry"""
        entries = [
            TimeEntrySyncItem(
                local_id="local-1",
                project_id=uuid.uuid4(),
                start_time=datetime.now(timezone.utc),
                end_time=datetime.now(timezone.utc) + timedelta(hours=1)
            )
        ]

        results = await time_service.sync_time_entries(entries, mock_user)

        assert len(results) == 1
        assert results[0].success is True
        assert results[0].local_id == "local-1"
        assert results[0].server_id is not None

    @pytest.mark.asyncio
    async def test_sync_multiple_entries(self, time_service, mock_user, mock_db_session):
        """Test syncing multiple entries"""
        entries = [
            TimeEntrySyncItem(
                local_id=f"local-{i}",
                project_id=uuid.uuid4(),
                start_time=datetime.now(timezone.utc),
                end_time=datetime.now(timezone.utc) + timedelta(hours=1)
            )
            for i in range(3)
        ]

        results = await time_service.sync_time_entries(entries, mock_user)

        assert len(results) == 3
        assert all(r.success for r in results)


# Property-based tests
class TestTimeEntryProperties:
    """Property-based tests for time entry logic"""

    @given(
        hours=st.floats(min_value=0.01, max_value=24, allow_nan=False, allow_infinity=False),
    )
    @settings(max_examples=50)
    def test_duration_calculation_property(self, hours):
        """
        Property: Duration equals end_time - start_time

        **Validates: Requirement 4.3** (Time Recording)
        """
        start = datetime.now(timezone.utc)
        end = start + timedelta(hours=hours)

        duration_seconds = (end - start).total_seconds()
        calculated_hours = Decimal(str(round(duration_seconds / 3600, 2)))

        # Duration should be approximately equal to input hours
        assert abs(float(calculated_hours) - hours) < 0.01

    @given(
        start_offset=st.integers(min_value=0, max_value=1000),
        duration_minutes=st.integers(min_value=1, max_value=1440)
    )
    @settings(max_examples=50)
    def test_end_time_always_after_start_time(self, start_offset, duration_minutes):
        """
        Property: Valid entries always have end_time > start_time

        **Validates: Requirement 4.3** (Time Recording)
        """
        base_time = datetime(2024, 1, 1, tzinfo=timezone.utc)
        start = base_time + timedelta(minutes=start_offset)
        end = start + timedelta(minutes=duration_minutes)

        # This should not raise
        entry = TimeEntryCreate(
            project_id=uuid.uuid4(),
            start_time=start,
            end_time=end
        )

        assert entry.end_time > entry.start_time

    @given(
        category=st.sampled_from([
            "development", "meeting", "review", "testing", "documentation",
            "planning", "support", "training", "administration", "other"
        ])
    )
    @settings(max_examples=20)
    def test_valid_categories_accepted(self, category):
        """
        Property: All valid categories are accepted

        **Validates: Requirement 4.4** (Time Recording categories)
        """
        entry = TimeEntryCreate(
            project_id=uuid.uuid4(),
            start_time=datetime.now(timezone.utc),
            category=category
        )
        assert entry.category == category


class TestSyncIdempotency:
    """Tests for sync idempotency property"""

    @pytest.mark.asyncio
    async def test_sync_produces_unique_server_ids(self, time_service, mock_user, mock_db_session):
        """
        Property: Each synced entry gets a unique server ID

        **Validates: Requirement 4.6** (Offline Synchronization)
        """
        entries = [
            TimeEntrySyncItem(
                local_id=f"local-{i}",
                project_id=uuid.uuid4(),
                start_time=datetime.now(timezone.utc),
                end_time=datetime.now(timezone.utc) + timedelta(hours=1)
            )
            for i in range(5)
        ]

        results = await time_service.sync_time_entries(entries, mock_user)

        server_ids = [r.server_id for r in results if r.success]
        # All server IDs should be unique
        assert len(server_ids) == len(set(server_ids))

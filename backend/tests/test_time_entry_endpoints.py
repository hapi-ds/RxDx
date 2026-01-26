"""Integration tests for Time Entry API endpoints"""

import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import status
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User, UserRole
from app.schemas.time_entry import (
    TimeEntryResponse,
)


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
def mock_admin_user():
    """Create a mock admin user for testing"""
    user = MagicMock(spec=User)
    user.id = uuid.uuid4()
    user.email = "admin@example.com"
    user.full_name = "Admin User"
    user.role = UserRole.ADMIN
    return user


@pytest.fixture
def sample_time_entry():
    """Create a sample time entry response"""
    return TimeEntryResponse(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        project_id=uuid.uuid4(),
        task_id=uuid.uuid4(),
        start_time=datetime.now(UTC) - timedelta(hours=2),
        end_time=datetime.now(UTC),
        duration_hours=Decimal("2.0"),
        description="Test work",
        category="development",
        synced=False,
        created_at=datetime.now(UTC),
        updated_at=None
    )


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


# Mock dependencies
def override_get_current_user(user):
    """Override get_current_user dependency"""
    async def _get_current_user():
        return user
    return _get_current_user


def override_get_time_service(mock_service):
    """Override get_time_service dependency"""
    async def _get_time_service():
        return mock_service
    return _get_time_service


def override_get_audit_service():
    """Override get_audit_service dependency"""
    async def _get_audit_service():
        mock_audit = AsyncMock()
        mock_audit.log = AsyncMock()
        return mock_audit
    return _get_audit_service


class TestCreateTimeEntry:
    """Tests for POST /api/v1/time-entries"""

    def test_create_time_entry_success(self, client, mock_user, sample_time_entry):
        """Test successful time entry creation"""
        from app.api.deps import get_current_user
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()
        mock_service.create_time_entry = AsyncMock(return_value=sample_time_entry)

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            response = client.post(
                "/api/v1/time-entries",
                json={
                    "project_id": str(uuid.uuid4()),
                    "start_time": datetime.now(UTC).isoformat(),
                    "end_time": (datetime.now(UTC) + timedelta(hours=2)).isoformat(),
                    "description": "Test work",
                    "category": "development"
                }
            )

            assert response.status_code == status.HTTP_201_CREATED
            data = response.json()
            assert "id" in data
            assert data["category"] == "development"
        finally:
            app.dependency_overrides.clear()

    def test_create_time_entry_invalid_category(self, client, mock_user):
        """Test creating entry with invalid category"""
        from app.api.deps import get_current_user
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            response = client.post(
                "/api/v1/time-entries",
                json={
                    "project_id": str(uuid.uuid4()),
                    "start_time": datetime.now(UTC).isoformat(),
                    "category": "invalid_category"
                }
            )

            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        finally:
            app.dependency_overrides.clear()

    def test_create_time_entry_end_before_start(self, client, mock_user):
        """Test creating entry with end_time before start_time"""
        from app.api.deps import get_current_user
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()
        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        now = datetime.now(UTC)
        try:
            response = client.post(
                "/api/v1/time-entries",
                json={
                    "project_id": str(uuid.uuid4()),
                    "start_time": now.isoformat(),
                    "end_time": (now - timedelta(hours=1)).isoformat()
                }
            )

            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        finally:
            app.dependency_overrides.clear()


class TestGetTimeEntries:
    """Tests for GET /api/v1/time-entries"""

    def test_get_time_entries_success(self, client, mock_user, sample_time_entry):
        """Test successful retrieval of time entries"""
        from app.api.deps import get_current_user
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()
        mock_service.get_time_entries = AsyncMock(return_value=[sample_time_entry])

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            response = client.get("/api/v1/time-entries")

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert isinstance(data, list)
            assert len(data) == 1
        finally:
            app.dependency_overrides.clear()

    def test_get_time_entries_with_filters(self, client, mock_user, sample_time_entry):
        """Test retrieval with filters"""
        from app.api.deps import get_current_user
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()
        mock_service.get_time_entries = AsyncMock(return_value=[sample_time_entry])

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            project_id = str(uuid.uuid4())
            response = client.get(
                f"/api/v1/time-entries?project_id={project_id}&category=development"
            )

            assert response.status_code == status.HTTP_200_OK
            mock_service.get_time_entries.assert_called_once()
        finally:
            app.dependency_overrides.clear()

    def test_get_time_entries_empty(self, client, mock_user):
        """Test retrieval when no entries exist"""
        from app.api.deps import get_current_user
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()
        mock_service.get_time_entries = AsyncMock(return_value=[])

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            response = client.get("/api/v1/time-entries")

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data == []
        finally:
            app.dependency_overrides.clear()


class TestGetTimeEntry:
    """Tests for GET /api/v1/time-entries/{entry_id}"""

    def test_get_time_entry_success(self, client, mock_user, sample_time_entry):
        """Test successful retrieval of single entry"""
        from app.api.deps import get_current_user
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()
        mock_service.get_time_entry = AsyncMock(return_value=sample_time_entry)

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            response = client.get(f"/api/v1/time-entries/{sample_time_entry.id}")

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["id"] == str(sample_time_entry.id)
        finally:
            app.dependency_overrides.clear()

    def test_get_time_entry_not_found(self, client, mock_user):
        """Test retrieval of non-existent entry"""
        from app.api.deps import get_current_user
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()
        mock_service.get_time_entry = AsyncMock(return_value=None)

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            response = client.get(f"/api/v1/time-entries/{uuid.uuid4()}")

            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            app.dependency_overrides.clear()


class TestUpdateTimeEntry:
    """Tests for PATCH /api/v1/time-entries/{entry_id}"""

    def test_update_time_entry_success(self, client, mock_user, sample_time_entry):
        """Test successful update"""
        from app.api.deps import get_current_user
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        updated_entry = sample_time_entry.model_copy()
        updated_entry.description = "Updated description"

        mock_service = AsyncMock()
        mock_service.update_time_entry = AsyncMock(return_value=updated_entry)

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            response = client.patch(
                f"/api/v1/time-entries/{sample_time_entry.id}",
                json={"description": "Updated description"}
            )

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["description"] == "Updated description"
        finally:
            app.dependency_overrides.clear()

    def test_update_time_entry_not_found(self, client, mock_user):
        """Test update of non-existent entry"""
        from app.api.deps import get_current_user
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()
        mock_service.update_time_entry = AsyncMock(return_value=None)

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            response = client.patch(
                f"/api/v1/time-entries/{uuid.uuid4()}",
                json={"description": "Updated"}
            )

            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            app.dependency_overrides.clear()


class TestDeleteTimeEntry:
    """Tests for DELETE /api/v1/time-entries/{entry_id}"""

    def test_delete_time_entry_success(self, client, mock_admin_user, sample_time_entry):
        """Test successful deletion"""
        from app.api.deps import get_current_user
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()
        mock_service.get_time_entry = AsyncMock(return_value=sample_time_entry)
        mock_service.delete_time_entry = AsyncMock(return_value=True)

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_admin_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            response = client.delete(f"/api/v1/time-entries/{sample_time_entry.id}")

            assert response.status_code == status.HTTP_204_NO_CONTENT
        finally:
            app.dependency_overrides.clear()

    def test_delete_time_entry_not_found(self, client, mock_admin_user):
        """Test deletion of non-existent entry"""
        from app.api.deps import get_current_user
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()
        mock_service.get_time_entry = AsyncMock(return_value=None)

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_admin_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            response = client.delete(f"/api/v1/time-entries/{uuid.uuid4()}")

            assert response.status_code == status.HTTP_404_NOT_FOUND
        finally:
            app.dependency_overrides.clear()


class TestSyncTimeEntries:
    """Tests for POST /api/v1/time-entries/sync"""

    def test_sync_time_entries_success(self, client, mock_user):
        """Test successful sync"""
        from app.api.deps import get_current_user
        from app.schemas.time_entry import TimeEntrySyncResult
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()
        mock_service.sync_time_entries = AsyncMock(return_value=[
            TimeEntrySyncResult(
                local_id="local-1",
                server_id=uuid.uuid4(),
                success=True,
                error=None
            )
        ])

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            response = client.post(
                "/api/v1/time-entries/sync",
                json={
                    "entries": [
                        {
                            "local_id": "local-1",
                            "project_id": str(uuid.uuid4()),
                            "start_time": datetime.now(UTC).isoformat(),
                            "end_time": (datetime.now(UTC) + timedelta(hours=1)).isoformat()
                        }
                    ],
                    "device_id": "test-device",
                    "sync_timestamp": datetime.now(UTC).isoformat()
                }
            )

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["synced_count"] == 1
            assert data["failed_count"] == 0
        finally:
            app.dependency_overrides.clear()

    def test_sync_time_entries_partial_failure(self, client, mock_user):
        """Test sync with some failures"""
        from app.api.deps import get_current_user
        from app.schemas.time_entry import TimeEntrySyncResult
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()
        mock_service.sync_time_entries = AsyncMock(return_value=[
            TimeEntrySyncResult(
                local_id="local-1",
                server_id=uuid.uuid4(),
                success=True,
                error=None
            ),
            TimeEntrySyncResult(
                local_id="local-2",
                server_id=None,
                success=False,
                error="Database error"
            )
        ])

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            response = client.post(
                "/api/v1/time-entries/sync",
                json={
                    "entries": [
                        {
                            "local_id": "local-1",
                            "project_id": str(uuid.uuid4()),
                            "start_time": datetime.now(UTC).isoformat()
                        },
                        {
                            "local_id": "local-2",
                            "project_id": str(uuid.uuid4()),
                            "start_time": datetime.now(UTC).isoformat()
                        }
                    ],
                    "sync_timestamp": datetime.now(UTC).isoformat()
                }
            )

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["synced_count"] == 1
            assert data["failed_count"] == 1
        finally:
            app.dependency_overrides.clear()


class TestAggregateTimeEntries:
    """Tests for POST /api/v1/time-entries/aggregate"""

    def test_aggregate_time_entries_success(self, client, mock_user):
        """Test successful aggregation"""
        from app.api.deps import get_current_user
        from app.schemas.time_entry import TimeAggregation
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        now = datetime.now(UTC)
        mock_service = AsyncMock()
        mock_service.aggregate_time_entries = AsyncMock(return_value=[
            TimeAggregation(
                project_id=uuid.uuid4(),
                user_id=mock_user.id,
                task_id=None,
                category=None,
                total_hours=Decimal("10.5"),
                entry_count=5,
                start_date=now - timedelta(days=30),
                end_date=now
            )
        ])

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        try:
            response = client.post(
                "/api/v1/time-entries/aggregate",
                json={
                    "start_date": (now - timedelta(days=30)).isoformat(),
                    "end_date": now.isoformat(),
                    "group_by": ["project_id", "user_id"]
                }
            )

            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert "aggregations" in data
            assert "total_hours" in data
            assert float(data["total_hours"]) == 10.5
        finally:
            app.dependency_overrides.clear()

    def test_aggregate_time_entries_invalid_group_by(self, client, mock_user):
        """Test aggregation with invalid group_by field"""
        from app.api.deps import get_current_user
        from app.services.audit_service import get_audit_service
        from app.services.time_service import get_time_service

        mock_service = AsyncMock()

        app.dependency_overrides[get_current_user] = override_get_current_user(mock_user)
        app.dependency_overrides[get_time_service] = override_get_time_service(mock_service)
        app.dependency_overrides[get_audit_service] = override_get_audit_service()

        now = datetime.now(UTC)
        try:
            response = client.post(
                "/api/v1/time-entries/aggregate",
                json={
                    "start_date": (now - timedelta(days=30)).isoformat(),
                    "end_date": now.isoformat(),
                    "group_by": ["invalid_field"]
                }
            )

            assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        finally:
            app.dependency_overrides.clear()

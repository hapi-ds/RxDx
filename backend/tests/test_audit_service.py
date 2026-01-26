"""Unit tests for AuditService"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.audit import AuditLog
from app.schemas.audit import AuditLogFilter
from app.services.audit_service import AuditService


class TestAuditService:
    """Test cases for AuditService"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        db = AsyncMock()
        # Make sure add, commit, refresh are proper async mocks
        db.add = MagicMock()  # add is synchronous
        db.commit = AsyncMock()
        db.refresh = AsyncMock()
        return db

    @pytest.fixture
    def audit_service(self, mock_db):
        """AuditService instance with mocked database"""
        return AuditService(db=mock_db)

    @pytest.mark.asyncio
    async def test_log_basic_entry(self, audit_service, mock_db):
        """Test creating a basic audit log entry"""
        user_id = uuid4()
        entity_id = uuid4()

        result = await audit_service.log(
            action="CREATE",
            entity_type="WorkItem",
            user_id=user_id,
            entity_id=entity_id,
            ip_address="192.168.1.100",
            details={"title": "Test WorkItem"}
        )

        # Verify database operations were called
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()

        # Verify the audit log was created with correct data
        added_log = mock_db.add.call_args[0][0]
        assert isinstance(added_log, AuditLog)
        assert added_log.action == "CREATE"
        assert added_log.entity_type == "WorkItem"
        assert added_log.user_id == user_id
        assert added_log.entity_id == entity_id
        assert added_log.ip_address == "192.168.1.100"
        assert added_log.details == {"title": "Test WorkItem"}
        assert isinstance(added_log.timestamp, datetime)

    @pytest.mark.asyncio
    async def test_log_auth_attempt_success(self, audit_service, mock_db):
        """Test logging successful authentication attempt"""
        user_id = uuid4()

        result = await audit_service.log_auth_attempt(
            email="test@example.com",
            success=True,
            user_id=user_id,
            ip_address="192.168.1.100"
        )

        added_log = mock_db.add.call_args[0][0]
        assert added_log.action == "AUTH_SUCCESS"
        assert added_log.entity_type == "User"
        assert added_log.user_id == user_id
        assert added_log.details["email"] == "test@example.com"
        assert "failure_reason" not in added_log.details

    @pytest.mark.asyncio
    async def test_log_auth_attempt_failure(self, audit_service, mock_db):
        """Test logging failed authentication attempt"""
        result = await audit_service.log_auth_attempt(
            email="test@example.com",
            success=False,
            ip_address="192.168.1.100",
            failure_reason="Invalid password"
        )

        added_log = mock_db.add.call_args[0][0]
        assert added_log.action == "AUTH_FAILURE"
        assert added_log.entity_type == "User"
        assert added_log.user_id is None
        assert added_log.details["email"] == "test@example.com"
        assert added_log.details["failure_reason"] == "Invalid password"

    @pytest.mark.asyncio
    async def test_log_authorization_decision_granted(self, audit_service, mock_db):
        """Test logging granted authorization decision"""
        user_id = uuid4()

        result = await audit_service.log_authorization_decision(
            user_id=user_id,
            permission="READ_WORKITEM",
            resource="/api/v1/workitems/123",
            granted=True,
            ip_address="192.168.1.100"
        )

        added_log = mock_db.add.call_args[0][0]
        assert added_log.action == "AUTHZ_GRANTED"
        assert added_log.entity_type == "Authorization"
        assert added_log.user_id == user_id
        assert added_log.details["permission"] == "READ_WORKITEM"
        assert added_log.details["resource"] == "/api/v1/workitems/123"

    @pytest.mark.asyncio
    async def test_log_authorization_decision_denied(self, audit_service, mock_db):
        """Test logging denied authorization decision"""
        user_id = uuid4()

        result = await audit_service.log_authorization_decision(
            user_id=user_id,
            permission="DELETE_WORKITEM",
            resource="/api/v1/workitems/123",
            granted=False,
            ip_address="192.168.1.100"
        )

        added_log = mock_db.add.call_args[0][0]
        assert added_log.action == "AUTHZ_DENIED"
        assert added_log.entity_type == "Authorization"
        assert added_log.user_id == user_id
        assert added_log.details["permission"] == "DELETE_WORKITEM"
        assert added_log.details["resource"] == "/api/v1/workitems/123"

    @pytest.mark.asyncio
    async def test_log_crud_operation_create(self, audit_service, mock_db):
        """Test logging CRUD CREATE operation"""
        user_id = uuid4()
        entity_id = uuid4()

        result = await audit_service.log_crud_operation(
            operation="CREATE",
            entity_type="WorkItem",
            entity_id=entity_id,
            user_id=user_id,
            ip_address="192.168.1.100"
        )

        added_log = mock_db.add.call_args[0][0]
        assert added_log.action == "CREATE"
        assert added_log.entity_type == "WorkItem"
        assert added_log.entity_id == entity_id
        assert added_log.user_id == user_id

    @pytest.mark.asyncio
    async def test_log_crud_operation_update_with_changes(self, audit_service, mock_db):
        """Test logging CRUD UPDATE operation with changes"""
        user_id = uuid4()
        entity_id = uuid4()
        changes = {"title": {"old": "Old Title", "new": "New Title"}}

        result = await audit_service.log_crud_operation(
            operation="UPDATE",
            entity_type="WorkItem",
            entity_id=entity_id,
            user_id=user_id,
            ip_address="192.168.1.100",
            changes=changes
        )

        added_log = mock_db.add.call_args[0][0]
        assert added_log.action == "UPDATE"
        assert added_log.entity_type == "WorkItem"
        assert added_log.details["changes"] == changes

    @pytest.mark.asyncio
    async def test_log_signature_event_sign(self, audit_service, mock_db):
        """Test logging signature SIGN event"""
        user_id = uuid4()
        workitem_id = uuid4()
        signature_id = uuid4()

        result = await audit_service.log_signature_event(
            event_type="SIGN",
            workitem_id=workitem_id,
            user_id=user_id,
            signature_id=signature_id,
            ip_address="192.168.1.100"
        )

        added_log = mock_db.add.call_args[0][0]
        assert added_log.action == "SIGNATURE_SIGN"
        assert added_log.entity_type == "DigitalSignature"
        assert added_log.entity_id == signature_id
        assert added_log.user_id == user_id
        assert added_log.details["workitem_id"] == str(workitem_id)
        assert added_log.details["signature_id"] == str(signature_id)

    @pytest.mark.asyncio
    async def test_log_signature_event_verify(self, audit_service, mock_db):
        """Test logging signature VERIFY event"""
        user_id = uuid4()
        workitem_id = uuid4()
        signature_id = uuid4()

        result = await audit_service.log_signature_event(
            event_type="VERIFY",
            workitem_id=workitem_id,
            user_id=user_id,
            signature_id=signature_id,
            ip_address="192.168.1.100",
            verification_result=True
        )

        added_log = mock_db.add.call_args[0][0]
        assert added_log.action == "SIGNATURE_VERIFY"
        assert added_log.details["verification_result"] is True

    @pytest.mark.asyncio
    async def test_action_case_normalization(self, audit_service, mock_db):
        """Test that action strings are normalized to uppercase"""
        result = await audit_service.log(
            action="create",  # lowercase
            entity_type="WorkItem",
            user_id=uuid4()
        )

        added_log = mock_db.add.call_args[0][0]
        assert added_log.action == "CREATE"  # Should be uppercase

    @pytest.mark.asyncio
    async def test_system_action_without_user(self, audit_service, mock_db):
        """Test logging system actions without user ID"""
        result = await audit_service.log(
            action="SYSTEM_BACKUP",
            entity_type="System",
            user_id=None,  # System action
            details={"backup_type": "scheduled"}
        )

        added_log = mock_db.add.call_args[0][0]
        assert added_log.action == "SYSTEM_BACKUP"
        assert added_log.user_id is None
        assert added_log.details["backup_type"] == "scheduled"

    def test_no_update_delete_methods(self, audit_service):
        """Test that audit service has no update or delete methods"""
        # Verify immutability - no update/delete methods should exist
        assert not hasattr(audit_service, 'update_audit_log')
        assert not hasattr(audit_service, 'delete_audit_log')
        assert not hasattr(audit_service, 'modify_audit_log')

        # Only read and create methods should exist
        assert hasattr(audit_service, 'log')
        assert hasattr(audit_service, 'get_audit_logs')
        assert hasattr(audit_service, 'export_audit_logs')


class TestAuditServiceFiltering:
    """Test cases for audit log filtering and querying"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        db = AsyncMock()
        return db

    @pytest.fixture
    def audit_service(self, mock_db):
        """AuditService instance with mocked database"""
        return AuditService(db=mock_db)

    @pytest.mark.asyncio
    async def test_get_audit_logs_basic_filter(self, audit_service, mock_db):
        """Test getting audit logs with basic filters"""
        user_id = uuid4()
        filters = AuditLogFilter(
            user_id=user_id,
            action="CREATE",
            entity_type="WorkItem",
            limit=50,
            offset=0
        )

        # Mock database query result
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_result = MagicMock()
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute.return_value = mock_result

        result = await audit_service.get_audit_logs(filters)

        # Verify query was executed
        mock_db.execute.assert_called_once()
        assert isinstance(result, list)

    @pytest.mark.asyncio
    async def test_get_audit_log_count(self, audit_service, mock_db):
        """Test getting audit log count"""
        filters = AuditLogFilter(
            action="CREATE",
            entity_type="WorkItem"
        )

        # Mock database count result
        mock_result = MagicMock()
        mock_result.scalar.return_value = 42
        mock_db.execute.return_value = mock_result

        count = await audit_service.get_audit_log_count(filters)

        assert count == 42
        mock_db.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_export_audit_logs(self, audit_service, mock_db):
        """Test exporting audit logs for compliance"""
        filters = AuditLogFilter(
            entity_type="WorkItem",
            start_date=datetime(2024, 1, 1, tzinfo=UTC),
            end_date=datetime(2024, 12, 31, tzinfo=UTC)
        )

        # Mock database query result
        mock_scalars = MagicMock()
        mock_scalars.all.return_value = []
        mock_result = MagicMock()
        mock_result.scalars.return_value = mock_scalars
        mock_db.execute.return_value = mock_result

        result = await audit_service.export_audit_logs(filters)

        # Verify query was executed
        mock_db.execute.assert_called_once()
        assert isinstance(result, list)

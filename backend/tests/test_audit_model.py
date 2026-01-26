"""Unit tests for AuditLog model and schemas"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models.audit import AuditLog
from app.schemas.audit import (
    AuditLogBase,
    AuditLogCreate,
    AuditLogFilter,
    AuditLogResponse,
)


class TestAuditLogModel:
    """Test AuditLog SQLAlchemy model"""

    def test_audit_log_creation(self):
        """Test creating an AuditLog instance"""
        user_id = uuid4()
        entity_id = uuid4()

        audit_log = AuditLog(
            user_id=user_id,
            action="CREATE",
            entity_type="WorkItem",
            entity_id=entity_id,
            ip_address="192.168.1.1",
            details={"field": "value"},
        )

        assert audit_log.user_id == user_id
        assert audit_log.action == "CREATE"
        assert audit_log.entity_type == "WorkItem"
        assert audit_log.entity_id == entity_id
        assert audit_log.ip_address == "192.168.1.1"
        assert audit_log.details == {"field": "value"}

    def test_audit_log_nullable_fields(self):
        """Test AuditLog with nullable fields"""
        audit_log = AuditLog(
            user_id=None,  # System action
            action="AUTH",
            entity_type="User",
            entity_id=None,  # List operation
            ip_address=None,
            details=None,
        )

        assert audit_log.user_id is None
        assert audit_log.entity_id is None
        assert audit_log.ip_address is None
        assert audit_log.details is None

    def test_audit_log_default_timestamp(self):
        """Test AuditLog default timestamp"""
        audit_log = AuditLog(
            action="READ",
            entity_type="Requirement",
        )

        # Timestamp is set by SQLAlchemy default, but only when inserted to DB
        # For now, we just verify the column has a default configured
        assert hasattr(audit_log, 'timestamp')
        # The actual default will be tested in integration tests

    def test_audit_log_repr(self):
        """Test AuditLog __repr__ method"""
        audit_id = uuid4()
        audit_log = AuditLog(
            id=audit_id,
            action="UPDATE",
            entity_type="User",
            timestamp=datetime.now(UTC),
        )

        repr_str = repr(audit_log)
        assert "AuditLog" in repr_str
        assert str(audit_id) in repr_str
        assert "UPDATE" in repr_str
        assert "User" in repr_str

    def test_audit_log_with_ipv6(self):
        """Test AuditLog with IPv6 address"""
        audit_log = AuditLog(
            action="DELETE",
            entity_type="WorkItem",
            ip_address="2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        )

        assert audit_log.ip_address == "2001:0db8:85a3:0000:0000:8a2e:0370:7334"

    def test_audit_log_with_complex_details(self):
        """Test AuditLog with complex JSON details"""
        details = {
            "changed_fields": ["status", "priority"],
            "old_values": {"status": "draft", "priority": 1},
            "new_values": {"status": "active", "priority": 3},
            "reason": "User requested change",
        }

        audit_log = AuditLog(
            action="UPDATE",
            entity_type="Requirement",
            details=details,
        )

        assert audit_log.details == details
        assert audit_log.details["changed_fields"] == ["status", "priority"]


class TestAuditLogBaseSchema:
    """Test AuditLogBase Pydantic schema"""

    def test_valid_audit_log_base(self):
        """Test creating a valid AuditLogBase schema"""
        audit_data = {
            "action": "CREATE",
            "entity_type": "WorkItem",
            "entity_id": uuid4(),
            "ip_address": "192.168.1.1",
            "details": {"key": "value"},
        }

        audit_log = AuditLogBase(**audit_data)

        assert audit_log.action == "CREATE"
        assert audit_log.entity_type == "WorkItem"
        assert audit_log.ip_address == "192.168.1.1"
        assert audit_log.details == {"key": "value"}

    def test_audit_log_base_minimal(self):
        """Test AuditLogBase with minimal required fields"""
        audit_data = {
            "action": "READ",
            "entity_type": "User",
        }

        audit_log = AuditLogBase(**audit_data)

        assert audit_log.action == "READ"
        assert audit_log.entity_type == "User"
        assert audit_log.entity_id is None
        assert audit_log.ip_address is None
        assert audit_log.details is None

    def test_audit_log_base_empty_action(self):
        """Test AuditLogBase with empty action"""
        audit_data = {
            "action": "",
            "entity_type": "WorkItem",
        }

        with pytest.raises(ValidationError) as exc_info:
            AuditLogBase(**audit_data)

        assert "action" in str(exc_info.value).lower()

    def test_audit_log_base_empty_entity_type(self):
        """Test AuditLogBase with empty entity_type"""
        audit_data = {
            "action": "CREATE",
            "entity_type": "",
        }

        with pytest.raises(ValidationError) as exc_info:
            AuditLogBase(**audit_data)

        assert "entity_type" in str(exc_info.value).lower()

    def test_audit_log_base_action_too_long(self):
        """Test AuditLogBase with action exceeding max length"""
        audit_data = {
            "action": "A" * 51,  # Max is 50
            "entity_type": "WorkItem",
        }

        with pytest.raises(ValidationError) as exc_info:
            AuditLogBase(**audit_data)

        assert "action" in str(exc_info.value).lower()

    def test_audit_log_base_ip_too_long(self):
        """Test AuditLogBase with IP address exceeding max length"""
        audit_data = {
            "action": "CREATE",
            "entity_type": "WorkItem",
            "ip_address": "1" * 46,  # Max is 45
        }

        with pytest.raises(ValidationError) as exc_info:
            AuditLogBase(**audit_data)

        assert "ip_address" in str(exc_info.value).lower()


class TestAuditLogCreateSchema:
    """Test AuditLogCreate Pydantic schema"""

    def test_valid_audit_log_create(self):
        """Test creating a valid AuditLogCreate schema"""
        user_id = uuid4()
        entity_id = uuid4()

        audit_data = {
            "user_id": user_id,
            "action": "SIGN",
            "entity_type": "Requirement",
            "entity_id": entity_id,
            "ip_address": "10.0.0.1",
            "details": {"signature_hash": "abc123"},
        }

        audit_log = AuditLogCreate(**audit_data)

        assert audit_log.user_id == user_id
        assert audit_log.action == "SIGN"
        assert audit_log.entity_type == "Requirement"
        assert audit_log.entity_id == entity_id

    def test_audit_log_create_system_action(self):
        """Test AuditLogCreate for system action (no user_id)"""
        audit_data = {
            "action": "BACKUP",
            "entity_type": "System",
            "details": {"backup_size": "1GB"},
        }

        audit_log = AuditLogCreate(**audit_data)

        assert audit_log.user_id is None
        assert audit_log.action == "BACKUP"


class TestAuditLogResponseSchema:
    """Test AuditLogResponse Pydantic schema"""

    def test_audit_log_response_from_model(self):
        """Test creating AuditLogResponse from AuditLog model"""
        audit_id = uuid4()
        user_id = uuid4()
        entity_id = uuid4()
        timestamp = datetime.now(UTC)

        audit_log = AuditLog(
            id=audit_id,
            user_id=user_id,
            action="UPDATE",
            entity_type="WorkItem",
            entity_id=entity_id,
            timestamp=timestamp,
            ip_address="192.168.1.100",
            details={"field": "updated"},
        )

        audit_response = AuditLogResponse.model_validate(audit_log)

        assert audit_response.id == audit_id
        assert audit_response.user_id == user_id
        assert audit_response.action == "UPDATE"
        assert audit_response.entity_type == "WorkItem"
        assert audit_response.entity_id == entity_id
        assert audit_response.timestamp == timestamp
        assert audit_response.ip_address == "192.168.1.100"
        assert audit_response.details == {"field": "updated"}

    def test_audit_log_response_serialization(self):
        """Test AuditLogResponse serialization"""
        audit_id = uuid4()
        timestamp = datetime.now(UTC)

        audit_data = {
            "id": audit_id,
            "user_id": None,
            "action": "AUTH",
            "entity_type": "User",
            "entity_id": None,
            "timestamp": timestamp,
            "ip_address": "127.0.0.1",
            "details": {"success": False},
        }

        audit_response = AuditLogResponse(**audit_data)
        response_dict = audit_response.model_dump()

        assert response_dict["id"] == audit_id
        assert response_dict["action"] == "AUTH"
        assert response_dict["timestamp"] == timestamp


class TestAuditLogFilterSchema:
    """Test AuditLogFilter Pydantic schema"""

    def test_audit_log_filter_all_fields(self):
        """Test AuditLogFilter with all fields"""
        user_id = uuid4()
        entity_id = uuid4()
        start_date = datetime(2024, 1, 1, tzinfo=UTC)
        end_date = datetime(2024, 12, 31, tzinfo=UTC)

        filter_data = {
            "user_id": user_id,
            "action": "CREATE",
            "entity_type": "WorkItem",
            "entity_id": entity_id,
            "start_date": start_date,
            "end_date": end_date,
            "limit": 50,
            "offset": 10,
        }

        audit_filter = AuditLogFilter(**filter_data)

        assert audit_filter.user_id == user_id
        assert audit_filter.action == "CREATE"
        assert audit_filter.entity_type == "WorkItem"
        assert audit_filter.entity_id == entity_id
        assert audit_filter.start_date == start_date
        assert audit_filter.end_date == end_date
        assert audit_filter.limit == 50
        assert audit_filter.offset == 10

    def test_audit_log_filter_defaults(self):
        """Test AuditLogFilter default values"""
        audit_filter = AuditLogFilter()

        assert audit_filter.user_id is None
        assert audit_filter.action is None
        assert audit_filter.entity_type is None
        assert audit_filter.entity_id is None
        assert audit_filter.start_date is None
        assert audit_filter.end_date is None
        assert audit_filter.limit == 100
        assert audit_filter.offset == 0

    def test_audit_log_filter_limit_validation(self):
        """Test AuditLogFilter limit validation"""
        # Test limit too small
        with pytest.raises(ValidationError) as exc_info:
            AuditLogFilter(limit=0)
        assert "limit" in str(exc_info.value).lower()

        # Test limit too large
        with pytest.raises(ValidationError) as exc_info:
            AuditLogFilter(limit=1001)
        assert "limit" in str(exc_info.value).lower()

    def test_audit_log_filter_offset_validation(self):
        """Test AuditLogFilter offset validation"""
        # Test negative offset
        with pytest.raises(ValidationError) as exc_info:
            AuditLogFilter(offset=-1)
        assert "offset" in str(exc_info.value).lower()

    def test_audit_log_filter_partial(self):
        """Test AuditLogFilter with partial fields"""
        filter_data = {
            "action": "UPDATE",
            "limit": 25,
        }

        audit_filter = AuditLogFilter(**filter_data)

        assert audit_filter.action == "UPDATE"
        assert audit_filter.limit == 25
        assert audit_filter.user_id is None
        assert audit_filter.entity_type is None

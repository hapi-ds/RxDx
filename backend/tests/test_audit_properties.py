"""Property-based tests for audit log integrity"""

import pytest
from datetime import datetime, UTC
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock
from hypothesis import given, strategies as st, assume, settings, HealthCheck

from app.services.audit_service import AuditService
from app.models.audit import AuditLog
from app.schemas.audit import AuditLogFilter


class TestAuditLogProperties:
    """Property-based tests for audit log integrity"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        db = AsyncMock()
        db.add = MagicMock()
        db.commit = AsyncMock()
        db.refresh = AsyncMock()
        return db

    @pytest.fixture
    def audit_service(self, mock_db):
        """AuditService instance with mocked database"""
        return AuditService(db=mock_db)

    # Strategy for generating valid action strings
    action_strategy = st.sampled_from([
        "CREATE", "READ", "UPDATE", "DELETE", "SIGN", "AUTH", 
        "AUTHZ_GRANTED", "AUTHZ_DENIED", "SIGNATURE_SIGN", "SIGNATURE_VERIFY"
    ])

    # Strategy for generating valid entity types
    entity_type_strategy = st.sampled_from([
        "User", "WorkItem", "Requirement", "Test", "Risk", "Document", 
        "DigitalSignature", "Authorization", "System"
    ])

    # Strategy for generating UUIDs
    uuid_strategy = st.builds(uuid4)

    # Strategy for generating IP addresses
    ip_strategy = st.one_of(
        st.none(),
        st.ip_addresses(v=4).map(str),
        st.ip_addresses(v=6).map(str)
    )

    # Strategy for generating details dictionaries
    details_strategy = st.one_of(
        st.none(),
        st.dictionaries(
            st.text(min_size=1, max_size=20),
            st.one_of(st.text(), st.integers(), st.booleans()),
            min_size=0,
            max_size=5
        )
    )

    @given(
        action=action_strategy,
        entity_type=entity_type_strategy,
        user_id=st.one_of(st.none(), uuid_strategy),
        entity_id=st.one_of(st.none(), uuid_strategy),
        ip_address=ip_strategy,
        details=details_strategy
    )
    @settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_audit_log_completeness_property(
        self, 
        audit_service, 
        mock_db,
        action,
        entity_type,
        user_id,
        entity_id,
        ip_address,
        details
    ):
        """
        **Validates: Requirement 13.1, 13.2, 13.3**
        **Property**: All CRUD operations are logged with complete information
        **Formal**: ∀ operation op, execute(op) → ∃ log l, records(l, op) ∧ complete(l)
        """
        # Reset mock for each test iteration
        mock_db.reset_mock()
        
        # Execute the audit logging operation
        result = await audit_service.log(
            action=action,
            entity_type=entity_type,
            user_id=user_id,
            entity_id=entity_id,
            ip_address=ip_address,
            details=details
        )
        
        # Verify that a log entry was created
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()
        
        # Get the created audit log
        created_log = mock_db.add.call_args[0][0]
        assert isinstance(created_log, AuditLog)
        
        # Property: All required fields are present and correct
        assert created_log.action == action.upper()  # Action is normalized
        assert created_log.entity_type == entity_type
        assert created_log.user_id == user_id
        assert created_log.entity_id == entity_id
        assert created_log.ip_address == ip_address
        assert created_log.details == details
        
        # Property: Timestamp is automatically set and valid
        assert isinstance(created_log.timestamp, datetime)
        assert created_log.timestamp.tzinfo is not None  # Has timezone info

    @given(
        action1=action_strategy,
        action2=action_strategy,
        entity_type1=entity_type_strategy,
        entity_type2=entity_type_strategy,
        user_id=st.one_of(st.none(), uuid_strategy)
    )
    @settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_audit_log_immutability_property(
        self,
        audit_service,
        mock_db,
        action1,
        action2,
        entity_type1,
        entity_type2,
        user_id
    ):
        """
        **Validates: Requirement 13.7**
        **Property**: Audit log entries cannot be modified or deleted
        **Formal**: ∀ log_entry l, created(l) → ∀ t > create_time(l), immutable(l, t) = true
        """
        # Reset mock for each test iteration
        mock_db.reset_mock()
        
        # Create first audit log
        await audit_service.log(
            action=action1,
            entity_type=entity_type1,
            user_id=user_id
        )
        
        first_call_args = mock_db.add.call_args[0][0]
        first_timestamp = first_call_args.timestamp
        
        # Reset mocks
        mock_db.reset_mock()
        
        # Create second audit log
        await audit_service.log(
            action=action2,
            entity_type=entity_type2,
            user_id=user_id
        )
        
        second_call_args = mock_db.add.call_args[0][0]
        
        # Property: Each log entry is independent and immutable
        # (We verify this by ensuring the service has no update/delete methods)
        assert not hasattr(audit_service, 'update_audit_log')
        assert not hasattr(audit_service, 'delete_audit_log')
        assert not hasattr(audit_service, 'modify_audit_log')
        
        # Property: Each log entry has its own timestamp
        assert isinstance(second_call_args.timestamp, datetime)
        
        # Property: Multiple logs can be created without affecting previous ones
        assert mock_db.add.call_count == 1  # Only the second log in this call
        assert mock_db.commit.call_count == 1

    @given(
        log_entries=st.lists(
            st.tuples(action_strategy, entity_type_strategy, st.one_of(st.none(), uuid_strategy)),
            min_size=1,
            max_size=5
        )
    )
    @settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_audit_log_ordering_property(
        self,
        audit_service,
        mock_db,
        log_entries
    ):
        """
        **Property**: Audit logs maintain chronological order
        **Formal**: ∀ logs l1, l2, created(l1) < created(l2) → timestamp(l1) ≤ timestamp(l2)
        """
        # Reset mock for each test iteration
        mock_db.reset_mock()
        
        timestamps = []
        
        # Create multiple audit logs in sequence
        for action, entity_type, user_id in log_entries:
            await audit_service.log(
                action=action,
                entity_type=entity_type,
                user_id=user_id
            )
            
            # Capture the timestamp of each created log
            created_log = mock_db.add.call_args[0][0]
            timestamps.append(created_log.timestamp)
            
            # Reset mock for next iteration
            mock_db.reset_mock()
        
        # Property: Timestamps are in chronological order (or equal for very fast operations)
        for i in range(1, len(timestamps)):
            assert timestamps[i] >= timestamps[i-1], \
                f"Timestamp {i} ({timestamps[i]}) should be >= timestamp {i-1} ({timestamps[i-1]})"

    @given(
        email=st.emails(),
        success=st.booleans(),
        user_id=st.one_of(st.none(), uuid_strategy),
        failure_reason=st.one_of(st.none(), st.text(min_size=1, max_size=100))
    )
    @settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_auth_logging_property(
        self,
        audit_service,
        mock_db,
        email,
        success,
        user_id,
        failure_reason
    ):
        """
        **Property**: Authentication events are always logged with correct action type
        **Formal**: ∀ auth_attempt a, log_auth(a) → action(log) ∈ {AUTH_SUCCESS, AUTH_FAILURE}
        """
        # Reset mock for each test iteration
        mock_db.reset_mock()
        
        await audit_service.log_auth_attempt(
            email=email,
            success=success,
            user_id=user_id if success else None,  # User ID only for successful auth
            failure_reason=failure_reason if not success else None
        )
        
        created_log = mock_db.add.call_args[0][0]
        
        # Property: Action type matches authentication result
        expected_action = "AUTH_SUCCESS" if success else "AUTH_FAILURE"
        assert created_log.action == expected_action
        
        # Property: Entity type is always User for auth events
        assert created_log.entity_type == "User"
        
        # Property: Email is always recorded in details
        assert created_log.details is not None
        assert created_log.details["email"] == email
        
        # Property: Failure reason is recorded for failed attempts
        if not success and failure_reason:
            assert created_log.details["failure_reason"] == failure_reason

    @given(
        permission=st.text(min_size=1, max_size=50),
        resource=st.text(min_size=1, max_size=100),
        granted=st.booleans(),
        user_id=uuid_strategy
    )
    @settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_authorization_logging_property(
        self,
        audit_service,
        mock_db,
        permission,
        resource,
        granted,
        user_id
    ):
        """
        **Property**: Authorization decisions are always logged with correct details
        **Formal**: ∀ authz_decision d, log_authz(d) → details(log) contains permission ∧ resource
        """
        # Reset mock for each test iteration
        mock_db.reset_mock()
        
        await audit_service.log_authorization_decision(
            user_id=user_id,
            permission=permission,
            resource=resource,
            granted=granted
        )
        
        created_log = mock_db.add.call_args[0][0]
        
        # Property: Action type matches authorization result
        expected_action = "AUTHZ_GRANTED" if granted else "AUTHZ_DENIED"
        assert created_log.action == expected_action
        
        # Property: Entity type is always Authorization
        assert created_log.entity_type == "Authorization"
        
        # Property: User ID is always recorded
        assert created_log.user_id == user_id
        
        # Property: Permission and resource are always recorded in details
        assert created_log.details is not None
        assert created_log.details["permission"] == permission
        assert created_log.details["resource"] == resource

    @given(
        operation=st.sampled_from(["CREATE", "READ", "UPDATE", "DELETE"]),
        entity_type=entity_type_strategy,
        entity_id=uuid_strategy,
        user_id=uuid_strategy,
        changes=st.one_of(st.none(), st.dictionaries(st.text(), st.text(), min_size=1, max_size=3))
    )
    @settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_crud_logging_property(
        self,
        audit_service,
        mock_db,
        operation,
        entity_type,
        entity_id,
        user_id,
        changes
    ):
        """
        **Property**: CRUD operations are logged with entity information
        **Formal**: ∀ crud_op op, log_crud(op) → entity_type(log) ∧ entity_id(log) ∧ user_id(log)
        """
        # Reset mock for each test iteration
        mock_db.reset_mock()
        
        await audit_service.log_crud_operation(
            operation=operation,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            changes=changes
        )
        
        created_log = mock_db.add.call_args[0][0]
        
        # Property: Operation is recorded correctly
        assert created_log.action == operation.upper()
        
        # Property: Entity information is complete
        assert created_log.entity_type == entity_type
        assert created_log.entity_id == entity_id
        assert created_log.user_id == user_id
        
        # Property: Changes are recorded when provided
        if changes:
            assert created_log.details is not None
            assert created_log.details["changes"] == changes

    @given(
        event_type=st.sampled_from(["SIGN", "VERIFY", "INVALIDATE"]),
        workitem_id=uuid_strategy,
        user_id=uuid_strategy,
        signature_id=st.one_of(st.none(), uuid_strategy),
        verification_result=st.one_of(st.none(), st.booleans())
    )
    @settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
    @pytest.mark.asyncio
    async def test_signature_logging_property(
        self,
        audit_service,
        mock_db,
        event_type,
        workitem_id,
        user_id,
        signature_id,
        verification_result
    ):
        """
        **Property**: Signature events are logged with complete signature context
        **Formal**: ∀ sig_event e, log_signature(e) → workitem_id(log) ∧ action_type(log)
        """
        # Reset mock for each test iteration
        mock_db.reset_mock()
        
        await audit_service.log_signature_event(
            event_type=event_type,
            workitem_id=workitem_id,
            user_id=user_id,
            signature_id=signature_id,
            verification_result=verification_result
        )
        
        created_log = mock_db.add.call_args[0][0]
        
        # Property: Action type includes signature prefix
        assert created_log.action == f"SIGNATURE_{event_type.upper()}"
        
        # Property: Entity type is always DigitalSignature
        assert created_log.entity_type == "DigitalSignature"
        
        # Property: User ID is always recorded
        assert created_log.user_id == user_id
        
        # Property: WorkItem ID is always recorded in details
        assert created_log.details is not None
        assert created_log.details["workitem_id"] == str(workitem_id)
        
        # Property: Signature ID is recorded when provided
        if signature_id:
            assert created_log.details["signature_id"] == str(signature_id)
            assert created_log.entity_id == signature_id
        
        # Property: Verification result is recorded when provided
        if verification_result is not None:
            assert created_log.details["verification_result"] == verification_result
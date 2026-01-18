"""Integration tests for DigitalSignature complete workflow"""

import pytest
from datetime import datetime, UTC
from uuid import uuid4

from app.models.signature import DigitalSignature
from app.schemas.signature import (
    DigitalSignatureCreate,
    DigitalSignatureUpdate,
    DigitalSignatureResponse,
    DigitalSignatureFilter,
    SignatureVerificationRequest,
    SignatureVerificationResponse,
)

# Valid 64-character SHA-256 hash for testing
VALID_CONTENT_HASH = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"


@pytest.mark.integration
class TestDigitalSignatureIntegration:
    """Integration tests for complete digital signature workflow"""

    def test_complete_signature_workflow(self):
        """Test the complete signature workflow from creation to verification"""
        # Step 1: Create signature data
        workitem_id = uuid4()
        user_id = uuid4()
        signature_id = uuid4()

        # Step 2: Test create schema validation
        create_data = {
            'workitem_id': workitem_id,
            'workitem_version': '1.0',
            'user_id': user_id,
            'signature_hash': 'test_signature_hash',
            'content_hash': VALID_CONTENT_HASH
        }
        create_schema = DigitalSignatureCreate(**create_data)
        assert create_schema.workitem_id == workitem_id
        assert create_schema.workitem_version == '1.0'

        # Step 3: Create model instance (simulating database save)
        model = DigitalSignature(
            id=signature_id,
            workitem_id=workitem_id,
            workitem_version='1.0',
            user_id=user_id,
            signature_hash='test_signature_hash',
            content_hash=VALID_CONTENT_HASH,
            signed_at=datetime.now(UTC),
            is_valid=True
        )
        assert model.workitem_id == workitem_id
        assert model.is_valid is True

        # Step 4: Convert to response schema
        response_schema = DigitalSignatureResponse.model_validate(model)
        assert response_schema.id == signature_id
        assert response_schema.is_valid is True
        assert response_schema.invalidated_at is None

        # Step 5: Test signature invalidation workflow
        update_schema = DigitalSignatureUpdate(
            is_valid=False,
            invalidation_reason='WorkItem modified'
        )
        
        # Apply update to model
        model.is_valid = False
        model.invalidated_at = datetime.now(UTC)
        model.invalidation_reason = 'WorkItem modified'
        
        # Step 6: Verify invalidated signature response
        invalidated_response = DigitalSignatureResponse.model_validate(model)
        assert invalidated_response.is_valid is False
        assert invalidated_response.invalidation_reason == 'WorkItem modified'
        assert invalidated_response.invalidated_at is not None

        # Step 7: Test verification workflow
        verification_request = SignatureVerificationRequest(signature_id=signature_id)
        assert verification_request.signature_id == signature_id

        verification_response = SignatureVerificationResponse(
            signature_id=signature_id,
            is_valid=False,  # Should be false since we invalidated it
            verification_timestamp=datetime.now(UTC),
            content_matches=True,  # Content still matches
            signature_intact=True,  # Signature is intact
            error_message="Signature invalidated due to WorkItem modification"
        )
        assert verification_response.is_valid is False
        assert verification_response.error_message is not None

    def test_signature_filtering_workflow(self):
        """Test signature filtering and querying workflow"""
        workitem_id = uuid4()
        user_id = uuid4()

        # Test empty filter (default values)
        empty_filter = DigitalSignatureFilter()
        assert empty_filter.limit == 100
        assert empty_filter.offset == 0
        assert empty_filter.workitem_id is None

        # Test full filter with all parameters
        full_filter = DigitalSignatureFilter(
            workitem_id=workitem_id,
            user_id=user_id,
            workitem_version="1.0",
            is_valid=True,
            start_date=datetime.now(UTC),
            end_date=datetime.now(UTC),
            limit=50,
            offset=10
        )
        assert full_filter.workitem_id == workitem_id
        assert full_filter.user_id == user_id
        assert full_filter.limit == 50
        assert full_filter.offset == 10

    def test_multiple_signature_versions_workflow(self):
        """Test workflow with multiple signature versions"""
        workitem_id = uuid4()
        user_id = uuid4()

        # Create signatures for different versions
        signatures = []
        for version in ['1.0', '1.1', '1.2']:
            signature = DigitalSignature(
                id=uuid4(),
                workitem_id=workitem_id,
                workitem_version=version,
                user_id=user_id,
                signature_hash=f'signature_hash_v{version}',
                content_hash=VALID_CONTENT_HASH,
                signed_at=datetime.now(UTC),
                is_valid=True
            )
            signatures.append(signature)

        # Verify all signatures are for the same workitem but different versions
        assert all(sig.workitem_id == workitem_id for sig in signatures)
        assert len(set(sig.workitem_version for sig in signatures)) == 3

        # Test invalidating older versions (simulating WorkItem update)
        for sig in signatures[:-1]:  # Invalidate all but the latest
            sig.is_valid = False
            sig.invalidated_at = datetime.now(UTC)
            sig.invalidation_reason = 'Newer version created'

        # Verify only the latest version is still valid
        valid_signatures = [sig for sig in signatures if sig.is_valid]
        assert len(valid_signatures) == 1
        assert valid_signatures[0].workitem_version == '1.2'

    def test_signature_validation_edge_cases(self):
        """Test edge cases in signature validation"""
        workitem_id = uuid4()
        user_id = uuid4()
        signature_id = uuid4()

        # Test with minimum valid data (including required fields)
        minimal_signature = DigitalSignature(
            id=signature_id,
            workitem_id=workitem_id,
            workitem_version='1.0',
            user_id=user_id,
            signature_hash='a',  # Minimum length
            content_hash=VALID_CONTENT_HASH,
            signed_at=datetime.now(UTC),
            is_valid=True
        )
        assert minimal_signature.workitem_id == workitem_id

        # Test response schema with minimal data
        response = DigitalSignatureResponse.model_validate(minimal_signature)
        assert response.workitem_id == workitem_id
        assert response.signature_hash == 'a'

        # Test filter with edge case values
        edge_filter = DigitalSignatureFilter(
            limit=1,  # Minimum limit
            offset=0   # Minimum offset
        )
        assert edge_filter.limit == 1
        assert edge_filter.offset == 0

        # Test filter with maximum values
        max_filter = DigitalSignatureFilter(
            limit=1000,  # Maximum limit
            offset=999999  # Large offset
        )
        assert max_filter.limit == 1000
        assert max_filter.offset == 999999


@pytest.mark.integration
class TestDigitalSignatureErrorHandling:
    """Integration tests for error handling scenarios"""

    def test_invalid_signature_creation_scenarios(self):
        """Test various invalid signature creation scenarios"""
        workitem_id = uuid4()
        user_id = uuid4()

        # Test invalid content hash lengths
        invalid_hashes = [
            'short',  # Too short
            'a' * 63,  # One character short
            'a' * 65,  # One character too long
            'a' * 100,  # Way too long
        ]

        for invalid_hash in invalid_hashes:
            with pytest.raises(ValueError):
                DigitalSignatureCreate(
                    workitem_id=workitem_id,
                    workitem_version='1.0',
                    user_id=user_id,
                    signature_hash='test_hash',
                    content_hash=invalid_hash
                )

    def test_invalid_update_scenarios(self):
        """Test invalid signature update scenarios"""
        # Test invalidation reason too long
        with pytest.raises(ValueError):
            DigitalSignatureUpdate(
                is_valid=False,
                invalidation_reason='a' * 501  # Too long
            )

    def test_invalid_filter_scenarios(self):
        """Test invalid filter scenarios"""
        # Test invalid limit values
        with pytest.raises(ValueError):
            DigitalSignatureFilter(limit=0)  # Too small

        with pytest.raises(ValueError):
            DigitalSignatureFilter(limit=1001)  # Too large

        # Test invalid offset
        with pytest.raises(ValueError):
            DigitalSignatureFilter(offset=-1)  # Negative


@pytest.mark.integration
class TestDigitalSignatureDataConsistency:
    """Integration tests for data consistency and integrity"""

    def test_signature_data_consistency(self):
        """Test that signature data remains consistent across transformations"""
        workitem_id = uuid4()
        user_id = uuid4()
        signature_id = uuid4()
        signed_at = datetime.now(UTC)

        # Original data
        original_data = {
            'id': signature_id,
            'workitem_id': workitem_id,
            'workitem_version': '2.1',
            'user_id': user_id,
            'signature_hash': 'consistent_signature_hash',
            'content_hash': VALID_CONTENT_HASH,
            'signed_at': signed_at,
            'is_valid': True,
            'invalidated_at': None,
            'invalidation_reason': None
        }

        # Create model
        model = DigitalSignature(**original_data)

        # Convert to response schema
        response = DigitalSignatureResponse.model_validate(model)

        # Verify all data is preserved
        assert response.id == signature_id
        assert response.workitem_id == workitem_id
        assert response.workitem_version == '2.1'
        assert response.user_id == user_id
        assert response.signature_hash == 'consistent_signature_hash'
        assert response.content_hash == VALID_CONTENT_HASH
        assert response.signed_at == signed_at
        assert response.is_valid is True
        assert response.invalidated_at is None
        assert response.invalidation_reason is None

        # Test round-trip consistency
        response_dict = response.model_dump()
        new_response = DigitalSignatureResponse(**response_dict)
        
        # Verify round-trip preserves all data
        assert new_response.id == response.id
        assert new_response.workitem_id == response.workitem_id
        assert new_response.content_hash == response.content_hash

    def test_signature_state_transitions(self):
        """Test valid signature state transitions"""
        signature = DigitalSignature(
            id=uuid4(),
            workitem_id=uuid4(),
            workitem_version='1.0',
            user_id=uuid4(),
            signature_hash='test_hash',
            content_hash=VALID_CONTENT_HASH,
            signed_at=datetime.now(UTC),
            is_valid=True
        )

        # Valid -> Invalid transition
        assert signature.is_valid is True
        signature.is_valid = False
        signature.invalidated_at = datetime.now(UTC)
        signature.invalidation_reason = 'Test invalidation'

        # Verify transition
        response = DigitalSignatureResponse.model_validate(signature)
        assert response.is_valid is False
        assert response.invalidated_at is not None
        assert response.invalidation_reason == 'Test invalidation'
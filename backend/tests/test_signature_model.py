"""Unit tests for DigitalSignature model and schemas"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from pydantic import ValidationError

from app.models.signature import DigitalSignature
from app.schemas.signature import (
    DigitalSignatureCreate,
    DigitalSignatureFilter,
    DigitalSignatureResponse,
    DigitalSignatureUpdate,
    SignatureVerificationRequest,
    SignatureVerificationResponse,
)

# Valid 64-character SHA-256 hash for testing
VALID_CONTENT_HASH = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"


@pytest.mark.unit
class TestDigitalSignatureModel:
    """Test DigitalSignature SQLAlchemy model"""

    def test_signature_creation(self):
        """Test creating a DigitalSignature instance"""
        workitem_id = uuid4()
        user_id = uuid4()
        signature = DigitalSignature(
            workitem_id=workitem_id,
            workitem_version="1.0",
            user_id=user_id,
            signature_hash="abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            content_hash=VALID_CONTENT_HASH,
            is_valid=True,  # Explicitly set for testing since defaults only apply when saved to DB
        )

        assert signature.workitem_id == workitem_id
        assert signature.workitem_version == "1.0"
        assert signature.user_id == user_id
        assert signature.signature_hash == "abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        assert signature.content_hash == VALID_CONTENT_HASH
        assert signature.is_valid is True
        assert signature.invalidated_at is None
        assert signature.invalidation_reason is None

    def test_signature_default_values(self):
        """Test DigitalSignature model default values"""
        signature = DigitalSignature(
            workitem_id=uuid4(),
            workitem_version="1.0",
            user_id=uuid4(),
            signature_hash="test_signature_hash",
            content_hash=VALID_CONTENT_HASH,
        )

        # For non-persisted objects, SQLAlchemy defaults are not applied
        # The database columns have defaults, but these are only applied on INSERT
        assert signature.invalidated_at is None
        assert signature.invalidation_reason is None
        # signed_at and is_valid will be None until saved to DB, but the columns have defaults

    def test_signature_repr(self):
        """Test DigitalSignature __repr__ method"""
        signature_id = uuid4()
        workitem_id = uuid4()
        user_id = uuid4()
        signature = DigitalSignature(
            id=signature_id,
            workitem_id=workitem_id,
            workitem_version="2.1",
            user_id=user_id,
            signature_hash="test_signature_hash",
            content_hash=VALID_CONTENT_HASH,
            is_valid=False,
        )

        repr_str = repr(signature)
        assert "DigitalSignature" in repr_str
        assert str(signature_id) in repr_str
        assert str(workitem_id) in repr_str
        assert "2.1" in repr_str
        assert str(user_id) in repr_str
        assert "False" in repr_str

    def test_signature_invalidation(self):
        """Test signature invalidation fields"""
        signature = DigitalSignature(
            workitem_id=uuid4(),
            workitem_version="1.0",
            user_id=uuid4(),
            signature_hash="test_signature_hash",
            content_hash=VALID_CONTENT_HASH,
            is_valid=False,
            invalidated_at=datetime.now(UTC),
            invalidation_reason="WorkItem modified",
        )

        assert signature.is_valid is False
        assert signature.invalidated_at is not None
        assert signature.invalidation_reason == "WorkItem modified"


@pytest.mark.unit
class TestDigitalSignatureCreateSchema:
    """Test DigitalSignatureCreate Pydantic schema"""

    def test_valid_signature_create(self):
        """Test creating a valid DigitalSignatureCreate schema"""
        workitem_id = uuid4()
        user_id = uuid4()
        signature_data = {
            "workitem_id": workitem_id,
            "workitem_version": "1.0",
            "user_id": user_id,
            "signature_hash": "abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
            "content_hash": VALID_CONTENT_HASH,
        }

        signature = DigitalSignatureCreate(**signature_data)

        assert signature.workitem_id == workitem_id
        assert signature.workitem_version == "1.0"
        assert signature.user_id == user_id
        assert signature.signature_hash == "abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
        assert signature.content_hash == VALID_CONTENT_HASH

    def test_empty_workitem_version(self):
        """Test DigitalSignatureCreate with empty workitem_version"""
        signature_data = {
            "workitem_id": uuid4(),
            "workitem_version": "",
            "user_id": uuid4(),
            "signature_hash": "test_signature_hash",
            "content_hash": VALID_CONTENT_HASH,
        }

        with pytest.raises(ValidationError) as exc_info:
            DigitalSignatureCreate(**signature_data)

        assert "workitem_version" in str(exc_info.value).lower()

    def test_long_workitem_version(self):
        """Test DigitalSignatureCreate with workitem_version too long"""
        signature_data = {
            "workitem_id": uuid4(),
            "workitem_version": "a" * 25,  # Max is 20
            "user_id": uuid4(),
            "signature_hash": "test_signature_hash",
            "content_hash": VALID_CONTENT_HASH,
        }

        with pytest.raises(ValidationError) as exc_info:
            DigitalSignatureCreate(**signature_data)

        assert "workitem_version" in str(exc_info.value).lower()

    def test_empty_signature_hash(self):
        """Test DigitalSignatureCreate with empty signature_hash"""
        signature_data = {
            "workitem_id": uuid4(),
            "workitem_version": "1.0",
            "user_id": uuid4(),
            "signature_hash": "",
            "content_hash": VALID_CONTENT_HASH,
        }

        with pytest.raises(ValidationError) as exc_info:
            DigitalSignatureCreate(**signature_data)

        assert "signature_hash" in str(exc_info.value).lower()

    def test_invalid_content_hash_length(self):
        """Test DigitalSignatureCreate with invalid content_hash length"""
        signature_data = {
            "workitem_id": uuid4(),
            "workitem_version": "1.0",
            "user_id": uuid4(),
            "signature_hash": "test_signature_hash",
            "content_hash": "short_hash",  # Should be 64 characters
        }

        with pytest.raises(ValidationError) as exc_info:
            DigitalSignatureCreate(**signature_data)

        assert "content_hash" in str(exc_info.value).lower()

    def test_content_hash_too_long(self):
        """Test DigitalSignatureCreate with content_hash too long"""
        signature_data = {
            "workitem_id": uuid4(),
            "workitem_version": "1.0",
            "user_id": uuid4(),
            "signature_hash": "test_signature_hash",
            "content_hash": "a" * 65,  # Should be exactly 64 characters
        }

        with pytest.raises(ValidationError) as exc_info:
            DigitalSignatureCreate(**signature_data)

        assert "content_hash" in str(exc_info.value).lower()


@pytest.mark.unit
class TestDigitalSignatureUpdateSchema:
    """Test DigitalSignatureUpdate Pydantic schema"""

    def test_valid_signature_update(self):
        """Test creating a valid DigitalSignatureUpdate schema"""
        update_data = {
            "is_valid": False,
            "invalidation_reason": "WorkItem was modified",
        }

        signature_update = DigitalSignatureUpdate(**update_data)

        assert signature_update.is_valid is False
        assert signature_update.invalidation_reason == "WorkItem was modified"

    def test_update_to_valid(self):
        """Test updating signature to valid status"""
        update_data = {
            "is_valid": True,
        }

        signature_update = DigitalSignatureUpdate(**update_data)

        assert signature_update.is_valid is True
        assert signature_update.invalidation_reason is None

    def test_long_invalidation_reason(self):
        """Test DigitalSignatureUpdate with invalidation_reason too long"""
        update_data = {
            "is_valid": False,
            "invalidation_reason": "a" * 501,  # Max is 500
        }

        with pytest.raises(ValidationError) as exc_info:
            DigitalSignatureUpdate(**update_data)

        assert "invalidation_reason" in str(exc_info.value).lower()


@pytest.mark.unit
class TestDigitalSignatureResponseSchema:
    """Test DigitalSignatureResponse Pydantic schema"""

    def test_signature_response_from_model(self):
        """Test creating DigitalSignatureResponse from DigitalSignature model"""
        signature_id = uuid4()
        workitem_id = uuid4()
        user_id = uuid4()
        signed_at = datetime.now(UTC)

        signature = DigitalSignature(
            id=signature_id,
            workitem_id=workitem_id,
            workitem_version="1.0",
            user_id=user_id,
            signature_hash="test_signature_hash",
            content_hash=VALID_CONTENT_HASH,
            signed_at=signed_at,
            is_valid=True,
        )

        signature_response = DigitalSignatureResponse.model_validate(signature)

        assert signature_response.id == signature_id
        assert signature_response.workitem_id == workitem_id
        assert signature_response.workitem_version == "1.0"
        assert signature_response.user_id == user_id
        assert signature_response.signature_hash == "test_signature_hash"
        assert signature_response.content_hash == VALID_CONTENT_HASH
        assert signature_response.signed_at == signed_at
        assert signature_response.is_valid is True
        assert signature_response.invalidated_at is None
        assert signature_response.invalidation_reason is None

    def test_invalidated_signature_response(self):
        """Test DigitalSignatureResponse for invalidated signature"""
        invalidated_at = datetime.now(UTC)
        signature_dict = {
            "id": uuid4(),
            "workitem_id": uuid4(),
            "workitem_version": "1.0",
            "user_id": uuid4(),
            "signature_hash": "test_signature_hash",
            "content_hash": VALID_CONTENT_HASH,
            "signed_at": datetime.now(UTC),
            "is_valid": False,
            "invalidated_at": invalidated_at,
            "invalidation_reason": "WorkItem modified",
        }

        signature_response = DigitalSignatureResponse(**signature_dict)

        assert signature_response.is_valid is False
        assert signature_response.invalidated_at == invalidated_at
        assert signature_response.invalidation_reason == "WorkItem modified"


@pytest.mark.unit
class TestDigitalSignatureFilterSchema:
    """Test DigitalSignatureFilter Pydantic schema"""

    def test_empty_filter(self):
        """Test DigitalSignatureFilter with no filters"""
        filter_data = {}

        signature_filter = DigitalSignatureFilter(**filter_data)

        assert signature_filter.workitem_id is None
        assert signature_filter.user_id is None
        assert signature_filter.workitem_version is None
        assert signature_filter.is_valid is None
        assert signature_filter.start_date is None
        assert signature_filter.end_date is None
        assert signature_filter.limit == 100
        assert signature_filter.offset == 0

    def test_full_filter(self):
        """Test DigitalSignatureFilter with all filters"""
        workitem_id = uuid4()
        user_id = uuid4()
        start_date = datetime.now(UTC)
        end_date = datetime.now(UTC)

        filter_data = {
            "workitem_id": workitem_id,
            "user_id": user_id,
            "workitem_version": "1.0",
            "is_valid": True,
            "start_date": start_date,
            "end_date": end_date,
            "limit": 50,
            "offset": 10,
        }

        signature_filter = DigitalSignatureFilter(**filter_data)

        assert signature_filter.workitem_id == workitem_id
        assert signature_filter.user_id == user_id
        assert signature_filter.workitem_version == "1.0"
        assert signature_filter.is_valid is True
        assert signature_filter.start_date == start_date
        assert signature_filter.end_date == end_date
        assert signature_filter.limit == 50
        assert signature_filter.offset == 10

    def test_invalid_limit(self):
        """Test DigitalSignatureFilter with invalid limit"""
        filter_data = {"limit": 0}

        with pytest.raises(ValidationError) as exc_info:
            DigitalSignatureFilter(**filter_data)

        assert "limit" in str(exc_info.value).lower()

    def test_limit_too_high(self):
        """Test DigitalSignatureFilter with limit too high"""
        filter_data = {"limit": 1001}

        with pytest.raises(ValidationError) as exc_info:
            DigitalSignatureFilter(**filter_data)

        assert "limit" in str(exc_info.value).lower()

    def test_negative_offset(self):
        """Test DigitalSignatureFilter with negative offset"""
        filter_data = {"offset": -1}

        with pytest.raises(ValidationError) as exc_info:
            DigitalSignatureFilter(**filter_data)

        assert "offset" in str(exc_info.value).lower()


@pytest.mark.unit
class TestSignatureVerificationSchemas:
    """Test signature verification request and response schemas"""

    def test_verification_request(self):
        """Test SignatureVerificationRequest schema"""
        signature_id = uuid4()
        request_data = {"signature_id": signature_id}

        verification_request = SignatureVerificationRequest(**request_data)

        assert verification_request.signature_id == signature_id

    def test_verification_response_valid(self):
        """Test SignatureVerificationResponse for valid signature"""
        signature_id = uuid4()
        verification_timestamp = datetime.now(UTC)

        response_data = {
            "signature_id": signature_id,
            "is_valid": True,
            "verification_timestamp": verification_timestamp,
            "content_matches": True,
            "signature_intact": True,
        }

        verification_response = SignatureVerificationResponse(**response_data)

        assert verification_response.signature_id == signature_id
        assert verification_response.is_valid is True
        assert verification_response.verification_timestamp == verification_timestamp
        assert verification_response.content_matches is True
        assert verification_response.signature_intact is True
        assert verification_response.error_message is None

    def test_verification_response_invalid(self):
        """Test SignatureVerificationResponse for invalid signature"""
        signature_id = uuid4()
        verification_timestamp = datetime.now(UTC)

        response_data = {
            "signature_id": signature_id,
            "is_valid": False,
            "verification_timestamp": verification_timestamp,
            "content_matches": False,
            "signature_intact": True,
            "error_message": "Content hash mismatch",
        }

        verification_response = SignatureVerificationResponse(**response_data)

        assert verification_response.signature_id == signature_id
        assert verification_response.is_valid is False
        assert verification_response.content_matches is False
        assert verification_response.signature_intact is True
        assert verification_response.error_message == "Content hash mismatch"

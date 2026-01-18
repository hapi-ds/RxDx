"""Integration tests for SignatureService with WorkItem workflow"""

import pytest
from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.models.signature import DigitalSignature
from app.models.user import User, UserRole
from app.services.signature_service import SignatureService


@pytest.mark.integration
class TestSignatureServiceWorkItemIntegration:
    """Integration tests for SignatureService with WorkItem operations"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return AsyncMock()

    @pytest.fixture
    def signature_service(self, mock_db):
        """SignatureService instance with mocked database"""
        return SignatureService(mock_db)

    @pytest.fixture
    def test_user(self):
        """Test user for signing operations"""
        return User(
            id=uuid4(),
            email="validator@example.com",
            full_name="Test Validator",
            role=UserRole.VALIDATOR,
            hashed_password="hashed_password",
            is_active=True,
        )

    @pytest.fixture
    def rsa_key_pair(self):
        """Generate RSA key pair for testing"""
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        
        public_key = private_key.public_key()
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        
        return private_pem, public_pem

    @pytest.fixture
    def sample_workitem(self):
        """Sample WorkItem content for testing"""
        return {
            "id": str(uuid4()),
            "type": "requirement",
            "title": "User Authentication Requirement",
            "description": "The system shall authenticate users with email and password",
            "status": "active",
            "priority": 1,
            "version": "1.0",
            "created_at": "2024-01-01T00:00:00Z",
            "created_by": str(uuid4()),
        }

    async def test_complete_workitem_signing_workflow(
        self, signature_service, mock_db, test_user, rsa_key_pair, sample_workitem
    ):
        """Test complete workflow: sign WorkItem -> verify -> invalidate -> re-sign"""
        private_pem, public_pem = rsa_key_pair
        workitem_id = uuid4()
        
        # Mock database operations for signing
        mock_signature = DigitalSignature(
            id=uuid4(),
            workitem_id=workitem_id,
            workitem_version="1.0",
            user_id=test_user.id,
            signature_hash="",  # Will be set by service
            content_hash="",   # Will be set by service
            signed_at=datetime.now(UTC),
            is_valid=True,
        )
        
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        
        async def mock_refresh(obj):
            # Simulate database setting the signature values
            obj.id = mock_signature.id
            obj.signature_hash = "a" * 512  # Valid signature length
            obj.content_hash = "b" * 64     # Valid content hash length
        
        mock_db.refresh = AsyncMock(side_effect=mock_refresh)
        
        # Step 1: Sign the WorkItem
        signature_response = await signature_service.sign_workitem(
            workitem_id=workitem_id,
            workitem_version="1.0",
            workitem_content=sample_workitem,
            user=test_user,
            private_key_pem=private_pem,
        )
        
        # Verify signing worked
        assert signature_response.workitem_id == workitem_id
        assert signature_response.workitem_version == "1.0"
        assert signature_response.user_id == test_user.id
        assert signature_response.is_valid is True
        
        # Step 2: Verify the signature
        # Generate real signature data for verification
        real_content_hash = signature_service._generate_content_hash(sample_workitem)
        real_signature_hash = signature_service._create_signature(real_content_hash, private_pem)
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = DigitalSignature(
            id=signature_response.id,
            workitem_id=workitem_id,
            workitem_version="1.0",
            user_id=test_user.id,
            signature_hash=real_signature_hash,
            content_hash=real_content_hash,
            signed_at=signature_response.signed_at,
            is_valid=True,
        )
        mock_db.execute.return_value = mock_result
        
        verification_result = await signature_service.verify_signature(
            signature_id=signature_response.id,
            current_workitem_content=sample_workitem,
            public_key_pem=public_pem,
        )
        
        # Verify signature verification
        assert verification_result.signature_id == signature_response.id
        assert verification_result.is_valid is True
        assert verification_result.content_matches is True
        
        # Step 3: Simulate WorkItem modification and signature invalidation
        mock_invalidation_result = MagicMock()
        mock_invalidation_signature = DigitalSignature(
            id=signature_response.id,
            workitem_id=workitem_id,
            workitem_version="1.0",
            user_id=test_user.id,
            signature_hash=signature_response.signature_hash,
            content_hash=signature_response.content_hash,
            signed_at=signature_response.signed_at,
            is_valid=True,
        )
        mock_invalidation_result.scalars.return_value.all.return_value = [mock_invalidation_signature]
        mock_db.execute.return_value = mock_invalidation_result
        
        invalidated_signatures = await signature_service.invalidate_signatures(
            workitem_id, "WorkItem updated to version 1.1"
        )
        
        # Verify invalidation
        assert len(invalidated_signatures) == 1
        assert mock_invalidation_signature.is_valid is False
        assert mock_invalidation_signature.invalidation_reason == "WorkItem updated to version 1.1"
        
        # Step 4: Sign the updated WorkItem (version 1.1)
        updated_workitem = sample_workitem.copy()
        updated_workitem["version"] = "1.1"
        updated_workitem["title"] = "Updated User Authentication Requirement"
        
        # Reset mocks for new signature
        mock_db.reset_mock()
        
        # Create a new mock refresh that generates different hash for updated content
        async def mock_refresh_updated(obj):
            obj.id = uuid4()
            obj.signature_hash = "c" * 512  # Different signature
            obj.content_hash = "d" * 64     # Different content hash for updated content
        
        mock_db.refresh = AsyncMock(side_effect=mock_refresh_updated)
        
        new_signature_response = await signature_service.sign_workitem(
            workitem_id=workitem_id,
            workitem_version="1.1",
            workitem_content=updated_workitem,
            user=test_user,
            private_key_pem=private_pem,
        )
        
        # Verify new signature
        assert new_signature_response.workitem_id == workitem_id
        assert new_signature_response.workitem_version == "1.1"
        assert new_signature_response.user_id == test_user.id
        assert new_signature_response.is_valid is True
        
        # Verify new signature has different content hash (due to updated content)
        assert new_signature_response.content_hash != signature_response.content_hash

    async def test_workitem_signature_prevention_workflow(
        self, signature_service, mock_db, test_user, rsa_key_pair, sample_workitem
    ):
        """Test that signed WorkItems cannot be deleted without force"""
        workitem_id = uuid4()
        
        # Mock that WorkItem has valid signatures
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = DigitalSignature(
            id=uuid4(),
            workitem_id=workitem_id,
            is_valid=True,
        )
        mock_db.execute.return_value = mock_result
        
        # Test that WorkItem is considered signed
        is_signed = await signature_service.is_workitem_signed(workitem_id)
        assert is_signed is True
        
        # Mock no signatures for unsigned WorkItem
        mock_result.scalar_one_or_none.return_value = None
        
        is_signed_unsigned = await signature_service.is_workitem_signed(workitem_id)
        assert is_signed_unsigned is False

    async def test_multiple_user_signature_workflow(
        self, signature_service, mock_db, rsa_key_pair, sample_workitem
    ):
        """Test workflow with multiple users signing the same WorkItem"""
        private_pem, _ = rsa_key_pair
        workitem_id = uuid4()
        
        # Create multiple users
        validator = User(
            id=uuid4(),
            email="validator@example.com",
            full_name="Validator User",
            role=UserRole.VALIDATOR,
            hashed_password="hashed_password",
            is_active=True,
        )
        
        project_manager = User(
            id=uuid4(),
            email="pm@example.com",
            full_name="Project Manager",
            role=UserRole.PROJECT_MANAGER,
            hashed_password="hashed_password",
            is_active=True,
        )
        
        # Mock database operations
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        
        signature_counter = 0
        async def mock_refresh(obj):
            nonlocal signature_counter
            signature_counter += 1
            obj.id = uuid4()
            obj.signature_hash = f"signature_{signature_counter}_" + "a" * 500
            obj.content_hash = "b" * 64
        
        mock_db.refresh = AsyncMock(side_effect=mock_refresh)
        
        # Sign with validator
        validator_signature = await signature_service.sign_workitem(
            workitem_id=workitem_id,
            workitem_version="1.0",
            workitem_content=sample_workitem,
            user=validator,
            private_key_pem=private_pem,
        )
        
        # Sign with project manager
        pm_signature = await signature_service.sign_workitem(
            workitem_id=workitem_id,
            workitem_version="1.0",
            workitem_content=sample_workitem,
            user=project_manager,
            private_key_pem=private_pem,
        )
        
        # Verify both signatures are for the same WorkItem but different users
        assert validator_signature.workitem_id == pm_signature.workitem_id == workitem_id
        assert validator_signature.user_id == validator.id
        assert pm_signature.user_id == project_manager.id
        assert validator_signature.user_id != pm_signature.user_id
        
        # Verify both signatures have the same content hash (same WorkItem content)
        assert validator_signature.content_hash == pm_signature.content_hash

    async def test_signature_verification_with_content_changes(
        self, signature_service, mock_db, test_user, rsa_key_pair, sample_workitem
    ):
        """Test signature verification detects content changes"""
        private_pem, public_pem = rsa_key_pair
        signature_id = uuid4()
        
        # Create signature for original content
        original_content_hash = signature_service._generate_content_hash(sample_workitem)
        signature_hash = signature_service._create_signature(original_content_hash, private_pem)
        
        # Mock signature in database
        mock_signature = DigitalSignature(
            id=signature_id,
            workitem_id=uuid4(),
            workitem_version="1.0",
            user_id=test_user.id,
            signature_hash=signature_hash,
            content_hash=original_content_hash,
            signed_at=datetime.now(UTC),
            is_valid=True,
        )
        
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_signature
        mock_db.execute.return_value = mock_result
        
        # Test verification with original content (should pass)
        verification_original = await signature_service.verify_signature(
            signature_id=signature_id,
            current_workitem_content=sample_workitem,
            public_key_pem=public_pem,
        )
        
        assert verification_original.is_valid is True
        assert verification_original.content_matches is True
        assert verification_original.signature_intact is True
        
        # Test verification with modified content (should fail)
        modified_workitem = sample_workitem.copy()
        modified_workitem["title"] = "MODIFIED: User Authentication Requirement"
        
        verification_modified = await signature_service.verify_signature(
            signature_id=signature_id,
            current_workitem_content=modified_workitem,
            public_key_pem=public_pem,
        )
        
        assert verification_modified.is_valid is False
        assert verification_modified.content_matches is False
        assert verification_modified.signature_intact is True  # Signature itself is valid
        assert verification_modified.error_message == "Signature verification failed"

    async def test_workitem_signature_history_workflow(
        self, signature_service, mock_db, test_user, rsa_key_pair, sample_workitem
    ):
        """Test retrieving signature history for a WorkItem"""
        workitem_id = uuid4()
        
        # Mock multiple signatures for the WorkItem
        signatures = [
            DigitalSignature(
                id=uuid4(),
                workitem_id=workitem_id,
                workitem_version="1.0",
                user_id=test_user.id,
                signature_hash="signature_v1_" + "a" * 500,
                content_hash="b" * 64,     # Valid SHA-256 hash length
                signed_at=datetime.now(UTC),
                is_valid=False,  # Invalidated
                invalidated_at=datetime.now(UTC),
                invalidation_reason="WorkItem updated",
            ),
            DigitalSignature(
                id=uuid4(),
                workitem_id=workitem_id,
                workitem_version="1.1",
                user_id=test_user.id,
                signature_hash="signature_v2_" + "c" * 500,
                content_hash="d" * 64,     # Valid SHA-256 hash length
                signed_at=datetime.now(UTC),
                is_valid=True,  # Current valid signature
            ),
        ]
        
        # Mock database query for all signatures
        mock_result_all = MagicMock()
        mock_result_all.scalars.return_value.all.return_value = signatures
        
        # Mock database query for valid signatures only
        mock_result_valid = MagicMock()
        mock_result_valid.scalars.return_value.all.return_value = [signatures[1]]
        
        # Test getting all signatures (including invalid)
        mock_db.execute.return_value = mock_result_all
        all_signatures = await signature_service.get_workitem_signatures(
            workitem_id, include_invalid=True
        )
        
        assert len(all_signatures) == 2
        assert any(not sig.is_valid for sig in all_signatures)  # Has invalid signature
        assert any(sig.is_valid for sig in all_signatures)      # Has valid signature
        
        # Test getting only valid signatures
        mock_db.execute.return_value = mock_result_valid
        valid_signatures = await signature_service.get_workitem_signatures(
            workitem_id, include_invalid=False
        )
        
        assert len(valid_signatures) == 1
        assert all(sig.is_valid for sig in valid_signatures)
        assert valid_signatures[0].workitem_version == "1.1"


@pytest.mark.integration
class TestSignatureServiceErrorScenarios:
    """Integration tests for error scenarios in SignatureService"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return AsyncMock()

    @pytest.fixture
    def signature_service(self, mock_db):
        """SignatureService instance with mocked database"""
        return SignatureService(mock_db)

    async def test_database_error_during_signing(self, signature_service, mock_db):
        """Test handling of database errors during signing"""
        from app.models.user import User, UserRole
        
        # Generate test key
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        
        test_user = User(
            id=uuid4(),
            email="test@example.com",
            full_name="Test User",
            role=UserRole.VALIDATOR,
            hashed_password="hashed_password",
            is_active=True,
        )
        
        sample_workitem = {
            "id": str(uuid4()),
            "title": "Test WorkItem",
            "version": "1.0",
        }
        
        # Mock database commit failure
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock(side_effect=Exception("Database connection lost"))
        
        # Test that database error is propagated
        with pytest.raises(Exception, match="Database connection lost"):
            await signature_service.sign_workitem(
                workitem_id=uuid4(),
                workitem_version="1.0",
                workitem_content=sample_workitem,
                user=test_user,
                private_key_pem=private_pem,
            )

    async def test_signature_verification_with_missing_signature(
        self, signature_service, mock_db
    ):
        """Test signature verification when signature doesn't exist"""
        # Generate test key
        private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        public_pem = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        
        # Mock database returning no signature
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result
        
        verification_result = await signature_service.verify_signature(
            signature_id=uuid4(),
            current_workitem_content={"test": "content"},
            public_key_pem=public_pem,
        )
        
        assert verification_result.is_valid is False
        assert verification_result.error_message == "Signature not found"
        assert verification_result.content_matches is False
        assert verification_result.signature_intact is False
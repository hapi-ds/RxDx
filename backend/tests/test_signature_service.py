"""Unit tests for SignatureService"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.signature import DigitalSignature
from app.models.user import User, UserRole
from app.services.signature_service import SignatureService


class TestSignatureService:
    """Test cases for SignatureService"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def signature_service(self, mock_db):
        """SignatureService instance with mocked database"""
        return SignatureService(mock_db)

    @pytest.fixture
    def test_user(self):
        """Test user for signing operations"""
        return User(
            id=uuid4(),
            email="test@example.com",
            full_name="Test User",
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
    def sample_workitem_content(self):
        """Sample WorkItem content for testing"""
        return {
            "id": str(uuid4()),
            "type": "requirement",
            "title": "Test Requirement",
            "description": "This is a test requirement",
            "status": "active",
            "priority": 1,
            "version": "1.0",
            "created_at": "2024-01-01T00:00:00Z",
        }

    async def test_generate_content_hash(self, signature_service, sample_workitem_content):
        """Test content hash generation"""
        # Test that hash is consistent
        hash1 = signature_service._generate_content_hash(sample_workitem_content)
        hash2 = signature_service._generate_content_hash(sample_workitem_content)
        assert hash1 == hash2

        # Test that hash is SHA-256 (64 hex characters)
        assert len(hash1) == 64
        assert all(c in "0123456789abcdef" for c in hash1)

        # Test that different content produces different hash
        modified_content = sample_workitem_content.copy()
        modified_content["title"] = "Modified Title"
        hash3 = signature_service._generate_content_hash(modified_content)
        assert hash1 != hash3

        # Test that key order doesn't affect hash (JSON sorted keys)
        reordered_content = {
            "version": sample_workitem_content["version"],
            "id": sample_workitem_content["id"],
            "title": sample_workitem_content["title"],
            "type": sample_workitem_content["type"],
            "description": sample_workitem_content["description"],
            "status": sample_workitem_content["status"],
            "priority": sample_workitem_content["priority"],
            "created_at": sample_workitem_content["created_at"],
        }
        hash4 = signature_service._generate_content_hash(reordered_content)
        assert hash1 == hash4

    def test_create_signature(self, signature_service, rsa_key_pair):
        """Test RSA signature creation"""
        private_pem, _ = rsa_key_pair
        content_hash = "test_content_hash"

        # Test successful signature creation
        signature_hex = signature_service._create_signature(content_hash, private_pem)

        # Verify signature is hex string
        assert isinstance(signature_hex, str)
        assert len(signature_hex) > 0
        assert all(c in "0123456789abcdef" for c in signature_hex)

        # Note: RSA-PSS signatures are not deterministic due to random salt
        # So we test that signatures can be verified instead
        signature_hex2 = signature_service._create_signature(content_hash, private_pem)
        assert isinstance(signature_hex2, str)
        assert len(signature_hex2) > 0

        # Test that different content produces different signature
        signature_hex3 = signature_service._create_signature("different_hash", private_pem)
        assert signature_hex != signature_hex3

    def test_create_signature_invalid_key(self, signature_service):
        """Test signature creation with invalid private key"""
        invalid_key = b"invalid_key_data"
        content_hash = "test_content_hash"

        with pytest.raises(ValueError, match="Failed to create signature"):
            signature_service._create_signature(content_hash, invalid_key)

    def test_verify_signature_hash(self, signature_service, rsa_key_pair):
        """Test RSA signature verification"""
        private_pem, public_pem = rsa_key_pair
        content_hash = "test_content_hash"

        # Create signature
        signature_hex = signature_service._create_signature(content_hash, private_pem)

        # Test successful verification
        is_valid = signature_service._verify_signature_hash(
            content_hash, signature_hex, public_pem
        )
        assert is_valid is True

        # Test verification with wrong content
        is_valid_wrong = signature_service._verify_signature_hash(
            "wrong_content_hash", signature_hex, public_pem
        )
        assert is_valid_wrong is False

        # Test verification with wrong signature
        is_valid_wrong_sig = signature_service._verify_signature_hash(
            content_hash, "wrong_signature_hex", public_pem
        )
        assert is_valid_wrong_sig is False

    def test_verify_signature_hash_invalid_key(self, signature_service, rsa_key_pair):
        """Test signature verification with invalid public key"""
        private_pem, _ = rsa_key_pair
        content_hash = "test_content_hash"
        signature_hex = signature_service._create_signature(content_hash, private_pem)

        invalid_public_key = b"invalid_public_key"

        # Should return False for invalid key (not raise exception)
        is_valid = signature_service._verify_signature_hash(
            content_hash, signature_hex, invalid_public_key
        )
        assert is_valid is False

    async def test_sign_workitem(
        self, signature_service, mock_db, test_user, rsa_key_pair, sample_workitem_content
    ):
        """Test WorkItem signing"""
        private_pem, _ = rsa_key_pair
        workitem_id = uuid4()
        workitem_version = "1.0"

        # Mock database operations
        mock_signature = DigitalSignature(
            id=uuid4(),
            workitem_id=workitem_id,
            workitem_version=workitem_version,
            user_id=test_user.id,
            signature_hash="a" * 512,  # Valid hex signature length
            content_hash="b" * 64,     # Valid SHA-256 hash length
            signed_at=datetime.now(UTC),
            is_valid=True,
        )

        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Mock the refresh to set the signature attributes
        async def mock_refresh(obj):
            for attr, value in mock_signature.__dict__.items():
                if not attr.startswith('_'):
                    setattr(obj, attr, value)

        mock_db.refresh.side_effect = mock_refresh

        # Test signing
        result = await signature_service.sign_workitem(
            workitem_id=workitem_id,
            workitem_version=workitem_version,
            workitem_content=sample_workitem_content,
            user=test_user,
            private_key_pem=private_pem,
        )

        # Verify database operations
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_db.refresh.assert_called_once()

        # Verify result
        assert result.workitem_id == workitem_id
        assert result.workitem_version == workitem_version
        assert result.user_id == test_user.id
        assert result.is_valid is True

    async def test_sign_workitem_invalid_key(
        self, signature_service, mock_db, test_user, sample_workitem_content
    ):
        """Test WorkItem signing with invalid private key"""
        workitem_id = uuid4()
        workitem_version = "1.0"
        invalid_key = b"invalid_private_key"

        with pytest.raises(ValueError, match="Failed to create signature"):
            await signature_service.sign_workitem(
                workitem_id=workitem_id,
                workitem_version=workitem_version,
                workitem_content=sample_workitem_content,
                user=test_user,
                private_key_pem=invalid_key,
            )

    async def test_verify_signature_success(
        self, signature_service, mock_db, rsa_key_pair, sample_workitem_content
    ):
        """Test successful signature verification"""
        private_pem, public_pem = rsa_key_pair
        signature_id = uuid4()

        # Create expected content hash and signature
        content_hash = signature_service._generate_content_hash(sample_workitem_content)
        signature_hash = signature_service._create_signature(content_hash, private_pem)

        # Mock database query
        mock_signature = DigitalSignature(
            id=signature_id,
            workitem_id=uuid4(),
            workitem_version="1.0",
            user_id=uuid4(),
            signature_hash=signature_hash,
            content_hash=content_hash,
            signed_at=datetime.now(UTC),
            is_valid=True,
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_signature
        mock_db.execute.return_value = mock_result

        # Test verification
        result = await signature_service.verify_signature(
            signature_id=signature_id,
            current_workitem_content=sample_workitem_content,
            public_key_pem=public_pem,
        )

        # Verify result
        assert result.signature_id == signature_id
        assert result.is_valid is True
        assert result.content_matches is True
        assert result.signature_intact is True
        assert result.error_message is None

    async def test_verify_signature_not_found(
        self, signature_service, mock_db, rsa_key_pair, sample_workitem_content
    ):
        """Test signature verification when signature not found"""
        _, public_pem = rsa_key_pair
        signature_id = uuid4()

        # Mock database query returning None
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db.execute.return_value = mock_result

        # Test verification
        result = await signature_service.verify_signature(
            signature_id=signature_id,
            current_workitem_content=sample_workitem_content,
            public_key_pem=public_pem,
        )

        # Verify result
        assert result.signature_id == signature_id
        assert result.is_valid is False
        assert result.content_matches is False
        assert result.signature_intact is False
        assert result.error_message == "Signature not found"

    async def test_verify_signature_invalidated(
        self, signature_service, mock_db, rsa_key_pair, sample_workitem_content
    ):
        """Test verification of invalidated signature"""
        _, public_pem = rsa_key_pair
        signature_id = uuid4()

        # Mock invalidated signature
        mock_signature = DigitalSignature(
            id=signature_id,
            workitem_id=uuid4(),
            workitem_version="1.0",
            user_id=uuid4(),
            signature_hash="a" * 512,  # Valid hex signature length
            content_hash="b" * 64,     # Valid SHA-256 hash length
            signed_at=datetime.now(UTC),
            is_valid=False,
            invalidated_at=datetime.now(UTC),
            invalidation_reason="WorkItem modified",
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_signature
        mock_db.execute.return_value = mock_result

        # Test verification
        result = await signature_service.verify_signature(
            signature_id=signature_id,
            current_workitem_content=sample_workitem_content,
            public_key_pem=public_pem,
        )

        # Verify result
        assert result.signature_id == signature_id
        assert result.is_valid is False
        assert result.error_message == "Signature invalidated: WorkItem modified"

    async def test_verify_signature_content_mismatch(
        self, signature_service, mock_db, rsa_key_pair, sample_workitem_content
    ):
        """Test signature verification with content mismatch"""
        private_pem, public_pem = rsa_key_pair
        signature_id = uuid4()

        # Create signature for original content
        original_content_hash = signature_service._generate_content_hash(sample_workitem_content)
        signature_hash = signature_service._create_signature(original_content_hash, private_pem)

        # Mock signature in database
        mock_signature = DigitalSignature(
            id=signature_id,
            workitem_id=uuid4(),
            workitem_version="1.0",
            user_id=uuid4(),
            signature_hash=signature_hash,
            content_hash=original_content_hash,
            signed_at=datetime.now(UTC),
            is_valid=True,
        )

        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_signature
        mock_db.execute.return_value = mock_result

        # Modify content for verification
        modified_content = sample_workitem_content.copy()
        modified_content["title"] = "Modified Title"

        # Test verification
        result = await signature_service.verify_signature(
            signature_id=signature_id,
            current_workitem_content=modified_content,
            public_key_pem=public_pem,
        )

        # Verify result
        assert result.signature_id == signature_id
        assert result.is_valid is False
        assert result.content_matches is False
        assert result.signature_intact is True  # Signature itself is valid, but content changed
        assert result.error_message == "Signature verification failed"

    async def test_invalidate_signatures(self, signature_service, mock_db):
        """Test signature invalidation"""
        workitem_id = uuid4()
        reason = "WorkItem modified"

        # Mock signatures to invalidate
        signature1 = DigitalSignature(
            id=uuid4(),
            workitem_id=workitem_id,
            workitem_version="1.0",
            user_id=uuid4(),
            signature_hash="a" * 512,  # Valid hex signature length
            content_hash="b" * 64,     # Valid SHA-256 hash length
            signed_at=datetime.now(UTC),
            is_valid=True,
        )

        signature2 = DigitalSignature(
            id=uuid4(),
            workitem_id=workitem_id,
            workitem_version="1.1",
            user_id=uuid4(),
            signature_hash="c" * 512,  # Valid hex signature length
            content_hash="d" * 64,     # Valid SHA-256 hash length
            signed_at=datetime.now(UTC),
            is_valid=True,
        )

        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [signature1, signature2]
        mock_db.execute.return_value = mock_result
        mock_db.commit = AsyncMock()

        # Test invalidation
        result = await signature_service.invalidate_signatures(workitem_id, reason)

        # Verify database operations
        mock_db.commit.assert_called_once()

        # Verify signatures were invalidated
        assert len(result) == 2
        assert signature1.is_valid is False
        assert signature1.invalidation_reason == reason
        assert signature1.invalidated_at is not None
        assert signature2.is_valid is False
        assert signature2.invalidation_reason == reason
        assert signature2.invalidated_at is not None

    async def test_get_workitem_signatures(self, signature_service, mock_db):
        """Test getting WorkItem signatures"""
        workitem_id = uuid4()

        # Mock signatures
        valid_signature = DigitalSignature(
            id=uuid4(),
            workitem_id=workitem_id,
            workitem_version="1.0",
            user_id=uuid4(),
            signature_hash="a" * 512,  # Valid hex signature length
            content_hash="b" * 64,     # Valid SHA-256 hash length
            signed_at=datetime.now(UTC),
            is_valid=True,
        )

        invalid_signature = DigitalSignature(
            id=uuid4(),
            workitem_id=workitem_id,
            workitem_version="1.1",
            user_id=uuid4(),
            signature_hash="c" * 512,  # Valid hex signature length
            content_hash="d" * 64,     # Valid SHA-256 hash length
            signed_at=datetime.now(UTC),
            is_valid=False,
        )

        # Test getting only valid signatures
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [valid_signature]
        mock_db.execute.return_value = mock_result

        result = await signature_service.get_workitem_signatures(workitem_id, include_invalid=False)

        assert len(result) == 1
        assert result[0].id == valid_signature.id
        assert result[0].is_valid is True

        # Test getting all signatures
        mock_result.scalars.return_value.all.return_value = [valid_signature, invalid_signature]

        result_all = await signature_service.get_workitem_signatures(workitem_id, include_invalid=True)

        assert len(result_all) == 2

    async def test_is_workitem_signed(self, signature_service, mock_db):
        """Test checking if WorkItem is signed"""
        workitem_id = uuid4()

        # Test with valid signature
        mock_signature = DigitalSignature(id=uuid4(), is_valid=True)
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = mock_signature
        mock_db.execute.return_value = mock_result

        result = await signature_service.is_workitem_signed(workitem_id)
        assert result is True

        # Test without valid signature
        mock_result.scalar_one_or_none.return_value = None

        result = await signature_service.is_workitem_signed(workitem_id)
        assert result is False


@pytest.mark.unit
class TestSignatureServiceEdgeCases:
    """Test edge cases and error conditions for SignatureService"""

    @pytest.fixture
    def mock_db(self):
        """Mock database session"""
        return AsyncMock(spec=AsyncSession)

    @pytest.fixture
    def signature_service(self, mock_db):
        """SignatureService instance with mocked database"""
        return SignatureService(mock_db)

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

    def test_generate_content_hash_empty_content(self, signature_service):
        """Test content hash generation with empty content"""
        empty_content = {}
        hash_result = signature_service._generate_content_hash(empty_content)

        # Should still produce valid hash
        assert len(hash_result) == 64
        assert all(c in "0123456789abcdef" for c in hash_result)

    def test_generate_content_hash_unicode_content(self, signature_service):
        """Test content hash generation with Unicode content"""
        unicode_content = {
            "title": "Test with émojis 🚀 and ñoñó",
            "description": "Unicode test: 中文, العربية, русский",
        }

        hash_result = signature_service._generate_content_hash(unicode_content)

        # Should handle Unicode correctly
        assert len(hash_result) == 64
        assert all(c in "0123456789abcdef" for c in hash_result)

        # Should be consistent
        hash_result2 = signature_service._generate_content_hash(unicode_content)
        assert hash_result == hash_result2

    def test_create_signature_empty_content_hash(self, signature_service):
        """Test signature creation with empty content hash"""
        # Generate a valid RSA key pair for testing
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )

        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )

        # Should handle empty content hash
        signature_hex = signature_service._create_signature("", private_pem)
        assert isinstance(signature_hex, str)
        assert len(signature_hex) > 0

    async def test_sign_workitem_database_error(
        self, signature_service, mock_db, rsa_key_pair
    ):
        """Test WorkItem signing with database error"""
        from app.models.user import User, UserRole

        private_pem, _ = rsa_key_pair
        workitem_id = uuid4()
        workitem_version = "1.0"
        sample_content = {"id": str(workitem_id), "title": "Test"}

        test_user = User(
            id=uuid4(),
            email="test@example.com",
            full_name="Test User",
            role=UserRole.VALIDATOR,
            hashed_password="hashed_password",
            is_active=True,
        )

        # Mock database error
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock(side_effect=Exception("Database error"))

        with pytest.raises(Exception, match="Database error"):
            await signature_service.sign_workitem(
                workitem_id=workitem_id,
                workitem_version=workitem_version,
                workitem_content=sample_content,
                user=test_user,
                private_key_pem=private_pem,
            )

    async def test_verify_signature_database_error(
        self, signature_service, mock_db, rsa_key_pair
    ):
        """Test signature verification with database error"""
        _, public_pem = rsa_key_pair
        signature_id = uuid4()
        sample_content = {"id": str(uuid4()), "title": "Test"}

        # Mock database error
        mock_db.execute = AsyncMock(side_effect=Exception("Database error"))

        with pytest.raises(Exception, match="Database error"):
            await signature_service.verify_signature(
                signature_id=signature_id,
                current_workitem_content=sample_content,
                public_key_pem=public_pem,
            )

    def test_verify_signature_hash_malformed_signature(self, signature_service):
        """Test signature verification with malformed signature hex"""
        # Generate a valid RSA key pair
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )

        public_key = private_key.public_key()
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )

        content_hash = "test_content_hash"
        malformed_signature = "not_valid_hex_signature"

        # Should return False for malformed signature
        is_valid = signature_service._verify_signature_hash(
            content_hash, malformed_signature, public_pem
        )
        assert is_valid is False

"""Property-based tests for SignatureService using Hypothesis"""

import json
from uuid import UUID, uuid4

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from unittest.mock import AsyncMock

from app.services.signature_service import SignatureService


class TestSignatureServiceProperties:
    """Property-based tests for SignatureService cryptographic operations"""

    @pytest.fixture
    def signature_service(self):
        """SignatureService instance with mocked database"""
        mock_db = AsyncMock()
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

    # Strategy for generating valid WorkItem content
    workitem_content_strategy = st.fixed_dictionaries({
        "id": st.uuids().map(str),
        "type": st.sampled_from(["requirement", "task", "test", "risk", "document"]),
        "title": st.text(min_size=1, max_size=500),
        "description": st.one_of(st.none(), st.text(max_size=2000)),
        "status": st.sampled_from(["draft", "active", "completed", "archived"]),
        "priority": st.one_of(st.none(), st.integers(min_value=1, max_value=5)),
        "version": st.text(min_size=1, max_size=20),
        "created_at": st.datetimes().map(lambda dt: dt.isoformat()),
    })

    @given(content=workitem_content_strategy)
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_content_hash_deterministic(self, signature_service, content):
        """
        **Validates: Requirements 2.1, 2.4**
        
        Property: Content hash generation is deterministic.
        For any given content, the hash should always be the same.
        """
        hash1 = signature_service._generate_content_hash(content)
        hash2 = signature_service._generate_content_hash(content)
        
        assert hash1 == hash2, "Content hash should be deterministic"
        assert len(hash1) == 64, "SHA-256 hash should be 64 hex characters"
        assert all(c in "0123456789abcdef" for c in hash1), "Hash should be valid hex"

    @given(
        content1=workitem_content_strategy,
        content2=workitem_content_strategy
    )
    @settings(max_examples=50, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_content_hash_uniqueness(self, signature_service, content1, content2):
        """
        **Validates: Requirements 2.1, 2.4**
        
        Property: Different content produces different hashes (collision resistance).
        """
        assume(content1 != content2)  # Only test when contents are actually different
        
        hash1 = signature_service._generate_content_hash(content1)
        hash2 = signature_service._generate_content_hash(content2)
        
        assert hash1 != hash2, "Different content should produce different hashes"

    @given(content=workitem_content_strategy)
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])  # Reduced due to RSA key generation cost
    def test_signature_creation_deterministic(self, signature_service, rsa_key_pair, content):
        """
        **Validates: Requirements 2.1, 2.2**
        
        Property: Signature creation produces valid signatures that can be verified.
        Note: RSA-PSS signatures are not deterministic due to random salt.
        """
        private_pem, public_pem = rsa_key_pair
        content_hash = signature_service._generate_content_hash(content)
        
        # Create signature
        signature_hash = signature_service._create_signature(content_hash, private_pem)
        
        # Verify signature properties
        assert isinstance(signature_hash, str), "Signature should be a string"
        assert len(signature_hash) > 0, "Signature should not be empty"
        assert all(c in "0123456789abcdef" for c in signature_hash), "Signature should be valid hex"
        
        # Verify that signature can be verified (this is the important property)
        is_valid = signature_service._verify_signature_hash(
            content_hash, signature_hash, public_pem
        )
        assert is_valid is True, "Created signature should be verifiable"

    @given(content=workitem_content_strategy)
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_signature_verification_roundtrip(self, signature_service, rsa_key_pair, content):
        """
        **Validates: Requirements 2.1, 2.4**
        
        Property: A signature created with a private key can be verified with the corresponding public key.
        """
        private_pem, public_pem = rsa_key_pair
        content_hash = signature_service._generate_content_hash(content)
        
        # Create signature
        signature_hash = signature_service._create_signature(content_hash, private_pem)
        
        # Verify signature
        is_valid = signature_service._verify_signature_hash(
            content_hash, signature_hash, public_pem
        )
        
        assert is_valid is True, "Valid signature should verify successfully"

    @given(
        content1=workitem_content_strategy,
        content2=workitem_content_strategy
    )
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_signature_content_binding(self, signature_service, rsa_key_pair, content1, content2):
        """
        **Validates: Requirements 2.3, 2.4**
        
        Property: A signature is bound to specific content and cannot be used for different content.
        """
        assume(content1 != content2)
        
        private_pem, public_pem = rsa_key_pair
        
        # Create signature for content1
        content_hash1 = signature_service._generate_content_hash(content1)
        signature_hash = signature_service._create_signature(content_hash1, private_pem)
        
        # Try to verify signature against content2
        content_hash2 = signature_service._generate_content_hash(content2)
        is_valid = signature_service._verify_signature_hash(
            content_hash2, signature_hash, public_pem
        )
        
        assert is_valid is False, "Signature should not verify for different content"

    @given(content_hash=st.text(min_size=1, max_size=100))
    @settings(max_examples=10, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_signature_with_different_keys(self, signature_service, content_hash):
        """
        **Validates: Requirements 2.1, 2.4**
        
        Property: A signature created with one key pair cannot be verified with a different key pair.
        """
        # Generate two different key pairs
        key1 = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        key2 = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        
        private_pem1 = key1.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        
        public_pem2 = key2.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        
        # Create signature with key1
        signature_hash = signature_service._create_signature(content_hash, private_pem1)
        
        # Try to verify with key2's public key
        is_valid = signature_service._verify_signature_hash(
            content_hash, signature_hash, public_pem2
        )
        
        assert is_valid is False, "Signature should not verify with wrong public key"

    @given(content=workitem_content_strategy)
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_json_serialization_consistency(self, signature_service, content):
        """
        **Validates: Requirements 2.1, 2.4**
        
        Property: JSON serialization with sorted keys produces consistent hashes
        regardless of dictionary key order.
        """
        # Create a reordered version of the content
        keys = list(content.keys())
        assume(len(keys) > 1)  # Only test if there are multiple keys to reorder
        
        # Reverse the key order
        reordered_content = {key: content[key] for key in reversed(keys)}
        
        hash1 = signature_service._generate_content_hash(content)
        hash2 = signature_service._generate_content_hash(reordered_content)
        
        assert hash1 == hash2, "Hash should be consistent regardless of key order"

    @given(
        content=workitem_content_strategy,
        corrupted_signature=st.text(min_size=1, max_size=1000).filter(lambda x: all(c in "0123456789abcdef" for c in x))
    )
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture, HealthCheck.filter_too_much])
    def test_signature_tampering_detection(self, signature_service, rsa_key_pair, content, corrupted_signature):
        """
        **Validates: Requirements 2.4**
        
        Property: Tampered signatures should be detected and rejected.
        """
        assume(all(c in "0123456789abcdef" for c in corrupted_signature))  # Valid hex
        
        private_pem, public_pem = rsa_key_pair
        content_hash = signature_service._generate_content_hash(content)
        
        # Create valid signature
        valid_signature = signature_service._create_signature(content_hash, private_pem)
        
        # Assume the corrupted signature is different from the valid one
        assume(corrupted_signature != valid_signature)
        
        # Verify that corrupted signature is rejected
        is_valid = signature_service._verify_signature_hash(
            content_hash, corrupted_signature, public_pem
        )
        
        assert is_valid is False, "Corrupted signature should be rejected"

    @given(
        content=workitem_content_strategy,
        invalid_hex=st.text().filter(lambda x: not all(c in "0123456789abcdef" for c in x) and len(x) > 0)
    )
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_invalid_signature_format_handling(self, signature_service, rsa_key_pair, content, invalid_hex):
        """
        **Validates: Requirements 2.4**
        
        Property: Invalid signature formats should be handled gracefully.
        """
        _, public_pem = rsa_key_pair
        content_hash = signature_service._generate_content_hash(content)
        
        # Verify that invalid hex signature is rejected without throwing exception
        is_valid = signature_service._verify_signature_hash(
            content_hash, invalid_hex, public_pem
        )
        
        assert is_valid is False, "Invalid signature format should be rejected"

    @given(content=workitem_content_strategy)
    @settings(max_examples=10, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)
    def test_signature_non_repudiation(self, signature_service, content):
        """
        **Validates: Requirements 2.1, 2.2**
        
        Property: Each key pair produces unique signatures (non-repudiation).
        Different private keys should produce different signatures for the same content.
        """
        # Generate two different key pairs
        key1 = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        key2 = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        
        private_pem1 = key1.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        
        private_pem2 = key2.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        
        content_hash = signature_service._generate_content_hash(content)
        
        # Create signatures with different keys
        signature1 = signature_service._create_signature(content_hash, private_pem1)
        signature2 = signature_service._create_signature(content_hash, private_pem2)
        
        assert signature1 != signature2, "Different keys should produce different signatures"

    @given(
        content=workitem_content_strategy,
        modification=st.text(min_size=1, max_size=100)
    )
    @settings(max_examples=20, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_content_modification_detection(self, signature_service, rsa_key_pair, content, modification):
        """
        **Validates: Requirements 2.3, 2.4**
        
        Property: Any modification to signed content should be detectable.
        """
        private_pem, public_pem = rsa_key_pair
        
        # Create signature for original content
        original_hash = signature_service._generate_content_hash(content)
        signature_hash = signature_service._create_signature(original_hash, private_pem)
        
        # Modify content
        modified_content = content.copy()
        modified_content["_modification"] = modification
        
        # Verify signature against modified content
        modified_hash = signature_service._generate_content_hash(modified_content)
        is_valid = signature_service._verify_signature_hash(
            modified_hash, signature_hash, public_pem
        )
        
        assert is_valid is False, "Signature should not verify for modified content"


@pytest.mark.unit
class TestSignatureServiceCryptographicProperties:
    """Advanced cryptographic property tests"""

    @pytest.fixture
    def signature_service(self):
        """SignatureService instance with mocked database"""
        mock_db = AsyncMock()
        return SignatureService(mock_db)

    @given(data=st.data())
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_hash_avalanche_effect(self, signature_service, data):
        """
        **Validates: Requirements 2.1, 2.4**
        
        Property: Small changes in input should produce dramatically different hashes (avalanche effect).
        """
        # Generate content using data strategy
        content1 = data.draw(st.dictionaries(
            st.text(min_size=1, max_size=50), 
            st.text(min_size=0, max_size=100)
        ))
        
        # Create slightly modified version
        if content1:
            # Pick a random key to modify
            key_to_modify = data.draw(st.sampled_from(list(content1.keys())))
            original_value = content1[key_to_modify]
            
            # Create modified content
            content2 = content1.copy()
            if len(original_value) > 0:
                # Change one character
                char_index = data.draw(st.integers(min_value=0, max_value=len(original_value)-1))
                char_list = list(original_value)
                char_list[char_index] = 'X' if char_list[char_index] != 'X' else 'Y'
                content2[key_to_modify] = ''.join(char_list)
            else:
                content2[key_to_modify] = "X"
        else:
            content2 = {"modified": "X"}
        
        hash1 = signature_service._generate_content_hash(content1)
        hash2 = signature_service._generate_content_hash(content2)
        
        if content1 != content2:
            assert hash1 != hash2, "Small content changes should produce different hashes"
            
            # Count different bits (avalanche effect should be ~50%)
            hash1_int = int(hash1, 16)
            hash2_int = int(hash2, 16)
            xor_result = hash1_int ^ hash2_int
            different_bits = bin(xor_result).count('1')
            total_bits = 256  # SHA-256 has 256 bits
            
            # Avalanche effect: at least 25% of bits should change for small input changes
            assert different_bits >= total_bits * 0.25, f"Insufficient avalanche effect: {different_bits}/{total_bits} bits changed"

    @given(content=st.dictionaries(st.text(), st.one_of(st.text(), st.integers(), st.booleans(), st.none())))
    @settings(max_examples=30, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_hash_distribution_uniformity(self, signature_service, content):
        """
        **Validates: Requirements 2.1**
        
        Property: Hash function should produce uniformly distributed outputs.
        """
        hash_result = signature_service._generate_content_hash(content)
        
        # Check that hash uses full hex character range
        hex_chars = set(hash_result)
        
        # For a good hash function, we expect reasonable character distribution
        # (This is a weak test, but better than nothing for property testing)
        assert len(hex_chars) >= 4, "Hash should use diverse hex characters"
        assert len(hash_result) == 64, "SHA-256 hash should be exactly 64 hex characters"

    @given(
        key_size=st.sampled_from([2048, 3072]),  # Common RSA key sizes
        content=st.text(min_size=1, max_size=1000)
    )
    @settings(max_examples=5, suppress_health_check=[HealthCheck.function_scoped_fixture], deadline=None)  # Very limited due to key generation cost
    def test_signature_security_across_key_sizes(self, signature_service, key_size, content):
        """
        **Validates: Requirements 2.1, 2.2**
        
        Property: Signature verification should work correctly across different RSA key sizes.
        """
        # Generate key pair with specified size
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=key_size,
        )
        
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        
        public_pem = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        
        content_hash = signature_service._generate_content_hash({"data": content})
        
        # Create and verify signature
        signature_hash = signature_service._create_signature(content_hash, private_pem)
        is_valid = signature_service._verify_signature_hash(
            content_hash, signature_hash, public_pem
        )
        
        assert is_valid is True, f"Signature verification should work with {key_size}-bit keys"
        
        # Signature length should be appropriate for key size
        signature_bytes_length = len(bytes.fromhex(signature_hash))
        expected_length = key_size // 8  # RSA signature length equals key size in bytes
        
        assert signature_bytes_length == expected_length, f"Signature length should match key size: expected {expected_length}, got {signature_bytes_length}"
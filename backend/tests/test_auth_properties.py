"""Property-based tests for authentication using Hypothesis"""

from hypothesis import given, settings
from hypothesis import strategies as st

from app.core.security import get_password_hash, verify_password

# Strategy for generating valid passwords
# Argon2id has no hard length limit like bcrypt, but we keep reasonable bounds
password_strategy = st.text(
    alphabet=st.characters(
        whitelist_categories=("Lu", "Ll", "Nd"),  # Uppercase, lowercase, digits
        min_codepoint=33,
        max_codepoint=126,
    ),
    min_size=8,
    max_size=128,  # Reasonable maximum for testing
)


class TestPasswordHashingProperties:
    """Property-based tests for password hashing"""

    @settings(deadline=1000)  # Argon2id is slower but more secure
    @given(password=password_strategy)
    def test_password_hash_is_deterministic_verification(self, password: str):
        """
        Property: A password should always verify against its own hash.
        
        For any valid password, hashing it and then verifying the original
        password against the hash should always succeed.
        """
        hashed = get_password_hash(password)
        assert verify_password(password, hashed)

    @settings(deadline=1000)
    @given(password=password_strategy)
    def test_password_hash_is_different_from_plaintext(self, password: str):
        """
        Property: A hashed password should never equal the plaintext password.
        
        This ensures that passwords are actually being hashed and not stored
        in plaintext.
        """
        hashed = get_password_hash(password)
        assert hashed != password

    @settings(deadline=1000)
    @given(password=password_strategy)
    def test_password_hash_is_non_empty(self, password: str):
        """
        Property: A password hash should never be empty.
        
        For any valid password, the hash should produce a non-empty string.
        """
        hashed = get_password_hash(password)
        assert len(hashed) > 0
        assert hashed.strip() != ""

    @settings(deadline=1000)
    @given(password=password_strategy)
    def test_password_hash_uses_salt(self, password: str):
        """
        Property: Hashing the same password twice should produce different hashes.
        
        This verifies that the hashing algorithm uses a salt, which is critical
        for security (prevents rainbow table attacks).
        """
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        # Hashes should be different due to salt
        assert hash1 != hash2

        # But both should verify the original password
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)

    @settings(deadline=1000)
    @given(
        password=password_strategy,
        wrong_password=password_strategy,
    )
    def test_wrong_password_does_not_verify(self, password: str, wrong_password: str):
        """
        Property: A different password should not verify against a hash.
        
        For any two different passwords, the hash of one should not verify
        against the other.
        """
        # Skip if passwords happen to be the same
        if password == wrong_password:
            return

        hashed = get_password_hash(password)
        assert not verify_password(wrong_password, hashed)

    @settings(deadline=1000)
    @given(password=password_strategy)
    def test_password_hash_length_consistency(self, password: str):
        """
        Property: Password hashes should have consistent format.
        
        Argon2id hashes have a specific format starting with $argon2id$.
        """
        hashed = get_password_hash(password)

        # Argon2id hashes start with $argon2id$ or $argon2i$
        assert hashed.startswith("$argon2")

    @settings(deadline=1000)
    @given(
        password1=password_strategy,
        password2=password_strategy,
    )
    def test_different_passwords_produce_different_hashes(
        self, password1: str, password2: str
    ):
        """
        Property: Different passwords should produce different hashes.
        
        While technically possible for different inputs to produce the same
        hash (collision), it should be astronomically unlikely with Argon2id.
        """
        # Skip if passwords are the same
        if password1 == password2:
            return

        hash1 = get_password_hash(password1)
        hash2 = get_password_hash(password2)

        # Different passwords should produce different hashes
        assert hash1 != hash2

    @settings(deadline=1000)
    @given(password=password_strategy)
    def test_hash_verification_is_case_sensitive(self, password: str):
        """
        Property: Password verification should be case-sensitive.
        
        A password with different casing should not verify against the hash.
        """
        # Skip if password is all same case or has no letters
        if password.lower() == password or password.upper() == password:
            return

        hashed = get_password_hash(password)

        # Original password should verify
        assert verify_password(password, hashed)

        # Different case should not verify
        if password != password.lower():
            assert not verify_password(password.lower(), hashed)
        if password != password.upper():
            assert not verify_password(password.upper(), hashed)


class TestPasswordHashingEdgeCases:
    """Test edge cases for password hashing"""

    def test_empty_string_password(self):
        """Test that empty string can be hashed (though not recommended)"""
        password = ""
        hashed = get_password_hash(password)
        assert verify_password(password, hashed)

    def test_very_long_password(self):
        """Test hashing very long passwords (Argon2id has no hard limit)"""
        password = "A" * 1000
        hashed = get_password_hash(password)
        assert verify_password(password, hashed)

    def test_special_characters_password(self):
        """Test passwords with special characters"""
        password = "P@ssw0rd!#$%^&*()"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed)

    def test_unicode_password(self):
        """Test passwords with unicode characters"""
        password = "Pässwörd123"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed)

    def test_whitespace_password(self):
        """Test passwords with whitespace"""
        password = "Pass word 123"
        hashed = get_password_hash(password)
        assert verify_password(password, hashed)

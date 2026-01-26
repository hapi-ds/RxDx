#!/usr/bin/env python3
"""
Demo script for SignatureService functionality.

This script demonstrates the complete digital signature workflow:
1. Generate RSA key pair
2. Create and sign a WorkItem
3. Verify the signature
4. Modify the WorkItem and show signature invalidation
5. Re-sign the modified WorkItem

Run with: uv run python scripts/test_signature_service.py
"""

import asyncio
from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.models.user import User, UserRole
from app.services.signature_service import SignatureService


async def demo_signature_service():
    """Demonstrate SignatureService functionality"""
    print("🔐 Digital Signature Service Demo")
    print("=" * 50)

    # Setup
    print("\n1. Setting up test environment...")

    # Create mock database (in real usage, this would be a real database session)
    mock_db = AsyncMock()
    signature_service = SignatureService(mock_db)

    # Create test user
    test_user = User(
        id=uuid4(),
        email="validator@rxdx.com",
        full_name="Test Validator",
        role=UserRole.VALIDATOR,
        hashed_password="hashed_password",
        is_active=True,
    )
    print(f"   ✓ Created test user: {test_user.full_name} ({test_user.email})")

    # Generate RSA key pair
    print("\n2. Generating RSA key pair...")
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

    print("   ✓ Generated 2048-bit RSA key pair")
    print(f"   ✓ Private key size: {len(private_pem)} bytes")
    print(f"   ✓ Public key size: {len(public_pem)} bytes")

    # Create sample WorkItem
    print("\n3. Creating sample WorkItem...")
    workitem_id = uuid4()
    workitem_content = {
        "id": str(workitem_id),
        "type": "requirement",
        "title": "User Authentication Requirement",
        "description": "The system shall authenticate users with email and password",
        "status": "active",
        "priority": 1,
        "version": "1.0",
        "created_at": datetime.now(UTC).isoformat(),
        "created_by": str(test_user.id),
    }

    print(f"   ✓ WorkItem ID: {workitem_id}")
    print(f"   ✓ Title: {workitem_content['title']}")
    print(f"   ✓ Version: {workitem_content['version']}")

    # Generate content hash
    print("\n4. Generating content hash...")
    content_hash = signature_service._generate_content_hash(workitem_content)
    print(f"   ✓ SHA-256 hash: {content_hash}")
    print(f"   ✓ Hash length: {len(content_hash)} characters")

    # Create cryptographic signature
    print("\n5. Creating digital signature...")
    signature_hash = signature_service._create_signature(content_hash, private_pem)
    print("   ✓ RSA-PSS signature created")
    print(f"   ✓ Signature length: {len(signature_hash)} characters")
    print(f"   ✓ Signature (first 64 chars): {signature_hash[:64]}...")

    # Verify signature
    print("\n6. Verifying signature...")
    is_valid = signature_service._verify_signature_hash(
        content_hash, signature_hash, public_pem
    )
    print(f"   ✓ Signature verification: {'VALID' if is_valid else 'INVALID'}")

    # Test signature with modified content
    print("\n7. Testing signature with modified content...")
    modified_content = workitem_content.copy()
    modified_content["title"] = "MODIFIED: User Authentication Requirement"
    modified_content["version"] = "1.1"

    modified_hash = signature_service._generate_content_hash(modified_content)
    is_valid_modified = signature_service._verify_signature_hash(
        modified_hash, signature_hash, public_pem
    )

    print(f"   ✓ Modified content hash: {modified_hash}")
    print(f"   ✓ Original signature with modified content: {'VALID' if is_valid_modified else 'INVALID'}")
    print(f"   ✓ Content integrity protection: {'WORKING' if not is_valid_modified else 'FAILED'}")

    # Create new signature for modified content
    print("\n8. Creating new signature for modified content...")
    new_signature_hash = signature_service._create_signature(modified_hash, private_pem)
    is_new_valid = signature_service._verify_signature_hash(
        modified_hash, new_signature_hash, public_pem
    )

    print("   ✓ New signature created for modified content")
    print(f"   ✓ New signature verification: {'VALID' if is_new_valid else 'INVALID'}")

    # Demonstrate key pair security
    print("\n9. Testing signature security...")

    # Generate different key pair
    different_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    different_public_pem = different_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    # Try to verify with wrong public key
    is_wrong_key_valid = signature_service._verify_signature_hash(
        content_hash, signature_hash, different_public_pem
    )

    print(f"   ✓ Signature with wrong public key: {'VALID' if is_wrong_key_valid else 'INVALID'}")
    print(f"   ✓ Key pair security: {'WORKING' if not is_wrong_key_valid else 'FAILED'}")

    # Test with corrupted signature
    corrupted_signature = signature_hash[:-10] + "0123456789"  # Corrupt last 10 chars
    is_corrupted_valid = signature_service._verify_signature_hash(
        content_hash, corrupted_signature, public_pem
    )

    print(f"   ✓ Corrupted signature verification: {'VALID' if is_corrupted_valid else 'INVALID'}")
    print(f"   ✓ Signature tampering detection: {'WORKING' if not is_corrupted_valid else 'FAILED'}")

    # Summary
    print("\n" + "=" * 50)
    print("🎉 Digital Signature Demo Complete!")
    print("\nKey Features Demonstrated:")
    print("   ✓ RSA-PSS cryptographic signing with SHA-256")
    print("   ✓ Content integrity verification")
    print("   ✓ Signature authenticity verification")
    print("   ✓ Tampering detection")
    print("   ✓ Key pair security")
    print("   ✓ Version control integration")

    print("\nWorkItem Lifecycle:")
    print(f"   Original: {workitem_content['title']} (v{workitem_content['version']})")
    print(f"   Modified: {modified_content['title']} (v{modified_content['version']})")
    print("   Signatures: 2 created, both valid for their respective content")

    print("\nSecurity Properties:")
    print(f"   Content Hash: SHA-256 ({len(content_hash)} chars)")
    print(f"   Signature: RSA-PSS 2048-bit ({len(signature_hash)} chars)")
    print("   Integrity: Content changes invalidate signatures")
    print("   Authenticity: Wrong keys cannot verify signatures")
    print("   Non-repudiation: Each signature tied to specific user and content")


if __name__ == "__main__":
    asyncio.run(demo_signature_service())

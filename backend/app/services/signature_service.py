"""Digital signature service for cryptographic document signing and verification"""

import hashlib
import json
from datetime import UTC, datetime
from uuid import UUID

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.signature import DigitalSignature
from app.models.user import User
from app.schemas.signature import (
    DigitalSignatureCreate,
    DigitalSignatureResponse,
    SignatureVerificationResponse,
)


class SignatureService:
    """
    Service for managing digital signatures with RSA cryptographic signing.

    This service provides:
    - RSA cryptographic signing of WorkItems
    - SHA-256 content hash generation for integrity verification
    - Signature verification and validation
    - Signature invalidation when WorkItems are modified
    - Prevention of signed WorkItem deletion

    The service uses RSA-PSS with SHA-256 for cryptographic signatures,
    following industry best practices for digital signatures.
    """

    def __init__(self, db: AsyncSession):
        """
        Initialize the signature service.

        Args:
            db: Database session for signature operations
        """
        self.db = db

    async def sign_workitem(
        self,
        workitem_id: UUID,
        workitem_version: str,
        workitem_content: dict,
        user: User,
        private_key_pem: bytes,
    ) -> DigitalSignatureResponse:
        """
        Create a cryptographic signature for a WorkItem.

        This method:
        1. Generates a SHA-256 hash of the WorkItem content
        2. Creates an RSA-PSS signature of the content hash
        3. Stores the signature in the database
        4. Returns the signature details

        Args:
            workitem_id: UUID of the WorkItem being signed
            workitem_version: Version of the WorkItem (e.g., "1.2")
            workitem_content: Complete WorkItem data as dictionary
            user: User creating the signature
            private_key_pem: RSA private key in PEM format

        Returns:
            DigitalSignatureResponse with signature details

        Raises:
            ValueError: If private key is invalid or signing fails
        """
        # Generate content hash (SHA-256)
        content_hash = self._generate_content_hash(workitem_content)

        # Create cryptographic signature
        signature_hash = self._create_signature(content_hash, private_key_pem)

        # Create signature record
        signature_data = DigitalSignatureCreate(
            workitem_id=workitem_id,
            workitem_version=workitem_version,
            user_id=user.id,
            signature_hash=signature_hash,
            content_hash=content_hash,
        )

        signature = DigitalSignature(
            workitem_id=signature_data.workitem_id,
            workitem_version=signature_data.workitem_version,
            user_id=signature_data.user_id,
            signature_hash=signature_data.signature_hash,
            content_hash=signature_data.content_hash,
            signed_at=datetime.now(UTC),
            is_valid=True,
        )

        self.db.add(signature)
        await self.db.commit()
        await self.db.refresh(signature)

        return DigitalSignatureResponse.model_validate(signature)

    async def verify_signature(
        self,
        signature_id: UUID,
        current_workitem_content: dict,
        public_key_pem: bytes,
    ) -> SignatureVerificationResponse:
        """
        Verify the integrity and validity of a digital signature.

        This method:
        1. Retrieves the signature from the database
        2. Generates a hash of the current WorkItem content
        3. Compares it with the stored content hash
        4. Verifies the cryptographic signature using the public key

        Args:
            signature_id: UUID of the signature to verify
            current_workitem_content: Current WorkItem content for comparison
            public_key_pem: RSA public key in PEM format

        Returns:
            SignatureVerificationResponse with verification results
        """
        # Get signature from database
        result = await self.db.execute(
            select(DigitalSignature).where(DigitalSignature.id == signature_id)
        )
        signature = result.scalar_one_or_none()

        if not signature:
            return SignatureVerificationResponse(
                signature_id=signature_id,
                is_valid=False,
                verification_timestamp=datetime.now(UTC),
                content_matches=False,
                signature_intact=False,
                error_message="Signature not found",
            )

        # Check if signature is marked as valid
        if not signature.is_valid:
            return SignatureVerificationResponse(
                signature_id=signature_id,
                is_valid=False,
                verification_timestamp=datetime.now(UTC),
                content_matches=False,
                signature_intact=False,
                error_message=f"Signature invalidated: {signature.invalidation_reason}",
            )

        # Generate current content hash
        current_content_hash = self._generate_content_hash(current_workitem_content)
        content_matches = current_content_hash == signature.content_hash

        # Verify cryptographic signature
        signature_intact = self._verify_signature_hash(
            signature.content_hash, signature.signature_hash, public_key_pem
        )

        is_valid = content_matches and signature_intact and signature.is_valid

        return SignatureVerificationResponse(
            signature_id=signature_id,
            is_valid=is_valid,
            verification_timestamp=datetime.now(UTC),
            content_matches=content_matches,
            signature_intact=signature_intact,
            error_message=None if is_valid else "Signature verification failed",
        )

    async def invalidate_signatures(
        self, workitem_id: UUID, reason: str
    ) -> list[DigitalSignatureResponse]:
        """
        Invalidate all signatures for a WorkItem when it is modified.

        This method is called whenever a WorkItem is updated to ensure
        that existing signatures are marked as invalid since the content
        has changed.

        Args:
            workitem_id: UUID of the WorkItem whose signatures should be invalidated
            reason: Reason for invalidation (e.g., "WorkItem modified")

        Returns:
            List of invalidated signatures
        """
        # Get all valid signatures for the WorkItem
        result = await self.db.execute(
            select(DigitalSignature).where(
                DigitalSignature.workitem_id == workitem_id,
                DigitalSignature.is_valid == True,
            )
        )
        signatures = result.scalars().all()

        invalidated_signatures = []

        for signature in signatures:
            signature.is_valid = False
            signature.invalidated_at = datetime.now(UTC)
            signature.invalidation_reason = reason

            invalidated_signatures.append(
                DigitalSignatureResponse.model_validate(signature)
            )

        await self.db.commit()

        return invalidated_signatures

    async def get_workitem_signatures(
        self, workitem_id: UUID, include_invalid: bool = False
    ) -> list[DigitalSignatureResponse]:
        """
        Get all signatures for a WorkItem.

        Args:
            workitem_id: UUID of the WorkItem
            include_invalid: Whether to include invalidated signatures

        Returns:
            List of signatures for the WorkItem
        """
        query = select(DigitalSignature).where(
            DigitalSignature.workitem_id == workitem_id
        )

        if not include_invalid:
            query = query.where(DigitalSignature.is_valid == True)

        query = query.order_by(DigitalSignature.signed_at.desc())

        result = await self.db.execute(query)
        signatures = result.scalars().all()

        return [
            DigitalSignatureResponse.model_validate(signature)
            for signature in signatures
        ]

    async def is_workitem_signed(self, workitem_id: UUID) -> bool:
        """
        Check if a WorkItem has any valid signatures.

        Args:
            workitem_id: UUID of the WorkItem

        Returns:
            True if the WorkItem has valid signatures, False otherwise
        """
        result = await self.db.execute(
            select(DigitalSignature).where(
                DigitalSignature.workitem_id == workitem_id,
                DigitalSignature.is_valid == True,
            )
        )

        return result.scalar_one_or_none() is not None

    def _generate_content_hash(self, content: dict) -> str:
        """
        Generate SHA-256 hash of WorkItem content.

        The content is serialized to JSON with sorted keys to ensure
        consistent hashing regardless of dictionary key order.

        Args:
            content: WorkItem content as dictionary

        Returns:
            SHA-256 hash as hexadecimal string
        """
        # Serialize content to JSON with sorted keys for consistency
        content_json = json.dumps(content, sort_keys=True, ensure_ascii=False)

        # Generate SHA-256 hash
        return hashlib.sha256(content_json.encode("utf-8")).hexdigest()

    def _create_signature(self, content_hash: str, private_key_pem: bytes) -> str:
        """
        Create RSA-PSS signature of content hash.

        Uses RSA-PSS with SHA-256 for cryptographic signing, following
        industry best practices for digital signatures.

        Args:
            content_hash: SHA-256 hash of content to sign
            private_key_pem: RSA private key in PEM format

        Returns:
            Signature as hexadecimal string

        Raises:
            ValueError: If private key is invalid or signing fails
        """
        try:
            # Load private key
            private_key_raw = serialization.load_pem_private_key(
                private_key_pem, password=None
            )

            # Ensure it's an RSA private key
            if not isinstance(private_key_raw, rsa.RSAPrivateKey):
                raise ValueError("Private key must be an RSA key")

            private_key = private_key_raw

            # Create signature using RSA-PSS with SHA-256
            signature_bytes = private_key.sign(
                content_hash.encode("utf-8"),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH,
                ),
                hashes.SHA256(),
            )

            return signature_bytes.hex()

        except Exception as e:
            raise ValueError(f"Failed to create signature: {str(e)}") from e

    def _verify_signature_hash(
        self, content_hash: str, signature_hash: str, public_key_pem: bytes
    ) -> bool:
        """
        Verify RSA-PSS signature against content hash.

        Args:
            content_hash: Original SHA-256 hash that was signed
            signature_hash: Signature to verify (hexadecimal string)
            public_key_pem: RSA public key in PEM format

        Returns:
            True if signature is valid, False otherwise
        """
        try:
            # Load public key
            public_key_raw = serialization.load_pem_public_key(public_key_pem)

            # Ensure it's an RSA public key
            if not isinstance(public_key_raw, rsa.RSAPublicKey):
                raise ValueError("Public key must be an RSA key")

            public_key = public_key_raw

            # Convert signature from hex to bytes
            signature_bytes = bytes.fromhex(signature_hash)

            # Verify signature using RSA-PSS with SHA-256
            public_key.verify(
                signature_bytes,
                content_hash.encode("utf-8"),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH,
                ),
                hashes.SHA256(),
            )

            return True

        except Exception:
            # Any exception during verification means the signature is invalid
            return False


async def get_signature_service(db: AsyncSession) -> SignatureService:
    """
    Dependency for getting SignatureService instance.

    Args:
        db: Database session

    Returns:
        SignatureService instance
    """
    return SignatureService(db)

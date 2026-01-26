"""Digital signature model for document integrity and compliance"""

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class DigitalSignature(Base):
    """
    Digital signature model for cryptographic document signing.
    
    This model stores cryptographic signatures for WorkItems to ensure document
    integrity and provide non-repudiation for regulatory compliance. Each signature
    is tied to a specific version of a WorkItem and becomes invalid when the
    WorkItem is modified.
    
    Attributes:
        id: Unique signature identifier (UUID)
        workitem_id: ID of the signed WorkItem (indexed for efficient queries)
        workitem_version: Version of the WorkItem that was signed (e.g., "1.2")
        user_id: ID of the user who created the signature
        signature_hash: Cryptographic signature (RSA with SHA-256)
        content_hash: SHA-256 hash of the signed content for integrity verification
        signed_at: Timestamp when the signature was created
        is_valid: Whether the signature is currently valid (false if WorkItem modified)
        invalidated_at: Timestamp when the signature was invalidated (nullable)
        invalidation_reason: Reason for signature invalidation (nullable)
    """

    __tablename__ = "digital_signatures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    workitem_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    workitem_version = Column(String, nullable=False)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    signature_hash = Column(String, nullable=False)
    content_hash = Column(String, nullable=False)
    signed_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    is_valid = Column(Boolean, default=True, nullable=False)
    invalidated_at = Column(DateTime(timezone=True), nullable=True)
    invalidation_reason = Column(String, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<DigitalSignature(id={self.id}, workitem_id={self.workitem_id}, "
            f"version={self.workitem_version}, user_id={self.user_id}, "
            f"is_valid={self.is_valid})>"
        )

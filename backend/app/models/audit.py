"""Audit log model for compliance tracking"""

from datetime import UTC, datetime
from uuid import uuid4

from sqlalchemy import JSON, Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID

from app.db.session import Base


class AuditLog(Base):
    """
    Audit log model for tracking all system activities.
    
    This model provides immutable audit trails for compliance with regulatory
    requirements. All create, read, update, delete operations, authentication
    attempts, and authorization decisions are logged.
    
    Attributes:
        id: Unique audit log entry identifier (UUID)
        user_id: ID of the user who performed the action (nullable for system actions)
        action: Type of action performed (CREATE, READ, UPDATE, DELETE, SIGN, AUTH, etc.)
        entity_type: Type of entity affected (User, WorkItem, Requirement, etc.)
        entity_id: ID of the affected entity (nullable for list operations)
        timestamp: When the action occurred (indexed for efficient querying)
        ip_address: IP address of the client (nullable)
        details: Additional context as JSON (e.g., changed fields, error messages)
    """

    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    action = Column(String, nullable=False, index=True)
    entity_type = Column(String, nullable=False, index=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    timestamp = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
        index=True,
    )
    ip_address = Column(String, nullable=True)
    details = Column(JSON, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<AuditLog(id={self.id}, action={self.action}, "
            f"entity_type={self.entity_type}, timestamp={self.timestamp})>"
        )

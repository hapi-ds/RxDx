"""Version History model for storing WorkItem version snapshots"""

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import JSON, DateTime, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base


class VersionHistory(Base):
    """
    Version History model for storing snapshots of WorkItem versions.
    
    Each time a WorkItem is updated, a snapshot of the previous version
    is stored in this table, allowing full version history to be retrieved.
    """
    
    __tablename__ = "version_history"
    
    # Primary key
    id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        primary_key=True,
        default=uuid4
    )
    
    # WorkItem reference
    workitem_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        nullable=False,
        index=True
    )
    
    # Version information
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    
    # WorkItem data snapshot (stored as JSON)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
    
    # Change tracking
    change_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(UTC)
    )
    
    def __repr__(self) -> str:
        return f"<VersionHistory(workitem_id={self.workitem_id}, version={self.version})>"

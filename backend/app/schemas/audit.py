"""Pydantic schemas for AuditLog model"""

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field


class AuditLogBase(BaseModel):
    """Base audit log schema with common fields"""

    action: str = Field(..., min_length=1, max_length=50, description="Action type (CREATE, READ, UPDATE, DELETE, SIGN, AUTH)")
    entity_type: str = Field(..., min_length=1, max_length=100, description="Type of entity affected")
    entity_id: UUID | None = Field(None, description="ID of the affected entity")
    ip_address: str | None = Field(None, max_length=45, description="Client IP address (IPv4 or IPv6)")
    details: dict[str, Any] | None = Field(None, description="Additional context as JSON")


class AuditLogCreate(AuditLogBase):
    """Schema for creating a new audit log entry"""

    user_id: UUID | None = Field(None, description="ID of the user who performed the action")


class AuditLogResponse(AuditLogBase):
    """Schema for audit log response"""

    id: UUID
    user_id: UUID | None
    timestamp: datetime

    model_config = {"from_attributes": True}


class AuditLogFilter(BaseModel):
    """Schema for filtering audit logs"""

    user_id: UUID | None = None
    action: str | None = None
    entity_type: str | None = None
    entity_id: UUID | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    limit: int = Field(default=100, ge=1, le=1000, description="Maximum number of results")
    offset: int = Field(default=0, ge=0, description="Number of results to skip")

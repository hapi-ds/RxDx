"""Pydantic schemas for AuditLog model"""

from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class AuditLogBase(BaseModel):
    """Base audit log schema with common fields"""

    action: str = Field(..., min_length=1, max_length=50, description="Action type (CREATE, READ, UPDATE, DELETE, SIGN, AUTH)")
    entity_type: str = Field(..., min_length=1, max_length=100, description="Type of entity affected")
    entity_id: Optional[UUID] = Field(None, description="ID of the affected entity")
    ip_address: Optional[str] = Field(None, max_length=45, description="Client IP address (IPv4 or IPv6)")
    details: Optional[dict[str, Any]] = Field(None, description="Additional context as JSON")


class AuditLogCreate(AuditLogBase):
    """Schema for creating a new audit log entry"""

    user_id: Optional[UUID] = Field(None, description="ID of the user who performed the action")


class AuditLogResponse(AuditLogBase):
    """Schema for audit log response"""

    id: UUID
    user_id: Optional[UUID]
    timestamp: datetime

    model_config = {"from_attributes": True}


class AuditLogFilter(BaseModel):
    """Schema for filtering audit logs"""

    user_id: Optional[UUID] = None
    action: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[UUID] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(default=100, ge=1, le=1000, description="Maximum number of results")
    offset: int = Field(default=0, ge=0, description="Number of results to skip")

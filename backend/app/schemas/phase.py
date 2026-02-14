"""Pydantic schemas for Phase entities"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class PhaseBase(BaseModel):
    """Base schema for Phase"""

    name: str = Field(..., min_length=1, max_length=200, description="Phase name")
    description: str | None = Field(
        None, max_length=2000, description="Phase description"
    )
    order: int = Field(
        ...,
        ge=1,
        description="Sequence order within project (deprecated, use NEXT relationships)",
    )
    minimal_duration: int | None = Field(
        None, ge=1, description="Minimum calendar days for this phase"
    )
    start_date: datetime | None = Field(
        None, description="Manual start date (optional, user-specified)"
    )
    due_date: datetime | None = Field(
        None, description="Manual due date (optional, user-specified)"
    )
    project_id: UUID = Field(..., description="Project ID this phase belongs to")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate phase name is not empty or whitespace-only"""
        if not v.strip():
            raise ValueError("Phase name cannot be empty or whitespace-only")
        return v

    @field_validator("due_date")
    @classmethod
    def validate_dates(cls, v: datetime | None, info) -> datetime | None:
        """Validate due_date is after start_date"""
        if v is not None and info.data.get("start_date") is not None:
            if v <= info.data["start_date"]:
                raise ValueError("due_date must be after start_date")
        return v


class PhaseCreate(PhaseBase):
    """Schema for creating a new Phase"""

    pass


class PhaseUpdate(BaseModel):
    """Schema for updating a Phase"""

    name: str | None = Field(
        None, min_length=1, max_length=200, description="Phase name"
    )
    description: str | None = Field(
        None, max_length=2000, description="Phase description"
    )
    order: int | None = Field(
        None,
        ge=1,
        description="Sequence order within project (deprecated, use NEXT relationships)",
    )
    minimal_duration: int | None = Field(
        None, ge=1, description="Minimum calendar days for this phase"
    )
    start_date: datetime | None = Field(
        None, description="Manual start date (optional, user-specified)"
    )
    due_date: datetime | None = Field(
        None, description="Manual due date (optional, user-specified)"
    )
    project_id: UUID | None = Field(
        None, description="Project ID this phase belongs to"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        """Validate phase name is not empty or whitespace-only"""
        if v is not None and not v.strip():
            raise ValueError("Phase name cannot be empty or whitespace-only")
        return v


class PhaseResponse(PhaseBase):
    """Schema for Phase response"""

    id: UUID
    created_at: datetime
    calculated_start_date: datetime | None = Field(
        None, description="Calculated by scheduler"
    )
    calculated_end_date: datetime | None = Field(
        None, description="Calculated by scheduler"
    )
    start_date_is: datetime | None = Field(
        None, description="Actual start date when work began"
    )
    progress: int | None = Field(
        None, ge=0, le=100, description="Completion percentage (0-100)"
    )
    workpackage_count: int | None = Field(
        None, description="Number of workpackages in phase"
    )
    completion_percentage: float | None = Field(
        None, description="Completion percentage (0-100)"
    )

    model_config = {"from_attributes": True}

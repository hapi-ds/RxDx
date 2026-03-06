"""Pydantic schemas for Workpackage entities"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class WorkpackageBase(BaseModel):
    """Base schema for Workpackage
    
    Note: phase_id is NOT stored as a property on the node.
    It's only used in Create/Update schemas to specify which
    relationship to create/update. The actual association is
    stored as a BELONGS_TO relationship in the graph.
    """

    name: str = Field(..., min_length=1, max_length=200, description="Workpackage name")
    description: str | None = Field(
        None, max_length=2000, description="Workpackage description"
    )
    order: int = Field(..., ge=1, description="Sequence order within phase")
    minimal_duration: int | None = Field(
        None, ge=1, description="Minimum calendar days for this workpackage"
    )
    start_date: datetime | None = Field(
        None, description="Manual start date (optional, user-specified)"
    )
    due_date: datetime | None = Field(
        None, description="Manual due date (optional, user-specified)"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate workpackage name is not empty or whitespace-only"""
        if not v.strip():
            raise ValueError("Workpackage name cannot be empty or whitespace-only")
        return v

    @field_validator("due_date")
    @classmethod
    def validate_dates(cls, v: datetime | None, info) -> datetime | None:
        """Validate due_date is after start_date"""
        if v is not None and info.data.get("start_date") is not None:
            if v <= info.data["start_date"]:
                raise ValueError("due_date must be after start_date")
        return v


class WorkpackageCreate(WorkpackageBase):
    """Schema for creating a new Workpackage
    
    phase_id is used to create the BELONGS_TO relationship,
    not stored as a property on the node.
    """

    phase_id: UUID = Field(..., description="Phase ID to create BELONGS_TO relationship")


class WorkpackageUpdate(BaseModel):
    """Schema for updating a Workpackage
    
    phase_id can be provided to update the BELONGS_TO relationship,
    not to update a property on the node.
    """

    name: str | None = Field(
        None, min_length=1, max_length=200, description="Workpackage name"
    )
    description: str | None = Field(
        None, max_length=2000, description="Workpackage description"
    )
    order: int | None = Field(None, ge=1, description="Sequence order within phase")
    minimal_duration: int | None = Field(
        None, ge=1, description="Minimum calendar days for this workpackage"
    )
    start_date: datetime | None = Field(
        None, description="Manual start date (optional, user-specified)"
    )
    due_date: datetime | None = Field(
        None, description="Manual due date (optional, user-specified)"
    )
    start_date_is: datetime | None = Field(
        None, description="Actual start date when work began"
    )
    progress: int | None = Field(
        None, ge=0, le=100, description="Completion percentage (0-100)"
    )
    phase_id: UUID | None = Field(
        None, description="Phase ID to update BELONGS_TO relationship"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        """Validate workpackage name is not empty or whitespace-only"""
        if v is not None and not v.strip():
            raise ValueError("Workpackage name cannot be empty or whitespace-only")
        return v


class WorkpackageResponse(WorkpackageBase):
    """Schema for Workpackage response
    
    phase_id is derived from the BELONGS_TO relationship,
    not stored as a property on the node.
    """

    id: UUID
    phase_id: UUID | None = Field(
        None, description="Phase ID derived from BELONGS_TO relationship"
    )
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
    task_count: int | None = Field(None, description="Number of tasks in workpackage")
    completion_percentage: float | None = Field(
        None, description="Completion percentage (0-100)"
    )

    model_config = {"from_attributes": True}


class WorkpackageDepartmentLink(BaseModel):
    """Schema for linking workpackage to department"""

    department_id: UUID = Field(..., description="Department ID to link to")


class WorkpackageDepartmentLinkResponse(BaseModel):
    """Schema for workpackage-department link response"""

    workpackage_id: UUID
    department_id: UUID
    linked_at: datetime

    model_config = {"from_attributes": True}

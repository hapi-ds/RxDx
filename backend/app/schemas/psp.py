"""Pydantic schemas for PSP (Project Structure Plan) entities"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class PhaseBase(BaseModel):
    """Base schema for Phase"""

    name: str = Field(..., min_length=1, max_length=200, description="Phase name")
    description: str | None = Field(None, description="Phase description")
    status: str = Field(default="draft", description="Phase status")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of allowed values"""
        allowed = ["draft", "active", "completed", "archived"]
        if v.lower() not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(allowed)}")
        return v.lower()


class PhaseResponse(PhaseBase):
    """Phase response schema"""

    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DepartmentBase(BaseModel):
    """Base schema for Department"""

    name: str = Field(..., min_length=1, max_length=200, description="Department name")
    description: str | None = Field(None, description="Department description")
    manager_user_id: UUID | None = Field(
        None, description="User ID of department manager"
    )


class DepartmentResponse(DepartmentBase):
    """Department response schema"""

    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkpackageBase(BaseModel):
    """Base schema for Workpackage"""

    name: str = Field(..., min_length=1, max_length=500, description="Workpackage name")
    description: str | None = Field(None, description="Workpackage description")
    status: str = Field(default="draft", description="Workpackage status")
    order: int | None = Field(
        None, ge=0, description="Order within phase-department cell"
    )
    estimated_hours: float | None = Field(
        None, ge=0, description="Estimated hours to complete"
    )
    actual_hours: float | None = Field(None, ge=0, description="Actual hours spent")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of allowed values"""
        allowed = ["draft", "active", "completed", "archived"]
        if v.lower() not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(allowed)}")
        return v.lower()


class WorkpackageCreate(WorkpackageBase):
    """Schema for creating a workpackage"""

    phase_id: UUID = Field(..., description="Phase ID this workpackage belongs to")
    department_id: UUID = Field(
        ..., description="Department ID this workpackage is linked to"
    )


class WorkpackageUpdate(BaseModel):
    """Schema for updating a workpackage"""

    name: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    status: str | None = None
    order: int | None = Field(None, ge=0)
    estimated_hours: float | None = Field(None, ge=0)
    actual_hours: float | None = Field(None, ge=0)
    phase_id: UUID | None = None
    department_id: UUID | None = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        """Validate status if provided"""
        if v is None:
            return v
        allowed = ["draft", "active", "completed", "archived"]
        if v.lower() not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(allowed)}")
        return v.lower()


class WorkpackageResponse(WorkpackageBase):
    """Workpackage response schema
    
    Note: phase_id and department_id are derived from relationships,
    not stored as properties. They are populated by traversing
    BELONGS_TO and LINKED_TO_DEPARTMENT relationships.
    """

    id: UUID
    phase_id: UUID | None = Field(
        None, description="Phase ID derived from BELONGS_TO relationship"
    )
    department_id: UUID | None = Field(
        None, description="Department ID derived from LINKED_TO_DEPARTMENT relationship"
    )
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PSPMatrixResponse(BaseModel):
    """Complete PSP matrix data"""

    phases: list[PhaseResponse]
    departments: list[DepartmentResponse]
    workpackages: list[WorkpackageResponse]


class PSPStatistics(BaseModel):
    """PSP matrix statistics"""

    total_phases: int = Field(..., ge=0, description="Total number of phases")
    total_departments: int = Field(..., ge=0, description="Total number of departments")
    total_workpackages: int = Field(
        ..., ge=0, description="Total number of workpackages"
    )
    workpackages_by_status: dict[str, int] = Field(
        ..., description="Count of workpackages by status"
    )
    coverage_percentage: float = Field(
        ..., ge=0, le=100, description="Percentage of cells with workpackages"
    )
    avg_workpackages_per_cell: float = Field(
        ..., ge=0, description="Average workpackages per cell"
    )

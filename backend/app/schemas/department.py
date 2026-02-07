"""Pydantic schemas for Department entities"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.company import CompanyResponse


class DepartmentBase(BaseModel):
    """Base schema for Department"""

    name: str = Field(..., min_length=1, max_length=200, description="Department name")
    description: str | None = Field(
        None, max_length=1000, description="Department description"
    )
    manager_user_id: UUID | None = Field(
        None, description="User ID of department manager"
    )
    company_id: UUID = Field(..., description="Company ID this department belongs to")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate department name is not empty or whitespace-only"""
        if not v.strip():
            raise ValueError("Department name cannot be empty or whitespace-only")
        return v


class DepartmentCreate(DepartmentBase):
    """Schema for creating a new Department"""

    pass


class DepartmentUpdate(BaseModel):
    """Schema for updating a Department"""

    name: str | None = Field(
        None, min_length=1, max_length=200, description="Department name"
    )
    description: str | None = Field(
        None, max_length=1000, description="Department description"
    )
    manager_user_id: UUID | None = Field(
        None, description="User ID of department manager"
    )
    company_id: UUID | None = Field(
        None, description="Company ID this department belongs to"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        """Validate department name is not empty or whitespace-only"""
        if v is not None and not v.strip():
            raise ValueError("Department name cannot be empty or whitespace-only")
        return v


class DepartmentResponse(DepartmentBase):
    """Schema for Department response"""

    id: UUID
    created_at: datetime
    company: CompanyResponse | None = Field(
        None, description="Company this department belongs to"
    )

    model_config = {"from_attributes": True}

"""Pydantic schemas for Company entities"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CompanyBase(BaseModel):
    """Base schema for Company"""

    name: str = Field(..., min_length=1, max_length=200, description="Company name")
    description: str | None = Field(
        None, max_length=1000, description="Company description"
    )


class CompanyCreate(CompanyBase):
    """Schema for creating a new Company"""

    pass


class CompanyUpdate(BaseModel):
    """Schema for updating a Company"""

    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)


class CompanyResponse(CompanyBase):
    """Schema for Company response"""

    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

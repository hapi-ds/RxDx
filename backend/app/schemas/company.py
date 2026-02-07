"""Pydantic schemas for Company entities"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class CompanyBase(BaseModel):
    """Base schema for Company"""

    name: str = Field(..., min_length=1, max_length=200, description="Company name")
    description: str | None = Field(
        None, max_length=1000, description="Company description"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate company name is not empty or whitespace-only"""
        if not v.strip():
            raise ValueError("Company name cannot be empty or whitespace-only")

        name = v.strip()

        if len(name) < 1:
            raise ValueError("Company name must be at least 1 character long")

        if len(name) > 200:
            raise ValueError("Company name cannot exceed 200 characters")

        # Check for meaningful content
        if not any(c.isalnum() for c in name):
            raise ValueError(
                "Company name must contain at least one alphanumeric character"
            )

        return name

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        """Validate company description if provided"""
        if v is None:
            return v

        description = v.strip()
        if not description:
            return None

        if len(description) > 1000:
            raise ValueError("Company description cannot exceed 1000 characters")

        return description


class CompanyCreate(CompanyBase):
    """Schema for creating a new Company"""

    pass


class CompanyUpdate(BaseModel):
    """Schema for updating a Company"""

    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, max_length=1000)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        """Validate company name if provided"""
        if v is None:
            return v

        if not v.strip():
            raise ValueError("Company name cannot be empty or whitespace-only")

        name = v.strip()

        if len(name) < 1:
            raise ValueError("Company name must be at least 1 character long")

        if len(name) > 200:
            raise ValueError("Company name cannot exceed 200 characters")

        # Check for meaningful content
        if not any(c.isalnum() for c in name):
            raise ValueError(
                "Company name must contain at least one alphanumeric character"
            )

        return name

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        """Validate company description if provided"""
        if v is None:
            return v

        description = v.strip()
        if not description:
            return None

        if len(description) > 1000:
            raise ValueError("Company description cannot exceed 1000 characters")

        return description


class CompanyResponse(CompanyBase):
    """Schema for Company response"""

    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

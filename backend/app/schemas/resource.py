"""Pydantic schemas for Resource entities"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ResourceBase(BaseModel):
    """Base schema for Resource"""

    name: str = Field(..., min_length=1, max_length=200, description="Resource name")
    type: str = Field(
        ...,
        description="Resource type: person, machine, equipment, facility, other"
    )
    capacity: float = Field(
        ..., gt=0, description="Resource capacity (hours per week)"
    )
    department_id: UUID = Field(
        ..., description="Department ID this resource belongs to"
    )
    skills: list[str] | None = Field(
        None, description="Skills for person type resources"
    )
    availability: str = Field(
        default="available",
        description="Availability status: available, unavailable, limited"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate resource name is not empty or whitespace-only"""
        if not v.strip():
            raise ValueError("Resource name cannot be empty or whitespace-only")
        return v

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        """Validate resource type is one of the allowed values"""
        allowed_types = ["person", "machine", "equipment", "facility", "other"]
        if v not in allowed_types:
            raise ValueError(
                f"Resource type must be one of: {', '.join(allowed_types)}"
            )
        return v

    @field_validator("availability")
    @classmethod
    def validate_availability(cls, v: str) -> str:
        """Validate availability status is one of the allowed values"""
        allowed_statuses = ["available", "unavailable", "limited"]
        if v not in allowed_statuses:
            raise ValueError(
                f"Availability must be one of: {', '.join(allowed_statuses)}"
            )
        return v

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v: list[str] | None) -> list[str] | None:
        """Validate skills are non-empty strings"""
        if v is not None:
            for skill in v:
                if not skill.strip():
                    raise ValueError("Skills cannot be empty or whitespace-only")
        return v


class ResourceCreate(ResourceBase):
    """Schema for creating a new Resource"""

    pass


class ResourceUpdate(BaseModel):
    """Schema for updating a Resource"""

    name: str | None = Field(
        None, min_length=1, max_length=200, description="Resource name"
    )
    type: str | None = Field(
        None, description="Resource type: person, machine, equipment, facility, other"
    )
    capacity: float | None = Field(
        None, gt=0, description="Resource capacity (hours per week)"
    )
    department_id: UUID | None = Field(
        None, description="Department ID this resource belongs to"
    )
    skills: list[str] | None = Field(
        None, description="Skills for person type resources"
    )
    availability: str | None = Field(
        None, description="Availability status: available, unavailable, limited"
    )

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        """Validate resource name is not empty or whitespace-only"""
        if v is not None and not v.strip():
            raise ValueError("Resource name cannot be empty or whitespace-only")
        return v

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str | None) -> str | None:
        """Validate resource type is one of the allowed values"""
        if v is not None:
            allowed_types = ["person", "machine", "equipment", "facility", "other"]
            if v not in allowed_types:
                raise ValueError(
                    f"Resource type must be one of: {', '.join(allowed_types)}"
                )
        return v

    @field_validator("availability")
    @classmethod
    def validate_availability(cls, v: str | None) -> str | None:
        """Validate availability status is one of the allowed values"""
        if v is not None:
            allowed_statuses = ["available", "unavailable", "limited"]
            if v not in allowed_statuses:
                raise ValueError(
                    f"Availability must be one of: {', '.join(allowed_statuses)}"
                )
        return v

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v: list[str] | None) -> list[str] | None:
        """Validate skills are non-empty strings"""
        if v is not None:
            for skill in v:
                if not skill.strip():
                    raise ValueError("Skills cannot be empty or whitespace-only")
        return v


class ResourceResponse(ResourceBase):
    """Schema for Resource response"""

    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ResourceAllocationBase(BaseModel):
    """Base schema for Resource Allocation"""

    allocation_percentage: float = Field(
        ..., ge=0, le=100, description="Percentage of resource capacity (0-100)"
    )
    lead: bool = Field(
        default=False, description="Whether this is a lead/primary resource"
    )
    start_date: datetime | None = Field(None, description="Allocation start date")
    end_date: datetime | None = Field(None, description="Allocation end date")


class ResourceAllocationCreate(ResourceAllocationBase):
    """Schema for creating a Resource Allocation"""

    resource_id: UUID = Field(..., description="Resource UUID")
    target_id: UUID = Field(..., description="Project, Workpackage, or Task UUID")
    target_type: str = Field(
        ..., description="Target type: project, workpackage, or task"
    )

    @field_validator("target_type")
    @classmethod
    def validate_target_type(cls, v: str) -> str:
        """Validate target type is one of the allowed values"""
        allowed_types = ["project", "workpackage", "task"]
        if v.lower() not in allowed_types:
            raise ValueError(
                f"Target type must be one of: {', '.join(allowed_types)}"
            )
        return v.lower()


class ResourceAllocationUpdate(BaseModel):
    """Schema for updating a Resource Allocation"""

    allocation_percentage: float | None = Field(
        None, ge=0, le=100, description="Percentage of resource capacity (0-100)"
    )
    lead: bool | None = Field(
        None, description="Whether this is a lead/primary resource"
    )
    start_date: datetime | None = Field(None, description="Allocation start date")
    end_date: datetime | None = Field(None, description="Allocation end date")


class ResourceAllocationResponse(ResourceAllocationBase):
    """Schema for Resource Allocation response"""

    target_id: UUID
    target_type: str
    target_name: str | None

    model_config = {"from_attributes": True}

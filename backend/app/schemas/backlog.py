"""Pydantic schemas for Backlog model"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class BacklogBase(BaseModel):
    """Base Backlog schema with common fields"""

    name: str = Field(..., min_length=1, max_length=200, description="Backlog name")
    description: str | None = Field(None, description="Backlog description")
    project_id: UUID = Field(..., description="UUID of the project this backlog belongs to")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate name is not empty after stripping whitespace"""
        if not v.strip():
            raise ValueError("Name cannot be empty or only whitespace")

        name = v.strip()
        if len(name) < 3:
            raise ValueError("Name must be at least 3 characters long")

        if len(name) > 200:
            raise ValueError("Name cannot exceed 200 characters")

        return name

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        """Validate description content"""
        if v is None:
            return v

        v = v.strip()
        if not v:
            return None

        if len(v) > 2000:
            raise ValueError("Description cannot exceed 2000 characters")

        return v


class BacklogCreate(BacklogBase):
    """Schema for creating a new Backlog"""
    pass


class BacklogUpdate(BaseModel):
    """Schema for updating a Backlog"""

    name: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str | None) -> str | None:
        """Validate name if provided"""
        if v is None:
            return v
        if not v.strip():
            raise ValueError("Name cannot be empty or only whitespace")

        name = v.strip()
        if len(name) < 3:
            raise ValueError("Name must be at least 3 characters long")

        if len(name) > 200:
            raise ValueError("Name cannot exceed 200 characters")

        return name

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str | None) -> str | None:
        """Validate description if provided"""
        if v is None:
            return v

        if v:  # Only validate if not empty string
            desc = v.strip()
            if len(desc) > 2000:
                raise ValueError("Description cannot exceed 2000 characters")

            return desc

        return v


class BacklogResponse(BacklogBase):
    """Schema for Backlog response (includes metadata)"""

    id: UUID
    task_count: int = Field(default=0, ge=0, description="Number of tasks in backlog")
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class BacklogTaskResponse(BaseModel):
    """Schema for a task in the backlog with priority information"""

    task_id: UUID
    task_title: str
    task_type: str
    task_status: str
    priority_order: int = Field(ge=0, description="Priority order in backlog (lower = higher priority)")
    added_at: datetime
    estimated_hours: float | None = Field(None, ge=0)
    story_points: int | None = Field(None, ge=0)

    model_config = {"from_attributes": True}

"""Pydantic schemas for Sprint model"""

from datetime import datetime, UTC, timedelta
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class SprintBase(BaseModel):
    """Base Sprint schema with common fields"""

    name: str = Field(..., min_length=1, max_length=200, description="Sprint name")
    goal: str | None = Field(None, description="Sprint goal or objective")
    start_date: datetime = Field(..., description="Sprint start date")
    end_date: datetime = Field(..., description="Sprint end date")
    capacity_hours: float | None = Field(None, ge=0, description="Total capacity in hours")
    capacity_story_points: int | None = Field(None, ge=0, description="Total capacity in story points")
    status: str = Field(default="planning", description="Sprint status")
    project_id: UUID = Field(..., description="UUID of the project this sprint belongs to")

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

    @field_validator("goal")
    @classmethod
    def validate_goal(cls, v: str | None) -> str | None:
        """Validate goal content"""
        if v is None:
            return v

        v = v.strip()
        if not v:
            return None

        if len(v) < 10:
            raise ValueError("Goal must be at least 10 characters long")

        if len(v) > 1000:
            raise ValueError("Goal cannot exceed 1000 characters")

        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of allowed values"""
        allowed_statuses = {"planning", "active", "completed", "cancelled"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed_statuses))}")
        return v.lower()

    @field_validator("start_date", "end_date")
    @classmethod
    def validate_dates(cls, v: datetime) -> datetime:
        """Validate dates are timezone-aware"""
        if v.tzinfo is None:
            raise ValueError("Dates must be timezone-aware")
        return v

    @field_validator("end_date")
    @classmethod
    def validate_end_after_start(cls, v: datetime, info) -> datetime:
        """Validate end_date is after start_date"""
        if "start_date" in info.data:
            start_date = info.data["start_date"]
            if v <= start_date:
                raise ValueError("End date must be after start date")
        return v


class SprintCreate(SprintBase):
    """Schema for creating a new Sprint"""

    @field_validator("end_date")
    @classmethod
    def validate_sprint_duration(cls, v: datetime, info) -> datetime:
        """Validate sprint duration is reasonable (max 30 days)"""
        if "start_date" in info.data:
            start_date = info.data["start_date"]
            duration = (v - start_date).days
            if duration > 30:
                raise ValueError("Sprint duration cannot exceed 30 days")
            if duration < 1:
                raise ValueError("Sprint duration must be at least 1 day")
        return v


class SprintUpdate(BaseModel):
    """Schema for updating a Sprint"""

    name: str | None = Field(None, min_length=1, max_length=200)
    goal: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    capacity_hours: float | None = Field(None, ge=0)
    capacity_story_points: int | None = Field(None, ge=0)
    actual_velocity_hours: float | None = Field(None, ge=0)
    actual_velocity_story_points: int | None = Field(None, ge=0)
    status: str | None = None

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

    @field_validator("goal")
    @classmethod
    def validate_goal(cls, v: str | None) -> str | None:
        """Validate goal if provided"""
        if v is None:
            return v

        if v:  # Only validate if not empty string
            goal = v.strip()
            if len(goal) < 10:
                raise ValueError("Goal must be at least 10 characters long")

            if len(goal) > 1000:
                raise ValueError("Goal cannot exceed 1000 characters")

            return goal

        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        """Validate status if provided"""
        if v is None:
            return v
        allowed_statuses = {"planning", "active", "completed", "cancelled"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed_statuses))}")
        return v.lower()

    @field_validator("start_date", "end_date")
    @classmethod
    def validate_dates(cls, v: datetime | None) -> datetime | None:
        """Validate dates if provided"""
        if v is None:
            return v
        if v.tzinfo is None:
            raise ValueError("Dates must be timezone-aware")
        return v


class SprintResponse(SprintBase):
    """Schema for Sprint response (includes metadata)"""

    id: UUID
    actual_velocity_hours: float = Field(default=0.0, ge=0)
    actual_velocity_story_points: int = Field(default=0, ge=0)
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class SprintVelocity(BaseModel):
    """Schema for Sprint velocity metrics"""

    sprint_id: UUID
    sprint_name: str
    actual_velocity_hours: float = Field(ge=0)
    actual_velocity_story_points: int = Field(ge=0)
    capacity_hours: float | None = Field(None, ge=0)
    capacity_story_points: int | None = Field(None, ge=0)
    completion_percentage_hours: float | None = Field(None, ge=0, le=100)
    completion_percentage_points: float | None = Field(None, ge=0, le=100)


class BurndownPoint(BaseModel):
    """Schema for a single point in the burndown chart"""

    date: datetime
    ideal_remaining_hours: float = Field(ge=0)
    actual_remaining_hours: float = Field(ge=0)
    ideal_remaining_points: int = Field(ge=0)
    actual_remaining_points: int = Field(ge=0)

"""Pydantic schemas for Worked node (graph database time tracking)"""

from datetime import date as date_type
from datetime import datetime, time
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class WorkedBase(BaseModel):
    """Base Worked schema with common fields"""

    resource: UUID = Field(..., description="User ID (resource) who performed the work")
    task_id: UUID = Field(..., description="Task UUID that was worked on")
    date: date_type = Field(..., description="Date of work")
    start_time: time | datetime = Field(
        ..., description="Start time of work", alias="from"
    )
    end_time: time | datetime | None = Field(
        None, description="End time of work (optional for running entries)", alias="to"
    )
    description: str | None = Field(
        None, max_length=2000, description="Description of work performed"
    )

    model_config = {"populate_by_name": True}

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

    @model_validator(mode="after")
    def validate_times(self) -> "WorkedBase":
        """Validate that end_time is after start_time if provided"""
        if self.end_time is None:
            return self

        # Convert to comparable datetime objects
        from datetime import datetime as dt

        # Handle time objects
        if isinstance(self.start_time, time):
            start_dt = dt.combine(self.date, self.start_time)
        else:
            start_dt = self.start_time

        if isinstance(self.end_time, time):
            end_dt = dt.combine(self.date, self.end_time)
        else:
            end_dt = self.end_time

        if end_dt <= start_dt:
            raise ValueError("End time must be after start time")

        return self


class WorkedCreate(WorkedBase):
    """Schema for creating a new Worked entry"""

    pass


class WorkedUpdate(BaseModel):
    """Schema for updating a Worked entry"""

    end_time: time | datetime | None = Field(
        None, description="End time of work", alias="to"
    )
    description: str | None = Field(
        None, max_length=2000, description="Description of work performed"
    )

    model_config = {"populate_by_name": True}

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


class WorkedResponse(WorkedBase):
    """Schema for Worked response (includes metadata)"""

    id: UUID = Field(..., description="Unique identifier for the worked entry")
    created_at: datetime = Field(..., description="When the entry was created")

    model_config = {"from_attributes": True, "populate_by_name": True}


class WorkedSummary(BaseModel):
    """Schema for worked time summary for a task"""

    task_id: UUID = Field(..., description="Task UUID")
    total_hours: float = Field(..., description="Total hours worked on the task")
    entry_count: int = Field(..., description="Number of worked entries")
    last_worked: datetime | None = Field(
        None, description="Timestamp of most recent work"
    )


class WorkedListResponse(BaseModel):
    """Schema for list of worked entries with task information"""

    id: UUID = Field(..., description="Unique identifier for the worked entry")
    resource: UUID = Field(..., description="User ID (resource) who performed the work")
    task_id: UUID = Field(..., description="Task UUID that was worked on")
    task_title: str | None = Field(None, description="Title of the task")
    date: date_type = Field(..., description="Date of work")
    start_time: time | datetime = Field(
        ..., description="Start time of work", alias="from"
    )
    end_time: time | datetime | None = Field(
        None, description="End time of work", alias="to"
    )
    description: str | None = Field(None, description="Description of work performed")
    duration_hours: float | None = Field(
        None, description="Duration in hours (calculated)"
    )
    created_at: datetime = Field(..., description="When the entry was created")

    model_config = {"populate_by_name": True}


class StartTrackingRequest(BaseModel):
    """Schema for starting time tracking"""

    task_id: UUID = Field(..., description="Task UUID to track time for")
    description: str | None = Field(
        None, max_length=2000, description="Optional description of work"
    )

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


class StopTrackingRequest(BaseModel):
    """Schema for stopping time tracking"""

    worked_id: UUID = Field(..., description="Worked entry UUID to stop")
    description: str | None = Field(
        None, max_length=2000, description="Optional description to add/update"
    )

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


class ActiveTrackingResponse(BaseModel):
    """Schema for active time tracking entries"""

    entries: list[WorkedResponse] = Field(
        ..., description="List of active (running) worked entries"
    )
    count: int = Field(..., description="Number of active entries")

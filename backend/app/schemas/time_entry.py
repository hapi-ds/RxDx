"""Pydantic schemas for TimeEntry model"""

from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator


class TimeEntryBase(BaseModel):
    """Base TimeEntry schema with common fields"""

    project_id: UUID = Field(..., description="UUID of the project")
    task_id: Optional[UUID] = Field(None, description="UUID of the associated task (optional)")
    start_time: datetime = Field(..., description="Start time of the time entry")
    end_time: Optional[datetime] = Field(None, description="End time of the time entry (optional for running entries)")
    description: Optional[str] = Field(None, max_length=2000, description="Description of work performed")
    category: Optional[str] = Field(None, max_length=100, description="Category of work (e.g., development, meeting, review)")

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        """Validate description content"""
        if v is None:
            return v
        v = v.strip()
        if not v:
            return None
        if len(v) > 2000:
            raise ValueError("Description cannot exceed 2000 characters")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        """Validate category"""
        if v is None:
            return v
        v = v.strip().lower()
        if not v:
            return None
        valid_categories = {
            "development", "meeting", "review", "testing", "documentation",
            "planning", "support", "training", "administration", "other"
        }
        if v not in valid_categories:
            raise ValueError(
                f"Invalid category '{v}'. Must be one of: {', '.join(sorted(valid_categories))}"
            )
        return v

    @model_validator(mode="after")
    def validate_times(self) -> "TimeEntryBase":
        """Validate that end_time is after start_time if provided"""
        if self.end_time is not None and self.end_time <= self.start_time:
            raise ValueError("End time must be after start time")
        return self


class TimeEntryCreate(TimeEntryBase):
    """Schema for creating a new TimeEntry"""
    pass


class TimeEntryUpdate(BaseModel):
    """Schema for updating a TimeEntry"""

    project_id: Optional[UUID] = Field(None, description="UUID of the project")
    task_id: Optional[UUID] = Field(None, description="UUID of the associated task")
    start_time: Optional[datetime] = Field(None, description="Start time of the time entry")
    end_time: Optional[datetime] = Field(None, description="End time of the time entry")
    description: Optional[str] = Field(None, max_length=2000, description="Description of work performed")
    category: Optional[str] = Field(None, max_length=100, description="Category of work")

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        """Validate description content"""
        if v is None:
            return v
        v = v.strip()
        if not v:
            return None
        if len(v) > 2000:
            raise ValueError("Description cannot exceed 2000 characters")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        """Validate category"""
        if v is None:
            return v
        v = v.strip().lower()
        if not v:
            return None
        valid_categories = {
            "development", "meeting", "review", "testing", "documentation",
            "planning", "support", "training", "administration", "other"
        }
        if v not in valid_categories:
            raise ValueError(
                f"Invalid category '{v}'. Must be one of: {', '.join(sorted(valid_categories))}"
            )
        return v


class TimeEntryResponse(TimeEntryBase):
    """Schema for TimeEntry response (includes metadata)"""

    id: UUID = Field(..., description="Unique identifier for the time entry")
    user_id: UUID = Field(..., description="UUID of the user who created the entry")
    duration_hours: Optional[Decimal] = Field(None, description="Duration in hours (calculated)")
    synced: bool = Field(default=False, description="Whether the entry has been synced from mobile")
    created_at: datetime = Field(..., description="When the entry was created")
    updated_at: Optional[datetime] = Field(None, description="When the entry was last updated")

    model_config = {"from_attributes": True}


class TimeEntrySyncRequest(BaseModel):
    """Schema for syncing time entries from mobile devices"""

    entries: List["TimeEntrySyncItem"] = Field(..., description="List of time entries to sync")
    device_id: Optional[str] = Field(None, max_length=100, description="Identifier of the mobile device")
    sync_timestamp: datetime = Field(..., description="Timestamp when sync was initiated")


class TimeEntrySyncItem(BaseModel):
    """Schema for a single time entry in a sync request"""

    local_id: str = Field(..., max_length=100, description="Local ID from mobile device")
    project_id: UUID = Field(..., description="UUID of the project")
    task_id: Optional[UUID] = Field(None, description="UUID of the associated task")
    start_time: datetime = Field(..., description="Start time of the time entry")
    end_time: Optional[datetime] = Field(None, description="End time of the time entry")
    description: Optional[str] = Field(None, max_length=2000, description="Description of work performed")
    category: Optional[str] = Field(None, max_length=100, description="Category of work")

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: Optional[str]) -> Optional[str]:
        """Validate category"""
        if v is None:
            return v
        v = v.strip().lower()
        if not v:
            return None
        valid_categories = {
            "development", "meeting", "review", "testing", "documentation",
            "planning", "support", "training", "administration", "other"
        }
        if v not in valid_categories:
            raise ValueError(
                f"Invalid category '{v}'. Must be one of: {', '.join(sorted(valid_categories))}"
            )
        return v

    @model_validator(mode="after")
    def validate_times(self) -> "TimeEntrySyncItem":
        """Validate that end_time is after start_time if provided"""
        if self.end_time is not None and self.end_time <= self.start_time:
            raise ValueError("End time must be after start time")
        return self


class TimeEntrySyncResponse(BaseModel):
    """Schema for sync response"""

    synced_count: int = Field(..., description="Number of entries successfully synced")
    failed_count: int = Field(..., description="Number of entries that failed to sync")
    synced_entries: List["TimeEntrySyncResult"] = Field(..., description="Results for each synced entry")
    sync_timestamp: datetime = Field(..., description="Server timestamp of sync completion")


class TimeEntrySyncResult(BaseModel):
    """Schema for individual sync result"""

    local_id: str = Field(..., description="Local ID from mobile device")
    server_id: Optional[UUID] = Field(None, description="Server-assigned UUID (if successful)")
    success: bool = Field(..., description="Whether sync was successful")
    error: Optional[str] = Field(None, description="Error message if sync failed")


class TimeAggregation(BaseModel):
    """Schema for aggregated time data (for invoicing)"""

    project_id: UUID = Field(..., description="UUID of the project")
    user_id: UUID = Field(..., description="UUID of the user")
    task_id: Optional[UUID] = Field(None, description="UUID of the task (if grouped by task)")
    category: Optional[str] = Field(None, description="Category (if grouped by category)")
    total_hours: Decimal = Field(..., description="Total hours worked")
    entry_count: int = Field(..., description="Number of time entries")
    start_date: datetime = Field(..., description="Start of aggregation period")
    end_date: datetime = Field(..., description="End of aggregation period")


class TimeAggregationRequest(BaseModel):
    """Schema for requesting time aggregation"""

    project_id: Optional[UUID] = Field(None, description="Filter by project")
    user_id: Optional[UUID] = Field(None, description="Filter by user")
    start_date: datetime = Field(..., description="Start of period")
    end_date: datetime = Field(..., description="End of period")
    group_by: List[str] = Field(
        default=["project_id", "user_id"],
        description="Fields to group by (project_id, user_id, task_id, category)"
    )

    @field_validator("group_by")
    @classmethod
    def validate_group_by(cls, v: List[str]) -> List[str]:
        """Validate group_by fields"""
        valid_fields = {"project_id", "user_id", "task_id", "category"}
        for field in v:
            if field not in valid_fields:
                raise ValueError(
                    f"Invalid group_by field '{field}'. Must be one of: {', '.join(sorted(valid_fields))}"
                )
        return v

    @model_validator(mode="after")
    def validate_dates(self) -> "TimeAggregationRequest":
        """Validate that end_date is after start_date"""
        if self.end_date <= self.start_date:
            raise ValueError("End date must be after start date")
        return self


class TimeAggregationResponse(BaseModel):
    """Schema for time aggregation response"""

    aggregations: List[TimeAggregation] = Field(..., description="Aggregated time data")
    total_hours: Decimal = Field(..., description="Total hours across all aggregations")
    period_start: datetime = Field(..., description="Start of aggregation period")
    period_end: datetime = Field(..., description="End of aggregation period")


# Update forward references
TimeEntrySyncRequest.model_rebuild()
TimeEntrySyncResponse.model_rebuild()

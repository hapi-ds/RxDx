"""Pydantic schemas for Milestone model"""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class MilestoneBase(BaseModel):
    """Base Milestone schema with common fields"""

    title: str = Field(..., min_length=1, max_length=500, description="Milestone title")
    description: str | None = Field(None, description="Detailed description of the milestone")
    target_date: datetime = Field(..., description="Target date for milestone completion")
    is_manual_constraint: bool = Field(
        default=False,
        description="Whether target_date is a hard constraint (true) or calculated from dependencies (false)"
    )
    completion_criteria: str | None = Field(
        None,
        description="Criteria that must be met for milestone completion"
    )
    status: str = Field(
        default="draft",
        description="Current status of the milestone"
    )
    project_id: UUID = Field(..., description="UUID of the project this milestone belongs to")

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        """Validate title is not empty after stripping whitespace"""
        if not v.strip():
            raise ValueError("Title cannot be empty or only whitespace")

        title = v.strip()
        if len(title) < 5:
            raise ValueError("Title must be at least 5 characters long")

        if len(title) > 500:
            raise ValueError("Title cannot exceed 500 characters")

        # Check for meaningful content
        if not any(c.isalpha() for c in title):
            raise ValueError("Title must contain at least one letter")

        # Check for prohibited placeholder text
        prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
        title_upper = title.upper()
        for pattern in prohibited_patterns:
            if pattern in title_upper:
                raise ValueError(f"Title cannot contain placeholder text: {pattern}")

        return title

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        """Validate status is one of allowed values"""
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed_statuses))}")
        return v.lower()

    @field_validator("target_date")
    @classmethod
    def validate_target_date(cls, v: datetime) -> datetime:
        """Validate target date is timezone-aware"""
        if v.tzinfo is None:
            raise ValueError("Target date must be timezone-aware")
        return v

    @field_validator("completion_criteria")
    @classmethod
    def validate_completion_criteria(cls, v: str | None) -> str | None:
        """Validate completion criteria content"""
        if v is None:
            return v

        v = v.strip()
        if not v:
            return None

        if len(v) < 10:
            raise ValueError("Completion criteria must be at least 10 characters long")

        if len(v) > 2000:
            raise ValueError("Completion criteria cannot exceed 2000 characters")

        # Check for prohibited placeholder text
        prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
        v_upper = v.upper()
        for pattern in prohibited_patterns:
            if pattern in v_upper:
                raise ValueError(f"Completion criteria cannot contain placeholder text: {pattern}")

        return v


class MilestoneCreate(MilestoneBase):
    """Schema for creating a new Milestone"""

    @field_validator("target_date")
    @classmethod
    def validate_future_date(cls, v: datetime) -> datetime:
        """Validate target date is in the future for new milestones"""
        if v.tzinfo is None:
            raise ValueError("Target date must be timezone-aware")

        # Allow dates within the last 24 hours to account for timezone differences
        from datetime import UTC, timedelta
        now = datetime.now(UTC)
        if v < now - timedelta(days=1):
            raise ValueError("Target date for new milestones must be in the future or within the last 24 hours")

        return v


class MilestoneUpdate(BaseModel):
    """Schema for updating a Milestone"""

    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    target_date: datetime | None = None
    is_manual_constraint: bool | None = None
    completion_criteria: str | None = None
    status: str | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        """Validate title if provided"""
        if v is None:
            return v
        if not v.strip():
            raise ValueError("Title cannot be empty or only whitespace")

        title = v.strip()
        if len(title) < 5:
            raise ValueError("Title must be at least 5 characters long")

        if len(title) > 500:
            raise ValueError("Title cannot exceed 500 characters")

        # Check for meaningful content
        if not any(c.isalpha() for c in title):
            raise ValueError("Title must contain at least one letter")

        # Check for prohibited placeholder text
        prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
        title_upper = title.upper()
        for pattern in prohibited_patterns:
            if pattern in title_upper:
                raise ValueError(f"Title cannot contain placeholder text: {pattern}")

        return title

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        """Validate status if provided"""
        if v is None:
            return v
        allowed_statuses = {"draft", "active", "completed", "archived"}
        if v.lower() not in allowed_statuses:
            raise ValueError(f"Status must be one of: {', '.join(sorted(allowed_statuses))}")
        return v.lower()

    @field_validator("target_date")
    @classmethod
    def validate_target_date(cls, v: datetime | None) -> datetime | None:
        """Validate target date if provided"""
        if v is None:
            return v
        if v.tzinfo is None:
            raise ValueError("Target date must be timezone-aware")
        return v

    @field_validator("completion_criteria")
    @classmethod
    def validate_completion_criteria(cls, v: str | None) -> str | None:
        """Validate completion criteria if provided"""
        if v is None:
            return v

        if v:  # Only validate if not empty string
            criteria = v.strip()
            if len(criteria) < 10:
                raise ValueError("Completion criteria must be at least 10 characters long")

            if len(criteria) > 2000:
                raise ValueError("Completion criteria cannot exceed 2000 characters")

            # Check for prohibited placeholder text
            prohibited_patterns = ["TODO", "TBD", "FIXME", "XXX"]
            criteria_upper = criteria.upper()
            for pattern in prohibited_patterns:
                if pattern in criteria_upper:
                    raise ValueError(f"Completion criteria cannot contain placeholder text: {pattern}")

            return criteria

        return v


class MilestoneResponse(MilestoneBase):
    """Schema for Milestone response (includes metadata)"""

    id: UUID
    version: str = Field(..., description="Version number (e.g., '1.0', '1.1')")
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

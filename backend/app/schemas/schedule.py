"""Pydantic schemas for Project Scheduling"""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ResourceBase(BaseModel):
    """Base schema for a resource"""

    id: str = Field(..., description="Unique resource identifier")
    name: str = Field(..., min_length=1, max_length=200, description="Resource name")
    capacity: int = Field(..., ge=1, description="Resource capacity (units available)")
    skills: list[str] = Field(
        default_factory=list, description="Skills this resource possesses"
    )
    lead: bool = Field(
        default=False, description="Whether this is a lead/primary resource"
    )

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Resource ID cannot be empty")
        return v.strip()

    @field_validator("skills")
    @classmethod
    def validate_skills(cls, v: list[str]) -> list[str]:
        """Validate skills are non-empty strings"""
        validated = []
        for skill in v:
            if not skill or not skill.strip():
                raise ValueError("Skills cannot be empty or whitespace-only")
            validated.append(skill.strip())
        return validated


class ResourceCreate(ResourceBase):
    """Schema for creating a resource"""

    pass


class ResourceResponse(ResourceBase):
    """Schema for resource response"""

    pass


class TaskDependency(BaseModel):
    """Schema for task dependency"""

    predecessor_id: str = Field(..., description="ID of the predecessor task")
    dependency_type: Literal[
        "finish_to_start", "start_to_start", "finish_to_finish"
    ] = Field(default="finish_to_start", description="Type of dependency relationship")
    lag: int = Field(default=0, ge=0, description="Lag time in hours")


class ScheduleTaskBase(BaseModel):
    """Base schema for a schedulable task"""

    id: str = Field(..., description="Unique task identifier")
    title: str = Field(..., min_length=1, max_length=500, description="Task title")
    estimated_hours: int = Field(..., ge=1, description="Estimated duration in hours")
    dependencies: list[TaskDependency] = Field(
        default_factory=list, description="Task dependencies"
    )
    required_resources: list[str] = Field(
        default_factory=list, description="List of required resource IDs"
    )
    resource_demand: dict[str, int] = Field(
        default_factory=dict,
        description="Resource demand per resource ID (default is 1)",
    )
    skills_needed: list[str] = Field(
        default_factory=list, description="Skills required for this task"
    )
    earliest_start: datetime | None = Field(
        None, description="Earliest possible start time"
    )
    deadline: datetime | None = Field(None, description="Task deadline")
    priority: int = Field(
        default=1, ge=1, le=5, description="Task priority (1=lowest, 5=highest)"
    )
    sprint_id: str | None = Field(
        None, description="Sprint ID if task is assigned to a sprint"
    )
    sprint_start_date: datetime | None = Field(
        None, description="Sprint start date (hard constraint)"
    )
    sprint_end_date: datetime | None = Field(
        None, description="Sprint end date (hard constraint)"
    )

    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Task ID cannot be empty")
        return v.strip()

    @field_validator("skills_needed")
    @classmethod
    def validate_skills_needed(cls, v: list[str]) -> list[str]:
        """Validate skills are non-empty strings"""
        validated = []
        for skill in v:
            if not skill or not skill.strip():
                raise ValueError("Skills cannot be empty or whitespace-only")
            validated.append(skill.strip())
        return validated

    def model_post_init(self, __context: Any) -> None:
        """Validate sprint date consistency after model initialization"""
        # Check if sprint dates are provided together
        if self.sprint_id and (
            self.sprint_start_date is None or self.sprint_end_date is None
        ):
            raise ValueError(
                "Both sprint_start_date and sprint_end_date must be provided when sprint_id is set"
            )

        # Check if sprint dates are in correct order
        if (
            self.sprint_start_date
            and self.sprint_end_date
            and self.sprint_start_date >= self.sprint_end_date
        ):
            raise ValueError("sprint_start_date must be before sprint_end_date")


class ScheduleTaskCreate(ScheduleTaskBase):
    """Schema for creating a schedulable task"""

    pass


class ScheduledTask(BaseModel):
    """Schema for a scheduled task result"""

    task_id: str = Field(..., description="Task identifier")
    task_title: str = Field(..., description="Task title")
    start_date: datetime = Field(..., description="Scheduled start date")
    end_date: datetime = Field(..., description="Scheduled end date")
    duration_hours: int = Field(..., description="Duration in hours")
    assigned_resources: list[str] = Field(
        default_factory=list, description="Assigned resource IDs"
    )


class ScheduleConstraints(BaseModel):
    """Schema for schedule constraints"""

    project_start: datetime | None = Field(None, description="Project start date")
    project_deadline: datetime | None = Field(None, description="Project deadline")
    horizon_days: int = Field(
        default=365, ge=1, le=3650, description="Planning horizon in days"
    )
    working_hours_per_day: int = Field(
        default=8, ge=1, le=24, description="Working hours per day"
    )
    respect_weekends: bool = Field(default=True, description="Whether to skip weekends")


class ScheduleConflict(BaseModel):
    """Schema for a scheduling conflict"""

    conflict_type: str = Field(..., description="Type of conflict")
    description: str = Field(..., description="Conflict description")
    affected_tasks: list[str] = Field(
        default_factory=list, description="IDs of affected tasks"
    )
    affected_resources: list[str] = Field(
        default_factory=list, description="IDs of affected resources"
    )
    suggestion: str | None = Field(None, description="Suggested resolution")


class ScheduleRequest(BaseModel):
    """Schema for schedule calculation request"""

    project_id: UUID = Field(..., description="Project identifier")
    tasks: list[ScheduleTaskCreate] = Field(
        ..., min_length=1, description="Tasks to schedule"
    )
    resources: list[ResourceCreate] = Field(
        default_factory=list, description="Available resources"
    )
    constraints: ScheduleConstraints = Field(
        default_factory=ScheduleConstraints, description="Schedule constraints"
    )

    @field_validator("tasks")
    @classmethod
    def validate_tasks(cls, v: list[ScheduleTaskCreate]) -> list[ScheduleTaskCreate]:
        if not v:
            raise ValueError("At least one task is required")

        # Check for duplicate task IDs
        task_ids = [task.id for task in v]
        if len(task_ids) != len(set(task_ids)):
            raise ValueError("Duplicate task IDs found")

        return v


class ScheduleResponse(BaseModel):
    """Schema for schedule calculation response"""

    status: Literal["success", "feasible", "infeasible", "error"] = Field(
        ..., description="Schedule calculation status"
    )
    project_id: UUID = Field(..., description="Project identifier")
    schedule: list[ScheduledTask] = Field(
        default_factory=list, description="Scheduled tasks"
    )
    project_duration_hours: int | None = Field(
        None, description="Total project duration in hours"
    )
    project_start_date: datetime | None = Field(None, description="Project start date")
    project_end_date: datetime | None = Field(None, description="Project end date")
    conflicts: list[ScheduleConflict] = Field(
        default_factory=list, description="Identified conflicts"
    )
    message: str | None = Field(None, description="Additional message or error details")
    calculated_at: datetime = Field(
        default_factory=datetime.utcnow, description="When the schedule was calculated"
    )


class ScheduleUpdate(BaseModel):
    """Schema for manual schedule adjustments"""

    task_adjustments: dict[str, dict[str, Any]] = Field(
        default_factory=dict,
        description="Manual adjustments per task ID (e.g., {'task_id': {'start_date': '...'}})",
    )
    preserve_dependencies: bool = Field(
        default=True, description="Whether to preserve dependency constraints"
    )
    recalculate_downstream: bool = Field(
        default=True, description="Whether to recalculate downstream tasks"
    )


class ProjectSchedule(BaseModel):
    """Schema for stored project schedule"""

    project_id: UUID = Field(..., description="Project identifier")
    schedule: list[ScheduledTask] = Field(..., description="Scheduled tasks")
    resources: list[ResourceResponse] = Field(
        default_factory=list, description="Resources used"
    )
    constraints: ScheduleConstraints = Field(..., description="Applied constraints")
    project_duration_hours: int = Field(..., description="Total project duration")
    project_start_date: datetime = Field(..., description="Project start date")
    project_end_date: datetime = Field(..., description="Project end date")
    created_at: datetime = Field(..., description="When the schedule was created")
    updated_at: datetime = Field(..., description="When the schedule was last updated")
    version: int = Field(default=1, description="Schedule version")
    manual_adjustments: dict[str, Any] = Field(
        default_factory=dict, description="Applied manual adjustments"
    )

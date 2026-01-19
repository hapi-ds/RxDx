"""Pydantic schemas for Project Scheduling"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class ResourceBase(BaseModel):
    """Base schema for a resource"""
    
    id: str = Field(..., description="Unique resource identifier")
    name: str = Field(..., min_length=1, max_length=200, description="Resource name")
    capacity: int = Field(..., ge=1, description="Resource capacity (units available)")
    
    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Resource ID cannot be empty")
        return v.strip()


class ResourceCreate(ResourceBase):
    """Schema for creating a resource"""
    pass


class ResourceResponse(ResourceBase):
    """Schema for resource response"""
    pass


class TaskDependency(BaseModel):
    """Schema for task dependency"""
    
    predecessor_id: str = Field(..., description="ID of the predecessor task")
    dependency_type: Literal["finish_to_start", "start_to_start", "finish_to_finish"] = Field(
        default="finish_to_start",
        description="Type of dependency relationship"
    )
    lag: int = Field(default=0, ge=0, description="Lag time in hours")


class ScheduleTaskBase(BaseModel):
    """Base schema for a schedulable task"""
    
    id: str = Field(..., description="Unique task identifier")
    title: str = Field(..., min_length=1, max_length=500, description="Task title")
    estimated_hours: int = Field(..., ge=1, description="Estimated duration in hours")
    dependencies: List[TaskDependency] = Field(default_factory=list, description="Task dependencies")
    required_resources: List[str] = Field(default_factory=list, description="List of required resource IDs")
    resource_demand: Dict[str, int] = Field(
        default_factory=dict, 
        description="Resource demand per resource ID (default is 1)"
    )
    earliest_start: Optional[datetime] = Field(None, description="Earliest possible start time")
    deadline: Optional[datetime] = Field(None, description="Task deadline")
    priority: int = Field(default=1, ge=1, le=5, description="Task priority (1=lowest, 5=highest)")
    
    @field_validator("id")
    @classmethod
    def validate_id(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Task ID cannot be empty")
        return v.strip()


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
    assigned_resources: List[str] = Field(default_factory=list, description="Assigned resource IDs")


class ScheduleConstraints(BaseModel):
    """Schema for schedule constraints"""
    
    project_start: Optional[datetime] = Field(None, description="Project start date")
    project_deadline: Optional[datetime] = Field(None, description="Project deadline")
    horizon_days: int = Field(default=365, ge=1, le=3650, description="Planning horizon in days")
    working_hours_per_day: int = Field(default=8, ge=1, le=24, description="Working hours per day")
    respect_weekends: bool = Field(default=True, description="Whether to skip weekends")


class ScheduleConflict(BaseModel):
    """Schema for a scheduling conflict"""
    
    conflict_type: str = Field(..., description="Type of conflict")
    description: str = Field(..., description="Conflict description")
    affected_tasks: List[str] = Field(default_factory=list, description="IDs of affected tasks")
    affected_resources: List[str] = Field(default_factory=list, description="IDs of affected resources")
    suggestion: Optional[str] = Field(None, description="Suggested resolution")


class ScheduleRequest(BaseModel):
    """Schema for schedule calculation request"""
    
    project_id: UUID = Field(..., description="Project identifier")
    tasks: List[ScheduleTaskCreate] = Field(..., min_length=1, description="Tasks to schedule")
    resources: List[ResourceCreate] = Field(default_factory=list, description="Available resources")
    constraints: ScheduleConstraints = Field(default_factory=ScheduleConstraints, description="Schedule constraints")
    
    @field_validator("tasks")
    @classmethod
    def validate_tasks(cls, v: List[ScheduleTaskCreate]) -> List[ScheduleTaskCreate]:
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
        ..., 
        description="Schedule calculation status"
    )
    project_id: UUID = Field(..., description="Project identifier")
    schedule: List[ScheduledTask] = Field(default_factory=list, description="Scheduled tasks")
    project_duration_hours: Optional[int] = Field(None, description="Total project duration in hours")
    project_start_date: Optional[datetime] = Field(None, description="Project start date")
    project_end_date: Optional[datetime] = Field(None, description="Project end date")
    conflicts: List[ScheduleConflict] = Field(default_factory=list, description="Identified conflicts")
    message: Optional[str] = Field(None, description="Additional message or error details")
    calculated_at: datetime = Field(default_factory=datetime.utcnow, description="When the schedule was calculated")


class ScheduleUpdate(BaseModel):
    """Schema for manual schedule adjustments"""
    
    task_adjustments: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict,
        description="Manual adjustments per task ID (e.g., {'task_id': {'start_date': '...'}})"
    )
    preserve_dependencies: bool = Field(
        default=True, 
        description="Whether to preserve dependency constraints"
    )
    recalculate_downstream: bool = Field(
        default=True,
        description="Whether to recalculate downstream tasks"
    )


class ProjectSchedule(BaseModel):
    """Schema for stored project schedule"""
    
    project_id: UUID = Field(..., description="Project identifier")
    schedule: List[ScheduledTask] = Field(..., description="Scheduled tasks")
    resources: List[ResourceResponse] = Field(default_factory=list, description="Resources used")
    constraints: ScheduleConstraints = Field(..., description="Applied constraints")
    project_duration_hours: int = Field(..., description="Total project duration")
    project_start_date: datetime = Field(..., description="Project start date")
    project_end_date: datetime = Field(..., description="Project end date")
    created_at: datetime = Field(..., description="When the schedule was created")
    updated_at: datetime = Field(..., description="When the schedule was last updated")
    version: int = Field(default=1, description="Schedule version")
    manual_adjustments: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Applied manual adjustments"
    )

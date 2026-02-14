"""
Project Scheduling API endpoints.

This module provides REST API endpoints for project scheduling using constraint
programming with OR-Tools as per Requirement 7 (Offline Project Scheduling).
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.security import Permission, require_permission
from app.models.user import User
from app.schemas.schedule import (
    GanttChartData,
    ProjectSchedule,
    ScheduleRequest,
    ScheduleResponse,
    ScheduleUpdate,
)
from app.services.scheduler_service import SchedulerService, get_scheduler_service

router = APIRouter()


# ============================================================================
# Schedule Calculation Endpoints (13.2.1)
# ============================================================================

@router.post("/calculate", response_model=ScheduleResponse, status_code=status.HTTP_200_OK)
@require_permission(Permission.WRITE_WORKITEM)
async def calculate_schedule(
    request: ScheduleRequest,
    scheduler_service: SchedulerService = Depends(get_scheduler_service),
    current_user: User = Depends(get_current_user),
) -> ScheduleResponse:
    """
    Calculate project schedule using constraint programming.

    This endpoint uses Google OR-Tools to solve the project scheduling problem
    with the following features:

    - **Task Dependencies**: Supports finish-to-start, start-to-start, and finish-to-finish
    - **Resource Constraints**: Respects resource capacity limits
    - **Optimization**: Minimizes total project duration
    - **Conflict Detection**: Identifies scheduling conflicts when no solution exists

    Request body:
    - **project_id**: Unique project identifier
    - **tasks**: List of tasks to schedule with:
        - id: Unique task identifier
        - title: Task title
        - estimated_hours: Duration in hours
        - dependencies: List of predecessor tasks with dependency type
        - required_resources: List of resource IDs needed
        - resource_demand: Resource units needed per resource
        - earliest_start: Optional earliest start constraint
        - deadline: Optional task deadline
        - priority: Task priority (1-5)
    - **resources**: List of available resources with:
        - id: Resource identifier
        - name: Resource name
        - capacity: Available capacity units
    - **constraints**: Project-level constraints:
        - project_start: Project start date
        - project_deadline: Project deadline
        - horizon_days: Planning horizon in days
        - working_hours_per_day: Working hours per day
        - respect_weekends: Whether to skip weekends

    Returns:
    - **status**: success, feasible, infeasible, or error
    - **schedule**: List of scheduled tasks with start/end dates
    - **project_duration_hours**: Total project duration
    - **conflicts**: List of identified conflicts (if infeasible)
    """
    try:
        return await scheduler_service.schedule_project(
            project_id=request.project_id,
            tasks=request.tasks,
            resources=request.resources,
            constraints=request.constraints,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Schedule calculation failed: {str(e)}"
        )


# ============================================================================
# Schedule Retrieval Endpoint (13.2.2)
# ============================================================================

@router.get("/{project_id}", response_model=ProjectSchedule)
@require_permission(Permission.READ_WORKITEM)
async def get_schedule(
    project_id: UUID,
    scheduler_service: SchedulerService = Depends(get_scheduler_service),
    current_user: User = Depends(get_current_user),
) -> ProjectSchedule:
    """
    Get the stored schedule for a project.

    - **project_id**: Project UUID

    Returns the complete project schedule including:
    - Scheduled tasks with start/end dates
    - Resources used
    - Applied constraints
    - Project duration and dates
    - Version and manual adjustments

    Raises 404 if no schedule exists for the project.
    """
    schedule = await scheduler_service.get_schedule(project_id)

    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No schedule found for project {project_id}"
        )

    return schedule


# ============================================================================
# Schedule Update Endpoint (13.2.3)
# ============================================================================

@router.patch("/{project_id}", response_model=ScheduleResponse)
@require_permission(Permission.WRITE_WORKITEM)
async def update_schedule(
    project_id: UUID,
    updates: ScheduleUpdate,
    scheduler_service: SchedulerService = Depends(get_scheduler_service),
    current_user: User = Depends(get_current_user),
) -> ScheduleResponse:
    """
    Apply manual adjustments to a project schedule.

    - **project_id**: Project UUID

    Request body:
    - **task_adjustments**: Dictionary of task ID to adjustments:
        - start_date: New start date (ISO format)
        - end_date: New end date (ISO format)
    - **preserve_dependencies**: Whether to maintain dependency constraints
    - **recalculate_downstream**: Whether to recalculate affected downstream tasks

    Example:
    ```json
    {
        "task_adjustments": {
            "task-1": {"start_date": "2024-02-01T09:00:00Z"},
            "task-2": {"end_date": "2024-02-15T17:00:00Z"}
        },
        "preserve_dependencies": true,
        "recalculate_downstream": true
    }
    ```

    Returns the updated schedule with new version number.

    Raises 404 if no schedule exists for the project.
    """
    result = await scheduler_service.update_schedule(project_id, updates)

    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No schedule found for project {project_id}"
        )

    return result



# ============================================================================
# Gantt Chart Data Endpoint (Requirement 3)
# ============================================================================

@router.get("/{project_id}/gantt", response_model=GanttChartData)
@require_permission(Permission.READ_WORKITEM)
async def get_gantt_chart_data(
    project_id: UUID,
    scheduler_service: SchedulerService = Depends(get_scheduler_service),
    current_user: User = Depends(get_current_user),
) -> GanttChartData:
    """
    Get Gantt chart visualization data for a project.

    This endpoint returns formatted data for Gantt chart visualization including:
    - Scheduled tasks with start/end dates
    - Task dependencies with relationship types
    - Critical path task IDs
    - Milestones with target dates and dependencies
    - Sprint boundaries with dates
    - Resource assignments for each task
    - Project completion percentage

    **Requirements**: 3.1-3.13

    - **project_id**: Project UUID

    Returns:
    - **tasks**: List of scheduled tasks with dates and resource assignments
    - **dependencies**: Task dependencies with types (finish-to-start, etc.)
    - **critical_path**: List of task IDs on the critical path
    - **milestones**: Milestones with target dates and dependent tasks
    - **sprints**: Sprint boundaries with start/end dates
    - **project_start_date**: Overall project start date
    - **project_end_date**: Overall project end date
    - **completion_percentage**: Percentage of completed tasks

    Returns empty data structure if no schedule exists for the project.
    """
    gantt_data = await scheduler_service.get_gantt_chart_data(project_id)

    if not gantt_data:
        # Return empty Gantt chart data instead of 404
        from datetime import datetime
        return GanttChartData(
            project_id=project_id,
            tasks=[],
            workpackages=[],
            phases=[],
            dependencies=[],
            critical_path=[],
            milestones=[],
            sprints=[],
            project_start_date=datetime.now(),
            project_end_date=datetime.now(),
            completion_percentage=0.0,
        )

    return gantt_data

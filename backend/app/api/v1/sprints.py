"""API endpoints for Sprint operations"""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.core.security import Permission, require_permission
from app.db.graph import GraphService, get_graph_service
from app.models.user import User
from app.schemas.sprint import (
    BurndownPoint,
    SprintCreate,
    SprintResponse,
    SprintUpdate,
    SprintVelocity,
)
from app.services.sprint_service import SprintService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sprints", tags=["sprints"])


def get_sprint_service(
    graph_service: GraphService = Depends(get_graph_service)
) -> SprintService:
    """Dependency for getting sprint service"""
    return SprintService(graph_service)


@router.post(
    "",
    response_model=SprintResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new sprint",
    description="Create a new sprint for a project with start/end dates and capacity"
)
@require_permission(Permission.WRITE_WORKITEM)
async def create_sprint(
    sprint_data: SprintCreate,
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> SprintResponse:
    """
    Create a new sprint.

    Args:
        sprint_data: Sprint creation data
        current_user: Authenticated user
        service: Sprint service

    Returns:
        Created sprint with metadata

    Raises:
        HTTPException: 400 if validation fails or active sprint exists
        HTTPException: 401 if not authenticated
    """
    try:
        sprint = await service.create_sprint(sprint_data, current_user)
        logger.info(
            f"User {current_user.id} created sprint {sprint.id} "
            f"for project {sprint_data.project_id}"
        )
        return sprint
    except ValueError as e:
        logger.error(f"Sprint creation validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Sprint creation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create sprint"
        )


@router.get(
    "",
    response_model=list[SprintResponse],
    summary="List sprints",
    description="List sprints with optional filters for project and status"
)
@require_permission(Permission.READ_WORKITEM)
async def list_sprints(
    project_id: UUID | None = Query(None, description="Filter by project ID"),
    sprint_status: str | None = Query(None, description="Filter by status (planning, active, completed, cancelled)", alias="status"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> list[SprintResponse]:
    """
    List sprints with optional filters.

    Args:
        project_id: Optional project ID filter
        sprint_status: Optional status filter
        limit: Maximum number of results
        current_user: Authenticated user
        service: Sprint service

    Returns:
        List of sprints

    Raises:
        HTTPException: 401 if not authenticated
    """
    try:
        sprints = await service.list_sprints(
            project_id=project_id,
            status=sprint_status,
            limit=limit
        )
        return sprints
    except Exception as e:
        logger.exception(f"Sprint list error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list sprints"
        )


@router.get(
    "/{sprint_id}",
    response_model=SprintResponse,
    summary="Get a sprint by ID",
    description="Retrieve a sprint by its UUID"
)
@require_permission(Permission.READ_WORKITEM)
async def get_sprint(
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> SprintResponse:
    """
    Get a sprint by ID.

    Args:
        sprint_id: Sprint UUID
        current_user: Authenticated user
        service: Sprint service

    Returns:
        Sprint data

    Raises:
        HTTPException: 404 if sprint not found
        HTTPException: 401 if not authenticated
    """
    sprint = await service.get_sprint(sprint_id)

    if not sprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sprint {sprint_id} not found"
        )

    return sprint


@router.patch(
    "/{sprint_id}",
    response_model=SprintResponse,
    summary="Update a sprint",
    description="Update sprint details such as name, dates, capacity, or status"
)
@require_permission(Permission.WRITE_WORKITEM)
async def update_sprint(
    sprint_id: UUID,
    updates: SprintUpdate,
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> SprintResponse:
    """
    Update a sprint.

    Args:
        sprint_id: Sprint UUID
        updates: Update data
        current_user: Authenticated user
        service: Sprint service

    Returns:
        Updated sprint

    Raises:
        HTTPException: 404 if sprint not found
        HTTPException: 400 if validation fails or trying to activate when another sprint is active
        HTTPException: 401 if not authenticated
    """
    try:
        sprint = await service.update_sprint(sprint_id, updates, current_user)

        if not sprint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sprint {sprint_id} not found"
            )

        logger.info(f"User {current_user.id} updated sprint {sprint_id}")
        return sprint
    except ValueError as e:
        logger.error(f"Sprint update validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Sprint update error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update sprint"
        )


@router.delete(
    "/{sprint_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a sprint",
    description="Delete a sprint and move all tasks back to backlog"
)
@require_permission(Permission.DELETE_WORKITEM)
async def delete_sprint(
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> None:
    """
    Delete a sprint.

    Args:
        sprint_id: Sprint UUID
        current_user: Authenticated user
        service: Sprint service

    Raises:
        HTTPException: 404 if sprint not found
        HTTPException: 401 if not authenticated
    """
    try:
        deleted = await service.delete_sprint(sprint_id)

        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sprint {sprint_id} not found"
            )

        logger.info(f"User {current_user.id} deleted sprint {sprint_id}")
    except Exception as e:
        logger.exception(f"Sprint deletion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete sprint"
        )


@router.get(
    "/{sprint_id}/tasks",
    response_model=list[dict],
    summary="Get sprint tasks",
    description="Get all tasks assigned to a sprint"
)
@require_permission(Permission.READ_WORKITEM)
async def get_sprint_tasks(
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> list[dict]:
    """
    Get all tasks assigned to a sprint.

    Args:
        sprint_id: Sprint UUID
        current_user: Authenticated user
        service: Sprint service

    Returns:
        List of tasks

    Raises:
        HTTPException: 404 if sprint not found
        HTTPException: 401 if not authenticated
    """
    # Verify sprint exists
    sprint = await service.get_sprint(sprint_id)
    if not sprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sprint {sprint_id} not found"
        )

    try:
        # Query tasks assigned to this sprint
        query = f"""
        MATCH (t:WorkItem {{type: 'task'}})-[:ASSIGNED_TO_SPRINT]->(s:Sprint {{id: '{sprint_id}'}})
        RETURN t
        ORDER BY t.priority DESC, t.created_at ASC
        """
        results = await service.graph_service.execute_query(query)

        tasks = []
        for result in results:
            task_data = result
            if 'properties' in task_data:
                task_data = task_data['properties']
            tasks.append(task_data)

        return tasks
    except Exception as e:
        logger.exception(f"Get sprint tasks error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get sprint tasks"
        )


@router.post(
    "/{sprint_id}/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Assign task to sprint",
    description="Assign a task to a sprint (removes from backlog)"
)
@require_permission(Permission.WRITE_WORKITEM)
async def assign_task_to_sprint(
    sprint_id: UUID,
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> None:
    """
    Assign a task to a sprint.

    Args:
        sprint_id: Sprint UUID
        task_id: Task UUID
        current_user: Authenticated user
        service: Sprint service

    Raises:
        HTTPException: 404 if sprint or task not found
        HTTPException: 400 if capacity exceeded
        HTTPException: 401 if not authenticated
    """
    try:
        await service.assign_task_to_sprint(sprint_id, task_id, current_user)
        logger.info(
            f"User {current_user.id} assigned task {task_id} to sprint {sprint_id}"
        )
    except ValueError as e:
        logger.error(f"Task assignment validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Task assignment error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign task to sprint"
        )


@router.delete(
    "/{sprint_id}/tasks/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove task from sprint",
    description="Remove a task from a sprint (returns to backlog)"
)
@require_permission(Permission.WRITE_WORKITEM)
async def remove_task_from_sprint(
    sprint_id: UUID,
    task_id: UUID,
    return_to_backlog: bool = Query(True, description="Whether to return task to backlog"),
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> None:
    """
    Remove a task from a sprint.

    Args:
        sprint_id: Sprint UUID
        task_id: Task UUID
        return_to_backlog: Whether to return task to backlog
        current_user: Authenticated user
        service: Sprint service

    Raises:
        HTTPException: 404 if sprint or task not found
        HTTPException: 401 if not authenticated
    """
    try:
        result = await service.remove_task_from_sprint(
            sprint_id, task_id, return_to_backlog
        )

        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task {task_id} not found in sprint {sprint_id}"
            )

        logger.info(
            f"User {current_user.id} removed task {task_id} from sprint {sprint_id}"
        )
    except ValueError as e:
        logger.error(f"Task removal validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Task removal error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove task from sprint"
        )


@router.post(
    "/{sprint_id}/start",
    response_model=SprintResponse,
    summary="Start a sprint",
    description="Start a sprint by changing its status to active"
)
@require_permission(Permission.WRITE_WORKITEM)
async def start_sprint(
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> SprintResponse:
    """
    Start a sprint.

    Args:
        sprint_id: Sprint UUID
        current_user: Authenticated user
        service: Sprint service

    Returns:
        Updated sprint with active status

    Raises:
        HTTPException: 404 if sprint not found
        HTTPException: 400 if another sprint is already active
        HTTPException: 401 if not authenticated
    """
    try:
        sprint = await service.start_sprint(sprint_id, current_user)

        if not sprint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sprint {sprint_id} not found"
            )

        logger.info(f"User {current_user.id} started sprint {sprint_id}")
        return sprint
    except ValueError as e:
        logger.error(f"Sprint start validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception(f"Sprint start error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to start sprint"
        )


@router.post(
    "/{sprint_id}/complete",
    response_model=SprintResponse,
    summary="Complete a sprint",
    description="Complete a sprint and calculate velocity"
)
@require_permission(Permission.WRITE_WORKITEM)
async def complete_sprint(
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> SprintResponse:
    """
    Complete a sprint.

    Args:
        sprint_id: Sprint UUID
        current_user: Authenticated user
        service: Sprint service

    Returns:
        Updated sprint with completed status and velocity

    Raises:
        HTTPException: 404 if sprint not found
        HTTPException: 401 if not authenticated
    """
    try:
        sprint = await service.complete_sprint(sprint_id, current_user)

        if not sprint:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Sprint {sprint_id} not found"
            )

        logger.info(
            f"User {current_user.id} completed sprint {sprint_id} "
            f"with velocity {sprint.actual_velocity_hours}h / "
            f"{sprint.actual_velocity_story_points}pts"
        )
        return sprint
    except Exception as e:
        logger.exception(f"Sprint completion error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete sprint"
        )


@router.get(
    "/{sprint_id}/velocity",
    response_model=SprintVelocity,
    summary="Get sprint velocity",
    description="Get velocity metrics for a sprint"
)
@require_permission(Permission.READ_WORKITEM)
async def get_sprint_velocity(
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> SprintVelocity:
    """
    Get sprint velocity.

    Args:
        sprint_id: Sprint UUID
        current_user: Authenticated user
        service: Sprint service

    Returns:
        Sprint velocity metrics

    Raises:
        HTTPException: 404 if sprint not found
        HTTPException: 401 if not authenticated
    """
    sprint = await service.get_sprint(sprint_id)

    if not sprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sprint {sprint_id} not found"
        )

    return SprintVelocity(
        sprint_id=sprint_id,
        sprint_name=sprint.name,
        actual_velocity_hours=sprint.actual_velocity_hours,
        actual_velocity_story_points=sprint.actual_velocity_story_points,
        capacity_hours=sprint.capacity_hours,
        capacity_story_points=sprint.capacity_story_points,
        completion_percentage_hours=(
            (sprint.actual_velocity_hours / sprint.capacity_hours * 100)
            if sprint.capacity_hours and sprint.capacity_hours > 0
            else None
        ),
        completion_percentage_points=(
            (sprint.actual_velocity_story_points / sprint.capacity_story_points * 100)
            if sprint.capacity_story_points and sprint.capacity_story_points > 0
            else None
        )
    )


@router.get(
    "/{sprint_id}/burndown",
    response_model=list[BurndownPoint],
    summary="Get sprint burndown chart data",
    description="Get daily burndown data for a sprint including ideal and actual remaining work"
)
@require_permission(Permission.READ_WORKITEM)
async def get_sprint_burndown(
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> list[BurndownPoint]:
    """
    Get sprint burndown chart data.

    Returns daily burndown data points showing:
    - Ideal remaining work (linear decrease)
    - Actual remaining work (based on task completion)
    - Both in hours and story points

    Args:
        sprint_id: Sprint UUID
        current_user: Authenticated user
        service: Sprint service

    Returns:
        List of burndown data points, one per day of the sprint

    Raises:
        HTTPException: 404 if sprint not found
        HTTPException: 401 if not authenticated
    """
    sprint = await service.get_sprint(sprint_id)

    if not sprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sprint {sprint_id} not found"
        )

    burndown = await service.calculate_burndown(sprint_id)

    return burndown


@router.get(
    "/{sprint_id}/statistics",
    response_model=dict,
    summary="Get sprint statistics",
    description="Get comprehensive statistics for a sprint"
)
@require_permission(Permission.READ_WORKITEM)
async def get_sprint_statistics(
    sprint_id: UUID,
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> dict:
    """
    Get sprint statistics.

    Args:
        sprint_id: Sprint UUID
        current_user: Authenticated user
        service: Sprint service

    Returns:
        Sprint statistics including task counts, completion rate, etc.

    Raises:
        HTTPException: 404 if sprint not found
        HTTPException: 401 if not authenticated
    """
    sprint = await service.get_sprint(sprint_id)

    if not sprint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sprint {sprint_id} not found"
        )

    try:
        # Query sprint statistics
        stats_query = f"""
        MATCH (t:WorkItem {{type: 'task'}})-[:ASSIGNED_TO_SPRINT]->(s:Sprint {{id: '{sprint_id}'}})
        RETURN
            count(t) as total_tasks,
            count(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
            count(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
            count(CASE WHEN t.status = 'ready' THEN 1 END) as ready_tasks,
            sum(coalesce(t.estimated_hours, 0.0)) as total_estimated_hours,
            sum(CASE WHEN t.status = 'completed' THEN coalesce(t.estimated_hours, 0.0) ELSE 0 END) as completed_hours,
            sum(coalesce(t.story_points, 0)) as total_story_points,
            sum(CASE WHEN t.status = 'completed' THEN coalesce(t.story_points, 0) ELSE 0 END) as completed_points
        """
        results = await service.graph_service.execute_query(stats_query)

        if not results:
            stats = {
                "total_tasks": 0,
                "completed_tasks": 0,
                "in_progress_tasks": 0,
                "ready_tasks": 0,
                "total_estimated_hours": 0.0,
                "completed_hours": 0.0,
                "total_story_points": 0,
                "completed_points": 0,
                "completion_rate": 0.0
            }
        else:
            result = results[0]
            total_tasks = result.get('total_tasks', 0) or 0
            completed_tasks = result.get('completed_tasks', 0) or 0

            stats = {
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "in_progress_tasks": result.get('in_progress_tasks', 0) or 0,
                "ready_tasks": result.get('ready_tasks', 0) or 0,
                "total_estimated_hours": result.get('total_estimated_hours', 0.0) or 0.0,
                "completed_hours": result.get('completed_hours', 0.0) or 0.0,
                "total_story_points": result.get('total_story_points', 0) or 0,
                "completed_points": result.get('completed_points', 0) or 0,
                "completion_rate": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0.0
            }

        # Add sprint metadata
        stats["sprint_id"] = str(sprint_id)
        stats["sprint_name"] = sprint.name
        stats["sprint_status"] = sprint.status
        stats["start_date"] = sprint.start_date.isoformat()
        stats["end_date"] = sprint.end_date.isoformat()
        stats["capacity_hours"] = sprint.capacity_hours
        stats["capacity_story_points"] = sprint.capacity_story_points
        stats["actual_velocity_hours"] = sprint.actual_velocity_hours
        stats["actual_velocity_story_points"] = sprint.actual_velocity_story_points

        return stats
    except Exception as e:
        logger.exception(f"Get sprint statistics error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get sprint statistics"
        )



# Project-scoped sprint routes
project_router = APIRouter(prefix="/projects/{project_id}/sprints", tags=["sprints", "projects"])


@project_router.post(
    "",
    response_model=SprintResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a sprint for a project",
    description="Create a new sprint for a specific project"
)
@require_permission(Permission.WRITE_WORKITEM)
async def create_project_sprint(
    project_id: UUID,
    sprint_data: SprintCreate,
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> SprintResponse:
    """
    Create a new sprint for a project.

    Args:
        project_id: Project UUID
        sprint_data: Sprint creation data
        current_user: Authenticated user
        service: Sprint service

    Returns:
        Created sprint with metadata

    Raises:
        HTTPException: 400 if validation fails or project_id mismatch
        HTTPException: 401 if not authenticated
    """
    # Ensure project_id matches
    if sprint_data.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Project ID in URL must match project ID in request body"
        )

    return await create_sprint(sprint_data, current_user, service)


@project_router.get(
    "",
    response_model=list[SprintResponse],
    summary="List sprints for a project",
    description="List all sprints for a specific project"
)
@require_permission(Permission.READ_WORKITEM)
async def list_project_sprints(
    project_id: UUID,
    sprint_status: str | None = Query(None, description="Filter by status", alias="status"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> list[SprintResponse]:
    """
    List sprints for a project.

    Args:
        project_id: Project UUID
        sprint_status: Optional status filter
        limit: Maximum number of results
        current_user: Authenticated user
        service: Sprint service

    Returns:
        List of sprints for the project

    Raises:
        HTTPException: 401 if not authenticated
    """
    return await list_sprints(project_id, sprint_status, limit, current_user, service)



@project_router.get(
    "/velocity",
    response_model=dict,
    summary="Get project average velocity",
    description="Get average velocity across recent sprints for a project"
)
@require_permission(Permission.READ_WORKITEM)
async def get_project_velocity(
    project_id: UUID,
    num_sprints: int = Query(3, ge=1, le=10, description="Number of recent sprints to average"),
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> dict:
    """
    Get project average velocity.

    Calculates average velocity from the last N completed sprints.
    Useful for sprint planning and capacity estimation.

    Args:
        project_id: Project UUID
        num_sprints: Number of recent sprints to average (default: 3)
        current_user: Authenticated user
        service: Sprint service

    Returns:
        Dictionary with average velocity metrics:
        - project_id: Project UUID
        - num_sprints_analyzed: Number of sprints included in calculation
        - avg_velocity_hours: Average completed hours per sprint
        - avg_velocity_story_points: Average completed story points per sprint

    Raises:
        HTTPException: 401 if not authenticated
    """
    avg_hours, avg_points = await service.get_team_average_velocity(
        project_id=project_id,
        num_sprints=num_sprints
    )

    return {
        "project_id": str(project_id),
        "num_sprints_analyzed": num_sprints,
        "avg_velocity_hours": avg_hours,
        "avg_velocity_story_points": avg_points
    }


@project_router.get(
    "/velocity/history",
    response_model=list[dict],
    summary="Get project velocity history",
    description="Get velocity history for all completed sprints in a project"
)
@require_permission(Permission.READ_WORKITEM)
async def get_project_velocity_history(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    service: SprintService = Depends(get_sprint_service)
) -> list[dict]:
    """
    Get project velocity history.

    Returns velocity data for all completed sprints in the project,
    ordered by sprint end date (most recent first).

    Args:
        project_id: Project UUID
        current_user: Authenticated user
        service: Sprint service

    Returns:
        List of velocity records, each containing:
        - sprint_id: Sprint UUID
        - sprint_name: Sprint name
        - start_date: Sprint start date
        - end_date: Sprint end date
        - velocity_hours: Completed hours in sprint
        - velocity_story_points: Completed story points in sprint

    Raises:
        HTTPException: 401 if not authenticated
    """
    # Get all completed sprints for the project
    sprints = await service.list_sprints(
        project_id=project_id,
        status="completed",
        limit=1000
    )

    # Build velocity history
    history = []
    for sprint in sprints:
        history.append({
            "sprint_id": str(sprint.id),
            "sprint_name": sprint.name,
            "start_date": sprint.start_date.isoformat(),
            "end_date": sprint.end_date.isoformat(),
            "velocity_hours": sprint.actual_velocity_hours,
            "velocity_story_points": sprint.actual_velocity_story_points
        })

    # Sort by end date descending (most recent first)
    history.sort(key=lambda x: x["end_date"], reverse=True)

    return history

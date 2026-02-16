"""Time Tracking API endpoints for graph database-based time tracking"""

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.db.graph import get_graph_service, GraphService
from app.models.user import User
from app.schemas.worked import (
    ActiveTrackingResponse,
    StartTrackingRequest,
    StopTrackingRequest,
    WorkedCreate,
    WorkedListResponse,
    WorkedResponse,
    WorkedSummary,
    WorkedUpdate,
)
from app.services.time_tracking_service import TimeTrackingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/time-tracking", tags=["time-tracking"])


def get_time_tracking_service(
    graph_service: GraphService = Depends(get_graph_service),
) -> TimeTrackingService:
    """Dependency for getting TimeTrackingService"""
    return TimeTrackingService(graph_service)


@router.post(
    "/start",
    response_model=WorkedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start time tracking for a task",
    description="Start tracking time for a task. Creates a worked node with start time.",
)
async def start_time_tracking(
    request: StartTrackingRequest,
    current_user: User = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
) -> WorkedResponse:
    """
    Start time tracking for a task.

    Args:
        request: Start tracking request with task_id and optional description
        current_user: Authenticated user
        service: Time tracking service

    Returns:
        Created worked entry with start time

    Raises:
        HTTPException: 400 if user already has active tracking or task not found
        HTTPException: 401 if not authenticated
    """
    try:
        result = await service.start_time_tracking(
            task_id=request.task_id,
            current_user=current_user,
            description=request.description,
        )

        logger.info(
            "Started time tracking via API",
            extra={
                "user_id": str(current_user.id),
                "task_id": str(request.task_id),
                "worked_id": str(result.id),
            },
        )

        return result

    except ValueError as e:
        logger.warning(
            "Failed to start time tracking",
            extra={
                "user_id": str(current_user.id),
                "task_id": str(request.task_id),
                "error": str(e),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/stop",
    response_model=WorkedResponse,
    summary="Stop time tracking",
    description="Stop active time tracking. Updates worked node with end time.",
)
async def stop_time_tracking(
    request: StopTrackingRequest,
    current_user: User = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
) -> WorkedResponse:
    """
    Stop time tracking.

    Args:
        request: Stop tracking request with worked_id
        current_user: Authenticated user
        service: Time tracking service

    Returns:
        Updated worked entry with end time

    Raises:
        HTTPException: 400 if worked entry not found or already stopped
        HTTPException: 401 if not authenticated
        HTTPException: 403 if trying to stop another user's tracking
    """
    try:
        result = await service.stop_time_tracking(
            worked_id=request.worked_id,
            current_user=current_user,
        )

        logger.info(
            "Stopped time tracking via API",
            extra={
                "user_id": str(current_user.id),
                "worked_id": str(request.worked_id),
            },
        )

        return result

    except ValueError as e:
        error_msg = str(e).lower()

        if "not found" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        elif "another user" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e),
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )


@router.get(
    "/active",
    response_model=ActiveTrackingResponse,
    summary="Get active time tracking entries",
    description="Get currently running time entries for the authenticated user.",
)
async def get_active_tracking(
    current_user: User = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
) -> ActiveTrackingResponse:
    """
    Get active time tracking entries for user.

    Args:
        current_user: Authenticated user
        service: Time tracking service

    Returns:
        List of active worked entries

    Raises:
        HTTPException: 401 if not authenticated
    """
    entries = await service.get_active_tracking(current_user)

    return ActiveTrackingResponse(
        entries=entries,
        count=len(entries),
    )


@router.get(
    "/task/{task_id}",
    response_model=WorkedSummary,
    summary="Get time tracking summary for a task",
    description="Get total worked hours and entry count for a specific task.",
)
async def get_task_time_summary(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    graph_service: GraphService = Depends(get_graph_service),
) -> WorkedSummary:
    """
    Get time tracking summary for a task.

    Args:
        task_id: Task UUID
        current_user: Authenticated user
        service: Time tracking service
        graph_service: Graph service

    Returns:
        Worked time summary with total hours and entry count

    Raises:
        HTTPException: 404 if task not found
        HTTPException: 401 if not authenticated
    """
    try:
        # Get total hours
        total_hours = await service.get_task_worked_sum(task_id)

        # Get worked entries to count them and find last worked
        worked_entries = await graph_service.get_worked_entries_for_task(str(task_id))

        # Find most recent work
        last_worked = None
        if worked_entries:
            # Sort by date and time
            sorted_entries = sorted(
                worked_entries,
                key=lambda x: (x.get("date", ""), x.get("from", "")),
                reverse=True,
            )
            if sorted_entries:
                last_entry = sorted_entries[0]
                # Construct datetime from date and time
                from datetime import datetime

                date_str = last_entry.get("date")
                time_str = last_entry.get("from")
                if date_str and time_str:
                    last_worked = datetime.fromisoformat(f"{date_str}T{time_str}")

        return WorkedSummary(
            task_id=task_id,
            total_hours=total_hours,
            entry_count=len(worked_entries),
            last_worked=last_worked,
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


@router.post(
    "/entries",
    response_model=WorkedResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Manually add a time entry",
    description="Add a completed time entry with start and end times.",
)
async def add_time_entry(
    entry_data: WorkedCreate,
    current_user: User = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
) -> WorkedResponse:
    """
    Manually add a completed time entry.

    Args:
        entry_data: Time entry data with start and end times
        current_user: Authenticated user
        service: Time tracking service

    Returns:
        Created worked entry

    Raises:
        HTTPException: 400 if validation fails or task not found
        HTTPException: 401 if not authenticated
    """
    try:
        result = await service.add_time_entry(
            entry_data=entry_data,
            current_user=current_user,
        )

        logger.info(
            "Added time entry via API",
            extra={
                "user_id": str(current_user.id),
                "task_id": str(entry_data.task_id),
                "worked_id": str(result.id),
            },
        )

        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.patch(
    "/entries/{worked_id}",
    response_model=WorkedResponse,
    summary="Update a time entry",
    description="Edit an existing time entry (end time and description).",
)
async def update_time_entry(
    worked_id: UUID,
    updates: WorkedUpdate,
    current_user: User = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
) -> WorkedResponse:
    """
    Update an existing time entry.

    Args:
        worked_id: Worked entry UUID
        updates: Update data
        current_user: Authenticated user
        service: Time tracking service

    Returns:
        Updated worked entry

    Raises:
        HTTPException: 404 if worked entry not found
        HTTPException: 403 if trying to update another user's entry
        HTTPException: 401 if not authenticated
    """
    try:
        result = await service.update_time_entry(
            worked_id=worked_id,
            updates=updates,
            current_user=current_user,
        )

        logger.info(
            "Updated time entry via API",
            extra={
                "user_id": str(current_user.id),
                "worked_id": str(worked_id),
            },
        )

        return result

    except ValueError as e:
        error_msg = str(e).lower()

        if "not found" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
        elif "another user" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e),
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )


@router.delete(
    "/entries/{worked_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a time entry",
    description="Delete a time entry. Only the owner can delete their entries.",
)
async def delete_time_entry(
    worked_id: UUID,
    current_user: User = Depends(get_current_user),
    graph_service: GraphService = Depends(get_graph_service),
) -> None:
    """
    Delete a time entry.

    Args:
        worked_id: Worked entry UUID
        current_user: Authenticated user
        graph_service: Graph service

    Raises:
        HTTPException: 404 if worked entry not found
        HTTPException: 403 if trying to delete another user's entry
        HTTPException: 401 if not authenticated
    """
    # Get worked node
    worked_query = f"MATCH (w:Worked {{id: '{str(worked_id)}'}}) RETURN w"
    worked_results = await graph_service.execute_query(worked_query)

    if not worked_results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Worked entry {worked_id} not found",
        )

    worked_data = worked_results[0]["w"]

    # Verify ownership
    if worked_data.get("resource") != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete time entry for another user",
        )

    # Delete the node and its relationships
    delete_query = f"""
    MATCH (w:Worked {{id: '{str(worked_id)}'}})
    DETACH DELETE w
    """
    await graph_service.execute_query(delete_query)

    logger.info(
        "Deleted time entry via API",
        extra={
            "user_id": str(current_user.id),
            "worked_id": str(worked_id),
        },
    )


@router.get(
    "/tasks",
    response_model=list[dict[str, Any]],
    summary="Get sorted task list for user",
    description="Get tasks sorted by: started by user → scheduled next → all others.",
)
async def get_sorted_tasks(
    current_user: User = Depends(get_current_user),
    service: TimeTrackingService = Depends(get_time_tracking_service),
    limit: int = 100,
) -> list[dict[str, Any]]:
    """
    Get sorted task list for user.

    Tasks are sorted in priority order:
    1. Tasks already started by the logged-in user
    2. Tasks scheduled to start next
    3. All other tasks

    Args:
        current_user: Authenticated user
        service: Time tracking service
        limit: Maximum number of tasks to return

    Returns:
        List of tasks sorted by priority for the user

    Raises:
        HTTPException: 401 if not authenticated
    """
    tasks = await service.get_sorted_tasks_for_user(
        current_user=current_user,
        limit=limit,
    )

    return tasks

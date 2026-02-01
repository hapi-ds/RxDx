"""Time Entry API endpoints"""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from fastapi.responses import JSONResponse

from app.api.deps import get_current_user
from app.core.security import Permission, has_permission
from app.models.user import User
from app.schemas.time_entry import (
    TimeAggregationRequest,
    TimeAggregationResponse,
    TimeEntryCreate,
    TimeEntryResponse,
    TimeEntrySyncRequest,
    TimeEntrySyncResponse,
    TimeEntryUpdate,
)
from app.services.audit_service import AuditService, get_audit_service
from app.services.time_service import TimeService, get_time_service

router = APIRouter()


@router.post("/time-entries", response_model=TimeEntryResponse, status_code=http_status.HTTP_201_CREATED)
async def create_time_entry(
    entry_data: TimeEntryCreate,
    current_user: User = Depends(get_current_user),
    time_service: TimeService = Depends(get_time_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Create a new time entry

    Creates a time entry for the current user. The entry can be:
    - Complete: with both start_time and end_time (duration calculated automatically)
    - Running: with only start_time (for tracking ongoing work)

    Categories: development, meeting, review, testing, documentation,
    planning, support, training, administration, other
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to create time entries"
        )

    try:
        # Create the time entry
        entry = await time_service.create_time_entry(
            entry_data=entry_data,
            current_user=current_user
        )

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="CREATE",
            entity_type="TimeEntry",
            entity_id=entry.id,
            details={
                "project_id": str(entry.project_id),
                "task_id": str(entry.task_id) if entry.task_id else None,
                "category": entry.category,
                "duration_hours": float(entry.duration_hours) if entry.duration_hours else None
            }
        )

        return entry

    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating time entry: {str(e)}"
        )


@router.get("/time-entries", response_model=list[TimeEntryResponse])
async def get_time_entries(
    project_id: UUID | None = Query(None, description="Filter by project"),
    task_id: UUID | None = Query(None, description="Filter by task"),
    start_date: datetime | None = Query(None, description="Filter entries starting after this date"),
    end_date: datetime | None = Query(None, description="Filter entries ending before this date"),
    category: str | None = Query(None, description="Filter by category"),
    synced: bool | None = Query(None, description="Filter by sync status"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    current_user: User = Depends(get_current_user),
    time_service: TimeService = Depends(get_time_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Get time entries with optional filtering

    Returns time entries for the current user. Supports filtering by:
    - project_id: Filter by project
    - task_id: Filter by task
    - start_date: Filter entries starting after this date
    - end_date: Filter entries ending before this date
    - category: Filter by category
    - synced: Filter by sync status (true/false)

    Results are ordered by start_time descending (newest first).
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read time entries"
        )

    try:
        entries = await time_service.get_time_entries(
            current_user=current_user,
            project_id=project_id,
            task_id=task_id,
            start_date=start_date,
            end_date=end_date,
            category=category,
            synced=synced,
            limit=limit,
            offset=offset
        )

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="READ",
            entity_type="TimeEntry",
            entity_id=None,
            details={
                "filters": {
                    "project_id": str(project_id) if project_id else None,
                    "task_id": str(task_id) if task_id else None,
                    "start_date": start_date.isoformat() if start_date else None,
                    "end_date": end_date.isoformat() if end_date else None,
                    "category": category,
                    "synced": synced,
                },
                "result_count": len(entries)
            }
        )

        return entries

    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving time entries: {str(e)}"
        )


@router.get("/time-entries/{entry_id}", response_model=TimeEntryResponse)
async def get_time_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    time_service: TimeService = Depends(get_time_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Get a specific time entry by ID

    Returns the time entry if it exists and belongs to the current user.
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to read time entries"
        )

    try:
        entry = await time_service.get_time_entry(entry_id, current_user)

        if not entry:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="READ",
            entity_type="TimeEntry",
            entity_id=entry_id,
            details={
                "project_id": str(entry.project_id),
                "category": entry.category
            }
        )

        return entry

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving time entry: {str(e)}"
        )


@router.patch("/time-entries/{entry_id}", response_model=TimeEntryResponse)
async def update_time_entry(
    entry_id: UUID,
    updates: TimeEntryUpdate,
    current_user: User = Depends(get_current_user),
    time_service: TimeService = Depends(get_time_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Update a time entry

    Updates the specified time entry. Only the fields provided will be updated.
    Duration is automatically recalculated if start_time or end_time changes.
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to update time entries"
        )

    try:
        entry = await time_service.update_time_entry(
            entry_id=entry_id,
            updates=updates,
            current_user=current_user
        )

        if not entry:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="UPDATE",
            entity_type="TimeEntry",
            entity_id=entry_id,
            details={
                "updated_fields": [
                    field for field, value in updates.model_dump(exclude_unset=True).items()
                    if value is not None
                ]
            }
        )

        return entry

    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating time entry: {str(e)}"
        )


@router.delete("/time-entries/{entry_id}", status_code=http_status.HTTP_204_NO_CONTENT)
async def delete_time_entry(
    entry_id: UUID,
    current_user: User = Depends(get_current_user),
    time_service: TimeService = Depends(get_time_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Delete a time entry

    Permanently deletes the specified time entry.
    """
    # Check delete permission
    if not has_permission(current_user.role, Permission.DELETE_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to delete time entries"
        )

    try:
        # Get entry for audit logging before deletion
        entry = await time_service.get_time_entry(entry_id, current_user)
        if not entry:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="Time entry not found"
            )

        success = await time_service.delete_time_entry(entry_id, current_user)

        if not success:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="Time entry could not be deleted"
            )

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="DELETE",
            entity_type="TimeEntry",
            entity_id=entry_id,
            details={
                "project_id": str(entry.project_id),
                "duration_hours": float(entry.duration_hours) if entry.duration_hours else None
            }
        )

        return JSONResponse(
            status_code=http_status.HTTP_204_NO_CONTENT,
            content=None
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting time entry: {str(e)}"
        )


@router.post("/time-entries/sync", response_model=TimeEntrySyncResponse)
async def sync_time_entries(
    sync_request: TimeEntrySyncRequest,
    current_user: User = Depends(get_current_user),
    time_service: TimeService = Depends(get_time_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Sync time entries from mobile device

    Accepts a batch of time entries from a mobile device and syncs them
    to the server. Each entry includes a local_id for tracking.

    Returns sync results for each entry, including:
    - server_id: The server-assigned UUID (if successful)
    - success: Whether the sync was successful
    - error: Error message (if failed)

    This endpoint supports offline-first mobile apps by allowing
    batch synchronization when connectivity is restored.
    """
    # Check write permission
    if not has_permission(current_user.role, Permission.WRITE_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to sync time entries"
        )

    try:
        results = await time_service.sync_time_entries(
            entries=sync_request.entries,
            current_user=current_user,
            device_id=sync_request.device_id
        )

        synced_count = sum(1 for r in results if r.success)
        failed_count = sum(1 for r in results if not r.success)

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="SYNC",
            entity_type="TimeEntry",
            entity_id=None,
            details={
                "device_id": sync_request.device_id,
                "total_entries": len(sync_request.entries),
                "synced_count": synced_count,
                "failed_count": failed_count,
                "sync_timestamp": sync_request.sync_timestamp.isoformat()
            }
        )

        return TimeEntrySyncResponse(
            synced_count=synced_count,
            failed_count=failed_count,
            synced_entries=results,
            sync_timestamp=datetime.now(UTC)
        )

    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error syncing time entries: {str(e)}"
        )


@router.post("/time-entries/aggregate", response_model=TimeAggregationResponse)
async def aggregate_time_entries(
    request: TimeAggregationRequest,
    current_user: User = Depends(get_current_user),
    time_service: TimeService = Depends(get_time_service),
    audit_service: AuditService = Depends(get_audit_service),
):
    """
    Aggregate time entries for invoicing

    Aggregates time entries based on the specified grouping and filters.
    Useful for generating invoices and time reports.

    Group by options: project_id, user_id, task_id, category
    """
    # Check read permission
    if not has_permission(current_user.role, Permission.READ_WORKITEM):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to aggregate time entries"
        )

    try:
        aggregations = await time_service.aggregate_time_entries(
            request=request,
            current_user=current_user
        )

        total_hours = sum(a.total_hours for a in aggregations)
        # Ensure total_hours is a Decimal
        if not isinstance(total_hours, Decimal):
            total_hours = Decimal(str(total_hours))

        # Log audit event
        await audit_service.log(
            user_id=current_user.id,
            action="AGGREGATE",
            entity_type="TimeEntry",
            entity_id=None,
            details={
                "period_start": request.start_date.isoformat(),
                "period_end": request.end_date.isoformat(),
                "group_by": request.group_by,
                "total_hours": float(total_hours),
                "aggregation_count": len(aggregations)
            }
        )

        return TimeAggregationResponse(
            aggregations=aggregations,
            total_hours=total_hours,
            period_start=request.start_date,
            period_end=request.end_date
        )

    except ValueError as e:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error aggregating time entries: {str(e)}"
        )

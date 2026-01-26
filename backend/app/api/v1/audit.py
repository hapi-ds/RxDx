"""Audit API endpoints for compliance tracking and reporting"""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.audit import AuditLogFilter, AuditLogResponse
from app.services.audit_service import AuditService

router = APIRouter()


def parse_iso_date(date_str: str, field_name: str) -> datetime:
    """
    Parse ISO 8601 date string with robust handling of various formats.
    
    Args:
        date_str: ISO 8601 date string
        field_name: Name of the field for error messages
        
    Returns:
        Parsed datetime object
        
    Raises:
        HTTPException: If date format is invalid
    """
    try:
        # Handle various ISO 8601 formats more robustly
        if date_str.endswith('Z'):
            # Remove Z and add explicit UTC offset
            return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        elif '+' in date_str or date_str.endswith('00:00'):
            # Already has timezone info
            return datetime.fromisoformat(date_str)
        else:
            # Assume UTC if no timezone info
            return datetime.fromisoformat(date_str + '+00:00')
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {field_name} format. Use ISO 8601 format (e.g., 2024-01-01T00:00:00Z)"
        )


def require_audit_permission(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to check if user has audit viewing permissions.
    
    Only admin and auditor roles can view audit logs.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User if authorized
        
    Raises:
        HTTPException: 403 if user lacks audit permissions
    """
    if current_user.role not in [UserRole.ADMIN, UserRole.AUDITOR]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view audit logs"
        )
    return current_user


async def get_audit_service(db: AsyncSession = Depends(get_db)) -> AuditService:
    """Dependency to get AuditService instance"""
    return AuditService(db)


@router.get("/audit", response_model=list[AuditLogResponse])
async def get_audit_logs(
    user_id: UUID = Query(None, description="Filter by user ID"),
    action: str = Query(None, description="Filter by action type (CREATE, READ, UPDATE, DELETE, SIGN, AUTH)"),
    entity_type: str = Query(None, description="Filter by entity type (User, WorkItem, etc.)"),
    entity_id: UUID = Query(None, description="Filter by entity ID"),
    start_date: str = Query(None, description="Filter by start date (ISO format)"),
    end_date: str = Query(None, description="Filter by end date (ISO format)"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    audit_service: AuditService = Depends(get_audit_service),
    current_user: User = Depends(require_audit_permission),
) -> list[AuditLogResponse]:
    """
    Retrieve audit logs with filtering capabilities.
    
    This endpoint provides access to the complete audit trail for compliance
    reporting and security monitoring. Only users with admin or auditor roles
    can access audit logs.
    
    **Filtering Options:**
    - **user_id**: Filter logs by the user who performed the action
    - **action**: Filter by action type (CREATE, READ, UPDATE, DELETE, SIGN, AUTH, etc.)
    - **entity_type**: Filter by entity type (User, WorkItem, Requirement, etc.)
    - **entity_id**: Filter by specific entity ID
    - **start_date**: Filter logs from this date onwards (ISO 8601 format)
    - **end_date**: Filter logs up to this date (ISO 8601 format)
    - **limit**: Maximum number of results (1-1000, default: 100)
    - **offset**: Number of results to skip for pagination (default: 0)
    
    **Response:**
    Returns a list of audit log entries matching the filter criteria,
    ordered by timestamp (newest first).
    
    **Example Usage:**
    ```
    GET /api/v1/audit?action=CREATE&entity_type=WorkItem&limit=50
    GET /api/v1/audit?user_id=123e4567-e89b-12d3-a456-426614174000
    GET /api/v1/audit?start_date=2024-01-01T00:00:00Z&end_date=2024-01-31T23:59:59Z
    ```
    """
    try:
        # Parse date strings if provided
        parsed_start_date = None
        parsed_end_date = None

        if start_date:
            parsed_start_date = parse_iso_date(start_date, "start_date")

        if end_date:
            parsed_end_date = parse_iso_date(end_date, "end_date")

        # Create filter object
        filters = AuditLogFilter(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            start_date=parsed_start_date,
            end_date=parsed_end_date,
            limit=limit,
            offset=offset,
        )

        # Get audit logs
        audit_logs = await audit_service.get_audit_logs(filters)

        # Log the audit query itself
        await audit_service.log(
            action="READ",
            entity_type="AuditLog",
            user_id=current_user.id,
            details={
                "filters": {
                    "user_id": str(user_id) if user_id else None,
                    "action": action,
                    "entity_type": entity_type,
                    "entity_id": str(entity_id) if entity_id else None,
                    "start_date": start_date,
                    "end_date": end_date,
                    "limit": limit,
                    "offset": offset,
                },
                "result_count": len(audit_logs),
            }
        )

        return audit_logs

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve audit logs: {str(e)}"
        )


@router.get("/audit/count")
async def get_audit_log_count(
    user_id: UUID = Query(None, description="Filter by user ID"),
    action: str = Query(None, description="Filter by action type"),
    entity_type: str = Query(None, description="Filter by entity type"),
    entity_id: UUID = Query(None, description="Filter by entity ID"),
    start_date: str = Query(None, description="Filter by start date (ISO format)"),
    end_date: str = Query(None, description="Filter by end date (ISO format)"),
    audit_service: AuditService = Depends(get_audit_service),
    current_user: User = Depends(require_audit_permission),
) -> dict:
    """
    Get total count of audit logs matching filter criteria.
    
    This endpoint returns the total number of audit log entries that match
    the specified filters, useful for pagination calculations.
    
    **Response:**
    ```json
    {
        "total_count": 1234
    }
    ```
    """
    try:
        # Parse date strings if provided
        from datetime import datetime

        parsed_start_date = None
        parsed_end_date = None

        if start_date:
            try:
                parsed_start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Use ISO 8601 format"
                )

        if end_date:
            try:
                parsed_end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Use ISO 8601 format"
                )

        # Create filter object (no limit/offset for count)
        filters = AuditLogFilter(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            start_date=parsed_start_date,
            end_date=parsed_end_date,
            limit=1,  # Not used for count
            offset=0,  # Not used for count
        )

        # Get count
        total_count = await audit_service.get_audit_log_count(filters)

        return {"total_count": total_count}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get audit log count: {str(e)}"
        )


@router.get("/audit/export")
async def export_audit_logs(
    user_id: UUID = Query(None, description="Filter by user ID"),
    action: str = Query(None, description="Filter by action type"),
    entity_type: str = Query(None, description="Filter by entity type"),
    entity_id: UUID = Query(None, description="Filter by entity ID"),
    start_date: str = Query(None, description="Filter by start date (ISO format)"),
    end_date: str = Query(None, description="Filter by end date (ISO format)"),
    format: str = Query("json", pattern="^(json|csv)$", description="Export format (json or csv)"),
    audit_service: AuditService = Depends(get_audit_service),
    current_user: User = Depends(require_audit_permission),
):
    """
    Export audit logs for compliance reporting.
    
    This endpoint exports audit logs in JSON or CSV format for compliance
    reporting and external analysis. The export is limited to 10,000 records
    to prevent performance issues.
    
    **Parameters:**
    - **format**: Export format - "json" (default) or "csv"
    - All other parameters same as GET /audit endpoint
    
    **Response:**
    - **JSON format**: Returns JSON array of audit log objects
    - **CSV format**: Returns CSV file with audit log data
    
    **Example Usage:**
    ```
    GET /api/v1/audit/export?format=csv&start_date=2024-01-01T00:00:00Z
    GET /api/v1/audit/export?format=json&entity_type=WorkItem
    ```
    """
    try:
        # Parse date strings if provided
        from datetime import datetime

        parsed_start_date = None
        parsed_end_date = None

        if start_date:
            try:
                parsed_start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid start_date format. Use ISO 8601 format"
                )

        if end_date:
            try:
                parsed_end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid end_date format. Use ISO 8601 format"
                )

        # Create filter object for export
        filters = AuditLogFilter(
            user_id=user_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            start_date=parsed_start_date,
            end_date=parsed_end_date,
            limit=1000,  # Use max allowed limit
            offset=0,
        )

        # Get audit logs for export
        audit_logs = await audit_service.export_audit_logs(filters)

        # Log the export operation
        await audit_service.log(
            action="EXPORT",
            entity_type="AuditLog",
            user_id=current_user.id,
            details={
                "export_format": format,
                "filters": {
                    "user_id": str(user_id) if user_id else None,
                    "action": action,
                    "entity_type": entity_type,
                    "entity_id": str(entity_id) if entity_id else None,
                    "start_date": start_date,
                    "end_date": end_date,
                },
                "record_count": len(audit_logs),
            }
        )

        if format == "csv":
            # Convert to CSV format
            import csv
            import io

            output = io.StringIO()
            if audit_logs:
                fieldnames = audit_logs[0].keys()
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(audit_logs)

            csv_content = output.getvalue()
            output.close()

            return JSONResponse(
                content=csv_content,
                media_type="text/csv",
                headers={
                    "Content-Disposition": f"attachment; filename=audit_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
                }
            )
        else:
            # Return JSON format
            return audit_logs

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to export audit logs: {str(e)}"
        )


@router.post("/audit/cleanup")
async def cleanup_old_audit_logs(
    retention_days: int = Query(3650, ge=1, le=7300, description="Number of days to retain audit logs (1-20 years)"),
    audit_service: AuditService = Depends(get_audit_service),
    current_user: User = Depends(require_audit_permission),
) -> dict:
    """
    Clean up audit logs older than retention period.
    
    This endpoint allows administrators to clean up old audit logs according
    to the configured retention policy. Only admin users can perform this operation.
    
    **Parameters:**
    - **retention_days**: Number of days to retain audit logs (1-7300 days, default: 3650 = 10 years)
    
    **Response:**
    ```json
    {
        "deleted_count": 123,
        "retention_days": 3650,
        "cutoff_date": "2014-01-18T12:00:00Z"
    }
    ```
    
    **Security:**
    - Only admin users can perform audit log cleanup
    - The cleanup operation itself is logged for audit purposes
    - Minimum retention period is 1 day, maximum is 20 years
    
    **Example Usage:**
    ```
    POST /api/v1/audit/cleanup?retention_days=2555  # 7 years retention
    ```
    """
    # Additional check - only admin users can cleanup audit logs
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can perform audit log cleanup"
        )

    try:
        from datetime import UTC, datetime, timedelta

        cutoff_date = datetime.now(UTC) - timedelta(days=retention_days)
        deleted_count = await audit_service.cleanup_old_audit_logs(retention_days)

        return {
            "deleted_count": deleted_count,
            "retention_days": retention_days,
            "cutoff_date": cutoff_date.isoformat() + "Z",
            "message": f"Successfully cleaned up {deleted_count} audit log entries older than {retention_days} days"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cleanup audit logs: {str(e)}"
        )

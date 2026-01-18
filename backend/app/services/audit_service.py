"""Audit service for compliance tracking and logging"""

from datetime import UTC, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.schemas.audit import AuditLogCreate, AuditLogFilter, AuditLogResponse


class AuditService:
    """
    Service for managing audit logs and compliance tracking.
    
    This service provides immutable audit trails for all system activities
    to ensure compliance with regulatory requirements. All CRUD operations,
    authentication events, and authorization decisions are logged.
    
    Key features:
    - Immutable audit logs (no update/delete operations)
    - Comprehensive logging of all system activities
    - Efficient querying with filtering capabilities
    - Compliance reporting support
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def log(
        self,
        action: str,
        entity_type: str,
        user_id: Optional[UUID] = None,
        entity_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        Create an immutable audit log entry.
        
        Args:
            action: Type of action (CREATE, READ, UPDATE, DELETE, SIGN, AUTH, etc.)
            entity_type: Type of entity affected (User, WorkItem, Requirement, etc.)
            user_id: ID of the user who performed the action (None for system actions)
            entity_id: ID of the affected entity (None for list operations)
            ip_address: Client IP address
            details: Additional context as dictionary
            
        Returns:
            Created AuditLog instance
            
        Example:
            await audit_service.log(
                action="CREATE",
                entity_type="WorkItem",
                user_id=user.id,
                entity_id=workitem.id,
                ip_address="192.168.1.100",
                details={"title": "New requirement", "type": "requirement"}
            )
        """
        audit_log = AuditLog(
            user_id=user_id,
            action=action.upper(),
            entity_type=entity_type,
            entity_id=entity_id,
            ip_address=ip_address,
            details=details,
            timestamp=datetime.now(UTC),
        )
        
        self.db.add(audit_log)
        await self.db.commit()
        await self.db.refresh(audit_log)
        
        return audit_log

    async def log_auth_attempt(
        self,
        email: str,
        success: bool,
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        failure_reason: Optional[str] = None,
    ) -> AuditLog:
        """
        Log authentication attempts for security monitoring.
        
        Args:
            email: Email address used for authentication
            success: Whether authentication succeeded
            user_id: User ID if authentication succeeded
            ip_address: Client IP address
            failure_reason: Reason for failure (if applicable)
            
        Returns:
            Created AuditLog instance
        """
        action = "AUTH_SUCCESS" if success else "AUTH_FAILURE"
        details = {"email": email}
        
        if not success and failure_reason:
            details["failure_reason"] = failure_reason
            
        return await self.log(
            action=action,
            entity_type="User",
            user_id=user_id,
            ip_address=ip_address,
            details=details,
        )

    async def log_authorization_decision(
        self,
        user_id: UUID,
        permission: str,
        resource: str,
        granted: bool,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """
        Log authorization decisions for compliance tracking.
        
        Args:
            user_id: ID of the user requesting access
            permission: Permission being checked
            resource: Resource being accessed
            granted: Whether access was granted
            ip_address: Client IP address
            
        Returns:
            Created AuditLog instance
        """
        action = "AUTHZ_GRANTED" if granted else "AUTHZ_DENIED"
        details = {
            "permission": permission,
            "resource": resource,
        }
        
        return await self.log(
            action=action,
            entity_type="Authorization",
            user_id=user_id,
            ip_address=ip_address,
            details=details,
        )

    async def log_crud_operation(
        self,
        operation: str,
        entity_type: str,
        entity_id: UUID,
        user_id: UUID,
        ip_address: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        Log CRUD operations on entities.
        
        Args:
            operation: CRUD operation (CREATE, READ, UPDATE, DELETE)
            entity_type: Type of entity (WorkItem, User, etc.)
            entity_id: ID of the affected entity
            user_id: ID of the user performing the operation
            ip_address: Client IP address
            changes: Dictionary of changed fields (for UPDATE operations)
            
        Returns:
            Created AuditLog instance
        """
        details = {}
        if changes:
            details["changes"] = changes
            
        return await self.log(
            action=operation.upper(),
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            ip_address=ip_address,
            details=details,
        )

    async def log_signature_event(
        self,
        event_type: str,
        workitem_id: UUID,
        user_id: UUID,
        signature_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        verification_result: Optional[bool] = None,
    ) -> AuditLog:
        """
        Log digital signature events.
        
        Args:
            event_type: Type of signature event (SIGN, VERIFY, INVALIDATE)
            workitem_id: ID of the WorkItem being signed
            user_id: ID of the user performing the action
            signature_id: ID of the digital signature
            ip_address: Client IP address
            verification_result: Result of signature verification (if applicable)
            
        Returns:
            Created AuditLog instance
        """
        details = {"workitem_id": str(workitem_id)}
        
        if signature_id:
            details["signature_id"] = str(signature_id)
            
        if verification_result is not None:
            details["verification_result"] = verification_result
            
        return await self.log(
            action=f"SIGNATURE_{event_type.upper()}",
            entity_type="DigitalSignature",
            entity_id=signature_id,
            user_id=user_id,
            ip_address=ip_address,
            details=details,
        )

    async def get_audit_logs(
        self,
        filters: AuditLogFilter,
    ) -> List[AuditLogResponse]:
        """
        Retrieve audit logs with filtering.
        
        Args:
            filters: Filter criteria for audit logs
            
        Returns:
            List of audit log entries matching the filters
        """
        query = select(AuditLog)
        
        # Apply filters
        conditions = []
        
        if filters.user_id:
            conditions.append(AuditLog.user_id == filters.user_id)
            
        if filters.action:
            conditions.append(AuditLog.action == filters.action.upper())
            
        if filters.entity_type:
            conditions.append(AuditLog.entity_type == filters.entity_type)
            
        if filters.entity_id:
            conditions.append(AuditLog.entity_id == filters.entity_id)
            
        if filters.start_date:
            conditions.append(AuditLog.timestamp >= filters.start_date)
            
        if filters.end_date:
            conditions.append(AuditLog.timestamp <= filters.end_date)
            
        if conditions:
            query = query.where(and_(*conditions))
            
        # Order by timestamp (newest first)
        query = query.order_by(desc(AuditLog.timestamp))
        
        # Apply pagination
        query = query.offset(filters.offset).limit(filters.limit)
        
        result = await self.db.execute(query)
        audit_logs = result.scalars().all()
        
        return [AuditLogResponse.model_validate(log) for log in audit_logs]

    async def get_audit_log_count(
        self,
        filters: AuditLogFilter,
    ) -> int:
        """
        Get total count of audit logs matching filters.
        
        Args:
            filters: Filter criteria for audit logs
            
        Returns:
            Total count of matching audit log entries
        """
        query = select(func.count(AuditLog.id))
        
        # Apply same filters as get_audit_logs
        conditions = []
        
        if filters.user_id:
            conditions.append(AuditLog.user_id == filters.user_id)
            
        if filters.action:
            conditions.append(AuditLog.action == filters.action.upper())
            
        if filters.entity_type:
            conditions.append(AuditLog.entity_type == filters.entity_type)
            
        if filters.entity_id:
            conditions.append(AuditLog.entity_id == filters.entity_id)
            
        if filters.start_date:
            conditions.append(AuditLog.timestamp >= filters.start_date)
            
        if filters.end_date:
            conditions.append(AuditLog.timestamp <= filters.end_date)
            
        if conditions:
            query = query.where(and_(*conditions))
            
        result = await self.db.execute(query)
        return result.scalar() or 0

    async def export_audit_logs(
        self,
        filters: AuditLogFilter,
    ) -> List[Dict[str, Any]]:
        """
        Export audit logs for compliance reporting.
        
        Args:
            filters: Filter criteria for audit logs
            
        Returns:
            List of audit log entries as dictionaries for export
        """
        # Create export filters with larger limit (bypass validation)
        query = select(AuditLog)
        
        # Apply same filters as get_audit_logs
        conditions = []
        
        if filters.user_id:
            conditions.append(AuditLog.user_id == filters.user_id)
            
        if filters.action:
            conditions.append(AuditLog.action == filters.action.upper())
            
        if filters.entity_type:
            conditions.append(AuditLog.entity_type == filters.entity_type)
            
        if filters.entity_id:
            conditions.append(AuditLog.entity_id == filters.entity_id)
            
        if filters.start_date:
            conditions.append(AuditLog.timestamp >= filters.start_date)
            
        if filters.end_date:
            conditions.append(AuditLog.timestamp <= filters.end_date)
            
        if conditions:
            query = query.where(and_(*conditions))
            
        # Order by timestamp (newest first)
        query = query.order_by(desc(AuditLog.timestamp))
        
        # Apply large limit for export (no pagination)
        query = query.limit(10000)
        
        result = await self.db.execute(query)
        audit_logs = result.scalars().all()
        
        return [
            {
                "id": str(log.id),
                "user_id": str(log.user_id) if log.user_id else None,
                "action": log.action,
                "entity_type": log.entity_type,
                "entity_id": str(log.entity_id) if log.entity_id else None,
                "timestamp": log.timestamp.isoformat(),
                "ip_address": log.ip_address,
                "details": log.details,
            }
            for log in audit_logs
        ]

    async def cleanup_old_audit_logs(
        self,
        retention_days: int = 3650,  # Default 10 years
    ) -> int:
        """
        Clean up audit logs older than retention period.
        
        Args:
            retention_days: Number of days to retain audit logs (default: 10 years)
            
        Returns:
            Number of audit log entries deleted
            
        Note:
            This method should be called periodically (e.g., daily) to maintain
            compliance with audit log retention policies.
        """
        from datetime import datetime, timedelta
        from sqlalchemy import delete
        
        cutoff_date = datetime.now(UTC) - timedelta(days=retention_days)
        
        # Delete old audit logs
        delete_stmt = delete(AuditLog).where(AuditLog.timestamp < cutoff_date)
        result = await self.db.execute(delete_stmt)
        await self.db.commit()
        
        deleted_count = result.rowcount
        
        # Log the cleanup operation
        if deleted_count > 0:
            await self.log(
                action="CLEANUP",
                entity_type="AuditLog",
                details={
                    "retention_days": retention_days,
                    "cutoff_date": cutoff_date.isoformat(),
                    "deleted_count": deleted_count,
                }
            )
        
        return deleted_count

    # Note: No update or delete methods - audit logs are immutable
    # This ensures compliance with regulatory requirements for audit trail integrity
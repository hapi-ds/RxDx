"""Version control service for WorkItem versioning"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.graph import GraphService, get_graph_service
from app.db.session import get_db
from app.models.user import User
from app.models.version_history import VersionHistory
from app.services.audit_service import AuditService, get_audit_service


class VersionService:
    """
    Service for managing WorkItem version control.

    This service handles creating new versions of WorkItems, maintaining version history,
    and managing version relationships. It stores version snapshots in PostgreSQL for
    efficient querying and integrates with the audit service.

    Key features:
    - Automatic version number calculation (major.minor format)
    - Complete version history preservation in PostgreSQL
    - Integration with audit logging
    - Change description tracking
    """

    def __init__(
        self,
        graph_service: GraphService,
        audit_service: AuditService,
        db_session: AsyncSession
    ):
        self.graph_service = graph_service
        self.audit_service = audit_service
        self.db_session = db_session

    async def create_version(
        self,
        workitem_id: UUID,
        updates: dict[str, Any],
        user: User,
        change_description: str = "WorkItem updated"
    ) -> dict[str, Any]:
        """
        Create a new version of a WorkItem.

        This method:
        1. Gets the current version from the graph database
        2. Stores a snapshot of the current version in PostgreSQL
        3. Calculates the new version number (increments minor version)
        4. Updates the WorkItem node with new data
        5. Logs the version change in audit trail

        Args:
            workitem_id: UUID of the WorkItem to version
            updates: Dictionary of field updates to apply
            user: User creating the new version
            change_description: Description of what changed

        Returns:
            Dictionary containing the new WorkItem version data

        Raises:
            ValueError: If WorkItem not found or version calculation fails
        """
        # Get current version from graph
        current_workitem = await self.graph_service.get_workitem(str(workitem_id))
        if not current_workitem:
            raise ValueError(f"WorkItem {workitem_id} not found")

        # Calculate new version number
        current_version = current_workitem.get("version", "1.0")
        new_version = self._calculate_next_version(current_version)

        # Store snapshot of current version in PostgreSQL before updating
        version_snapshot = VersionHistory(
            workitem_id=workitem_id,
            version=current_version,
            data=current_workitem,
            change_description=f"Version {current_version} before update to {new_version}",
            created_by=UUID(current_workitem.get("created_by", str(user.id)))
        )
        self.db_session.add(version_snapshot)
        await self.db_session.flush()

        # Merge current data with updates
        new_workitem_data = {**current_workitem}
        new_workitem_data.update(updates)
        new_workitem_data.update({
            "version": new_version,
            "updated_by": str(user.id),
            "updated_at": datetime.now(UTC).isoformat(),
            "change_description": change_description
        })

        # Update the WorkItem node in graph
        await self.graph_service.create_workitem_version(
            workitem_id=str(workitem_id),
            version=new_version,
            data=new_workitem_data,
            user_id=str(user.id),
            change_description=change_description
        )

        # Commit the version snapshot
        await self.db_session.commit()

        # Log audit event
        await self.audit_service.log(
            action="VERSION_CREATE",
            entity_type="WorkItem",
            entity_id=workitem_id,
            user_id=user.id,
            details={
                'previous_version': current_version,
                'new_version': new_version,
                'changes': change_description,
                'updated_fields': list(updates.keys())
            }
        )

        return new_workitem_data

    def _calculate_next_version(self, current_version: str) -> str:
        """
        Calculate the next version number in major.minor format.

        Version numbering rules:
        - Format: "major.minor" (e.g., "1.0", "1.1", "2.0")
        - Minor version increments for regular updates (1.0 -> 1.1 -> 1.2)
        - Major version increments are handled manually (not implemented here)

        Args:
            current_version: Current version string (e.g., "1.2")

        Returns:
            Next version string (e.g., "1.3")

        Raises:
            ValueError: If version format is invalid

        Example:
            next_version = self._calculate_next_version("1.2")  # Returns "1.3"
        """
        try:
            # Parse current version
            if not current_version or current_version == "":
                return "1.0"

            # Handle None explicitly
            if current_version is None:
                raise ValueError("Version cannot be None")

            # Handle version strings like "1.0", "2.5", etc.
            parts = current_version.split('.')
            if len(parts) != 2:
                # Invalid format, raise error
                raise ValueError(f"Version must be in 'major.minor' format, got '{current_version}'")

            major = int(parts[0])
            minor = int(parts[1])

            # Increment minor version
            new_minor = minor + 1

            return f"{major}.{new_minor}"

        except (ValueError, AttributeError) as e:
            # Re-raise ValueError with more context
            if isinstance(e, ValueError) and "Version" in str(e):
                raise e
            raise ValueError(f"Invalid version format '{current_version}': {e}")

    async def get_version_history(self, workitem_id: UUID) -> list[dict[str, Any]]:
        """
        Get complete version history for a WorkItem from PostgreSQL.

        This method retrieves all version snapshots from the database,
        plus the current version from the graph.

        Args:
            workitem_id: UUID of the WorkItem

        Returns:
            List of WorkItem versions ordered by version number (newest first)
        """
        print(f"[VersionService] Getting history for workitem: {workitem_id}")
        
        # Get historical versions from PostgreSQL
        result = await self.db_session.execute(
            select(VersionHistory)
            .where(VersionHistory.workitem_id == workitem_id)
            .order_by(VersionHistory.created_at.desc())
        )
        history_records = result.scalars().all()
        print(f"[VersionService] Found {len(history_records)} historical versions in DB")

        # Get current version from graph
        current_workitem = await self.graph_service.get_workitem(str(workitem_id))
        print(f"[VersionService] Current workitem version: {current_workitem.get('version') if current_workitem else None}")

        # Build version list
        versions = []
        
        # Add current version first
        if current_workitem:
            versions.append(current_workitem)
            print(f"[VersionService] Added current version {current_workitem.get('version')}")
        
        # Add historical versions
        for record in history_records:
            versions.append(record.data)
            print(f"[VersionService] Added historical version {record.version}")

        # Sort by version number (newest first)
        versions.sort(
            key=lambda v: self._version_sort_key(v.get('version', '1.0')),
            reverse=True
        )

        print(f"[VersionService] Returning {len(versions)} total versions")
        return versions

    def _version_sort_key(self, version: str) -> tuple:
        """
        Generate sort key for version strings.

        Args:
            version: Version string (e.g., "1.2")

        Returns:
            Tuple for sorting (e.g., (1, 2))
        """
        try:
            parts = version.split('.')
            if len(parts) == 2:
                return (int(parts[0]), int(parts[1]))
            else:
                return (1, 0)  # Default for invalid versions
        except (ValueError, AttributeError):
            return (1, 0)  # Default for invalid versions

    async def get_version_by_number(
        self,
        workitem_id: UUID,
        version: str
    ) -> dict[str, Any] | None:
        """
        Get a specific version of a WorkItem by version number.

        Args:
            workitem_id: UUID of the WorkItem
            version: Version string (e.g., "1.2")

        Returns:
            WorkItem data for the specified version, or None if not found
        """
        return await self.graph_service.get_workitem_version(str(workitem_id), version)

    async def compare_versions(
        self,
        workitem_id: UUID,
        version1: str,
        version2: str
    ) -> dict[str, Any]:
        """
        Compare two versions of a WorkItem and return the differences.

        Args:
            workitem_id: UUID of the WorkItem
            version1: First version to compare
            version2: Second version to compare

        Returns:
            Dictionary containing the differences between versions
        """
        # Get both versions
        v1_data = await self.get_version_by_number(workitem_id, version1)
        v2_data = await self.get_version_by_number(workitem_id, version2)

        if not v1_data or not v2_data:
            raise ValueError("One or both versions not found")

        # Compare the versions
        differences: dict[str, Any] = {
            'version1': version1,
            'version2': version2,
            'added_fields': {},
            'removed_fields': {},
            'changed_fields': {},
            'unchanged_fields': {}
        }

        # Get all unique keys from both versions
        all_keys = set(v1_data.keys()) | set(v2_data.keys())

        for key in all_keys:
            if key in ['version', 'updated_at', 'updated_by', 'change_description']:
                # Skip metadata fields
                continue

            v1_value = v1_data.get(key)
            v2_value = v2_data.get(key)

            if key not in v1_data:
                differences['added_fields'][key] = v2_value
            elif key not in v2_data:
                differences['removed_fields'][key] = v1_value
            elif v1_value != v2_value:
                differences['changed_fields'][key] = {
                    'from': v1_value,
                    'to': v2_value
                }
            else:
                differences['unchanged_fields'][key] = v1_value

        return differences

    async def restore_version(
        self,
        workitem_id: UUID,
        target_version: str,
        user: User,
        change_description: str | None = None
    ) -> dict[str, Any]:
        """
        Restore a WorkItem to a previous version by creating a new version with old data.

        Args:
            workitem_id: UUID of the WorkItem
            target_version: Version to restore to
            user: User performing the restore
            change_description: Optional description of the restore operation

        Returns:
            New WorkItem version data
        """
        # Get the target version data
        target_data = await self.get_version_by_number(workitem_id, target_version)
        if not target_data:
            raise ValueError(f"Version {target_version} not found")

        # Remove version metadata from target data
        restore_data = {k: v for k, v in target_data.items()
                      if k not in ['version', 'updated_at', 'updated_by', 'change_description']}

        # Create description if not provided
        if not change_description:
            change_description = f"Restored to version {target_version}"

        # Create new version with restored data
        return await self.create_version(
            workitem_id=workitem_id,
            updates=restore_data,
            user=user,
            change_description=change_description
        )


async def get_version_service(
    graph_service: GraphService | None = None,
    audit_service: AuditService | None = None,
    db_session: AsyncSession | None = None
) -> VersionService:
    """
    Dependency for getting VersionService instance.

    Args:
        graph_service: Optional GraphService instance (will be created if None)
        audit_service: Optional AuditService instance (will be created if None)
        db_session: Optional AsyncSession instance (will be created if None)

    Returns:
        VersionService instance with dependencies injected
    """
    if graph_service is None:
        graph_service = await get_graph_service()

    if db_session is None:
        # Get a database session
        async for session in get_db():
            db_session = session
            break

    if audit_service is None:
        audit_service = await get_audit_service(db_session)

    return VersionService(graph_service, audit_service, db_session)

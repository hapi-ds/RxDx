"""Version control service for WorkItem versioning"""

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from app.db.graph import GraphService, get_graph_service
from app.models.user import User
from app.services.audit_service import AuditService, get_audit_service


class VersionService:
    """
    Service for managing WorkItem version control.

    This service handles creating new versions of WorkItems, maintaining version history,
    and managing version relationships in the graph database. It integrates with the
    audit service to log all version changes and handles signature invalidation when
    WorkItems are modified.

    Key features:
    - Automatic version number calculation (major.minor format)
    - Complete version history preservation
    - Graph-based version relationships (NEXT_VERSION)
    - Integration with audit logging
    - Change description tracking
    """

    def __init__(self, graph_service: GraphService, audit_service: AuditService):
        self.graph_service = graph_service
        self.audit_service = audit_service

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
        2. Calculates the new version number (increments minor version)
        3. Creates a new version node with updated data
        4. Creates NEXT_VERSION relationship between versions
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

        Example:
            new_version = await version_service.create_version(
                workitem_id=UUID("..."),
                updates={"title": "Updated title", "status": "active"},
                user=current_user,
                change_description="Updated title and status"
            )
        """
        # Get current version from graph
        current_workitem = await self.graph_service.get_workitem(str(workitem_id))
        if not current_workitem:
            raise ValueError(f"WorkItem {workitem_id} not found")

        # Calculate new version number
        current_version = current_workitem.get("version", "1.0")
        new_version = self._calculate_next_version(current_version)

        # Merge current data with updates
        new_workitem_data = {**current_workitem}
        new_workitem_data.update(updates)
        new_workitem_data.update({
            "version": new_version,
            "updated_by": str(user.id),
            "updated_at": datetime.now(UTC).isoformat(),
            "change_description": change_description
        })

        # Create new version node in graph
        await self.graph_service.create_workitem_version(
            workitem_id=str(workitem_id),
            version=new_version,
            data=new_workitem_data,
            user_id=str(user.id),
            change_description=change_description
        )

        # Create NEXT_VERSION relationship from current to new version
        await self.graph_service.create_relationship(
            from_id=str(workitem_id),  # Current version node
            to_id=str(workitem_id),    # New version node (same ID, different version)
            rel_type="NEXT_VERSION",
            properties={
                'from_version': current_version,
                'to_version': new_version,
                'created_at': datetime.now(UTC).isoformat(),
                'created_by': str(user.id),
                'change_description': change_description
            }
        )

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
        Get complete version history for a WorkItem.

        This method traverses the NEXT_VERSION relationships in the graph database
        to build a complete chronological history of all versions.

        Args:
            workitem_id: UUID of the WorkItem

        Returns:
            List of WorkItem versions ordered by version number (newest first)

        Example:
            history = await version_service.get_version_history(workitem_id)
            # Returns: [{"version": "1.3", ...}, {"version": "1.2", ...}, {"version": "1.1", ...}]
        """
        # Query to get all versions of a WorkItem following NEXT_VERSION relationships
        query = """
        MATCH (w:WorkItem {id: $workitem_id})
        OPTIONAL MATCH path = (w)-[:NEXT_VERSION*0..]->(version:WorkItem)
        WHERE version.id = $workitem_id
        RETURN DISTINCT version
        ORDER BY version.version DESC
        """

        results = await self.graph_service.execute_query(
            query,
            {'workitem_id': str(workitem_id)}
        )

        # Extract version data from results
        versions = []
        for result in results:
            if result and 'properties' in result:
                version_data = result['properties']
            else:
                version_data = result

            if version_data:
                versions.append(version_data)

        # Sort by version number (newest first)
        versions.sort(key=lambda v: self._version_sort_key(v.get('version', '1.0')), reverse=True)

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
        differences = {
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
    graph_service: GraphService = None,
    audit_service: AuditService = None
) -> VersionService:
    """
    Dependency for getting VersionService instance.

    Args:
        graph_service: Optional GraphService instance (will be created if None)
        audit_service: Optional AuditService instance (will be created if None)

    Returns:
        VersionService instance with dependencies injected
    """
    if graph_service is None:
        graph_service = await get_graph_service()

    if audit_service is None:
        # Note: This would need proper dependency injection in a real FastAPI app
        # For now, we'll create a minimal audit service
        from app.db.session import get_db
        db = await get_db().__anext__()  # Get async session
        audit_service = await get_audit_service(db)

    return VersionService(graph_service, audit_service)

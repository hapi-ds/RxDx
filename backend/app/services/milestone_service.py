"""Service for Milestone operations"""

import logging
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.db.graph import GraphService
from app.models.user import User
from app.schemas.milestone import MilestoneCreate, MilestoneResponse, MilestoneUpdate

logger = logging.getLogger(__name__)


class MilestoneService:
    """Service for managing Milestone nodes in the graph database"""

    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    async def create_milestone(
        self,
        milestone_data: MilestoneCreate,
        current_user: User
    ) -> MilestoneResponse:
        """
        Create a new Milestone node in the graph database

        Args:
            milestone_data: Milestone creation data
            current_user: User creating the milestone

        Returns:
            Created milestone with metadata

        Raises:
            ValueError: If validation fails
        """
        milestone_id = uuid4()

        # Prepare milestone properties
        properties = {
            "id": str(milestone_id),
            "title": milestone_data.title,
            "target_date": milestone_data.target_date.isoformat(),
            "is_manual_constraint": milestone_data.is_manual_constraint,
            "status": milestone_data.status,
            "project_id": str(milestone_data.project_id),
            "version": "1.0",
            "created_by": str(current_user.id),
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
        }

        if milestone_data.description:
            properties["description"] = milestone_data.description

        if milestone_data.completion_criteria:
            properties["completion_criteria"] = milestone_data.completion_criteria

        # Create the Milestone node
        await self.graph_service.create_node("Milestone", properties)

        logger.info(
            f"Created milestone {milestone_id} for project {milestone_data.project_id}"
        )

        # Return the created milestone
        return MilestoneResponse(
            id=milestone_id,
            title=milestone_data.title,
            description=milestone_data.description,
            target_date=milestone_data.target_date,
            is_manual_constraint=milestone_data.is_manual_constraint,
            completion_criteria=milestone_data.completion_criteria,
            status=milestone_data.status,
            project_id=milestone_data.project_id,
            version="1.0",
            created_by=current_user.id,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

    async def get_milestone(self, milestone_id: UUID) -> MilestoneResponse | None:
        """
        Get a milestone by ID

        Args:
            milestone_id: Milestone UUID

        Returns:
            Milestone if found, None otherwise
        """
        query = f"MATCH (m:Milestone {{id: '{milestone_id}'}}) RETURN m"
        results = await self.graph_service.execute_query(query)

        if not results:
            return None

        # Extract milestone data from result
        milestone_data = results[0]
        if 'properties' in milestone_data:
            milestone_data = milestone_data['properties']

        return self._graph_data_to_response(milestone_data)

    async def update_milestone(
        self,
        milestone_id: UUID,
        updates: MilestoneUpdate,
        current_user: User
    ) -> MilestoneResponse | None:
        """
        Update a milestone

        Args:
            milestone_id: Milestone UUID
            updates: Update data
            current_user: User performing the update

        Returns:
            Updated milestone if found, None otherwise
        """
        # Get existing milestone
        existing = await self.get_milestone(milestone_id)
        if not existing:
            return None

        # Prepare update data
        update_data = {}

        if updates.title is not None:
            update_data["title"] = updates.title

        if updates.description is not None:
            update_data["description"] = updates.description

        if updates.target_date is not None:
            update_data["target_date"] = updates.target_date.isoformat()

        if updates.is_manual_constraint is not None:
            update_data["is_manual_constraint"] = updates.is_manual_constraint

        if updates.completion_criteria is not None:
            update_data["completion_criteria"] = updates.completion_criteria

        if updates.status is not None:
            update_data["status"] = updates.status

        # Always update timestamp
        update_data["updated_at"] = datetime.now(UTC).isoformat()

        # Build SET clause for Cypher query
        set_clauses = []
        for key, value in update_data.items():
            if isinstance(value, bool):
                set_clauses.append(f"m.{key} = {str(value).lower()}")
            elif isinstance(value, str):
                escaped_value = value.replace("'", "\\'")
                set_clauses.append(f"m.{key} = '{escaped_value}'")
            else:
                set_clauses.append(f"m.{key} = '{value}'")

        set_clause = ", ".join(set_clauses)

        # Update the milestone
        query = f"""
        MATCH (m:Milestone {{id: '{milestone_id}'}})
        SET {set_clause}
        RETURN m
        """

        results = await self.graph_service.execute_query(query)

        if not results:
            return None

        # Extract updated milestone data
        milestone_data = results[0]
        if 'properties' in milestone_data:
            milestone_data = milestone_data['properties']

        logger.info(f"Updated milestone {milestone_id}")

        return self._graph_data_to_response(milestone_data)

    async def delete_milestone(self, milestone_id: UUID) -> bool:
        """
        Delete a milestone

        Args:
            milestone_id: Milestone UUID

        Returns:
            True if deleted, False if not found
        """
        # Check if milestone exists
        existing = await self.get_milestone(milestone_id)
        if not existing:
            return False

        # Delete the milestone and its relationships
        query = f"""
        MATCH (m:Milestone {{id: '{milestone_id}'}})
        DETACH DELETE m
        """

        await self.graph_service.execute_query(query)

        logger.info(f"Deleted milestone {milestone_id}")

        return True

    async def list_milestones(
        self,
        project_id: UUID | None = None,
        status: str | None = None,
        limit: int = 100
    ) -> list[MilestoneResponse]:
        """
        List milestones with optional filters

        Args:
            project_id: Filter by project ID
            status: Filter by status
            limit: Maximum number of results

        Returns:
            List of milestones
        """
        # Build WHERE clauses
        where_clauses = []

        if project_id:
            where_clauses.append(f"m.project_id = '{project_id}'")

        if status:
            where_clauses.append(f"m.status = '{status}'")

        where_clause = " AND ".join(where_clauses) if where_clauses else "true"

        query = f"""
        MATCH (m:Milestone)
        WHERE {where_clause}
        RETURN m
        ORDER BY m.target_date ASC
        LIMIT {limit}
        """

        results = await self.graph_service.execute_query(query)

        milestones = []
        for result in results:
            milestone_data = result
            if 'properties' in milestone_data:
                milestone_data = milestone_data['properties']

            milestone = self._graph_data_to_response(milestone_data)
            if milestone:
                milestones.append(milestone)

        return milestones

    def _graph_data_to_response(self, data: dict) -> MilestoneResponse | None:
        """
        Convert graph data to MilestoneResponse

        Args:
            data: Raw graph data

        Returns:
            MilestoneResponse or None if data is invalid
        """
        try:
            # Parse datetime fields
            target_date = datetime.fromisoformat(data["target_date"])
            created_at = datetime.fromisoformat(data["created_at"])
            updated_at = datetime.fromisoformat(data["updated_at"])

            return MilestoneResponse(
                id=UUID(data["id"]),
                title=data["title"],
                description=data.get("description"),
                target_date=target_date,
                is_manual_constraint=data["is_manual_constraint"],
                completion_criteria=data.get("completion_criteria"),
                status=data["status"],
                project_id=UUID(data["project_id"]),
                version=data["version"],
                created_by=UUID(data["created_by"]),
                created_at=created_at,
                updated_at=updated_at,
            )
        except (KeyError, ValueError) as e:
            logger.error(f"Failed to parse milestone data: {e}")
            return None

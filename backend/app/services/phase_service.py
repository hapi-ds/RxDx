"""Service for managing Phase entities and NEXT relationships"""

import logging
from datetime import datetime
from uuid import UUID, uuid4

from app.db.graph import GraphService
from app.schemas.phase import PhaseCreate, PhaseResponse, PhaseUpdate

logger = logging.getLogger(__name__)


class PhaseService:
    """Service for Phase CRUD operations and NEXT relationship management"""

    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    async def create_phase(self, phase_data: PhaseCreate) -> PhaseResponse:
        """
        Create a new phase.

        Args:
            phase_data: Phase creation data

        Returns:
            Created phase

        Raises:
            ValueError: If phase creation fails or project doesn't exist
        """
        # Verify project exists
        project_query = (
            f"MATCH (p:Project {{id: '{str(phase_data.project_id)}'}}) RETURN p"
        )
        project_results = await self.graph_service.execute_query(project_query)
        if not project_results:
            raise ValueError(f"Project {phase_data.project_id} not found")

        phase_id = uuid4()
        now = datetime.utcnow()

        properties = {
            "id": str(phase_id),
            "name": phase_data.name,
            "order": phase_data.order,
            "project_id": str(phase_data.project_id),
            "created_at": now.isoformat(),
        }

        if phase_data.description:
            properties["description"] = phase_data.description
        if phase_data.minimal_duration is not None:
            properties["minimal_duration"] = phase_data.minimal_duration
        if phase_data.start_date:
            properties["start_date"] = phase_data.start_date.isoformat()
        if phase_data.due_date:
            properties["due_date"] = phase_data.due_date.isoformat()

        try:
            logger.info(
                f"Creating phase: {phase_data.name} for project {phase_data.project_id}"
            )

            # Create Phase node
            await self.graph_service.create_node("Phase", properties)

            # Create BELONGS_TO relationship from Phase to Project
            await self.graph_service.create_relationship(
                from_id=str(phase_id),
                to_id=str(phase_data.project_id),
                rel_type="BELONGS_TO",
            )

            logger.info(f"Created phase: {phase_data.name} with ID {phase_id}")

            return PhaseResponse(
                id=phase_id,
                name=phase_data.name,
                description=phase_data.description,
                order=phase_data.order,
                minimal_duration=phase_data.minimal_duration,
                start_date=phase_data.start_date,
                due_date=phase_data.due_date,
                project_id=phase_data.project_id,
                created_at=now,
            )
        except Exception as e:
            logger.error(f"Failed to create phase: {e}")
            raise ValueError(f"Failed to create phase: {e}")

    async def get_phase(self, phase_id: UUID) -> PhaseResponse | None:
        """
        Get a phase by ID.

        Args:
            phase_id: Phase UUID

        Returns:
            Phase if found, None otherwise
        """
        query = f"MATCH (ph:Phase {{id: '{str(phase_id)}'}}) RETURN ph"
        results = await self.graph_service.execute_query(query)

        if not results:
            return None

        phase_data = results[0]["ph"]

        # Get workpackage count
        workpackage_count = await self._get_workpackage_count(phase_id)

        return PhaseResponse(
            id=UUID(phase_data["id"]),
            name=phase_data["name"],
            description=phase_data.get("description"),
            order=phase_data["order"],
            minimal_duration=phase_data.get("minimal_duration"),
            start_date=(
                datetime.fromisoformat(phase_data["start_date"])
                if phase_data.get("start_date")
                else None
            ),
            due_date=(
                datetime.fromisoformat(phase_data["due_date"])
                if phase_data.get("due_date")
                else None
            ),
            calculated_start_date=(
                datetime.fromisoformat(phase_data["calculated_start_date"])
                if phase_data.get("calculated_start_date")
                else None
            ),
            calculated_end_date=(
                datetime.fromisoformat(phase_data["calculated_end_date"])
                if phase_data.get("calculated_end_date")
                else None
            ),
            start_date_is=(
                datetime.fromisoformat(phase_data["start_date_is"])
                if phase_data.get("start_date_is")
                else None
            ),
            progress=phase_data.get("progress"),
            project_id=UUID(phase_data["project_id"]),
            created_at=datetime.fromisoformat(phase_data["created_at"]),
            workpackage_count=workpackage_count,
        )

    async def _get_workpackage_count(self, phase_id: UUID) -> int:
        """Get count of workpackages in a phase"""
        query = f"""
        MATCH (ph:Phase {{id: '{str(phase_id)}'}})<-[:BELONGS_TO]-(wp:Workpackage)
        RETURN count(wp) as count
        """
        results = await self.graph_service.execute_query(query)
        return results[0]["count"] if results else 0

    async def update_phase(
        self, phase_id: UUID, updates: PhaseUpdate
    ) -> PhaseResponse | None:
        """
        Update a phase.

        Args:
            phase_id: Phase UUID
            updates: Phase update data

        Returns:
            Updated phase if found, None otherwise

        Raises:
            ValueError: If project doesn't exist when updating project_id
        """
        # First check if phase exists
        existing = await self.get_phase(phase_id)
        if not existing:
            return None

        update_props = {}

        if updates.name is not None:
            update_props["name"] = updates.name
        if updates.description is not None:
            update_props["description"] = updates.description
        if updates.order is not None:
            update_props["order"] = updates.order
        if updates.minimal_duration is not None:
            update_props["minimal_duration"] = updates.minimal_duration
        if updates.start_date is not None:
            update_props["start_date"] = updates.start_date.isoformat()
        if updates.due_date is not None:
            update_props["due_date"] = updates.due_date.isoformat()

        # Handle project_id update (requires relationship update)
        if updates.project_id is not None and updates.project_id != existing.project_id:
            # Verify new project exists
            project_query = (
                f"MATCH (p:Project {{id: '{str(updates.project_id)}'}}) RETURN p"
            )
            project_results = await self.graph_service.execute_query(project_query)
            if not project_results:
                raise ValueError(f"Project {updates.project_id} not found")

            update_props["project_id"] = str(updates.project_id)

            # Delete old BELONGS_TO relationship and create new one
            try:
                # Delete old relationship
                delete_rel_query = f"""
                MATCH (ph:Phase {{id: '{str(phase_id)}'}})-[r:BELONGS_TO]->(p:Project)
                DELETE r
                """
                await self.graph_service.execute_query(delete_rel_query)

                # Create new relationship
                await self.graph_service.create_relationship(
                    from_id=str(phase_id),
                    to_id=str(updates.project_id),
                    rel_type="BELONGS_TO",
                )
            except Exception as e:
                logger.error(f"Failed to update project relationship: {e}")
                raise ValueError(f"Failed to update project relationship: {e}")

        if not update_props:
            return existing

        # Update phase node
        await self.graph_service.update_node(str(phase_id), update_props)

        logger.info(f"Updated phase {phase_id}")

        # Return updated phase
        return await self.get_phase(phase_id)

    async def delete_phase(self, phase_id: UUID) -> bool:
        """
        Delete a phase and its NEXT relationships.

        Args:
            phase_id: Phase UUID

        Returns:
            True if deleted, False if not found
        """
        # Check if phase exists
        existing = await self.get_phase(phase_id)
        if not existing:
            return False

        try:
            # Get previous and next phases to maintain sequence continuity
            prev_phase = await self.get_previous_phase(phase_id)
            next_phase = await self.get_next_phase(phase_id)

            # Delete the phase node (will cascade delete relationships)
            await self.graph_service.delete_node(str(phase_id))

            # Reconnect the sequence if both prev and next exist
            if prev_phase and next_phase:
                await self.create_next_relationship(prev_phase.id, next_phase.id)

            logger.info(f"Deleted phase {phase_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete phase {phase_id}: {e}")
            raise ValueError(f"Failed to delete phase: {e}")

    async def list_phases_by_project(
        self, project_id: UUID, limit: int = 100
    ) -> list[PhaseResponse]:
        """
        List all phases for a specific project, ordered by NEXT relationship chain.

        Args:
            project_id: Project UUID
            limit: Maximum number of phases to return

        Returns:
            List of phases ordered by NEXT relationships
        """
        try:
            # First, find the first phase (one with no incoming NEXT relationship)
            first_phase_query = f"""
            MATCH (p:Project {{id: '{str(project_id)}'}})<-[:BELONGS_TO]-(ph:Phase)
            WHERE NOT (ph)<-[:NEXT]-()
            RETURN ph
            LIMIT 1
            """
            first_results = await self.graph_service.execute_query(first_phase_query)

            if not first_results:
                # No phases or no clear first phase, fall back to order property
                query = f"""
                MATCH (p:Project {{id: '{str(project_id)}'}})<-[:BELONGS_TO]-(ph:Phase)
                RETURN ph
                ORDER BY ph.order
                LIMIT {limit}
                """
                results = await self.graph_service.execute_query(query)
                phases = []
                for row in results:
                    phase_data = row["ph"]
                    workpackage_count = await self._get_workpackage_count(
                        UUID(phase_data["id"])
                    )
                    phases.append(
                        PhaseResponse(
                            id=UUID(phase_data["id"]),
                            name=phase_data["name"],
                            description=phase_data.get("description"),
                            order=phase_data["order"],
                            minimal_duration=phase_data.get("minimal_duration"),
                            start_date=(
                                datetime.fromisoformat(phase_data["start_date"])
                                if phase_data.get("start_date")
                                else None
                            ),
                            due_date=(
                                datetime.fromisoformat(phase_data["due_date"])
                                if phase_data.get("due_date")
                                else None
                            ),
                            calculated_start_date=(
                                datetime.fromisoformat(
                                    phase_data["calculated_start_date"]
                                )
                                if phase_data.get("calculated_start_date")
                                else None
                            ),
                            calculated_end_date=(
                                datetime.fromisoformat(phase_data["calculated_end_date"])
                                if phase_data.get("calculated_end_date")
                                else None
                            ),
                            start_date_is=(
                                datetime.fromisoformat(phase_data["start_date_is"])
                                if phase_data.get("start_date_is")
                                else None
                            ),
                            progress=phase_data.get("progress"),
                            project_id=UUID(phase_data["project_id"]),
                            created_at=datetime.fromisoformat(phase_data["created_at"]),
                            workpackage_count=workpackage_count,
                        )
                    )
                return phases

            # Follow the NEXT chain from the first phase
            phases = []
            current_phase_data = first_results[0]["ph"]
            visited = set()  # Prevent infinite loops

            while current_phase_data and len(phases) < limit:
                phase_id = UUID(current_phase_data["id"])

                # Check for cycles
                if str(phase_id) in visited:
                    logger.warning(
                        f"Cycle detected in NEXT relationships for project {project_id}"
                    )
                    break
                visited.add(str(phase_id))

                workpackage_count = await self._get_workpackage_count(phase_id)
                phases.append(
                    PhaseResponse(
                        id=phase_id,
                        name=current_phase_data["name"],
                        description=current_phase_data.get("description"),
                        order=current_phase_data["order"],
                        minimal_duration=current_phase_data.get("minimal_duration"),
                        start_date=(
                            datetime.fromisoformat(current_phase_data["start_date"])
                            if current_phase_data.get("start_date")
                            else None
                        ),
                        due_date=(
                            datetime.fromisoformat(current_phase_data["due_date"])
                            if current_phase_data.get("due_date")
                            else None
                        ),
                        calculated_start_date=(
                            datetime.fromisoformat(
                                current_phase_data["calculated_start_date"]
                            )
                            if current_phase_data.get("calculated_start_date")
                            else None
                        ),
                        calculated_end_date=(
                            datetime.fromisoformat(
                                current_phase_data["calculated_end_date"]
                            )
                            if current_phase_data.get("calculated_end_date")
                            else None
                        ),
                        start_date_is=(
                            datetime.fromisoformat(current_phase_data["start_date_is"])
                            if current_phase_data.get("start_date_is")
                            else None
                        ),
                        progress=current_phase_data.get("progress"),
                        project_id=UUID(current_phase_data["project_id"]),
                        created_at=datetime.fromisoformat(
                            current_phase_data["created_at"]
                        ),
                        workpackage_count=workpackage_count,
                    )
                )

                # Get next phase
                next_query = f"""
                MATCH (ph:Phase {{id: '{str(phase_id)}'}})-[:NEXT]->(next:Phase)
                RETURN next
                """
                next_results = await self.graph_service.execute_query(next_query)
                current_phase_data = next_results[0]["next"] if next_results else None

            return phases

        except Exception as e:
            logger.error(f"Failed to list phases for project {project_id}: {e}")
            raise ValueError(f"Failed to list phases: {e}")

    async def create_next_relationship(
        self, from_phase_id: UUID, to_phase_id: UUID
    ) -> bool:
        """
        Create a NEXT relationship between two phases.

        Args:
            from_phase_id: Source phase UUID
            to_phase_id: Target phase UUID

        Returns:
            True if created successfully

        Raises:
            ValueError: If phases don't exist, are in different projects,
                       or would create a cycle or branch
        """
        # Verify both phases exist
        from_phase = await self.get_phase(from_phase_id)
        to_phase = await self.get_phase(to_phase_id)

        if not from_phase:
            raise ValueError(f"Source phase {from_phase_id} not found")
        if not to_phase:
            raise ValueError(f"Target phase {to_phase_id} not found")

        # Verify phases are in the same project
        if from_phase.project_id != to_phase.project_id:
            raise ValueError("Phases must be in the same project")

        # Check if from_phase already has a NEXT relationship (no branching)
        existing_next = await self.get_next_phase(from_phase_id)
        if existing_next:
            raise ValueError(
                f"Phase {from_phase_id} already has a NEXT relationship to {existing_next.id}. "
                "Remove it first to maintain linear sequence."
            )

        # Check if to_phase already has an incoming NEXT relationship (no branching)
        existing_prev = await self.get_previous_phase(to_phase_id)
        if existing_prev:
            raise ValueError(
                f"Phase {to_phase_id} already has an incoming NEXT relationship from {existing_prev.id}. "
                "Remove it first to maintain linear sequence."
            )

        # Check for cycles by following the NEXT chain from to_phase
        visited = set()
        current_id = to_phase_id
        while current_id:
            if current_id == from_phase_id:
                raise ValueError(
                    "Creating this NEXT relationship would create a cycle"
                )
            if str(current_id) in visited:
                break  # Already checked this path
            visited.add(str(current_id))

            next_phase = await self.get_next_phase(current_id)
            current_id = next_phase.id if next_phase else None

        # Create the NEXT relationship
        try:
            await self.graph_service.create_relationship(
                from_id=str(from_phase_id),
                to_id=str(to_phase_id),
                rel_type="NEXT",
            )
            logger.info(
                f"Created NEXT relationship from phase {from_phase_id} to {to_phase_id}"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to create NEXT relationship: {e}")
            raise ValueError(f"Failed to create NEXT relationship: {e}")

    async def remove_next_relationship(self, from_phase_id: UUID) -> bool:
        """
        Remove the NEXT relationship from a phase.

        Args:
            from_phase_id: Source phase UUID

        Returns:
            True if removed, False if no relationship existed
        """
        # Check if phase exists
        phase = await self.get_phase(from_phase_id)
        if not phase:
            raise ValueError(f"Phase {from_phase_id} not found")

        # Check if NEXT relationship exists
        next_phase = await self.get_next_phase(from_phase_id)
        if not next_phase:
            return False

        try:
            # Delete the NEXT relationship
            query = f"""
            MATCH (ph:Phase {{id: '{str(from_phase_id)}'}})-[r:NEXT]->(:Phase)
            DELETE r
            """
            await self.graph_service.execute_query(query)
            logger.info(f"Removed NEXT relationship from phase {from_phase_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to remove NEXT relationship: {e}")
            raise ValueError(f"Failed to remove NEXT relationship: {e}")

    async def get_next_phase(self, phase_id: UUID) -> PhaseResponse | None:
        """
        Get the next phase in the sequence.

        Args:
            phase_id: Phase UUID

        Returns:
            Next phase if exists, None otherwise
        """
        query = f"""
        MATCH (ph:Phase {{id: '{str(phase_id)}'}})-[:NEXT]->(next:Phase)
        RETURN next
        """
        results = await self.graph_service.execute_query(query)

        if not results:
            return None

        phase_data = results[0]["next"]
        workpackage_count = await self._get_workpackage_count(UUID(phase_data["id"]))

        return PhaseResponse(
            id=UUID(phase_data["id"]),
            name=phase_data["name"],
            description=phase_data.get("description"),
            order=phase_data["order"],
            minimal_duration=phase_data.get("minimal_duration"),
            start_date=(
                datetime.fromisoformat(phase_data["start_date"])
                if phase_data.get("start_date")
                else None
            ),
            due_date=(
                datetime.fromisoformat(phase_data["due_date"])
                if phase_data.get("due_date")
                else None
            ),
            calculated_start_date=(
                datetime.fromisoformat(phase_data["calculated_start_date"])
                if phase_data.get("calculated_start_date")
                else None
            ),
            calculated_end_date=(
                datetime.fromisoformat(phase_data["calculated_end_date"])
                if phase_data.get("calculated_end_date")
                else None
            ),
            start_date_is=(
                datetime.fromisoformat(phase_data["start_date_is"])
                if phase_data.get("start_date_is")
                else None
            ),
            progress=phase_data.get("progress"),
            project_id=UUID(phase_data["project_id"]),
            created_at=datetime.fromisoformat(phase_data["created_at"]),
            workpackage_count=workpackage_count,
        )

    async def get_previous_phase(self, phase_id: UUID) -> PhaseResponse | None:
        """
        Get the previous phase in the sequence.

        Args:
            phase_id: Phase UUID

        Returns:
            Previous phase if exists, None otherwise
        """
        query = f"""
        MATCH (prev:Phase)-[:NEXT]->(ph:Phase {{id: '{str(phase_id)}'}})
        RETURN prev
        """
        results = await self.graph_service.execute_query(query)

        if not results:
            return None

        phase_data = results[0]["prev"]
        workpackage_count = await self._get_workpackage_count(UUID(phase_data["id"]))

        return PhaseResponse(
            id=UUID(phase_data["id"]),
            name=phase_data["name"],
            description=phase_data.get("description"),
            order=phase_data["order"],
            minimal_duration=phase_data.get("minimal_duration"),
            start_date=(
                datetime.fromisoformat(phase_data["start_date"])
                if phase_data.get("start_date")
                else None
            ),
            due_date=(
                datetime.fromisoformat(phase_data["due_date"])
                if phase_data.get("due_date")
                else None
            ),
            calculated_start_date=(
                datetime.fromisoformat(phase_data["calculated_start_date"])
                if phase_data.get("calculated_start_date")
                else None
            ),
            calculated_end_date=(
                datetime.fromisoformat(phase_data["calculated_end_date"])
                if phase_data.get("calculated_end_date")
                else None
            ),
            start_date_is=(
                datetime.fromisoformat(phase_data["start_date_is"])
                if phase_data.get("start_date_is")
                else None
            ),
            progress=phase_data.get("progress"),
            project_id=UUID(phase_data["project_id"]),
            created_at=datetime.fromisoformat(phase_data["created_at"]),
            workpackage_count=workpackage_count,
        )


# Dependency injection
async def get_phase_service(
    graph_service: GraphService = None,
) -> PhaseService:
    """Get PhaseService instance"""
    if graph_service is None:
        from app.db.graph import get_graph_service

        graph_service = await get_graph_service()
    return PhaseService(graph_service)

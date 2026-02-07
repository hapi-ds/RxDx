"""Service for managing Workpackage entities in the graph database"""

import logging
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.db.graph import GraphService
from app.schemas.department import DepartmentResponse
from app.schemas.workpackage import (
    WorkpackageCreate,
    WorkpackageResponse,
    WorkpackageUpdate,
)

logger = logging.getLogger(__name__)


class WorkpackageService:
    """Service for Workpackage operations"""

    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    async def create_workpackage(
        self, workpackage_data: WorkpackageCreate
    ) -> WorkpackageResponse:
        """
        Create a new Workpackage node in the graph database

        Args:
            workpackage_data: Workpackage creation data

        Returns:
            Created workpackage with metadata

        Raises:
            ValueError: If workpackage creation fails or phase doesn't exist
        """
        # Verify phase exists
        phase_query = (
            f"MATCH (p:Phase {{id: '{str(workpackage_data.phase_id)}'}}) RETURN p"
        )
        phase_results = await self.graph_service.execute_query(phase_query)
        if not phase_results:
            raise ValueError(f"Phase {workpackage_data.phase_id} not found")

        workpackage_id = uuid4()
        now = datetime.now(UTC)

        properties = {
            "id": str(workpackage_id),
            "name": workpackage_data.name,
            "order": workpackage_data.order,
            "phase_id": str(workpackage_data.phase_id),
            "created_at": now.isoformat(),
        }

        if workpackage_data.description:
            properties["description"] = workpackage_data.description
        if workpackage_data.start_date:
            properties["start_date"] = workpackage_data.start_date.isoformat()
        if workpackage_data.end_date:
            properties["end_date"] = workpackage_data.end_date.isoformat()

        try:
            logger.info(
                f"Creating workpackage: {workpackage_data.name} for phase {workpackage_data.phase_id}"
            )

            # Create workpackage node
            await self.graph_service.create_node("Workpackage", properties)

            # Create BELONGS_TO relationship from Workpackage to Phase
            await self.graph_service.create_relationship(
                from_id=str(workpackage_id),
                to_id=str(workpackage_data.phase_id),
                rel_type="BELONGS_TO",
            )

            return WorkpackageResponse(
                id=workpackage_id,
                name=workpackage_data.name,
                description=workpackage_data.description,
                order=workpackage_data.order,
                start_date=workpackage_data.start_date,
                end_date=workpackage_data.end_date,
                phase_id=workpackage_data.phase_id,
                created_at=now,
            )
        except Exception as e:
            logger.error(f"Failed to create workpackage: {e}")
            raise ValueError(f"Failed to create workpackage: {e}")

    async def get_workpackage(
        self, workpackage_id: UUID, include_stats: bool = False
    ) -> WorkpackageResponse | None:
        """
        Get a Workpackage by ID

        Args:
            workpackage_id: Workpackage UUID
            include_stats: Whether to include task count and completion percentage

        Returns:
            Workpackage if found, None otherwise
        """
        try:
            query = f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}}) RETURN wp"
            results = await self.graph_service.execute_query(query)

            if not results:
                return None

            # Extract workpackage data from result
            workpackage_data = results[0]
            if "properties" in workpackage_data:
                workpackage_data = workpackage_data["properties"]

            # Get task statistics if requested
            task_count = None
            completion_percentage = None
            if include_stats:
                stats = await self._get_workpackage_stats(workpackage_id)
                task_count = stats.get("task_count")
                completion_percentage = stats.get("completion_percentage")

            return WorkpackageResponse(
                id=UUID(workpackage_data["id"]),
                name=workpackage_data["name"],
                description=workpackage_data.get("description"),
                order=workpackage_data["order"],
                start_date=(
                    datetime.fromisoformat(workpackage_data["start_date"])
                    if workpackage_data.get("start_date")
                    else None
                ),
                end_date=(
                    datetime.fromisoformat(workpackage_data["end_date"])
                    if workpackage_data.get("end_date")
                    else None
                ),
                phase_id=UUID(workpackage_data["phase_id"]),
                created_at=datetime.fromisoformat(workpackage_data["created_at"]),
                task_count=task_count,
                completion_percentage=completion_percentage,
            )
        except Exception as e:
            logger.error(f"Failed to get workpackage {workpackage_id}: {e}")
            return None

    async def _get_workpackage_stats(self, workpackage_id: UUID) -> dict:
        """Get task statistics for a workpackage"""
        try:
            query = f"""
            MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:WorkItem {{type: 'task'}})
            WITH count(t) as total_tasks,
                 count(CASE WHEN t.done = true OR t.status = 'completed' THEN 1 END) as completed_tasks
            RETURN total_tasks, completed_tasks
            """
            results = await self.graph_service.execute_query(query)

            if results:
                total = results[0].get("total_tasks", 0)
                completed = results[0].get("completed_tasks", 0)
                percentage = (completed / total * 100) if total > 0 else 0.0
                return {
                    "task_count": total,
                    "completion_percentage": round(percentage, 2),
                }
            return {"task_count": 0, "completion_percentage": 0.0}
        except Exception as e:
            logger.error(f"Failed to get workpackage stats: {e}")
            return {"task_count": 0, "completion_percentage": 0.0}

    async def update_workpackage(
        self, workpackage_id: UUID, updates: WorkpackageUpdate
    ) -> WorkpackageResponse | None:
        """
        Update a Workpackage

        Args:
            workpackage_id: Workpackage UUID
            updates: Workpackage update data

        Returns:
            Updated workpackage if found, None otherwise

        Raises:
            ValueError: If phase doesn't exist when updating phase_id
        """
        # First check if workpackage exists
        existing = await self.get_workpackage(workpackage_id)
        if not existing:
            return None

        # Build update properties
        update_props = {}

        if updates.name is not None:
            update_props["name"] = updates.name
        if updates.description is not None:
            update_props["description"] = updates.description
        if updates.order is not None:
            update_props["order"] = updates.order
        if updates.start_date is not None:
            update_props["start_date"] = updates.start_date.isoformat()
        if updates.end_date is not None:
            update_props["end_date"] = updates.end_date.isoformat()

        # Handle phase_id update (requires relationship update)
        if updates.phase_id is not None and updates.phase_id != existing.phase_id:
            # Verify new phase exists
            phase_query = (
                f"MATCH (p:Phase {{id: '{str(updates.phase_id)}'}}) RETURN p"
            )
            phase_results = await self.graph_service.execute_query(phase_query)
            if not phase_results:
                raise ValueError(f"Phase {updates.phase_id} not found")

            update_props["phase_id"] = str(updates.phase_id)

            # Delete old BELONGS_TO relationship and create new one
            try:
                # Delete old relationship
                delete_rel_query = f"""
                MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})-[r:BELONGS_TO]->(p:Phase)
                DELETE r
                """
                await self.graph_service.execute_query(delete_rel_query)

                # Create new relationship
                await self.graph_service.create_relationship(
                    from_id=str(workpackage_id),
                    to_id=str(updates.phase_id),
                    rel_type="BELONGS_TO",
                )
            except Exception as e:
                logger.error(f"Failed to update phase relationship: {e}")
                raise ValueError(f"Failed to update phase relationship: {e}")

        if not update_props:
            # No updates to apply
            return existing

        try:
            logger.info(f"Updating workpackage {workpackage_id}")
            await self.graph_service.update_node(str(workpackage_id), update_props)

            # Fetch and return updated workpackage
            return await self.get_workpackage(workpackage_id)
        except Exception as e:
            logger.error(f"Failed to update workpackage {workpackage_id}: {e}")
            return None

    async def delete_workpackage(self, workpackage_id: UUID) -> bool:
        """
        Delete a Workpackage

        Args:
            workpackage_id: Workpackage UUID

        Returns:
            True if deleted successfully, False otherwise

        Note:
            This removes BELONGS_TO relationships from tasks but does NOT delete the tasks
        """
        try:
            # Check if workpackage exists
            existing = await self.get_workpackage(workpackage_id)
            if not existing:
                return False

            logger.info(f"Deleting workpackage {workpackage_id}")

            # Remove BELONGS_TO relationships from tasks (but don't delete tasks)
            remove_task_rels_query = f"""
            MATCH (t:WorkItem {{type: 'task'}})-[r:BELONGS_TO]->(wp:Workpackage {{id: '{str(workpackage_id)}'}})
            DELETE r
            """
            await self.graph_service.execute_query(remove_task_rels_query)

            # Delete workpackage and all other relationships
            query = f"""
            MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})
            DETACH DELETE wp
            """
            await self.graph_service.execute_query(query)

            return True
        except Exception as e:
            logger.error(f"Failed to delete workpackage {workpackage_id}: {e}")
            return False

    async def list_workpackages_by_phase(
        self, phase_id: UUID, limit: int = 100
    ) -> list[WorkpackageResponse]:
        """
        List all workpackages for a specific phase

        Args:
            phase_id: Phase UUID
            limit: Maximum number of workpackages to return

        Returns:
            List of workpackages ordered by sequence
        """
        try:
            query = f"""
            MATCH (p:Phase {{id: '{str(phase_id)}'}})<-[:BELONGS_TO]-(wp:Workpackage)
            RETURN wp
            ORDER BY wp.order
            LIMIT {limit}
            """
            results = await self.graph_service.execute_query(query)

            workpackages = []
            for result in results:
                workpackage_data = result
                if "properties" in workpackage_data:
                    workpackage_data = workpackage_data["properties"]

                workpackages.append(
                    WorkpackageResponse(
                        id=UUID(workpackage_data["id"]),
                        name=workpackage_data["name"],
                        description=workpackage_data.get("description"),
                        order=workpackage_data["order"],
                        start_date=(
                            datetime.fromisoformat(workpackage_data["start_date"])
                            if workpackage_data.get("start_date")
                            else None
                        ),
                        end_date=(
                            datetime.fromisoformat(workpackage_data["end_date"])
                            if workpackage_data.get("end_date")
                            else None
                        ),
                        phase_id=UUID(workpackage_data["phase_id"]),
                        created_at=datetime.fromisoformat(
                            workpackage_data["created_at"]
                        ),
                    )
                )

            return workpackages
        except Exception as e:
            logger.error(f"Failed to list workpackages for phase {phase_id}: {e}")
            return []

    async def link_to_department(
        self, workpackage_id: UUID, department_id: UUID
    ) -> dict:
        """
        Link workpackage to a department for resource allocation

        Args:
            workpackage_id: Workpackage UUID
            department_id: Department UUID

        Returns:
            Link information

        Raises:
            ValueError: If workpackage or department doesn't exist, or if already linked
        """
        try:
            result = await self.graph_service.link_workpackage_to_department(
                str(workpackage_id), str(department_id)
            )
            return {
                "workpackage_id": workpackage_id,
                "department_id": department_id,
                "linked_at": datetime.now(UTC),
            }
        except ValueError as e:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(
                f"Failed to link workpackage {workpackage_id} to department {department_id}: {e}"
            )
            raise ValueError(f"Failed to link workpackage to department: {e}")

    async def unlink_from_department(
        self, workpackage_id: UUID, department_id: UUID | None = None
    ) -> bool:
        """
        Unlink workpackage from department

        Args:
            workpackage_id: Workpackage UUID
            department_id: Optional department UUID. If None, removes any existing link.

        Returns:
            True if link was removed, False if no link existed

        Raises:
            ValueError: If workpackage doesn't exist
        """
        try:
            return await self.graph_service.unlink_workpackage_from_department(
                str(workpackage_id),
                str(department_id) if department_id else None,
            )
        except ValueError as e:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(f"Failed to unlink workpackage {workpackage_id}: {e}")
            return False

    async def get_linked_department(
        self, workpackage_id: UUID
    ) -> DepartmentResponse | None:
        """
        Get the department linked to a workpackage

        Args:
            workpackage_id: Workpackage UUID

        Returns:
            Department if linked, None otherwise

        Raises:
            ValueError: If workpackage doesn't exist
        """
        try:
            department_data = await self.graph_service.get_workpackage_department(
                str(workpackage_id)
            )

            if not department_data:
                return None

            return DepartmentResponse(
                id=UUID(department_data["id"]),
                name=department_data["name"],
                description=department_data.get("description"),
                manager_user_id=(
                    UUID(department_data["manager_user_id"])
                    if department_data.get("manager_user_id")
                    else None
                ),
                company_id=UUID(department_data["company_id"]),
                created_at=datetime.fromisoformat(department_data["created_at"]),
            )
        except ValueError as e:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(
                f"Failed to get linked department for workpackage {workpackage_id}: {e}"
            )
            return None

    async def get_available_resources(
        self, workpackage_id: UUID, skills_filter: list[str] | None = None
    ) -> list[dict]:
        """
        Get resources available from the linked department

        Args:
            workpackage_id: Workpackage UUID
            skills_filter: Optional list of required skills

        Returns:
            List of available resources

        Raises:
            ValueError: If workpackage doesn't exist or not linked to department
        """
        try:
            resources = await self.graph_service.get_department_resources_for_workpackage(
                str(workpackage_id), skills_filter
            )
            return resources
        except ValueError as e:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(
                f"Failed to get available resources for workpackage {workpackage_id}: {e}"
            )
            return []

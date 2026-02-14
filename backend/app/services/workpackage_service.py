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
        
        # Manual dates (user-specified constraints)
        if workpackage_data.start_date:
            properties["start_date"] = workpackage_data.start_date.isoformat()
        if workpackage_data.due_date:
            properties["due_date"] = workpackage_data.due_date.isoformat()
        
        # Minimal duration (minimum calendar days)
        if hasattr(workpackage_data, 'minimal_duration') and workpackage_data.minimal_duration is not None:
            properties["minimal_duration"] = workpackage_data.minimal_duration
        
        # Progress tracking (initialized to 0)
        properties["progress"] = 0

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
                minimal_duration=workpackage_data.get("minimal_duration"),
                start_date=(
                    datetime.fromisoformat(workpackage_data["start_date"])
                    if workpackage_data.get("start_date")
                    else None
                ),
                due_date=(
                    datetime.fromisoformat(workpackage_data["due_date"])
                    if workpackage_data.get("due_date")
                    else None
                ),
                calculated_start_date=(
                    datetime.fromisoformat(workpackage_data["calculated_start_date"])
                    if workpackage_data.get("calculated_start_date")
                    else None
                ),
                calculated_end_date=(
                    datetime.fromisoformat(workpackage_data["calculated_end_date"])
                    if workpackage_data.get("calculated_end_date")
                    else None
                ),
                start_date_is=(
                    datetime.fromisoformat(workpackage_data["start_date_is"])
                    if workpackage_data.get("start_date_is")
                    else None
                ),
                progress=workpackage_data.get("progress", 0),
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
        
        # Manual dates (user-specified constraints)
        if updates.start_date is not None:
            update_props["start_date"] = updates.start_date.isoformat()
        if updates.due_date is not None:
            update_props["due_date"] = updates.due_date.isoformat()
        
        # Minimal duration
        if hasattr(updates, 'minimal_duration') and updates.minimal_duration is not None:
            update_props["minimal_duration"] = updates.minimal_duration
        
        # Calculated dates (set by scheduler)
        if hasattr(updates, 'calculated_start_date') and updates.calculated_start_date is not None:
            update_props["calculated_start_date"] = updates.calculated_start_date.isoformat()
        if hasattr(updates, 'calculated_end_date') and updates.calculated_end_date is not None:
            update_props["calculated_end_date"] = updates.calculated_end_date.isoformat()
        
        # Actual start date and progress
        if hasattr(updates, 'start_date_is') and updates.start_date_is is not None:
            update_props["start_date_is"] = updates.start_date_is.isoformat()
        if hasattr(updates, 'progress') and updates.progress is not None:
            update_props["progress"] = updates.progress

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
                        minimal_duration=workpackage_data.get("minimal_duration"),
                        start_date=(
                            datetime.fromisoformat(workpackage_data["start_date"])
                            if workpackage_data.get("start_date")
                            else None
                        ),
                        due_date=(
                            datetime.fromisoformat(workpackage_data["due_date"])
                            if workpackage_data.get("due_date")
                            else None
                        ),
                        calculated_start_date=(
                            datetime.fromisoformat(workpackage_data["calculated_start_date"])
                            if workpackage_data.get("calculated_start_date")
                            else None
                        ),
                        calculated_end_date=(
                            datetime.fromisoformat(workpackage_data["calculated_end_date"])
                            if workpackage_data.get("calculated_end_date")
                            else None
                        ),
                        start_date_is=(
                            datetime.fromisoformat(workpackage_data["start_date_is"])
                            if workpackage_data.get("start_date_is")
                            else None
                        ),
                        progress=workpackage_data.get("progress", 0),
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

    async def create_before_relationship(
        self,
        from_workpackage_id: UUID,
        to_workpackage_id: UUID,
        dependency_type: str = "finish-to-start",
        lag: int = 0
    ) -> dict:
        """
        Create a BEFORE relationship between two workpackages.
        
        Args:
            from_workpackage_id: Source workpackage UUID (must complete before)
            to_workpackage_id: Target workpackage UUID (depends on source)
            dependency_type: Type of dependency (finish-to-start, start-to-start, finish-to-finish)
            lag: Optional delay in days after predecessor completes
        
        Returns:
            Relationship information
        
        Raises:
            ValueError: If workpackages don't exist or cycle would be created
        """
        # Validate workpackages exist
        from_wp = await self.get_workpackage(from_workpackage_id)
        if not from_wp:
            raise ValueError(f"Workpackage {from_workpackage_id} not found")
        
        to_wp = await self.get_workpackage(to_workpackage_id)
        if not to_wp:
            raise ValueError(f"Workpackage {to_workpackage_id} not found")
        
        # Check for cycles
        if await self._would_create_cycle_before(from_workpackage_id, to_workpackage_id):
            raise ValueError(
                f"Adding BEFORE relationship from {from_workpackage_id} to {to_workpackage_id} "
                "would create a cycle"
            )
        
        # Validate dependency_type
        valid_types = ["finish-to-start", "start-to-start", "finish-to-finish"]
        if dependency_type not in valid_types:
            raise ValueError(f"Invalid dependency_type. Must be one of: {valid_types}")
        
        # Create BEFORE relationship with properties
        query = f"""
        MATCH (from:Workpackage {{id: '{str(from_workpackage_id)}'}}),
              (to:Workpackage {{id: '{str(to_workpackage_id)}'}})
        MERGE (from)-[r:BEFORE]->(to)
        SET r.dependency_type = '{dependency_type}',
            r.lag = {lag},
            r.created_at = '{datetime.now(UTC).isoformat()}'
        RETURN r
        """
        
        await self.graph_service.execute_query(query)
        
        logger.info(
            f"Created BEFORE relationship: {from_workpackage_id} -> {to_workpackage_id} "
            f"(type={dependency_type}, lag={lag})"
        )
        
        return {
            "from_workpackage_id": from_workpackage_id,
            "to_workpackage_id": to_workpackage_id,
            "dependency_type": dependency_type,
            "lag": lag,
            "created_at": datetime.now(UTC)
        }
    
    async def remove_before_relationship(
        self,
        from_workpackage_id: UUID,
        to_workpackage_id: UUID
    ) -> bool:
        """
        Remove a BEFORE relationship between two workpackages.
        
        Args:
            from_workpackage_id: Source workpackage UUID
            to_workpackage_id: Target workpackage UUID
        
        Returns:
            True if relationship was removed, False if not found
        """
        query = f"""
        MATCH (from:Workpackage {{id: '{str(from_workpackage_id)}'}})-[r:BEFORE]->(to:Workpackage {{id: '{str(to_workpackage_id)}'}})
        DELETE r
        RETURN count(r) as deleted_count
        """
        
        results = await self.graph_service.execute_query(query)
        deleted_count = results[0].get('deleted_count', 0) if results else 0
        
        if deleted_count > 0:
            logger.info(
                f"Removed BEFORE relationship: {from_workpackage_id} -> {to_workpackage_id}"
            )
            return True
        
        return False
    
    async def get_before_dependencies(
        self,
        workpackage_id: UUID
    ) -> list[dict]:
        """
        Get all BEFORE dependencies for a workpackage.
        Returns both predecessors (workpackages that must complete before this one)
        and successors (workpackages that depend on this one).
        
        Args:
            workpackage_id: Workpackage UUID
        
        Returns:
            Dictionary with 'predecessors' and 'successors' lists
        """
        # Get predecessors (workpackages that must complete before this one)
        predecessors_query = f"""
        MATCH (pred:Workpackage)-[r:BEFORE]->(wp:Workpackage {{id: '{str(workpackage_id)}'}})
        RETURN pred.id as id, pred.name as name, pred.order as order,
               r.dependency_type as dependency_type, r.lag as lag
        ORDER BY pred.order
        """
        
        pred_results = await self.graph_service.execute_query(predecessors_query)
        
        predecessors = []
        for result in pred_results:
            predecessors.append({
                'id': result.get('id'),
                'name': result.get('name'),
                'order': result.get('order'),
                'dependency_type': result.get('dependency_type', 'finish-to-start'),
                'lag': result.get('lag', 0)
            })
        
        # Get successors (workpackages that depend on this one)
        successors_query = f"""
        MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})-[r:BEFORE]->(succ:Workpackage)
        RETURN succ.id as id, succ.name as name, succ.order as order,
               r.dependency_type as dependency_type, r.lag as lag
        ORDER BY succ.order
        """
        
        succ_results = await self.graph_service.execute_query(successors_query)
        
        successors = []
        for result in succ_results:
            successors.append({
                'id': result.get('id'),
                'name': result.get('name'),
                'order': result.get('order'),
                'dependency_type': result.get('dependency_type', 'finish-to-start'),
                'lag': result.get('lag', 0)
            })
        
        return {
            'predecessors': predecessors,
            'successors': successors
        }
    
    async def _would_create_cycle_before(
        self,
        from_workpackage_id: UUID,
        to_workpackage_id: UUID
    ) -> bool:
        """
        Check if adding a BEFORE relationship would create a cycle.
        
        Args:
            from_workpackage_id: Source workpackage UUID
            to_workpackage_id: Target workpackage UUID
        
        Returns:
            True if adding relationship would create a cycle
        """
        # Check if there's already a path from 'to' to 'from'
        # If yes, adding 'from' -> 'to' would create a cycle
        query = f"""
        MATCH path = (to:Workpackage {{id: '{str(to_workpackage_id)}'}})-[:BEFORE*]->(from:Workpackage {{id: '{str(from_workpackage_id)}'}})
        RETURN count(path) as cycle_count
        """
        
        results = await self.graph_service.execute_query(query)
        
        if results and results[0].get('cycle_count', 0) > 0:
            return True
        
        return False

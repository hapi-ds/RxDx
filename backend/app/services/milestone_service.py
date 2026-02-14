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
            "type": "Milestone",  # Add explicit type property
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
    async def add_dependency(
        self,
        milestone_id: UUID,
        task_id: UUID
    ) -> bool:
        """
        Add a task dependency to a milestone.
        Creates DEPENDS_ON relationship from Milestone to Task.
        Creates BLOCKS relationship from Task to Milestone (inverse).

        Args:
            milestone_id: Milestone UUID
            task_id: Task UUID (WorkItem with type='task')

        Returns:
            True if dependency added successfully

        Raises:
            ValueError: If milestone or task not found, or if cycle detected
        """
        # Check if milestone exists
        milestone = await self.get_milestone(milestone_id)
        if not milestone:
            raise ValueError(f"Milestone {milestone_id} not found")

        # Check if task exists (WorkItem with type='task')
        task_query = f"""
        MATCH (t:WorkItem {{id: '{task_id}', type: 'task'}})
        RETURN t
        """
        task_results = await self.graph_service.execute_query(task_query)
        if not task_results:
            raise ValueError(f"Task {task_id} not found")

        # Check for dependency cycles
        if await self._would_create_cycle(milestone_id, task_id):
            raise ValueError(
                f"Adding dependency from milestone {milestone_id} to task {task_id} "
                "would create a cycle"
            )

        # Create DEPENDS_ON relationship from Milestone to Task
        depends_query = f"""
        MATCH (m:Milestone {{id: '{milestone_id}'}}), (t:WorkItem {{id: '{task_id}'}})
        MERGE (m)-[r:DEPENDS_ON]->(t)
        RETURN r
        """
        await self.graph_service.execute_query(depends_query)

        # Create BLOCKS relationship from Task to Milestone (inverse)
        blocks_query = f"""
        MATCH (t:WorkItem {{id: '{task_id}'}}), (m:Milestone {{id: '{milestone_id}'}})
        MERGE (t)-[r:BLOCKS]->(m)
        RETURN r
        """
        await self.graph_service.execute_query(blocks_query)

        logger.info(
            f"Added dependency: milestone {milestone_id} depends on task {task_id}"
        )

        return True

    async def remove_dependency(
        self,
        milestone_id: UUID,
        task_id: UUID
    ) -> bool:
        """
        Remove a task dependency from a milestone.
        Removes both DEPENDS_ON and BLOCKS relationships.

        Args:
            milestone_id: Milestone UUID
            task_id: Task UUID

        Returns:
            True if dependency removed, False if not found
        """
        # Remove DEPENDS_ON relationship from Milestone to Task
        depends_query = f"""
        MATCH (m:Milestone {{id: '{milestone_id}'}})-[r:DEPENDS_ON]->(t:WorkItem {{id: '{task_id}'}})
        DELETE r
        RETURN count(r) as deleted_count
        """
        depends_results = await self.graph_service.execute_query(depends_query)

        # Remove BLOCKS relationship from Task to Milestone
        blocks_query = f"""
        MATCH (t:WorkItem {{id: '{task_id}'}})-[r:BLOCKS]->(m:Milestone {{id: '{milestone_id}'}})
        DELETE r
        RETURN count(r) as deleted_count
        """
        blocks_results = await self.graph_service.execute_query(blocks_query)

        # Check if any relationships were deleted
        depends_deleted = depends_results[0].get('deleted_count', 0) if depends_results else 0
        blocks_deleted = blocks_results[0].get('deleted_count', 0) if blocks_results else 0

        if depends_deleted > 0 or blocks_deleted > 0:
            logger.info(
                f"Removed dependency: milestone {milestone_id} no longer depends on task {task_id}"
            )
            return True

        return False

    async def get_dependencies(
        self,
        milestone_id: UUID
    ) -> list[dict]:
        """
        Get all task dependencies for a milestone.

        Args:
            milestone_id: Milestone UUID

        Returns:
            List of task data (id, title, status, etc.)
        """
        query = f"""
        MATCH (m:Milestone {{id: '{milestone_id}'}})-[:DEPENDS_ON]->(t:WorkItem)
        RETURN t
        ORDER BY t.title
        """

        results = await self.graph_service.execute_query(query)

        dependencies = []
        for result in results:
            task_data = result
            if 'properties' in task_data:
                task_data = task_data['properties']

            dependencies.append({
                'id': task_data.get('id'),
                'title': task_data.get('title'),
                'status': task_data.get('status'),
                'estimated_hours': task_data.get('estimated_hours'),
                'start_date': task_data.get('start_date'),
                'end_date': task_data.get('end_date'),
            })

        return dependencies

    async def _would_create_cycle(
        self,
        milestone_id: UUID,
        task_id: UUID
    ) -> bool:
        """
        Check if adding a dependency would create a cycle.

        A cycle would occur if:
        1. The task already depends on this milestone (directly or indirectly)
        2. The task has dependencies that eventually lead back to this milestone

        Args:
            milestone_id: Milestone UUID
            task_id: Task UUID

        Returns:
            True if adding dependency would create a cycle
        """
        # Check if there's a path from task to milestone through dependencies
        # This would create a cycle: Milestone -> Task -> ... -> Milestone

        query = f"""
        MATCH path = (t:WorkItem {{id: '{task_id}'}})-[:DEPENDS_ON*]->(m:Milestone {{id: '{milestone_id}'}})
        RETURN count(path) as cycle_count
        """

        results = await self.graph_service.execute_query(query)

        if results and results[0].get('cycle_count', 0) > 0:
            return True

        # Also check if task depends on any tasks that depend on this milestone
        # This catches indirect cycles through task dependencies
        query2 = f"""
        MATCH (m:Milestone {{id: '{milestone_id}'}})-[:DEPENDS_ON]->(t1:WorkItem)
        MATCH path = (t2:WorkItem {{id: '{task_id}'}})-[:DEPENDS_ON*]->(t1)
        RETURN count(path) as cycle_count
        """

        results2 = await self.graph_service.execute_query(query2)

        if results2 and results2[0].get('cycle_count', 0) > 0:
            return True

        return False


    async def create_before_relationship(
        self,
        from_milestone_id: UUID,
        to_milestone_id: UUID,
        dependency_type: str = "finish-to-start",
        lag: int = 0
    ) -> dict:
        """
        Create a BEFORE relationship between two milestones.
        
        Args:
            from_milestone_id: Source milestone UUID (must complete before)
            to_milestone_id: Target milestone UUID (depends on source)
            dependency_type: Type of dependency (finish-to-start, start-to-start, finish-to-finish)
            lag: Optional delay in days after predecessor completes
        
        Returns:
            Relationship information
        
        Raises:
            ValueError: If milestones don't exist or cycle would be created
        """
        # Validate milestones exist
        from_milestone = await self.get_milestone(from_milestone_id)
        if not from_milestone:
            raise ValueError(f"Milestone {from_milestone_id} not found")
        
        to_milestone = await self.get_milestone(to_milestone_id)
        if not to_milestone:
            raise ValueError(f"Milestone {to_milestone_id} not found")
        
        # Check for cycles
        if await self._would_create_cycle_before(from_milestone_id, to_milestone_id):
            raise ValueError(
                f"Adding BEFORE relationship from {from_milestone_id} to {to_milestone_id} "
                "would create a cycle"
            )
        
        # Validate dependency_type
        valid_types = ["finish-to-start", "start-to-start", "finish-to-finish"]
        if dependency_type not in valid_types:
            raise ValueError(f"Invalid dependency_type. Must be one of: {valid_types}")
        
        # Create BEFORE relationship with properties
        query = f"""
        MATCH (from:Milestone {{id: '{str(from_milestone_id)}'}}),
              (to:Milestone {{id: '{str(to_milestone_id)}'}})
        MERGE (from)-[r:BEFORE]->(to)
        SET r.dependency_type = '{dependency_type}',
            r.lag = {lag},
            r.created_at = '{datetime.now(UTC).isoformat()}'
        RETURN r
        """
        
        await self.graph_service.execute_query(query)
        
        logger.info(
            f"Created BEFORE relationship: {from_milestone_id} -> {to_milestone_id} "
            f"(type={dependency_type}, lag={lag})"
        )
        
        return {
            "from_milestone_id": from_milestone_id,
            "to_milestone_id": to_milestone_id,
            "dependency_type": dependency_type,
            "lag": lag,
            "created_at": datetime.now(UTC)
        }
    
    async def remove_before_relationship(
        self,
        from_milestone_id: UUID,
        to_milestone_id: UUID
    ) -> bool:
        """
        Remove a BEFORE relationship between two milestones.
        
        Args:
            from_milestone_id: Source milestone UUID
            to_milestone_id: Target milestone UUID
        
        Returns:
            True if relationship was removed, False if not found
        """
        query = f"""
        MATCH (from:Milestone {{id: '{str(from_milestone_id)}'}})-[r:BEFORE]->(to:Milestone {{id: '{str(to_milestone_id)}'}})
        DELETE r
        RETURN count(r) as deleted_count
        """
        
        results = await self.graph_service.execute_query(query)
        deleted_count = results[0].get('deleted_count', 0) if results else 0
        
        if deleted_count > 0:
            logger.info(
                f"Removed BEFORE relationship: {from_milestone_id} -> {to_milestone_id}"
            )
            return True
        
        return False
    
    async def get_before_dependencies(
        self,
        milestone_id: UUID
    ) -> dict:
        """
        Get all BEFORE dependencies for a milestone.
        Returns both predecessors (milestones that must complete before this one)
        and successors (milestones that depend on this one).
        
        Args:
            milestone_id: Milestone UUID
        
        Returns:
            Dictionary with 'predecessors' and 'successors' lists
        """
        # Get predecessors (milestones that must complete before this one)
        predecessors_query = f"""
        MATCH (pred:Milestone)-[r:BEFORE]->(m:Milestone {{id: '{str(milestone_id)}'}})
        RETURN pred.id as id, pred.title as title, pred.status as status,
               r.dependency_type as dependency_type, r.lag as lag
        ORDER BY pred.title
        """
        
        pred_results = await self.graph_service.execute_query(predecessors_query)
        
        predecessors = []
        for result in pred_results:
            predecessors.append({
                'id': result.get('id'),
                'title': result.get('title'),
                'status': result.get('status'),
                'dependency_type': result.get('dependency_type', 'finish-to-start'),
                'lag': result.get('lag', 0)
            })
        
        # Get successors (milestones that depend on this one)
        successors_query = f"""
        MATCH (m:Milestone {{id: '{str(milestone_id)}'}})-[r:BEFORE]->(succ:Milestone)
        RETURN succ.id as id, succ.title as title, succ.status as status,
               r.dependency_type as dependency_type, r.lag as lag
        ORDER BY succ.title
        """
        
        succ_results = await self.graph_service.execute_query(successors_query)
        
        successors = []
        for result in succ_results:
            successors.append({
                'id': result.get('id'),
                'title': result.get('title'),
                'status': result.get('status'),
                'dependency_type': result.get('dependency_type', 'finish-to-start'),
                'lag': result.get('lag', 0)
            })
        
        return {
            'predecessors': predecessors,
            'successors': successors
        }
    
    async def _would_create_cycle_before(
        self,
        from_milestone_id: UUID,
        to_milestone_id: UUID
    ) -> bool:
        """
        Check if adding a BEFORE relationship would create a cycle.
        
        Args:
            from_milestone_id: Source milestone UUID
            to_milestone_id: Target milestone UUID
        
        Returns:
            True if adding relationship would create a cycle
        """
        # Check if there's already a path from 'to' to 'from'
        # If yes, adding 'from' -> 'to' would create a cycle
        query = f"""
        MATCH path = (to:Milestone {{id: '{str(to_milestone_id)}'}})-[:BEFORE*]->(from:Milestone {{id: '{str(from_milestone_id)}'}})
        RETURN count(path) as cycle_count
        """
        
        results = await self.graph_service.execute_query(query)
        
        if results and results[0].get('cycle_count', 0) > 0:
            return True
        
        return False


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

    async def add_dependency(
        self,
        milestone_id: UUID,
        task_id: UUID
    ) -> bool:
        """
        Add a task dependency to a milestone.
        Creates DEPENDS_ON relationship from Milestone to Task.
        Creates BLOCKS relationship from Task to Milestone (inverse).

        Args:
            milestone_id: Milestone UUID
            task_id: Task UUID (WorkItem with type='task')

        Returns:
            True if dependency added successfully

        Raises:
            ValueError: If milestone or task not found, or if cycle detected
        """
        # Check if milestone exists
        milestone = await self.get_milestone(milestone_id)
        if not milestone:
            raise ValueError(f"Milestone {milestone_id} not found")

        # Check if task exists (WorkItem with type='task')
        task_query = f"""
        MATCH (t:WorkItem {{id: '{task_id}', type: 'task'}})
        RETURN t
        """
        task_results = await self.graph_service.execute_query(task_query)
        if not task_results:
            raise ValueError(f"Task {task_id} not found")

        # Check for dependency cycles
        if await self._would_create_cycle(milestone_id, task_id):
            raise ValueError(
                f"Adding dependency from milestone {milestone_id} to task {task_id} "
                "would create a cycle"
            )

        # Create DEPENDS_ON relationship from Milestone to Task
        depends_query = f"""
        MATCH (m:Milestone {{id: '{milestone_id}'}}), (t:WorkItem {{id: '{task_id}'}})
        MERGE (m)-[r:DEPENDS_ON]->(t)
        RETURN r
        """
        await self.graph_service.execute_query(depends_query)

        # Create BLOCKS relationship from Task to Milestone (inverse)
        blocks_query = f"""
        MATCH (t:WorkItem {{id: '{task_id}'}}), (m:Milestone {{id: '{milestone_id}'}})
        MERGE (t)-[r:BLOCKS]->(m)
        RETURN r
        """
        await self.graph_service.execute_query(blocks_query)

        logger.info(
            f"Added dependency: milestone {milestone_id} depends on task {task_id}"
        )

        return True

    async def remove_dependency(
        self,
        milestone_id: UUID,
        task_id: UUID
    ) -> bool:
        """
        Remove a task dependency from a milestone.
        Removes both DEPENDS_ON and BLOCKS relationships.

        Args:
            milestone_id: Milestone UUID
            task_id: Task UUID

        Returns:
            True if dependency removed, False if not found
        """
        # Remove DEPENDS_ON relationship from Milestone to Task
        depends_query = f"""
        MATCH (m:Milestone {{id: '{milestone_id}'}})-[r:DEPENDS_ON]->(t:WorkItem {{id: '{task_id}'}})
        DELETE r
        RETURN count(r) as deleted_count
        """
        depends_results = await self.graph_service.execute_query(depends_query)

        # Remove BLOCKS relationship from Task to Milestone
        blocks_query = f"""
        MATCH (t:WorkItem {{id: '{task_id}'}})-[r:BLOCKS]->(m:Milestone {{id: '{milestone_id}'}})
        DELETE r
        RETURN count(r) as deleted_count
        """
        blocks_results = await self.graph_service.execute_query(blocks_query)

        # Check if any relationships were deleted
        depends_deleted = depends_results[0].get('deleted_count', 0) if depends_results else 0
        blocks_deleted = blocks_results[0].get('deleted_count', 0) if blocks_results else 0

        if depends_deleted > 0 or blocks_deleted > 0:
            logger.info(
                f"Removed dependency: milestone {milestone_id} no longer depends on task {task_id}"
            )
            return True

        return False

    async def get_dependencies(
        self,
        milestone_id: UUID
    ) -> list[dict]:
        """
        Get all task dependencies for a milestone.

        Args:
            milestone_id: Milestone UUID

        Returns:
            List of task data (id, title, status, etc.)
        """
        query = f"""
        MATCH (m:Milestone {{id: '{milestone_id}'}})-[:DEPENDS_ON]->(t:WorkItem)
        RETURN t
        ORDER BY t.title
        """

        results = await self.graph_service.execute_query(query)

        dependencies = []
        for result in results:
            task_data = result
            if 'properties' in task_data:
                task_data = task_data['properties']

            dependencies.append({
                'id': task_data.get('id'),
                'title': task_data.get('title'),
                'status': task_data.get('status'),
                'estimated_hours': task_data.get('estimated_hours'),
                'start_date': task_data.get('start_date'),
                'end_date': task_data.get('end_date'),
            })

        return dependencies

    async def _would_create_cycle(
        self,
        milestone_id: UUID,
        task_id: UUID
    ) -> bool:
        """
        Check if adding a dependency would create a cycle.
        
        A cycle would occur if:
        1. The task already depends on this milestone (directly or indirectly)
        2. The task has dependencies that eventually lead back to this milestone
        
        Args:
            milestone_id: Milestone UUID
            task_id: Task UUID
        
        Returns:
            True if adding dependency would create a cycle
        """
        # Check if there's a path from task to milestone through dependencies
        # This would create a cycle: Milestone -> Task -> ... -> Milestone
        
        query = f"""
        MATCH path = (t:WorkItem {{id: '{task_id}'}})-[:DEPENDS_ON*]->(m:Milestone {{id: '{milestone_id}'}})
        RETURN count(path) as cycle_count
        """
        
        results = await self.graph_service.execute_query(query)
        
        if results and results[0].get('cycle_count', 0) > 0:
            return True
        
        # Also check if task depends on any tasks that depend on this milestone
        # This catches indirect cycles through task dependencies
        query2 = f"""
        MATCH (m:Milestone {{id: '{milestone_id}'}})-[:DEPENDS_ON]->(t1:WorkItem)
        MATCH path = (t2:WorkItem {{id: '{task_id}'}})-[:DEPENDS_ON*]->(t1)
        RETURN count(path) as cycle_count
        """
        
        results2 = await self.graph_service.execute_query(query2)
        
        if results2 and results2[0].get('cycle_count', 0) > 0:
            return True
        
        return False

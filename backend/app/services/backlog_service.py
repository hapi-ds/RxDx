"""Service for managing Backlog nodes in the graph database"""

import logging
from datetime import datetime, UTC
from uuid import UUID, uuid4

from app.db.graph import GraphService
from app.models.user import User
from app.schemas.backlog import (
    BacklogCreate,
    BacklogResponse,
    BacklogUpdate,
    BacklogTaskResponse,
)

logger = logging.getLogger(__name__)


class BacklogService:
    """Service for managing Backlog nodes in the graph database"""

    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    async def create_backlog(
        self,
        backlog_data: BacklogCreate,
        current_user: User
    ) -> BacklogResponse:
        """
        Create a new Backlog node in the graph database

        Args:
            backlog_data: Backlog creation data
            current_user: User creating the backlog

        Returns:
            Created backlog with metadata

        Raises:
            ValueError: If validation fails
        """
        backlog_id = uuid4()

        # Prepare backlog properties
        properties = {
            "id": str(backlog_id),
            "name": backlog_data.name,
            "type": "Backlog",  # Add explicit type property
            "project_id": str(backlog_data.project_id),
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
        }

        if backlog_data.description:
            properties["description"] = backlog_data.description

        # Create the Backlog node
        await self.graph_service.create_node("Backlog", properties)

        logger.info(
            f"Created backlog {backlog_id} for project {backlog_data.project_id}"
        )

        # Return the created backlog
        return BacklogResponse(
            id=backlog_id,
            name=backlog_data.name,
            description=backlog_data.description,
            project_id=backlog_data.project_id,
            task_count=0,
            created_at=datetime.now(UTC),
        )

    async def get_backlog(self, backlog_id: UUID) -> BacklogResponse | None:
        """
        Get a backlog by ID

        Args:
            backlog_id: Backlog UUID

        Returns:
            Backlog if found, None otherwise
        """
        query = f"""
        MATCH (b:Backlog {{id: '{str(backlog_id)}'}})
        OPTIONAL MATCH (t:WorkItem {{type: 'task'}})-[:IN_BACKLOG]->(b)
        RETURN b, count(t) as task_count
        """

        results = await self.graph_service.execute_query(query)

        if not results:
            return None

        return self._graph_data_to_response(results[0])

    async def update_backlog(
        self,
        backlog_id: UUID,
        updates: BacklogUpdate,
        current_user: User
    ) -> BacklogResponse | None:
        """
        Update a backlog

        Args:
            backlog_id: Backlog UUID
            updates: Fields to update
            current_user: User performing the update

        Returns:
            Updated backlog if found, None otherwise
        """
        # Get existing backlog
        existing = await self.get_backlog(backlog_id)
        if not existing:
            return None

        # Prepare update data
        update_data = {"updated_at": datetime.now(UTC).isoformat()}

        if updates.name is not None:
            update_data["name"] = updates.name

        if updates.description is not None:
            update_data["description"] = updates.description

        # Update the node
        await self.graph_service.update_node(str(backlog_id), update_data)

        logger.info(f"Updated backlog {backlog_id}")

        # Return updated backlog
        return await self.get_backlog(backlog_id)

    async def delete_backlog(self, backlog_id: UUID) -> bool:
        """
        Delete a backlog (removes IN_BACKLOG relationships but keeps tasks)

        Args:
            backlog_id: Backlog UUID

        Returns:
            True if deleted, False if not found
        """
        # First remove all IN_BACKLOG relationships
        remove_relationships_query = f"""
        MATCH (t:WorkItem)-[r:IN_BACKLOG]->(b:Backlog {{id: '{str(backlog_id)}'}})
        DELETE r
        """
        await self.graph_service.execute_query(remove_relationships_query)

        # Then delete the backlog node
        result = await self.graph_service.delete_node(str(backlog_id))

        if result:
            logger.info(f"Deleted backlog {backlog_id}")

        return result

    async def list_backlogs(
        self,
        project_id: UUID | None = None,
        limit: int = 100,
        offset: int = 0
    ) -> list[BacklogResponse]:
        """
        List backlogs with optional filtering

        Args:
            project_id: Optional project UUID to filter by
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            List of backlogs
        """
        where_clause = ""
        if project_id:
            where_clause = f"WHERE b.project_id = '{str(project_id)}'"

        query = f"""
        MATCH (b:Backlog)
        {where_clause}
        OPTIONAL MATCH (t:WorkItem {{type: 'task'}})-[:IN_BACKLOG]->(b)
        WITH b, count(t) as task_count
        ORDER BY b.created_at DESC
        SKIP {offset}
        LIMIT {limit}
        RETURN b, task_count
        """

        results = await self.graph_service.execute_query(query)

        return [self._graph_data_to_response(row) for row in results]

    async def get_backlog_tasks(
        self,
        backlog_id: UUID,
        limit: int = 100,
        offset: int = 0
    ) -> list[BacklogTaskResponse]:
        """
        Get tasks in a backlog, ordered by priority

        Args:
            backlog_id: Backlog UUID
            limit: Maximum number of results
            offset: Number of results to skip

        Returns:
            List of tasks with priority information
        """
        query = f"""
        MATCH (t:WorkItem {{type: 'task'}})-[r:IN_BACKLOG]->(b:Backlog {{id: '{str(backlog_id)}'}})
        RETURN t, r
        ORDER BY coalesce(r.priority_order, 999999), r.added_at
        SKIP {offset}
        LIMIT {limit}
        """

        results = await self.graph_service.execute_query(query)

        tasks = []
        for row in results:
            task_data = row.get("t", {})
            rel_data = row.get("r", {})

            if task_data:
                tasks.append(BacklogTaskResponse(
                    task_id=UUID(task_data.get("id")),
                    task_title=task_data.get("title", ""),
                    task_type=task_data.get("type", "task"),
                    task_status=task_data.get("status", "draft"),
                    priority_order=rel_data.get("priority_order", 999999),
                    added_at=datetime.fromisoformat(rel_data.get("added_at")),
                    estimated_hours=task_data.get("estimated_hours"),
                    story_points=task_data.get("story_points"),
                ))

        return tasks

    async def add_task_to_backlog(
        self,
        backlog_id: UUID,
        task_id: UUID,
        priority_order: int | None = None
    ) -> BacklogTaskResponse:
        """
        Add a task to the backlog (manual addition)

        Args:
            backlog_id: Backlog UUID
            task_id: Task UUID
            priority_order: Optional priority order

        Returns:
            Task with backlog information

        Raises:
            ValueError: If task is already in a sprint or backlog doesn't exist
        """
        # Check if task is in a sprint
        status = await self.graph_service.check_task_backlog_sprint_status(str(task_id))

        if status.get("in_sprint"):
            raise ValueError(
                f"Task {task_id} is already assigned to sprint {status['sprint_id']}. "
                "Remove from sprint before adding to backlog."
            )

        # Add to backlog
        await self.graph_service.move_task_to_backlog(
            task_id=str(task_id),
            backlog_id=str(backlog_id),
            priority_order=priority_order
        )

        logger.info(f"Added task {task_id} to backlog {backlog_id}")

        # Get and return task info
        tasks = await self.get_backlog_tasks(backlog_id, limit=1000)
        for task in tasks:
            if task.task_id == task_id:
                return task

        # Fallback if not found in list (shouldn't happen)
        raise ValueError(f"Task {task_id} not found after adding to backlog")

    async def remove_task_from_backlog(
        self,
        backlog_id: UUID,
        task_id: UUID
    ) -> bool:
        """
        Remove a task from the backlog

        Args:
            backlog_id: Backlog UUID
            task_id: Task UUID

        Returns:
            True if removed, False if relationship didn't exist
        """
        query = f"""
        MATCH (t:WorkItem {{id: '{str(task_id)}'}})-[r:IN_BACKLOG]->(b:Backlog {{id: '{str(backlog_id)}'}})
        DELETE r
        RETURN count(r) as deleted_count
        """

        results = await self.graph_service.execute_query(query)

        deleted = results[0].get("deleted_count", 0) > 0 if results else False

        if deleted:
            logger.info(f"Removed task {task_id} from backlog {backlog_id}")

        return deleted

    async def reorder_backlog_tasks(
        self,
        backlog_id: UUID,
        task_priorities: dict[UUID, int]
    ) -> list[BacklogTaskResponse]:
        """
        Reorder tasks in the backlog by updating priority_order

        Args:
            backlog_id: Backlog UUID
            task_priorities: Dictionary mapping task_id to new priority_order

        Returns:
            Updated list of tasks in new order
        """
        for task_id, priority_order in task_priorities.items():
            query = f"""
            MATCH (t:WorkItem {{id: '{str(task_id)}'}})-[r:IN_BACKLOG]->(b:Backlog {{id: '{str(backlog_id)}'}})
            SET r.priority_order = {priority_order}
            RETURN r
            """
            await self.graph_service.execute_query(query)

        logger.info(f"Reordered {len(task_priorities)} tasks in backlog {backlog_id}")

        # Return updated task list
        return await self.get_backlog_tasks(backlog_id)

    def _graph_data_to_response(self, data: dict) -> BacklogResponse | None:
        """
        Convert graph query result to BacklogResponse

        Args:
            data: Graph query result row

        Returns:
            BacklogResponse or None if data is invalid
        """
        backlog_data = data.get("b", {})

        if not backlog_data:
            return None

        return BacklogResponse(
            id=UUID(backlog_data.get("id")),
            name=backlog_data.get("name", ""),
            description=backlog_data.get("description"),
            project_id=UUID(backlog_data.get("project_id")),
            task_count=data.get("task_count", 0),
            created_at=datetime.fromisoformat(backlog_data.get("created_at")),
            updated_at=(
                datetime.fromisoformat(backlog_data.get("updated_at"))
                if backlog_data.get("updated_at")
                else None
            ),
        )

"""Time Tracking service for graph database-based time tracking with worked nodes"""

import logging
from datetime import UTC, date as date_type, datetime, time as time_type
from typing import Any
from uuid import UUID, uuid4

from app.db.graph import GraphService
from app.models.user import User
from app.schemas.worked import (
    WorkedCreate,
    WorkedResponse,
    WorkedUpdate,
)

logger = logging.getLogger(__name__)


class TimeTrackingService:
    """Service for managing time tracking with graph database worked nodes"""

    def __init__(self, graph_service: GraphService):
        self.graph = graph_service

    async def start_time_tracking(
        self,
        task_id: UUID,
        current_user: User,
        description: str | None = None,
    ) -> WorkedResponse:
        """
        Start time tracking for a task (creates worked node with start time).

        Args:
            task_id: Task UUID to track time for
            current_user: User starting time tracking
            description: Optional description for the time entry

        Returns:
            Created worked entry with start time

        Raises:
            ValueError: If task doesn't exist or user already has active tracking
        """
        # Check if user already has active tracking
        active_entries = await self.get_active_tracking(current_user)
        if active_entries:
            raise ValueError(
                f"User already has {len(active_entries)} active time tracking entry/entries. "
                "Please stop existing tracking before starting new one."
            )

        # Verify task exists
        task_query = f"MATCH (t:WorkItem {{id: '{str(task_id)}', type: 'task'}}) RETURN t"
        task_results = await self.graph.execute_query(task_query)
        if not task_results:
            raise ValueError(f"Task {task_id} not found")

        # Create worked node with start time
        worked_id = uuid4()
        now = datetime.now(UTC)
        today = now.date()
        start_time = now.time()

        worked_node = await self.graph.create_worked_node(
            worked_id=str(worked_id),
            resource=str(current_user.id),
            date=today,
            from_time=start_time,
            to_time=None,  # No end time yet
            task_id=str(task_id),
            description=description,
        )

        logger.info(
            "Started time tracking",
            extra={
                "worked_id": str(worked_id),
                "task_id": str(task_id),
                "user_id": str(current_user.id),
            },
        )

        return self._node_to_response(worked_node)

    async def stop_time_tracking(
        self,
        worked_id: UUID,
        current_user: User,
    ) -> WorkedResponse:
        """
        Stop time tracking (updates worked node with end time).

        Args:
            worked_id: Worked entry UUID to stop
            current_user: User stopping time tracking

        Returns:
            Updated worked entry with end time

        Raises:
            ValueError: If worked entry doesn't exist, doesn't belong to user,
                       or already has end time
        """
        # Get existing worked node
        worked_query = f"MATCH (w:Worked {{id: '{str(worked_id)}'}}) RETURN w"
        worked_results = await self.graph.execute_query(worked_query)

        if not worked_results:
            raise ValueError(f"Worked entry {worked_id} not found")

        worked_data = worked_results[0]["w"]

        # Verify ownership
        if worked_data.get("resource") != str(current_user.id):
            raise ValueError("Cannot stop time tracking for another user")

        # Check if already stopped
        if worked_data.get("to"):
            raise ValueError("Time tracking already stopped for this entry")

        # Update with end time
        now = datetime.now(UTC)
        end_time = now.time()

        updated_node = await self.graph.update_worked_node(
            worked_id=str(worked_id),
            to_time=end_time,
        )

        logger.info(
            "Stopped time tracking",
            extra={
                "worked_id": str(worked_id),
                "user_id": str(current_user.id),
            },
        )

        return self._node_to_response(updated_node)

    async def get_active_tracking(
        self,
        current_user: User,
    ) -> list[WorkedResponse]:
        """
        Get currently running time entries for user (entries without end time).

        Args:
            current_user: User to get active tracking for

        Returns:
            List of active worked entries (without end time)
        """
        query = f"""
        MATCH (w:Worked {{resource: '{str(current_user.id)}'}})
        WHERE w.to IS NULL
        RETURN w
        ORDER BY w.date DESC, w.from DESC
        """

        results = await self.graph.execute_query(query)
        return [self._node_to_response(result["w"]) for result in results]

    async def get_task_worked_sum(
        self,
        task_id: UUID,
    ) -> float:
        """
        Calculate total time worked on a task (aggregate all linked worked nodes).

        Args:
            task_id: Task UUID to calculate worked sum for

        Returns:
            Total hours worked on the task

        Raises:
            ValueError: If task doesn't exist
        """
        # Verify task exists
        task_query = f"MATCH (t:WorkItem {{id: '{str(task_id)}', type: 'task'}}) RETURN t"
        task_results = await self.graph.execute_query(task_query)
        if not task_results:
            raise ValueError(f"Task {task_id} not found")

        # Get all worked entries for this task
        worked_entries = await self.graph.get_worked_entries_for_task(str(task_id))

        # Calculate total hours
        total_hours = 0.0
        for entry in worked_entries:
            from_time = entry.get("from")
            to_time = entry.get("to")

            if from_time and to_time:
                # Parse time strings
                if isinstance(from_time, str):
                    from_dt = datetime.strptime(from_time, "%H:%M:%S").time()
                else:
                    from_dt = from_time

                if isinstance(to_time, str):
                    to_dt = datetime.strptime(to_time, "%H:%M:%S").time()
                else:
                    to_dt = to_time

                # Calculate duration in hours
                from_seconds = from_dt.hour * 3600 + from_dt.minute * 60 + from_dt.second
                to_seconds = to_dt.hour * 3600 + to_dt.minute * 60 + to_dt.second

                # Handle case where end time is on next day
                if to_seconds < from_seconds:
                    to_seconds += 24 * 3600

                duration_seconds = to_seconds - from_seconds
                total_hours += duration_seconds / 3600

        return round(total_hours, 2)

    async def add_time_entry(
        self,
        entry_data: WorkedCreate,
        current_user: User,
    ) -> WorkedResponse:
        """
        Manually add a completed time entry.

        Args:
            entry_data: Time entry data with start and end times
            current_user: User adding the entry

        Returns:
            Created worked entry

        Raises:
            ValueError: If task doesn't exist or validation fails
        """
        # Verify task exists
        task_query = f"MATCH (t:WorkItem {{id: '{str(entry_data.task_id)}', type: 'task'}}) RETURN t"
        task_results = await self.graph.execute_query(task_query)
        if not task_results:
            raise ValueError(f"Task {entry_data.task_id} not found")

        # Create worked node
        worked_id = uuid4()

        worked_node = await self.graph.create_worked_node(
            worked_id=str(worked_id),
            resource=str(current_user.id),
            date=entry_data.date,
            from_time=entry_data.start_time,  # Use start_time from schema
            to_time=entry_data.end_time,  # Use end_time from schema
            task_id=str(entry_data.task_id),
            description=entry_data.description,
        )

        logger.info(
            "Added time entry",
            extra={
                "worked_id": str(worked_id),
                "task_id": str(entry_data.task_id),
                "user_id": str(current_user.id),
            },
        )

        return self._node_to_response(worked_node)

    async def update_time_entry(
        self,
        worked_id: UUID,
        updates: WorkedUpdate,
        current_user: User,
    ) -> WorkedResponse:
        """
        Edit an existing time entry.

        Args:
            worked_id: Worked entry UUID to update
            updates: Update data
            current_user: User updating the entry

        Returns:
            Updated worked entry

        Raises:
            ValueError: If worked entry doesn't exist or doesn't belong to user
        """
        # Get existing worked node
        worked_query = f"MATCH (w:Worked {{id: '{str(worked_id)}'}}) RETURN w"
        worked_results = await self.graph.execute_query(worked_query)

        if not worked_results:
            raise ValueError(f"Worked entry {worked_id} not found")

        worked_data = worked_results[0]["w"]

        # Verify ownership
        if worked_data.get("resource") != str(current_user.id):
            raise ValueError("Cannot update time entry for another user")

        # Update the node
        updated_node = await self.graph.update_worked_node(
            worked_id=str(worked_id),
            to_time=updates.end_time,  # Use end_time instead of to_time
            description=updates.description,
        )

        logger.info(
            "Updated time entry",
            extra={
                "worked_id": str(worked_id),
                "user_id": str(current_user.id),
            },
        )

        return self._node_to_response(updated_node)

    async def get_sorted_tasks_for_user(
        self,
        current_user: User,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """
        Get sorted task list for user: started by user → scheduled next → all others.

        Args:
            current_user: User to get tasks for
            limit: Maximum number of tasks to return

        Returns:
            List of tasks sorted by priority for the user
        """
        # Get tasks with worked entries by this user
        started_query = f"""
        MATCH (w:Worked {{resource: '{str(current_user.id)}'}})-[:WORKED_ON]->(t:WorkItem {{type: 'task'}})
        RETURN DISTINCT t, 1 as priority
        ORDER BY t.title
        LIMIT {limit}
        """

        # Get scheduled tasks (tasks with scheduled_start in the near future)
        scheduled_query = f"""
        MATCH (t:WorkItem {{type: 'task'}})
        WHERE t.scheduled_start IS NOT NULL
        AND NOT EXISTS {{
            MATCH (w:Worked {{resource: '{str(current_user.id)}'}})-[:WORKED_ON]->(t)
        }}
        RETURN t, 2 as priority
        ORDER BY t.scheduled_start
        LIMIT {limit}
        """

        # Get all other tasks
        other_query = f"""
        MATCH (t:WorkItem {{type: 'task'}})
        WHERE NOT EXISTS {{
            MATCH (w:Worked {{resource: '{str(current_user.id)}'}})-[:WORKED_ON]->(t)
        }}
        AND (t.scheduled_start IS NULL OR t.scheduled_start > datetime())
        RETURN t, 3 as priority
        ORDER BY t.title
        LIMIT {limit}
        """

        # Execute queries
        started_results = await self.graph.execute_query(started_query)
        scheduled_results = await self.graph.execute_query(scheduled_query)
        other_results = await self.graph.execute_query(other_query)

        # Combine results
        all_tasks = []
        seen_ids = set()

        for result in started_results + scheduled_results + other_results:
            task_data = result["t"]
            task_id = task_data.get("id")

            if task_id not in seen_ids:
                seen_ids.add(task_id)
                all_tasks.append({
                    "id": task_id,
                    "title": task_data.get("title", ""),
                    "description": task_data.get("description"),
                    "status": task_data.get("status", "draft"),
                    "priority": result.get("priority", 3),
                    "scheduled_start": task_data.get("scheduled_start"),
                    "scheduled_end": task_data.get("scheduled_end"),
                })

        return all_tasks[:limit]

    def _node_to_response(self, node: dict[str, Any]) -> WorkedResponse:
        """Convert graph node to WorkedResponse"""
        # Parse date
        date_val = node.get("date")
        if isinstance(date_val, str):
            parsed_date = datetime.fromisoformat(date_val).date()
        elif isinstance(date_val, date_type):
            parsed_date = date_val
        else:
            parsed_date = datetime.now(UTC).date()

        # Parse times
        from_val = node.get("from")
        if isinstance(from_val, str):
            from_time = datetime.strptime(from_val, "%H:%M:%S").time()
        elif isinstance(from_val, time_type):
            from_time = from_val
        else:
            from_time = datetime.now(UTC).time()

        to_val = node.get("to")
        if to_val:
            if isinstance(to_val, str):
                to_time = datetime.strptime(to_val, "%H:%M:%S").time()
            elif isinstance(to_val, time_type):
                to_time = to_val
            else:
                to_time = None
        else:
            to_time = None

        # Get created_at or use current time
        created_at = node.get("created_at")
        if created_at is None:
            created_at = datetime.now(UTC)
        elif isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)

        # Get task_id - try to extract from node or use a placeholder
        task_id_val = node.get("task_id")
        if task_id_val:
            task_id = UUID(task_id_val) if isinstance(task_id_val, str) else task_id_val
        else:
            # Use a zero UUID as placeholder if not available
            task_id = UUID("00000000-0000-0000-0000-000000000000")

        return WorkedResponse(
            id=UUID(node["id"]),
            resource=UUID(node["resource"]),
            task_id=task_id,
            date=parsed_date,
            start_time=from_time,  # Use start_time instead of from_time
            end_time=to_time,  # Use end_time instead of to_time
            description=node.get("description"),
            created_at=created_at,
        )

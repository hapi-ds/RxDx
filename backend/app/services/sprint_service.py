"""Service for Sprint operations"""

import logging
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.db.graph import GraphService
from app.models.user import User
from app.schemas.sprint import (
    SprintCreate,
    SprintResponse,
    SprintUpdate,
    SprintVelocity,
    BurndownPoint
)

logger = logging.getLogger(__name__)


class SprintService:
    """Service for managing Sprint nodes in the graph database"""

    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    async def create_sprint(
        self,
        sprint_data: SprintCreate,
        current_user: User
    ) -> SprintResponse:
        """
        Create a new Sprint node in the graph database

        Args:
            sprint_data: Sprint creation data
            current_user: User creating the sprint

        Returns:
            Created sprint with metadata

        Raises:
            ValueError: If validation fails or if there's already an active sprint
        """
        # Check if there's already an active sprint for this project
        active_sprints = await self.list_sprints(
            project_id=sprint_data.project_id,
            status="active"
        )
        
        if active_sprints:
            raise ValueError(
                f"Project {sprint_data.project_id} already has an active sprint. "
                "Complete or cancel the current sprint before starting a new one."
            )

        sprint_id = uuid4()

        # Prepare sprint properties
        properties = {
            "id": str(sprint_id),
            "name": sprint_data.name,
            "start_date": sprint_data.start_date.isoformat(),
            "end_date": sprint_data.end_date.isoformat(),
            "status": sprint_data.status,
            "project_id": str(sprint_data.project_id),
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
        }

        if sprint_data.goal:
            properties["goal"] = sprint_data.goal

        if sprint_data.capacity_hours is not None:
            properties["capacity_hours"] = sprint_data.capacity_hours

        if sprint_data.capacity_story_points is not None:
            properties["capacity_story_points"] = sprint_data.capacity_story_points

        # Create the Sprint node
        await self.graph_service.create_node("Sprint", properties)

        logger.info(
            f"Created sprint {sprint_id} for project {sprint_data.project_id}"
        )

        # Return the created sprint
        return SprintResponse(
            id=sprint_id,
            name=sprint_data.name,
            goal=sprint_data.goal,
            start_date=sprint_data.start_date,
            end_date=sprint_data.end_date,
            capacity_hours=sprint_data.capacity_hours,
            capacity_story_points=sprint_data.capacity_story_points,
            actual_velocity_hours=0.0,
            actual_velocity_story_points=0,
            status=sprint_data.status,
            project_id=sprint_data.project_id,
            created_at=datetime.now(UTC),
        )

    async def get_sprint(self, sprint_id: UUID) -> SprintResponse | None:
        """
        Get a sprint by ID

        Args:
            sprint_id: Sprint UUID

        Returns:
            Sprint if found, None otherwise
        """
        query = f"MATCH (s:Sprint {{id: '{sprint_id}'}}) RETURN s"
        results = await self.graph_service.execute_query(query)

        if not results:
            return None

        # Extract sprint data from result
        sprint_data = results[0]
        if 'properties' in sprint_data:
            sprint_data = sprint_data['properties']

        return self._graph_data_to_response(sprint_data)

    async def update_sprint(
        self,
        sprint_id: UUID,
        updates: SprintUpdate,
        current_user: User
    ) -> SprintResponse | None:
        """
        Update a sprint

        Args:
            sprint_id: Sprint UUID
            updates: Update data
            current_user: User performing the update

        Returns:
            Updated sprint if found, None otherwise

        Raises:
            ValueError: If trying to set status to active when another sprint is already active
        """
        # Get existing sprint
        existing = await self.get_sprint(sprint_id)
        if not existing:
            return None

        # Check if trying to change status to active
        if updates.status == "active" and existing.status != "active":
            # Check if there's already an active sprint for this project
            active_sprints = await self.list_sprints(
                project_id=existing.project_id,
                status="active"
            )
            
            if active_sprints:
                raise ValueError(
                    f"Project {existing.project_id} already has an active sprint. "
                    "Complete or cancel the current sprint before starting a new one."
                )

        # Prepare update data
        update_data = {}

        if updates.name is not None:
            update_data["name"] = updates.name

        if updates.goal is not None:
            update_data["goal"] = updates.goal

        if updates.start_date is not None:
            update_data["start_date"] = updates.start_date.isoformat()

        if updates.end_date is not None:
            update_data["end_date"] = updates.end_date.isoformat()

        if updates.capacity_hours is not None:
            update_data["capacity_hours"] = updates.capacity_hours

        if updates.capacity_story_points is not None:
            update_data["capacity_story_points"] = updates.capacity_story_points

        if updates.actual_velocity_hours is not None:
            update_data["actual_velocity_hours"] = updates.actual_velocity_hours

        if updates.actual_velocity_story_points is not None:
            update_data["actual_velocity_story_points"] = updates.actual_velocity_story_points

        if updates.status is not None:
            update_data["status"] = updates.status

        # Always update timestamp
        update_data["updated_at"] = datetime.now(UTC).isoformat()

        # Build SET clause for Cypher query
        set_clauses = []
        for key, value in update_data.items():
            if isinstance(value, bool):
                set_clauses.append(f"s.{key} = {str(value).lower()}")
            elif isinstance(value, (int, float)):
                set_clauses.append(f"s.{key} = {value}")
            elif isinstance(value, str):
                escaped_value = value.replace("'", "\\'")
                set_clauses.append(f"s.{key} = '{escaped_value}'")
            else:
                set_clauses.append(f"s.{key} = '{value}'")

        set_clause = ", ".join(set_clauses)

        # Update the sprint
        query = f"""
        MATCH (s:Sprint {{id: '{sprint_id}'}})
        SET {set_clause}
        RETURN s
        """

        results = await self.graph_service.execute_query(query)

        if not results:
            return None

        # Extract updated sprint data
        sprint_data = results[0]
        if 'properties' in sprint_data:
            sprint_data = sprint_data['properties']

        logger.info(f"Updated sprint {sprint_id}")

        return self._graph_data_to_response(sprint_data)

    async def delete_sprint(self, sprint_id: UUID) -> bool:
        """
        Delete a sprint and move all tasks back to backlog

        Args:
            sprint_id: Sprint UUID

        Returns:
            True if deleted, False if not found
        """
        # Check if sprint exists
        existing = await self.get_sprint(sprint_id)
        if not existing:
            return False

        # Get all tasks assigned to this sprint
        tasks_query = f"""
        MATCH (t:WorkItem {{type: 'task'}})-[:ASSIGNED_TO_SPRINT]->(s:Sprint {{id: '{sprint_id}'}})
        RETURN t.id as task_id
        """
        task_results = await self.graph_service.execute_query(tasks_query)

        # Remove sprint assignments (tasks will be returned to backlog if status is "ready")
        for result in task_results:
            task_id = result.get('task_id')
            if task_id:
                # Remove ASSIGNED_TO_SPRINT relationship
                await self.graph_service.remove_task_from_sprint(
                    task_id=task_id,
                    sprint_id=str(sprint_id),
                    return_to_backlog=True,
                    backlog_id=str(existing.project_id)  # Use project_id as backlog_id
                )

        # Delete the sprint and its relationships
        query = f"""
        MATCH (s:Sprint {{id: '{sprint_id}'}})
        DETACH DELETE s
        """

        await self.graph_service.execute_query(query)

        logger.info(f"Deleted sprint {sprint_id}")

        return True

    async def list_sprints(
        self,
        project_id: UUID | None = None,
        status: str | None = None,
        limit: int = 100
    ) -> list[SprintResponse]:
        """
        List sprints with optional filters

        Args:
            project_id: Filter by project ID
            status: Filter by status
            limit: Maximum number of results

        Returns:
            List of sprints
        """
        # Build WHERE clauses
        where_clauses = []

        if project_id:
            where_clauses.append(f"s.project_id = '{project_id}'")

        if status:
            where_clauses.append(f"s.status = '{status}'")

        where_clause = " AND ".join(where_clauses) if where_clauses else "true"

        query = f"""
        MATCH (s:Sprint)
        WHERE {where_clause}
        RETURN s
        ORDER BY s.start_date DESC
        LIMIT {limit}
        """

        results = await self.graph_service.execute_query(query)

        sprints = []
        for result in results:
            sprint_data = result
            if 'properties' in sprint_data:
                sprint_data = sprint_data['properties']

            sprint = self._graph_data_to_response(sprint_data)
            if sprint:
                sprints.append(sprint)

        return sprints

    async def calculate_sprint_capacity(
        self,
        sprint_id: UUID
    ) -> tuple[float, int]:
        """
        Calculate sprint capacity from allocated resources

        Args:
            sprint_id: Sprint UUID

        Returns:
            Tuple of (capacity_hours, capacity_story_points)
        """
        # Get sprint details
        sprint = await self.get_sprint(sprint_id)
        if not sprint:
            raise ValueError(f"Sprint {sprint_id} not found")

        # Calculate duration in days
        duration_days = (sprint.end_date - sprint.start_date).days

        # Get all resources allocated to the project
        resources_query = f"""
        MATCH (r:Resource)-[rel:ALLOCATED_TO]->(p:Project {{id: '{sprint.project_id}'}})
        RETURN r, rel.allocation_percentage as allocation_percentage
        """
        resource_results = await self.graph_service.execute_query(resources_query)

        total_capacity_hours = 0.0
        total_capacity_points = 0

        for result in resource_results:
            resource_data = result.get('r', {})
            if 'properties' in resource_data:
                resource_data = resource_data['properties']

            allocation_percentage = result.get('allocation_percentage', 100.0)

            # Assume 8 hours per day per resource
            hours_per_day = 8.0
            resource_capacity = duration_days * hours_per_day * (allocation_percentage / 100.0)
            total_capacity_hours += resource_capacity

            # Estimate story points (rough conversion: 8 hours = 1 story point)
            total_capacity_points += int(resource_capacity / 8.0)

        return (total_capacity_hours, total_capacity_points)

    async def assign_task_to_sprint(
        self,
        sprint_id: UUID,
        task_id: UUID,
        current_user: User
    ) -> bool:
        """
        Assign a task to a sprint (removes from backlog)

        Args:
            sprint_id: Sprint UUID
            task_id: Task UUID
            current_user: User assigning the task

        Returns:
            True if assigned successfully

        Raises:
            ValueError: If sprint or task not found, or if sprint capacity exceeded
        """
        # Check if sprint exists
        sprint = await self.get_sprint(sprint_id)
        if not sprint:
            raise ValueError(f"Sprint {sprint_id} not found")

        # Get task details to check estimated hours
        task_query = f"""
        MATCH (t:WorkItem {{id: '{task_id}', type: 'task'}})
        RETURN t.estimated_hours as estimated_hours, t.story_points as story_points
        """
        task_results = await self.graph_service.execute_query(task_query)
        
        if not task_results:
            raise ValueError(f"Task {task_id} not found")
        
        task_data = task_results[0]
        task_estimated_hours = task_data.get('estimated_hours', 0.0) or 0.0
        task_story_points = task_data.get('story_points', 0) or 0

        # Check capacity if sprint has capacity limits
        if sprint.capacity_hours is not None or sprint.capacity_story_points is not None:
            # Get current sprint workload
            workload_query = f"""
            MATCH (t:WorkItem {{type: 'task'}})-[:ASSIGNED_TO_SPRINT]->(s:Sprint {{id: '{sprint_id}'}})
            RETURN sum(coalesce(t.estimated_hours, 0.0)) as total_hours,
                   sum(coalesce(t.story_points, 0)) as total_points
            """
            workload_results = await self.graph_service.execute_query(workload_query)
            
            if workload_results:
                current_hours = workload_results[0].get('total_hours', 0.0) or 0.0
                current_points = workload_results[0].get('total_points', 0) or 0
                
                # Check hours capacity
                if sprint.capacity_hours is not None:
                    new_total_hours = current_hours + task_estimated_hours
                    if new_total_hours > sprint.capacity_hours:
                        raise ValueError(
                            f"Adding this task would exceed sprint capacity. "
                            f"Current: {current_hours:.1f}h, Task: {task_estimated_hours:.1f}h, "
                            f"Capacity: {sprint.capacity_hours:.1f}h"
                        )
                
                # Check story points capacity
                if sprint.capacity_story_points is not None:
                    new_total_points = current_points + task_story_points
                    if new_total_points > sprint.capacity_story_points:
                        raise ValueError(
                            f"Adding this task would exceed sprint capacity. "
                            f"Current: {current_points} points, Task: {task_story_points} points, "
                            f"Capacity: {sprint.capacity_story_points} points"
                        )

        # Use graph service to move task to sprint (handles backlog removal)
        await self.graph_service.move_task_to_sprint(
            task_id=str(task_id),
            sprint_id=str(sprint_id),
            assigned_by_user_id=str(current_user.id)
        )

        logger.info(f"Assigned task {task_id} to sprint {sprint_id}")

        return True

    async def remove_task_from_sprint(
        self,
        sprint_id: UUID,
        task_id: UUID,
        return_to_backlog: bool = True
    ) -> bool:
        """
        Remove a task from a sprint

        Args:
            sprint_id: Sprint UUID
            task_id: Task UUID
            return_to_backlog: Whether to return task to backlog

        Returns:
            True if removed successfully
        """
        # Get sprint to find project/backlog
        sprint = await self.get_sprint(sprint_id)
        if not sprint:
            raise ValueError(f"Sprint {sprint_id} not found")

        # Use graph service to remove task from sprint
        result = await self.graph_service.remove_task_from_sprint(
            task_id=str(task_id),
            sprint_id=str(sprint_id),
            return_to_backlog=return_to_backlog,
            backlog_id=str(sprint.project_id) if return_to_backlog else None
        )

        if result:
            logger.info(f"Removed task {task_id} from sprint {sprint_id}")

        return result

    async def start_sprint(
        self,
        sprint_id: UUID,
        current_user: User
    ) -> SprintResponse | None:
        """
        Start a sprint (change status to active)

        Args:
            sprint_id: Sprint UUID
            current_user: User starting the sprint

        Returns:
            Updated sprint

        Raises:
            ValueError: If there's already an active sprint
        """
        sprint = await self.get_sprint(sprint_id)
        if not sprint:
            return None

        # Check if there's already an active sprint
        active_sprints = await self.list_sprints(
            project_id=sprint.project_id,
            status="active"
        )

        if active_sprints:
            raise ValueError(
                f"Project {sprint.project_id} already has an active sprint. "
                "Complete or cancel the current sprint before starting a new one."
            )

        # Update status to active
        updates = SprintUpdate(status="active")
        return await self.update_sprint(sprint_id, updates, current_user)

    async def complete_sprint(
        self,
        sprint_id: UUID,
        current_user: User
    ) -> SprintResponse | None:
        """
        Complete a sprint and calculate velocity

        Args:
            sprint_id: Sprint UUID
            current_user: User completing the sprint

        Returns:
            Updated sprint with velocity calculated
        """
        sprint = await self.get_sprint(sprint_id)
        if not sprint:
            return None

        # Calculate velocity
        velocity_hours, velocity_points = await self.calculate_sprint_velocity(sprint_id)

        # Update sprint with velocity and status
        updates = SprintUpdate(
            status="completed",
            actual_velocity_hours=velocity_hours,
            actual_velocity_story_points=velocity_points
        )

        return await self.update_sprint(sprint_id, updates, current_user)

    async def calculate_sprint_velocity(
        self,
        sprint_id: UUID
    ) -> tuple[float, int]:
        """
        Calculate sprint velocity from completed tasks

        Args:
            sprint_id: Sprint UUID

        Returns:
            Tuple of (velocity_hours, velocity_story_points)
        """
        # Get all completed tasks in this sprint
        query = f"""
        MATCH (t:WorkItem {{type: 'task', status: 'completed'}})-[:ASSIGNED_TO_SPRINT]->(s:Sprint {{id: '{sprint_id}'}})
        RETURN t.estimated_hours as estimated_hours, t.story_points as story_points
        """

        results = await self.graph_service.execute_query(query)

        total_hours = 0.0
        total_points = 0

        for result in results:
            estimated_hours = result.get('estimated_hours', 0.0)
            story_points = result.get('story_points', 0)

            if estimated_hours:
                total_hours += float(estimated_hours)

            if story_points:
                total_points += int(story_points)

        return (total_hours, total_points)

    async def get_team_average_velocity(
        self,
        project_id: UUID,
        num_sprints: int = 3
    ) -> tuple[float, float]:
        """
        Get team average velocity from last N sprints

        Args:
            project_id: Project UUID
            num_sprints: Number of recent sprints to average

        Returns:
            Tuple of (avg_velocity_hours, avg_velocity_story_points)
        """
        # Get last N completed sprints
        query = f"""
        MATCH (s:Sprint {{project_id: '{project_id}', status: 'completed'}})
        RETURN s.actual_velocity_hours as velocity_hours, 
               s.actual_velocity_story_points as velocity_points
        ORDER BY s.end_date DESC
        LIMIT {num_sprints}
        """

        results = await self.graph_service.execute_query(query)

        if not results:
            return (0.0, 0.0)

        total_hours = 0.0
        total_points = 0.0
        count = 0

        for result in results:
            velocity_hours = result.get('velocity_hours', 0.0)
            velocity_points = result.get('velocity_points', 0.0)

            if velocity_hours:
                total_hours += float(velocity_hours)

            if velocity_points:
                total_points += float(velocity_points)

            count += 1

        if count == 0:
            return (0.0, 0.0)

        return (total_hours / count, total_points / count)

    def _graph_data_to_response(self, data: dict) -> SprintResponse | None:
        """
        Convert graph data to SprintResponse

        Args:
            data: Raw graph data

        Returns:
            SprintResponse or None if data is invalid
        """
        try:
            # Parse datetime fields
            start_date = datetime.fromisoformat(data["start_date"])
            end_date = datetime.fromisoformat(data["end_date"])
            created_at = datetime.fromisoformat(data["created_at"])
            updated_at = datetime.fromisoformat(data.get("updated_at", data["created_at"]))

            return SprintResponse(
                id=UUID(data["id"]),
                name=data["name"],
                goal=data.get("goal"),
                start_date=start_date,
                end_date=end_date,
                capacity_hours=data.get("capacity_hours"),
                capacity_story_points=data.get("capacity_story_points"),
                actual_velocity_hours=data.get("actual_velocity_hours", 0.0),
                actual_velocity_story_points=data.get("actual_velocity_story_points", 0),
                status=data["status"],
                project_id=UUID(data["project_id"]),
                created_at=created_at,
                updated_at=updated_at,
            )
        except (KeyError, ValueError) as e:
            logger.error(f"Failed to parse sprint data: {e}")
            return None

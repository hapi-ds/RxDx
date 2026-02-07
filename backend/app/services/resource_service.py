"""Service for managing Resource entities in the graph database"""

import logging
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.db.graph import GraphService
from app.schemas.resource import (
    ResourceAllocationCreate,
    ResourceAllocationResponse,
    ResourceAllocationUpdate,
    ResourceCreate,
    ResourceResponse,
    ResourceUpdate,
)

logger = logging.getLogger(__name__)


class ResourceService:
    """Service for Resource operations"""

    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    async def create_resource(
        self, resource_data: ResourceCreate
    ) -> ResourceResponse:
        """
        Create a new Resource node in the graph database

        Args:
            resource_data: Resource creation data

        Returns:
            Created resource with metadata

        Raises:
            ValueError: If resource creation fails or department doesn't exist
        """
        # Verify department exists
        department_query = (
            f"MATCH (d:Department {{id: '{str(resource_data.department_id)}'}}) RETURN d"
        )
        department_results = await self.graph_service.execute_query(department_query)
        if not department_results:
            raise ValueError(f"Department {resource_data.department_id} not found")

        resource_id = uuid4()
        now = datetime.now(UTC)

        properties = {
            "id": str(resource_id),
            "name": resource_data.name,
            "type": resource_data.type,
            "capacity": resource_data.capacity,
            "department_id": str(resource_data.department_id),
            "availability": resource_data.availability,
            "created_at": now.isoformat(),
        }

        if resource_data.skills:
            properties["skills"] = resource_data.skills

        try:
            logger.info(
                f"Creating resource: {resource_data.name} for department {resource_data.department_id}"
            )

            # Create resource node
            await self.graph_service.create_node("Resource", properties)

            # Create BELONGS_TO relationship from Resource to Department
            await self.graph_service.create_relationship(
                from_id=str(resource_id),
                to_id=str(resource_data.department_id),
                rel_type="BELONGS_TO",
            )

            return ResourceResponse(
                id=resource_id,
                name=resource_data.name,
                type=resource_data.type,
                capacity=resource_data.capacity,
                department_id=resource_data.department_id,
                skills=resource_data.skills,
                availability=resource_data.availability,
                created_at=now,
            )
        except Exception as e:
            logger.error(f"Failed to create resource: {e}")
            raise ValueError(f"Failed to create resource: {e}")

    async def get_resource(self, resource_id: UUID) -> ResourceResponse | None:
        """
        Get a Resource by ID

        Args:
            resource_id: Resource UUID

        Returns:
            Resource if found, None otherwise
        """
        try:
            query = f"MATCH (r:Resource {{id: '{str(resource_id)}'}}) RETURN r"
            results = await self.graph_service.execute_query(query)

            if not results:
                return None

            resource_data = results[0]
            if "properties" in resource_data:
                props = resource_data["properties"]
            else:
                props = resource_data

            return ResourceResponse(
                id=UUID(props["id"]),
                name=props["name"],
                type=props["type"],
                capacity=props["capacity"],
                department_id=UUID(props["department_id"]),
                skills=props.get("skills"),
                availability=props.get("availability", "available"),
                created_at=datetime.fromisoformat(props["created_at"]),
            )
        except Exception as e:
            logger.error(f"Failed to get resource {resource_id}: {e}")
            return None

    async def update_resource(
        self, resource_id: UUID, resource_data: ResourceUpdate
    ) -> ResourceResponse | None:
        """
        Update a Resource

        Args:
            resource_id: Resource UUID
            resource_data: Resource update data

        Returns:
            Updated resource if found, None otherwise

        Raises:
            ValueError: If update fails or department doesn't exist
        """
        # Check if resource exists
        existing = await self.get_resource(resource_id)
        if not existing:
            return None

        # If department_id is being updated, verify new department exists
        if resource_data.department_id:
            department_query = (
                f"MATCH (d:Department {{id: '{str(resource_data.department_id)}'}}) RETURN d"
            )
            department_results = await self.graph_service.execute_query(department_query)
            if not department_results:
                raise ValueError(f"Department {resource_data.department_id} not found")

        # Build update properties
        update_props = {}
        if resource_data.name is not None:
            update_props["name"] = resource_data.name
        if resource_data.type is not None:
            update_props["type"] = resource_data.type
        if resource_data.capacity is not None:
            update_props["capacity"] = resource_data.capacity
        if resource_data.department_id is not None:
            update_props["department_id"] = str(resource_data.department_id)
        if resource_data.skills is not None:
            update_props["skills"] = resource_data.skills
        if resource_data.availability is not None:
            update_props["availability"] = resource_data.availability

        if not update_props:
            # Nothing to update
            return existing

        try:
            # Update resource node
            await self.graph_service.update_node(str(resource_id), update_props)

            # If department changed, update BELONGS_TO relationship
            if resource_data.department_id and resource_data.department_id != existing.department_id:
                # Remove old BELONGS_TO relationship
                delete_rel_query = f"""
                MATCH (r:Resource {{id: '{str(resource_id)}'}})-[rel:BELONGS_TO]->(d:Department)
                DELETE rel
                """
                await self.graph_service.execute_query(delete_rel_query)

                # Create new BELONGS_TO relationship
                await self.graph_service.create_relationship(
                    from_id=str(resource_id),
                    to_id=str(resource_data.department_id),
                    rel_type="BELONGS_TO",
                )

            # Return updated resource
            return await self.get_resource(resource_id)
        except Exception as e:
            logger.error(f"Failed to update resource {resource_id}: {e}")
            raise ValueError(f"Failed to update resource: {e}")

    async def delete_resource(self, resource_id: UUID) -> bool:
        """
        Delete a Resource

        Args:
            resource_id: Resource UUID

        Returns:
            True if deleted, False if not found

        Raises:
            ValueError: If resource has active allocations
        """
        # Check if resource has active allocations
        allocations = await self.graph_service.get_resource_allocations(str(resource_id))
        if allocations:
            raise ValueError(
                f"Cannot delete resource {resource_id} - it has {len(allocations)} active allocations"
            )

        try:
            return await self.graph_service.delete_node(str(resource_id))
        except Exception as e:
            logger.error(f"Failed to delete resource {resource_id}: {e}")
            return False

    async def list_resources(
        self,
        department_id: UUID | None = None,
        resource_type: str | None = None,
        availability: str | None = None,
        skills: list[str] | None = None,
        limit: int = 100
    ) -> list[ResourceResponse]:
        """
        List resources with optional filters

        Args:
            department_id: Optional department filter
            resource_type: Optional type filter
            availability: Optional availability filter
            skills: Optional skills filter (resources must have all specified skills)
            limit: Maximum number of results

        Returns:
            List of resources
        """
        # Build WHERE clauses
        where_clauses = []
        if department_id:
            where_clauses.append(f"r.department_id = '{str(department_id)}'")
        if resource_type:
            where_clauses.append(f"r.type = '{resource_type}'")
        if availability:
            where_clauses.append(f"r.availability = '{availability}'")

        where_clause = " AND ".join(where_clauses) if where_clauses else "true"

        query = f"""
        MATCH (r:Resource)
        WHERE {where_clause}
        RETURN r
        LIMIT {limit}
        """

        try:
            results = await self.graph_service.execute_query(query)

            resources = []
            for result in results:
                resource_data = result
                if "properties" in resource_data:
                    props = resource_data["properties"]
                else:
                    props = resource_data

                # Apply skills filter if provided
                if skills:
                    resource_skills = props.get("skills", [])
                    if not all(skill in resource_skills for skill in skills):
                        continue

                resources.append(
                    ResourceResponse(
                        id=UUID(props["id"]),
                        name=props["name"],
                        type=props["type"],
                        capacity=props["capacity"],
                        department_id=UUID(props["department_id"]),
                        skills=props.get("skills"),
                        availability=props.get("availability", "available"),
                        created_at=datetime.fromisoformat(props["created_at"]),
                    )
                )

            return resources
        except Exception as e:
            logger.error(f"Failed to list resources: {e}")
            return []

    async def allocate_resource(
        self, allocation_data: ResourceAllocationCreate
    ) -> ResourceAllocationResponse:
        """
        Allocate a resource to a project or task

        Args:
            allocation_data: Allocation creation data

        Returns:
            Created allocation

        Raises:
            ValueError: If allocation fails
        """
        try:
            if allocation_data.target_type == "project":
                await self.graph_service.allocate_resource_to_project(
                    resource_id=str(allocation_data.resource_id),
                    project_id=str(allocation_data.target_id),
                    allocation_percentage=allocation_data.allocation_percentage,
                    lead=allocation_data.lead,
                    start_date=allocation_data.start_date.isoformat() if allocation_data.start_date else None,
                    end_date=allocation_data.end_date.isoformat() if allocation_data.end_date else None,
                )
            else:  # task
                await self.graph_service.allocate_resource_to_task(
                    resource_id=str(allocation_data.resource_id),
                    task_id=str(allocation_data.target_id),
                    allocation_percentage=allocation_data.allocation_percentage,
                    lead=allocation_data.lead,
                    start_date=allocation_data.start_date.isoformat() if allocation_data.start_date else None,
                    end_date=allocation_data.end_date.isoformat() if allocation_data.end_date else None,
                )

            # Get target name
            target_query = f"MATCH (t {{id: '{str(allocation_data.target_id)}'}}) RETURN t"
            target_results = await self.graph_service.execute_query(target_query)
            target_name = None
            if target_results:
                target_data = target_results[0]
                if "properties" in target_data:
                    props = target_data["properties"]
                else:
                    props = target_data
                target_name = props.get("name") or props.get("title")

            return ResourceAllocationResponse(
                allocation_percentage=allocation_data.allocation_percentage,
                lead=allocation_data.lead,
                start_date=allocation_data.start_date,
                end_date=allocation_data.end_date,
                target_id=allocation_data.target_id,
                target_type=allocation_data.target_type,
                target_name=target_name,
            )
        except Exception as e:
            logger.error(f"Failed to allocate resource: {e}")
            raise ValueError(f"Failed to allocate resource: {e}")

    async def update_allocation(
        self,
        resource_id: UUID,
        target_id: UUID,
        allocation_data: ResourceAllocationUpdate
    ) -> ResourceAllocationResponse:
        """
        Update a resource allocation

        Args:
            resource_id: Resource UUID
            target_id: Project or Task UUID
            allocation_data: Allocation update data

        Returns:
            Updated allocation

        Raises:
            ValueError: If update fails
        """
        try:
            await self.graph_service.update_resource_allocation(
                resource_id=str(resource_id),
                target_id=str(target_id),
                allocation_percentage=allocation_data.allocation_percentage,
                lead=allocation_data.lead,
                start_date=allocation_data.start_date.isoformat() if allocation_data.start_date else None,
                end_date=allocation_data.end_date.isoformat() if allocation_data.end_date else None,
            )

            # Get updated allocation
            allocations = await self.graph_service.get_resource_allocations(str(resource_id))
            for alloc in allocations:
                if alloc["target_id"] == str(target_id):
                    return ResourceAllocationResponse(
                        allocation_percentage=alloc["allocation_percentage"],
                        lead=alloc["lead"],
                        start_date=datetime.fromisoformat(alloc["start_date"]) if alloc.get("start_date") else None,
                        end_date=datetime.fromisoformat(alloc["end_date"]) if alloc.get("end_date") else None,
                        target_id=UUID(alloc["target_id"]),
                        target_type=alloc["target_type"],
                        target_name=alloc.get("target_name"),
                    )

            raise ValueError("Allocation not found after update")
        except Exception as e:
            logger.error(f"Failed to update allocation: {e}")
            raise ValueError(f"Failed to update allocation: {e}")

    async def remove_allocation(
        self,
        resource_id: UUID,
        target_id: UUID
    ) -> bool:
        """
        Remove a resource allocation

        Args:
            resource_id: Resource UUID
            target_id: Project or Task UUID

        Returns:
            True if removed, False if not found
        """
        try:
            return await self.graph_service.remove_resource_allocation(
                resource_id=str(resource_id),
                target_id=str(target_id)
            )
        except Exception as e:
            logger.error(f"Failed to remove allocation: {e}")
            return False

    async def get_resource_allocations(
        self, resource_id: UUID
    ) -> list[ResourceAllocationResponse]:
        """
        Get all allocations for a resource

        Args:
            resource_id: Resource UUID

        Returns:
            List of allocations
        """
        try:
            allocations = await self.graph_service.get_resource_allocations(str(resource_id))

            return [
                ResourceAllocationResponse(
                    allocation_percentage=alloc["allocation_percentage"],
                    lead=alloc["lead"],
                    start_date=datetime.fromisoformat(alloc["start_date"]) if alloc.get("start_date") else None,
                    end_date=datetime.fromisoformat(alloc["end_date"]) if alloc.get("end_date") else None,
                    target_id=UUID(alloc["target_id"]),
                    target_type=alloc["target_type"],
                    target_name=alloc.get("target_name"),
                )
                for alloc in allocations
            ]
        except Exception as e:
            logger.error(f"Failed to get resource allocations: {e}")
            return []

    async def get_lead_resources_for_project(
        self, project_id: UUID
    ) -> list[ResourceResponse]:
        """
        Get all lead resources allocated to a project

        Args:
            project_id: Project UUID

        Returns:
            List of lead resources
        """
        try:
            resources = await self.graph_service.get_lead_resources_for_project(str(project_id))

            return [
                ResourceResponse(
                    id=UUID(res["id"]),
                    name=res["name"],
                    type=res["type"],
                    capacity=res["capacity"],
                    department_id=UUID(res["department_id"]),
                    skills=res.get("skills"),
                    availability=res.get("availability", "available"),
                    created_at=datetime.fromisoformat(res["created_at"]),
                )
                for res in resources
            ]
        except Exception as e:
            logger.error(f"Failed to get lead resources for project: {e}")
            return []

    async def get_lead_resources_for_task(
        self, task_id: UUID
    ) -> list[ResourceResponse]:
        """
        Get all lead resources allocated to a task

        Args:
            task_id: Task UUID

        Returns:
            List of lead resources
        """
        try:
            resources = await self.graph_service.get_lead_resources_for_task(str(task_id))

            return [
                ResourceResponse(
                    id=UUID(res["id"]),
                    name=res["name"],
                    type=res["type"],
                    capacity=res["capacity"],
                    department_id=UUID(res["department_id"]),
                    skills=res.get("skills"),
                    availability=res.get("availability", "available"),
                    created_at=datetime.fromisoformat(res["created_at"]),
                )
                for res in resources
            ]
        except Exception as e:
            logger.error(f"Failed to get lead resources for task: {e}")
            return []


async def get_resource_service(
    graph_service: GraphService,
) -> ResourceService:
    """Dependency for getting resource service"""
    return ResourceService(graph_service)

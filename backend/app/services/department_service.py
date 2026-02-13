"""Service for managing Department entities in the graph database"""

import logging
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.db.graph import GraphService
from app.schemas.department import (
    DepartmentCreate,
    DepartmentResponse,
    DepartmentUpdate,
)

logger = logging.getLogger(__name__)


class DepartmentService:
    """Service for Department operations"""

    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    async def create_department(
        self, department_data: DepartmentCreate
    ) -> DepartmentResponse:
        """
        Create a new Department node in the graph database

        Args:
            department_data: Department creation data

        Returns:
            Created department with metadata

        Raises:
            ValueError: If department creation fails or company doesn't exist
        """
        # Verify company exists
        company_query = (
            f"MATCH (c:Company {{id: '{str(department_data.company_id)}'}}) RETURN c"
        )
        company_results = await self.graph_service.execute_query(company_query)
        if not company_results:
            raise ValueError(f"Company {department_data.company_id} not found")

        department_id = uuid4()
        now = datetime.now(UTC)

        properties = {
            "id": str(department_id),
            "name": department_data.name,
            "type": "Department",  # Add explicit type property
            "company_id": str(department_data.company_id),
            "created_at": now.isoformat(),
        }

        if department_data.description:
            properties["description"] = department_data.description
        if department_data.manager_user_id:
            properties["manager_user_id"] = str(department_data.manager_user_id)

        try:
            logger.info(
                f"Creating department: {department_data.name} for company {department_data.company_id}"
            )

            # Create department node
            await self.graph_service.create_node("Department", properties)

            # Create PARENT_OF relationship from Company to Department
            await self.graph_service.create_relationship(
                from_id=str(department_data.company_id),
                to_id=str(department_id),
                rel_type="PARENT_OF",
            )

            return DepartmentResponse(
                id=department_id,
                name=department_data.name,
                description=department_data.description,
                manager_user_id=department_data.manager_user_id,
                company_id=department_data.company_id,
                created_at=now,
            )
        except Exception as e:
            logger.error(f"Failed to create department: {e}")
            raise ValueError(f"Failed to create department: {e}")

    async def get_department(self, department_id: UUID) -> DepartmentResponse | None:
        """
        Get a Department by ID with company information

        Args:
            department_id: Department UUID

        Returns:
            Department if found, None otherwise
        """
        try:
            # Query department with company relationship
            query = f"""
            MATCH (d:Department {{id: '{str(department_id)}'}})
            OPTIONAL MATCH (c:Company)-[:PARENT_OF]->(d)
            RETURN d, c
            """
            results = await self.graph_service.execute_query(query)

            if not results:
                return None

            result = results[0]

            # Extract department data from result
            department_data = result.get("d", result)
            if "properties" in department_data:
                department_data = department_data["properties"]

            # Extract company data if present
            company_data = result.get("c")
            company = None
            if company_data:
                if "properties" in company_data:
                    company_data = company_data["properties"]

                from app.schemas.company import CompanyResponse

                company = CompanyResponse(
                    id=UUID(company_data["id"]),
                    name=company_data["name"],
                    description=company_data.get("description"),
                    created_at=datetime.fromisoformat(company_data["created_at"]),
                    updated_at=datetime.fromisoformat(
                        company_data.get("updated_at", company_data["created_at"])
                    ),
                )

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
                company=company,
            )
        except Exception as e:
            logger.error(f"Failed to get department {department_id}: {e}")
            return None

    async def update_department(
        self, department_id: UUID, updates: DepartmentUpdate
    ) -> DepartmentResponse | None:
        """
        Update a Department

        Args:
            department_id: Department UUID
            updates: Department update data

        Returns:
            Updated department if found, None otherwise

        Raises:
            ValueError: If company doesn't exist when updating company_id
        """
        # First check if department exists
        existing = await self.get_department(department_id)
        if not existing:
            return None

        # Build update properties
        update_props = {}

        if updates.name is not None:
            update_props["name"] = updates.name
        if updates.description is not None:
            update_props["description"] = updates.description
        if updates.manager_user_id is not None:
            update_props["manager_user_id"] = str(updates.manager_user_id)

        # Handle company_id update (requires relationship update)
        if updates.company_id is not None and updates.company_id != existing.company_id:
            # Verify new company exists
            company_query = (
                f"MATCH (c:Company {{id: '{str(updates.company_id)}'}}) RETURN c"
            )
            company_results = await self.graph_service.execute_query(company_query)
            if not company_results:
                raise ValueError(f"Company {updates.company_id} not found")

            update_props["company_id"] = str(updates.company_id)

            # Delete old PARENT_OF relationship and create new one
            try:
                # Delete old relationship
                delete_rel_query = f"""
                MATCH (c:Company)-[r:PARENT_OF]->(d:Department {{id: '{str(department_id)}'}})
                DELETE r
                """
                await self.graph_service.execute_query(delete_rel_query)

                # Create new relationship
                await self.graph_service.create_relationship(
                    from_id=str(updates.company_id),
                    to_id=str(department_id),
                    rel_type="PARENT_OF",
                )
            except Exception as e:
                logger.error(f"Failed to update company relationship: {e}")
                raise ValueError(f"Failed to update company relationship: {e}")

        if not update_props:
            # No updates to apply
            return existing

        try:
            logger.info(f"Updating department {department_id}")
            await self.graph_service.update_node(str(department_id), update_props)

            # Fetch and return updated department
            return await self.get_department(department_id)
        except Exception as e:
            logger.error(f"Failed to update department {department_id}: {e}")
            return None

    async def delete_department(self, department_id: UUID) -> bool:
        """
        Delete a Department

        Args:
            department_id: Department UUID

        Returns:
            True if deleted successfully, False otherwise

        Note:
            This will fail if there are resources belonging to this department
        """
        try:
            # Check if department exists
            existing = await self.get_department(department_id)
            if not existing:
                return False

            # Check for resources
            resource_query = f"""
            MATCH (r:Resource {{department_id: '{str(department_id)}'}})
            RETURN count(r) as count
            """
            resource_results = await self.graph_service.execute_query(resource_query)
            if resource_results and resource_results[0].get("count", 0) > 0:
                raise ValueError(
                    "Cannot delete department with existing resources. "
                    "Please reassign or delete resources first."
                )

            logger.info(f"Deleting department {department_id}")

            # Delete department and all relationships
            query = f"""
            MATCH (d:Department {{id: '{str(department_id)}'}})
            DETACH DELETE d
            """
            await self.graph_service.execute_query(query)

            return True
        except ValueError:
            # Re-raise validation errors
            raise
        except Exception as e:
            logger.error(f"Failed to delete department {department_id}: {e}")
            return False

    async def list_departments(self, limit: int = 100) -> list[DepartmentResponse]:
        """
        List all departments with company information

        Args:
            limit: Maximum number of departments to return

        Returns:
            List of departments
        """
        try:
            query = f"""
            MATCH (d:Department)
            OPTIONAL MATCH (c:Company)-[:PARENT_OF]->(d)
            RETURN d, c
            ORDER BY d.name
            LIMIT {limit}
            """
            results = await self.graph_service.execute_query(query)

            departments = []
            for result in results:
                department_data = result.get("d", result)
                if "properties" in department_data:
                    department_data = department_data["properties"]

                # Extract company data if present
                company_data = result.get("c")
                company = None
                if company_data:
                    if "properties" in company_data:
                        company_data = company_data["properties"]

                    from app.schemas.company import CompanyResponse

                    company = CompanyResponse(
                        id=UUID(company_data["id"]),
                        name=company_data["name"],
                        description=company_data.get("description"),
                        created_at=datetime.fromisoformat(company_data["created_at"]),
                        updated_at=datetime.fromisoformat(
                            company_data.get("updated_at", company_data["created_at"])
                        ),
                    )

                departments.append(
                    DepartmentResponse(
                        id=UUID(department_data["id"]),
                        name=department_data["name"],
                        description=department_data.get("description"),
                        manager_user_id=(
                            UUID(department_data["manager_user_id"])
                            if department_data.get("manager_user_id")
                            else None
                        ),
                        company_id=UUID(department_data["company_id"]),
                        created_at=datetime.fromisoformat(
                            department_data["created_at"]
                        ),
                        company=company,
                    )
                )

            return departments
        except Exception as e:
            logger.error(f"Failed to list departments: {e}")
            return []

    async def get_departments_by_company(
        self, company_id: UUID, limit: int = 100
    ) -> list[DepartmentResponse]:
        """
        Get all departments for a specific company with company information

        Args:
            company_id: Company UUID
            limit: Maximum number of departments to return

        Returns:
            List of departments belonging to the company
        """
        try:
            query = f"""
            MATCH (c:Company {{id: '{str(company_id)}'}})-[:PARENT_OF]->(d:Department)
            RETURN d, c
            ORDER BY d.name
            LIMIT {limit}
            """
            results = await self.graph_service.execute_query(query)

            departments = []
            for result in results:
                department_data = result.get("d", result)
                if "properties" in department_data:
                    department_data = department_data["properties"]

                # Extract company data
                company_data = result.get("c")
                company = None
                if company_data:
                    if "properties" in company_data:
                        company_data = company_data["properties"]

                    from app.schemas.company import CompanyResponse

                    company = CompanyResponse(
                        id=UUID(company_data["id"]),
                        name=company_data["name"],
                        description=company_data.get("description"),
                        created_at=datetime.fromisoformat(company_data["created_at"]),
                        updated_at=datetime.fromisoformat(
                            company_data.get("updated_at", company_data["created_at"])
                        ),
                    )

                departments.append(
                    DepartmentResponse(
                        id=UUID(department_data["id"]),
                        name=department_data["name"],
                        description=department_data.get("description"),
                        manager_user_id=(
                            UUID(department_data["manager_user_id"])
                            if department_data.get("manager_user_id")
                            else None
                        ),
                        company_id=UUID(department_data["company_id"]),
                        created_at=datetime.fromisoformat(
                            department_data["created_at"]
                        ),
                        company=company,
                    )
                )

            return departments
        except Exception as e:
            logger.error(f"Failed to get departments for company {company_id}: {e}")
            return []

    async def get_department_company(self, department_id: UUID) -> dict | None:
        """
        Get the company that owns a department

        Args:
            department_id: Department UUID

        Returns:
            Company data if found, None otherwise
        """
        try:
            query = f"""
            MATCH (c:Company)-[:PARENT_OF]->(d:Department {{id: '{str(department_id)}'}})
            RETURN c
            """
            results = await self.graph_service.execute_query(query)

            if not results:
                return None

            company_data = results[0]
            if "properties" in company_data:
                company_data = company_data["properties"]

            return company_data
        except Exception as e:
            logger.error(f"Failed to get company for department {department_id}: {e}")
            return None

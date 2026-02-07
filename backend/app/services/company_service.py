"""Service for managing Company entities in the graph database"""

import logging
from datetime import UTC, datetime
from uuid import UUID, uuid4

from app.db.graph import GraphService
from app.schemas.company import CompanyCreate, CompanyResponse, CompanyUpdate

logger = logging.getLogger(__name__)


class CompanyService:
    """Service for Company operations"""

    def __init__(self, graph_service: GraphService):
        self.graph_service = graph_service

    async def create_company(self, company_data: CompanyCreate) -> CompanyResponse:
        """
        Create a new Company node in the graph database

        Args:
            company_data: Company creation data

        Returns:
            Created company with metadata

        Raises:
            ValueError: If company creation fails
        """
        company_id = uuid4()
        now = datetime.now(UTC)

        properties = {
            "id": str(company_id),
            "name": company_data.name,
            "created_at": now.isoformat(),
            "updated_at": now.isoformat(),
        }

        if company_data.description:
            properties["description"] = company_data.description

        try:
            logger.info(f"Creating company: {company_data.name}")
            await self.graph_service.create_node("Company", properties)

            return CompanyResponse(
                id=company_id,
                name=company_data.name,
                description=company_data.description,
                created_at=now,
                updated_at=now,
            )
        except Exception as e:
            logger.error(f"Failed to create company: {e}")
            raise ValueError(f"Failed to create company: {e}")

    async def get_company(self, company_id: UUID) -> CompanyResponse | None:
        """
        Get a Company by ID

        Args:
            company_id: Company UUID

        Returns:
            Company if found, None otherwise
        """
        try:
            query = f"MATCH (c:Company {{id: '{str(company_id)}'}}) RETURN c"
            results = await self.graph_service.execute_query(query)

            if not results:
                return None

            # Extract company data from result
            company_data = results[0]
            if "properties" in company_data:
                company_data = company_data["properties"]

            return CompanyResponse(
                id=UUID(company_data["id"]),
                name=company_data["name"],
                description=company_data.get("description"),
                created_at=datetime.fromisoformat(company_data["created_at"]),
                updated_at=datetime.fromisoformat(company_data["updated_at"]),
            )
        except Exception as e:
            logger.error(f"Failed to get company {company_id}: {e}")
            return None

    async def update_company(
        self, company_id: UUID, updates: CompanyUpdate
    ) -> CompanyResponse | None:
        """
        Update a Company

        Args:
            company_id: Company UUID
            updates: Company update data

        Returns:
            Updated company if found, None otherwise
        """
        # First check if company exists
        existing = await self.get_company(company_id)
        if not existing:
            return None

        # Build update properties
        update_props = {"updated_at": datetime.now(UTC).isoformat()}

        if updates.name is not None:
            update_props["name"] = updates.name
        if updates.description is not None:
            update_props["description"] = updates.description

        try:
            logger.info(f"Updating company {company_id}")
            await self.graph_service.update_node(str(company_id), update_props)

            # Fetch and return updated company
            return await self.get_company(company_id)
        except Exception as e:
            logger.error(f"Failed to update company {company_id}: {e}")
            return None

    async def delete_company(self, company_id: UUID) -> bool:
        """
        Delete a Company and cascade delete all related Departments

        Args:
            company_id: Company UUID

        Returns:
            True if deleted successfully, False otherwise

        Note:
            This will cascade delete all departments belonging to this company
        """
        try:
            # Check if company exists
            existing = await self.get_company(company_id)
            if not existing:
                return False

            logger.info(f"Deleting company {company_id} and related departments")

            # Delete company and all related nodes (cascade)
            query = f"""
            MATCH (c:Company {{id: '{str(company_id)}'}})
            OPTIONAL MATCH (c)-[:PARENT_OF*]->(d:Department)
            DETACH DELETE c, d
            """
            await self.graph_service.execute_query(query)

            return True
        except Exception as e:
            logger.error(f"Failed to delete company {company_id}: {e}")
            return False

    async def list_companies(self, limit: int = 100) -> list[CompanyResponse]:
        """
        List all companies

        Args:
            limit: Maximum number of companies to return

        Returns:
            List of companies
        """
        try:
            query = f"""
            MATCH (c:Company)
            RETURN c
            ORDER BY c.name
            LIMIT {limit}
            """
            results = await self.graph_service.execute_query(query)

            companies = []
            for result in results:
                company_data = result
                if "properties" in company_data:
                    company_data = company_data["properties"]

                companies.append(
                    CompanyResponse(
                        id=UUID(company_data["id"]),
                        name=company_data["name"],
                        description=company_data.get("description"),
                        created_at=datetime.fromisoformat(company_data["created_at"]),
                        updated_at=datetime.fromisoformat(company_data["updated_at"]),
                    )
                )

            return companies
        except Exception as e:
            logger.error(f"Failed to list companies: {e}")
            return []

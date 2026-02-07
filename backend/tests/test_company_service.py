"""Unit tests for CompanyService"""

from datetime import UTC, datetime
from unittest.mock import AsyncMock
from uuid import uuid4

import pytest

from app.schemas.company import CompanyCreate, CompanyUpdate
from app.services.company_service import CompanyService


@pytest.fixture
def mock_graph_service():
    """Create a mock GraphService"""
    service = AsyncMock()
    return service


@pytest.fixture
def company_service(mock_graph_service):
    """Create a CompanyService with mocked dependencies"""
    return CompanyService(mock_graph_service)


class TestCompanyService:
    """Test CompanyService functionality"""

    @pytest.mark.asyncio
    async def test_create_company(self, company_service, mock_graph_service):
        """Test creating a company"""
        company_data = CompanyCreate(name="Test Company", description="A test company")

        # Mock the create_node method
        mock_graph_service.create_node = AsyncMock(return_value={})

        result = await company_service.create_company(company_data)

        # Verify create_node was called
        mock_graph_service.create_node.assert_called_once()
        call_args = mock_graph_service.create_node.call_args

        assert call_args[0][0] == "Company"  # label
        properties = call_args[0][1]  # properties

        assert properties["name"] == "Test Company"
        assert properties["description"] == "A test company"
        assert "id" in properties
        assert "created_at" in properties
        assert "updated_at" in properties

        # Verify response
        assert result.name == "Test Company"
        assert result.description == "A test company"
        assert result.id is not None

    @pytest.mark.asyncio
    async def test_create_company_minimal(self, company_service, mock_graph_service):
        """Test creating a company with minimal data"""
        company_data = CompanyCreate(name="Minimal Company")

        mock_graph_service.create_node = AsyncMock(return_value={})

        result = await company_service.create_company(company_data)

        call_args = mock_graph_service.create_node.call_args
        properties = call_args[0][1]

        assert properties["name"] == "Minimal Company"
        assert "description" not in properties
        assert result.description is None

    @pytest.mark.asyncio
    async def test_create_company_error(self, company_service, mock_graph_service):
        """Test error handling when creating a company"""
        company_data = CompanyCreate(name="Test Company")

        mock_graph_service.create_node = AsyncMock(
            side_effect=Exception("Database error")
        )

        with pytest.raises(ValueError, match="Failed to create company"):
            await company_service.create_company(company_data)

    @pytest.mark.asyncio
    async def test_get_company(self, company_service, mock_graph_service):
        """Test getting a company by ID"""
        company_id = uuid4()
        now = datetime.now(UTC)

        mock_result = {
            "properties": {
                "id": str(company_id),
                "name": "Test Company",
                "description": "A test company",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
        }

        mock_graph_service.execute_query = AsyncMock(return_value=[mock_result])

        result = await company_service.get_company(company_id)

        assert result is not None
        assert result.id == company_id
        assert result.name == "Test Company"
        assert result.description == "A test company"

        # Verify query was called
        mock_graph_service.execute_query.assert_called_once()
        query = mock_graph_service.execute_query.call_args[0][0]
        assert "Company" in query
        assert str(company_id) in query

    @pytest.mark.asyncio
    async def test_get_company_not_found(self, company_service, mock_graph_service):
        """Test getting a non-existent company"""
        company_id = uuid4()

        mock_graph_service.execute_query = AsyncMock(return_value=[])

        result = await company_service.get_company(company_id)

        assert result is None

    @pytest.mark.asyncio
    async def test_update_company(self, company_service, mock_graph_service):
        """Test updating a company"""
        company_id = uuid4()
        now = datetime.now(UTC)

        # Mock get_company to return existing company
        existing_company = {
            "properties": {
                "id": str(company_id),
                "name": "Old Name",
                "description": "Old description",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
        }

        updated_company = {
            "properties": {
                "id": str(company_id),
                "name": "New Name",
                "description": "New description",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
        }

        mock_graph_service.execute_query = AsyncMock(
            side_effect=[[existing_company], [updated_company]]
        )
        mock_graph_service.update_node = AsyncMock(return_value={})

        updates = CompanyUpdate(name="New Name", description="New description")
        result = await company_service.update_company(company_id, updates)

        assert result is not None
        assert result.name == "New Name"
        assert result.description == "New description"

        # Verify update_node was called
        mock_graph_service.update_node.assert_called_once()
        call_args = mock_graph_service.update_node.call_args
        assert call_args[0][0] == str(company_id)
        update_props = call_args[0][1]
        assert update_props["name"] == "New Name"
        assert update_props["description"] == "New description"
        assert "updated_at" in update_props

    @pytest.mark.asyncio
    async def test_update_company_not_found(self, company_service, mock_graph_service):
        """Test updating a non-existent company"""
        company_id = uuid4()

        mock_graph_service.execute_query = AsyncMock(return_value=[])

        updates = CompanyUpdate(name="New Name")
        result = await company_service.update_company(company_id, updates)

        assert result is None
        mock_graph_service.update_node.assert_not_called()

    @pytest.mark.asyncio
    async def test_update_company_partial(self, company_service, mock_graph_service):
        """Test partial update of a company"""
        company_id = uuid4()
        now = datetime.now(UTC)

        existing_company = {
            "properties": {
                "id": str(company_id),
                "name": "Test Company",
                "description": "Original description",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
        }

        updated_company = {
            "properties": {
                "id": str(company_id),
                "name": "New Name",
                "description": "Original description",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
        }

        mock_graph_service.execute_query = AsyncMock(
            side_effect=[[existing_company], [updated_company]]
        )
        mock_graph_service.update_node = AsyncMock(return_value={})

        # Only update name
        updates = CompanyUpdate(name="New Name")
        result = await company_service.update_company(company_id, updates)

        assert result is not None
        assert result.name == "New Name"

        # Verify only name was updated
        call_args = mock_graph_service.update_node.call_args
        update_props = call_args[0][1]
        assert update_props["name"] == "New Name"
        assert "description" not in update_props or update_props["description"] is None

    @pytest.mark.asyncio
    async def test_delete_company(self, company_service, mock_graph_service):
        """Test deleting a company"""
        company_id = uuid4()
        now = datetime.now(UTC)

        existing_company = {
            "properties": {
                "id": str(company_id),
                "name": "Test Company",
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }
        }

        mock_graph_service.execute_query = AsyncMock(
            side_effect=[[existing_company], []]
        )

        result = await company_service.delete_company(company_id)

        assert result is True

        # Verify delete query was called
        assert mock_graph_service.execute_query.call_count == 2
        delete_query = mock_graph_service.execute_query.call_args_list[1][0][0]
        assert "DETACH DELETE" in delete_query
        assert str(company_id) in delete_query

    @pytest.mark.asyncio
    async def test_delete_company_not_found(self, company_service, mock_graph_service):
        """Test deleting a non-existent company"""
        company_id = uuid4()

        mock_graph_service.execute_query = AsyncMock(return_value=[])

        result = await company_service.delete_company(company_id)

        assert result is False

    @pytest.mark.asyncio
    async def test_list_companies(self, company_service, mock_graph_service):
        """Test listing all companies"""
        now = datetime.now(UTC)

        mock_results = [
            {
                "properties": {
                    "id": str(uuid4()),
                    "name": "Company A",
                    "description": "First company",
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }
            },
            {
                "properties": {
                    "id": str(uuid4()),
                    "name": "Company B",
                    "created_at": now.isoformat(),
                    "updated_at": now.isoformat(),
                }
            },
        ]

        mock_graph_service.execute_query = AsyncMock(return_value=mock_results)

        result = await company_service.list_companies()

        assert len(result) == 2
        assert result[0].name == "Company A"
        assert result[0].description == "First company"
        assert result[1].name == "Company B"
        assert result[1].description is None

        # Verify query was called
        mock_graph_service.execute_query.assert_called_once()
        query = mock_graph_service.execute_query.call_args[0][0]
        assert "Company" in query
        assert "ORDER BY" in query
        assert "LIMIT" in query

    @pytest.mark.asyncio
    async def test_list_companies_with_limit(self, company_service, mock_graph_service):
        """Test listing companies with custom limit"""
        mock_graph_service.execute_query = AsyncMock(return_value=[])

        await company_service.list_companies(limit=50)

        query = mock_graph_service.execute_query.call_args[0][0]
        assert "LIMIT 50" in query

    @pytest.mark.asyncio
    async def test_list_companies_empty(self, company_service, mock_graph_service):
        """Test listing companies when none exist"""
        mock_graph_service.execute_query = AsyncMock(return_value=[])

        result = await company_service.list_companies()

        assert len(result) == 0

"""Unit tests for DepartmentService"""

import pytest
from datetime import UTC, datetime
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock

from app.schemas.department import DepartmentCreate, DepartmentUpdate
from app.services.department_service import DepartmentService


@pytest.fixture
def mock_graph_service():
    """Create a mock graph service"""
    service = MagicMock()
    service.execute_query = AsyncMock()
    service.create_node = AsyncMock()
    service.create_relationship = AsyncMock()
    service.update_node = AsyncMock()
    return service


@pytest.fixture
def department_service(mock_graph_service):
    """Create a department service with mocked dependencies"""
    return DepartmentService(mock_graph_service)


@pytest.mark.asyncio
async def test_create_department(department_service, mock_graph_service):
    """Test creating a department"""
    company_id = uuid4()
    
    # Mock company exists check
    mock_graph_service.execute_query.return_value = [{"id": str(company_id)}]
    
    data = DepartmentCreate(
        name="Engineering",
        description="Engineering department",
        manager_user_id=uuid4(),
        company_id=company_id,
    )
    
    result = await department_service.create_department(data)
    
    assert result.name == "Engineering"
    assert result.description == "Engineering department"
    assert result.company_id == company_id
    assert result.id is not None
    assert result.created_at is not None
    
    # Verify node creation was called
    mock_graph_service.create_node.assert_called_once()
    # Verify relationship creation was called
    mock_graph_service.create_relationship.assert_called_once()


@pytest.mark.asyncio
async def test_create_department_minimal(department_service, mock_graph_service):
    """Test creating a department with minimal data"""
    company_id = uuid4()
    
    # Mock company exists check
    mock_graph_service.execute_query.return_value = [{"id": str(company_id)}]
    
    data = DepartmentCreate(
        name="Sales",
        company_id=company_id,
    )
    
    result = await department_service.create_department(data)
    
    assert result.name == "Sales"
    assert result.description is None
    assert result.manager_user_id is None
    assert result.company_id == company_id


@pytest.mark.asyncio
async def test_create_department_company_not_found(department_service, mock_graph_service):
    """Test creating a department with non-existent company"""
    company_id = uuid4()
    
    # Mock company not found
    mock_graph_service.execute_query.return_value = []
    
    data = DepartmentCreate(
        name="Engineering",
        company_id=company_id,
    )
    
    with pytest.raises(ValueError, match="Company .* not found"):
        await department_service.create_department(data)


@pytest.mark.asyncio
async def test_get_department(department_service, mock_graph_service):
    """Test getting a department by ID"""
    department_id = uuid4()
    company_id = uuid4()
    manager_id = uuid4()
    now = datetime.now(UTC)
    
    mock_graph_service.execute_query.return_value = [
        {
            "properties": {
                "id": str(department_id),
                "name": "Engineering",
                "description": "Engineering department",
                "manager_user_id": str(manager_id),
                "company_id": str(company_id),
                "created_at": now.isoformat(),
            }
        }
    ]
    
    result = await department_service.get_department(department_id)
    
    assert result is not None
    assert result.id == department_id
    assert result.name == "Engineering"
    assert result.description == "Engineering department"
    assert result.manager_user_id == manager_id
    assert result.company_id == company_id


@pytest.mark.asyncio
async def test_get_department_not_found(department_service, mock_graph_service):
    """Test getting a non-existent department"""
    department_id = uuid4()
    
    mock_graph_service.execute_query.return_value = []
    
    result = await department_service.get_department(department_id)
    
    assert result is None


@pytest.mark.asyncio
async def test_update_department(department_service, mock_graph_service):
    """Test updating a department"""
    department_id = uuid4()
    company_id = uuid4()
    now = datetime.now(UTC)
    
    # Mock existing department and updated department
    mock_graph_service.execute_query.side_effect = [
        # First call: get existing department
        [
            {
                "properties": {
                    "id": str(department_id),
                    "name": "Engineering",
                    "description": "Old description",
                    "company_id": str(company_id),
                    "created_at": now.isoformat(),
                }
            }
        ],
        # Second call: get updated department
        [
            {
                "properties": {
                    "id": str(department_id),
                    "name": "Engineering Updated",
                    "description": "New description",
                    "company_id": str(company_id),
                    "created_at": now.isoformat(),
                }
            }
        ],
    ]
    
    updates = DepartmentUpdate(
        name="Engineering Updated",
        description="New description",
    )
    
    result = await department_service.update_department(department_id, updates)
    
    assert result is not None
    assert result.name == "Engineering Updated"
    assert result.description == "New description"
    
    # Verify update was called
    mock_graph_service.update_node.assert_called_once()


@pytest.mark.asyncio
async def test_update_department_not_found(department_service, mock_graph_service):
    """Test updating a non-existent department"""
    department_id = uuid4()
    
    mock_graph_service.execute_query.return_value = []
    
    updates = DepartmentUpdate(name="New Name")
    
    result = await department_service.update_department(department_id, updates)
    
    assert result is None


@pytest.mark.asyncio
async def test_update_department_company(department_service, mock_graph_service):
    """Test updating a department's company"""
    department_id = uuid4()
    old_company_id = uuid4()
    new_company_id = uuid4()
    now = datetime.now(UTC)
    
    # Mock existing department
    mock_graph_service.execute_query.side_effect = [
        # First call: get existing department
        [
            {
                "properties": {
                    "id": str(department_id),
                    "name": "Engineering",
                    "company_id": str(old_company_id),
                    "created_at": now.isoformat(),
                }
            }
        ],
        # Second call: verify new company exists
        [{"id": str(new_company_id)}],
        # Third call: delete old relationship
        [],
        # Fourth call: get updated department
        [
            {
                "properties": {
                    "id": str(department_id),
                    "name": "Engineering",
                    "company_id": str(new_company_id),
                    "created_at": now.isoformat(),
                }
            }
        ],
    ]
    
    updates = DepartmentUpdate(company_id=new_company_id)
    
    result = await department_service.update_department(department_id, updates)
    
    assert result is not None
    assert result.company_id == new_company_id
    
    # Verify relationship was updated
    mock_graph_service.create_relationship.assert_called_once()


@pytest.mark.asyncio
async def test_delete_department(department_service, mock_graph_service):
    """Test deleting a department"""
    department_id = uuid4()
    company_id = uuid4()
    now = datetime.now(UTC)
    
    # Mock existing department and no resources
    mock_graph_service.execute_query.side_effect = [
        # First call: get department
        [
            {
                "properties": {
                    "id": str(department_id),
                    "name": "Engineering",
                    "company_id": str(company_id),
                    "created_at": now.isoformat(),
                }
            }
        ],
        # Second call: check for resources
        [{"count": 0}],
        # Third call: delete department
        [],
    ]
    
    result = await department_service.delete_department(department_id)
    
    assert result is True


@pytest.mark.asyncio
async def test_delete_department_with_resources(department_service, mock_graph_service):
    """Test deleting a department that has resources"""
    department_id = uuid4()
    company_id = uuid4()
    now = datetime.now(UTC)
    
    # Mock existing department with resources
    mock_graph_service.execute_query.side_effect = [
        # First call: get department
        [
            {
                "properties": {
                    "id": str(department_id),
                    "name": "Engineering",
                    "company_id": str(company_id),
                    "created_at": now.isoformat(),
                }
            }
        ],
        # Second call: check for resources (has resources)
        [{"count": 5}],
    ]
    
    with pytest.raises(ValueError, match="Cannot delete department with existing resources"):
        await department_service.delete_department(department_id)


@pytest.mark.asyncio
async def test_delete_department_not_found(department_service, mock_graph_service):
    """Test deleting a non-existent department"""
    department_id = uuid4()
    
    mock_graph_service.execute_query.return_value = []
    
    result = await department_service.delete_department(department_id)
    
    assert result is False


@pytest.mark.asyncio
async def test_list_departments(department_service, mock_graph_service):
    """Test listing all departments"""
    company_id = uuid4()
    now = datetime.now(UTC)
    
    mock_graph_service.execute_query.return_value = [
        {
            "properties": {
                "id": str(uuid4()),
                "name": "Engineering",
                "company_id": str(company_id),
                "created_at": now.isoformat(),
            }
        },
        {
            "properties": {
                "id": str(uuid4()),
                "name": "Sales",
                "company_id": str(company_id),
                "created_at": now.isoformat(),
            }
        },
    ]
    
    result = await department_service.list_departments()
    
    assert len(result) == 2
    assert result[0].name == "Engineering"
    assert result[1].name == "Sales"


@pytest.mark.asyncio
async def test_list_departments_with_limit(department_service, mock_graph_service):
    """Test listing departments with limit"""
    mock_graph_service.execute_query.return_value = []
    
    await department_service.list_departments(limit=50)
    
    # Verify query was called with limit
    call_args = mock_graph_service.execute_query.call_args[0][0]
    assert "LIMIT 50" in call_args


@pytest.mark.asyncio
async def test_list_departments_empty(department_service, mock_graph_service):
    """Test listing departments when none exist"""
    mock_graph_service.execute_query.return_value = []
    
    result = await department_service.list_departments()
    
    assert len(result) == 0


@pytest.mark.asyncio
async def test_get_departments_by_company(department_service, mock_graph_service):
    """Test getting departments for a specific company"""
    company_id = uuid4()
    now = datetime.now(UTC)
    
    mock_graph_service.execute_query.return_value = [
        {
            "properties": {
                "id": str(uuid4()),
                "name": "Engineering",
                "company_id": str(company_id),
                "created_at": now.isoformat(),
            }
        },
        {
            "properties": {
                "id": str(uuid4()),
                "name": "Sales",
                "company_id": str(company_id),
                "created_at": now.isoformat(),
            }
        },
    ]
    
    result = await department_service.get_departments_by_company(company_id)
    
    assert len(result) == 2
    assert all(dept.company_id == company_id for dept in result)


@pytest.mark.asyncio
async def test_get_department_company(department_service, mock_graph_service):
    """Test getting the company for a department"""
    department_id = uuid4()
    company_id = uuid4()
    
    mock_graph_service.execute_query.return_value = [
        {
            "properties": {
                "id": str(company_id),
                "name": "Acme Corp",
                "created_at": datetime.now(UTC).isoformat(),
                "updated_at": datetime.now(UTC).isoformat(),
            }
        }
    ]
    
    result = await department_service.get_department_company(department_id)
    
    assert result is not None
    assert result["id"] == str(company_id)
    assert result["name"] == "Acme Corp"


@pytest.mark.asyncio
async def test_get_department_company_not_found(department_service, mock_graph_service):
    """Test getting company for department when not found"""
    department_id = uuid4()
    
    mock_graph_service.execute_query.return_value = []
    
    result = await department_service.get_department_company(department_id)
    
    assert result is None

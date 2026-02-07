"""Unit tests for resource allocation with lead flag functionality"""

import pytest
from datetime import datetime, UTC
from uuid import uuid4

from app.db.graph import GraphService
from app.services.resource_service import ResourceService
from app.schemas.resource import (
    ResourceCreate,
    ResourceAllocationCreate,
    ResourceAllocationUpdate,
)


@pytest.fixture
async def graph_service():
    """Create a graph service instance for testing"""
    service = GraphService()
    await service.connect()
    yield service
    await service.close()


@pytest.fixture
async def resource_service(graph_service):
    """Create a resource service instance for testing"""
    return ResourceService(graph_service)


@pytest.fixture
async def test_company(graph_service):
    """Create a test company"""
    company_id = str(uuid4())
    await graph_service.create_node("Company", {
        "id": company_id,
        "name": "Test Company",
        "created_at": datetime.now(UTC).isoformat()
    })
    yield company_id
    # Cleanup
    await graph_service.delete_node(company_id)


@pytest.fixture
async def test_department(graph_service, test_company):
    """Create a test department"""
    dept_id = str(uuid4())
    await graph_service.create_node("Department", {
        "id": dept_id,
        "name": "Test Department",
        "company_id": test_company,
        "created_at": datetime.now(UTC).isoformat()
    })
    await graph_service.create_relationship(test_company, dept_id, "PARENT_OF")
    yield dept_id
    # Cleanup
    await graph_service.delete_node(dept_id)


@pytest.fixture
async def test_resource(resource_service, test_department):
    """Create a test resource"""
    resource_data = ResourceCreate(
        name="Test Resource",
        type="person",
        capacity=40.0,
        department_id=test_department,
        skills=["Python", "FastAPI"],
        availability="available"
    )
    resource = await resource_service.create_resource(resource_data)
    yield resource
    # Cleanup
    try:
        await resource_service.delete_resource(resource.id)
    except:
        pass  # May already be deleted


@pytest.fixture
async def test_project(graph_service):
    """Create a test project"""
    project_id = str(uuid4())
    await graph_service.create_node("Project", {
        "id": project_id,
        "name": "Test Project",
        "status": "active",
        "created_at": datetime.now(UTC).isoformat()
    })
    yield project_id
    # Cleanup
    await graph_service.delete_node(project_id)


@pytest.fixture
async def test_task(graph_service):
    """Create a test task (WorkItem with type='task')"""
    task_id = str(uuid4())
    await graph_service.create_workitem_node(
        workitem_id=task_id,
        workitem_type="task",
        title="Test Task",
        description="Test task for allocation",
        status="ready",
        priority=3
    )
    yield task_id
    # Cleanup
    await graph_service.delete_node(task_id)


@pytest.mark.asyncio
async def test_allocate_resource_to_project_with_lead_true(
    resource_service, test_resource, test_project
):
    """Test allocating a resource to a project with lead=true"""
    allocation_data = ResourceAllocationCreate(
        resource_id=test_resource.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=50.0,
        lead=True
    )
    
    allocation = await resource_service.allocate_resource(allocation_data)
    
    assert allocation.allocation_percentage == 50.0
    assert allocation.lead is True
    assert allocation.target_id == test_project
    assert allocation.target_type == "Project"


@pytest.mark.asyncio
async def test_allocate_resource_to_project_with_lead_false(
    resource_service, test_resource, test_project
):
    """Test allocating a resource to a project with lead=false (default)"""
    allocation_data = ResourceAllocationCreate(
        resource_id=test_resource.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=30.0,
        lead=False
    )
    
    allocation = await resource_service.allocate_resource(allocation_data)
    
    assert allocation.allocation_percentage == 30.0
    assert allocation.lead is False
    assert allocation.target_id == test_project
    assert allocation.target_type == "Project"


@pytest.mark.asyncio
async def test_allocate_resource_to_task_with_lead_true(
    resource_service, test_resource, test_task
):
    """Test allocating a resource to a task with lead=true"""
    allocation_data = ResourceAllocationCreate(
        resource_id=test_resource.id,
        target_id=test_task,
        target_type="task",
        allocation_percentage=100.0,
        lead=True
    )
    
    allocation = await resource_service.allocate_resource(allocation_data)
    
    assert allocation.allocation_percentage == 100.0
    assert allocation.lead is True
    assert allocation.target_id == test_task
    assert allocation.target_type == "Task"


@pytest.mark.asyncio
async def test_allocate_resource_to_task_with_lead_false(
    resource_service, test_resource, test_task
):
    """Test allocating a resource to a task with lead=false"""
    allocation_data = ResourceAllocationCreate(
        resource_id=test_resource.id,
        target_id=test_task,
        target_type="task",
        allocation_percentage=50.0,
        lead=False
    )
    
    allocation = await resource_service.allocate_resource(allocation_data)
    
    assert allocation.allocation_percentage == 50.0
    assert allocation.lead is False
    assert allocation.target_id == test_task
    assert allocation.target_type == "Task"


@pytest.mark.asyncio
async def test_update_allocation_lead_flag(
    resource_service, test_resource, test_project
):
    """Test updating the lead flag of an existing allocation"""
    # Create allocation with lead=false
    allocation_data = ResourceAllocationCreate(
        resource_id=test_resource.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=50.0,
        lead=False
    )
    await resource_service.allocate_resource(allocation_data)
    
    # Update to lead=true
    update_data = ResourceAllocationUpdate(lead=True)
    updated_allocation = await resource_service.update_allocation(
        test_resource.id, test_project, update_data
    )
    
    assert updated_allocation.lead is True
    assert updated_allocation.allocation_percentage == 50.0


@pytest.mark.asyncio
async def test_get_lead_resources_for_project(
    resource_service, graph_service, test_department, test_project
):
    """Test getting lead resources for a project"""
    # Create multiple resources
    resource1_data = ResourceCreate(
        name="Lead Resource 1",
        type="person",
        capacity=40.0,
        department_id=test_department,
        skills=["Python"],
        availability="available"
    )
    resource1 = await resource_service.create_resource(resource1_data)
    
    resource2_data = ResourceCreate(
        name="Supporting Resource",
        type="person",
        capacity=40.0,
        department_id=test_department,
        skills=["JavaScript"],
        availability="available"
    )
    resource2 = await resource_service.create_resource(resource2_data)
    
    # Allocate resource1 as lead
    allocation1 = ResourceAllocationCreate(
        resource_id=resource1.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=80.0,
        lead=True
    )
    await resource_service.allocate_resource(allocation1)
    
    # Allocate resource2 as non-lead
    allocation2 = ResourceAllocationCreate(
        resource_id=resource2.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=50.0,
        lead=False
    )
    await resource_service.allocate_resource(allocation2)
    
    # Get lead resources
    lead_resources = await resource_service.get_lead_resources_for_project(test_project)
    
    assert len(lead_resources) == 1
    assert lead_resources[0].id == resource1.id
    assert lead_resources[0].name == "Lead Resource 1"
    
    # Cleanup
    await resource_service.remove_allocation(resource1.id, test_project)
    await resource_service.remove_allocation(resource2.id, test_project)
    await resource_service.delete_resource(resource1.id)
    await resource_service.delete_resource(resource2.id)


@pytest.mark.asyncio
async def test_get_lead_resources_for_task(
    resource_service, graph_service, test_department, test_task
):
    """Test getting lead resources for a task"""
    # Create multiple resources
    resource1_data = ResourceCreate(
        name="Lead Resource 1",
        type="person",
        capacity=40.0,
        department_id=test_department,
        skills=["Python"],
        availability="available"
    )
    resource1 = await resource_service.create_resource(resource1_data)
    
    resource2_data = ResourceCreate(
        name="Supporting Resource",
        type="person",
        capacity=40.0,
        department_id=test_department,
        skills=["JavaScript"],
        availability="available"
    )
    resource2 = await resource_service.create_resource(resource2_data)
    
    # Allocate resource1 as lead
    allocation1 = ResourceAllocationCreate(
        resource_id=resource1.id,
        target_id=test_task,
        target_type="task",
        allocation_percentage=100.0,
        lead=True
    )
    await resource_service.allocate_resource(allocation1)
    
    # Allocate resource2 as non-lead
    allocation2 = ResourceAllocationCreate(
        resource_id=resource2.id,
        target_id=test_task,
        target_type="task",
        allocation_percentage=50.0,
        lead=False
    )
    await resource_service.allocate_resource(allocation2)
    
    # Get lead resources
    lead_resources = await resource_service.get_lead_resources_for_task(test_task)
    
    assert len(lead_resources) == 1
    assert lead_resources[0].id == resource1.id
    assert lead_resources[0].name == "Lead Resource 1"
    
    # Cleanup
    await resource_service.remove_allocation(resource1.id, test_task)
    await resource_service.remove_allocation(resource2.id, test_task)
    await resource_service.delete_resource(resource1.id)
    await resource_service.delete_resource(resource2.id)


@pytest.mark.asyncio
async def test_lead_flag_is_always_boolean(
    resource_service, test_resource, test_project
):
    """Test that lead flag is always a boolean value"""
    # Test with explicit True
    allocation_data = ResourceAllocationCreate(
        resource_id=test_resource.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=50.0,
        lead=True
    )
    allocation = await resource_service.allocate_resource(allocation_data)
    assert isinstance(allocation.lead, bool)
    assert allocation.lead is True
    
    # Cleanup and test with explicit False
    await resource_service.remove_allocation(test_resource.id, test_project)
    
    allocation_data.lead = False
    allocation = await resource_service.allocate_resource(allocation_data)
    assert isinstance(allocation.lead, bool)
    assert allocation.lead is False

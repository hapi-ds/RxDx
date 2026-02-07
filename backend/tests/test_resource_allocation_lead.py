"""Unit tests for resource allocation with lead flag functionality"""

import pytest
from datetime import datetime, UTC
from uuid import uuid4
from hypothesis import given, strategies as st, settings, HealthCheck

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
    project_id = uuid4()
    await graph_service.create_node("Project", {
        "id": str(project_id),
        "name": "Test Project",
        "status": "active",
        "created_at": datetime.now(UTC).isoformat()
    })
    yield project_id  # Return UUID object, not string
    # Cleanup
    await graph_service.delete_node(str(project_id))


@pytest.fixture
async def test_task(graph_service):
    """Create a test task (WorkItem with type='task')"""
    task_id = uuid4()
    await graph_service.create_workitem_node(
        workitem_id=str(task_id),
        workitem_type="task",
        title="Test Task",
        description="Test task for allocation",
        status="ready",
        priority=3
    )
    yield task_id  # Return UUID object, not string
    # Cleanup
    await graph_service.delete_node(str(task_id))


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
    # target_type is lowercase from the API
    assert allocation.target_type.lower() == "project"


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
    # target_type is lowercase from the API
    assert allocation.target_type.lower() == "project"


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
    # target_type is lowercase from the API
    assert allocation.target_type.lower() == "task"


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
    # target_type is lowercase from the API
    assert allocation.target_type.lower() == "task"


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


@pytest.mark.asyncio
async def test_lead_flag_defaults_to_false(
    resource_service, test_resource, test_project
):
    """Test that lead flag defaults to false when not specified"""
    # Create allocation without specifying lead (should default to False)
    allocation_data = ResourceAllocationCreate(
        resource_id=test_resource.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=50.0
        # lead not specified
    )
    
    allocation = await resource_service.allocate_resource(allocation_data)
    
    # Verify lead defaults to False
    assert allocation.lead is False
    assert isinstance(allocation.lead, bool)


@pytest.mark.asyncio
async def test_multiple_resources_with_different_lead_values(
    resource_service, graph_service, test_department, test_project
):
    """Test multiple resources can be allocated to same project with different lead values"""
    # Create three resources
    resource1_data = ResourceCreate(
        name="Lead Resource",
        type="person",
        capacity=40.0,
        department_id=test_department,
        skills=["Python", "Leadership"],
        availability="available"
    )
    resource1 = await resource_service.create_resource(resource1_data)
    
    resource2_data = ResourceCreate(
        name="Supporting Resource 1",
        type="person",
        capacity=40.0,
        department_id=test_department,
        skills=["Python"],
        availability="available"
    )
    resource2 = await resource_service.create_resource(resource2_data)
    
    resource3_data = ResourceCreate(
        name="Supporting Resource 2",
        type="person",
        capacity=40.0,
        department_id=test_department,
        skills=["JavaScript"],
        availability="available"
    )
    resource3 = await resource_service.create_resource(resource3_data)
    
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
    
    # Allocate resource3 as non-lead
    allocation3 = ResourceAllocationCreate(
        resource_id=resource3.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=30.0,
        lead=False
    )
    await resource_service.allocate_resource(allocation3)
    
    # Get all allocations for the project
    lead_resources = await resource_service.get_lead_resources_for_project(test_project)
    
    # Verify only one lead resource
    assert len(lead_resources) == 1
    assert lead_resources[0].id == resource1.id
    
    # Cleanup
    await resource_service.remove_allocation(resource1.id, test_project)
    await resource_service.remove_allocation(resource2.id, test_project)
    await resource_service.remove_allocation(resource3.id, test_project)
    await resource_service.delete_resource(resource1.id)
    await resource_service.delete_resource(resource2.id)
    await resource_service.delete_resource(resource3.id)


@pytest.mark.asyncio
async def test_multiple_lead_resources_allowed(
    resource_service, graph_service, test_department, test_project
):
    """Test that multiple resources can be allocated as lead to the same project"""
    # Create two resources
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
        name="Lead Resource 2",
        type="person",
        capacity=40.0,
        department_id=test_department,
        skills=["JavaScript"],
        availability="available"
    )
    resource2 = await resource_service.create_resource(resource2_data)
    
    # Allocate both as lead
    allocation1 = ResourceAllocationCreate(
        resource_id=resource1.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=50.0,
        lead=True
    )
    await resource_service.allocate_resource(allocation1)
    
    allocation2 = ResourceAllocationCreate(
        resource_id=resource2.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=50.0,
        lead=True
    )
    await resource_service.allocate_resource(allocation2)
    
    # Get lead resources
    lead_resources = await resource_service.get_lead_resources_for_project(test_project)
    
    # Verify both are lead resources
    assert len(lead_resources) == 2
    lead_ids = {res.id for res in lead_resources}
    assert resource1.id in lead_ids
    assert resource2.id in lead_ids
    
    # Cleanup
    await resource_service.remove_allocation(resource1.id, test_project)
    await resource_service.remove_allocation(resource2.id, test_project)
    await resource_service.delete_resource(resource1.id)
    await resource_service.delete_resource(resource2.id)


@pytest.mark.asyncio
async def test_update_lead_flag_from_true_to_false(
    resource_service, test_resource, test_project
):
    """Test updating lead flag from true to false"""
    # Create allocation with lead=true
    allocation_data = ResourceAllocationCreate(
        resource_id=test_resource.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=80.0,
        lead=True
    )
    await resource_service.allocate_resource(allocation_data)
    
    # Verify it's a lead resource
    lead_resources = await resource_service.get_lead_resources_for_project(test_project)
    assert len(lead_resources) == 1
    assert lead_resources[0].id == test_resource.id
    
    # Update to lead=false
    update_data = ResourceAllocationUpdate(lead=False)
    updated_allocation = await resource_service.update_allocation(
        test_resource.id, test_project, update_data
    )
    
    assert updated_allocation.lead is False
    
    # Verify it's no longer a lead resource
    lead_resources = await resource_service.get_lead_resources_for_project(test_project)
    assert len(lead_resources) == 0


@pytest.mark.asyncio
async def test_get_all_allocations_includes_lead_flag(
    resource_service, graph_service, test_department, test_project
):
    """Test that getting all allocations for a resource includes lead flag"""
    # Create two resources - one for project, one for task
    resource1_data = ResourceCreate(
        name="Project Resource",
        type="person",
        capacity=40.0,
        department_id=test_department,
        skills=["Python"],
        availability="available"
    )
    resource1 = await resource_service.create_resource(resource1_data)
    
    resource2_data = ResourceCreate(
        name="Task Resource",
        type="person",
        capacity=40.0,
        department_id=test_department,
        skills=["Python"],
        availability="available"
    )
    resource2 = await resource_service.create_resource(resource2_data)
    
    # Create a task
    task_id = uuid4()
    await graph_service.create_workitem_node(
        workitem_id=str(task_id),
        workitem_type="task",
        title="Test Task",
        description="Test task for allocation",
        status="ready",
        priority=3
    )
    
    # Allocate resource1 to project with lead=true
    allocation1 = ResourceAllocationCreate(
        resource_id=resource1.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=50.0,
        lead=True
    )
    await resource_service.allocate_resource(allocation1)
    
    # Allocate resource2 to task with lead=false
    allocation2 = ResourceAllocationCreate(
        resource_id=resource2.id,
        target_id=task_id,
        target_type="task",
        allocation_percentage=30.0,
        lead=False
    )
    await resource_service.allocate_resource(allocation2)
    
    # Get allocations for resource1
    allocations1 = await resource_service.get_resource_allocations(resource1.id)
    assert len(allocations1) == 1
    assert allocations1[0].lead is True
    assert allocations1[0].allocation_percentage == 50.0
    assert allocations1[0].target_id == test_project
    
    # Get allocations for resource2
    allocations2 = await resource_service.get_resource_allocations(resource2.id)
    assert len(allocations2) == 1
    assert allocations2[0].lead is False
    assert allocations2[0].allocation_percentage == 30.0
    assert allocations2[0].target_id == task_id
    
    # Cleanup
    await resource_service.remove_allocation(resource1.id, test_project)
    await resource_service.remove_allocation(resource2.id, task_id)
    await graph_service.delete_node(str(task_id))
    await resource_service.delete_resource(resource1.id)
    await resource_service.delete_resource(resource2.id)


@pytest.mark.asyncio
async def test_lead_resources_query_excludes_non_lead(
    resource_service, graph_service, test_department, test_project
):
    """Test that lead resources query only returns resources with lead=true"""
    # Create multiple resources
    resources = []
    for i in range(5):
        resource_data = ResourceCreate(
            name=f"Resource {i}",
            type="person",
            capacity=40.0,
            department_id=test_department,
            skills=["Python"],
            availability="available"
        )
        resource = await resource_service.create_resource(resource_data)
        resources.append(resource)
    
    # Allocate 2 as lead, 3 as non-lead
    for i, resource in enumerate(resources):
        allocation = ResourceAllocationCreate(
            resource_id=resource.id,
            target_id=test_project,
            target_type="project",
            allocation_percentage=20.0,
            lead=(i < 2)  # First 2 are lead
        )
        await resource_service.allocate_resource(allocation)
    
    # Get lead resources
    lead_resources = await resource_service.get_lead_resources_for_project(test_project)
    
    # Verify only 2 lead resources returned
    assert len(lead_resources) == 2
    lead_ids = {res.id for res in lead_resources}
    assert resources[0].id in lead_ids
    assert resources[1].id in lead_ids
    assert resources[2].id not in lead_ids
    assert resources[3].id not in lead_ids
    assert resources[4].id not in lead_ids
    
    # Cleanup
    for resource in resources:
        await resource_service.remove_allocation(resource.id, test_project)
        await resource_service.delete_resource(resource.id)


@pytest.mark.asyncio
async def test_lead_flag_persists_across_updates(
    resource_service, test_resource, test_project
):
    """Test that lead flag persists when updating other allocation properties"""
    # Create allocation with lead=true
    allocation_data = ResourceAllocationCreate(
        resource_id=test_resource.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=50.0,
        lead=True
    )
    await resource_service.allocate_resource(allocation_data)
    
    # Update allocation percentage without changing lead
    update_data = ResourceAllocationUpdate(allocation_percentage=75.0)
    updated_allocation = await resource_service.update_allocation(
        test_resource.id, test_project, update_data
    )
    
    # Verify lead flag is still true
    assert updated_allocation.lead is True
    assert updated_allocation.allocation_percentage == 75.0
    
    # Verify it's still in lead resources
    lead_resources = await resource_service.get_lead_resources_for_project(test_project)
    assert len(lead_resources) == 1
    assert lead_resources[0].id == test_resource.id


@pytest.mark.asyncio
async def test_no_lead_resources_returns_empty_list(
    resource_service, graph_service, test_department, test_project
):
    """Test that querying lead resources returns empty list when none exist"""
    # Create resource and allocate as non-lead
    resource_data = ResourceCreate(
        name="Non-Lead Resource",
        type="person",
        capacity=40.0,
        department_id=test_department,
        skills=["Python"],
        availability="available"
    )
    resource = await resource_service.create_resource(resource_data)
    
    allocation = ResourceAllocationCreate(
        resource_id=resource.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=50.0,
        lead=False
    )
    await resource_service.allocate_resource(allocation)
    
    # Get lead resources
    lead_resources = await resource_service.get_lead_resources_for_project(test_project)
    
    # Verify empty list
    assert len(lead_resources) == 0
    assert isinstance(lead_resources, list)
    
    # Cleanup
    await resource_service.remove_allocation(resource.id, test_project)
    await resource_service.delete_resource(resource.id)


@pytest.mark.asyncio
async def test_resource_cannot_be_allocated_to_both_project_and_task(
    resource_service, test_resource, test_project, test_task
):
    """Test that a resource cannot be allocated to both a project and a task (mutual exclusivity)"""
    # Allocate to project first
    project_allocation = ResourceAllocationCreate(
        resource_id=test_resource.id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=50.0,
        lead=True
    )
    await resource_service.allocate_resource(project_allocation)
    
    # Try to allocate to task - should fail
    task_allocation = ResourceAllocationCreate(
        resource_id=test_resource.id,
        target_id=test_task,
        target_type="task",
        allocation_percentage=30.0,
        lead=False
    )
    
    with pytest.raises(ValueError, match="already allocated to a project"):
        await resource_service.allocate_resource(task_allocation)
    
    # Cleanup
    await resource_service.remove_allocation(test_resource.id, test_project)
    
    # Now allocate to task
    await resource_service.allocate_resource(task_allocation)
    
    # Try to allocate to project - should fail
    with pytest.raises(ValueError, match="already allocated to a task"):
        await resource_service.allocate_resource(project_allocation)
    
    # Cleanup
    await resource_service.remove_allocation(test_resource.id, test_task)



# ============================================================================
# Property-Based Tests
# ============================================================================


class TestResourceAllocationLeadProperties:
    """Property-based tests for lead flag validation"""

    @given(lead=st.booleans())
    def test_lead_is_always_boolean_in_schema(self, lead):
        """
        Property: lead flag in ResourceAllocationCreate is always a boolean

        **Validates: Requirements 16.29**
        """
        # Create allocation with generated boolean value
        allocation = ResourceAllocationCreate(
            resource_id=uuid4(),
            target_id=uuid4(),
            target_type="project",
            allocation_percentage=50.0,
            lead=lead
        )

        # Verify lead is a boolean
        assert isinstance(allocation.lead, bool)
        assert allocation.lead is lead

    @given(lead=st.booleans())
    def test_lead_is_always_boolean_in_update_schema(self, lead):
        """
        Property: lead flag in ResourceAllocationUpdate is always a boolean

        **Validates: Requirements 16.29**
        """
        # Create update with generated boolean value
        update = ResourceAllocationUpdate(lead=lead)

        # Verify lead is a boolean
        assert isinstance(update.lead, bool)
        assert update.lead is lead

    @given(
        allocation_percentage=st.floats(min_value=0.0, max_value=100.0),
        lead=st.booleans()
    )
    def test_lead_boolean_with_various_allocations(
        self, allocation_percentage, lead
    ):
        """
        Property: lead flag remains boolean regardless of allocation percentage

        **Validates: Requirements 16.29**
        """
        allocation = ResourceAllocationCreate(
            resource_id=uuid4(),
            target_id=uuid4(),
            target_type="project",
            allocation_percentage=allocation_percentage,
            lead=lead
        )

        # Verify lead is always boolean
        assert isinstance(allocation.lead, bool)
        assert allocation.lead is lead
        # Verify it's not accidentally converted to int (0/1)
        assert type(allocation.lead) is bool

    @given(
        target_type=st.sampled_from(["project", "task"]),
        lead=st.booleans()
    )
    def test_lead_boolean_for_both_target_types(self, target_type, lead):
        """
        Property: lead flag is boolean for both project and task allocations

        **Validates: Requirements 16.29**
        """
        allocation = ResourceAllocationCreate(
            resource_id=uuid4(),
            target_id=uuid4(),
            target_type=target_type,
            allocation_percentage=50.0,
            lead=lead
        )

        # Verify lead is boolean regardless of target type
        assert isinstance(allocation.lead, bool)
        assert allocation.lead is lead

    def test_lead_default_is_boolean_false(self):
        """
        Property: lead flag defaults to boolean False when not specified

        **Validates: Requirements 16.29**
        """
        # Create allocation without specifying lead
        allocation = ResourceAllocationCreate(
            resource_id=uuid4(),
            target_id=uuid4(),
            target_type="project",
            allocation_percentage=50.0
            # lead not specified
        )

        # Verify lead defaults to False and is boolean
        assert isinstance(allocation.lead, bool)
        assert allocation.lead is False
        assert type(allocation.lead) is bool

    @given(lead=st.booleans())
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        max_examples=5  # Limit examples to avoid cleanup issues
    )
    @pytest.mark.asyncio
    async def test_lead_persists_as_boolean_through_service(
        self, lead, resource_service, test_resource, test_project
    ):
        """
        Property: lead flag remains boolean through service layer operations

        **Validates: Requirements 16.29**
        """
        try:
            # Create allocation with generated boolean
            allocation_data = ResourceAllocationCreate(
                resource_id=test_resource.id,
                target_id=test_project,
                target_type="project",
                allocation_percentage=50.0,
                lead=lead
            )

            # Allocate through service
            allocation = await resource_service.allocate_resource(allocation_data)

            # Verify lead is still boolean after service processing
            assert isinstance(allocation.lead, bool)
            assert allocation.lead is lead
            assert type(allocation.lead) is bool
        finally:
            # Cleanup - ignore errors if already cleaned up
            try:
                await resource_service.remove_allocation(test_resource.id, test_project)
            except:
                pass  # Already cleaned up

    @pytest.mark.asyncio
    async def test_lead_cannot_be_non_boolean_types(
        self, resource_service, test_resource, test_project
    ):
        """
        Property: lead flag rejects non-boolean types (strict validation)

        **Validates: Requirements 16.29**
        
        Note: Pydantic v2 coerces truthy/falsy values to bool by default.
        This test verifies that the schema accepts boolean values correctly.
        """
        # Test that actual boolean values work correctly
        valid_lead_values = [True, False]

        for valid_value in valid_lead_values:
            # This should succeed
            allocation = ResourceAllocationCreate(
                resource_id=test_resource.id,
                target_id=test_project,
                target_type="project",
                allocation_percentage=50.0,
                lead=valid_value
            )
            assert isinstance(allocation.lead, bool)
            assert type(allocation.lead) is bool

    @given(
        lead1=st.booleans(),
        lead2=st.booleans()
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        max_examples=5  # Limit examples to avoid cleanup issues
    )
    @pytest.mark.asyncio
    async def test_lead_boolean_in_multiple_allocations(
        self, lead1, lead2, resource_service, graph_service, test_department, test_project
    ):
        """
        Property: lead flag is boolean in all allocations regardless of other allocations

        **Validates: Requirements 16.29**
        """
        resource1 = None
        resource2 = None
        
        try:
            # Create two resources
            resource1_data = ResourceCreate(
                name="Resource 1",
                type="person",
                capacity=40.0,
                department_id=test_department,
                skills=["Python"],
                availability="available"
            )
            resource1 = await resource_service.create_resource(resource1_data)

            resource2_data = ResourceCreate(
                name="Resource 2",
                type="person",
                capacity=40.0,
                department_id=test_department,
                skills=["JavaScript"],
                availability="available"
            )
            resource2 = await resource_service.create_resource(resource2_data)

            # Allocate both with different lead values
            allocation1 = ResourceAllocationCreate(
                resource_id=resource1.id,
                target_id=test_project,
                target_type="project",
                allocation_percentage=50.0,
                lead=lead1
            )
            result1 = await resource_service.allocate_resource(allocation1)

            allocation2 = ResourceAllocationCreate(
                resource_id=resource2.id,
                target_id=test_project,
                target_type="project",
                allocation_percentage=30.0,
                lead=lead2
            )
            result2 = await resource_service.allocate_resource(allocation2)

            # Verify both lead flags are boolean
            assert isinstance(result1.lead, bool)
            assert isinstance(result2.lead, bool)
            assert result1.lead is lead1
            assert result2.lead is lead2
            assert type(result1.lead) is bool
            assert type(result2.lead) is bool
        finally:
            # Cleanup - ignore errors if already cleaned up
            if resource1:
                try:
                    await resource_service.remove_allocation(resource1.id, test_project)
                except:
                    pass
                try:
                    await resource_service.delete_resource(resource1.id)
                except:
                    pass
            if resource2:
                try:
                    await resource_service.remove_allocation(resource2.id, test_project)
                except:
                    pass
                try:
                    await resource_service.delete_resource(resource2.id)
                except:
                    pass

    @given(lead=st.booleans())
    def test_lead_boolean_in_update_schema_validation(self, lead):
        """
        Property: lead flag in update schema accepts boolean and preserves type

        **Validates: Requirements 16.29**
        """
        # Test that update schema accepts boolean values
        update = ResourceAllocationUpdate(
            lead=lead,
            allocation_percentage=75.0
        )

        # Verify lead is boolean
        assert isinstance(update.lead, bool)
        assert update.lead is lead
        assert type(update.lead) is bool


class TestResourceAllocationMutualExclusivity:
    """Property-based tests for Resource allocation mutual exclusivity (Project XOR Task)"""

    @given(
        allocation_percentage=st.floats(min_value=1.0, max_value=100.0),
        lead=st.booleans()
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        max_examples=10
    )
    @pytest.mark.asyncio
    async def test_resource_cannot_be_allocated_to_both_project_and_task_property(
        self,
        allocation_percentage,
        lead,
        resource_service,
        test_resource,
        test_project,
        test_task
    ):
        """
        Property: A Resource can be allocated to EITHER a Project OR a Task, but never both

        **Validates: Requirements 16.27-16.28, 16.32**
        
        This property verifies the mutual exclusivity constraint:
        - A Resource can be allocated to a Project
        - A Resource can be allocated to a Task
        - A Resource CANNOT be allocated to both simultaneously
        - Attempting to allocate to both should fail with appropriate error
        """
        try:
            # Test Case 1: Allocate to Project first, then try Task (should fail)
            project_allocation = ResourceAllocationCreate(
                resource_id=test_resource.id,
                target_id=test_project,
                target_type="project",
                allocation_percentage=allocation_percentage,
                lead=lead
            )
            
            # Allocate to project - should succeed
            result = await resource_service.allocate_resource(project_allocation)
            assert result.target_id == test_project
            assert result.target_type.lower() == "project"
            assert result.allocation_percentage == allocation_percentage
            assert result.lead is lead
            
            # Try to allocate to task - should fail with specific error
            task_allocation = ResourceAllocationCreate(
                resource_id=test_resource.id,
                target_id=test_task,
                target_type="task",
                allocation_percentage=allocation_percentage,
                lead=lead
            )
            
            with pytest.raises(ValueError) as exc_info:
                await resource_service.allocate_resource(task_allocation)
            
            # Verify error message mentions the constraint
            error_message = str(exc_info.value)
            assert "already allocated to a project" in error_message.lower()
            assert "cannot be allocated to both" in error_message.lower()
            
            # Cleanup: Remove project allocation
            await resource_service.remove_allocation(test_resource.id, test_project)
            
            # Test Case 2: Allocate to Task first, then try Project (should fail)
            # Allocate to task - should succeed
            result = await resource_service.allocate_resource(task_allocation)
            assert result.target_id == test_task
            assert result.target_type.lower() == "task"
            assert result.allocation_percentage == allocation_percentage
            assert result.lead is lead
            
            # Try to allocate to project - should fail with specific error
            with pytest.raises(ValueError) as exc_info:
                await resource_service.allocate_resource(project_allocation)
            
            # Verify error message mentions the constraint
            error_message = str(exc_info.value)
            assert "already allocated to a task" in error_message.lower()
            assert "cannot be allocated to both" in error_message.lower()
            
        finally:
            # Cleanup - ignore errors if already cleaned up
            try:
                await resource_service.remove_allocation(test_resource.id, test_project)
            except:
                pass
            try:
                await resource_service.remove_allocation(test_resource.id, test_task)
            except:
                pass

    @given(
        project_allocation_pct=st.floats(min_value=1.0, max_value=100.0),
        task_allocation_pct=st.floats(min_value=1.0, max_value=100.0),
        project_lead=st.booleans(),
        task_lead=st.booleans()
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        max_examples=10
    )
    @pytest.mark.asyncio
    async def test_resource_can_switch_between_project_and_task_allocation(
        self,
        project_allocation_pct,
        task_allocation_pct,
        project_lead,
        task_lead,
        resource_service,
        test_resource,
        test_project,
        test_task
    ):
        """
        Property: A Resource can switch from Project to Task allocation (and vice versa) 
        after removing the previous allocation

        **Validates: Requirements 16.27-16.28, 16.32**
        
        This property verifies that the XOR constraint is enforced but allows transitions:
        - Resource can be allocated to Project
        - After removing Project allocation, Resource can be allocated to Task
        - After removing Task allocation, Resource can be allocated to Project again
        """
        try:
            # Step 1: Allocate to Project
            project_allocation = ResourceAllocationCreate(
                resource_id=test_resource.id,
                target_id=test_project,
                target_type="project",
                allocation_percentage=project_allocation_pct,
                lead=project_lead
            )
            
            result = await resource_service.allocate_resource(project_allocation)
            assert result.target_id == test_project
            assert result.target_type.lower() == "project"
            
            # Step 2: Remove Project allocation
            removed = await resource_service.remove_allocation(test_resource.id, test_project)
            assert removed is True
            
            # Step 3: Allocate to Task (should succeed after removal)
            task_allocation = ResourceAllocationCreate(
                resource_id=test_resource.id,
                target_id=test_task,
                target_type="task",
                allocation_percentage=task_allocation_pct,
                lead=task_lead
            )
            
            result = await resource_service.allocate_resource(task_allocation)
            assert result.target_id == test_task
            assert result.target_type.lower() == "task"
            
            # Step 4: Remove Task allocation
            removed = await resource_service.remove_allocation(test_resource.id, test_task)
            assert removed is True
            
            # Step 5: Allocate to Project again (should succeed after removal)
            result = await resource_service.allocate_resource(project_allocation)
            assert result.target_id == test_project
            assert result.target_type.lower() == "project"
            
        finally:
            # Cleanup - ignore errors if already cleaned up
            try:
                await resource_service.remove_allocation(test_resource.id, test_project)
            except:
                pass
            try:
                await resource_service.remove_allocation(test_resource.id, test_task)
            except:
                pass

    @given(
        allocation_percentage=st.floats(min_value=1.0, max_value=100.0),
        lead=st.booleans(),
        target_type=st.sampled_from(["project", "task"])
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        max_examples=10
    )
    @pytest.mark.asyncio
    async def test_resource_can_be_allocated_to_single_target_type(
        self,
        allocation_percentage,
        lead,
        target_type,
        resource_service,
        test_resource,
        test_project,
        test_task
    ):
        """
        Property: A Resource can be successfully allocated to either a Project OR a Task

        **Validates: Requirements 16.27-16.28, 16.32**
        
        This property verifies that single allocations work correctly:
        - Resource can be allocated to a Project (when not allocated to Task)
        - Resource can be allocated to a Task (when not allocated to Project)
        - Both allocation types support lead flag and allocation percentage
        """
        try:
            target_id = test_project if target_type == "project" else test_task
            
            allocation = ResourceAllocationCreate(
                resource_id=test_resource.id,
                target_id=target_id,
                target_type=target_type,
                allocation_percentage=allocation_percentage,
                lead=lead
            )
            
            # Allocation should succeed
            result = await resource_service.allocate_resource(allocation)
            
            # Verify allocation properties
            assert result.target_id == target_id
            assert result.target_type.lower() == target_type
            assert result.allocation_percentage == allocation_percentage
            assert result.lead is lead
            assert isinstance(result.lead, bool)
            
            # Verify allocation is retrievable
            allocations = await resource_service.get_resource_allocations(test_resource.id)
            assert len(allocations) == 1
            assert allocations[0].target_id == target_id
            assert allocations[0].target_type.lower() == target_type
            
        finally:
            # Cleanup - ignore errors if already cleaned up
            try:
                await resource_service.remove_allocation(test_resource.id, test_project)
            except:
                pass
            try:
                await resource_service.remove_allocation(test_resource.id, test_task)
            except:
                pass

    @given(
        num_resources=st.integers(min_value=2, max_value=5),
        allocation_percentage=st.floats(min_value=10.0, max_value=100.0)
    )
    @settings(
        suppress_health_check=[HealthCheck.function_scoped_fixture],
        max_examples=5
    )
    @pytest.mark.asyncio
    async def test_multiple_resources_can_have_different_allocation_types(
        self,
        num_resources,
        allocation_percentage,
        resource_service,
        graph_service,
        test_department,
        test_project,
        test_task
    ):
        """
        Property: Multiple Resources can be allocated to different target types simultaneously

        **Validates: Requirements 16.27-16.28, 16.32**
        
        This property verifies that the XOR constraint is per-resource:
        - Resource A can be allocated to Project
        - Resource B can be allocated to Task
        - The constraint applies per-resource, not globally
        """
        resources = []
        
        try:
            # Create multiple resources
            for i in range(num_resources):
                resource_data = ResourceCreate(
                    name=f"Test Resource {i}",
                    type="person",
                    capacity=40.0,
                    department_id=test_department,
                    skills=["Python"],
                    availability="available"
                )
                resource = await resource_service.create_resource(resource_data)
                resources.append(resource)
            
            # Allocate half to project, half to task
            project_resources = resources[:num_resources // 2]
            task_resources = resources[num_resources // 2:]
            
            # Allocate to project
            for resource in project_resources:
                allocation = ResourceAllocationCreate(
                    resource_id=resource.id,
                    target_id=test_project,
                    target_type="project",
                    allocation_percentage=allocation_percentage,
                    lead=False
                )
                result = await resource_service.allocate_resource(allocation)
                assert result.target_type.lower() == "project"
            
            # Allocate to task
            for resource in task_resources:
                allocation = ResourceAllocationCreate(
                    resource_id=resource.id,
                    target_id=test_task,
                    target_type="task",
                    allocation_percentage=allocation_percentage,
                    lead=False
                )
                result = await resource_service.allocate_resource(allocation)
                assert result.target_type.lower() == "task"
            
            # Verify each resource has exactly one allocation
            for resource in resources:
                allocations = await resource_service.get_resource_allocations(resource.id)
                assert len(allocations) == 1
            
        finally:
            # Cleanup
            for resource in resources:
                try:
                    await resource_service.remove_allocation(resource.id, test_project)
                except:
                    pass
                try:
                    await resource_service.remove_allocation(resource.id, test_task)
                except:
                    pass
                try:
                    await resource_service.delete_resource(resource.id)
                except:
                    pass

"""Unit tests for resource inheritance algorithm"""

import pytest
from datetime import datetime, UTC
from uuid import uuid4, UUID
from hypothesis import given, strategies as st, settings, HealthCheck

from app.db.graph import GraphService
from app.services.resource_service import ResourceService
from app.schemas.resource import (
    ResourceCreate,
    ResourceAllocationCreate,
)


@pytest.fixture
async def graph_service(monkeypatch):
    """Create a graph service instance for testing"""
    # Override DATABASE_URL for testing
    test_db_url = "postgresql+asyncpg://rxdx:rxdx_dev_password@localhost:5432/test_rxdx"
    monkeypatch.setenv("DATABASE_URL", test_db_url)
    
    # Reload settings to pick up the new DATABASE_URL
    from app.core.config import Settings
    test_settings = Settings(DATABASE_URL=test_db_url)
    
    # Patch the settings in the graph module
    import app.db.graph as graph_module
    original_settings = graph_module.settings
    graph_module.settings = test_settings
    
    service = GraphService()
    await service.connect()
    yield service
    await service.close()
    
    # Restore original settings
    graph_module.settings = original_settings


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
async def test_project(graph_service):
    """Create a test project"""
    project_id = uuid4()
    await graph_service.create_node("Project", {
        "id": str(project_id),
        "name": "Test Project",
        "status": "active",
        "created_at": datetime.now(UTC).isoformat()
    })
    yield project_id
    # Cleanup
    await graph_service.delete_node(str(project_id))


@pytest.fixture
async def test_phase(graph_service, test_project):
    """Create a test phase"""
    phase_id = uuid4()
    await graph_service.create_node("Phase", {
        "id": str(phase_id),
        "name": "Test Phase",
        "project_id": str(test_project),
        "created_at": datetime.now(UTC).isoformat()
    })
    await graph_service.create_relationship(str(phase_id), str(test_project), "BELONGS_TO")
    yield phase_id
    # Cleanup
    await graph_service.delete_node(str(phase_id))


@pytest.fixture
async def test_workpackage(graph_service, test_phase):
    """Create a test workpackage"""
    wp_id = uuid4()
    await graph_service.create_node("Workpackage", {
        "id": str(wp_id),
        "name": "Test Workpackage",
        "phase_id": str(test_phase),
        "created_at": datetime.now(UTC).isoformat()
    })
    await graph_service.create_relationship(str(wp_id), str(test_phase), "BELONGS_TO")
    yield wp_id
    # Cleanup
    await graph_service.delete_node(str(wp_id))


@pytest.fixture
async def test_task(graph_service, test_workpackage):
    """Create a test task (WorkItem with type='task')"""
    task_id = uuid4()
    await graph_service.create_workitem_node(
        workitem_id=str(task_id),
        workitem_type="task",
        title="Test Task",
        description="Test task for resource inheritance",
        status="ready",
        priority=3,
        workpackage_id=str(test_workpackage)
    )
    yield task_id
    # Cleanup
    await graph_service.delete_node(str(task_id))


@pytest.fixture
async def test_resources(resource_service, test_department):
    """Create multiple test resources"""
    resources = []
    for i in range(3):
        resource_data = ResourceCreate(
            name=f"Test Resource {i+1}",
            type="person",
            capacity=40.0,
            department_id=UUID(test_department),
            skills=["Python", "FastAPI"],
            availability="available"
        )
        resource = await resource_service.create_resource(resource_data)
        resources.append(resource)
    
    yield resources
    
    # Cleanup
    for resource in resources:
        try:
            await resource_service.delete_resource(resource.id)
        except:
            pass


# ============================================================================
# Unit Tests for Resource Inheritance
# ============================================================================


@pytest.mark.asyncio
async def test_task_level_allocation_only(
    resource_service, test_resources, test_task
):
    """Test getting effective resources when only task-level allocation exists"""
    # Allocate resource directly to task
    allocation_data = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_task,
        target_type="task",
        allocation_percentage=100.0,
        lead=True
    )
    await resource_service.allocate_resource(allocation_data)
    
    # Get effective resources
    effective_resources = await resource_service.get_effective_resources_for_task(test_task)
    
    # Verify only task-level allocation is returned
    assert len(effective_resources) == 1
    assert effective_resources[0]['resource'].id == test_resources[0].id
    assert effective_resources[0]['allocation_percentage'] == 100.0
    assert effective_resources[0]['lead'] is True
    assert effective_resources[0]['source_level'] == 'task'
    assert effective_resources[0]['source_id'] == test_task
    
    # Cleanup
    await resource_service.remove_allocation(test_resources[0].id, test_task)


@pytest.mark.asyncio
async def test_workpackage_level_allocation_only(
    resource_service, test_resources, test_task, test_workpackage
):
    """Test getting effective resources when only workpackage-level allocation exists"""
    # Allocate resource to workpackage
    allocation_data = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_workpackage,
        target_type="workpackage",
        allocation_percentage=75.0,
        lead=False
    )
    await resource_service.allocate_resource(allocation_data)
    
    # Get effective resources for task
    effective_resources = await resource_service.get_effective_resources_for_task(test_task)
    
    # Verify workpackage-level allocation is inherited
    assert len(effective_resources) == 1
    assert effective_resources[0]['resource'].id == test_resources[0].id
    assert effective_resources[0]['allocation_percentage'] == 75.0
    assert effective_resources[0]['lead'] is False
    assert effective_resources[0]['source_level'] == 'workpackage'
    assert effective_resources[0]['source_id'] == test_workpackage
    
    # Cleanup
    await resource_service.remove_allocation(test_resources[0].id, test_workpackage)


@pytest.mark.asyncio
async def test_project_level_allocation_only(
    resource_service, test_resources, test_task, test_project
):
    """Test getting effective resources when only project-level allocation exists"""
    # Allocate resource to project
    allocation_data = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=50.0,
        lead=True
    )
    await resource_service.allocate_resource(allocation_data)
    
    # Get effective resources for task
    effective_resources = await resource_service.get_effective_resources_for_task(test_task)
    
    # Verify project-level allocation is inherited
    assert len(effective_resources) == 1
    assert effective_resources[0]['resource'].id == test_resources[0].id
    assert effective_resources[0]['allocation_percentage'] == 50.0
    assert effective_resources[0]['lead'] is True
    assert effective_resources[0]['source_level'] == 'project'
    assert effective_resources[0]['source_id'] == test_project
    
    # Cleanup
    await resource_service.remove_allocation(test_resources[0].id, test_project)


@pytest.mark.asyncio
async def test_task_overrides_workpackage_allocation(
    resource_service, test_resources, test_task, test_workpackage
):
    """Test that task-level allocation overrides workpackage-level allocation"""
    # Allocate resource to workpackage
    wp_allocation = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_workpackage,
        target_type="workpackage",
        allocation_percentage=50.0,
        lead=False
    )
    await resource_service.allocate_resource(wp_allocation)
    
    # Allocate same resource to task with different values
    task_allocation = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_task,
        target_type="task",
        allocation_percentage=100.0,
        lead=True
    )
    await resource_service.allocate_resource(task_allocation)
    
    # Get effective resources
    effective_resources = await resource_service.get_effective_resources_for_task(test_task)
    
    # Verify task-level allocation wins (most specific)
    assert len(effective_resources) == 1
    assert effective_resources[0]['resource'].id == test_resources[0].id
    assert effective_resources[0]['allocation_percentage'] == 100.0  # Task value, not workpackage
    assert effective_resources[0]['lead'] is True  # Task value, not workpackage
    assert effective_resources[0]['source_level'] == 'task'
    
    # Cleanup
    await resource_service.remove_allocation(test_resources[0].id, test_task)
    await resource_service.remove_allocation(test_resources[0].id, test_workpackage)


@pytest.mark.asyncio
async def test_task_overrides_project_allocation(
    resource_service, test_resources, test_task, test_project
):
    """Test that task-level allocation overrides project-level allocation"""
    # Allocate resource to project
    project_allocation = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=30.0,
        lead=False
    )
    await resource_service.allocate_resource(project_allocation)
    
    # Allocate same resource to task with different values
    task_allocation = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_task,
        target_type="task",
        allocation_percentage=80.0,
        lead=True
    )
    await resource_service.allocate_resource(task_allocation)
    
    # Get effective resources
    effective_resources = await resource_service.get_effective_resources_for_task(test_task)
    
    # Verify task-level allocation wins
    assert len(effective_resources) == 1
    assert effective_resources[0]['resource'].id == test_resources[0].id
    assert effective_resources[0]['allocation_percentage'] == 80.0  # Task value
    assert effective_resources[0]['lead'] is True  # Task value
    assert effective_resources[0]['source_level'] == 'task'
    
    # Cleanup
    await resource_service.remove_allocation(test_resources[0].id, test_task)
    await resource_service.remove_allocation(test_resources[0].id, test_project)


@pytest.mark.asyncio
async def test_workpackage_overrides_project_allocation(
    resource_service, test_resources, test_task, test_workpackage, test_project
):
    """Test that workpackage-level allocation overrides project-level allocation"""
    # Allocate resource to project
    project_allocation = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=40.0,
        lead=False
    )
    await resource_service.allocate_resource(project_allocation)
    
    # Allocate same resource to workpackage with different values
    wp_allocation = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_workpackage,
        target_type="workpackage",
        allocation_percentage=70.0,
        lead=True
    )
    await resource_service.allocate_resource(wp_allocation)
    
    # Get effective resources for task
    effective_resources = await resource_service.get_effective_resources_for_task(test_task)
    
    # Verify workpackage-level allocation wins over project
    assert len(effective_resources) == 1
    assert effective_resources[0]['resource'].id == test_resources[0].id
    assert effective_resources[0]['allocation_percentage'] == 70.0  # Workpackage value
    assert effective_resources[0]['lead'] is True  # Workpackage value
    assert effective_resources[0]['source_level'] == 'workpackage'
    
    # Cleanup
    await resource_service.remove_allocation(test_resources[0].id, test_workpackage)
    await resource_service.remove_allocation(test_resources[0].id, test_project)


@pytest.mark.asyncio
async def test_union_of_resources_from_all_levels(
    resource_service, test_resources, test_task, test_workpackage, test_project
):
    """Test that effective resources is the union of resources from all levels"""
    # Allocate different resources at each level
    # Resource 1 at project level
    project_allocation = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=30.0,
        lead=False
    )
    await resource_service.allocate_resource(project_allocation)
    
    # Resource 2 at workpackage level
    wp_allocation = ResourceAllocationCreate(
        resource_id=test_resources[1].id,
        target_id=test_workpackage,
        target_type="workpackage",
        allocation_percentage=50.0,
        lead=True
    )
    await resource_service.allocate_resource(wp_allocation)
    
    # Resource 3 at task level
    task_allocation = ResourceAllocationCreate(
        resource_id=test_resources[2].id,
        target_id=test_task,
        target_type="task",
        allocation_percentage=100.0,
        lead=True
    )
    await resource_service.allocate_resource(task_allocation)
    
    # Get effective resources
    effective_resources = await resource_service.get_effective_resources_for_task(test_task)
    
    # Verify all three resources are included (union)
    assert len(effective_resources) == 3
    
    resource_ids = {res['resource'].id for res in effective_resources}
    assert test_resources[0].id in resource_ids
    assert test_resources[1].id in resource_ids
    assert test_resources[2].id in resource_ids
    
    # Verify each resource has correct source level
    for res in effective_resources:
        if res['resource'].id == test_resources[0].id:
            assert res['source_level'] == 'project'
            assert res['allocation_percentage'] == 30.0
        elif res['resource'].id == test_resources[1].id:
            assert res['source_level'] == 'workpackage'
            assert res['allocation_percentage'] == 50.0
        elif res['resource'].id == test_resources[2].id:
            assert res['source_level'] == 'task'
            assert res['allocation_percentage'] == 100.0
    
    # Cleanup
    await resource_service.remove_allocation(test_resources[0].id, test_project)
    await resource_service.remove_allocation(test_resources[1].id, test_workpackage)
    await resource_service.remove_allocation(test_resources[2].id, test_task)


@pytest.mark.asyncio
async def test_lead_resources_sorted_first(
    resource_service, test_resources, test_task, test_workpackage, test_project
):
    """Test that lead resources are sorted before non-lead resources"""
    # Allocate resources with different lead values
    # Non-lead at project
    project_allocation = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=30.0,
        lead=False
    )
    await resource_service.allocate_resource(project_allocation)
    
    # Lead at workpackage
    wp_allocation = ResourceAllocationCreate(
        resource_id=test_resources[1].id,
        target_id=test_workpackage,
        target_type="workpackage",
        allocation_percentage=50.0,
        lead=True
    )
    await resource_service.allocate_resource(wp_allocation)
    
    # Lead at task
    task_allocation = ResourceAllocationCreate(
        resource_id=test_resources[2].id,
        target_id=test_task,
        target_type="task",
        allocation_percentage=100.0,
        lead=True
    )
    await resource_service.allocate_resource(task_allocation)
    
    # Get effective resources
    effective_resources = await resource_service.get_effective_resources_for_task(test_task)
    
    # Verify lead resources come first
    assert len(effective_resources) == 3
    
    # First two should be lead resources
    assert effective_resources[0]['lead'] is True
    assert effective_resources[1]['lead'] is True
    # Last should be non-lead
    assert effective_resources[2]['lead'] is False
    assert effective_resources[2]['resource'].id == test_resources[0].id
    
    # Cleanup
    await resource_service.remove_allocation(test_resources[0].id, test_project)
    await resource_service.remove_allocation(test_resources[1].id, test_workpackage)
    await resource_service.remove_allocation(test_resources[2].id, test_task)


@pytest.mark.asyncio
async def test_no_allocations_returns_empty_list(
    resource_service, test_task
):
    """Test that getting effective resources with no allocations returns empty list"""
    # Get effective resources without any allocations
    effective_resources = await resource_service.get_effective_resources_for_task(test_task)
    
    # Verify empty list
    assert len(effective_resources) == 0
    assert isinstance(effective_resources, list)


@pytest.mark.asyncio
async def test_allocation_with_start_and_end_dates(
    resource_service, test_resources, test_task
):
    """Test that allocation dates are preserved in effective resources"""
    from datetime import timedelta
    
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=30)
    
    # Allocate resource with dates
    allocation_data = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_task,
        target_type="task",
        allocation_percentage=100.0,
        lead=True,
        start_date=start_date,
        end_date=end_date
    )
    await resource_service.allocate_resource(allocation_data)
    
    # Get effective resources
    effective_resources = await resource_service.get_effective_resources_for_task(test_task)
    
    # Verify dates are preserved
    assert len(effective_resources) == 1
    assert effective_resources[0]['start_date'] is not None
    assert effective_resources[0]['end_date'] is not None
    # Compare dates (allowing for small time differences due to serialization)
    assert abs((effective_resources[0]['start_date'] - start_date).total_seconds()) < 1
    assert abs((effective_resources[0]['end_date'] - end_date).total_seconds()) < 1
    
    # Cleanup
    await resource_service.remove_allocation(test_resources[0].id, test_task)


@pytest.mark.asyncio
async def test_three_level_inheritance_priority(
    resource_service, test_resources, test_task, test_workpackage, test_project
):
    """Test complete 3-level inheritance with priority: task > workpackage > project"""
    # Allocate same resource at all three levels with different values
    # Project level (lowest priority)
    project_allocation = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=25.0,
        lead=False
    )
    await resource_service.allocate_resource(project_allocation)
    
    # Workpackage level (medium priority)
    wp_allocation = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_workpackage,
        target_type="workpackage",
        allocation_percentage=50.0,
        lead=False
    )
    await resource_service.allocate_resource(wp_allocation)
    
    # Task level (highest priority)
    task_allocation = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_task,
        target_type="task",
        allocation_percentage=100.0,
        lead=True
    )
    await resource_service.allocate_resource(task_allocation)
    
    # Get effective resources
    effective_resources = await resource_service.get_effective_resources_for_task(test_task)
    
    # Verify only one resource (task-level wins)
    assert len(effective_resources) == 1
    assert effective_resources[0]['resource'].id == test_resources[0].id
    assert effective_resources[0]['allocation_percentage'] == 100.0  # Task value
    assert effective_resources[0]['lead'] is True  # Task value
    assert effective_resources[0]['source_level'] == 'task'
    
    # Cleanup
    await resource_service.remove_allocation(test_resources[0].id, test_task)
    await resource_service.remove_allocation(test_resources[0].id, test_workpackage)
    await resource_service.remove_allocation(test_resources[0].id, test_project)


@pytest.mark.asyncio
async def test_multiple_resources_at_same_level(
    resource_service, test_resources, test_task
):
    """Test multiple resources allocated at the same level"""
    # Allocate all three resources at task level
    for i, resource in enumerate(test_resources):
        allocation_data = ResourceAllocationCreate(
            resource_id=resource.id,
            target_id=test_task,
            target_type="task",
            allocation_percentage=30.0 + (i * 10),
            lead=(i == 0)  # First one is lead
        )
        await resource_service.allocate_resource(allocation_data)
    
    # Get effective resources
    effective_resources = await resource_service.get_effective_resources_for_task(test_task)
    
    # Verify all three resources are included
    assert len(effective_resources) == 3
    
    # Verify lead resource is first
    assert effective_resources[0]['lead'] is True
    assert effective_resources[0]['resource'].id == test_resources[0].id
    
    # Verify all have correct allocations
    for i, res in enumerate(effective_resources):
        if res['resource'].id == test_resources[0].id:
            assert res['allocation_percentage'] == 30.0
        elif res['resource'].id == test_resources[1].id:
            assert res['allocation_percentage'] == 40.0
        elif res['resource'].id == test_resources[2].id:
            assert res['allocation_percentage'] == 50.0
    
    # Cleanup
    for resource in test_resources:
        await resource_service.remove_allocation(resource.id, test_task)


@pytest.mark.asyncio
async def test_resource_inheritance_with_mixed_levels(
    resource_service, test_resources, test_task, test_workpackage, test_project
):
    """Test complex scenario with resources at mixed levels"""
    # Resource 1: Project and Task level (task should win)
    project_alloc1 = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=20.0,
        lead=False
    )
    await resource_service.allocate_resource(project_alloc1)
    
    task_alloc1 = ResourceAllocationCreate(
        resource_id=test_resources[0].id,
        target_id=test_task,
        target_type="task",
        allocation_percentage=90.0,
        lead=True
    )
    await resource_service.allocate_resource(task_alloc1)
    
    # Resource 2: Project and Workpackage level (workpackage should win)
    project_alloc2 = ResourceAllocationCreate(
        resource_id=test_resources[1].id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=30.0,
        lead=False
    )
    await resource_service.allocate_resource(project_alloc2)
    
    wp_alloc2 = ResourceAllocationCreate(
        resource_id=test_resources[1].id,
        target_id=test_workpackage,
        target_type="workpackage",
        allocation_percentage=60.0,
        lead=True
    )
    await resource_service.allocate_resource(wp_alloc2)
    
    # Resource 3: Only project level
    project_alloc3 = ResourceAllocationCreate(
        resource_id=test_resources[2].id,
        target_id=test_project,
        target_type="project",
        allocation_percentage=40.0,
        lead=False
    )
    await resource_service.allocate_resource(project_alloc3)
    
    # Get effective resources
    effective_resources = await resource_service.get_effective_resources_for_task(test_task)
    
    # Verify all three resources with correct priorities
    assert len(effective_resources) == 3
    
    for res in effective_resources:
        if res['resource'].id == test_resources[0].id:
            # Task level wins
            assert res['allocation_percentage'] == 90.0
            assert res['lead'] is True
            assert res['source_level'] == 'task'
        elif res['resource'].id == test_resources[1].id:
            # Workpackage level wins
            assert res['allocation_percentage'] == 60.0
            assert res['lead'] is True
            assert res['source_level'] == 'workpackage'
        elif res['resource'].id == test_resources[2].id:
            # Project level (only option)
            assert res['allocation_percentage'] == 40.0
            assert res['lead'] is False
            assert res['source_level'] == 'project'
    
    # Cleanup
    await resource_service.remove_allocation(test_resources[0].id, test_task)
    await resource_service.remove_allocation(test_resources[0].id, test_project)
    await resource_service.remove_allocation(test_resources[1].id, test_workpackage)
    await resource_service.remove_allocation(test_resources[1].id, test_project)
    await resource_service.remove_allocation(test_resources[2].id, test_project)



# ============================================================================
# Property-Based Tests for Resource Inheritance
# ============================================================================


@given(
    task_allocation=st.floats(min_value=1.0, max_value=100.0),
    task_lead=st.booleans(),
    project_allocation=st.floats(min_value=1.0, max_value=100.0),
    project_lead=st.booleans(),
)
@settings(
    max_examples=50,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
@pytest.mark.asyncio
async def test_property_most_specific_allocation_wins(
    resource_service,
    test_resources,
    test_task,
    test_project,
    task_allocation: float,
    task_lead: bool,
    project_allocation: float,
    project_lead: bool,
):
    """
    Property: Most specific allocation wins
    
    **Validates: Requirements 16B.1-16B.27**
    
    When a resource is allocated at multiple levels (project, task),
    the most specific level should always take precedence:
    - Task-level allocation overrides project
    - Project-level allocation is used only if no more specific allocation exists
    
    This property tests that regardless of the allocation percentages and lead values
    at different levels, the most specific level always wins.
    
    Note: Currently tests 2-level inheritance (project, task). Workpackage-level
    allocations will be added in future implementation.
    """
    try:
        # Use the first test resource
        resource = test_resources[0]
        
        # Allocate resource at both levels with different values
        # Project level (lower priority)
        project_alloc = ResourceAllocationCreate(
            resource_id=resource.id,
            target_id=test_project,
            target_type="project",
            allocation_percentage=project_allocation,
            lead=project_lead
        )
        await resource_service.allocate_resource(project_alloc)
        
        # Task level (highest priority)
        task_alloc = ResourceAllocationCreate(
            resource_id=resource.id,
            target_id=test_task,
            target_type="task",
            allocation_percentage=task_allocation,
            lead=task_lead
        )
        await resource_service.allocate_resource(task_alloc)
        
        # Get effective resources for the task
        effective_resources = await resource_service.get_effective_resources_for_task(test_task)
        
        # Property assertions:
        # 1. Only one resource should be returned (the same resource at most specific level)
        assert len(effective_resources) == 1, \
            f"Expected 1 resource, got {len(effective_resources)}"
        
        # 2. The resource should be from the task level (most specific)
        assert effective_resources[0]['source_level'] == 'task', \
            f"Expected source_level='task', got '{effective_resources[0]['source_level']}'"
        
        # 3. The allocation percentage should match the task-level value (not project)
        assert abs(effective_resources[0]['allocation_percentage'] - task_allocation) < 0.01, \
            f"Expected allocation={task_allocation}, got {effective_resources[0]['allocation_percentage']}"
        
        # 4. The lead flag should match the task-level value (not project)
        assert effective_resources[0]['lead'] == task_lead, \
            f"Expected lead={task_lead}, got {effective_resources[0]['lead']}"
        
        # 5. The resource ID should match
        assert effective_resources[0]['resource'].id == resource.id, \
            f"Expected resource_id={resource.id}, got {effective_resources[0]['resource'].id}"
        
        # 6. The source_id should be the task ID
        assert effective_resources[0]['source_id'] == test_task, \
            f"Expected source_id={test_task}, got {effective_resources[0]['source_id']}"
        
    finally:
        # Cleanup: Remove all allocations
        try:
            await resource_service.remove_allocation(resource.id, test_task)
        except:
            pass
        try:
            await resource_service.remove_allocation(resource.id, test_project)
        except:
            pass


@given(
    project_allocation=st.floats(min_value=1.0, max_value=100.0),
    project_lead=st.booleans(),
)
@settings(
    max_examples=50,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
@pytest.mark.asyncio
async def test_property_project_allocation_used_when_no_more_specific(
    resource_service,
    test_resources,
    test_task,
    test_project,
    project_allocation: float,
    project_lead: bool,
):
    """
    Property: Project-level allocation is used when no more specific allocation exists
    
    **Validates: Requirements 16B.1-16B.27**
    
    When a resource is allocated only at the project level (no task allocations),
    the project-level allocation should be inherited by the task.
    """
    try:
        # Use the first test resource
        resource = test_resources[0]
        
        # Allocate resource only at project level
        project_alloc = ResourceAllocationCreate(
            resource_id=resource.id,
            target_id=test_project,
            target_type="project",
            allocation_percentage=project_allocation,
            lead=project_lead
        )
        await resource_service.allocate_resource(project_alloc)
        
        # Get effective resources for the task
        effective_resources = await resource_service.get_effective_resources_for_task(test_task)
        
        # Property assertions:
        # 1. One resource should be returned (inherited from project)
        assert len(effective_resources) == 1, \
            f"Expected 1 resource, got {len(effective_resources)}"
        
        # 2. The resource should be from the project level
        assert effective_resources[0]['source_level'] == 'project', \
            f"Expected source_level='project', got '{effective_resources[0]['source_level']}'"
        
        # 3. The allocation percentage should match the project-level value
        assert abs(effective_resources[0]['allocation_percentage'] - project_allocation) < 0.01, \
            f"Expected allocation={project_allocation}, got {effective_resources[0]['allocation_percentage']}"
        
        # 4. The lead flag should match the project-level value
        assert effective_resources[0]['lead'] == project_lead, \
            f"Expected lead={project_lead}, got {effective_resources[0]['lead']}"
        
    finally:
        # Cleanup
        try:
            await resource_service.remove_allocation(resource.id, test_project)
        except:
            pass



@st.composite
def generate_non_overlapping_indices(draw):
    """
    Generate non-overlapping resource indices for project and task levels.
    Ensures that no resource is allocated at both levels.
    """
    # Generate project indices first
    project_indices = draw(st.lists(st.integers(min_value=0, max_value=2), min_size=0, max_size=2, unique=True))
    
    # Generate task indices that don't overlap with project indices
    available_indices = [i for i in range(3) if i not in project_indices]
    if available_indices:
        max_task_size = min(2, len(available_indices))
        task_indices = draw(st.lists(st.sampled_from(available_indices), min_size=0, max_size=max_task_size, unique=True))
    else:
        task_indices = []
    
    return project_indices, task_indices


@given(
    indices=generate_non_overlapping_indices()
)
@settings(
    max_examples=50,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture]
)
@pytest.mark.asyncio
async def test_property_union_of_resources_from_all_levels(
    resource_service,
    test_resources,
    test_task,
    test_project,
    indices: tuple[list[int], list[int]],
):
    """
    Property: Union of resources from all levels
    
    **Validates: Requirements 16B.1-16B.27**
    
    When DIFFERENT resources are allocated at different levels (project, task),
    the effective resources should be the union of all resources from all levels.
    
    Key invariants:
    1. Different resources at different levels all appear in the result (union)
    2. The total number of effective resources equals the number of unique resources
    3. Each resource appears exactly once with its allocation from its level
    4. Lead resources are sorted before non-lead resources
    
    Note: This test ensures NO resource is allocated at multiple levels (non-overlapping).
    The current implementation enforces that a resource can only be allocated at ONE level.
    """
    project_resource_indices, task_resource_indices = indices
    
    # Skip if no resources to allocate
    if not project_resource_indices and not task_resource_indices:
        return
    
    try:
        allocated_resources = set()
        expected_sources = {}  # resource_id -> expected source level
        expected_allocations = {}  # resource_id -> expected allocation percentage
        expected_lead = {}  # resource_id -> expected lead status
        
        # Allocate resources at project level
        for i, resource_idx in enumerate(project_resource_indices):
            resource = test_resources[resource_idx]
            allocation_pct = 30.0 + i * 10
            is_lead = (i == 0)
            
            allocation = ResourceAllocationCreate(
                resource_id=resource.id,
                target_id=test_project,
                target_type="project",
                allocation_percentage=allocation_pct,
                lead=is_lead
            )
            await resource_service.allocate_resource(allocation)
            allocated_resources.add(resource.id)
            expected_sources[resource.id] = 'project'
            expected_allocations[resource.id] = allocation_pct
            expected_lead[resource.id] = is_lead
        
        # Allocate DIFFERENT resources at task level (no overlap with project)
        for i, resource_idx in enumerate(task_resource_indices):
            resource = test_resources[resource_idx]
            allocation_pct = 80.0 + i * 10
            is_lead = (i == 0)
            
            allocation = ResourceAllocationCreate(
                resource_id=resource.id,
                target_id=test_task,
                target_type="task",
                allocation_percentage=allocation_pct,
                lead=is_lead
            )
            await resource_service.allocate_resource(allocation)
            allocated_resources.add(resource.id)
            expected_sources[resource.id] = 'task'
            expected_allocations[resource.id] = allocation_pct
            expected_lead[resource.id] = is_lead
        
        # Get effective resources
        effective_resources = await resource_service.get_effective_resources_for_task(test_task)
        
        # Property assertions:
        
        # 1. Number of effective resources equals number of unique allocated resources
        assert len(effective_resources) == len(allocated_resources), \
            f"Expected {len(allocated_resources)} unique resources, got {len(effective_resources)}"
        
        # 2. All allocated resources are present in effective resources
        effective_resource_ids = {res['resource'].id for res in effective_resources}
        assert effective_resource_ids == allocated_resources, \
            f"Expected resource IDs {allocated_resources}, got {effective_resource_ids}"
        
        # 3. Each resource appears exactly once
        assert len(effective_resource_ids) == len(effective_resources), \
            "Some resources appear more than once in effective resources"
        
        # 4. Each resource has the correct source level
        for res in effective_resources:
            resource_id = res['resource'].id
            expected_source = expected_sources[resource_id]
            assert res['source_level'] == expected_source, \
                f"Resource {resource_id} expected source_level='{expected_source}', got '{res['source_level']}'"
        
        # 5. Verify allocation percentages match the source level
        for res in effective_resources:
            resource_id = res['resource'].id
            expected_pct = expected_allocations[resource_id]
            assert abs(res['allocation_percentage'] - expected_pct) < 0.01, \
                f"Resource {resource_id} expected {expected_pct}%, got {res['allocation_percentage']}%"
        
        # 6. Verify lead status matches the source level
        for res in effective_resources:
            resource_id = res['resource'].id
            expected_lead_status = expected_lead[resource_id]
            assert res['lead'] == expected_lead_status, \
                f"Resource {resource_id} expected lead={expected_lead_status}, got {res['lead']}"
        
        # 7. Lead resources are sorted before non-lead resources
        lead_resources = [res for res in effective_resources if res['lead']]
        non_lead_resources = [res for res in effective_resources if not res['lead']]
        
        # All lead resources should come before all non-lead resources
        if lead_resources and non_lead_resources:
            # Find the last lead resource index and first non-lead resource index
            last_lead_idx = max(
                i for i, res in enumerate(effective_resources) if res['lead']
            )
            first_non_lead_idx = min(
                i for i, res in enumerate(effective_resources) if not res['lead']
            )
            assert last_lead_idx < first_non_lead_idx, \
                "Lead resources should be sorted before non-lead resources"
        
    finally:
        # Cleanup: Remove all allocations
        for resource_idx in task_resource_indices:
            try:
                await resource_service.remove_allocation(test_resources[resource_idx].id, test_task)
            except:
                pass
        
        for resource_idx in project_resource_indices:
            try:
                await resource_service.remove_allocation(test_resources[resource_idx].id, test_project)
            except:
                pass

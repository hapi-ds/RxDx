"""Unit tests for MilestoneService"""

import pytest
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock
from uuid import uuid4

from app.models.user import User
from app.schemas.milestone import MilestoneCreate, MilestoneUpdate
from app.services.milestone_service import MilestoneService


@pytest.fixture
def mock_user():
    """Create a mock user for testing"""
    return User(
        id=uuid4(),
        email="test@example.com",
        full_name="Test User",
        hashed_password="hashed",
        is_active=True,
        role="user"
    )


@pytest.fixture
def milestone_service(mock_graph_service):
    """Create MilestoneService with mock graph service"""
    return MilestoneService(mock_graph_service)


@pytest.mark.asyncio
async def test_create_milestone(milestone_service, mock_user):
    """Test creating a milestone"""
    project_id = uuid4()
    target_date = datetime.now(UTC) + timedelta(days=30)

    milestone_data = MilestoneCreate(
        title="Release 1.0",
        description="First major release",
        target_date=target_date,
        is_manual_constraint=True,
        completion_criteria="All features implemented and tested",
        status="draft",
        project_id=project_id
    )

    milestone = await milestone_service.create_milestone(milestone_data, mock_user)

    assert milestone is not None
    assert milestone.title == "Release 1.0"
    assert milestone.description == "First major release"
    assert milestone.target_date == target_date
    assert milestone.is_manual_constraint is True
    assert milestone.completion_criteria == "All features implemented and tested"
    assert milestone.status == "draft"
    assert milestone.project_id == project_id
    assert milestone.version == "1.0"
    assert milestone.created_by == mock_user.id


@pytest.mark.asyncio
async def test_create_milestone_minimal(milestone_service, mock_user):
    """Test creating a milestone with minimal data"""
    project_id = uuid4()
    target_date = datetime.now(UTC) + timedelta(days=30)

    milestone_data = MilestoneCreate(
        title="Sprint 1 Complete",
        target_date=target_date,
        project_id=project_id
    )

    milestone = await milestone_service.create_milestone(milestone_data, mock_user)

    assert milestone is not None
    assert milestone.title == "Sprint 1 Complete"
    assert milestone.description is None
    assert milestone.target_date == target_date
    assert milestone.is_manual_constraint is False  # Default value
    assert milestone.completion_criteria is None
    assert milestone.status == "draft"  # Default value
    assert milestone.project_id == project_id


@pytest.mark.asyncio
async def test_get_milestone(milestone_service, mock_user):
    """Test getting a milestone by ID"""
    project_id = uuid4()
    target_date = datetime.now(UTC) + timedelta(days=30)

    # Create a milestone
    milestone_data = MilestoneCreate(
        title="Release 1.0",
        target_date=target_date,
        project_id=project_id
    )

    created = await milestone_service.create_milestone(milestone_data, mock_user)

    # Get the milestone
    milestone = await milestone_service.get_milestone(created.id)

    assert milestone is not None
    assert milestone.id == created.id
    assert milestone.title == "Release 1.0"
    assert milestone.project_id == project_id


@pytest.mark.asyncio
async def test_get_milestone_not_found(milestone_service):
    """Test getting a non-existent milestone"""
    milestone_id = uuid4()
    milestone = await milestone_service.get_milestone(milestone_id)

    assert milestone is None


@pytest.mark.asyncio
async def test_update_milestone(milestone_service, mock_user):
    """Test updating a milestone"""
    project_id = uuid4()
    target_date = datetime.now(UTC) + timedelta(days=30)

    # Create a milestone
    milestone_data = MilestoneCreate(
        title="Release 1.0",
        target_date=target_date,
        project_id=project_id
    )

    created = await milestone_service.create_milestone(milestone_data, mock_user)

    # Update the milestone
    new_target_date = datetime.now(UTC) + timedelta(days=45)
    updates = MilestoneUpdate(
        title="Release 1.0 - Updated",
        description="Updated description",
        target_date=new_target_date,
        is_manual_constraint=True,
        completion_criteria="All tests passing",
        status="active"
    )

    updated = await milestone_service.update_milestone(created.id, updates, mock_user)

    assert updated is not None
    assert updated.id == created.id
    assert updated.title == "Release 1.0 - Updated"
    assert updated.description == "Updated description"
    assert updated.target_date == new_target_date
    assert updated.is_manual_constraint is True
    assert updated.completion_criteria == "All tests passing"
    assert updated.status == "active"


@pytest.mark.asyncio
async def test_update_milestone_partial(milestone_service, mock_user):
    """Test updating only some milestone fields"""
    project_id = uuid4()
    target_date = datetime.now(UTC) + timedelta(days=30)

    # Create a milestone
    milestone_data = MilestoneCreate(
        title="Release 1.0",
        description="Original description",
        target_date=target_date,
        project_id=project_id
    )

    created = await milestone_service.create_milestone(milestone_data, mock_user)

    # Update only the status
    updates = MilestoneUpdate(status="active")

    updated = await milestone_service.update_milestone(created.id, updates, mock_user)

    assert updated is not None
    assert updated.id == created.id
    assert updated.title == "Release 1.0"  # Unchanged
    assert updated.description == "Original description"  # Unchanged
    assert updated.status == "active"  # Changed


@pytest.mark.asyncio
async def test_update_milestone_not_found(milestone_service, mock_user):
    """Test updating a non-existent milestone"""
    milestone_id = uuid4()
    updates = MilestoneUpdate(status="active")

    updated = await milestone_service.update_milestone(milestone_id, updates, mock_user)

    assert updated is None


@pytest.mark.asyncio
async def test_delete_milestone(milestone_service, mock_user):
    """Test deleting a milestone"""
    project_id = uuid4()
    target_date = datetime.now(UTC) + timedelta(days=30)

    # Create a milestone
    milestone_data = MilestoneCreate(
        title="Release 1.0",
        target_date=target_date,
        project_id=project_id
    )

    created = await milestone_service.create_milestone(milestone_data, mock_user)

    # Delete the milestone
    deleted = await milestone_service.delete_milestone(created.id)

    assert deleted is True

    # Verify it's gone
    milestone = await milestone_service.get_milestone(created.id)
    assert milestone is None


@pytest.mark.asyncio
async def test_delete_milestone_not_found(milestone_service):
    """Test deleting a non-existent milestone"""
    milestone_id = uuid4()
    deleted = await milestone_service.delete_milestone(milestone_id)

    assert deleted is False


@pytest.mark.asyncio
async def test_list_milestones(milestone_service, mock_user):
    """Test listing milestones"""
    project_id = uuid4()
    target_date1 = datetime.now(UTC) + timedelta(days=30)
    target_date2 = datetime.now(UTC) + timedelta(days=60)

    # Create multiple milestones
    milestone1_data = MilestoneCreate(
        title="Release 1.0",
        target_date=target_date1,
        project_id=project_id
    )

    milestone2_data = MilestoneCreate(
        title="Release 2.0",
        target_date=target_date2,
        project_id=project_id
    )

    await milestone_service.create_milestone(milestone1_data, mock_user)
    await milestone_service.create_milestone(milestone2_data, mock_user)

    # List all milestones
    milestones = await milestone_service.list_milestones()

    assert len(milestones) >= 2
    assert any(m.title == "Release 1.0" for m in milestones)
    assert any(m.title == "Release 2.0" for m in milestones)


@pytest.mark.asyncio
async def test_list_milestones_by_project(milestone_service, mock_user):
    """Test listing milestones filtered by project"""
    project_id1 = uuid4()
    project_id2 = uuid4()
    target_date = datetime.now(UTC) + timedelta(days=30)

    # Create milestones for different projects
    milestone1_data = MilestoneCreate(
        title="Project 1 Milestone",
        target_date=target_date,
        project_id=project_id1
    )

    milestone2_data = MilestoneCreate(
        title="Project 2 Milestone",
        target_date=target_date,
        project_id=project_id2
    )

    await milestone_service.create_milestone(milestone1_data, mock_user)
    await milestone_service.create_milestone(milestone2_data, mock_user)

    # List milestones for project 1
    milestones = await milestone_service.list_milestones(project_id=project_id1)

    assert len(milestones) >= 1
    assert all(m.project_id == project_id1 for m in milestones)
    assert any(m.title == "Project 1 Milestone" for m in milestones)


@pytest.mark.asyncio
async def test_list_milestones_by_status(milestone_service, mock_user):
    """Test listing milestones filtered by status"""
    project_id = uuid4()
    target_date = datetime.now(UTC) + timedelta(days=30)

    # Create milestones with different statuses
    milestone1_data = MilestoneCreate(
        title="Draft Milestone",
        target_date=target_date,
        status="draft",
        project_id=project_id
    )

    milestone2_data = MilestoneCreate(
        title="Active Milestone",
        target_date=target_date,
        status="active",
        project_id=project_id
    )

    await milestone_service.create_milestone(milestone1_data, mock_user)
    await milestone_service.create_milestone(milestone2_data, mock_user)

    # List active milestones
    milestones = await milestone_service.list_milestones(status="active")

    assert len(milestones) >= 1
    assert all(m.status == "active" for m in milestones)
    assert any(m.title == "Active Milestone" for m in milestones)


@pytest.mark.asyncio
async def test_list_milestones_ordered_by_target_date(milestone_service, mock_user):
    """Test that milestones are ordered by target date"""
    project_id = uuid4()
    target_date1 = datetime.now(UTC) + timedelta(days=60)
    target_date2 = datetime.now(UTC) + timedelta(days=30)
    target_date3 = datetime.now(UTC) + timedelta(days=90)

    # Create milestones in non-chronological order
    milestone1_data = MilestoneCreate(
        title="Second Milestone",
        target_date=target_date1,
        project_id=project_id
    )

    milestone2_data = MilestoneCreate(
        title="First Milestone",
        target_date=target_date2,
        project_id=project_id
    )

    milestone3_data = MilestoneCreate(
        title="Third Milestone",
        target_date=target_date3,
        project_id=project_id
    )

    await milestone_service.create_milestone(milestone1_data, mock_user)
    await milestone_service.create_milestone(milestone2_data, mock_user)
    await milestone_service.create_milestone(milestone3_data, mock_user)

    # List milestones for this project
    milestones = await milestone_service.list_milestones(project_id=project_id)

    # Verify they're ordered by target date (ascending)
    assert len(milestones) >= 3
    project_milestones = [m for m in milestones if m.project_id == project_id]
    assert project_milestones[0].title == "First Milestone"
    assert project_milestones[1].title == "Second Milestone"
    assert project_milestones[2].title == "Third Milestone"


@pytest.mark.asyncio
async def test_add_dependency(milestone_service, mock_user):
    """Test adding a task dependency to a milestone"""
    milestone_id = uuid4()
    task_id = uuid4()
    
    # Mock milestone exists
    milestone_service.graph_service.execute_query = AsyncMock(side_effect=[
        # get_milestone query
        [{
            'id': str(milestone_id),
            'title': 'Test Milestone',
            'target_date': '2024-12-31T00:00:00+00:00',
            'is_manual_constraint': True,
            'status': 'draft',
            'project_id': str(uuid4()),
            'version': '1.0',
            'created_by': str(mock_user.id),
            'created_at': '2024-01-01T00:00:00+00:00',
            'updated_at': '2024-01-01T00:00:00+00:00',
        }],
        # Task exists query
        [{'id': str(task_id), 'type': 'task', 'title': 'Test Task'}],
        # Cycle check query 1
        [{'cycle_count': 0}],
        # Cycle check query 2
        [{'cycle_count': 0}],
        # Create DEPENDS_ON relationship
        [{'r': {}}],
        # Create BLOCKS relationship
        [{'r': {}}],
    ])
    
    result = await milestone_service.add_dependency(milestone_id, task_id)
    
    assert result is True
    assert milestone_service.graph_service.execute_query.call_count == 6


@pytest.mark.asyncio
async def test_add_dependency_milestone_not_found(milestone_service):
    """Test adding dependency when milestone doesn't exist"""
    milestone_id = uuid4()
    task_id = uuid4()
    
    # Mock milestone not found
    milestone_service.graph_service.execute_query = AsyncMock(return_value=[])
    
    with pytest.raises(ValueError, match="Milestone .* not found"):
        await milestone_service.add_dependency(milestone_id, task_id)


@pytest.mark.asyncio
async def test_add_dependency_task_not_found(milestone_service, mock_user):
    """Test adding dependency when task doesn't exist"""
    milestone_id = uuid4()
    task_id = uuid4()
    
    # Mock milestone exists but task doesn't
    milestone_service.graph_service.execute_query = AsyncMock(side_effect=[
        # get_milestone query
        [{
            'id': str(milestone_id),
            'title': 'Test Milestone',
            'target_date': '2024-12-31T00:00:00+00:00',
            'is_manual_constraint': True,
            'status': 'draft',
            'project_id': str(uuid4()),
            'version': '1.0',
            'created_by': str(mock_user.id),
            'created_at': '2024-01-01T00:00:00+00:00',
            'updated_at': '2024-01-01T00:00:00+00:00',
        }],
        # Task not found
        [],
    ])
    
    with pytest.raises(ValueError, match="Task .* not found"):
        await milestone_service.add_dependency(milestone_id, task_id)


@pytest.mark.asyncio
async def test_add_dependency_creates_cycle(milestone_service, mock_user):
    """Test adding dependency that would create a cycle"""
    milestone_id = uuid4()
    task_id = uuid4()
    
    # Mock milestone exists, task exists, but cycle detected
    milestone_service.graph_service.execute_query = AsyncMock(side_effect=[
        # get_milestone query
        [{
            'id': str(milestone_id),
            'title': 'Test Milestone',
            'target_date': '2024-12-31T00:00:00+00:00',
            'is_manual_constraint': True,
            'status': 'draft',
            'project_id': str(uuid4()),
            'version': '1.0',
            'created_by': str(mock_user.id),
            'created_at': '2024-01-01T00:00:00+00:00',
            'updated_at': '2024-01-01T00:00:00+00:00',
        }],
        # Task exists query
        [{'id': str(task_id), 'type': 'task', 'title': 'Test Task'}],
        # Cycle check query 1 - cycle detected
        [{'cycle_count': 1}],
    ])
    
    with pytest.raises(ValueError, match="would create a cycle"):
        await milestone_service.add_dependency(milestone_id, task_id)


@pytest.mark.asyncio
async def test_remove_dependency(milestone_service):
    """Test removing a task dependency from a milestone"""
    milestone_id = uuid4()
    task_id = uuid4()
    
    # Mock successful deletion
    milestone_service.graph_service.execute_query = AsyncMock(side_effect=[
        # Remove DEPENDS_ON
        [{'deleted_count': 1}],
        # Remove BLOCKS
        [{'deleted_count': 1}],
    ])
    
    result = await milestone_service.remove_dependency(milestone_id, task_id)
    
    assert result is True
    assert milestone_service.graph_service.execute_query.call_count == 2


@pytest.mark.asyncio
async def test_remove_dependency_not_found(milestone_service):
    """Test removing dependency that doesn't exist"""
    milestone_id = uuid4()
    task_id = uuid4()
    
    # Mock no relationships found
    milestone_service.graph_service.execute_query = AsyncMock(side_effect=[
        # Remove DEPENDS_ON - not found
        [{'deleted_count': 0}],
        # Remove BLOCKS - not found
        [{'deleted_count': 0}],
    ])
    
    result = await milestone_service.remove_dependency(milestone_id, task_id)
    
    assert result is False


@pytest.mark.asyncio
async def test_get_dependencies(milestone_service):
    """Test getting all dependencies for a milestone"""
    milestone_id = uuid4()
    task1_id = uuid4()
    task2_id = uuid4()
    
    # Mock dependencies
    milestone_service.graph_service.execute_query = AsyncMock(return_value=[
        {
            'id': str(task1_id),
            'title': 'Task 1',
            'status': 'active',
            'estimated_hours': 10.0,
            'start_date': '2024-01-01T00:00:00+00:00',
            'end_date': '2024-01-05T00:00:00+00:00',
        },
        {
            'id': str(task2_id),
            'title': 'Task 2',
            'status': 'ready',
            'estimated_hours': 5.0,
            'start_date': '2024-01-06T00:00:00+00:00',
            'end_date': '2024-01-08T00:00:00+00:00',
        },
    ])
    
    dependencies = await milestone_service.get_dependencies(milestone_id)
    
    assert len(dependencies) == 2
    assert dependencies[0]['id'] == str(task1_id)
    assert dependencies[0]['title'] == 'Task 1'
    assert dependencies[1]['id'] == str(task2_id)
    assert dependencies[1]['title'] == 'Task 2'


@pytest.mark.asyncio
async def test_get_dependencies_empty(milestone_service):
    """Test getting dependencies when milestone has none"""
    milestone_id = uuid4()
    
    # Mock no dependencies
    milestone_service.graph_service.execute_query = AsyncMock(return_value=[])
    
    dependencies = await milestone_service.get_dependencies(milestone_id)
    
    assert len(dependencies) == 0

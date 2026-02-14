"""Unit tests for PhaseService"""

import pytest
from datetime import datetime
from uuid import uuid4

from app.services.phase_service import PhaseService
from app.schemas.phase import PhaseCreate, PhaseUpdate
from app.db.graph import GraphService


@pytest.fixture
async def mock_graph_service():
    """Create a mock graph service for testing"""
    graph_service = GraphService()
    await graph_service.connect()
    yield graph_service
    await graph_service.close()


@pytest.fixture
async def phase_service(mock_graph_service):
    """Create a PhaseService instance for testing"""
    return PhaseService(mock_graph_service)


@pytest.fixture
async def test_project(mock_graph_service):
    """Create a test project"""
    project_id = uuid4()
    await mock_graph_service.create_node(
        "Project",
        {
            "id": str(project_id),
            "name": "Test Project",
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
        },
    )
    return project_id


@pytest.mark.asyncio
async def test_create_phase(phase_service, test_project):
    """Test creating a phase"""
    phase_data = PhaseCreate(
        name="Planning Phase",
        description="Initial planning phase",
        order=1,
        minimal_duration=14,
        project_id=test_project,
    )

    result = await phase_service.create_phase(phase_data)

    assert result.name == "Planning Phase"
    assert result.description == "Initial planning phase"
    assert result.order == 1
    assert result.minimal_duration == 14
    assert result.project_id == test_project
    assert result.id is not None


@pytest.mark.asyncio
async def test_create_phase_with_dates(phase_service, test_project):
    """Test creating a phase with start and due dates"""
    start_date = datetime(2024, 1, 1)
    due_date = datetime(2024, 1, 31)

    phase_data = PhaseCreate(
        name="Development Phase",
        order=2,
        start_date=start_date,
        due_date=due_date,
        project_id=test_project,
    )

    result = await phase_service.create_phase(phase_data)

    assert result.start_date == start_date
    assert result.due_date == due_date


@pytest.mark.asyncio
async def test_create_phase_invalid_project(phase_service):
    """Test creating a phase with non-existent project fails"""
    phase_data = PhaseCreate(
        name="Invalid Phase",
        order=1,
        project_id=uuid4(),  # Non-existent project
    )

    with pytest.raises(ValueError, match="Project .* not found"):
        await phase_service.create_phase(phase_data)


@pytest.mark.asyncio
async def test_get_phase(phase_service, test_project):
    """Test retrieving a phase"""
    # Create a phase
    phase_data = PhaseCreate(
        name="Test Phase",
        order=1,
        project_id=test_project,
    )
    created = await phase_service.create_phase(phase_data)

    # Retrieve it
    result = await phase_service.get_phase(created.id)

    assert result is not None
    assert result.id == created.id
    assert result.name == "Test Phase"


@pytest.mark.asyncio
async def test_get_phase_not_found(phase_service):
    """Test retrieving a non-existent phase returns None"""
    result = await phase_service.get_phase(uuid4())
    assert result is None


@pytest.mark.asyncio
async def test_update_phase(phase_service, test_project):
    """Test updating a phase"""
    # Create a phase
    phase_data = PhaseCreate(
        name="Original Name",
        order=1,
        project_id=test_project,
    )
    created = await phase_service.create_phase(phase_data)

    # Update it
    updates = PhaseUpdate(
        name="Updated Name",
        description="New description",
        minimal_duration=21,
    )
    result = await phase_service.update_phase(created.id, updates)

    assert result is not None
    assert result.name == "Updated Name"
    assert result.description == "New description"
    assert result.minimal_duration == 21


@pytest.mark.asyncio
async def test_delete_phase(phase_service, test_project):
    """Test deleting a phase"""
    # Create a phase
    phase_data = PhaseCreate(
        name="To Delete",
        order=1,
        project_id=test_project,
    )
    created = await phase_service.create_phase(phase_data)

    # Delete it
    result = await phase_service.delete_phase(created.id)
    assert result is True

    # Verify it's gone
    retrieved = await phase_service.get_phase(created.id)
    assert retrieved is None


@pytest.mark.asyncio
async def test_delete_phase_not_found(phase_service):
    """Test deleting a non-existent phase returns False"""
    result = await phase_service.delete_phase(uuid4())
    assert result is False


@pytest.mark.asyncio
async def test_create_next_relationship(phase_service, test_project):
    """Test creating a NEXT relationship between phases"""
    # Create two phases
    phase1_data = PhaseCreate(name="Phase 1", order=1, project_id=test_project)
    phase2_data = PhaseCreate(name="Phase 2", order=2, project_id=test_project)

    phase1 = await phase_service.create_phase(phase1_data)
    phase2 = await phase_service.create_phase(phase2_data)

    # Create NEXT relationship
    result = await phase_service.create_next_relationship(phase1.id, phase2.id)
    assert result is True

    # Verify the relationship
    next_phase = await phase_service.get_next_phase(phase1.id)
    assert next_phase is not None
    assert next_phase.id == phase2.id


@pytest.mark.asyncio
async def test_create_next_relationship_prevents_branching(phase_service, test_project):
    """Test that NEXT relationships prevent branching"""
    # Create three phases
    phase1 = await phase_service.create_phase(
        PhaseCreate(name="Phase 1", order=1, project_id=test_project)
    )
    phase2 = await phase_service.create_phase(
        PhaseCreate(name="Phase 2", order=2, project_id=test_project)
    )
    phase3 = await phase_service.create_phase(
        PhaseCreate(name="Phase 3", order=3, project_id=test_project)
    )

    # Create first NEXT relationship
    await phase_service.create_next_relationship(phase1.id, phase2.id)

    # Try to create a second NEXT from phase1 (should fail - no branching)
    with pytest.raises(ValueError, match="already has a NEXT relationship"):
        await phase_service.create_next_relationship(phase1.id, phase3.id)


@pytest.mark.asyncio
async def test_create_next_relationship_prevents_multiple_incoming(
    phase_service, test_project
):
    """Test that NEXT relationships prevent multiple incoming edges"""
    # Create three phases
    phase1 = await phase_service.create_phase(
        PhaseCreate(name="Phase 1", order=1, project_id=test_project)
    )
    phase2 = await phase_service.create_phase(
        PhaseCreate(name="Phase 2", order=2, project_id=test_project)
    )
    phase3 = await phase_service.create_phase(
        PhaseCreate(name="Phase 3", order=3, project_id=test_project)
    )

    # Create first NEXT relationship
    await phase_service.create_next_relationship(phase1.id, phase3.id)

    # Try to create a second NEXT to phase3 (should fail - no multiple incoming)
    with pytest.raises(ValueError, match="already has an incoming NEXT relationship"):
        await phase_service.create_next_relationship(phase2.id, phase3.id)


@pytest.mark.asyncio
async def test_create_next_relationship_prevents_cycles(phase_service, test_project):
    """Test that NEXT relationships prevent cycles"""
    # Create three phases
    phase1 = await phase_service.create_phase(
        PhaseCreate(name="Phase 1", order=1, project_id=test_project)
    )
    phase2 = await phase_service.create_phase(
        PhaseCreate(name="Phase 2", order=2, project_id=test_project)
    )
    phase3 = await phase_service.create_phase(
        PhaseCreate(name="Phase 3", order=3, project_id=test_project)
    )

    # Create a chain: phase1 -> phase2 -> phase3
    await phase_service.create_next_relationship(phase1.id, phase2.id)
    await phase_service.create_next_relationship(phase2.id, phase3.id)

    # Try to create a cycle: phase3 -> phase1 (should fail)
    with pytest.raises(ValueError, match="would create a cycle"):
        await phase_service.create_next_relationship(phase3.id, phase1.id)


@pytest.mark.asyncio
async def test_create_next_relationship_different_projects(phase_service):
    """Test that NEXT relationships require phases in same project"""
    # Create two projects
    project1_id = uuid4()
    project2_id = uuid4()

    await phase_service.graph_service.create_node(
        "Project",
        {
            "id": str(project1_id),
            "name": "Project 1",
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
        },
    )
    await phase_service.graph_service.create_node(
        "Project",
        {
            "id": str(project2_id),
            "name": "Project 2",
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
        },
    )

    # Create phases in different projects
    phase1 = await phase_service.create_phase(
        PhaseCreate(name="Phase 1", order=1, project_id=project1_id)
    )
    phase2 = await phase_service.create_phase(
        PhaseCreate(name="Phase 2", order=1, project_id=project2_id)
    )

    # Try to create NEXT relationship (should fail)
    with pytest.raises(ValueError, match="must be in the same project"):
        await phase_service.create_next_relationship(phase1.id, phase2.id)


@pytest.mark.asyncio
async def test_remove_next_relationship(phase_service, test_project):
    """Test removing a NEXT relationship"""
    # Create two phases with NEXT relationship
    phase1 = await phase_service.create_phase(
        PhaseCreate(name="Phase 1", order=1, project_id=test_project)
    )
    phase2 = await phase_service.create_phase(
        PhaseCreate(name="Phase 2", order=2, project_id=test_project)
    )
    await phase_service.create_next_relationship(phase1.id, phase2.id)

    # Remove the relationship
    result = await phase_service.remove_next_relationship(phase1.id)
    assert result is True

    # Verify it's gone
    next_phase = await phase_service.get_next_phase(phase1.id)
    assert next_phase is None


@pytest.mark.asyncio
async def test_remove_next_relationship_not_exists(phase_service, test_project):
    """Test removing a non-existent NEXT relationship returns False"""
    phase = await phase_service.create_phase(
        PhaseCreate(name="Phase 1", order=1, project_id=test_project)
    )

    result = await phase_service.remove_next_relationship(phase.id)
    assert result is False


@pytest.mark.asyncio
async def test_get_next_phase(phase_service, test_project):
    """Test getting the next phase"""
    # Create two phases with NEXT relationship
    phase1 = await phase_service.create_phase(
        PhaseCreate(name="Phase 1", order=1, project_id=test_project)
    )
    phase2 = await phase_service.create_phase(
        PhaseCreate(name="Phase 2", order=2, project_id=test_project)
    )
    await phase_service.create_next_relationship(phase1.id, phase2.id)

    # Get next phase
    next_phase = await phase_service.get_next_phase(phase1.id)
    assert next_phase is not None
    assert next_phase.id == phase2.id


@pytest.mark.asyncio
async def test_get_next_phase_none(phase_service, test_project):
    """Test getting next phase when none exists"""
    phase = await phase_service.create_phase(
        PhaseCreate(name="Phase 1", order=1, project_id=test_project)
    )

    next_phase = await phase_service.get_next_phase(phase.id)
    assert next_phase is None


@pytest.mark.asyncio
async def test_get_previous_phase(phase_service, test_project):
    """Test getting the previous phase"""
    # Create two phases with NEXT relationship
    phase1 = await phase_service.create_phase(
        PhaseCreate(name="Phase 1", order=1, project_id=test_project)
    )
    phase2 = await phase_service.create_phase(
        PhaseCreate(name="Phase 2", order=2, project_id=test_project)
    )
    await phase_service.create_next_relationship(phase1.id, phase2.id)

    # Get previous phase
    prev_phase = await phase_service.get_previous_phase(phase2.id)
    assert prev_phase is not None
    assert prev_phase.id == phase1.id


@pytest.mark.asyncio
async def test_get_previous_phase_none(phase_service, test_project):
    """Test getting previous phase when none exists"""
    phase = await phase_service.create_phase(
        PhaseCreate(name="Phase 1", order=1, project_id=test_project)
    )

    prev_phase = await phase_service.get_previous_phase(phase.id)
    assert prev_phase is None


@pytest.mark.asyncio
async def test_list_phases_by_project_ordered_by_next(phase_service, test_project):
    """Test listing phases ordered by NEXT relationships"""
    # Create three phases
    phase1 = await phase_service.create_phase(
        PhaseCreate(name="Phase 1", order=1, project_id=test_project)
    )
    phase2 = await phase_service.create_phase(
        PhaseCreate(name="Phase 2", order=2, project_id=test_project)
    )
    phase3 = await phase_service.create_phase(
        PhaseCreate(name="Phase 3", order=3, project_id=test_project)
    )

    # Create NEXT relationships: phase1 -> phase2 -> phase3
    await phase_service.create_next_relationship(phase1.id, phase2.id)
    await phase_service.create_next_relationship(phase2.id, phase3.id)

    # List phases
    phases = await phase_service.list_phases_by_project(test_project)

    assert len(phases) == 3
    assert phases[0].id == phase1.id
    assert phases[1].id == phase2.id
    assert phases[2].id == phase3.id


@pytest.mark.asyncio
async def test_list_phases_by_project_fallback_to_order(phase_service, test_project):
    """Test listing phases falls back to order property when no NEXT relationships"""
    # Create three phases without NEXT relationships
    phase1 = await phase_service.create_phase(
        PhaseCreate(name="Phase 1", order=3, project_id=test_project)
    )
    phase2 = await phase_service.create_phase(
        PhaseCreate(name="Phase 2", order=1, project_id=test_project)
    )
    phase3 = await phase_service.create_phase(
        PhaseCreate(name="Phase 3", order=2, project_id=test_project)
    )

    # List phases (should be ordered by order property)
    phases = await phase_service.list_phases_by_project(test_project)

    assert len(phases) == 3
    assert phases[0].id == phase2.id  # order=1
    assert phases[1].id == phase3.id  # order=2
    assert phases[2].id == phase1.id  # order=3


@pytest.mark.asyncio
async def test_delete_phase_maintains_sequence_continuity(phase_service, test_project):
    """Test that deleting a phase maintains sequence continuity"""
    # Create three phases with NEXT relationships
    phase1 = await phase_service.create_phase(
        PhaseCreate(name="Phase 1", order=1, project_id=test_project)
    )
    phase2 = await phase_service.create_phase(
        PhaseCreate(name="Phase 2", order=2, project_id=test_project)
    )
    phase3 = await phase_service.create_phase(
        PhaseCreate(name="Phase 3", order=3, project_id=test_project)
    )

    # Create chain: phase1 -> phase2 -> phase3
    await phase_service.create_next_relationship(phase1.id, phase2.id)
    await phase_service.create_next_relationship(phase2.id, phase3.id)

    # Delete middle phase
    await phase_service.delete_phase(phase2.id)

    # Verify phase1 now points to phase3
    next_phase = await phase_service.get_next_phase(phase1.id)
    assert next_phase is not None
    assert next_phase.id == phase3.id

    # Verify phase3's previous is phase1
    prev_phase = await phase_service.get_previous_phase(phase3.id)
    assert prev_phase is not None
    assert prev_phase.id == phase1.id

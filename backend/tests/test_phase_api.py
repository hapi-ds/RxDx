"""Integration tests for Phase API endpoints"""

import pytest
from datetime import datetime
from uuid import uuid4
from httpx import AsyncClient

from app.main import app
from app.db.graph import GraphService


@pytest.fixture
async def graph_service():
    """Create a graph service for testing"""
    service = GraphService()
    await service.connect()
    yield service
    await service.close()


@pytest.fixture
async def test_project(graph_service):
    """Create a test project"""
    project_id = uuid4()
    await graph_service.create_node(
        "Project",
        {
            "id": str(project_id),
            "name": "Test Project",
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
        },
    )
    return project_id


@pytest.fixture
async def test_phases(graph_service, test_project):
    """Create test phases"""
    phase_ids = []
    for i in range(3):
        phase_id = uuid4()
        await graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": f"Phase {i+1}",
                "order": i + 1,
                "project_id": str(test_project),
                "created_at": datetime.utcnow().isoformat(),
            },
        )
        phase_ids.append(phase_id)
    return phase_ids


@pytest.mark.asyncio
async def test_create_next_relationship(test_phases):
    """Test creating a NEXT relationship between phases"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        phase1_id, phase2_id, _ = test_phases
        
        response = await client.post(
            f"/api/v1/phases/{phase1_id}/next/{phase2_id}",
            headers={"Authorization": "Bearer test_token"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(phase1_id)


@pytest.mark.asyncio
async def test_create_next_relationship_cycle_detection(test_phases):
    """Test that creating a cycle is prevented"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        phase1_id, phase2_id, phase3_id = test_phases
        
        # Create chain: phase1 -> phase2 -> phase3
        await client.post(
            f"/api/v1/phases/{phase1_id}/next/{phase2_id}",
            headers={"Authorization": "Bearer test_token"},
        )
        await client.post(
            f"/api/v1/phases/{phase2_id}/next/{phase3_id}",
            headers={"Authorization": "Bearer test_token"},
        )
        
        # Try to create cycle: phase3 -> phase1
        response = await client.post(
            f"/api/v1/phases/{phase3_id}/next/{phase1_id}",
            headers={"Authorization": "Bearer test_token"},
        )
        
        assert response.status_code == 400
        assert "cycle" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_remove_next_relationship(test_phases):
    """Test removing a NEXT relationship"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        phase1_id, phase2_id, _ = test_phases
        
        # Create relationship
        await client.post(
            f"/api/v1/phases/{phase1_id}/next/{phase2_id}",
            headers={"Authorization": "Bearer test_token"},
        )
        
        # Remove relationship
        response = await client.delete(
            f"/api/v1/phases/{phase1_id}/next",
            headers={"Authorization": "Bearer test_token"},
        )
        
        assert response.status_code == 204


@pytest.mark.asyncio
async def test_get_next_phase(test_phases):
    """Test getting the next phase in sequence"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        phase1_id, phase2_id, _ = test_phases
        
        # Create relationship
        await client.post(
            f"/api/v1/phases/{phase1_id}/next/{phase2_id}",
            headers={"Authorization": "Bearer test_token"},
        )
        
        # Get next phase
        response = await client.get(
            f"/api/v1/phases/{phase1_id}/next",
            headers={"Authorization": "Bearer test_token"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(phase2_id)


@pytest.mark.asyncio
async def test_get_next_phase_not_found(test_phases):
    """Test getting next phase when none exists"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        phase1_id, _, _ = test_phases
        
        response = await client.get(
            f"/api/v1/phases/{phase1_id}/next",
            headers={"Authorization": "Bearer test_token"},
        )
        
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_previous_phase(test_phases):
    """Test getting the previous phase in sequence"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        phase1_id, phase2_id, _ = test_phases
        
        # Create relationship
        await client.post(
            f"/api/v1/phases/{phase1_id}/next/{phase2_id}",
            headers={"Authorization": "Bearer test_token"},
        )
        
        # Get previous phase
        response = await client.get(
            f"/api/v1/phases/{phase2_id}/previous",
            headers={"Authorization": "Bearer test_token"},
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(phase1_id)


@pytest.mark.asyncio
async def test_get_previous_phase_not_found(test_phases):
    """Test getting previous phase when none exists"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        phase1_id, _, _ = test_phases
        
        response = await client.get(
            f"/api/v1/phases/{phase1_id}/previous",
            headers={"Authorization": "Bearer test_token"},
        )
        
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_phases_ordered_by_next(test_project, test_phases):
    """Test that listing phases returns them ordered by NEXT chain"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        phase1_id, phase2_id, phase3_id = test_phases
        
        # Create NEXT chain: phase1 -> phase2 -> phase3
        await client.post(
            f"/api/v1/phases/{phase1_id}/next/{phase2_id}",
            headers={"Authorization": "Bearer test_token"},
        )
        await client.post(
            f"/api/v1/phases/{phase2_id}/next/{phase3_id}",
            headers={"Authorization": "Bearer test_token"},
        )
        
        # List phases
        response = await client.get(
            f"/api/v1/projects/{test_project}/phases",
            headers={"Authorization": "Bearer test_token"},
        )
        
        assert response.status_code == 200
        phases = response.json()
        assert len(phases) == 3
        assert phases[0]["id"] == str(phase1_id)
        assert phases[1]["id"] == str(phase2_id)
        assert phases[2]["id"] == str(phase3_id)


@pytest.mark.asyncio
async def test_create_next_relationship_different_projects(graph_service, test_project):
    """Test that creating NEXT relationship between phases from different projects fails"""
    # Create another project
    project2_id = uuid4()
    await graph_service.create_node(
        "Project",
        {
            "id": str(project2_id),
            "name": "Test Project 2",
            "status": "active",
            "created_at": datetime.utcnow().isoformat(),
        },
    )
    
    # Create phases in different projects
    phase1_id = uuid4()
    await graph_service.create_node(
        "Phase",
        {
            "id": str(phase1_id),
            "name": "Phase 1",
            "order": 1,
            "project_id": str(test_project),
            "created_at": datetime.utcnow().isoformat(),
        },
    )
    
    phase2_id = uuid4()
    await graph_service.create_node(
        "Phase",
        {
            "id": str(phase2_id),
            "name": "Phase 2",
            "order": 1,
            "project_id": str(project2_id),
            "created_at": datetime.utcnow().isoformat(),
        },
    )
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            f"/api/v1/phases/{phase1_id}/next/{phase2_id}",
            headers={"Authorization": "Bearer test_token"},
        )
        
        assert response.status_code == 400
        assert "different projects" in response.json()["detail"].lower()

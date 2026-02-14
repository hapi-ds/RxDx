"""Unit tests for BEFORE relationship functionality with dependency_type and lag"""

import pytest
from uuid import uuid4
from datetime import datetime, UTC
from unittest.mock import AsyncMock
from hypothesis import given, strategies as st, settings, assume, HealthCheck

from app.db.graph import GraphService
from app.services.workpackage_service import WorkpackageService
from app.services.workitem_service import WorkItemService
from app.services.milestone_service import MilestoneService


@pytest.fixture
def mock_version_service():
    """Mock version service for testing"""
    return AsyncMock()


class TestBeforeRelationships:
    """Test BEFORE relationship operations with dependency_type and lag"""

    @pytest.mark.asyncio
    async def test_workpackage_before_with_dependency_type_and_lag(
        self, mock_graph_service: GraphService
    ):
        """Test creating BEFORE relationship between workpackages with dependency_type and lag"""
        workpackage_service = WorkpackageService(mock_graph_service)

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create two workpackages
        wp1_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp1_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        wp2_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp2_id),
                "name": "Frontend UI",
                "order": 2,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationship with finish-to-start and 2 days lag
        result = await workpackage_service.create_before_relationship(
            from_workpackage_id=wp1_id,
            to_workpackage_id=wp2_id,
            dependency_type="finish-to-start",
            lag=2,
        )

        assert result is not None
        assert result["from_workpackage_id"] == wp1_id
        assert result["to_workpackage_id"] == wp2_id
        assert result["dependency_type"] == "finish-to-start"
        assert result["lag"] == 2

    @pytest.mark.asyncio
    async def test_workpackage_before_with_start_to_start(
        self, mock_graph_service: GraphService
    ):
        """Test creating BEFORE relationship with start-to-start dependency type"""
        workpackage_service = WorkpackageService(mock_graph_service)

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create two workpackages
        wp1_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp1_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        wp2_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp2_id),
                "name": "Frontend UI",
                "order": 2,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationship with start-to-start
        result = await workpackage_service.create_before_relationship(
            from_workpackage_id=wp1_id,
            to_workpackage_id=wp2_id,
            dependency_type="start-to-start",
            lag=0,
        )

        assert result["dependency_type"] == "start-to-start"
        assert result["lag"] == 0

    @pytest.mark.asyncio
    async def test_workpackage_before_with_finish_to_finish(
        self, mock_graph_service: GraphService
    ):
        """Test creating BEFORE relationship with finish-to-finish dependency type"""
        workpackage_service = WorkpackageService(mock_graph_service)

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create two workpackages
        wp1_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp1_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        wp2_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp2_id),
                "name": "Frontend UI",
                "order": 2,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationship with finish-to-finish
        result = await workpackage_service.create_before_relationship(
            from_workpackage_id=wp1_id,
            to_workpackage_id=wp2_id,
            dependency_type="finish-to-finish",
            lag=5,
        )

        assert result["dependency_type"] == "finish-to-finish"
        assert result["lag"] == 5

    @pytest.mark.asyncio
    async def test_workpackage_before_invalid_dependency_type(
        self, mock_graph_service: GraphService
    ):
        """Test that invalid dependency_type raises ValueError"""
        workpackage_service = WorkpackageService(mock_graph_service)

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create two workpackages
        wp1_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp1_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        wp2_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp2_id),
                "name": "Frontend UI",
                "order": 2,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Try to create BEFORE relationship with invalid dependency_type
        with pytest.raises(ValueError, match="Invalid dependency_type"):
            await workpackage_service.create_before_relationship(
                from_workpackage_id=wp1_id,
                to_workpackage_id=wp2_id,
                dependency_type="invalid-type",
                lag=0,
            )

    @pytest.mark.asyncio
    async def test_task_before_with_dependency_type_and_lag(
        self, mock_graph_service: GraphService, mock_version_service
    ):
        """Test creating BEFORE relationship between tasks with dependency_type and lag"""
        workitem_service = WorkItemService(mock_graph_service, mock_version_service)

        # Create two tasks
        task1_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task1_id),
                "type": "task",
                "title": "Design Database",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        task2_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task2_id),
                "type": "task",
                "title": "Implement API",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationship with finish-to-start and 3 days lag
        result = await workitem_service.create_before_relationship(
            from_task_id=task1_id,
            to_task_id=task2_id,
            dependency_type="finish-to-start",
            lag=3,
        )

        assert result is not None
        assert result["from_task_id"] == task1_id
        assert result["to_task_id"] == task2_id
        assert result["dependency_type"] == "finish-to-start"
        assert result["lag"] == 3

    @pytest.mark.asyncio
    async def test_milestone_before_with_dependency_type_and_lag(
        self, mock_graph_service: GraphService
    ):
        """Test creating BEFORE relationship between milestones with dependency_type and lag"""
        milestone_service = MilestoneService(mock_graph_service)

        # Create project
        project_id = uuid4()
        await mock_graph_service.create_node(
            "Project",
            {
                "id": str(project_id),
                "name": "Test Project",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create two milestones
        m1_id = uuid4()
        await mock_graph_service.create_node(
            "Milestone",
            {
                "id": str(m1_id),
                "title": "Alpha Release",
                "project_id": str(project_id),
                "target_date": "2024-06-01T00:00:00Z",
                "is_manual_constraint": True,
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        m2_id = uuid4()
        await mock_graph_service.create_node(
            "Milestone",
            {
                "id": str(m2_id),
                "title": "Beta Release",
                "project_id": str(project_id),
                "target_date": "2024-09-01T00:00:00Z",
                "is_manual_constraint": True,
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationship with finish-to-start and 7 days lag
        result = await milestone_service.create_before_relationship(
            from_milestone_id=m1_id,
            to_milestone_id=m2_id,
            dependency_type="finish-to-start",
            lag=7,
        )

        assert result is not None
        assert result["from_milestone_id"] == m1_id
        assert result["to_milestone_id"] == m2_id
        assert result["dependency_type"] == "finish-to-start"
        assert result["lag"] == 7

    @pytest.mark.asyncio
    async def test_workpackage_before_default_values(
        self, mock_graph_service: GraphService
    ):
        """Test that default values are used when not specified"""
        workpackage_service = WorkpackageService(mock_graph_service)

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create two workpackages
        wp1_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp1_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        wp2_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp2_id),
                "name": "Frontend UI",
                "order": 2,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationship without specifying dependency_type and lag
        result = await workpackage_service.create_before_relationship(
            from_workpackage_id=wp1_id,
            to_workpackage_id=wp2_id,
        )

        # Should default to finish-to-start and lag=0
        assert result["dependency_type"] == "finish-to-start"
        assert result["lag"] == 0

    @pytest.mark.asyncio
    async def test_remove_workpackage_before_relationship(
        self, mock_graph_service: GraphService
    ):
        """Test removing BEFORE relationship between workpackages"""
        workpackage_service = WorkpackageService(mock_graph_service)

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create two workpackages
        wp1_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp1_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        wp2_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp2_id),
                "name": "Frontend UI",
                "order": 2,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationship
        await workpackage_service.create_before_relationship(
            from_workpackage_id=wp1_id,
            to_workpackage_id=wp2_id,
            dependency_type="finish-to-start",
            lag=2,
        )

        # Remove the relationship
        result = await workpackage_service.remove_before_relationship(
            from_workpackage_id=wp1_id,
            to_workpackage_id=wp2_id,
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_remove_nonexistent_workpackage_before_relationship(
        self, mock_graph_service: GraphService
    ):
        """Test removing non-existent BEFORE relationship returns False"""
        workpackage_service = WorkpackageService(mock_graph_service)

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create two workpackages
        wp1_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp1_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        wp2_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp2_id),
                "name": "Frontend UI",
                "order": 2,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Try to remove non-existent relationship
        result = await workpackage_service.remove_before_relationship(
            from_workpackage_id=wp1_id,
            to_workpackage_id=wp2_id,
        )

        assert result is False

    @pytest.mark.asyncio
    async def test_remove_task_before_relationship(
        self, mock_graph_service: GraphService, mock_version_service
    ):
        """Test removing BEFORE relationship between tasks"""
        workitem_service = WorkItemService(mock_graph_service, mock_version_service)

        # Create two tasks
        task1_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task1_id),
                "type": "task",
                "title": "Design Database",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        task2_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task2_id),
                "type": "task",
                "title": "Implement API",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationship
        await workitem_service.create_before_relationship(
            from_task_id=task1_id,
            to_task_id=task2_id,
            dependency_type="finish-to-start",
            lag=3,
        )

        # Remove the relationship
        result = await workitem_service.remove_before_relationship(
            from_task_id=task1_id,
            to_task_id=task2_id,
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_remove_milestone_before_relationship(
        self, mock_graph_service: GraphService
    ):
        """Test removing BEFORE relationship between milestones"""
        milestone_service = MilestoneService(mock_graph_service)

        # Create project
        project_id = uuid4()
        await mock_graph_service.create_node(
            "Project",
            {
                "id": str(project_id),
                "name": "Test Project",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create two milestones
        m1_id = uuid4()
        await mock_graph_service.create_node(
            "Milestone",
            {
                "id": str(m1_id),
                "title": "Alpha Release",
                "project_id": str(project_id),
                "target_date": "2024-06-01T00:00:00Z",
                "is_manual_constraint": True,
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        m2_id = uuid4()
        await mock_graph_service.create_node(
            "Milestone",
            {
                "id": str(m2_id),
                "title": "Beta Release",
                "project_id": str(project_id),
                "target_date": "2024-09-01T00:00:00Z",
                "is_manual_constraint": True,
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationship
        await milestone_service.create_before_relationship(
            from_milestone_id=m1_id,
            to_milestone_id=m2_id,
            dependency_type="finish-to-start",
            lag=7,
        )

        # Remove the relationship
        result = await milestone_service.remove_before_relationship(
            from_milestone_id=m1_id,
            to_milestone_id=m2_id,
        )

        assert result is True

    @pytest.mark.asyncio
    async def test_get_workpackage_before_dependencies(
        self, mock_graph_service: GraphService
    ):
        """Test getting BEFORE dependencies for a workpackage"""
        workpackage_service = WorkpackageService(mock_graph_service)

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create three workpackages: wp1 -> wp2 -> wp3
        wp1_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp1_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        wp2_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp2_id),
                "name": "Frontend UI",
                "order": 2,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        wp3_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp3_id),
                "name": "Testing",
                "order": 3,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationships: wp1 -> wp2 -> wp3
        await workpackage_service.create_before_relationship(
            from_workpackage_id=wp1_id,
            to_workpackage_id=wp2_id,
            dependency_type="finish-to-start",
            lag=2,
        )

        await workpackage_service.create_before_relationship(
            from_workpackage_id=wp2_id,
            to_workpackage_id=wp3_id,
            dependency_type="start-to-start",
            lag=0,
        )

        # Get dependencies for wp2 (should have wp1 as predecessor and wp3 as successor)
        result = await workpackage_service.get_before_dependencies(wp2_id)

        assert result is not None
        assert "predecessors" in result
        assert "successors" in result

        # Check predecessors (wp1)
        assert len(result["predecessors"]) == 1
        assert result["predecessors"][0]["id"] == str(wp1_id)
        assert result["predecessors"][0]["name"] == "Backend API"
        assert result["predecessors"][0]["dependency_type"] == "finish-to-start"
        assert result["predecessors"][0]["lag"] == 2

        # Check successors (wp3)
        assert len(result["successors"]) == 1
        assert result["successors"][0]["id"] == str(wp3_id)
        assert result["successors"][0]["name"] == "Testing"
        assert result["successors"][0]["dependency_type"] == "start-to-start"
        assert result["successors"][0]["lag"] == 0

    @pytest.mark.asyncio
    async def test_get_task_before_dependencies(
        self, mock_graph_service: GraphService, mock_version_service
    ):
        """Test getting BEFORE dependencies for a task"""
        workitem_service = WorkItemService(mock_graph_service, mock_version_service)

        # Create three tasks: task1 -> task2 -> task3
        task1_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task1_id),
                "type": "task",
                "title": "Design Database",
                "status": "completed",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        task2_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task2_id),
                "type": "task",
                "title": "Implement API",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        task3_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task3_id),
                "type": "task",
                "title": "Write Tests",
                "status": "draft",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationships: task1 -> task2 -> task3
        await workitem_service.create_before_relationship(
            from_task_id=task1_id,
            to_task_id=task2_id,
            dependency_type="finish-to-start",
            lag=1,
        )

        await workitem_service.create_before_relationship(
            from_task_id=task2_id,
            to_task_id=task3_id,
            dependency_type="finish-to-finish",
            lag=3,
        )

        # Get dependencies for task2 (should have task1 as predecessor and task3 as successor)
        result = await workitem_service.get_before_dependencies(task2_id)

        assert result is not None
        assert "predecessors" in result
        assert "successors" in result

        # Check predecessors (task1)
        assert len(result["predecessors"]) == 1
        assert result["predecessors"][0]["id"] == str(task1_id)
        assert result["predecessors"][0]["title"] == "Design Database"
        assert result["predecessors"][0]["status"] == "completed"
        assert result["predecessors"][0]["dependency_type"] == "finish-to-start"
        assert result["predecessors"][0]["lag"] == 1

        # Check successors (task3)
        assert len(result["successors"]) == 1
        assert result["successors"][0]["id"] == str(task3_id)
        assert result["successors"][0]["title"] == "Write Tests"
        assert result["successors"][0]["status"] == "draft"
        assert result["successors"][0]["dependency_type"] == "finish-to-finish"
        assert result["successors"][0]["lag"] == 3

    @pytest.mark.asyncio
    async def test_get_milestone_before_dependencies(
        self, mock_graph_service: GraphService
    ):
        """Test getting BEFORE dependencies for a milestone"""
        milestone_service = MilestoneService(mock_graph_service)

        # Create project
        project_id = uuid4()
        await mock_graph_service.create_node(
            "Project",
            {
                "id": str(project_id),
                "name": "Test Project",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create three milestones: m1 -> m2 -> m3
        m1_id = uuid4()
        await mock_graph_service.create_node(
            "Milestone",
            {
                "id": str(m1_id),
                "title": "Alpha Release",
                "project_id": str(project_id),
                "target_date": "2024-06-01T00:00:00Z",
                "is_manual_constraint": True,
                "status": "completed",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        m2_id = uuid4()
        await mock_graph_service.create_node(
            "Milestone",
            {
                "id": str(m2_id),
                "title": "Beta Release",
                "project_id": str(project_id),
                "target_date": "2024-09-01T00:00:00Z",
                "is_manual_constraint": True,
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        m3_id = uuid4()
        await mock_graph_service.create_node(
            "Milestone",
            {
                "id": str(m3_id),
                "title": "GA Release",
                "project_id": str(project_id),
                "target_date": "2024-12-01T00:00:00Z",
                "is_manual_constraint": True,
                "status": "draft",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationships: m1 -> m2 -> m3
        await milestone_service.create_before_relationship(
            from_milestone_id=m1_id,
            to_milestone_id=m2_id,
            dependency_type="finish-to-start",
            lag=7,
        )

        await milestone_service.create_before_relationship(
            from_milestone_id=m2_id,
            to_milestone_id=m3_id,
            dependency_type="finish-to-start",
            lag=14,
        )

        # Get dependencies for m2 (should have m1 as predecessor and m3 as successor)
        result = await milestone_service.get_before_dependencies(m2_id)

        assert result is not None
        assert "predecessors" in result
        assert "successors" in result

        # Check predecessors (m1)
        assert len(result["predecessors"]) == 1
        assert result["predecessors"][0]["id"] == str(m1_id)
        assert result["predecessors"][0]["title"] == "Alpha Release"
        assert result["predecessors"][0]["status"] == "completed"
        assert result["predecessors"][0]["dependency_type"] == "finish-to-start"
        assert result["predecessors"][0]["lag"] == 7

        # Check successors (m3)
        assert len(result["successors"]) == 1
        assert result["successors"][0]["id"] == str(m3_id)
        assert result["successors"][0]["title"] == "GA Release"
        assert result["successors"][0]["status"] == "draft"
        assert result["successors"][0]["dependency_type"] == "finish-to-start"
        assert result["successors"][0]["lag"] == 14

    @pytest.mark.asyncio
    async def test_get_workpackage_dependencies_no_relationships(
        self, mock_graph_service: GraphService
    ):
        """Test getting dependencies for a workpackage with no relationships"""
        workpackage_service = WorkpackageService(mock_graph_service)

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create a single workpackage with no relationships
        wp_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp_id),
                "name": "Standalone Work",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Get dependencies (should be empty)
        result = await workpackage_service.get_before_dependencies(wp_id)

        assert result is not None
        assert "predecessors" in result
        assert "successors" in result
        assert len(result["predecessors"]) == 0
        assert len(result["successors"]) == 0

    @pytest.mark.asyncio
    async def test_get_task_dependencies_multiple_predecessors(
        self, mock_graph_service: GraphService, mock_version_service
    ):
        """Test getting dependencies for a task with multiple predecessors"""
        workitem_service = WorkItemService(mock_graph_service, mock_version_service)

        # Create four tasks: task1, task2, task3 all -> task4
        task1_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task1_id),
                "type": "task",
                "title": "Design Database",
                "status": "completed",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        task2_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task2_id),
                "type": "task",
                "title": "Design API",
                "status": "completed",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        task3_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task3_id),
                "type": "task",
                "title": "Design UI",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        task4_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task4_id),
                "type": "task",
                "title": "Integration Testing",
                "status": "draft",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationships: task1 -> task4, task2 -> task4, task3 -> task4
        await workitem_service.create_before_relationship(
            from_task_id=task1_id,
            to_task_id=task4_id,
            dependency_type="finish-to-start",
            lag=0,
        )

        await workitem_service.create_before_relationship(
            from_task_id=task2_id,
            to_task_id=task4_id,
            dependency_type="finish-to-start",
            lag=1,
        )

        await workitem_service.create_before_relationship(
            from_task_id=task3_id,
            to_task_id=task4_id,
            dependency_type="finish-to-start",
            lag=2,
        )

        # Get dependencies for task4 (should have three predecessors)
        result = await workitem_service.get_before_dependencies(task4_id)

        assert result is not None
        assert "predecessors" in result
        assert "successors" in result

        # Check predecessors (should have all three)
        assert len(result["predecessors"]) == 3
        predecessor_ids = {p["id"] for p in result["predecessors"]}
        assert str(task1_id) in predecessor_ids
        assert str(task2_id) in predecessor_ids
        assert str(task3_id) in predecessor_ids

        # Check successors (should be empty)
        assert len(result["successors"]) == 0


class TestBeforeCycleDetection:
    """Test cycle detection for BEFORE relationships"""

    @pytest.mark.asyncio
    async def test_workpackage_before_direct_cycle(
        self, mock_graph_service: GraphService
    ):
        """Test that direct cycle (A -> B -> A) is detected for workpackages"""
        workpackage_service = WorkpackageService(mock_graph_service)

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create two workpackages
        wp1_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp1_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        wp2_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp2_id),
                "name": "Frontend UI",
                "order": 2,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationship: wp1 -> wp2
        await workpackage_service.create_before_relationship(
            from_workpackage_id=wp1_id,
            to_workpackage_id=wp2_id,
            dependency_type="finish-to-start",
            lag=0,
        )

        # Try to create reverse relationship: wp2 -> wp1 (should fail - creates cycle)
        with pytest.raises(ValueError, match="would create a cycle"):
            await workpackage_service.create_before_relationship(
                from_workpackage_id=wp2_id,
                to_workpackage_id=wp1_id,
                dependency_type="finish-to-start",
                lag=0,
            )

    @pytest.mark.asyncio
    async def test_workpackage_before_indirect_cycle(
        self, mock_graph_service: GraphService
    ):
        """Test that indirect cycle (A -> B -> C -> A) is detected for workpackages"""
        workpackage_service = WorkpackageService(mock_graph_service)

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create three workpackages
        wp1_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp1_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        wp2_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp2_id),
                "name": "Frontend UI",
                "order": 2,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        wp3_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp3_id),
                "name": "Testing",
                "order": 3,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationships: wp1 -> wp2 -> wp3
        await workpackage_service.create_before_relationship(
            from_workpackage_id=wp1_id,
            to_workpackage_id=wp2_id,
            dependency_type="finish-to-start",
            lag=0,
        )

        await workpackage_service.create_before_relationship(
            from_workpackage_id=wp2_id,
            to_workpackage_id=wp3_id,
            dependency_type="finish-to-start",
            lag=0,
        )

        # Try to create relationship: wp3 -> wp1 (should fail - creates cycle)
        with pytest.raises(ValueError, match="would create a cycle"):
            await workpackage_service.create_before_relationship(
                from_workpackage_id=wp3_id,
                to_workpackage_id=wp1_id,
                dependency_type="finish-to-start",
                lag=0,
            )

    @pytest.mark.asyncio
    async def test_workpackage_before_self_cycle(
        self, mock_graph_service: GraphService
    ):
        """Test that self-referencing cycle (A -> A) is detected for workpackages"""
        workpackage_service = WorkpackageService(mock_graph_service)

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create one workpackage
        wp_id = uuid4()
        await mock_graph_service.create_node(
            "Workpackage",
            {
                "id": str(wp_id),
                "name": "Backend API",
                "order": 1,
                "phase_id": str(phase_id),
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Try to create self-referencing relationship: wp -> wp (should fail)
        with pytest.raises(ValueError, match="would create a cycle"):
            await workpackage_service.create_before_relationship(
                from_workpackage_id=wp_id,
                to_workpackage_id=wp_id,
                dependency_type="finish-to-start",
                lag=0,
            )

    @pytest.mark.asyncio
    async def test_task_before_direct_cycle(
        self, mock_graph_service: GraphService, mock_version_service
    ):
        """Test that direct cycle (A -> B -> A) is detected for tasks"""
        workitem_service = WorkItemService(mock_graph_service, mock_version_service)

        # Create two tasks
        task1_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task1_id),
                "type": "task",
                "title": "Design Database",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        task2_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task2_id),
                "type": "task",
                "title": "Implement API",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationship: task1 -> task2
        await workitem_service.create_before_relationship(
            from_task_id=task1_id,
            to_task_id=task2_id,
            dependency_type="finish-to-start",
            lag=0,
        )

        # Try to create reverse relationship: task2 -> task1 (should fail - creates cycle)
        with pytest.raises(ValueError, match="would create a cycle"):
            await workitem_service.create_before_relationship(
                from_task_id=task2_id,
                to_task_id=task1_id,
                dependency_type="finish-to-start",
                lag=0,
            )

    @pytest.mark.asyncio
    async def test_task_before_indirect_cycle(
        self, mock_graph_service: GraphService, mock_version_service
    ):
        """Test that indirect cycle (A -> B -> C -> A) is detected for tasks"""
        workitem_service = WorkItemService(mock_graph_service, mock_version_service)

        # Create three tasks
        task1_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task1_id),
                "type": "task",
                "title": "Design Database",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        task2_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task2_id),
                "type": "task",
                "title": "Implement API",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        task3_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task3_id),
                "type": "task",
                "title": "Write Tests",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationships: task1 -> task2 -> task3
        await workitem_service.create_before_relationship(
            from_task_id=task1_id,
            to_task_id=task2_id,
            dependency_type="finish-to-start",
            lag=0,
        )

        await workitem_service.create_before_relationship(
            from_task_id=task2_id,
            to_task_id=task3_id,
            dependency_type="finish-to-start",
            lag=0,
        )

        # Try to create relationship: task3 -> task1 (should fail - creates cycle)
        with pytest.raises(ValueError, match="would create a cycle"):
            await workitem_service.create_before_relationship(
                from_task_id=task3_id,
                to_task_id=task1_id,
                dependency_type="finish-to-start",
                lag=0,
            )

    @pytest.mark.asyncio
    async def test_task_before_self_cycle(
        self, mock_graph_service: GraphService, mock_version_service
    ):
        """Test that self-referencing cycle (A -> A) is detected for tasks"""
        workitem_service = WorkItemService(mock_graph_service, mock_version_service)

        # Create one task
        task_id = uuid4()
        await mock_graph_service.create_node(
            "WorkItem",
            {
                "id": str(task_id),
                "type": "task",
                "title": "Design Database",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Try to create self-referencing relationship: task -> task (should fail)
        with pytest.raises(ValueError, match="would create a cycle"):
            await workitem_service.create_before_relationship(
                from_task_id=task_id,
                to_task_id=task_id,
                dependency_type="finish-to-start",
                lag=0,
            )

    @pytest.mark.asyncio
    async def test_milestone_before_direct_cycle(
        self, mock_graph_service: GraphService
    ):
        """Test that direct cycle (A -> B -> A) is detected for milestones"""
        milestone_service = MilestoneService(mock_graph_service)

        # Create project
        project_id = uuid4()
        await mock_graph_service.create_node(
            "Project",
            {
                "id": str(project_id),
                "name": "Test Project",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create two milestones
        m1_id = uuid4()
        await mock_graph_service.create_node(
            "Milestone",
            {
                "id": str(m1_id),
                "title": "Alpha Release",
                "project_id": str(project_id),
                "target_date": "2024-06-01T00:00:00Z",
                "is_manual_constraint": True,
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        m2_id = uuid4()
        await mock_graph_service.create_node(
            "Milestone",
            {
                "id": str(m2_id),
                "title": "Beta Release",
                "project_id": str(project_id),
                "target_date": "2024-09-01T00:00:00Z",
                "is_manual_constraint": True,
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationship: m1 -> m2
        await milestone_service.create_before_relationship(
            from_milestone_id=m1_id,
            to_milestone_id=m2_id,
            dependency_type="finish-to-start",
            lag=0,
        )

        # Try to create reverse relationship: m2 -> m1 (should fail - creates cycle)
        with pytest.raises(ValueError, match="would create a cycle"):
            await milestone_service.create_before_relationship(
                from_milestone_id=m2_id,
                to_milestone_id=m1_id,
                dependency_type="finish-to-start",
                lag=0,
            )

    @pytest.mark.asyncio
    async def test_milestone_before_indirect_cycle(
        self, mock_graph_service: GraphService
    ):
        """Test that indirect cycle (A -> B -> C -> A) is detected for milestones"""
        milestone_service = MilestoneService(mock_graph_service)

        # Create project
        project_id = uuid4()
        await mock_graph_service.create_node(
            "Project",
            {
                "id": str(project_id),
                "name": "Test Project",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create three milestones
        m1_id = uuid4()
        await mock_graph_service.create_node(
            "Milestone",
            {
                "id": str(m1_id),
                "title": "Alpha Release",
                "project_id": str(project_id),
                "target_date": "2024-06-01T00:00:00Z",
                "is_manual_constraint": True,
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        m2_id = uuid4()
        await mock_graph_service.create_node(
            "Milestone",
            {
                "id": str(m2_id),
                "title": "Beta Release",
                "project_id": str(project_id),
                "target_date": "2024-09-01T00:00:00Z",
                "is_manual_constraint": True,
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        m3_id = uuid4()
        await mock_graph_service.create_node(
            "Milestone",
            {
                "id": str(m3_id),
                "title": "GA Release",
                "project_id": str(project_id),
                "target_date": "2024-12-01T00:00:00Z",
                "is_manual_constraint": True,
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create BEFORE relationships: m1 -> m2 -> m3
        await milestone_service.create_before_relationship(
            from_milestone_id=m1_id,
            to_milestone_id=m2_id,
            dependency_type="finish-to-start",
            lag=0,
        )

        await milestone_service.create_before_relationship(
            from_milestone_id=m2_id,
            to_milestone_id=m3_id,
            dependency_type="finish-to-start",
            lag=0,
        )

        # Try to create relationship: m3 -> m1 (should fail - creates cycle)
        with pytest.raises(ValueError, match="would create a cycle"):
            await milestone_service.create_before_relationship(
                from_milestone_id=m3_id,
                to_milestone_id=m1_id,
                dependency_type="finish-to-start",
                lag=0,
            )

    @pytest.mark.asyncio
    async def test_milestone_before_self_cycle(
        self, mock_graph_service: GraphService
    ):
        """Test that self-referencing cycle (A -> A) is detected for milestones"""
        milestone_service = MilestoneService(mock_graph_service)

        # Create project
        project_id = uuid4()
        await mock_graph_service.create_node(
            "Project",
            {
                "id": str(project_id),
                "name": "Test Project",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create one milestone
        m_id = uuid4()
        await mock_graph_service.create_node(
            "Milestone",
            {
                "id": str(m_id),
                "title": "Alpha Release",
                "project_id": str(project_id),
                "target_date": "2024-06-01T00:00:00Z",
                "is_manual_constraint": True,
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Try to create self-referencing relationship: m -> m (should fail)
        with pytest.raises(ValueError, match="would create a cycle"):
            await milestone_service.create_before_relationship(
                from_milestone_id=m_id,
                to_milestone_id=m_id,
                dependency_type="finish-to-start",
                lag=0,
            )

    @pytest.mark.asyncio
    async def test_workpackage_before_complex_cycle(
        self, mock_graph_service: GraphService
    ):
        """Test that complex cycle (A -> B, A -> C, B -> D, C -> D, D -> A) is detected"""
        workpackage_service = WorkpackageService(mock_graph_service)

        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Development",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )

        # Create four workpackages
        wp_a = uuid4()
        wp_b = uuid4()
        wp_c = uuid4()
        wp_d = uuid4()

        for wp_id, name in [(wp_a, "A"), (wp_b, "B"), (wp_c, "C"), (wp_d, "D")]:
            await mock_graph_service.create_node(
                "Workpackage",
                {
                    "id": str(wp_id),
                    "name": f"Workpackage {name}",
                    "order": 1,
                    "phase_id": str(phase_id),
                    "created_at": datetime.now(UTC).isoformat(),
                },
            )

        # Create relationships: A -> B, A -> C, B -> D, C -> D
        await workpackage_service.create_before_relationship(
            from_workpackage_id=wp_a,
            to_workpackage_id=wp_b,
        )

        await workpackage_service.create_before_relationship(
            from_workpackage_id=wp_a,
            to_workpackage_id=wp_c,
        )

        await workpackage_service.create_before_relationship(
            from_workpackage_id=wp_b,
            to_workpackage_id=wp_d,
        )

        await workpackage_service.create_before_relationship(
            from_workpackage_id=wp_c,
            to_workpackage_id=wp_d,
        )

        # Try to create relationship: D -> A (should fail - creates cycle)
        with pytest.raises(ValueError, match="would create a cycle"):
            await workpackage_service.create_before_relationship(
                from_workpackage_id=wp_d,
                to_workpackage_id=wp_a,
            )



# ============================================================================
# Property-Based Tests for BEFORE Relationships
# ============================================================================


# Hypothesis strategies for generating test data
@st.composite
def dependency_graph_strategy(draw, min_nodes=2, max_nodes=10):
    """
    Generate a valid dependency graph (DAG) structure.
    
    Returns a list of tuples (from_id, to_id) representing edges in a DAG.
    """
    num_nodes = draw(st.integers(min_value=min_nodes, max_value=max_nodes))
    node_ids = [uuid4() for _ in range(num_nodes)]
    
    # Generate edges that form a DAG (no cycles)
    # We'll use topological ordering to ensure no cycles
    edges = []
    
    # For each pair of nodes (i, j) where i < j, randomly decide if there's an edge
    for i in range(num_nodes):
        for j in range(i + 1, num_nodes):
            # Add edge with some probability (not too dense)
            if draw(st.booleans()) and draw(st.booleans()):  # ~25% probability
                edges.append((node_ids[i], node_ids[j]))
    
    return node_ids, edges


@st.composite
def dependency_type_strategy(draw):
    """Generate valid dependency types"""
    return draw(st.sampled_from(["finish-to-start", "start-to-start", "finish-to-finish"]))


@st.composite
def lag_strategy(draw):
    """Generate valid lag values (0-30 days)"""
    return draw(st.integers(min_value=0, max_value=30))


class TestBeforeRelationshipsProperties:
    """Property-based tests for BEFORE relationships"""

    @pytest.mark.asyncio
    @given(
        graph_data=dependency_graph_strategy(min_nodes=3, max_nodes=8),
        dependency_type=dependency_type_strategy(),
        lag=lag_strategy()
    )
    @settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    async def test_property_before_relationships_dont_create_cycles_workpackages(
        self,
        graph_data,
        dependency_type,
        lag,
        mock_graph_service: GraphService
    ):
        """
        Property: BEFORE relationships don't create cycles in workpackage dependencies
        
        **Validates: Requirements 16B.8-16B.21**
        
        This property ensures that:
        1. Valid DAG structures can be created without errors
        2. Any attempt to add an edge that would create a cycle is rejected
        3. The cycle detection works for any graph structure
        
        **Formal**: ∀ graph G = (V, E), ∀ edge (u, v) ∉ E, 
                    add_edge(u, v) succeeds ⟺ (u, v) doesn't create cycle
        """
        workpackage_service = WorkpackageService(mock_graph_service)
        node_ids, edges = graph_data
        
        # Skip if no edges (trivial case)
        assume(len(edges) > 0)
        
        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Test Phase",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )
        
        # Create all workpackage nodes
        for idx, node_id in enumerate(node_ids):
            await mock_graph_service.create_node(
                "Workpackage",
                {
                    "id": str(node_id),
                    "name": f"Workpackage {idx}",
                    "order": idx + 1,
                    "phase_id": str(phase_id),
                    "created_at": datetime.now(UTC).isoformat(),
                },
            )
        
        # Create all edges in the DAG - these should all succeed
        for from_id, to_id in edges:
            result = await workpackage_service.create_before_relationship(
                from_workpackage_id=from_id,
                to_workpackage_id=to_id,
                dependency_type=dependency_type,
                lag=lag,
            )
            # Verify the relationship was created successfully
            assert result is not None
            assert result["from_workpackage_id"] == from_id
            assert result["to_workpackage_id"] == to_id
        
        # Now try to create a cycle by adding a reverse edge
        # Pick any edge and try to reverse it to create a cycle
        if len(edges) > 0:
            # Find an edge where both nodes exist
            for from_id, to_id in edges:
                # Try to create reverse relationship - should fail with cycle error
                with pytest.raises(ValueError, match="would create a cycle"):
                    await workpackage_service.create_before_relationship(
                        from_workpackage_id=to_id,
                        to_workpackage_id=from_id,
                        dependency_type=dependency_type,
                        lag=lag,
                    )
                # Only test one reverse edge
                break

    @pytest.mark.asyncio
    @given(
        graph_data=dependency_graph_strategy(min_nodes=3, max_nodes=8),
        dependency_type=dependency_type_strategy(),
        lag=lag_strategy()
    )
    @settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    async def test_property_before_relationships_dont_create_cycles_tasks(
        self,
        graph_data,
        dependency_type,
        lag,
        mock_graph_service: GraphService,
        mock_version_service
    ):
        """
        Property: BEFORE relationships don't create cycles in task dependencies
        
        **Validates: Requirements 16B.8-16B.21**
        
        This property ensures that:
        1. Valid DAG structures can be created for tasks without errors
        2. Any attempt to add an edge that would create a cycle is rejected
        3. The cycle detection works for any task dependency graph structure
        
        **Formal**: ∀ graph G = (V, E), ∀ edge (u, v) ∉ E, 
                    add_edge(u, v) succeeds ⟺ (u, v) doesn't create cycle
        """
        workitem_service = WorkItemService(mock_graph_service, mock_version_service)
        node_ids, edges = graph_data
        
        # Skip if no edges (trivial case)
        assume(len(edges) > 0)
        
        # Create all task nodes
        for idx, node_id in enumerate(node_ids):
            await mock_graph_service.create_node(
                "WorkItem",
                {
                    "id": str(node_id),
                    "type": "task",
                    "title": f"Task {idx}",
                    "status": "active",
                    "created_at": datetime.now(UTC).isoformat(),
                },
            )
        
        # Create all edges in the DAG - these should all succeed
        for from_id, to_id in edges:
            result = await workitem_service.create_before_relationship(
                from_task_id=from_id,
                to_task_id=to_id,
                dependency_type=dependency_type,
                lag=lag,
            )
            # Verify the relationship was created successfully
            assert result is not None
            assert result["from_task_id"] == from_id
            assert result["to_task_id"] == to_id
        
        # Now try to create a cycle by adding a reverse edge
        # Pick the first edge and try to reverse it
        if len(edges) > 0:
            first_from, first_to = edges[0]
            
            # Try to create reverse relationship - should fail with cycle error
            with pytest.raises(ValueError, match="would create a cycle"):
                await workitem_service.create_before_relationship(
                    from_task_id=first_to,
                    to_task_id=first_from,
                    dependency_type=dependency_type,
                    lag=lag,
                )

    @pytest.mark.asyncio
    @given(
        graph_data=dependency_graph_strategy(min_nodes=3, max_nodes=8),
        dependency_type=dependency_type_strategy(),
        lag=lag_strategy()
    )
    @settings(
        max_examples=50,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    async def test_property_before_relationships_dont_create_cycles_milestones(
        self,
        graph_data,
        dependency_type,
        lag,
        mock_graph_service: GraphService
    ):
        """
        Property: BEFORE relationships don't create cycles in milestone dependencies
        
        **Validates: Requirements 16B.8-16B.21**
        
        This property ensures that:
        1. Valid DAG structures can be created for milestones without errors
        2. Any attempt to add an edge that would create a cycle is rejected
        3. The cycle detection works for any milestone dependency graph structure
        
        **Formal**: ∀ graph G = (V, E), ∀ edge (u, v) ∉ E, 
                    add_edge(u, v) succeeds ⟺ (u, v) doesn't create cycle
        """
        milestone_service = MilestoneService(mock_graph_service)
        node_ids, edges = graph_data
        
        # Skip if no edges (trivial case)
        assume(len(edges) > 0)
        
        # Create test project
        project_id = uuid4()
        await mock_graph_service.create_node(
            "Project",
            {
                "id": str(project_id),
                "name": "Test Project",
                "status": "active",
                "created_at": datetime.now(UTC).isoformat(),
            },
        )
        
        # Create all milestone nodes
        for idx, node_id in enumerate(node_ids):
            await mock_graph_service.create_node(
                "Milestone",
                {
                    "id": str(node_id),
                    "title": f"Milestone {idx}",
                    "project_id": str(project_id),
                    "target_date": "2024-12-31T00:00:00Z",
                    "is_manual_constraint": True,
                    "status": "active",
                    "created_at": datetime.now(UTC).isoformat(),
                },
            )
        
        # Create all edges in the DAG - these should all succeed
        for from_id, to_id in edges:
            result = await milestone_service.create_before_relationship(
                from_milestone_id=from_id,
                to_milestone_id=to_id,
                dependency_type=dependency_type,
                lag=lag,
            )
            # Verify the relationship was created successfully
            assert result is not None
            assert result["from_milestone_id"] == from_id
            assert result["to_milestone_id"] == to_id
        
        # Now try to create a cycle by adding a reverse edge
        # Pick the first edge and try to reverse it
        if len(edges) > 0:
            first_from, first_to = edges[0]
            
            # Try to create reverse relationship - should fail with cycle error
            with pytest.raises(ValueError, match="would create a cycle"):
                await milestone_service.create_before_relationship(
                    from_milestone_id=first_to,
                    to_milestone_id=first_from,
                    dependency_type=dependency_type,
                    lag=lag,
                )

    @pytest.mark.asyncio
    @given(num_nodes=st.integers(min_value=2, max_value=10))
    @settings(
        max_examples=20,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    async def test_property_self_referencing_cycles_always_rejected(
        self,
        num_nodes,
        mock_graph_service: GraphService,
        mock_version_service
    ):
        """
        Property: Self-referencing BEFORE relationships are always rejected
        
        **Validates: Requirements 16B.8-16B.21**
        
        This property ensures that no entity can have a BEFORE relationship to itself,
        regardless of dependency type or lag value.
        
        **Formal**: ∀ node n, ∀ dependency_type d, ∀ lag l, 
                    create_before(n, n, d, l) raises ValueError
        """
        workitem_service = WorkItemService(mock_graph_service, mock_version_service)
        
        # Create multiple task nodes
        task_ids = []
        for idx in range(num_nodes):
            task_id = uuid4()
            await mock_graph_service.create_node(
                "WorkItem",
                {
                    "id": str(task_id),
                    "type": "task",
                    "title": f"Task {idx}",
                    "status": "active",
                    "created_at": datetime.now(UTC).isoformat(),
                },
            )
            task_ids.append(task_id)
        
        # Try to create self-referencing relationship for each task
        for task_id in task_ids:
            with pytest.raises(ValueError, match="would create a cycle"):
                await workitem_service.create_before_relationship(
                    from_task_id=task_id,
                    to_task_id=task_id,
                    dependency_type="finish-to-start",
                    lag=0,
                )

    @pytest.mark.asyncio
    @given(
        chain_length=st.integers(min_value=3, max_value=10),
        dependency_type=dependency_type_strategy(),
        lag=lag_strategy()
    )
    @settings(
        max_examples=30,
        deadline=None,
        suppress_health_check=[HealthCheck.function_scoped_fixture]
    )
    async def test_property_transitive_cycles_detected(
        self,
        chain_length,
        dependency_type,
        lag,
        mock_graph_service: GraphService
    ):
        """
        Property: Transitive cycles are detected (A -> B -> C -> ... -> A)
        
        **Validates: Requirements 16B.8-16B.21**
        
        This property ensures that cycles of any length are detected,
        not just direct cycles (A -> B -> A).
        
        **Formal**: ∀ chain [n₁, n₂, ..., nₖ], 
                    (∀i: create_before(nᵢ, nᵢ₊₁) succeeds) ⟹ 
                    create_before(nₖ, n₁) raises ValueError
        """
        workpackage_service = WorkpackageService(mock_graph_service)
        
        # Create test phase
        phase_id = uuid4()
        await mock_graph_service.create_node(
            "Phase",
            {
                "id": str(phase_id),
                "name": "Test Phase",
                "order": 1,
                "created_at": datetime.now(UTC).isoformat(),
            },
        )
        
        # Create a chain of workpackages
        workpackage_ids = []
        for idx in range(chain_length):
            wp_id = uuid4()
            await mock_graph_service.create_node(
                "Workpackage",
                {
                    "id": str(wp_id),
                    "name": f"Workpackage {idx}",
                    "order": idx + 1,
                    "phase_id": str(phase_id),
                    "created_at": datetime.now(UTC).isoformat(),
                },
            )
            workpackage_ids.append(wp_id)
        
        # Create chain: wp[0] -> wp[1] -> wp[2] -> ... -> wp[n-1]
        for i in range(len(workpackage_ids) - 1):
            result = await workpackage_service.create_before_relationship(
                from_workpackage_id=workpackage_ids[i],
                to_workpackage_id=workpackage_ids[i + 1],
                dependency_type=dependency_type,
                lag=lag,
            )
            assert result is not None
        
        # Try to close the cycle: wp[n-1] -> wp[0] (should fail)
        with pytest.raises(ValueError, match="would create a cycle"):
            await workpackage_service.create_before_relationship(
                from_workpackage_id=workpackage_ids[-1],
                to_workpackage_id=workpackage_ids[0],
                dependency_type=dependency_type,
                lag=lag,
            )

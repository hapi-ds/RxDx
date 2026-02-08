"""Unit tests for SprintService"""

import pytest
from datetime import datetime, timedelta, UTC
from uuid import uuid4, UUID
from unittest.mock import AsyncMock, MagicMock

from app.services.sprint_service import SprintService
from app.schemas.sprint import SprintCreate, SprintUpdate
from app.models.user import User


@pytest.fixture
def mock_graph_service():
    """Mock graph service"""
    service = AsyncMock()
    service.execute_query = AsyncMock()
    service.create_node = AsyncMock()
    service.move_task_to_sprint = AsyncMock()
    service.remove_task_from_sprint = AsyncMock()
    return service


@pytest.fixture
def sprint_service(mock_graph_service):
    """Sprint service with mocked dependencies"""
    return SprintService(mock_graph_service)


@pytest.fixture
def mock_user():
    """Mock user"""
    user = MagicMock(spec=User)
    user.id = uuid4()
    user.email = "test@example.com"
    return user


@pytest.fixture
def sample_sprint_data():
    """Sample sprint creation data"""
    project_id = uuid4()
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=14)
    
    return SprintCreate(
        name="Sprint 1",
        goal="Complete user authentication",
        start_date=start_date,
        end_date=end_date,
        capacity_hours=80.0,
        capacity_story_points=20,
        status="planning",
        project_id=project_id
    )


class TestCreateSprint:
    """Tests for create_sprint method"""

    @pytest.mark.asyncio
    async def test_create_sprint_success(
        self,
        sprint_service,
        mock_graph_service,
        sample_sprint_data,
        mock_user
    ):
        """Test successful sprint creation"""
        # Mock no active sprints
        mock_graph_service.execute_query.return_value = []

        result = await sprint_service.create_sprint(sample_sprint_data, mock_user)

        assert result.name == sample_sprint_data.name
        assert result.goal == sample_sprint_data.goal
        assert result.project_id == sample_sprint_data.project_id
        assert result.status == "planning"
        assert result.capacity_hours == 80.0
        assert result.capacity_story_points == 20
        assert result.actual_velocity_hours == 0.0
        assert result.actual_velocity_story_points == 0

        # Verify node creation was called
        mock_graph_service.create_node.assert_called_once()
        call_args = mock_graph_service.create_node.call_args
        assert call_args[0][0] == "Sprint"
        assert call_args[0][1]["name"] == sample_sprint_data.name

    @pytest.mark.asyncio
    async def test_create_sprint_with_active_sprint_fails(
        self,
        sprint_service,
        mock_graph_service,
        sample_sprint_data,
        mock_user
    ):
        """Test that creating a sprint fails if there's already an active sprint"""
        # Mock existing active sprint
        existing_sprint = {
            "id": str(uuid4()),
            "name": "Active Sprint",
            "status": "active",
            "project_id": str(sample_sprint_data.project_id),
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "created_at": datetime.now(UTC).isoformat(),
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0
        }
        mock_graph_service.execute_query.return_value = [existing_sprint]

        with pytest.raises(ValueError, match="already has an active sprint"):
            await sprint_service.create_sprint(sample_sprint_data, mock_user)

        # Verify node creation was NOT called
        mock_graph_service.create_node.assert_not_called()


class TestGetSprint:
    """Tests for get_sprint method"""

    @pytest.mark.asyncio
    async def test_get_sprint_success(self, sprint_service, mock_graph_service):
        """Test successful sprint retrieval"""
        sprint_id = uuid4()
        sprint_data = {
            "id": str(sprint_id),
            "name": "Sprint 1",
            "goal": "Complete user authentication feature",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "planning",
            "project_id": str(uuid4()),
            "capacity_hours": 80.0,
            "capacity_story_points": 20,
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat()
        }
        mock_graph_service.execute_query.return_value = [sprint_data]

        result = await sprint_service.get_sprint(sprint_id)

        assert result is not None
        assert result.id == sprint_id
        assert result.name == "Sprint 1"
        assert result.status == "planning"

    @pytest.mark.asyncio
    async def test_get_sprint_not_found(self, sprint_service, mock_graph_service):
        """Test sprint not found"""
        mock_graph_service.execute_query.return_value = []

        result = await sprint_service.get_sprint(uuid4())

        assert result is None


class TestUpdateSprint:
    """Tests for update_sprint method"""

    @pytest.mark.asyncio
    async def test_update_sprint_success(
        self,
        sprint_service,
        mock_graph_service,
        mock_user
    ):
        """Test successful sprint update"""
        sprint_id = uuid4()
        
        # Mock get_sprint to return existing sprint
        existing_sprint_data = {
            "id": str(sprint_id),
            "name": "Sprint 1",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "planning",
            "project_id": str(uuid4()),
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        # Mock update query result
        updated_sprint_data = existing_sprint_data.copy()
        updated_sprint_data["name"] = "Sprint 1 Updated"
        
        mock_graph_service.execute_query.side_effect = [
            [existing_sprint_data],  # get_sprint call
            [updated_sprint_data]     # update call
        ]

        updates = SprintUpdate(name="Sprint 1 Updated")
        result = await sprint_service.update_sprint(sprint_id, updates, mock_user)

        assert result is not None
        assert result.name == "Sprint 1 Updated"

    @pytest.mark.asyncio
    async def test_update_sprint_not_found(
        self,
        sprint_service,
        mock_graph_service,
        mock_user
    ):
        """Test updating non-existent sprint"""
        mock_graph_service.execute_query.return_value = []

        updates = SprintUpdate(name="Updated Name")
        result = await sprint_service.update_sprint(uuid4(), updates, mock_user)

        assert result is None

    @pytest.mark.asyncio
    async def test_update_sprint_to_active_with_existing_active_sprint_fails(
        self,
        sprint_service,
        mock_graph_service,
        mock_user
    ):
        """Test that updating sprint status to active fails if another sprint is already active"""
        sprint_id = uuid4()
        project_id = uuid4()
        
        # Mock existing sprint (planning status)
        existing_sprint_data = {
            "id": str(sprint_id),
            "name": "Sprint 2",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "planning",
            "project_id": str(project_id),
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        # Mock existing active sprint
        active_sprint_data = {
            "id": str(uuid4()),
            "name": "Sprint 1",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "active",
            "project_id": str(project_id),
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        mock_graph_service.execute_query.side_effect = [
            [existing_sprint_data],  # get_sprint call
            [active_sprint_data]     # list_sprints call (active sprint exists)
        ]

        updates = SprintUpdate(status="active")
        
        with pytest.raises(ValueError, match="already has an active sprint"):
            await sprint_service.update_sprint(sprint_id, updates, mock_user)

    @pytest.mark.asyncio
    async def test_update_sprint_to_active_without_existing_active_sprint_succeeds(
        self,
        sprint_service,
        mock_graph_service,
        mock_user
    ):
        """Test that updating sprint status to active succeeds if no other sprint is active"""
        sprint_id = uuid4()
        project_id = uuid4()
        
        # Mock existing sprint (planning status)
        existing_sprint_data = {
            "id": str(sprint_id),
            "name": "Sprint 1",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "planning",
            "project_id": str(project_id),
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        # Mock updated sprint
        updated_sprint_data = existing_sprint_data.copy()
        updated_sprint_data["status"] = "active"
        
        mock_graph_service.execute_query.side_effect = [
            [existing_sprint_data],  # get_sprint call
            [],                      # list_sprints call (no active sprints)
            [updated_sprint_data]    # update call
        ]

        updates = SprintUpdate(status="active")
        result = await sprint_service.update_sprint(sprint_id, updates, mock_user)

        assert result is not None
        assert result.status == "active"


class TestDeleteSprint:
    """Tests for delete_sprint method"""

    @pytest.mark.asyncio
    async def test_delete_sprint_success(self, sprint_service, mock_graph_service):
        """Test successful sprint deletion"""
        sprint_id = uuid4()
        project_id = uuid4()
        
        # Mock get_sprint
        sprint_data = {
            "id": str(sprint_id),
            "name": "Sprint 1",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "planning",
            "project_id": str(project_id),
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        # Mock tasks query
        task_data = [{"task_id": str(uuid4())}, {"task_id": str(uuid4())}]
        
        mock_graph_service.execute_query.side_effect = [
            [sprint_data],  # get_sprint
            task_data,      # get tasks
            []              # delete sprint
        ]

        result = await sprint_service.delete_sprint(sprint_id)

        assert result is True
        # Verify remove_task_from_sprint was called for each task
        assert mock_graph_service.remove_task_from_sprint.call_count == 2

    @pytest.mark.asyncio
    async def test_delete_sprint_not_found(self, sprint_service, mock_graph_service):
        """Test deleting non-existent sprint"""
        mock_graph_service.execute_query.return_value = []

        result = await sprint_service.delete_sprint(uuid4())

        assert result is False


class TestListSprints:
    """Tests for list_sprints method"""

    @pytest.mark.asyncio
    async def test_list_sprints_all(self, sprint_service, mock_graph_service):
        """Test listing all sprints"""
        sprint1_data = {
            "id": str(uuid4()),
            "name": "Sprint 1",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "completed",
            "project_id": str(uuid4()),
            "actual_velocity_hours": 40.0,
            "actual_velocity_story_points": 10,
            "created_at": datetime.now(UTC).isoformat()
        }
        sprint2_data = {
            "id": str(uuid4()),
            "name": "Sprint 2",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "active",
            "project_id": str(uuid4()),
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        mock_graph_service.execute_query.return_value = [sprint1_data, sprint2_data]

        result = await sprint_service.list_sprints()

        assert len(result) == 2
        assert result[0].name == "Sprint 1"
        assert result[1].name == "Sprint 2"

    @pytest.mark.asyncio
    async def test_list_sprints_filtered_by_project(
        self,
        sprint_service,
        mock_graph_service
    ):
        """Test listing sprints filtered by project"""
        project_id = uuid4()
        sprint_data = {
            "id": str(uuid4()),
            "name": "Sprint 1",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "active",
            "project_id": str(project_id),
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        mock_graph_service.execute_query.return_value = [sprint_data]

        result = await sprint_service.list_sprints(project_id=project_id)

        assert len(result) == 1
        assert result[0].project_id == project_id


class TestCalculateSprintCapacity:
    """Tests for calculate_sprint_capacity method"""

    @pytest.mark.asyncio
    async def test_calculate_capacity_with_resources(
        self,
        sprint_service,
        mock_graph_service
    ):
        """Test capacity calculation with allocated resources"""
        sprint_id = uuid4()
        project_id = uuid4()
        
        # Mock sprint data (14 day sprint)
        sprint_data = {
            "id": str(sprint_id),
            "name": "Sprint 1",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "planning",
            "project_id": str(project_id),
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        # Mock resources (2 resources at 100% allocation)
        resource_data = [
            {"r": {"properties": {}}, "allocation_percentage": 100.0},
            {"r": {"properties": {}}, "allocation_percentage": 100.0}
        ]
        
        mock_graph_service.execute_query.side_effect = [
            [sprint_data],    # get_sprint
            resource_data     # get resources
        ]

        capacity_hours, capacity_points = await sprint_service.calculate_sprint_capacity(sprint_id)

        # 2 resources * 14 days * 8 hours/day = 224 hours
        assert capacity_hours == 224.0
        # 224 hours / 8 hours per point = 28 points
        assert capacity_points == 28


class TestAssignTaskToSprint:
    """Tests for assign_task_to_sprint method"""

    @pytest.mark.asyncio
    async def test_assign_task_success(
        self,
        sprint_service,
        mock_graph_service,
        mock_user
    ):
        """Test successful task assignment"""
        sprint_id = uuid4()
        task_id = uuid4()
        project_id = uuid4()
        
        # Mock sprint data
        sprint_data = {
            "id": str(sprint_id),
            "name": "Sprint 1",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "active",
            "project_id": str(project_id),
            "capacity_hours": 80.0,
            "capacity_story_points": 20,
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        # Mock task data
        task_data = {
            "estimated_hours": 8.0,
            "story_points": 2
        }
        
        # Mock current workload
        workload_data = {
            "total_hours": 40.0,
            "total_points": 10
        }
        
        mock_graph_service.execute_query.side_effect = [
            [sprint_data],     # get_sprint
            [task_data],       # get task
            [workload_data]    # get workload
        ]

        result = await sprint_service.assign_task_to_sprint(sprint_id, task_id, mock_user)

        assert result is True
        mock_graph_service.move_task_to_sprint.assert_called_once()

    @pytest.mark.asyncio
    async def test_assign_task_exceeds_capacity(
        self,
        sprint_service,
        mock_graph_service,
        mock_user
    ):
        """Test task assignment that exceeds capacity"""
        sprint_id = uuid4()
        task_id = uuid4()
        project_id = uuid4()
        
        # Mock sprint with limited capacity
        sprint_data = {
            "id": str(sprint_id),
            "name": "Sprint 1",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "active",
            "project_id": str(project_id),
            "capacity_hours": 50.0,
            "capacity_story_points": 10,
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        # Mock task that would exceed capacity
        task_data = {
            "estimated_hours": 20.0,
            "story_points": 5
        }
        
        # Mock current workload near capacity
        workload_data = {
            "total_hours": 40.0,
            "total_points": 8
        }
        
        mock_graph_service.execute_query.side_effect = [
            [sprint_data],     # get_sprint
            [task_data],       # get task
            [workload_data]    # get workload
        ]

        with pytest.raises(ValueError, match="exceed sprint capacity"):
            await sprint_service.assign_task_to_sprint(sprint_id, task_id, mock_user)


class TestStartSprint:
    """Tests for start_sprint method"""

    @pytest.mark.asyncio
    async def test_start_sprint_success(
        self,
        sprint_service,
        mock_graph_service,
        mock_user
    ):
        """Test successful sprint start"""
        sprint_id = uuid4()
        project_id = uuid4()
        
        # Mock sprint data
        sprint_data = {
            "id": str(sprint_id),
            "name": "Sprint 1",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "planning",
            "project_id": str(project_id),
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        # Mock updated sprint
        updated_sprint_data = sprint_data.copy()
        updated_sprint_data["status"] = "active"
        
        mock_graph_service.execute_query.side_effect = [
            [sprint_data],          # get_sprint in start_sprint
            [],                     # list_sprints (no active sprints)
            [sprint_data],          # get_sprint in update_sprint
            [],                     # list_sprints in update_sprint (no active sprints)
            [updated_sprint_data]   # update query
        ]

        result = await sprint_service.start_sprint(sprint_id, mock_user)

        assert result is not None
        assert result.status == "active"


class TestCompleteSprint:
    """Tests for complete_sprint method"""

    @pytest.mark.asyncio
    async def test_complete_sprint_success(
        self,
        sprint_service,
        mock_graph_service,
        mock_user
    ):
        """Test successful sprint completion"""
        sprint_id = uuid4()
        project_id = uuid4()
        
        # Mock sprint data
        sprint_data = {
            "id": str(sprint_id),
            "name": "Sprint 1",
            "start_date": datetime.now(UTC).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
            "status": "active",
            "project_id": str(project_id),
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        # Mock completed tasks
        completed_tasks = [
            {"estimated_hours": 8.0, "story_points": 2},
            {"estimated_hours": 16.0, "story_points": 4}
        ]
        
        # Mock updated sprint
        updated_sprint_data = sprint_data.copy()
        updated_sprint_data["status"] = "completed"
        updated_sprint_data["actual_velocity_hours"] = 24.0
        updated_sprint_data["actual_velocity_story_points"] = 6
        
        mock_graph_service.execute_query.side_effect = [
            [sprint_data],          # get_sprint in complete_sprint
            completed_tasks,        # calculate_sprint_velocity
            [sprint_data],          # get_sprint in update_sprint
            [updated_sprint_data]   # update query
        ]

        result = await sprint_service.complete_sprint(sprint_id, mock_user)

        assert result is not None
        assert result.status == "completed"
        assert result.actual_velocity_hours == 24.0
        assert result.actual_velocity_story_points == 6


class TestCalculateSprintVelocity:
    """Tests for calculate_sprint_velocity method"""

    @pytest.mark.asyncio
    async def test_calculate_velocity_with_completed_tasks(
        self,
        sprint_service,
        mock_graph_service
    ):
        """Test velocity calculation with completed tasks"""
        sprint_id = uuid4()
        
        # Mock completed tasks
        completed_tasks = [
            {"estimated_hours": 8.0, "story_points": 2},
            {"estimated_hours": 16.0, "story_points": 4},
            {"estimated_hours": 12.0, "story_points": 3}
        ]
        
        mock_graph_service.execute_query.return_value = completed_tasks

        velocity_hours, velocity_points = await sprint_service.calculate_sprint_velocity(sprint_id)

        assert velocity_hours == 36.0
        assert velocity_points == 9

    @pytest.mark.asyncio
    async def test_calculate_velocity_no_completed_tasks(
        self,
        sprint_service,
        mock_graph_service
    ):
        """Test velocity calculation with no completed tasks"""
        sprint_id = uuid4()
        
        mock_graph_service.execute_query.return_value = []

        velocity_hours, velocity_points = await sprint_service.calculate_sprint_velocity(sprint_id)

        assert velocity_hours == 0.0
        assert velocity_points == 0


class TestGetTeamAverageVelocity:
    """Tests for get_team_average_velocity method"""

    @pytest.mark.asyncio
    async def test_average_velocity_multiple_sprints(
        self,
        sprint_service,
        mock_graph_service
    ):
        """Test average velocity calculation across multiple sprints"""
        project_id = uuid4()
        
        # Mock completed sprints
        completed_sprints = [
            {"velocity_hours": 40.0, "velocity_points": 10},
            {"velocity_hours": 48.0, "velocity_points": 12},
            {"velocity_hours": 36.0, "velocity_points": 9}
        ]
        
        mock_graph_service.execute_query.return_value = completed_sprints

        avg_hours, avg_points = await sprint_service.get_team_average_velocity(project_id, 3)

        assert avg_hours == 41.333333333333336  # (40 + 48 + 36) / 3
        assert avg_points == 10.333333333333334  # (10 + 12 + 9) / 3

    @pytest.mark.asyncio
    async def test_average_velocity_no_sprints(
        self,
        sprint_service,
        mock_graph_service
    ):
        """Test average velocity with no completed sprints"""
        project_id = uuid4()
        
        mock_graph_service.execute_query.return_value = []

        avg_hours, avg_points = await sprint_service.get_team_average_velocity(project_id, 3)

        assert avg_hours == 0.0
        assert avg_points == 0.0

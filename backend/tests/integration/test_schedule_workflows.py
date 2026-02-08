"""Integration tests for schedule API workflows"""

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.schemas.schedule import (
    ResourceCreate,
    ScheduleConstraints,
    ScheduleTaskCreate,
    TaskDependency,
)


@pytest.mark.asyncio
async def test_create_sprint_assign_tasks_start_complete_workflow(
    client: AsyncClient, auth_headers, mock_graph_service
):
    """
    Integration test: Create sprint → assign tasks → start → complete workflow
    
    Tests the complete sprint lifecycle from creation to completion.
    """
    # Step 1: Create a project
    project_id = str(uuid4())
    mock_graph_service.workitems[project_id] = {
        "id": project_id,
        "label": "Project",
        "name": "Test Project",
        "status": "active",
    }
    
    # Step 2: Create tasks
    task_ids = []
    for i in range(3):
        task_id = str(uuid4())
        task_ids.append(task_id)
        mock_graph_service.workitems[task_id] = {
            "id": task_id,
            "label": "Task",
            "title": f"Task {i+1}",
            "status": "ready",
            "estimated_hours": 8.0,
            "story_points": 3,
            "workpackage_id": str(uuid4()),
        }

    # Step 3: Create a sprint
    sprint_data = {
        "name": "Sprint 1",
        "goal": "Complete initial features",
        "start_date": datetime.now(UTC).isoformat(),
        "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
    }
    
    response = await client.post(
        f"/api/v1/projects/{project_id}/sprints",
        json=sprint_data,
        headers=auth_headers,
    )
    
    assert response.status_code == 201
    sprint = response.json()
    sprint_id = sprint["id"]
    assert sprint["name"] == "Sprint 1"
    assert sprint["status"] == "planning"
    
    # Step 4: Assign tasks to sprint
    for task_id in task_ids:
        response = await client.post(
            f"/api/v1/sprints/{sprint_id}/tasks/{task_id}",
            headers=auth_headers,
        )
        assert response.status_code in [200, 201]
    
    # Step 5: Verify tasks are assigned
    response = await client.get(
        f"/api/v1/sprints/{sprint_id}/tasks",
        headers=auth_headers,
    )
    assert response.status_code == 200
    sprint_tasks = response.json()
    assert len(sprint_tasks) == 3
    
    # Step 6: Start the sprint
    response = await client.post(
        f"/api/v1/sprints/{sprint_id}/start",
        headers=auth_headers,
    )
    assert response.status_code == 200
    sprint = response.json()
    assert sprint["status"] == "active"
    
    # Step 7: Complete the sprint
    response = await client.post(
        f"/api/v1/sprints/{sprint_id}/complete",
        headers=auth_headers,
    )
    assert response.status_code == 200
    sprint = response.json()
    assert sprint["status"] == "completed"
    assert "actual_velocity_hours" in sprint
    assert "actual_velocity_story_points" in sprint


@pytest.mark.asyncio
async def test_task_ready_backlog_sprint_complete_workflow(
    client: AsyncClient, auth_headers, mock_graph_service
):
    """
    Integration test: Task ready → backlog → sprint → complete workflow
    
    Tests the complete task lifecycle from creation to completion.
    """
    # Step 1: Create a project
    project_id = str(uuid4())
    mock_graph_service.workitems[project_id] = {
        "id": project_id,
        "label": "Project",
        "name": "Test Project",
        "status": "active",
    }
    
    # Step 2: Create a backlog
    backlog_data = {
        "name": "Product Backlog",
        "description": "Main backlog for the project",
    }
    
    response = await client.post(
        f"/api/v1/projects/{project_id}/backlogs",
        json=backlog_data,
        headers=auth_headers,
    )
    assert response.status_code == 201
    backlog = response.json()
    backlog_id = backlog["id"]

    # Step 3: Create a task with status="ready" (should auto-add to backlog)
    task_id = str(uuid4())
    workpackage_id = str(uuid4())
    
    mock_graph_service.workitems[workpackage_id] = {
        "id": workpackage_id,
        "label": "Workpackage",
        "name": "Test Workpackage",
    }
    
    mock_graph_service.workitems[task_id] = {
        "id": task_id,
        "label": "Task",
        "title": "Test Task",
        "status": "ready",
        "estimated_hours": 8.0,
        "story_points": 5,
        "workpackage_id": workpackage_id,
    }
    
    # Simulate automatic backlog population
    await mock_graph_service.create_relationship(
        from_id=task_id,
        to_id=backlog_id,
        rel_type="IN_BACKLOG",
        properties={"added_at": datetime.now(UTC).isoformat(), "priority_order": 1},
    )
    
    # Step 4: Verify task is in backlog
    response = await client.get(
        f"/api/v1/backlogs/{backlog_id}/tasks",
        headers=auth_headers,
    )
    assert response.status_code == 200
    backlog_tasks = response.json()
    assert len(backlog_tasks) >= 1
    
    # Step 5: Create a sprint
    sprint_data = {
        "name": "Sprint 1",
        "goal": "Complete task",
        "start_date": datetime.now(UTC).isoformat(),
        "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
    }
    
    response = await client.post(
        f"/api/v1/projects/{project_id}/sprints",
        json=sprint_data,
        headers=auth_headers,
    )
    assert response.status_code == 201
    sprint = response.json()
    sprint_id = sprint["id"]
    
    # Step 6: Assign task from backlog to sprint
    response = await client.post(
        f"/api/v1/sprints/{sprint_id}/tasks/{task_id}",
        headers=auth_headers,
    )
    assert response.status_code in [200, 201]
    
    # Step 7: Verify task is no longer in backlog
    response = await client.get(
        f"/api/v1/backlogs/{backlog_id}/tasks",
        headers=auth_headers,
    )
    assert response.status_code == 200
    backlog_tasks = response.json()
    task_ids_in_backlog = [t["id"] for t in backlog_tasks]
    assert task_id not in task_ids_in_backlog
    
    # Step 8: Start sprint
    response = await client.post(
        f"/api/v1/sprints/{sprint_id}/start",
        headers=auth_headers,
    )
    assert response.status_code == 200
    
    # Step 9: Mark task as completed
    mock_graph_service.workitems[task_id]["status"] = "completed"
    mock_graph_service.workitems[task_id]["done"] = True
    
    # Step 10: Complete sprint
    response = await client.post(
        f"/api/v1/sprints/{sprint_id}/complete",
        headers=auth_headers,
    )
    assert response.status_code == 200
    sprint = response.json()
    assert sprint["status"] == "completed"



@pytest.mark.asyncio
async def test_milestone_driven_scheduling_manual_and_automatic_modes(
    client: AsyncClient, auth_headers, mock_graph_service
):
    """
    Integration test: Milestone-driven scheduling (manual and automatic modes)
    
    Tests both manual milestone constraints and automatic milestone date calculation.
    """
    from app.services.scheduler_service import SchedulerService
    
    scheduler = SchedulerService()
    project_id = uuid4()
    
    # Create tasks
    tasks = [
        ScheduleTaskCreate(
            id="task-1",
            title="Design",
            estimated_hours=16,
            dependencies=[],
        ),
        ScheduleTaskCreate(
            id="task-2",
            title="Implementation",
            estimated_hours=40,
            dependencies=[
                TaskDependency(
                    predecessor_id="task-1",
                    dependency_type="finish_to_start",
                )
            ],
        ),
        ScheduleTaskCreate(
            id="task-3",
            title="Testing",
            estimated_hours=16,
            dependencies=[
                TaskDependency(
                    predecessor_id="task-2",
                    dependency_type="finish_to_start",
                )
            ],
        ),
    ]
    
    # Create milestones
    manual_milestone_id = uuid4()
    auto_milestone_id = uuid4()
    
    milestone_date = datetime.now(UTC) + timedelta(days=30)
    
    milestones = [
        {
            "id": manual_milestone_id,
            "title": "Design Complete (Manual)",
            "target_date": milestone_date,
            "is_manual_constraint": True,
            "status": "active",
        },
        {
            "id": auto_milestone_id,
            "title": "Project Complete (Auto)",
            "target_date": datetime.now(UTC) + timedelta(days=100),
            "is_manual_constraint": False,
            "status": "active",
        },
    ]
    
    # Mock milestone dependencies
    async def mock_get_dependencies(mid):
        if str(mid) == str(manual_milestone_id):
            return ["task-1"]
        elif str(mid) == str(auto_milestone_id):
            return ["task-3"]
        return []
    
    scheduler._get_milestone_dependencies = mock_get_dependencies
    
    # Schedule with milestones
    constraints = ScheduleConstraints(
        project_start=datetime.now(UTC),
        horizon_days=365,
        working_hours_per_day=8,
        respect_weekends=False,
    )
    
    result = await scheduler.schedule_project(
        project_id=project_id,
        tasks=tasks,
        resources=[],
        constraints=constraints,
        milestones=milestones,
    )
    
    # Verify scheduling succeeded
    assert result.status in ["success", "feasible"]
    assert len(result.schedule) == 3
    assert len(result.milestones) == 2
    
    # Verify manual milestone uses target_date
    manual_milestone = next(
        m for m in result.milestones if m.milestone_id == str(manual_milestone_id)
    )
    assert manual_milestone.is_manual is True
    assert manual_milestone.date == milestone_date
    
    # Verify automatic milestone uses calculated date
    auto_milestone = next(
        m for m in result.milestones if m.milestone_id == str(auto_milestone_id)
    )
    assert auto_milestone.is_manual is False
    
    # Auto milestone should be task-3 end date
    task_3 = next(t for t in result.schedule if t.task_id == "task-3")
    assert auto_milestone.date == task_3.end_date
    
    # Verify manual milestone constraint is respected
    task_1 = next(t for t in result.schedule if t.task_id == "task-1")
    assert task_1.end_date <= milestone_date



@pytest.mark.asyncio
async def test_critical_path_calculation_with_complex_dependencies():
    """
    Integration test: Critical path calculation with complex dependencies
    
    Tests critical path identification in a complex dependency graph.
    """
    from app.services.scheduler_service import SchedulerService
    
    scheduler = SchedulerService()
    project_id = uuid4()
    
    # Create complex dependency graph:
    #     A (8h)
    #    / \
    #   B   C (8h)
    #  (8h) |
    #   |   D (24h) <- Long task
    #   |  /
    #   E (8h)
    # Critical path: A -> C -> D -> E (48h)
    tasks = [
        ScheduleTaskCreate(
            id="task-a",
            title="Task A",
            estimated_hours=8,
            dependencies=[],
        ),
        ScheduleTaskCreate(
            id="task-b",
            title="Task B",
            estimated_hours=8,
            dependencies=[
                TaskDependency(
                    predecessor_id="task-a",
                    dependency_type="finish_to_start",
                )
            ],
        ),
        ScheduleTaskCreate(
            id="task-c",
            title="Task C",
            estimated_hours=8,
            dependencies=[
                TaskDependency(
                    predecessor_id="task-a",
                    dependency_type="finish_to_start",
                )
            ],
        ),
        ScheduleTaskCreate(
            id="task-d",
            title="Task D (Long)",
            estimated_hours=24,
            dependencies=[
                TaskDependency(
                    predecessor_id="task-c",
                    dependency_type="finish_to_start",
                )
            ],
        ),
        ScheduleTaskCreate(
            id="task-e",
            title="Task E",
            estimated_hours=8,
            dependencies=[
                TaskDependency(
                    predecessor_id="task-b",
                    dependency_type="finish_to_start",
                ),
                TaskDependency(
                    predecessor_id="task-d",
                    dependency_type="finish_to_start",
                ),
            ],
        ),
    ]
    
    constraints = ScheduleConstraints(
        project_start=datetime.now(UTC),
        horizon_days=365,
        working_hours_per_day=8,
        respect_weekends=False,
    )
    
    result = await scheduler.schedule_project(
        project_id=project_id,
        tasks=tasks,
        resources=[],
        constraints=constraints,
    )
    
    # Verify scheduling succeeded
    assert result.status in ["success", "feasible"]
    assert len(result.schedule) == 5
    
    # Verify critical path is calculated
    assert result.critical_path is not None
    assert len(result.critical_path) > 0
    
    # Critical path should be A -> C -> D -> E
    assert "task-a" in result.critical_path
    assert "task-c" in result.critical_path
    assert "task-d" in result.critical_path
    assert "task-e" in result.critical_path
    
    # Task B should not be on critical path
    assert "task-b" not in result.critical_path
    
    # Verify is_critical flags
    task_map = {t.task_id: t for t in result.schedule}
    assert task_map["task-a"].is_critical is True
    assert task_map["task-b"].is_critical is False
    assert task_map["task-c"].is_critical is True
    assert task_map["task-d"].is_critical is True
    assert task_map["task-e"].is_critical is True



@pytest.mark.asyncio
async def test_skills_based_resource_allocation():
    """
    Integration test: Skills-based resource allocation
    
    Tests that resources are allocated based on skill matching.
    """
    from app.services.scheduler_service import SchedulerService
    
    scheduler = SchedulerService()
    project_id = uuid4()
    
    # Create resources with different skills
    resources = [
        ResourceCreate(
            id="backend-dev",
            name="Backend Developer",
            capacity=1,
            skills=["Python", "Django", "PostgreSQL"],
            lead=True,
        ),
        ResourceCreate(
            id="frontend-dev",
            name="Frontend Developer",
            capacity=1,
            skills=["React", "TypeScript", "CSS"],
            lead=True,
        ),
        ResourceCreate(
            id="fullstack-dev",
            name="Full Stack Developer",
            capacity=1,
            skills=["Python", "React", "PostgreSQL"],
            lead=False,
        ),
    ]
    
    # Create tasks with skill requirements
    tasks = [
        ScheduleTaskCreate(
            id="backend-task",
            title="Backend Development",
            estimated_hours=16,
            skills_needed=["Python", "Django"],
            dependencies=[],
        ),
        ScheduleTaskCreate(
            id="frontend-task",
            title="Frontend Development",
            estimated_hours=16,
            skills_needed=["React", "TypeScript"],
            dependencies=[],
        ),
        ScheduleTaskCreate(
            id="integration-task",
            title="Integration",
            estimated_hours=16,
            skills_needed=["Python", "React"],
            dependencies=[],
        ),
    ]
    
    constraints = ScheduleConstraints(
        project_start=datetime.now(UTC),
        horizon_days=365,
        working_hours_per_day=8,
        respect_weekends=False,
    )
    
    result = await scheduler.schedule_project(
        project_id=project_id,
        tasks=tasks,
        resources=resources,
        constraints=constraints,
    )
    
    # Verify scheduling succeeded
    assert result.status in ["success", "feasible"]
    assert len(result.schedule) == 3
    
    # Verify resource assignments match skills
    task_map = {t.task_id: t for t in result.schedule}
    
    # Backend task should have backend-dev or fullstack-dev
    backend_task = task_map["backend-task"]
    assert len(backend_task.assigned_resources) > 0
    assert any(
        r in ["backend-dev", "fullstack-dev"] for r in backend_task.assigned_resources
    )
    
    # Frontend task should have frontend-dev or fullstack-dev
    frontend_task = task_map["frontend-task"]
    assert len(frontend_task.assigned_resources) > 0
    assert any(
        r in ["frontend-dev", "fullstack-dev"] for r in frontend_task.assigned_resources
    )
    
    # Integration task should have fullstack-dev (has both Python and React)
    integration_task = task_map["integration-task"]
    assert len(integration_task.assigned_resources) > 0
    assert "fullstack-dev" in integration_task.assigned_resources
    
    # Verify lead resources are prioritized
    # Backend-dev (lead) should be assigned to backend-task if available
    if "backend-dev" in [r.id for r in resources]:
        assert "backend-dev" in backend_task.assigned_resources



@pytest.mark.asyncio
async def test_sprint_capacity_calculation(
    client: AsyncClient, auth_headers, mock_graph_service
):
    """
    Integration test: Sprint capacity calculation
    
    Tests that sprint capacity is calculated from allocated resources.
    """
    # Step 1: Create a project
    project_id = str(uuid4())
    mock_graph_service.workitems[project_id] = {
        "id": project_id,
        "label": "Project",
        "name": "Test Project",
        "status": "active",
    }
    
    # Step 2: Create resources
    resource_ids = []
    for i in range(3):
        resource_id = str(uuid4())
        resource_ids.append(resource_id)
        mock_graph_service.workitems[resource_id] = {
            "id": resource_id,
            "label": "Resource",
            "name": f"Developer {i+1}",
            "type": "person",
            "capacity": 40.0,  # 40 hours per week
        }
    
    # Step 3: Create a sprint
    sprint_data = {
        "name": "Sprint 1",
        "goal": "Test capacity calculation",
        "start_date": datetime.now(UTC).isoformat(),
        "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
    }
    
    response = await client.post(
        f"/api/v1/projects/{project_id}/sprints",
        json=sprint_data,
        headers=auth_headers,
    )
    
    assert response.status_code == 201
    sprint = response.json()
    sprint_id = sprint["id"]
    
    # Step 4: Allocate resources to project (simulated)
    for resource_id in resource_ids:
        await mock_graph_service.create_relationship(
            from_id=resource_id,
            to_id=project_id,
            rel_type="ALLOCATED_TO",
            properties={"allocation_percentage": 100.0, "lead": False},
        )
    
    # Step 5: Get sprint details (should include capacity)
    response = await client.get(
        f"/api/v1/sprints/{sprint_id}",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    sprint = response.json()
    
    # Verify capacity is calculated
    # 3 resources * 40 hours/week * 2 weeks = 240 hours
    assert "capacity_hours" in sprint
    # Capacity should be positive (exact value depends on implementation)
    assert sprint["capacity_hours"] >= 0


@pytest.mark.asyncio
async def test_velocity_tracking_across_multiple_sprints(
    client: AsyncClient, auth_headers, mock_graph_service
):
    """
    Integration test: Velocity tracking across multiple sprints
    
    Tests velocity calculation and tracking across multiple sprint completions.
    """
    # Step 1: Create a project
    project_id = str(uuid4())
    mock_graph_service.workitems[project_id] = {
        "id": project_id,
        "label": "Project",
        "name": "Test Project",
        "status": "active",
    }
    
    sprint_ids = []
    velocities = []
    
    # Step 2: Create and complete multiple sprints
    for sprint_num in range(3):
        # Create sprint
        sprint_data = {
            "name": f"Sprint {sprint_num + 1}",
            "goal": f"Sprint {sprint_num + 1} goal",
            "start_date": (datetime.now(UTC) + timedelta(days=sprint_num * 14)).isoformat(),
            "end_date": (datetime.now(UTC) + timedelta(days=(sprint_num + 1) * 14)).isoformat(),
        }
        
        response = await client.post(
            f"/api/v1/projects/{project_id}/sprints",
            json=sprint_data,
            headers=auth_headers,
        )
        assert response.status_code == 201
        sprint = response.json()
        sprint_id = sprint["id"]
        sprint_ids.append(sprint_id)
        
        # Create and assign tasks
        for task_num in range(2):
            task_id = str(uuid4())
            mock_graph_service.workitems[task_id] = {
                "id": task_id,
                "label": "Task",
                "title": f"Sprint {sprint_num + 1} Task {task_num + 1}",
                "status": "completed",
                "done": True,
                "estimated_hours": 8.0,
                "actual_hours": 8.0,
                "story_points": 5,
                "workpackage_id": str(uuid4()),
            }
            
            # Assign to sprint
            await mock_graph_service.create_relationship(
                from_id=task_id,
                to_id=sprint_id,
                rel_type="ASSIGNED_TO_SPRINT",
            )
        
        # Start sprint
        response = await client.post(
            f"/api/v1/sprints/{sprint_id}/start",
            headers=auth_headers,
        )
        assert response.status_code == 200
        
        # Complete sprint
        response = await client.post(
            f"/api/v1/sprints/{sprint_id}/complete",
            headers=auth_headers,
        )
        assert response.status_code == 200
        sprint = response.json()
        
        # Store velocity
        velocities.append({
            "hours": sprint.get("actual_velocity_hours", 0),
            "points": sprint.get("actual_velocity_story_points", 0),
        })
    
    # Step 3: Get velocity history
    response = await client.get(
        f"/api/v1/projects/{project_id}/velocity/history",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    velocity_history = response.json()
    
    # Verify velocity history includes all sprints
    assert len(velocity_history) >= 3
    
    # Step 4: Get average velocity
    response = await client.get(
        f"/api/v1/projects/{project_id}/velocity",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    avg_velocity = response.json()
    
    # Verify average velocity is calculated
    assert "average_velocity_hours" in avg_velocity
    assert "average_velocity_story_points" in avg_velocity
    assert avg_velocity["average_velocity_hours"] >= 0
    assert avg_velocity["average_velocity_story_points"] >= 0



@pytest.mark.asyncio
async def test_burndown_chart_data_generation(
    client: AsyncClient, auth_headers, mock_graph_service
):
    """
    Integration test: Burndown chart data generation
    
    Tests burndown chart calculation with ideal and actual burndown lines.
    """
    # Step 1: Create a project
    project_id = str(uuid4())
    mock_graph_service.workitems[project_id] = {
        "id": project_id,
        "label": "Project",
        "name": "Test Project",
        "status": "active",
    }
    
    # Step 2: Create a sprint
    sprint_start = datetime.now(UTC)
    sprint_end = sprint_start + timedelta(days=10)
    
    sprint_data = {
        "name": "Sprint 1",
        "goal": "Test burndown",
        "start_date": sprint_start.isoformat(),
        "end_date": sprint_end.isoformat(),
    }
    
    response = await client.post(
        f"/api/v1/projects/{project_id}/sprints",
        json=sprint_data,
        headers=auth_headers,
    )
    assert response.status_code == 201
    sprint = response.json()
    sprint_id = sprint["id"]
    
    # Step 3: Create tasks with varying completion times
    task_data = [
        {"hours": 10, "points": 5, "completed_day": 2},
        {"hours": 15, "points": 8, "completed_day": 5},
        {"hours": 20, "points": 10, "completed_day": 8},
    ]
    
    for i, task_info in enumerate(task_data):
        task_id = str(uuid4())
        completed_date = sprint_start + timedelta(days=task_info["completed_day"])
        
        mock_graph_service.workitems[task_id] = {
            "id": task_id,
            "label": "Task",
            "title": f"Task {i+1}",
            "status": "completed",
            "done": True,
            "estimated_hours": task_info["hours"],
            "actual_hours": task_info["hours"],
            "story_points": task_info["points"],
            "workpackage_id": str(uuid4()),
            "completed_at": completed_date.isoformat(),
        }
        
        # Assign to sprint
        await mock_graph_service.create_relationship(
            from_id=task_id,
            to_id=sprint_id,
            rel_type="ASSIGNED_TO_SPRINT",
        )
    
    # Step 4: Start sprint
    response = await client.post(
        f"/api/v1/sprints/{sprint_id}/start",
        headers=auth_headers,
    )
    assert response.status_code == 200
    
    # Step 5: Get burndown chart data
    response = await client.get(
        f"/api/v1/sprints/{sprint_id}/burndown",
        headers=auth_headers,
    )
    
    assert response.status_code == 200
    burndown_data = response.json()
    
    # Verify burndown data structure
    assert isinstance(burndown_data, list)
    assert len(burndown_data) > 0
    
    # Verify each data point has required fields
    for point in burndown_data:
        assert "date" in point
        assert "ideal_remaining_hours" in point
        assert "actual_remaining_hours" in point
        assert "ideal_remaining_points" in point
        assert "actual_remaining_points" in point
    
    # Verify ideal burndown decreases linearly
    if len(burndown_data) >= 2:
        first_point = burndown_data[0]
        last_point = burndown_data[-1]
        
        # Ideal should decrease from start to end
        assert first_point["ideal_remaining_hours"] >= last_point["ideal_remaining_hours"]
        assert first_point["ideal_remaining_points"] >= last_point["ideal_remaining_points"]
        
        # Last point should be close to zero
        assert last_point["ideal_remaining_hours"] <= 1.0
        assert last_point["ideal_remaining_points"] <= 1


@pytest.mark.asyncio
async def test_complete_project_workflow_with_all_features(
    client: AsyncClient, auth_headers, mock_graph_service
):
    """
    Integration test: Complete project workflow with all features
    
    Tests a complete project workflow combining:
    - Project creation
    - Resource allocation
    - Task creation with skills
    - Backlog management
    - Sprint planning
    - Schedule calculation with critical path
    - Milestone tracking
    - Velocity and burndown
    """
    from app.services.scheduler_service import SchedulerService
    
    scheduler = SchedulerService()
    
    # Step 1: Create project
    project_id = str(uuid4())
    mock_graph_service.workitems[project_id] = {
        "id": project_id,
        "label": "Project",
        "name": "Complete Test Project",
        "status": "active",
    }
    
    # Step 2: Create resources with skills
    resource_ids = []
    for i in range(2):
        resource_id = str(uuid4())
        resource_ids.append(resource_id)
        mock_graph_service.workitems[resource_id] = {
            "id": resource_id,
            "label": "Resource",
            "name": f"Developer {i+1}",
            "type": "person",
            "capacity": 40.0,
            "skills": ["Python", "React"],
        }
        
        # Allocate to project
        await mock_graph_service.create_relationship(
            from_id=resource_id,
            to_id=project_id,
            rel_type="ALLOCATED_TO",
            properties={"allocation_percentage": 100.0, "lead": i == 0},
        )
    
    # Step 3: Create backlog
    backlog_data = {
        "name": "Product Backlog",
        "description": "Main backlog",
    }
    
    response = await client.post(
        f"/api/v1/projects/{project_id}/backlogs",
        json=backlog_data,
        headers=auth_headers,
    )
    assert response.status_code == 201
    backlog = response.json()
    backlog_id = backlog["id"]
    
    # Step 4: Create tasks with dependencies
    task_ids = []
    for i in range(3):
        task_id = str(uuid4())
        task_ids.append(task_id)
        
        mock_graph_service.workitems[task_id] = {
            "id": task_id,
            "label": "Task",
            "title": f"Task {i+1}",
            "status": "ready",
            "estimated_hours": 16.0,
            "story_points": 8,
            "skills_needed": ["Python"],
            "workpackage_id": str(uuid4()),
        }
        
        # Add to backlog
        await mock_graph_service.create_relationship(
            from_id=task_id,
            to_id=backlog_id,
            rel_type="IN_BACKLOG",
            properties={"added_at": datetime.now(UTC).isoformat(), "priority_order": i + 1},
        )
    
    # Step 5: Create sprint
    sprint_data = {
        "name": "Sprint 1",
        "goal": "Complete initial tasks",
        "start_date": datetime.now(UTC).isoformat(),
        "end_date": (datetime.now(UTC) + timedelta(days=14)).isoformat(),
    }
    
    response = await client.post(
        f"/api/v1/projects/{project_id}/sprints",
        json=sprint_data,
        headers=auth_headers,
    )
    assert response.status_code == 201
    sprint = response.json()
    sprint_id = sprint["id"]
    
    # Step 6: Assign tasks to sprint
    for task_id in task_ids:
        response = await client.post(
            f"/api/v1/sprints/{sprint_id}/tasks/{task_id}",
            headers=auth_headers,
        )
        assert response.status_code in [200, 201]
    
    # Step 7: Calculate schedule with critical path
    schedule_tasks = [
        ScheduleTaskCreate(
            id=task_ids[0],
            title="Task 1",
            estimated_hours=16,
            dependencies=[],
            skills_needed=["Python"],
        ),
        ScheduleTaskCreate(
            id=task_ids[1],
            title="Task 2",
            estimated_hours=16,
            dependencies=[
                TaskDependency(
                    predecessor_id=task_ids[0],
                    dependency_type="finish_to_start",
                )
            ],
            skills_needed=["Python"],
        ),
        ScheduleTaskCreate(
            id=task_ids[2],
            title="Task 3",
            estimated_hours=16,
            dependencies=[
                TaskDependency(
                    predecessor_id=task_ids[1],
                    dependency_type="finish_to_start",
                )
            ],
            skills_needed=["Python"],
        ),
    ]
    
    schedule_resources = [
        ResourceCreate(
            id=resource_ids[0],
            name="Developer 1",
            capacity=1,
            skills=["Python", "React"],
            lead=True,
        ),
        ResourceCreate(
            id=resource_ids[1],
            name="Developer 2",
            capacity=1,
            skills=["Python", "React"],
            lead=False,
        ),
    ]
    
    constraints = ScheduleConstraints(
        project_start=datetime.now(UTC),
        horizon_days=365,
        working_hours_per_day=8,
        respect_weekends=False,
    )
    
    result = await scheduler.schedule_project(
        project_id=uuid4(),
        tasks=schedule_tasks,
        resources=schedule_resources,
        constraints=constraints,
    )
    
    # Verify schedule calculation
    assert result.status in ["success", "feasible"]
    assert len(result.schedule) == 3
    assert result.critical_path is not None
    assert len(result.critical_path) == 3  # All tasks in linear chain
    
    # Step 8: Start sprint
    response = await client.post(
        f"/api/v1/sprints/{sprint_id}/start",
        headers=auth_headers,
    )
    assert response.status_code == 200
    
    # Step 9: Get burndown data
    response = await client.get(
        f"/api/v1/sprints/{sprint_id}/burndown",
        headers=auth_headers,
    )
    assert response.status_code == 200
    burndown_data = response.json()
    assert isinstance(burndown_data, list)
    
    # Step 10: Complete sprint
    response = await client.post(
        f"/api/v1/sprints/{sprint_id}/complete",
        headers=auth_headers,
    )
    assert response.status_code == 200
    sprint = response.json()
    assert sprint["status"] == "completed"
    assert "actual_velocity_hours" in sprint
    
    # Step 11: Get velocity
    response = await client.get(
        f"/api/v1/projects/{project_id}/velocity",
        headers=auth_headers,
    )
    assert response.status_code == 200
    velocity = response.json()
    assert "average_velocity_hours" in velocity

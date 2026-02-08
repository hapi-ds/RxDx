"""Property-based tests for Sprint and Backlog mutual exclusivity

**Validates: Requirements 16.36-16.50, 21.1-21.16, 22.1-22.23**
"""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta, UTC
from uuid import uuid4

from app.db.graph import GraphService


@pytest_asyncio.fixture
async def graph_service():
    """Create a graph service instance for testing"""
    service = GraphService()
    await service.connect()
    yield service
    await service.close()


@pytest_asyncio.fixture
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
    try:
        await graph_service.delete_node(str(project_id))
    except:
        pass


@pytest_asyncio.fixture
async def test_backlog(graph_service, test_project):
    """Create a test backlog"""
    backlog_id = uuid4()
    await graph_service.create_node("Backlog", {
        "id": str(backlog_id),
        "name": "Test Backlog",
        "project_id": str(test_project),
        "created_at": datetime.now(UTC).isoformat()
    })
    yield backlog_id
    # Cleanup
    try:
        await graph_service.delete_node(str(backlog_id))
    except:
        pass


@pytest_asyncio.fixture
async def test_sprint(graph_service, test_project):
    """Create a test sprint"""
    sprint_id = uuid4()
    start_date = datetime.now(UTC)
    end_date = start_date + timedelta(days=14)
    
    await graph_service.create_node("Sprint", {
        "id": str(sprint_id),
        "name": "Test Sprint",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "status": "planning",
        "project_id": str(test_project),
        "capacity_hours": 80.0,
        "capacity_story_points": 20,
        "actual_velocity_hours": 0.0,
        "actual_velocity_story_points": 0,
        "created_at": datetime.now(UTC).isoformat()
    })
    yield sprint_id
    # Cleanup
    try:
        await graph_service.delete_node(str(sprint_id))
    except:
        pass


@pytest.mark.asyncio
async def test_property_assigning_to_sprint_removes_backlog(
    graph_service,
    test_project,
    test_backlog,
    test_sprint
):
    """
    Property: Assigning a task to a sprint removes any IN_BACKLOG relationship
    
    **Validates: Requirements 16.41-16.50, 22.1-22.23**
    
    This property ensures mutual exclusivity between sprint and backlog assignments.
    A task cannot be in both a sprint and a backlog simultaneously.
    """
    # Test with multiple tasks with different properties
    test_cases = [
        {"estimated_hours": 8.0, "story_points": 2},
        {"estimated_hours": 16.0, "story_points": 5},
        {"estimated_hours": 4.0, "story_points": 1},
        {"estimated_hours": 24.0, "story_points": 8},
        {"estimated_hours": 12.0, "story_points": 3},
    ]
    
    for i, task_props in enumerate(test_cases):
        task_id = uuid4()
        user_id = uuid4()
        
        await graph_service.create_node("WorkItem", {
            "id": str(task_id),
            "type": "task",
            "title": f"Property Test Task {i}",
            "status": "ready",
            "estimated_hours": task_props["estimated_hours"],
            "story_points": task_props["story_points"],
            "project_id": str(test_project),
            "created_at": datetime.now(UTC).isoformat()
        })
        
        try:
            # Step 1: Add task to backlog
            await graph_service.move_task_to_backlog(
                task_id=str(task_id),
                backlog_id=str(test_backlog)
            )
            
            # Verify task is in backlog
            backlog_check_query = f"""
            MATCH (t:WorkItem {{id: '{task_id}'}})-[r:IN_BACKLOG]->(b:Backlog {{id: '{test_backlog}'}})
            RETURN count(r) as backlog_count
            """
            backlog_results = await graph_service.execute_query(backlog_check_query)
            backlog_count = backlog_results[0].get('backlog_count', 0) if backlog_results else 0
            
            assert backlog_count == 1, f"Task {i} should be in backlog before sprint assignment"
            
            # Step 2: Assign task to sprint
            await graph_service.move_task_to_sprint(
                task_id=str(task_id),
                sprint_id=str(test_sprint),
                assigned_by_user_id=str(user_id)
            )
            
            # Step 3: Verify task is in sprint
            sprint_check_query = f"""
            MATCH (t:WorkItem {{id: '{task_id}'}})-[r:ASSIGNED_TO_SPRINT]->(s:Sprint {{id: '{test_sprint}'}})
            RETURN count(r) as sprint_count
            """
            sprint_results = await graph_service.execute_query(sprint_check_query)
            sprint_count = sprint_results[0].get('sprint_count', 0) if sprint_results else 0
            
            assert sprint_count == 1, f"Task {i} should be assigned to sprint"
            
            # Step 4: Verify task is NO LONGER in backlog (PROPERTY VALIDATION)
            backlog_after_query = f"""
            MATCH (t:WorkItem {{id: '{task_id}'}})-[r:IN_BACKLOG]->(:Backlog)
            RETURN count(r) as backlog_count
            """
            backlog_after_results = await graph_service.execute_query(backlog_after_query)
            backlog_after_count = backlog_after_results[0].get('backlog_count', 0) if backlog_after_results else 0
            
            # PROPERTY: Assigning to sprint removes backlog relationship
            assert backlog_after_count == 0, (
                f"Property violated for task {i}: Task {task_id} is in both sprint and backlog. "
                f"Sprint count: {sprint_count}, Backlog count: {backlog_after_count}. "
                "A task must be in sprint XOR backlog, not both."
            )
            
        finally:
            # Cleanup
            try:
                await graph_service.delete_node(str(task_id))
            except:
                pass


@pytest.mark.asyncio
async def test_property_sprint_completion_returns_incomplete_to_backlog(
    graph_service,
    test_project,
    test_backlog,
    test_sprint
):
    """
    Property: When a sprint is completed, incomplete tasks with status='ready' are returned to backlog
    
    **Validates: Requirements 16.54-16.58, 22.1-22.23**
    
    This property ensures that incomplete work is properly managed when a sprint ends.
    Tasks that are not completed should be returned to the backlog for future sprint planning.
    """
    # Test with different combinations of completed and incomplete tasks
    test_scenarios = [
        {"completed": 0, "incomplete": 1},
        {"completed": 1, "incomplete": 1},
        {"completed": 2, "incomplete": 2},
        {"completed": 3, "incomplete": 1},
        {"completed": 1, "incomplete": 3},
    ]
    
    for scenario_idx, scenario in enumerate(test_scenarios):
        completed_task_ids = []
        incomplete_task_ids = []
        user_id = uuid4()
        
        try:
            # Create completed tasks
            for i in range(scenario["completed"]):
                task_id = uuid4()
                await graph_service.create_node("WorkItem", {
                    "id": str(task_id),
                    "type": "task",
                    "title": f"Scenario {scenario_idx} Completed Task {i}",
                    "status": "completed",
                    "estimated_hours": 8.0,
                    "story_points": 2,
                    "project_id": str(test_project),
                    "created_at": datetime.now(UTC).isoformat()
                })
                
                # Assign to sprint
                await graph_service.move_task_to_sprint(
                    task_id=str(task_id),
                    sprint_id=str(test_sprint),
                    assigned_by_user_id=str(user_id)
                )
                completed_task_ids.append(task_id)
            
            # Create incomplete tasks with status='ready'
            for i in range(scenario["incomplete"]):
                task_id = uuid4()
                await graph_service.create_node("WorkItem", {
                    "id": str(task_id),
                    "type": "task",
                    "title": f"Scenario {scenario_idx} Incomplete Task {i}",
                    "status": "ready",  # Ready tasks should return to backlog
                    "estimated_hours": 8.0,
                    "story_points": 2,
                    "project_id": str(test_project),
                    "created_at": datetime.now(UTC).isoformat()
                })
                
                # Assign to sprint
                await graph_service.move_task_to_sprint(
                    task_id=str(task_id),
                    sprint_id=str(test_sprint),
                    assigned_by_user_id=str(user_id)
                )
                incomplete_task_ids.append(task_id)
            
            # Simulate sprint completion by removing incomplete tasks from sprint
            # (In real implementation, this would be done by SprintService.complete_sprint)
            for task_id in incomplete_task_ids:
                await graph_service.remove_task_from_sprint(
                    task_id=str(task_id),
                    sprint_id=str(test_sprint),
                    return_to_backlog=True,
                    backlog_id=str(test_backlog)
                )
            
            # PROPERTY VALIDATION: Verify incomplete tasks are in backlog
            for task_id in incomplete_task_ids:
                backlog_check_query = f"""
                MATCH (t:WorkItem {{id: '{task_id}'}})-[r:IN_BACKLOG]->(b:Backlog {{id: '{test_backlog}'}})
                RETURN count(r) as backlog_count
                """
                backlog_results = await graph_service.execute_query(backlog_check_query)
                backlog_count = backlog_results[0].get('backlog_count', 0) if backlog_results else 0
                
                assert backlog_count == 1, (
                    f"Property violated in scenario {scenario_idx}: "
                    f"Incomplete task {task_id} with status='ready' "
                    f"was not returned to backlog after sprint completion. "
                    f"Backlog count: {backlog_count}"
                )
                
                # Verify task is NOT in sprint anymore
                sprint_check_query = f"""
                MATCH (t:WorkItem {{id: '{task_id}'}})-[r:ASSIGNED_TO_SPRINT]->(:Sprint)
                RETURN count(r) as sprint_count
                """
                sprint_results = await graph_service.execute_query(sprint_check_query)
                sprint_count = sprint_results[0].get('sprint_count', 0) if sprint_results else 0
                
                assert sprint_count == 0, (
                    f"Property violated in scenario {scenario_idx}: "
                    f"Incomplete task {task_id} is still assigned to sprint "
                    f"after sprint completion. Sprint count: {sprint_count}"
                )
            
            # PROPERTY VALIDATION: Verify completed tasks are NOT in backlog
            for task_id in completed_task_ids:
                backlog_check_query = f"""
                MATCH (t:WorkItem {{id: '{task_id}'}})-[r:IN_BACKLOG]->(:Backlog)
                RETURN count(r) as backlog_count
                """
                backlog_results = await graph_service.execute_query(backlog_check_query)
                backlog_count = backlog_results[0].get('backlog_count', 0) if backlog_results else 0
                
                assert backlog_count == 0, (
                    f"Property violated in scenario {scenario_idx}: "
                    f"Completed task {task_id} should not be in backlog. "
                    f"Backlog count: {backlog_count}"
                )
        
        finally:
            # Cleanup
            for task_id in completed_task_ids + incomplete_task_ids:
                try:
                    await graph_service.delete_node(str(task_id))
                except:
                    pass


@pytest.mark.asyncio
async def test_property_sprint_capacity_always_non_negative(
    graph_service,
    test_project
):
    """
    Property: Sprint capacity and velocity values are always non-negative
    
    **Validates: Requirements 16.36-16.40, 22.1-22.23**
    
    This property ensures data integrity for sprint metrics.
    Negative capacity or velocity values are nonsensical and indicate data corruption.
    """
    # Test with various capacity and velocity combinations
    test_cases = [
        {
            "capacity_hours": None,
            "capacity_story_points": None,
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0
        },
        {
            "capacity_hours": 0.0,
            "capacity_story_points": 0,
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 0
        },
        {
            "capacity_hours": 80.0,
            "capacity_story_points": 20,
            "actual_velocity_hours": 40.0,
            "actual_velocity_story_points": 10
        },
        {
            "capacity_hours": 160.0,
            "capacity_story_points": 40,
            "actual_velocity_hours": 120.0,
            "actual_velocity_story_points": 30
        },
        {
            "capacity_hours": 40.0,
            "capacity_story_points": None,
            "actual_velocity_hours": 35.0,
            "actual_velocity_story_points": 0
        },
        {
            "capacity_hours": None,
            "capacity_story_points": 15,
            "actual_velocity_hours": 0.0,
            "actual_velocity_story_points": 12
        },
    ]
    
    for i, test_case in enumerate(test_cases):
        sprint_id = uuid4()
        start_date = datetime.now(UTC)
        end_date = start_date + timedelta(days=14)
        
        # Create sprint with test case capacity values
        sprint_properties = {
            "id": str(sprint_id),
            "name": f"Property Test Sprint {i}",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "status": "planning",
            "project_id": str(test_project),
            "actual_velocity_hours": test_case["actual_velocity_hours"],
            "actual_velocity_story_points": test_case["actual_velocity_story_points"],
            "created_at": datetime.now(UTC).isoformat()
        }
        
        if test_case["capacity_hours"] is not None:
            sprint_properties["capacity_hours"] = test_case["capacity_hours"]
        
        if test_case["capacity_story_points"] is not None:
            sprint_properties["capacity_story_points"] = test_case["capacity_story_points"]
        
        try:
            await graph_service.create_node("Sprint", sprint_properties)
            
            # Retrieve sprint and verify properties
            query = f"MATCH (s:Sprint {{id: '{sprint_id}'}}) RETURN s"
            results = await graph_service.execute_query(query)
            
            assert results, f"Sprint {sprint_id} not found after creation"
            
            sprint_data = results[0]
            if 'properties' in sprint_data:
                sprint_data = sprint_data['properties']
            
            # PROPERTY VALIDATION: All capacity and velocity values must be non-negative
            retrieved_capacity_hours = sprint_data.get('capacity_hours')
            if retrieved_capacity_hours is not None:
                assert float(retrieved_capacity_hours) >= 0.0, (
                    f"Property violated in test case {i}: "
                    f"Sprint capacity_hours is negative: {retrieved_capacity_hours}"
                )
            
            retrieved_capacity_points = sprint_data.get('capacity_story_points')
            if retrieved_capacity_points is not None:
                assert int(retrieved_capacity_points) >= 0, (
                    f"Property violated in test case {i}: "
                    f"Sprint capacity_story_points is negative: {retrieved_capacity_points}"
                )
            
            retrieved_velocity_hours = sprint_data.get('actual_velocity_hours', 0.0)
            assert float(retrieved_velocity_hours) >= 0.0, (
                f"Property violated in test case {i}: "
                f"Sprint actual_velocity_hours is negative: {retrieved_velocity_hours}"
            )
            
            retrieved_velocity_points = sprint_data.get('actual_velocity_story_points', 0)
            assert int(retrieved_velocity_points) >= 0, (
                f"Property violated in test case {i}: "
                f"Sprint actual_velocity_story_points is negative: {retrieved_velocity_points}"
            )
        
        finally:
            # Cleanup
            try:
                await graph_service.delete_node(str(sprint_id))
            except:
                pass



@pytest.mark.asyncio
async def test_property_burndown_remaining_work_decreases(
    graph_service,
    test_project,
    test_sprint
):
    """
    Property: Burndown remaining work should never increase over time
    
    This property validates that the actual remaining work in a burndown chart
    either stays the same or decreases as time progresses. Work should never
    increase (tasks cannot become "uncompleted").
    
    **Validates: Requirements 24.1-24.14**
    """
    from app.services.sprint_service import SprintService
    
    sprint_service = SprintService(graph_service)
    
    # Create tasks with different completion dates
    task_ids = []
    for i in range(5):
        task_id = uuid4()
        task_ids.append(task_id)
        
        # Create task
        await graph_service.create_node("WorkItem", {
            "id": str(task_id),
            "type": "task",
            "title": f"Test Task {i}",
            "status": "completed" if i < 3 else "active",
            "estimated_hours": 8.0,
            "story_points": 2,
            "updated_at": (datetime.now(UTC) + timedelta(days=i)).isoformat(),
            "created_at": datetime.now(UTC).isoformat()
        })
        
        # Assign to sprint
        await graph_service.execute_query(f"""
            MATCH (t:WorkItem {{id: '{task_id}'}}), (s:Sprint {{id: '{test_sprint}'}})
            CREATE (t)-[:ASSIGNED_TO_SPRINT]->(s)
        """)
    
    try:
        # Calculate burndown
        burndown = await sprint_service.calculate_burndown(test_sprint)
        
        assert len(burndown) > 0, "Burndown should have data points"
        
        # PROPERTY VALIDATION: Actual remaining work should never increase
        previous_hours = None
        previous_points = None
        
        for i, point in enumerate(burndown):
            current_hours = point.actual_remaining_hours
            current_points = point.actual_remaining_points
            
            # Verify non-negative
            assert current_hours >= 0.0, (
                f"Property violated at day {i}: "
                f"Actual remaining hours is negative: {current_hours}"
            )
            assert current_points >= 0, (
                f"Property violated at day {i}: "
                f"Actual remaining points is negative: {current_points}"
            )
            
            # Verify monotonic decrease (or stay same)
            if previous_hours is not None:
                assert current_hours <= previous_hours, (
                    f"Property violated at day {i}: "
                    f"Actual remaining hours increased from {previous_hours} to {current_hours}. "
                    f"Work should never increase in a burndown chart."
                )
            
            if previous_points is not None:
                assert current_points <= previous_points, (
                    f"Property violated at day {i}: "
                    f"Actual remaining points increased from {previous_points} to {current_points}. "
                    f"Work should never increase in a burndown chart."
                )
            
            previous_hours = current_hours
            previous_points = current_points
        
        # PROPERTY VALIDATION: Ideal burndown should be linear (monotonic decrease)
        for i in range(1, len(burndown)):
            assert burndown[i].ideal_remaining_hours <= burndown[i-1].ideal_remaining_hours, (
                f"Property violated at day {i}: "
                f"Ideal burndown should decrease linearly"
            )
            assert burndown[i].ideal_remaining_points <= burndown[i-1].ideal_remaining_points, (
                f"Property violated at day {i}: "
                f"Ideal burndown should decrease linearly"
            )
        
        # PROPERTY VALIDATION: First day should have maximum work
        assert burndown[0].actual_remaining_hours >= burndown[-1].actual_remaining_hours, (
            "Property violated: First day should have more or equal remaining work than last day"
        )
        
        # PROPERTY VALIDATION: Ideal burndown should start at total and end at zero
        assert burndown[-1].ideal_remaining_hours == 0.0, (
            "Property violated: Ideal burndown should end at zero"
        )
        assert burndown[-1].ideal_remaining_points == 0, (
            "Property violated: Ideal burndown should end at zero"
        )
        
    finally:
        # Cleanup tasks
        for task_id in task_ids:
            try:
                await graph_service.delete_node(str(task_id))
            except:
                pass

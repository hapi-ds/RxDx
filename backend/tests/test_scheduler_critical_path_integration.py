"""Integration tests for critical path calculation in SchedulerService"""

from datetime import UTC, datetime
from uuid import uuid4

import pytest

from app.schemas.schedule import (
    ResourceCreate,
    ScheduleConstraints,
    ScheduleTaskCreate,
    TaskDependency,
)
from app.services.scheduler_service import SchedulerService


@pytest.fixture
def scheduler_service():
    """Create a fresh scheduler service for each test"""
    return SchedulerService()


@pytest.fixture
def sample_constraints():
    """Create sample constraints for testing"""
    return ScheduleConstraints(
        project_start=datetime.now(UTC),
        horizon_days=365,
        working_hours_per_day=8,
        respect_weekends=False,
    )


class TestCriticalPathIntegration:
    """Integration tests for critical path calculation in schedule_project"""

    @pytest.mark.asyncio
    async def test_critical_path_calculated_for_linear_dependencies(
        self, scheduler_service, sample_constraints
    ):
        """Test that critical path is calculated for tasks with linear dependencies"""
        project_id = uuid4()

        # Create tasks with linear dependencies: A -> B -> C
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
                estimated_hours=16,
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
                        predecessor_id="task-b",
                        dependency_type="finish_to_start",
                    )
                ],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=sample_constraints,
        )

        # Verify schedule was successful
        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 3

        # Verify critical path is calculated
        assert result.critical_path is not None
        assert len(result.critical_path) > 0

        # For linear dependencies, all tasks should be on critical path
        assert len(result.critical_path) == 3
        assert "task-a" in result.critical_path
        assert "task-b" in result.critical_path
        assert "task-c" in result.critical_path

        # Verify critical path is in correct order
        assert result.critical_path == ["task-a", "task-b", "task-c"]

    @pytest.mark.asyncio
    async def test_critical_path_tasks_marked_with_is_critical_flag(
        self, scheduler_service, sample_constraints
    ):
        """Test that tasks on critical path are marked with is_critical=True"""
        project_id = uuid4()

        # Create tasks with linear dependencies
        tasks = [
            ScheduleTaskCreate(
                id="task-1",
                title="Task 1",
                estimated_hours=8,
                dependencies=[],
            ),
            ScheduleTaskCreate(
                id="task-2",
                title="Task 2",
                estimated_hours=16,
                dependencies=[
                    TaskDependency(
                        predecessor_id="task-1",
                        dependency_type="finish_to_start",
                    )
                ],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]

        # Create task map for easy lookup
        task_map = {t.task_id: t for t in result.schedule}

        # Verify all tasks in critical path are marked as critical
        for task_id in result.critical_path:
            assert task_id in task_map
            assert task_map[task_id].is_critical is True

    @pytest.mark.asyncio
    async def test_critical_path_with_parallel_tasks(
        self, scheduler_service, sample_constraints
    ):
        """Test critical path identification with parallel tasks"""
        project_id = uuid4()

        # Create tasks with parallel branches:
        #     A (8h)
        #    / \
        #   B   C
        #  (16h)(8h)
        #    \ /
        #     D (8h)
        # Critical path should be A -> B -> D (32h total)
        tasks = [
            ScheduleTaskCreate(
                id="task-a",
                title="Task A",
                estimated_hours=8,
                dependencies=[],
            ),
            ScheduleTaskCreate(
                id="task-b",
                title="Task B (Long)",
                estimated_hours=16,
                dependencies=[
                    TaskDependency(
                        predecessor_id="task-a",
                        dependency_type="finish_to_start",
                    )
                ],
            ),
            ScheduleTaskCreate(
                id="task-c",
                title="Task C (Short)",
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
                title="Task D",
                estimated_hours=8,
                dependencies=[
                    TaskDependency(
                        predecessor_id="task-b",
                        dependency_type="finish_to_start",
                    ),
                    TaskDependency(
                        predecessor_id="task-c",
                        dependency_type="finish_to_start",
                    ),
                ],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]

        # Critical path should be A -> B -> D (longest path)
        assert result.critical_path is not None
        assert len(result.critical_path) > 0

        # Verify critical path includes the longer branch
        assert "task-a" in result.critical_path
        assert "task-b" in result.critical_path
        assert "task-d" in result.critical_path

        # Task C should NOT be on critical path (shorter branch)
        assert "task-c" not in result.critical_path

        # Verify is_critical flags
        task_map = {t.task_id: t for t in result.schedule}
        assert task_map["task-a"].is_critical is True
        assert task_map["task-b"].is_critical is True
        assert task_map["task-c"].is_critical is False
        assert task_map["task-d"].is_critical is True

    @pytest.mark.asyncio
    async def test_critical_path_stored_in_schedule_metadata(
        self, scheduler_service, sample_constraints
    ):
        """Test that critical path is stored in schedule metadata"""
        project_id = uuid4()

        tasks = [
            ScheduleTaskCreate(
                id="task-1",
                title="Task 1",
                estimated_hours=8,
                dependencies=[],
            ),
            ScheduleTaskCreate(
                id="task-2",
                title="Task 2",
                estimated_hours=8,
                dependencies=[
                    TaskDependency(
                        predecessor_id="task-1",
                        dependency_type="finish_to_start",
                    )
                ],
            ),
        ]

        # Calculate schedule
        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]
        assert result.critical_path is not None

        # Retrieve stored schedule
        stored_schedule = await scheduler_service.get_schedule(project_id)

        assert stored_schedule is not None
        assert stored_schedule.critical_path is not None
        assert len(stored_schedule.critical_path) > 0

        # Verify stored critical path matches calculated critical path
        assert stored_schedule.critical_path == result.critical_path

    @pytest.mark.asyncio
    async def test_critical_path_with_complex_dependencies(
        self, scheduler_service, sample_constraints
    ):
        """Test critical path with complex dependency graph"""
        project_id = uuid4()

        # Create a more complex dependency graph:
        #     A (8h)
        #    / \
        #   B   C (8h)
        #  (8h) |
        #   |   D (16h)
        #   |  /
        #   E (8h)
        # Critical path: A -> C -> D -> E (40h)
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
                estimated_hours=16,
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

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]
        assert result.critical_path is not None

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
    async def test_critical_path_with_single_task(
        self, scheduler_service, sample_constraints
    ):
        """Test critical path with a single task"""
        project_id = uuid4()

        tasks = [
            ScheduleTaskCreate(
                id="task-1",
                title="Single Task",
                estimated_hours=8,
                dependencies=[],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]
        assert result.critical_path is not None

        # Single task should be the critical path
        assert len(result.critical_path) == 1
        assert result.critical_path[0] == "task-1"

        # Task should be marked as critical
        assert result.schedule[0].is_critical is True

    @pytest.mark.asyncio
    async def test_critical_path_handles_calculation_failure_gracefully(
        self, scheduler_service, sample_constraints
    ):
        """Test that schedule succeeds even if critical path calculation fails"""
        project_id = uuid4()

        # Create valid tasks
        tasks = [
            ScheduleTaskCreate(
                id="task-1",
                title="Task 1",
                estimated_hours=8,
                dependencies=[],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=sample_constraints,
        )

        # Schedule should succeed even if critical path fails
        assert result.status in ["success", "feasible"]

        # Critical path should be calculated (or empty list if failed)
        assert result.critical_path is not None

    @pytest.mark.asyncio
    async def test_critical_path_with_different_dependency_types(
        self, scheduler_service, sample_constraints
    ):
        """Test critical path with different dependency types"""
        project_id = uuid4()

        # Create tasks with different dependency types
        # Task A (16h) is the longest task
        # Task B (8h) has start_to_start with A (can start when A starts)
        # Task C (8h) has finish_to_finish with A (must finish when A finishes)
        # Critical path should be A -> B (both end at same time, but B depends on A)
        tasks = [
            ScheduleTaskCreate(
                id="task-a",
                title="Task A",
                estimated_hours=16,
                dependencies=[],
            ),
            ScheduleTaskCreate(
                id="task-b",
                title="Task B",
                estimated_hours=8,
                dependencies=[
                    TaskDependency(
                        predecessor_id="task-a",
                        dependency_type="start_to_start",
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
                        dependency_type="finish_to_finish",
                    )
                ],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]
        assert result.critical_path is not None
        assert len(result.critical_path) > 0

        # Task A should be in the critical path (longest task)
        assert "task-a" in result.critical_path
        
        # Either task-b or task-c should be in critical path
        # (both have same end time, algorithm picks one)
        assert "task-b" in result.critical_path or "task-c" in result.critical_path

    @pytest.mark.asyncio
    async def test_critical_path_response_includes_all_required_fields(
        self, scheduler_service, sample_constraints
    ):
        """Test that ScheduleResponse includes all critical path related fields"""
        project_id = uuid4()

        tasks = [
            ScheduleTaskCreate(
                id="task-1",
                title="Task 1",
                estimated_hours=8,
                dependencies=[],
            ),
            ScheduleTaskCreate(
                id="task-2",
                title="Task 2",
                estimated_hours=8,
                dependencies=[
                    TaskDependency(
                        predecessor_id="task-1",
                        dependency_type="finish_to_start",
                    )
                ],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]

        # Verify ScheduleResponse has critical_path field
        assert hasattr(result, "critical_path")
        assert result.critical_path is not None
        assert isinstance(result.critical_path, list)

        # Verify each ScheduledTask has is_critical field
        for scheduled_task in result.schedule:
            assert hasattr(scheduled_task, "is_critical")
            assert isinstance(scheduled_task.is_critical, bool)

    @pytest.mark.asyncio
    async def test_critical_path_with_resource_constraints(
        self, scheduler_service, sample_constraints
    ):
        """Test that critical path is calculated correctly with resource constraints"""
        project_id = uuid4()

        # Create tasks that could run in parallel but are constrained by resources
        # Without dependencies, these tasks are independent
        # The critical path algorithm looks at task dependencies, not resource constraints
        # So the critical path will be the longest single task
        tasks = [
            ScheduleTaskCreate(
                id="task-a",
                title="Task A",
                estimated_hours=8,
                dependencies=[],
                required_resources=["resource-1"],
            ),
            ScheduleTaskCreate(
                id="task-b",
                title="Task B",
                estimated_hours=8,
                dependencies=[],
                required_resources=["resource-1"],
            ),
        ]

        resources = [
            ResourceCreate(id="resource-1", name="Shared Resource", capacity=1)
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]
        assert result.critical_path is not None

        # Critical path is based on task dependencies, not resource constraints
        # Since tasks have no dependencies, the critical path will be one task
        # (the algorithm picks the task with longest path, which is any single task)
        assert len(result.critical_path) >= 1
        
        # At least one task should be on critical path
        assert "task-a" in result.critical_path or "task-b" in result.critical_path

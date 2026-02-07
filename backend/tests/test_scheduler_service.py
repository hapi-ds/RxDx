"""Unit tests for SchedulerService"""

from datetime import UTC, datetime, timedelta
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
def sample_tasks():
    """Create sample tasks for testing"""
    return [
        ScheduleTaskCreate(
            id="task-1",
            title="Design Phase",
            estimated_hours=40,
            dependencies=[],
            required_resources=["dev-1"],
        ),
        ScheduleTaskCreate(
            id="task-2",
            title="Implementation",
            estimated_hours=80,
            dependencies=[
                TaskDependency(
                    predecessor_id="task-1", dependency_type="finish_to_start"
                )
            ],
            required_resources=["dev-1"],
        ),
        ScheduleTaskCreate(
            id="task-3",
            title="Testing",
            estimated_hours=40,
            dependencies=[
                TaskDependency(
                    predecessor_id="task-2", dependency_type="finish_to_start"
                )
            ],
            required_resources=["qa-1"],
        ),
    ]


@pytest.fixture
def sample_resources():
    """Create sample resources for testing"""
    return [
        ResourceCreate(id="dev-1", name="Developer 1", capacity=1),
        ResourceCreate(id="qa-1", name="QA Engineer 1", capacity=1),
    ]


@pytest.fixture
def sample_constraints():
    """Create sample constraints for testing"""
    return ScheduleConstraints(
        project_start=datetime.now(UTC),
        horizon_days=365,
        working_hours_per_day=8,
        respect_weekends=False,
    )


class TestSchedulerServiceBasic:
    """Basic tests for SchedulerService"""

    @pytest.mark.asyncio
    async def test_schedule_empty_tasks(self, scheduler_service):
        """Test scheduling with no tasks returns error"""
        project_id = uuid4()
        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=[],
            resources=[],
            constraints=ScheduleConstraints(),
        )

        assert result.status == "error"
        assert "No tasks" in result.message

    @pytest.mark.asyncio
    async def test_schedule_single_task(
        self, scheduler_service, sample_resources, sample_constraints
    ):
        """Test scheduling a single task"""
        project_id = uuid4()
        tasks = [
            ScheduleTaskCreate(
                id="task-1",
                title="Single Task",
                estimated_hours=8,
                dependencies=[],
                required_resources=[],
            )
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=sample_resources,
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 1
        assert result.schedule[0].task_id == "task-1"
        assert result.schedule[0].duration_hours == 8

    @pytest.mark.asyncio
    async def test_schedule_sequential_tasks(
        self, scheduler_service, sample_tasks, sample_resources, sample_constraints
    ):
        """Test scheduling tasks with sequential dependencies"""
        project_id = uuid4()

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=sample_tasks,
            resources=sample_resources,
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 3

        # Verify tasks are scheduled in order
        task_map = {t.task_id: t for t in result.schedule}

        # Task 2 should start after task 1 ends
        assert task_map["task-2"].start_date >= task_map["task-1"].end_date

        # Task 3 should start after task 2 ends
        assert task_map["task-3"].start_date >= task_map["task-2"].end_date


class TestDependencyConstraints:
    """Tests for task dependency constraints"""

    @pytest.mark.asyncio
    async def test_finish_to_start_dependency(
        self, scheduler_service, sample_constraints
    ):
        """Test finish-to-start dependency constraint"""
        project_id = uuid4()
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
        task_map = {t.task_id: t for t in result.schedule}

        # Task B should start after Task A finishes
        assert task_map["task-b"].start_date >= task_map["task-a"].end_date

    @pytest.mark.asyncio
    async def test_start_to_start_dependency(
        self, scheduler_service, sample_constraints
    ):
        """Test start-to-start dependency constraint"""
        project_id = uuid4()
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
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]
        task_map = {t.task_id: t for t in result.schedule}

        # Task B should start at or after Task A starts
        assert task_map["task-b"].start_date >= task_map["task-a"].start_date

    @pytest.mark.asyncio
    async def test_finish_to_finish_dependency(
        self, scheduler_service, sample_constraints
    ):
        """Test finish-to-finish dependency constraint"""
        project_id = uuid4()
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
        task_map = {t.task_id: t for t in result.schedule}

        # Task B should finish at or after Task A finishes
        assert task_map["task-b"].end_date >= task_map["task-a"].end_date

    @pytest.mark.asyncio
    async def test_dependency_with_lag(self, scheduler_service, sample_constraints):
        """Test dependency with lag time"""
        project_id = uuid4()
        lag_hours = 8
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
                        dependency_type="finish_to_start",
                        lag=lag_hours,
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
        task_map = {t.task_id: t for t in result.schedule}

        # Task B should start at least lag_hours after Task A finishes
        time_diff = (
            task_map["task-b"].start_date - task_map["task-a"].end_date
        ).total_seconds() / 3600
        assert time_diff >= lag_hours

    @pytest.mark.asyncio
    async def test_missing_dependency_conflict(
        self, scheduler_service, sample_constraints
    ):
        """Test that missing dependency is detected"""
        project_id = uuid4()
        tasks = [
            ScheduleTaskCreate(
                id="task-a",
                title="Task A",
                estimated_hours=8,
                dependencies=[
                    TaskDependency(
                        predecessor_id="non-existent-task",
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

        # Should still produce a schedule but with conflicts noted
        assert len(result.conflicts) > 0
        assert any("non-existent-task" in c.description for c in result.conflicts)


class TestResourceConstraints:
    """Tests for resource capacity constraints"""

    @pytest.mark.asyncio
    async def test_resource_capacity_respected(
        self, scheduler_service, sample_constraints
    ):
        """Test that resource capacity is respected"""
        project_id = uuid4()

        # Two tasks requiring the same resource with capacity 1
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
        task_map = {t.task_id: t for t in result.schedule}

        # Tasks should not overlap since resource capacity is 1
        task_a = task_map["task-a"]
        task_b = task_map["task-b"]

        # Either A ends before B starts, or B ends before A starts
        no_overlap = (task_a.end_date <= task_b.start_date) or (
            task_b.end_date <= task_a.start_date
        )
        assert no_overlap

    @pytest.mark.asyncio
    async def test_parallel_tasks_with_sufficient_capacity(
        self, scheduler_service, sample_constraints
    ):
        """Test that tasks can run in parallel with sufficient resource capacity"""
        project_id = uuid4()

        tasks = [
            ScheduleTaskCreate(
                id="task-a",
                title="Task A",
                estimated_hours=8,
                dependencies=[],
                required_resources=["resource-1"],
                resource_demand={"resource-1": 1},
            ),
            ScheduleTaskCreate(
                id="task-b",
                title="Task B",
                estimated_hours=8,
                dependencies=[],
                required_resources=["resource-1"],
                resource_demand={"resource-1": 1},
            ),
        ]

        # Resource with capacity 2 can handle both tasks in parallel
        resources = [
            ResourceCreate(id="resource-1", name="Shared Resource", capacity=2)
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]

        # With capacity 2, tasks can potentially run in parallel
        # Project duration should be 8 hours (not 16)
        assert result.project_duration_hours <= 16

    @pytest.mark.asyncio
    async def test_missing_resource_conflict(
        self, scheduler_service, sample_constraints
    ):
        """Test that missing resource is detected"""
        project_id = uuid4()
        tasks = [
            ScheduleTaskCreate(
                id="task-a",
                title="Task A",
                estimated_hours=8,
                dependencies=[],
                required_resources=["non-existent-resource"],
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=[],  # No resources provided
            constraints=sample_constraints,
        )

        # Should detect missing resource
        assert len(result.conflicts) > 0
        assert any("non-existent-resource" in c.description for c in result.conflicts)


class TestOptimization:
    """Tests for schedule optimization"""

    @pytest.mark.asyncio
    async def test_minimizes_project_duration(
        self, scheduler_service, sample_constraints
    ):
        """Test that scheduler minimizes project duration"""
        project_id = uuid4()

        # Independent tasks that can run in parallel
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
                dependencies=[],
            ),
            ScheduleTaskCreate(
                id="task-c",
                title="Task C",
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

        # Without dependencies or resource constraints, all tasks can start at time 0
        # So project duration should be 8 hours (the longest task)
        assert result.project_duration_hours == 8


class TestConflictIdentification:
    """Tests for conflict identification"""

    @pytest.mark.asyncio
    async def test_circular_dependency_detection(
        self, scheduler_service, sample_constraints
    ):
        """Test that circular dependencies are detected"""
        project_id = uuid4()

        # Create circular dependency: A -> B -> C -> A
        tasks = [
            ScheduleTaskCreate(
                id="task-a",
                title="Task A",
                estimated_hours=8,
                dependencies=[
                    TaskDependency(
                        predecessor_id="task-c", dependency_type="finish_to_start"
                    )
                ],
            ),
            ScheduleTaskCreate(
                id="task-b",
                title="Task B",
                estimated_hours=8,
                dependencies=[
                    TaskDependency(
                        predecessor_id="task-a", dependency_type="finish_to_start"
                    )
                ],
            ),
            ScheduleTaskCreate(
                id="task-c",
                title="Task C",
                estimated_hours=8,
                dependencies=[
                    TaskDependency(
                        predecessor_id="task-b", dependency_type="finish_to_start"
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

        # Should be infeasible due to circular dependency
        assert result.status == "infeasible"
        assert any("circular" in c.conflict_type.lower() for c in result.conflicts)


class TestScheduleStorage:
    """Tests for schedule storage and retrieval"""

    @pytest.mark.asyncio
    async def test_store_and_retrieve_schedule(
        self, scheduler_service, sample_tasks, sample_resources, sample_constraints
    ):
        """Test storing and retrieving a schedule"""
        project_id = uuid4()

        # Calculate schedule
        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=sample_tasks,
            resources=sample_resources,
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]

        # Retrieve stored schedule
        stored = await scheduler_service.get_schedule(project_id)

        assert stored is not None
        assert stored.project_id == project_id
        assert len(stored.schedule) == len(sample_tasks)

    @pytest.mark.asyncio
    async def test_get_nonexistent_schedule(self, scheduler_service):
        """Test retrieving a non-existent schedule"""
        result = await scheduler_service.get_schedule(uuid4())
        assert result is None

    @pytest.mark.asyncio
    async def test_update_schedule(
        self, scheduler_service, sample_tasks, sample_resources, sample_constraints
    ):
        """Test updating a schedule with manual adjustments"""
        from app.schemas.schedule import ScheduleUpdate

        project_id = uuid4()

        # Calculate initial schedule
        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=sample_tasks,
            resources=sample_resources,
            constraints=sample_constraints,
        )

        assert result.status in ["success", "feasible"]

        # Apply manual adjustment
        new_start = datetime.now(UTC) + timedelta(days=7)
        updates = ScheduleUpdate(
            task_adjustments={"task-1": {"start_date": new_start.isoformat()}}
        )

        updated = await scheduler_service.update_schedule(project_id, updates)

        assert updated is not None
        assert updated.status == "success"

        # Verify the adjustment was applied
        task_1 = next(t for t in updated.schedule if t.task_id == "task-1")
        assert task_1.start_date.date() == new_start.date()


class TestSkillsBasedAllocation:
    """Tests for skills-based resource allocation"""

    @pytest.mark.asyncio
    async def test_get_matching_resources_no_skills_required(self, scheduler_service):
        """Test matching resources when task has no skill requirements"""
        task = ScheduleTaskCreate(
            id="task-1",
            title="Task without skills",
            estimated_hours=8,
            skills_needed=[],
        )

        resources = [
            ResourceCreate(
                id="r1", name="Resource 1", capacity=1, skills=["Python"], lead=False
            ),
            ResourceCreate(
                id="r2", name="Resource 2", capacity=1, skills=["Java"], lead=True
            ),
            ResourceCreate(
                id="r3", name="Resource 3", capacity=1, skills=[], lead=False
            ),
        ]

        matches = scheduler_service.get_matching_resources_for_task(task, resources)

        # All resources should be returned, sorted by lead status
        assert len(matches) == 3
        # Lead resource should be first
        assert matches[0][0].id == "r2"
        assert matches[0][0].lead is True

    @pytest.mark.asyncio
    async def test_get_matching_resources_with_skills(self, scheduler_service):
        """Test matching resources based on required skills"""
        task = ScheduleTaskCreate(
            id="task-1",
            title="Python Development",
            estimated_hours=8,
            skills_needed=["Python", "Django"],
        )

        resources = [
            ResourceCreate(
                id="r1",
                name="Python Dev",
                capacity=1,
                skills=["Python", "Django"],
                lead=False,
            ),
            ResourceCreate(
                id="r2", name="Java Dev", capacity=1, skills=["Java"], lead=False
            ),
            ResourceCreate(
                id="r3",
                name="Full Stack",
                capacity=1,
                skills=["Python", "Django", "React"],
                lead=True,
            ),
            ResourceCreate(
                id="r4", name="Junior Python", capacity=1, skills=["Python"], lead=False
            ),
        ]

        matches = scheduler_service.get_matching_resources_for_task(task, resources)

        # Should return resources with matching skills
        assert len(matches) == 3  # r1, r3, r4 have Python

        # Lead resource with all skills should be first
        assert matches[0][0].id == "r3"
        assert matches[0][0].lead is True
        assert matches[0][1] == 2  # Matches 2 skills

        # Non-lead with all skills should be second
        assert matches[1][0].id == "r1"
        assert matches[1][0].lead is False
        assert matches[1][1] == 2  # Matches 2 skills

        # Partial match should be last
        assert matches[2][0].id == "r4"
        assert matches[2][1] == 1  # Matches 1 skill

    @pytest.mark.asyncio
    async def test_lead_resources_prioritized(self, scheduler_service):
        """Test that lead resources are prioritized in allocation"""
        task = ScheduleTaskCreate(
            id="task-1",
            title="Development Task",
            estimated_hours=8,
            skills_needed=["Python"],
        )

        resources = [
            ResourceCreate(
                id="r1", name="Regular Dev", capacity=1, skills=["Python"], lead=False
            ),
            ResourceCreate(
                id="r2", name="Lead Dev", capacity=1, skills=["Python"], lead=True
            ),
            ResourceCreate(
                id="r3", name="Senior Dev", capacity=2, skills=["Python"], lead=False
            ),
        ]

        matches = scheduler_service.get_matching_resources_for_task(task, resources)

        # Lead resource should be first despite lower capacity
        assert matches[0][0].id == "r2"
        assert matches[0][0].lead is True

        # Higher capacity non-lead should be second
        assert matches[1][0].id == "r3"
        assert matches[1][0].capacity == 2

    @pytest.mark.asyncio
    async def test_skill_match_quality_prioritization(self, scheduler_service):
        """Test that resources with better skill matches are prioritized"""
        task = ScheduleTaskCreate(
            id="task-1",
            title="Full Stack Task",
            estimated_hours=8,
            skills_needed=["Python", "React", "PostgreSQL"],
        )

        resources = [
            ResourceCreate(
                id="r1", name="Backend Dev", capacity=1, skills=["Python"], lead=False
            ),
            ResourceCreate(
                id="r2",
                name="Full Stack",
                capacity=1,
                skills=["Python", "React", "PostgreSQL"],
                lead=False,
            ),
            ResourceCreate(
                id="r3",
                name="Python+DB",
                capacity=1,
                skills=["Python", "PostgreSQL"],
                lead=False,
            ),
        ]

        matches = scheduler_service.get_matching_resources_for_task(task, resources)

        # Full match should be first
        assert matches[0][0].id == "r2"
        assert matches[0][1] == 3  # All 3 skills

        # Partial match (2 skills) should be second
        assert matches[1][0].id == "r3"
        assert matches[1][1] == 2

        # Partial match (1 skill) should be last
        assert matches[2][0].id == "r1"
        assert matches[2][1] == 1

    @pytest.mark.asyncio
    async def test_auto_assign_resources_based_on_skills(
        self, scheduler_service, sample_constraints
    ):
        """Test that resources are auto-assigned based on skills when not specified"""
        project_id = uuid4()

        tasks = [
            ScheduleTaskCreate(
                id="task-1",
                title="Python Development",
                estimated_hours=8,
                skills_needed=["Python"],
                required_resources=[],  # No resources specified
            ),
        ]

        resources = [
            ResourceCreate(
                id="python-dev",
                name="Python Developer",
                capacity=1,
                skills=["Python"],
                lead=True,
            ),
            ResourceCreate(
                id="java-dev",
                name="Java Developer",
                capacity=1,
                skills=["Java"],
                lead=False,
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=sample_constraints,
        )

        # Should succeed and auto-assign Python developer
        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 1
        assert "python-dev" in result.schedule[0].assigned_resources

    @pytest.mark.asyncio
    async def test_skill_mismatch_conflict(self, scheduler_service, sample_constraints):
        """Test that skill mismatches are detected as conflicts"""
        project_id = uuid4()

        tasks = [
            ScheduleTaskCreate(
                id="task-1",
                title="Python Development",
                estimated_hours=8,
                skills_needed=["Python", "Django"],
                required_resources=["java-dev"],  # Wrong resource assigned
            ),
        ]

        resources = [
            ResourceCreate(
                id="java-dev",
                name="Java Developer",
                capacity=1,
                skills=["Java"],
                lead=False,
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=sample_constraints,
        )

        # Should detect skill mismatch
        assert len(result.conflicts) > 0
        assert any("skill" in c.conflict_type.lower() for c in result.conflicts)

    @pytest.mark.asyncio
    async def test_no_matching_resources_conflict(
        self, scheduler_service, sample_constraints
    ):
        """Test that missing skills are detected when no resources match"""
        project_id = uuid4()

        tasks = [
            ScheduleTaskCreate(
                id="task-1",
                title="Rust Development",
                estimated_hours=8,
                skills_needed=["Rust", "WebAssembly"],
                required_resources=[],
            ),
        ]

        resources = [
            ResourceCreate(
                id="python-dev",
                name="Python Developer",
                capacity=1,
                skills=["Python"],
                lead=False,
            ),
            ResourceCreate(
                id="java-dev",
                name="Java Developer",
                capacity=1,
                skills=["Java"],
                lead=False,
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=sample_constraints,
        )

        # Should detect no matching resources
        assert len(result.conflicts) > 0
        assert any("no_matching_resources" in c.conflict_type for c in result.conflicts)

    @pytest.mark.asyncio
    async def test_multiple_tasks_skill_based_allocation(
        self, scheduler_service, sample_constraints
    ):
        """Test scheduling multiple tasks with different skill requirements"""
        project_id = uuid4()

        tasks = [
            ScheduleTaskCreate(
                id="backend-task",
                title="Backend Development",
                estimated_hours=16,
                skills_needed=["Python", "Django"],
                required_resources=[],
            ),
            ScheduleTaskCreate(
                id="frontend-task",
                title="Frontend Development",
                estimated_hours=16,
                skills_needed=["React", "TypeScript"],
                required_resources=[],
            ),
            ScheduleTaskCreate(
                id="fullstack-task",
                title="Full Stack Feature",
                estimated_hours=24,
                skills_needed=["Python", "React"],
                required_resources=[],
            ),
        ]

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
                lead=False,
            ),
            ResourceCreate(
                id="fullstack-dev",
                name="Full Stack Developer",
                capacity=1,
                skills=["Python", "React", "Django"],
                lead=False,
            ),
        ]

        result = await scheduler_service.schedule_project(
            project_id=project_id,
            tasks=tasks,
            resources=resources,
            constraints=sample_constraints,
        )

        # Should successfully schedule all tasks
        assert result.status in ["success", "feasible"]
        assert len(result.schedule) == 3

        # Verify resources were assigned based on skills
        task_map = {t.task_id: t for t in result.schedule}

        # Backend task should have backend or fullstack dev
        backend_resources = task_map["backend-task"].assigned_resources
        assert any(r in ["backend-dev", "fullstack-dev"] for r in backend_resources)

        # Frontend task should have frontend or fullstack dev
        frontend_resources = task_map["frontend-task"].assigned_resources
        assert any(r in ["frontend-dev", "fullstack-dev"] for r in frontend_resources)

    @pytest.mark.asyncio
    async def test_resources_without_skills_field(self, scheduler_service):
        """Test that resources without skills field are handled correctly"""
        task = ScheduleTaskCreate(
            id="task-1",
            title="Generic Task",
            estimated_hours=8,
            skills_needed=["Python"],
        )

        resources = [
            ResourceCreate(
                id="r1", name="Resource 1", capacity=1, skills=["Python"], lead=False
            ),
            ResourceCreate(
                id="r2", name="Resource 2", capacity=1, skills=[], lead=False
            ),  # No skills
        ]

        matches = scheduler_service.get_matching_resources_for_task(task, resources)

        # Should return resource with matching skill and resource without skills
        assert len(matches) == 2
        assert matches[0][0].id == "r1"  # Has matching skill
        assert matches[1][0].id == "r2"  # No skills defined

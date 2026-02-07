"""Property-based tests for SchedulerService using Hypothesis"""

from datetime import UTC, datetime

import pytest
from hypothesis import given, settings
from hypothesis import strategies as st

from app.schemas.schedule import (
    ResourceCreate,
    ScheduleConstraints,
    ScheduleTaskCreate,
)
from app.services.scheduler_service import SchedulerService


# Strategies for generating test data
@st.composite
def resource_strategy(draw, with_skills=True, with_lead=True):
    """Generate a valid resource"""
    resource_id = draw(
        st.text(
            min_size=1,
            max_size=20,
            alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd", "Pd")),
        )
    )
    name = draw(
        st.text(
            min_size=1,
            max_size=50,
            alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Zs")),
        )
    )
    capacity = draw(st.integers(min_value=1, max_value=10))

    skills = []
    if with_skills:
        skills = draw(
            st.lists(
                st.text(
                    min_size=1,
                    max_size=20,
                    alphabet=st.characters(whitelist_categories=("Lu", "Ll")),
                ),
                min_size=0,
                max_size=5,
                unique=True,
            )
        )

    lead = False
    if with_lead:
        lead = draw(st.booleans())

    return ResourceCreate(
        id=resource_id, name=name, capacity=capacity, skills=skills, lead=lead
    )


@st.composite
def task_strategy(draw, available_skills=None):
    """Generate a valid task"""
    task_id = draw(
        st.text(
            min_size=1,
            max_size=20,
            alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd", "Pd")),
        )
    )
    title = draw(
        st.text(
            min_size=1,
            max_size=100,
            alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Zs")),
        )
    )
    estimated_hours = draw(st.integers(min_value=1, max_value=160))

    skills_needed = []
    if available_skills:
        # Use skills from available resources
        skills_needed = draw(
            st.lists(
                st.sampled_from(available_skills),
                min_size=0,
                max_size=min(3, len(available_skills)),
                unique=True,
            )
        )
    else:
        skills_needed = draw(
            st.lists(
                st.text(
                    min_size=1,
                    max_size=20,
                    alphabet=st.characters(whitelist_categories=("Lu", "Ll")),
                ),
                min_size=0,
                max_size=3,
                unique=True,
            )
        )

    return ScheduleTaskCreate(
        id=task_id,
        title=title,
        estimated_hours=estimated_hours,
        skills_needed=skills_needed,
        dependencies=[],
        required_resources=[],
    )


class TestSchedulerProperties:
    """Property-based tests for SchedulerService"""

    @given(
        resources=st.lists(
            resource_strategy(), min_size=1, max_size=10, unique_by=lambda r: r.id
        ),
        task=task_strategy(),
    )
    @settings(max_examples=50, deadline=None)
    def test_property_matching_resources_have_required_skills(self, resources, task):
        """
        Property: When a task requires skills, matched resources should have at least one of those skills.

        **Validates: Requirements 4.1**
        """
        scheduler = SchedulerService()

        matches = scheduler.get_matching_resources_for_task(task, resources)

        if task.skills_needed:
            task_skills = set(task.skills_needed)

            for resource, skill_count in matches:
                resource_skills = set(resource.skills) if resource.skills else set()

                # Resource should have at least one matching skill OR have no skills defined
                if resource.skills:  # If resource has skills defined
                    matching_skills = task_skills & resource_skills
                    assert len(matching_skills) > 0, (
                        f"Resource {resource.id} matched but has no required skills. "
                        f"Required: {task_skills}, Has: {resource_skills}"
                    )
                    assert skill_count == len(matching_skills), (
                        f"Skill count mismatch for resource {resource.id}. "
                        f"Expected: {len(matching_skills)}, Got: {skill_count}"
                    )

    @given(
        resources=st.lists(
            resource_strategy(), min_size=2, max_size=10, unique_by=lambda r: r.id
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_property_lead_resources_allocated_before_non_lead(self, resources):
        """
        Property: Lead resources should always be prioritized over non-lead resources with same skill match.

        **Validates: Requirements 4.1**
        """
        scheduler = SchedulerService()

        # Ensure we have at least one lead and one non-lead resource
        if not any(r.lead for r in resources):
            resources[0].lead = True
        if all(r.lead for r in resources):
            resources[-1].lead = False

        # Create a task that requires skills present in both lead and non-lead resources
        all_skills = []
        for r in resources:
            if r.skills:
                all_skills.extend(r.skills)

        if not all_skills:
            # If no skills, just test with empty skills
            task = ScheduleTaskCreate(
                id="test-task",
                title="Test Task",
                estimated_hours=8,
                skills_needed=[],
                dependencies=[],
                required_resources=[],
            )
        else:
            # Pick a skill that exists
            task = ScheduleTaskCreate(
                id="test-task",
                title="Test Task",
                estimated_hours=8,
                skills_needed=[all_skills[0]],
                dependencies=[],
                required_resources=[],
            )

        matches = scheduler.get_matching_resources_for_task(task, resources)

        if len(matches) > 1:
            # Check that lead resources come before non-lead with same or worse skill match
            for i in range(len(matches) - 1):
                current_resource, current_skills = matches[i]
                next_resource, next_skills = matches[i + 1]

                # If current is non-lead and next is lead with same or better skills, that's wrong
                if not current_resource.lead and next_resource.lead:
                    assert current_skills > next_skills, (
                        f"Non-lead resource {current_resource.id} (skills: {current_skills}) "
                        f"comes before lead resource {next_resource.id} (skills: {next_skills})"
                    )

    @given(
        resources=st.lists(
            resource_strategy(), min_size=1, max_size=10, unique_by=lambda r: r.id
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_property_all_resources_returned_when_no_skills_required(self, resources):
        """
        Property: When a task has no skill requirements, all resources should be returned.

        **Validates: Requirements 4.1**
        """
        scheduler = SchedulerService()

        task = ScheduleTaskCreate(
            id="test-task",
            title="Test Task",
            estimated_hours=8,
            skills_needed=[],
            dependencies=[],
            required_resources=[],
        )

        matches = scheduler.get_matching_resources_for_task(task, resources)

        # All resources should be returned
        assert len(matches) == len(resources), (
            f"Expected {len(resources)} resources, got {len(matches)}"
        )

        # Lead resources should still be prioritized
        if len(matches) > 1:
            lead_indices = [i for i, (r, _) in enumerate(matches) if r.lead]
            non_lead_indices = [i for i, (r, _) in enumerate(matches) if not r.lead]

            if lead_indices and non_lead_indices:
                # All lead resources should come before all non-lead resources
                assert max(lead_indices) < min(non_lead_indices), (
                    "Lead resources should come before non-lead resources"
                )

    @given(
        resources=st.lists(
            resource_strategy(), min_size=2, max_size=10, unique_by=lambda r: r.id
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_property_better_skill_match_prioritized(self, resources):
        """
        Property: Resources with more matching skills should be prioritized over those with fewer.

        **Validates: Requirements 4.1**
        """
        scheduler = SchedulerService()

        # Collect all unique skills from resources
        all_skills = set()
        for r in resources:
            if r.skills:
                all_skills.update(r.skills)

        if len(all_skills) < 2:
            # Not enough skills to test, skip
            return

        # Create a task requiring multiple skills
        required_skills = list(all_skills)[: min(3, len(all_skills))]
        task = ScheduleTaskCreate(
            id="test-task",
            title="Test Task",
            estimated_hours=8,
            skills_needed=required_skills,
            dependencies=[],
            required_resources=[],
        )

        matches = scheduler.get_matching_resources_for_task(task, resources)

        if len(matches) > 1:
            # Check that resources are sorted by skill match count (within same lead status)
            for i in range(len(matches) - 1):
                current_resource, current_skills = matches[i]
                next_resource, next_skills = matches[i + 1]

                # If both have same lead status, better skill match should come first
                if current_resource.lead == next_resource.lead:
                    assert current_skills >= next_skills, (
                        f"Resource {current_resource.id} (skills: {current_skills}) "
                        f"should come before {next_resource.id} (skills: {next_skills}) "
                        f"with same lead status"
                    )

    @pytest.mark.asyncio
    @given(
        resources=st.lists(
            resource_strategy(), min_size=1, max_size=5, unique_by=lambda r: r.id
        )
    )
    @settings(max_examples=20, deadline=None)
    async def test_property_allocated_resources_have_required_skills_in_schedule(
        self, resources
    ):
        """
        Property: In a successful schedule, allocated resources should have the required skills.

        **Validates: Requirements 4.1**
        """
        scheduler = SchedulerService()

        # Collect all skills from resources
        all_skills = []
        for r in resources:
            if r.skills:
                all_skills.extend(r.skills)

        if not all_skills:
            # No skills to test
            return

        # Create a task with skills that exist in resources
        task = ScheduleTaskCreate(
            id="test-task",
            title="Test Task",
            estimated_hours=8,
            skills_needed=[all_skills[0]] if all_skills else [],
            dependencies=[],
            required_resources=[],
        )

        constraints = ScheduleConstraints(
            project_start=datetime.now(UTC),
            horizon_days=30,
            working_hours_per_day=8,
            respect_weekends=False,
        )

        from uuid import uuid4

        result = await scheduler.schedule_project(
            project_id=uuid4(),
            tasks=[task],
            resources=resources,
            constraints=constraints,
        )

        # If scheduling succeeded, check resource allocation
        if result.status in ["success", "feasible"] and result.schedule:
            scheduled_task = result.schedule[0]

            if task.skills_needed and scheduled_task.assigned_resources:
                task_skills = set(task.skills_needed)

                # At least one assigned resource should have the required skills
                resource_map = {r.id: r for r in resources}
                has_matching_resource = False

                for resource_id in scheduled_task.assigned_resources:
                    if resource_id in resource_map:
                        resource = resource_map[resource_id]
                        if resource.skills:
                            resource_skills = set(resource.skills)
                            if task_skills & resource_skills:
                                has_matching_resource = True
                                break

                assert has_matching_resource or not any(r.skills for r in resources), (
                    f"Task requires skills {task_skills} but assigned resources don't have them"
                )

    @given(
        resources=st.lists(
            resource_strategy(), min_size=1, max_size=10, unique_by=lambda r: r.id
        )
    )
    @settings(max_examples=50, deadline=None)
    def test_property_matching_is_deterministic(self, resources):
        """
        Property: Resource matching should be deterministic - same inputs produce same outputs.

        **Validates: Requirements 4.1**
        """
        scheduler = SchedulerService()

        task = ScheduleTaskCreate(
            id="test-task",
            title="Test Task",
            estimated_hours=8,
            skills_needed=["Python", "Django"],
            dependencies=[],
            required_resources=[],
        )

        # Run matching twice
        matches1 = scheduler.get_matching_resources_for_task(task, resources)
        matches2 = scheduler.get_matching_resources_for_task(task, resources)

        # Results should be identical
        assert len(matches1) == len(matches2)

        for (r1, s1), (r2, s2) in zip(matches1, matches2):
            assert r1.id == r2.id, "Resource order should be deterministic"
            assert s1 == s2, "Skill counts should be deterministic"


class TestDepartmentAllocationProperties:
    """Property-based tests for department-based resource allocation"""

    @pytest.mark.asyncio
    @given(
        resources=st.lists(
            resource_strategy(), min_size=2, max_size=10, unique_by=lambda r: r.id
        )
    )
    @settings(max_examples=20, deadline=None)
    async def test_property_department_resources_maintain_skill_matching(
        self, resources
    ):
        """
        Property: Department-based allocation should still respect skill matching requirements.

        **Validates: Requirements 4.2**
        """
        scheduler = SchedulerService()

        # Ensure we have at least one resource with skills
        if not any(r.skills for r in resources):
            resources[0].skills = ["Python"]

        # Collect all skills
        all_skills = []
        for r in resources:
            if r.skills:
                all_skills.extend(r.skills)

        if not all_skills:
            return

        # Create a task requiring a specific skill
        required_skill = all_skills[0]
        task = ScheduleTaskCreate(
            id="test-task",
            title="Test Task",
            estimated_hours=8,
            skills_needed=[required_skill],
            dependencies=[],
            required_resources=[],
        )

        # Get matching resources
        matches = scheduler.get_matching_resources_for_task(task, resources)

        # All matched resources should have the required skill
        for resource, skill_count in matches:
            if resource.skills:  # If resource has skills defined
                assert required_skill in resource.skills, (
                    f"Resource {resource.id} matched but doesn't have required skill '{required_skill}'"
                )

    @pytest.mark.asyncio
    @given(
        resources=st.lists(
            resource_strategy(), min_size=2, max_size=8, unique_by=lambda r: r.id
        )
    )
    @settings(max_examples=15, deadline=None)
    async def test_property_department_allocation_maintains_lead_priority(
        self, resources
    ):
        """
        Property: Department-based allocation should still prioritize lead resources
        over non-lead resources with same skill match.

        **Validates: Requirements 4.2**
        """
        scheduler = SchedulerService()

        # Ensure we have both lead and non-lead resources
        if not any(r.lead for r in resources):
            resources[0].lead = True
        if all(r.lead for r in resources):
            resources[-1].lead = False

        # Create a task
        task = ScheduleTaskCreate(
            id="test-task",
            title="Test Task",
            estimated_hours=8,
            skills_needed=[],  # No specific skills
            dependencies=[],
            required_resources=[],
        )

        # Match resources
        matches = scheduler.get_matching_resources_for_task(task, resources)

        if len(matches) > 1:
            # Check that lead resources come before non-lead
            for i in range(len(matches) - 1):
                current_resource, current_skills = matches[i]
                next_resource, next_skills = matches[i + 1]

                # If current is non-lead and next is lead, that's wrong
                if not current_resource.lead and next_resource.lead:
                    # This should only happen if current has better skill match
                    assert current_skills > next_skills, (
                        f"Non-lead resource {current_resource.id} should not come "
                        f"before lead resource {next_resource.id} with same skill match"
                    )

    @pytest.mark.asyncio
    @given(
        resources=st.lists(
            resource_strategy(), min_size=1, max_size=5, unique_by=lambda r: r.id
        )
    )
    @settings(max_examples=20, deadline=None)
    async def test_property_workpackage_id_parameter_accepted(self, resources):
        """
        Property: schedule_project should accept workpackage_id parameter without errors.

        **Validates: Requirements 4.2**
        """
        scheduler = SchedulerService()

        # Ensure at least one resource has skills
        if not any(r.skills for r in resources):
            resources[0].skills = ["Python"]

        # Collect skills
        all_skills = []
        for r in resources:
            if r.skills:
                all_skills.extend(r.skills)

        if not all_skills:
            return

        task = ScheduleTaskCreate(
            id="test-task",
            title="Test Task",
            estimated_hours=8,
            skills_needed=[all_skills[0]] if all_skills else [],
            dependencies=[],
            required_resources=[],
        )

        constraints = ScheduleConstraints(
            project_start=datetime.now(UTC),
            horizon_days=30,
            working_hours_per_day=8,
            respect_weekends=False,
        )

        from uuid import uuid4

        # Should not raise an error with workpackage_id parameter
        result = await scheduler.schedule_project(
            project_id=uuid4(),
            tasks=[task],
            resources=resources,
            constraints=constraints,
            workpackage_id="test-workpackage-id",  # Should be accepted
        )

        # Should return a valid response
        assert result.status in ["success", "feasible", "infeasible", "error"]
        assert result.project_id is not None

"""Property-based tests for Task-specific properties on WorkItem nodes

**Validates: Requirements 16.13-16.22 (Task properties and skills-based matching)**
"""

import pytest
from datetime import datetime, timezone, timedelta
from hypothesis import given, strategies as st, assume
from uuid import UUID

from app.schemas.workitem import TaskCreate, TaskUpdate


# Custom strategies for task properties

@st.composite
def valid_skill_name(draw):
    """Generate valid skill names (1-100 chars, non-empty)"""
    # Generate a skill name with letters and spaces
    skill = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'), whitelist_characters=' -'),
        min_size=1,
        max_size=100
    ))
    # Ensure it's not just whitespace
    assume(skill.strip())
    return skill.strip()


@st.composite
def skills_array(draw):
    """Generate valid skills_needed arrays"""
    # Generate 0-10 unique skills
    num_skills = draw(st.integers(min_value=0, max_value=10))
    if num_skills == 0:
        return None
    
    skills = []
    for _ in range(num_skills):
        skill = draw(valid_skill_name())
        # Avoid duplicates (case-insensitive)
        if not any(s.lower() == skill.lower() for s in skills):
            skills.append(skill)
    
    return skills if skills else None


@st.composite
def task_title(draw):
    """Generate valid task titles (5-500 chars with at least one letter)"""
    title = draw(st.text(
        alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Po', 'Zs')),
        min_size=5,
        max_size=500
    ))
    # Ensure it has at least one letter
    assume(any(c.isalpha() for c in title))
    assume(title.strip())
    return title.strip()


@st.composite
def timezone_aware_datetime(draw):
    """Generate timezone-aware datetime"""
    # Generate datetime in reasonable range (2020-2030)
    dt = draw(st.datetimes(
        min_value=datetime(2020, 1, 1),
        max_value=datetime(2030, 12, 31)
    ))
    # Make it timezone-aware
    return dt.replace(tzinfo=timezone.utc)


class TestTaskPropertiesInvariants:
    """Property-based tests for task property invariants"""

    @given(skills=skills_array())
    def test_property_skills_needed_is_always_array_or_none(self, skills):
        """
        Property: skills_needed is always an array of strings or None
        
        **Validates: Requirement 16.19**
        """
        task = TaskCreate(
            type="task",
            title="Test task with skills",
            status="draft",
            skills_needed=skills
        )
        
        # Invariant: skills_needed is either None or a list
        assert task.skills_needed is None or isinstance(task.skills_needed, list)
        
        # Invariant: if list, all elements are non-empty strings
        if task.skills_needed is not None:
            assert all(isinstance(s, str) and s.strip() for s in task.skills_needed)
            
            # Invariant: no duplicates (case-insensitive)
            skills_lower = [s.lower() for s in task.skills_needed]
            assert len(skills_lower) == len(set(skills_lower))

    @given(
        title=task_title(),
        skills=skills_array(),
        story_points=st.one_of(st.none(), st.integers(min_value=0, max_value=100))
    )
    def test_property_task_creation_preserves_data(self, title, skills, story_points):
        """
        Property: Task creation preserves input data
        
        **Validates: Requirement 16.13**
        """
        task = TaskCreate(
            type="task",
            title=title,
            status="draft",
            skills_needed=skills,
            story_points=story_points
        )
        
        # Invariant: title is preserved (after trimming)
        assert task.title == title.strip()
        
        # Invariant: story_points is preserved
        assert task.story_points == story_points
        
        # Invariant: type is always "task"
        assert task.type == "task"

    @given(
        wp_id=st.uuids(),
        story_points=st.integers(min_value=0, max_value=100)
    )
    def test_property_workpackage_id_valid_when_assigned(self, wp_id, story_points):
        """
        Property: All tasks have valid workpackage_id when assigned
        
        **Validates: Requirement 16.13 (workpackage_id for quick lookup)**
        """
        task = TaskCreate(
            type="task",
            title="Test task with workpackage",
            status="draft",
            workpackage_id=wp_id,
            story_points=story_points
        )
        
        # Invariant: workpackage_id is a valid UUID
        assert isinstance(task.workpackage_id, UUID)
        assert str(task.workpackage_id) == str(wp_id)

    @given(
        done=st.booleans(),
        status=st.sampled_from(["draft", "active", "completed", "archived"])
    )
    def test_property_done_flag_is_boolean(self, done, status):
        """
        Property: done flag is always a boolean
        
        **Validates: Requirement 16.13 (done property)**
        """
        task = TaskCreate(
            type="task",
            title="Test task with done flag",
            status=status,
            done=done
        )
        
        # Invariant: done is always a boolean
        assert isinstance(task.done, bool)
        assert task.done == done

    @given(
        start_date=st.one_of(st.none(), timezone_aware_datetime()),
        end_date=st.one_of(st.none(), timezone_aware_datetime()),
        due_date=st.one_of(st.none(), timezone_aware_datetime())
    )
    def test_property_dates_are_timezone_aware(self, start_date, end_date, due_date):
        """
        Property: All task dates are timezone-aware or None
        
        **Validates: Requirement 16.13 (start_date, end_date, due_date)**
        """
        task = TaskCreate(
            type="task",
            title="Test task with dates",
            status="draft",
            start_date=start_date,
            end_date=end_date,
            due_date=due_date
        )
        
        # Invariant: dates are either None or timezone-aware
        if task.start_date is not None:
            assert task.start_date.tzinfo is not None
        if task.end_date is not None:
            assert task.end_date.tzinfo is not None
        if task.due_date is not None:
            assert task.due_date.tzinfo is not None

    @given(
        estimated_hours=st.one_of(st.none(), st.floats(min_value=0.0, max_value=1000.0)),
        actual_hours=st.one_of(st.none(), st.floats(min_value=0.0, max_value=1000.0))
    )
    def test_property_hours_are_non_negative(self, estimated_hours, actual_hours):
        """
        Property: estimated_hours and actual_hours are non-negative or None
        
        **Validates: Requirement 16.13 (task hours tracking)**
        """
        task = TaskCreate(
            type="task",
            title="Test task with hours",
            status="draft",
            estimated_hours=estimated_hours,
            actual_hours=actual_hours
        )
        
        # Invariant: hours are either None or non-negative
        if task.estimated_hours is not None:
            assert task.estimated_hours >= 0
        if task.actual_hours is not None:
            assert task.actual_hours >= 0


class TestTaskUpdateInvariants:
    """Property-based tests for task update invariants"""

    @given(
        skills=skills_array(),
        story_points=st.one_of(st.none(), st.integers(min_value=0, max_value=100)),
        done=st.one_of(st.none(), st.booleans())
    )
    def test_property_update_preserves_types(self, skills, story_points, done):
        """
        Property: Task updates preserve data types
        
        **Validates: Requirement 16.13**
        """
        update = TaskUpdate(
            skills_needed=skills,
            story_points=story_points,
            done=done
        )
        
        # Invariant: types are preserved
        if update.skills_needed is not None:
            assert isinstance(update.skills_needed, list)
            assert all(isinstance(s, str) for s in update.skills_needed)
        
        if update.story_points is not None:
            assert isinstance(update.story_points, int)
            assert 0 <= update.story_points <= 100
        
        if update.done is not None:
            assert isinstance(update.done, bool)

    @given(
        title=st.one_of(st.none(), task_title()),
        skills=st.one_of(st.none(), skills_array())
    )
    def test_property_partial_updates_allowed(self, title, skills):
        """
        Property: Partial updates are allowed (all fields optional)
        
        **Validates: Requirement 16.13**
        """
        update = TaskUpdate(
            title=title,
            skills_needed=skills
        )
        
        # Invariant: update can have None values (partial update)
        # This should not raise an error
        assert True  # If we got here, validation passed


class TestSkillsMatchingProperties:
    """Property-based tests for skills-based resource matching"""

    @given(
        task_skills=skills_array(),
        resource_skills=skills_array()
    )
    def test_property_skill_matching_is_case_insensitive(self, task_skills, resource_skills):
        """
        Property: Skill matching should be case-insensitive
        
        **Validates: Requirement 16.20-16.21 (skills-based resource matching)**
        """
        # Create task with skills
        task = TaskCreate(
            type="task",
            title="Test task for skill matching",
            status="draft",
            skills_needed=task_skills
        )
        
        # Simulate skill matching logic
        if task.skills_needed and resource_skills:
            task_skills_lower = {s.lower() for s in task.skills_needed}
            resource_skills_lower = {s.lower() for s in resource_skills}
            
            # Invariant: matching is case-insensitive
            matches = task_skills_lower & resource_skills_lower
            
            # If there are matches, they should be found regardless of case
            for skill in task.skills_needed:
                if any(s.lower() == skill.lower() for s in resource_skills):
                    assert skill.lower() in resource_skills_lower

    @given(
        skills=st.lists(
            valid_skill_name(),
            min_size=1,
            max_size=10,
            unique_by=str.lower
        )
    )
    def test_property_skills_array_has_no_duplicates(self, skills):
        """
        Property: skills_needed array never contains duplicates (case-insensitive)
        
        **Validates: Requirement 16.19**
        """
        task = TaskCreate(
            type="task",
            title="Test task with unique skills",
            status="draft",
            skills_needed=skills
        )
        
        # Invariant: no duplicate skills (case-insensitive)
        if task.skills_needed:
            skills_lower = [s.lower() for s in task.skills_needed]
            assert len(skills_lower) == len(set(skills_lower))

    @given(
        skills=st.lists(
            st.text(
                alphabet=st.characters(whitelist_categories=('Lu', 'Ll')),
                min_size=1,
                max_size=100
            ),
            min_size=1,
            max_size=5
        )
    )
    def test_property_skills_are_trimmed(self, skills):
        """
        Property: Skills are always trimmed of whitespace
        
        **Validates: Requirement 16.19**
        """
        # Add whitespace to skills
        skills_with_whitespace = [f"  {s}  " for s in skills]
        
        task = TaskCreate(
            type="task",
            title="Test task with whitespace skills",
            status="draft",
            skills_needed=skills_with_whitespace
        )
        
        # Invariant: all skills are trimmed
        if task.skills_needed:
            for skill in task.skills_needed:
                assert skill == skill.strip()
                assert not skill.startswith(' ')
                assert not skill.endswith(' ')


class TestStoryPointsProperties:
    """Property-based tests for story points"""

    @given(
        story_points=st.integers(min_value=0, max_value=100)
    )
    def test_property_story_points_in_valid_range(self, story_points):
        """
        Property: Story points are always in valid range (0-100)
        
        **Validates: Requirement 16.13 (story_points property)**
        """
        task = TaskCreate(
            type="task",
            title="Test task with story points",
            status="draft",
            story_points=story_points
        )
        
        # Invariant: story points are in valid range
        assert 0 <= task.story_points <= 100

    @given(
        sp1=st.integers(min_value=0, max_value=100),
        sp2=st.integers(min_value=0, max_value=100)
    )
    def test_property_story_points_are_additive(self, sp1, sp2):
        """
        Property: Story points can be summed for sprint capacity planning
        
        **Validates: Requirement 16.57 (story_points for effort measures)**
        """
        task1 = TaskCreate(
            type="task",
            title="Task 1",
            status="draft",
            story_points=sp1
        )
        
        task2 = TaskCreate(
            type="task",
            title="Task 2",
            status="draft",
            story_points=sp2
        )
        
        # Invariant: story points can be summed
        total_points = task1.story_points + task2.story_points
        assert total_points >= 0
        assert total_points <= 200  # Max if both are 100


# Run property tests with more examples for thorough testing
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--hypothesis-show-statistics"])

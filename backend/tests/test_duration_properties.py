"""Property-based tests for duration calculation using Hypothesis"""

from uuid import uuid4

import pytest
from hypothesis import given
from hypothesis import strategies as st

from app.utils.duration_utils import (
    calculate_phase_duration,
    calculate_workpackage_duration,
    enforce_minimal_duration,
)


class MockGraphService:
    """Mock GraphService for testing"""

    def __init__(self):
        self.query_results = {}
        self.executed_queries = []

    def set_query_result(self, query_pattern: str, result: list):
        """Set mock result for a query pattern"""
        self.query_results[query_pattern] = result

    async def execute_query(self, query: str):
        """Execute a mock query"""
        self.executed_queries.append(query)

        # Match query patterns
        for pattern, result in self.query_results.items():
            if pattern in query:
                return result

        return []


@given(
    minimal_duration=st.integers(min_value=0, max_value=365),
    calculated_duration=st.integers(min_value=0, max_value=365),
)
def test_property_enforce_minimal_duration_always_gte_minimal(
    minimal_duration, calculated_duration
):
    """
    Property: Enforced duration is always >= minimal_duration

    For any minimal_duration and calculated_duration values,
    the result must be at least minimal_duration.
    """
    entity = {"minimal_duration": minimal_duration}

    result = enforce_minimal_duration(entity, calculated_duration)

    assert result >= minimal_duration, (
        f"Result {result} is less than minimal_duration {minimal_duration}"
    )


@given(
    minimal_duration=st.integers(min_value=0, max_value=365),
    calculated_duration=st.integers(min_value=0, max_value=365),
)
def test_property_enforce_minimal_duration_always_gte_calculated(
    minimal_duration, calculated_duration
):
    """
    Property: Enforced duration is always >= calculated_duration

    For any minimal_duration and calculated_duration values,
    the result must be at least calculated_duration.
    """
    entity = {"minimal_duration": minimal_duration}

    result = enforce_minimal_duration(entity, calculated_duration)

    assert result >= calculated_duration, (
        f"Result {result} is less than calculated_duration {calculated_duration}"
    )


@given(
    minimal_duration=st.integers(min_value=0, max_value=365),
    calculated_duration=st.integers(min_value=0, max_value=365),
)
def test_property_enforce_minimal_duration_is_max(
    minimal_duration, calculated_duration
):
    """
    Property: Enforced duration equals max(minimal, calculated)

    The result should always be the maximum of minimal_duration and calculated_duration.
    """
    entity = {"minimal_duration": minimal_duration}

    result = enforce_minimal_duration(entity, calculated_duration)
    expected = max(minimal_duration, calculated_duration)

    assert result == expected, (
        f"Result {result} does not equal max({minimal_duration}, {calculated_duration}) = {expected}"
    )


@given(
    task_durations=st.lists(
        st.integers(min_value=0, max_value=100), min_size=0, max_size=20
    ),
    minimal_duration=st.integers(min_value=0, max_value=365),
)
@pytest.mark.asyncio
async def test_property_workpackage_duration_gte_minimal(
    task_durations, minimal_duration
):
    """
    Property: Workpackage duration is always >= minimal_duration

    For any combination of task durations and minimal_duration,
    the calculated workpackage duration must be at least minimal_duration.
    """
    graph_service = MockGraphService()
    workpackage_id = uuid4()

    # Mock workpackage
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [{"minimal_duration": minimal_duration}],
    )

    # Mock tasks
    tasks = [{"duration": d} for d in task_durations]
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        tasks,
    )

    duration = await calculate_workpackage_duration(workpackage_id, graph_service)

    assert duration >= minimal_duration, (
        f"Workpackage duration {duration} is less than minimal_duration {minimal_duration}"
    )


@given(
    task_durations=st.lists(
        st.integers(min_value=1, max_value=100), min_size=1, max_size=20
    ),
    minimal_duration=st.integers(min_value=0, max_value=365),
)
@pytest.mark.asyncio
async def test_property_workpackage_duration_gte_sum_of_tasks(
    task_durations, minimal_duration
):
    """
    Property: Workpackage duration is always >= sum of task durations

    The calculated workpackage duration must be at least the sum of all task durations.
    """
    graph_service = MockGraphService()
    workpackage_id = uuid4()

    # Mock workpackage
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [{"minimal_duration": minimal_duration}],
    )

    # Mock tasks
    tasks = [{"duration": d} for d in task_durations]
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        tasks,
    )

    duration = await calculate_workpackage_duration(workpackage_id, graph_service)
    expected_sum = sum(task_durations)

    assert duration >= expected_sum, (
        f"Workpackage duration {duration} is less than sum of tasks {expected_sum}"
    )


@given(minimal_duration=st.integers(min_value=1, max_value=365))
@pytest.mark.asyncio
async def test_property_workpackage_duration_no_tasks_equals_minimal(minimal_duration):
    """
    Property: Workpackage with no tasks has duration equal to minimal_duration

    When a workpackage has no tasks, its duration should exactly equal minimal_duration.
    """
    graph_service = MockGraphService()
    workpackage_id = uuid4()

    # Mock workpackage
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [{"minimal_duration": minimal_duration}],
    )

    # No tasks
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [],
    )

    duration = await calculate_workpackage_duration(workpackage_id, graph_service)

    assert duration == minimal_duration, (
        f"Workpackage duration {duration} does not equal minimal_duration {minimal_duration}"
    )


@given(
    num_workpackages=st.integers(min_value=1, max_value=10),
    phase_minimal=st.integers(min_value=0, max_value=365),
)
@pytest.mark.asyncio
async def test_property_phase_duration_gte_minimal(num_workpackages, phase_minimal):
    """
    Property: Phase duration is always >= phase minimal_duration

    For any number of workpackages and phase minimal_duration,
    the calculated phase duration must be at least phase minimal_duration.
    """
    graph_service = MockGraphService()
    phase_id = uuid4()

    # Mock phase
    graph_service.set_query_result(
        f"MATCH (ph:Phase {{id: '{str(phase_id)}'}})",
        [{"minimal_duration": phase_minimal}],
    )

    # Mock workpackages
    workpackages = []
    for i in range(num_workpackages):
        wp_id = uuid4()
        workpackages.append({"workpackage_id": str(wp_id), "wp_minimal_duration": 5})

        # Mock tasks for this workpackage
        graph_service.set_query_result(
            f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(wp_id)}'}})",
            [{"duration": 3}],
        )

    graph_service.set_query_result(
        f"MATCH (wp:Workpackage)-[:BELONGS_TO]->(ph:Phase {{id: '{str(phase_id)}'}})",
        workpackages,
    )

    duration = await calculate_phase_duration(phase_id, graph_service)

    assert duration >= phase_minimal, (
        f"Phase duration {duration} is less than phase minimal_duration {phase_minimal}"
    )


@given(minimal_duration=st.integers(min_value=1, max_value=365))
@pytest.mark.asyncio
async def test_property_phase_duration_no_workpackages_equals_minimal(minimal_duration):
    """
    Property: Phase with no workpackages has duration equal to minimal_duration

    When a phase has no workpackages, its duration should exactly equal minimal_duration.
    """
    graph_service = MockGraphService()
    phase_id = uuid4()

    # Mock phase
    graph_service.set_query_result(
        f"MATCH (ph:Phase {{id: '{str(phase_id)}'}})",
        [{"minimal_duration": minimal_duration}],
    )

    # No workpackages
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage)-[:BELONGS_TO]->(ph:Phase {{id: '{str(phase_id)}'}})",
        [],
    )

    duration = await calculate_phase_duration(phase_id, graph_service)

    assert duration == minimal_duration, (
        f"Phase duration {duration} does not equal minimal_duration {minimal_duration}"
    )


@given(
    wp_durations=st.lists(
        st.integers(min_value=1, max_value=50), min_size=1, max_size=10
    ),
    phase_minimal=st.integers(min_value=0, max_value=100),
)
@pytest.mark.asyncio
async def test_property_phase_duration_gte_sum_of_workpackages(
    wp_durations, phase_minimal
):
    """
    Property: Phase duration is always >= sum of workpackage durations

    The calculated phase duration must be at least the sum of all workpackage durations.
    """
    graph_service = MockGraphService()
    phase_id = uuid4()

    # Mock phase
    graph_service.set_query_result(
        f"MATCH (ph:Phase {{id: '{str(phase_id)}'}})",
        [{"minimal_duration": phase_minimal}],
    )

    # Mock workpackages
    workpackages = []
    for i, wp_duration in enumerate(wp_durations):
        wp_id = uuid4()
        workpackages.append(
            {
                "workpackage_id": str(wp_id),
                "wp_minimal_duration": 0,  # No workpackage minimal to isolate phase minimal
            }
        )

        # Mock tasks for this workpackage with specific duration
        graph_service.set_query_result(
            f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(wp_id)}'}})",
            [{"duration": wp_duration}],
        )

    graph_service.set_query_result(
        f"MATCH (wp:Workpackage)-[:BELONGS_TO]->(ph:Phase {{id: '{str(phase_id)}'}})",
        workpackages,
    )

    duration = await calculate_phase_duration(phase_id, graph_service)
    expected_sum = sum(wp_durations)

    assert duration >= expected_sum, (
        f"Phase duration {duration} is less than sum of workpackages {expected_sum}"
    )


@given(calculated=st.integers(min_value=0, max_value=365))
def test_property_enforce_minimal_duration_idempotent(calculated):
    """
    Property: Applying enforce_minimal_duration twice gives same result

    Enforcing minimal duration is idempotent - applying it multiple times
    should give the same result as applying it once.
    """
    entity = {"minimal_duration": 10}

    result1 = enforce_minimal_duration(entity, calculated)
    result2 = enforce_minimal_duration(entity, result1)

    assert result1 == result2, (
        f"Applying enforce_minimal_duration twice changed result from {result1} to {result2}"
    )


@given(
    task_durations=st.lists(
        st.integers(min_value=0, max_value=100), min_size=0, max_size=20
    )
)
@pytest.mark.asyncio
async def test_property_workpackage_duration_non_negative(task_durations):
    """
    Property: Workpackage duration is always non-negative

    For any combination of task durations, the workpackage duration must be >= 0.
    """
    graph_service = MockGraphService()
    workpackage_id = uuid4()

    # Mock workpackage with no minimal_duration
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        [{"minimal_duration": 0}],
    )

    # Mock tasks
    tasks = [{"duration": d} for d in task_durations]
    graph_service.set_query_result(
        f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(workpackage_id)}'}})",
        tasks,
    )

    duration = await calculate_workpackage_duration(workpackage_id, graph_service)

    assert duration >= 0, f"Workpackage duration {duration} is negative"


@given(num_workpackages=st.integers(min_value=0, max_value=10))
@pytest.mark.asyncio
async def test_property_phase_duration_non_negative(num_workpackages):
    """
    Property: Phase duration is always non-negative

    For any number of workpackages, the phase duration must be >= 0.
    """
    graph_service = MockGraphService()
    phase_id = uuid4()

    # Mock phase with no minimal_duration
    graph_service.set_query_result(
        f"MATCH (ph:Phase {{id: '{str(phase_id)}'}})", [{"minimal_duration": 0}]
    )

    # Mock workpackages
    workpackages = []
    for i in range(num_workpackages):
        wp_id = uuid4()
        workpackages.append({"workpackage_id": str(wp_id), "wp_minimal_duration": 0})

        # Mock tasks
        graph_service.set_query_result(
            f"MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(wp_id)}'}})",
            [{"duration": 5}],
        )

    graph_service.set_query_result(
        f"MATCH (wp:Workpackage)-[:BELONGS_TO]->(ph:Phase {{id: '{str(phase_id)}'}})",
        workpackages,
    )

    duration = await calculate_phase_duration(phase_id, graph_service)

    assert duration >= 0, f"Phase duration {duration} is negative"

"""Property-based tests for progress tracking using Hypothesis"""

import pytest
from hypothesis import given, strategies as st
from uuid import uuid4

from app.utils.progress_utils import (
    calculate_workpackage_progress,
    calculate_variance_days,
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
    progress_values=st.lists(
        st.integers(min_value=0, max_value=100),
        min_size=1,
        max_size=20
    ),
    effort_values=st.lists(
        st.floats(min_value=0.1, max_value=1000.0),
        min_size=1,
        max_size=20
    )
)
@pytest.mark.asyncio
async def test_property_progress_always_between_0_and_100(progress_values, effort_values):
    """
    Property: Progress is always between 0 and 100
    
    For any combination of task progress values (0-100) and effort values (>0),
    the calculated workpackage progress must be between 0 and 100.
    """
    # Ensure lists are same length
    min_len = min(len(progress_values), len(effort_values))
    progress_values = progress_values[:min_len]
    effort_values = effort_values[:min_len]
    
    graph_service = MockGraphService()
    workpackage_id = uuid4()
    
    # Create mock tasks
    tasks = [
        {'progress': p, 'effort': e, 'estimated_hours': None}
        for p, e in zip(progress_values, effort_values)
    ]
    
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        tasks
    )
    
    progress = await calculate_workpackage_progress(workpackage_id, graph_service)
    
    assert 0 <= progress <= 100, f"Progress {progress} is not between 0 and 100"


@given(
    progress_value=st.integers(min_value=0, max_value=100),
    num_tasks=st.integers(min_value=1, max_value=50)
)
@pytest.mark.asyncio
async def test_property_uniform_progress_equals_task_progress(progress_value, num_tasks):
    """
    Property: When all tasks have the same progress, workpackage progress equals that value
    
    If all tasks in a workpackage have the same progress percentage,
    the workpackage progress should equal that percentage (regardless of effort distribution).
    """
    graph_service = MockGraphService()
    workpackage_id = uuid4()
    
    # Create tasks with same progress but varying effort
    tasks = [
        {'progress': progress_value, 'effort': float(i + 1), 'estimated_hours': None}
        for i in range(num_tasks)
    ]
    
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        tasks
    )
    
    progress = await calculate_workpackage_progress(workpackage_id, graph_service)
    
    assert progress == progress_value, \
        f"Expected {progress_value} but got {progress} for {num_tasks} tasks with uniform progress"


@given(
    num_completed=st.integers(min_value=0, max_value=20),
    num_incomplete=st.integers(min_value=0, max_value=20)
)
@pytest.mark.asyncio
async def test_property_progress_proportional_to_completed_tasks(num_completed, num_incomplete):
    """
    Property: Progress is proportional to the number of completed tasks (with equal effort)
    
    When all tasks have equal effort, the progress should be proportional to
    the number of completed tasks vs. total tasks.
    """
    if num_completed + num_incomplete == 0:
        return  # Skip empty case
    
    graph_service = MockGraphService()
    workpackage_id = uuid4()
    
    # Create tasks with equal effort
    effort = 10.0
    tasks = (
        [{'progress': 100, 'effort': effort, 'estimated_hours': None}] * num_completed +
        [{'progress': 0, 'effort': effort, 'estimated_hours': None}] * num_incomplete
    )
    
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        tasks
    )
    
    progress = await calculate_workpackage_progress(workpackage_id, graph_service)
    
    expected_progress = int(round((num_completed * 100) / (num_completed + num_incomplete)))
    
    # Allow for rounding differences
    assert abs(progress - expected_progress) <= 1, \
        f"Expected ~{expected_progress}% but got {progress}% for {num_completed}/{num_completed + num_incomplete} completed"


@given(
    days_offset=st.integers(min_value=-365, max_value=365)
)
def test_property_variance_symmetric(days_offset):
    """
    Property: Variance calculation is symmetric
    
    If task A starts X days after planned, variance should be +X.
    If task B starts X days before planned, variance should be -X.
    The absolute values should be equal.
    """
    from datetime import datetime, timedelta, timezone
    
    base_date = datetime(2024, 1, 15, 0, 0, 0, tzinfo=timezone.utc)
    actual_date = base_date + timedelta(days=days_offset)
    
    entity_data = {
        'start_date': base_date.isoformat(),
        'start_date_is': actual_date.isoformat(),
    }
    
    variance = calculate_variance_days(entity_data)
    
    assert variance == days_offset, \
        f"Expected variance of {days_offset} days but got {variance}"


@given(
    progress_values=st.lists(
        st.integers(min_value=0, max_value=100),
        min_size=2,
        max_size=10
    )
)
@pytest.mark.asyncio
async def test_property_progress_bounded_by_min_max_tasks(progress_values):
    """
    Property: Workpackage progress is bounded by min and max task progress
    
    The workpackage progress should never be less than the minimum task progress
    or greater than the maximum task progress (when all tasks have equal effort).
    """
    graph_service = MockGraphService()
    workpackage_id = uuid4()
    
    # Create tasks with equal effort
    tasks = [
        {'progress': p, 'effort': 10.0, 'estimated_hours': None}
        for p in progress_values
    ]
    
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        tasks
    )
    
    progress = await calculate_workpackage_progress(workpackage_id, graph_service)
    
    min_progress = min(progress_values)
    max_progress = max(progress_values)
    
    assert min_progress <= progress <= max_progress, \
        f"Progress {progress} is not between min {min_progress} and max {max_progress}"


@given(
    effort_multiplier=st.floats(min_value=0.1, max_value=10.0)
)
@pytest.mark.asyncio
async def test_property_progress_invariant_to_effort_scaling(effort_multiplier):
    """
    Property: Progress is invariant to uniform effort scaling
    
    If all task efforts are multiplied by the same factor, the workpackage
    progress should remain the same (since it's a weighted average).
    """
    graph_service = MockGraphService()
    workpackage_id = uuid4()
    
    # Create tasks with specific progress and effort
    base_tasks = [
        {'progress': 100, 'effort': 10.0, 'estimated_hours': None},
        {'progress': 50, 'effort': 20.0, 'estimated_hours': None},
        {'progress': 0, 'effort': 10.0, 'estimated_hours': None},
    ]
    
    # Calculate progress with base efforts
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        base_tasks
    )
    progress1 = await calculate_workpackage_progress(workpackage_id, graph_service)
    
    # Scale all efforts by multiplier
    scaled_tasks = [
        {'progress': t['progress'], 'effort': t['effort'] * effort_multiplier, 'estimated_hours': None}
        for t in base_tasks
    ]
    
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        scaled_tasks
    )
    progress2 = await calculate_workpackage_progress(workpackage_id, graph_service)
    
    assert progress1 == progress2, \
        f"Progress changed from {progress1} to {progress2} after scaling efforts by {effort_multiplier}"


@given(
    null_progress_count=st.integers(min_value=0, max_value=10),
    valid_progress_count=st.integers(min_value=1, max_value=10)
)
@pytest.mark.asyncio
async def test_property_null_progress_treated_as_zero(null_progress_count, valid_progress_count):
    """
    Property: Null progress values are treated as 0%
    
    Tasks with null progress should be treated as 0% complete,
    not excluded from the calculation.
    """
    graph_service = MockGraphService()
    workpackage_id = uuid4()
    
    # Create tasks with null and valid progress
    tasks = (
        [{'progress': None, 'effort': 10.0, 'estimated_hours': None}] * null_progress_count +
        [{'progress': 100, 'effort': 10.0, 'estimated_hours': None}] * valid_progress_count
    )
    
    graph_service.set_query_result(
        f"MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)",
        tasks
    )
    
    progress = await calculate_workpackage_progress(workpackage_id, graph_service)
    
    # Expected: (0*null_count + 100*valid_count) / (null_count + valid_count)
    total_tasks = null_progress_count + valid_progress_count
    expected_progress = int(round((100 * valid_progress_count) / total_tasks))
    
    assert progress == expected_progress, \
        f"Expected {expected_progress}% but got {progress}% with {null_progress_count} null and {valid_progress_count} valid tasks"

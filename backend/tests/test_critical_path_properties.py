"""Property-based tests for critical path calculation using Hypothesis"""

from datetime import UTC, datetime, timedelta
from collections import defaultdict, deque

import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

from app.schemas.schedule import ScheduledTask, ScheduleTaskCreate, TaskDependency
from app.services.critical_path import calculate_critical_path


# Strategies for generating test data
@st.composite
def task_id_strategy(draw):
    """Generate a valid task ID"""
    return draw(
        st.text(
            min_size=1,
            max_size=20,
            alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd", "Pd")),
        )
    )


@st.composite
def task_with_duration_strategy(draw, task_id):
    """Generate a task with a specific ID and random duration"""
    duration_hours = draw(st.integers(min_value=1, max_value=40))
    
    return ScheduleTaskCreate(
        id=task_id,
        title=f"Task {task_id}",
        estimated_hours=duration_hours,
        dependencies=[],
    ), duration_hours


@st.composite
def dag_tasks_strategy(draw, min_tasks=2, max_tasks=10):
    """
    Generate a list of tasks forming a valid DAG (Directed Acyclic Graph).
    
    Returns:
        tuple: (tasks, task_durations_map)
    """
    num_tasks = draw(st.integers(min_value=min_tasks, max_value=max_tasks))
    
    # Generate unique task IDs
    task_ids = []
    for i in range(num_tasks):
        task_id = f"task_{i}"
        task_ids.append(task_id)
    
    # Generate tasks with durations
    tasks = []
    durations = {}
    
    for i, task_id in enumerate(task_ids):
        duration = draw(st.integers(min_value=1, max_value=40))
        durations[task_id] = duration
        
        # Add dependencies only to previous tasks (ensures DAG)
        dependencies = []
        if i > 0:
            # Randomly select some previous tasks as dependencies
            num_deps = draw(st.integers(min_value=0, max_value=min(i, 3)))
            if num_deps > 0:
                dep_indices = draw(
                    st.lists(
                        st.integers(min_value=0, max_value=i - 1),
                        min_size=num_deps,
                        max_size=num_deps,
                        unique=True,
                    )
                )
                for dep_idx in dep_indices:
                    dependencies.append(
                        TaskDependency(
                            predecessor_id=task_ids[dep_idx],
                            dependency_type="finish_to_start",
                        )
                    )
        
        task = ScheduleTaskCreate(
            id=task_id,
            title=f"Task {task_id}",
            estimated_hours=duration,
            dependencies=dependencies,
        )
        tasks.append(task)
    
    return tasks, durations


def create_scheduled_tasks(
    tasks: list[ScheduleTaskCreate], durations: dict[str, int]
) -> list[ScheduledTask]:
    """
    Create scheduled tasks with dates based on dependencies.
    
    This simulates a valid schedule where dependencies are respected.
    """
    # Build dependency graph
    graph = defaultdict(list)
    in_degree = {task.id: 0 for task in tasks}
    
    for task in tasks:
        for dep in task.dependencies:
            graph[dep.predecessor_id].append(task.id)
            in_degree[task.id] += 1
    
    # Topological sort to determine task order
    queue = deque([task_id for task_id, degree in in_degree.items() if degree == 0])
    task_end_times = {}
    
    start_date = datetime(2024, 1, 1, 9, 0, tzinfo=UTC)
    
    while queue:
        current = queue.popleft()
        
        # Calculate start time based on dependencies
        start_time = start_date
        for task in tasks:
            for dep in task.dependencies:
                if dep.predecessor_id == current and task.id in task_end_times:
                    # This shouldn't happen in topological order, but handle it
                    pass
            if task.id == current:
                # Find latest end time of all predecessors
                for dep in task.dependencies:
                    if dep.predecessor_id in task_end_times:
                        pred_end = task_end_times[dep.predecessor_id]
                        if pred_end > start_time:
                            start_time = pred_end
        
        # Schedule this task
        duration = durations[current]
        end_time = start_time + timedelta(hours=duration)
        task_end_times[current] = end_time
        
        # Process successors
        for neighbor in graph[current]:
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    # Create scheduled tasks
    scheduled_tasks = []
    for task in tasks:
        if task.id in task_end_times:
            end_time = task_end_times[task.id]
            duration = durations[task.id]
            start_time = end_time - timedelta(hours=duration)
            
            scheduled_tasks.append(
                ScheduledTask(
                    task_id=task.id,
                    task_title=task.title,
                    start_date=start_time,
                    end_date=end_time,
                    duration_hours=duration,
                    assigned_resources=[],
                )
            )
    
    return scheduled_tasks


def calculate_all_path_durations(
    tasks: list[ScheduleTaskCreate], durations: dict[str, int]
) -> dict[str, float]:
    """
    Calculate the longest path duration to each task in the DAG.
    
    Returns:
        dict: Mapping of task_id to longest path duration to that task
    """
    # Build dependency graph
    graph = defaultdict(list)
    in_degree = {task.id: 0 for task in tasks}
    
    for task in tasks:
        for dep in task.dependencies:
            graph[dep.predecessor_id].append(task.id)
            in_degree[task.id] += 1
    
    # Topological sort with longest path calculation
    longest_path = {task_id: 0.0 for task_id in durations}
    queue = deque([task_id for task_id, degree in in_degree.items() if degree == 0])
    
    while queue:
        current = queue.popleft()
        current_path_length = longest_path[current] + durations[current]
        
        for neighbor in graph[current]:
            if current_path_length > longest_path[neighbor]:
                longest_path[neighbor] = current_path_length
            
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    return longest_path


def build_transitive_closure(
    tasks: list[ScheduleTaskCreate],
) -> dict[str, set[str]]:
    """
    Build transitive closure of the dependency graph.
    
    For each task, compute the set of all tasks it depends on (directly or transitively).
    
    Args:
        tasks: List of tasks with dependencies
    
    Returns:
        dict: Mapping of task_id to set of all predecessor task_ids (transitive)
    """
    # Initialize with direct dependencies
    closure: dict[str, set[str]] = {}
    for task in tasks:
        closure[task.id] = set()
        for dep in task.dependencies:
            closure[task.id].add(dep.predecessor_id)
    
    # Compute transitive closure using Floyd-Warshall-like algorithm
    # For each task, add all predecessors of its predecessors
    changed = True
    while changed:
        changed = False
        for task_id in closure:
            original_size = len(closure[task_id])
            # Add all predecessors of each predecessor
            new_predecessors = set()
            for pred in closure[task_id]:
                if pred in closure:
                    new_predecessors.update(closure[pred])
            closure[task_id].update(new_predecessors)
            if len(closure[task_id]) > original_size:
                changed = True
    
    return closure


def is_valid_path_through_graph(
    path: list[str],
    tasks: list[ScheduleTaskCreate],
) -> bool:
    """
    Check if a path is valid through the dependency graph.
    
    A valid path means:
    1. All tasks in the path exist
    2. For each consecutive pair (A, B) in the path, B depends on A (directly or transitively)
    3. The path forms a connected sequence
    
    Args:
        path: List of task IDs forming a path
        tasks: List of all tasks with dependencies
    
    Returns:
        bool: True if path is valid, False otherwise
    """
    if not path:
        return False
    
    # Build task map
    task_map = {task.id: task for task in tasks}
    
    # Check all tasks in path exist
    for task_id in path:
        if task_id not in task_map:
            return False
    
    # Single task is always a valid path
    if len(path) == 1:
        return True
    
    # Build transitive closure
    closure = build_transitive_closure(tasks)
    
    # Check each consecutive pair
    for i in range(len(path) - 1):
        predecessor = path[i]
        successor = path[i + 1]
        
        # Successor must depend on predecessor (directly or transitively)
        if predecessor not in closure.get(successor, set()):
            return False
    
    return True


class TestCriticalPathProperties:
    """Property-based tests for critical path calculation"""

    @given(dag_data=dag_tasks_strategy(min_tasks=2, max_tasks=10))
    @settings(max_examples=100, deadline=None)
    def test_property_critical_path_duration_gte_any_other_path(self, dag_data):
        """
        Property: The critical path duration must be greater than or equal to any other path duration.
        
        The critical path is defined as the longest path through the dependency graph.
        By definition, no other path can be longer than the critical path.
        
        **Validates: Requirements 1.3, 1.16-1.17, 2.4**
        
        **Formal Property**: 
        ∀ project P, ∀ path p through P's dependency graph,
        duration(critical_path(P)) ≥ duration(p)
        """
        tasks, durations = dag_data
        
        # Ensure we have at least 2 tasks
        assume(len(tasks) >= 2)
        
        # Create scheduled tasks
        scheduled_tasks = create_scheduled_tasks(tasks, durations)
        
        # Ensure all tasks were scheduled
        assume(len(scheduled_tasks) == len(tasks))
        
        # Calculate critical path
        critical_path = calculate_critical_path(tasks, scheduled_tasks)
        
        # Critical path should not be empty
        assert len(critical_path) > 0, "Critical path should not be empty"
        
        # Calculate the duration of the critical path
        critical_path_duration = sum(durations[task_id] for task_id in critical_path)
        
        # Calculate longest path to each task
        all_path_durations = calculate_all_path_durations(tasks, durations)
        
        # The critical path duration should be >= all other path durations
        max_path_duration = max(all_path_durations.values())
        
        assert critical_path_duration >= max_path_duration, (
            f"Critical path duration ({critical_path_duration}) is less than "
            f"maximum path duration ({max_path_duration}). "
            f"Critical path: {critical_path}, "
            f"All path durations: {all_path_durations}"
        )
        
        # Additionally, the critical path should end at the task with the longest path
        end_task = critical_path[-1]
        assert all_path_durations[end_task] == max_path_duration, (
            f"Critical path should end at task with longest path. "
            f"End task: {end_task}, duration: {all_path_durations[end_task]}, "
            f"Max duration: {max_path_duration}"
        )

    @given(dag_data=dag_tasks_strategy(min_tasks=2, max_tasks=10))
    @settings(max_examples=100, deadline=None)
    def test_property_critical_path_is_valid_path_through_graph(self, dag_data):
        """
        Property: The critical path must always be a valid path through the dependency graph.
        
        A valid path means:
        1. All tasks in the critical path exist in the task list
        2. For each consecutive pair of tasks (A, B) in the path, task B depends on task A
           (either directly or transitively through other dependencies)
        3. The path forms a connected sequence through the dependency graph
        
        This property ensures that the critical path algorithm produces a meaningful result
        that respects the dependency structure of the project.
        
        **Validates: Requirements 1.3, 1.16-1.17, 2.4**
        
        **Formal Property**:
        ∀ project P with dependency graph G,
        critical_path(P) = [t₁, t₂, ..., tₙ] ⟹
        ∀i ∈ [1, n-1]: tᵢ₊₁ depends on tᵢ (directly or transitively in G)
        """
        tasks, durations = dag_data
        
        # Ensure we have at least 2 tasks
        assume(len(tasks) >= 2)
        
        # Create scheduled tasks
        scheduled_tasks = create_scheduled_tasks(tasks, durations)
        
        # Ensure all tasks were scheduled
        assume(len(scheduled_tasks) == len(tasks))
        
        # Calculate critical path
        critical_path = calculate_critical_path(tasks, scheduled_tasks)
        
        # Critical path should not be empty
        assert len(critical_path) > 0, "Critical path should not be empty"
        
        # Build task map for validation
        task_map = {task.id: task for task in tasks}
        
        # Property 1: All tasks in critical path must exist
        for task_id in critical_path:
            assert task_id in task_map, (
                f"Critical path contains non-existent task: {task_id}. "
                f"Valid task IDs: {list(task_map.keys())}"
            )
        
        # Property 2 & 3: Critical path must be a valid path through the graph
        assert is_valid_path_through_graph(critical_path, tasks), (
            f"Critical path is not a valid path through the dependency graph. "
            f"Critical path: {critical_path}. "
            f"This means consecutive tasks in the path are not connected by dependencies."
        )
        
        # Additional validation: Check that the path is connected
        # For each consecutive pair, verify the dependency relationship
        if len(critical_path) > 1:
            closure = build_transitive_closure(tasks)
            for i in range(len(critical_path) - 1):
                predecessor = critical_path[i]
                successor = critical_path[i + 1]
                
                assert predecessor in closure.get(successor, set()), (
                    f"Invalid critical path: task '{successor}' does not depend on "
                    f"task '{predecessor}' (position {i} -> {i+1} in path). "
                    f"Critical path: {critical_path}. "
                    f"Task '{successor}' depends on: {closure.get(successor, set())}"
                )

    @given(dag_data=dag_tasks_strategy(min_tasks=2, max_tasks=10))
    @settings(max_examples=100, deadline=None)
    def test_property_all_critical_path_tasks_exist_in_schedule(self, dag_data):
        """
        Property: All critical path tasks must exist in the schedule.
        
        The critical path is a subset of the scheduled tasks. Every task ID in the
        critical path must correspond to a task in the schedule. This ensures that
        the critical path calculation doesn't reference non-existent or unscheduled tasks.
        
        This property validates the integrity of the critical path calculation and
        ensures that the schedule response is consistent - all critical path task IDs
        can be looked up in the schedule.
        
        **Validates: Requirements 1.3, 1.16-1.17, 2.4**
        
        **Formal Property**:
        ∀ project P with schedule S and critical_path CP,
        ∀ task_id ∈ CP ⟹ ∃ task ∈ S where task.task_id = task_id
        
        In other words: critical_path ⊆ {task.task_id | task ∈ schedule}
        """
        tasks, durations = dag_data
        
        # Ensure we have at least 2 tasks
        assume(len(tasks) >= 2)
        
        # Create scheduled tasks
        scheduled_tasks = create_scheduled_tasks(tasks, durations)
        
        # Ensure all tasks were scheduled
        assume(len(scheduled_tasks) == len(tasks))
        
        # Calculate critical path
        critical_path = calculate_critical_path(tasks, scheduled_tasks)
        
        # Critical path should not be empty
        assert len(critical_path) > 0, "Critical path should not be empty"
        
        # Build set of scheduled task IDs for efficient lookup
        scheduled_task_ids = {task.task_id for task in scheduled_tasks}
        
        # Property: All critical path tasks must exist in the schedule
        for task_id in critical_path:
            assert task_id in scheduled_task_ids, (
                f"Critical path contains task '{task_id}' which does not exist in the schedule. "
                f"Critical path: {critical_path}. "
                f"Scheduled task IDs: {sorted(scheduled_task_ids)}"
            )
        
        # Additional validation: Verify critical path is a subset of scheduled tasks
        critical_path_set = set(critical_path)
        assert critical_path_set.issubset(scheduled_task_ids), (
            f"Critical path is not a subset of scheduled tasks. "
            f"Critical path tasks: {sorted(critical_path_set)}. "
            f"Scheduled tasks: {sorted(scheduled_task_ids)}. "
            f"Missing tasks: {sorted(critical_path_set - scheduled_task_ids)}"
        )
        
        # Verify each critical path task has valid schedule data
        scheduled_task_map = {task.task_id: task for task in scheduled_tasks}
        for task_id in critical_path:
            scheduled_task = scheduled_task_map[task_id]
            
            # Verify scheduled task has required fields
            assert scheduled_task.task_id == task_id, (
                f"Task ID mismatch: expected '{task_id}', got '{scheduled_task.task_id}'"
            )
            assert scheduled_task.start_date is not None, (
                f"Critical path task '{task_id}' has no start_date in schedule"
            )
            assert scheduled_task.end_date is not None, (
                f"Critical path task '{task_id}' has no end_date in schedule"
            )
            assert scheduled_task.duration_hours > 0, (
                f"Critical path task '{task_id}' has invalid duration: {scheduled_task.duration_hours}"
            )
            assert scheduled_task.start_date < scheduled_task.end_date, (
                f"Critical path task '{task_id}' has invalid date range: "
                f"start={scheduled_task.start_date}, end={scheduled_task.end_date}"
            )


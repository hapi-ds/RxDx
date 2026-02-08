"""Critical Path Calculation using Longest Path Algorithm"""

import logging
from collections import defaultdict, deque

from app.schemas.schedule import ScheduledTask, ScheduleTaskCreate

logger = logging.getLogger(__name__)


def calculate_critical_path(
    tasks: list[ScheduleTaskCreate],
    scheduled_tasks: list[ScheduledTask],
) -> list[str]:
    """
    Calculate critical path using longest path algorithm through dependency graph.

    The critical path is the sequence of dependent tasks that determines the minimum
    project duration. It's calculated by finding the longest path through the task
    dependency graph using topological sort with longest path calculation.

    Algorithm:
    1. Build adjacency list from task dependencies
    2. Calculate task durations from scheduled results
    3. Perform topological sort with longest path tracking
    4. Backtrack from end task to reconstruct critical path

    Args:
        tasks: List of tasks with dependencies
        scheduled_tasks: List of scheduled tasks with actual dates

    Returns:
        List of task IDs on the critical path, ordered from start to end

    Raises:
        ValueError: If circular dependencies detected or invalid task data
    """
    if not tasks or not scheduled_tasks:
        logger.warning("Cannot calculate critical path: no tasks provided")
        return []

    # Build task lookup maps
    task_map = {task.id: task for task in tasks}
    scheduled_map = {st.task_id: st for st in scheduled_tasks}

    # Validate all tasks are scheduled
    missing_tasks = set(task_map.keys()) - set(scheduled_map.keys())
    if missing_tasks:
        logger.warning(
            f"Cannot calculate critical path: tasks not scheduled: {missing_tasks}"
        )
        return []

    # Build dependency graph (adjacency list)
    graph: dict[str, list[str]] = defaultdict(list)
    in_degree: dict[str, int] = {task.id: 0 for task in tasks}

    for task in tasks:
        for dep in task.dependencies:
            predecessor_id = dep.predecessor_id

            # Validate predecessor exists
            if predecessor_id not in task_map:
                logger.warning(
                    f"Invalid dependency: task '{task.id}' depends on "
                    f"non-existent task '{predecessor_id}'"
                )
                continue

            # Add edge: predecessor -> task
            graph[predecessor_id].append(task.id)
            in_degree[task.id] += 1

    # Detect cycles using topological sort
    if _has_cycle(graph, in_degree):
        logger.error("Cannot calculate critical path: circular dependencies detected")
        raise ValueError("Circular dependencies detected in task graph")

    # Calculate task durations in hours
    durations: dict[str, float] = {}
    for task_id, scheduled_task in scheduled_map.items():
        duration = (
            scheduled_task.end_date - scheduled_task.start_date
        ).total_seconds() / 3600
        durations[task_id] = duration

    # Topological sort with longest path calculation
    longest_path: dict[str, float] = {task_id: 0.0 for task_id in task_map}
    predecessor: dict[str, str | None] = {task_id: None for task_id in task_map}

    # Queue of tasks with no dependencies (in_degree = 0)
    queue: deque[str] = deque(
        [task_id for task_id, degree in in_degree.items() if degree == 0]
    )

    processed_count = 0

    while queue:
        current = queue.popleft()
        processed_count += 1

        # Calculate path length to this task
        current_path_length = longest_path[current] + durations[current]

        # Update successors
        for neighbor in graph[current]:
            # Update longest path if we found a longer one
            if current_path_length > longest_path[neighbor]:
                longest_path[neighbor] = current_path_length
                predecessor[neighbor] = current

            # Decrease in-degree
            in_degree[neighbor] -= 1

            # Add to queue if all dependencies satisfied
            if in_degree[neighbor] == 0:
                queue.append(neighbor)

    # Verify all tasks were processed (no cycles)
    if processed_count != len(tasks):
        logger.error(
            f"Critical path calculation incomplete: processed {processed_count} "
            f"of {len(tasks)} tasks. Possible cycle detected."
        )
        raise ValueError("Circular dependencies detected during topological sort")

    # Find the task with the longest path (project end)
    if not longest_path:
        logger.warning("No tasks in longest path calculation")
        return []

    end_task = max(longest_path.keys(), key=lambda task_id: longest_path[task_id])

    logger.info(
        f"Critical path end task: '{end_task}' with path length "
        f"{longest_path[end_task]:.2f} hours"
    )

    # Backtrack to find the critical path
    critical_path: list[str] = []
    current: str | None = end_task

    while current is not None:
        critical_path.insert(0, current)
        current = predecessor[current]

    logger.info(
        f"Critical path calculated: {len(critical_path)} tasks, "
        f"total duration {longest_path[end_task]:.2f} hours"
    )

    return critical_path


def _has_cycle(graph: dict[str, list[str]], in_degree: dict[str, int]) -> bool:
    """
    Check if the dependency graph has cycles using Kahn's algorithm.

    Args:
        graph: Adjacency list representation of task dependencies
        in_degree: In-degree count for each task

    Returns:
        True if cycle detected, False otherwise
    """
    # Create a copy of in_degree to avoid modifying original
    in_degree_copy = in_degree.copy()

    # Queue of tasks with no dependencies
    queue: deque[str] = deque(
        [task_id for task_id, degree in in_degree_copy.items() if degree == 0]
    )

    processed_count = 0

    while queue:
        current = queue.popleft()
        processed_count += 1

        # Process successors
        for neighbor in graph[current]:
            in_degree_copy[neighbor] -= 1
            if in_degree_copy[neighbor] == 0:
                queue.append(neighbor)

    # If not all tasks processed, there's a cycle
    return processed_count != len(in_degree)

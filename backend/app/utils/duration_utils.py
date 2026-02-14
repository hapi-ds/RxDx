"""Utility functions for duration calculation and minimal duration enforcement"""

from typing import Any
from uuid import UUID

from app.db.graph import GraphService


def enforce_minimal_duration(
    entity: dict[str, Any], calculated_duration_days: int
) -> int:
    """
    Enforce minimal duration for phases and workpackages.

    When an entity has a minimal_duration property, this function ensures
    that the final duration is at least that minimum value.

    Args:
        entity: Phase or Workpackage dict with minimal_duration property
        calculated_duration_days: Duration calculated from tasks

    Returns:
        Adjusted duration (max of calculated and minimal)
    """
    minimal_duration = entity.get("minimal_duration")

    if not minimal_duration or minimal_duration <= 0:
        return calculated_duration_days

    # Use the larger of calculated duration and minimal duration
    return max(calculated_duration_days, minimal_duration)


async def calculate_workpackage_duration(
    workpackage_id: UUID | str, graph_service: GraphService
) -> int:
    """
    Calculate workpackage duration from tasks with minimal_duration fallback.

    Duration is calculated as the sum of all task durations in the workpackage.
    If no tasks exist, uses the workpackage's minimal_duration.
    If calculated duration < minimal_duration, uses minimal_duration.

    Args:
        workpackage_id: Workpackage UUID
        graph_service: Graph service instance

    Returns:
        Workpackage duration in calendar days
    """
    # Get workpackage
    wp_query = f"""
    MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})
    RETURN wp.minimal_duration as minimal_duration
    """
    wp_results = await graph_service.execute_query(wp_query)

    if not wp_results:
        return 0

    minimal_duration = wp_results[0].get("minimal_duration", 0) or 0

    # Get all tasks in workpackage
    tasks_query = f"""
    MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(workpackage_id)}'}})
    RETURN t.duration as duration
    """
    tasks = await graph_service.execute_query(tasks_query)

    if not tasks:
        # No tasks, use minimal_duration
        return minimal_duration

    # Sum task durations
    calculated_duration = sum(t.get("duration", 0) or 0 for t in tasks)

    # Enforce minimal_duration
    return max(calculated_duration, minimal_duration)


async def calculate_phase_duration(
    phase_id: UUID | str, graph_service: GraphService
) -> int:
    """
    Calculate phase duration from workpackages and tasks with minimal_duration fallback.

    Duration is calculated as the sum of all workpackage durations in the phase.
    Each workpackage duration is calculated from its tasks or uses its minimal_duration.
    If no workpackages exist, uses the phase's minimal_duration.
    If calculated duration < minimal_duration, uses minimal_duration.

    Args:
        phase_id: Phase UUID
        graph_service: Graph service instance

    Returns:
        Phase duration in calendar days
    """
    # Get phase
    phase_query = f"""
    MATCH (ph:Phase {{id: '{str(phase_id)}'}})
    RETURN ph.minimal_duration as minimal_duration
    """
    phase_results = await graph_service.execute_query(phase_query)

    if not phase_results:
        return 0

    minimal_duration = phase_results[0].get("minimal_duration", 0) or 0

    # Get all workpackages in phase
    wp_query = f"""
    MATCH (wp:Workpackage)-[:BELONGS_TO]->(ph:Phase {{id: '{str(phase_id)}'}})
    RETURN wp.id as workpackage_id, wp.minimal_duration as wp_minimal_duration
    """
    workpackages = await graph_service.execute_query(wp_query)

    if not workpackages:
        # No workpackages, use minimal_duration
        return minimal_duration

    # Calculate duration from workpackages
    total_duration = 0
    for wp_data in workpackages:
        workpackage_id = wp_data.get("workpackage_id")
        wp_minimal_duration = wp_data.get("wp_minimal_duration", 0) or 0

        # Get tasks in workpackage
        tasks_query = f"""
        MATCH (t:Task)-[:BELONGS_TO]->(wp:Workpackage {{id: '{workpackage_id}'}})
        RETURN t.duration as duration
        """
        tasks = await graph_service.execute_query(tasks_query)

        if tasks:
            # Sum task durations
            wp_duration = sum(t.get("duration", 0) or 0 for t in tasks)
        else:
            # No tasks, use workpackage minimal_duration
            wp_duration = wp_minimal_duration

        # Enforce workpackage minimal_duration
        wp_duration = max(wp_duration, wp_minimal_duration)

        total_duration += wp_duration

    # Enforce phase minimal_duration
    return max(total_duration, minimal_duration)

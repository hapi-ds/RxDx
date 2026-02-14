"""Utility functions for progress tracking and calculation"""

from datetime import datetime
from typing import Any
from uuid import UUID

from app.db.graph import GraphService


async def calculate_workpackage_progress(
    workpackage_id: UUID | str,
    graph_service: GraphService
) -> int:
    """
    Calculate progress for a workpackage by aggregating task progress.
    
    Progress is calculated as the weighted average of all tasks in the workpackage,
    where each task's contribution is weighted by its effort (hours).
    
    Args:
        workpackage_id: Workpackage UUID
        graph_service: Graph service instance
    
    Returns:
        Progress percentage (0-100)
    """
    # Query all tasks in the workpackage with their progress and effort
    query = f"""
    MATCH (wp:Workpackage {{id: '{str(workpackage_id)}'}})<-[:BELONGS_TO]-(t:Task)
    RETURN t.progress as progress, t.effort as effort, t.estimated_hours as estimated_hours
    """
    
    results = await graph_service.execute_query(query)
    
    if not results:
        return 0
    
    total_weighted_progress = 0.0
    total_weight = 0.0
    
    for row in results:
        progress = row.get('progress', 0) or 0
        # Use effort if available, fall back to estimated_hours
        weight = row.get('effort') or row.get('estimated_hours') or 1.0
        
        total_weighted_progress += progress * weight
        total_weight += weight
    
    if total_weight == 0:
        return 0
    
    return int(round(total_weighted_progress / total_weight))


async def calculate_phase_progress(
    phase_id: UUID | str,
    graph_service: GraphService
) -> int:
    """
    Calculate progress for a phase by aggregating workpackage progress.
    
    Progress is calculated as the weighted average of all workpackages in the phase,
    where each workpackage's contribution is weighted by the sum of task efforts.
    
    Args:
        phase_id: Phase UUID
        graph_service: Graph service instance
    
    Returns:
        Progress percentage (0-100)
    """
    # Query all workpackages in the phase
    query = f"""
    MATCH (p:Phase {{id: '{str(phase_id)}'}})<-[:BELONGS_TO]-(wp:Workpackage)
    RETURN wp.id as workpackage_id, wp.progress as progress
    """
    
    results = await graph_service.execute_query(query)
    
    if not results:
        return 0
    
    total_weighted_progress = 0.0
    total_weight = 0.0
    
    for row in results:
        workpackage_id = row.get('workpackage_id')
        # Use stored progress if available, otherwise calculate it
        progress = row.get('progress')
        
        if progress is None:
            progress = await calculate_workpackage_progress(workpackage_id, graph_service)
        
        # Get total effort for this workpackage (sum of task efforts)
        effort_query = f"""
        MATCH (wp:Workpackage {{id: '{workpackage_id}'}})<-[:BELONGS_TO]-(t:Task)
        RETURN sum(coalesce(t.effort, t.estimated_hours, 1.0)) as total_effort
        """
        effort_results = await graph_service.execute_query(effort_query)
        weight = effort_results[0].get('total_effort', 1.0) if effort_results else 1.0
        
        total_weighted_progress += progress * weight
        total_weight += weight
    
    if total_weight == 0:
        return 0
    
    return int(round(total_weighted_progress / total_weight))


async def calculate_project_progress(
    project_id: UUID | str,
    graph_service: GraphService
) -> int:
    """
    Calculate progress for a project by aggregating phase progress.
    
    Progress is calculated as the weighted average of all phases in the project,
    where each phase's contribution is weighted by the sum of workpackage efforts.
    
    Args:
        project_id: Project UUID
        graph_service: Graph service instance
    
    Returns:
        Progress percentage (0-100)
    """
    # Query all phases in the project
    query = f"""
    MATCH (proj:Project {{id: '{str(project_id)}'}})<-[:BELONGS_TO]-(p:Phase)
    RETURN p.id as phase_id, p.progress as progress
    """
    
    results = await graph_service.execute_query(query)
    
    if not results:
        return 0
    
    total_weighted_progress = 0.0
    total_weight = 0.0
    
    for row in results:
        phase_id = row.get('phase_id')
        # Use stored progress if available, otherwise calculate it
        progress = row.get('progress')
        
        if progress is None:
            progress = await calculate_phase_progress(phase_id, graph_service)
        
        # Get total effort for this phase (sum of workpackage efforts)
        effort_query = f"""
        MATCH (p:Phase {{id: '{phase_id}'}})<-[:BELONGS_TO]-(wp:Workpackage)<-[:BELONGS_TO]-(t:Task)
        RETURN sum(coalesce(t.effort, t.estimated_hours, 1.0)) as total_effort
        """
        effort_results = await graph_service.execute_query(effort_query)
        weight = effort_results[0].get('total_effort', 1.0) if effort_results else 1.0
        
        total_weighted_progress += progress * weight
        total_weight += weight
    
    if total_weight == 0:
        return 0
    
    return int(round(total_weighted_progress / total_weight))


def calculate_variance_days(
    entity_data: dict[str, Any]
) -> int | None:
    """
    Calculate variance in days between actual and planned start dates.
    
    Variance = (start_date_is - start_date) in days
    - Positive variance: Started later than planned (delay)
    - Negative variance: Started earlier than planned (ahead of schedule)
    - None: No variance can be calculated (missing dates)
    
    Args:
        entity_data: Entity data containing start_date and start_date_is
    
    Returns:
        Variance in days, or None if dates are not available
    """
    start_date_is_str = entity_data.get('start_date_is')
    start_date_str = entity_data.get('start_date') or entity_data.get('calculated_start_date')
    
    if not start_date_is_str or not start_date_str:
        return None
    
    try:
        # Parse ISO datetime strings
        start_date_is = datetime.fromisoformat(start_date_is_str.replace('Z', '+00:00'))
        start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
        
        # Calculate difference in days
        delta = start_date_is - start_date
        return delta.days
    except (ValueError, AttributeError):
        return None


async def update_entity_progress(
    entity_id: UUID | str,
    entity_type: str,
    graph_service: GraphService
) -> int:
    """
    Update and return progress for an entity (workpackage, phase, or project).
    
    This function calculates progress based on child entities and updates
    the entity's progress property in the graph database.
    
    Args:
        entity_id: Entity UUID
        entity_type: Type of entity ('workpackage', 'phase', or 'project')
        graph_service: Graph service instance
    
    Returns:
        Calculated progress percentage (0-100)
    
    Raises:
        ValueError: If entity_type is invalid
    """
    if entity_type.lower() == 'workpackage':
        progress = await calculate_workpackage_progress(entity_id, graph_service)
        node_label = 'Workpackage'
    elif entity_type.lower() == 'phase':
        progress = await calculate_phase_progress(entity_id, graph_service)
        node_label = 'Phase'
    elif entity_type.lower() == 'project':
        progress = await calculate_project_progress(entity_id, graph_service)
        node_label = 'Project'
    else:
        raise ValueError(f"Invalid entity_type: {entity_type}. Must be 'workpackage', 'phase', or 'project'")
    
    # Update the entity's progress in the graph
    update_query = f"""
    MATCH (n:{node_label} {{id: '{str(entity_id)}'}})
    SET n.progress = {progress}
    RETURN n.progress as progress
    """
    
    await graph_service.execute_query(update_query)
    
    return progress

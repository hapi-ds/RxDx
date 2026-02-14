"""Utility functions for Gantt chart data preparation.

This module implements the Gantt chart data preparation logic with date priority rules,
progress tracking, and variance calculation for all entity types (tasks, workpackages, phases).

Requirements: 16A.32-16A.36, 3.1-3.13
"""

from datetime import datetime
from uuid import UUID

from app.db.graph import GraphService
from app.schemas.schedule import (
    GanttChartData,
    GanttMilestone,
    GanttPhase,
    GanttSprint,
    GanttTaskDependency,
    GanttWorkpackage,
    ScheduledTask,
)
from app.utils.date_utils import get_display_dates_for_entity, get_progress_indicator


async def prepare_gantt_data(
    project_id: UUID,
    graph_service: GraphService,
    schedule_data: dict | None = None,
) -> GanttChartData:
    """
    Prepare complete Gantt chart data with date priorities and progress tracking.
    
    This function retrieves all project entities (tasks, workpackages, phases, milestones, sprints)
    and formats them for Gantt chart visualization with:
    - Date priority logic (manual dates > calculated dates)
    - Progress tracking with variance calculation
    - Delay indicators
    - Critical path highlighting
    - Dependencies and relationships
    
    Args:
        project_id: Project UUID
        graph_service: Graph service instance
        schedule_data: Optional pre-computed schedule data (for performance)
    
    Returns:
        GanttChartData with all visualization data
    
    Requirements: 16A.32-16A.36, 3.1-3.13
    """
    # Get all entities for the project
    tasks = await _get_project_tasks(project_id, graph_service, schedule_data)
    workpackages = await _get_project_workpackages(project_id, graph_service)
    phases = await _get_project_phases(project_id, graph_service)
    milestones = await _get_project_milestones(project_id, graph_service)
    sprints = await _get_project_sprints(project_id, graph_service)
    dependencies = await _get_task_dependencies(project_id, graph_service)
    
    # Get critical path from schedule data
    critical_path = schedule_data.get("critical_path", []) if schedule_data else []
    
    # Calculate project dates and completion
    project_start = _calculate_project_start(tasks, workpackages, phases)
    project_end = _calculate_project_end(tasks, workpackages, phases)
    completion = _calculate_project_completion(tasks, workpackages, phases)
    
    return GanttChartData(
        project_id=project_id,
        tasks=tasks,
        workpackages=workpackages,
        phases=phases,
        dependencies=dependencies,
        critical_path=critical_path,
        milestones=milestones,
        sprints=sprints,
        project_start_date=project_start,
        project_end_date=project_end,
        completion_percentage=completion,
    )


async def _get_project_tasks(
    project_id: UUID,
    graph_service: GraphService,
    schedule_data: dict | None = None,
) -> list[ScheduledTask]:
    """Get all tasks for a project with date priority and progress tracking."""
    # For now, get all tasks since we're using a placeholder project ID
    # TODO: Filter by actual project when project structure is implemented
    query = f"""
    MATCH (w:WorkItem {{type: 'task'}})
    WHERE w.calculated_start_date IS NOT NULL AND w.calculated_end_date IS NOT NULL
    RETURN {{
        id: w.id,
        title: w.title,
        manual_start_date: w.start_date,
        manual_due_date: w.due_date,
        calculated_start_date: w.calculated_start_date,
        calculated_end_date: w.calculated_end_date,
        progress: w.progress,
        start_date_is: w.start_date_is,
        duration: w.duration,
        effort: w.effort,
        skills: w.skills,
        is_critical: w.is_critical
    }} as result
    """
    
    results = await graph_service.execute_query(query)
    tasks = []
    
    for row in results:
        # Parse dates
        manual_start = _parse_datetime(row.get("manual_start_date"))
        manual_due = _parse_datetime(row.get("manual_due_date"))
        calc_start = _parse_datetime(row.get("calculated_start_date"))
        calc_end = _parse_datetime(row.get("calculated_end_date"))
        start_date_is = _parse_datetime(row.get("start_date_is"))
        
        # Apply date priority logic
        display_dates = get_display_dates_for_entity(
            start_date=manual_start,
            due_date=manual_due,
            calculated_start_date=calc_start,
            calculated_end_date=calc_end,
        )
        
        # Calculate progress indicator
        progress_indicator = get_progress_indicator(
            progress=row.get("progress"),
            start_date_is=start_date_is,
            start_date=manual_start,
            calculated_start_date=calc_start,
        )
        
        # Get resource allocations
        resource_query = f"""
        MATCH (r:Resource)-[:ALLOCATED_TO]->(w:WorkItem {{id: '{row["id"]}', type: 'task'}})
        RETURN {{resource_id: r.id}} as result
        """
        resource_results = await graph_service.execute_query(resource_query)
        assigned_resources = [r["resource_id"] for r in resource_results]
        
        # Calculate duration in hours
        duration = row.get("duration", 0) or 0
        effort = row.get("effort", 0) or 0
        duration_hours = effort if effort > 0 else duration * 8  # Assume 8 hours/day
        
        tasks.append(
            ScheduledTask(
                task_id=row["id"],
                task_title=row["title"],
                start_date=display_dates["start_date"] or datetime.now(),
                end_date=display_dates["end_date"] or datetime.now(),
                calculated_start_date=calc_start,
                calculated_end_date=calc_end,
                manual_start_date=manual_start,
                manual_due_date=manual_due,
                progress=progress_indicator["progress"],
                start_date_is=start_date_is,
                variance_days=progress_indicator["variance_days"],
                is_delayed=progress_indicator["is_delayed"],
                duration_hours=int(duration_hours),
                assigned_resources=assigned_resources,
                is_critical=row.get("is_critical", False) or False,
                skills=row.get("skills", []) or [],
            )
        )
    
    return tasks


async def _get_project_workpackages(
    project_id: UUID,
    graph_service: GraphService,
) -> list[GanttWorkpackage]:
    """Get all workpackages for a project with date priority and progress tracking."""
    # For now, return empty list since we're using a placeholder project ID
    # TODO: Implement when project structure is properly set up
    return []


async def _get_project_phases(
    project_id: UUID,
    graph_service: GraphService,
) -> list[GanttPhase]:
    """Get all phases for a project with date priority and progress tracking."""
    # For now, return empty list since we're using a placeholder project ID
    # TODO: Implement when project structure is properly set up
    return []


async def _get_project_milestones(
    project_id: UUID,
    graph_service: GraphService,
) -> list[GanttMilestone]:
    """Get all milestones for a project."""
    # For now, return empty list since we're using a placeholder project ID
    # TODO: Implement when project structure is properly set up
    return []


async def _get_project_sprints(
    project_id: UUID,
    graph_service: GraphService,
) -> list[GanttSprint]:
    """Get all sprints for a project."""
    # For now, return empty list since we're using a placeholder project ID
    # TODO: Implement when project structure is properly set up
    return []


async def _get_task_dependencies(
    project_id: UUID,
    graph_service: GraphService,
) -> list[GanttTaskDependency]:
    """Get all task dependencies for a project."""
    # For now, return empty list since we're using a placeholder project ID
    # TODO: Implement when project structure is properly set up
    return []


def _parse_datetime(value: str | datetime | None) -> datetime | None:
    """Parse datetime from string or return as-is."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, AttributeError):
        return None


def _calculate_project_start(
    tasks: list[ScheduledTask],
    workpackages: list[GanttWorkpackage],
    phases: list[GanttPhase],
) -> datetime:
    """Calculate project start date from all entities."""
    dates = []
    
    for task in tasks:
        if task.start_date:
            dates.append(task.start_date)
    
    for wp in workpackages:
        if wp.start_date:
            dates.append(wp.start_date)
    
    for phase in phases:
        if phase.start_date:
            dates.append(phase.start_date)
    
    return min(dates) if dates else datetime.now()


def _calculate_project_end(
    tasks: list[ScheduledTask],
    workpackages: list[GanttWorkpackage],
    phases: list[GanttPhase],
) -> datetime:
    """Calculate project end date from all entities."""
    dates = []
    
    for task in tasks:
        if task.end_date:
            dates.append(task.end_date)
    
    for wp in workpackages:
        if wp.end_date:
            dates.append(wp.end_date)
    
    for phase in phases:
        if phase.end_date:
            dates.append(phase.end_date)
    
    return max(dates) if dates else datetime.now()


def _calculate_project_completion(
    tasks: list[ScheduledTask],
    workpackages: list[GanttWorkpackage],
    phases: list[GanttPhase],
) -> float:
    """Calculate project completion percentage."""
    if not tasks:
        return 0.0
    
    total_progress = sum(task.progress for task in tasks)
    return round(total_progress / len(tasks), 2)

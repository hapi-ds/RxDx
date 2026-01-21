"""Project Scheduler Service using Google OR-Tools for constraint-based scheduling"""

from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
import logging

from ortools.sat.python import cp_model

from app.schemas.schedule import (
    ScheduleTaskCreate,
    ResourceCreate,
    ScheduleConstraints,
    ScheduledTask,
    ScheduleResponse,
    ScheduleConflict,
    TaskDependency,
    ProjectSchedule,
    ScheduleUpdate,
)

logger = logging.getLogger(__name__)


class SchedulerService:
    """
    Service for project scheduling using constraint programming with OR-Tools.
    
    Supports:
    - Task dependencies (finish-to-start, start-to-start, finish-to-finish)
    - Resource capacity constraints
    - Schedule optimization (minimize project duration)
    - Conflict identification
    """
    
    def __init__(self):
        """Initialize the scheduler service"""
        self._schedules: Dict[str, ProjectSchedule] = {}  # In-memory storage for schedules
    
    async def schedule_project(
        self,
        project_id: UUID,
        tasks: List[ScheduleTaskCreate],
        resources: List[ResourceCreate],
        constraints: ScheduleConstraints
    ) -> ScheduleResponse:
        """
        Schedule project tasks using constraint programming.
        
        Args:
            project_id: Unique project identifier
            tasks: List of tasks to schedule
            resources: List of available resources
            constraints: Project constraints
            
        Returns:
            ScheduleResponse with scheduled tasks or conflicts
        """
        if not tasks:
            return ScheduleResponse(
                status="error",
                project_id=project_id,
                message="No tasks provided for scheduling"
            )
        
        # Create the constraint programming model
        model = cp_model.CpModel()
        
        # Calculate horizon in hours
        horizon = constraints.horizon_days * constraints.working_hours_per_day
        
        # Create task variables
        task_vars = self._create_task_variables(model, tasks, horizon)
        
        # Add dependency constraints
        dependency_conflicts = self._add_dependency_constraints(model, tasks, task_vars)
        if dependency_conflicts:
            return ScheduleResponse(
                status="infeasible",
                project_id=project_id,
                conflicts=dependency_conflicts,
                message="Dependency constraints cannot be satisfied"
            )
        
        # Add resource constraints
        resource_conflicts = self._add_resource_constraints(model, tasks, resources, task_vars)
        if resource_conflicts:
            return ScheduleResponse(
                status="infeasible",
                project_id=project_id,
                conflicts=resource_conflicts,
                message="Resource constraints cannot be satisfied"
            )
        
        # Add deadline constraints if specified
        self._add_deadline_constraints(model, tasks, task_vars, constraints)
        
        # Set optimization objective: minimize project duration
        project_end = self._add_optimization_objective(model, tasks, task_vars, horizon)
        
        # Solve the model
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 60.0  # Timeout after 60 seconds
        
        status = solver.Solve(model)
        
        if status == cp_model.OPTIMAL or status == cp_model.FEASIBLE:
            schedule = self._extract_schedule(solver, tasks, task_vars, constraints)
            project_duration = solver.Value(project_end)
            
            # Calculate project dates
            project_start_date = constraints.project_start or datetime.now(timezone.utc)
            project_end_date = self._hours_to_datetime(
                project_duration, 
                project_start_date, 
                constraints
            )
            
            response = ScheduleResponse(
                status="success" if status == cp_model.OPTIMAL else "feasible",
                project_id=project_id,
                schedule=schedule,
                project_duration_hours=project_duration,
                project_start_date=project_start_date,
                project_end_date=project_end_date,
                message="Optimal schedule found" if status == cp_model.OPTIMAL else "Feasible schedule found"
            )
            
            # Store the schedule
            await self._store_schedule(project_id, response, resources, constraints)
            
            return response
        else:
            conflicts = self._identify_conflicts(tasks, resources, constraints)
            return ScheduleResponse(
                status="infeasible",
                project_id=project_id,
                conflicts=conflicts,
                message="No feasible schedule found. Check conflicts for details."
            )
    
    def _create_task_variables(
        self,
        model: cp_model.CpModel,
        tasks: List[ScheduleTaskCreate],
        horizon: int
    ) -> Dict[str, Dict[str, Any]]:
        """Create CP variables for each task"""
        task_vars = {}
        
        for task in tasks:
            start_var = model.NewIntVar(0, horizon, f"start_{task.id}")
            end_var = model.NewIntVar(0, horizon, f"end_{task.id}")
            duration = task.estimated_hours
            
            # Constraint: end = start + duration
            model.Add(end_var == start_var + duration)
            
            task_vars[task.id] = {
                'start': start_var,
                'end': end_var,
                'duration': duration,
                'task': task
            }
        
        return task_vars
    
    def _add_dependency_constraints(
        self,
        model: cp_model.CpModel,
        tasks: List[ScheduleTaskCreate],
        task_vars: Dict[str, Dict[str, Any]]
    ) -> List[ScheduleConflict]:
        """
        Add task dependency constraints to the model.
        
        Supports:
        - finish_to_start: Successor can't start until predecessor finishes
        - start_to_start: Successor can't start until predecessor starts
        - finish_to_finish: Successor can't finish until predecessor finishes
        """
        conflicts = []
        task_ids = set(task_vars.keys())
        
        for task in tasks:
            for dep in task.dependencies:
                predecessor_id = dep.predecessor_id
                
                # Check if predecessor exists
                if predecessor_id not in task_ids:
                    conflicts.append(ScheduleConflict(
                        conflict_type="missing_dependency",
                        description=f"Task '{task.id}' depends on non-existent task '{predecessor_id}'",
                        affected_tasks=[task.id, predecessor_id],
                        suggestion=f"Add task '{predecessor_id}' or remove the dependency"
                    ))
                    continue
                
                predecessor_vars = task_vars[predecessor_id]
                successor_vars = task_vars[task.id]
                lag = dep.lag
                
                if dep.dependency_type == "finish_to_start":
                    # Successor can't start until predecessor finishes (+ lag)
                    model.Add(
                        successor_vars['start'] >= predecessor_vars['end'] + lag
                    )
                elif dep.dependency_type == "start_to_start":
                    # Successor can't start until predecessor starts (+ lag)
                    model.Add(
                        successor_vars['start'] >= predecessor_vars['start'] + lag
                    )
                elif dep.dependency_type == "finish_to_finish":
                    # Successor can't finish until predecessor finishes (+ lag)
                    model.Add(
                        successor_vars['end'] >= predecessor_vars['end'] + lag
                    )
        
        return conflicts
    
    def _add_resource_constraints(
        self,
        model: cp_model.CpModel,
        tasks: List[ScheduleTaskCreate],
        resources: List[ResourceCreate],
        task_vars: Dict[str, Dict[str, Any]]
    ) -> List[ScheduleConflict]:
        """Add resource capacity constraints using cumulative constraints"""
        conflicts = []
        resource_map = {r.id: r for r in resources}
        
        for resource in resources:
            intervals = []
            demands = []
            
            for task in tasks:
                if resource.id in task.required_resources:
                    task_var = task_vars[task.id]
                    
                    # Create interval variable for this task-resource combination
                    interval = model.NewIntervalVar(
                        task_var['start'],
                        task_var['duration'],
                        task_var['end'],
                        f"interval_{task.id}_{resource.id}"
                    )
                    intervals.append(interval)
                    
                    # Get resource demand (default to 1)
                    demand = task.resource_demand.get(resource.id, 1)
                    demands.append(demand)
            
            if intervals:
                # Add cumulative constraint: sum of demands at any time <= capacity
                model.AddCumulative(intervals, demands, resource.capacity)
        
        # Check for tasks requiring non-existent resources
        for task in tasks:
            for resource_id in task.required_resources:
                if resource_id not in resource_map:
                    conflicts.append(ScheduleConflict(
                        conflict_type="missing_resource",
                        description=f"Task '{task.id}' requires non-existent resource '{resource_id}'",
                        affected_tasks=[task.id],
                        affected_resources=[resource_id],
                        suggestion=f"Add resource '{resource_id}' or remove it from task requirements"
                    ))
        
        return conflicts
    
    def _add_deadline_constraints(
        self,
        model: cp_model.CpModel,
        tasks: List[ScheduleTaskCreate],
        task_vars: Dict[str, Dict[str, Any]],
        constraints: ScheduleConstraints
    ) -> None:
        """Add deadline constraints for tasks and project"""
        project_start = constraints.project_start or datetime.now(timezone.utc)
        
        for task in tasks:
            task_var = task_vars[task.id]
            
            # Add earliest start constraint
            if task.earliest_start:
                earliest_hours = self._datetime_to_hours(
                    task.earliest_start, 
                    project_start, 
                    constraints
                )
                if earliest_hours > 0:
                    model.Add(task_var['start'] >= earliest_hours)
            
            # Add task deadline constraint
            if task.deadline:
                deadline_hours = self._datetime_to_hours(
                    task.deadline, 
                    project_start, 
                    constraints
                )
                model.Add(task_var['end'] <= deadline_hours)
        
        # Add project deadline constraint
        if constraints.project_deadline:
            project_deadline_hours = self._datetime_to_hours(
                constraints.project_deadline,
                project_start,
                constraints
            )
            for task_var in task_vars.values():
                model.Add(task_var['end'] <= project_deadline_hours)
    
    def _add_optimization_objective(
        self,
        model: cp_model.CpModel,
        tasks: List[ScheduleTaskCreate],
        task_vars: Dict[str, Dict[str, Any]],
        horizon: int
    ) -> cp_model.IntVar:
        """Add optimization objective to minimize project duration"""
        # Create variable for project end time
        project_end = model.NewIntVar(0, horizon, 'project_end')
        
        # Project end is the maximum of all task end times
        model.AddMaxEquality(
            project_end,
            [task_vars[task.id]['end'] for task in tasks]
        )
        
        # Minimize project end time
        model.Minimize(project_end)
        
        return project_end
    
    def _extract_schedule(
        self,
        solver: cp_model.CpSolver,
        tasks: List[ScheduleTaskCreate],
        task_vars: Dict[str, Dict[str, Any]],
        constraints: ScheduleConstraints
    ) -> List[ScheduledTask]:
        """Extract the schedule from the solved model"""
        schedule = []
        project_start = constraints.project_start or datetime.now(timezone.utc)
        
        for task in tasks:
            task_var = task_vars[task.id]
            start_hours = solver.Value(task_var['start'])
            end_hours = solver.Value(task_var['end'])
            
            # Convert hours to calendar dates
            start_date = self._hours_to_datetime(start_hours, project_start, constraints)
            end_date = self._hours_to_datetime(end_hours, project_start, constraints)
            
            schedule.append(ScheduledTask(
                task_id=task.id,
                task_title=task.title,
                start_date=start_date,
                end_date=end_date,
                duration_hours=end_hours - start_hours,
                assigned_resources=task.required_resources
            ))
        
        # Sort by start date
        schedule.sort(key=lambda x: x.start_date)
        
        return schedule

    
    def _identify_conflicts(
        self,
        tasks: List[ScheduleTaskCreate],
        resources: List[ResourceCreate],
        constraints: ScheduleConstraints
    ) -> List[ScheduleConflict]:
        """Identify potential conflicts when scheduling fails"""
        conflicts = []
        task_ids = {task.id for task in tasks}
        resource_ids = {r.id for r in resources}
        
        # Check for circular dependencies
        circular = self._detect_circular_dependencies(tasks)
        if circular:
            conflicts.append(ScheduleConflict(
                conflict_type="circular_dependency",
                description=f"Circular dependency detected: {' -> '.join(circular)}",
                affected_tasks=circular,
                suggestion="Remove one of the dependencies to break the cycle"
            ))
        
        # Check for missing dependencies
        for task in tasks:
            for dep in task.dependencies:
                if dep.predecessor_id not in task_ids:
                    conflicts.append(ScheduleConflict(
                        conflict_type="missing_dependency",
                        description=f"Task '{task.id}' depends on non-existent task '{dep.predecessor_id}'",
                        affected_tasks=[task.id, dep.predecessor_id],
                        suggestion=f"Add task '{dep.predecessor_id}' or remove the dependency"
                    ))
        
        # Check for missing resources
        for task in tasks:
            for resource_id in task.required_resources:
                if resource_id not in resource_ids:
                    conflicts.append(ScheduleConflict(
                        conflict_type="missing_resource",
                        description=f"Task '{task.id}' requires non-existent resource '{resource_id}'",
                        affected_tasks=[task.id],
                        affected_resources=[resource_id],
                        suggestion=f"Add resource '{resource_id}' or remove it from task requirements"
                    ))
        
        # Check for resource over-allocation
        for resource in resources:
            total_demand = sum(
                task.resource_demand.get(resource.id, 1)
                for task in tasks
                if resource.id in task.required_resources
            )
            if total_demand > resource.capacity * constraints.horizon_days:
                conflicts.append(ScheduleConflict(
                    conflict_type="resource_overallocation",
                    description=f"Resource '{resource.id}' is over-allocated (demand: {total_demand}, capacity: {resource.capacity})",
                    affected_resources=[resource.id],
                    affected_tasks=[t.id for t in tasks if resource.id in t.required_resources],
                    suggestion="Increase resource capacity or reduce task demands"
                ))
        
        # Check for impossible deadlines
        for task in tasks:
            if task.deadline and task.earliest_start:
                available_hours = self._datetime_to_hours(
                    task.deadline,
                    task.earliest_start,
                    constraints
                )
                if available_hours < task.estimated_hours:
                    conflicts.append(ScheduleConflict(
                        conflict_type="impossible_deadline",
                        description=f"Task '{task.id}' cannot be completed between earliest start and deadline",
                        affected_tasks=[task.id],
                        suggestion="Extend the deadline or reduce task duration"
                    ))
        
        return conflicts
    
    def _detect_circular_dependencies(
        self,
        tasks: List[ScheduleTaskCreate]
    ) -> Optional[List[str]]:
        """Detect circular dependencies using DFS"""
        task_map = {task.id: task for task in tasks}
        visited = set()
        rec_stack = set()
        path = []
        
        def dfs(task_id: str) -> Optional[List[str]]:
            visited.add(task_id)
            rec_stack.add(task_id)
            path.append(task_id)
            
            task = task_map.get(task_id)
            if task:
                for dep in task.dependencies:
                    if dep.predecessor_id not in visited:
                        result = dfs(dep.predecessor_id)
                        if result:
                            return result
                    elif dep.predecessor_id in rec_stack:
                        # Found cycle
                        cycle_start = path.index(dep.predecessor_id)
                        return path[cycle_start:] + [dep.predecessor_id]
            
            path.pop()
            rec_stack.remove(task_id)
            return None
        
        for task in tasks:
            if task.id not in visited:
                result = dfs(task.id)
                if result:
                    return result
        
        return None
    
    def _datetime_to_hours(
        self,
        target: datetime,
        start: datetime,
        constraints: ScheduleConstraints
    ) -> int:
        """Convert a datetime to hours from project start"""
        if target.tzinfo is None:
            target = target.replace(tzinfo=timezone.utc)
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        
        delta = target - start
        total_hours = int(delta.total_seconds() / 3600)
        
        if constraints.respect_weekends:
            # Adjust for weekends (simplified calculation)
            days = total_hours // 24
            weeks = days // 7
            remaining_days = days % 7
            
            # Subtract weekend days
            working_days = weeks * 5 + min(remaining_days, 5)
            return working_days * constraints.working_hours_per_day
        
        return total_hours
    
    def _hours_to_datetime(
        self,
        hours: int,
        start: datetime,
        constraints: ScheduleConstraints
    ) -> datetime:
        """Convert hours from project start to a datetime"""
        if start.tzinfo is None:
            start = start.replace(tzinfo=timezone.utc)
        
        if constraints.respect_weekends:
            # Calculate working days needed
            working_days = hours // constraints.working_hours_per_day
            remaining_hours = hours % constraints.working_hours_per_day
            
            # Start from the beginning of the project start day
            result = start.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Add working days, accounting for weekends
            days_added = 0
            while days_added < working_days:
                result += timedelta(days=1)
                # Only count weekdays
                if result.weekday() < 5:  # Monday = 0, Friday = 4
                    days_added += 1
            
            # Skip to next weekday if we landed on a weekend
            while result.weekday() >= 5:
                result += timedelta(days=1)
            
            # Add the remaining hours to the start of the working day
            # Assuming work starts at 9 AM
            work_start_hour = 9
            result = result.replace(hour=work_start_hour)
            result = result + timedelta(hours=remaining_hours)
            
            return result
        
        return start + timedelta(hours=hours)
    
    async def _store_schedule(
        self,
        project_id: UUID,
        response: ScheduleResponse,
        resources: List[ResourceCreate],
        constraints: ScheduleConstraints
    ) -> None:
        """Store the calculated schedule"""
        from app.schemas.schedule import ResourceResponse
        
        schedule = ProjectSchedule(
            project_id=project_id,
            schedule=response.schedule,
            resources=[ResourceResponse(**r.model_dump()) for r in resources],
            constraints=constraints,
            project_duration_hours=response.project_duration_hours or 0,
            project_start_date=response.project_start_date or datetime.now(timezone.utc),
            project_end_date=response.project_end_date or datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            version=1
        )
        
        self._schedules[str(project_id)] = schedule
    
    async def get_schedule(self, project_id: UUID) -> Optional[ProjectSchedule]:
        """
        Get the stored schedule for a project.
        
        Args:
            project_id: Project identifier
            
        Returns:
            ProjectSchedule if found, None otherwise
        """
        return self._schedules.get(str(project_id))
    
    async def update_schedule(
        self,
        project_id: UUID,
        updates: ScheduleUpdate
    ) -> Optional[ScheduleResponse]:
        """
        Apply manual adjustments to a schedule.
        
        Args:
            project_id: Project identifier
            updates: Manual adjustments to apply
            
        Returns:
            Updated ScheduleResponse or None if schedule not found
        """
        schedule = self._schedules.get(str(project_id))
        if not schedule:
            return None
        
        # Apply task adjustments
        updated_tasks = []
        for task in schedule.schedule:
            task_dict = task.model_dump()
            
            if task.task_id in updates.task_adjustments:
                adjustments = updates.task_adjustments[task.task_id]
                
                # Apply start_date adjustment
                if 'start_date' in adjustments:
                    new_start = adjustments['start_date']
                    if isinstance(new_start, str):
                        new_start = datetime.fromisoformat(new_start)
                    task_dict['start_date'] = new_start
                    
                    # Recalculate end_date based on duration
                    task_dict['end_date'] = new_start + timedelta(hours=task.duration_hours)
                
                # Apply end_date adjustment
                if 'end_date' in adjustments:
                    new_end = adjustments['end_date']
                    if isinstance(new_end, str):
                        new_end = datetime.fromisoformat(new_end)
                    task_dict['end_date'] = new_end
            
            updated_tasks.append(ScheduledTask(**task_dict))
        
        # Update stored schedule
        schedule.schedule = updated_tasks
        schedule.updated_at = datetime.now(timezone.utc)
        schedule.version += 1
        schedule.manual_adjustments.update(updates.task_adjustments)
        
        # Recalculate project dates
        if updated_tasks:
            schedule.project_start_date = min(t.start_date for t in updated_tasks)
            schedule.project_end_date = max(t.end_date for t in updated_tasks)
            schedule.project_duration_hours = int(
                (schedule.project_end_date - schedule.project_start_date).total_seconds() / 3600
            )
        
        self._schedules[str(project_id)] = schedule
        
        return ScheduleResponse(
            status="success",
            project_id=project_id,
            schedule=updated_tasks,
            project_duration_hours=schedule.project_duration_hours,
            project_start_date=schedule.project_start_date,
            project_end_date=schedule.project_end_date,
            message=f"Schedule updated (version {schedule.version})"
        )


# Singleton instance
_scheduler_service: Optional[SchedulerService] = None


async def get_scheduler_service() -> SchedulerService:
    """Dependency for getting the scheduler service"""
    global _scheduler_service
    if _scheduler_service is None:
        _scheduler_service = SchedulerService()
    return _scheduler_service

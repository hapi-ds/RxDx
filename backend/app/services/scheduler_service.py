"""Project Scheduler Service using Google OR-Tools for constraint-based scheduling"""

import logging
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

from ortools.sat.python import cp_model

from app.schemas.schedule import (
    ProjectSchedule,
    ResourceCreate,
    ScheduleConflict,
    ScheduleConstraints,
    ScheduledTask,
    ScheduleResponse,
    ScheduleTaskCreate,
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
        self._schedules: dict[
            str, ProjectSchedule
        ] = {}  # In-memory storage for schedules

    def get_matching_resources_for_task(
        self, task: ScheduleTaskCreate, resources: list[ResourceCreate]
    ) -> list[tuple[ResourceCreate, int]]:
        """
        Get resources that match the task's required skills, sorted by priority.

        Priority order:
        1. Lead resources with all required skills
        2. Non-lead resources with all required skills
        3. Lead resources with partial skill match
        4. Non-lead resources with partial skill match

        Args:
            task: Task with skills_needed
            resources: Available resources

        Returns:
            List of (resource, skill_match_count) tuples, sorted by priority
        """
        if not task.skills_needed:
            # No skills required - return all resources sorted by lead status
            return [(r, 0) for r in sorted(resources, key=lambda x: (not x.lead, x.id))]

        task_skills = set(task.skills_needed)
        matched_resources = []

        for resource in resources:
            resource_skills = set(resource.skills) if resource.skills else set()

            # Calculate skill match
            matching_skills = task_skills & resource_skills
            skill_match_count = len(matching_skills)

            # Only include resources with at least one matching skill
            # or if no skills are specified for the resource
            if skill_match_count > 0 or not resource.skills:
                matched_resources.append((resource, skill_match_count))

        # Sort by priority: lead status (desc), skill match count (desc), capacity (desc), id (asc)
        matched_resources.sort(
            key=lambda x: (
                not x[
                    0
                ].lead,  # Lead resources first (False < True, so not lead sorts first)
                -x[1],  # Higher skill match count first
                -x[0].capacity,  # Higher capacity first
                x[0].id,  # Stable sort by ID
            )
        )

        return matched_resources

    async def get_department_resources(
        self,
        workpackage_id: str,
        skills_filter: list[str] | None = None,
    ) -> list[ResourceCreate]:
        """
        Get resources from the department linked to a workpackage.

        Query pattern: Workpackage → LINKED_TO_DEPARTMENT → Department → BELONGS_TO → Resources

        Args:
            workpackage_id: Workpackage identifier
            skills_filter: Optional list of required skills to filter resources

        Returns:
            List of resources from the linked department, optionally filtered by skills
        """
        from app.db.graph import get_graph_service

        graph_service = await get_graph_service()

        try:
            # Get resources from linked department
            resources_data = (
                await graph_service.get_department_resources_for_workpackage(
                    workpackage_id=workpackage_id,
                    skills_filter=skills_filter,
                )
            )

            # Convert to ResourceCreate objects
            resources = []
            for resource_data in resources_data:
                # Extract properties if nested
                if "properties" in resource_data:
                    resource_data = resource_data["properties"]

                # Create ResourceCreate object
                resource = ResourceCreate(
                    id=resource_data.get("id", ""),
                    name=resource_data.get("name", ""),
                    capacity=resource_data.get("capacity", 1),
                    skills=resource_data.get("skills", []),
                    lead=resource_data.get("lead", False),
                )
                resources.append(resource)

            logger.info(
                f"Retrieved {len(resources)} department resources for workpackage '{workpackage_id}'"
                + (f" with skills filter: {skills_filter}" if skills_filter else "")
            )

            return resources

        except ValueError as e:
            logger.warning(
                f"Could not get department resources for workpackage '{workpackage_id}': {e}"
            )
            return []
        except Exception as e:
            logger.error(
                f"Error getting department resources for workpackage '{workpackage_id}': {e}"
            )
            return []

    async def schedule_project(
        self,
        project_id: UUID,
        tasks: list[ScheduleTaskCreate],
        resources: list[ResourceCreate],
        constraints: ScheduleConstraints,
        workpackage_id: str | None = None,
    ) -> ScheduleResponse:
        """
        Schedule project tasks using constraint programming.

        Args:
            project_id: Unique project identifier
            tasks: List of tasks to schedule
            resources: List of available resources
            constraints: Project constraints
            workpackage_id: Optional workpackage ID for department-based resource allocation

        Returns:
            ScheduleResponse with scheduled tasks or conflicts
        """
        if not tasks:
            return ScheduleResponse(
                status="error",
                project_id=project_id,
                message="No tasks provided for scheduling",
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
                message="Dependency constraints cannot be satisfied",
            )

        # Add resource constraints (with optional department-based allocation)
        resource_conflicts = await self._add_resource_constraints(
            model, tasks, resources, task_vars, workpackage_id
        )
        if resource_conflicts:
            return ScheduleResponse(
                status="infeasible",
                project_id=project_id,
                conflicts=resource_conflicts,
                message="Resource constraints cannot be satisfied",
            )

        # Add deadline constraints if specified
        self._add_deadline_constraints(model, tasks, task_vars, constraints)

        # Add sprint boundary constraints for tasks assigned to sprints
        sprint_conflicts = self._add_sprint_boundary_constraints(
            model, tasks, task_vars, constraints
        )
        if sprint_conflicts:
            return ScheduleResponse(
                status="infeasible",
                project_id=project_id,
                conflicts=sprint_conflicts,
                message="Sprint boundary constraints cannot be satisfied",
            )

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
            project_start_date = constraints.project_start or datetime.now(UTC)
            project_end_date = self._hours_to_datetime(
                project_duration, project_start_date, constraints
            )

            # Calculate critical path
            critical_path = []
            try:
                from app.services.critical_path import calculate_critical_path
                
                critical_path = calculate_critical_path(tasks, schedule)
                
                # Mark critical path tasks in schedule
                critical_path_set = set(critical_path)
                for scheduled_task in schedule:
                    scheduled_task.is_critical = scheduled_task.task_id in critical_path_set
                
                logger.info(
                    f"Critical path calculated for project {project_id}: "
                    f"{len(critical_path)} tasks"
                )
            except Exception as e:
                logger.error(
                    f"Failed to calculate critical path for project {project_id}: {e}"
                )
                # Continue without critical path - it's not a fatal error

            response = ScheduleResponse(
                status="success" if status == cp_model.OPTIMAL else "feasible",
                project_id=project_id,
                schedule=schedule,
                project_duration_hours=project_duration,
                project_start_date=project_start_date,
                project_end_date=project_end_date,
                critical_path=critical_path,
                message="Optimal schedule found"
                if status == cp_model.OPTIMAL
                else "Feasible schedule found",
            )

            # Store the schedule
            await self._store_schedule(project_id, response, resources, constraints)

            return response
        elif status == cp_model.INFEASIBLE:
            # Identify conflicts
            conflicts = self._identify_conflicts(tasks, resources, constraints)
            return ScheduleResponse(
                status="infeasible",
                project_id=project_id,
                conflicts=conflicts,
                message="No feasible schedule found - constraints cannot be satisfied",
            )
        else:
            return ScheduleResponse(
                status="error",
                project_id=project_id,
                message=f"Solver returned status: {solver.StatusName(status)}",
            )

    def _create_task_variables(
        self, model: cp_model.CpModel, tasks: list[ScheduleTaskCreate], horizon: int
    ) -> dict[str, dict[str, Any]]:
        """Create CP variables for each task"""
        task_vars = {}

        for task in tasks:
            start_var = model.NewIntVar(0, horizon, f"start_{task.id}")
            end_var = model.NewIntVar(0, horizon, f"end_{task.id}")
            duration = task.estimated_hours

            # Constraint: end = start + duration
            model.Add(end_var == start_var + duration)

            task_vars[task.id] = {
                "start": start_var,
                "end": end_var,
                "duration": duration,
                "task": task,
            }

        return task_vars

    def _add_dependency_constraints(
        self,
        model: cp_model.CpModel,
        tasks: list[ScheduleTaskCreate],
        task_vars: dict[str, dict[str, Any]],
    ) -> list[ScheduleConflict]:
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
                    conflicts.append(
                        ScheduleConflict(
                            conflict_type="missing_dependency",
                            description=f"Task '{task.id}' depends on non-existent task '{predecessor_id}'",
                            affected_tasks=[task.id, predecessor_id],
                            suggestion=f"Add task '{predecessor_id}' or remove the dependency",
                        )
                    )
                    continue

                predecessor_vars = task_vars[predecessor_id]
                successor_vars = task_vars[task.id]
                lag = dep.lag

                if dep.dependency_type == "finish_to_start":
                    # Successor can't start until predecessor finishes (+ lag)
                    model.Add(successor_vars["start"] >= predecessor_vars["end"] + lag)
                elif dep.dependency_type == "start_to_start":
                    # Successor can't start until predecessor starts (+ lag)
                    model.Add(
                        successor_vars["start"] >= predecessor_vars["start"] + lag
                    )
                elif dep.dependency_type == "finish_to_finish":
                    # Successor can't finish until predecessor finishes (+ lag)
                    model.Add(successor_vars["end"] >= predecessor_vars["end"] + lag)

        return conflicts

        async def _add_resource_constraints(
            self,
            model: cp_model.CpModel,
            tasks: list[ScheduleTaskCreate],
            resources: list[ResourceCreate],
            task_vars: dict[str, dict[str, Any]],
            workpackage_id: str | None = None,
        ) -> list[ScheduleConflict]:
            """
            Add resource capacity constraints using cumulative constraints with skill-based matching.

            Prioritizes resources with matching skills and lead status.
            For workpackage tasks, prioritizes department resources via LINKED_TO_DEPARTMENT.

            Args:
                model: CP model
                tasks: List of tasks to schedule
                resources: Available resources
                task_vars: Task variables
                workpackage_id: Optional workpackage ID for department-based allocation

            Returns:
                List of conflicts
            """
            conflicts = []
            resource_map = {r.id: r for r in resources}

            # Get department resources if workpackage_id is provided
            department_resources = []
            if workpackage_id:
                department_resources = await self.get_department_resources(
                    workpackage_id
                )
                logger.info(
                    f"Found {len(department_resources)} department resources for workpackage '{workpackage_id}'"
                )

            # For each task, match resources based on skills
            for task in tasks:
                if task.required_resources:
                    # Check if specified resources exist and have matching skills
                    for resource_id in task.required_resources:
                        if resource_id not in resource_map:
                            conflicts.append(
                                ScheduleConflict(
                                    conflict_type="missing_resource",
                                    description=f"Task '{task.id}' requires non-existent resource '{resource_id}'",
                                    affected_tasks=[task.id],
                                    affected_resources=[resource_id],
                                    suggestion=f"Add resource '{resource_id}' or remove it from task requirements",
                                )
                            )
                        elif task.skills_needed:
                            # Check if resource has required skills
                            resource = resource_map[resource_id]
                            resource_skills = (
                                set(resource.skills) if resource.skills else set()
                            )
                            required_skills = set(task.skills_needed)
                            missing_skills = required_skills - resource_skills

                            if (
                                missing_skills and resource.skills
                            ):  # Only warn if resource has skills defined
                                conflicts.append(
                                    ScheduleConflict(
                                        conflict_type="skill_mismatch",
                                        description=f"Resource '{resource_id}' assigned to task '{task.id}' is missing skills: {', '.join(missing_skills)}",
                                        affected_tasks=[task.id],
                                        affected_resources=[resource_id],
                                        suggestion=f"Assign a resource with skills: {', '.join(required_skills)}",
                                    )
                                )
                elif task.skills_needed:
                    # No resources specified - find matching resources
                    # Prioritize department resources if available
                    available_resources = resources
                    if department_resources:
                        # Merge department resources with general resources, prioritizing department
                        dept_resource_ids = {r.id for r in department_resources}
                        non_dept_resources = [
                            r for r in resources if r.id not in dept_resource_ids
                        ]
                        available_resources = department_resources + non_dept_resources
                        logger.info(
                            f"Prioritizing {len(department_resources)} department resources for task '{task.id}'"
                        )

                    matching_resources = self.get_matching_resources_for_task(
                        task, available_resources
                    )

                    if not matching_resources:
                        conflicts.append(
                            ScheduleConflict(
                                conflict_type="no_matching_resources",
                                description=f"Task '{task.id}' requires skills {task.skills_needed} but no resources have these skills",
                                affected_tasks=[task.id],
                                suggestion=f"Add resources with skills: {', '.join(task.skills_needed)}",
                            )
                        )
                    else:
                        # Auto-assign best matching resources (lead resources with best skill match)
                        best_matches = [
                            r for r, _ in matching_resources[:3]
                        ]  # Top 3 matches
                        task.required_resources = [r.id for r in best_matches]

                        # Check if department resources were assigned
                        if department_resources:
                            dept_resource_ids = {r.id for r in department_resources}
                            assigned_dept_resources = [
                                r.id for r in best_matches if r.id in dept_resource_ids
                            ]
                            if assigned_dept_resources:
                                logger.info(
                                    f"Auto-assigned department resources to task '{task.id}': {assigned_dept_resources}"
                                )
                            else:
                                logger.info(
                                    f"Auto-assigned non-department resources to task '{task.id}': {[r.id for r in best_matches]}"
                                )
                        else:
                            logger.info(
                                f"Auto-assigned resources to task '{task.id}' based on skills: {[r.id for r in best_matches]}"
                            )

            # Add cumulative constraints for each resource
            for resource in resources:
                intervals = []
                demands = []

                for task in tasks:
                    if resource.id in task.required_resources:
                        task_var = task_vars[task.id]

                        # Create interval variable for this task-resource combination
                        interval = model.NewIntervalVar(
                            task_var["start"],
                            task_var["duration"],
                            task_var["end"],
                            f"interval_{task.id}_{resource.id}",
                        )
                        intervals.append(interval)

                        # Get resource demand (default to 1)
                        demand = task.resource_demand.get(resource.id, 1)
                        demands.append(demand)

                if intervals:
                    # Add cumulative constraint: sum of demands at any time <= capacity
                    model.AddCumulative(intervals, demands, resource.capacity)

            return conflicts

    async def _add_resource_constraints(
        self,
        model: cp_model.CpModel,
        tasks: list[ScheduleTaskCreate],
        resources: list[ResourceCreate],
        task_vars: dict[str, dict[str, Any]],
        workpackage_id: str | None = None,
    ) -> list[ScheduleConflict]:
        """
        Add resource capacity constraints using cumulative constraints with skill-based matching.

        Prioritizes resources with matching skills and lead status.
        For workpackage tasks, prioritizes department resources via LINKED_TO_DEPARTMENT.

        Args:
            model: CP model
            tasks: List of tasks to schedule
            resources: Available resources
            task_vars: Task variables
            workpackage_id: Optional workpackage ID for department-based allocation

        Returns:
            List of conflicts
        """
        conflicts = []
        resource_map = {r.id: r for r in resources}

        # Get department resources if workpackage_id is provided
        department_resources = []
        if workpackage_id:
            department_resources = await self.get_department_resources(workpackage_id)
            logger.info(
                f"Found {len(department_resources)} department resources for workpackage '{workpackage_id}'"
            )

        # For each task, match resources based on skills
        for task in tasks:
            if task.required_resources:
                # Check if specified resources exist and have matching skills
                for resource_id in task.required_resources:
                    if resource_id not in resource_map:
                        conflicts.append(
                            ScheduleConflict(
                                conflict_type="missing_resource",
                                description=f"Task '{task.id}' requires non-existent resource '{resource_id}'",
                                affected_tasks=[task.id],
                                affected_resources=[resource_id],
                                suggestion=f"Add resource '{resource_id}' or remove it from task requirements",
                            )
                        )
                    elif task.skills_needed:
                        # Check if resource has required skills
                        resource = resource_map[resource_id]
                        resource_skills = (
                            set(resource.skills) if resource.skills else set()
                        )
                        required_skills = set(task.skills_needed)
                        missing_skills = required_skills - resource_skills

                        if (
                            missing_skills and resource.skills
                        ):  # Only warn if resource has skills defined
                            conflicts.append(
                                ScheduleConflict(
                                    conflict_type="skill_mismatch",
                                    description=f"Resource '{resource_id}' assigned to task '{task.id}' is missing skills: {', '.join(missing_skills)}",
                                    affected_tasks=[task.id],
                                    affected_resources=[resource_id],
                                    suggestion=f"Assign a resource with skills: {', '.join(required_skills)}",
                                )
                            )
            elif task.skills_needed:
                # No resources specified - find matching resources
                # Prioritize department resources if available
                available_resources = resources
                if department_resources:
                    # Merge department resources with general resources, prioritizing department
                    dept_resource_ids = {r.id for r in department_resources}
                    non_dept_resources = [
                        r for r in resources if r.id not in dept_resource_ids
                    ]
                    available_resources = department_resources + non_dept_resources
                    logger.info(
                        f"Prioritizing {len(department_resources)} department resources for task '{task.id}'"
                    )

                matching_resources = self.get_matching_resources_for_task(
                    task, available_resources
                )

                if not matching_resources:
                    conflicts.append(
                        ScheduleConflict(
                            conflict_type="no_matching_resources",
                            description=f"Task '{task.id}' requires skills {task.skills_needed} but no resources have these skills",
                            affected_tasks=[task.id],
                            suggestion=f"Add resources with skills: {', '.join(task.skills_needed)}",
                        )
                    )
                else:
                    # Auto-assign best matching resources (lead resources with best skill match)
                    best_matches = [
                        r for r, _ in matching_resources[:3]
                    ]  # Top 3 matches
                    task.required_resources = [r.id for r in best_matches]

                    # Check if department resources were assigned
                    if department_resources:
                        dept_resource_ids = {r.id for r in department_resources}
                        assigned_dept_resources = [
                            r.id for r in best_matches if r.id in dept_resource_ids
                        ]
                        if assigned_dept_resources:
                            logger.info(
                                f"Auto-assigned department resources to task '{task.id}': {assigned_dept_resources}"
                            )
                        else:
                            logger.info(
                                f"Auto-assigned non-department resources to task '{task.id}': {[r.id for r in best_matches]}"
                            )
                    else:
                        logger.info(
                            f"Auto-assigned resources to task '{task.id}' based on skills: {[r.id for r in best_matches]}"
                        )

        # Add cumulative constraints for each resource
        for resource in resources:
            intervals = []
            demands = []

            for task in tasks:
                if resource.id in task.required_resources:
                    task_var = task_vars[task.id]

                    # Create interval variable for this task-resource combination
                    interval = model.NewIntervalVar(
                        task_var["start"],
                        task_var["duration"],
                        task_var["end"],
                        f"interval_{task.id}_{resource.id}",
                    )
                    intervals.append(interval)

                    # Get resource demand (default to 1)
                    demand = task.resource_demand.get(resource.id, 1)
                    demands.append(demand)

            if intervals:
                # Add cumulative constraint: sum of demands at any time <= capacity
                model.AddCumulative(intervals, demands, resource.capacity)

        return conflicts

    def _add_deadline_constraints(
        self,
        model: cp_model.CpModel,
        tasks: list[ScheduleTaskCreate],
        task_vars: dict[str, dict[str, Any]],
        constraints: ScheduleConstraints,
    ) -> None:
        """Add deadline constraints for tasks and project"""
        project_start = constraints.project_start or datetime.now(UTC)

        for task in tasks:
            task_var = task_vars[task.id]

            # Add earliest start constraint
            if task.earliest_start:
                earliest_hours = self._datetime_to_hours(
                    task.earliest_start, project_start, constraints
                )
                if earliest_hours > 0:
                    model.Add(task_var["start"] >= earliest_hours)

            # Add task deadline constraint
            if task.deadline:
                deadline_hours = self._datetime_to_hours(
                    task.deadline, project_start, constraints
                )
                model.Add(task_var["end"] <= deadline_hours)

        # Add project deadline constraint
        if constraints.project_deadline:
            project_deadline_hours = self._datetime_to_hours(
                constraints.project_deadline, project_start, constraints
            )
            for task_var in task_vars.values():
                model.Add(task_var["end"] <= project_deadline_hours)

    def _add_sprint_boundary_constraints(
        self,
        model: cp_model.CpModel,
        tasks: list[ScheduleTaskCreate],
        task_vars: dict[str, dict[str, Any]],
        constraints: ScheduleConstraints,
    ) -> list[ScheduleConflict]:
        """
        Add sprint boundary constraints for tasks assigned to sprints.

        Tasks assigned to sprints must be scheduled within sprint start_date and end_date.
        This is a hard constraint - tasks cannot start before sprint start or end after sprint end.

        Args:
            model: CP model
            tasks: List of tasks to schedule
            task_vars: Task variables
            constraints: Schedule constraints

        Returns:
            List of conflicts if sprint constraints cannot be satisfied
        """
        conflicts = []
        project_start = constraints.project_start or datetime.now(UTC)

        for task in tasks:
            # Only apply sprint constraints if task is assigned to a sprint
            if not task.sprint_id or not task.sprint_start_date or not task.sprint_end_date:
                continue

            task_var = task_vars[task.id]

            # Convert sprint boundaries to hours from project start
            sprint_start_hours = self._datetime_to_hours(
                task.sprint_start_date, project_start, constraints
            )
            sprint_end_hours = self._datetime_to_hours(
                task.sprint_end_date, project_start, constraints
            )

            logger.info(
                f"Sprint boundary calculation for task '{task.id}': "
                f"project_start={project_start}, "
                f"sprint_start={task.sprint_start_date}, "
                f"sprint_end={task.sprint_end_date}, "
                f"sprint_start_hours={sprint_start_hours}, "
                f"sprint_end_hours={sprint_end_hours}"
            )

            # Check if task can fit within sprint boundaries
            sprint_duration_hours = sprint_end_hours - sprint_start_hours
            if task.estimated_hours > sprint_duration_hours:
                conflicts.append(
                    ScheduleConflict(
                        conflict_type="sprint_capacity_exceeded",
                        description=f"Task '{task.id}' ({task.estimated_hours}h) cannot fit within sprint '{task.sprint_id}' ({sprint_duration_hours}h)",
                        affected_tasks=[task.id],
                        suggestion=f"Reduce task duration to {sprint_duration_hours}h or extend sprint duration",
                    )
                )
                continue

            # Add hard constraints: task must start at or after sprint start
            model.Add(task_var["start"] >= sprint_start_hours)

            # Add hard constraints: task must end at or before sprint end
            model.Add(task_var["end"] <= sprint_end_hours)

            logger.info(
                f"Added sprint boundary constraints for task '{task.id}' in sprint '{task.sprint_id}': "
                f"start >= {sprint_start_hours}h, end <= {sprint_end_hours}h "
                f"(sprint: {task.sprint_start_date} to {task.sprint_end_date})"
            )

        return conflicts

    def _add_optimization_objective(
        self,
        model: cp_model.CpModel,
        tasks: list[ScheduleTaskCreate],
        task_vars: dict[str, dict[str, Any]],
        horizon: int,
    ) -> cp_model.IntVar:
        """Add optimization objective to minimize project duration"""
        # Create variable for project end time
        project_end = model.NewIntVar(0, horizon, "project_end")

        # Project end is the maximum of all task end times
        model.AddMaxEquality(project_end, [task_vars[task.id]["end"] for task in tasks])

        # Minimize project end time
        model.Minimize(project_end)

        return project_end

    def _extract_schedule(
        self,
        solver: cp_model.CpSolver,
        tasks: list[ScheduleTaskCreate],
        task_vars: dict[str, dict[str, Any]],
        constraints: ScheduleConstraints,
    ) -> list[ScheduledTask]:
        """Extract the schedule from the solved model"""
        schedule = []
        project_start = constraints.project_start or datetime.now(UTC)

        for task in tasks:
            task_var = task_vars[task.id]
            start_hours = solver.Value(task_var["start"])
            end_hours = solver.Value(task_var["end"])

            logger.info(
                f"Extracting schedule for task '{task.id}': "
                f"start_hours={start_hours}, end_hours={end_hours}"
            )

            # Convert hours to calendar dates
            start_date = self._hours_to_datetime(
                start_hours, project_start, constraints
            )
            end_date = self._hours_to_datetime(end_hours, project_start, constraints
            )

            # Use the task's estimated_hours as the duration
            # (not end_hours - start_hours, which is the same but more explicit)
            schedule.append(
                ScheduledTask(
                    task_id=task.id,
                    task_title=task.title,
                    start_date=start_date,
                    end_date=end_date,
                    duration_hours=task.estimated_hours,
                    assigned_resources=task.required_resources,
                )
            )

        # Sort by start date
        schedule.sort(key=lambda x: x.start_date)

        return schedule

    def _identify_conflicts(
        self,
        tasks: list[ScheduleTaskCreate],
        resources: list[ResourceCreate],
        constraints: ScheduleConstraints,
    ) -> list[ScheduleConflict]:
        """Identify potential conflicts when scheduling fails"""
        conflicts = []
        task_ids = {task.id for task in tasks}
        resource_ids = {r.id for r in resources}
        resource_map = {r.id: r for r in resources}

        # Check for circular dependencies
        circular = self._detect_circular_dependencies(tasks)
        if circular:
            conflicts.append(
                ScheduleConflict(
                    conflict_type="circular_dependency",
                    description=f"Circular dependency detected: {' -> '.join(circular)}",
                    affected_tasks=circular,
                    suggestion="Remove one of the dependencies to break the cycle",
                )
            )

        # Check for missing dependencies
        for task in tasks:
            for dep in task.dependencies:
                if dep.predecessor_id not in task_ids:
                    conflicts.append(
                        ScheduleConflict(
                            conflict_type="missing_dependency",
                            description=f"Task '{task.id}' depends on non-existent task '{dep.predecessor_id}'",
                            affected_tasks=[task.id, dep.predecessor_id],
                            suggestion=f"Add task '{dep.predecessor_id}' or remove the dependency",
                        )
                    )

        # Check for missing resources
        for task in tasks:
            for resource_id in task.required_resources:
                if resource_id not in resource_ids:
                    conflicts.append(
                        ScheduleConflict(
                            conflict_type="missing_resource",
                            description=f"Task '{task.id}' requires non-existent resource '{resource_id}'",
                            affected_tasks=[task.id],
                            affected_resources=[resource_id],
                            suggestion=f"Add resource '{resource_id}' or remove it from task requirements",
                        )
                    )

        # Check for skill mismatches
        for task in tasks:
            if task.skills_needed:
                for resource_id in task.required_resources:
                    if resource_id in resource_map:
                        resource = resource_map[resource_id]
                        resource_skills = (
                            set(resource.skills) if resource.skills else set()
                        )
                        required_skills = set(task.skills_needed)
                        missing_skills = required_skills - resource_skills

                        if (
                            missing_skills and resource.skills
                        ):  # Only warn if resource has skills defined
                            conflicts.append(
                                ScheduleConflict(
                                    conflict_type="skill_mismatch",
                                    description=f"Resource '{resource_id}' lacks required skills for task '{task.id}': {', '.join(missing_skills)}",
                                    affected_tasks=[task.id],
                                    affected_resources=[resource_id],
                                    suggestion=f"Assign a resource with all required skills: {', '.join(required_skills)}",
                                )
                            )

        # Check for tasks with required skills but no matching resources
        for task in tasks:
            if task.skills_needed and not task.required_resources:
                matching_resources = self.get_matching_resources_for_task(
                    task, resources
                )
                if not matching_resources:
                    conflicts.append(
                        ScheduleConflict(
                            conflict_type="no_matching_resources",
                            description=f"Task '{task.id}' requires skills {task.skills_needed} but no resources have these skills",
                            affected_tasks=[task.id],
                            suggestion=f"Add resources with skills: {', '.join(task.skills_needed)} or remove skill requirements",
                        )
                    )

        # Check for resource over-allocation
        for resource in resources:
            total_demand = sum(
                task.resource_demand.get(resource.id, 1)
                for task in tasks
                if resource.id in task.required_resources
            )
            if total_demand > resource.capacity * constraints.horizon_days:
                conflicts.append(
                    ScheduleConflict(
                        conflict_type="resource_overallocation",
                        description=f"Resource '{resource.id}' is over-allocated (demand: {total_demand}, capacity: {resource.capacity})",
                        affected_resources=[resource.id],
                        affected_tasks=[
                            t.id for t in tasks if resource.id in t.required_resources
                        ],
                        suggestion="Increase resource capacity or reduce task demands",
                    )
                )

        # Check for impossible deadlines
        for task in tasks:
            if task.deadline and task.earliest_start:
                available_hours = self._datetime_to_hours(
                    task.deadline, task.earliest_start, constraints
                )
                if available_hours < task.estimated_hours:
                    conflicts.append(
                        ScheduleConflict(
                            conflict_type="impossible_deadline",
                            description=f"Task '{task.id}' cannot be completed between earliest start and deadline",
                            affected_tasks=[task.id],
                            suggestion="Extend the deadline or reduce task duration",
                        )
                    )

        # Check for sprint boundary violations
        project_start = constraints.project_start or datetime.now(UTC)
        for task in tasks:
            if task.sprint_id and task.sprint_start_date and task.sprint_end_date:
                sprint_start_hours = self._datetime_to_hours(
                    task.sprint_start_date, project_start, constraints
                )
                sprint_end_hours = self._datetime_to_hours(
                    task.sprint_end_date, project_start, constraints
                )
                sprint_duration_hours = sprint_end_hours - sprint_start_hours

                if task.estimated_hours > sprint_duration_hours:
                    conflicts.append(
                        ScheduleConflict(
                            conflict_type="sprint_capacity_exceeded",
                            description=f"Task '{task.id}' ({task.estimated_hours}h) exceeds sprint '{task.sprint_id}' capacity ({sprint_duration_hours}h)",
                            affected_tasks=[task.id],
                            suggestion=f"Reduce task duration to {sprint_duration_hours}h or extend sprint duration",
                        )
                    )

        return conflicts

    def _detect_circular_dependencies(
        self, tasks: list[ScheduleTaskCreate]
    ) -> list[str] | None:
        """Detect circular dependencies using DFS"""
        task_map = {task.id: task for task in tasks}
        visited = set()
        rec_stack = set()
        path = []

        def dfs(task_id: str) -> list[str] | None:
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
        self, target: datetime, start: datetime, constraints: ScheduleConstraints
    ) -> int:
        """Convert a datetime to hours from project start"""
        if target.tzinfo is None:
            target = target.replace(tzinfo=UTC)
        if start.tzinfo is None:
            start = start.replace(tzinfo=UTC)

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
        self, hours: int, start: datetime, constraints: ScheduleConstraints
    ) -> datetime:
        """
        Convert working hours from project start to a calendar datetime.

        Args:
            hours: Number of working hours from project start
            start: Project start datetime
            constraints: Schedule constraints including working hours per day

        Returns:
            Calendar datetime accounting for weekends and working hours
        """
        if start.tzinfo is None:
            start = start.replace(tzinfo=UTC)

        if constraints.respect_weekends:
            # Calculate number of full working days
            full_days = hours // constraints.working_hours_per_day
            remaining_hours = hours % constraints.working_hours_per_day

            # Start from the project start date
            result = start

            # Skip to next weekday if starting on a weekend
            while result.weekday() >= 5:
                result += timedelta(days=1)

            # Add full working days (skipping weekends)
            days_added = 0
            while days_added < full_days:
                result += timedelta(days=1)
                # Skip weekends
                while result.weekday() >= 5:
                    result += timedelta(days=1)
                days_added += 1

            # Add remaining hours within the day
            result = result + timedelta(hours=remaining_hours)

            return result

        return start + timedelta(hours=hours)

    async def _store_schedule(
        self,
        project_id: UUID,
        response: ScheduleResponse,
        resources: list[ResourceCreate],
        constraints: ScheduleConstraints,
    ) -> None:
        """Store the calculated schedule and update WorkItem task dates"""
        from app.schemas.schedule import ResourceResponse

        schedule = ProjectSchedule(
            project_id=project_id,
            schedule=response.schedule,
            resources=[ResourceResponse(**r.model_dump()) for r in resources],
            constraints=constraints,
            project_duration_hours=response.project_duration_hours or 0,
            project_start_date=response.project_start_date or datetime.now(UTC),
            project_end_date=response.project_end_date or datetime.now(UTC),
            critical_path=response.critical_path,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
            version=1,
        )

        self._schedules[str(project_id)] = schedule

        # Update WorkItem nodes with calculated dates
        if response.schedule:
            try:
                await self.update_workitem_task_dates(response.schedule)
            except Exception as e:
                # Log error but don't fail schedule storage
                # This allows tests to run without database connection
                logger.warning(
                    f"Failed to update WorkItem task dates: {e}. "
                    "Schedule stored successfully but task dates not updated in graph."
                )

    async def get_schedule(self, project_id: UUID) -> ProjectSchedule | None:
        """
        Get the stored schedule for a project.

        Args:
            project_id: Project identifier

        Returns:
            ProjectSchedule if found, None otherwise
        """
        return self._schedules.get(str(project_id))

    async def update_schedule(
        self, project_id: UUID, updates: ScheduleUpdate
    ) -> ScheduleResponse | None:
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
                if "start_date" in adjustments:
                    new_start = adjustments["start_date"]
                    if isinstance(new_start, str):
                        new_start = datetime.fromisoformat(new_start)
                    task_dict["start_date"] = new_start

                    # Recalculate end_date based on duration
                    task_dict["end_date"] = new_start + timedelta(
                        hours=task.duration_hours
                    )

                # Apply end_date adjustment
                if "end_date" in adjustments:
                    new_end = adjustments["end_date"]
                    if isinstance(new_end, str):
                        new_end = datetime.fromisoformat(new_end)
                    task_dict["end_date"] = new_end

            updated_tasks.append(ScheduledTask(**task_dict))

        # Update stored schedule
        schedule.schedule = updated_tasks
        schedule.updated_at = datetime.now(UTC)
        schedule.version += 1
        schedule.manual_adjustments.update(updates.task_adjustments)

        # Recalculate project dates
        if updated_tasks:
            schedule.project_start_date = min(t.start_date for t in updated_tasks)
            schedule.project_end_date = max(t.end_date for t in updated_tasks)
            schedule.project_duration_hours = int(
                (
                    schedule.project_end_date - schedule.project_start_date
                ).total_seconds()
                / 3600
            )

        self._schedules[str(project_id)] = schedule

        return ScheduleResponse(
            status="success",
            project_id=project_id,
            schedule=updated_tasks,
            project_duration_hours=schedule.project_duration_hours,
            project_start_date=schedule.project_start_date,
            project_end_date=schedule.project_end_date,
            message=f"Schedule updated (version {schedule.version})",
        )

    async def get_workitem_tasks(
        self, project_id: UUID, workpackage_id: UUID | None = None
    ) -> list[ScheduleTaskCreate]:
        """
        Query WorkItem nodes with type='task' from the graph database.

        Args:
            project_id: Project UUID to filter tasks
            workpackage_id: Optional workpackage UUID to filter tasks

        Returns:
            List of ScheduleTaskCreate objects converted from WorkItem nodes
        """
        from app.db.graph import get_graph_service

        graph_service = await get_graph_service()

        # Build query to get WorkItem nodes with type='task'
        if workpackage_id:
            query = f"""
            MATCH (w:WorkItem {{type: 'task'}})-[:BELONGS_TO]->(wp:Workpackage {{id: '{str(workpackage_id)}'}})
            RETURN w
            """
        else:
            # For now, get all tasks (in future, could filter by project)
            query = """
            MATCH (w:WorkItem {type: 'task'})
            RETURN w
            """

        try:
            results = await graph_service.execute_query(query)

            tasks = []
            for result in results:
                workitem = result.get("w", {})
                if not workitem:
                    continue

                # Convert WorkItem to ScheduleTaskCreate
                task_id = workitem.get("id", "")
                title = workitem.get("title", "Untitled Task")
                estimated_hours = workitem.get("estimated_hours", 8)
                skills_needed = workitem.get("skills_needed", [])

                # Ensure skills_needed is a list
                if not isinstance(skills_needed, list):
                    skills_needed = []

                # Get dependencies (if any) - for now, empty list
                # In future, could query DEPENDS_ON relationships
                dependencies = []

                # Create ScheduleTaskCreate object
                task = ScheduleTaskCreate(
                    id=str(task_id),
                    title=title,
                    estimated_hours=int(estimated_hours) if estimated_hours else 8,
                    dependencies=dependencies,
                    required_resources=[],  # Will be matched by skills
                    skills_needed=skills_needed,
                )

                tasks.append(task)

            logger.info(
                f"Retrieved {len(tasks)} WorkItem tasks for project {project_id}"
            )
            return tasks

        except Exception as e:
            logger.error(f"Failed to retrieve WorkItem tasks: {e}")
            return []

    async def update_workitem_task_dates(
        self, scheduled_tasks: list[ScheduledTask]
    ) -> None:
        """
        Update WorkItem nodes (type='task') with calculated schedule dates.

        Args:
            scheduled_tasks: List of scheduled tasks with calculated dates
        """
        from app.db.graph import get_graph_service

        graph_service = await get_graph_service()

        for task in scheduled_tasks:
            try:
                # Update WorkItem node with start_date and end_date
                query = f"""
                MATCH (w:WorkItem {{id: '{task.task_id}', type: 'task'}})
                SET w.start_date = '{task.start_date.isoformat()}',
                    w.end_date = '{task.end_date.isoformat()}',
                    w.updated_at = '{datetime.now(UTC).isoformat()}'
                RETURN w
                """

                result = await graph_service.execute_query(query)

                if result:
                    logger.info(
                        f"Updated WorkItem task {task.task_id} with dates: "
                        f"{task.start_date} to {task.end_date}"
                    )
                else:
                    logger.warning(
                        f"WorkItem task {task.task_id} not found for date update"
                    )

            except Exception as e:
                logger.error(
                    f"Failed to update WorkItem task {task.task_id} dates: {e}"
                )


# Singleton instance
_scheduler_service: SchedulerService | None = None


async def get_scheduler_service() -> SchedulerService:
    """Dependency for getting the scheduler service"""
    global _scheduler_service
    if _scheduler_service is None:
        _scheduler_service = SchedulerService()
    return _scheduler_service

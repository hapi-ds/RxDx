# Requirements Document: Backend Schedule API

## Introduction

This document specifies the requirements for implementing the backend schedule API endpoints and integrating them with the existing frontend schedule components in the RxDx project management system. The system already has a fully functional SchedulerService using OR-Tools for constraint-based scheduling, and frontend components (GanttChart, KanbanBoard) that are currently showing "coming soon" messages. This feature will expose the scheduling capabilities through REST API endpoints and enable the frontend to use real schedule data.

Additionally, this specification includes requirements for implementing Projects, Phases, Workpackages, Resources, and Departments as graph nodes in the Neo4j database. Currently, only WorkItems are stored as graph nodes. By implementing these entities as graph nodes, we enable powerful graph-based queries for organizational structure, project hierarchy, resource allocation, and cross-project analytics.

**Important Architectural Decisions:**
- **Users remain in PostgreSQL**: Users are application-level entities for authentication and authorization, NOT project management entities. They are stored only in PostgreSQL and are NOT created as graph nodes.
- **Resources are graph nodes**: Resources (people, machines, equipment, capacity) are the project management entities used for scheduling and resource allocation. They ARE stored as graph nodes.
- **Hierarchical structure**: Project → Phase → Workpackage → Task provides a four-level organizational hierarchy for work management.

## Glossary

- **System**: RxDx Backend Schedule API
- **SchedulerService**: The existing OR-Tools-based constraint programming scheduler
- **WorkItem**: A base entity representing any trackable work element (requirement, task, test, etc.)
- **Task**: A WorkItem with type="task" that can be scheduled
- **Schedule**: A calculated plan assigning start and end dates to tasks
- **Resource**: A project management entity (person, machine, equipment, or other capacity) used in scheduling and stored as a graph node
- **Dependency**: A relationship between tasks defining execution order
- **Constraint**: A rule that must be satisfied in the schedule (deadlines, resources, dependencies)
- **Conflict**: A situation where constraints cannot be simultaneously satisfied
- **Gantt_Chart**: A visual timeline showing task schedules and dependencies
- **Kanban_Board**: A visual board showing tasks organized by status columns
- **Schedule_Version**: A snapshot of a schedule at a specific point in time
- **Manual_Adjustment**: A user-specified change to a calculated schedule
- **Critical_Path**: The sequence of tasks that determines the minimum project duration
- **User**: An authenticated application user stored in PostgreSQL (for authentication/authorization only, NOT used in project management)
- **Project_Manager**: A user role responsible for project planning and scheduling
- **Project**: A container for organizing related work items, phases, workpackages, and resources
- **Phase**: A high-level stage or milestone within a project (e.g., Planning, Development, Testing, Deployment)
- **Workpackage**: A logical grouping of related tasks within a phase, providing an intermediate organizational level
- **Department**: An organizational unit for grouping resources by function or team
- **Graph_Node**: An entity stored in the Neo4j graph database
- **Graph_Relationship**: A directed connection between two graph nodes
- **PostgreSQL**: The relational database used for transactional data (users, audit logs, signatures)
- **Neo4j**: The graph database used for WorkItems, Projects, Phases, Workpackages, Resources, Departments, and their relationships

## Requirements

### Requirement 1: Schedule Calculation API

**User Story:** As a project manager, I want to calculate project schedules through an API endpoint, so that I can generate optimized task timelines based on dependencies and resource constraints.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/v1/schedule/calculate with project tasks, resources, and constraints, THE System SHALL calculate an optimized schedule using the SchedulerService
2. WHEN the schedule calculation succeeds, THE System SHALL return status "success" or "feasible" with the complete schedule including task start dates, end dates, and resource assignments
3. WHEN the schedule calculation fails due to impossible constraints, THE System SHALL return status "infeasible" with a list of identified conflicts
4. WHEN calculating a schedule, THE System SHALL respect task dependencies (finish-to-start, start-to-start, finish-to-finish)
5. WHEN calculating a schedule, THE System SHALL respect resource capacity constraints
6. WHEN calculating a schedule, THE System SHALL respect task deadlines and earliest start dates
7. WHEN calculating a schedule, THE System SHALL optimize to minimize total project duration
8. WHEN a schedule is successfully calculated, THE System SHALL store the schedule with a version number
9. WHEN storing a schedule, THE System SHALL record the calculation timestamp and applied constraints
10. THE System SHALL complete schedule calculations within 60 seconds for projects with up to 1000 tasks

### Requirement 2: Schedule Retrieval API

**User Story:** As a project manager, I want to retrieve the current schedule for a project, so that I can view the planned task timelines and resource allocations.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/v1/schedule/{project_id}, THE System SHALL return the most recent schedule for that project
2. WHEN no schedule exists for a project, THE System SHALL return a 404 error with a descriptive message
3. WHEN returning a schedule, THE System SHALL include all scheduled tasks with start dates, end dates, durations, and assigned resources
4. WHEN returning a schedule, THE System SHALL include project-level metadata (start date, end date, total duration, version)
5. WHEN returning a schedule, THE System SHALL include the constraints that were applied during calculation
6. WHEN returning a schedule, THE System SHALL include any manual adjustments that have been applied
7. THE System SHALL return schedule data within 2 seconds for projects with up to 1000 tasks

### Requirement 3: Manual Schedule Adjustment API

**User Story:** As a project manager, I want to manually adjust calculated schedules, so that I can accommodate real-world constraints not captured in the automated calculation.

#### Acceptance Criteria

1. WHEN a PATCH request is made to /api/v1/schedule/{project_id} with task adjustments, THE System SHALL apply the manual changes to the schedule
2. WHEN applying manual adjustments, THE System SHALL preserve task dependencies by default
3. WHEN applying manual adjustments with recalculate_downstream enabled, THE System SHALL recalculate affected downstream tasks
4. WHEN applying manual adjustments, THE System SHALL validate that the adjusted schedule does not violate hard constraints
5. WHEN manual adjustments violate constraints, THE System SHALL return a 400 error with specific constraint violations
6. WHEN manual adjustments are successfully applied, THE System SHALL increment the schedule version number
7. WHEN manual adjustments are applied, THE System SHALL record which tasks were manually adjusted
8. WHEN returning an adjusted schedule, THE System SHALL include both the original calculated dates and the manually adjusted dates

### Requirement 4: Gantt Chart Data API

**User Story:** As a project manager, I want to retrieve Gantt chart data for a project, so that I can visualize the project timeline with task dependencies and critical path.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/v1/schedule/{project_id}/gantt, THE System SHALL return schedule data formatted for Gantt chart visualization
2. WHEN returning Gantt data, THE System SHALL include all scheduled tasks with start dates, end dates, and titles
3. WHEN returning Gantt data, THE System SHALL include task dependencies with relationship types (finish-to-start, start-to-start, finish-to-finish)
4. WHEN returning Gantt data, THE System SHALL identify and mark critical path tasks
5. WHEN returning Gantt data, THE System SHALL include resource assignments for each task
6. WHEN no schedule exists for a project, THE System SHALL return a 404 error
7. THE System SHALL return Gantt data within 2 seconds for projects with up to 1000 tasks

### Requirement 5: Schedule Conflict Detection

**User Story:** As a project manager, I want detailed conflict information when scheduling fails, so that I can understand and resolve the issues preventing a feasible schedule.

#### Acceptance Criteria

1. WHEN schedule calculation fails, THE System SHALL identify all constraint violations
2. WHEN a circular dependency is detected, THE System SHALL report the cycle with the complete task chain
3. WHEN a task depends on a non-existent task, THE System SHALL report the missing dependency
4. WHEN a task requires a non-existent resource, THE System SHALL report the missing resource
5. WHEN resource capacity is exceeded, THE System SHALL report which resource is over-allocated and by how much
6. WHEN a task deadline is impossible to meet, THE System SHALL report the task and the time gap
7. WHEN reporting conflicts, THE System SHALL provide actionable suggestions for resolution
8. WHEN multiple conflicts exist, THE System SHALL report all conflicts, not just the first one

### Requirement 6: Schedule Versioning and History

**User Story:** As a project manager, I want to track schedule versions and changes over time, so that I can understand how the project plan has evolved and revert if needed.

#### Acceptance Criteria

1. WHEN a new schedule is calculated, THE System SHALL assign it version number 1
2. WHEN a schedule is recalculated or manually adjusted, THE System SHALL increment the version number
3. WHEN storing a schedule version, THE System SHALL preserve the complete schedule state including all task dates and resource assignments
4. WHEN storing a schedule version, THE System SHALL record the user who created the version and the timestamp
5. WHEN storing a schedule version, THE System SHALL record whether it was automatically calculated or manually adjusted
6. THE System SHALL support retrieving previous schedule versions by version number
7. THE System SHALL support comparing two schedule versions to identify changes

### Requirement 7: Integration with WorkItem System

**User Story:** As a project manager, I want schedules to integrate seamlessly with the WorkItem system, so that task data is consistent across the application.

#### Acceptance Criteria

1. WHEN calculating a schedule, THE System SHALL retrieve tasks from the WorkItem system where type="task"
2. WHEN a task is scheduled, THE System SHALL update the task's start_date and end_date fields in the WorkItem system
3. WHEN a task's estimated_hours is updated in the WorkItem system, THE System SHALL mark the schedule as outdated
4. WHEN a task dependency is added or removed in the WorkItem system, THE System SHALL mark the schedule as outdated
5. WHEN a task is deleted from the WorkItem system, THE System SHALL remove it from the schedule
6. THE System SHALL support scheduling tasks from multiple projects independently
7. THE System SHALL validate that all task IDs in a schedule request correspond to existing WorkItems

### Requirement 8: Schedule Resource Integration

**User Story:** As a project manager, I want schedule calculations to use Resources from the graph database, so that resource constraints and allocations are based on actual project resources.

#### Acceptance Criteria

1. WHEN calculating a schedule, THE System SHALL retrieve Resources from the graph database
2. WHEN calculating a schedule, THE System SHALL use Resource capacity from the graph node properties
3. WHEN calculating a schedule, THE System SHALL respect Resource allocations to other projects
4. WHEN calculating a schedule, THE System SHALL consider Resource availability status
5. WHEN a schedule is calculated, THE System SHALL create ASSIGNED_TO relationships from Tasks to Resources
6. WHEN a schedule is calculated, THE System SHALL update Resource utilization metrics
7. THE System SHALL validate that all resource IDs in a schedule request correspond to existing Resource nodes
8. THE System SHALL support filtering available resources by type, skills, and department
9. THE System SHALL calculate resource utilization as percentage of capacity used
10. THE System SHALL prevent scheduling tasks that would exceed resource capacity

### Requirement 9: Schedule Export and Import

**User Story:** As a project manager, I want to export and import schedule data, so that I can work offline or share schedules with external tools.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/v1/schedule/{project_id}/export, THE System SHALL return the complete schedule data in JSON format
2. WHEN exporting a schedule, THE System SHALL include all tasks, resources, constraints, and calculated dates
3. WHEN exporting a schedule, THE System SHALL include metadata (version, calculation timestamp, user)
4. WHEN a POST request is made to /api/v1/schedule/{project_id}/import with schedule data, THE System SHALL validate and import the schedule
5. WHEN importing a schedule, THE System SHALL validate that all task IDs exist in the WorkItem system
6. WHEN importing a schedule, THE System SHALL validate that all resource IDs exist in the resource system
7. WHEN importing a schedule with conflicts, THE System SHALL return a 400 error with specific validation failures
8. WHEN a schedule is successfully imported, THE System SHALL create a new schedule version

### Requirement 10: Schedule Statistics and Metrics

**User Story:** As a project manager, I want to view schedule statistics and metrics, so that I can assess project health and progress.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/v1/schedule/{project_id}/statistics, THE System SHALL return schedule metrics
2. WHEN returning statistics, THE System SHALL include total number of tasks
3. WHEN returning statistics, THE System SHALL include number of tasks by status (not started, in progress, completed, blocked)
4. WHEN returning statistics, THE System SHALL include total estimated hours and actual hours spent
5. WHEN returning statistics, THE System SHALL include project completion percentage
6. WHEN returning statistics, THE System SHALL include critical path task IDs
7. WHEN returning statistics, THE System SHALL include resource utilization percentages
8. WHEN returning statistics, THE System SHALL include schedule health indicators (on track, at risk, delayed)

### Requirement 11: Kanban Board Data Integration

**User Story:** As a project manager, I want Kanban board data to reflect scheduled task information, so that I can see task timelines in the Kanban view.

#### Acceptance Criteria

1. WHEN retrieving tasks for the Kanban board, THE System SHALL include scheduled start and end dates if available
2. WHEN a task is moved between Kanban columns, THE System SHALL update the task status in the WorkItem system
3. WHEN a task status is updated, THE System SHALL preserve the scheduled dates unless explicitly changed
4. THE System SHALL support filtering Kanban tasks by scheduled date range
5. THE System SHALL support sorting Kanban tasks by scheduled start date
6. WHEN a task is scheduled, THE System SHALL make the schedule dates visible in the Kanban card
7. THE System SHALL indicate on the Kanban board which tasks are on the critical path

### Requirement 12: Schedule Validation and Constraints

**User Story:** As a project manager, I want comprehensive schedule validation, so that I can ensure schedules are realistic and achievable.

#### Acceptance Criteria

1. WHEN validating a schedule, THE System SHALL check that all task dependencies form a directed acyclic graph (no cycles)
2. WHEN validating a schedule, THE System SHALL check that all required resources exist
3. WHEN validating a schedule, THE System SHALL check that resource demands do not exceed capacities
4. WHEN validating a schedule, THE System SHALL check that task deadlines are achievable given dependencies
5. WHEN validating a schedule, THE System SHALL check that earliest start dates are respected
6. WHEN validating a schedule, THE System SHALL check that working hours per day is realistic (1-24)
7. WHEN validating a schedule, THE System SHALL check that the planning horizon is sufficient for all tasks
8. WHEN validation fails, THE System SHALL return specific validation errors with affected task IDs

### Requirement 13: Performance and Scalability

**User Story:** As a system administrator, I want the schedule API to perform efficiently at scale, so that it can handle large projects without degrading user experience.

#### Acceptance Criteria

1. THE System SHALL calculate schedules for projects with up to 100 tasks within 5 seconds
2. THE System SHALL calculate schedules for projects with up to 500 tasks within 30 seconds
3. THE System SHALL calculate schedules for projects with up to 1000 tasks within 60 seconds
4. THE System SHALL retrieve existing schedules within 2 seconds regardless of project size
5. THE System SHALL support concurrent schedule calculations for different projects
6. THE System SHALL use async/await patterns for all I/O operations
7. THE System SHALL implement request timeouts to prevent indefinite blocking
8. THE System SHALL log performance metrics for schedule calculations

### Requirement 14: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging, so that I can diagnose and fix issues quickly.

#### Acceptance Criteria

1. WHEN an error occurs during schedule calculation, THE System SHALL log the error with full context (project ID, task count, constraints)
2. WHEN an error occurs, THE System SHALL return appropriate HTTP status codes (400 for validation, 404 for not found, 500 for server errors)
3. WHEN returning errors, THE System SHALL include descriptive error messages suitable for end users
4. WHEN returning errors, THE System SHALL include error codes for programmatic handling
5. THE System SHALL log all schedule calculations with duration and outcome
6. THE System SHALL log all manual schedule adjustments with user ID and changes
7. THE System SHALL log all schedule retrievals for audit purposes
8. THE System SHALL use structured logging with consistent field names

### Requirement 15: Authentication and Authorization

**User Story:** As a system administrator, I want proper authentication and authorization for schedule endpoints, so that only authorized users can create and modify schedules.

#### Acceptance Criteria

1. WHEN accessing any schedule endpoint, THE System SHALL require a valid authentication token
2. WHEN calculating a schedule, THE System SHALL require the user to have "project_manager" or "admin" role
3. WHEN retrieving a schedule, THE System SHALL allow any authenticated user
4. WHEN manually adjusting a schedule, THE System SHALL require the user to have "project_manager" or "admin" role
5. WHEN managing resources, THE System SHALL require the user to have "project_manager" or "admin" role
6. WHEN a user lacks required permissions, THE System SHALL return a 403 Forbidden error
7. THE System SHALL log all authorization failures for security auditing

### Requirement 16: Graph Database Entity Integration

**User Story:** As a system architect, I want Projects, Phases, Workpackages, Resources, and Departments to be stored as graph nodes, so that we can leverage graph relationships for project organization, resource allocation, work hierarchy, and advanced querying capabilities.

#### Acceptance Criteria

1. WHEN a Project is created, THE System SHALL create a Project node in the graph database with properties (id, name, description, status, start_date, end_date, created_at, updated_at, created_by_user_id)
2. WHEN a Phase is created, THE System SHALL create a Phase node in the graph database with properties (id, name, description, order, start_date, end_date, project_id, created_at)
3. WHEN a Workpackage is created, THE System SHALL create a Workpackage node in the graph database with properties (id, name, description, order, start_date, end_date, phase_id, created_at)
4. WHEN a Resource is created, THE System SHALL create a Resource node in the graph database with properties (id, name, type, capacity, department_id, skills, availability, created_at)
5. WHEN a Department is created, THE System SHALL create a Department node in the graph database with properties (id, name, description, created_at)
6. THE System SHALL support Resource types: "person", "machine", "equipment", "facility", "other"
7. THE System SHALL create a BELONGS_TO relationship from WorkItem nodes to Project nodes
8. THE System SHALL create a BELONGS_TO relationship from Phase nodes to Project nodes
9. THE System SHALL create a BELONGS_TO relationship from Workpackage nodes to Phase nodes
10. THE System SHALL create a BELONGS_TO relationship from Task (WorkItem) nodes to Workpackage nodes
11. THE System SHALL create a BELONGS_TO relationship from Resource nodes to Department nodes
12. THE System SHALL create an ASSIGNED_TO relationship from Task nodes to Resource nodes
13. THE System SHALL create an ALLOCATED_TO relationship from Resource nodes to Project nodes
14. THE System SHALL create a MANAGED_BY relationship from Project nodes to User IDs (stored as property, not graph relationship)
15. THE System SHALL support querying all WorkItems for a Project through graph traversal
16. THE System SHALL support querying all Resources in a Department through graph traversal
17. THE System SHALL support querying all Tasks in a Workpackage through graph traversal
18. THE System SHALL support querying the complete project hierarchy (Project → Phase → Workpackage → Task) through graph traversal
19. THE System SHALL support querying all Projects a Resource is allocated to through graph traversal
20. WHEN a Project is deleted, THE System SHALL cascade delete all related Phase, Workpackage nodes and relationships
21. WHEN a Phase is deleted, THE System SHALL cascade delete all related Workpackage nodes and relationships
22. WHEN a Workpackage is deleted, THE System SHALL update Task relationships but NOT delete the Task nodes
23. WHEN a Resource is deleted, THE System SHALL validate no active task assignments exist before deletion
24. WHEN a Department is deleted, THE System SHALL validate no Resources are assigned to it before deletion

### Requirement 17: Project Management API

**User Story:** As a project manager, I want to manage projects through the API, so that I can organize work into projects with phases and track project metadata.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/v1/projects with project data, THE System SHALL create a new Project node in the graph database
2. WHEN a GET request is made to /api/v1/projects, THE System SHALL return all projects the authenticated user has access to
3. WHEN a GET request is made to /api/v1/projects/{project_id}, THE System SHALL return the project details including phases and team members
4. WHEN a PATCH request is made to /api/v1/projects/{project_id}, THE System SHALL update the project properties
5. WHEN a DELETE request is made to /api/v1/projects/{project_id}, THE System SHALL delete the project and all related entities
6. WHEN creating a project, THE System SHALL require a unique name and description
7. WHEN creating a project, THE System SHALL automatically assign the creator as the project lead
8. WHEN retrieving a project, THE System SHALL include statistics (total tasks, completed tasks, team size, schedule status)
9. THE System SHALL support filtering projects by status (active, completed, archived)
10. THE System SHALL support searching projects by name or description

### Requirement 18: Phase and Workpackage Management API

**User Story:** As a project manager, I want to organize projects into phases and workpackages, so that I can structure work into logical stages and groupings, and track progress at multiple hierarchical levels.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/v1/projects/{project_id}/phases with phase data, THE System SHALL create a new Phase node
2. WHEN a GET request is made to /api/v1/projects/{project_id}/phases, THE System SHALL return all phases for the project ordered by sequence
3. WHEN a PATCH request is made to /api/v1/phases/{phase_id}, THE System SHALL update the phase properties
4. WHEN a DELETE request is made to /api/v1/phases/{phase_id}, THE System SHALL delete the phase and cascade delete related Workpackages
5. WHEN creating a phase, THE System SHALL require a name and order number
6. WHEN creating a phase, THE System SHALL validate the phase belongs to an existing project
7. WHEN retrieving phases, THE System SHALL include workpackage counts and completion percentages
8. THE System SHALL support reordering phases by updating order numbers
9. THE System SHALL validate phase date ranges are within the project date range
10. WHEN a POST request is made to /api/v1/phases/{phase_id}/workpackages with workpackage data, THE System SHALL create a new Workpackage node
11. WHEN a GET request is made to /api/v1/phases/{phase_id}/workpackages, THE System SHALL return all workpackages for the phase ordered by sequence
12. WHEN a GET request is made to /api/v1/workpackages/{workpackage_id}, THE System SHALL return workpackage details including tasks
13. WHEN a PATCH request is made to /api/v1/workpackages/{workpackage_id}, THE System SHALL update the workpackage properties
14. WHEN a DELETE request is made to /api/v1/workpackages/{workpackage_id}, THE System SHALL delete the workpackage and update Task relationships
15. WHEN creating a workpackage, THE System SHALL require a name and order number
16. WHEN creating a workpackage, THE System SHALL validate the workpackage belongs to an existing phase
17. WHEN assigning a Task to a workpackage, THE System SHALL create a BELONGS_TO relationship
18. WHEN retrieving workpackages, THE System SHALL include task counts and completion percentages
19. THE System SHALL support reordering workpackages within a phase by updating order numbers
20. THE System SHALL validate workpackage date ranges are within the phase date range

### Requirement 19: Resource Management API

**User Story:** As a project manager, I want to manage project resources (people, machines, equipment), so that I can allocate resources to projects and tasks, and track resource utilization.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/v1/resources with resource data, THE System SHALL create a new Resource node
2. WHEN a GET request is made to /api/v1/resources, THE System SHALL return all resources with optional filtering by type and department
3. WHEN a GET request is made to /api/v1/resources/{resource_id}, THE System SHALL return resource details including allocations and assignments
4. WHEN a PATCH request is made to /api/v1/resources/{resource_id}, THE System SHALL update the resource properties
5. WHEN a DELETE request is made to /api/v1/resources/{resource_id}, THE System SHALL validate no active assignments exist before deletion
6. WHEN creating a resource, THE System SHALL require a unique name, type, and capacity
7. WHEN creating a resource, THE System SHALL validate type is one of: "person", "machine", "equipment", "facility", "other"
8. WHEN assigning a resource to a department, THE System SHALL create a BELONGS_TO relationship
9. WHEN allocating a resource to a project, THE System SHALL create an ALLOCATED_TO relationship with allocation percentage
10. WHEN assigning a resource to a task, THE System SHALL create an ASSIGNED_TO relationship
11. WHEN retrieving a resource, THE System SHALL include current utilization percentage
12. WHEN retrieving a resource, THE System SHALL include list of current project allocations
13. WHEN retrieving a resource, THE System SHALL include list of current task assignments
14. THE System SHALL support querying all resources in a department through graph traversal
15. THE System SHALL support querying all resources allocated to a project through graph traversal
16. THE System SHALL support filtering resources by skills (if resource type is "person")
17. THE System SHALL support filtering resources by availability status
18. THE System SHALL validate resource capacity is a positive number
19. THE System SHALL calculate resource utilization based on task assignments and working hours
20. THE System SHALL prevent over-allocation of resources beyond their capacity

### Requirement 20: Department Management API

**User Story:** As a system administrator, I want to manage organizational departments, so that I can structure the organization and group resources by function or team.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/v1/departments with department data, THE System SHALL create a new Department node
2. WHEN a GET request is made to /api/v1/departments, THE System SHALL return all departments
3. WHEN a GET request is made to /api/v1/departments/{department_id}, THE System SHALL return department details including resources
4. WHEN a PATCH request is made to /api/v1/departments/{department_id}, THE System SHALL update the department properties
5. WHEN a DELETE request is made to /api/v1/departments/{department_id}, THE System SHALL validate no resources are assigned before deletion
6. WHEN creating a department, THE System SHALL require a unique name
7. WHEN assigning a manager to a department, THE System SHALL store the manager's user_id as a property
8. WHEN retrieving a department, THE System SHALL include resource count and manager information
9. THE System SHALL support querying all resources in a department through graph traversal
10. THE System SHALL support hierarchical department structures with parent-child relationships using PARENT_OF relationships

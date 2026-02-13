# Requirements Document: Backend Schedule API

## Introduction

This document specifies the requirements for implementing the backend schedule API endpoints and integrating them with the existing frontend schedule components in the RxDx project management system. The system already has a fully functional SchedulerService using OR-Tools for constraint-based scheduling, and frontend components (GanttChart, KanbanBoard) that are currently showing "coming soon" messages. This feature will expose the scheduling capabilities through REST API endpoints and enable the frontend to use real schedule data.

This specification implements a **comprehensive dual project management approach** that supports both classic top-down (waterfall/traditional) and agile (Scrum/Kanban) methodologies working together seamlessly. The system enables teams to use the methodology that best fits their workflow while maintaining a unified data model.

Additionally, this specification extends the existing project management entities (Projects, Phases, Workpackages, Resources, Departments) stored as graph nodes using Apache AGE (A Graph Extension) for PostgreSQL. The system adds support for Milestones, Sprints, and Backlogs as graph nodes, enabling powerful graph-based queries for organizational structure, project hierarchy, resource allocation, sprint planning, and cross-project analytics.

**Important Architectural Decisions:**
- **Apache AGE for graph database**: Uses AGE extension for PostgreSQL instead of separate Neo4j instance, maintaining unified database architecture
- **Users remain in PostgreSQL**: Users are application-level entities for authentication and authorization, NOT project management entities
- **Resources are graph nodes**: Resources (people, machines, equipment, capacity) are the project management entities used for scheduling and resource allocation
- **Dual methodology support**: The system supports BOTH classic (Project → Phase → Workpackage → Task) and agile (Backlog → Sprint → Task) workflows simultaneously
- **Flexible task assignment**: Tasks can exist in BOTH hierarchies - a task can belong to a Workpackage AND be assigned to a Sprint
- **Unified scheduling**: The SchedulerService handles both duration-based (classic) and velocity-based (agile) planning with critical path calculation
- **Kanban for workflow**: Kanban board is used for task ordering, assignment, and workflow management, not for displaying schedule dates
- **Progress tracking**: Task progress comes from task status updates and journaling, reflected in reports and Gantt charts

## Glossary

- **System**: RxDx Backend Schedule API
- **SchedulerService**: The existing OR-Tools-based constraint programming scheduler
- **WorkItem**: A base entity representing any trackable work element (requirement, task, test, etc.)
- **Task**: A WorkItem with type="task" that can be scheduled
- **Schedule**: A calculated plan assigning start and end dates to tasks with critical path identification
- **Resource**: A project management entity (person, machine, equipment, or other capacity) used in scheduling and stored as a graph node
- **Dependency**: A relationship between tasks defining execution order
- **Constraint**: A rule that must be satisfied in the schedule (deadlines, resources, dependencies)
- **Conflict**: A situation where constraints cannot be simultaneously satisfied
- **Gantt_Chart**: A visual timeline showing task schedules, dependencies, and critical path
- **Kanban_Board**: A visual board for task ordering, assignment to resources/sprints, and workflow management (NOT for displaying schedule dates)
- **Schedule_Version**: A snapshot of a schedule at a specific point in time
- **Critical_Path**: The sequence of tasks that determines the minimum project duration, calculated automatically
- **User**: An authenticated application user stored in PostgreSQL (for authentication/authorization only, NOT used in project management)
- **Project_Manager**: A user role responsible for project planning and scheduling
- **Project**: A container for organizing related work items, phases, workpackages, and resources
- **Phase**: A high-level stage within a project in the classic methodology (e.g., Planning, Development, Testing, Deployment), with sequential ordering via NEXT relationships
- **Workpackage**: A logical grouping of related tasks within a phase in the classic methodology
- **Milestone**: A significant checkpoint or deliverable in a project, represented as a separate graph node
- **Department**: An organizational unit for grouping resources by function or team
- **Company**: The root organizational entity containing departments
- **Backlog**: A container for unscheduled work items awaiting prioritization and sprint assignment
- **Sprint**: A time-boxed iteration (typically 1-4 weeks) in the agile methodology, stored as a graph node
- **Sprint_Goal**: The objective or deliverable target for a sprint
- **Velocity**: The amount of work a team completes in a sprint, measured in story points or hours
- **Burndown**: A chart showing remaining work over time within a sprint
- **Story_Points**: A relative measure of effort or complexity for agile work items
- **Task_Status**: Status of a task - "draft" (not ready), "ready" (ready to start), "active" (in progress), "completed" (done), "blocked" (cannot proceed)
- **Task_Journal**: Time-stamped log entries recording task progress, decisions, and changes
- **Calculated_Dates**: Start and end dates computed by the scheduling algorithm (calculated_start_date, calculated_end_date)
- **Manual_Dates**: User-specified start and due dates that override calculated dates (start_date, due_date)
- **Minimal_Duration**: Minimum time duration for phases and workpackages when no other information is available
- **Progress**: Percentage completion (0-100) for tracking actual progress vs. planned schedule
- **Resource_Inheritance**: Pattern where resources allocated at project level are available to workpackages and tasks below
- **AGE**: Apache AGE (A Graph Extension) - PostgreSQL extension for graph database capabilities
- **Graph_Node**: An entity stored in the AGE graph database within PostgreSQL
- **Graph_Relationship**: A directed connection between two graph nodes
- **PostgreSQL**: The relational database used for all data including graph data via AGE extension

## Requirements

### Requirement 1: Schedule Calculation API

**User Story:** As a project manager, I want to calculate project schedules through an API endpoint, so that I can generate optimized task timelines based on dependencies and resource constraints with automatic critical path identification.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/v1/schedule/calculate with project tasks, resources, and constraints, THE System SHALL calculate an optimized schedule using the SchedulerService
2. WHEN the schedule calculation succeeds, THE System SHALL return status "success" or "feasible" with the complete schedule including task start dates, end dates, and resource assignments
3. WHEN the schedule calculation succeeds, THE System SHALL identify and return the critical path (sequence of tasks determining minimum project duration)
4. WHEN the schedule calculation fails due to impossible constraints, THE System SHALL return status "infeasible" with a list of identified conflicts
5. WHEN calculating a schedule, THE System SHALL respect task dependencies (finish-to-start, start-to-start, finish-to-finish)
6. WHEN calculating a schedule, THE System SHALL respect resource capacity constraints
7. WHEN calculating a schedule, THE System SHALL respect task deadlines and earliest start dates
8. WHEN calculating a schedule with milestones in manual mode (is_manual_constraint=true), THE System SHALL treat milestone target_date as a hard constraint
9. WHEN calculating a schedule with milestones in automatic mode (is_manual_constraint=false), THE System SHALL calculate milestone date from dependent task completion dates
10. WHEN calculating a schedule with sprint assignments, THE System SHALL respect sprint start_date and end_date boundaries as hard constraints
11. WHEN a task is in both Workpackage and Sprint, THE System SHALL schedule within sprint boundaries
12. WHEN calculating a schedule, THE System SHALL optimize to minimize total project duration
13. WHEN a schedule is successfully calculated, THE System SHALL store the schedule with a version number
14. WHEN storing a schedule, THE System SHALL record the calculation timestamp and applied constraints
15. THE System SHALL complete schedule calculations within 60 seconds for projects with up to 1000 tasks
16. WHEN calculating critical path, THE System SHALL use longest path algorithm through the dependency graph
17. WHEN returning schedule results, THE System SHALL mark all tasks on the critical path with a boolean flag

### Requirement 2: Schedule Retrieval API

**User Story:** As a project manager, I want to retrieve the current schedule for a project, so that I can view the planned task timelines, resource allocations, and critical path.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/v1/schedule/{project_id}, THE System SHALL return the most recent schedule for that project
2. WHEN no schedule exists for a project, THE System SHALL return a 404 error with a descriptive message
3. WHEN returning a schedule, THE System SHALL include all scheduled tasks with start dates, end dates, durations, and assigned resources
4. WHEN returning a schedule, THE System SHALL include the critical path task IDs
5. WHEN returning a schedule, THE System SHALL include project-level metadata (start date, end date, total duration, version)
6. WHEN returning a schedule, THE System SHALL include the constraints that were applied during calculation
7. THE System SHALL return schedule data within 2 seconds for projects with up to 1000 tasks

### Requirement 3: Gantt Chart Data API

**User Story:** As a project manager, I want to retrieve Gantt chart data for a project, so that I can visualize the project timeline with task dependencies, critical path, milestones, and sprint boundaries.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/v1/schedule/{project_id}/gantt, THE System SHALL return schedule data formatted for Gantt chart visualization
2. WHEN returning Gantt data, THE System SHALL include all scheduled tasks with start dates, end dates, and titles
3. WHEN returning Gantt data, THE System SHALL include task dependencies with relationship types (finish-to-start, start-to-start, finish-to-finish)
4. WHEN returning Gantt data, THE System SHALL identify and mark critical path tasks
5. WHEN returning Gantt data, THE System SHALL include milestones as diamond markers at their target dates
6. WHEN returning Gantt data, THE System SHALL show milestone dependencies (which tasks must complete before milestone)
7. WHEN returning Gantt data, THE System SHALL indicate which tasks are assigned to sprints
8. WHEN returning Gantt data, THE System SHALL show sprint boundaries as vertical lines with sprint name and dates
9. WHEN returning Gantt data, THE System SHALL include resource assignments for each task
10. WHEN no schedule exists for a project, THE System SHALL return a 404 error
11. THE System SHALL return Gantt data within 2 seconds for projects with up to 1000 tasks
12. WHEN returning Gantt data, THE System SHALL include task completion status (draft, ready, active, completed, blocked)
13. WHEN returning Gantt data, THE System SHALL calculate and include completion percentage based on completed vs. total tasks

### Requirement 4: Schedule Conflict Detection

**User Story:** As a project manager, I want detailed conflict information when scheduling fails, so that I can understand and resolve the issues preventing a feasible schedule.

#### Acceptance Criteria

1. WHEN schedule calculation fails, THE System SHALL identify all constraint violations
2. WHEN a circular dependency is detected, THE System SHALL report the cycle with the complete task chain
3. WHEN a task depends on a non-existent task, THE System SHALL report the missing dependency
4. WHEN a task requires a non-existent resource, THE System SHALL report the missing resource
5. WHEN resource capacity is exceeded, THE System SHALL report which resource is over-allocated and by how much
6. WHEN a task deadline is impossible to meet, THE System SHALL report the task and the time gap
7. WHEN a milestone target date (manual mode) cannot be met by dependent tasks, THE System SHALL report the milestone and conflicting tasks
8. WHEN sprint capacity is exceeded, THE System SHALL report the sprint and the amount of over-allocation
9. WHEN reporting conflicts, THE System SHALL provide actionable suggestions for resolution
10. WHEN multiple conflicts exist, THE System SHALL report all conflicts, not just the first one

### Requirement 5: Schedule Versioning and History

**User Story:** As a project manager, I want to track schedule versions and changes over time, so that I can understand how the project plan has evolved.

#### Acceptance Criteria

1. WHEN a new schedule is calculated, THE System SHALL assign it version number 1
2. WHEN a schedule is recalculated, THE System SHALL increment the version number
3. WHEN storing a schedule version, THE System SHALL preserve the complete schedule state including all task dates and resource assignments
4. WHEN storing a schedule version, THE System SHALL record the user who created the version and the timestamp
5. WHEN storing a schedule version, THE System SHALL record whether it was automatically calculated
6. THE System SHALL support retrieving previous schedule versions by version number
7. THE System SHALL support comparing two schedule versions to identify changes

### Requirement 6: Integration with WorkItem System

**User Story:** As a project manager, I want schedules to integrate seamlessly with the WorkItem system, so that task data is consistent across the application and progress is accurately tracked.

#### Acceptance Criteria

1. WHEN calculating a schedule, THE System SHALL retrieve tasks from the WorkItem system where type="task"
2. WHEN a task is scheduled, THE System SHALL update the task's start_date and end_date fields in the WorkItem system
3. WHEN a task's estimated_hours is updated in the WorkItem system, THE System SHALL mark the schedule as outdated
4. WHEN a task dependency is added or removed in the WorkItem system, THE System SHALL mark the schedule as outdated
5. WHEN a task is deleted from the WorkItem system, THE System SHALL remove it from the schedule
6. THE System SHALL support scheduling tasks from multiple projects independently
7. THE System SHALL validate that all task IDs in a schedule request correspond to existing WorkItems
8. WHEN a task is created, THE System SHALL support status values: "draft", "ready", "active", "completed", "blocked"
9. WHEN a task status is "draft", THE System SHALL exclude it from schedule calculations
10. WHEN a task status is "ready", THE System SHALL include it in schedule calculations as available to start
11. WHEN a task status is "completed", THE System SHALL record the completion date and mark it as done
12. WHEN a task has a "done" boolean attribute set to true, THE System SHALL treat it as completed in progress calculations
13. THE System SHALL support adding journal entries to tasks with timestamp, user_id, and entry text
14. WHEN retrieving task progress, THE System SHALL include the most recent journal entries
15. WHEN calculating project completion percentage, THE System SHALL use the "done" attribute and "completed" status

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

### Requirement 10: Kanban Board for Task Ordering and Assignment

**User Story:** As a team member, I want to use a Kanban board to order tasks, assign resources, and assign tasks to sprints, so that I can manage workflow and team assignments visually.

#### Acceptance Criteria

1. WHEN retrieving tasks for the Kanban board, THE System SHALL return tasks ordered by priority within each column
2. WHEN a task is moved between Kanban columns, THE System SHALL update the task status in the WorkItem system
3. WHEN a task status changes to "ready", THE System SHALL automatically add the task to the Backlog (create IN_BACKLOG relationship)
4. WHEN a task status is updated, THE System SHALL NOT modify scheduled dates (schedule dates are read-only on Kanban)
5. THE System SHALL support assigning resources to tasks via drag-and-drop on the Kanban board
6. THE System SHALL support assigning tasks to sprints via drag-and-drop on the Kanban board
7. WHEN a resource is assigned to a task on Kanban, THE System SHALL create an ASSIGNED_TO relationship in the graph
8. WHEN a task is assigned to a sprint on Kanban, THE System SHALL create an ASSIGNED_TO_SPRINT relationship in the graph
9. THE System SHALL support filtering Kanban tasks by sprint (show only tasks in selected sprint)
10. THE System SHALL support filtering Kanban tasks by resource (show only tasks assigned to selected resource)
11. THE System SHALL support filtering Kanban tasks by workpackage (show only tasks in selected workpackage)
12. THE System SHALL support filtering Kanban tasks by "in backlog" status
13. THE System SHALL support reordering tasks within a Kanban column by updating priority values
14. WHEN a task is moved to a "completed" column, THE System SHALL set the task status to "completed" and done attribute to true
15. THE System SHALL support custom Kanban columns configured per project
16. THE System SHALL display task metadata on Kanban cards (title, assignee, sprint, estimated hours, backlog indicator) but NOT schedule dates

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

**User Story:** As a system architect, I want Projects, Phases, Workpackages, Resources, Departments, Company, Milestones, Sprints, and Backlogs to be stored as graph nodes, so that we can leverage graph relationships for project organization, resource allocation, work hierarchy, agile planning, and advanced querying capabilities.

**CRITICAL ARCHITECTURAL CLARIFICATION:**
- **Tasks remain as WorkItem nodes** (type='task') - NOT separate Task nodes
- **Milestones are separate Milestone nodes** - NOT WorkItem nodes
- This decision is documented in `.kiro/specs/backend-schedule-api/ARCHITECTURE_CLARIFICATION.md`
- Tasks integrate with requirements, risks, tests, documents (WorkItem ecosystem)
- Milestones are used ONLY for project scheduling (separate concern)

#### Acceptance Criteria

**Organizational Structure:**

1. WHEN a Company is created, THE System SHALL create a Company node in the graph database with properties (id, name, description, created_at, updated_at)
2. WHEN a Department is created, THE System SHALL create a Department node in the graph database with properties (id, name, description, manager_user_id, company_id, created_at)
3. THE System SHALL create a PARENT_OF relationship from Company nodes to Department nodes
4. THE System SHALL create a PARENT_OF relationship from Department nodes to child Department nodes (hierarchical structure)
5. WHEN a Resource is created, THE System SHALL create a Resource node in the graph database with properties (id, name, type, capacity, department_id, skills, availability, created_at)
6. THE System SHALL support Resource types: "person", "machine", "equipment", "facility", "other"
7. THE System SHALL create a BELONGS_TO relationship from Resource nodes to Department nodes

**Classic Project Management Entities:**

8. WHEN a Project is created, THE System SHALL create a Project node in the graph database with properties (id, name, description, status, start_date, end_date, created_at, updated_at, created_by_user_id)
9. WHEN a Phase is created, THE System SHALL create a Phase node in the graph database with properties (id, name, description, order, start_date, end_date, project_id, created_at)
10. WHEN a Workpackage is created, THE System SHALL create a Workpackage node in the graph database with properties (id, name, description, order, start_date, end_date, phase_id, created_at)
11. THE System SHALL create a BELONGS_TO relationship from Phase nodes to Project nodes
12. THE System SHALL create a BELONGS_TO relationship from Workpackage nodes to Phase nodes

**Task and Milestone Nodes:**

13. WHEN a Task (WorkItem type='task') is created, THE System SHALL store it as a WorkItem node in the graph database with properties (id, type='task', title, description, status, priority, estimated_hours, actual_hours, story_points, skills_needed, done, start_date, end_date, due_date, workpackage_id, version, created_by, created_at, updated_at, is_signed)
14. WHEN a Milestone is created, THE System SHALL create a Milestone node (NOT WorkItem) in the graph database with properties (id, title, description, target_date, is_manual_constraint, completion_criteria, status, project_id, version, created_by, created_at, updated_at)
15. THE System SHALL use WorkItem node label for Tasks with type='task' property
16. THE System SHALL use Milestone node label for Milestones (separate from WorkItem)
17. THE System SHALL query Tasks using: MATCH (w:WorkItem {type: 'task'})
18. THE System SHALL query Milestones using: MATCH (m:Milestone)

**Skills-Based Resource Matching:**

19. WHEN a Task is created, THE System SHALL support skills_needed property as an array of strings
20. WHEN allocating resources to tasks, THE System SHALL match Resource skills with Task skills_needed
21. THE System SHALL prioritize resources whose skills match the task's skills_needed
22. THE System SHALL support filtering resources by skills for assignment recommendations

**Classic Hierarchy Relationships:**

23. THE System SHALL create a BELONGS_TO relationship from Task (WorkItem type='task') nodes to Workpackage nodes (mandatory - all tasks must belong to a workpackage)
24. THE System SHALL create a DEPENDS_ON relationship from Task (WorkItem) nodes to other Task (WorkItem) nodes (task dependencies)
25. THE System SHALL create a DEPENDS_ON relationship from Milestone nodes to Task (WorkItem) nodes (milestone depends on task completion)
26. THE System SHALL create a BLOCKS relationship from Task (WorkItem) nodes to Milestone nodes (task blocks milestone)

**Resource Allocation Patterns:**

27. THE System SHALL create an ALLOCATED_TO relationship from Resource nodes to Project nodes with properties (allocation_percentage, lead, start_date, end_date)
28. THE System SHALL create an ALLOCATED_TO relationship from Resource nodes to Task (WorkItem type='task') nodes with properties (allocation_percentage, lead, start_date, end_date)
29. THE System SHALL support "lead" boolean property on ALLOCATED_TO relationships (true = primary/lead, false = supporting)
30. WHEN a Resource is allocated with lead=true, THE System SHALL prioritize that resource as the primary owner
31. WHEN a Resource is allocated with lead=false, THE System SHALL treat that resource as supporting/collaborating
32. THE System SHALL support both Project-level allocation (resource available to all tasks) and Task-level allocation (explicit assignment)

**Department-Based Resource Allocation:**

33. THE System SHALL create a LINKED_TO_DEPARTMENT relationship from Workpackage nodes to Department nodes
34. WHEN a Workpackage is linked to a Department, THE System SHALL make Resources from that Department available for task allocation
35. THE System SHALL use skills_needed matching when allocating Department resources to tasks

**Agile Workflow Entities:**

36. WHEN a Backlog is created, THE System SHALL create a Backlog node in the graph database with properties (id, name, description, project_id, created_at)
37. WHEN a Sprint is created, THE System SHALL create a Sprint node in the graph database with properties (id, name, goal, start_date, end_date, capacity_hours, capacity_story_points, status, project_id, created_at)
38. THE System SHALL support Sprint statuses: "planning", "active", "completed", "cancelled"
39. THE System SHALL create a BELONGS_TO relationship from Sprint nodes to Project nodes
40. THE System SHALL create a BELONGS_TO relationship from Backlog nodes to Project nodes

**Backlog and Sprint Relationships (MUTUALLY EXCLUSIVE):**

41. WHEN a Task (WorkItem type='task') status changes to "ready", THE System SHALL automatically create an IN_BACKLOG relationship from Task to Backlog
42. THE System SHALL create an ASSIGNED_TO_SPRINT relationship from Task (WorkItem) nodes to Sprint nodes (manual assignment by user)
43. THE System SHALL enforce mutual exclusivity: A Task can have IN_BACKLOG OR ASSIGNED_TO_SPRINT, never both
44. WHEN a Task is assigned to a Sprint, THE System SHALL remove the IN_BACKLOG relationship
45. WHEN a Task is removed from a Sprint, THE System SHALL create an IN_BACKLOG relationship (task returns to backlog)
46. THE System SHALL maintain the BELONGS_TO (Workpackage) relationship regardless of Backlog/Sprint status

**Additional Task Relationships:**

47. THE System SHALL create a has_risk relationship from Task (WorkItem type='task') nodes to Risk (WorkItem) nodes
48. THE System SHALL create an implements relationship from Task (WorkItem type='task') nodes to Requirement (WorkItem) nodes
49. THE System SHALL support multiple concurrent relationships on Task (WorkItem) nodes (BELONGS_TO, has_risk, implements, DEPENDS_ON, etc.)
50. THE System SHALL allow Tasks to have many domain relationships while maintaining only ONE of IN_BACKLOG or ASSIGNED_TO_SPRINT

**Milestone Scheduling Modes:**

51. WHEN a Milestone has is_manual_constraint=true, THE System SHALL use target_date as a hard constraint in schedule calculations
52. WHEN a Milestone has is_manual_constraint=false, THE System SHALL calculate target_date automatically from dependent task completion dates
53. THE System SHALL support both manual and automatic milestone scheduling modes simultaneously in the same project

**Sprint Capacity and Velocity:**

54. WHEN a Sprint is created, THE System SHALL calculate capacity_hours based on assigned resources and their availability
55. WHEN a Sprint completes, THE System SHALL calculate actual velocity (completed story_points and completed hours)
56. THE System SHALL track historical velocity across sprints for planning recommendations
57. THE System SHALL support both story_points and estimated_hours as effort measures for tasks
58. WHEN planning a Sprint, THE System SHALL use average historical velocity to recommend capacity

**Graph Traversal Queries:**

59. THE System SHALL support querying all WorkItems for a Project through graph traversal
60. THE System SHALL support querying all Resources in a Department through graph traversal
61. THE System SHALL support querying all Tasks (WorkItem type='task') in a Workpackage through graph traversal
62. THE System SHALL support querying all Tasks (WorkItem type='task') in a Backlog through graph traversal (ordered by priority)
63. THE System SHALL support querying all Tasks (WorkItem type='task') in a Sprint through graph traversal
64. THE System SHALL support querying all Milestones for a Project through graph traversal
65. THE System SHALL support querying the complete project hierarchy (Project → Phase → Workpackage → Task) through graph traversal
66. THE System SHALL support querying all Projects a Resource is allocated to through graph traversal
67. THE System SHALL support querying all Tasks (WorkItem) that depend on a Milestone through graph traversal
68. THE System SHALL support querying all Sprints for a Project through graph traversal (ordered by start_date)
69. THE System SHALL support querying all Departments under a Company through graph traversal

**Cascade Deletion Rules:**

70. WHEN a Company is deleted, THE System SHALL cascade delete all related Department nodes and relationships
71. WHEN a Project is deleted, THE System SHALL cascade delete all related Phase, Workpackage, Sprint, Backlog, and Milestone nodes and relationships
72. WHEN a Phase is deleted, THE System SHALL cascade delete all related Workpackage nodes and relationships
73. WHEN a Workpackage is deleted, THE System SHALL remove BELONGS_TO relationships but NOT delete the Task (WorkItem) nodes
74. WHEN a Sprint is deleted, THE System SHALL remove ASSIGNED_TO_SPRINT relationships and move tasks back to Backlog (create IN_BACKLOG relationships)
75. WHEN a Backlog is deleted, THE System SHALL remove IN_BACKLOG relationships but NOT delete the Task (WorkItem) nodes
76. WHEN a Milestone is deleted, THE System SHALL validate no active task dependencies exist before deletion
77. WHEN a Resource is deleted, THE System SHALL validate no active task assignments exist before deletion
78. WHEN a Department is deleted, THE System SHALL validate no Resources are assigned to it before deletion

### Requirement 16A: Phase Sequential Relationships and New Scheduling Attributes

**User Story:** As a project manager, I want phases to have sequential ordering and entities to track both calculated and manual dates with progress, so that I can manage project flow and monitor actual progress against planned schedules.

#### Acceptance Criteria

**Phase Sequential Relationships:**

1. WHEN a Phase is created, THE System SHALL support creating a NEXT relationship to another Phase node
2. THE System SHALL enforce that Phase NEXT relationships form a linear sequence (no cycles, no branches)
3. WHEN retrieving phases for a project, THE System SHALL return them ordered by the NEXT relationship chain
4. WHEN a Phase is deleted, THE System SHALL update NEXT relationships to maintain sequence continuity
5. THE System SHALL validate that all phases in a project form a single connected sequence via NEXT relationships
6. THE System SHALL support querying the next phase for any given phase through graph traversal
7. THE System SHALL support querying the previous phase for any given phase through graph traversal

**Minimal Duration Attributes:**

8. WHEN a Phase is created, THE System SHALL support a minimal_duration property (in calendar days)
9. WHEN a Workpackage is created, THE System SHALL support a minimal_duration property (in calendar days)
10. WHEN calculating schedules, THE System SHALL use minimal_duration as the minimum time for phases/workpackages when no task data is available
11. WHEN calculated duration is less than minimal_duration, THE System SHALL use minimal_duration instead
12. THE System SHALL validate that minimal_duration is a positive number

**Task Duration and Effort Attributes:**

13. WHEN a Task is created, THE System SHALL support a duration property (in calendar days)
14. WHEN a Task is created, THE System SHALL support an effort property (in hours)
15. THE System SHALL use duration for calendar-based scheduling (Gantt chart display)
16. THE System SHALL use effort for resource capacity calculations
17. THE System SHALL validate that duration and effort are positive numbers

**Calculated Date Attributes:**

18. WHEN a schedule is calculated, THE System SHALL store calculated_start_date on Task, Workpackage, Phase, Project, and Milestone nodes
19. WHEN a schedule is calculated, THE System SHALL store calculated_end_date on Task, Workpackage, Phase, Project, and Milestone nodes
20. THE System SHALL update calculated dates whenever the schedule is recalculated
21. THE System SHALL preserve calculated dates as historical data when creating new schedule versions

**Manual Date Attributes:**

22. THE System SHALL support start_date property on Task, Workpackage, Phase, Project, and Milestone nodes (optional, user-specified)
23. THE System SHALL support due_date property on Task, Workpackage, Phase, Project, and Milestone nodes (optional, user-specified)
24. WHEN start_date is set, THE System SHALL use it as a constraint in schedule calculations (earliest start)
25. WHEN due_date is set, THE System SHALL use it as a constraint in schedule calculations (deadline)
26. WHEN both start_date and due_date are set, THE System SHALL validate that due_date is after start_date

**Progress Tracking Attributes:**

27. THE System SHALL support start_date_is property on Task, Workpackage, Phase, Project, and Milestone nodes (actual start date when work begins)
28. THE System SHALL support progress property on Task, Workpackage, Phase, Project, and Milestone nodes (percentage 0-100)
29. WHEN start_date_is is set, THE System SHALL use it to override calculated_start_date in progress calculations
30. WHEN progress is set, THE System SHALL use it to calculate actual completion vs. planned schedule
31. THE System SHALL validate that progress is between 0 and 100

**Gantt Chart Display Priority Rules:**

32. WHEN displaying dates in Gantt chart, THE System SHALL prioritize start_date over calculated_start_date if start_date is set
33. WHEN displaying dates in Gantt chart, THE System SHALL prioritize due_date over calculated_end_date if due_date is set
34. WHEN displaying dates in Gantt chart, THE System SHALL use calculated dates when manual dates are not set
35. WHEN displaying progress in Gantt chart, THE System SHALL show progress percentage as a filled portion of the task bar
36. WHEN start_date_is is set and differs from start_date, THE System SHALL visually indicate the variance in Gantt chart

**Scheduling Priority Rules:**

37. WHEN calculating schedules, THE System SHALL respect start_date as earliest start constraint
38. WHEN calculating schedules, THE System SHALL respect due_date as deadline constraint
39. WHEN start_date_is and progress indicate work has started, THE System SHALL adjust remaining work calculations accordingly
40. WHEN progress is 100%, THE System SHALL treat the entity as completed regardless of calculated dates

**Skills Attribute for Resource Matching:**

41. WHEN a Task is created, THE System SHALL support a skills property (array of strings) for required skills
42. WHEN allocating resources to tasks, THE System SHALL match Resource skills with Task skills
43. THE System SHALL prioritize resources whose skills array intersects with task skills array
44. THE System SHALL support querying tasks by required skills
45. THE System SHALL support filtering resources by skills for assignment recommendations

### Requirement 16B: Resource Inheritance and Dependency Relationships

**User Story:** As a project manager, I want resources to be inherited from project to workpackage to task levels, and I want flexible dependency relationships between entities, so that resource allocation is efficient and project dependencies are clearly defined.

#### Acceptance Criteria

**Resource Inheritance Pattern:**

1. WHEN a Resource is allocated to a Project, THE System SHALL make that resource available to all Workpackages and Tasks within the project
2. WHEN a Resource is allocated to a Workpackage, THE System SHALL make that resource available to all Tasks within the workpackage
3. WHEN a Resource is explicitly allocated to a Task, THE System SHALL use that allocation regardless of parent allocations
4. THE System SHALL support querying inherited resources for any Task through graph traversal (task → workpackage → project)
5. THE System SHALL calculate resource availability considering all inheritance levels
6. WHEN scheduling tasks, THE System SHALL consider inherited resources from parent entities
7. THE System SHALL support overriding inherited resource allocations at lower levels

**Before Dependency Relationships:**

8. THE System SHALL support BEFORE relationships between Workpackage nodes (workpackage A must complete before workpackage B starts)
9. THE System SHALL support BEFORE relationships between Task nodes (task A must complete before task B starts)
10. THE System SHALL support BEFORE relationships between Milestone nodes (milestone A must be achieved before milestone B)
11. THE System SHALL support BEFORE relationships from Workpackage to Task (workpackage must complete before task starts)
12. THE System SHALL support BEFORE relationships from Task to Milestone (task must complete before milestone)
13. WHEN creating BEFORE relationships, THE System SHALL validate no dependency cycles are created
14. WHEN calculating schedules, THE System SHALL respect all BEFORE relationships as ordering constraints
15. THE System SHALL support querying all entities that must complete before a given entity
16. THE System SHALL support querying all entities that depend on a given entity completing

**Dependency Relationship Properties:**

17. WHEN creating a BEFORE relationship, THE System SHALL support an optional lag property (days to wait after predecessor completes)
18. WHEN creating a BEFORE relationship, THE System SHALL support an optional dependency_type property (finish-to-start, start-to-start, finish-to-finish)
19. THE System SHALL default dependency_type to "finish-to-start" if not specified
20. WHEN calculating schedules, THE System SHALL apply lag days to dependency constraints
21. WHEN calculating schedules, THE System SHALL respect dependency_type for constraint formulation

**Resource Inheritance Algorithm:**

22. WHEN a Task needs resource allocation, THE System SHALL first check for explicit Task-level allocations
23. IF no Task-level allocation exists, THE System SHALL check Workpackage-level allocations
24. IF no Workpackage-level allocation exists, THE System SHALL check Project-level allocations
25. THE System SHALL combine resources from all inheritance levels (union of available resources)
26. WHEN multiple allocation percentages exist for the same resource, THE System SHALL use the most specific (Task > Workpackage > Project)
27. THE System SHALL support querying the effective resource allocation for any task considering inheritance

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

**User Story:** As a project manager, I want to organize projects into sequentially ordered phases and workpackages, so that I can structure work into logical stages and groupings, track progress at multiple hierarchical levels, and ensure phases flow in the correct order.

#### Acceptance Criteria

**Phase Management:**

1. WHEN a POST request is made to /api/v1/projects/{project_id}/phases with phase data, THE System SHALL create a new Phase node
2. WHEN creating a phase, THE System SHALL support minimal_duration property (calendar days)
3. WHEN creating a phase, THE System SHALL support creating a NEXT relationship to another phase
4. WHEN a GET request is made to /api/v1/projects/{project_id}/phases, THE System SHALL return all phases for the project ordered by NEXT relationship sequence
5. WHEN a PATCH request is made to /api/v1/phases/{phase_id}, THE System SHALL update the phase properties including minimal_duration
6. WHEN a DELETE request is made to /api/v1/phases/{phase_id}, THE System SHALL delete the phase and cascade delete related Workpackages
7. WHEN deleting a phase, THE System SHALL update NEXT relationships to maintain sequence continuity
8. WHEN creating a phase, THE System SHALL require a name
9. WHEN creating a phase, THE System SHALL validate the phase belongs to an existing project
10. WHEN retrieving phases, THE System SHALL include workpackage counts and completion percentages
11. THE System SHALL support reordering phases by updating NEXT relationships
12. THE System SHALL validate phase date ranges are within the project date range
13. WHEN a phase has calculated_start_date and calculated_end_date, THE System SHALL return them in the response
14. WHEN a phase has start_date and due_date (manual), THE System SHALL return them in the response
15. WHEN a phase has start_date_is and progress, THE System SHALL return them in the response
16. THE System SHALL support POST /api/v1/phases/{phase_id}/next/{next_phase_id} to create NEXT relationship
17. THE System SHALL support DELETE /api/v1/phases/{phase_id}/next to remove NEXT relationship
18. THE System SHALL validate that NEXT relationships form a linear sequence (no cycles, no branches)

**Workpackage Management:**

19. WHEN a POST request is made to /api/v1/phases/{phase_id}/workpackages with workpackage data, THE System SHALL create a new Workpackage node
20. WHEN creating a workpackage, THE System SHALL support minimal_duration property (calendar days)
21. WHEN a GET request is made to /api/v1/phases/{phase_id}/workpackages, THE System SHALL return all workpackages for the phase ordered by sequence
22. WHEN a GET request is made to /api/v1/workpackages/{workpackage_id}, THE System SHALL return workpackage details including tasks
23. WHEN a PATCH request is made to /api/v1/workpackages/{workpackage_id}, THE System SHALL update the workpackage properties including minimal_duration
24. WHEN a DELETE request is made to /api/v1/workpackages/{workpackage_id}, THE System SHALL delete the workpackage and update Task relationships
25. WHEN creating a workpackage, THE System SHALL require a name and order number
26. WHEN creating a workpackage, THE System SHALL validate the workpackage belongs to an existing phase
27. WHEN assigning a Task to a workpackage, THE System SHALL create a BELONGS_TO relationship
28. WHEN retrieving workpackages, THE System SHALL include task counts and completion percentages
29. THE System SHALL support reordering workpackages within a phase by updating order numbers
30. THE System SHALL validate workpackage date ranges are within the phase date range
31. WHEN a workpackage has calculated_start_date and calculated_end_date, THE System SHALL return them in the response
32. WHEN a workpackage has start_date and due_date (manual), THE System SHALL return them in the response
33. WHEN a workpackage has start_date_is and progress, THE System SHALL return them in the response

**Dependency Management:**

34. THE System SHALL support POST /api/v1/workpackages/{id}/before/{target_id} to create BEFORE relationship
35. THE System SHALL support DELETE /api/v1/workpackages/{id}/before/{target_id} to remove BEFORE relationship
36. THE System SHALL support GET /api/v1/workpackages/{id}/dependencies to list all BEFORE relationships
37. WHEN creating BEFORE relationships, THE System SHALL validate no dependency cycles are created

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

### Requirement 21: Backlog Management API

**User Story:** As a product owner, I want to manage backlogs through the API, so that I can organize and prioritize work items awaiting sprint assignment.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/v1/projects/{project_id}/backlogs with backlog data, THE System SHALL create a new Backlog node
2. WHEN a GET request is made to /api/v1/projects/{project_id}/backlogs, THE System SHALL return all backlogs for the project
3. WHEN a GET request is made to /api/v1/backlogs/{backlog_id}, THE System SHALL return backlog details including all tasks
4. WHEN a GET request is made to /api/v1/backlogs/{backlog_id}/tasks, THE System SHALL return all tasks in the backlog ordered by priority
5. WHEN a task status changes to "ready", THE System SHALL automatically add the task to the project's default Backlog (create IN_BACKLOG relationship)
6. WHEN a task is manually added to a backlog, THE System SHALL create an IN_BACKLOG relationship
7. WHEN a task is assigned to a sprint, THE System SHALL remove the IN_BACKLOG relationship (mutually exclusive with ASSIGNED_TO_SPRINT)
8. WHEN a task is removed from a sprint, THE System SHALL create an IN_BACKLOG relationship (task returns to backlog)
9. WHEN a task is removed from a backlog, THE System SHALL delete the IN_BACKLOG relationship
10. THE System SHALL support reordering backlog tasks by updating priority values
11. THE System SHALL support filtering backlog tasks by type (requirement, task, test, etc.)
12. THE System SHALL support filtering backlog tasks by estimated effort or story points
13. THE System SHALL calculate total estimated effort for all backlog items
14. WHEN a PATCH request is made to /api/v1/backlogs/{backlog_id}, THE System SHALL update the backlog properties
15. WHEN a DELETE request is made to /api/v1/backlogs/{backlog_id}, THE System SHALL remove all IN_BACKLOG relationships but NOT delete the tasks
16. THE System SHALL enforce that a task cannot have both IN_BACKLOG and ASSIGNED_TO_SPRINT relationships simultaneously

### Requirement 22: Sprint Management API

**User Story:** As a scrum master, I want to create and manage sprints through the API, so that I can organize work into time-boxed iterations with capacity tracking and velocity measurement.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/v1/projects/{project_id}/sprints with sprint data, THE System SHALL create a new Sprint node
2. WHEN creating a sprint, THE System SHALL require name, start_date, and end_date
3. WHEN creating a sprint, THE System SHALL validate end_date is after start_date
4. WHEN creating a sprint, THE System SHALL calculate capacity_hours based on assigned resources and their availability
5. WHEN creating a sprint, THE System SHALL default status to "planning"
6. WHEN a GET request is made to /api/v1/projects/{project_id}/sprints, THE System SHALL return all sprints for the project ordered by start_date
7. WHEN a GET request is made to /api/v1/sprints/{sprint_id}, THE System SHALL return sprint details including all assigned tasks
8. WHEN a GET request is made to /api/v1/sprints/{sprint_id}/tasks, THE System SHALL return all tasks assigned to the sprint
9. WHEN a POST request is made to /api/v1/sprints/{sprint_id}/tasks/{task_id}, THE System SHALL assign the task to the sprint (create ASSIGNED_TO_SPRINT relationship)
10. WHEN assigning a task to a sprint, THE System SHALL remove the IN_BACKLOG relationship (mutually exclusive)
11. WHEN assigning a task to a sprint, THE System SHALL validate the task is in "ready" status
12. WHEN assigning a task to a sprint, THE System SHALL maintain the task's BELONGS_TO (Workpackage) relationship
13. WHEN a DELETE request is made to /api/v1/sprints/{sprint_id}/tasks/{task_id}, THE System SHALL remove the task from the sprint (delete ASSIGNED_TO_SPRINT relationship)
14. WHEN removing a task from a sprint, THE System SHALL create an IN_BACKLOG relationship (task returns to backlog)
15. WHEN a PATCH request is made to /api/v1/sprints/{sprint_id} with status="active", THE System SHALL start the sprint and record actual start date
16. WHEN a PATCH request is made to /api/v1/sprints/{sprint_id} with status="completed", THE System SHALL complete the sprint and calculate actual velocity
17. WHEN a sprint completes, THE System SHALL calculate actual velocity as sum of completed task story_points and completed hours
18. WHEN a sprint completes, THE System SHALL store velocity values in the Sprint node
19. WHEN a sprint completes with incomplete tasks, THE System SHALL remove ASSIGNED_TO_SPRINT relationships and create IN_BACKLOG relationships for incomplete tasks
20. THE System SHALL calculate average velocity across the last 3 completed sprints for planning recommendations
21. THE System SHALL support only one active sprint per project at a time
22. WHEN a DELETE request is made to /api/v1/sprints/{sprint_id}, THE System SHALL remove all ASSIGNED_TO_SPRINT relationships and create IN_BACKLOG relationships for all tasks
23. THE System SHALL enforce that a task cannot have both IN_BACKLOG and ASSIGNED_TO_SPRINT relationships simultaneously

### Requirement 23: Milestone Management API

**User Story:** As a project manager, I want to create and manage milestones through the API, so that I can mark significant checkpoints and control how they affect scheduling.

#### Acceptance Criteria

1. WHEN a POST request is made to /api/v1/projects/{project_id}/milestones with milestone data, THE System SHALL create a new Milestone node
2. WHEN creating a milestone, THE System SHALL require title and project_id
3. WHEN creating a milestone, THE System SHALL support is_manual_constraint flag (default: false)
4. WHEN creating a milestone with is_manual_constraint=true, THE System SHALL require target_date
5. WHEN creating a milestone with is_manual_constraint=false, THE System SHALL calculate target_date from dependent tasks
6. WHEN a GET request is made to /api/v1/projects/{project_id}/milestones, THE System SHALL return all milestones for the project ordered by target_date
7. WHEN a GET request is made to /api/v1/milestones/{milestone_id}, THE System SHALL return milestone details including dependent tasks
8. WHEN a POST request is made to /api/v1/milestones/{milestone_id}/dependencies/{task_id}, THE System SHALL create a DEPENDS_ON relationship (milestone depends on task)
9. WHEN a POST request is made to /api/v1/milestones/{milestone_id}/dependencies/{task_id}, THE System SHALL create a BLOCKS relationship (task blocks milestone)
10. WHEN a DELETE request is made to /api/v1/milestones/{milestone_id}/dependencies/{task_id}, THE System SHALL remove both DEPENDS_ON and BLOCKS relationships
11. WHEN a PATCH request is made to /api/v1/milestones/{milestone_id}, THE System SHALL update milestone properties
12. WHEN updating a milestone's target_date (manual mode), THE System SHALL mark dependent task schedules as outdated
13. WHEN updating a milestone's is_manual_constraint from true to false, THE System SHALL recalculate target_date from dependent tasks
14. WHEN a milestone is achieved, THE System SHALL record actual_date and update status to "achieved"
15. WHEN a DELETE request is made to /api/v1/milestones/{milestone_id}, THE System SHALL validate no active task dependencies exist before deletion
16. THE System SHALL support milestone statuses: "pending", "achieved", "missed", "cancelled"

### Requirement 24: Velocity and Burndown Metrics API

**User Story:** As a scrum master, I want to track team velocity and sprint burndown through the API, so that I can measure team performance and predict future capacity.

#### Acceptance Criteria

1. WHEN a GET request is made to /api/v1/sprints/{sprint_id}/velocity, THE System SHALL return the sprint's actual velocity (story_points and hours)
2. WHEN a GET request is made to /api/v1/projects/{project_id}/velocity, THE System SHALL return average velocity across the last N completed sprints (default N=3)
3. WHEN a GET request is made to /api/v1/projects/{project_id}/velocity/history, THE System SHALL return velocity history for all completed sprints
4. WHEN calculating average velocity, THE System SHALL include both story_points and hours metrics
5. WHEN planning a new sprint, THE System SHALL provide velocity-based capacity recommendations
6. WHEN a GET request is made to /api/v1/sprints/{sprint_id}/burndown, THE System SHALL return daily burndown data (remaining hours per day)
7. WHEN returning burndown data, THE System SHALL include both actual and ideal burndown lines
8. WHEN returning burndown data, THE System SHALL calculate ideal burndown as linear decrease from total to zero
9. WHEN actual burndown is significantly above ideal, THE System SHALL flag the sprint as "at risk"
10. THE System SHALL track completed story_points and hours per day during active sprints
11. THE System SHALL calculate sprint completion percentage based on completed vs. total estimated hours
12. WHEN a GET request is made to /api/v1/sprints/{sprint_id}/statistics, THE System SHALL return sprint metrics (total tasks, completed tasks, remaining hours, completion percentage, velocity trend)
13. THE System SHALL support querying burndown data for visualization in burndown charts
14. THE System SHALL support both story_points and estimated_hours as effort measures for velocity calculations

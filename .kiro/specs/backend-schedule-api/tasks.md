# Implementation Tasks: Backend Schedule API (Schedule-Specific Features)

## Overview

This task list focuses ONLY on schedule-specific features that are NOT yet implemented. The following are already complete:
- ✅ SchedulerService with OR-Tools constraint programming
- ✅ MilestoneService with CRUD operations
- ✅ Schedule API endpoints (calculate, get, update)
- ✅ Milestone API endpoints (CRUD)
- ✅ Company, Department, Resource, Workpackage services
- ✅ SchedulePage frontend (basic list view)

**Remaining Schedule-Specific Features:**
- Phase NEXT relationships and sequential ordering
- New scheduling attributes (minimal_duration, calculated/manual dates, progress)
- Resource inheritance algorithm
- BEFORE dependency relationships
- Date priority handling in Gantt chart
- Skills-based resource allocation
- Critical path calculation
- Sprint management (service + API + UI)
- Backlog management (service + API + UI)
- Velocity tracking and burndown charts
- Gantt chart visualization enhancements
- Kanban board schedule integration
- Milestone dependency management

---

## Phase 0: Data Model Updates

### Task 0.1: Phase NEXT Relationship Implementation
- [x] Create NEXT edge label in AGE graph database
- [x] Add NEXT relationship support to PhaseService
- [x] Implement create_next_relationship method
- [x] Implement remove_next_relationship method
- [x] Implement get_next_phase method
- [x] Implement get_previous_phase method
- [x] Add validation: NEXT relationships form linear sequence (no cycles, no branches)
- [x] Update get_phases_for_project to order by NEXT relationship chain
- [x] Write unit tests for NEXT relationship operations
- [x] Write property test: NEXT relationships form valid linear sequence

**Requirements: 16A.1-16A.7**

### Task 0.2: Add New Scheduling Attributes to Schemas
- [x] Add minimal_duration to PhaseCreate, PhaseUpdate, PhaseResponse schemas
- [x] Add minimal_duration to WorkpackageCreate, WorkpackageUpdate, WorkpackageResponse schemas
- [x] Add duration and effort to TaskCreate, TaskUpdate, TaskResponse schemas (replace estimated_hours)
- [x] Add calculated_start_date and calculated_end_date to all entity response schemas
- [x] Add start_date and due_date to all entity create/update schemas (optional)
- [x] Add start_date_is and progress to all entity update/response schemas
- [x] Add skills to TaskCreate, TaskUpdate, TaskResponse schemas (array of strings)
- [x] Add field validators for new attributes (positive numbers, progress 0-100)
- [x] Write unit tests for schema validation

**Requirements: 16A.8-16A.45**

### Task 0.3: Update Graph Node Properties
- [x] Add minimal_duration property to Phase nodes
- [x] Add minimal_duration property to Workpackage nodes
- [x] Add duration and effort properties to Task nodes
- [x] Add calculated_start_date and calculated_end_date to all entity nodes
- [x] Add start_date and due_date to all entity nodes (optional)
- [x] Add start_date_is and progress to all entity nodes
- [x] Add skills property to Task nodes (array of strings)
- [x] Update node creation methods to include new properties
- [x] Update node update methods to handle new properties
- [x] Write migration script to add new properties to existing nodes

**Requirements: 16A.8-16A.45**

### Task 0.4: BEFORE Relationship Implementation
- [x] Create BEFORE edge label in AGE graph database
- [x] Add BEFORE relationship support to WorkpackageService
- [x] Add BEFORE relationship support to TaskService (WorkItemService)
- [x] Add BEFORE relationship support to MilestoneService
- [x] Implement create_before_relationship method with dependency_type and lag
- [x] Implement remove_before_relationship method
- [x] Implement get_before_dependencies method
- [x] Add validation: BEFORE relationships don't create cycles
- [x] Write unit tests for BEFORE relationship operations
- [x] Write property test: BEFORE relationships don't create cycles

**Requirements: 16B.8-16B.21**

### Task 0.5: Resource Inheritance Data Model
- [x] Update ALLOCATED_TO relationship to support Project, Workpackage, and Task targets
- [x] Add allocation_percentage, lead, start_date, end_date properties to ALLOCATED_TO
- [x] Update ResourceService to handle allocations at all three levels
- [x] Implement get_effective_resources_for_task method (inheritance algorithm)
- [x] Write unit tests for resource inheritance
- [x] Write property test: Most specific allocation wins
- [x] Write property test: Union of resources from all levels

**Requirements: 16B.1-16B.27**

---

## Phase 1: Critical Path and Schedule Enhancements

### Task 1.1: Critical Path Calculation Algorithm
- [x] Implement calculate_critical_path function using longest path algorithm
- [x] Build dependency graph (adjacency list) from task dependencies
- [x] Implement topological sort with longest path calculation
- [x] Track predecessor nodes for path reconstruction
- [x] Backtrack from end task to find critical path
- [x] Return list of task IDs on critical path
- [x] Add cycle detection for invalid dependency graphs
- [x] Write unit tests for critical path calculation
- [x] Write property test: Critical path duration >= any other path duration
- [x] Write property test: Critical path is always a valid path through dependency graph

**Requirements: 1.3, 1.16-1.17, 2.4**

### Task 1.2: Integrate Critical Path into SchedulerService
- [x] Update SchedulerService.schedule_project to calculate critical path
- [x] Mark critical path tasks with is_critical flag in schedule response
- [x] Store critical path task IDs in schedule metadata
- [x] Update ScheduleResponse schema to include critical_path field
- [x] Update schedule storage to persist critical path
- [x] Write unit tests for critical path integration
- [x] Write property test: All critical path tasks exist in schedule

**Requirements: 1.3, 1.16-1.17**

### Task 1.3: Skills-Based Resource Allocation
- [x] Add skills_needed property to task schemas (already in WorkItem, verify in schedule schemas)
- [x] Implement skill matching algorithm (set intersection) in SchedulerService
- [x] Update get_matching_resources_for_task to prioritize skill matches
- [x] Prioritize lead resources (lead=true) in allocation
- [x] Update schedule calculation to use skill-based matching
- [x] Write unit tests for skill matching
- [x] Write property test: Allocated resources have required skills
- [x] Write property test: Lead resources allocated before non-lead

**Requirements: 16.19-16.35, 8.1-8.10**

### Task 1.4: Milestone Dependency Management
- [x] Add POST /api/v1/milestones/{id}/dependencies/{task_id} endpoint
- [x] Add DELETE /api/v1/milestones/{id}/dependencies/{task_id} endpoint
- [x] Add GET /api/v1/milestones/{id}/dependencies endpoint
- [x] Implement add_dependency method in MilestoneService
- [x] Implement remove_dependency method in MilestoneService
- [x] Implement get_dependencies method in MilestoneService
- [x] Create DEPENDS_ON relationship from Milestone to Task
- [x] Create BLOCKS relationship from Task to Milestone (inverse)
- [x] Add dependency cycle detection
- [x] Write unit tests for dependency management
- [x] Write property test: No dependency cycles

**Requirements: 16.25-16.26, 23.8-23.10**

### Task 1.5: Milestone Scheduling Modes
- [x] Update SchedulerService to handle milestone constraints (manual mode)
- [x] Implement milestone date calculation (automatic mode)
- [x] Add milestone constraints to OR-Tools solver (manual mode)
- [x] Calculate milestone dates from dependent task completion (automatic mode)
- [x] Update schedule response to include milestone dates
- [x] Write unit tests for both milestone modes
- [x] Write property test: Manual milestone constraints are respected
- [x] Write property test: Automatic milestone dates calculated correctly

**Requirements: 1.8-1.9, 16.51-16.53**

---

## Phase 1A: Date Priority and Progress Tracking

### Task 1A.1: Date Priority Algorithm Implementation
- [x] Implement get_display_dates_for_entity function (manual dates > calculated dates)
- [x] Implement get_progress_indicator function (variance calculation)
- [x] Update SchedulerService to store calculated dates separately from manual dates
- [x] Update schedule calculation to respect start_date as earliest start constraint
- [x] Update schedule calculation to respect due_date as deadline constraint
- [x] Write unit tests for date priority logic
- [x] Write property test: Manual dates always override calculated dates in display
- [x] Write property test: Calculated dates used when manual dates not set

**Requirements: 16A.22-16A.40**

### Task 1A.2: Progress Tracking Integration
- [x] Add progress update endpoint: PATCH /api/v1/workitems/{id} with progress field
- [x] Add start_date_is update endpoint: PATCH /api/v1/workitems/{id} with start_date_is field
- [x] Implement progress calculation for workpackages (aggregate from tasks)
- [x] Implement progress calculation for phases (aggregate from workpackages)
- [x] Implement progress calculation for projects (aggregate from phases)
- [x] Add variance calculation (actual vs. planned start dates)
- [x] Write unit tests for progress tracking
- [x] Write property test: Progress is always between 0 and 100
- [x] Write property test: Aggregated progress matches child entity progress

**Requirements: 16A.27-16A.31**

### Task 1A.3: Minimal Duration Enforcement
- [x] Implement enforce_minimal_duration function
- [x] Implement calculate_phase_duration function (with minimal_duration fallback)
- [x] Implement calculate_workpackage_duration function (with minimal_duration fallback)
- [x] Update schedule calculation to use minimal_duration when no task data available
- [x] Update schedule calculation to extend duration if calculated < minimal_duration
- [x] Write unit tests for minimal duration enforcement
- [x] Write property test: Calculated duration >= minimal_duration

**Requirements: 16A.8-16A.12**

### Task 1A.4: Phase NEXT Relationship API Endpoints
- [x] POST /api/v1/phases/{id}/next/{next_id} - Create NEXT relationship
- [x] DELETE /api/v1/phases/{id}/next - Remove NEXT relationship
- [x] GET /api/v1/phases/{id}/next - Get next phase
- [x] GET /api/v1/phases/{id}/previous - Get previous phase
- [x] Update GET /api/v1/projects/{id}/phases to order by NEXT chain
- [x] Add validation: NEXT relationships form linear sequence
- [x] Add authentication and authorization
- [x] Write integration tests for phase ordering

**Requirements: 16A.1-16A.7, 18.1-18.18**

### Task 1A.5: BEFORE Dependency API Endpoints
- [x] POST /api/v1/workpackages/{id}/before/{target_id} - Create BEFORE relationship
- [x] DELETE /api/v1/workpackages/{id}/before/{target_id} - Remove BEFORE relationship
- [x] GET /api/v1/workpackages/{id}/dependencies - List BEFORE relationships
- [x] POST /api/v1/workitems/{id}/before/{target_id} - Create BEFORE for tasks
- [x] POST /api/v1/milestones/{id}/before/{target_id} - Create BEFORE for milestones
- [x] Add dependency_type and lag parameters
- [x] Add cycle detection validation
- [ ] Add authentication and authorization
- [x] Write integration tests for BEFORE dependencies

**Requirements: 16B.8-16B.21, 18.34-18.37**

---

## Phase 1B: Resource Inheritance and Skills Matching

### Task 1B.1: Resource Inheritance Algorithm
- [x] Implement get_effective_resources_for_task function (3-level inheritance)
- [x] Query task-level allocations (highest priority)
- [x] Query workpackage-level allocations (inherited)
- [x] Query project-level allocations (inherited)
- [x] Combine resources with priority: task > workpackage > project
- [x] Handle allocation percentage overrides at different levels
- [x] Write unit tests for resource inheritance
- [x] Write property test: Most specific allocation wins
- [x] Write property test: Union of resources from all levels

**Requirements: 16B.1-16B.27**

### Task 1B.2: Skills-Based Resource Matching
- [x] Implement match_resources_by_skills function (set intersection)
- [x] Update get_matching_resources_for_task to use skills matching
- [x] Prioritize resources with matching skills in allocation
- [x] Prioritize lead resources (lead=true) in allocation
- [x] Update schedule calculation to use skills-based matching
- [x] Add GET /api/v1/resources?skills=Python,FastAPI endpoint for filtering
- [x] Write unit tests for skills matching
- [x] Write property test: Allocated resources have required skills
- [x] Write property test: Lead resources allocated before non-lead

**Requirements: 16A.41-16A.45, 16B.22-16B.27**

### Task 1B.3: Resource Allocation API Updates
- [x] Update POST /api/v1/resources/{id}/allocate to support project/workpackage/task targets
- [x] Add lead parameter to allocation requests
- [x] Add start_date and end_date parameters to allocation requests
- [x] Update GET /api/v1/resources/{id} to show allocations at all levels
- [x] Add GET /api/v1/tasks/{id}/effective-resources endpoint (shows inherited resources)
- [x] Add authentication and authorization
- [x] Write integration tests for resource allocation

**Requirements: 16B.1-16B.27, 19.1-19.20**

---

## Phase 1C: Gantt Chart Data Model Updates

### Task 1C.1: Gantt Chart Data Preparation
- [x] Implement prepare_gantt_data function with date priority logic
- [x] Include calculated_start_date and calculated_end_date in response
- [x] Include start_date and due_date (manual) in response
- [x] Include start_date_is and progress in response
- [x] Calculate variance (actual vs. planned start dates)
- [x] Add is_delayed flag based on variance
- [x] Include minimal_duration for phases/workpackages
- [x] Write unit tests for Gantt data preparation
- [x] Write property test: Display dates follow priority rules

**Requirements: 16A.32-16A.36, 3.1-3.13**

### Task 1C.2: Update Gantt Chart API Endpoint
- [x] Update GET /api/v1/schedule/{project_id}/gantt response schema
- [x] Include all new date fields in GanttItem schema
- [x] Include progress and variance fields
- [ ] Include minimal_duration for phases/workpackages
- [x] Include skills and resource allocations
- [ ] Add authentication and authorization
- [x] Write integration tests for Gantt endpoint

**Requirements: 3.1-3.13**

---

## Phase 2: Sprint Management

**Requirements: 1.8-1.9, 16.51-16.53**

### Task 2.1: Sprint Graph Nodes and Relationships
- [x] Create Sprint vertex label in AGE (if not exists)
- [x] Create ASSIGNED_TO_SPRINT edge label
- [x] Verify Sprint node properties (id, name, goal, start_date, end_date, capacity_hours, capacity_story_points, actual_velocity_hours, actual_velocity_story_points, status, project_id, created_at)
- [x] Verify Sprint statuses: planning, active, completed, cancelled
- [x] Write unit tests for Sprint node creation

**Requirements: 16.36-16.40**

### Task 2.2: Sprint Pydantic Schemas
- [x] Create SprintCreate schema with name, goal, start_date, end_date
- [x] Create SprintResponse schema with capacity and velocity fields
- [x] Create SprintUpdate schema for status changes
- [x] Create SprintVelocity schema for metrics
- [x] Add field validator for sprint dates (end_date > start_date)
- [x] Add field validator for sprint duration (max 30 days)
- [x] Write unit tests for sprint schemas

**Requirements: 16.36-16.40, 22.1-22.23**

### Task 2.3: SprintService Implementation
- [x] Create SprintService class
- [x] Implement create_sprint method
- [x] Implement calculate_sprint_capacity method (from allocated resources)
- [x] Implement assign_task_to_sprint method (removes IN_BACKLOG)
- [x] Implement remove_task_from_sprint method (creates IN_BACKLOG)
- [x] Implement start_sprint method (status change to active)
- [x] Implement complete_sprint method (calculate velocity)
- [x] Implement calculate_sprint_velocity method
- [x] Implement get_team_average_velocity method (last N sprints)
- [x] Add validation: Only one active sprint per project
- [x] Add validation: Sprint capacity not exceeded
- [x] Write unit tests for SprintService
- [x] Write property test: Assigning to sprint removes backlog relationship
- [x] Write property test: Sprint completion returns incomplete tasks to backlog
- [x] Write property test: Sprint capacity is always non-negative

**Requirements: 16.36-16.40, 16.54-16.58, 22.1-22.23**

### Task 2.4: Sprint API Endpoints
- [x] POST /api/v1/projects/{project_id}/sprints - Create sprint
- [x] GET /api/v1/projects/{project_id}/sprints - List sprints
- [x] GET /api/v1/sprints/{id} - Get sprint details
- [x] PATCH /api/v1/sprints/{id} - Update sprint
- [x] DELETE /api/v1/sprints/{id} - Delete sprint (moves tasks to backlog)
- [x] GET /api/v1/sprints/{id}/tasks - Get sprint tasks
- [x] POST /api/v1/sprints/{id}/tasks/{task_id} - Assign task to sprint
- [x] DELETE /api/v1/sprints/{id}/tasks/{task_id} - Remove task from sprint
- [x] POST /api/v1/sprints/{id}/start - Start sprint (status = active)
- [x] POST /api/v1/sprints/{id}/complete - Complete sprint (calculate velocity)
- [x] GET /api/v1/sprints/{id}/velocity - Get sprint velocity
- [x] GET /api/v1/sprints/{id}/statistics - Get sprint metrics
- [x] Add validation: Only one active sprint per project
- [x] Add authentication and authorization
- [x] Write integration tests for sprint endpoints

**Requirements: 22.1-22.23**

---

## Phase 3: Backlog Management

### Task 3.1: Backlog Graph Nodes and Relationships
- [x] Create Backlog vertex label in AGE (if not exists)
- [x] Create IN_BACKLOG edge label
- [x] Verify Backlog node properties (id, name, description, project_id, created_at)
- [x] Verify IN_BACKLOG relationship properties (added_at, priority_order)
- [x] Write unit tests for Backlog node creation

**Requirements: 16.36-16.40**

### Task 3.2: Backlog Pydantic Schemas
- [x] Create BacklogCreate schema
- [x] Create BacklogResponse schema with task_count
- [x] Create BacklogTaskResponse schema with priority_order
- [x] Write unit tests for backlog schemas

**Requirements: 21.1-21.16**

### Task 3.3: BacklogService Implementation
- [x] Create BacklogService class
- [x] Implement create_backlog method
- [x] Implement get_backlog method
- [x] Implement add_task_to_backlog method (manual and automatic)
- [x] Implement remove_task_from_backlog method
- [x] Implement get_backlog_tasks method (ordered by priority)
- [x] Implement reorder_backlog_tasks method
- [x] Add validation: Cannot add task if in sprint
- [x] Add automatic removal of IN_BACKLOG when assigned to sprint
- [x] Write unit tests for BacklogService
- [x] Write property test: Adding to backlog removes sprint assignment
- [x] Write property test: Task cannot have both IN_BACKLOG and ASSIGNED_TO_SPRINT

**Requirements: 16.41-16.50, 21.1-21.16**

### Task 3.4: Automatic Backlog Population
- [x] Update WorkItemService to trigger backlog population on status="ready"
- [x] Implement automatic IN_BACKLOG creation when task status changes to "ready"
- [x] Add project backlog lookup/creation logic
- [x] Write unit tests for automatic population
- [x] Write property test: Ready tasks automatically in backlog

**Requirements: 10.3, 16.41, 21.5**

### Task 3.5: Backlog API Endpoints
- [x] POST /api/v1/projects/{project_id}/backlogs - Create backlog
- [x] GET /api/v1/projects/{project_id}/backlogs - List backlogs
- [x] GET /api/v1/backlogs/{id} - Get backlog details
- [x] PATCH /api/v1/backlogs/{id} - Update backlog
- [x] DELETE /api/v1/backlogs/{id} - Delete backlog (removes relationships)
- [x] GET /api/v1/backlogs/{id}/tasks - Get backlog tasks (ordered by priority)
- [x] POST /api/v1/backlogs/{id}/tasks/{task_id} - Add task to backlog (manual)
- [x] DELETE /api/v1/backlogs/{id}/tasks/{task_id} - Remove task from backlog
- [x] POST /api/v1/backlogs/{id}/reorder - Reorder backlog tasks
- [x] GET /api/v1/tasks/{id}/backlog-status - Check if in backlog
- [x] Add authentication and authorization
- [x] Write integration tests for backlog endpoints

**Requirements: 21.1-21.16**

---

## Phase 4: Velocity and Burndown

### Task 4.1: Velocity Calculation
- [x] Implement calculate_sprint_velocity in SprintService (if not done in 2.3)
- [x] Calculate velocity in both story_points and hours
- [x] Implement get_team_average_velocity (last N sprints)
- [x] Store velocity values in Sprint node on completion
- [x] Write unit tests for velocity calculation
- [x] Write property test: Velocity is always non-negative

**Requirements: 16.54-16.58, 24.1-24.14**

### Task 4.2: Burndown Chart Calculation
- [x] Implement calculate_burndown method in SprintService
- [x] Generate ideal burndown line (linear decrease)
- [x] Calculate actual burndown from task completion history
- [x] Query task completion timestamps from WorkItem updates
- [x] Return burndown data points (date, ideal_remaining, actual_remaining)
- [x] Write unit tests for burndown calculation
- [x] Write property test: Burndown remaining work decreases over time

**Requirements: 16.54-16.58, 24.1-24.14**

### Task 4.3: Burndown API Endpoint
- [x] GET /api/v1/sprints/{id}/burndown - Get burndown chart data
- [x] Return BurndownPoint schema (date, ideal_remaining_hours, actual_remaining_hours, ideal_remaining_points, actual_remaining_points)
- [ ] Add authentication and authorization
- [x] Write integration tests for burndown endpoint

**Requirements: 24.6-24.9**

### Task 4.4: Velocity API Endpoints
- [x] GET /api/v1/projects/{project_id}/velocity - Get average velocity
- [x] GET /api/v1/projects/{project_id}/velocity/history - Get velocity history
- [ ] Add authentication and authorization
- [x] Write integration tests for velocity endpoints

**Requirements: 24.1-24.5**

---

## Phase 5: Frontend - Gantt Chart

**DECISION**: Use existing custom GanttChart implementation (already built and tested). See `gantt-library-comparison.md` for analysis.

### Task 5.1: Enhance Existing Gantt Chart Component
- [x] ~~Create GanttChart component~~ (ALREADY EXISTS: frontend/src/components/schedule/GanttChart.tsx)
- [x] ~~Install gantt chart library~~ (NOT NEEDED: custom implementation is better)
- [x] ~~Display tasks as horizontal bars with start/end dates~~ (DONE)
- [x] ~~Highlight critical path tasks (different color)~~ (DONE: red color for critical)
- [x] ~~Display task dependencies with arrows~~ (DONE: finish-to-start, start-to-start, finish-to-finish)
- [x] Add milestone markers (diamond shapes) at target dates (4-6 hours)
- [x] Show sprint boundaries as vertical lines with labels (4-6 hours)
- [x] Display resource assignments on tasks (4-6 hours)
- [x] ~~Add zoom and pan controls~~ (DONE: Ctrl+Scroll zoom, Shift+Drag pan)
- [x] ~~Add tooltip on hover (task details)~~ (DONE)
- [x] ~~Write component tests~~ (DONE: 44 tests exist)

**Estimated Effort**: 14-21 hours (2-3 days) to add 3 missing features
**Requirements: 3.1-3.13**

### Task 5.2: Gantt Chart Data API
- [x] GET /api/v1/schedule/{project_id}/gantt - Get Gantt chart data
- [x] Return formatted data for Gantt visualization
- [x] Include critical path task IDs
- [x] Include milestone data with dependencies
- [x] Include sprint boundaries
- [x] Include resource assignments
- [x] Add authentication and authorization
- [-] Write integration tests

**Requirements: 3.1-3.13**

### Task 5.3: Integrate Gantt Chart into SchedulePage
- [x] Update SchedulePage to render GanttChart component in 'gantt' view mode
- [x] Fetch gantt data from API
- [x] Handle loading and error states
- [x] Add "View Gantt Chart" button (already exists, needs implementation)
- [x] Write integration tests

**Requirements: 3.1-3.13**

---

## Phase 6: Frontend - Sprint Management UI

### Task 6.1: Sprint TypeScript Interfaces
- [x] Add Sprint interface in frontend/src/services/types.ts
- [x] Add SprintCreate interface
- [x] Add SprintVelocity interface
- [x] Add BurndownPoint interface
- [x] Write type tests

**Requirements: 22.1-22.23**

### Task 6.2: Sprint API Service
- [x] Create sprintService in frontend/src/services/sprintService.ts
- [x] Implement createSprint method
- [x] Implement getSprints method
- [x] Implement getSprint method
- [x] Implement updateSprint method
- [x] Implement deleteSprint method
- [x] Implement assignTaskToSprint method
- [x] Implement removeTaskFromSprint method
- [x] Implement startSprint method
- [x] Implement completeSprint method
- [x] Implement getSprintVelocity method
- [x] Implement getSprintBurndown method
- [x] Write unit tests

**Requirements: 22.1-22.23**

### Task 6.3: Sprint Management Components
- [x] Create SprintList component
- [x] Create SprintForm component (create/edit)
- [x] Create SprintDetail component (with capacity and velocity)
- [x] Create SprintBurndown component (chart)
- [x] Add task assignment to sprint (from backlog)
- [x] Add sprint start/complete actions
- [x] Display velocity metrics and trends
- [x] Write component tests

**Requirements: 22.1-22.23, 24.1-24.14**

### Task 6.4: Sprint Page
- [x] Create SprintPage component
- [x] Add sprint list view
- [x] Add sprint detail view
- [x] Add sprint creation form
- [x] Add burndown chart view
- [x] Add velocity history view
- [x] Write component tests

**Requirements: 22.1-22.23, 24.1-24.14**

---

## Phase 7: Frontend - Backlog Management UI

### Task 7.1: Backlog TypeScript Interfaces
- [x] Add Backlog interface in frontend/src/services/types.ts
- [x] Add BacklogCreate interface
- [x] Add BacklogTask interface with priority_order
- [ ] Write type tests

**Requirements: 21.1-21.16**

### Task 7.2: Backlog API Service
- [x] Create backlogService in frontend/src/services/backlogService.ts
- [x] Implement createBacklog method
- [x] Implement getBacklogs method
- [x] Implement getBacklog method
- [x] Implement updateBacklog method
- [x] Implement deleteBacklog method
- [x] Implement getBacklogTasks method
- [x] Implement addTaskToBacklog method
- [x] Implement removeTaskFromBacklog method
- [x] Implement reorderBacklogTasks method
- [ ] Write unit tests

**Requirements: 21.1-21.16**

### Task 7.3: Backlog Management Components
- [x] Create BacklogList component
- [x] Create BacklogDetail component (with tasks)
- [x] Add task reordering (drag-and-drop)
- [x] Add task filtering and search
- [x] Display total estimated effort
- [x] Add "Move to Sprint" action
- [ ] Write component tests

**Requirements: 21.1-21.16**

### Task 7.4: Backlog Page
- [x] Create BacklogPage component
- [x] Add backlog list view
- [x] Add backlog detail view with tasks
- [x] Add task reordering UI
- [x] Add sprint assignment UI
- [x] Write component tests

**Requirements: 21.1-21.16**

---

## Phase 8: Kanban Board Schedule Integration

### Task 8.1: Update Kanban Board for Schedule Features
- [ ] Update KanbanPage to support sprint filtering
- [ ] Add sprint assignment via drag-and-drop
- [ ] Add backlog indicator on task cards
- [ ] Display task metadata (assignee, sprint, estimated hours, backlog status)
- [ ] Do NOT display schedule dates (read-only from schedule)
- [ ] Add "Move to Sprint" action
- [ ] Add "Return to Backlog" action
- [ ] Write component tests

**Requirements: 10.1-10.16**

### Task 8.2: Kanban API Enhancements
- [ ] GET /api/v1/kanban/tasks - Get tasks for Kanban (with filtering)
- [ ] POST /api/v1/kanban/tasks/{task_id}/assign-sprint - Assign to sprint via Kanban
- [ ] Support filtering by sprint, resource, workpackage, backlog status
- [ ] Add authentication and authorization
- [ ] Write integration tests

**Requirements: 10.1-10.16**

---

## Phase 9: Testing and Documentation

### Task 9.1: Property-Based Tests
- [ ]* Property: Critical path is always the longest path
- [ ]* Property: Critical path duration >= any other path duration
- [ ]* Property: Tasks with status="ready" are in backlog
- [ ]* Property: Task has IN_BACKLOG XOR ASSIGNED_TO_SPRINT XOR neither
- [ ]* Property: Assigning to sprint removes backlog relationship
- [ ]* Property: Sprint capacity is always non-negative
- [ ]* Property: Velocity is always non-negative
- [ ]* Property: Manual milestone constraints are respected
- [ ]* Property: Allocated resources have required skills
- [ ]* Property: Lead resources prioritized in allocation
- [ ]* Property: Burndown remaining work decreases over time

**Requirements: All requirements (comprehensive validation)**

### Task 9.2: Integration Tests
- [x] Test: Create sprint → assign tasks → start → complete workflow
- [x] Test: Task ready → backlog → sprint → complete workflow
- [x] Test: Milestone-driven scheduling (manual and automatic modes)
- [x] Test: Critical path calculation with complex dependencies
- [x] Test: Skills-based resource allocation
- [x] Test: Sprint capacity calculation
- [x] Test: Velocity tracking across multiple sprints
- [x] Test: Burndown chart data generation

**Requirements: All workflow-related requirements**

### Task 9.3: Performance Tests
- [ ] Test: Schedule calculation with critical path (1000 tasks < 30 seconds)
- [ ] Test: Critical path calculation (1000 tasks < 2 seconds)
- [ ] Test: Sprint capacity calculation (< 200ms)
- [ ] Test: Burndown calculation (< 500ms)
- [ ] Test: Concurrent schedule calculations (10 simultaneous)

**Requirements: 13.1-13.8**

### Task 9.4: API Documentation
- [ ] Document critical path calculation endpoint
- [ ] Document sprint management endpoints
- [ ] Document backlog management endpoints
- [ ] Document velocity and burndown endpoints
- [ ] Document Gantt chart data endpoint
- [ ] Add request/response examples
- [ ] Update OpenAPI/Swagger documentation

**Requirements: All API-related requirements**

### Task 9.5: User Guide
- [ ] Write guide for sprint planning workflow
- [ ] Write guide for backlog management
- [ ] Write guide for Gantt chart usage
- [ ] Write guide for velocity tracking
- [ ] Write guide for critical path interpretation
- [ ] Add screenshots and examples

**Requirements: All user-facing requirements**

---

## Summary

**Total Tasks**: 9 phases, 60+ main tasks, 200+ sub-tasks

**Estimated Effort**: 
- Phase 1 (Critical Path & Enhancements): 2-3 weeks
- Phase 2 (Sprint Management): 2-3 weeks
- Phase 3 (Backlog Management): 1-2 weeks
- Phase 4 (Velocity & Burndown): 1-2 weeks
- Phase 5 (Gantt Chart): 2 weeks
- Phase 6 (Sprint UI): 2 weeks
- Phase 7 (Backlog UI): 1-2 weeks
- Phase 8 (Kanban Integration): 1 week
- Phase 9 (Testing & Docs): 2 weeks

**Total**: 14-20 weeks (3.5-5 months)

**Critical Path**:
1. Critical path calculation (Phase 1)
2. Sprint management backend (Phase 2)
3. Backlog management backend (Phase 3)
4. Sprint/Backlog UI (Phases 6-7)
5. Gantt chart (Phase 5)
6. Testing (Phase 9)

**Dependencies**:
- Phase 2 depends on Phase 1 (skills-based allocation)
- Phase 3 depends on Phase 2 (sprint/backlog mutual exclusivity)
- Phase 4 depends on Phase 2 (sprint completion for velocity)
- Phase 5 depends on Phase 1 (critical path for Gantt)
- Phase 6 depends on Phase 2 (sprint backend)
- Phase 7 depends on Phase 3 (backlog backend)
- Phase 8 depends on Phases 2, 3 (sprint/backlog integration)
- Phase 9 can run in parallel with Phases 5-8

**Already Complete (Not in this list)**:
- ✅ SchedulerService with OR-Tools
- ✅ MilestoneService CRUD
- ✅ Schedule API endpoints
- ✅ Milestone API endpoints
- ✅ Company, Department, Resource, Workpackage services
- ✅ SchedulePage basic list view
- ✅ Graph database setup with AGE
- ✅ Authentication and authorization
- ✅ Audit logging

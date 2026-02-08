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
- Critical path calculation
- Sprint management (service + API + UI)
- Backlog management (service + API + UI)
- Skills-based resource allocation
- Velocity tracking and burndown charts
- Gantt chart visualization
- Kanban board schedule integration
- Milestone dependency management

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
- [ ] Update SchedulerService to handle milestone constraints (manual mode)
- [ ] Implement milestone date calculation (automatic mode)
- [ ] Add milestone constraints to OR-Tools solver (manual mode)
- [ ] Calculate milestone dates from dependent task completion (automatic mode)
- [ ] Update schedule response to include milestone dates
- [ ] Write unit tests for both milestone modes
- [ ] Write property test: Manual milestone constraints are respected
- [ ] Write property test: Automatic milestone dates calculated correctly

**Requirements: 1.8-1.9, 16.51-16.53**

---

## Phase 2: Sprint Management

### Task 2.1: Sprint Graph Nodes and Relationships
- [ ] Create Sprint vertex label in AGE (if not exists)
- [ ] Create ASSIGNED_TO_SPRINT edge label
- [ ] Verify Sprint node properties (id, name, goal, start_date, end_date, capacity_hours, capacity_story_points, actual_velocity_hours, actual_velocity_story_points, status, project_id, created_at)
- [ ] Verify Sprint statuses: planning, active, completed, cancelled
- [ ] Write unit tests for Sprint node creation

**Requirements: 16.36-16.40**

### Task 2.2: Sprint Pydantic Schemas
- [ ] Create SprintCreate schema with name, goal, start_date, end_date
- [ ] Create SprintResponse schema with capacity and velocity fields
- [ ] Create SprintUpdate schema for status changes
- [ ] Create SprintVelocity schema for metrics
- [ ] Add field validator for sprint dates (end_date > start_date)
- [ ] Add field validator for sprint duration (max 30 days)
- [ ] Write unit tests for sprint schemas

**Requirements: 16.36-16.40, 22.1-22.23**

### Task 2.3: SprintService Implementation
- [ ] Create SprintService class
- [ ] Implement create_sprint method
- [ ] Implement calculate_sprint_capacity method (from allocated resources)
- [ ] Implement assign_task_to_sprint method (removes IN_BACKLOG)
- [ ] Implement remove_task_from_sprint method (creates IN_BACKLOG)
- [ ] Implement start_sprint method (status change to active)
- [ ] Implement complete_sprint method (calculate velocity)
- [ ] Implement calculate_sprint_velocity method
- [ ] Implement get_team_average_velocity method (last N sprints)
- [ ] Add validation: Only one active sprint per project
- [ ] Add validation: Sprint capacity not exceeded
- [ ] Write unit tests for SprintService
- [ ]* Write property test: Assigning to sprint removes backlog relationship
- [ ]* Write property test: Sprint completion returns incomplete tasks to backlog
- [ ]* Write property test: Sprint capacity is always non-negative

**Requirements: 16.36-16.40, 16.54-16.58, 22.1-22.23**

### Task 2.4: Sprint API Endpoints
- [ ] POST /api/v1/projects/{project_id}/sprints - Create sprint
- [ ] GET /api/v1/projects/{project_id}/sprints - List sprints
- [ ] GET /api/v1/sprints/{id} - Get sprint details
- [ ] PATCH /api/v1/sprints/{id} - Update sprint
- [ ] DELETE /api/v1/sprints/{id} - Delete sprint (moves tasks to backlog)
- [ ] GET /api/v1/sprints/{id}/tasks - Get sprint tasks
- [ ] POST /api/v1/sprints/{id}/tasks/{task_id} - Assign task to sprint
- [ ] DELETE /api/v1/sprints/{id}/tasks/{task_id} - Remove task from sprint
- [ ] POST /api/v1/sprints/{id}/start - Start sprint (status = active)
- [ ] POST /api/v1/sprints/{id}/complete - Complete sprint (calculate velocity)
- [ ] GET /api/v1/sprints/{id}/velocity - Get sprint velocity
- [ ] GET /api/v1/sprints/{id}/statistics - Get sprint metrics
- [ ] Add validation: Only one active sprint per project
- [ ] Add authentication and authorization
- [ ] Write integration tests for sprint endpoints

**Requirements: 22.1-22.23**

---

## Phase 3: Backlog Management

### Task 3.1: Backlog Graph Nodes and Relationships
- [ ] Create Backlog vertex label in AGE (if not exists)
- [ ] Create IN_BACKLOG edge label
- [ ] Verify Backlog node properties (id, name, description, project_id, created_at)
- [ ] Verify IN_BACKLOG relationship properties (added_at, priority_order)
- [ ] Write unit tests for Backlog node creation

**Requirements: 16.36-16.40**

### Task 3.2: Backlog Pydantic Schemas
- [ ] Create BacklogCreate schema
- [ ] Create BacklogResponse schema with task_count
- [ ] Create BacklogTaskResponse schema with priority_order
- [ ] Write unit tests for backlog schemas

**Requirements: 21.1-21.16**

### Task 3.3: BacklogService Implementation
- [ ] Create BacklogService class
- [ ] Implement create_backlog method
- [ ] Implement get_backlog method
- [ ] Implement add_task_to_backlog method (manual and automatic)
- [ ] Implement remove_task_from_backlog method
- [ ] Implement get_backlog_tasks method (ordered by priority)
- [ ] Implement reorder_backlog_tasks method
- [ ] Add validation: Cannot add task if in sprint
- [ ] Add automatic removal of IN_BACKLOG when assigned to sprint
- [ ] Write unit tests for BacklogService
- [ ]* Write property test: Adding to backlog removes sprint assignment
- [ ]* Write property test: Task cannot have both IN_BACKLOG and ASSIGNED_TO_SPRINT

**Requirements: 16.41-16.50, 21.1-21.16**

### Task 3.4: Automatic Backlog Population
- [ ] Update WorkItemService to trigger backlog population on status="ready"
- [ ] Implement automatic IN_BACKLOG creation when task status changes to "ready"
- [ ] Add project backlog lookup/creation logic
- [ ] Write unit tests for automatic population
- [ ]* Write property test: Ready tasks automatically in backlog

**Requirements: 10.3, 16.41, 21.5**

### Task 3.5: Backlog API Endpoints
- [ ] POST /api/v1/projects/{project_id}/backlogs - Create backlog
- [ ] GET /api/v1/projects/{project_id}/backlogs - List backlogs
- [ ] GET /api/v1/backlogs/{id} - Get backlog details
- [ ] PATCH /api/v1/backlogs/{id} - Update backlog
- [ ] DELETE /api/v1/backlogs/{id} - Delete backlog (removes relationships)
- [ ] GET /api/v1/backlogs/{id}/tasks - Get backlog tasks (ordered by priority)
- [ ] POST /api/v1/backlogs/{id}/tasks/{task_id} - Add task to backlog (manual)
- [ ] DELETE /api/v1/backlogs/{id}/tasks/{task_id} - Remove task from backlog
- [ ] POST /api/v1/backlogs/{id}/reorder - Reorder backlog tasks
- [ ] GET /api/v1/tasks/{id}/backlog-status - Check if in backlog
- [ ] Add authentication and authorization
- [ ] Write integration tests for backlog endpoints

**Requirements: 21.1-21.16**

---

## Phase 4: Velocity and Burndown

### Task 4.1: Velocity Calculation
- [ ] Implement calculate_sprint_velocity in SprintService (if not done in 2.3)
- [ ] Calculate velocity in both story_points and hours
- [ ] Implement get_team_average_velocity (last N sprints)
- [ ] Store velocity values in Sprint node on completion
- [ ] Write unit tests for velocity calculation
- [ ]* Write property test: Velocity is always non-negative

**Requirements: 16.54-16.58, 24.1-24.14**

### Task 4.2: Burndown Chart Calculation
- [ ] Implement calculate_burndown method in SprintService
- [ ] Generate ideal burndown line (linear decrease)
- [ ] Calculate actual burndown from task completion history
- [ ] Query task completion timestamps from WorkItem updates
- [ ] Return burndown data points (date, ideal_remaining, actual_remaining)
- [ ] Write unit tests for burndown calculation
- [ ]* Write property test: Burndown remaining work decreases over time

**Requirements: 16.54-16.58, 24.1-24.14**

### Task 4.3: Burndown API Endpoint
- [ ] GET /api/v1/sprints/{id}/burndown - Get burndown chart data
- [ ] Return BurndownPoint schema (date, ideal_remaining_hours, actual_remaining_hours, ideal_remaining_points, actual_remaining_points)
- [ ] Add authentication and authorization
- [ ] Write integration tests for burndown endpoint

**Requirements: 24.6-24.9**

### Task 4.4: Velocity API Endpoints
- [ ] GET /api/v1/projects/{project_id}/velocity - Get average velocity
- [ ] GET /api/v1/projects/{project_id}/velocity/history - Get velocity history
- [ ] Add authentication and authorization
- [ ] Write integration tests for velocity endpoints

**Requirements: 24.1-24.5**

---

## Phase 5: Frontend - Gantt Chart

### Task 5.1: Gantt Chart Component
- [ ] Create GanttChart component in frontend/src/components/schedule/
- [ ] Install gantt chart library (e.g., react-gantt-chart or custom with D3)
- [ ] Display tasks as horizontal bars with start/end dates
- [ ] Highlight critical path tasks (different color)
- [ ] Display task dependencies with arrows
- [ ] Add milestone markers (diamond shapes) at target dates
- [ ] Show sprint boundaries as vertical lines with labels
- [ ] Display resource assignments on tasks
- [ ] Add zoom and pan controls
- [ ] Add tooltip on hover (task details)
- [ ] Write component tests

**Requirements: 3.1-3.13**

### Task 5.2: Gantt Chart Data API
- [ ] GET /api/v1/schedule/{project_id}/gantt - Get Gantt chart data
- [ ] Return formatted data for Gantt visualization
- [ ] Include critical path task IDs
- [ ] Include milestone data with dependencies
- [ ] Include sprint boundaries
- [ ] Include resource assignments
- [ ] Add authentication and authorization
- [ ] Write integration tests

**Requirements: 3.1-3.13**

### Task 5.3: Integrate Gantt Chart into SchedulePage
- [ ] Update SchedulePage to render GanttChart component in 'gantt' view mode
- [ ] Fetch gantt data from API
- [ ] Handle loading and error states
- [ ] Add "View Gantt Chart" button (already exists, needs implementation)
- [ ] Write integration tests

**Requirements: 3.1-3.13**

---

## Phase 6: Frontend - Sprint Management UI

### Task 6.1: Sprint TypeScript Interfaces
- [ ] Add Sprint interface in frontend/src/services/types.ts
- [ ] Add SprintCreate interface
- [ ] Add SprintVelocity interface
- [ ] Add BurndownPoint interface
- [ ] Write type tests

**Requirements: 22.1-22.23**

### Task 6.2: Sprint API Service
- [ ] Create sprintService in frontend/src/services/sprintService.ts
- [ ] Implement createSprint method
- [ ] Implement getSprints method
- [ ] Implement getSprint method
- [ ] Implement updateSprint method
- [ ] Implement deleteSprint method
- [ ] Implement assignTaskToSprint method
- [ ] Implement removeTaskFromSprint method
- [ ] Implement startSprint method
- [ ] Implement completeSprint method
- [ ] Implement getSprintVelocity method
- [ ] Implement getSprintBurndown method
- [ ] Write unit tests

**Requirements: 22.1-22.23**

### Task 6.3: Sprint Management Components
- [ ] Create SprintList component
- [ ] Create SprintForm component (create/edit)
- [ ] Create SprintDetail component (with capacity and velocity)
- [ ] Create SprintBurndown component (chart)
- [ ] Add task assignment to sprint (from backlog)
- [ ] Add sprint start/complete actions
- [ ] Display velocity metrics and trends
- [ ] Write component tests

**Requirements: 22.1-22.23, 24.1-24.14**

### Task 6.4: Sprint Page
- [ ] Create SprintPage component
- [ ] Add sprint list view
- [ ] Add sprint detail view
- [ ] Add sprint creation form
- [ ] Add burndown chart view
- [ ] Add velocity history view
- [ ] Write component tests

**Requirements: 22.1-22.23, 24.1-24.14**

---

## Phase 7: Frontend - Backlog Management UI

### Task 7.1: Backlog TypeScript Interfaces
- [ ] Add Backlog interface in frontend/src/services/types.ts
- [ ] Add BacklogCreate interface
- [ ] Add BacklogTask interface with priority_order
- [ ] Write type tests

**Requirements: 21.1-21.16**

### Task 7.2: Backlog API Service
- [ ] Create backlogService in frontend/src/services/backlogService.ts
- [ ] Implement createBacklog method
- [ ] Implement getBacklogs method
- [ ] Implement getBacklog method
- [ ] Implement updateBacklog method
- [ ] Implement deleteBacklog method
- [ ] Implement getBacklogTasks method
- [ ] Implement addTaskToBacklog method
- [ ] Implement removeTaskFromBacklog method
- [ ] Implement reorderBacklogTasks method
- [ ] Write unit tests

**Requirements: 21.1-21.16**

### Task 7.3: Backlog Management Components
- [ ] Create BacklogList component
- [ ] Create BacklogDetail component (with tasks)
- [ ] Add task reordering (drag-and-drop)
- [ ] Add task filtering and search
- [ ] Display total estimated effort
- [ ] Add "Move to Sprint" action
- [ ] Write component tests

**Requirements: 21.1-21.16**

### Task 7.4: Backlog Page
- [ ] Create BacklogPage component
- [ ] Add backlog list view
- [ ] Add backlog detail view with tasks
- [ ] Add task reordering UI
- [ ] Add sprint assignment UI
- [ ] Write component tests

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
- [ ] Test: Create sprint → assign tasks → start → complete workflow
- [ ] Test: Task ready → backlog → sprint → complete workflow
- [ ] Test: Milestone-driven scheduling (manual and automatic modes)
- [ ] Test: Critical path calculation with complex dependencies
- [ ] Test: Skills-based resource allocation
- [ ] Test: Sprint capacity calculation
- [ ] Test: Velocity tracking across multiple sprints
- [ ] Test: Burndown chart data generation

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

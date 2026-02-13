# RxDx Schedule API User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Project Hierarchy](#project-hierarchy)
3. [Resource Allocation and Inheritance](#resource-allocation-and-inheritance)
4. [Scheduling with Manual vs Calculated Dates](#scheduling-with-manual-vs-calculated-dates)
5. [Progress Tracking and Monitoring](#progress-tracking-and-monitoring)
6. [Sprint Planning Workflow](#sprint-planning-workflow)
7. [Gantt Chart Usage](#gantt-chart-usage)
8. [Dependencies and Relationships](#dependencies-and-relationships)
9. [Best Practices](#best-practices)

---

## 1. Introduction

The RxDx Schedule API provides comprehensive project management capabilities supporting both classic (waterfall) and agile (Scrum) methodologies. This guide explains how to use the system effectively for project planning, resource allocation, scheduling, and progress tracking.

### Key Features

- **Hierarchical Project Structure**: Project → Phase → Workpackage → Task
- **Resource Inheritance**: Resources allocated at higher levels are available to lower levels
- **Dual Date System**: Manual dates (user-specified) and calculated dates (scheduler-generated)
- **Progress Tracking**: Track actual progress vs. planned schedule
- **Sprint Planning**: Agile iteration planning with velocity tracking
- **Gantt Chart Visualization**: Timeline view with dependencies and critical path
- **Skills-Based Resource Matching**: Automatic resource allocation based on required skills

---

## 2. Project Hierarchy

### 2.1 Structure Overview

```
Company
  └─ Department
       └─ Resource (person, machine, equipment)

Project
  └─ Phase (sequential, ordered by NEXT relationships)
       └─ Workpackage
            └─ Task
```

### 2.2 Creating a Project

**Step 1: Create the Project**

```bash
POST /api/v1/projects
{
  "name": "Medical Device Development",
  "description": "FDA-compliant medical device project",
  "start_date": "2024-01-01T00:00:00Z",
  "due_date": "2024-12-31T23:59:59Z"
}
```

**Step 2: Create Phases (Sequential)**

Phases represent major stages of your project (e.g., Planning, Development, Testing, Deployment).

```bash
# Create first phase
POST /api/v1/projects/{project_id}/phases
{
  "name": "Planning",
  "description": "Project planning and requirements gathering",
  "minimal_duration": 30  # Minimum 30 calendar days
}

# Create second phase
POST /api/v1/projects/{project_id}/phases
{
  "name": "Development",
  "description": "Software development and implementation",
  "minimal_duration": 90
}

# Link phases sequentially
POST /api/v1/phases/{planning_phase_id}/next/{development_phase_id}
```


**Step 3: Create Workpackages**

Workpackages group related tasks within a phase.

```bash
POST /api/v1/phases/{phase_id}/workpackages
{
  "name": "Requirements Gathering",
  "description": "Collect and document user requirements",
  "order": 1,
  "minimal_duration": 14  # Minimum 14 calendar days
}
```

**Step 4: Create Tasks**

Tasks are the actual work items that need to be completed.

```bash
POST /api/v1/workitems
{
  "type": "task",
  "title": "Define user personas",
  "description": "Create detailed user personas for target audience",
  "workpackage_id": "{workpackage_id}",
  "duration": 3,  # 3 calendar days
  "effort": 16,  # 16 hours of work
  "skills": ["UX Research", "User Analysis"],
  "status": "draft"
}
```

### 2.3 Phase Sequential Ordering

Phases are ordered using NEXT relationships, forming a linear sequence:

```
Planning → Development → Testing → Deployment
```

**Benefits**:
- Clear project flow
- Automatic phase ordering in UI
- Dependency validation (can't start Development before Planning completes)

**Managing Phase Order**:

```bash
# Get phases in order
GET /api/v1/projects/{project_id}/phases
# Returns phases ordered by NEXT relationship chain

# Change phase order
DELETE /api/v1/phases/{phase_id}/next
POST /api/v1/phases/{phase_id}/next/{new_next_phase_id}
```

---

## 3. Resource Allocation and Inheritance

### 3.1 Resource Hierarchy

Resources can be allocated at three levels:
1. **Project Level**: Available to all workpackages and tasks
2. **Workpackage Level**: Available to all tasks in the workpackage
3. **Task Level**: Explicitly assigned to specific task

### 3.2 Creating Resources

```bash
POST /api/v1/resources
{
  "name": "John Doe",
  "type": "person",
  "capacity": 40.0,  # 40 hours per week
  "department_id": "{department_id}",
  "skills": ["Python", "FastAPI", "PostgreSQL", "OR-Tools"],
  "availability": "available"
}
```

### 3.3 Allocating Resources

**Project-Level Allocation** (Inherited by all tasks):

```bash
POST /api/v1/resources/{resource_id}/allocate
{
  "project_id": "{project_id}",
  "allocation_percentage": 75.0,  # 75% of capacity
  "lead": true,  # Primary resource for project
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z"
}
```

**Workpackage-Level Allocation** (Inherited by tasks in workpackage):

```bash
POST /api/v1/resources/{resource_id}/allocate
{
  "workpackage_id": "{workpackage_id}",
  "allocation_percentage": 50.0,
  "lead": false,  # Supporting resource
  "start_date": "2024-02-01T00:00:00Z",
  "end_date": "2024-03-31T23:59:59Z"
}
```

**Task-Level Allocation** (Explicit assignment):

```bash
POST /api/v1/resources/{resource_id}/allocate
{
  "task_id": "{task_id}",
  "allocation_percentage": 100.0,
  "lead": true,  # Primary owner of this task
  "start_date": "2024-02-15T00:00:00Z",
  "end_date": "2024-02-20T23:59:59Z"
}
```

### 3.4 Resource Inheritance Rules

1. **Union of Resources**: A task has access to resources from all levels (project + workpackage + task)
2. **Most Specific Wins**: If a resource is allocated at multiple levels, the most specific allocation percentage is used
3. **Lead Priority**: Resources with `lead=true` are prioritized for assignment
4. **Skills Matching**: Scheduler matches task `skills` with resource `skills` arrays

**Example**:

```
Project: Resource A (50% allocation, lead=false)
Workpackage: Resource A (75% allocation, lead=true)
Task: No explicit allocation

Effective for Task: Resource A (75% allocation, lead=true)
                    ↑ Workpackage allocation overrides project allocation
```


---

## 4. Scheduling with Manual vs Calculated Dates

### 4.1 Date Types

The system supports two types of dates for all entities (Project, Phase, Workpackage, Task, Milestone):

1. **Manual Dates** (User-Specified):
   - `start_date`: Earliest date work can start (constraint)
   - `due_date`: Deadline for completion (constraint)

2. **Calculated Dates** (Scheduler-Generated):
   - `calculated_start_date`: Start date computed by scheduler
   - `calculated_end_date`: End date computed by scheduler

3. **Actual Dates** (Progress Tracking):
   - `start_date_is`: Actual date work began
   - `progress`: Percentage completion (0-100)

### 4.2 Date Priority Rules

**For Gantt Chart Display**:
1. If `start_date` is set → use it (manual override)
2. Otherwise → use `calculated_start_date` (scheduler output)
3. If `due_date` is set → use it (manual override)
4. Otherwise → use `calculated_end_date` (scheduler output)

**For Schedule Calculations**:
1. `start_date` → used as "earliest start" constraint
2. `due_date` → used as "deadline" constraint
3. `start_date_is` + `progress` → override calculated dates if work has started

### 4.3 Setting Manual Dates

**Constrain Task Start Date**:

```bash
PATCH /api/v1/workitems/{task_id}
{
  "start_date": "2024-03-01T00:00:00Z"  # Cannot start before March 1
}
```

**Set Task Deadline**:

```bash
PATCH /api/v1/workitems/{task_id}
{
  "due_date": "2024-03-15T23:59:59Z"  # Must complete by March 15
}
```

**Set Both**:

```bash
PATCH /api/v1/workitems/{task_id}
{
  "start_date": "2024-03-01T00:00:00Z",
  "due_date": "2024-03-15T23:59:59Z"
}
```

### 4.4 Calculating Schedules

**Trigger Schedule Calculation**:

```bash
POST /api/v1/schedule/calculate
{
  "project_id": "{project_id}",
  "task_ids": ["task-1", "task-2", "task-3"],
  "milestone_ids": ["milestone-1"],
  "resource_ids": ["resource-1", "resource-2"],
  "constraints": {
    "project_start": "2024-01-01T00:00:00Z",
    "project_deadline": "2024-12-31T23:59:59Z",
    "horizon_days": 365,
    "working_hours_per_day": 8,
    "respect_weekends": true
  }
}
```

**Response**:

```json
{
  "status": "success",
  "schedule": [
    {
      "task_id": "task-1",
      "start_date": "2024-03-01T09:00:00Z",  # Respects manual start_date
      "end_date": "2024-03-05T17:00:00Z",
      "is_critical": true
    }
  ],
  "critical_path": ["task-1", "task-3"],
  "milestones": [
    {
      "milestone_id": "milestone-1",
      "date": "2024-06-01T00:00:00Z",
      "is_manual": true
    }
  ]
}
```

### 4.5 Minimal Duration

For phases and workpackages without detailed task breakdowns, use `minimal_duration`:

```bash
PATCH /api/v1/phases/{phase_id}
{
  "minimal_duration": 30  # Minimum 30 calendar days
}
```

**Behavior**:
- If calculated duration < minimal_duration → use minimal_duration
- If calculated duration ≥ minimal_duration → use calculated duration
- Useful for early project planning when task details are not yet defined

---

## 5. Progress Tracking and Monitoring

### 5.1 Recording Actual Progress

**Mark Task as Started**:

```bash
PATCH /api/v1/workitems/{task_id}
{
  "status": "active",
  "start_date_is": "2024-03-02T10:30:00Z",  # Actual start time
  "progress": 0
}
```

**Update Progress**:

```bash
PATCH /api/v1/workitems/{task_id}
{
  "progress": 50  # 50% complete
}
```

**Mark Task as Completed**:

```bash
PATCH /api/v1/workitems/{task_id}
{
  "status": "completed",
  "done": true,
  "progress": 100,
  "actual_hours": 18.5  # Actual time spent
}
```

### 5.2 Progress Indicators in Gantt Chart

The Gantt chart displays progress visually:

- **Progress Bar**: Filled portion shows `progress` percentage
- **Variance Indicator**: If `start_date_is` ≠ `start_date`, shows delay/early start
- **Color Coding**:
  - Green: On track (progress ≥ expected based on time elapsed)
  - Yellow: At risk (progress < expected)
  - Red: Delayed (start_date_is > start_date)

### 5.3 Monitoring Project Health

**Get Project Statistics**:

```bash
GET /api/v1/schedule/{project_id}/statistics
```

**Response**:

```json
{
  "total_tasks": 50,
  "completed_tasks": 20,
  "in_progress_tasks": 15,
  "not_started_tasks": 15,
  "completion_percentage": 40,
  "critical_path_tasks": ["task-1", "task-5", "task-12"],
  "resource_utilization": {
    "resource-1": 85.0,
    "resource-2": 70.0
  },
  "schedule_health": "at_risk"  # on_track | at_risk | delayed
}
```


---

## 6. Sprint Planning Workflow

### 6.1 Creating a Sprint

```bash
POST /api/v1/projects/{project_id}/sprints
{
  "name": "Sprint 1",
  "goal": "Complete user authentication and profile management",
  "start_date": "2024-03-01T00:00:00Z",
  "end_date": "2024-03-14T23:59:59Z"
}
```

**Response** (includes calculated capacity):

```json
{
  "sprint_id": "uuid",
  "name": "Sprint 1",
  "capacity_hours": 320.0,  # Calculated from allocated resources
  "capacity_story_points": 25,  # Based on historical velocity
  "status": "planning"
}
```

### 6.2 Backlog Management

**Automatic Backlog Population**:

When a task status changes to "ready", it's automatically added to the project backlog:

```bash
PATCH /api/v1/workitems/{task_id}
{
  "status": "ready"  # Automatically creates IN_BACKLOG relationship
}
```

**View Backlog**:

```bash
GET /api/v1/backlogs/{backlog_id}/tasks
```

**Response**:

```json
{
  "tasks": [
    {
      "task_id": "task-1",
      "title": "Implement login API",
      "priority": 5,
      "estimated_hours": 8,
      "story_points": 3,
      "skills": ["Python", "FastAPI", "JWT"]
    }
  ]
}
```

### 6.3 Assigning Tasks to Sprint

**From Backlog to Sprint**:

```bash
POST /api/v1/sprints/{sprint_id}/tasks/{task_id}
```

**Behavior**:
- Removes `IN_BACKLOG` relationship
- Creates `ASSIGNED_TO_SPRINT` relationship
- Task is now in sprint (mutually exclusive with backlog)
- Task still belongs to its workpackage (maintains hierarchy)

### 6.4 Starting a Sprint

```bash
POST /api/v1/sprints/{sprint_id}/start
```

**Effects**:
- Status changes to "active"
- Sprint scope is locked (no more task additions recommended)
- Burndown tracking begins

### 6.5 Completing a Sprint

```bash
POST /api/v1/sprints/{sprint_id}/complete
```

**Effects**:
- Status changes to "completed"
- Velocity is calculated (completed story points and hours)
- Incomplete tasks are moved back to backlog
- Team average velocity is updated

**Response**:

```json
{
  "sprint_id": "uuid",
  "status": "completed",
  "actual_velocity_hours": 280.0,
  "actual_velocity_story_points": 22,
  "completion_percentage": 87.5,
  "incomplete_tasks": ["task-5", "task-8"]
}
```

### 6.6 Velocity Tracking

**Get Sprint Velocity**:

```bash
GET /api/v1/sprints/{sprint_id}/velocity
```

**Response**:

```json
{
  "sprint_velocity_hours": 280.0,
  "sprint_velocity_story_points": 22,
  "team_average_velocity_hours": 290.0,  # Last 3 sprints
  "team_average_velocity_story_points": 24,
  "velocity_trend": "stable"  # increasing | stable | decreasing
}
```

### 6.7 Burndown Chart

**Get Burndown Data**:

```bash
GET /api/v1/sprints/{sprint_id}/burndown
```

**Response**:

```json
{
  "burndown_data": [
    {
      "date": "2024-03-01",
      "ideal_remaining_hours": 320.0,
      "actual_remaining_hours": 320.0,
      "ideal_remaining_points": 25,
      "actual_remaining_points": 25
    },
    {
      "date": "2024-03-02",
      "ideal_remaining_hours": 297.0,
      "actual_remaining_hours": 304.0,
      "ideal_remaining_points": 23,
      "actual_remaining_points": 24
    }
  ]
}
```

---

## 7. Gantt Chart Usage

### 7.1 Getting Gantt Chart Data

```bash
GET /api/v1/schedule/{project_id}/gantt
```

**Response**:

```json
{
  "project_id": "uuid",
  "items": [
    {
      "id": "task-1",
      "type": "task",
      "title": "Implement login API",
      "start_date": "2024-03-01T09:00:00Z",  # Manual or calculated
      "end_date": "2024-03-05T17:00:00Z",
      "progress": 50,
      "actual_start": "2024-03-02T10:30:00Z",
      "is_delayed": true,
      "variance_days": 1,
      "is_critical": true,
      "dependencies": ["task-0"]
    },
    {
      "id": "milestone-1",
      "type": "milestone",
      "title": "MVP Release",
      "date": "2024-06-01T00:00:00Z",
      "is_achieved": false
    }
  ],
  "dependencies": [
    {
      "from": "task-0",
      "to": "task-1",
      "type": "finish-to-start",
      "lag": 0
    }
  ]
}
```

### 7.2 Gantt Chart Features

**Visual Elements**:
- **Task Bars**: Horizontal bars showing duration
- **Progress Fill**: Filled portion shows completion percentage
- **Critical Path**: Red color for tasks on critical path
- **Dependencies**: Arrows connecting dependent tasks
- **Milestones**: Diamond markers at target dates
- **Sprint Boundaries**: Vertical lines showing sprint start/end
- **Resource Assignments**: Labels showing assigned resources

**Interactions**:
- **Zoom**: Ctrl + Scroll to zoom in/out
- **Pan**: Shift + Drag to pan timeline
- **Hover**: Tooltip shows task details
- **Click**: Opens task detail view

### 7.3 Date Display Priority

The Gantt chart displays dates according to priority:

1. **Manual dates** (if set): `start_date`, `due_date`
2. **Calculated dates** (if manual not set): `calculated_start_date`, `calculated_end_date`
3. **Actual dates** (for progress): `start_date_is` shown as variance indicator

**Example**:

```
Task has:
- start_date: 2024-03-01 (manual)
- calculated_start_date: 2024-02-28 (scheduler)
- start_date_is: 2024-03-02 (actual)

Gantt displays:
- Bar starts at: 2024-03-01 (manual date)
- Variance indicator: +1 day delay (actual vs. manual)
```


---

## 8. Dependencies and Relationships

### 8.1 Task Dependencies

**Create Dependency**:

```bash
POST /api/v1/workitems/{from_task_id}/dependencies
{
  "to_task_id": "{to_task_id}",
  "dependency_type": "finish-to-start",  # or start-to-start, finish-to-finish
  "lag": 2  # Optional: 2 days delay after predecessor completes
}
```

**Dependency Types**:

1. **Finish-to-Start** (most common):
   - Task B cannot start until Task A finishes
   - Example: "Code review" cannot start until "Development" finishes

2. **Start-to-Start**:
   - Task B cannot start until Task A starts
   - Example: "Documentation" can start when "Development" starts

3. **Finish-to-Finish**:
   - Task B cannot finish until Task A finishes
   - Example: "Testing" cannot finish until "Development" finishes

### 8.2 BEFORE Relationships

More flexible dependencies between any entities (Workpackage, Task, Milestone):

**Create BEFORE Relationship**:

```bash
POST /api/v1/workpackages/{workpackage_id}/before/{target_workpackage_id}
{
  "dependency_type": "finish-to-start",
  "lag": 5  # 5 days delay
}
```

**Use Cases**:
- Workpackage A must complete before Workpackage B starts
- Task A must complete before Milestone M
- Milestone A must be achieved before Milestone B

### 8.3 Milestone Dependencies

**Add Task Dependency to Milestone**:

```bash
POST /api/v1/milestones/{milestone_id}/dependencies/{task_id}
```

**Behavior**:
- Creates `DEPENDS_ON` relationship (Milestone → Task)
- Creates `BLOCKS` relationship (Task → Milestone)
- If milestone is manual mode: Task must complete before milestone target_date
- If milestone is automatic mode: Milestone date calculated from task completion

**Example**:

```
Milestone: "MVP Release" (manual mode, target_date: 2024-06-01)
Dependencies: Task A, Task B, Task C

Scheduler ensures:
- Task A.end_date <= 2024-06-01
- Task B.end_date <= 2024-06-01
- Task C.end_date <= 2024-06-01

If impossible, reports conflict.
```

### 8.4 Cycle Detection

The system prevents dependency cycles:

```bash
# This will fail if it creates a cycle
POST /api/v1/workitems/{task_a}/dependencies
{
  "to_task_id": "{task_b}"
}
```

**Error Response**:

```json
{
  "error": "Dependency cycle detected",
  "cycle": ["task-a", "task-b", "task-c", "task-a"],
  "message": "Cannot create dependency that would form a cycle"
}
```

---

## 9. Best Practices

### 9.1 Project Planning

**Start with High-Level Structure**:
1. Create project with overall start/due dates
2. Define phases with sequential NEXT relationships
3. Set minimal_duration for phases (fallback for early planning)
4. Create workpackages within phases
5. Add tasks as details become clear

**Use Minimal Duration Wisely**:
- Set minimal_duration on phases/workpackages for early Gantt visualization
- As tasks are added, calculated duration will override if longer
- Useful for stakeholder communication before detailed planning

### 9.2 Resource Management

**Allocate at Appropriate Level**:
- **Project-level**: Core team members working throughout project
- **Workpackage-level**: Specialists needed for specific workpackages
- **Task-level**: Explicit assignments for critical or specialized tasks

**Use Skills Matching**:
- Define skills on resources: `["Python", "FastAPI", "PostgreSQL"]`
- Define skills on tasks: `["Python", "FastAPI"]`
- Scheduler automatically matches and prioritizes resources with required skills

**Mark Lead Resources**:
- Set `lead=true` for primary owners
- Set `lead=false` for supporting/collaborating resources
- Scheduler prioritizes lead resources for assignment

### 9.3 Scheduling Strategy

**Manual Dates for Constraints**:
- Use `start_date` for external dependencies (e.g., vendor delivery)
- Use `due_date` for hard deadlines (e.g., regulatory submission)
- Let scheduler calculate dates for flexible tasks

**Milestones**:
- Use manual mode (`is_manual_constraint=true`) for fixed deadlines
- Use automatic mode (`is_manual_constraint=false`) for calculated milestones
- Mix both modes in same project as needed

**Critical Path Focus**:
- Monitor critical path tasks closely (any delay impacts project completion)
- Allocate best resources to critical path tasks
- Consider adding buffer time to critical path

### 9.4 Progress Tracking

**Regular Updates**:
- Update `progress` percentage regularly (daily or weekly)
- Record `start_date_is` when work actually begins
- Mark tasks as `done=true` when completed

**Use Task Journals**:
- Add journal entries for significant progress or decisions
- Helps with retrospectives and knowledge transfer
- Provides audit trail for compliance

### 9.5 Sprint Planning

**Capacity Planning**:
- Use historical velocity for capacity estimation
- Don't overcommit (aim for 80-90% of capacity)
- Leave buffer for unexpected work

**Backlog Grooming**:
- Keep backlog prioritized and up-to-date
- Ensure tasks have clear acceptance criteria
- Estimate effort (hours and story points)

**Sprint Goals**:
- Define clear, achievable sprint goals
- Align tasks with sprint goal
- Review goal achievement in retrospective

### 9.6 Gantt Chart Usage

**Effective Visualization**:
- Use zoom to focus on specific time periods
- Filter by phase or workpackage for clarity
- Highlight critical path for stakeholder communication

**Date Management**:
- Use manual dates sparingly (only for real constraints)
- Let scheduler optimize flexible tasks
- Review calculated dates for reasonableness

**Progress Communication**:
- Use progress bars to show completion status
- Highlight delayed tasks (red indicators)
- Show variance between planned and actual

---

## 10. Troubleshooting

### 10.1 Schedule Calculation Fails

**Problem**: Schedule calculation returns "infeasible" status

**Solutions**:
1. Check for dependency cycles
2. Verify resource capacity is sufficient
3. Review deadline constraints (may be impossible to meet)
4. Check milestone target dates (manual mode)
5. Increase project deadline or reduce task durations

### 10.2 Resource Over-Allocation

**Problem**: Resource utilization exceeds 100%

**Solutions**:
1. Reduce allocation percentages
2. Add more resources to project
3. Extend task durations
4. Adjust project timeline

### 10.3 Tasks Not Appearing in Backlog

**Problem**: Task status is "ready" but not in backlog

**Solutions**:
1. Verify project has a backlog (created automatically)
2. Check task status is exactly "ready"
3. Verify task is not already assigned to a sprint
4. Check for API errors in logs

### 10.4 Gantt Chart Shows Wrong Dates

**Problem**: Dates don't match expectations

**Solutions**:
1. Check if manual dates are set (they override calculated dates)
2. Verify schedule has been calculated recently
3. Review dependency constraints
4. Check minimal_duration settings

---

## 11. API Quick Reference

### Projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects` - List projects
- `GET /api/v1/projects/{id}` - Get project details
- `PATCH /api/v1/projects/{id}` - Update project
- `DELETE /api/v1/projects/{id}` - Delete project

### Phases
- `POST /api/v1/projects/{id}/phases` - Create phase
- `GET /api/v1/projects/{id}/phases` - List phases (ordered by NEXT)
- `PATCH /api/v1/phases/{id}` - Update phase
- `POST /api/v1/phases/{id}/next/{next_id}` - Link phases sequentially
- `DELETE /api/v1/phases/{id}/next` - Remove NEXT relationship

### Workpackages
- `POST /api/v1/phases/{id}/workpackages` - Create workpackage
- `GET /api/v1/phases/{id}/workpackages` - List workpackages
- `PATCH /api/v1/workpackages/{id}` - Update workpackage
- `POST /api/v1/workpackages/{id}/before/{target_id}` - Create BEFORE dependency

### Tasks
- `POST /api/v1/workitems` - Create task (type="task")
- `GET /api/v1/workitems` - List tasks
- `PATCH /api/v1/workitems/{id}` - Update task
- `POST /api/v1/workitems/{id}/dependencies` - Create dependency

### Resources
- `POST /api/v1/resources` - Create resource
- `GET /api/v1/resources` - List resources
- `POST /api/v1/resources/{id}/allocate` - Allocate to project/workpackage/task

### Scheduling
- `POST /api/v1/schedule/calculate` - Calculate schedule
- `GET /api/v1/schedule/{project_id}` - Get current schedule
- `GET /api/v1/schedule/{project_id}/gantt` - Get Gantt chart data
- `GET /api/v1/schedule/{project_id}/statistics` - Get project statistics

### Sprints
- `POST /api/v1/projects/{id}/sprints` - Create sprint
- `GET /api/v1/projects/{id}/sprints` - List sprints
- `POST /api/v1/sprints/{id}/tasks/{task_id}` - Assign task to sprint
- `POST /api/v1/sprints/{id}/start` - Start sprint
- `POST /api/v1/sprints/{id}/complete` - Complete sprint
- `GET /api/v1/sprints/{id}/velocity` - Get velocity
- `GET /api/v1/sprints/{id}/burndown` - Get burndown data

### Backlogs
- `GET /api/v1/backlogs/{id}/tasks` - List backlog tasks
- `POST /api/v1/backlogs/{id}/tasks/{task_id}` - Add task to backlog
- `DELETE /api/v1/backlogs/{id}/tasks/{task_id}` - Remove task from backlog

### Milestones
- `POST /api/v1/projects/{id}/milestones` - Create milestone
- `GET /api/v1/projects/{id}/milestones` - List milestones
- `POST /api/v1/milestones/{id}/dependencies/{task_id}` - Add task dependency

---

## 12. Glossary

- **Phase**: High-level project stage (e.g., Planning, Development, Testing)
- **Workpackage**: Logical grouping of related tasks within a phase
- **Task**: Actual work item to be completed
- **Resource**: Person, machine, or equipment used for work
- **Allocation**: Assignment of resource to project/workpackage/task
- **Inheritance**: Resources allocated at higher levels available to lower levels
- **Manual Dates**: User-specified start_date and due_date (constraints)
- **Calculated Dates**: Scheduler-generated calculated_start_date and calculated_end_date
- **Progress**: Percentage completion (0-100)
- **Minimal Duration**: Minimum time for phase/workpackage (fallback)
- **Critical Path**: Sequence of tasks determining minimum project duration
- **Sprint**: Time-boxed iteration (agile methodology)
- **Backlog**: Container for unscheduled tasks awaiting sprint assignment
- **Velocity**: Amount of work completed in a sprint
- **Burndown**: Chart showing remaining work over time
- **Milestone**: Significant checkpoint or deliverable
- **NEXT Relationship**: Sequential ordering of phases
- **BEFORE Relationship**: Dependency between entities
- **Lead Resource**: Primary owner/responsible resource (lead=true)

---

## 13. Support and Resources

For additional help:
- API Documentation: `/api/docs` (Swagger UI)
- GitHub Issues: Report bugs and feature requests
- Team Chat: Contact project team for questions

---

**Document Version**: 1.0  
**Last Updated**: 2024-01-15  
**Maintained By**: RxDx Development Team

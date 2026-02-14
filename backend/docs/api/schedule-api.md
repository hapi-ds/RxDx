# Schedule API Documentation

## Overview

The Schedule API provides endpoints for project scheduling, critical path calculation, sprint management, backlog management, and Gantt chart visualization.

## Base URL

```
/api/v1
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

---

## Schedule Endpoints

### Calculate Project Schedule

Calculate an optimized schedule for a project using constraint programming.

**Endpoint**: `POST /schedule/calculate`

**Request Body**:
```json
{
  "project_id": "uuid",
  "start_date": "2024-01-01T00:00:00Z",
  "tasks": [
    {
      "id": "uuid",
      "title": "Task 1",
      "duration": 5,
      "effort": 40,
      "dependencies": ["uuid"],
      "skills": ["Python", "FastAPI"]
    }
  ],
  "resources": [
    {
      "id": "uuid",
      "name": "John Doe",
      "skills": ["Python", "FastAPI"],
      "availability": 1.0
    }
  ]
}
```

**Response**: `200 OK`
```json
{
  "project_id": "uuid",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-02-15T00:00:00Z",
  "critical_path": ["task-uuid-1", "task-uuid-2"],
  "tasks": [
    {
      "id": "uuid",
      "title": "Task 1",
      "calculated_start_date": "2024-01-01T00:00:00Z",
      "calculated_end_date": "2024-01-05T00:00:00Z",
      "is_critical": true,
      "assigned_resources": ["resource-uuid"]
    }
  ]
}
```

**Performance**: < 30 seconds for 1000 tasks

---

### Get Critical Path

Get the critical path for a scheduled project.

**Endpoint**: `GET /schedule/{project_id}/critical-path`

**Response**: `200 OK`
```json
{
  "critical_path": ["task-uuid-1", "task-uuid-2", "task-uuid-3"],
  "duration_days": 45,
  "tasks": [
    {
      "id": "uuid",
      "title": "Task 1",
      "duration": 5,
      "start_date": "2024-01-01T00:00:00Z",
      "end_date": "2024-01-05T00:00:00Z"
    }
  ]
}
```

**Performance**: < 2 seconds for 1000 tasks

---

### Get Gantt Chart Data

Get formatted data for Gantt chart visualization.

**Endpoint**: `GET /schedule/{project_id}/gantt`

**Query Parameters**:
- `include_milestones` (boolean): Include milestone markers
- `include_sprints` (boolean): Include sprint boundaries
- `include_resources` (boolean): Include resource assignments

**Response**: `200 OK`
```json
{
  "project_id": "uuid",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-06-30T00:00:00Z",
  "tasks": [
    {
      "id": "uuid",
      "title": "Task 1",
      "type": "task",
      "calculated_start_date": "2024-01-01T00:00:00Z",
      "calculated_end_date": "2024-01-05T00:00:00Z",
      "start_date": "2024-01-02T00:00:00Z",
      "due_date": "2024-01-06T00:00:00Z",
      "start_date_is": "2024-01-02T00:00:00Z",
      "progress": 50,
      "is_critical": true,
      "is_delayed": false,
      "variance_days": 1,
      "dependencies": [
        {
          "target_id": "uuid",
          "type": "finish_to_start",
          "lag": 0
        }
      ],
      "resources": [
        {
          "id": "uuid",
          "name": "John Doe",
          "allocation_percentage": 100
        }
      ]
    }
  ],
  "milestones": [
    {
      "id": "uuid",
      "title": "Release 1.0",
      "target_date": "2024-03-01T00:00:00Z",
      "is_achieved": false
    }
  ],
  "sprints": [
    {
      "id": "uuid",
      "name": "Sprint 1",
      "start_date": "2024-01-01T00:00:00Z",
      "end_date": "2024-01-14T00:00:00Z",
      "status": "active"
    }
  ]
}
```

---

## Sprint Management Endpoints

### Create Sprint

Create a new sprint for a project.

**Endpoint**: `POST /projects/{project_id}/sprints`

**Request Body**:
```json
{
  "name": "Sprint 1",
  "goal": "Implement user authentication",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-01-14T00:00:00Z"
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "name": "Sprint 1",
  "goal": "Implement user authentication",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-01-14T00:00:00Z",
  "status": "planning",
  "capacity_hours": 320,
  "capacity_story_points": 40,
  "actual_velocity_hours": 0,
  "actual_velocity_story_points": 0,
  "project_id": "uuid",
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### List Sprints

Get all sprints for a project.

**Endpoint**: `GET /projects/{project_id}/sprints`

**Query Parameters**:
- `status` (string): Filter by status (planning, active, completed, cancelled)

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Sprint 1",
    "status": "active",
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-01-14T00:00:00Z",
    "capacity_hours": 320,
    "task_count": 12
  }
]
```

---

### Get Sprint Details

Get detailed information about a sprint.

**Endpoint**: `GET /sprints/{id}`

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "name": "Sprint 1",
  "goal": "Implement user authentication",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-01-14T00:00:00Z",
  "status": "active",
  "capacity_hours": 320,
  "capacity_story_points": 40,
  "actual_velocity_hours": 280,
  "actual_velocity_story_points": 35,
  "project_id": "uuid",
  "tasks": [
    {
      "id": "uuid",
      "title": "Implement login",
      "status": "completed",
      "estimated_hours": 16,
      "story_points": 5
    }
  ]
}
```

---

### Assign Task to Sprint

Assign a task from the backlog to a sprint.

**Endpoint**: `POST /sprints/{id}/tasks/{task_id}`

**Response**: `200 OK`
```json
{
  "message": "Task assigned to sprint",
  "sprint_id": "uuid",
  "task_id": "uuid"
}
```

**Side Effects**:
- Removes IN_BACKLOG relationship
- Creates ASSIGNED_TO_SPRINT relationship
- Updates sprint capacity

---

### Remove Task from Sprint

Remove a task from a sprint (returns to backlog).

**Endpoint**: `DELETE /sprints/{id}/tasks/{task_id}`

**Response**: `200 OK`
```json
{
  "message": "Task removed from sprint",
  "sprint_id": "uuid",
  "task_id": "uuid"
}
```

**Side Effects**:
- Removes ASSIGNED_TO_SPRINT relationship
- Creates IN_BACKLOG relationship

---

### Start Sprint

Start a sprint (change status to active).

**Endpoint**: `POST /sprints/{id}/start`

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "status": "active",
  "started_at": "2024-01-01T00:00:00Z"
}
```

**Validation**:
- Only one active sprint per project
- Sprint must be in "planning" status

---

### Complete Sprint

Complete a sprint and calculate velocity.

**Endpoint**: `POST /sprints/{id}/complete`

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "status": "completed",
  "completed_at": "2024-01-14T00:00:00Z",
  "actual_velocity_hours": 280,
  "actual_velocity_story_points": 35,
  "incomplete_tasks": ["task-uuid-1", "task-uuid-2"]
}
```

**Side Effects**:
- Calculates and stores velocity
- Returns incomplete tasks to backlog
- Updates team average velocity

**Performance**: < 200ms

---

### Get Sprint Velocity

Get velocity metrics for a sprint.

**Endpoint**: `GET /sprints/{id}/velocity`

**Response**: `200 OK`
```json
{
  "sprint_id": "uuid",
  "planned_hours": 320,
  "actual_hours": 280,
  "planned_story_points": 40,
  "actual_story_points": 35,
  "velocity_hours": 280,
  "velocity_story_points": 35,
  "completion_rate": 0.875
}
```

---

### Get Sprint Burndown

Get burndown chart data for a sprint.

**Endpoint**: `GET /sprints/{id}/burndown`

**Response**: `200 OK`
```json
{
  "sprint_id": "uuid",
  "data_points": [
    {
      "date": "2024-01-01",
      "ideal_remaining_hours": 320,
      "actual_remaining_hours": 320,
      "ideal_remaining_points": 40,
      "actual_remaining_points": 40
    },
    {
      "date": "2024-01-02",
      "ideal_remaining_hours": 297,
      "actual_remaining_hours": 304,
      "ideal_remaining_points": 37,
      "actual_remaining_points": 38
    }
  ]
}
```

**Performance**: < 500ms

---

### Get Sprint Statistics

Get comprehensive statistics for a sprint.

**Endpoint**: `GET /sprints/{id}/statistics`

**Response**: `200 OK`
```json
{
  "sprint_id": "uuid",
  "total_tasks": 15,
  "completed_tasks": 12,
  "in_progress_tasks": 2,
  "not_started_tasks": 1,
  "total_hours": 320,
  "completed_hours": 280,
  "total_story_points": 40,
  "completed_story_points": 35,
  "average_task_completion_time_hours": 23.3,
  "tasks_completed_per_day": 1.2
}
```

---

## Backlog Management Endpoints

### Create Backlog

Create a backlog for a project.

**Endpoint**: `POST /projects/{project_id}/backlogs`

**Request Body**:
```json
{
  "name": "Product Backlog",
  "description": "Main product backlog"
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "name": "Product Backlog",
  "description": "Main product backlog",
  "project_id": "uuid",
  "task_count": 0,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### List Backlogs

Get all backlogs for a project.

**Endpoint**: `GET /projects/{project_id}/backlogs`

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "name": "Product Backlog",
    "task_count": 25,
    "total_estimated_hours": 400
  }
]
```

---

### Get Backlog Details

Get detailed information about a backlog.

**Endpoint**: `GET /backlogs/{id}`

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "name": "Product Backlog",
  "description": "Main product backlog",
  "project_id": "uuid",
  "task_count": 25,
  "total_estimated_hours": 400,
  "created_at": "2024-01-01T00:00:00Z"
}
```

---

### Get Backlog Tasks

Get all tasks in a backlog, ordered by priority.

**Endpoint**: `GET /backlogs/{id}/tasks`

**Query Parameters**:
- `status` (string): Filter by task status
- `assigned_to` (uuid): Filter by assignee

**Response**: `200 OK`
```json
[
  {
    "id": "uuid",
    "title": "Implement user registration",
    "status": "ready",
    "estimated_hours": 16,
    "story_points": 5,
    "priority_order": 1,
    "added_at": "2024-01-01T00:00:00Z"
  }
]
```

---

### Add Task to Backlog

Manually add a task to the backlog.

**Endpoint**: `POST /backlogs/{id}/tasks/{task_id}`

**Request Body** (optional):
```json
{
  "priority_order": 1
}
```

**Response**: `200 OK`
```json
{
  "message": "Task added to backlog",
  "backlog_id": "uuid",
  "task_id": "uuid",
  "priority_order": 1
}
```

**Validation**:
- Task cannot be in a sprint
- Task must exist

---

### Remove Task from Backlog

Remove a task from the backlog.

**Endpoint**: `DELETE /backlogs/{id}/tasks/{task_id}`

**Response**: `200 OK`
```json
{
  "message": "Task removed from backlog",
  "backlog_id": "uuid",
  "task_id": "uuid"
}
```

---

### Reorder Backlog Tasks

Reorder tasks in the backlog by priority.

**Endpoint**: `POST /backlogs/{id}/reorder`

**Request Body**:
```json
{
  "task_order": [
    {"task_id": "uuid-1", "priority_order": 1},
    {"task_id": "uuid-2", "priority_order": 2},
    {"task_id": "uuid-3", "priority_order": 3}
  ]
}
```

**Response**: `200 OK`
```json
{
  "message": "Backlog reordered",
  "backlog_id": "uuid",
  "updated_count": 3
}
```

---

## Velocity Tracking Endpoints

### Get Project Velocity

Get average velocity for a project.

**Endpoint**: `GET /projects/{project_id}/velocity`

**Query Parameters**:
- `sprint_count` (integer): Number of recent sprints to average (default: 3)

**Response**: `200 OK`
```json
{
  "project_id": "uuid",
  "average_velocity_hours": 285,
  "average_velocity_story_points": 36,
  "sprint_count": 3,
  "sprints_analyzed": [
    {
      "sprint_id": "uuid",
      "name": "Sprint 3",
      "velocity_hours": 280,
      "velocity_story_points": 35
    }
  ]
}
```

---

### Get Velocity History

Get velocity history for a project.

**Endpoint**: `GET /projects/{project_id}/velocity/history`

**Response**: `200 OK`
```json
{
  "project_id": "uuid",
  "history": [
    {
      "sprint_id": "uuid",
      "sprint_name": "Sprint 1",
      "start_date": "2024-01-01",
      "end_date": "2024-01-14",
      "velocity_hours": 280,
      "velocity_story_points": 35
    }
  ],
  "trend": "increasing"
}
```

---

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "detail": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "detail": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "detail": "Not authorized to access this resource"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 409 Conflict
```json
{
  "detail": "Conflict: Only one active sprint allowed per project"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

---

## Rate Limiting

API requests are rate-limited to:
- 100 requests per minute per user
- 1000 requests per hour per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## Pagination

List endpoints support pagination:

**Query Parameters**:
- `skip` (integer): Number of items to skip (default: 0)
- `limit` (integer): Maximum items to return (default: 20, max: 100)

**Response Headers**:
```
X-Total-Count: 150
X-Page-Size: 20
X-Page-Number: 1
```

---

## Filtering and Sorting

List endpoints support filtering and sorting:

**Query Parameters**:
- `filter[field]` (string): Filter by field value
- `sort` (string): Sort field (prefix with `-` for descending)

**Example**:
```
GET /projects/uuid/sprints?filter[status]=active&sort=-start_date
```

---

## Webhooks

The API supports webhooks for real-time notifications:

**Events**:
- `sprint.started`
- `sprint.completed`
- `task.assigned_to_sprint`
- `task.added_to_backlog`
- `schedule.calculated`

**Webhook Payload**:
```json
{
  "event": "sprint.started",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "sprint_id": "uuid",
    "project_id": "uuid"
  }
}
```

---

## OpenAPI Specification

The complete OpenAPI specification is available at:
```
GET /api/v1/openapi.json
```

Interactive API documentation (Swagger UI):
```
GET /docs
```

Alternative API documentation (ReDoc):
```
GET /redoc
```

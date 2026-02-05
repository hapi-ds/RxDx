# Design Document: Backend Schedule API

## 1. System Overview

### 1.1 Purpose
This document specifies the technical design for implementing REST API endpoints that expose the existing SchedulerService capabilities and integrate with the frontend schedule components (GanttChart, KanbanBoard). The implementation will enable project managers to calculate, retrieve, and manually adjust project schedules through a RESTful API.

### 1.2 Architecture Context
The schedule API sits between the existing SchedulerService (which uses OR-Tools for constraint programming) and the frontend schedule components. It provides:
- REST endpoints for schedule operations
- Integration with the WorkItem system (tasks are WorkItems with type="task")
- Schedule storage and versioning
- Conflict detection and reporting
- Gantt chart and Kanban board data formatting

### 1.3 Key Design Decisions

**Decision 1: Reuse Existing SchedulerService**
- **Rationale**: The SchedulerService already implements constraint-based scheduling with OR-Tools
- **Trade-off**: API design must match SchedulerService capabilities vs. starting fresh
- **Impact**: Faster implementation, proven scheduling logic

**Decision 2: Store Schedules in Memory (Initial Implementation)**
- **Rationale**: SchedulerService already uses in-memory storage; database persistence can be added later
- **Trade-off**: Schedules lost on restart vs. simpler initial implementation
- **Impact**: Suitable for MVP, requires database migration for production

**Decision 3: Integrate with Existing WorkItem System**
- **Rationale**: Tasks are already stored as WorkItems; avoid data duplication
- **Trade-off**: Dependency on WorkItem service vs. independent task storage
- **Impact**: Consistent data model, simpler architecture

**Decision 4: Async API Design**
- **Rationale**: Schedule calculations can be time-consuming; async prevents blocking
- **Trade-off**: More complex implementation vs. better scalability
- **Impact**: Better user experience, supports concurrent operations

## 2. API Endpoints

### 2.1 Schedule Calculation

**Endpoint**: `POST /api/v1/schedule/calculate`

**Description**: Calculate an optimized project schedule using constraint programming.

**Request Body**:
```json
{
  "project_id": "uuid",
  "task_ids": ["task-uuid-1", "task-uuid-2"],
  "resource_ids": ["resource-id-1", "resource-id-2"],
  "constraints": {
    "project_start": "2024-01-01T00:00:00Z",
    "project_deadline": "2024-12-31T23:59:59Z",
    "horizon_days": 365,
    "working_hours_per_day": 8,
    "respect_weekends": true
  }
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "project_id": "uuid",
  "schedule": [
    {
      "task_id": "task-uuid-1",
      "task_title": "Implement authentication",
      "start_date": "2024-01-01T09:00:00Z",
      "end_date": "2024-01-05T17:00:00Z",
      "duration_hours": 40,
      "assigned_resources": ["resource-id-1"]
    }
  ],
  "project_duration_hours": 320,
  "project_start_date": "2024-01-01T09:00:00Z",
  "project_end_date": "2024-02-15T17:00:00Z",
  "message": "Optimal schedule found",
  "calculated_at": "2024-01-01T08:00:00Z"
}
```


**Response (Infeasible)**:
```json
{
  "status": "infeasible",
  "project_id": "uuid",
  "conflicts": [
    {
      "conflict_type": "circular_dependency",
      "description": "Circular dependency detected: task-1 -> task-2 -> task-3 -> task-1",
      "affected_tasks": ["task-1", "task-2", "task-3"],
      "suggestion": "Remove one of the dependencies to break the cycle"
    },
    {
      "conflict_type": "resource_overallocation",
      "description": "Resource 'developer-1' is over-allocated (demand: 200, capacity: 160)",
      "affected_resources": ["developer-1"],
      "affected_tasks": ["task-1", "task-2", "task-4"],
      "suggestion": "Increase resource capacity or reduce task demands"
    }
  ],
  "message": "No feasible schedule found. Check conflicts for details."
}
```

**Status Codes**:
- `200 OK`: Schedule calculated successfully
- `400 Bad Request`: Invalid request data or validation errors
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User lacks permission to calculate schedules
- `404 Not Found`: Project or tasks not found
- `500 Internal Server Error`: Unexpected error during calculation

### 2.2 Get Schedule

**Endpoint**: `GET /api/v1/schedule/{project_id}`

**Description**: Retrieve the current schedule for a project.

**Path Parameters**:
- `project_id` (UUID): Project identifier

**Query Parameters**:
- `version` (integer, optional): Specific version to retrieve (default: latest)

**Response (Success)**:
```json
{
  "project_id": "uuid",
  "schedule": [
    {
      "task_id": "task-uuid-1",
      "task_title": "Implement authentication",
      "start_date": "2024-01-01T09:00:00Z",
      "end_date": "2024-01-05T17:00:00Z",
      "duration_hours": 40,
      "assigned_resources": ["resource-id-1"]
    }
  ],
  "resources": [
    {
      "id": "resource-id-1",
      "name": "Senior Developer",
      "capacity": 40
    }
  ],
  "constraints": {
    "project_start": "2024-01-01T00:00:00Z",
    "horizon_days": 365,
    "working_hours_per_day": 8,
    "respect_weekends": true
  },
  "project_duration_hours": 320,
  "project_start_date": "2024-01-01T09:00:00Z",
  "project_end_date": "2024-02-15T17:00:00Z",
  "created_at": "2024-01-01T08:00:00Z",
  "updated_at": "2024-01-01T08:00:00Z",
  "version": 1,
  "manual_adjustments": {}
}
```

**Status Codes**:
- `200 OK`: Schedule retrieved successfully
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Schedule not found for project
- `500 Internal Server Error`: Unexpected error

### 2.3 Update Schedule (Manual Adjustments)

**Endpoint**: `PATCH /api/v1/schedule/{project_id}`

**Description**: Apply manual adjustments to a calculated schedule.

**Path Parameters**:
- `project_id` (UUID): Project identifier

**Request Body**:
```json
{
  "task_adjustments": {
    "task-uuid-1": {
      "start_date": "2024-01-02T09:00:00Z",
      "end_date": "2024-01-06T17:00:00Z"
    },
    "task-uuid-2": {
      "start_date": "2024-01-08T09:00:00Z"
    }
  },
  "preserve_dependencies": true,
  "recalculate_downstream": true
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "project_id": "uuid",
  "schedule": [
    {
      "task_id": "task-uuid-1",
      "task_title": "Implement authentication",
      "start_date": "2024-01-02T09:00:00Z",
      "end_date": "2024-01-06T17:00:00Z",
      "duration_hours": 40,
      "assigned_resources": ["resource-id-1"]
    }
  ],
  "project_duration_hours": 328,
  "project_start_date": "2024-01-02T09:00:00Z",
  "project_end_date": "2024-02-16T17:00:00Z",
  "message": "Schedule updated (version 2)"
}
```

**Status Codes**:
- `200 OK`: Schedule updated successfully
- `400 Bad Request`: Invalid adjustments or constraint violations
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User lacks permission to update schedules
- `404 Not Found`: Schedule not found for project
- `500 Internal Server Error`: Unexpected error

### 2.4 Get Gantt Chart Data

**Endpoint**: `GET /api/v1/schedule/{project_id}/gantt`

**Description**: Retrieve schedule data formatted for Gantt chart visualization.

**Path Parameters**:
- `project_id` (UUID): Project identifier

**Response (Success)**:
```json
{
  "tasks": [
    {
      "task_id": "task-uuid-1",
      "task_title": "Implement authentication",
      "start_date": "2024-01-01T09:00:00Z",
      "end_date": "2024-01-05T17:00:00Z",
      "duration_hours": 40,
      "assigned_resources": ["resource-id-1"]
    }
  ],
  "dependencies": [
    {
      "from_task_id": "task-uuid-1",
      "to_task_id": "task-uuid-2",
      "type": "finish-to-start"
    }
  ],
  "critical_path": ["task-uuid-1", "task-uuid-3", "task-uuid-5"]
}
```

**Status Codes**:
- `200 OK`: Gantt data retrieved successfully
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Schedule not found for project
- `500 Internal Server Error`: Unexpected error

### 2.5 Get Schedule Statistics

**Endpoint**: `GET /api/v1/schedule/{project_id}/statistics`

**Description**: Retrieve schedule metrics and statistics.

**Path Parameters**:
- `project_id` (UUID): Project identifier

**Response (Success)**:
```json
{
  "total_tasks": 25,
  "completed_tasks": 10,
  "in_progress_tasks": 8,
  "not_started_tasks": 5,
  "blocked_tasks": 2,
  "total_estimated_hours": 400,
  "total_actual_hours": 180,
  "completion_percentage": 40.0,
  "critical_path_tasks": ["task-uuid-1", "task-uuid-3"],
  "resource_utilization": {
    "resource-id-1": 85.5,
    "resource-id-2": 72.3
  },
  "schedule_health": "on_track"
}
```

**Status Codes**:
- `200 OK`: Statistics retrieved successfully
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Schedule not found for project
- `500 Internal Server Error`: Unexpected error

### 2.6 Export Schedule

**Endpoint**: `GET /api/v1/schedule/{project_id}/export`

**Description**: Export complete schedule data for offline use or external tools.

**Path Parameters**:
- `project_id` (UUID): Project identifier

**Response (Success)**:
```json
{
  "project_id": "uuid",
  "schedule": [...],
  "resources": [...],
  "constraints": {...},
  "metadata": {
    "version": 1,
    "created_at": "2024-01-01T08:00:00Z",
    "created_by": "user-uuid",
    "exported_at": "2024-01-15T10:00:00Z"
  }
}
```

**Status Codes**:
- `200 OK`: Schedule exported successfully
- `401 Unauthorized`: Missing or invalid authentication token
- `404 Not Found`: Schedule not found for project
- `500 Internal Server Error`: Unexpected error

### 2.7 Import Schedule

**Endpoint**: `POST /api/v1/schedule/{project_id}/import`

**Description**: Import a schedule calculated offline or from external tools.

**Path Parameters**:
- `project_id` (UUID): Project identifier

**Request Body**: Same format as export response

**Response (Success)**:
```json
{
  "status": "success",
  "project_id": "uuid",
  "message": "Schedule imported successfully (version 2)",
  "imported_tasks": 25,
  "skipped_tasks": 0,
  "failed_tasks": 0
}
```

**Status Codes**:
- `200 OK`: Schedule imported successfully
- `400 Bad Request`: Invalid schedule data or validation errors
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: User lacks permission to import schedules
- `404 Not Found`: Project not found
- `500 Internal Server Error`: Unexpected error

### 2.8 Resource Management

**Endpoint**: `GET /api/v1/schedule/resources`

**Description**: List all available resources.

**Response (Success)**:
```json
[
  {
    "id": "resource-id-1",
    "name": "Senior Developer",
    "capacity": 40
  },
  {
    "id": "resource-id-2",
    "name": "QA Engineer",
    "capacity": 40
  }
]
```

**Endpoint**: `POST /api/v1/schedule/resources`

**Description**: Create a new resource.

**Request Body**:
```json
{
  "id": "resource-id-3",
  "name": "DevOps Engineer",
  "capacity": 40
}
```

**Endpoint**: `PATCH /api/v1/schedule/resources/{resource_id}`

**Description**: Update a resource.

**Endpoint**: `DELETE /api/v1/schedule/resources/{resource_id}`

**Description**: Delete a resource.

## 3. Data Models

### 3.1 Existing Pydantic Schemas

The following schemas are already defined in `backend/app/schemas/schedule.py`:

- `ResourceBase`, `ResourceCreate`, `ResourceResponse`
- `TaskDependency`
- `ScheduleTaskBase`, `ScheduleTaskCreate`
- `ScheduledTask`
- `ScheduleConstraints`
- `ScheduleConflict`
- `ScheduleRequest`, `ScheduleResponse`
- `ScheduleUpdate`
- `ProjectSchedule`

### 3.2 New Schemas Required

**GanttChartData**:
```python
class GanttChartData(BaseModel):
    """Schema for Gantt chart visualization data"""
    
    tasks: list[ScheduledTask] = Field(..., description="Scheduled tasks")
    dependencies: list[TaskDependencyView] = Field(
        default_factory=list,
        description="Task dependencies for visualization"
    )
    critical_path: list[str] = Field(
        default_factory=list,
        description="Task IDs on the critical path"
    )


class TaskDependencyView(BaseModel):
    """Schema for task dependency visualization"""
    
    from_task_id: str = Field(..., description="Source task ID")
    to_task_id: str = Field(..., description="Target task ID")
    type: Literal["finish-to-start", "start-to-start", "finish-to-finish"] = Field(
        ...,
        description="Dependency type"
    )
```

**ScheduleStatistics**:
```python
class ScheduleStatistics(BaseModel):
    """Schema for schedule statistics and metrics"""
    
    total_tasks: int = Field(..., description="Total number of tasks")
    completed_tasks: int = Field(..., description="Number of completed tasks")
    in_progress_tasks: int = Field(..., description="Number of in-progress tasks")
    not_started_tasks: int = Field(..., description="Number of not-started tasks")
    blocked_tasks: int = Field(..., description="Number of blocked tasks")
    total_estimated_hours: float = Field(..., description="Total estimated hours")
    total_actual_hours: float = Field(..., description="Total actual hours spent")
    completion_percentage: float = Field(..., description="Project completion percentage")
    critical_path_tasks: list[str] = Field(
        default_factory=list,
        description="Task IDs on critical path"
    )
    resource_utilization: dict[str, float] = Field(
        default_factory=dict,
        description="Resource utilization percentages"
    )
    schedule_health: Literal["on_track", "at_risk", "delayed"] = Field(
        ...,
        description="Overall schedule health indicator"
    )
```

**ScheduleCalculateRequest**:
```python
class ScheduleCalculateRequest(BaseModel):
    """Schema for schedule calculation request"""
    
    project_id: UUID = Field(..., description="Project identifier")
    task_ids: list[str] = Field(..., min_length=1, description="Task IDs to schedule")
    resource_ids: list[str] = Field(default_factory=list, description="Resource IDs to use")
    constraints: ScheduleConstraints = Field(
        default_factory=ScheduleConstraints,
        description="Schedule constraints"
    )
```


## 4. Service Layer Design

### 4.1 Schedule API Service

The Schedule API Service will orchestrate between the API endpoints, the existing SchedulerService, and the WorkItem system.

```python
from uuid import UUID
from typing import Optional
from app.services.scheduler_service import SchedulerService, get_scheduler_service
from app.services.workitem_service import WorkItemService
from app.schemas.schedule import (
    ScheduleCalculateRequest,
    ScheduleResponse,
    ScheduleUpdate,
    GanttChartData,
    ScheduleStatistics,
    ProjectSchedule,
)

class ScheduleAPIService:
    """
    Service for schedule API operations.
    Orchestrates between SchedulerService, WorkItemService, and API endpoints.
    """
    
    def __init__(
        self,
        scheduler_service: SchedulerService,
        workitem_service: WorkItemService
    ):
        self.scheduler = scheduler_service
        self.workitem_service = workitem_service
        
    async def calculate_schedule(
        self,
        request: ScheduleCalculateRequest,
        user_id: UUID
    ) -> ScheduleResponse:
        """
        Calculate project schedule from task IDs.
        
        Args:
            request: Schedule calculation request with task IDs and constraints
            user_id: User performing the calculation
            
        Returns:
            ScheduleResponse with calculated schedule or conflicts
        """
        # 1. Fetch tasks from WorkItem system
        tasks = await self._fetch_tasks(request.task_ids)
        
        # 2. Fetch resources
        resources = await self._fetch_resources(request.resource_ids)
        
        # 3. Convert WorkItems to ScheduleTaskCreate
        schedule_tasks = self._convert_workitems_to_schedule_tasks(tasks)
        
        # 4. Call SchedulerService
        response = await self.scheduler.schedule_project(
            project_id=request.project_id,
            tasks=schedule_tasks,
            resources=resources,
            constraints=request.constraints
        )
        
        # 5. If successful, update WorkItem start/end dates
        if response.status in ["success", "feasible"]:
            await self._update_workitem_dates(response.schedule)
            
        return response
        
    async def get_schedule(
        self,
        project_id: UUID,
        version: Optional[int] = None
    ) -> Optional[ProjectSchedule]:
        """
        Retrieve schedule for a project.
        
        Args:
            project_id: Project identifier
            version: Optional specific version (default: latest)
            
        Returns:
            ProjectSchedule if found, None otherwise
        """
        return await self.scheduler.get_schedule(project_id)
        
    async def update_schedule(
        self,
        project_id: UUID,
        updates: ScheduleUpdate,
        user_id: UUID
    ) -> Optional[ScheduleResponse]:
        """
        Apply manual adjustments to a schedule.
        
        Args:
            project_id: Project identifier
            updates: Manual adjustments to apply
            user_id: User performing the update
            
        Returns:
            Updated ScheduleResponse or None if schedule not found
        """
        response = await self.scheduler.update_schedule(project_id, updates)
        
        if response and response.status == "success":
            await self._update_workitem_dates(response.schedule)
            
        return response
        
    async def get_gantt_data(
        self,
        project_id: UUID
    ) -> Optional[GanttChartData]:
        """
        Get Gantt chart data for a project.
        
        Args:
            project_id: Project identifier
            
        Returns:
            GanttChartData if schedule exists, None otherwise
        """
        schedule = await self.scheduler.get_schedule(project_id)
        if not schedule:
            return None
            
        # Fetch task dependencies from WorkItem system
        task_ids = [task.task_id for task in schedule.schedule]
        dependencies = await self._fetch_task_dependencies(task_ids)
        
        # Calculate critical path
        critical_path = self._calculate_critical_path(
            schedule.schedule,
            dependencies
        )
        
        return GanttChartData(
            tasks=schedule.schedule,
            dependencies=dependencies,
            critical_path=critical_path
        )
        
    async def get_statistics(
        self,
        project_id: UUID
    ) -> Optional[ScheduleStatistics]:
        """
        Get schedule statistics and metrics.
        
        Args:
            project_id: Project identifier
            
        Returns:
            ScheduleStatistics if schedule exists, None otherwise
        """
        schedule = await self.scheduler.get_schedule(project_id)
        if not schedule:
            return None
            
        # Fetch current task statuses from WorkItem system
        task_ids = [task.task_id for task in schedule.schedule]
        tasks = await self._fetch_tasks(task_ids)
        
        # Calculate statistics
        return self._calculate_statistics(schedule, tasks)
        
    async def _fetch_tasks(self, task_ids: list[str]) -> list[dict]:
        """Fetch tasks from WorkItem system"""
        tasks = []
        for task_id in task_ids:
            task = await self.workitem_service.get_workitem(UUID(task_id))
            if task and task.get('type') == 'task':
                tasks.append(task)
        return tasks
        
    async def _fetch_resources(self, resource_ids: list[str]) -> list[dict]:
        """Fetch resources (placeholder - implement resource storage)"""
        # TODO: Implement resource storage and retrieval
        return []
        
    def _convert_workitems_to_schedule_tasks(
        self,
        workitems: list[dict]
    ) -> list[ScheduleTaskCreate]:
        """Convert WorkItems to ScheduleTaskCreate"""
        from app.schemas.schedule import ScheduleTaskCreate, TaskDependency
        
        schedule_tasks = []
        for wi in workitems:
            # Extract dependencies from WorkItem
            dependencies = []
            if wi.get('dependencies'):
                for dep_id in wi['dependencies']:
                    dependencies.append(TaskDependency(
                        predecessor_id=dep_id,
                        dependency_type="finish_to_start",
                        lag=0
                    ))
            
            schedule_tasks.append(ScheduleTaskCreate(
                id=wi['id'],
                title=wi['title'],
                estimated_hours=wi.get('estimated_hours', 8),
                dependencies=dependencies,
                required_resources=wi.get('required_resources', []),
                resource_demand=wi.get('resource_demand', {}),
                earliest_start=wi.get('earliest_start'),
                deadline=wi.get('deadline'),
                priority=wi.get('priority', 3)
            ))
            
        return schedule_tasks
        
    async def _update_workitem_dates(
        self,
        scheduled_tasks: list[ScheduledTask]
    ):
        """Update WorkItem start/end dates from schedule"""
        for task in scheduled_tasks:
            await self.workitem_service.update_workitem(
                workitem_id=UUID(task.task_id),
                updates={
                    'start_date': task.start_date.isoformat(),
                    'end_date': task.end_date.isoformat()
                },
                change_description="Schedule calculated"
            )
            
    async def _fetch_task_dependencies(
        self,
        task_ids: list[str]
    ) -> list[TaskDependencyView]:
        """Fetch task dependencies for visualization"""
        dependencies = []
        for task_id in task_ids:
            task = await self.workitem_service.get_workitem(UUID(task_id))
            if task and task.get('dependencies'):
                for dep_id in task['dependencies']:
                    dependencies.append(TaskDependencyView(
                        from_task_id=dep_id,
                        to_task_id=task_id,
                        type="finish-to-start"
                    ))
        return dependencies
        
    def _calculate_critical_path(
        self,
        scheduled_tasks: list[ScheduledTask],
        dependencies: list[TaskDependencyView]
    ) -> list[str]:
        """Calculate critical path using longest path algorithm"""
        # Build dependency graph
        graph = {}
        for task in scheduled_tasks:
            graph[task.task_id] = []
            
        for dep in dependencies:
            if dep.to_task_id in graph:
                graph[dep.to_task_id].append(dep.from_task_id)
                
        # Find longest path (critical path)
        # This is a simplified implementation
        # TODO: Implement proper critical path algorithm
        return []
        
    def _calculate_statistics(
        self,
        schedule: ProjectSchedule,
        tasks: list[dict]
    ) -> ScheduleStatistics:
        """Calculate schedule statistics"""
        total_tasks = len(tasks)
        completed = sum(1 for t in tasks if t.get('status') == 'completed')
        in_progress = sum(1 for t in tasks if t.get('status') == 'active')
        not_started = sum(1 for t in tasks if t.get('status') == 'draft')
        blocked = sum(1 for t in tasks if t.get('status') == 'blocked')
        
        total_estimated = sum(t.get('estimated_hours', 0) for t in tasks)
        total_actual = sum(t.get('actual_hours', 0) for t in tasks)
        
        completion_pct = (completed / total_tasks * 100) if total_tasks > 0 else 0
        
        # Determine schedule health
        if completion_pct >= 90:
            health = "on_track"
        elif completion_pct >= 70:
            health = "at_risk"
        else:
            health = "delayed"
            
        return ScheduleStatistics(
            total_tasks=total_tasks,
            completed_tasks=completed,
            in_progress_tasks=in_progress,
            not_started_tasks=not_started,
            blocked_tasks=blocked,
            total_estimated_hours=total_estimated,
            total_actual_hours=total_actual,
            completion_percentage=completion_pct,
            critical_path_tasks=[],
            resource_utilization={},
            schedule_health=health
        )


async def get_schedule_api_service(
    scheduler_service: SchedulerService = Depends(get_scheduler_service),
    workitem_service: WorkItemService = Depends(get_workitem_service)
) -> ScheduleAPIService:
    """Dependency for getting the schedule API service"""
    return ScheduleAPIService(scheduler_service, workitem_service)
```


## 5. API Endpoint Implementation

### 5.1 Schedule Router

Create `backend/app/api/v1/schedule.py`:

```python
from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from typing import Optional

from app.api.deps import get_current_user
from app.models.user import User
from app.services.schedule_api_service import (
    ScheduleAPIService,
    get_schedule_api_service
)
from app.schemas.schedule import (
    ScheduleCalculateRequest,
    ScheduleResponse,
    ScheduleUpdate,
    ProjectSchedule,
    GanttChartData,
    ScheduleStatistics,
)

router = APIRouter(prefix="/schedule", tags=["schedule"])


@router.post("/calculate", response_model=ScheduleResponse)
async def calculate_schedule(
    request: ScheduleCalculateRequest,
    current_user: User = Depends(get_current_user),
    service: ScheduleAPIService = Depends(get_schedule_api_service)
) -> ScheduleResponse:
    """
    Calculate project schedule using constraint programming.
    
    Requires: project_manager or admin role
    """
    # Check permissions
    if current_user.role not in ["project_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project managers and admins can calculate schedules"
        )
    
    try:
        response = await service.calculate_schedule(request, current_user.id)
        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.exception("Schedule calculation failed")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Schedule calculation failed"
        )


@router.get("/{project_id}", response_model=ProjectSchedule)
async def get_schedule(
    project_id: UUID,
    version: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    service: ScheduleAPIService = Depends(get_schedule_api_service)
) -> ProjectSchedule:
    """
    Get current schedule for a project.
    
    Requires: authenticated user
    """
    schedule = await service.get_schedule(project_id, version)
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule not found for project {project_id}"
        )
    
    return schedule


@router.patch("/{project_id}", response_model=ScheduleResponse)
async def update_schedule(
    project_id: UUID,
    updates: ScheduleUpdate,
    current_user: User = Depends(get_current_user),
    service: ScheduleAPIService = Depends(get_schedule_api_service)
) -> ScheduleResponse:
    """
    Apply manual adjustments to a schedule.
    
    Requires: project_manager or admin role
    """
    # Check permissions
    if current_user.role not in ["project_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project managers and admins can update schedules"
        )
    
    response = await service.update_schedule(project_id, updates, current_user.id)
    
    if not response:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule not found for project {project_id}"
        )
    
    if response.status == "error":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=response.message or "Schedule update failed"
        )
    
    return response


@router.get("/{project_id}/gantt", response_model=GanttChartData)
async def get_gantt_data(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    service: ScheduleAPIService = Depends(get_schedule_api_service)
) -> GanttChartData:
    """
    Get Gantt chart data for a project.
    
    Requires: authenticated user
    """
    gantt_data = await service.get_gantt_data(project_id)
    
    if not gantt_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule not found for project {project_id}"
        )
    
    return gantt_data


@router.get("/{project_id}/statistics", response_model=ScheduleStatistics)
async def get_statistics(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    service: ScheduleAPIService = Depends(get_schedule_api_service)
) -> ScheduleStatistics:
    """
    Get schedule statistics and metrics.
    
    Requires: authenticated user
    """
    statistics = await service.get_statistics(project_id)
    
    if not statistics:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule not found for project {project_id}"
        )
    
    return statistics


@router.get("/{project_id}/export", response_model=ProjectSchedule)
async def export_schedule(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    service: ScheduleAPIService = Depends(get_schedule_api_service)
) -> ProjectSchedule:
    """
    Export complete schedule data.
    
    Requires: authenticated user
    """
    schedule = await service.get_schedule(project_id)
    
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule not found for project {project_id}"
        )
    
    return schedule


@router.post("/{project_id}/import", response_model=dict)
async def import_schedule(
    project_id: UUID,
    schedule_data: ProjectSchedule,
    current_user: User = Depends(get_current_user),
    service: ScheduleAPIService = Depends(get_schedule_api_service)
) -> dict:
    """
    Import a schedule calculated offline.
    
    Requires: project_manager or admin role
    """
    # Check permissions
    if current_user.role not in ["project_manager", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only project managers and admins can import schedules"
        )
    
    try:
        result = await service.import_schedule(project_id, schedule_data, current_user.id)
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
```

### 5.2 Register Router

Update `backend/app/api/v1/__init__.py`:

```python
from fastapi import APIRouter
from app.api.v1 import auth, workitems, schedule

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(workitems.router)
api_router.include_router(schedule.router)  # Add this line
```

## 6. Frontend Integration

### 6.1 Update Schedule Service

Update `frontend/src/services/scheduleService.ts` to remove placeholder methods and use real API endpoints:

```typescript
async calculateSchedule(
  projectId: string,
  taskIds: string[],
  resourceIds: string[] = [],
  constraints?: ScheduleConstraints
): Promise<ScheduleResult> {
  try {
    const response = await apiClient.post<ScheduleResult>('/api/v1/schedule/calculate', {
      project_id: projectId,
      task_ids: taskIds,
      resource_ids: resourceIds,
      constraints: constraints || {}
    });
    return response.data;
  } catch (error) {
    handleApiError(error, 'calculateSchedule', { projectId, taskIds });
  }
}

async getSchedule(projectId: string): Promise<ScheduleResult> {
  try {
    const response = await apiClient.get<ProjectSchedule>(`/api/v1/schedule/${projectId}`);
    
    // Convert ProjectSchedule to ScheduleResult format
    return {
      status: 'success',
      schedule: response.data.schedule,
      project_duration_hours: response.data.project_duration_hours,
      conflicts: []
    };
  } catch (error) {
    handleApiError(error, 'getSchedule', { projectId });
  }
}

async getGanttData(projectId: string): Promise<ScheduledTask[]> {
  try {
    const response = await apiClient.get<GanttChartData>(`/api/v1/schedule/${projectId}/gantt`);
    return response.data.tasks;
  } catch (error) {
    handleApiError(error, 'getGanttData', { projectId });
  }
}
```

### 6.2 Update Schedule Page

Update `frontend/src/pages/SchedulePage.tsx` to use real API:

```typescript
import React, { useEffect, useState } from 'react';
import { scheduleService } from '../services/scheduleService';
import { GanttChart } from '../components/schedule/GanttChart';
import type { ScheduledTask } from '../services/scheduleService';

export function SchedulePage(): React.ReactElement {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // TODO: Get project ID from context or route params
  const projectId = 'default-project-id';
  
  useEffect(() => {
    async function loadSchedule() {
      try {
        setIsLoading(true);
        setError(null);
        const ganttData = await scheduleService.getGanttData(projectId);
        setTasks(ganttData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schedule');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSchedule();
  }, [projectId]);
  
  if (isLoading) {
    return <div>Loading schedule...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  return (
    <div className="schedule-page">
      <h1>Project Schedule</h1>
      <GanttChart tasks={tasks} />
    </div>
  );
}
```

## 7. Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Schedule Calculation Determinism

*For any* set of tasks, resources, and constraints, calculating the schedule multiple times with the same inputs should produce the same schedule (same start/end dates for all tasks).

**Validates: Requirements 1.1, 1.2**

### Property 2: Dependency Preservation

*For any* schedule with task dependencies, if task A depends on task B (finish-to-start), then task A's start date must be greater than or equal to task B's end date.

**Validates: Requirements 1.4**

### Property 3: Resource Capacity Constraints

*For any* schedule with resource constraints, at any point in time, the sum of resource demands from concurrent tasks must not exceed the resource capacity.

**Validates: Requirements 1.5**

### Property 4: Deadline Compliance

*For any* task with a deadline, the scheduled end date must be less than or equal to the deadline.

**Validates: Requirements 1.6**

### Property 5: Schedule Retrieval Consistency

*For any* project with a calculated schedule, retrieving the schedule should return the same data that was stored during calculation.

**Validates: Requirements 2.3, 2.4**

### Property 6: Manual Adjustment Preservation

*For any* schedule with manual adjustments, retrieving the schedule should include all manually adjusted dates and preserve the adjustment history.

**Validates: Requirements 3.6, 3.7**

### Property 7: Gantt Data Completeness

*For any* project with a schedule, the Gantt chart data should include all scheduled tasks with their dependencies.

**Validates: Requirements 4.2, 4.3**

### Property 8: Conflict Detection Completeness

*For any* infeasible schedule, the system should identify and report at least one constraint violation that prevents a feasible solution.

**Validates: Requirements 5.1, 5.8**

### Property 9: Version Increment Monotonicity

*For any* schedule, each modification (recalculation or manual adjustment) should increment the version number by exactly 1.

**Validates: Requirements 6.2**

### Property 10: WorkItem Integration Round Trip

*For any* task scheduled with start and end dates, retrieving the task from the WorkItem system should return the same dates that were set during scheduling.

**Validates: Requirements 7.2**


## 8. Error Handling

### 8.1 Error Response Format

All API errors follow a consistent format:

```json
{
  "detail": "Human-readable error message",
  "error_code": "SCHEDULE_NOT_FOUND",
  "context": {
    "project_id": "uuid",
    "additional_info": "..."
  }
}
```

### 8.2 Error Codes

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `SCHEDULE_NOT_FOUND` | 404 | Schedule does not exist for project |
| `INVALID_TASK_IDS` | 400 | One or more task IDs are invalid |
| `INVALID_RESOURCE_IDS` | 400 | One or more resource IDs are invalid |
| `CIRCULAR_DEPENDENCY` | 400 | Task dependencies form a cycle |
| `RESOURCE_OVERALLOCATION` | 400 | Resource capacity exceeded |
| `IMPOSSIBLE_DEADLINE` | 400 | Task deadline cannot be met |
| `CONSTRAINT_VIOLATION` | 400 | Schedule violates constraints |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | User lacks required permissions |
| `CALCULATION_TIMEOUT` | 500 | Schedule calculation exceeded timeout |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

### 8.3 Logging Strategy

All schedule operations are logged with structured logging:

```python
import logging
import structlog

logger = structlog.get_logger(__name__)

# Log schedule calculation
logger.info(
    "schedule_calculation_started",
    project_id=str(project_id),
    task_count=len(tasks),
    resource_count=len(resources),
    user_id=str(user_id)
)

# Log calculation result
logger.info(
    "schedule_calculation_completed",
    project_id=str(project_id),
    status=response.status,
    duration_seconds=elapsed,
    project_duration_hours=response.project_duration_hours
)

# Log errors
logger.error(
    "schedule_calculation_failed",
    project_id=str(project_id),
    error=str(e),
    exc_info=True
)
```

## 9. Testing Strategy

### 9.1 Unit Tests

Unit tests verify individual components in isolation:

**Test Coverage**:
- ScheduleAPIService methods
- Data conversion functions (WorkItem to ScheduleTask)
- Statistics calculation
- Critical path calculation
- Error handling

**Example Test**:
```python
import pytest
from app.services.schedule_api_service import ScheduleAPIService

@pytest.mark.asyncio
async def test_calculate_schedule_success(
    mock_scheduler_service,
    mock_workitem_service,
    sample_tasks
):
    """Test successful schedule calculation"""
    service = ScheduleAPIService(mock_scheduler_service, mock_workitem_service)
    
    request = ScheduleCalculateRequest(
        project_id=UUID("..."),
        task_ids=["task-1", "task-2"],
        resource_ids=["resource-1"],
        constraints=ScheduleConstraints()
    )
    
    response = await service.calculate_schedule(request, UUID("user-1"))
    
    assert response.status == "success"
    assert len(response.schedule) == 2
    assert response.project_duration_hours > 0
```

### 9.2 Property-Based Tests

Property-based tests verify universal properties across many generated inputs:

**Test Coverage**:
- Schedule calculation determinism (Property 1)
- Dependency preservation (Property 2)
- Resource capacity constraints (Property 3)
- Deadline compliance (Property 4)
- Version increment monotonicity (Property 9)

**Example Property Test**:
```python
from hypothesis import given, strategies as st
import pytest

@given(
    tasks=st.lists(
        st.builds(
            ScheduleTaskCreate,
            id=st.text(min_size=1),
            title=st.text(min_size=1),
            estimated_hours=st.integers(min_value=1, max_value=100),
            dependencies=st.just([]),
            required_resources=st.just([]),
            resource_demand=st.just({})
        ),
        min_size=1,
        max_size=10
    )
)
@pytest.mark.asyncio
async def test_schedule_calculation_determinism(tasks, scheduler_service):
    """
    Property 1: Schedule Calculation Determinism
    
    For any set of tasks, calculating the schedule multiple times
    should produce the same result.
    
    Feature: backend-schedule-api, Property 1: Schedule Calculation Determinism
    """
    resources = []
    constraints = ScheduleConstraints()
    project_id = UUID("test-project")
    
    # Calculate schedule twice
    result1 = await scheduler_service.schedule_project(
        project_id, tasks, resources, constraints
    )
    result2 = await scheduler_service.schedule_project(
        project_id, tasks, resources, constraints
    )
    
    # Both should succeed or both should fail
    assert result1.status == result2.status
    
    # If successful, schedules should be identical
    if result1.status in ["success", "feasible"]:
        assert len(result1.schedule) == len(result2.schedule)
        
        for task1, task2 in zip(result1.schedule, result2.schedule):
            assert task1.task_id == task2.task_id
            assert task1.start_date == task2.start_date
            assert task1.end_date == task2.end_date
```

**Example Property Test for Dependencies**:
```python
@given(
    task_count=st.integers(min_value=2, max_value=10),
    dependency_pairs=st.lists(
        st.tuples(st.integers(min_value=0), st.integers(min_value=0)),
        min_size=1,
        max_size=5
    )
)
@pytest.mark.asyncio
async def test_dependency_preservation(task_count, dependency_pairs, scheduler_service):
    """
    Property 2: Dependency Preservation
    
    For any schedule with finish-to-start dependencies,
    successor tasks must start after predecessor tasks end.
    
    Feature: backend-schedule-api, Property 2: Dependency Preservation
    """
    # Create tasks with dependencies
    tasks = []
    for i in range(task_count):
        deps = []
        for pred_idx, succ_idx in dependency_pairs:
            if succ_idx == i and pred_idx < task_count and pred_idx != i:
                deps.append(TaskDependency(
                    predecessor_id=f"task-{pred_idx}",
                    dependency_type="finish_to_start",
                    lag=0
                ))
        
        tasks.append(ScheduleTaskCreate(
            id=f"task-{i}",
            title=f"Task {i}",
            estimated_hours=8,
            dependencies=deps,
            required_resources=[],
            resource_demand={}
        ))
    
    # Calculate schedule
    result = await scheduler_service.schedule_project(
        UUID("test-project"),
        tasks,
        [],
        ScheduleConstraints()
    )
    
    # If successful, verify dependencies are preserved
    if result.status in ["success", "feasible"]:
        schedule_map = {t.task_id: t for t in result.schedule}
        
        for task in tasks:
            if task.id in schedule_map:
                scheduled_task = schedule_map[task.id]
                
                for dep in task.dependencies:
                    if dep.predecessor_id in schedule_map:
                        pred_task = schedule_map[dep.predecessor_id]
                        
                        # Successor must start after predecessor ends
                        assert scheduled_task.start_date >= pred_task.end_date
```

### 9.3 Integration Tests

Integration tests verify end-to-end API functionality:

**Test Coverage**:
- POST /api/v1/schedule/calculate
- GET /api/v1/schedule/{project_id}
- PATCH /api/v1/schedule/{project_id}
- GET /api/v1/schedule/{project_id}/gantt
- GET /api/v1/schedule/{project_id}/statistics
- Authentication and authorization
- Error responses

**Example Integration Test**:
```python
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_calculate_schedule_endpoint(
    async_client: AsyncClient,
    auth_headers: dict,
    sample_project_id: UUID
):
    """Test schedule calculation endpoint"""
    request_data = {
        "project_id": str(sample_project_id),
        "task_ids": ["task-1", "task-2"],
        "resource_ids": [],
        "constraints": {
            "horizon_days": 30,
            "working_hours_per_day": 8,
            "respect_weekends": True
        }
    }
    
    response = await async_client.post(
        "/api/v1/schedule/calculate",
        json=request_data,
        headers=auth_headers
    )
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] in ["success", "feasible", "infeasible"]
    assert data["project_id"] == str(sample_project_id)
    
    if data["status"] in ["success", "feasible"]:
        assert "schedule" in data
        assert len(data["schedule"]) > 0
        assert "project_duration_hours" in data


@pytest.mark.asyncio
async def test_get_schedule_not_found(
    async_client: AsyncClient,
    auth_headers: dict
):
    """Test getting non-existent schedule returns 404"""
    project_id = UUID("00000000-0000-0000-0000-000000000000")
    
    response = await async_client.get(
        f"/api/v1/schedule/{project_id}",
        headers=auth_headers
    )
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_calculate_schedule_unauthorized(
    async_client: AsyncClient,
    sample_project_id: UUID
):
    """Test schedule calculation requires authentication"""
    request_data = {
        "project_id": str(sample_project_id),
        "task_ids": ["task-1"],
        "resource_ids": [],
        "constraints": {}
    }
    
    response = await async_client.post(
        "/api/v1/schedule/calculate",
        json=request_data
    )
    
    assert response.status_code == 401
```

### 9.4 Test Configuration

**Minimum Test Coverage**: 80% for all new code

**Property Test Configuration**: Minimum 100 iterations per property test

**Test Execution**:
```bash
# Run all tests
cd backend
uvx pytest

# Run with coverage
uvx pytest --cov=app --cov-report=term-missing

# Run only schedule tests
uvx pytest tests/test_schedule_api.py

# Run property tests
uvx pytest tests/test_schedule_properties.py
```

## 10. Performance Considerations

### 10.1 Performance Targets

| Operation | Target | Maximum |
|-----------|--------|---------|
| Calculate schedule (100 tasks) | < 5s | 10s |
| Calculate schedule (500 tasks) | < 30s | 60s |
| Calculate schedule (1000 tasks) | < 60s | 120s |
| Retrieve schedule | < 2s | 5s |
| Update schedule | < 5s | 10s |
| Get Gantt data | < 2s | 5s |

### 10.2 Optimization Strategies

1. **Async Operations**: Use async/await for all I/O operations
2. **Caching**: Cache frequently accessed schedules
3. **Batch Operations**: Fetch multiple WorkItems in parallel
4. **Timeout Handling**: Set reasonable timeouts for OR-Tools solver
5. **Resource Limits**: Limit maximum number of tasks per schedule

### 10.3 Monitoring

Log performance metrics for all operations:

```python
import time

start_time = time.time()
response = await scheduler_service.schedule_project(...)
elapsed = time.time() - start_time

logger.info(
    "schedule_calculation_performance",
    project_id=str(project_id),
    task_count=len(tasks),
    duration_seconds=elapsed,
    status=response.status
)
```

## 11. Security Considerations

### 11.1 Authentication

All endpoints require valid JWT token in Authorization header:

```
Authorization: Bearer <jwt_token>
```

### 11.2 Authorization

Role-based access control:

| Endpoint | Required Role |
|----------|---------------|
| POST /schedule/calculate | project_manager, admin |
| GET /schedule/{id} | any authenticated user |
| PATCH /schedule/{id} | project_manager, admin |
| GET /schedule/{id}/gantt | any authenticated user |
| GET /schedule/{id}/statistics | any authenticated user |
| POST /schedule/{id}/import | project_manager, admin |

### 11.3 Input Validation

All inputs validated using Pydantic schemas:
- Task IDs must be valid UUIDs
- Resource IDs must exist
- Constraints must be within reasonable bounds
- No SQL injection or XSS vulnerabilities

### 11.4 Rate Limiting

Implement rate limiting for expensive operations:
- Schedule calculation: 10 requests per minute per user
- Other operations: 100 requests per minute per user

## 12. Deployment Considerations

### 12.1 Environment Variables

```bash
# Schedule API Configuration
SCHEDULE_CALCULATION_TIMEOUT=60  # seconds
SCHEDULE_MAX_TASKS=1000
SCHEDULE_CACHE_TTL=300  # seconds
```

### 12.2 Database Migration

Initial implementation uses in-memory storage. For production:

1. Create `schedules` table in PostgreSQL
2. Migrate existing in-memory schedules
3. Update SchedulerService to use database storage

### 12.3 Monitoring and Alerting

Monitor:
- Schedule calculation success rate
- Average calculation duration
- API error rates
- Resource utilization

Alert on:
- Calculation failures > 10% in 5 minutes
- Average duration > 60 seconds
- Error rate > 5% in 5 minutes

## 13. Future Enhancements

### 13.1 Database Persistence

Replace in-memory storage with PostgreSQL:
- Create `schedules` table
- Store schedule versions
- Enable schedule history queries

### 13.2 Real-time Updates

Implement WebSocket support for real-time schedule updates:
- Notify clients when schedule is recalculated
- Push schedule changes to connected clients
- Enable collaborative schedule editing

### 13.3 Advanced Scheduling Features

- Multi-project resource allocation
- Skill-based resource matching
- Cost optimization
- Risk-based scheduling
- What-if scenario analysis

### 13.4 Performance Optimization

- Implement schedule calculation queue
- Add background job processing
- Cache frequently accessed schedules
- Optimize critical path calculation

## 14. Graph Database Entity Design

### 14.1 Overview

The system uses Neo4j graph database to store project management entities and their relationships. This enables powerful graph traversal queries for organizational structure, project hierarchy, resource allocation, and cross-project analytics.

**Entities Stored as Graph Nodes:**
- Projects
- Phases
- Workpackages
- WorkItems (Tasks, Requirements, Tests, Risks, Documents)
- Resources (people, machines, equipment, facilities)
- Departments

**Entities Stored in PostgreSQL Only:**
- Users (authentication/authorization entities, NOT project management entities)
- Audit logs
- Digital signatures
- Version history

### 14.2 Node Schemas

#### 14.2.1 Project Node

```python
class ProjectNode:
    """Project node in graph database"""
    
    # Node label
    label = "Project"
    
    # Properties
    id: UUID  # Unique project identifier
    name: str  # Project name (unique)
    description: str | None  # Project description
    status: str  # active, completed, archived
    start_date: datetime | None  # Project start date
    end_date: datetime | None  # Project end date
    created_at: datetime  # Creation timestamp
    updated_at: datetime  # Last update timestamp
    created_by_user_id: UUID  # User ID who created (PostgreSQL reference)
    manager_user_id: UUID | None  # Project manager user ID (PostgreSQL reference)
```

**Cypher Creation Example:**
```cypher
CREATE (p:Project {
    id: $id,
    name: $name,
    description: $description,
    status: 'active',
    start_date: $start_date,
    end_date: $end_date,
    created_at: datetime(),
    updated_at: datetime(),
    created_by_user_id: $user_id,
    manager_user_id: $manager_id
})
RETURN p
```

#### 14.2.2 Phase Node

```python
class PhaseNode:
    """Phase node in graph database"""
    
    # Node label
    label = "Phase"
    
    # Properties
    id: UUID  # Unique phase identifier
    name: str  # Phase name
    description: str | None  # Phase description
    order: int  # Sequence order within project
    start_date: datetime | None  # Phase start date
    end_date: datetime | None  # Phase end date
    project_id: UUID  # Parent project ID
    created_at: datetime  # Creation timestamp
```

**Cypher Creation Example:**
```cypher
MATCH (proj:Project {id: $project_id})
CREATE (phase:Phase {
    id: $id,
    name: $name,
    description: $description,
    order: $order,
    start_date: $start_date,
    end_date: $end_date,
    project_id: $project_id,
    created_at: datetime()
})
CREATE (phase)-[:BELONGS_TO]->(proj)
RETURN phase
```

#### 14.2.3 Workpackage Node

```python
class WorkpackageNode:
    """Workpackage node in graph database"""
    
    # Node label
    label = "Workpackage"
    
    # Properties
    id: UUID  # Unique workpackage identifier
    name: str  # Workpackage name
    description: str | None  # Workpackage description
    order: int  # Sequence order within phase
    start_date: datetime | None  # Workpackage start date
    end_date: datetime | None  # Workpackage end date
    phase_id: UUID  # Parent phase ID
    created_at: datetime  # Creation timestamp
```

**Cypher Creation Example:**
```cypher
MATCH (phase:Phase {id: $phase_id})
CREATE (wp:Workpackage {
    id: $id,
    name: $name,
    description: $description,
    order: $order,
    start_date: $start_date,
    end_date: $end_date,
    phase_id: $phase_id,
    created_at: datetime()
})
CREATE (wp)-[:BELONGS_TO]->(phase)
RETURN wp
```

#### 14.2.4 Resource Node

```python
class ResourceNode:
    """Resource node in graph database"""
    
    # Node label
    label = "Resource"
    
    # Properties
    id: UUID  # Unique resource identifier
    name: str  # Resource name (unique)
    type: str  # person, machine, equipment, facility, other
    capacity: float  # Resource capacity (hours per week for person, units for others)
    department_id: UUID | None  # Department ID
    skills: list[str] | None  # Skills (for person type)
    availability: str  # available, unavailable, limited
    created_at: datetime  # Creation timestamp
    updated_at: datetime  # Last update timestamp
```

**Cypher Creation Example:**
```cypher
CREATE (r:Resource {
    id: $id,
    name: $name,
    type: $type,
    capacity: $capacity,
    department_id: $department_id,
    skills: $skills,
    availability: 'available',
    created_at: datetime(),
    updated_at: datetime()
})
RETURN r
```

#### 14.2.5 Department Node

```python
class DepartmentNode:
    """Department node in graph database"""
    
    # Node label
    label = "Department"
    
    # Properties
    id: UUID  # Unique department identifier
    name: str  # Department name (unique)
    description: str | None  # Department description
    manager_user_id: UUID | None  # Manager user ID (PostgreSQL reference)
    parent_id: UUID | None  # Parent department ID (for hierarchy)
    created_at: datetime  # Creation timestamp
```

**Cypher Creation Example:**
```cypher
CREATE (d:Department {
    id: $id,
    name: $name,
    description: $description,
    manager_user_id: $manager_id,
    parent_id: $parent_id,
    created_at: datetime()
})
RETURN d
```

### 14.3 Relationship Schemas

#### 14.3.1 BELONGS_TO Relationships

**Phase → Project:**
```cypher
MATCH (phase:Phase {id: $phase_id}), (proj:Project {id: $project_id})
CREATE (phase)-[:BELONGS_TO]->(proj)
```

**Workpackage → Phase:**
```cypher
MATCH (wp:Workpackage {id: $wp_id}), (phase:Phase {id: $phase_id})
CREATE (wp)-[:BELONGS_TO]->(phase)
```

**Task → Workpackage:**
```cypher
MATCH (task:WorkItem {id: $task_id, type: 'task'}), (wp:Workpackage {id: $wp_id})
CREATE (task)-[:BELONGS_TO]->(wp)
```

**WorkItem → Project (for non-task items):**
```cypher
MATCH (wi:WorkItem {id: $wi_id}), (proj:Project {id: $project_id})
CREATE (wi)-[:BELONGS_TO]->(proj)
```

**Resource → Department:**
```cypher
MATCH (res:Resource {id: $resource_id}), (dept:Department {id: $dept_id})
CREATE (res)-[:BELONGS_TO]->(dept)
```

#### 14.3.2 ALLOCATED_TO Relationship

**Resource → Project (with allocation percentage):**
```cypher
MATCH (res:Resource {id: $resource_id}), (proj:Project {id: $project_id})
CREATE (res)-[:ALLOCATED_TO {
    allocation_percentage: $percentage,
    start_date: $start_date,
    end_date: $end_date,
    created_at: datetime()
}]->(proj)
```

#### 14.3.3 ASSIGNED_TO Relationship

**Resource → Task:**
```cypher
MATCH (res:Resource {id: $resource_id}), (task:WorkItem {id: $task_id, type: 'task'})
CREATE (res)-[:ASSIGNED_TO {
    assigned_at: datetime(),
    estimated_hours: $hours
}]->(task)
```

#### 14.3.4 PARENT_OF Relationship

**Department → Department (hierarchical):**
```cypher
MATCH (parent:Department {id: $parent_id}), (child:Department {id: $child_id})
CREATE (parent)-[:PARENT_OF]->(child)
```

### 14.4 Graph Service Extensions

Update `backend/app/db/graph.py` to add methods for new entities:

```python
class GraphService:
    """Extended GraphService with project management entities"""
    
    async def create_project_node(
        self,
        project_id: UUID,
        name: str,
        description: str | None,
        status: str,
        start_date: datetime | None,
        end_date: datetime | None,
        created_by_user_id: UUID,
        manager_user_id: UUID | None = None
    ) -> dict[str, Any]:
        """Create a Project node"""
        properties = {
            "id": str(project_id),
            "name": name,
            "description": description,
            "status": status,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat(),
            "created_by_user_id": str(created_by_user_id),
            "manager_user_id": str(manager_user_id) if manager_user_id else None
        }
        
        return await self.create_node("Project", properties)
    
    async def create_phase_node(
        self,
        phase_id: UUID,
        name: str,
        description: str | None,
        order: int,
        project_id: UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None
    ) -> dict[str, Any]:
        """Create a Phase node and link to Project"""
        properties = {
            "id": str(phase_id),
            "name": name,
            "description": description,
            "order": order,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "project_id": str(project_id),
            "created_at": datetime.now(UTC).isoformat()
        }
        
        phase = await self.create_node("Phase", properties)
        
        # Create BELONGS_TO relationship
        await self.create_relationship(
            from_id=str(phase_id),
            to_id=str(project_id),
            rel_type="BELONGS_TO"
        )
        
        return phase
    
    async def create_workpackage_node(
        self,
        workpackage_id: UUID,
        name: str,
        description: str | None,
        order: int,
        phase_id: UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None
    ) -> dict[str, Any]:
        """Create a Workpackage node and link to Phase"""
        properties = {
            "id": str(workpackage_id),
            "name": name,
            "description": description,
            "order": order,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "phase_id": str(phase_id),
            "created_at": datetime.now(UTC).isoformat()
        }
        
        workpackage = await self.create_node("Workpackage", properties)
        
        # Create BELONGS_TO relationship
        await self.create_relationship(
            from_id=str(workpackage_id),
            to_id=str(phase_id),
            rel_type="BELONGS_TO"
        )
        
        return workpackage
    
    async def create_resource_node(
        self,
        resource_id: UUID,
        name: str,
        resource_type: str,
        capacity: float,
        department_id: UUID | None = None,
        skills: list[str] | None = None,
        availability: str = "available"
    ) -> dict[str, Any]:
        """Create a Resource node"""
        properties = {
            "id": str(resource_id),
            "name": name,
            "type": resource_type,
            "capacity": capacity,
            "department_id": str(department_id) if department_id else None,
            "skills": skills or [],
            "availability": availability,
            "created_at": datetime.now(UTC).isoformat(),
            "updated_at": datetime.now(UTC).isoformat()
        }
        
        resource = await self.create_node("Resource", properties)
        
        # Create BELONGS_TO relationship if department specified
        if department_id:
            await self.create_relationship(
                from_id=str(resource_id),
                to_id=str(department_id),
                rel_type="BELONGS_TO"
            )
        
        return resource
    
    async def create_department_node(
        self,
        department_id: UUID,
        name: str,
        description: str | None,
        manager_user_id: UUID | None = None,
        parent_id: UUID | None = None
    ) -> dict[str, Any]:
        """Create a Department node"""
        properties = {
            "id": str(department_id),
            "name": name,
            "description": description,
            "manager_user_id": str(manager_user_id) if manager_user_id else None,
            "parent_id": str(parent_id) if parent_id else None,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        department = await self.create_node("Department", properties)
        
        # Create PARENT_OF relationship if parent specified
        if parent_id:
            await self.create_relationship(
                from_id=str(parent_id),
                to_id=str(department_id),
                rel_type="PARENT_OF"
            )
        
        return department
    
    async def allocate_resource_to_project(
        self,
        resource_id: UUID,
        project_id: UUID,
        allocation_percentage: float,
        start_date: datetime | None = None,
        end_date: datetime | None = None
    ) -> dict[str, Any]:
        """Allocate a resource to a project"""
        properties = {
            "allocation_percentage": allocation_percentage,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
            "created_at": datetime.now(UTC).isoformat()
        }
        
        return await self.create_relationship(
            from_id=str(resource_id),
            to_id=str(project_id),
            rel_type="ALLOCATED_TO",
            properties=properties
        )
    
    async def assign_resource_to_task(
        self,
        resource_id: UUID,
        task_id: UUID,
        estimated_hours: float
    ) -> dict[str, Any]:
        """Assign a resource to a task"""
        properties = {
            "assigned_at": datetime.now(UTC).isoformat(),
            "estimated_hours": estimated_hours
        }
        
        return await self.create_relationship(
            from_id=str(resource_id),
            to_id=str(task_id),
            rel_type="ASSIGNED_TO",
            properties=properties
        )
    
    async def get_project_hierarchy(
        self,
        project_id: UUID
    ) -> dict[str, Any]:
        """Get complete project hierarchy: Project → Phases → Workpackages → Tasks"""
        query = f"""
        MATCH (proj:Project {{id: '{project_id}'}})
        OPTIONAL MATCH (proj)<-[:BELONGS_TO]-(phase:Phase)
        OPTIONAL MATCH (phase)<-[:BELONGS_TO]-(wp:Workpackage)
        OPTIONAL MATCH (wp)<-[:BELONGS_TO]-(task:WorkItem {{type: 'task'}})
        RETURN proj, 
               COLLECT(DISTINCT phase) as phases,
               COLLECT(DISTINCT wp) as workpackages,
               COLLECT(DISTINCT task) as tasks
        """
        
        results = await self.execute_query(query)
        return results[0] if results else {}
    
    async def get_resource_allocations(
        self,
        resource_id: UUID
    ) -> list[dict[str, Any]]:
        """Get all project allocations for a resource"""
        query = f"""
        MATCH (res:Resource {{id: '{resource_id}'}})-[alloc:ALLOCATED_TO]->(proj:Project)
        RETURN proj, alloc
        """
        
        return await self.execute_query(query)
    
    async def get_department_resources(
        self,
        department_id: UUID
    ) -> list[dict[str, Any]]:
        """Get all resources in a department"""
        query = f"""
        MATCH (dept:Department {{id: '{department_id}'}})<-[:BELONGS_TO]-(res:Resource)
        RETURN res
        ORDER BY res.name
        """
        
        return await self.execute_query(query)
```

### 14.5 Pydantic Schemas for Graph Entities

Create `backend/app/schemas/project.py`:

```python
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


class ProjectBase(BaseModel):
    """Base Project schema"""
    
    name: str = Field(..., min_length=3, max_length=200, description="Project name")
    description: str | None = Field(None, description="Project description")
    status: str = Field(default="active", description="Project status")
    start_date: datetime | None = Field(None, description="Project start date")
    end_date: datetime | None = Field(None, description="Project end date")
    manager_user_id: UUID | None = Field(None, description="Project manager user ID")
    
    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"active", "completed", "archived", "on_hold"}
        if v.lower() not in allowed:
            raise ValueError(f"Status must be one of: {', '.join(allowed)}")
        return v.lower()


class ProjectCreate(ProjectBase):
    """Schema for creating a project"""
    pass


class ProjectUpdate(BaseModel):
    """Schema for updating a project"""
    
    name: str | None = Field(None, min_length=3, max_length=200)
    description: str | None = None
    status: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    manager_user_id: UUID | None = None


class ProjectResponse(ProjectBase):
    """Schema for project response"""
    
    id: UUID
    created_at: datetime
    updated_at: datetime
    created_by_user_id: UUID
    
    # Statistics (computed)
    total_tasks: int = 0
    completed_tasks: int = 0
    team_size: int = 0
    
    model_config = {"from_attributes": True}


class PhaseBase(BaseModel):
    """Base Phase schema"""
    
    name: str = Field(..., min_length=3, max_length=200, description="Phase name")
    description: str | None = Field(None, description="Phase description")
    order: int = Field(..., ge=1, description="Sequence order")
    start_date: datetime | None = Field(None, description="Phase start date")
    end_date: datetime | None = Field(None, description="Phase end date")


class PhaseCreate(PhaseBase):
    """Schema for creating a phase"""
    pass


class PhaseUpdate(BaseModel):
    """Schema for updating a phase"""
    
    name: str | None = Field(None, min_length=3, max_length=200)
    description: str | None = None
    order: int | None = Field(None, ge=1)
    start_date: datetime | None = None
    end_date: datetime | None = None


class PhaseResponse(PhaseBase):
    """Schema for phase response"""
    
    id: UUID
    project_id: UUID
    created_at: datetime
    
    # Statistics (computed)
    workpackage_count: int = 0
    task_count: int = 0
    completion_percentage: float = 0.0
    
    model_config = {"from_attributes": True}


class WorkpackageBase(BaseModel):
    """Base Workpackage schema"""
    
    name: str = Field(..., min_length=3, max_length=200, description="Workpackage name")
    description: str | None = Field(None, description="Workpackage description")
    order: int = Field(..., ge=1, description="Sequence order")
    start_date: datetime | None = Field(None, description="Workpackage start date")
    end_date: datetime | None = Field(None, description="Workpackage end date")


class WorkpackageCreate(WorkpackageBase):
    """Schema for creating a workpackage"""
    pass


class WorkpackageUpdate(BaseModel):
    """Schema for updating a workpackage"""
    
    name: str | None = Field(None, min_length=3, max_length=200)
    description: str | None = None
    order: int | None = Field(None, ge=1)
    start_date: datetime | None = None
    end_date: datetime | None = None


class WorkpackageResponse(WorkpackageBase):
    """Schema for workpackage response"""
    
    id: UUID
    phase_id: UUID
    created_at: datetime
    
    # Statistics (computed)
    task_count: int = 0
    completion_percentage: float = 0.0
    
    model_config = {"from_attributes": True}


class ResourceBase(BaseModel):
    """Base Resource schema"""
    
    name: str = Field(..., min_length=2, max_length=200, description="Resource name")
    type: str = Field(..., description="Resource type")
    capacity: float = Field(..., gt=0, description="Resource capacity")
    department_id: UUID | None = Field(None, description="Department ID")
    skills: list[str] | None = Field(None, description="Skills (for person type)")
    availability: str = Field(default="available", description="Availability status")
    
    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {"person", "machine", "equipment", "facility", "other"}
        if v.lower() not in allowed:
            raise ValueError(f"Type must be one of: {', '.join(allowed)}")
        return v.lower()
    
    @field_validator("availability")
    @classmethod
    def validate_availability(cls, v: str) -> str:
        allowed = {"available", "unavailable", "limited"}
        if v.lower() not in allowed:
            raise ValueError(f"Availability must be one of: {', '.join(allowed)}")
        return v.lower()


class ResourceCreate(ResourceBase):
    """Schema for creating a resource"""
    pass


class ResourceUpdate(BaseModel):
    """Schema for updating a resource"""
    
    name: str | None = Field(None, min_length=2, max_length=200)
    type: str | None = None
    capacity: float | None = Field(None, gt=0)
    department_id: UUID | None = None
    skills: list[str] | None = None
    availability: str | None = None


class ResourceResponse(ResourceBase):
    """Schema for resource response"""
    
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    # Statistics (computed)
    utilization_percentage: float = 0.0
    active_projects: int = 0
    active_tasks: int = 0
    
    model_config = {"from_attributes": True}


class DepartmentBase(BaseModel):
    """Base Department schema"""
    
    name: str = Field(..., min_length=2, max_length=200, description="Department name")
    description: str | None = Field(None, description="Department description")
    manager_user_id: UUID | None = Field(None, description="Manager user ID")
    parent_id: UUID | None = Field(None, description="Parent department ID")


class DepartmentCreate(DepartmentBase):
    """Schema for creating a department"""
    pass


class DepartmentUpdate(BaseModel):
    """Schema for updating a department"""
    
    name: str | None = Field(None, min_length=2, max_length=200)
    description: str | None = None
    manager_user_id: UUID | None = None
    parent_id: UUID | None = None


class DepartmentResponse(DepartmentBase):
    """Schema for department response"""
    
    id: UUID
    created_at: datetime
    
    # Statistics (computed)
    resource_count: int = 0
    subdepartment_count: int = 0
    
    model_config = {"from_attributes": True}
```

### 14.6 API Endpoints for Graph Entities

The following endpoints will be implemented:

**Projects:**
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects` - List projects
- `GET /api/v1/projects/{project_id}` - Get project details
- `PATCH /api/v1/projects/{project_id}` - Update project
- `DELETE /api/v1/projects/{project_id}` - Delete project
- `GET /api/v1/projects/{project_id}/hierarchy` - Get project hierarchy

**Phases:**
- `POST /api/v1/projects/{project_id}/phases` - Create phase
- `GET /api/v1/projects/{project_id}/phases` - List phases
- `GET /api/v1/phases/{phase_id}` - Get phase details
- `PATCH /api/v1/phases/{phase_id}` - Update phase
- `DELETE /api/v1/phases/{phase_id}` - Delete phase

**Workpackages:**
- `POST /api/v1/phases/{phase_id}/workpackages` - Create workpackage
- `GET /api/v1/phases/{phase_id}/workpackages` - List workpackages
- `GET /api/v1/workpackages/{workpackage_id}` - Get workpackage details
- `PATCH /api/v1/workpackages/{workpackage_id}` - Update workpackage
- `DELETE /api/v1/workpackages/{workpackage_id}` - Delete workpackage

**Resources:**
- `POST /api/v1/resources` - Create resource
- `GET /api/v1/resources` - List resources
- `GET /api/v1/resources/{resource_id}` - Get resource details
- `PATCH /api/v1/resources/{resource_id}` - Update resource
- `DELETE /api/v1/resources/{resource_id}` - Delete resource
- `POST /api/v1/resources/{resource_id}/allocate` - Allocate to project
- `POST /api/v1/resources/{resource_id}/assign` - Assign to task

**Departments:**
- `POST /api/v1/departments` - Create department
- `GET /api/v1/departments` - List departments
- `GET /api/v1/departments/{department_id}` - Get department details
- `PATCH /api/v1/departments/{department_id}` - Update department
- `DELETE /api/v1/departments/{department_id}` - Delete department
- `GET /api/v1/departments/{department_id}/resources` - Get department resources


# Design Document: Backend Schedule API

## 1. System Overview

### 1.1 Purpose

This document specifies the technical design for implementing a comprehensive dual-methodology project management system that supports both classic top-down (waterfall) and agile (Scrum/Kanban) approaches. The system exposes REST API endpoints for schedule calculation, project hierarchy management, sprint planning, and resource allocation, all built on Apache AGE graph database within PostgreSQL.

### 1.2 Architecture Context

The schedule API integrates multiple components:
- **SchedulerService**: OR-Tools constraint programming for schedule optimization
- **WorkItem System**: Graph-based storage for all work items (tasks, requirements, tests, risks, documents, milestones)
- **Graph Database**: Apache AGE extension for PostgreSQL providing graph capabilities
- **Frontend Components**: GanttChart (timeline visualization), KanbanBoard (workflow management)
- **Resource Management**: Graph-based resource allocation and capacity tracking
- **Sprint Management**: Agile iteration planning with velocity tracking

### 1.3 Key Design Decisions

**Decision 1: Apache AGE for Graph Database**
- **Rationale**: Unified database architecture using PostgreSQL with AGE extension instead of separate Neo4j instance
- **Trade-off**: Single database to manage vs. specialized graph database performance
- **Impact**: Simpler deployment, unified backup/recovery, ACID transactions across relational and graph data

**Decision 2: Dual Methodology Support**
- **Rationale**: Teams need flexibility to use classic waterfall, agile, or hybrid approaches
- **Trade-off**: More complex data model vs. flexibility for different team workflows
- **Impact**: Tasks can exist in both hierarchies simultaneously (Workpackage + Sprint)

**Decision 3: Automatic Backlog Population**
- **Rationale**: Reduce manual work by automatically adding ready tasks to backlog
- **Trade-off**: Automatic behavior vs. explicit user control
- **Impact**: Tasks with status="ready" automatically appear in backlog for sprint planning

**Decision 4: Critical Path Calculation**
- **Rationale**: Project managers need to identify schedule-critical tasks
- **Trade-off**: Computation overhead vs. valuable scheduling insight
- **Impact**: Longest path algorithm runs during schedule calculation, marks critical tasks

**Decision 5: Milestone Dual Modes**
- **Rationale**: Support both target-driven (manual) and task-driven (automatic) milestone scheduling
- **Trade-off**: More complex scheduling logic vs. flexibility
- **Impact**: Milestones can constrain schedules or be calculated from task completion

**Decision 6: Story Points and Hours**
- **Rationale**: Teams use different effort estimation approaches
- **Trade-off**: Dual tracking complexity vs. team preference support
- **Impact**: Velocity tracked in both story points and hours, teams choose their metric



## 2. Graph Database Schema

### 2.1 Visual Diagram: Complete Graph Relationships

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                          RxDx Graph Database Schema                                  │
│                     (Apache AGE on PostgreSQL)                                       │
└─────────────────────────────────────────────────────────────────────────────────────┘

ORGANIZATIONAL STRUCTURE:
┌──────────────┐
│   Company    │  (Root of organization)
│   (Node)     │
│              │
│ - id         │
│ - name       │
│ - description│
│ - created_at │
└──────────────┘
       │
       │ PARENT_OF
       │
       ▼
┌──────────────┐
│  Department  │
│   (Node)     │
│              │
│ - id         │
│ - name       │
│ - description│
│ - manager_id │
│ - company_id │
└──────────────┘
       │
       │ PARENT_OF (hierarchy)
       │
       ▼
┌──────────────┐
│  Department  │
│   (Child)    │
└──────────────┘
       │
       │ BELONGS_TO
       │
       ▼
┌──────────────┐
│   Resource   │
│   (Node)     │
│              │
│ - id         │
│ - name       │
│ - type       │
│ - capacity   │
│ - skills[]   │
│ - available  │
│ - dept_id    │
└──────────────┘
       │
       │ ALLOCATED_TO (Project or Task)
       │ Properties: allocation_%, lead (true/false)
       │
       ▼


CLASSIC PROJECT HIERARCHY:
┌──────────────┐
│   Project    │◄─────────────────────────────────────────────────┐
│   (Node)     │                                                   │
│              │                                                   │
│ - id         │                                                   │
│ - name       │                                                   │
│ - status     │                                                   │
│ - start_date │                                                   │
│ - end_date   │                                                   │
└──────────────┘                                                   │
       │                                                           │
       │ BELONGS_TO                                                │
       │                                                           │
       ▼                                                           │
┌──────────────┐                                                   │
│    Phase     │                                                   │
│   (Node)     │                                                   │
│              │                                                   │
│ - id         │                                                   │
│ - name       │                                                   │
│ - order      │                                                   │
│ - start_date │                                                   │
│ - end_date   │                                                   │
│ - project_id │                                                   │
└──────────────┘                                                   │
       │                                                           │
       │ BELONGS_TO                                                │
       │                                                           │
       ▼                                                           │
┌──────────────┐                                                   │
│ Workpackage  │                                                   │
│   (Node)     │                                                   │
│              │                                                   │
│ - id         │                                                   │
│ - name       │                                                   │
│ - order      │                                                   │
│ - start_date │                                                   │
│ - end_date   │                                                   │
│ - phase_id   │                                                   │
└──────────────┘                                                   │
       │                                                           │
       │ BELONGS_TO (mandatory)                                    │
       │ LINKED_TO_DEPARTMENT (optional)                           │
       │                                                           │
       ▼                                                           │
┌──────────────┐                                                   │
│     Task     │                                                   │
│   (Node)     │  *** Separate node type, not WorkItem ***        │
│              │                                                   │
│ - id         │                                                   │
│ - title      │                                                   │
│ - description│                                                   │
│ - status     │◄──────────────────────────────────────┐           │
│ - priority   │                                       │           │
│ - est_hours  │                                       │           │
│ - story_pts  │                                       │           │
│ - skills_    │  *** NEW: for resource matching ***   │           │
│   needed[]   │                                       │           │
│ - done       │                                       │           │
│ - start_date │                                       │           │
│ - end_date   │                                       │           │
│ - workpkg_id │                                       │           │
└──────────────┘                                       │           │
       │                                               │           │
       │ DEPENDS_ON (task dependencies)                │           │
       │ has_risk (to Risk nodes)                      │           │
       │ implements (to Requirement nodes)             │           │
       │ ... (other relationships)                     │           │
       │                                               │           │
       ▼                                               │           │
┌──────────────┐                                       │           │
│     Task     │                                       │           │
│   (Node)     │                                       │           │
└──────────────┘                                       │           │
       │                                               │           │
       │ ASSIGNED_TO (Resource)                        │           │
       │ Properties: allocation_%, lead (true/false)   │           │
       │                                               │           │
       ▼                                               │           │
┌──────────────┐                                       │           │
│   Resource   │                                       │           │
└──────────────┘                                       │           │
                                                       │           │
                                                       │           │
AGILE WORKFLOW:                                        │           │
┌──────────────┐                                       │           │
│   Project    │───────────────────────────────────────┘           │
└──────────────┘                                                   │
       │                                                           │
       │ BELONGS_TO                                                │
       │                                                           │
       ▼                                                           │
┌──────────────┐                                                   │
│   Backlog    │                                                   │
│   (Node)     │                                                   │
│              │                                                   │
│ - id         │                                                   │
│ - name       │                                                   │
│ - description│                                                   │
│ - project_id │                                                   │
└──────────────┘                                                   │
       ▲                                                           │
       │                                                           │
       │ IN_BACKLOG (automatic when status="ready")                │
       │ *** MUTUALLY EXCLUSIVE with ASSIGNED_TO_SPRINT ***        │
       │                                                           │
┌──────────────┐                                                   │
│     Task     │                                                   │
│   (Node)     │                                                   │
│              │                                                   │
│ - status=    │                                                   │
│   "ready"    │                                                   │
└──────────────┘                                                   │
       │                                                           │
       │ ASSIGNED_TO_SPRINT (manual assignment)                    │
       │ *** MUTUALLY EXCLUSIVE with IN_BACKLOG ***                │
       │ *** Task moves from Backlog to Sprint ***                 │
       │                                                           │
       ▼                                                           │
┌──────────────┐                                                   │
│    Sprint    │                                                   │
│   (Node)     │                                                   │
│              │                                                   │
│ - id         │                                                   │
│ - name       │                                                   │
│ - goal       │                                                   │
│ - start_date │                                                   │
│ - end_date   │                                                   │
│ - capacity_h │                                                   │
│ - capacity_sp│                                                   │
│ - velocity_h │                                                   │
│ - velocity_sp│                                                   │
│ - status     │                                                   │
│ - project_id │                                                   │
└──────────────┘                                                   │
       │                                                           │
       │ BELONGS_TO                                                │
       │                                                           │
       └───────────────────────────────────────────────────────────┘


MILESTONES:
┌──────────────┐
│  Milestone   │  *** Separate node type, not WorkItem ***
│   (Node)     │
│              │
│ - id         │
│ - title      │
│ - description│
│ - target_date│
│ - is_manual_ │
│   constraint │
│ - status     │
│ - project_id │
└──────────────┘
       │
       │ DEPENDS_ON (milestone depends on task completion)
       │
       ▼
┌──────────────┐
│     Task     │
│   (Node)     │
└──────────────┘
       │
       │ BLOCKS (task blocks milestone)
       │
       ▼
┌──────────────┐
│  Milestone   │
└──────────────┘


TASK LIFECYCLE & RELATIONSHIPS:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  1. Task Created → BELONGS_TO Workpackage (mandatory)          │
│                                                                 │
│  2. Task can have MANY relationships:                          │
│     - has_risk → Risk nodes                                    │
│     - implements → Requirement nodes                           │
│     - DEPENDS_ON → Other Task nodes                            │
│     - ASSIGNED_TO → Resource nodes (with lead flag)            │
│     - ... (other domain relationships)                         │
│                                                                 │
│  3. Status = "ready" → IN_BACKLOG (automatic)                  │
│     Task now in Backlog, ready for sprint planning             │
│                                                                 │
│  4. User assigns → ASSIGNED_TO_SPRINT (manual)                 │
│     - Removes IN_BACKLOG relationship                          │
│     - Creates ASSIGNED_TO_SPRINT relationship                  │
│     - Task now in Sprint (MUTUALLY EXCLUSIVE)                  │
│                                                                 │
│  5. Sprint ends, task incomplete:                              │
│     - Removes ASSIGNED_TO_SPRINT relationship                  │
│     - Creates IN_BACKLOG relationship (back to backlog)        │
│     OR                                                          │
│     - Creates ASSIGNED_TO_SPRINT to new sprint                 │
│                                                                 │
│  Result: Task has ONE of:                                      │
│    - IN_BACKLOG (waiting for sprint assignment)                │
│    - ASSIGNED_TO_SPRINT (actively in sprint)                   │
│    - Neither (not yet ready or completed)                      │
│                                                                 │
│  Plus MANY other relationships:                                │
│    - BELONGS_TO Workpackage (always)                           │
│    - has_risk, implements, DEPENDS_ON, etc.                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘


RESOURCE ALLOCATION PATTERNS:
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Pattern 1: Project-Level Allocation                           │
│  ┌──────────┐  ALLOCATED_TO   ┌─────────┐                     │
│  │ Resource │─────────────────>│ Project │                     │
│  └──────────┘  (allocation_%,  └─────────┘                     │
│                 lead=true/false)                                │
│                                                                 │
│  - Resource available to all tasks in project                  │
│  - Scheduler assigns based on skills_needed match              │
│  - Lead resources prioritized for assignment                   │
│                                                                 │
│  Pattern 2: Task-Level Allocation                              │
│  ┌──────────┐  ALLOCATED_TO   ┌──────┐                        │
│  │ Resource │─────────────────>│ Task │                        │
│  └──────────┘  (allocation_%,  └──────┘                        │
│                 lead=true/false)                                │
│                                                                 │
│  - Resource explicitly assigned to specific task               │
│  - Lead resource is primary owner/responsible                  │
│  - Non-lead resources are supporting/collaborating             │
│                                                                 │
│  Pattern 3: Department-Based Allocation                        │
│  ┌─────────────┐  LINKED_TO_DEPARTMENT  ┌────────────┐        │
│  │ Workpackage │───────────────────────>│ Department │        │
│  └─────────────┘                        └────────────┘        │
│                                                │                │
│                                         BELONGS_TO             │
│                                                │                │
│                                                ▼                │
│                                         ┌──────────┐           │
│                                         │ Resource │           │
│                                         └──────────┘           │
│                                                                 │
│  - Workpackage linked to department                            │
│  - Resources from that department allocated to tasks           │
│  - Scheduler matches skills_needed with resource skills        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```



### 2.2 Node Types and Properties

#### 2.2.1 Company Node (NEW)
```python
{
    "label": "Company",
    "properties": {
        "id": "UUID",
        "name": "string",
        "description": "string",
        "created_at": "ISO8601 datetime",
        "updated_at": "ISO8601 datetime"
    }
}
```

#### 2.2.2 Department Node (UPDATED)
```python
{
    "label": "Department",
    "properties": {
        "id": "UUID",
        "name": "string",
        "description": "string",
        "manager_user_id": "UUID",  # PostgreSQL user reference
        "company_id": "UUID",  # Reference to Company node
        "created_at": "ISO8601 datetime"
    }
}
```

#### 2.2.3 Resource Node (UPDATED)
```python
{
    "label": "Resource",
    "properties": {
        "id": "UUID",
        "name": "string",
        "type": "person|machine|equipment|facility|other",
        "capacity": "float",  # Hours per week
        "department_id": "UUID",
        "skills": "array[string]",  # For person type, used for skill matching
        "availability": "available|unavailable|limited",
        "created_at": "ISO8601 datetime"
    }
}
```

#### 2.2.4 Project Node
```python
{
    "label": "Project",
    "properties": {
        "id": "UUID",
        "name": "string",
        "description": "string",
        "status": "active|completed|archived",
        "start_date": "ISO8601 datetime",
        "end_date": "ISO8601 datetime",
        "created_at": "ISO8601 datetime",
        "updated_at": "ISO8601 datetime",
        "created_by_user_id": "UUID"  # PostgreSQL user reference
    }
}
```

#### 2.2.5 Phase Node
```python
{
    "label": "Phase",
    "properties": {
        "id": "UUID",
        "name": "string",
        "description": "string",
        "order": "integer",  # Sequence within project
        "start_date": "ISO8601 datetime",
        "end_date": "ISO8601 datetime",
        "project_id": "UUID",  # For quick lookup
        "created_at": "ISO8601 datetime"
    }
}
```

#### 2.2.6 Workpackage Node
```python
{
    "label": "Workpackage",
    "properties": {
        "id": "UUID",
        "name": "string",
        "description": "string",
        "order": "integer",  # Sequence within phase
        "start_date": "ISO8601 datetime",
        "end_date": "ISO8601 datetime",
        "phase_id": "UUID",  # For quick lookup
        "created_at": "ISO8601 datetime"
    }
}
```

#### 2.2.7 Task Node (UPDATED - Separate from WorkItem)
```python
{
    "label": "Task",  # NOT WorkItem - separate node type
    "properties": {
        "id": "UUID",
        "title": "string",
        "description": "string",
        "status": "draft|ready|active|completed|blocked",
        "priority": "integer (1-5)",
        "estimated_hours": "float",
        "actual_hours": "float",
        "story_points": "integer",
        "skills_needed": "array[string]",  # NEW: for resource matching
        "done": "boolean",  # Completion flag
        "start_date": "ISO8601 datetime",  # From schedule
        "end_date": "ISO8601 datetime",  # From schedule
        "due_date": "ISO8601 datetime",  # Deadline constraint
        "workpackage_id": "UUID",  # For quick lookup
        "version": "string",
        "created_by": "UUID",
        "created_at": "ISO8601 datetime",
        "updated_at": "ISO8601 datetime",
        "is_signed": "boolean"
    }
}
```

**Note**: Task is a separate node type (label="Task"), not a WorkItem with type="task". This maintains compatibility with existing code while providing clearer graph semantics. The WorkItem service can query Task nodes using `MATCH (t:Task)` instead of `MATCH (w:WorkItem WHERE w.type='task')`.

#### 2.2.8 Milestone Node (UPDATED - Separate from WorkItem)
```python
{
    "label": "Milestone",  # NOT WorkItem - separate node type
    "properties": {
        "id": "UUID",
        "title": "string",
        "description": "string",
        "target_date": "ISO8601 datetime",
        "is_manual_constraint": "boolean",  # true = use target_date as constraint
        "completion_criteria": "string",
        "status": "draft|active|completed",
        "project_id": "UUID",
        "version": "string",
        "created_by": "UUID",
        "created_at": "ISO8601 datetime",
        "updated_at": "ISO8601 datetime"
    }
}
```

**Note**: Milestone is a separate node type (label="Milestone"), not a WorkItem with type="milestone". This provides clearer graph semantics and better query performance.

#### 2.2.9 Backlog Node
```python
{
    "label": "Backlog",
    "properties": {
        "id": "UUID",
        "name": "string",
        "description": "string",
        "project_id": "UUID",
        "created_at": "ISO8601 datetime"
    }
}
```

#### 2.2.10 Sprint Node
```python
{
    "label": "Sprint",
    "properties": {
        "id": "UUID",
        "name": "string",
        "goal": "string",
        "start_date": "ISO8601 datetime",
        "end_date": "ISO8601 datetime",
        "capacity_hours": "float",  # Calculated from resources
        "capacity_story_points": "integer",  # Team capacity
        "actual_velocity_hours": "float",  # Completed work
        "actual_velocity_story_points": "integer",  # Completed work
        "status": "planning|active|completed",
        "project_id": "UUID",
        "created_at": "ISO8601 datetime"
    }
}
```



### 2.3 Relationship Types

#### 2.3.1 BELONGS_TO
- **From**: Phase, Workpackage, Task, Sprint, Backlog, Resource
- **To**: Project, Phase, Workpackage, Department
- **Properties**: None
- **Purpose**: Hierarchical structure

#### 2.3.2 DEPENDS_ON
- **From**: Task, Milestone
- **To**: Task
- **Properties**: 
  ```python
  {
      "dependency_type": "finish-to-start|start-to-start|finish-to-finish",
      "lag": "integer (days)"
  }
  ```
- **Purpose**: Task dependencies and milestone dependencies

#### 2.3.3 BLOCKS
- **From**: Task
- **To**: Milestone
- **Properties**: None
- **Purpose**: Inverse of DEPENDS_ON for milestone tracking

#### 2.3.4 IN_BACKLOG (UPDATED)
- **From**: Task
- **To**: Backlog
- **Properties**:
  ```python
  {
      "added_at": "ISO8601 datetime",
      "priority_order": "integer"
  }
  ```
- **Purpose**: Task in backlog (MUTUALLY EXCLUSIVE with ASSIGNED_TO_SPRINT)
- **Constraint**: A task can have IN_BACKLOG OR ASSIGNED_TO_SPRINT, never both
- **Behavior**: Automatic creation when task status="ready", removed when assigned to sprint

#### 2.3.5 ASSIGNED_TO_SPRINT (UPDATED)
- **From**: Task
- **To**: Sprint
- **Properties**:
  ```python
  {
      "assigned_at": "ISO8601 datetime",
      "assigned_by_user_id": "UUID"
  }
  ```
- **Purpose**: Task assigned to sprint (MUTUALLY EXCLUSIVE with IN_BACKLOG)
- **Constraint**: A task can have ASSIGNED_TO_SPRINT OR IN_BACKLOG, never both
- **Behavior**: Manual assignment, removes IN_BACKLOG relationship

#### 2.3.6 ASSIGNED_TO (Deprecated - Use ALLOCATED_TO)
- **From**: Task
- **To**: Resource
- **Properties**:
  ```python
  {
      "assigned_at": "ISO8601 datetime",
      "allocation_percentage": "float"
  }
  ```
- **Purpose**: Resource assignment to tasks (legacy, use ALLOCATED_TO instead)

#### 2.3.7 ALLOCATED_TO (UPDATED)
- **From**: Resource
- **To**: Project OR Task
- **Properties**:
  ```python
  {
      "allocation_percentage": "float",
      "lead": "boolean",  # NEW: true = lead/primary, false = supporting
      "start_date": "ISO8601 datetime",
      "end_date": "ISO8601 datetime"
  }
  ```
- **Purpose**: Resource allocation with lead designation
- **Patterns**:
  - **Project-level**: Resource available to all tasks, scheduler assigns based on skills
  - **Task-level**: Resource explicitly assigned, lead = primary owner
  - **Lead flag**: Identifies primary responsible resource vs. supporting resources

#### 2.3.8 PARENT_OF
- **From**: Department, Company
- **To**: Department
- **Properties**: None
- **Purpose**: Hierarchical department structure and company-department relationship

#### 2.3.9 LINKED_TO_DEPARTMENT (NEW)
- **From**: Workpackage
- **To**: Department
- **Properties**: None
- **Purpose**: Link workpackage to department for resource allocation

#### 2.3.10 has_risk (NEW)
- **From**: Task
- **To**: Risk (WorkItem)
- **Properties**: None
- **Purpose**: Task has associated risk

#### 2.3.11 implements (NEW)
- **From**: Task
- **To**: Requirement (WorkItem)
- **Properties**: None
- **Purpose**: Task implements requirement

#### 2.3.12 NEXT_VERSION
- **From**: WorkItem, Task, Milestone
- **To**: WorkItem, Task, Milestone (same node, different version)
- **Properties**:
  ```python
  {
      "from_version": "string",
      "to_version": "string",
      "created_at": "ISO8601 datetime"
  }
  ```
- **Purpose**: Version history tracking



## 3. Core Algorithms

### 3.1 Critical Path Calculation

The critical path is the longest sequence of dependent tasks that determines the minimum project duration.

**Algorithm: Longest Path Through DAG**

```python
def calculate_critical_path(
    tasks: list[ScheduledTask],
    dependencies: list[TaskDependency]
) -> list[str]:
    """
    Calculate critical path using longest path algorithm.
    
    Args:
        tasks: List of scheduled tasks with start/end dates
        dependencies: List of task dependencies
    
    Returns:
        List of task IDs on the critical path
    """
    # Build adjacency list and calculate task durations
    graph = {}
    durations = {}
    in_degree = {}
    
    for task in tasks:
        task_id = task.task_id
        graph[task_id] = []
        durations[task_id] = (task.end_date - task.start_date).total_seconds() / 3600
        in_degree[task_id] = 0
    
    # Build dependency graph
    for dep in dependencies:
        graph[dep.from_task_id].append(dep.to_task_id)
        in_degree[dep.to_task_id] += 1
    
    # Topological sort with longest path calculation
    queue = [task_id for task_id in in_degree if in_degree[task_id] == 0]
    longest_path = {task_id: 0 for task_id in graph}
    predecessor = {task_id: None for task_id in graph}
    
    while queue:
        current = queue.pop(0)
        current_path_length = longest_path[current] + durations[current]
        
        for neighbor in graph[current]:
            # Update longest path if we found a longer one
            if current_path_length > longest_path[neighbor]:
                longest_path[neighbor] = current_path_length
                predecessor[neighbor] = current
            
            in_degree[neighbor] -= 1
            if in_degree[neighbor] == 0:
                queue.append(neighbor)
    
    # Find the task with the longest path (project end)
    end_task = max(longest_path, key=longest_path.get)
    
    # Backtrack to find the critical path
    critical_path = []
    current = end_task
    while current is not None:
        critical_path.insert(0, current)
        current = predecessor[current]
    
    return critical_path
```

**Complexity**: O(V + E) where V = number of tasks, E = number of dependencies

**Integration**: Called after schedule calculation, results stored in schedule response



### 3.2 Automatic Backlog Population

Tasks automatically move to backlog when their status changes to "ready".

**Algorithm: Status Change Trigger**

```python
async def update_task_status(
    task_id: UUID,
    new_status: str,
    workitem_service: WorkItemService,
    graph_service: GraphService
) -> None:
    """
    Update task status and handle automatic backlog population.
    
    Args:
        task_id: Task UUID
        new_status: New status value
        workitem_service: WorkItem service instance
        graph_service: Graph service instance
    """
    # Update task status
    await workitem_service.update_workitem(
        workitem_id=task_id,
        updates=WorkItemUpdate(status=new_status),
        change_description=f"Status changed to {new_status}"
    )
    
    # If status is "ready", add to backlog automatically
    if new_status == "ready":
        # Get task's project
        task = await workitem_service.get_workitem(task_id)
        project_id = await get_task_project(task_id, graph_service)
        
        # Get or create project backlog
        backlog = await get_or_create_backlog(project_id, graph_service)
        
        # Check if task is already in backlog
        existing_rel = await graph_service.get_relationship(
            from_id=str(task_id),
            to_id=backlog["id"],
            rel_type="IN_BACKLOG"
        )
        
        if not existing_rel:
            # Create IN_BACKLOG relationship
            await graph_service.create_relationship(
                from_id=str(task_id),
                to_id=backlog["id"],
                rel_type="IN_BACKLOG",
                properties={
                    "added_at": datetime.now(UTC).isoformat(),
                    "priority_order": task.priority or 3
                }
            )
            
            logger.info(
                "Task automatically added to backlog",
                task_id=str(task_id),
                backlog_id=backlog["id"],
                status=new_status
            )
```

**Trigger Points**:
1. Task status update via API
2. Task creation with status="ready"
3. Bulk status updates

**Removal from Backlog**:
- Manual removal via API
- Automatic removal when assigned to sprint (optional, configurable)
- Status change from "ready" to other status



### 3.3 Sprint Capacity Calculation

Sprint capacity is automatically calculated from assigned resources and their availability.

**Algorithm: Resource-Based Capacity**

```python
async def calculate_sprint_capacity(
    sprint_id: UUID,
    graph_service: GraphService
) -> dict[str, float]:
    """
    Calculate sprint capacity based on assigned resources.
    
    Args:
        sprint_id: Sprint UUID
        graph_service: Graph service instance
    
    Returns:
        Dictionary with capacity_hours and capacity_story_points
    """
    # Get sprint details
    sprint = await graph_service.get_node(str(sprint_id))
    start_date = datetime.fromisoformat(sprint["start_date"])
    end_date = datetime.fromisoformat(sprint["end_date"])
    
    # Calculate sprint duration in working days
    sprint_days = (end_date - start_date).days
    working_days = sprint_days * 5 / 7  # Assume 5-day work week
    
    # Get all resources allocated to the sprint's project
    project_id = sprint["project_id"]
    resources = await graph_service.execute_query(f"""
        MATCH (r:Resource)-[alloc:ALLOCATED_TO]->(p:Project {{id: '{project_id}'}})
        WHERE r.availability = 'available'
        RETURN r, alloc.allocation_percentage as allocation
    """)
    
    total_capacity_hours = 0.0
    
    for resource_data in resources:
        resource = resource_data["r"]
        allocation_pct = resource_data["allocation"] / 100.0
        
        # Calculate available hours for this resource
        # capacity is hours per week
        weekly_capacity = resource["capacity"]
        sprint_weeks = working_days / 5
        resource_hours = weekly_capacity * sprint_weeks * allocation_pct
        
        total_capacity_hours += resource_hours
    
    # Calculate story point capacity based on historical velocity
    # (This would use team's average velocity from previous sprints)
    avg_velocity = await get_team_average_velocity(project_id, graph_service)
    capacity_story_points = avg_velocity if avg_velocity else 0
    
    return {
        "capacity_hours": total_capacity_hours,
        "capacity_story_points": capacity_story_points
    }
```

**Factors Considered**:
- Resource capacity (hours per week)
- Resource allocation percentage to project
- Resource availability status
- Sprint duration (working days)
- Historical team velocity (for story points)

**Update Triggers**:
- Sprint creation
- Resource allocation changes
- Sprint date changes



### 3.4 Velocity Tracking

Track team velocity across sprints for planning and forecasting.

**Algorithm: Historical Velocity Calculation**

```python
async def calculate_sprint_velocity(
    sprint_id: UUID,
    graph_service: GraphService
) -> dict[str, float]:
    """
    Calculate actual velocity for a completed sprint.
    
    Args:
        sprint_id: Sprint UUID
        graph_service: Graph service instance
    
    Returns:
        Dictionary with velocity_hours and velocity_story_points
    """
    # Get all completed tasks in the sprint
    completed_tasks = await graph_service.execute_query(f"""
        MATCH (t:WorkItem)-[r:ASSIGNED_TO_SPRINT]->(s:Sprint {{id: '{sprint_id}'}})
        WHERE t.type = 'task' AND t.done = true
        RETURN t.actual_hours as hours, t.story_points as points
    """)
    
    total_hours = sum(task["hours"] or 0 for task in completed_tasks)
    total_points = sum(task["points"] or 0 for task in completed_tasks)
    
    return {
        "velocity_hours": total_hours,
        "velocity_story_points": total_points
    }


async def get_team_average_velocity(
    project_id: UUID,
    graph_service: GraphService,
    num_sprints: int = 3
) -> float:
    """
    Calculate team's average velocity from recent sprints.
    
    Args:
        project_id: Project UUID
        graph_service: Graph service instance
        num_sprints: Number of recent sprints to average
    
    Returns:
        Average story points per sprint
    """
    # Get recent completed sprints
    sprints = await graph_service.execute_query(f"""
        MATCH (s:Sprint)-[:BELONGS_TO]->(p:Project {{id: '{project_id}'}})
        WHERE s.status = 'completed'
        RETURN s.actual_velocity_story_points as velocity
        ORDER BY s.end_date DESC
        LIMIT {num_sprints}
    """)
    
    if not sprints:
        return 0.0
    
    velocities = [s["velocity"] for s in sprints if s["velocity"]]
    return sum(velocities) / len(velocities) if velocities else 0.0
```

**Velocity Metrics**:
- **Actual Velocity**: Completed work in a sprint (hours and story points)
- **Average Velocity**: Mean of last N sprints (default N=3)
- **Velocity Trend**: Increasing, stable, or decreasing
- **Capacity vs Velocity**: Planned capacity vs actual completion

**Usage**:
- Sprint planning: Recommend tasks based on average velocity
- Forecasting: Estimate completion dates for backlog
- Team performance: Track velocity trends over time



### 3.5 Milestone Scheduling Modes

Milestones support two scheduling modes: manual constraint and automatic calculation.

**Algorithm: Dual-Mode Milestone Scheduling**

```python
async def schedule_with_milestones(
    tasks: list[ScheduleTaskCreate],
    milestones: list[Milestone],
    constraints: ScheduleConstraints
) -> ScheduleResponse:
    """
    Schedule tasks considering milestone constraints.
    
    Args:
        tasks: Tasks to schedule
        milestones: Milestones with dependencies
        constraints: Schedule constraints
    
    Returns:
        Schedule response with task dates and milestone dates
    """
    # Separate manual and automatic milestones
    manual_milestones = [m for m in milestones if m.is_manual_constraint]
    auto_milestones = [m for m in milestones if not m.is_manual_constraint]
    
    # Add manual milestone constraints to scheduler
    for milestone in manual_milestones:
        # Get all tasks that block this milestone
        blocking_tasks = await get_milestone_dependencies(milestone.id)
        
        # Add constraint: all blocking tasks must finish before milestone target_date
        for task in blocking_tasks:
            constraints.add_deadline(
                task_id=task.id,
                deadline=milestone.target_date,
                reason=f"Milestone '{milestone.title}' target date"
            )
    
    # Run schedule calculation with constraints
    schedule = await scheduler_service.schedule_project(
        tasks=tasks,
        constraints=constraints
    )
    
    if schedule.status != "success":
        return schedule
    
    # Calculate automatic milestone dates from completed task dates
    milestone_dates = {}
    for milestone in auto_milestones:
        # Get all tasks that block this milestone
        blocking_tasks = await get_milestone_dependencies(milestone.id)
        
        if blocking_tasks:
            # Milestone date is the latest end date of blocking tasks
            latest_end = max(
                task.end_date for task in schedule.schedule
                if task.task_id in [t.id for t in blocking_tasks]
            )
            milestone_dates[milestone.id] = latest_end
        else:
            # No dependencies, use target_date if set
            milestone_dates[milestone.id] = milestone.target_date
    
    # Add milestones to schedule response
    schedule.milestones = [
        ScheduledMilestone(
            milestone_id=m.id,
            title=m.title,
            date=milestone_dates.get(m.id, m.target_date),
            is_manual=m.is_manual_constraint
        )
        for m in milestones
    ]
    
    return schedule
```

**Mode Selection**:
- **Manual Mode** (`is_manual_constraint=true`): 
  - Use `target_date` as hard constraint
  - All dependent tasks must complete before target_date
  - Scheduler treats it like a deadline
  
- **Automatic Mode** (`is_manual_constraint=false`):
  - Calculate milestone date from dependent tasks
  - Milestone date = max(dependent_task.end_date)
  - No constraint on scheduling

**Conflict Detection**:
- If manual milestone target_date cannot be met, report conflict
- Suggest either: extend target_date or reduce task durations



### 3.6 Burndown Chart Calculation

Generate burndown data for sprint progress tracking.

**Algorithm: Daily Remaining Work**

```python
async def calculate_burndown(
    sprint_id: UUID,
    graph_service: GraphService
) -> list[BurndownPoint]:
    """
    Calculate burndown chart data for a sprint.
    
    Args:
        sprint_id: Sprint UUID
        graph_service: Graph service instance
    
    Returns:
        List of burndown points (date, remaining_hours, remaining_points)
    """
    # Get sprint details
    sprint = await graph_service.get_node(str(sprint_id))
    start_date = datetime.fromisoformat(sprint["start_date"])
    end_date = datetime.fromisoformat(sprint["end_date"])
    
    # Get all tasks in sprint
    tasks = await graph_service.execute_query(f"""
        MATCH (t:WorkItem)-[:ASSIGNED_TO_SPRINT]->(s:Sprint {{id: '{sprint_id}'}})
        WHERE t.type = 'task'
        RETURN t
    """)
    
    # Calculate total work
    total_hours = sum(t["estimated_hours"] or 0 for t in tasks)
    total_points = sum(t["story_points"] or 0 for t in tasks)
    
    # Generate ideal burndown line
    sprint_days = (end_date - start_date).days
    ideal_burndown = []
    for day in range(sprint_days + 1):
        date = start_date + timedelta(days=day)
        remaining_pct = 1 - (day / sprint_days)
        ideal_burndown.append(BurndownPoint(
            date=date,
            ideal_remaining_hours=total_hours * remaining_pct,
            ideal_remaining_points=total_points * remaining_pct
        ))
    
    # Calculate actual burndown from task completion history
    # (This would query task journal entries or completion timestamps)
    actual_burndown = []
    current_date = start_date
    
    while current_date <= min(end_date, datetime.now(UTC)):
        # Get tasks completed by this date
        completed_by_date = await graph_service.execute_query(f"""
            MATCH (t:WorkItem)-[:ASSIGNED_TO_SPRINT]->(s:Sprint {{id: '{sprint_id}'}})
            WHERE t.type = 'task' 
              AND t.done = true 
              AND t.updated_at <= '{current_date.isoformat()}'
            RETURN t.estimated_hours as hours, t.story_points as points
        """)
        
        completed_hours = sum(t["hours"] or 0 for t in completed_by_date)
        completed_points = sum(t["points"] or 0 for t in completed_by_date)
        
        actual_burndown.append(BurndownPoint(
            date=current_date,
            actual_remaining_hours=total_hours - completed_hours,
            actual_remaining_points=total_points - completed_points
        ))
        
        current_date += timedelta(days=1)
    
    # Merge ideal and actual burndown
    burndown_data = []
    for ideal, actual in zip(ideal_burndown, actual_burndown):
        burndown_data.append(BurndownPoint(
            date=ideal.date,
            ideal_remaining_hours=ideal.ideal_remaining_hours,
            ideal_remaining_points=ideal.ideal_remaining_points,
            actual_remaining_hours=actual.actual_remaining_hours,
            actual_remaining_points=actual.actual_remaining_points
        ))
    
    return burndown_data
```

**Burndown Metrics**:
- **Ideal Line**: Linear decrease from total work to zero
- **Actual Line**: Real progress based on task completion
- **Scope Change**: Track added/removed work during sprint
- **Trend**: On track, ahead, or behind schedule



## 4. API Endpoints

### 4.1 Schedule Management

#### POST /api/v1/schedule/calculate
Calculate optimized project schedule with critical path.

**Request**:
```json
{
  "project_id": "uuid",
  "task_ids": ["task-uuid-1", "task-uuid-2"],
  "milestone_ids": ["milestone-uuid-1"],
  "resource_ids": ["resource-uuid-1"],
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
  "project_id": "uuid",
  "schedule": [
    {
      "task_id": "uuid",
      "start_date": "2024-01-01T09:00:00Z",
      "end_date": "2024-01-05T17:00:00Z",
      "is_critical": true
    }
  ],
  "critical_path": ["task-uuid-1", "task-uuid-3"],
  "milestones": [
    {
      "milestone_id": "uuid",
      "date": "2024-02-01T00:00:00Z",
      "is_manual": true
    }
  ]
}
```

#### GET /api/v1/schedule/{project_id}
Retrieve current schedule for a project.

#### GET /api/v1/schedule/{project_id}/gantt
Get Gantt chart data with critical path and milestones.

#### GET /api/v1/schedule/{project_id}/statistics
Get schedule metrics and health indicators.



### 4.2 Backlog Management

#### POST /api/v1/projects/{project_id}/backlogs
Create a backlog for a project.

**Request**:
```json
{
  "name": "Product Backlog",
  "description": "Main backlog for project"
}
```

#### GET /api/v1/backlogs/{backlog_id}/tasks
List tasks in backlog, ordered by priority.

**Response**:
```json
{
  "backlog_id": "uuid",
  "tasks": [
    {
      "task_id": "uuid",
      "title": "Implement feature X",
      "priority": 5,
      "estimated_hours": 8,
      "story_points": 3,
      "added_at": "2024-01-01T10:00:00Z"
    }
  ],
  "total_count": 25
}
```

#### DELETE /api/v1/backlogs/{backlog_id}/tasks/{task_id}
Remove task from backlog (manual removal).

### 4.3 Sprint Management

#### POST /api/v1/projects/{project_id}/sprints
Create a new sprint.

**Request**:
```json
{
  "name": "Sprint 1",
  "goal": "Complete user authentication",
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-01-14T23:59:59Z"
}
```

**Response** (includes calculated capacity):
```json
{
  "sprint_id": "uuid",
  "name": "Sprint 1",
  "capacity_hours": 320.0,
  "capacity_story_points": 25,
  "status": "planning"
}
```

#### POST /api/v1/sprints/{sprint_id}/tasks/{task_id}
Assign task from backlog to sprint (manual assignment).

#### POST /api/v1/sprints/{sprint_id}/start
Start a sprint (change status to "active").

#### POST /api/v1/sprints/{sprint_id}/complete
Complete a sprint and calculate velocity.

**Response**:
```json
{
  "sprint_id": "uuid",
  "status": "completed",
  "actual_velocity_hours": 280.0,
  "actual_velocity_story_points": 22,
  "completion_percentage": 87.5
}
```

#### GET /api/v1/sprints/{sprint_id}/velocity
Get sprint velocity and historical average.

**Response**:
```json
{
  "sprint_velocity_hours": 280.0,
  "sprint_velocity_story_points": 22,
  "team_average_velocity_hours": 290.0,
  "team_average_velocity_story_points": 24,
  "velocity_trend": "stable"
}
```

#### GET /api/v1/sprints/{sprint_id}/burndown
Get burndown chart data.

**Response**:
```json
{
  "sprint_id": "uuid",
  "burndown_data": [
    {
      "date": "2024-01-01",
      "ideal_remaining_hours": 320.0,
      "actual_remaining_hours": 320.0,
      "ideal_remaining_points": 25,
      "actual_remaining_points": 25
    },
    {
      "date": "2024-01-02",
      "ideal_remaining_hours": 297.0,
      "actual_remaining_hours": 304.0,
      "ideal_remaining_points": 23,
      "actual_remaining_points": 24
    }
  ]
}
```



### 4.4 Milestone Management

#### POST /api/v1/projects/{project_id}/milestones
Create a milestone.

**Request**:
```json
{
  "title": "MVP Release",
  "description": "Minimum viable product ready for beta testing",
  "target_date": "2024-06-01T00:00:00Z",
  "is_manual_constraint": true,
  "completion_criteria": "All core features implemented and tested"
}
```

#### POST /api/v1/milestones/{milestone_id}/dependencies/{task_id}
Add task dependency to milestone (task must complete before milestone).

#### GET /api/v1/milestones/{milestone_id}
Get milestone details with dependencies and calculated/target date.

**Response**:
```json
{
  "milestone_id": "uuid",
  "title": "MVP Release",
  "target_date": "2024-06-01T00:00:00Z",
  "calculated_date": "2024-05-28T00:00:00Z",
  "is_manual_constraint": true,
  "status": "active",
  "dependent_tasks": [
    {
      "task_id": "uuid",
      "title": "Complete authentication",
      "end_date": "2024-05-15T00:00:00Z"
    }
  ],
  "is_achievable": true
}
```

### 4.5 Project Hierarchy Management

#### POST /api/v1/projects
Create a project.

#### POST /api/v1/projects/{project_id}/phases
Create a phase within a project.

#### POST /api/v1/phases/{phase_id}/workpackages
Create a workpackage within a phase.

#### GET /api/v1/projects/{project_id}/hierarchy
Get complete project hierarchy.

**Response**:
```json
{
  "project": {
    "id": "uuid",
    "name": "Medical Device Development",
    "phases": [
      {
        "id": "uuid",
        "name": "Planning",
        "order": 1,
        "workpackages": [
          {
            "id": "uuid",
            "name": "Requirements Gathering",
            "order": 1,
            "tasks": [
              {
                "id": "uuid",
                "title": "Define user needs",
                "status": "completed"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### 4.6 Resource Management

#### POST /api/v1/resources
Create a resource.

**Request**:
```json
{
  "name": "John Doe",
  "type": "person",
  "capacity": 40.0,
  "department_id": "uuid",
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "availability": "available"
}
```

#### POST /api/v1/resources/{resource_id}/allocate
Allocate resource to project.

**Request**:
```json
{
  "project_id": "uuid",
  "allocation_percentage": 75.0,
  "start_date": "2024-01-01T00:00:00Z",
  "end_date": "2024-12-31T23:59:59Z"
}
```

#### GET /api/v1/resources/{resource_id}/utilization
Get resource utilization metrics.

**Response**:
```json
{
  "resource_id": "uuid",
  "name": "John Doe",
  "capacity": 40.0,
  "allocated_hours": 30.0,
  "utilization_percentage": 75.0,
  "allocations": [
    {
      "project_id": "uuid",
      "project_name": "Project A",
      "allocation_percentage": 50.0
    }
  ]
}
```



## 5. Service Layer Design

### 5.1 Service Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  (FastAPI Routers: schedule, projects, sprints, milestones)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Service Layer                                │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ ScheduleAPI      │  │ SprintService    │  │ MilestoneServ │ │
│  │ Service          │  │                  │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│           │                     │                     │          │
│           ▼                     ▼                     ▼          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ ProjectService   │  │ BacklogService   │  │ ResourceServ  │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Core Services                                 │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ SchedulerService │  │ WorkItemService  │  │ VersionServ   │ │
│  │ (OR-Tools)       │  │                  │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Data Layer                                     │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ GraphService     │  │ PostgreSQL       │                    │
│  │ (Apache AGE)     │  │ (Users, Audit)   │                    │
│  └──────────────────┘  └──────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Key Service Classes

#### 5.2.1 ScheduleAPIService

Orchestrates schedule calculation with critical path and milestone handling.

```python
class ScheduleAPIService:
    """Main service for schedule operations"""
    
    def __init__(
        self,
        scheduler_service: SchedulerService,
        workitem_service: WorkItemService,
        milestone_service: MilestoneService,
        graph_service: GraphService
    ):
        self.scheduler = scheduler_service
        self.workitem_service = workitem_service
        self.milestone_service = milestone_service
        self.graph_service = graph_service
    
    async def calculate_schedule(
        self,
        request: ScheduleCalculateRequest,
        user_id: UUID
    ) -> ScheduleResponse:
        """Calculate schedule with critical path and milestones"""
        # 1. Fetch tasks and milestones
        # 2. Apply milestone constraints
        # 3. Call SchedulerService
        # 4. Calculate critical path
        # 5. Calculate milestone dates
        # 6. Update WorkItem dates
        # 7. Return response
```

#### 5.2.2 SprintService

Manages sprint lifecycle, capacity, and velocity.

```python
class SprintService:
    """Service for sprint management"""
    
    async def create_sprint(
        self,
        project_id: UUID,
        sprint_data: SprintCreate
    ) -> SprintResponse:
        """Create sprint and calculate capacity"""
        # 1. Create Sprint node
        # 2. Calculate capacity from resources
        # 3. Return sprint with capacity
    
    async def assign_task_to_sprint(
        self,
        sprint_id: UUID,
        task_id: UUID
    ) -> None:
        """Manually assign task from backlog to sprint"""
        # 1. Verify task is in backlog
        # 2. Create ASSIGNED_TO_SPRINT relationship
        # 3. Optionally remove from backlog
    
    async def complete_sprint(
        self,
        sprint_id: UUID
    ) -> SprintVelocity:
        """Complete sprint and calculate velocity"""
        # 1. Calculate actual velocity
        # 2. Update sprint status
        # 3. Return velocity metrics
```

#### 5.2.3 BacklogService

Manages backlog and automatic population.

```python
class BacklogService:
    """Service for backlog management"""
    
    async def add_task_to_backlog(
        self,
        task_id: UUID,
        backlog_id: UUID
    ) -> None:
        """Add task to backlog (automatic or manual)"""
        # 1. Create IN_BACKLOG relationship
        # 2. Set priority order
    
    async def get_backlog_tasks(
        self,
        backlog_id: UUID,
        order_by: str = "priority"
    ) -> list[TaskResponse]:
        """Get tasks in backlog, ordered"""
        # 1. Query tasks with IN_BACKLOG relationship
        # 2. Order by priority or other criteria
        # 3. Return task list
```

#### 5.2.4 MilestoneService

Manages milestones and dependencies.

```python
class MilestoneService:
    """Service for milestone management"""
    
    async def create_milestone(
        self,
        project_id: UUID,
        milestone_data: MilestoneCreate
    ) -> MilestoneResponse:
        """Create milestone node"""
        # 1. Create WorkItem with type="milestone"
        # 2. Set is_manual_constraint flag
        # 3. Return milestone
    
    async def add_dependency(
        self,
        milestone_id: UUID,
        task_id: UUID
    ) -> None:
        """Add task dependency to milestone"""
        # 1. Create DEPENDS_ON relationship
        # 2. Create inverse BLOCKS relationship
    
    async def calculate_milestone_date(
        self,
        milestone_id: UUID
    ) -> datetime:
        """Calculate milestone date from dependencies"""
        # 1. Get all dependent tasks
        # 2. Find latest task end_date
        # 3. Return as milestone date
```



## 6. Data Flow Examples

### 6.1 Task Lifecycle: Creation to Sprint Completion

```
1. Task Created
   ├─> Create WorkItem node (type="task", status="draft")
   └─> Create BELONGS_TO relationship to Workpackage (mandatory)

2. Task Ready for Work
   ├─> Update status to "ready"
   └─> AUTOMATIC: Create IN_BACKLOG relationship
       └─> Task now appears in project backlog

3. Sprint Planning
   ├─> User selects task from backlog
   ├─> MANUAL: Create ASSIGNED_TO_SPRINT relationship
   └─> Task now in: Workpackage + Backlog + Sprint

4. Task Assigned to Resource
   ├─> Create ASSIGNED_TO relationship to Resource
   └─> Resource utilization updated

5. Schedule Calculation
   ├─> Scheduler considers:
   │   ├─> Workpackage hierarchy
   │   ├─> Sprint boundaries (start_date, end_date)
   │   ├─> Resource capacity
   │   └─> Task dependencies
   ├─> Calculate start_date and end_date
   ├─> Calculate critical path
   └─> Update task with schedule dates

6. Task Completed
   ├─> Update status to "completed"
   ├─> Set done = true
   ├─> Record actual_hours
   └─> Sprint velocity updated
```

### 6.2 Sprint Planning Flow

```
1. Create Sprint
   ├─> Create Sprint node
   ├─> Calculate capacity from allocated resources
   │   └─> Query: MATCH (r:Resource)-[:ALLOCATED_TO]->(p:Project)
   └─> Return sprint with capacity_hours and capacity_story_points

2. View Backlog
   ├─> Query: MATCH (t:Task)-[:IN_BACKLOG]->(b:Backlog)
   ├─> Order by priority
   └─> Display available tasks

3. Assign Tasks to Sprint
   ├─> For each selected task:
   │   ├─> Create ASSIGNED_TO_SPRINT relationship
   │   └─> Check capacity not exceeded
   └─> Update sprint task count

4. Start Sprint
   ├─> Update sprint status to "active"
   └─> Lock sprint scope (no more task additions)

5. During Sprint
   ├─> Tasks move through Kanban columns (status updates)
   ├─> Burndown chart updated daily
   └─> Velocity tracked

6. Complete Sprint
   ├─> Calculate actual velocity
   │   └─> Query: SUM(completed_tasks.actual_hours)
   ├─> Update sprint with velocity
   ├─> Update team average velocity
   └─> Sprint status = "completed"
```

### 6.3 Milestone-Driven Scheduling

```
1. Create Milestone (Manual Mode)
   ├─> Create WorkItem (type="milestone")
   ├─> Set target_date = "2024-06-01"
   ├─> Set is_manual_constraint = true
   └─> Add dependent tasks

2. Schedule Calculation
   ├─> Scheduler receives milestone constraint
   ├─> For each task blocking milestone:
   │   └─> Add constraint: task.end_date <= milestone.target_date
   ├─> Run OR-Tools solver
   └─> If infeasible:
       ├─> Report conflict
       └─> Suggest: extend target_date or reduce task durations

3. Create Milestone (Automatic Mode)
   ├─> Create WorkItem (type="milestone")
   ├─> Set is_manual_constraint = false
   └─> Add dependent tasks

4. Schedule Calculation
   ├─> Schedule tasks normally (no milestone constraint)
   ├─> After scheduling:
   │   ├─> Find latest end_date of dependent tasks
   │   └─> Set milestone.date = latest_end_date
   └─> Return schedule with calculated milestone date
```



## 7. Pydantic Schemas

### 7.1 Schedule Schemas

```python
class ScheduleCalculateRequest(BaseModel):
    """Request for schedule calculation"""
    project_id: UUID
    task_ids: list[str]
    milestone_ids: list[str] = Field(default_factory=list)
    resource_ids: list[str] = Field(default_factory=list)
    constraints: ScheduleConstraints

class ScheduledTask(BaseModel):
    """Scheduled task with dates"""
    task_id: str
    task_title: str
    start_date: datetime
    end_date: datetime
    duration_hours: float
    assigned_resources: list[str]
    is_critical: bool = False  # On critical path

class ScheduledMilestone(BaseModel):
    """Scheduled milestone"""
    milestone_id: str
    title: str
    date: datetime
    is_manual: bool
    is_achievable: bool = True

class ScheduleResponse(BaseModel):
    """Schedule calculation response"""
    status: Literal["success", "infeasible"]
    project_id: UUID
    schedule: list[ScheduledTask]
    critical_path: list[str]
    milestones: list[ScheduledMilestone]
    project_duration_hours: float
    project_start_date: datetime
    project_end_date: datetime
    conflicts: list[ScheduleConflict] = Field(default_factory=list)
    message: str
    calculated_at: datetime
```

### 7.2 Sprint Schemas

```python
class SprintCreate(BaseModel):
    """Create sprint request"""
    name: str = Field(..., min_length=1, max_length=200)
    goal: str = Field(..., min_length=1, max_length=1000)
    start_date: datetime
    end_date: datetime

class SprintResponse(BaseModel):
    """Sprint response with capacity"""
    id: UUID
    name: str
    goal: str
    start_date: datetime
    end_date: datetime
    capacity_hours: float
    capacity_story_points: int
    actual_velocity_hours: float = 0.0
    actual_velocity_story_points: int = 0
    status: Literal["planning", "active", "completed"]
    project_id: UUID
    created_at: datetime

class SprintVelocity(BaseModel):
    """Sprint velocity metrics"""
    sprint_velocity_hours: float
    sprint_velocity_story_points: int
    team_average_velocity_hours: float
    team_average_velocity_story_points: int
    velocity_trend: Literal["increasing", "stable", "decreasing"]

class BurndownPoint(BaseModel):
    """Single point on burndown chart"""
    date: datetime
    ideal_remaining_hours: float
    actual_remaining_hours: float
    ideal_remaining_points: int
    actual_remaining_points: int
```

### 7.3 Milestone Schemas

```python
class MilestoneCreate(BaseModel):
    """Create milestone request"""
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    target_date: datetime
    is_manual_constraint: bool = False
    completion_criteria: str | None = None

class MilestoneResponse(BaseModel):
    """Milestone response"""
    id: UUID
    title: str
    description: str | None
    target_date: datetime
    calculated_date: datetime | None
    is_manual_constraint: bool
    status: Literal["draft", "active", "completed"]
    dependent_tasks: list[TaskSummary]
    is_achievable: bool
    created_at: datetime

class TaskSummary(BaseModel):
    """Brief task info for milestone dependencies"""
    task_id: UUID
    title: str
    end_date: datetime | None
    status: str
```

### 7.4 Backlog Schemas

```python
class BacklogCreate(BaseModel):
    """Create backlog request"""
    name: str = Field(..., min_length=1, max_length=200)
    description: str | None = None

class BacklogResponse(BaseModel):
    """Backlog response"""
    id: UUID
    name: str
    description: str | None
    project_id: UUID
    task_count: int
    created_at: datetime

class BacklogTaskResponse(BaseModel):
    """Task in backlog with metadata"""
    task_id: UUID
    title: str
    priority: int
    estimated_hours: float | None
    story_points: int | None
    status: str
    added_at: datetime
    priority_order: int
```



## 8. Database Integration

### 8.1 Apache AGE Query Patterns

#### 8.1.1 Create Node with Relationships

```python
# Create task and link to workpackage
async def create_task_in_workpackage(
    task_data: TaskCreate,
    workpackage_id: UUID,
    graph_service: GraphService
) -> UUID:
    """Create task and establish workpackage relationship"""
    
    # Create task node
    task_id = str(uuid4())
    await graph_service.execute_query(f"""
        CREATE (t:WorkItem {{
            id: '{task_id}',
            type: 'task',
            title: '{task_data.title}',
            status: '{task_data.status}',
            priority: {task_data.priority or 3},
            estimated_hours: {task_data.estimated_hours or 0},
            story_points: {task_data.story_points or 0},
            done: false,
            created_at: '{datetime.now(UTC).isoformat()}'
        }})
        RETURN t
    """)
    
    # Create BELONGS_TO relationship (mandatory)
    await graph_service.execute_query(f"""
        MATCH (t:WorkItem {{id: '{task_id}'}}),
              (w:Workpackage {{id: '{workpackage_id}'}})
        CREATE (t)-[:BELONGS_TO]->(w)
    """)
    
    return UUID(task_id)
```

#### 8.1.2 Automatic Backlog Population

```python
# Trigger on status change to "ready"
async def handle_task_status_change(
    task_id: UUID,
    new_status: str,
    graph_service: GraphService
) -> None:
    """Handle automatic backlog population"""
    
    if new_status == "ready":
        # Get task's project
        result = await graph_service.execute_query(f"""
            MATCH (t:WorkItem {{id: '{task_id}'}})-[:BELONGS_TO*]->(p:Project)
            RETURN p.id as project_id
        """)
        
        if result:
            project_id = result[0]["project_id"]
            
            # Get or create backlog
            backlog = await graph_service.execute_query(f"""
                MATCH (b:Backlog)-[:BELONGS_TO]->(p:Project {{id: '{project_id}'}})
                RETURN b.id as backlog_id
            """)
            
            if backlog:
                backlog_id = backlog[0]["backlog_id"]
                
                # Create IN_BACKLOG relationship
                await graph_service.execute_query(f"""
                    MATCH (t:WorkItem {{id: '{task_id}'}}),
                          (b:Backlog {{id: '{backlog_id}'}})
                    MERGE (t)-[r:IN_BACKLOG]->(b)
                    ON CREATE SET r.added_at = '{datetime.now(UTC).isoformat()}'
                """)
```

#### 8.1.3 Query Project Hierarchy

```python
# Get complete project structure
async def get_project_hierarchy(
    project_id: UUID,
    graph_service: GraphService
) -> dict:
    """Query complete project hierarchy"""
    
    result = await graph_service.execute_query(f"""
        MATCH (p:Project {{id: '{project_id}'}})
        OPTIONAL MATCH (p)<-[:BELONGS_TO]-(ph:Phase)
        OPTIONAL MATCH (ph)<-[:BELONGS_TO]-(wp:Workpackage)
        OPTIONAL MATCH (wp)<-[:BELONGS_TO]-(t:WorkItem)
        WHERE t.type = 'task'
        RETURN p, 
               collect(DISTINCT ph) as phases,
               collect(DISTINCT wp) as workpackages,
               collect(DISTINCT t) as tasks
    """)
    
    return result[0] if result else None
```

#### 8.1.4 Calculate Sprint Capacity

```python
# Query resources and calculate capacity
async def calculate_sprint_capacity_query(
    sprint_id: UUID,
    graph_service: GraphService
) -> dict:
    """Calculate sprint capacity from resources"""
    
    result = await graph_service.execute_query(f"""
        MATCH (s:Sprint {{id: '{sprint_id}'}})-[:BELONGS_TO]->(p:Project)
        MATCH (r:Resource)-[alloc:ALLOCATED_TO]->(p)
        WHERE r.availability = 'available'
        RETURN s.start_date as start_date,
               s.end_date as end_date,
               collect({{
                   capacity: r.capacity,
                   allocation: alloc.allocation_percentage
               }}) as resources
    """)
    
    if not result:
        return {"capacity_hours": 0.0, "capacity_story_points": 0}
    
    data = result[0]
    start = datetime.fromisoformat(data["start_date"])
    end = datetime.fromisoformat(data["end_date"])
    sprint_weeks = (end - start).days / 7
    
    total_hours = sum(
        r["capacity"] * sprint_weeks * (r["allocation"] / 100.0)
        for r in data["resources"]
    )
    
    return {
        "capacity_hours": total_hours,
        "capacity_story_points": 0  # Calculate from velocity
    }
```

#### 8.1.5 Get Tasks on Critical Path

```python
# Mark critical path tasks
async def mark_critical_path_tasks(
    project_id: UUID,
    critical_path_task_ids: list[str],
    graph_service: GraphService
) -> None:
    """Mark tasks on critical path"""
    
    # Reset all tasks
    await graph_service.execute_query(f"""
        MATCH (t:WorkItem)-[:BELONGS_TO*]->(p:Project {{id: '{project_id}'}})
        WHERE t.type = 'task'
        SET t.is_critical = false
    """)
    
    # Mark critical path tasks
    for task_id in critical_path_task_ids:
        await graph_service.execute_query(f"""
            MATCH (t:WorkItem {{id: '{task_id}'}})
            SET t.is_critical = true
        """)
```

### 8.2 Transaction Management

All multi-step operations should use transactions:

```python
async def create_sprint_with_tasks(
    sprint_data: SprintCreate,
    task_ids: list[UUID],
    graph_service: GraphService
) -> UUID:
    """Create sprint and assign tasks in a transaction"""
    
    async with graph_service.transaction() as tx:
        # Create sprint
        sprint_id = await tx.create_sprint(sprint_data)
        
        # Assign tasks
        for task_id in task_ids:
            await tx.assign_task_to_sprint(sprint_id, task_id)
        
        # Calculate capacity
        capacity = await tx.calculate_capacity(sprint_id)
        await tx.update_sprint_capacity(sprint_id, capacity)
        
        # Commit transaction
        await tx.commit()
        
        return sprint_id
```



## 9. Error Handling and Validation

### 9.1 Validation Rules

#### 9.1.1 Task Validation

**Mandatory Workpackage Assignment**:
```python
async def validate_task_creation(task_data: TaskCreate) -> None:
    """Validate task has workpackage assignment"""
    if not task_data.workpackage_id:
        raise ValidationError(
            "Task must belong to a workpackage",
            field="workpackage_id"
        )
```

**Status Transition Rules**:
```python
VALID_STATUS_TRANSITIONS = {
    "draft": ["ready", "archived"],
    "ready": ["active", "archived"],
    "active": ["completed", "blocked", "ready"],
    "blocked": ["active", "ready"],
    "completed": ["archived"],
    "archived": []
}

async def validate_status_change(
    current_status: str,
    new_status: str
) -> None:
    """Validate status transition is allowed"""
    if new_status not in VALID_STATUS_TRANSITIONS.get(current_status, []):
        raise ValidationError(
            f"Cannot transition from {current_status} to {new_status}",
            field="status"
        )
```

#### 9.1.2 Sprint Validation

**Date Validation**:
```python
async def validate_sprint_dates(sprint_data: SprintCreate) -> None:
    """Validate sprint date constraints"""
    if sprint_data.end_date <= sprint_data.start_date:
        raise ValidationError(
            "Sprint end date must be after start date",
            field="end_date"
        )
    
    duration = (sprint_data.end_date - sprint_data.start_date).days
    if duration > 30:
        raise ValidationError(
            "Sprint duration cannot exceed 30 days",
            field="end_date"
        )
```


**Capacity Validation**:
```python
async def validate_sprint_capacity(
    sprint_id: UUID,
    task_ids: list[UUID],
    graph_service: GraphService
) -> None:
    """Validate sprint capacity not exceeded"""
    sprint = await graph_service.get_node(str(sprint_id))
    capacity_hours = sprint["capacity_hours"]
    
    # Calculate total estimated hours for tasks
    tasks = await graph_service.get_nodes(
        [str(tid) for tid in task_ids]
    )
    total_hours = sum(t.get("estimated_hours", 0) for t in tasks)
    
    if total_hours > capacity_hours * 1.2:  # Allow 20% buffer
        raise ValidationError(
            f"Tasks exceed sprint capacity: {total_hours}h > {capacity_hours}h",
            field="task_ids"
        )
```

#### 9.1.3 Milestone Validation

**Dependency Cycle Detection**:
```python
async def validate_no_dependency_cycles(
    milestone_id: UUID,
    task_id: UUID,
    graph_service: GraphService
) -> None:
    """Ensure adding dependency doesn't create cycle"""
    # Check if task already depends on milestone (directly or indirectly)
    result = await graph_service.execute_query(f"""
        MATCH path = (t:WorkItem {{id: '{task_id}'}})-[:DEPENDS_ON*]->(m:WorkItem {{id: '{milestone_id}'}})
        RETURN path
    """)
    
    if result:
        raise ValidationError(
            "Adding this dependency would create a cycle",
            field="task_id"
        )
```

### 9.2 Error Response Format

All API errors follow consistent format:

```python
class ErrorResponse(BaseModel):
    """Standard error response"""
    error: str
    message: str
    field: str | None = None
    details: dict | None = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
```


**Example Error Responses**:

```json
{
  "error": "ValidationError",
  "message": "Task must belong to a workpackage",
  "field": "workpackage_id",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

```json
{
  "error": "ScheduleInfeasible",
  "message": "Cannot meet milestone target date with current task estimates",
  "details": {
    "milestone_id": "uuid",
    "target_date": "2024-06-01T00:00:00Z",
    "earliest_possible": "2024-06-15T00:00:00Z",
    "blocking_tasks": ["task-uuid-1", "task-uuid-2"]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 9.3 Exception Hierarchy

```python
class ScheduleAPIException(Exception):
    """Base exception for schedule API"""
    pass

class ValidationError(ScheduleAPIException):
    """Validation failed"""
    def __init__(self, message: str, field: str | None = None):
        self.message = message
        self.field = field
        super().__init__(message)

class ScheduleInfeasibleError(ScheduleAPIException):
    """Schedule cannot be calculated"""
    def __init__(self, message: str, details: dict | None = None):
        self.message = message
        self.details = details
        super().__init__(message)

class ResourceConflictError(ScheduleAPIException):
    """Resource allocation conflict"""
    pass

class DependencyCycleError(ScheduleAPIException):
    """Dependency cycle detected"""
    pass
```


### 9.4 Error Handling Patterns

#### 9.4.1 Service Layer Error Handling

```python
async def create_sprint(
    self,
    project_id: UUID,
    sprint_data: SprintCreate
) -> SprintResponse:
    """Create sprint with comprehensive error handling"""
    try:
        # Validate dates
        await validate_sprint_dates(sprint_data)
        
        # Create sprint node
        sprint_id = await self.graph_service.create_node(
            label="Sprint",
            properties={
                "id": str(uuid4()),
                "name": sprint_data.name,
                "goal": sprint_data.goal,
                "start_date": sprint_data.start_date.isoformat(),
                "end_date": sprint_data.end_date.isoformat(),
                "status": "planning",
                "project_id": str(project_id)
            }
        )
        
        # Calculate capacity
        capacity = await self.calculate_capacity(sprint_id)
        
        logger.info(
            "Sprint created",
            sprint_id=sprint_id,
            project_id=str(project_id),
            capacity_hours=capacity["capacity_hours"]
        )
        
        return SprintResponse(
            id=UUID(sprint_id),
            **sprint_data.model_dump(),
            **capacity,
            status="planning",
            project_id=project_id,
            created_at=datetime.now(UTC)
        )
        
    except ValidationError:
        raise
    except Exception as e:
        logger.exception(
            "Failed to create sprint",
            project_id=str(project_id),
            error=str(e)
        )
        raise ScheduleAPIException(f"Failed to create sprint: {e}")
```


#### 9.4.2 API Layer Error Handling

```python
@router.post("/sprints", response_model=SprintResponse)
async def create_sprint(
    project_id: UUID,
    sprint_data: SprintCreate,
    service: SprintService = Depends(get_sprint_service),
    current_user: User = Depends(get_current_user)
) -> SprintResponse:
    """Create sprint with error handling"""
    try:
        return await service.create_sprint(project_id, sprint_data)
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ErrorResponse(
                error="ValidationError",
                message=e.message,
                field=e.field
            ).model_dump()
        )
    except ScheduleAPIException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                error=type(e).__name__,
                message=str(e)
            ).model_dump()
        )
```



## 10. Authentication and Authorization

### 10.1 Authentication

All API endpoints require authentication via JWT token:

```python
from app.core.auth import get_current_user

@router.post("/schedule/calculate")
async def calculate_schedule(
    request: ScheduleCalculateRequest,
    current_user: User = Depends(get_current_user)
) -> ScheduleResponse:
    """Calculate schedule - requires authentication"""
    return await service.calculate_schedule(request, current_user.id)
```

### 10.2 Authorization Rules

#### 10.2.1 Project-Level Permissions

Users must have appropriate role on project:

```python
class ProjectRole(str, Enum):
    OWNER = "owner"
    MANAGER = "manager"
    MEMBER = "member"
    VIEWER = "viewer"

ROLE_PERMISSIONS = {
    "owner": ["read", "write", "delete", "manage_users"],
    "manager": ["read", "write", "manage_schedule"],
    "member": ["read", "write"],
    "viewer": ["read"]
}
```


#### 10.2.2 Permission Checks

```python
async def check_project_permission(
    user_id: UUID,
    project_id: UUID,
    required_permission: str,
    db: AsyncSession
) -> bool:
    """Check if user has permission on project"""
    # Query user's role on project
    result = await db.execute(
        select(ProjectMember.role)
        .where(
            ProjectMember.user_id == user_id,
            ProjectMember.project_id == project_id
        )
    )
    role = result.scalar_one_or_none()
    
    if not role:
        return False
    
    return required_permission in ROLE_PERMISSIONS.get(role, [])


async def require_project_permission(
    project_id: UUID,
    permission: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> None:
    """Dependency to enforce project permission"""
    has_permission = await check_project_permission(
        current_user.id,
        project_id,
        permission,
        db
    )
    
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User does not have '{permission}' permission on project"
        )
```

#### 10.2.3 Endpoint Authorization

```python
@router.post("/schedule/calculate")
async def calculate_schedule(
    request: ScheduleCalculateRequest,
    current_user: User = Depends(get_current_user),
    _: None = Depends(
        lambda req=request: require_project_permission(
            req.project_id,
            "manage_schedule"
        )
    )
) -> ScheduleResponse:
    """Calculate schedule - requires manage_schedule permission"""
    return await service.calculate_schedule(request, current_user.id)
```


### 10.3 Audit Logging

All schedule operations are audited:

```python
async def audit_schedule_calculation(
    project_id: UUID,
    user_id: UUID,
    result: ScheduleResponse,
    audit_service: AuditService
) -> None:
    """Log schedule calculation for audit"""
    await audit_service.log_event(
        event_type="schedule_calculated",
        user_id=user_id,
        entity_type="project",
        entity_id=project_id,
        details={
            "status": result.status,
            "task_count": len(result.schedule),
            "critical_path_length": len(result.critical_path),
            "project_duration_hours": result.project_duration_hours
        }
    )
```



## 11. Testing Strategy

### 11.1 Unit Tests

#### 11.1.1 Algorithm Tests

Test core algorithms with known inputs/outputs:

```python
def test_critical_path_calculation():
    """Test critical path algorithm"""
    tasks = [
        ScheduledTask(
            task_id="A",
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 5),
            duration_hours=32
        ),
        ScheduledTask(
            task_id="B",
            start_date=datetime(2024, 1, 5),
            end_date=datetime(2024, 1, 10),
            duration_hours=40
        ),
        ScheduledTask(
            task_id="C",
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 3),
            duration_hours=16
        )
    ]
    
    dependencies = [
        TaskDependency(from_task_id="A", to_task_id="B"),
        TaskDependency(from_task_id="C", to_task_id="B")
    ]
    
    critical_path = calculate_critical_path(tasks, dependencies)
    
    assert critical_path == ["A", "B"]
    assert "C" not in critical_path
```


#### 11.1.2 Service Tests

Test service layer with mocked dependencies:

```python
@pytest.mark.asyncio
async def test_create_sprint_calculates_capacity():
    """Test sprint creation calculates capacity"""
    # Mock dependencies
    graph_service = Mock(GraphService)
    graph_service.create_node.return_value = "sprint-uuid"
    graph_service.execute_query.return_value = [
        {
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-01-14T23:59:59Z",
            "resources": [
                {"capacity": 40.0, "allocation": 100.0},
                {"capacity": 40.0, "allocation": 50.0}
            ]
        }
    ]
    
    service = SprintService(graph_service)
    
    # Create sprint
    sprint = await service.create_sprint(
        project_id=UUID("project-uuid"),
        sprint_data=SprintCreate(
            name="Sprint 1",
            goal="Complete features",
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 1, 14)
        )
    )
    
    # Verify capacity calculated
    assert sprint.capacity_hours == 120.0  # (40 * 2 + 40 * 2 * 0.5) weeks
    assert graph_service.create_node.called
```

### 11.2 Property-Based Tests

Use Hypothesis for property-based testing of core invariants:

#### 11.2.1 Critical Path Properties

**Property: Critical path is always the longest path**

```python
from hypothesis import given, strategies as st

@given(
    tasks=st.lists(
        st.builds(
            ScheduledTask,
            task_id=st.text(min_size=1, max_size=10),
            start_date=st.datetimes(),
            end_date=st.datetimes(),
            duration_hours=st.floats(min_value=1, max_value=100)
        ),
        min_size=1,
        max_size=20
    ),
    dependencies=st.lists(
        st.builds(
            TaskDependency,
            from_task_id=st.text(min_size=1, max_size=10),
            to_task_id=st.text(min_size=1, max_size=10)
        )
    )
)
def test_critical_path_is_longest_path(tasks, dependencies):
    """
    Property: Critical path duration >= any other path duration
    
    **Validates: Requirements 1.1, 1.2**
    """
    # Filter valid dependencies
    task_ids = {t.task_id for t in tasks}
    valid_deps = [
        d for d in dependencies
        if d.from_task_id in task_ids and d.to_task_id in task_ids
    ]
    
    # Calculate critical path
    critical_path = calculate_critical_path(tasks, valid_deps)
    
    if not critical_path:
        return  # No path found
    
    # Calculate critical path duration
    critical_duration = sum(
        t.duration_hours for t in tasks
        if t.task_id in critical_path
    )
    
    # Calculate all other paths
    all_paths = find_all_paths(tasks, valid_deps)
    
    # Critical path should be longest
    for path in all_paths:
        path_duration = sum(
            t.duration_hours for t in tasks
            if t.task_id in path
        )
        assert critical_duration >= path_duration
```


#### 11.2.2 Backlog Population Properties

**Property: Tasks with status="ready" are always in backlog**

```python
@given(
    task_status=st.sampled_from(["draft", "ready", "active", "completed", "blocked"])
)
@pytest.mark.asyncio
async def test_ready_tasks_in_backlog(task_status):
    """
    Property: If task.status == "ready", then task IN_BACKLOG relationship exists
    
    **Validates: Requirements 21.1, 21.2**
    """
    # Create task with given status
    task_id = uuid4()
    await create_task(task_id, status=task_status)
    
    # Check backlog relationship
    in_backlog = await check_task_in_backlog(task_id)
    
    # Property: ready tasks must be in backlog
    if task_status == "ready":
        assert in_backlog, "Ready task must be in backlog"
    # Note: Non-ready tasks MAY be in backlog (manual addition allowed)
```

#### 11.2.3 Sprint Capacity Properties

**Property: Sprint capacity never negative**

```python
@given(
    resources=st.lists(
        st.builds(
            Resource,
            capacity=st.floats(min_value=0, max_value=80),
            allocation=st.floats(min_value=0, max_value=100)
        ),
        min_size=0,
        max_size=10
    ),
    sprint_days=st.integers(min_value=1, max_value=30)
)
def test_sprint_capacity_non_negative(resources, sprint_days):
    """
    Property: Sprint capacity is always >= 0
    
    **Validates: Requirements 22.1, 22.2**
    """
    capacity = calculate_sprint_capacity_from_resources(
        resources,
        sprint_days
    )
    
    assert capacity["capacity_hours"] >= 0
    assert capacity["capacity_story_points"] >= 0
```

#### 11.2.4 Milestone Scheduling Properties

**Property: Manual milestone constraints are respected**

```python
@given(
    milestone_target=st.datetimes(
        min_value=datetime(2024, 1, 1),
        max_value=datetime(2024, 12, 31)
    ),
    task_durations=st.lists(
        st.floats(min_value=1, max_value=100),
        min_size=1,
        max_size=10
    )
)
def test_manual_milestone_constraint_respected(milestone_target, task_durations):
    """
    Property: If milestone is manual constraint, all dependent tasks
    complete before target_date
    
    **Validates: Requirements 24.1, 24.3**
    """
    # Create milestone with manual constraint
    milestone = Milestone(
        id=uuid4(),
        target_date=milestone_target,
        is_manual_constraint=True
    )
    
    # Create dependent tasks
    tasks = [
        Task(id=uuid4(), estimated_hours=duration)
        for duration in task_durations
    ]
    
    # Calculate schedule
    schedule = calculate_schedule_with_milestone(tasks, milestone)
    
    if schedule.status == "success":
        # All dependent tasks must finish before milestone
        for task in schedule.schedule:
            if task.task_id in [str(t.id) for t in tasks]:
                assert task.end_date <= milestone_target
```


### 11.3 Integration Tests

#### 11.3.1 End-to-End Schedule Calculation

```python
@pytest.mark.asyncio
async def test_schedule_calculation_end_to_end(
    client: AsyncClient,
    test_project: Project,
    test_user: User
):
    """Test complete schedule calculation flow"""
    # Create project hierarchy
    phase = await create_phase(test_project.id, "Phase 1")
    workpackage = await create_workpackage(phase.id, "WP 1")
    
    # Create tasks with dependencies
    task1 = await create_task(workpackage.id, "Task 1", estimated_hours=8)
    task2 = await create_task(workpackage.id, "Task 2", estimated_hours=16)
    await create_dependency(task1.id, task2.id)
    
    # Create milestone
    milestone = await create_milestone(
        test_project.id,
        "Milestone 1",
        target_date=datetime(2024, 6, 1),
        is_manual_constraint=True
    )
    await add_milestone_dependency(milestone.id, task2.id)
    
    # Calculate schedule
    response = await client.post(
        "/api/v1/schedule/calculate",
        json={
            "project_id": str(test_project.id),
            "task_ids": [str(task1.id), str(task2.id)],
            "milestone_ids": [str(milestone.id)],
            "constraints": {
                "project_start": "2024-01-01T00:00:00Z",
                "horizon_days": 365
            }
        },
        headers={"Authorization": f"Bearer {test_user.token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    
    # Verify schedule
    assert data["status"] == "success"
    assert len(data["schedule"]) == 2
    assert len(data["critical_path"]) > 0
    assert len(data["milestones"]) == 1
    
    # Verify task order (task1 before task2)
    task1_sched = next(t for t in data["schedule"] if t["task_id"] == str(task1.id))
    task2_sched = next(t for t in data["schedule"] if t["task_id"] == str(task2.id))
    assert task1_sched["end_date"] <= task2_sched["start_date"]
    
    # Verify milestone constraint
    milestone_sched = data["milestones"][0]
    assert datetime.fromisoformat(task2_sched["end_date"]) <= datetime.fromisoformat(milestone_sched["date"])
```


#### 11.3.2 Sprint Workflow Integration

```python
@pytest.mark.asyncio
async def test_sprint_workflow_integration(
    client: AsyncClient,
    test_project: Project,
    test_user: User
):
    """Test complete sprint workflow"""
    # Create backlog
    backlog_response = await client.post(
        f"/api/v1/projects/{test_project.id}/backlogs",
        json={"name": "Product Backlog"},
        headers={"Authorization": f"Bearer {test_user.token}"}
    )
    backlog_id = backlog_response.json()["id"]
    
    # Create tasks with status="ready" (auto-added to backlog)
    task1 = await create_task_with_status(test_project.id, "ready")
    task2 = await create_task_with_status(test_project.id, "ready")
    
    # Verify tasks in backlog
    backlog_tasks = await client.get(
        f"/api/v1/backlogs/{backlog_id}/tasks",
        headers={"Authorization": f"Bearer {test_user.token}"}
    )
    assert len(backlog_tasks.json()["tasks"]) == 2
    
    # Create sprint
    sprint_response = await client.post(
        f"/api/v1/projects/{test_project.id}/sprints",
        json={
            "name": "Sprint 1",
            "goal": "Complete features",
            "start_date": "2024-01-01T00:00:00Z",
            "end_date": "2024-01-14T23:59:59Z"
        },
        headers={"Authorization": f"Bearer {test_user.token}"}
    )
    sprint_id = sprint_response.json()["id"]
    assert sprint_response.json()["capacity_hours"] > 0
    
    # Assign tasks to sprint
    await client.post(
        f"/api/v1/sprints/{sprint_id}/tasks/{task1.id}",
        headers={"Authorization": f"Bearer {test_user.token}"}
    )
    
    # Start sprint
    await client.post(
        f"/api/v1/sprints/{sprint_id}/start",
        headers={"Authorization": f"Bearer {test_user.token}"}
    )
    
    # Complete task
    await update_task_status(task1.id, "completed", actual_hours=8)
    
    # Complete sprint
    complete_response = await client.post(
        f"/api/v1/sprints/{sprint_id}/complete",
        headers={"Authorization": f"Bearer {test_user.token}"}
    )
    
    # Verify velocity calculated
    velocity_data = complete_response.json()
    assert velocity_data["actual_velocity_hours"] > 0
    assert velocity_data["status"] == "completed"
```


### 11.4 Performance Tests

#### 11.4.1 Schedule Calculation Performance

```python
@pytest.mark.performance
async def test_schedule_calculation_performance():
    """Test schedule calculation with large project"""
    # Create project with 1000 tasks
    tasks = [
        create_test_task(f"Task {i}", estimated_hours=8)
        for i in range(1000)
    ]
    
    # Add random dependencies (10% of tasks)
    dependencies = create_random_dependencies(tasks, density=0.1)
    
    # Measure calculation time
    start_time = time.time()
    schedule = await calculate_schedule(tasks, dependencies)
    elapsed = time.time() - start_time
    
    # Should complete within 30 seconds for 1000 tasks
    assert elapsed < 30.0
    assert schedule.status == "success"
```

#### 11.4.2 Graph Query Performance

```python
@pytest.mark.performance
async def test_project_hierarchy_query_performance():
    """Test hierarchy query with deep nesting"""
    # Create project with 10 phases, 10 workpackages each, 10 tasks each
    # Total: 1000 tasks
    project = await create_large_project(
        phases=10,
        workpackages_per_phase=10,
        tasks_per_workpackage=10
    )
    
    # Measure query time
    start_time = time.time()
    hierarchy = await get_project_hierarchy(project.id)
    elapsed = time.time() - start_time
    
    # Should complete within 2 seconds
    assert elapsed < 2.0
    assert len(hierarchy["phases"]) == 10
```



## 12. Performance Considerations

### 12.1 Optimization Strategies

#### 12.1.1 Graph Query Optimization

**Use Indexes**:
```sql
-- Create indexes on frequently queried properties
CREATE INDEX ON WorkItem(id);
CREATE INDEX ON WorkItem(type);
CREATE INDEX ON WorkItem(status);
CREATE INDEX ON Project(id);
CREATE INDEX ON Sprint(project_id);
```

**Limit Query Depth**:
```python
# Avoid unbounded path queries
# BAD: MATCH (a)-[*]->(b)
# GOOD: MATCH (a)-[*1..5]->(b)

async def get_task_dependencies(task_id: UUID, max_depth: int = 5):
    """Get dependencies with depth limit"""
    result = await graph_service.execute_query(f"""
        MATCH (t:WorkItem {{id: '{task_id}'}})-[:DEPENDS_ON*1..{max_depth}]->(dep)
        RETURN dep
    """)
    return result
```


#### 12.1.2 Caching Strategy

**Cache Schedule Results**:
```python
from functools import lru_cache
from datetime import timedelta

class ScheduleCache:
    """Cache for schedule calculations"""
    
    def __init__(self, ttl_seconds: int = 300):
        self.cache: dict[str, tuple[ScheduleResponse, datetime]] = {}
        self.ttl = timedelta(seconds=ttl_seconds)
    
    def get(self, cache_key: str) -> ScheduleResponse | None:
        """Get cached schedule if not expired"""
        if cache_key in self.cache:
            schedule, cached_at = self.cache[cache_key]
            if datetime.now(UTC) - cached_at < self.ttl:
                return schedule
            else:
                del self.cache[cache_key]
        return None
    
    def set(self, cache_key: str, schedule: ScheduleResponse) -> None:
        """Cache schedule result"""
        self.cache[cache_key] = (schedule, datetime.now(UTC))
    
    def invalidate(self, project_id: UUID) -> None:
        """Invalidate cache for project"""
        keys_to_delete = [
            k for k in self.cache.keys()
            if k.startswith(f"schedule:{project_id}")
        ]
        for key in keys_to_delete:
            del self.cache[key]


# Usage in service
async def calculate_schedule(
    self,
    request: ScheduleCalculateRequest
) -> ScheduleResponse:
    """Calculate schedule with caching"""
    cache_key = f"schedule:{request.project_id}:{hash(frozenset(request.task_ids))}"
    
    # Check cache
    cached = self.cache.get(cache_key)
    if cached:
        logger.info("Returning cached schedule", project_id=str(request.project_id))
        return cached
    
    # Calculate schedule
    schedule = await self._calculate_schedule_impl(request)
    
    # Cache result
    self.cache.set(cache_key, schedule)
    
    return schedule
```

#### 12.1.3 Batch Operations

**Batch Task Updates**:
```python
async def update_tasks_batch(
    task_updates: list[tuple[UUID, dict]],
    graph_service: GraphService
) -> None:
    """Update multiple tasks in single transaction"""
    async with graph_service.transaction() as tx:
        for task_id, updates in task_updates:
            await tx.update_node(str(task_id), updates)
        await tx.commit()
```


### 12.2 Scalability Limits

#### 12.2.1 Recommended Limits

- **Tasks per project**: 10,000 (soft limit), 50,000 (hard limit)
- **Dependencies per task**: 50 (soft limit), 100 (hard limit)
- **Sprints per project**: 1,000 (soft limit)
- **Tasks per sprint**: 100 (soft limit), 500 (hard limit)
- **Resources per project**: 500 (soft limit)
- **Concurrent schedule calculations**: 10 per server

#### 12.2.2 Performance Targets

- **Schedule calculation**: < 5 seconds for 1,000 tasks
- **Critical path calculation**: < 2 seconds for 1,000 tasks
- **Graph hierarchy query**: < 1 second for 1,000 nodes
- **Backlog query**: < 500ms for 500 tasks
- **Sprint capacity calculation**: < 200ms

### 12.3 Monitoring Metrics

Track these metrics for performance monitoring:

```python
# Schedule calculation metrics
schedule_calculation_duration_seconds = Histogram(
    "schedule_calculation_duration_seconds",
    "Time to calculate schedule",
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0]
)

schedule_task_count = Histogram(
    "schedule_task_count",
    "Number of tasks in schedule calculation",
    buckets=[10, 50, 100, 500, 1000, 5000]
)

# Graph query metrics
graph_query_duration_seconds = Histogram(
    "graph_query_duration_seconds",
    "Time to execute graph query",
    buckets=[0.01, 0.05, 0.1, 0.5, 1.0, 5.0]
)

# Cache metrics
schedule_cache_hits = Counter(
    "schedule_cache_hits_total",
    "Number of schedule cache hits"
)

schedule_cache_misses = Counter(
    "schedule_cache_misses_total",
    "Number of schedule cache misses"
)
```



## 13. Deployment and Configuration

### 13.1 Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/rxdx
AGE_GRAPH_NAME=rxdx_graph

# Schedule Service Configuration
SCHEDULE_CACHE_TTL_SECONDS=300
SCHEDULE_MAX_TASKS=10000
SCHEDULE_MAX_HORIZON_DAYS=730
SCHEDULE_CALCULATION_TIMEOUT_SECONDS=60

# Sprint Configuration
SPRINT_MAX_DURATION_DAYS=30
SPRINT_DEFAULT_VELOCITY_LOOKBACK=3

# Performance Configuration
MAX_CONCURRENT_SCHEDULES=10
GRAPH_QUERY_TIMEOUT_SECONDS=30
```


### 13.2 Apache AGE Setup

#### 13.2.1 Installation

```bash
# Install PostgreSQL 14+ with AGE extension
sudo apt-get install postgresql-14 postgresql-14-age

# Enable AGE extension
psql -U postgres -d rxdx -c "CREATE EXTENSION IF NOT EXISTS age;"

# Load AGE into search path
psql -U postgres -d rxdx -c "SET search_path = ag_catalog, public;"
```

#### 13.2.2 Graph Initialization

```sql
-- Create graph
SELECT create_graph('rxdx_graph');

-- Verify graph created
SELECT * FROM ag_catalog.ag_graph;

-- Create vertex labels
SELECT create_vlabel('rxdx_graph', 'Project');
SELECT create_vlabel('rxdx_graph', 'Phase');
SELECT create_vlabel('rxdx_graph', 'Workpackage');
SELECT create_vlabel('rxdx_graph', 'WorkItem');
SELECT create_vlabel('rxdx_graph', 'Sprint');
SELECT create_vlabel('rxdx_graph', 'Backlog');
SELECT create_vlabel('rxdx_graph', 'Resource');
SELECT create_vlabel('rxdx_graph', 'Department');

-- Create edge labels
SELECT create_elabel('rxdx_graph', 'BELONGS_TO');
SELECT create_elabel('rxdx_graph', 'DEPENDS_ON');
SELECT create_elabel('rxdx_graph', 'BLOCKS');
SELECT create_elabel('rxdx_graph', 'IN_BACKLOG');
SELECT create_elabel('rxdx_graph', 'ASSIGNED_TO_SPRINT');
SELECT create_elabel('rxdx_graph', 'ASSIGNED_TO');
SELECT create_elabel('rxdx_graph', 'ALLOCATED_TO');
SELECT create_elabel('rxdx_graph', 'PARENT_OF');
SELECT create_elabel('rxdx_graph', 'NEXT_VERSION');
```

### 13.3 Database Migrations

Use Alembic for schema migrations:

```python
# alembic/versions/xxx_add_schedule_tables.py

def upgrade():
    """Add schedule-related tables"""
    # Project members table (for authorization)
    op.create_table(
        'project_members',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('project_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    
    # Create indexes
    op.create_index('ix_project_members_project_id', 'project_members', ['project_id'])
    op.create_index('ix_project_members_user_id', 'project_members', ['user_id'])
```


### 13.4 Service Dependencies

#### 13.4.1 Required Services

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: rxdx
      POSTGRES_USER: rxdx_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://rxdx_user:${DB_PASSWORD}@postgres:5432/rxdx
      AGE_GRAPH_NAME: rxdx_graph
      SCHEDULE_CACHE_TTL_SECONDS: 300
    depends_on:
      - postgres
    ports:
      - "8000:8000"
```

#### 13.4.2 OR-Tools Installation

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install OR-Tools
RUN pip install ortools==9.8.3296

# Install other dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copy application
COPY . /app
WORKDIR /app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 13.5 Monitoring and Logging

#### 13.5.1 Structured Logging

```python
import structlog

logger = structlog.get_logger(__name__)

# Log schedule calculation
logger.info(
    "schedule_calculated",
    project_id=str(project_id),
    task_count=len(tasks),
    duration_seconds=elapsed,
    status=result.status,
    critical_path_length=len(result.critical_path)
)
```

#### 13.5.2 Health Checks

```python
@router.get("/health/schedule")
async def schedule_health_check(
    graph_service: GraphService = Depends(get_graph_service)
) -> dict:
    """Health check for schedule service"""
    try:
        # Test graph connection
        await graph_service.execute_query("MATCH (n) RETURN count(n) LIMIT 1")
        
        # Test OR-Tools
        from ortools.sat.python import cp_model
        model = cp_model.CpModel()
        
        return {
            "status": "healthy",
            "graph_db": "connected",
            "or_tools": "available",
            "timestamp": datetime.now(UTC).isoformat()
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now(UTC).isoformat()
        }
```


### 13.6 Backup and Recovery

#### 13.6.1 Database Backup

```bash
#!/bin/bash
# backup_schedule_data.sh

# Backup PostgreSQL (includes AGE graph data)
pg_dump -U rxdx_user -d rxdx -F c -f "backup_$(date +%Y%m%d_%H%M%S).dump"

# Backup specific graph data
psql -U rxdx_user -d rxdx -c "
  SELECT * FROM cypher('rxdx_graph', $$
    MATCH (n)
    RETURN n
  $$) as (node agtype);
" > "graph_backup_$(date +%Y%m%d_%H%M%S).sql"
```

#### 13.6.2 Recovery Procedure

```bash
#!/bin/bash
# restore_schedule_data.sh

# Restore PostgreSQL database
pg_restore -U rxdx_user -d rxdx -c backup_20240115_120000.dump

# Verify graph data
psql -U rxdx_user -d rxdx -c "
  SELECT count(*) FROM cypher('rxdx_graph', $$
    MATCH (n)
    RETURN n
  $$) as (node agtype);
"
```

### 13.7 Configuration Management

#### 13.7.1 Settings Class

```python
from pydantic_settings import BaseSettings

class ScheduleSettings(BaseSettings):
    """Schedule service configuration"""
    
    # Database
    database_url: str
    age_graph_name: str = "rxdx_graph"
    
    # Cache
    schedule_cache_ttl_seconds: int = 300
    
    # Limits
    schedule_max_tasks: int = 10000
    schedule_max_horizon_days: int = 730
    schedule_calculation_timeout_seconds: int = 60
    
    # Sprint
    sprint_max_duration_days: int = 30
    sprint_default_velocity_lookback: int = 3
    
    # Performance
    max_concurrent_schedules: int = 10
    graph_query_timeout_seconds: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Usage
settings = ScheduleSettings()
```

### 13.8 Deployment Checklist

Before deploying to production:

- [ ] PostgreSQL 14+ installed with AGE extension
- [ ] Graph initialized with all vertex and edge labels
- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] OR-Tools installed and tested
- [ ] Health check endpoint responding
- [ ] Monitoring and logging configured
- [ ] Backup procedures tested
- [ ] Performance limits configured
- [ ] Authentication and authorization tested
- [ ] API documentation generated (OpenAPI/Swagger)
- [ ] Load testing completed
- [ ] Security scan completed



## 14. Summary

This design document specifies a comprehensive dual-methodology project management system that seamlessly integrates classic waterfall and agile approaches. Key features include:

**Core Capabilities**:
- Classic project hierarchy (Project → Phase → Workpackage → Task)
- Agile workflow (Backlog → Sprint → Task)
- Automatic backlog population when tasks become ready
- Manual sprint assignment with capacity calculation
- Critical path identification using longest path algorithm
- Dual-mode milestone scheduling (manual constraint vs. automatic calculation)
- Velocity tracking in both story points and hours
- Burndown chart generation

**Technical Architecture**:
- Apache AGE graph database on PostgreSQL for unified data storage
- OR-Tools constraint programming for schedule optimization
- FastAPI REST endpoints for all operations
- Comprehensive validation and error handling
- Property-based testing for core invariants
- Performance optimization with caching and batch operations

**Integration Points**:
- Extends existing WorkItem system (no duplicate structures)
- Maintains version history and audit trails
- Supports role-based access control
- Provides health checks and monitoring

The system supports flexible project management workflows where teams can use classic planning fo
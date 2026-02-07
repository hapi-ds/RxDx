# Architecture Clarification: Tasks and Milestones

## Decision: Tasks as WorkItem, Milestones as Separate Nodes

**Date**: December 2024

## Summary

After initial implementation of separate Task and Milestone node types, we have clarified the correct architecture:
- **Tasks remain as WorkItem nodes** (type='task') - used with other WorkItems in project management
- **Milestones are separate Milestone nodes** - used ONLY in project management for scheduling

## Correct Architecture

### WorkItem Node Structure (for Tasks)

Tasks are WorkItem nodes because they are used together with requirements, risks, tests, and documents in project management workflows.

```cypher
CREATE (w:WorkItem {
    id: UUID,
    type: "task" | "requirement" | "test" | "risk" | "document",
    title: string,
    description: string,
    status: string,
    priority: integer,
    version: string,
    created_by: UUID,
    created_at: ISO8601 datetime,
    updated_at: ISO8601 datetime,
    is_signed: boolean,
    
    // Type-specific properties
    // For type='task':
    estimated_hours: float,
    actual_hours: float,
    story_points: integer,
    skills_needed: array[string],  // NEW - for resource matching
    done: boolean,
    start_date: ISO8601 datetime,
    end_date: ISO8601 datetime,
    due_date: ISO8601 datetime,
    workpackage_id: UUID,  // NEW - for quick lookup
    
    // For type='requirement':
    acceptance_criteria: string,
    business_value: integer,
    source: string,
    
    // For type='test':
    test_type: string,
    test_steps: string,
    expected_result: string,
    actual_result: string,
    test_status: string,
    
    // For type='risk':
    severity: integer,
    occurrence: integer,
    detection: integer,
    rpn: integer,
    mitigation_actions: string,
    risk_owner: UUID,
    
    // For type='document':
    document_type: string,
    file_path: string,
    file_size: integer,
    mime_type: string,
    checksum: string
})
```

### Milestone Node Structure (Separate from WorkItem)

Milestones are separate nodes because they are used ONLY in project management for scheduling, not in general work tracking.

```cypher
CREATE (m:Milestone {
    id: UUID,
    title: string,
    description: string,
    target_date: ISO8601 datetime,
    is_manual_constraint: boolean,
    completion_criteria: string,
    status: string,
    project_id: UUID,  // for quick lookup
    version: string,
    created_by: UUID,
    created_at: ISO8601 datetime,
    updated_at: ISO8601 datetime
})
```

## Why This Architecture?

### Tasks as WorkItem Nodes

**Reasons:**
1. **Integrated Workflow**: Tasks work together with requirements, risks, tests, and documents
2. **Existing Infrastructure**: WorkItem service already handles all types
3. **Unified Data Model**: All work items share common properties and relationships
4. **Traceability**: Tasks can implement requirements, have risks, be tested
5. **Version History**: WorkItem versioning works consistently

### Milestones as Separate Nodes

**Reasons:**
1. **Project Management Only**: Milestones are used exclusively for scheduling, not general work tracking
2. **Different Lifecycle**: Milestones have different properties and relationships than WorkItems
3. **Scheduling Focus**: Milestones are checkpoints in project timelines, not trackable work
4. **Simpler Queries**: `MATCH (m:Milestone)` is clearer than filtering WorkItems
5. **No Versioning Needed**: Milestones don't need the complex versioning of WorkItems

## What Changed from Initial Implementation

### ❌ Reverted (Incorrect Approach)
- Separate Task node type with label "Task"
- Treating Milestones as WorkItem with type='milestone'

### ✅ Correct Approach
- Keep Task as WorkItem(type='task')
- Create Milestone as separate node with label "Milestone"
- Add type-specific properties to WorkItem schema for tasks
- Create separate Milestone schema and service
- Use existing WorkItem service and endpoints for tasks
- Create new Milestone service and endpoints
- Query tasks: `MATCH (w:WorkItem {type: 'task'})`
- Query milestones: `MATCH (m:Milestone)`

## Implementation Tasks (Updated)

### Task 1.3: Add Task-Specific Properties to WorkItem ✅
- Add skills_needed property (array of strings) for resource matching
- Add workpackage_id property for quick lookup
- Add story_points, done, start_date, end_date, due_date properties
- Update WorkItem schemas to include task-specific properties
- Write tests for task properties

### Task 1.4: Create Milestone Node Type
- Create Milestone vertex label in Apache AGE
- Add Milestone node creation in graph service
- Create Milestone schemas (MilestoneBase, MilestoneCreate, MilestoneUpdate, MilestoneResponse)
- Create MilestoneService for CRUD operations
- Add Milestone CRUD endpoints
- Write unit tests for Milestone operations
- Write property tests for Milestone properties

## Graph Queries

### Query Tasks (WorkItem nodes)
```cypher
// Get all tasks
MATCH (w:WorkItem {type: 'task'})
RETURN w

// Get tasks with specific skills
MATCH (w:WorkItem {type: 'task'})
WHERE 'Python' IN w.skills_needed
RETURN w

// Get tasks in workpackage
MATCH (w:WorkItem {type: 'task', workpackage_id: 'wp-123'})
RETURN w
```

### Query Milestones (Milestone nodes)
```cypher
// Get all milestones for project
MATCH (m:Milestone {project_id: 'proj-123'})
RETURN m

// Get manual constraint milestones
MATCH (m:Milestone {is_manual_constraint: true})
RETURN m

// Get milestones with target date in range
MATCH (m:Milestone)
WHERE m.target_date >= '2024-01-01' AND m.target_date <= '2024-12-31'
RETURN m
```

## Relationships

### Task Relationships (WorkItem nodes)

```cypher
// Task dependencies
(task1:WorkItem {type: 'task'})-[:DEPENDS_ON]->(task2:WorkItem {type: 'task'})

// Task to milestone
(task:WorkItem {type: 'task'})-[:BLOCKS]->(milestone:Milestone)

// Task to requirement
(task:WorkItem {type: 'task'})-[:implements]->(req:WorkItem {type: 'requirement'})

// Task to risk
(task:WorkItem {type: 'task'})-[:has_risk]->(risk:WorkItem {type: 'risk'})

// Task to workpackage
(task:WorkItem {type: 'task'})-[:BELONGS_TO]->(wp:Workpackage)

// Task to backlog
(task:WorkItem {type: 'task'})-[:IN_BACKLOG]->(backlog:Backlog)

// Task to sprint
(task:WorkItem {type: 'task'})-[:ASSIGNED_TO_SPRINT]->(sprint:Sprint)

// Resource to task
(resource:Resource)-[:ALLOCATED_TO]->(task:WorkItem {type: 'task'})
```

### Milestone Relationships (Milestone nodes)

```cypher
// Milestone to project
(milestone:Milestone)-[:BELONGS_TO]->(project:Project)

// Milestone depends on task
(milestone:Milestone)-[:DEPENDS_ON]->(task:WorkItem {type: 'task'})

// Task blocks milestone (inverse of above)
(task:WorkItem {type: 'task'})-[:BLOCKS]->(milestone:Milestone)
```

## Benefits of This Approach

### For Tasks as WorkItem:
1. **Simplicity**: One node type for all work items
2. **Consistency**: All work items handled the same way
3. **Traceability**: Tasks integrate with requirements, risks, tests
4. **Existing Infrastructure**: Leverages WorkItem service
5. **Version History**: Consistent versioning across all work

### For Milestones as Separate Nodes:
1. **Clarity**: Clear distinction between work items and project checkpoints
2. **Simpler Schema**: No need for type-specific properties in WorkItem
3. **Focused Service**: MilestoneService handles only scheduling concerns
4. **Better Queries**: Direct milestone queries without type filtering
5. **Appropriate Complexity**: Milestones don't need WorkItem's versioning/signing

## Migration Path

### For Tasks (No Migration Needed)
The existing WorkItem infrastructure already supports:
- Type-specific properties
- Flexible schema
- All required relationships

We just need to:
1. Add new properties to WorkItem schemas (skills_needed, workpackage_id, etc.) ✅
2. Update WorkItem service to handle new properties ✅
3. Add validation for type-specific properties ✅
4. Write tests for new properties ✅

### For Milestones (New Implementation Needed)
1. Create Milestone vertex label in Apache AGE
2. Create Milestone schemas (Base, Create, Update, Response)
3. Create MilestoneService for CRUD operations
4. Create Milestone API endpoints
5. Write tests for Milestone operations
6. No migration needed - milestones are new functionality

## Conclusion

**Tasks** remain as WorkItem types (type='task') because they are integrated with other work items (requirements, risks, tests, documents) in project management workflows. This is simpler, more maintainable, and leverages existing infrastructure.

**Milestones** are separate Milestone nodes because they are used exclusively for project scheduling and have different properties, relationships, and lifecycle than general work items.

## References

- Original spec: `.kiro/specs/backend-schedule-api/requirements.md`
- Updated tasks: `.kiro/specs/backend-schedule-api/tasks.md`
- WorkItem service: `backend/app/services/workitem_service.py`
- WorkItem schemas: `backend/app/schemas/workitem.py`
- Milestone service: `backend/app/services/milestone_service.py` (to be created)
- Milestone schemas: `backend/app/schemas/milestone.py` (to be created)

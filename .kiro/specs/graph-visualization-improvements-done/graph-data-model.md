# RxDx Graph Data Model Documentation

This document provides a comprehensive overview of all node types, their attributes, relationship types, and their attributes in the RxDx knowledge graph system.

## Table of Contents

1. [Node Types](#node-types)
2. [Node Attributes by Type](#node-attributes-by-type)
3. [Relationship Types](#relationship-types)
4. [Relationship Attributes](#relationship-attributes)
5. [Visual Representation](#visual-representation)

---

## Node Types

The RxDx graph supports the following node types:

### Work Item Types (lowercase in frontend)
- `requirement` - Requirements and specifications
- `task` - Tasks and action items
- `test` - Test specifications and test cases
- `risk` - Risk items for FMEA (Failure Mode and Effects Analysis)
- `document` - Documentation nodes

### Graph Entity Types (PascalCase from backend)
- `WorkItem` - Base work item type (generic)
- `Requirement` - Specific requirement nodes
- `Task` - Task nodes
- `Test` - Test specification nodes
- `Risk` - Risk nodes for FMEA
- `Failure` - Failure nodes for FMEA chains
- `Document` - Document nodes
- `Entity` - Entities extracted from emails/meetings
- `User` - User nodes for relationships
- `Company` - Company/organization nodes
- `Department` - Department nodes within companies
- `Resource` - Resource nodes (people, equipment, etc.)
- `Project` - Project nodes
- `Phase` - Phase nodes within projects
- `Workpackage` - Work package nodes within phases
- `Milestone` - Milestone nodes
- `Sprint` - Sprint nodes for agile workflows
- `Backlog` - Backlog nodes

---

## Node Attributes by Type

### Common Attributes (All WorkItem Types)

All work item types inherit these base attributes:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Unique identifier |
| `type` | string | Yes | Node type (requirement, task, test, risk, document) |
| `title` | string | Yes | Title/name (1-500 characters) |
| `description` | string | No | Detailed description |
| `status` | string | Yes | Status (draft, active, completed, archived) |
| `priority` | integer | No | Priority level (1-5, where 1 is highest) |
| `assigned_to` | UUID | No | User ID of assignee |
| `version` | string | Yes | Version identifier |
| `created_by` | UUID | Yes | User ID of creator |
| `created_at` | datetime | Yes | Creation timestamp |
| `updated_at` | datetime | Yes | Last update timestamp |
| `is_signed` | boolean | Yes | Whether the item is signed/approved |

### Requirement-Specific Attributes

Additional attributes for `requirement` type nodes:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `acceptance_criteria` | string | No | Acceptance criteria (20-2000 chars, structured format) |
| `business_value` | string | No | Business value/justification (10-1000 chars) |
| `source` | string | No | Source of requirement (stakeholder, regulation, standard, user_story, business_rule, technical_constraint, compliance, security, performance, usability, other) |

**Validation Rules:**
- Acceptance criteria must follow structured format (Given-When-Then) with keywords like 'given', 'when', 'then', 'should', 'must', 'shall'
- No placeholder text (TODO, TBD, FIXME, XXX) allowed
- Source must be one of the predefined valid sources

### Task-Specific Attributes

Additional attributes for `task` type nodes:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `estimated_hours` | float | No | Estimated effort in hours |
| `actual_hours` | float | No | Actual effort spent in hours |
| `skills_needed` | list[string] | No | Required skills (each 2-50 chars) |
| `story_points` | integer | No | Story points (1-100) |
| `start_date` | datetime | No | Planned start date |
| `due_date` | datetime | No | Due date |
| `completed_date` | datetime | No | Actual completion date |
| `done` | boolean | No | Whether task is completed |

**Validation Rules:**
- Skills must be 2-50 characters each
- Story points must be 1-100
- Dates must be valid datetime values

### Test-Specific Attributes

Additional attributes for `test` type nodes:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `test_type` | string | No | Type of test (unit, integration, system, acceptance, regression, performance, security, usability) |
| `test_status` | string | No | Test execution status (not_run, passed, failed, blocked, skipped) |
| `test_steps` | string | No | Test execution steps |
| `expected_result` | string | No | Expected test result |
| `actual_result` | string | No | Actual test result |
| `test_data` | string | No | Test data requirements |

**Validation Rules:**
- Test type must be one of the predefined types
- Test status must be one of the predefined statuses

### Risk-Specific Attributes

Additional attributes for `risk` type nodes:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `severity` | integer | No | Severity rating (1-10) |
| `occurrence` | integer | No | Occurrence probability (1-10) |
| `detection` | integer | No | Detection difficulty (1-10) |
| `rpn` | integer | No | Risk Priority Number (severity × occurrence × detection) |
| `mitigation_plan` | string | No | Plan to mitigate the risk |
| `contingency_plan` | string | No | Contingency plan if risk occurs |

**Calculated Fields:**
- RPN is automatically calculated as severity × occurrence × detection

### Document-Specific Attributes

Additional attributes for `document` type nodes:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `document_type` | string | No | Type of document (specification, design, manual, report, other) |
| `file_path` | string | No | Path to document file |
| `file_size` | integer | No | File size in bytes |
| `mime_type` | string | No | MIME type of document |
| `version_number` | string | No | Document version number |

### User Node Attributes

Attributes for `User` type nodes:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Unique user identifier |
| `email` | string | Yes | User email address |
| `name` | string | Yes | User full name |
| `role` | string | No | User role in system |

### Project/Phase/Workpackage Attributes

Attributes for project management nodes:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Unique identifier |
| `name` | string | Yes | Name of project/phase/workpackage |
| `description` | string | No | Detailed description |
| `start_date` | datetime | No | Start date |
| `end_date` | datetime | No | End date |
| `status` | string | No | Current status |

### Resource Node Attributes

Attributes for `Resource` type nodes:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Unique identifier |
| `name` | string | Yes | Resource name |
| `type` | string | No | Resource type (person, equipment, etc.) |
| `availability` | float | No | Availability percentage |
| `cost_per_hour` | float | No | Cost per hour |

### Company/Department Attributes

Attributes for organizational nodes:

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | UUID | Yes | Unique identifier |
| `name` | string | Yes | Company/department name |
| `description` | string | No | Description |
| `parent_id` | UUID | No | Parent organization ID |

---

## Relationship Types

The RxDx graph supports the following relationship types:

### Work Item Relationships

| Relationship Type | Source → Target | Description |
|-------------------|-----------------|-------------|
| `TESTED_BY` | Requirement → Test | Requirement is tested by a test case |
| `MITIGATES` | Requirement → Risk | Requirement mitigates a risk |
| `DEPENDS_ON` | WorkItem → WorkItem | Work item depends on another |
| `IMPLEMENTS` | Task → Requirement | Task implements a requirement |
| `REFERENCES` | WorkItem → WorkItem | Work item references another |
| `NEXT_VERSION` | WorkItem → WorkItem | Version history chain |

### FMEA Relationships

| Relationship Type | Source → Target | Description |
|-------------------|-----------------|-------------|
| `LEADS_TO` | Risk → Failure | Risk leads to a failure mode |
| `has_risk` | Task → Risk | Task has an associated risk |

### Entity Relationships

| Relationship Type | Source → Target | Description |
|-------------------|-----------------|-------------|
| `RELATES_TO` | Entity → Entity | Generic entity relationship |
| `MENTIONED_IN` | Entity → WorkItem | Entity mentioned in work item |

### User Relationships

| Relationship Type | Source → Target | Description |
|-------------------|-----------------|-------------|
| `CREATED_BY` | WorkItem → User | Work item created by user |
| `ASSIGNED_TO` | WorkItem → User | Work item assigned to user |

### Organizational Relationships

| Relationship Type | Source → Target | Description |
|-------------------|-----------------|-------------|
| `PARENT_OF` | Company → Department | Company contains department |
| `PARENT_OF` | Department → Department | Department hierarchy |
| `BELONGS_TO` | Phase → Project | Phase belongs to project |
| `BELONGS_TO` | Workpackage → Phase | Workpackage belongs to phase |
| `BELONGS_TO` | Task → Workpackage | Task belongs to workpackage |
| `LINKED_TO_DEPARTMENT` | Workpackage → Department | Workpackage linked to department |

### Resource Relationships

| Relationship Type | Source → Target | Description |
|-------------------|-----------------|-------------|
| `ALLOCATED_TO` | Resource → Project | Resource allocated to project |
| `ALLOCATED_TO` | Resource → Task | Resource allocated to task |

### Agile Workflow Relationships

| Relationship Type | Source → Target | Description |
|-------------------|-----------------|-------------|
| `IN_BACKLOG` | Task → Backlog | Task is in backlog |
| `ASSIGNED_TO_SPRINT` | Task → Sprint | Task assigned to sprint |
| `BLOCKS` | Task → Milestone | Task blocks milestone |

---

## Relationship Attributes

Relationships can have the following attributes:

### Common Relationship Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `id` | string | Unique relationship identifier |
| `type` | string | Relationship type (see above) |
| `created_at` | datetime | When relationship was created |
| `created_by` | UUID | User who created relationship |

### ALLOCATED_TO Specific Attributes

For `ALLOCATED_TO` relationships:

| Attribute | Type | Description |
|-----------|------|-------------|
| `lead` | boolean | Whether resource is lead on project/task |
| `allocation_percentage` | float | Percentage of resource allocated (0-100) |
| `start_date` | datetime | Allocation start date |
| `end_date` | datetime | Allocation end date |

### LEADS_TO Specific Attributes

For `LEADS_TO` relationships (FMEA):

| Attribute | Type | Description |
|-----------|------|-------------|
| `probability` | float | Probability of failure (0-1) |
| `severity` | integer | Severity if failure occurs (1-10) |
| `detection` | integer | Detection difficulty (1-10) |

### DEPENDS_ON Specific Attributes

For `DEPENDS_ON` relationships:

| Attribute | Type | Description |
|-----------|------|-------------|
| `dependency_type` | string | Type of dependency (finish-to-start, start-to-start, finish-to-finish, start-to-finish) |
| `lag_days` | integer | Lag time in days |

---

## Visual Representation

### Node Visualization in 2D Graph

#### Requirement Node
- **Shape**: Rectangle with rounded corners
- **Color**: Blue (#e3f2fd background, #1976d2 border)
- **Icon**: None (type label "REQ")
- **Special Indicators**: 
  - ✓ checkmark if `is_signed` is true

#### Task Node
- **Shape**: Circle
- **Color**: Green (#e8f5e9 background, #388e3c border)
- **Icon**: Checkmark in upper left corner
- **Special Indicators**:
  - Concentric progress circle (8px from boundary)
  - Progress: 100% if `done` is true, 0% otherwise
  - Size varies by priority (higher priority = larger circle)
  - Base radius: 32px
  - Size multiplier: 2 - priority/5 (default 1.25x if no priority)

#### Test Node
- **Shape**: Rectangle with rounded corners
- **Color**: Orange (#fff3e0 background, #f57c00 border)
- **Icon**: None (type label "TEST")
- **Special Indicators**:
  - Status icon based on `test_status`:
    - ✓ (green) for "passed"
    - ✗ (red) for "failed"
    - ⊘ (gray) for "blocked"
    - ⊗ (orange) for "skipped"
    - ○ (gray) for "not_run"

#### Risk Node
- **Shape**: Rectangle with rounded corners
- **Color**: Red (#ffebee background, #d32f2f border)
- **Icon**: None (type label "RISK")
- **Special Indicators**:
  - RPN (Risk Priority Number) displayed
  - Color-coded by RPN value:
    - Red if RPN > 100
    - Orange if RPN > 50
    - Green if RPN ≤ 50

#### Document Node
- **Shape**: Rectangle with rounded corners
- **Color**: Purple (#f3e5f5 background, #7b1fa2 border)
- **Icon**: None (type label "DOC")

#### Default Node (Other Types)
- **Shape**: Rectangle with rounded corners
- **Color**: Gray (#fafafa background, #9e9e9e border)
- **Icon**: None (type label based on type)

### Node Interaction States

All nodes support the following interaction states:

| State | Visual Effect |
|-------|---------------|
| **Normal** | Standard colors, 2px border |
| **Selected** | Black border (3px), standard colors |
| **Hovered** | 10% scale increase (1.1x), standard colors |
| **Dragging** | No hover effect, standard colors |

### Edge Visualization

Edges (relationships) are rendered as:
- **Style**: Solid lines
- **Color**: Gray (#9e9e9e)
- **Arrow**: Directional arrow at target end
- **Label**: Relationship type displayed on edge
- **Selected**: Thicker line, darker color

---

## Node Type Filter

The graph supports filtering by node type. All node types are visible by default. Users can toggle visibility for:

### Work Item Types (lowercase)
- requirement
- task
- test
- risk
- document

### Graph Entity Types (PascalCase)
- WorkItem
- Project
- Phase
- Workpackage
- Resource
- Company
- Department
- Milestone
- Sprint
- Backlog
- User
- Entity
- Document
- Failure

**Filter Behavior:**
- Filters are shared between 2D and 3D views
- When a node type is hidden, all nodes of that type are removed from view
- Edges are automatically hidden if either source or target node is hidden
- Filter state persists during view mode transitions (2D ↔ 3D)

---

## Coordinate Systems

### 2D Coordinate System
- **X-axis**: Horizontal position (pixels)
- **Y-axis**: Vertical position (pixels)
- **Origin**: Top-left corner
- **Range**: Typically 0-5000 pixels (depends on layout)

### 3D Coordinate System
- **X-axis**: Horizontal position (world units)
- **Y-axis**: Vertical position (height, typically 0)
- **Z-axis**: Depth position (world units)
- **Origin**: Center of 3D space
- **Conversion**: 2D coordinates × 0.02 scale factor

### Position Synchronization
- Node positions are synchronized between 2D and 3D views
- 2D (x, y) maps to 3D (x, 0, z) where 2D y becomes 3D z
- User-positioned nodes (dragged) maintain their positions across view switches
- Auto-positioned nodes use layout algorithm positions

---

## Data Validation Rules

### Title Validation
- **Length**: 1-500 characters
- **Required**: Yes
- **Prohibited**: Leading/trailing whitespace, placeholder text (TODO, TBD, FIXME, XXX)

### Description Validation
- **Length**: No minimum, 5000 character maximum
- **Required**: No
- **Prohibited**: Placeholder text in some contexts

### Status Validation
- **Valid Values**: draft, active, completed, archived
- **Required**: Yes
- **Default**: draft

### Priority Validation
- **Range**: 1-5 (1 is highest priority)
- **Required**: No
- **Type**: Integer

### Date Validation
- **Format**: ISO 8601 datetime
- **Required**: Varies by field
- **Validation**: Must be valid datetime, logical ordering (start < due < completed)

---

## Performance Considerations

### Node Limits
- **Maximum Nodes**: 1000 nodes per graph view (enforced)
- **Warning**: Displayed if query returns more than 1000 nodes
- **Recommendation**: Use filters to reduce dataset

### Depth Limits
- **Minimum Depth**: 1
- **Maximum Depth**: 10
- **Default Depth**: 2
- **Recommendation**: Use depth 2-3 for optimal performance

### Layout Performance
- **Force Layout**: Best for < 500 nodes
- **Hierarchical Layout**: Best for tree structures
- **Circular Layout**: Best for cyclic relationships
- **Grid Layout**: Best for uniform distribution

---

## API Query Parameters

When querying the graph visualization API:

```
GET /api/v1/graph/visualization
```

**Parameters:**
- `center_node_id` (optional): UUID of center node
- `depth` (required): Traversal depth (1-5, default 2)
- `node_types` (optional): List of node types to include
- `relationship_types` (optional): List of relationship types to include
- `limit` (required): Maximum nodes to return (10-5000, default 1000)

**Example:**
```
GET /api/v1/graph/visualization?center_node_id=123e4567-e89b-12d3-a456-426614174000&depth=2&limit=1000
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-02-12 | Initial documentation with all node types, attributes, and relationships |

---

## References

- **Backend Schema**: `backend/app/db/graph.py`
- **Frontend Store**: `frontend/src/stores/graphStore.ts`
- **Workitem Schemas**: `backend/app/schemas/workitem.py`
- **Graph API**: `backend/app/api/v1/graph.py`
- **Node Components**: `frontend/src/components/graph/nodes/`
- **Graph Views**: `frontend/src/components/graph/GraphView2D.tsx`, `frontend/src/components/graph/GraphView3D.tsx`

# Design Document: Graph and Table UI Enhancements

## Overview

This design document specifies the technical implementation for enhancing the RxDx project management system's user interface. The enhancements focus on three main areas:

1. **Unified Table View**: Renaming and expanding the Requirements page to display all work item types
2. **Advanced Filtering**: Adding comprehensive node type filters to both Table and Graph Explorer pages
3. **Graph Editing**: Enabling full CRUD operations on graph nodes and relationships
4. **Search Functionality**: Fixing and improving the graph search feature
5. **Bulk Operations**: Implementing bulk edit capabilities for work items

The design follows React best practices, leverages existing Zustand state management, and maintains backward compatibility with the current API structure.

## Architecture

### High-Level Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  ┌──────────────────┐              ┌────────────────────┐  │
│  │   Table Page     │              │  Graph Explorer    │  │
│  │  (Renamed from   │              │      Page          │  │
│  │  Requirements)   │              │                    │  │
│  └────────┬─────────┘              └─────────┬──────────┘  │
│           │                                   │              │
│           │                                   │              │
│  ┌────────▼─────────────────────────────────▼──────────┐  │
│  │          Shared Filter Components                    │  │
│  │  ┌──────────────────┐  ┌──────────────────────┐    │  │
│  │  │ NodeTypeFilter   │  │  BulkEditModal       │    │  │
│  │  │   Component      │  │    Component         │    │  │
│  │  └──────────────────┘  └──────────────────────┘    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│                      State Management Layer                │
│  ┌──────────────────┐              ┌────────────────────┐ │
│  │ workitemStore    │              │   graphStore       │ │
│  │  - items         │              │   - nodes          │ │
│  │  - filters       │              │   - edges          │ │
│  │  - bulkEdit      │              │   - nodeFilters    │ │
│  └────────┬─────────┘              └─────────┬──────────┘ │
└───────────┼────────────────────────────────────┼───────────┘
            │                                    │
┌───────────▼────────────────────────────────────▼───────────┐
│                      Service Layer                          │
│  ┌──────────────────┐              ┌────────────────────┐ │
│  │ workitemService  │              │   graphService     │ │
│  │  - list()        │              │   - search()       │ │
│  │  - bulkUpdate()  │              │   - getViz()       │ │
│  └────────┬─────────┘              └─────────┬──────────┘ │
└───────────┼────────────────────────────────────┼───────────┘
            │                                    │
┌───────────▼────────────────────────────────────▼───────────┐
│                      Backend API                            │
│  /api/v1/workitems                /api/v1/graph            │
│  - GET /workitems                 - GET /visualization     │
│  - PATCH /workitems/bulk          - GET /search            │
│                                   - POST /relationships     │
│                                   - DELETE /relationships   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Filter Selection**: User selects node types → Store updates → Service fetches filtered data → UI updates
2. **Node Editing**: User edits node → NodeEditor validates → Service updates → Graph refreshes
3. **Relationship Management**: User creates/edits/deletes relationship → Service updates → Graph refreshes
4. **Bulk Edit**: User selects items → Opens bulk edit modal → Service batch updates → Table refreshes
5. **Search**: User types query → Service searches → Results displayed → User selects → Graph centers on node

## Components and Interfaces

### 1. NodeTypeFilter Component

A reusable filter component for selecting node types to display.

**Location**: `frontend/src/components/common/NodeTypeFilter.tsx`

**Props Interface**:
```typescript
interface NodeTypeFilterProps {
  /** Current filter state */
  selectedTypes: Set<string>;
  /** Callback when filter changes */
  onChange: (selectedTypes: Set<string>) => void;
  /** Available node types to filter */
  availableTypes: NodeTypeOption[];
  /** Whether to show work item sub-types */
  showWorkItemTypes?: boolean;
  /** Whether to organize by category */
  showCategories?: boolean;
  /** Compact or expanded layout */
  layout?: 'compact' | 'expanded';
}

interface NodeTypeOption {
  value: string;
  label: string;
  category?: 'workitems' | 'structure' | 'resources' | 'other';
  color?: string;
  icon?: string;
}
```

**Features**:
- Multi-select checkboxes for each node type
- "Select All" / "Clear All" buttons
- Category grouping (Work Items, Project Structure, Resources, Other)
- Visual indicators (colors, icons) for each type
- Collapsible categories in expanded layout
- Compact dropdown mode for mobile

**State Management**:
- Uses local state for UI interactions
- Calls `onChange` callback to update parent store
- Debounces changes to prevent excessive re-renders

### 2. BulkEditModal Component

Modal for editing multiple work items simultaneously.

**Location**: `frontend/src/components/workitems/BulkEditModal.tsx`

**Props Interface**:
```typescript
interface BulkEditModalProps {
  /** Selected work item IDs */
  selectedIds: string[];
  /** Callback when bulk edit completes */
  onSuccess: () => void;
  /** Callback to close modal */
  onCancel: () => void;
}

interface BulkEditFormData {
  status?: WorkItemStatus;
  priority?: number;
  assigned_to?: string;
}
```

**Features**:
- Form with common editable fields (status, priority, assigned_to)
- Checkbox to enable/disable each field
- Preview of affected items count
- Progress indicator during update
- Success/error messaging
- Validation before submission

### 3. Enhanced NodeEditor Component

**CURRENT STATUS**: NodeEditor already has save functionality implemented with validation, loading states, and error handling.

Extended version of existing NodeEditor with save functionality.

**Location**: `frontend/src/components/graph/NodeEditor.tsx` (existing file, already enhanced)

**Existing Features**:
- Save button (enabled when changes detected) ✓
- Loading state during save ✓
- Success/error notifications ✓
- Validation (title required) ✓
- Change detection ✓
- Reset/Cancel functionality ✓

**Implementation Notes**:
- The save functionality is already implemented via `updateNode` from graphStore
- Task 12 will verify the implementation and add any missing features
- The component properly handles the `isUpdating` state from the store
- Error handling is in place with both local and store error states

### 4. RelationshipEditor Component

New component for editing graph relationships.

**Location**: `frontend/src/components/graph/RelationshipEditor.tsx`

**Props Interface**:
```typescript
interface RelationshipEditorProps {
  /** Selected edge/relationship */
  relationship: GraphEdge | null;
  /** Callback when relationship is updated */
  onUpdate: (relationshipId: string, type: string) => void;
  /** Callback when relationship is deleted */
  onDelete: (relationshipId: string) => void;
  /** Callback to close editor */
  onClose: () => void;
}

interface RelationshipFormData {
  type: string;
  properties?: Record<string, unknown>;
}
```

**Features**:
- Display relationship details (source, target, type)
- Dropdown to change relationship type
- Delete button with confirmation
- Property editor for relationship metadata
- Validation of relationship types

### 5. ConnectionMode Component

New component for creating relationships in the graph.

**Location**: `frontend/src/components/graph/ConnectionMode.tsx`

**Props Interface**:
```typescript
interface ConnectionModeProps {
  /** Whether connection mode is active */
  isActive: boolean;
  /** Callback to toggle connection mode */
  onToggle: () => void;
  /** Callback when connection is created */
  onConnectionCreated: (sourceId: string, targetId: string, type: string) => void;
}
```

**Features**:
- Toggle button to enter/exit connection mode
- Visual feedback (cursor change, node highlighting)
- Two-step selection (source → target)
- Relationship type selector
- Cancel action

### 6. Enhanced Table Page

Renamed and enhanced version of Requirements page.

**Location**: `frontend/src/pages/Table.tsx` (renamed from `Requirements.tsx`)

**New Features**:
- NodeTypeFilter component integration
- Bulk edit mode toggle
- Checkbox column for bulk selection
- "Select All" checkbox in header
- Bulk edit button (shown when items selected)
- Session storage for filter state

**Route Changes**:
```typescript
// In App.tsx
<Route path="/table" element={<Table />} />
<Route path="/requirements" element={<Navigate to="/table" replace />} />
```

### 7. Enhanced Graph Explorer Page

Enhanced version with filtering and fixed search.

**Location**: `frontend/src/pages/GraphExplorer.tsx` (existing file, enhanced)

**New Features**:
- NodeTypeFilter component integration
- Fixed search functionality
- RelationshipEditor integration
- ConnectionMode integration
- Session storage for filter state

## Data Models

### Extended WorkItemStore

**Location**: `frontend/src/stores/workitemStore.ts`

**New State**:
```typescript
interface WorkItemState {
  // ... existing state ...
  
  // Bulk edit state
  selectedIds: Set<string>;
  isBulkEditing: boolean;
  isBulkUpdating: boolean;
  
  // Filter state
  nodeTypeFilter: Set<string>;
}
```

**New Actions**:
```typescript
interface WorkItemActions {
  // ... existing actions ...
  
  // Bulk edit operations
  toggleBulkEdit: () => void;
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  bulkUpdate: (data: BulkEditFormData) => Promise<void>;
  
  // Filter operations
  setNodeTypeFilter: (types: Set<string>) => void;
  getFilteredItems: () => WorkItem[];
}
```

### Extended GraphStore

**CURRENT STATUS**: GraphStore already has extensive filter state management and synchronization between 2D/3D views.

**Location**: `frontend/src/stores/graphStore.ts`

**Existing State**:
```typescript
interface GraphState {
  // ... existing state ...
  
  // Filter state (ALREADY IMPLEMENTED)
  nodeTypeFilter: NodeTypeFilter; // Filters for requirement, task, test, risk, document
  
  // Relationship editing state (PARTIALLY IMPLEMENTED)
  // selectedRelationship: GraphEdge | null; // NEEDS TO BE ADDED
  // isEditingRelationship: boolean; // NEEDS TO BE ADDED
  
  // Connection mode state (PARTIALLY IMPLEMENTED)
  isConnectionMode: boolean; // NEEDS TO BE ADDED
  connectionSource: string | null; // NEEDS TO BE ADDED
  
  // Search state (ALREADY IMPLEMENTED)
  searchResults: SearchResult[];
  isSearching: boolean;
  searchQuery: string;
  searchError: string | null; // NEEDS TO BE ADDED
}
```

**Existing Actions** (Already Implemented):
```typescript
interface GraphActions {
  // Filter operations (ALREADY IMPLEMENTED)
  toggleNodeTypeFilter: (nodeType: FilterableNodeType) => void;
  setNodeTypeFilters: (filters: Partial<NodeTypeFilter>) => void;
  getFilteredNodes: () => Node<GraphNodeData>[];
  getFilteredEdges: () => Edge[];
  
  // Relationship operations (PARTIALLY IMPLEMENTED)
  createRelationship: (fromId: string, toId: string, type: string) => Promise<void>;
  deleteRelationship: (relationshipId: string) => Promise<void>;
  // updateRelationship: (relationshipId: string, type: string) => Promise<void>; // NEEDS TO BE ADDED
  
  // Search (ALREADY IMPLEMENTED)
  searchNodes: (query: string) => Promise<void>;
  clearSearch: () => void;
  selectSearchResult: (result: SearchResult) => Promise<void>;
}
```

**New Actions Needed**:
```typescript
interface GraphActions {
  // Relationship operations
  selectRelationship: (relationship: GraphEdge | null) => void;
  updateRelationship: (relationshipId: string, type: string) => Promise<void>;
  
  // Connection mode operations
  toggleConnectionMode: () => void;
  setConnectionSource: (nodeId: string | null) => void;
  
  // Enhanced search
  clearSearchError: () => void;
  
  // Load available node types from backend
  loadAvailableNodeTypes: () => Promise<void>;
}
```

### Session Storage Schema

**Filter State Storage**:
```typescript
interface StoredFilterState {
  table: {
    nodeTypes: string[];
    timestamp: number;
  };
  graph: {
    nodeTypes: string[];
    timestamp: number;
  };
}

// Storage key
const FILTER_STORAGE_KEY = 'rxdx_node_filters';
```

## Service Layer Extensions

### WorkItemService Extensions

**Location**: `frontend/src/services/workitemService.ts`

**New Methods**:
```typescript
class WorkItemService {
  // ... existing methods ...
  
  /**
   * Bulk update multiple work items
   * @param ids - Array of work item IDs to update
   * @param data - Update data to apply to all items
   * @returns Array of updated work items
   */
  async bulkUpdate(
    ids: string[],
    data: WorkItemUpdate
  ): Promise<WorkItem[]> {
    try {
      const response = await apiClient.patch<WorkItem[]>(
        `${this.basePath}/bulk`,
        { ids, data }
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
}
```

### GraphService Extensions

**Location**: `frontend/src/services/graphService.ts`

**Enhanced Methods**:
```typescript
class GraphService {
  // ... existing methods ...
  
  /**
   * Search nodes with improved error handling
   * @param query - Search query string
   * @param limit - Maximum number of results
   * @returns Array of matching nodes
   */
  async search(query: string, limit?: number): Promise<GraphNode[]> {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }
      
      const queryParams = new URLSearchParams();
      queryParams.append('query', query.trim());
      if (limit !== undefined) {
        queryParams.append('limit', limit.toString());
      }
      
      const response = await apiClient.get<{ results: BackendNode[] }>(
        `${this.basePath}/search?${queryParams.toString()}`
      );
      
      if (!response || !response.data || !response.data.results) {
        return [];
      }
      
      const nodes = response.data.results
        .map(transformBackendNode)
        .filter((node): node is GraphNode => node !== null);
      
      return nodes;
    } catch (error) {
      console.error('[GraphService] Search error:', error);
      throw new Error(getErrorMessage(error));
    }
  }
  
  /**
   * Update relationship type
   * @param relationshipId - Relationship ID
   * @param newType - New relationship type
   * @returns Updated relationship
   */
  async updateRelationship(
    relationshipId: string,
    newType: string
  ): Promise<GraphEdge> {
    try {
      const response = await apiClient.patch<GraphEdge>(
        `${this.basePath}/relationships/${relationshipId}`,
        { type: newType }
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
  
  /**
   * Get available node types from the graph
   * @returns Array of node type strings
   */
  async getAvailableNodeTypes(): Promise<string[]> {
    try {
      const response = await apiClient.get<{ node_types: string[] }>(
        `${this.basePath}/schema`
      );
      return response.data.node_types || [];
    } catch (error) {
      console.error('[GraphService] Failed to load node types:', error);
      // Return default types as fallback
      return [
        'WorkItem',
        'Project',
        'Phase',
        'Workpackage',
        'Resource',
        'Company',
        'Department',
        'Milestone',
        'Sprint',
        'Backlog',
        'User',
        'Entity',
        'Document',
        'Failure'
      ];
    }
  }
}
```

## Backend API Requirements

### New Endpoints

#### 1. Bulk Update Endpoint

**Endpoint**: `PATCH /api/v1/workitems/bulk`

**Request Body**:
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"],
  "data": {
    "status": "active",
    "priority": 2,
    "assigned_to": "user-uuid"
  }
}
```

**Response**:
```json
{
  "updated": [
    { "id": "uuid1", "title": "...", "status": "active", ... },
    { "id": "uuid2", "title": "...", "status": "active", ... }
  ],
  "failed": [
    { "id": "uuid3", "error": "Not found" }
  ]
}
```

#### 2. Update Relationship Endpoint

**Endpoint**: `PATCH /api/v1/graph/relationships/{relationship_id}`

**Request Body**:
```json
{
  "type": "DEPENDS_ON",
  "properties": {
    "weight": 5
  }
}
```

**Response**:
```json
{
  "id": "rel-uuid",
  "source": "node1-uuid",
  "target": "node2-uuid",
  "type": "DEPENDS_ON",
  "properties": { "weight": 5 }
}
```

#### 3. Get Schema Endpoint

**Endpoint**: `GET /api/v1/graph/schema`

**Response**:
```json
{
  "node_types": [
    "WorkItem",
    "Project",
    "Phase",
    "Workpackage",
    "Resource",
    "Company",
    "Department",
    "Milestone",
    "Sprint",
    "Backlog",
    "User",
    "Entity",
    "Document",
    "Failure"
  ],
  "relationship_types": [
    "TESTED_BY",
    "MITIGATES",
    "DEPENDS_ON",
    "IMPLEMENTS",
    "LEADS_TO",
    "RELATES_TO",
    "MENTIONED_IN",
    "REFERENCES",
    "NEXT_VERSION",
    "CREATED_BY",
    "ASSIGNED_TO",
    "PARENT_OF",
    "BELONGS_TO",
    "ALLOCATED_TO",
    "LINKED_TO_DEPARTMENT",
    "IN_BACKLOG",
    "ASSIGNED_TO_SPRINT",
    "has_risk",
    "implements",
    "BLOCKS"
  ]
}
```

### Enhanced Endpoints

#### Search Endpoint Enhancement

**Endpoint**: `GET /api/v1/graph/search?query={query}&limit={limit}`

**Current Issues**:
- May not be returning results correctly
- Error handling needs improvement
- Response format may be inconsistent

**Required Fixes**:
- Ensure case-insensitive search
- Search both title and description fields
- Return consistent response format
- Add proper error handling
- Add query validation

**Expected Response**:
```json
{
  "results": [
    {
      "id": "node-uuid",
      "type": "WorkItem",
      "label": "User Authentication",
      "properties": {
        "description": "Implement user authentication system",
        "status": "active"
      }
    }
  ],
  "total": 1,
  "query": "authentication"
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Backward Compatibility Redirect

*For any* navigation attempt to "/requirements", the system should redirect to "/table" and update the URL accordingly.

**Validates: Requirements 1.4**

### Property 2: Default Filter Shows All Types

*For any* initial page load of the Table page with no stored filter state, all work item types (requirement, task, test, risk, document) should be visible in the table.

**Validates: Requirements 2.1**

### Property 3: Filter Affects Visible Items

*For any* combination of selected work item types in the Table page filter, the table should display only work items matching the selected types.

**Validates: Requirements 3.4**

### Property 4: Session Filter Persistence Round Trip

*For any* filter state set on the Table or Graph Explorer page, navigating away and returning within the same session should restore the exact same filter state.

**Validates: Requirements 3.5, 8.2**

### Property 5: Graph Filter Affects Visible Nodes

*For any* combination of selected node types in the Graph Explorer filter, the graph should display only nodes matching the selected types.

**Validates: Requirements 4.5**

### Property 6: Edge Visibility Follows Node Visibility

*For any* edge in the graph, if either the source node or target node is hidden by the node type filter, the edge must also be hidden.

**Validates: Requirements 4.6**

### Property 7: Filter State Synchronization Between Views

*For any* node type filter state in 2D view, switching to 3D view should preserve that exact filter state, and vice versa.

**Validates: Requirements 4.8, 9.1**

### Property 8: Node Update Validation

*For any* node edit attempt with invalid data (such as empty title), the save operation should fail and display a validation error message.

**Validates: Requirements 5.3**

### Property 9: Node Update Persistence

*For any* valid node update, after successful save, querying the node from the database should return the updated values.

**Validates: Requirements 5.4**

### Property 10: Selection Preservation After Save

*For any* selected node, after successfully saving changes to that node, the node should remain selected in the UI.

**Validates: Requirements 5.10**

### Property 11: Relationship Deletion Persistence

*For any* relationship, after confirming deletion, querying for that relationship should return not found.

**Validates: Requirements 6.6**

### Property 12: Duplicate Relationship Prevention

*For any* two nodes with an existing relationship of type T, attempting to create another relationship of the same type T between the same nodes should fail with an error.

**Validates: Requirements 7.9**

### Property 13: Filter Performance

*For any* node type filter change, the UI should update to reflect the new filter within 500 milliseconds.

**Validates: Requirements 10.4, 13.1**

### Property 14: Graph Rendering Limit

*For any* graph visualization request, the number of nodes rendered in the viewport should not exceed 1000 nodes.

**Validates: Requirements 13.4**

### Property 15: Referential Integrity on Node Deletion

*For any* relationship, if either the source node or target node is deleted, the relationship should be automatically removed from the database.

**Validates: Requirements 15.3**

### Property 16: Case-Insensitive Search

*For any* search query string, the search results should include nodes whose title or description contains the query string, regardless of case differences.

**Validates: Requirements 16.2**

### Property 17: Search Result Navigation

*For any* search result selected by the user, the graph viewport should center on that node and the node should be highlighted.

**Validates: Requirements 16.4**

### Property 18: Bulk Update Consistency

*For any* set of selected work items and valid bulk update data, after successful bulk update, all selected items should reflect the updated values when queried.

**Validates: Requirements 17.8**

### Property 19: Table Refresh After Bulk Update

*For any* successful bulk update operation, the table should refresh and display the updated values for all affected work items.

**Validates: Requirements 17.12**

## Error Handling

### Client-Side Error Handling

**Validation Errors**:
- Display inline validation messages for form fields
- Prevent submission until validation passes
- Clear validation errors when user corrects input

**Network Errors**:
- Display user-friendly error messages
- Provide retry buttons for failed operations
- Show connection status indicators
- Implement exponential backoff for retries

**State Errors**:
- Gracefully handle corrupted session storage
- Reset to default state if stored state is invalid
- Log errors for debugging

**Concurrent Edit Errors**:
- Detect version conflicts
- Prompt user to refresh and retry
- Preserve user's unsaved changes when possible

### Backend Error Handling

**Validation Errors** (400):
- Return detailed field-level error messages
- Include error codes for client-side handling
- Validate all inputs before processing

**Not Found Errors** (404):
- Return clear messages indicating what was not found
- Suggest alternative actions

**Conflict Errors** (409):
- Return current state for conflict resolution
- Include version information

**Server Errors** (500):
- Log detailed error information
- Return generic user-friendly message
- Include request ID for support

## Testing Strategy

### Unit Testing

**Component Tests**:
- NodeTypeFilter: Rendering, selection, callbacks
- BulkEditModal: Form validation, submission, error handling
- NodeEditor: Save functionality, validation, loading states
- RelationshipEditor: Update, delete, validation
- ConnectionMode: State management, node selection

**Store Tests**:
- workitemStore: Bulk operations, filter state, session storage
- graphStore: Filter operations, relationship CRUD, connection mode

**Service Tests**:
- workitemService: Bulk update API calls, error handling
- graphService: Search, relationship operations, schema loading

### Property-Based Testing

**Test Configuration**:
- Minimum 100 iterations per property test
- Use fast-check library for TypeScript
- Tag each test with feature name and property number

**Property Test Examples**:

```typescript
// Property 3: Filter Affects Visible Items
test('Feature: graph-table-ui-enhancements, Property 3: Filter affects visible items', () => {
  fc.assert(
    fc.property(
      fc.array(fc.constantFrom('requirement', 'task', 'test', 'risk', 'document')),
      fc.array(workItemArbitrary),
      (selectedTypes, allItems) => {
        const filtered = filterItemsByType(allItems, new Set(selectedTypes));
        return filtered.every(item => selectedTypes.includes(item.type));
      }
    ),
    { numRuns: 100 }
  );
});

// Property 6: Edge Visibility Follows Node Visibility
test('Feature: graph-table-ui-enhancements, Property 6: Edge visibility follows node visibility', () => {
  fc.assert(
    fc.property(
      fc.array(nodeArbitrary),
      fc.array(edgeArbitrary),
      fc.set(fc.string()),
      (nodes, edges, hiddenTypes) => {
        const visibleNodeIds = new Set(
          nodes.filter(n => !hiddenTypes.has(n.type)).map(n => n.id)
        );
        const visibleEdges = filterEdgesByNodeVisibility(edges, visibleNodeIds);
        return visibleEdges.every(e => 
          visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
        );
      }
    ),
    { numRuns: 100 }
  );
});

// Property 4: Session Filter Persistence Round Trip
test('Feature: graph-table-ui-enhancements, Property 4: Session filter persistence round trip', () => {
  fc.assert(
    fc.property(
      fc.set(fc.string()),
      (filterState) => {
        saveFilterState('table', filterState);
        const restored = loadFilterState('table');
        return setsEqual(filterState, restored);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**Page-Level Tests**:
- Table page: Filter, bulk edit, navigation
- Graph Explorer: Filter, search, node editing, relationship management

**End-to-End Tests**:
- Complete user flows: Filter → Select → Bulk Edit → Verify
- Cross-page flows: Table → Graph → Edit → Return
- Session persistence: Set filters → Logout → Login → Verify

### Performance Testing

**Filter Performance**:
- Measure time from filter change to UI update
- Test with various data sizes (10, 100, 1000 items)
- Verify < 500ms requirement

**Bulk Update Performance**:
- Test bulk updates with 10, 50, 100 items
- Measure total time and per-item time
- Verify progress indicators update smoothly

**Graph Rendering Performance**:
- Test with 100, 500, 1000, 2000 nodes
- Verify 1000 node limit is enforced
- Measure frame rate during interactions

## Migration and Deployment

### File Renaming

**Frontend Files**:
```bash
# Rename page component
mv frontend/src/pages/Requirements.tsx frontend/src/pages/Table.tsx

# Update imports in App.tsx
# Update route definitions
```

**Navigation Updates**:
- Update NavigationHeader component
- Update all internal links
- Add redirect route for backward compatibility

### Database Migrations

No database schema changes required. All changes are frontend-only.

### Feature Flags

Consider using feature flags for gradual rollout:

```typescript
const FEATURE_FLAGS = {
  bulkEdit: true,
  graphRelationshipEdit: true,
  enhancedFilters: true,
};
```

### Rollback Plan

If issues arise:
1. Revert route changes (keep redirect)
2. Disable bulk edit feature
3. Revert to simple node type filter
4. Restore original search implementation

### Monitoring

**Metrics to Track**:
- Filter usage frequency
- Bulk edit operation success rate
- Search query success rate
- Node/relationship edit success rate
- Performance metrics (filter time, bulk update time)

**Error Tracking**:
- Client-side errors (validation, network)
- Server-side errors (API failures)
- Performance degradation alerts

## Summary of Current Implementation Status

### ✅ Already Implemented
1. **NodeEditor Save Functionality** - Complete with validation, loading states, error handling
2. **GraphStore Filter State** - NodeTypeFilter for work item types (requirement, task, test, risk, document)
3. **Filter Synchronization** - Between 2D and 3D views
4. **Search Functionality** - Basic search with results display
5. **Relationship Creation** - createRelationship method exists
6. **Relationship Deletion** - deleteRelationship method exists

### 🔨 Needs Implementation
1. **NodeTypeFilter Component** - Reusable UI component for filtering
2. **Table Page Renaming** - Requirements.tsx → Table.tsx with routing updates
3. **Remove Hardcoded Filter** - Remove `initialFilters={{ type: 'requirement' }}` from Table page
4. **Bulk Edit** - Complete bulk edit functionality (store, modal, UI)
5. **Relationship Editing** - Update relationship type functionality
6. **RelationshipEditor Component** - UI for editing relationships
7. **ConnectionMode Component** - UI for creating relationships
8. **Session Storage** - Persist filter state across page navigation
9. **Backend Endpoints** - Bulk update, update relationship, get schema
10. **Extend Filters** - Support all graph node types (not just work items)

### 📝 Implementation Notes
- The design document has been updated to reflect current implementations
- Tasks have been adjusted to build on existing functionality
- All optional test tasks are now required
- Focus on extending existing implementations rather than replacing them

### Data Protection

**Session Storage**:
- Store only non-sensitive filter state
- Clear on logout
- Validate before use

**API Requests**:
- Include authentication tokens
- Use HTTPS for all requests
- Implement CSRF protection

## Accessibility

### Keyboard Navigation

**Filter Controls**:
- Tab through checkboxes
- Space to toggle selection
- Enter to apply filters

**Bulk Edit**:
- Tab through form fields
- Escape to cancel
- Enter to submit

**Graph Interactions**:
- Arrow keys to navigate nodes
- Enter to select node
- Delete to remove relationship

### Screen Reader Support

**ARIA Labels**:
- Label all filter controls
- Announce filter changes
- Describe bulk edit actions
- Announce save success/failure

**Focus Management**:
- Move focus to error messages
- Return focus after modal close
- Maintain logical tab order

### Visual Accessibility

**Color Contrast**:
- Meet WCAG 2.1 Level AA standards
- Don't rely solely on color for information
- Provide text labels for all indicators

**Text Size**:
- Support browser zoom up to 200%
- Use relative units (rem, em)
- Maintain readability at all sizes

## Performance Optimization

### Rendering Optimization

**React Optimization**:
- Use React.memo for filter components
- Implement useMemo for expensive computations
- Use useCallback for event handlers
- Virtualize large lists (react-window)

**Graph Optimization**:
- Implement node culling (render only visible nodes)
- Use WebGL for large graphs
- Debounce filter changes
- Lazy load node details

### State Management Optimization

**Zustand Optimization**:
- Use selectors to prevent unnecessary re-renders
- Split stores by concern
- Implement shallow equality checks

**Session Storage Optimization**:
- Debounce writes to session storage
- Compress large filter states
- Clean up old entries

### Network Optimization

**API Optimization**:
- Batch bulk update requests
- Implement request caching
- Use HTTP/2 multiplexing
- Compress responses

**Loading States**:
- Show skeleton screens
- Implement optimistic updates
- Prefetch likely next actions

## Future Enhancements

### Phase 2 Features

**Advanced Filtering**:
- Date range filters
- Custom filter expressions
- Saved filter presets
- Filter templates

**Bulk Operations**:
- Bulk delete
- Bulk status transitions
- Bulk assignment
- Bulk tagging

**Graph Enhancements**:
- Relationship property editing
- Custom node layouts
- Graph annotations
- Subgraph extraction

### Phase 3 Features

**Collaboration**:
- Real-time collaborative editing
- Change notifications
- Comment threads on nodes
- Activity feed

**Analytics**:
- Filter usage analytics
- Performance dashboards
- User behavior tracking
- A/B testing framework

## Appendix

### Node Type Categories

**Work Items**:
- requirement
- task
- test
- risk
- document

**Project Structure**:
- Project
- Phase
- Workpackage
- Milestone

**Resources**:
- Resource
- Company
- Department
- User

**Other**:
- Sprint
- Backlog
- Entity
- Failure

### Relationship Types

**Work Item Relationships**:
- TESTED_BY: Requirement → Test
- MITIGATES: Requirement → Risk
- DEPENDS_ON: WorkItem → WorkItem
- IMPLEMENTS: Task → Requirement
- REFERENCES: WorkItem → WorkItem

**Project Structure Relationships**:
- BELONGS_TO: Phase → Project, Workpackage → Phase
- PARENT_OF: Company → Department
- LINKED_TO_DEPARTMENT: Workpackage → Department

**Resource Relationships**:
- ALLOCATED_TO: Resource → Project/Task
- ASSIGNED_TO: WorkItem → User
- CREATED_BY: WorkItem → User

**Sprint/Backlog Relationships**:
- IN_BACKLOG: Task → Backlog
- ASSIGNED_TO_SPRINT: Task → Sprint
- BLOCKS: Task → Milestone

**Risk Relationships**:
- LEADS_TO: Risk → Failure
- has_risk: Task → Risk

**Other Relationships**:
- RELATES_TO: Entity → Entity
- MENTIONED_IN: Entity → WorkItem
- NEXT_VERSION: WorkItem → WorkItem

### Color Scheme

**Node Colors**:
- requirement: #3b82f6 (blue)
- task: #10b981 (green)
- test: #8b5cf6 (purple)
- risk: #ef4444 (red)
- document: #f59e0b (amber)
- Project: #06b6d4 (cyan)
- Phase: #14b8a6 (teal)
- Workpackage: #84cc16 (lime)
- Resource: #f97316 (orange)
- Company: #6366f1 (indigo)
- Department: #a855f7 (purple)
- Milestone: #ec4899 (pink)
- Sprint: #22c55e (green)
- Backlog: #64748b (slate)
- User: #8b5cf6 (violet)
- Entity: #78716c (stone)
- Failure: #dc2626 (red)

### API Response Examples

**Bulk Update Success**:
```json
{
  "updated": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "task",
      "title": "Implement login",
      "status": "active",
      "priority": 2,
      "version": "1.1"
    }
  ],
  "failed": []
}
```

**Bulk Update Partial Failure**:
```json
{
  "updated": [
    { "id": "uuid1", "title": "...", "status": "active" }
  ],
  "failed": [
    {
      "id": "uuid2",
      "error": "Not found"
    },
    {
      "id": "uuid3",
      "error": "Permission denied"
    }
  ]
}
```

**Search Results**:
```json
{
  "results": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "type": "WorkItem",
      "label": "User Authentication System",
      "properties": {
        "type": "requirement",
        "description": "Implement secure user authentication",
        "status": "active",
        "priority": 1
      }
    }
  ],
  "total": 1,
  "query": "authentication"
}
```

**Graph Schema**:
```json
{
  "node_types": [
    "WorkItem", "Project", "Phase", "Workpackage", "Resource",
    "Company", "Department", "Milestone", "Sprint", "Backlog",
    "User", "Entity", "Document", "Failure"
  ],
  "relationship_types": [
    "TESTED_BY", "MITIGATES", "DEPENDS_ON", "IMPLEMENTS",
    "LEADS_TO", "RELATES_TO", "MENTIONED_IN", "REFERENCES",
    "NEXT_VERSION", "CREATED_BY", "ASSIGNED_TO", "PARENT_OF",
    "BELONGS_TO", "ALLOCATED_TO", "LINKED_TO_DEPARTMENT",
    "IN_BACKLOG", "ASSIGNED_TO_SPRINT", "has_risk",
    "implements", "BLOCKS"
  ]
}
```

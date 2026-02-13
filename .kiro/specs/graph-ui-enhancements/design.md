# Design Document: Graph UI Enhancements

## Overview

This design document specifies the implementation of four UI enhancements for the Graph Explorer page in the RxDx project management system. These enhancements improve user control over graph visualization, search capabilities, focused analysis through node isolation, and UI clarity.

The enhancements build upon the existing GraphExplorer implementation without requiring backend changes. All features are frontend-only modifications that leverage existing infrastructure including the LayoutEngine, graphStore, and React Flow components.

### Design Goals

1. **Layout Control**: Provide users with fine-grained control over node spacing through a distance slider
2. **Enhanced Search**: Expand search to cover all node types and properties for better discoverability
3. **Focused Analysis**: Enable users to isolate nodes and their neighbors for concentrated analysis
4. **UI Clarity**: Simplify type filter labels by removing technical color information

### Scope

**In Scope:**
- Distance control slider for layout algorithms
- Enhanced search across all node types and properties
- Shift-click node isolation with depth control
- Simplified type filter label display

**Out of Scope:**
- Backend API changes
- Performance optimization (will be addressed separately)
- 3D view enhancements
- New layout algorithms

## Architecture

### Component Structure

```
GraphExplorer (pages/GraphExplorer.tsx)
├── Toolbar
│   ├── NodeTypeFilter (enhanced labels)
│   ├── LayoutSelector
│   ├── DistanceControl (NEW)
│   ├── SearchContainer (enhanced)
│   └── DepthControl
├── GraphView2D
│   └── (handles Shift-click isolation)
└── IsolationIndicator (NEW)
```

### State Management

The graphStore (Zustand) will be extended with:

```typescript
interface GraphStore {
  // Existing state...
  
  // NEW: Distance control state
  layoutDistance: number;
  setLayoutDistance: (distance: number) => void;
  
  // NEW: Isolation mode state
  isIsolationMode: boolean;
  isolatedNodeId: string | null;
  isolationDepth: number;
  visibleNodeIds: Set<string>;
  enterIsolationMode: (nodeId: string) => void;
  exitIsolationMode: () => void;
  updateIsolationDepth: (depth: number) => void;
}
```

### Data Flow

1. **Distance Control Flow:**
   ```
   User adjusts slider → setLayoutDistance() → localStorage → LayoutEngine config → Layout recalculation
   ```

2. **Enhanced Search Flow:**
   ```
   User enters query → searchNodes() → graphService.search() → Filter all node types → Display results
   ```

3. **Isolation Mode Flow:**
   ```
   User Shift-clicks node → enterIsolationMode() → Calculate neighbors → Filter visible nodes → Update graph
   ```

4. **Type Filter Flow:**
   ```
   NodeTypeFilter renders → Format labels (remove color text) → Display with color indicator
   ```


## Components and Interfaces

### 1. Distance Control Component

**Location:** `frontend/src/components/graph/DistanceControl.tsx`

**Purpose:** Provides a slider control for adjusting node spacing in layout algorithms.

**Interface:**

```typescript
export interface DistanceControlProps {
  /** Current distance value */
  value: number;
  /** Callback when distance changes */
  onChange: (distance: number) => void;
  /** Minimum distance value (default: 50) */
  min?: number;
  /** Maximum distance value (default: 500) */
  max?: number;
  /** Step increment (default: 10) */
  step?: number;
  /** Whether to show the numeric value (default: true) */
  showValue?: boolean;
  /** Optional CSS class name */
  className?: string;
}

export const DistanceControl: React.FC<DistanceControlProps>;
```

**Implementation Details:**
- Renders an HTML range input (slider) with numeric display
- Debounces onChange calls to prevent excessive layout recalculations (300ms)
- Persists value to localStorage with key `graph-layout-distance`
- Displays current value next to slider
- Integrates with graphStore's `layoutDistance` state

### 2. Enhanced Search Implementation

**Location:** `frontend/src/stores/graphStore.ts` (modification)

**Changes to searchNodes:**

```typescript
searchNodes: async (query: string): Promise<void> => {
  if (!query.trim()) {
    set({ searchResults: [], searchQuery: '', isSearching: false });
    return;
  }

  set({ isSearching: true, searchQuery: query, error: null });

  try {
    // Search across ALL nodes in the current graph, not just via API
    const state = get();
    const allNodes = state.nodes;
    const normalizedQuery = query.toLowerCase().trim();
    
    // Filter nodes by ID or title (case-insensitive)
    const matchingNodes = allNodes.filter(node => {
      const idMatch = node.id.toLowerCase().includes(normalizedQuery);
      const titleMatch = node.label?.toLowerCase().includes(normalizedQuery);
      return idMatch || titleMatch;
    });
    
    // Transform to SearchResult format
    const searchResults: SearchResult[] = matchingNodes.map(node => ({
      id: node.id,
      type: node.type,
      label: node.label,
      properties: node.properties,
    }));

    set({ searchResults, isSearching: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Search failed';
    set({ error: message, isSearching: false, searchResults: [] });
  }
};
```

**Key Changes:**
- Search operates on client-side node data instead of API call
- Searches both `node.id` and `node.label` fields
- Case-insensitive matching using `toLowerCase()`
- Includes all node types (WorkItem, User, Project, Phase, etc.)

### 3. Isolation Mode Implementation

**Location:** `frontend/src/stores/graphStore.ts` (extension)

**New State and Actions:**

```typescript
// State
isIsolationMode: false,
isolatedNodeId: null,
isolationDepth: 1, // Uses current depth value
visibleNodeIds: new Set<string>(),

// Actions
enterIsolationMode: (nodeId: string): void => {
  const state = get();
  const depth = state.depth;
  
  // Calculate neighbors up to depth
  const neighbors = calculateNeighbors(nodeId, state.nodes, state.edges, depth);
  const visibleIds = new Set([nodeId, ...neighbors]);
  
  set({
    isIsolationMode: true,
    isolatedNodeId: nodeId,
    isolationDepth: depth,
    visibleNodeIds: visibleIds,
  });
},

exitIsolationMode: (): void => {
  set({
    isIsolationMode: false,
    isolatedNodeId: null,
    visibleNodeIds: new Set(),
  });
},

updateIsolationDepth: (depth: number): void => {
  const state = get();
  if (!state.isIsolationMode || !state.isolatedNodeId) return;
  
  // Recalculate neighbors with new depth
  const neighbors = calculateNeighbors(
    state.isolatedNodeId,
    state.nodes,
    state.edges,
    depth
  );
  const visibleIds = new Set([state.isolatedNodeId, ...neighbors]);
  
  set({
    isolationDepth: depth,
    visibleNodeIds: visibleIds,
  });
},
```

**Helper Function:**

```typescript
function calculateNeighbors(
  nodeId: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  depth: number
): string[] {
  const visited = new Set<string>();
  const queue: Array<{ id: string; level: number }> = [{ id: nodeId, level: 0 }];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.level >= depth) continue;
    if (visited.has(current.id)) continue;
    
    visited.add(current.id);
    
    // Find connected nodes
    edges.forEach(edge => {
      if (edge.source === current.id && !visited.has(edge.target)) {
        queue.push({ id: edge.target, level: current.level + 1 });
      }
      if (edge.target === current.id && !visited.has(edge.source)) {
        queue.push({ id: edge.source, level: current.level + 1 });
      }
    });
  }
  
  visited.delete(nodeId); // Remove the starting node
  return Array.from(visited);
}
```

### 4. Isolation Indicator Component

**Location:** `frontend/src/components/graph/IsolationIndicator.tsx`

**Purpose:** Displays a banner when isolation mode is active.

**Interface:**

```typescript
export interface IsolationIndicatorProps {
  /** Name of the isolated node */
  nodeName: string;
  /** Current isolation depth */
  depth: number;
  /** Callback to exit isolation mode */
  onExit: () => void;
  /** Optional CSS class name */
  className?: string;
}

export const IsolationIndicator: React.FC<IsolationIndicatorProps>;
```

**Implementation:**
- Renders a banner at the top of the graph view
- Shows: "Isolated: {nodeName} (Depth: {depth})"
- Includes an "Exit" button to leave isolation mode
- Styled with distinct background color for visibility

### 5. Enhanced NodeTypeFilter

**Location:** `frontend/src/components/common/NodeTypeFilter.tsx` (modification)

**Changes:**

Remove the screen reader text that includes color information:

```typescript
// BEFORE:
<span className="filter-type-label">
  {type.label}
  {type.color && (
    <span className="sr-only"> (color: {type.color})</span>
  )}
</span>

// AFTER:
<span className="filter-type-label">
  {type.label}
</span>
```

The visual color indicator (colored dot/square) remains unchanged:

```typescript
<span
  className="filter-type-color"
  style={{ backgroundColor: type.color || 'transparent' }}
  aria-hidden="true"
  title={`Color indicator for ${type.label}`}
/>
```


## Data Models

### Layout Configuration Extension

The LayoutEngine configuration will be extended to support dynamic distance parameters:

```typescript
// Existing LayoutConfig interface (extended)
export interface LayoutConfig {
  algorithm: LayoutAlgorithm;
  distance?: number; // NEW: User-controlled distance parameter
  force?: ForceSimulationConfig;
  hierarchical?: HierarchicalLayoutConfig;
  circular?: CircularLayoutConfig;
  grid?: GridLayoutConfig;
}

// Force simulation config (modified)
export interface ForceSimulationConfig {
  repulsionStrength: number;
  attractionStrength: number;
  idealEdgeLength: number; // Will be set from distance parameter
  centerGravity: number;
  damping: number;
  minSpacing: number; // Will be scaled from distance parameter
  useBarnesHut: boolean;
  barnesHutTheta: number;
  collisionStrength: number;
}

// Hierarchical layout config (modified)
export interface HierarchicalLayoutConfig {
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  levelSeparation: number; // Will be set from distance parameter
  nodeSeparation: number; // Will be scaled from distance parameter
  treeSpacing: number;
}

// Circular layout config (modified)
export interface CircularLayoutConfig {
  radius: number; // Will be scaled from distance parameter
  startAngle: number;
  endAngle: number;
}

// Grid layout config (modified)
export interface GridLayoutConfig {
  rowSpacing: number; // Will be set from distance parameter
  columnSpacing: number; // Will be set from distance parameter
}
```

### Distance-to-Config Mapping

The distance parameter (50-500) will be mapped to layout-specific parameters:

```typescript
function applyDistanceToConfig(
  distance: number,
  algorithm: LayoutAlgorithm,
  baseConfig: LayoutConfig
): LayoutConfig {
  const config = { ...baseConfig };
  
  switch (algorithm) {
    case 'force':
      config.force = {
        ...config.force,
        idealEdgeLength: distance,
        minSpacing: distance * 0.2,
        repulsionStrength: distance * 10,
      };
      break;
      
    case 'hierarchical':
      config.hierarchical = {
        ...config.hierarchical,
        levelSeparation: distance,
        nodeSeparation: distance * 0.5,
      };
      break;
      
    case 'circular':
      config.circular = {
        ...config.circular,
        radius: distance * 2,
      };
      break;
      
    case 'grid':
      config.grid = {
        ...config.grid,
        rowSpacing: distance,
        columnSpacing: distance,
      };
      break;
  }
  
  return config;
}
```

### Isolation Mode State

```typescript
interface IsolationModeState {
  /** Whether isolation mode is active */
  isActive: boolean;
  /** ID of the isolated node */
  nodeId: string | null;
  /** Depth of neighbor traversal */
  depth: number;
  /** Set of visible node IDs (isolated node + neighbors) */
  visibleNodeIds: Set<string>;
}
```

### Search Result Model

No changes needed - existing SearchResult interface already supports all node types:

```typescript
export interface SearchResult {
  id: string;
  type: string; // Can be any node type
  label: string;
  properties?: Record<string, unknown>;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Feature 1: Layout Algorithm Distance Control

**Property 1: Distance value constraints**
*For any* distance value set by the user, the value should be between 50 and 500 (inclusive) and should be a multiple of 10.
**Validates: Requirements 1.2**

**Property 2: Layout configuration updates**
*For any* distance value change, the layout algorithm configuration should be updated with parameters derived from the new distance value.
**Validates: Requirements 1.3, 1.8**

**Property 3: Animation continuity**
*For any* layout recalculation triggered by distance change, the animation should start from the current node positions rather than random or default positions.
**Validates: Requirements 1.4**

**Property 4: Distance persistence round-trip**
*For any* distance value, saving it to localStorage and then reading it back should return the same value.
**Validates: Requirements 1.5**

**Property 5: Distance display consistency**
*For any* distance value in the slider, the displayed numeric value should match the slider's current value.
**Validates: Requirements 1.7**

### Feature 2: Enhanced Search Functionality

**Property 6: Search scope completeness**
*For any* node in the graph (regardless of type), if the search query matches either its ID or title, the node should appear in the search results.
**Validates: Requirements 2.1, 2.2**

**Property 7: Case-insensitive search equivalence**
*For any* search query string, searching with different case variations (uppercase, lowercase, mixed) should return the same set of results.
**Validates: Requirements 2.3**

**Property 8: Search result completeness**
*For any* search query, all nodes whose ID or title contains the query string (case-insensitive) should be included in the results.
**Validates: Requirements 2.4**

**Property 9: Search result formatting**
*For any* search result, the rendered output should contain the node's type, ID, and title.
**Validates: Requirements 2.6**

### Feature 3: Shift-Click Node Isolation

**Property 10: Isolation visibility correctness**
*For any* node and depth value, when isolation mode is active, the visible nodes should be exactly the isolated node plus all nodes reachable within the specified depth.
**Validates: Requirements 3.1, 3.2**

**Property 11: Isolated edge validity**
*For any* isolated subgraph, all visible edges should connect two nodes that are both in the visible node set.
**Validates: Requirements 3.3**

**Property 12: Isolation mode transitions**
*For any* two nodes A and B, if A is isolated and the user Shift-clicks B, the visible node set should update to show B and its neighbors (not A's neighbors).
**Validates: Requirements 3.4**

**Property 13: Isolation depth responsiveness**
*For any* depth change while in isolation mode, the visible node set should immediately update to include all neighbors within the new depth.
**Validates: Requirements 3.8**

**Property 14: Isolation indicator content**
*For any* isolated node and depth value, the isolation indicator should display text containing both the node's name and the current depth value.
**Validates: Requirements 3.7**

### Feature 4: Simplified Type Filter Display

**Property 15: Type label format**
*For any* node type displayed in the filter, the label text should not contain the pattern "(color: ...)".
**Validates: Requirements 4.1**

**Property 16: Hover text format**
*For any* type filter option, the hover/title text should not contain technical color codes or the pattern "(color: ...)".
**Validates: Requirements 4.4**


## Error Handling

### Distance Control Errors

**Invalid Distance Values:**
- **Scenario:** User manually enters a value outside the 50-500 range
- **Handling:** Clamp value to nearest valid boundary (50 or 500)
- **User Feedback:** Visual indication that value was adjusted

**localStorage Errors:**
- **Scenario:** localStorage is unavailable or quota exceeded
- **Handling:** Continue with default distance value (100), log warning to console
- **User Feedback:** None (graceful degradation)

**Layout Calculation Errors:**
- **Scenario:** Layout engine throws error during recalculation
- **Handling:** Catch error, revert to previous distance value, display error banner
- **User Feedback:** Error message: "Failed to apply layout distance. Reverting to previous value."

### Enhanced Search Errors

**Empty Graph:**
- **Scenario:** User searches when no nodes are loaded
- **Handling:** Return empty results immediately
- **User Feedback:** "No nodes available to search"

**Search Performance:**
- **Scenario:** Large graph (>1000 nodes) causes slow search
- **Handling:** Debounce search input (300ms), show loading indicator
- **User Feedback:** Loading spinner while searching

**No Results:**
- **Scenario:** Search query matches no nodes
- **Handling:** Display empty state message
- **User Feedback:** "No results found for '{query}'"

### Isolation Mode Errors

**Invalid Node ID:**
- **Scenario:** User Shift-clicks on a node that no longer exists
- **Handling:** Ignore the click, log warning
- **User Feedback:** None

**Disconnected Graph:**
- **Scenario:** Isolated node has no neighbors at any depth
- **Handling:** Show only the isolated node
- **User Feedback:** Isolation indicator shows "Depth: {depth}, 0 neighbors"

**Depth Change During Isolation:**
- **Scenario:** User changes depth while in isolation mode
- **Handling:** Recalculate neighbors immediately, update visible nodes
- **User Feedback:** Smooth transition to new neighbor set

**Exit Isolation Errors:**
- **Scenario:** Error restoring full graph view
- **Handling:** Force reload of graph data
- **User Feedback:** Brief loading indicator

### Type Filter Errors

**Missing Color Property:**
- **Scenario:** Node type has no color defined
- **Handling:** Use transparent background for color indicator
- **User Feedback:** None (graceful degradation)

**Malformed Type Data:**
- **Scenario:** Type label is undefined or null
- **Handling:** Display type value as fallback
- **User Feedback:** None (graceful degradation)


## Testing Strategy

### Dual Testing Approach

This feature will use both unit tests and property-based tests for comprehensive coverage:

- **Unit tests**: Verify specific examples, edge cases, UI interactions, and integration points
- **Property tests**: Verify universal properties across all inputs using randomized testing

### Unit Testing

**Distance Control:**
- Test slider renders with correct min/max/step attributes
- Test numeric display updates when slider changes
- Test localStorage persistence on mount and unmount
- Test debouncing of onChange callbacks
- Test clamping of out-of-range values
- Test integration with LayoutEngine

**Enhanced Search:**
- Test search input renders correctly
- Test search results dropdown appears/disappears
- Test "No results" message displays when appropriate
- Test search result click centers viewport
- Test clear button resets search state
- Test search with empty graph
- Test search with special characters

**Isolation Mode:**
- Test Shift-click activates isolation mode
- Test isolation indicator appears/disappears
- Test Escape key exits isolation mode
- Test background click exits isolation mode
- Test isolation with disconnected nodes
- Test isolation mode state transitions
- Test depth control integration

**Type Filter:**
- Test labels render without "(color: ...)" text
- Test color indicators render correctly
- Test hover tooltips don't contain color codes
- Test filtering functionality still works
- Test with missing color properties

### Property-Based Testing

**Testing Library:** fast-check (for TypeScript/JavaScript)

**Configuration:** Minimum 100 iterations per property test

**Property Test Suite:**

**Property 1: Distance value constraints**
```typescript
// Feature: graph-ui-enhancements, Property 1: Distance value constraints
it('should only accept distance values between 50-500 in increments of 10', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 50, max: 500 }).filter(n => n % 10 === 0),
      (distance) => {
        const result = validateDistance(distance);
        expect(result).toBe(distance);
        expect(distance).toBeGreaterThanOrEqual(50);
        expect(distance).toBeLessThanOrEqual(500);
        expect(distance % 10).toBe(0);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 2: Layout configuration updates**
```typescript
// Feature: graph-ui-enhancements, Property 2: Layout configuration updates
it('should update layout config when distance changes', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 50, max: 500 }).filter(n => n % 10 === 0),
      fc.constantFrom('force', 'hierarchical', 'circular', 'grid'),
      (distance, algorithm) => {
        const config = applyDistanceToConfig(distance, algorithm, {});
        
        // Verify distance is reflected in algorithm-specific parameters
        switch (algorithm) {
          case 'force':
            expect(config.force?.idealEdgeLength).toBe(distance);
            break;
          case 'hierarchical':
            expect(config.hierarchical?.levelSeparation).toBe(distance);
            break;
          case 'circular':
            expect(config.circular?.radius).toBe(distance * 2);
            break;
          case 'grid':
            expect(config.grid?.rowSpacing).toBe(distance);
            break;
        }
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 4: Distance persistence round-trip**
```typescript
// Feature: graph-ui-enhancements, Property 4: Distance persistence round-trip
it('should persist and restore distance values correctly', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 50, max: 500 }).filter(n => n % 10 === 0),
      (distance) => {
        // Save to localStorage
        localStorage.setItem('graph-layout-distance', distance.toString());
        
        // Read back
        const restored = parseInt(localStorage.getItem('graph-layout-distance') || '100');
        
        expect(restored).toBe(distance);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 5: Distance display consistency**
```typescript
// Feature: graph-ui-enhancements, Property 5: Distance display consistency
it('should display the same value as the slider', () => {
  fc.assert(
    fc.property(
      fc.integer({ min: 50, max: 500 }).filter(n => n % 10 === 0),
      (distance) => {
        const { getByRole, getByText } = render(
          <DistanceControl value={distance} onChange={() => {}} />
        );
        
        const slider = getByRole('slider');
        expect(slider).toHaveValue(distance.toString());
        expect(getByText(distance.toString())).toBeInTheDocument();
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 7: Case-insensitive search equivalence**
```typescript
// Feature: graph-ui-enhancements, Property 7: Case-insensitive search equivalence
it('should return same results regardless of query case', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 20 }),
      (query) => {
        const nodes = generateRandomNodes(50);
        
        const resultsLower = searchNodes(nodes, query.toLowerCase());
        const resultsUpper = searchNodes(nodes, query.toUpperCase());
        const resultsMixed = searchNodes(nodes, query);
        
        expect(resultsLower).toEqual(resultsUpper);
        expect(resultsLower).toEqual(resultsMixed);
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 8: Search result completeness**
```typescript
// Feature: graph-ui-enhancements, Property 8: Search result completeness
it('should find all nodes matching ID or title', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({
        id: fc.uuid(),
        label: fc.string({ minLength: 5, maxLength: 50 }),
        type: fc.constantFrom('requirement', 'task', 'User', 'Project'),
      }), { minLength: 10, maxLength: 100 }),
      fc.string({ minLength: 2, maxLength: 10 }),
      (nodes, query) => {
        const results = searchNodes(nodes, query);
        const queryLower = query.toLowerCase();
        
        // All results should match the query
        results.forEach(result => {
          const idMatch = result.id.toLowerCase().includes(queryLower);
          const titleMatch = result.label.toLowerCase().includes(queryLower);
          expect(idMatch || titleMatch).toBe(true);
        });
        
        // All matching nodes should be in results
        nodes.forEach(node => {
          const idMatch = node.id.toLowerCase().includes(queryLower);
          const titleMatch = node.label.toLowerCase().includes(queryLower);
          
          if (idMatch || titleMatch) {
            expect(results.some(r => r.id === node.id)).toBe(true);
          }
        });
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 10: Isolation visibility correctness**
```typescript
// Feature: graph-ui-enhancements, Property 10: Isolation visibility correctness
it('should show exactly the isolated node plus neighbors within depth', () => {
  fc.assert(
    fc.property(
      fc.record({
        nodes: fc.array(fc.record({ id: fc.uuid() }), { minLength: 10, maxLength: 50 }),
        edges: fc.array(fc.record({
          source: fc.uuid(),
          target: fc.uuid(),
        }), { minLength: 10, maxLength: 100 }),
      }),
      fc.integer({ min: 0, max: 4 }), // nodeIndex
      fc.integer({ min: 1, max: 3 }), // depth
      ({ nodes, edges }, nodeIndex, depth) => {
        if (nodes.length === 0) return; // Skip empty graphs
        
        const targetNode = nodes[nodeIndex % nodes.length];
        const visibleIds = calculateIsolationVisibleNodes(
          targetNode.id,
          nodes,
          edges,
          depth
        );
        
        // Isolated node should always be visible
        expect(visibleIds.has(targetNode.id)).toBe(true);
        
        // All visible nodes should be reachable within depth
        visibleIds.forEach(id => {
          if (id === targetNode.id) return;
          const distance = calculateShortestPath(targetNode.id, id, edges);
          expect(distance).toBeLessThanOrEqual(depth);
        });
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 11: Isolated edge validity**
```typescript
// Feature: graph-ui-enhancements, Property 11: Isolated edge validity
it('should only show edges between visible nodes', () => {
  fc.assert(
    fc.property(
      fc.record({
        nodes: fc.array(fc.record({ id: fc.uuid() }), { minLength: 10, maxLength: 50 }),
        edges: fc.array(fc.record({
          source: fc.uuid(),
          target: fc.uuid(),
        }), { minLength: 10, maxLength: 100 }),
      }),
      fc.integer({ min: 0, max: 4 }),
      fc.integer({ min: 1, max: 3 }),
      ({ nodes, edges }, nodeIndex, depth) => {
        if (nodes.length === 0) return;
        
        const targetNode = nodes[nodeIndex % nodes.length];
        const visibleNodeIds = calculateIsolationVisibleNodes(
          targetNode.id,
          nodes,
          edges,
          depth
        );
        const visibleEdges = filterVisibleEdges(edges, visibleNodeIds);
        
        // All visible edges should connect two visible nodes
        visibleEdges.forEach(edge => {
          expect(visibleNodeIds.has(edge.source)).toBe(true);
          expect(visibleNodeIds.has(edge.target)).toBe(true);
        });
      }
    ),
    { numRuns: 100 }
  );
});
```

**Property 15: Type label format**
```typescript
// Feature: graph-ui-enhancements, Property 15: Type label format
it('should not include color text in type labels', () => {
  fc.assert(
    fc.property(
      fc.array(fc.record({
        value: fc.string({ minLength: 3, maxLength: 20 }),
        label: fc.string({ minLength: 3, maxLength: 30 }),
        color: fc.hexaString({ minLength: 6, maxLength: 6 }),
      }), { minLength: 5, maxLength: 20 }),
      (types) => {
        const { container } = render(
          <NodeTypeFilter
            selectedTypes={new Set()}
            onChange={() => {}}
            availableTypes={types}
          />
        );
        
        // Check that no label contains "(color: ...)"
        const labels = container.querySelectorAll('.filter-type-label');
        labels.forEach(label => {
          expect(label.textContent).not.toMatch(/\(color:\s*#?[0-9a-fA-F]+\)/);
        });
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**End-to-End Scenarios:**

1. **Distance Control Integration:**
   - Load GraphExplorer
   - Adjust distance slider
   - Verify layout updates smoothly
   - Refresh page
   - Verify distance is restored

2. **Search Integration:**
   - Load graph with mixed node types
   - Search for node by ID
   - Verify node is found and centered
   - Search for node by title
   - Verify node is found and centered

3. **Isolation Mode Integration:**
   - Load graph
   - Shift-click a node
   - Verify only neighbors are visible
   - Change depth control
   - Verify neighbor set updates
   - Press Escape
   - Verify full graph restored

4. **Type Filter Integration:**
   - Load GraphExplorer
   - Open type filter
   - Verify labels don't contain color text
   - Verify color indicators are visible
   - Toggle filters
   - Verify filtering still works

### Test Coverage Goals

- **Unit Test Coverage:** >80% for all modified components
- **Property Test Coverage:** All correctness properties implemented
- **Integration Test Coverage:** All user workflows tested end-to-end
- **Edge Case Coverage:** Empty graphs, disconnected nodes, invalid inputs


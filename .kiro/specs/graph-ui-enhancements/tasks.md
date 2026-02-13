# Implementation Plan: Graph UI Enhancements

## Overview

This implementation plan breaks down the four Graph UI enhancements into discrete, incremental tasks. Each task builds on previous work and includes testing to validate functionality. The implementation follows the order: Distance Control → Enhanced Search → Isolation Mode → Type Filter Simplification.

## Tasks

- [x] 1. Extend graphStore with distance control state
  - Add `layoutDistance` state (default: 100)
  - Add `setLayoutDistance` action
  - Implement localStorage persistence for distance value
  - Add distance parameter to layout configuration
  - _Requirements: 1.2, 1.5, 1.8_

- [x] 1.1 Write property test for distance value constraints
  - **Property 1: Distance value constraints**
  - **Validates: Requirements 1.2**

- [x] 1.2 Write property test for distance persistence
  - **Property 4: Distance persistence round-trip**
  - **Validates: Requirements 1.5**

- [x] 2. Create DistanceControl component
  - [x] 2.1 Implement slider with range 50-500, step 10
    - Create `frontend/src/components/graph/DistanceControl.tsx`
    - Render HTML range input with numeric display
    - Implement debounced onChange (300ms)
    - Add ARIA labels for accessibility
    - _Requirements: 1.1, 1.2, 1.7_
  
  - [x] 2.2 Write property test for distance display consistency
    - **Property 5: Distance display consistency**
    - **Validates: Requirements 1.7**
  
  - [x] 2.3 Integrate DistanceControl into GraphExplorer toolbar
    - Add component to toolbar between LayoutSelector and SearchContainer
    - Connect to graphStore's layoutDistance state
    - _Requirements: 1.1_

- [x] 3. Update LayoutEngine to use distance parameter
  - [x] 3.1 Modify LayoutEngine.calculateLayout to accept distance
    - Add distance parameter to LayoutConfig interface
    - Implement `applyDistanceToConfig` helper function
    - Map distance to force layout parameters (idealEdgeLength, minSpacing, repulsionStrength)
    - Map distance to hierarchical layout parameters (levelSeparation, nodeSeparation)
    - Map distance to circular layout parameters (radius)
    - Map distance to grid layout parameters (rowSpacing, columnSpacing)
    - _Requirements: 1.3, 1.8_
  
  - [x] 3.2 Write property test for layout configuration updates
    - **Property 2: Layout configuration updates**
    - **Validates: Requirements 1.3, 1.8**
  
  - [x] 3.3 Update GraphView2D to pass distance to layout calculations
    - Get distance from graphStore
    - Pass distance in layout config to LayoutEngine
    - Ensure smooth transitions when distance changes
    - _Requirements: 1.3, 1.4_
  
  - [x] 3.4 Write property test for animation continuity
    - **Property 3: Animation continuity**
    - **Validates: Requirements 1.4**

- [x] 4. Checkpoint - Distance control feature complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Enhance search functionality
  - [x] 5.1 Modify graphStore.searchNodes to search all node types
    - Change from API-based search to client-side filtering
    - Search across all nodes in current graph state
    - Match against both node.id and node.label
    - Implement case-insensitive matching with toLowerCase()
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  
  - [x] 5.2 Write property test for search scope completeness
    - **Property 6: Search scope completeness**
    - **Validates: Requirements 2.1, 2.2**
  
  - [x] 5.3 Write property test for case-insensitive search
    - **Property 7: Case-insensitive search equivalence**
    - **Validates: Requirements 2.3**
  
  - [x] 5.4 Write property test for search result completeness
    - **Property 8: Search result completeness**
    - **Validates: Requirements 2.4**
  
  - [x] 5.5 Update search results display
    - Ensure all node types are displayed correctly
    - Verify type badges show correct colors for all types
    - Test with WorkItems, Users, Projects, Phases, etc.
    - _Requirements: 2.6_
  
  - [x] 5.6 Write property test for search result formatting
    - **Property 9: Search result formatting**
    - **Validates: Requirements 2.6**

- [x] 6. Checkpoint - Enhanced search complete
  - Ensure all tests pass, ask the user if questions arise.

- [-] 7. Implement isolation mode state management
  - [-] 7.1 Add isolation mode state to graphStore
    - Add `isIsolationMode` boolean state
    - Add `isolatedNodeId` string state
    - Add `isolationDepth` number state
    - Add `visibleNodeIds` Set<string> state
    - _Requirements: 3.1, 3.2_
  
  - [ ] 7.2 Implement calculateNeighbors helper function
    - Create breadth-first search to find neighbors up to depth
    - Handle both directed and undirected edges
    - Return array of neighbor node IDs
    - _Requirements: 3.1, 3.2_
  
  - [ ] 7.3 Implement isolation mode actions
    - Create `enterIsolationMode(nodeId)` action
    - Create `exitIsolationMode()` action
    - Create `updateIsolationDepth(depth)` action
    - Calculate visible nodes using calculateNeighbors
    - _Requirements: 3.1, 3.2, 3.4, 3.8_
  
  - [ ] 7.4 Write property test for isolation visibility
    - **Property 10: Isolation visibility correctness**
    - **Validates: Requirements 3.1, 3.2**
  
  - [ ] 7.5 Write property test for isolated edge validity
    - **Property 11: Isolated edge validity**
    - **Validates: Requirements 3.3**
  
  - [ ] 7.6 Write property test for isolation mode transitions
    - **Property 12: Isolation mode transitions**
    - **Validates: Requirements 3.4**
  
  - [ ] 7.7 Write property test for isolation depth responsiveness
    - **Property 13: Isolation depth responsiveness**
    - **Validates: Requirements 3.8**

- [ ] 8. Create IsolationIndicator component
  - [ ] 8.1 Implement IsolationIndicator component
    - Create `frontend/src/components/graph/IsolationIndicator.tsx`
    - Display banner with isolated node name and depth
    - Add "Exit" button to leave isolation mode
    - Style with distinct background for visibility
    - _Requirements: 3.6, 3.7_
  
  - [ ] 8.2 Write property test for isolation indicator content
    - **Property 14: Isolation indicator content**
    - **Validates: Requirements 3.7**
  
  - [ ] 8.3 Integrate IsolationIndicator into GraphExplorer
    - Add component above graph view
    - Show only when isIsolationMode is true
    - Connect to graphStore isolation state
    - _Requirements: 3.6_

- [ ] 9. Implement Shift-click isolation in GraphView2D
  - [ ] 9.1 Add Shift-click handler to node interactions
    - Detect Shift key + click on nodes
    - Call enterIsolationMode with clicked node ID
    - Prevent default node selection when Shift is held
    - _Requirements: 3.1_
  
  - [ ] 9.2 Filter visible nodes and edges based on isolation state
    - Read visibleNodeIds from graphStore
    - Filter nodes array to only include visible nodes
    - Filter edges array to only include edges between visible nodes
    - Pass filtered data to React Flow
    - _Requirements: 3.1, 3.3_
  
  - [ ] 9.3 Add Escape key and background click handlers
    - Listen for Escape key press
    - Listen for background click events
    - Call exitIsolationMode on either event
    - _Requirements: 3.5_
  
  - [ ] 9.4 Connect depth control to isolation mode
    - Listen for depth changes in graphStore
    - Call updateIsolationDepth when depth changes during isolation
    - Ensure smooth transition to new neighbor set
    - _Requirements: 3.8_

- [ ] 10. Checkpoint - Isolation mode feature complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Simplify NodeTypeFilter labels
  - [ ] 11.1 Remove color text from type labels
    - Modify `frontend/src/components/common/NodeTypeFilter.tsx`
    - Remove the `<span className="sr-only"> (color: {type.color})</span>` element
    - Keep the visual color indicator (colored dot/square)
    - Ensure color indicator has proper ARIA attributes
    - _Requirements: 4.1, 4.3_
  
  - [ ] 11.2 Write property test for type label format
    - **Property 15: Type label format**
    - **Validates: Requirements 4.1**
  
  - [ ] 11.3 Update hover tooltips
    - Ensure title attributes don't contain color codes
    - Keep descriptive text like "Color indicator for {type}"
    - _Requirements: 4.4_
  
  - [ ] 11.4 Write property test for hover text format
    - **Property 16: Hover text format**
    - **Validates: Requirements 4.4**
  
  - [ ] 11.5 Verify filtering functionality
    - Test that all filter operations still work
    - Test select all / clear all buttons
    - Test individual type toggles
    - Test category collapsing
    - _Requirements: 4.5_

- [ ] 12. Final integration and testing
  - [ ] 12.1 Integration test: Distance control workflow
    - Load GraphExplorer
    - Adjust distance slider
    - Verify layout updates
    - Refresh page
    - Verify distance restored
  
  - [ ] 12.2 Integration test: Enhanced search workflow
    - Load graph with mixed node types
    - Search by ID
    - Search by title
    - Verify all node types are searchable
  
  - [ ] 12.3 Integration test: Isolation mode workflow
    - Load graph
    - Shift-click node
    - Verify isolation
    - Change depth
    - Verify neighbor update
    - Press Escape
    - Verify full graph restored
  
  - [ ] 12.4 Integration test: Type filter workflow
    - Open type filter
    - Verify labels are clean
    - Verify color indicators visible
    - Toggle filters
    - Verify filtering works

- [ ] 13. Final checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end user workflows
- All features are frontend-only and don't require backend changes

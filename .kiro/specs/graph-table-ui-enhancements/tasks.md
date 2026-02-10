# Implementation Plan: Graph and Table UI Enhancements

## Overview

This implementation plan breaks down the graph and table UI enhancements into discrete, manageable tasks. The plan follows an incremental approach, building and testing features progressively to ensure stability at each step.

## Tasks

- [x] 1. Set up shared components and utilities
  - Create NodeTypeFilter component with multi-select functionality
  - Create session storage utility functions for filter persistence
  - Set up TypeScript interfaces for new data structures
  - _Requirements: 3.1, 4.1, 8.1_

- [x] 1.1 Write unit tests for NodeTypeFilter component
  - Test rendering with different configurations
  - Test selection/deselection behavior
  - Test "Select All" and "Clear All" functionality
  - _Requirements: 3.1, 4.1_

- [x] 1.2 Write property test for session storage round trip
  - **Property 4: Session Filter Persistence Round Trip**
  - **Validates: Requirements 3.5, 8.2**

- [ ] 2. Rename Requirements page to Table page
  - [~] 2.1 Rename Requirements.tsx to Table.tsx
    - Update file name and component name
    - Update all internal references
    - _Requirements: 1.1, 1.2_
  
  - [~] 2.2 Update routing in App.tsx
    - Change route from "/requirements" to "/table"
    - Add redirect route for backward compatibility
    - Update navigation links
    - _Requirements: 1.3, 1.4_
  
  - [~] 2.3 Update NavigationHeader component
    - Change menu item text from "Requirements" to "Table"
    - Update page title and subtitle
    - _Requirements: 1.1, 1.2, 1.5_

- [~] 2.4 Write unit tests for routing changes
  - Test "/table" route loads correct component
  - Test "/requirements" redirects to "/table"
  - _Requirements: 1.3, 1.4_

- [~] 2.5 Write property test for backward compatibility redirect
  - **Property 1: Backward Compatibility Redirect**
  - **Validates: Requirements 1.4**

- [ ] 3. Implement Table page filtering
  - [~] 3.1 Remove hardcoded type filter from Table page
    - Remove `initialFilters={{ type: 'requirement' }}` from WorkItemList
    - Update default filter state in workitemStore
    - _Requirements: 2.1, 2.2_
  
  - [~] 3.2 Integrate NodeTypeFilter component into Table page
    - Add NodeTypeFilter to page header
    - Connect to workitemStore filter state
    - Implement filter change handlers
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [~] 3.3 Implement session storage for Table filters
    - Save filter state on change
    - Load filter state on mount
    - Clear on logout
    - _Requirements: 3.5, 8.1, 8.2_

- [~] 3.4 Write property test for default filter shows all types
  - **Property 2: Default Filter Shows All Types**
  - **Validates: Requirements 2.1**

- [~] 3.5 Write property test for filter affects visible items
  - **Property 3: Filter Affects Visible Items**
  - **Validates: Requirements 3.4**

- [~] 4. Checkpoint - Verify Table page functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Extend workitemStore for bulk editing
  - [~] 5.1 Add bulk edit state to workitemStore
    - Add selectedIds Set
    - Add isBulkEditing boolean
    - Add isBulkUpdating boolean
    - _Requirements: 17.1, 17.2_
  
  - [~] 5.2 Implement bulk edit actions in workitemStore
    - toggleBulkEdit()
    - selectItem() / deselectItem()
    - selectAll() / deselectAll()
    - bulkUpdate()
    - _Requirements: 17.2, 17.3, 17.4_

- [~] 5.3 Write unit tests for bulk edit store actions
  - Test selection state management
  - Test bulk update logic
  - _Requirements: 17.2, 17.3, 17.4_

- [ ] 6. Implement bulk edit UI components
  - [~] 6.1 Create BulkEditModal component
    - Form with status, priority, assigned_to fields
    - Field enable/disable checkboxes
    - Validation logic
    - Progress indicator
    - _Requirements: 17.5, 17.6, 17.7, 17.9_
  
  - [~] 6.2 Add bulk edit mode to Table page
    - Add "Bulk Edit" toggle button
    - Add checkbox column to WorkItemList
    - Add "Select All" checkbox to table header
    - Show "Bulk Edit" button when items selected
    - _Requirements: 17.1, 17.2, 17.3, 17.4_
  
  - [~] 6.3 Wire bulk edit modal to Table page
    - Open modal on "Bulk Edit" button click
    - Pass selected IDs to modal
    - Handle success/cancel callbacks
    - Refresh table after update
    - _Requirements: 17.5, 17.10, 17.12, 17.13_

- [~] 6.4 Write unit tests for BulkEditModal
  - Test form validation
  - Test field enable/disable
  - Test submission handling
  - _Requirements: 17.6, 17.7_

- [~] 6.5 Write property test for bulk update consistency
  - **Property 18: Bulk Update Consistency**
  - **Validates: Requirements 17.8**

- [~] 6.6 Write property test for table refresh after bulk update
  - **Property 19: Table Refresh After Bulk Update**
  - **Validates: Requirements 17.12**

- [ ] 7. Implement backend bulk update endpoint
  - [~] 7.1 Create PATCH /api/v1/workitems/bulk endpoint
    - Accept array of IDs and update data
    - Validate permissions for each item
    - Update items in database
    - Return updated items and failures
    - _Requirements: 17.8, 17.11_
  
  - [~] 7.2 Add bulkUpdate method to workitemService
    - Call bulk update endpoint
    - Handle response with updated/failed items
    - Throw errors appropriately
    - _Requirements: 17.8, 17.11_

- [~] 7.3 Write integration tests for bulk update endpoint
  - Test successful bulk update
  - Test partial failures
  - Test permission checks
  - _Requirements: 17.8, 17.11_

- [~] 8. Checkpoint - Verify bulk edit functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Extend graphStore for advanced filtering
  - [~] 9.1 Add node type filter state to graphStore
    - Add nodeTypeFilter Set
    - Add availableNodeTypes array
    - Add filter-related loading states
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [~] 9.2 Implement filter actions in graphStore
    - setNodeTypeFilter()
    - getFilteredNodes()
    - getFilteredEdges()
    - loadAvailableNodeTypes()
    - _Requirements: 4.4, 4.5, 4.6_
  
  - [~] 9.3 Implement filter synchronization between views
    - Preserve filter state on view mode change
    - Update syncPositions2Dto3D and syncPositions3Dto2D
    - _Requirements: 4.8, 9.1, 9.2, 9.3_

- [~] 9.4 Write property test for graph filter affects visible nodes
  - **Property 5: Graph Filter Affects Visible Nodes**
  - **Validates: Requirements 4.5**

- [~] 9.5 Write property test for edge visibility follows node visibility
  - **Property 6: Edge Visibility Follows Node Visibility**
  - **Validates: Requirements 4.6**

- [~] 9.6 Write property test for filter state synchronization between views
  - **Property 7: Filter State Synchronization Between Views**
  - **Validates: Requirements 4.8, 9.1**

- [ ] 10. Integrate NodeTypeFilter into Graph Explorer
  - [~] 10.1 Add NodeTypeFilter to Graph Explorer toolbar
    - Position in toolbar-left section
    - Configure for graph node types
    - Enable category grouping
    - _Requirements: 4.1, 4.2, 4.3, 4.12_
  
  - [~] 10.2 Connect filter to graphStore
    - Load available node types on mount
    - Update filter state on selection change
    - Apply filters to graph visualization
    - _Requirements: 4.4, 4.5, 4.6_
  
  - [~] 10.3 Implement session storage for Graph filters
    - Save filter state on change
    - Load filter state on mount
    - Clear on logout
    - _Requirements: 4.7, 8.1, 8.2_

- [~] 10.4 Write property test for filter performance
  - **Property 13: Filter Performance**
  - **Validates: Requirements 10.4, 13.1**

- [~] 10.5 Write property test for graph rendering limit
  - **Property 14: Graph Rendering Limit**
  - **Validates: Requirements 13.4**

- [~] 11. Checkpoint - Verify graph filtering functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Enhance NodeEditor with save functionality
  - [~] 12.1 Add save button to NodeEditor
    - Add button to footer
    - Enable only when changes detected
    - Show loading state during save
    - _Requirements: 5.2, 5.8, 5.9_
  
  - [~] 12.2 Implement save handler in NodeEditor
    - Validate form data
    - Call updateNode from graphStore
    - Handle success/error states
    - Display notifications
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.7_
  
  - [~] 12.3 Implement updateNode in graphStore
    - Call workitemService.update()
    - Update node in local state
    - Maintain selection after save
    - Reload graph if needed
    - _Requirements: 5.4, 5.5, 5.10_

- [~] 12.4 Write unit tests for NodeEditor save functionality
  - Test save button enable/disable
  - Test validation
  - Test success/error handling
  - _Requirements: 5.2, 5.3, 5.8_

- [~] 12.5 Write property test for node update validation
  - **Property 8: Node Update Validation**
  - **Validates: Requirements 5.3**

- [~] 12.6 Write property test for node update persistence
  - **Property 9: Node Update Persistence**
  - **Validates: Requirements 5.4**

- [~] 12.7 Write property test for selection preservation after save
  - **Property 10: Selection Preservation After Save**
  - **Validates: Requirements 5.10**

- [ ] 13. Implement relationship editing
  - [~] 13.1 Create RelationshipEditor component
    - Display relationship details
    - Dropdown for relationship type
    - Delete button with confirmation
    - Property editor
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  
  - [~] 13.2 Add relationship selection to graph views
    - Make edges clickable in GraphView2D
    - Make edges clickable in GraphView3D
    - Show RelationshipEditor on edge click
    - _Requirements: 6.1_
  
  - [~] 13.3 Implement relationship update in graphStore
    - Add updateRelationship action
    - Call graphService.updateRelationship()
    - Update edge in local state
    - _Requirements: 6.4, 6.8_
  
  - [~] 13.4 Implement relationship delete in graphStore
    - Add deleteRelationship action (already exists, verify)
    - Show confirmation dialog
    - Remove edge from local state
    - _Requirements: 6.5, 6.6, 6.7_

- [~] 13.5 Write unit tests for RelationshipEditor
  - Test rendering
  - Test type change
  - Test delete confirmation
  - _Requirements: 6.2, 6.3, 6.5_

- [~] 13.6 Write property test for relationship deletion persistence
  - **Property 11: Relationship Deletion Persistence**
  - **Validates: Requirements 6.6**

- [ ] 14. Implement relationship creation
  - [~] 14.1 Create ConnectionMode component
    - Toggle button for connection mode
    - Visual feedback (cursor, highlighting)
    - Two-step node selection
    - Relationship type selector
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [~] 14.2 Integrate ConnectionMode into Graph Explorer
    - Add to toolbar
    - Handle node selection in connection mode
    - Show relationship type dialog
    - Create relationship on confirmation
    - _Requirements: 7.1, 7.6, 7.7, 7.10_
  
  - [~] 14.3 Implement connection creation in graphStore
    - Add connection mode state
    - Add createConnection action (already exists, verify)
    - Validate no duplicate relationships
    - Add edge to local state
    - _Requirements: 7.6, 7.7, 7.9_

- [~] 14.4 Write unit tests for ConnectionMode
  - Test mode toggle
  - Test node selection
  - Test relationship creation
  - _Requirements: 7.1, 7.2, 7.3_

- [~] 14.5 Write property test for duplicate relationship prevention
  - **Property 12: Duplicate Relationship Prevention**
  - **Validates: Requirements 7.9**

- [ ] 15. Implement backend relationship endpoints
  - [~] 15.1 Create PATCH /api/v1/graph/relationships/{id} endpoint
    - Accept new relationship type
    - Update relationship in graph database
    - Return updated relationship
    - _Requirements: 6.4_
  
  - [~] 15.2 Add updateRelationship method to graphService
    - Call update relationship endpoint
    - Handle errors
    - Return updated relationship
    - _Requirements: 6.4, 6.8_
  
  - [~] 15.3 Create GET /api/v1/graph/schema endpoint
    - Return available node types
    - Return available relationship types
    - Cache response
    - _Requirements: 4.2_
  
  - [~] 15.4 Add getAvailableNodeTypes method to graphService
    - Call schema endpoint
    - Return node types array
    - Fallback to hardcoded list on error
    - _Requirements: 4.2_

- [~] 15.5 Write integration tests for relationship endpoints
  - Test relationship update
  - Test schema endpoint
  - _Requirements: 6.4, 4.2_

- [~] 15.6 Write property test for referential integrity on node deletion
  - **Property 15: Referential Integrity on Node Deletion**
  - **Validates: Requirements 15.3**

- [~] 16. Checkpoint - Verify relationship editing functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 17. Fix and enhance graph search
  - [~] 17.1 Fix search implementation in graphService
    - Add null/empty query handling
    - Add response validation
    - Improve error handling
    - Add logging
    - _Requirements: 16.1, 16.8, 16.9_
  
  - [~] 17.2 Fix backend search endpoint
    - Ensure case-insensitive search
    - Search title and description fields
    - Return consistent response format
    - Add query validation
    - _Requirements: 16.2, 16.7_
  
  - [~] 17.3 Enhance search result display in Graph Explorer
    - Show node type badges in results
    - Improve result formatting
    - Add "No results" message
    - _Requirements: 16.3, 16.6, 16.7_
  
  - [~] 17.4 Implement search result selection behavior
    - Center graph on selected node
    - Highlight selected node
    - Close search dropdown
    - Clear search input
    - _Requirements: 16.4, 16.5, 16.8_

- [~] 17.5 Write unit tests for search functionality
  - Test empty query handling
  - Test result display
  - Test result selection
  - _Requirements: 16.1, 16.3, 16.4_

- [~] 17.6 Write property test for case-insensitive search
  - **Property 16: Case-Insensitive Search**
  - **Validates: Requirements 16.2**

- [~] 17.7 Write property test for search result navigation
  - **Property 17: Search Result Navigation**
  - **Validates: Requirements 16.4**

- [ ] 18. Implement responsive design and accessibility
  - [~] 18.1 Add responsive styles to NodeTypeFilter
    - Mobile layout (< 768px)
    - Tablet layout (768px - 1024px)
    - Touch-friendly targets
    - _Requirements: 12.1, 12.3, 12.4_
  
  - [~] 18.2 Add responsive styles to BulkEditModal
    - Mobile-friendly form layout
    - Scrollable content
    - Touch-friendly buttons
    - _Requirements: 12.1, 12.3_
  
  - [~] 18.3 Add keyboard navigation to all new components
    - Tab order for NodeTypeFilter
    - Keyboard shortcuts for bulk edit
    - Arrow keys for graph navigation
    - _Requirements: 14.1, 14.2, 14.3_
  
  - [~] 18.4 Add ARIA labels and screen reader support
    - Label all filter controls
    - Announce filter changes
    - Describe bulk edit actions
    - Announce save success/failure
    - _Requirements: 14.2, 14.3, 14.4, 14.5, 14.6_
  
  - [~] 18.5 Verify color contrast and visual accessibility
    - Check WCAG 2.1 Level AA compliance
    - Add text labels for indicators
    - Test with browser zoom
    - _Requirements: 14.7, 14.8, 14.9_

- [~] 18.6 Write accessibility tests
  - Test keyboard navigation
  - Test ARIA labels
  - Test focus management
  - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [ ] 19. Performance optimization
  - [~] 19.1 Optimize filter rendering
    - Add React.memo to NodeTypeFilter
    - Use useMemo for filter computations
    - Use useCallback for handlers
    - Debounce filter changes
    - _Requirements: 13.1, 13.2, 13.3_
  
  - [~] 19.2 Optimize graph rendering
    - Implement node culling
    - Enforce 1000 node limit
    - Lazy load node details
    - _Requirements: 13.4_
  
  - [~] 19.3 Optimize state management
    - Use Zustand selectors
    - Implement shallow equality checks
    - Debounce session storage writes
    - _Requirements: 13.2, 13.3_

- [~] 19.4 Write performance tests
  - Test filter update time
  - Test bulk update time
  - Test graph rendering with large datasets
  - _Requirements: 13.1, 13.4_

- [ ] 20. Final integration and testing
  - [~] 20.1 Integration testing
    - Test complete user flows
    - Test cross-page navigation
    - Test session persistence
    - _Requirements: All_
  
  - [~] 20.2 End-to-end testing
    - Test filter → bulk edit → verify flow
    - Test table → graph → edit → return flow
    - Test logout → login → filter restore flow
    - _Requirements: All_
  
  - [~] 20.3 Browser compatibility testing
    - Test in Chrome, Firefox, Safari, Edge
    - Test mobile browsers
    - Verify all features work consistently
    - _Requirements: All_

- [~] 21. Final checkpoint - Complete verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks are required for complete implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end functionality
- The implementation follows a bottom-up approach: utilities → components → pages → integration
- NodeEditor already has save functionality implemented - Task 12 will verify and enhance it
- GraphStore already has filter state management - Task 9 will extend it for all node types
- WorkItemStore needs bulk edit functionality added - Tasks 5-7 will implement this

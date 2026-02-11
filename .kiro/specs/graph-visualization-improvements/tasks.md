# Task List: Graph Visualization Improvements (2D)

## Phase 1: Layout Engine Foundation

- [x] 1. Implement collision detection for force-directed layout
  - [x] 1.1 Add quadtree spatial partitioning for O(n log n) collision checks
  - [x] 1.2 Implement minimum spacing enforcement (20 pixels between nodes)
  - [x] 1.3 Add collision resolution forces to force simulation
  - [x] 1.4 Write unit tests for collision detection algorithm
  - [x] 1.5 Write property test: no overlapping nodes after layout stabilization

- [x] 2. Enhance force-directed layout with Barnes-Hut optimization
  - [x] 2.1 Implement Barnes-Hut quadtree for force calculations
  - [x] 2.2 Add automatic activation for graphs with >50 nodes
  - [x] 2.3 Implement adaptive cooling schedule based on node movement
  - [x] 2.4 Add temperature increase on node drag
  - [x] 2.5 Write unit tests for Barnes-Hut optimization
  - [x] 2.6 Write property test: Barnes-Hut activation threshold

- [x] 3. Implement hierarchical layout algorithm
  - [x] 3.1 Implement Sugiyama framework layer assignment
  - [x] 3.2 Implement barycenter heuristic for crossing minimization
  - [x] 3.3 Implement coordinate assignment with configurable direction (TB/BT/LR/RL)
  - [x] 3.4 Add support for multiple root nodes (forest structures)
  - [x] 3.5 Write unit tests for hierarchical layout
  - [x] 3.6 Write property test: same-level nodes at same vertical/horizontal position

- [x] 4. Implement circular layout algorithm
  - [x] 4.1 Implement node sorting by degree
  - [x] 4.2 Implement concentric circle placement based on graph distance
  - [x] 4.3 Implement angular position optimization to minimize edge crossings
  - [x] 4.4 Add configurable radius, start angle, and end angle
  - [x] 4.5 Write unit tests for circular layout
  - [x] 4.6 Write property test: radial distance proportional to graph distance

- [x] 5. Implement grid layout algorithm
  - [x] 5.1 Calculate optimal grid dimensions (columns = ceil(sqrt(nodeCount)))
  - [x] 5.2 Implement node sorting by type and priority
  - [x] 5.3 Implement left-to-right, top-to-bottom placement
  - [x] 5.4 Add configurable row and column spacing
  - [x] 5.5 Write unit tests for grid layout
  - [x] 5.6 Write property test: consistent spacing between adjacent nodes

- [x] 6. Implement layout transition animations
  - [x] 6.1 Create animation system for position transitions
  - [x] 6.2 Implement 500ms ease-in-out transitions between layouts
  - [x] 6.3 Preserve node selection during layout changes
  - [x] 6.4 Write unit tests for animation timing
  - [x] 6.5 Write property test: animation duration 500ms ± 50ms

- [x] 7. Add layout algorithm selector UI
  - [x] 7.1 Create layout selector dropdown component
  - [x] 7.2 Add icons for each layout type
  - [x] 7.3 Integrate with graph store for state management
  - [x] 7.4 Persist selected layout in local storage
  - [x] 7.5 Write component tests for layout selector
  - [x] 7.6 Write property test: layout preference persistence

## Phase 2: Custom Node Components

- [ ] 8. Create base custom node component infrastructure
  - [ ] 8.1 Define CustomNodeProps interface with progress and priority
  - [ ] 8.2 Create base node component with common features
  - [ ] 8.3 Implement node color scheme from NODE_COLORS constant
  - [ ] 8.4 Add selection and hover state handling
  - [ ] 8.5 Write unit tests for base node component

- [ ] 9. Implement TaskNode (circle with progress)
  - [ ] 9.1 Create circular SVG shape component
  - [ ] 9.2 Add task icon in upper left corner
  - [ ] 9.3 Integrate progress indicator (concentric circle)
  - [ ] 9.4 Add "done" attribute visualization
  - [ ] 9.5 Write component tests for TaskNode
  - [ ] 9.6 Write property test: done attribute maps to 100%/0% progress

- [ ] 10. Implement RequirementNode (rounded rectangle)
  - [ ] 10.1 Create rounded rectangle SVG shape component
  - [ ] 10.2 Add requirement icon in upper left corner
  - [ ] 10.3 Add signed indicator (checkmark) when is_signed is true
  - [ ] 10.4 Implement label rendering
  - [ ] 10.5 Write component tests for RequirementNode

- [ ] 11. Implement TestNode (hexagon)
  - [ ] 11.1 Create hexagon SVG shape component with calculateHexagonPoints utility
  - [ ] 11.2 Add test icon in upper left corner
  - [ ] 11.3 Add status badge indicator
  - [ ] 11.4 Implement label rendering
  - [ ] 11.5 Write component tests for TestNode

- [ ] 12. Implement RiskNode (triangle)
  - [ ] 12.1 Create triangle SVG shape component
  - [ ] 12.2 Add warning icon in center
  - [ ] 12.3 Add RPN (Risk Priority Number) badge
  - [ ] 12.4 Implement label rendering below shape
  - [ ] 12.5 Write component tests for RiskNode

- [ ] 13. Implement DocumentNode (folded rectangle)
  - [ ] 13.1 Create rectangle SVG shape component
  - [ ] 13.2 Add folded corner path element
  - [ ] 13.3 Add document icon in upper left corner
  - [ ] 13.4 Implement label rendering
  - [ ] 13.5 Write component tests for DocumentNode

- [ ] 14. Implement WorkpackageNode (rectangle with progress)
  - [ ] 14.1 Create rectangle SVG shape component
  - [ ] 14.2 Add folder icon in upper left corner
  - [ ] 14.3 Integrate hierarchical progress indicator
  - [ ] 14.4 Add progress percentage text display
  - [ ] 14.5 Write component tests for WorkpackageNode

- [ ] 15. Implement ProjectNode (large rectangle with progress)
  - [ ] 15.1 Create large rectangle SVG shape component
  - [ ] 15.2 Add project icon in upper left corner
  - [ ] 15.3 Integrate hierarchical progress indicator
  - [ ] 15.4 Add progress percentage text display
  - [ ] 15.5 Write component tests for ProjectNode

- [ ] 16. Implement priority-based node sizing
  - [ ] 16.1 Add size calculation: base_size × (2 - priority/5)
  - [ ] 16.2 Apply sizing to all node components
  - [ ] 16.3 Write unit tests for size calculation
  - [ ] 16.4 Write property test: priority-based size scaling formula

## Phase 3: Progress Calculation System

- [ ] 17. Create ProgressCalculator service
  - [ ] 17.1 Implement ProgressCalculator interface
  - [ ] 17.2 Implement calculateNodeProgress for leaf nodes
  - [ ] 17.3 Implement calculateHierarchicalProgress for container nodes
  - [ ] 17.4 Add progress caching with 30-second TTL
  - [ ] 17.5 Implement cache invalidation for node and ancestors
  - [ ] 17.6 Write unit tests for ProgressCalculator
  - [ ] 17.7 Write property test: task completion mapping (done → 100%, not done → 0%)
  - [ ] 17.8 Write property test: hierarchical progress aggregation (sum/N)
  - [ ] 17.9 Write property test: cache validity within 30 seconds

- [ ] 18. Create ProgressCircle component
  - [ ] 18.1 Implement SVG circle with stroke-dasharray for progress arc
  - [ ] 18.2 Add configurable radius, stroke width, and colors
  - [ ] 18.3 Implement 300ms animation for progress updates
  - [ ] 18.4 Add support for multiple concentric circles (4px spacing)
  - [ ] 18.5 Write component tests for ProgressCircle
  - [ ] 18.6 Write property test: progress animation timing 300ms ± 30ms
  - [ ] 18.7 Write property test: multiple progress indicators with correct spacing

- [ ] 19. Create React hooks for progress
  - [ ] 19.1 Implement useNodeProgress hook for leaf nodes
  - [ ] 19.2 Implement useHierarchicalProgress hook for container nodes
  - [ ] 19.3 Integrate with ProgressCalculator service
  - [ ] 19.4 Add automatic cache invalidation on data changes
  - [ ] 19.5 Write unit tests for progress hooks
  - [ ] 19.6 Write property test: cache invalidation on child change

- [ ] 20. Add progress tooltip
  - [ ] 20.1 Create tooltip component for progress indicators
  - [ ] 20.2 Display percentage with 1 decimal place
  - [ ] 20.3 Show completed/total counts
  - [ ] 20.4 Add hover trigger
  - [ ] 20.5 Write component tests for progress tooltip
  - [ ] 20.6 Write property test: tooltip accuracy (max 1 decimal place)

## Phase 4: Enhanced Edge Rendering

- [ ] 21. Implement curved edge component
  - [ ] 21.1 Create CurvedEdge component with Bezier curve path
  - [ ] 21.2 Implement calculateControlPoint utility for quadratic Bezier
  - [ ] 21.3 Add support for multiple edges between same nodes (offset curves)
  - [ ] 21.4 Implement edge label rendering at midpoint
  - [ ] 21.5 Write component tests for CurvedEdge
  - [ ] 21.6 Write property test: edge connection point accuracy

- [ ] 22. Implement edge connection point calculation
  - [ ] 22.1 Create utility to calculate circle perimeter intersection
  - [ ] 22.2 Create utility to calculate rectangle perimeter intersection
  - [ ] 22.3 Create utility to calculate polygon perimeter intersection
  - [ ] 22.4 Integrate with all node shape components
  - [ ] 22.5 Write unit tests for connection point calculations
  - [ ] 22.6 Write property test: connection points on node perimeter

- [ ] 23. Add directional arrows to edges
  - [ ] 23.1 Create arrow marker SVG definition
  - [ ] 23.2 Position arrow 10 pixels from target node
  - [ ] 23.3 Orient arrow tangent to edge curve
  - [ ] 23.4 Add 8-pixel arrow size
  - [ ] 23.5 Update arrow color on edge selection
  - [ ] 23.6 Write component tests for edge arrows

- [ ] 24. Implement edge thickness based on weight
  - [ ] 24.1 Add weight property to edge data model
  - [ ] 24.2 Calculate thickness: 2 + (weight - 1) pixels, max 6px
  - [ ] 24.3 Apply thickness to edge rendering
  - [ ] 24.4 Write unit tests for thickness calculation
  - [ ] 24.5 Write property test: edge thickness from weight formula

- [ ] 25. Implement edge bundling
  - [ ] 25.1 Create EdgeBundler class
  - [ ] 25.2 Implement edge similarity detection (15-degree threshold)
  - [ ] 25.3 Implement bundle path calculation
  - [ ] 25.4 Add bundle highlighting on hover
  - [ ] 25.5 Add toggle control for edge bundling
  - [ ] 25.6 Activate bundling for graphs with >100 edges
  - [ ] 25.7 Write unit tests for EdgeBundler
  - [ ] 25.8 Write property test: edge bundling similarity threshold

- [ ] 26. Enhance edge labels
  - [ ] 26.1 Position labels at edge midpoint
  - [ ] 26.2 Add white background with 2px padding
  - [ ] 26.3 Hide labels for thin edges (<3px) in dense graphs
  - [ ] 26.4 Prevent label overlap with nodes
  - [ ] 26.5 Write component tests for edge labels

## Phase 5: Visual Enhancements

- [ ] 27. Add node shadows
  - [ ] 27.1 Implement drop shadow with 2px offset and 4px blur
  - [ ] 27.2 Increase shadow blur to 8px on selection
  - [ ] 27.3 Increase shadow opacity to 0.3 on hover
  - [ ] 27.4 Use rgba(0, 0, 0, 0.15) for shadow color
  - [ ] 27.5 Disable shadows for graphs with >200 nodes
  - [ ] 27.6 Write component tests for shadow rendering

- [ ] 28. Implement hover effects
  - [ ] 28.1 Add 10% size increase on node hover
  - [ ] 28.2 Implement connected node highlighting
  - [ ] 28.3 Reduce opacity of non-connected nodes to 0.3
  - [ ] 28.4 Reduce opacity of non-connected edges to 0.2
  - [ ] 28.5 Restore opacity within 200ms on hover end
  - [ ] 28.6 Write component tests for hover effects
  - [ ] 28.7 Write property test: connected node identification
  - [ ] 28.8 Write property test: connected edge identification
  - [ ] 28.9 Write property test: opacity restoration timing

- [ ] 29. Implement smooth animations
  - [ ] 29.1 Add CSS transitions for node position changes
  - [ ] 29.2 Implement 300ms animation for node add/remove
  - [ ] 29.3 Maintain 60 FPS during force simulation
  - [ ] 29.4 Disable animation for node dragging (immediate update)
  - [ ] 29.5 Add user preference to disable animations
  - [ ] 29.6 Write unit tests for animation timing
  - [ ] 29.7 Write property test: node addition animation timing
  - [ ] 29.8 Write property test: drag immediate update

- [ ] 30. Enhance minimap
  - [ ] 30.1 Display nodes with same colors as main view
  - [ ] 30.2 Display nodes with same shapes (simplified)
  - [ ] 30.3 Show draggable viewport rectangle
  - [ ] 30.4 Update main view in real-time on viewport drag
  - [ ] 30.5 Update at 30 FPS during layout animation
  - [ ] 30.6 Write component tests for enhanced minimap

- [ ] 31. Implement dark mode support
  - [ ] 31.1 Add dark background color (#1a1a1a)
  - [ ] 31.2 Adjust node colors for WCAG AA contrast on dark background
  - [ ] 31.3 Use light text color (#e0e0e0) for labels
  - [ ] 31.4 Adjust edge colors (#757575) for visibility
  - [ ] 31.5 Detect dark mode from system preferences
  - [ ] 31.6 Implement 300ms color transition on mode toggle
  - [ ] 31.7 Write component tests for dark mode

- [ ] 32. Improve zoom-to-fit function
  - [ ] 32.1 Calculate bounding box of all visible nodes
  - [ ] 32.2 Set zoom level with 20% padding on all sides
  - [ ] 32.3 Center viewport on geometric center of nodes
  - [ ] 32.4 Complete operation within 500ms with smooth animation
  - [ ] 32.5 Reset to default zoom (1.0) when no nodes visible
  - [ ] 32.6 Write unit tests for zoom-to-fit
  - [ ] 32.7 Write property test: zoom-to-fit bounding box
  - [ ] 32.8 Write property test: zoom-to-fit centering
  - [ ] 32.9 Write property test: zoom-to-fit timing

## Phase 6: Performance Optimizations

- [ ] 33. Implement level-of-detail rendering
  - [ ] 33.1 Create RenderingOptimizer service
  - [ ] 33.2 Implement getLevelOfDetail based on zoom
  - [ ] 33.3 Render simple circles without labels at zoom <0.5
  - [ ] 33.4 Render colored dots (4px) at zoom <0.3
  - [ ] 33.5 Hide edge labels at zoom <0.5
  - [ ] 33.6 Render simple lines (no curves) at zoom <0.3
  - [ ] 33.7 Restore full detail within 100ms on zoom increase
  - [ ] 33.8 Write unit tests for level-of-detail logic

- [ ] 34. Implement canvas rendering mode
  - [ ] 34.1 Create canvas renderer for nodes
  - [ ] 34.2 Create canvas renderer for edges
  - [ ] 34.3 Maintain all visual features (shapes, colors, labels)
  - [ ] 34.4 Maintain interactive features (hover, selection, drag)
  - [ ] 34.5 Auto-switch to canvas for graphs with >100 nodes
  - [ ] 34.6 Add manual rendering mode selector
  - [ ] 34.7 Preserve viewport and selection on mode switch
  - [ ] 34.8 Write unit tests for canvas rendering

- [ ] 35. Implement viewport culling
  - [ ] 35.1 Calculate visible nodes within viewport bounds
  - [ ] 35.2 Include 100px buffer around viewport edge
  - [ ] 35.3 Only render visible nodes and their edges
  - [ ] 35.4 Update visible set within 16ms (60 FPS) on viewport change
  - [ ] 35.5 Maintain force simulation for all nodes
  - [ ] 35.6 Write unit tests for viewport culling

- [ ] 36. Implement progressive rendering
  - [ ] 36.1 Detect graphs with >500 nodes
  - [ ] 36.2 Render nodes in batches of 100
  - [ ] 36.3 Render first batch within 500ms of data load
  - [ ] 36.4 Render subsequent batches at 60ms intervals
  - [ ] 36.5 Prioritize nodes closest to viewport center
  - [ ] 36.6 Display progress indicator showing render percentage
  - [ ] 36.7 Write unit tests for progressive rendering

- [ ] 37. Optimize force simulation
  - [ ] 37.1 Maintain minimum 30 FPS during simulation
  - [ ] 37.2 Implement cooling schedule (0.5% reduction per frame)
  - [ ] 37.3 Stop simulation when temperature <0.001
  - [ ] 37.4 Add pause, resume, and reset controls
  - [ ] 37.5 Write unit tests for simulation performance

## Phase 7: State Management and Persistence

- [ ] 38. Extend graph store with new state
  - [ ] 38.1 Add layoutAlgorithm and layoutConfig state
  - [ ] 38.2 Add renderingMode and levelOfDetail state
  - [ ] 38.3 Add progressCache and progressCacheTimestamp state
  - [ ] 38.4 Add edgeBundlingEnabled state
  - [ ] 38.5 Add animationsEnabled state
  - [ ] 38.6 Add darkModeEnabled state
  - [ ] 38.7 Write unit tests for graph store extensions

- [ ] 39. Implement user preference persistence
  - [ ] 39.1 Persist layout algorithm in local storage
  - [ ] 39.2 Persist rendering mode preference
  - [ ] 39.3 Persist edge bundling state
  - [ ] 39.4 Persist animation state
  - [ ] 39.5 Persist dark mode preference
  - [ ] 39.6 Restore all preferences within 100ms on app load
  - [ ] 39.7 Write unit tests for preference persistence
  - [ ] 39.8 Write property test: layout preference persistence

## Phase 8: Accessibility

- [ ] 40. Implement keyboard navigation
  - [ ] 40.1 Add arrow key navigation to select and focus nodes
  - [ ] 40.2 Add Tab key to cycle through nodes
  - [ ] 40.3 Add Enter key to activate selected node
  - [ ] 40.4 Add Escape key to clear selection
  - [ ] 40.5 Write component tests for keyboard navigation

- [ ] 41. Add ARIA labels and screen reader support
  - [ ] 41.1 Add ARIA labels to all interactive elements
  - [ ] 41.2 Announce node selection changes to screen readers
  - [ ] 41.3 Announce focus changes to screen readers
  - [ ] 41.4 Add role attributes to graph elements
  - [ ] 41.5 Write accessibility tests

- [ ] 42. Ensure WCAG AA contrast compliance
  - [ ] 42.1 Verify all node colors meet WCAG AA contrast ratios
  - [ ] 42.2 Verify edge colors meet WCAG AA contrast ratios
  - [ ] 42.3 Verify text colors meet WCAG AA contrast ratios
  - [ ] 42.4 Adjust colors for dark mode compliance
  - [ ] 42.5 Write automated contrast tests

- [ ] 43. Create text-based alternative view
  - [ ] 43.1 Create component to list all nodes
  - [ ] 43.2 Create component to list all relationships
  - [ ] 43.3 Add toggle to switch between visual and text views
  - [ ] 43.4 Ensure text view is keyboard navigable
  - [ ] 43.5 Write component tests for text view

## Phase 9: Integration and Testing

- [ ] 44. Integrate all components into GraphView2D
  - [ ] 44.1 Update GraphView2D to use custom node components
  - [ ] 44.2 Integrate layout engine with layout selector
  - [ ] 44.3 Integrate progress calculation system
  - [ ] 44.4 Integrate enhanced edge rendering
  - [ ] 44.5 Integrate visual enhancements
  - [ ] 44.6 Integrate performance optimizations
  - [ ] 44.7 Write integration tests

- [ ] 45. Write end-to-end tests
  - [ ] 45.1 Test layout algorithm switching
  - [ ] 45.2 Test node type rendering
  - [ ] 45.3 Test progress indicator updates
  - [ ] 45.4 Test edge rendering and interactions
  - [ ] 45.5 Test zoom and pan operations
  - [ ] 45.6 Test dark mode toggle
  - [ ] 45.7 Test performance with large graphs (100, 500, 1000 nodes)

- [ ] 46. Performance benchmarking
  - [ ] 46.1 Benchmark layout algorithms with various graph sizes
  - [ ] 46.2 Benchmark rendering performance (SVG vs Canvas)
  - [ ] 46.3 Benchmark force simulation performance
  - [ ] 46.4 Benchmark progress calculation performance
  - [ ] 46.5 Document performance metrics

- [ ] 47. Documentation
  - [ ] 47.1 Document layout algorithm options and use cases
  - [ ] 47.2 Document node type shapes and icons
  - [ ] 47.3 Document progress indicator system
  - [ ] 47.4 Document performance optimization features
  - [ ] 47.5 Create user guide for graph visualization features
  - [ ] 47.6 Update API documentation

## Phase 10: Polish and Deployment

- [ ] 48. User testing and feedback
  - [ ] 48.1 Conduct user testing sessions
  - [ ] 48.2 Collect feedback on layout algorithms
  - [ ] 48.3 Collect feedback on visual design
  - [ ] 48.4 Collect feedback on performance
  - [ ] 48.5 Prioritize and implement feedback

- [ ] 49. Bug fixes and refinements
  - [ ] 49.1 Fix any bugs discovered during testing
  - [ ] 49.2 Refine animations and transitions
  - [ ] 49.3 Optimize performance bottlenecks
  - [ ] 49.4 Improve error handling
  - [ ] 49.5 Polish UI/UX details

- [ ] 50. Deployment preparation
  - [ ] 50.1 Run full test suite
  - [ ] 50.2 Verify all acceptance criteria are met
  - [ ] 50.3 Update CHANGELOG
  - [ ] 50.4 Create deployment checklist
  - [ ] 50.5 Deploy to staging environment
  - [ ] 50.6 Conduct final QA testing
  - [ ] 50.7 Deploy to production

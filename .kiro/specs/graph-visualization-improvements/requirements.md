# Requirements Document: Graph Visualization Improvements (2D)

## Introduction

This document specifies requirements for enhancing the 2D graph visualization capabilities of the RxDx project management system. The improvements focus on better layout algorithms, type-specific node styling with progress indicators, enhanced edge rendering, visual enhancements, and performance optimizations to provide users with a more intuitive and performant graph exploration experience.

The current implementation uses @xyflow/react for 2D visualization with a basic force-directed layout and custom node components. These enhancements will build upon this foundation to create a more sophisticated and user-friendly 2D visualization system. 3D visualization improvements will be addressed in a separate specification.

## Glossary

- **Graph_Visualization_System**: The 2D visualization component that renders nodes and edges from the graph database using @xyflow/react
- **Force_Directed_Layout**: A physics-based algorithm that positions nodes by simulating attractive and repulsive forces
- **Node**: A visual representation of an entity in the graph (WorkItem, Project, User, etc.)
- **Edge**: A visual representation of a relationship between two nodes
- **Layout_Algorithm**: A computational method for determining node positions in the graph
- **Collision_Detection**: A mechanism to prevent nodes from overlapping by maintaining minimum spacing
- **Edge_Bundling**: A technique to group similar edges together to reduce visual clutter
- **Level_Of_Detail**: A rendering optimization that simplifies visual elements based on zoom level
- **Viewport_Culling**: A performance optimization that only renders elements visible in the current view
- **Barnes_Hut_Optimization**: A spatial partitioning algorithm that reduces force calculation complexity from O(n²) to O(n log n)
- **Node_Type**: The category of a node (requirement, task, test, risk, document, etc.)
- **Bezier_Curve**: A smooth curved line defined by control points
- **Minimap**: A small overview representation of the entire graph
- **Canvas_Rendering**: A rendering mode using HTML5 Canvas API for better performance with large graphs
- **SVG_Rendering**: A rendering mode using Scalable Vector Graphics for high-quality rendering of small graphs
- **Progress_Indicator**: A concentric circle visualization showing completion percentage or numeric attribute values
- **Workpackage**: A container node that groups related work items
- **Completion_Percentage**: The ratio of completed items to total items, displayed as a percentage

## Requirements

### Requirement 1: Improved Force-Directed Layout Algorithm

**User Story:** As a user, I want the graph layout to automatically prevent node overlap and maintain readable spacing, so that I can easily distinguish between different nodes and their relationships.

#### Acceptance Criteria

1. WHEN the graph is rendered, THE Graph_Visualization_System SHALL apply collision detection to maintain a minimum spacing of 20 pixels between node boundaries
2. WHEN nodes would overlap during layout calculation, THE Force_Directed_Layout SHALL apply repulsion forces to separate them
3. WHEN the layout stabilizes, THE Graph_Visualization_System SHALL ensure no two nodes have overlapping bounding boxes
4. WHEN a user drags a node, THE Force_Directed_Layout SHALL temporarily increase temperature to allow nearby nodes to adjust their positions
5. WHEN the graph contains more than 50 nodes, THE Force_Directed_Layout SHALL use Barnes_Hut_Optimization to maintain frame rates above 30 FPS

### Requirement 2: Multiple Layout Algorithm Options

**User Story:** As a user, I want to choose between different layout algorithms, so that I can view the graph in the way that best suits my current analysis needs.

#### Acceptance Criteria

1. THE Graph_Visualization_System SHALL provide four layout presets: force-directed, hierarchical, circular, and grid
2. WHEN a user selects the hierarchical layout, THE Graph_Visualization_System SHALL arrange nodes in levels based on their depth from a root node
3. WHEN a user selects the circular layout, THE Graph_Visualization_System SHALL arrange nodes in concentric circles based on their distance from a center node
4. WHEN a user selects the grid layout, THE Graph_Visualization_System SHALL arrange nodes in a regular grid pattern
5. WHEN a user switches between layout algorithms, THE Graph_Visualization_System SHALL animate the transition over 500 milliseconds
6. THE Graph_Visualization_System SHALL persist the selected layout algorithm in user preferences
7. WHEN a layout algorithm is changed, THE Graph_Visualization_System SHALL maintain the current node selection

### Requirement 3: Unified Node Design with Type Icons

**User Story:** As a user, I want all nodes to have a consistent visual design with type-specific icons and text labels, so that I can quickly identify node types while maintaining visual harmony.

#### Acceptance Criteria

1. WHEN rendering any node, THE Graph_Visualization_System SHALL display it as a rounded rectangle (8px border radius) containing text
2. WHEN rendering any node, THE Graph_Visualization_System SHALL display a circular background behind the rounded rectangle
3. WHEN rendering any node, THE Graph_Visualization_System SHALL display a type-specific icon above the rounded rectangle
4. WHEN rendering any node, THE Graph_Visualization_System SHALL display the node type name as text below the icon
5. WHEN rendering any node, THE Graph_Visualization_System SHALL display a status icon below the rounded rectangle
6. THE rounded rectangle SHALL have dimensions of 150px width × 60px height
7. THE circular background SHALL have a radius 8 pixels larger than the rounded rectangle's diagonal
8. THE Graph_Visualization_System SHALL maintain consistent node rendering across all zoom levels

### Requirement 4: Dial-Type Gauge Indicators

**User Story:** As a user, I want to see numeric metrics displayed as dial-type gauges around nodes, so that I can quickly assess completion status and other numeric values at a glance.

#### Acceptance Criteria

1. WHEN a node has a numeric attribute to display, THE Graph_Visualization_System SHALL render a dial-type gauge as a circular arc around the node
2. WHEN a task node has the "done" attribute set to true, THE Graph_Visualization_System SHALL display a complete green arc (100% completion)
3. WHEN a task node has the "done" attribute set to false, THE Graph_Visualization_System SHALL display an empty arc outline
4. WHEN a workpackage node contains child tasks, THE Graph_Visualization_System SHALL calculate and display the percentage of completed tasks as a partial arc
5. WHEN a project node contains child workpackages, THE Graph_Visualization_System SHALL calculate and display the overall completion percentage across all child items
6. THE dial gauge SHALL be positioned around the circular background with a radius 8 pixels larger than the circle
7. THE dial gauge SHALL use a stroke width of 4 pixels
8. THE dial gauge SHALL use color #388e3c for the filled portion
9. THE dial gauge SHALL use color #e0e0e0 for the unfilled portion
10. WHEN a node's numeric value changes, THE Graph_Visualization_System SHALL animate the gauge update over 300 milliseconds
11. WHEN a node has multiple numeric attributes to display, THE Graph_Visualization_System SHALL display multiple concentric dial gauges with 4-pixel spacing between them
12. THE Graph_Visualization_System SHALL display a tooltip showing the exact value and label when hovering over a dial gauge
13. EACH dial gauge SHALL have a configurable start angle, end angle, and value range
14. THE Graph_Visualization_System SHALL support displaying numeric values as text labels adjacent to their corresponding gauges

### Requirement 4.1: Hierarchical Progress Calculation

**User Story:** As a user, I want container nodes to automatically calculate progress based on their children, so that I can see aggregate progress at different levels of the project hierarchy.

#### Acceptance Criteria

1. WHEN calculating progress for a workpackage node, THE Graph_Visualization_System SHALL query all child task nodes via the graph database
2. WHEN calculating progress for a project node, THE Graph_Visualization_System SHALL recursively aggregate progress from all descendant nodes
3. THE Graph_Visualization_System SHALL cache progress calculations for 30 seconds to avoid repeated database queries
4. WHEN a child node's completion status changes, THE Graph_Visualization_System SHALL invalidate the cache for all ancestor nodes
5. WHEN a node has no children, THE Graph_Visualization_System SHALL display its own completion status only
6. THE progress calculation SHALL treat nodes with "done" attribute as 100% complete and nodes without it as 0% complete
7. THE progress calculation SHALL weight all child nodes equally in the aggregate percentage

### Requirement 5: Enhanced Node Styling

**User Story:** As a user, I want nodes to be visually distinct and informative, so that I can quickly understand the graph structure and node importance.

#### Acceptance Criteria

1. WHEN rendering nodes, THE Graph_Visualization_System SHALL use distinct colors for each node type that maintain WCAG AA contrast ratios
2. WHEN a node has a priority property, THE Graph_Visualization_System SHALL display the priority as a numeric badge in the upper right corner of the rounded rectangle
3. THE priority badge SHALL display the priority number (1-5) with an icon indicating priority level
4. WHEN a node is selected, THE Graph_Visualization_System SHALL display a black border with 3-pixel width around the circular background
5. WHEN a node is hovered, THE Graph_Visualization_System SHALL increase its size by 10% and display a shadow
6. THE Graph_Visualization_System SHALL maintain the existing color scheme defined in NODE_COLORS constant
7. THE Graph_Visualization_System SHALL ensure all node styling is consistent across different zoom levels
8. THE type icon SHALL use colors matching the node type color scheme
9. THE type text label SHALL be displayed in a readable font size (12px minimum) below the type icon

### Requirement 6: Curved Edge Rendering

**User Story:** As a user, I want edges to be rendered as smooth curves, so that I can more easily follow relationships in dense graphs.

#### Acceptance Criteria

1. WHEN rendering edges, THE Graph_Visualization_System SHALL use quadratic Bezier curves instead of straight lines
2. WHEN two nodes are connected by multiple edges, THE Graph_Visualization_System SHALL offset the curves to prevent overlap
3. THE Graph_Visualization_System SHALL calculate control points for Bezier curves at the midpoint perpendicular to the direct line between nodes
4. WHEN edges would overlap with nodes, THE Graph_Visualization_System SHALL adjust curve control points to route around them
5. THE Graph_Visualization_System SHALL maintain smooth curve rendering at all zoom levels

### Requirement 7: Edge Connection Points

**User Story:** As a user, I want edges to connect to the visual center of nodes, so that the graph appears more polished and professional.

#### Acceptance Criteria

1. WHEN rendering an edge, THE Graph_Visualization_System SHALL calculate the connection point at the intersection of the edge path and the node boundary
2. WHEN a node has a circular shape, THE Graph_Visualization_System SHALL connect edges to points on the circle perimeter
3. WHEN a node has a rectangular shape, THE Graph_Visualization_System SHALL connect edges to the nearest point on the rectangle perimeter
4. WHEN a node has a polygonal shape, THE Graph_Visualization_System SHALL connect edges to the nearest point on the polygon perimeter
5. THE Graph_Visualization_System SHALL update edge connection points when nodes are dragged or repositioned

### Requirement 8: Directional Edge Arrows

**User Story:** As a user, I want to see clear directional arrows on edges, so that I can understand the direction of relationships.

#### Acceptance Criteria

1. WHEN rendering an edge, THE Graph_Visualization_System SHALL display an arrow at the target end
2. THE arrow SHALL be positioned 10 pixels from the target node boundary
3. THE arrow SHALL be oriented tangent to the edge curve at its position
4. THE arrow SHALL have a size of 8 pixels and use the same color as the edge
5. WHEN an edge is selected, THE arrow SHALL change color to match the selected edge color

### Requirement 9: Edge Thickness and Labels

**User Story:** As a user, I want edge thickness to indicate relationship importance and labels to be clearly visible, so that I can understand relationship semantics.

#### Acceptance Criteria

1. WHEN an edge has a "weight" property, THE Graph_Visualization_System SHALL set edge thickness proportional to weight (weight 1 = 2px, weight 5 = 6px)
2. WHEN an edge has no "weight" property, THE Graph_Visualization_System SHALL use a default thickness of 2 pixels
3. WHEN an edge has a label, THE Graph_Visualization_System SHALL display it at the midpoint of the edge
4. THE Graph_Visualization_System SHALL ensure edge labels do not overlap with nodes by applying a white background with 2-pixel padding
5. WHEN edges are densely packed, THE Graph_Visualization_System SHALL hide labels for edges with thickness less than 3 pixels to reduce clutter

### Requirement 10: Edge Bundling

**User Story:** As a user, I want similar edges to be bundled together in dense graphs, so that I can see the overall structure without being overwhelmed by individual connections.

#### Acceptance Criteria

1. WHEN the graph contains more than 100 edges, THE Graph_Visualization_System SHALL apply edge bundling
2. WHEN edges share similar paths, THE Graph_Visualization_System SHALL group them together with a maximum deviation of 20 pixels
3. WHEN a user hovers over a bundled edge group, THE Graph_Visualization_System SHALL highlight all edges in the bundle
4. THE Graph_Visualization_System SHALL provide a toggle control to enable or disable edge bundling
5. WHEN edge bundling is disabled, THE Graph_Visualization_System SHALL render all edges individually

### Requirement 11: Smooth Layout Animations

**User Story:** As a user, I want smooth animations when the layout changes, so that I can follow how nodes move and maintain my mental model of the graph.

#### Acceptance Criteria

1. WHEN the layout algorithm changes, THE Graph_Visualization_System SHALL animate node positions over 500 milliseconds using an ease-in-out timing function
2. WHEN a node is added or removed, THE Graph_Visualization_System SHALL animate the layout adjustment over 300 milliseconds
3. WHEN the force simulation is running, THE Graph_Visualization_System SHALL update node positions at 60 frames per second
4. WHEN a user drags a node, THE Graph_Visualization_System SHALL immediately update its position without animation
5. THE Graph_Visualization_System SHALL provide a user preference to disable animations for accessibility

### Requirement 12: Improved Zoom-to-Fit

**User Story:** As a user, I want the zoom-to-fit function to properly center all visible nodes, so that I can see the entire graph without manual adjustment.

#### Acceptance Criteria

1. WHEN a user activates zoom-to-fit, THE Graph_Visualization_System SHALL calculate the bounding box of all visible nodes
2. THE Graph_Visualization_System SHALL set the zoom level to fit the bounding box with 20% padding on all sides
3. THE Graph_Visualization_System SHALL center the viewport on the geometric center of all visible nodes
4. THE zoom-to-fit operation SHALL complete within 500 milliseconds with smooth animation
5. WHEN no nodes are visible, THE Graph_Visualization_System SHALL reset to default zoom level of 1.0 and center position

### Requirement 13: Node Visual Depth

**User Story:** As a user, I want nodes to have visual depth through shadows, so that the graph appears more three-dimensional and easier to parse.

#### Acceptance Criteria

1. WHEN rendering nodes, THE Graph_Visualization_System SHALL apply a drop shadow with 2-pixel offset and 4-pixel blur
2. WHEN a node is selected, THE Graph_Visualization_System SHALL increase shadow blur to 8 pixels
3. WHEN a node is hovered, THE Graph_Visualization_System SHALL increase shadow opacity to 0.3
4. THE shadow color SHALL be rgba(0, 0, 0, 0.15) for unselected nodes
5. THE Graph_Visualization_System SHALL disable shadows when rendering more than 200 nodes for performance

### Requirement 14: Connected Node Highlighting

**User Story:** As a user, I want to see which nodes are connected when I hover over a node, so that I can quickly understand local graph structure.

#### Acceptance Criteria

1. WHEN a user hovers over a node, THE Graph_Visualization_System SHALL highlight all directly connected nodes
2. THE Graph_Visualization_System SHALL highlight all edges connecting to the hovered node
3. THE Graph_Visualization_System SHALL reduce opacity of non-connected nodes to 0.3
4. THE Graph_Visualization_System SHALL reduce opacity of non-connected edges to 0.2
5. WHEN the user moves the cursor away, THE Graph_Visualization_System SHALL restore normal opacity within 200 milliseconds

### Requirement 15: Enhanced Minimap

**User Story:** As a user, I want an improved minimap that better represents nodes, so that I can navigate large graphs more effectively.

#### Acceptance Criteria

1. THE minimap SHALL display nodes using the same colors as the main view
2. THE minimap SHALL display nodes using the same shapes as the main view (simplified for performance)
3. THE minimap SHALL show the current viewport as a draggable rectangle
4. WHEN a user drags the viewport rectangle in the minimap, THE Graph_Visualization_System SHALL update the main view in real-time
5. THE minimap SHALL update node positions at 30 frames per second during layout animation

### Requirement 16: Dark Mode Support

**User Story:** As a user, I want the graph visualization to support dark mode, so that I can work comfortably in low-light environments.

#### Acceptance Criteria

1. WHEN dark mode is enabled, THE Graph_Visualization_System SHALL use a dark background color (#1a1a1a)
2. WHEN dark mode is enabled, THE Graph_Visualization_System SHALL adjust node colors to maintain WCAG AA contrast ratios against the dark background
3. WHEN dark mode is enabled, THE Graph_Visualization_System SHALL use light-colored text (#e0e0e0) for labels
4. WHEN dark mode is enabled, THE Graph_Visualization_System SHALL adjust edge colors to be more visible (#757575)
5. THE Graph_Visualization_System SHALL detect dark mode from system preferences or user settings
6. WHEN dark mode is toggled, THE Graph_Visualization_System SHALL transition colors over 300 milliseconds

### Requirement 17: Level-of-Detail Rendering

**User Story:** As a user, I want the graph to remain responsive when zoomed out, so that I can explore large graphs without performance degradation.

#### Acceptance Criteria

1. WHEN the zoom level is less than 0.5, THE Graph_Visualization_System SHALL render nodes as simple circles without labels
2. WHEN the zoom level is less than 0.3, THE Graph_Visualization_System SHALL render nodes as colored dots with 4-pixel diameter
3. WHEN the zoom level is less than 0.5, THE Graph_Visualization_System SHALL hide edge labels
4. WHEN the zoom level is less than 0.3, THE Graph_Visualization_System SHALL render edges as simple lines without curves
5. WHEN the zoom level increases above these thresholds, THE Graph_Visualization_System SHALL restore full detail within 100 milliseconds

### Requirement 18: Canvas Rendering for Large Graphs

**User Story:** As a user, I want large graphs to render efficiently, so that I can work with graphs containing hundreds of nodes without performance issues.

#### Acceptance Criteria

1. WHEN the graph contains more than 100 nodes, THE Graph_Visualization_System SHALL switch from SVG to Canvas rendering
2. WHEN using Canvas rendering, THE Graph_Visualization_System SHALL maintain all visual features including shapes, colors, and labels
3. WHEN using Canvas rendering, THE Graph_Visualization_System SHALL maintain interactive features including hover, selection, and dragging
4. THE Graph_Visualization_System SHALL provide a user preference to manually select rendering mode
5. WHEN switching rendering modes, THE Graph_Visualization_System SHALL preserve the current viewport and selection state

### Requirement 19: Viewport Culling

**User Story:** As a user, I want the graph to only render visible elements, so that I can work with very large graphs efficiently.

#### Acceptance Criteria

1. THE Graph_Visualization_System SHALL calculate which nodes are within the current viewport bounds
2. THE Graph_Visualization_System SHALL only render nodes that are visible or within 100 pixels of the viewport edge
3. THE Graph_Visualization_System SHALL only render edges where both source and target nodes are visible
4. WHEN the viewport changes, THE Graph_Visualization_System SHALL update the visible set within 16 milliseconds (60 FPS)
5. THE Graph_Visualization_System SHALL maintain force simulation for all nodes regardless of visibility

### Requirement 20: Progressive Rendering

**User Story:** As a user, I want very large graphs to load progressively, so that I can start interacting with the graph before all elements are rendered.

#### Acceptance Criteria

1. WHEN loading a graph with more than 500 nodes, THE Graph_Visualization_System SHALL render nodes in batches of 100
2. THE Graph_Visualization_System SHALL render the first batch within 500 milliseconds of data load
3. THE Graph_Visualization_System SHALL render subsequent batches at 60-millisecond intervals
4. THE Graph_Visualization_System SHALL prioritize rendering nodes closest to the viewport center
5. THE Graph_Visualization_System SHALL display a progress indicator showing the percentage of nodes rendered

### Requirement 21: Optimized Force Simulation

**User Story:** As a user, I want the force simulation to run smoothly, so that I can see the graph layout stabilize without lag or stuttering.

#### Acceptance Criteria

1. THE Force_Directed_Layout SHALL maintain a frame rate of at least 30 FPS during simulation
2. WHEN the graph contains more than 50 nodes, THE Force_Directed_Layout SHALL use Barnes_Hut_Optimization
3. THE Force_Directed_Layout SHALL use a cooling schedule that reduces temperature by 0.5% per frame
4. THE Force_Directed_Layout SHALL stop simulation when temperature falls below 0.001
5. THE Force_Directed_Layout SHALL provide controls to pause, resume, and reset the simulation

### Requirement 22: User Preference Persistence

**User Story:** As a user, I want my visualization preferences to be saved, so that I don't have to reconfigure the graph view each time I use the application.

#### Acceptance Criteria

1. THE Graph_Visualization_System SHALL persist the selected layout algorithm in browser local storage
2. THE Graph_Visualization_System SHALL persist the rendering mode preference (SVG vs Canvas)
3. THE Graph_Visualization_System SHALL persist the edge bundling enabled/disabled state
4. THE Graph_Visualization_System SHALL persist the animation enabled/disabled state
5. THE Graph_Visualization_System SHALL persist the dark mode preference
6. WHEN a user returns to the application, THE Graph_Visualization_System SHALL restore all saved preferences within 100 milliseconds

### Requirement 23: Accessibility Compliance

**User Story:** As a user with accessibility needs, I want the graph visualization to be accessible, so that I can use assistive technologies to explore the graph.

#### Acceptance Criteria

1. THE Graph_Visualization_System SHALL provide keyboard navigation to select and focus nodes using arrow keys
2. THE Graph_Visualization_System SHALL provide ARIA labels for all interactive elements
3. THE Graph_Visualization_System SHALL ensure all color combinations meet WCAG AA contrast requirements
4. THE Graph_Visualization_System SHALL provide a text-based alternative view listing all nodes and relationships
5. THE Graph_Visualization_System SHALL announce node selection and focus changes to screen readers

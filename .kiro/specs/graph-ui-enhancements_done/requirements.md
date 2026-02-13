# Requirements Document

## Introduction

This document specifies requirements for enhancing the Graph Explorer UI in the RxDx project management system. The enhancements focus on improving user control over graph visualization, search capabilities, node isolation features, and UI simplification. These improvements will enable users to better navigate and understand complex project relationships through the graph interface.

## Glossary

- **Graph_Explorer**: The interactive graph visualization page that displays project entities and their relationships
- **Node**: A visual representation of an entity (WorkItem, User, Project, etc.) in the graph
- **Edge**: A visual connection between two nodes representing a relationship
- **Layout_Algorithm**: A computational method for positioning nodes in the graph (e.g., Force-Directed, Hierarchical, Circular)
- **Node_Distance**: The spacing between nodes in the graph layout, measured in pixels or relative units
- **Node_Type**: The category of entity a node represents (requirement, task, test, risk, document, user, project, etc.)
- **Neighbor**: A node that is directly connected to another node by an edge
- **Depth**: The number of relationship hops from a selected node (depth 1 = direct neighbors, depth 2 = neighbors of neighbors, etc.)
- **Type_Filter**: A UI control that allows users to show or hide nodes based on their type
- **Search_Index**: The collection of node properties that are searchable (IDs, titles, descriptions, etc.)

## Requirements

### Requirement 1: Layout Algorithm Distance Control

**User Story:** As a user viewing the graph, I want to adjust the spacing between nodes, so that I can optimize the visualization for different graph sizes and densities.

#### Acceptance Criteria

1. WHEN the Graph Explorer page loads, THE Graph_Explorer SHALL display a distance control slider in the toolbar
2. THE Distance_Control SHALL allow values between 50 and 500 pixels with increments of 10 pixels
3. WHEN a user adjusts the distance control, THE Graph_Explorer SHALL update the layout algorithm parameters in real-time
4. WHEN the layout algorithm recalculates, THE Graph_Explorer SHALL maintain the current node positions as starting points for smooth transitions
5. THE Distance_Control SHALL persist the user's preference in browser local storage
6. WHEN a user returns to the Graph Explorer, THE Graph_Explorer SHALL restore the previously set distance value
7. THE Distance_Control SHALL display the current distance value numerically next to the slider
8. WHEN the distance value changes, THE Graph_Explorer SHALL apply the new distance to all active layout algorithms (Force-Directed, Hierarchical, Circular)

### Requirement 2: Enhanced Search Functionality

**User Story:** As a user searching for nodes, I want to search across all node types and properties, so that I can find any entity in the graph regardless of its type.

#### Acceptance Criteria

1. WHEN a user enters a search query, THE Search_Function SHALL search across all node types including WorkItems, Users, Projects, and any other entity types
2. WHEN searching, THE Search_Function SHALL match against both node IDs and node titles
3. WHEN searching, THE Search_Function SHALL perform case-insensitive matching
4. WHEN a search query matches multiple nodes, THE Search_Function SHALL return all matching nodes in the results list
5. WHEN a user selects a search result, THE Graph_Explorer SHALL center the viewport on the selected node and highlight it
6. THE Search_Results SHALL display the node type, ID, and title for each matching node
7. WHEN no nodes match the search query, THE Search_Function SHALL display a message indicating no results were found
8. WHEN a user clears the search query, THE Graph_Explorer SHALL remove all search highlights and restore the normal view

### Requirement 3: Shift-Click Node Isolation

**User Story:** As a user analyzing node relationships, I want to isolate a node and its neighbors by Shift-clicking, so that I can focus on a specific subgraph without distraction.

#### Acceptance Criteria

1. WHEN a user Shift-clicks on a node, THE Graph_Explorer SHALL hide all nodes except the selected node and its neighbors up to the configured depth
2. THE Node_Isolation SHALL use the existing depth control value from the toolbar to determine neighbor depth
3. WHEN nodes are isolated, THE Graph_Explorer SHALL display only the edges connecting the visible nodes
4. WHEN a user Shift-clicks on a different node while in isolation mode, THE Graph_Explorer SHALL update the isolation to show the newly selected node and its neighbors
5. WHEN a user clicks on the background or presses Escape, THE Graph_Explorer SHALL exit isolation mode and restore all nodes
6. THE Graph_Explorer SHALL display a visual indicator when in isolation mode (e.g., banner or badge)
7. THE Isolation_Indicator SHALL show the name of the isolated node and the current depth setting
8. WHEN the user changes the depth control while in isolation mode, THE Graph_Explorer SHALL immediately update the visible neighbors to match the new depth

### Requirement 4: Simplified Type Filter Display

**User Story:** As a user filtering nodes by type, I want to see clean type names without color information, so that the filter UI is easier to read and less cluttered.

#### Acceptance Criteria

1. WHEN the Type Filter displays node types, THE Type_Filter SHALL show only the type name without color information
2. THE Type_Filter SHALL remove any text in the format "(color: ...)" from the type labels
3. THE Type_Filter SHALL maintain the color indicator as a visual element (e.g., colored dot or square) separate from the text
4. WHEN a user hovers over a type filter option, THE Type_Filter SHALL display the full type name without technical color codes
5. THE Type_Filter SHALL preserve all existing filtering functionality while displaying simplified labels

## Requirements Coverage

All requirements focus on UI enhancements and user interaction improvements:

- **Requirement 1** addresses layout customization and visualization control
- **Requirement 2** addresses search functionality and discoverability
- **Requirement 3** addresses focused analysis and subgraph exploration
- **Requirement 4** addresses UI clarity and readability

These requirements build upon existing Graph Explorer functionality without requiring changes to the underlying data model or backend services.

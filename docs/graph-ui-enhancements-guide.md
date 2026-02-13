# Graph UI Enhancements - User Guide

## Overview

The Graph Explorer now includes four powerful enhancements to help you visualize and navigate your project relationships more effectively.

## Features

### 1. Distance Control

**What it does:** Adjust the spacing between nodes to optimize the graph layout for different sizes and densities.

**How to use:**
- Look for the **Distance** slider in the toolbar (between Layout Selector and Search)
- Drag the slider or enter a value between 50-500 pixels
- The graph layout updates in real-time as you adjust
- Your preferred distance is automatically saved and restored when you return

**Tips:**
- Use smaller distances (50-150) for dense graphs with many nodes
- Use larger distances (300-500) for sparse graphs or when you need more space
- The distance applies to all layout algorithms (Force, Hierarchical, Circular, Grid)

---

### 2. Enhanced Search

**What it does:** Search across all node types and properties to quickly find any entity in your graph.

**How to use:**
- Use the **Search** box in the toolbar
- Type any part of a node's ID or title
- Search is case-insensitive (e.g., "auth" finds "Authentication")
- Results show all matching nodes with their type, ID, and title
- Click a result to center and highlight that node in the graph

**What you can search:**
- Work items (requirements, tasks, tests, risks, documents)
- Users
- Projects
- Phases
- Any other entity type in your graph

**Tips:**
- Search works on the currently loaded graph data
- Use partial matches to find related items (e.g., "login" finds all login-related nodes)
- Clear the search to remove highlights and return to normal view

---

### 3. Node Isolation Mode

**What it does:** Focus on a specific node and its neighbors by hiding everything else.

**How to use:**
- **Hold Shift** and **click any node** to enter isolation mode
- The graph shows only the selected node and its connected neighbors
- A banner appears showing the isolated node name and depth
- Use the **Depth** control to see more levels of neighbors (1-3 hops)
- **Press Escape** or **click the background** to exit and restore the full graph

**Example workflow:**
1. Shift-click on a requirement to see what implements it
2. Increase depth to 2 to see tests connected to those tasks
3. Shift-click a different node to switch focus
4. Press Escape to return to the full graph

**Tips:**
- Depth 1 shows direct neighbors only
- Depth 2 includes neighbors of neighbors
- Depth 3 shows three levels of connections
- The isolation indicator shows how many nodes are visible
- You can adjust depth while in isolation mode to explore further

---

### 4. Simplified Type Filter

**What it does:** Cleaner, easier-to-read type filter labels without technical color information.

**What changed:**
- Type labels now show only the type name (e.g., "Requirement" instead of "Requirement (color: #3b82f6)")
- Color indicators remain as visual elements (colored dots/squares)
- Hover tooltips are cleaner and more descriptive
- All filtering functionality works exactly as before

**How to use:**
- Click the **Filter** button in the toolbar
- Check/uncheck node types to show/hide them
- Use **Select All** or **Clear All** for quick changes
- Collapse/expand categories to organize the filter list

---

## Combining Features

These features work together seamlessly:

**Example 1: Focus on a specific area**
1. Use **Type Filter** to show only requirements and tasks
2. **Search** for "authentication" to find related items
3. **Shift-click** a requirement to isolate its implementation
4. Adjust **Distance** to spread out the isolated nodes

**Example 2: Explore dependencies**
1. **Search** for a specific work item by ID
2. **Shift-click** it to see direct dependencies (depth 1)
3. Increase **Depth** to 2 to see the full dependency chain
4. Adjust **Distance** for better visibility

**Example 3: Clean up a crowded graph**
1. Use **Type Filter** to hide less relevant node types
2. Adjust **Distance** to increase spacing
3. **Search** to quickly locate specific items
4. Use **Isolation Mode** to focus on one area at a time

---

## Keyboard Shortcuts

- **Shift + Click** on node → Enter isolation mode
- **Escape** → Exit isolation mode
- **Click background** → Exit isolation mode

---

## Tips & Best Practices

1. **Start with filtering** - Hide node types you don't need before adjusting layout
2. **Use search for navigation** - Faster than panning/zooming to find specific nodes
3. **Isolation for analysis** - Great for understanding dependencies and relationships
4. **Save your preferences** - Distance settings persist across sessions
5. **Combine features** - Each feature enhances the others when used together

---

## Troubleshooting

**Graph feels too crowded?**
- Increase the distance slider
- Use type filters to hide unnecessary nodes
- Try isolation mode to focus on one area

**Can't find a node?**
- Use the search feature - it searches all node types
- Check your type filters - the node might be hidden
- Try searching by partial ID or title

**Isolation mode not working?**
- Make sure you're holding Shift while clicking
- Check that the node is clickable (not disabled)
- Try clicking directly on the node, not its label

**Distance changes not saving?**
- Check that localStorage is enabled in your browser
- Try adjusting the distance again and refreshing the page

---

## Feedback

These enhancements are designed to improve your graph exploration experience. If you have suggestions or encounter issues, please provide feedback to help us continue improving the Graph Explorer.

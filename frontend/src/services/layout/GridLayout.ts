/**
 * Grid Layout Algorithm
 * 
 * Arranges nodes in a regular grid pattern.
 * Features:
 * - Optimal grid dimensions (columns = ceil(sqrt(nodeCount)))
 * - Node sorting by type and priority
 * - Left-to-right, top-to-bottom placement
 * - Configurable row and column spacing
 */

export interface GridNode {
  id: string;
  width: number;
  height: number;
  type?: string;
  priority?: number;
}

export interface GridLayoutConfig {
  columns?: number;
  rowSpacing: number;
  columnSpacing: number;
  sortBy?: 'type' | 'priority' | 'none';
}

export interface NodePosition {
  x: number;
  y: number;
}

/**
 * Grid layout engine
 */
export class GridLayout {
  private config: GridLayoutConfig;

  constructor(config: Partial<GridLayoutConfig> = {}) {
    this.config = {
      columns: config.columns,
      rowSpacing: config.rowSpacing !== undefined ? config.rowSpacing : 100,
      columnSpacing: config.columnSpacing !== undefined ? config.columnSpacing : 150,
      sortBy: config.sortBy || 'none',
    };
  }

  /**
   * Calculate positions for all nodes using grid layout
   */
  calculateLayout(nodes: GridNode[]): Map<string, NodePosition> {
    if (nodes.length === 0) {
      return new Map();
    }

    // Step 1: Calculate optimal grid dimensions
    const columns = this.calculateOptimalColumns(nodes.length);

    // Step 2: Sort nodes by type and priority
    const sortedNodes = this.sortNodes(nodes);

    // Step 3: Place nodes left-to-right, top-to-bottom
    const positions = this.placeNodes(sortedNodes, columns);

    return positions;
  }

  /**
   * Calculate optimal number of columns
   * Formula: columns = ceil(sqrt(nodeCount))
   */
  calculateOptimalColumns(nodeCount: number): number {
    // Use configured columns if provided
    if (this.config.columns !== undefined && this.config.columns > 0) {
      return this.config.columns;
    }

    // Calculate optimal columns: ceil(sqrt(nodeCount))
    return Math.ceil(Math.sqrt(nodeCount));
  }

  /**
   * Sort nodes by type and priority
   */
  sortNodes(nodes: GridNode[]): GridNode[] {
    if (this.config.sortBy === 'none') {
      return [...nodes];
    }

    return [...nodes].sort((a, b) => {
      if (this.config.sortBy === 'type') {
        // Sort by type first
        const typeA = a.type || '';
        const typeB = b.type || '';
        if (typeA !== typeB) {
          return typeA.localeCompare(typeB);
        }
        // Then by priority (higher priority first)
        const priorityA = a.priority || 0;
        const priorityB = b.priority || 0;
        return priorityB - priorityA;
      } else if (this.config.sortBy === 'priority') {
        // Sort by priority first (higher priority first)
        const priorityA = a.priority || 0;
        const priorityB = b.priority || 0;
        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }
        // Then by type
        const typeA = a.type || '';
        const typeB = b.type || '';
        return typeA.localeCompare(typeB);
      }

      return 0;
    });
  }

  /**
   * Place nodes in grid positions (left-to-right, top-to-bottom)
   */
  placeNodes(nodes: GridNode[], columns: number): Map<string, NodePosition> {
    const positions = new Map<string, NodePosition>();

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // Calculate row and column
      const row = Math.floor(i / columns);
      const col = i % columns;

      // Calculate position
      const x = col * this.config.columnSpacing;
      const y = row * this.config.rowSpacing;

      positions.set(node.id, { x, y });
    }

    return positions;
  }

  /**
   * Get grid dimensions for the given nodes
   */
  getGridDimensions(nodeCount: number): { columns: number; rows: number } {
    const columns = this.calculateOptimalColumns(nodeCount);
    const rows = Math.ceil(nodeCount / columns);
    return { columns, rows };
  }

  /**
   * Get grid cell for a specific node index
   */
  getGridCell(nodeIndex: number, columns: number): { row: number; col: number } {
    const row = Math.floor(nodeIndex / columns);
    const col = nodeIndex % columns;
    return { row, col };
  }
}

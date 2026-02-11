/**
 * Circular Layout Algorithm
 * 
 * Arranges nodes in concentric circles based on graph distance from center.
 * Features:
 * - Node sorting by degree (high-degree nodes in center)
 * - Concentric circle placement based on graph distance
 * - Angular position optimization to minimize edge crossings
 * - Configurable radius, start angle, and end angle
 */

export interface CircularNode {
  id: string;
  width: number;
  height: number;
}

export interface CircularEdge {
  source: string;
  target: string;
}

export interface CircularLayoutConfig {
  radius: number;
  startAngle: number;
  endAngle: number;
  sortBy?: 'degree' | 'type' | 'none';
}

export interface NodePosition {
  x: number;
  y: number;
}

/**
 * Circular layout engine
 */
export class CircularLayout {
  private config: CircularLayoutConfig;

  constructor(config: Partial<CircularLayoutConfig> = {}) {
    this.config = {
      radius: config.radius || 200,
      startAngle: config.startAngle !== undefined ? config.startAngle : 0,
      endAngle: config.endAngle !== undefined ? config.endAngle : 2 * Math.PI,
      sortBy: config.sortBy || 'degree',
    };
  }

  /**
   * Calculate positions for all nodes using circular layout
   */
  calculateLayout(
    nodes: CircularNode[],
    edges: CircularEdge[]
  ): Map<string, NodePosition> {
    if (nodes.length === 0) {
      return new Map();
    }

    // Single node - place at center
    if (nodes.length === 1) {
      return new Map([[nodes[0].id, { x: 0, y: 0 }]]);
    }

    // Step 1: Calculate node degrees
    const degrees = this.calculateDegrees(nodes, edges);

    // Step 2: Sort nodes by degree (high-degree nodes first)
    const sortedNodes = this.sortNodesByDegree(nodes, degrees);

    // Step 3: Assign nodes to concentric circles based on graph distance
    const circles = this.assignToCircles(sortedNodes, edges);

    // Step 4: Optimize angular positions to minimize edge crossings
    const positions = this.assignAngularPositions(circles, edges);

    return positions;
  }

  /**
   * Calculate degree (number of connections) for each node
   */
  calculateDegrees(
    nodes: CircularNode[],
    edges: CircularEdge[]
  ): Map<string, number> {
    const degrees = new Map<string, number>();

    // Initialize all nodes with degree 0
    for (const node of nodes) {
      degrees.set(node.id, 0);
    }

    // Count edges for each node
    for (const edge of edges) {
      const sourceDegree = degrees.get(edge.source) || 0;
      const targetDegree = degrees.get(edge.target) || 0;
      degrees.set(edge.source, sourceDegree + 1);
      degrees.set(edge.target, targetDegree + 1);
    }

    return degrees;
  }

  /**
   * Sort nodes by degree (descending order - highest degree first)
   */
  sortNodesByDegree(
    nodes: CircularNode[],
    degrees: Map<string, number>
  ): CircularNode[] {
    if (this.config.sortBy !== 'degree') {
      return [...nodes];
    }

    return [...nodes].sort((a, b) => {
      const degreeA = degrees.get(a.id) || 0;
      const degreeB = degrees.get(b.id) || 0;
      // Sort descending (highest degree first)
      return degreeB - degreeA;
    });
  }

  /**
   * Assign nodes to concentric circles based on graph distance from center
   * Uses BFS to calculate distances from the highest-degree node (center)
   */
  assignToCircles(
    sortedNodes: CircularNode[],
    edges: CircularEdge[]
  ): Map<number, CircularNode[]> {
    const circles = new Map<number, CircularNode[]>();

    if (sortedNodes.length === 0) {
      return circles;
    }

    // Build adjacency list
    const adjacency = new Map<string, Set<string>>();
    for (const node of sortedNodes) {
      adjacency.set(node.id, new Set());
    }

    for (const edge of edges) {
      if (adjacency.has(edge.source) && adjacency.has(edge.target)) {
        adjacency.get(edge.source)!.add(edge.target);
        adjacency.get(edge.target)!.add(edge.source);
      }
    }

    // Use highest-degree node as center (first in sorted list)
    const centerNode = sortedNodes[0];
    const distances = new Map<string, number>();
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; distance: number }> = [];

    // BFS from center node
    queue.push({ nodeId: centerNode.id, distance: 0 });
    distances.set(centerNode.id, 0);

    while (queue.length > 0) {
      const { nodeId, distance } = queue.shift()!;

      if (visited.has(nodeId)) {
        continue;
      }
      visited.add(nodeId);

      // Add to circle
      if (!circles.has(distance)) {
        circles.set(distance, []);
      }
      const node = sortedNodes.find(n => n.id === nodeId);
      if (node) {
        circles.get(distance)!.push(node);
      }

      // Process neighbors
      const neighbors = adjacency.get(nodeId) || new Set();
      for (const neighborId of neighbors) {
        if (!visited.has(neighborId)) {
          const currentDistance = distances.get(neighborId);
          const newDistance = distance + 1;

          // Use shortest path distance
          if (currentDistance === undefined || newDistance < currentDistance) {
            distances.set(neighborId, newDistance);
            queue.push({ nodeId: neighborId, distance: newDistance });
          }
        }
      }
    }

    // Handle disconnected nodes (assign to outermost circle)
    const maxDistance = Math.max(...Array.from(circles.keys()), 0);
    for (const node of sortedNodes) {
      if (!distances.has(node.id)) {
        distances.set(node.id, maxDistance + 1);
        if (!circles.has(maxDistance + 1)) {
          circles.set(maxDistance + 1, []);
        }
        circles.get(maxDistance + 1)!.push(node);
      }
    }

    return circles;
  }

  /**
   * Assign angular positions to nodes within each circle
   * Optimizes positions to minimize edge crossings
   */
  assignAngularPositions(
    circles: Map<number, CircularNode[]>,
    edges: CircularEdge[]
  ): Map<string, NodePosition> {
    const positions = new Map<string, NodePosition>();

    // Build adjacency information for optimization
    const adjacency = new Map<string, Set<string>>();
    for (const [, nodes] of circles.entries()) {
      for (const node of nodes) {
        adjacency.set(node.id, new Set());
      }
    }

    for (const edge of edges) {
      if (adjacency.has(edge.source) && adjacency.has(edge.target)) {
        adjacency.get(edge.source)!.add(edge.target);
        adjacency.get(edge.target)!.add(edge.source);
      }
    }

    const circleNumbers = Array.from(circles.keys()).sort((a, b) => a - b);

    for (const circleNum of circleNumbers) {
      const nodesInCircle = circles.get(circleNum)!;

      if (nodesInCircle.length === 0) {
        continue;
      }

      // Calculate radius for this circle
      const circleRadius = circleNum === 0 ? 0 : circleNum * this.config.radius;

      // For center node (circle 0), place at origin
      if (circleNum === 0) {
        for (const node of nodesInCircle) {
          positions.set(node.id, { x: 0, y: 0 });
        }
        continue;
      }

      // Calculate angular spacing
      const angleRange = this.config.endAngle - this.config.startAngle;
      const angleStep = angleRange / nodesInCircle.length;

      // Optimize node order to minimize edge crossings
      const optimizedOrder = this.optimizeNodeOrder(
        nodesInCircle,
        adjacency,
        positions
      );

      // Assign angular positions
      for (let i = 0; i < optimizedOrder.length; i++) {
        const node = optimizedOrder[i];
        const angle = this.config.startAngle + i * angleStep;

        const x = circleRadius * Math.cos(angle);
        const y = circleRadius * Math.sin(angle);

        positions.set(node.id, { x, y });
      }
    }

    return positions;
  }

  /**
   * Optimize node order within a circle to minimize edge crossings
   * Uses a greedy approach based on barycenter of connected nodes
   */
  private optimizeNodeOrder(
    nodes: CircularNode[],
    adjacency: Map<string, Set<string>>,
    existingPositions: Map<string, NodePosition>
  ): CircularNode[] {
    // Calculate barycenter (average angle) of connected nodes for each node
    const barycenters = new Map<string, number>();

    for (const node of nodes) {
      const neighbors = adjacency.get(node.id) || new Set();
      const connectedPositions: NodePosition[] = [];

      for (const neighborId of neighbors) {
        const pos = existingPositions.get(neighborId);
        if (pos) {
          connectedPositions.push(pos);
        }
      }

      if (connectedPositions.length === 0) {
        // No connected nodes with positions yet, use default
        barycenters.set(node.id, 0);
        continue;
      }

      // Calculate average angle of connected nodes
      let sumAngle = 0;
      for (const pos of connectedPositions) {
        const angle = Math.atan2(pos.y, pos.x);
        sumAngle += angle;
      }

      const avgAngle = sumAngle / connectedPositions.length;
      barycenters.set(node.id, avgAngle);
    }

    // Sort nodes by barycenter angle
    return [...nodes].sort((a, b) => {
      const angleA = barycenters.get(a.id) || 0;
      const angleB = barycenters.get(b.id) || 0;
      return angleA - angleB;
    });
  }

  /**
   * Get circle assignments for nodes
   */
  getCircleAssignments(
    nodes: CircularNode[],
    edges: CircularEdge[]
  ): Array<{ nodeId: string; circle: number; distance: number }> {
    const degrees = this.calculateDegrees(nodes, edges);
    const sortedNodes = this.sortNodesByDegree(nodes, degrees);
    const circles = this.assignToCircles(sortedNodes, edges);

    const assignments: Array<{ nodeId: string; circle: number; distance: number }> = [];

    for (const [circle, nodesInCircle] of circles.entries()) {
      const distance = circle === 0 ? 0 : circle * this.config.radius;
      for (const node of nodesInCircle) {
        assignments.push({
          nodeId: node.id,
          circle,
          distance,
        });
      }
    }

    return assignments;
  }
}

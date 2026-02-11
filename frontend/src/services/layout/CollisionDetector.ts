/**
 * Collision detection system for force-directed layouts
 * Ensures minimum spacing between nodes using quadtree spatial partitioning
 * 
 * References: Design Document - Layout Engine Foundation
 * Requirements: 1.1, 1.2, 1.3
 */

import { Quadtree, type Rectangle } from './Quadtree';

export interface NodeBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number; // For circular nodes
}

export interface CollisionResult {
  hasCollision: boolean;
  collidingPairs: Array<{ nodeA: string; nodeB: string; overlap: number }>;
}

/**
 * Collision detector using quadtree spatial partitioning
 * Provides O(n log n) collision detection for graph layouts
 */
export class CollisionDetector {
  private minSpacing: number;

  constructor(minSpacing: number = 20) {
    this.minSpacing = minSpacing;
  }

  /**
   * Detect all collisions between nodes
   * Returns pairs of colliding nodes with overlap distance
   */
  detectCollisions(nodes: NodeBounds[]): CollisionResult {
    if (nodes.length === 0) {
      return { hasCollision: false, collidingPairs: [] };
    }

    // Build quadtree from node positions
    const bounds = this.calculateBounds(nodes);
    const quadtree = new Quadtree<NodeBounds>(bounds);

    // Insert all nodes into quadtree
    for (const node of nodes) {
      quadtree.insert({ x: node.x, y: node.y }, node);
    }

    // Check each node against nearby nodes
    const collidingPairs: Array<{ nodeA: string; nodeB: string; overlap: number }> = [];
    const checked = new Set<string>();

    for (const node of nodes) {
      // Query nearby nodes (within max possible collision distance)
      const maxNodeSize = Math.max(node.width, node.height);
      const searchRadius = maxNodeSize + this.minSpacing;
      
      const nearby = quadtree.queryRadius(
        { x: node.x, y: node.y },
        searchRadius
      );

      // Check for collisions with nearby nodes
      for (const nearbyNode of nearby) {
        // Skip self
        if (nearbyNode.data.id === node.id) {
          continue;
        }

        // Skip if already checked this pair
        const pairKey = this.getPairKey(node.id, nearbyNode.data.id);
        if (checked.has(pairKey)) {
          continue;
        }
        checked.add(pairKey);

        // Check if nodes are too close
        const overlap = this.calculateOverlap(node, nearbyNode.data);
        if (overlap > 0) {
          collidingPairs.push({
            nodeA: node.id,
            nodeB: nearbyNode.data.id,
            overlap,
          });
        }
      }
    }

    return {
      hasCollision: collidingPairs.length > 0,
      collidingPairs,
    };
  }

  /**
   * Calculate the overlap distance between two nodes
   * Returns positive value if nodes are too close, 0 if properly spaced
   */
  private calculateOverlap(nodeA: NodeBounds, nodeB: NodeBounds): number {
    // Calculate center-to-center distance
    const dx = nodeB.x - nodeA.x;
    const dy = nodeB.y - nodeA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Calculate required minimum distance (sum of radii + spacing)
    const radiusA = nodeA.radius || Math.max(nodeA.width, nodeA.height) / 2;
    const radiusB = nodeB.radius || Math.max(nodeB.width, nodeB.height) / 2;
    const minDistance = radiusA + radiusB + this.minSpacing;

    // Return overlap amount (positive if overlapping)
    return minDistance - distance;
  }

  /**
   * Check if two specific nodes are colliding
   */
  areNodesColliding(nodeA: NodeBounds, nodeB: NodeBounds): boolean {
    return this.calculateOverlap(nodeA, nodeB) > 0;
  }

  /**
   * Get the minimum required distance between two nodes
   */
  getMinimumDistance(nodeA: NodeBounds, nodeB: NodeBounds): number {
    const radiusA = nodeA.radius || Math.max(nodeA.width, nodeA.height) / 2;
    const radiusB = nodeB.radius || Math.max(nodeB.width, nodeB.height) / 2;
    return radiusA + radiusB + this.minSpacing;
  }

  /**
   * Calculate bounding box that contains all nodes
   */
  private calculateBounds(nodes: NodeBounds[]): Rectangle {
    if (nodes.length === 0) {
      return { x: 0, y: 0, width: 1000, height: 1000 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      const radius = node.radius || Math.max(node.width, node.height) / 2;
      minX = Math.min(minX, node.x - radius);
      minY = Math.min(minY, node.y - radius);
      maxX = Math.max(maxX, node.x + radius);
      maxY = Math.max(maxY, node.y + radius);
    }

    // Add padding
    const padding = 100;
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + 2 * padding,
      height: maxY - minY + 2 * padding,
    };
  }

  /**
   * Generate a unique key for a node pair (order-independent)
   */
  private getPairKey(idA: string, idB: string): string {
    return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
  }

  /**
   * Set the minimum spacing between nodes
   */
  setMinSpacing(spacing: number): void {
    this.minSpacing = spacing;
  }

  /**
   * Get the current minimum spacing
   */
  getMinSpacing(): number {
    return this.minSpacing;
  }
}

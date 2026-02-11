/**
 * Collision resolution system for force-directed layouts
 * Applies repulsion forces to separate overlapping nodes
 * 
 * References: Design Document - Layout Engine Foundation
 * Requirements: 1.2, 1.3
 */

import { CollisionDetector, type NodeBounds } from './CollisionDetector';

export interface NodePosition {
  id: string;
  x: number;
  y: number;
  vx?: number; // Velocity x
  vy?: number; // Velocity y
}

export interface CollisionForce {
  nodeId: string;
  fx: number; // Force x
  fy: number; // Force y
}

/**
 * Collision resolver that applies repulsion forces to separate overlapping nodes
 */
export class CollisionResolver {
  private detector: CollisionDetector;
  private strength: number;

  constructor(minSpacing: number = 20, strength: number = 0.7) {
    this.detector = new CollisionDetector(minSpacing);
    this.strength = strength;
  }

  /**
   * Calculate collision resolution forces for all nodes
   * Returns force vectors to apply to each node to resolve collisions
   */
  calculateForces(nodes: NodeBounds[]): Map<string, CollisionForce> {
    const forces = new Map<string, CollisionForce>();

    // Initialize forces to zero
    for (const node of nodes) {
      forces.set(node.id, { nodeId: node.id, fx: 0, fy: 0 });
    }

    // Detect collisions
    const collisionResult = this.detector.detectCollisions(nodes);

    // Apply repulsion forces for each colliding pair
    for (const collision of collisionResult.collidingPairs) {
      const nodeA = nodes.find(n => n.id === collision.nodeA);
      const nodeB = nodes.find(n => n.id === collision.nodeB);

      if (!nodeA || !nodeB) continue;

      // Calculate direction from A to B
      const dx = nodeB.x - nodeA.x;
      const dy = nodeB.y - nodeA.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Avoid division by zero
      if (distance < 0.01) {
        // Apply random small force to separate nodes at same position
        const angle = Math.random() * 2 * Math.PI;
        const force = this.strength * collision.overlap;
        
        const forceA = forces.get(nodeA.id)!;
        forceA.fx -= Math.cos(angle) * force;
        forceA.fy -= Math.sin(angle) * force;

        const forceB = forces.get(nodeB.id)!;
        forceB.fx += Math.cos(angle) * force;
        forceB.fy += Math.sin(angle) * force;
        continue;
      }

      // Normalize direction
      const nx = dx / distance;
      const ny = dy / distance;

      // Calculate repulsion force magnitude based on overlap
      // Stronger force for larger overlaps
      const forceMagnitude = this.strength * collision.overlap;

      // Apply equal and opposite forces to both nodes
      const forceA = forces.get(nodeA.id)!;
      forceA.fx -= nx * forceMagnitude;
      forceA.fy -= ny * forceMagnitude;

      const forceB = forces.get(nodeB.id)!;
      forceB.fx += nx * forceMagnitude;
      forceB.fy += ny * forceMagnitude;
    }

    return forces;
  }

  /**
   * Apply collision resolution forces to node positions
   * Updates positions in-place and returns the modified array
   */
  applyForces(
    nodes: NodeBounds[],
    positions: Map<string, NodePosition>,
    alpha: number = 1.0
  ): Map<string, NodePosition> {
    // Calculate forces
    const forces = this.calculateForces(nodes);

    // Apply forces to positions
    for (const [nodeId, force] of forces) {
      const position = positions.get(nodeId);
      if (!position) continue;

      // Apply force scaled by alpha (simulation cooling parameter)
      position.x += force.fx * alpha;
      position.y += force.fy * alpha;

      // Update velocity if present (for momentum-based simulations)
      if (position.vx !== undefined && position.vy !== undefined) {
        position.vx += force.fx * alpha;
        position.vy += force.fy * alpha;
      }
    }

    return positions;
  }

  /**
   * Resolve collisions iteratively until no overlaps remain or max iterations reached
   * Returns the number of iterations performed
   */
  resolveCollisions(
    nodes: NodeBounds[],
    positions: Map<string, NodePosition>,
    maxIterations: number = 10,
    alpha: number = 1.0
  ): number {
    let iterations = 0;

    for (let i = 0; i < maxIterations; i++) {
      iterations++;

      // Update node bounds with current positions
      const updatedNodes = nodes.map(node => {
        const pos = positions.get(node.id);
        if (!pos) return node;
        return { ...node, x: pos.x, y: pos.y };
      });

      // Check for collisions
      const collisionResult = this.detector.detectCollisions(updatedNodes);
      
      // If no collisions, we're done
      if (!collisionResult.hasCollision) {
        break;
      }

      // Apply forces to resolve collisions
      this.applyForces(updatedNodes, positions, alpha);

      // Reduce alpha for each iteration (cooling)
      alpha *= 0.9;
    }

    return iterations;
  }

  /**
   * Check if layout has stabilized (no collisions)
   */
  isStabilized(nodes: NodeBounds[]): boolean {
    const result = this.detector.detectCollisions(nodes);
    return !result.hasCollision;
  }

  /**
   * Set the collision resolution strength
   */
  setStrength(strength: number): void {
    this.strength = strength;
  }

  /**
   * Get the current collision resolution strength
   */
  getStrength(): number {
    return this.strength;
  }

  /**
   * Set the minimum spacing between nodes
   */
  setMinSpacing(spacing: number): void {
    this.detector.setMinSpacing(spacing);
  }

  /**
   * Get the current minimum spacing
   */
  getMinSpacing(): number {
    return this.detector.getMinSpacing();
  }

  /**
   * Get the collision detector instance
   */
  getDetector(): CollisionDetector {
    return this.detector;
  }
}

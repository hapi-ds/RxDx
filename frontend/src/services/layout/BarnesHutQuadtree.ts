/**
 * Barnes-Hut quadtree for efficient force calculations
 * Reduces force calculation complexity from O(n²) to O(n log n)
 * 
 * References: Design Document - Layout Engine Foundation
 * Requirements: 1.5, 21.2
 */

import { type Point, type Rectangle } from './Quadtree';

export interface MassPoint extends Point {
  mass: number;
}

export interface BarnesHutNode {
  id: string;
  x: number;
  y: number;
  mass: number;
  vx?: number;
  vy?: number;
}

interface QuadrantData {
  centerOfMass: Point;
  totalMass: number;
  nodeCount: number;
  nodes: BarnesHutNode[];
}

/**
 * Barnes-Hut quadtree for force approximation
 * Groups distant nodes and treats them as a single mass point
 */
export class BarnesHutQuadtree {
  private boundary: Rectangle;
  private theta: number; // Approximation threshold (typically 0.5)
  private data: QuadrantData;
  private divided: boolean;
  private northeast?: BarnesHutQuadtree;
  private northwest?: BarnesHutQuadtree;
  private southeast?: BarnesHutQuadtree;
  private southwest?: BarnesHutQuadtree;

  constructor(boundary: Rectangle, theta: number = 0.5) {
    this.boundary = boundary;
    this.theta = theta;
    this.data = {
      centerOfMass: { x: 0, y: 0 },
      totalMass: 0,
      nodeCount: 0,
      nodes: [],
    };
    this.divided = false;
  }

  /**
   * Insert a node into the Barnes-Hut quadtree
   */
  insert(node: BarnesHutNode): boolean {
    // Ignore nodes outside boundary
    if (!this.contains({ x: node.x, y: node.y })) {
      return false;
    }

    // If this is a leaf node with no nodes yet, add it
    if (this.data.nodeCount === 0 && !this.divided) {
      this.data.nodes.push(node);
      this.data.nodeCount = 1;
      this.data.totalMass = node.mass;
      this.data.centerOfMass = { x: node.x, y: node.y };
      return true;
    }

    // If this is a leaf node with one node, subdivide
    if (this.data.nodeCount === 1 && !this.divided) {
      this.subdivide();
      // Re-insert the existing node
      const existingNode = this.data.nodes[0];
      this.insertIntoChild(existingNode);
      this.data.nodes = [];
    }

    // Update center of mass and total mass
    this.updateCenterOfMass(node);

    // If divided, insert into appropriate child
    if (this.divided) {
      return this.insertIntoChild(node);
    }

    return true;
  }

  /**
   * Calculate force on a node using Barnes-Hut approximation
   * Returns force vector { fx, fy }
   */
  calculateForce(
    node: BarnesHutNode,
    repulsionStrength: number = 100
  ): { fx: number; fy: number } {
    let fx = 0;
    let fy = 0;

    // If this quadrant is empty, no force
    if (this.data.nodeCount === 0) {
      return { fx, fy };
    }

    // Calculate distance from node to center of mass
    const dx = this.data.centerOfMass.x - node.x;
    const dy = this.data.centerOfMass.y - node.y;
    const distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);

    // Avoid self-interaction and division by zero
    if (distance < 0.01) {
      return { fx, fy };
    }

    // Calculate quadrant size
    const size = Math.max(this.boundary.width, this.boundary.height);

    // Barnes-Hut criterion: if s/d < theta, treat as single body
    if (!this.divided || size / distance < this.theta) {
      // Approximate: treat entire quadrant as single mass point
      // Coulomb's law: F = k * m1 * m2 / r²
      const force = (repulsionStrength * node.mass * this.data.totalMass) / distanceSquared;
      
      // Normalize direction and apply force
      fx -= (dx / distance) * force;
      fy -= (dy / distance) * force;
    } else {
      // Recursively calculate forces from children
      if (this.northeast) {
        const childForce = this.northeast.calculateForce(node, repulsionStrength);
        fx += childForce.fx;
        fy += childForce.fy;
      }
      if (this.northwest) {
        const childForce = this.northwest.calculateForce(node, repulsionStrength);
        fx += childForce.fx;
        fy += childForce.fy;
      }
      if (this.southeast) {
        const childForce = this.southeast.calculateForce(node, repulsionStrength);
        fx += childForce.fx;
        fy += childForce.fy;
      }
      if (this.southwest) {
        const childForce = this.southwest.calculateForce(node, repulsionStrength);
        fx += childForce.fx;
        fy += childForce.fy;
      }
    }

    return { fx, fy };
  }

  /**
   * Calculate forces for all nodes using Barnes-Hut approximation
   */
  calculateAllForces(
    nodes: BarnesHutNode[],
    repulsionStrength: number = 100
  ): Map<string, { fx: number; fy: number }> {
    const forces = new Map<string, { fx: number; fy: number }>();

    for (const node of nodes) {
      const force = this.calculateForce(node, repulsionStrength);
      forces.set(node.id, force);
    }

    return forces;
  }

  /**
   * Update center of mass with a new node
   */
  private updateCenterOfMass(node: BarnesHutNode): void {
    const totalMass = this.data.totalMass + node.mass;
    
    // Weighted average of positions
    this.data.centerOfMass.x =
      (this.data.centerOfMass.x * this.data.totalMass + node.x * node.mass) / totalMass;
    this.data.centerOfMass.y =
      (this.data.centerOfMass.y * this.data.totalMass + node.y * node.mass) / totalMass;
    
    this.data.totalMass = totalMass;
    this.data.nodeCount++;
  }

  /**
   * Insert node into appropriate child quadrant
   */
  private insertIntoChild(node: BarnesHutNode): boolean {
    if (this.northeast?.insert(node)) return true;
    if (this.northwest?.insert(node)) return true;
    if (this.southeast?.insert(node)) return true;
    if (this.southwest?.insert(node)) return true;
    return false;
  }

  /**
   * Subdivide this quadrant into four children
   */
  private subdivide(): void {
    const x = this.boundary.x;
    const y = this.boundary.y;
    const w = this.boundary.width / 2;
    const h = this.boundary.height / 2;

    const ne: Rectangle = { x: x + w, y: y, width: w, height: h };
    const nw: Rectangle = { x: x, y: y, width: w, height: h };
    const se: Rectangle = { x: x + w, y: y + h, width: w, height: h };
    const sw: Rectangle = { x: x, y: y + h, width: w, height: h };

    this.northeast = new BarnesHutQuadtree(ne, this.theta);
    this.northwest = new BarnesHutQuadtree(nw, this.theta);
    this.southeast = new BarnesHutQuadtree(se, this.theta);
    this.southwest = new BarnesHutQuadtree(sw, this.theta);

    this.divided = true;
  }

  /**
   * Check if a point is within this quadrant's boundary
   */
  private contains(point: Point): boolean {
    return (
      point.x >= this.boundary.x &&
      point.x <= this.boundary.x + this.boundary.width &&
      point.y >= this.boundary.y &&
      point.y <= this.boundary.y + this.boundary.height
    );
  }

  /**
   * Get the theta parameter (approximation threshold)
   */
  getTheta(): number {
    return this.theta;
  }

  /**
   * Get the total mass in this quadrant
   */
  getTotalMass(): number {
    return this.data.totalMass;
  }

  /**
   * Get the center of mass for this quadrant
   */
  getCenterOfMass(): Point {
    return { ...this.data.centerOfMass };
  }

  /**
   * Get the number of nodes in this quadrant (including children)
   */
  getNodeCount(): number {
    return this.data.nodeCount;
  }

  /**
   * Clear the quadtree
   */
  clear(): void {
    this.data = {
      centerOfMass: { x: 0, y: 0 },
      totalMass: 0,
      nodeCount: 0,
      nodes: [],
    };
    this.divided = false;
    this.northeast = undefined;
    this.northwest = undefined;
    this.southeast = undefined;
    this.southwest = undefined;
  }
}

/**
 * Build a Barnes-Hut quadtree from a set of nodes
 */
export function buildBarnesHutTree(
  nodes: BarnesHutNode[],
  theta: number = 0.5
): BarnesHutQuadtree {
  if (nodes.length === 0) {
    // Return empty tree with default boundary
    return new BarnesHutQuadtree(
      { x: -1000, y: -1000, width: 2000, height: 2000 },
      theta
    );
  }

  // Calculate bounding box
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x);
    maxY = Math.max(maxY, node.y);
  }

  // Add padding to boundary
  const padding = 100;
  const boundary: Rectangle = {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + 2 * padding,
    height: maxY - minY + 2 * padding,
  };

  // Build tree
  const tree = new BarnesHutQuadtree(boundary, theta);
  for (const node of nodes) {
    tree.insert(node);
  }

  return tree;
}

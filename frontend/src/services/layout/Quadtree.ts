/**
 * Quadtree spatial partitioning data structure
 * Used for efficient O(n log n) collision detection in force-directed layouts
 * 
 * References: Design Document - Layout Engine Foundation
 */

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QuadtreeNode<T> {
  point: Point;
  data: T;
}

/**
 * Quadtree implementation for spatial partitioning
 * Divides 2D space into quadrants for efficient nearest-neighbor queries
 */
export class Quadtree<T> {
  private boundary: Rectangle;
  private capacity: number;
  private nodes: QuadtreeNode<T>[];
  private divided: boolean;
  private northeast?: Quadtree<T>;
  private northwest?: Quadtree<T>;
  private southeast?: Quadtree<T>;
  private southwest?: Quadtree<T>;

  constructor(boundary: Rectangle, capacity: number = 4) {
    this.boundary = boundary;
    this.capacity = capacity;
    this.nodes = [];
    this.divided = false;
  }

  /**
   * Insert a point with associated data into the quadtree
   */
  insert(point: Point, data: T): boolean {
    // Ignore points outside boundary
    if (!this.contains(point)) {
      return false;
    }

    // If there's space and not divided, add to this node
    if (this.nodes.length < this.capacity && !this.divided) {
      this.nodes.push({ point, data });
      return true;
    }

    // If we're at capacity but not divided, try to subdivide
    if (!this.divided) {
      // Check if all points are at the same location (or very close)
      // If so, don't subdivide - just allow this node to exceed capacity
      if (this.nodes.length > 0) {
        const firstPoint = this.nodes[0].point;
        const allSame = this.nodes.every(
          n => Math.abs(n.point.x - firstPoint.x) < 0.001 && 
               Math.abs(n.point.y - firstPoint.y) < 0.001
        );
        
        if (allSame && Math.abs(point.x - firstPoint.x) < 0.001 && 
            Math.abs(point.y - firstPoint.y) < 0.001) {
          // All points at same location, just add to this node
          this.nodes.push({ point, data });
          return true;
        }
      }
      
      this.subdivide();
    }

    // Try to insert into one of the children
    if (this.northeast!.insert(point, data)) return true;
    if (this.northwest!.insert(point, data)) return true;
    if (this.southeast!.insert(point, data)) return true;
    if (this.southwest!.insert(point, data)) return true;

    // If insertion failed in all children (edge case at boundaries), keep in this node
    this.nodes.push({ point, data });
    return true;
  }

  /**
   * Query all points within a given range
   */
  query(range: Rectangle, found: QuadtreeNode<T>[] = []): QuadtreeNode<T>[] {
    // If range doesn't intersect boundary, return empty
    if (!this.intersects(range)) {
      return found;
    }

    // Check points in this node
    for (const node of this.nodes) {
      if (this.pointInRectangle(node.point, range)) {
        found.push(node);
      }
    }

    // If divided, query children
    if (this.divided) {
      this.northeast!.query(range, found);
      this.northwest!.query(range, found);
      this.southeast!.query(range, found);
      this.southwest!.query(range, found);
    }

    return found;
  }

  /**
   * Find all points within a given radius of a center point
   */
  queryRadius(center: Point, radius: number, found: QuadtreeNode<T>[] = []): QuadtreeNode<T>[] {
    // Create bounding box for the circle
    const range: Rectangle = {
      x: center.x - radius,
      y: center.y - radius,
      width: radius * 2,
      height: radius * 2,
    };

    // Query the bounding box
    const candidates = this.query(range);

    // Filter to only points actually within the radius
    for (const node of candidates) {
      const dx = node.point.x - center.x;
      const dy = node.point.y - center.y;
      const distanceSquared = dx * dx + dy * dy;
      if (distanceSquared <= radius * radius) {
        found.push(node);
      }
    }

    return found;
  }

  /**
   * Subdivide this quadtree node into four children
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

    this.northeast = new Quadtree<T>(ne, this.capacity);
    this.northwest = new Quadtree<T>(nw, this.capacity);
    this.southeast = new Quadtree<T>(se, this.capacity);
    this.southwest = new Quadtree<T>(sw, this.capacity);

    this.divided = true;

    // Re-insert existing points into children
    // Keep a copy of nodes before clearing
    const nodesToReinsert = [...this.nodes];
    this.nodes = [];

    for (const node of nodesToReinsert) {
      // Try to insert into children, but if all fail (e.g., points at exact boundary),
      // keep in this node
      const inserted = 
        this.northeast.insert(node.point, node.data) ||
        this.northwest.insert(node.point, node.data) ||
        this.southeast.insert(node.point, node.data) ||
        this.southwest.insert(node.point, node.data);
      
      if (!inserted) {
        // Point couldn't be inserted into any child (edge case), keep it here
        this.nodes.push(node);
      }
    }
  }

  /**
   * Check if a point is within this quadtree's boundary
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
   * Check if a rectangle intersects this quadtree's boundary
   */
  private intersects(range: Rectangle): boolean {
    return !(
      range.x > this.boundary.x + this.boundary.width ||
      range.x + range.width < this.boundary.x ||
      range.y > this.boundary.y + this.boundary.height ||
      range.y + range.height < this.boundary.y
    );
  }

  /**
   * Check if a point is within a rectangle
   */
  private pointInRectangle(point: Point, rect: Rectangle): boolean {
    return (
      point.x >= rect.x &&
      point.x <= rect.x + rect.width &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.height
    );
  }

  /**
   * Get all nodes in the quadtree (for debugging/testing)
   */
  getAllNodes(): QuadtreeNode<T>[] {
    const all: QuadtreeNode<T>[] = [...this.nodes];

    if (this.divided) {
      all.push(...this.northeast!.getAllNodes());
      all.push(...this.northwest!.getAllNodes());
      all.push(...this.southeast!.getAllNodes());
      all.push(...this.southwest!.getAllNodes());
    }

    return all;
  }

  /**
   * Clear all nodes from the quadtree
   */
  clear(): void {
    this.nodes = [];
    this.divided = false;
    this.northeast = undefined;
    this.northwest = undefined;
    this.southeast = undefined;
    this.southwest = undefined;
  }
}

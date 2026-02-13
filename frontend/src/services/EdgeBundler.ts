/**
 * EdgeBundler Service
 * Groups similar edges together to reduce visual clutter in dense graphs
 * 
 * References: Requirement 10 (Edge Bundling)
 */

import type { Edge, Node } from '@xyflow/react';

/**
 * Represents a bundle of similar edges
 */
export interface EdgeBundle {
  /** Edges in this bundle */
  edges: Edge[];
  /** SVG path string for the bundle */
  path: string;
  /** Width of the bundle (based on number of edges) */
  width: number;
  /** Control points for the bundle path */
  controlPoints: Array<{ x: number; y: number }>;
}

/**
 * EdgeBundler class
 * Detects similar edges and groups them into bundles
 */
export class EdgeBundler {
  /**
   * Similarity threshold in radians (15 degrees = π/12 radians)
   * Edges with angular difference less than this are considered similar
   */
  private readonly SIMILARITY_THRESHOLD = Math.PI / 12; // 15 degrees

  /**
   * Maximum deviation in pixels for bundle path
   */
  private readonly MAX_DEVIATION = 20;

  /**
   * Minimum number of edges to form a bundle
   */
  private readonly MIN_BUNDLE_SIZE = 2;

  /**
   * Maximum bundle width in pixels
   */
  private readonly MAX_BUNDLE_WIDTH = 10;

  /**
   * Bundle edges based on path similarity
   * 
   * @param edges - All edges in the graph
   * @param nodes - All nodes in the graph (for position lookup)
   * @returns Array of edge bundles
   */
  bundleEdges(edges: Edge[], nodes: Map<string, Node>): EdgeBundle[] {
    const bundles: EdgeBundle[] = [];
    const processed = new Set<string>();

    for (const edge of edges) {
      if (processed.has(edge.id)) continue;

      // Find similar edges
      const similarEdges = edges.filter(
        (e) => !processed.has(e.id) && this.areSimilar(edge, e, nodes)
      );

      // Only create bundle if we have enough similar edges
      if (similarEdges.length >= this.MIN_BUNDLE_SIZE) {
        const bundle = this.createBundle(similarEdges, nodes);
        bundles.push(bundle);
        similarEdges.forEach((e) => processed.add(e.id));
      }
    }

    return bundles;
  }

  /**
   * Check if two edges are similar based on their path angles
   * 
   * @param edge1 - First edge
   * @param edge2 - Second edge
   * @param nodes - Node map for position lookup
   * @returns True if edges are similar
   */
  areSimilar(edge1: Edge, edge2: Edge, nodes: Map<string, Node>): boolean {
    const source1 = nodes.get(edge1.source);
    const target1 = nodes.get(edge1.target);
    const source2 = nodes.get(edge2.source);
    const target2 = nodes.get(edge2.target);

    // Can't compare if nodes don't exist
    if (!source1 || !target1 || !source2 || !target2) {
      return false;
    }

    // Calculate angles for both edges
    const angle1 = Math.atan2(
      target1.position.y - source1.position.y,
      target1.position.x - source1.position.x
    );

    const angle2 = Math.atan2(
      target2.position.y - source2.position.y,
      target2.position.x - source2.position.x
    );

    // Calculate angular difference
    let angleDiff = Math.abs(angle1 - angle2);

    // Normalize to [0, π] range
    if (angleDiff > Math.PI) {
      angleDiff = 2 * Math.PI - angleDiff;
    }

    // Check if within similarity threshold
    return angleDiff < this.SIMILARITY_THRESHOLD;
  }

  /**
   * Create a bundle from a group of similar edges
   * 
   * @param edges - Edges to bundle
   * @param nodes - Node map for position lookup
   * @returns Edge bundle with path and metadata
   */
  private createBundle(edges: Edge[], nodes: Map<string, Node>): EdgeBundle {
    // Calculate average path for the bundle
    const controlPoints = this.calculateBundlePath(edges, nodes);

    // Create SVG path string
    const path = this.createBundlePathString(controlPoints);

    // Calculate bundle width based on number of edges (max 10px)
    const width = Math.min(edges.length * 2, this.MAX_BUNDLE_WIDTH);

    return {
      edges,
      path,
      width,
      controlPoints,
    };
  }

  /**
   * Calculate the average path for a bundle of edges
   * Uses control points to create a smooth bundled path
   * 
   * @param edges - Edges in the bundle
   * @param nodes - Node map for position lookup
   * @returns Array of control points for the bundle path
   */
  private calculateBundlePath(
    edges: Edge[],
    nodes: Map<string, Node>
  ): Array<{ x: number; y: number }> {
    // Collect all source and target positions
    const sources: Array<{ x: number; y: number }> = [];
    const targets: Array<{ x: number; y: number }> = [];

    for (const edge of edges) {
      const source = nodes.get(edge.source);
      const target = nodes.get(edge.target);

      if (source && target) {
        sources.push({ x: source.position.x, y: source.position.y });
        targets.push({ x: target.position.x, y: target.position.y });
      }
    }

    if (sources.length === 0) {
      return [];
    }

    // Calculate average source and target positions
    const avgSource = {
      x: sources.reduce((sum, p) => sum + p.x, 0) / sources.length,
      y: sources.reduce((sum, p) => sum + p.y, 0) / sources.length,
    };

    const avgTarget = {
      x: targets.reduce((sum, p) => sum + p.x, 0) / targets.length,
      y: targets.reduce((sum, p) => sum + p.y, 0) / targets.length,
    };

    // Calculate midpoint
    const midpoint = {
      x: (avgSource.x + avgTarget.x) / 2,
      y: (avgSource.y + avgTarget.y) / 2,
    };

    // Calculate perpendicular offset for control point
    const dx = avgTarget.x - avgSource.x;
    const dy = avgTarget.y - avgSource.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) {
      return [avgSource, avgTarget];
    }

    // Perpendicular vector
    const perpX = -dy / length;
    const perpY = dx / length;

    // Control point with slight offset (20% of edge length, max 20px)
    const offset = Math.min(length * 0.2, this.MAX_DEVIATION);
    const controlPoint = {
      x: midpoint.x + perpX * offset,
      y: midpoint.y + perpY * offset,
    };

    return [avgSource, controlPoint, avgTarget];
  }

  /**
   * Create SVG path string from control points
   * 
   * @param controlPoints - Array of control points
   * @returns SVG path string
   */
  private createBundlePathString(
    controlPoints: Array<{ x: number; y: number }>
  ): string {
    if (controlPoints.length < 2) {
      return '';
    }

    if (controlPoints.length === 2) {
      // Straight line
      const [start, end] = controlPoints;
      return `M ${start.x},${start.y} L ${end.x},${end.y}`;
    }

    // Quadratic Bezier curve
    const [start, control, end] = controlPoints;
    return `M ${start.x},${start.y} Q ${control.x},${control.y} ${end.x},${end.y}`;
  }

  /**
   * Get all edges in a bundle that contains the given edge
   * 
   * @param edgeId - ID of the edge to find
   * @param bundles - Array of edge bundles
   * @returns Array of edge IDs in the same bundle, or empty array if not found
   */
  getEdgesInBundle(edgeId: string, bundles: EdgeBundle[]): string[] {
    const bundle = bundles.find((b) => b.edges.some((e) => e.id === edgeId));
    return bundle ? bundle.edges.map((e) => e.id) : [];
  }

  /**
   * Check if an edge is part of any bundle
   * 
   * @param edgeId - ID of the edge to check
   * @param bundles - Array of edge bundles
   * @returns True if edge is bundled
   */
  isEdgeBundled(edgeId: string, bundles: EdgeBundle[]): boolean {
    return bundles.some((b) => b.edges.some((e) => e.id === edgeId));
  }
}

/**
 * Singleton instance of EdgeBundler
 */
export const edgeBundler = new EdgeBundler();

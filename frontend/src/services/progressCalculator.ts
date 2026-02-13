/**
 * Progress Calculator Service
 * Calculates completion percentages for nodes with caching
 */

import { graphService, type GraphNode } from './graphService';

export interface ProgressData {
  percentage: number;
  completedCount: number;
  totalCount: number;
  timestamp: number;
}

export interface ProgressCalculator {
  /**
   * Calculate progress for a single node
   */
  calculateNodeProgress(
    nodeId: string,
    nodeType: string,
    properties: Record<string, unknown>
  ): number;

  /**
   * Calculate hierarchical progress for container nodes
   */
  calculateHierarchicalProgress(
    nodeId: string,
    childNodeIds: string[]
  ): Promise<number>;

  /**
   * Get cached progress or calculate if expired
   */
  getProgress(nodeId: string): Promise<number>;

  /**
   * Invalidate cache for node and ancestors
   */
  invalidateCache(nodeId: string): void;

  /**
   * Clear all cached progress data
   */
  clearCache(): void;
}

class ProgressCalculatorImpl implements ProgressCalculator {
  private cache: Map<string, ProgressData> = new Map();
  private readonly CACHE_TTL = 30000; // 30 seconds
  private parentMap: Map<string, Set<string>> = new Map(); // nodeId -> parent nodeIds

  calculateNodeProgress(
    _nodeId: string,
    nodeType: string,
    properties: Record<string, unknown>
  ): number {
    // Task nodes: check "done" attribute
    if (nodeType === 'task') {
      return properties.done === true ? 100 : 0;
    }

    // Other leaf nodes: no progress
    return 0;
  }

  async calculateHierarchicalProgress(
    nodeId: string,
    childNodeIds: string[]
  ): Promise<number> {
    if (childNodeIds.length === 0) {
      return 0;
    }

    // Fetch child nodes from graph
    const childNodes = await this.fetchChildNodes(childNodeIds);

    // Update parent map for each child
    for (const child of childNodes) {
      if (!this.parentMap.has(child.id)) {
        this.parentMap.set(child.id, new Set());
      }
      this.parentMap.get(child.id)!.add(nodeId);
    }

    let totalProgress = 0;
    let count = 0;

    for (const child of childNodes) {
      // Recursively calculate progress for children
      const childProgress = await this.getProgress(child.id);
      totalProgress += childProgress;
      count++;
    }

    return count > 0 ? totalProgress / count : 0;
  }

  async getProgress(nodeId: string): Promise<number> {
    // Check cache
    const cached = this.cache.get(nodeId);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.percentage;
    }

    // Calculate fresh progress
    const node = await this.fetchNode(nodeId);
    let progress: number;

    // Check if node has children
    const children = this.getChildNodeIds(node);

    if (children.length > 0) {
      // Container node: hierarchical calculation
      progress = await this.calculateHierarchicalProgress(nodeId, children);
    } else {
      // Leaf node: direct calculation
      progress = this.calculateNodeProgress(nodeId, node.type, node.properties);
    }

    // Update cache
    this.cache.set(nodeId, {
      percentage: progress,
      completedCount: 0, // TODO: track actual counts
      totalCount: 0,
      timestamp: Date.now(),
    });

    return progress;
  }

  invalidateCache(nodeId: string): void {
    this.cache.delete(nodeId);

    // Invalidate ancestors
    const parents = this.parentMap.get(nodeId);
    if (parents) {
      parents.forEach((parentId) => {
        this.invalidateCache(parentId);
      });
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async fetchNode(nodeId: string): Promise<GraphNode> {
    // Fetch from graph service
    // For now, we'll use the visualization endpoint with the node as center
    const graphData = await graphService.getVisualization({
      center_node_id: nodeId,
      depth: 0,
      limit: 1,
    });

    const node = graphData.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    return node;
  }

  private async fetchChildNodes(childIds: string[]): Promise<GraphNode[]> {
    // Batch fetch child nodes
    // For now, we'll fetch them individually
    // TODO: Implement batch fetch endpoint in backend
    const nodes: GraphNode[] = [];

    for (const childId of childIds) {
      try {
        const node = await this.fetchNode(childId);
        nodes.push(node);
      } catch (error) {
        console.error(`Failed to fetch child node ${childId}:`, error);
      }
    }

    return nodes;
  }

  private getChildNodeIds(node: GraphNode): string[] {
    // Extract child node IDs from properties
    // This depends on how children are stored in the graph
    const children = node.properties.children;

    if (Array.isArray(children)) {
      return children.filter((id): id is string => typeof id === 'string');
    }

    return [];
  }
}

// Export singleton instance
export const progressCalculator = new ProgressCalculatorImpl();

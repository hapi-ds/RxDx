/**
 * Hierarchical Layout Algorithm
 * 
 * Implements the Sugiyama framework for hierarchical graph layout:
 * 1. Layer assignment - Assign nodes to layers based on depth
 * 2. Crossing minimization - Reduce edge crossings using barycenter heuristic
 * 3. Coordinate assignment - Position nodes within layers
 * 
 * Supports multiple root nodes (forest structures) and configurable directions.
 */

export interface HierarchicalNode {
  id: string;
  width: number;
  height: number;
}

export interface HierarchicalEdge {
  source: string;
  target: string;
}

export interface HierarchicalLayoutConfig {
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  levelSeparation: number;
  nodeSeparation: number;
  treeSpacing: number;
}

export interface NodePosition {
  x: number;
  y: number;
}

export interface LayerAssignment {
  nodeId: string;
  layer: number;
}

/**
 * Hierarchical layout engine using Sugiyama framework
 */
export class HierarchicalLayout {
  private config: HierarchicalLayoutConfig;

  constructor(config: Partial<HierarchicalLayoutConfig> = {}) {
    this.config = {
      direction: config.direction || 'TB',
      levelSeparation: config.levelSeparation || 100,
      nodeSeparation: config.nodeSeparation || 50,
      treeSpacing: config.treeSpacing || 100,
    };
  }

  /**
   * Calculate positions for all nodes using hierarchical layout
   */
  calculateLayout(
    nodes: HierarchicalNode[],
    edges: HierarchicalEdge[]
  ): Map<string, NodePosition> {
    if (nodes.length === 0) {
      return new Map();
    }

    // Step 1: Layer assignment (Sugiyama framework)
    const layers = this.assignLayers(nodes, edges);

    // Step 2: Crossing minimization (barycenter heuristic)
    const orderedLayers = this.minimizeCrossings(layers, edges);

    // Step 3: Coordinate assignment
    const positions = this.assignCoordinates(orderedLayers, nodes);

    return positions;
  }

  /**
   * Step 1: Assign nodes to layers based on graph structure
   * Uses longest path layering for DAGs
   * Supports multiple root nodes (forest structures)
   */
  assignLayers(
    nodes: HierarchicalNode[],
    edges: HierarchicalEdge[]
  ): Map<number, string[]> {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const layers = new Map<number, string[]>();
    const nodeLayer = new Map<string, number>();

    // Build adjacency lists
    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();

    for (const node of nodes) {
      outgoing.set(node.id, []);
      incoming.set(node.id, []);
    }

    for (const edge of edges) {
      if (nodeMap.has(edge.source) && nodeMap.has(edge.target)) {
        outgoing.get(edge.source)!.push(edge.target);
        incoming.get(edge.target)!.push(edge.source);
      }
    }

    // Find root nodes (nodes with no incoming edges)
    const roots: string[] = [];
    for (const node of nodes) {
      if (incoming.get(node.id)!.length === 0) {
        roots.push(node.id);
      }
    }

    // If no roots found (cyclic graph), use nodes with minimum incoming edges
    if (roots.length === 0) {
      let minIncoming = Infinity;
      for (const node of nodes) {
        const inCount = incoming.get(node.id)!.length;
        if (inCount < minIncoming) {
          minIncoming = inCount;
        }
      }
      for (const node of nodes) {
        if (incoming.get(node.id)!.length === minIncoming) {
          roots.push(node.id);
        }
      }
    }

    // Assign layers using longest path from roots (BFS with depth tracking)
    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; layer: number }> = [];

    // Initialize roots at layer 0
    for (const rootId of roots) {
      queue.push({ nodeId: rootId, layer: 0 });
      nodeLayer.set(rootId, 0);
    }

    while (queue.length > 0) {
      const { nodeId, layer } = queue.shift()!;

      if (visited.has(nodeId)) {
        continue;
      }
      visited.add(nodeId);

      // Add to layer
      if (!layers.has(layer)) {
        layers.set(layer, []);
      }
      layers.get(layer)!.push(nodeId);

      // Process children
      const children = outgoing.get(nodeId) || [];
      for (const childId of children) {
        const currentLayer = nodeLayer.get(childId);
        const newLayer = layer + 1;

        // Use longest path: assign to deeper layer if already assigned
        if (currentLayer === undefined || newLayer > currentLayer) {
          nodeLayer.set(childId, newLayer);
          queue.push({ nodeId: childId, layer: newLayer });
        }
      }
    }

    // Handle disconnected nodes (assign to layer 0)
    for (const node of nodes) {
      if (!nodeLayer.has(node.id)) {
        nodeLayer.set(node.id, 0);
        if (!layers.has(0)) {
          layers.set(0, []);
        }
        layers.get(0)!.push(node.id);
      }
    }

    return layers;
  }

  /**
   * Step 2: Minimize edge crossings using barycenter heuristic
   * Iteratively reorder nodes within layers to reduce crossings
   */
  minimizeCrossings(
    layers: Map<number, string[]>,
    edges: HierarchicalEdge[]
  ): Map<number, string[]> {
    const orderedLayers = new Map<number, string[]>();

    // Copy initial layer assignments
    for (const [layer, nodeIds] of layers.entries()) {
      orderedLayers.set(layer, [...nodeIds]);
    }

    // Build adjacency information
    const outgoing = new Map<string, string[]>();
    const incoming = new Map<string, string[]>();

    for (const [, nodeIds] of layers.entries()) {
      for (const nodeId of nodeIds) {
        outgoing.set(nodeId, []);
        incoming.set(nodeId, []);
      }
    }

    for (const edge of edges) {
      if (outgoing.has(edge.source) && incoming.has(edge.target)) {
        outgoing.get(edge.source)!.push(edge.target);
        incoming.get(edge.target)!.push(edge.source);
      }
    }

    // Iterative improvement (multiple passes)
    const maxIterations = 10;
    const layerNumbers = Array.from(orderedLayers.keys()).sort((a, b) => a - b);

    for (let iter = 0; iter < maxIterations; iter++) {
      let improved = false;

      // Forward pass: order layers based on previous layer
      for (let i = 1; i < layerNumbers.length; i++) {
        const layerNum = layerNumbers[i];
        const prevLayerNum = layerNumbers[i - 1];
        const prevLayer = orderedLayers.get(prevLayerNum)!;
        const currentLayer = orderedLayers.get(layerNum)!;

        // Calculate barycenter for each node in current layer
        const barycenters = new Map<string, number>();

        for (const nodeId of currentLayer) {
          const parents = incoming.get(nodeId) || [];
          if (parents.length === 0) {
            barycenters.set(nodeId, 0);
            continue;
          }

          // Barycenter = average position of parent nodes
          let sum = 0;
          let count = 0;
          for (const parentId of parents) {
            const parentPos = prevLayer.indexOf(parentId);
            if (parentPos >= 0) {
              sum += parentPos;
              count++;
            }
          }

          barycenters.set(nodeId, count > 0 ? sum / count : 0);
        }

        // Sort nodes by barycenter
        const sorted = [...currentLayer].sort((a, b) => {
          const bcA = barycenters.get(a) || 0;
          const bcB = barycenters.get(b) || 0;
          return bcA - bcB;
        });

        // Check if order changed
        if (sorted.some((id, idx) => id !== currentLayer[idx])) {
          improved = true;
          orderedLayers.set(layerNum, sorted);
        }
      }

      // Backward pass: order layers based on next layer
      for (let i = layerNumbers.length - 2; i >= 0; i--) {
        const layerNum = layerNumbers[i];
        const nextLayerNum = layerNumbers[i + 1];
        const nextLayer = orderedLayers.get(nextLayerNum)!;
        const currentLayer = orderedLayers.get(layerNum)!;

        // Calculate barycenter for each node in current layer
        const barycenters = new Map<string, number>();

        for (const nodeId of currentLayer) {
          const children = outgoing.get(nodeId) || [];
          if (children.length === 0) {
            barycenters.set(nodeId, 0);
            continue;
          }

          // Barycenter = average position of child nodes
          let sum = 0;
          let count = 0;
          for (const childId of children) {
            const childPos = nextLayer.indexOf(childId);
            if (childPos >= 0) {
              sum += childPos;
              count++;
            }
          }

          barycenters.set(nodeId, count > 0 ? sum / count : 0);
        }

        // Sort nodes by barycenter
        const sorted = [...currentLayer].sort((a, b) => {
          const bcA = barycenters.get(a) || 0;
          const bcB = barycenters.get(b) || 0;
          return bcA - bcB;
        });

        // Check if order changed
        if (sorted.some((id, idx) => id !== currentLayer[idx])) {
          improved = true;
          orderedLayers.set(layerNum, sorted);
        }
      }

      // Stop if no improvement
      if (!improved) {
        break;
      }
    }

    return orderedLayers;
  }

  /**
   * Step 3: Assign coordinates to nodes based on layer and order
   * Supports configurable direction (TB/BT/LR/RL)
   */
  assignCoordinates(
    layers: Map<number, string[]>,
    nodes: HierarchicalNode[]
  ): Map<string, NodePosition> {
    const positions = new Map<string, NodePosition>();
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const layerNumbers = Array.from(layers.keys()).sort((a, b) => a - b);

    for (const layerNum of layerNumbers) {
      const nodeIds = layers.get(layerNum)!;
      const layerNodes = nodeIds.map(id => nodeMap.get(id)!).filter(n => n);

      // Calculate total width/height of layer
      let totalSize = 0;
      for (let i = 0; i < layerNodes.length; i++) {
        const node = layerNodes[i];
        const size = this.isHorizontal() ? node.height : node.width;
        totalSize += size;
        if (i < layerNodes.length - 1) {
          totalSize += this.config.nodeSeparation;
        }
      }

      // Position nodes in layer
      let offset = -totalSize / 2;

      for (const nodeId of nodeIds) {
        const node = nodeMap.get(nodeId);
        if (!node) continue;

        const size = this.isHorizontal() ? node.height : node.width;
        const center = offset + size / 2;

        // Calculate position based on direction
        const layerPosition = layerNum * this.config.levelSeparation;

        let x: number, y: number;

        switch (this.config.direction) {
          case 'TB': // Top to Bottom
            x = center;
            y = layerPosition;
            break;
          case 'BT': // Bottom to Top
            x = center;
            y = -layerPosition;
            break;
          case 'LR': // Left to Right
            x = layerPosition;
            y = center;
            break;
          case 'RL': // Right to Left
            x = -layerPosition;
            y = center;
            break;
        }

        positions.set(nodeId, { x, y });
        offset += size + this.config.nodeSeparation;
      }
    }

    return positions;
  }

  /**
   * Check if layout direction is horizontal (LR or RL)
   */
  private isHorizontal(): boolean {
    return this.config.direction === 'LR' || this.config.direction === 'RL';
  }

  /**
   * Get layer assignments for nodes
   */
  getLayerAssignments(
    nodes: HierarchicalNode[],
    edges: HierarchicalEdge[]
  ): LayerAssignment[] {
    const layers = this.assignLayers(nodes, edges);
    const assignments: LayerAssignment[] = [];

    for (const [layer, nodeIds] of layers.entries()) {
      for (const nodeId of nodeIds) {
        assignments.push({ nodeId, layer });
      }
    }

    return assignments;
  }
}

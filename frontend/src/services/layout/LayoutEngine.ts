/**
 * Layout Engine
 * Manages layout algorithms and transitions between them
 */

import { ForceSimulation, type ForceSimulationNode, type ForceSimulationConfig } from './ForceSimulation';
import { HierarchicalLayout, type HierarchicalNode, type HierarchicalLayoutConfig } from './HierarchicalLayout';
import { CircularLayout, type CircularNode, type CircularLayoutConfig } from './CircularLayout';
import { GridLayout, type GridNode, type GridLayoutConfig } from './GridLayout';
import { LayoutAnimator, type AnimatedNode } from './LayoutAnimator';

export type LayoutAlgorithm = 'force' | 'hierarchical' | 'circular' | 'grid';

export interface LayoutNode {
  id: string;
  x: number;
  y: number;
  [key: string]: unknown;
}

export interface LayoutEdge {
  source: string;
  target: string;
  [key: string]: unknown;
}

export interface LayoutConfig {
  algorithm: LayoutAlgorithm;
  distance?: number; // User-controlled distance parameter (50-500)
  force?: ForceSimulationConfig;
  hierarchical?: HierarchicalLayoutConfig;
  circular?: CircularLayoutConfig;
  grid?: GridLayoutConfig;
}

export interface LayoutEngineConfig {
  animationDuration?: number; // Default 500ms
  preserveSelection?: boolean; // Default true
}

/**
 * Default configuration for force-directed layout
 */
const DEFAULT_FORCE_CONFIG: ForceSimulationConfig = {
  repulsionStrength: 1000,
  attractionStrength: 0.1,
  idealEdgeLength: 100,
  centerGravity: 0.05,
  damping: 0.9,
  minSpacing: 20,
  useBarnesHut: true,
  barnesHutTheta: 0.9,
  collisionStrength: 0.7,
};

/**
 * Default configuration for hierarchical layout
 */
const DEFAULT_HIERARCHICAL_CONFIG: HierarchicalLayoutConfig = {
  direction: 'TB',
  levelSeparation: 100,
  nodeSeparation: 50,
  treeSpacing: 100,
};

/**
 * Default configuration for circular layout
 */
const DEFAULT_CIRCULAR_CONFIG: CircularLayoutConfig = {
  radius: 200,
  startAngle: 0,
  endAngle: 2 * Math.PI,
};

/**
 * Default configuration for grid layout
 */
const DEFAULT_GRID_CONFIG: GridLayoutConfig = {
  rowSpacing: 100,
  columnSpacing: 100,
};

/**
 * Apply distance parameter to layout configuration
 * Maps the distance value (50-500) to algorithm-specific parameters
 */
function applyDistanceToConfig(
  distance: number,
  algorithm: LayoutAlgorithm,
  baseConfig: LayoutConfig
): LayoutConfig {
  const config = { ...baseConfig };

  switch (algorithm) {
    case 'force':
      config.force = {
        ...(config.force || {}),
        idealEdgeLength: distance,
        minSpacing: distance * 0.2,
        repulsionStrength: distance * 10,
      } as ForceSimulationConfig;
      break;

    case 'hierarchical':
      config.hierarchical = {
        ...(config.hierarchical || {}),
        levelSeparation: distance,
        nodeSeparation: distance * 0.5,
      } as HierarchicalLayoutConfig;
      break;

    case 'circular':
      config.circular = {
        ...(config.circular || {}),
        radius: distance * 2,
      } as CircularLayoutConfig;
      break;

    case 'grid':
      config.grid = {
        ...(config.grid || {}),
        rowSpacing: distance,
        columnSpacing: distance,
      } as GridLayoutConfig;
      break;
  }

  return config;
}

/**
 * LayoutEngine provides a unified interface for all layout algorithms
 * with smooth transitions between layouts
 */
export class LayoutEngine {
  private currentAlgorithm: LayoutAlgorithm = 'force';
  private animator: LayoutAnimator;
  private forceSimulation: ForceSimulation | null = null;
  private selectedNodeIds: Set<string> = new Set();
  private config: Required<LayoutEngineConfig>;

  constructor(config?: LayoutEngineConfig) {
    this.config = {
      animationDuration: 500,
      preserveSelection: true,
      ...config,
    };

    this.animator = new LayoutAnimator({
      duration: this.config.animationDuration,
    });
  }

  /**
   * Calculate layout positions using the specified algorithm
   */
  public calculateLayout(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    layoutConfig: LayoutConfig
  ): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    // Apply distance parameter if provided
    const config = layoutConfig.distance
      ? applyDistanceToConfig(layoutConfig.distance, layoutConfig.algorithm, layoutConfig)
      : layoutConfig;

    switch (config.algorithm) {
      case 'force':
        positions.clear();
        this.calculateForceLayout(
          nodes,
          edges,
          { ...DEFAULT_FORCE_CONFIG, ...config.force },
          positions
        );
        break;

      case 'hierarchical':
        this.calculateHierarchicalLayout(
          nodes,
          edges,
          { ...DEFAULT_HIERARCHICAL_CONFIG, ...config.hierarchical },
          positions
        );
        break;

      case 'circular':
        this.calculateCircularLayout(
          nodes,
          edges,
          { ...DEFAULT_CIRCULAR_CONFIG, ...config.circular },
          positions
        );
        break;

      case 'grid':
        this.calculateGridLayout(
          nodes,
          { ...DEFAULT_GRID_CONFIG, ...config.grid },
          positions
        );
        break;

      default:
        throw new Error(`Unknown layout algorithm: ${config.algorithm}`);
    }

    return positions;
  }

  /**
   * Transition from current layout to a new layout with animation
   */
  public async transitionToLayout(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    fromPositions: Map<string, { x: number; y: number }>,
    layoutConfig: LayoutConfig,
    onUpdate: (positions: Map<string, { x: number; y: number }>) => void
  ): Promise<void> {
    // Calculate target positions
    const toPositions = this.calculateLayout(nodes, edges, layoutConfig);

    // Create animated nodes from current positions
    const fromNodes: AnimatedNode[] = [];
    fromPositions.forEach((pos, id) => {
      fromNodes.push({ id, x: pos.x, y: pos.y });
    });

    // Create animated nodes for target positions
    const toNodes: AnimatedNode[] = [];
    toPositions.forEach((pos, id) => {
      toNodes.push({ id, x: pos.x, y: pos.y });
    });

    // Update current algorithm
    this.currentAlgorithm = layoutConfig.algorithm;

    // Return a promise that resolves when animation completes
    return new Promise((resolve) => {
      this.animator.animate(
        fromNodes,
        toNodes,
        onUpdate,
        () => {
          resolve();
        }
      );
    });
  }

  /**
   * Calculate force-directed layout
   */
  private calculateForceLayout(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    config: ForceSimulationConfig,
    positions: Map<string, { x: number; y: number }>
  ): void {
    // Convert to force simulation nodes
    const simNodes: ForceSimulationNode[] = nodes.map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      vx: 0,
      vy: 0,
    }));

    // Create or update force simulation
    if (!this.forceSimulation) {
      this.forceSimulation = new ForceSimulation(config);
      this.forceSimulation.setNodes(simNodes);
      this.forceSimulation.setEdges(edges);
    } else {
      this.forceSimulation.setNodes(simNodes);
      this.forceSimulation.setEdges(edges);
    }

    // Run simulation to stable state
    for (let i = 0; i < 300; i++) {
      this.forceSimulation.tick();
      if (this.forceSimulation.getAlpha() < 0.001) {
        break;
      }
    }

    // Extract positions
    const resultNodes = this.forceSimulation.getNodes();
    resultNodes.forEach((node) => {
      positions.set(node.id, { x: node.x, y: node.y });
    });
  }

  /**
   * Calculate hierarchical layout
   */
  private calculateHierarchicalLayout(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    config: HierarchicalLayoutConfig,
    positions: Map<string, { x: number; y: number }>
  ): void {
    const hierarchicalNodes: HierarchicalNode[] = nodes.map((node) => ({
      id: node.id,
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    }));

    const layout = new HierarchicalLayout(config);
    const result = layout.calculateLayout(hierarchicalNodes, edges);

    result.forEach((pos, id) => {
      positions.set(id, pos);
    });
  }

  /**
   * Calculate circular layout
   */
  private calculateCircularLayout(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    config: CircularLayoutConfig,
    positions: Map<string, { x: number; y: number }>
  ): void {
    const circularNodes: CircularNode[] = nodes.map((node) => ({
      id: node.id,
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    }));

    const layout = new CircularLayout(config);
    const result = layout.calculateLayout(circularNodes, edges);

    result.forEach((pos, id) => {
      positions.set(id, pos);
    });
  }

  /**
   * Calculate grid layout
   */
  private calculateGridLayout(
    nodes: LayoutNode[],
    config: GridLayoutConfig,
    positions: Map<string, { x: number; y: number }>
  ): void {
    const gridNodes: GridNode[] = nodes.map((node) => ({
      id: node.id,
      width: 50,
      height: 50,
    }));

    const layout = new GridLayout(config);
    const result = layout.calculateLayout(gridNodes);

    result.forEach((pos, id) => {
      positions.set(id, pos);
    });
  }

  /**
   * Set selected node IDs (for preservation during transitions)
   */
  public setSelectedNodes(nodeIds: string[]): void {
    this.selectedNodeIds = new Set(nodeIds);
  }

  /**
   * Get selected node IDs
   */
  public getSelectedNodes(): string[] {
    return Array.from(this.selectedNodeIds);
  }

  /**
   * Check if animation is currently running
   */
  public isAnimating(): boolean {
    return this.animator.isAnimating();
  }

  /**
   * Stop current animation
   */
  public stopAnimation(): void {
    this.animator.stop();
  }

  /**
   * Get current layout algorithm
   */
  public getCurrentAlgorithm(): LayoutAlgorithm {
    return this.currentAlgorithm;
  }

  /**
   * Update animation duration
   */
  public setAnimationDuration(duration: number): void {
    this.config.animationDuration = duration;
    this.animator.setConfig({ duration });
  }

  /**
   * Get animation duration
   */
  public getAnimationDuration(): number {
    return this.config.animationDuration;
  }
}

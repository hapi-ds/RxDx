/**
 * Force-directed layout simulation with Barnes-Hut optimization
 * Automatically activates Barnes-Hut for graphs with >50 nodes
 * 
 * References: Design Document - Layout Engine Foundation
 * Requirements: 1.4, 1.5, 21.1, 21.2, 21.3
 */

import { buildBarnesHutTree, type BarnesHutNode } from './BarnesHutQuadtree';
import { CollisionResolver } from './CollisionResolver';
import { type NodeBounds } from './CollisionDetector';

export interface ForceSimulationNode {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number; // Fixed x position (if pinned)
  fy?: number; // Fixed y position (if pinned)
  mass?: number;
}

export interface ForceSimulationConfig {
  repulsionStrength: number;
  attractionStrength: number;
  idealEdgeLength: number;
  centerGravity: number;
  damping: number;
  useBarnesHut: boolean;
  barnesHutTheta: number;
  minSpacing: number;
  collisionStrength: number;
}

export interface Edge {
  source: string;
  target: string;
  weight?: number;
}

const DEFAULT_CONFIG: ForceSimulationConfig = {
  repulsionStrength: 100,
  attractionStrength: 0.1,
  idealEdgeLength: 100,
  centerGravity: 0.01,
  damping: 0.6,
  useBarnesHut: true, // Auto-determined based on node count
  barnesHutTheta: 0.5,
  minSpacing: 20,
  collisionStrength: 0.7,
};

const BARNES_HUT_THRESHOLD = 50;

/**
 * Force-directed layout simulation
 * Uses Barnes-Hut optimization for graphs with >50 nodes
 */
export class ForceSimulation {
  private nodes: Map<string, ForceSimulationNode>;
  private edges: Edge[];
  private config: ForceSimulationConfig;
  private alpha: number; // Simulation temperature
  private alphaMin: number;
  private alphaDecay: number;
  private adaptiveCooling: boolean;
  private movementThreshold: number;
  private collisionResolver: CollisionResolver;
  private isRunning: boolean;
  private useBarnesHut: boolean;

  constructor(config: Partial<ForceSimulationConfig> = {}) {
    this.nodes = new Map();
    this.edges = [];
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.alpha = 1.0;
    this.alphaMin = 0.001;
    this.alphaDecay = 0.005; // 0.5% reduction per frame
    this.adaptiveCooling = true;
    this.movementThreshold = 0.5; // Pixels per frame
    this.collisionResolver = new CollisionResolver(
      this.config.minSpacing,
      this.config.collisionStrength
    );
    this.isRunning = false;
    this.useBarnesHut = this.config.useBarnesHut;
  }

  /**
   * Set nodes for the simulation
   */
  setNodes(nodes: ForceSimulationNode[]): void {
    this.nodes.clear();
    for (const node of nodes) {
      this.nodes.set(node.id, {
        ...node,
        vx: node.vx ?? 0,
        vy: node.vy ?? 0,
        mass: node.mass ?? 1,
      });
    }

    // Auto-determine Barnes-Hut usage based on node count
    this.useBarnesHut = this.config.useBarnesHut && nodes.length > BARNES_HUT_THRESHOLD;
  }

  /**
   * Set edges for the simulation
   */
  setEdges(edges: Edge[]): void {
    this.edges = edges;
  }

  /**
   * Get current node positions
   */
  getNodes(): ForceSimulationNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get a specific node by ID
   */
  getNode(id: string): ForceSimulationNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Update a node's position (e.g., during drag)
   * Automatically reheats the simulation to allow layout adjustment
   */
  updateNode(id: string, updates: Partial<ForceSimulationNode>): void {
    const node = this.nodes.get(id);
    if (node) {
      const positionChanged = 
        (updates.x !== undefined && updates.x !== node.x) ||
        (updates.y !== undefined && updates.y !== node.y);
      
      Object.assign(node, updates);
      
      // Reheat simulation if position changed (node was dragged)
      if (positionChanged) {
        this.reheat(0.3);
      }
    }
  }

  /**
   * Handle node drag start
   * Pins the node and reheats the simulation
   */
  onDragStart(id: string, x: number, y: number): void {
    this.pinNode(id, x, y);
    this.reheat(0.3);
  }

  /**
   * Handle node drag
   * Updates pinned position and maintains heat
   */
  onDrag(id: string, x: number, y: number): void {
    const node = this.nodes.get(id);
    if (node) {
      node.fx = x;
      node.fy = y;
      node.x = x;
      node.y = y;
      // Keep simulation warm during drag
      if (this.alpha < 0.3) {
        this.reheat(0.1);
      }
    }
  }

  /**
   * Handle node drag end
   * Unpins the node and reheats to allow stabilization
   */
  onDragEnd(id: string): void {
    this.unpinNode(id);
    this.reheat(0.5); // Stronger reheat to allow neighbors to adjust
  }

  /**
   * Pin a node at a specific position
   */
  pinNode(id: string, x: number, y: number): void {
    const node = this.nodes.get(id);
    if (node) {
      node.fx = x;
      node.fy = y;
      node.x = x;
      node.y = y;
    }
  }

  /**
   * Unpin a node
   */
  unpinNode(id: string): void {
    const node = this.nodes.get(id);
    if (node) {
      node.fx = undefined;
      node.fy = undefined;
    }
  }

  /**
   * Perform one simulation step
   */
  tick(): boolean {
    if (this.alpha < this.alphaMin) {
      this.isRunning = false;
      return false;
    }

    const nodes = Array.from(this.nodes.values());

    // Store previous positions for movement calculation
    const previousPositions = new Map<string, { x: number; y: number }>();
    if (this.adaptiveCooling) {
      for (const node of nodes) {
        previousPositions.set(node.id, { x: node.x, y: node.y });
      }
    }

    // Apply forces
    if (this.useBarnesHut) {
      this.applyBarnesHutForces(nodes);
    } else {
      this.applyDirectForces(nodes);
    }

    this.applyAttractionForces(nodes);
    this.applyCenterGravity(nodes);
    this.applyCollisionForces(nodes);

    // Update positions
    this.updatePositions(nodes);

    // Adaptive cooling based on node movement
    if (this.adaptiveCooling) {
      const totalMovement = this.calculateTotalMovement(nodes, previousPositions);
      const avgMovement = totalMovement / nodes.length;
      
      // Adjust cooling rate based on movement
      if (avgMovement < this.movementThreshold) {
        // Nodes are stabilizing, cool faster
        this.alpha -= this.alphaDecay * 2;
      } else if (avgMovement > this.movementThreshold * 5) {
        // Nodes are moving a lot, cool slower
        this.alpha -= this.alphaDecay * 0.5;
      } else {
        // Normal cooling
        this.alpha -= this.alphaDecay;
      }
    } else {
      // Fixed cooling schedule
      this.alpha -= this.alphaDecay;
    }

    return true;
  }

  /**
   * Calculate total movement of all nodes
   */
  private calculateTotalMovement(
    nodes: ForceSimulationNode[],
    previousPositions: Map<string, { x: number; y: number }>
  ): number {
    let totalMovement = 0;

    for (const node of nodes) {
      const prev = previousPositions.get(node.id);
      if (prev) {
        const dx = node.x - prev.x;
        const dy = node.y - prev.y;
        totalMovement += Math.sqrt(dx * dx + dy * dy);
      }
    }

    return totalMovement;
  }

  /**
   * Apply repulsion forces using Barnes-Hut approximation
   */
  private applyBarnesHutForces(nodes: ForceSimulationNode[]): void {
    // Build Barnes-Hut tree
    const bhNodes: BarnesHutNode[] = nodes.map(n => ({
      id: n.id,
      x: n.x,
      y: n.y,
      mass: n.mass ?? 1,
      vx: n.vx,
      vy: n.vy,
    }));

    const tree = buildBarnesHutTree(bhNodes, this.config.barnesHutTheta);

    // Calculate forces for each node
    for (const node of nodes) {
      const bhNode: BarnesHutNode = {
        id: node.id,
        x: node.x,
        y: node.y,
        mass: node.mass ?? 1,
      };

      const force = tree.calculateForce(bhNode, this.config.repulsionStrength);
      node.vx = (node.vx ?? 0) + force.fx * this.alpha;
      node.vy = (node.vy ?? 0) + force.fy * this.alpha;
    }
  }

  /**
   * Apply repulsion forces using direct O(n²) calculation
   */
  private applyDirectForces(nodes: ForceSimulationNode[]): void {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distanceSquared = dx * dx + dy * dy;
        const distance = Math.sqrt(distanceSquared);

        if (distance < 0.01) continue;

        // Coulomb's law: F = k * m1 * m2 / r²
        const force =
          (this.config.repulsionStrength * (nodeA.mass ?? 1) * (nodeB.mass ?? 1)) /
          distanceSquared;

        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;

        nodeA.vx = (nodeA.vx ?? 0) - fx * this.alpha;
        nodeA.vy = (nodeA.vy ?? 0) - fy * this.alpha;
        nodeB.vx = (nodeB.vx ?? 0) + fx * this.alpha;
        nodeB.vy = (nodeB.vy ?? 0) + fy * this.alpha;
      }
    }
  }

  /**
   * Apply attraction forces along edges (Hooke's law)
   */
  private applyAttractionForces(_nodes: ForceSimulationNode[]): void {
    for (const edge of this.edges) {
      const source = this.nodes.get(edge.source);
      const target = this.nodes.get(edge.target);

      if (!source || !target) continue;

      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 0.01) continue;

      // Hooke's law: F = k * (distance - idealLength)
      const displacement = distance - this.config.idealEdgeLength;
      const force = this.config.attractionStrength * displacement;

      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;

      source.vx = (source.vx ?? 0) + fx * this.alpha;
      source.vy = (source.vy ?? 0) + fy * this.alpha;
      target.vx = (target.vx ?? 0) - fx * this.alpha;
      target.vy = (target.vy ?? 0) - fy * this.alpha;
    }
  }

  /**
   * Apply center gravity to prevent nodes from drifting away
   */
  private applyCenterGravity(nodes: ForceSimulationNode[]): void {
    for (const node of nodes) {
      const fx = -node.x * this.config.centerGravity;
      const fy = -node.y * this.config.centerGravity;

      node.vx = (node.vx ?? 0) + fx * this.alpha;
      node.vy = (node.vy ?? 0) + fy * this.alpha;
    }
  }

  /**
   * Apply collision resolution forces
   */
  private applyCollisionForces(nodes: ForceSimulationNode[]): void {
    // Convert to NodeBounds format
    const nodeBounds: NodeBounds[] = nodes.map(n => ({
      id: n.id,
      x: n.x,
      y: n.y,
      width: 64, // Default node size
      height: 64,
    }));

    // Calculate collision forces
    const forces = this.collisionResolver.calculateForces(nodeBounds);

    // Apply forces to velocities
    for (const [nodeId, force] of forces) {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.vx = (node.vx ?? 0) + force.fx * this.alpha;
        node.vy = (node.vy ?? 0) + force.fy * this.alpha;
      }
    }
  }

  /**
   * Update node positions based on velocities
   */
  private updatePositions(nodes: ForceSimulationNode[]): void {
    for (const node of nodes) {
      // Skip pinned nodes
      if (node.fx !== undefined && node.fy !== undefined) {
        node.x = node.fx;
        node.y = node.fy;
        node.vx = 0;
        node.vy = 0;
        continue;
      }

      // Apply damping
      node.vx = (node.vx ?? 0) * this.config.damping;
      node.vy = (node.vy ?? 0) * this.config.damping;

      // Update position
      node.x += node.vx ?? 0;
      node.y += node.vy ?? 0;
    }
  }

  /**
   * Start the simulation
   */
  start(): void {
    this.isRunning = true;
    this.alpha = 1.0;
  }

  /**
   * Stop the simulation
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * Restart the simulation with increased temperature
   */
  restart(): void {
    this.alpha = 1.0;
    this.isRunning = true;
  }

  /**
   * Increase temperature (e.g., on node drag)
   */
  reheat(amount: number = 0.3): void {
    this.alpha = Math.min(1.0, this.alpha + amount);
  }

  /**
   * Check if simulation is running
   */
  running(): boolean {
    return this.isRunning && this.alpha >= this.alphaMin;
  }

  /**
   * Get current alpha (temperature)
   */
  getAlpha(): number {
    return this.alpha;
  }

  /**
   * Set alpha (temperature)
   */
  setAlpha(alpha: number): void {
    this.alpha = Math.max(0, Math.min(1, alpha));
  }

  /**
   * Get alpha decay rate
   */
  getAlphaDecay(): number {
    return this.alphaDecay;
  }

  /**
   * Set alpha decay rate
   */
  setAlphaDecay(decay: number): void {
    this.alphaDecay = Math.max(0, Math.min(1, decay));
  }

  /**
   * Check if Barnes-Hut optimization is active
   */
  isBarnesHutActive(): boolean {
    return this.useBarnesHut;
  }

  /**
   * Get the Barnes-Hut activation threshold
   */
  static getBarnesHutThreshold(): number {
    return BARNES_HUT_THRESHOLD;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ForceSimulationConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update collision resolver if spacing or strength changed
    if (config.minSpacing !== undefined || config.collisionStrength !== undefined) {
      this.collisionResolver = new CollisionResolver(
        this.config.minSpacing,
        this.config.collisionStrength
      );
    }

    // Re-evaluate Barnes-Hut usage
    if (config.useBarnesHut !== undefined) {
      this.useBarnesHut = this.config.useBarnesHut && this.nodes.size > BARNES_HUT_THRESHOLD;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ForceSimulationConfig {
    return { ...this.config };
  }

  /**
   * Enable or disable adaptive cooling
   */
  setAdaptiveCooling(enabled: boolean): void {
    this.adaptiveCooling = enabled;
  }

  /**
   * Check if adaptive cooling is enabled
   */
  isAdaptiveCoolingEnabled(): boolean {
    return this.adaptiveCooling;
  }

  /**
   * Set movement threshold for adaptive cooling
   */
  setMovementThreshold(threshold: number): void {
    this.movementThreshold = Math.max(0, threshold);
  }

  /**
   * Get movement threshold for adaptive cooling
   */
  getMovementThreshold(): number {
    return this.movementThreshold;
  }
}

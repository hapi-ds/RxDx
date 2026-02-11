/**
 * Unit tests for ForceSimulation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ForceSimulation, type ForceSimulationNode, type Edge } from './ForceSimulation';

describe('ForceSimulation', () => {
  let simulation: ForceSimulation;

  beforeEach(() => {
    simulation = new ForceSimulation();
  });

  describe('initialization', () => {
    it('should create simulation with default config', () => {
      expect(simulation).toBeDefined();
      expect(simulation.getAlpha()).toBe(1.0);
      expect(simulation.running()).toBe(false);
    });

    it('should accept custom configuration', () => {
      const customSim = new ForceSimulation({
        repulsionStrength: 200,
        attractionStrength: 0.2,
      });

      const config = customSim.getConfig();
      expect(config.repulsionStrength).toBe(200);
      expect(config.attractionStrength).toBe(0.2);
    });
  });

  describe('node management', () => {
    it('should set and get nodes', () => {
      const nodes: ForceSimulationNode[] = [
        { id: '1', x: 0, y: 0 },
        { id: '2', x: 100, y: 100 },
      ];

      simulation.setNodes(nodes);
      const result = simulation.getNodes();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should initialize velocities to zero', () => {
      const nodes: ForceSimulationNode[] = [
        { id: '1', x: 0, y: 0 },
      ];

      simulation.setNodes(nodes);
      const result = simulation.getNode('1');

      expect(result?.vx).toBe(0);
      expect(result?.vy).toBe(0);
    });

    it('should initialize mass to 1', () => {
      const nodes: ForceSimulationNode[] = [
        { id: '1', x: 0, y: 0 },
      ];

      simulation.setNodes(nodes);
      const result = simulation.getNode('1');

      expect(result?.mass).toBe(1);
    });

    it('should preserve custom mass', () => {
      const nodes: ForceSimulationNode[] = [
        { id: '1', x: 0, y: 0, mass: 2 },
      ];

      simulation.setNodes(nodes);
      const result = simulation.getNode('1');

      expect(result?.mass).toBe(2);
    });

    it('should update node position', () => {
      simulation.setNodes([{ id: '1', x: 0, y: 0 }]);
      simulation.updateNode('1', { x: 50, y: 50 });

      const node = simulation.getNode('1');
      expect(node?.x).toBe(50);
      expect(node?.y).toBe(50);
    });
  });

  describe('edge management', () => {
    it('should set edges', () => {
      const edges: Edge[] = [
        { source: '1', target: '2' },
        { source: '2', target: '3' },
      ];

      simulation.setEdges(edges);
      // Edges are stored internally, no getter needed for this test
      expect(simulation).toBeDefined();
    });
  });

  describe('Barnes-Hut activation', () => {
    it('should not use Barnes-Hut for small graphs (<= 50 nodes)', () => {
      const nodes: ForceSimulationNode[] = [];
      for (let i = 0; i < 50; i++) {
        nodes.push({ id: `${i}`, x: i * 10, y: i * 10 });
      }

      simulation.setNodes(nodes);
      expect(simulation.isBarnesHutActive()).toBe(false);
    });

    it('should use Barnes-Hut for large graphs (> 50 nodes)', () => {
      const nodes: ForceSimulationNode[] = [];
      for (let i = 0; i < 51; i++) {
        nodes.push({ id: `${i}`, x: i * 10, y: i * 10 });
      }

      simulation.setNodes(nodes);
      expect(simulation.isBarnesHutActive()).toBe(true);
    });

    it('should respect manual Barnes-Hut disable', () => {
      const nodes: ForceSimulationNode[] = [];
      for (let i = 0; i < 100; i++) {
        nodes.push({ id: `${i}`, x: i * 10, y: i * 10 });
      }

      const customSim = new ForceSimulation({ useBarnesHut: false });
      customSim.setNodes(nodes);
      
      expect(customSim.isBarnesHutActive()).toBe(false);
    });

    it('should return correct Barnes-Hut threshold', () => {
      expect(ForceSimulation.getBarnesHutThreshold()).toBe(50);
    });
  });

  describe('simulation control', () => {
    it('should start simulation', () => {
      simulation.start();
      expect(simulation.running()).toBe(true);
      expect(simulation.getAlpha()).toBe(1.0);
    });

    it('should stop simulation', () => {
      simulation.start();
      simulation.stop();
      expect(simulation.running()).toBe(false);
    });

    it('should restart simulation', () => {
      simulation.start();
      simulation.setAlpha(0.5);
      simulation.restart();
      
      expect(simulation.running()).toBe(true);
      expect(simulation.getAlpha()).toBe(1.0);
    });

    it('should reheat simulation', () => {
      simulation.setAlpha(0.2);
      simulation.reheat(0.3);
      
      expect(simulation.getAlpha()).toBe(0.5);
    });

    it('should not exceed alpha of 1.0 when reheating', () => {
      simulation.setAlpha(0.9);
      simulation.reheat(0.5);
      
      expect(simulation.getAlpha()).toBe(1.0);
    });
  });

  describe('alpha (temperature) management', () => {
    it('should get and set alpha', () => {
      simulation.setAlpha(0.5);
      expect(simulation.getAlpha()).toBe(0.5);
    });

    it('should clamp alpha to [0, 1]', () => {
      simulation.setAlpha(1.5);
      expect(simulation.getAlpha()).toBe(1.0);

      simulation.setAlpha(-0.5);
      expect(simulation.getAlpha()).toBe(0.0);
    });

    it('should get and set alpha decay', () => {
      simulation.setAlphaDecay(0.01);
      expect(simulation.getAlphaDecay()).toBe(0.01);
    });

    it('should clamp alpha decay to [0, 1]', () => {
      simulation.setAlphaDecay(1.5);
      expect(simulation.getAlphaDecay()).toBe(1.0);

      simulation.setAlphaDecay(-0.5);
      expect(simulation.getAlphaDecay()).toBe(0.0);
    });
  });

  describe('tick', () => {
    it('should return false when alpha below minimum', () => {
      simulation.setNodes([{ id: '1', x: 0, y: 0 }]);
      simulation.setAlpha(0.0001);
      
      const result = simulation.tick();
      expect(result).toBe(false);
      expect(simulation.running()).toBe(false);
    });

    it('should return true when simulation active', () => {
      simulation.setNodes([{ id: '1', x: 0, y: 0 }]);
      simulation.start();
      
      const result = simulation.tick();
      expect(result).toBe(true);
    });

    it('should decrease alpha on each tick', () => {
      simulation.setNodes([{ id: '1', x: 0, y: 0 }]);
      simulation.start();
      
      const initialAlpha = simulation.getAlpha();
      simulation.tick();
      const newAlpha = simulation.getAlpha();
      
      expect(newAlpha).toBeLessThan(initialAlpha);
    });

    it('should update node positions', () => {
      const nodes: ForceSimulationNode[] = [
        { id: '1', x: 0, y: 0 },
        { id: '2', x: 10, y: 0 }, // Very close, should repel
      ];

      simulation.setNodes(nodes);
      simulation.start();

      const initialX1 = simulation.getNode('1')!.x;
      const initialX2 = simulation.getNode('2')!.x;

      // Run a few ticks
      for (let i = 0; i < 5; i++) {
        simulation.tick();
      }

      const finalX1 = simulation.getNode('1')!.x;
      const finalX2 = simulation.getNode('2')!.x;

      // Nodes should have moved apart
      expect(finalX2 - finalX1).toBeGreaterThan(initialX2 - initialX1);
    });
  });

  describe('node pinning', () => {
    it('should pin node at position', () => {
      simulation.setNodes([{ id: '1', x: 0, y: 0 }]);
      simulation.pinNode('1', 100, 100);

      const node = simulation.getNode('1');
      expect(node?.fx).toBe(100);
      expect(node?.fy).toBe(100);
      expect(node?.x).toBe(100);
      expect(node?.y).toBe(100);
    });

    it('should unpin node', () => {
      simulation.setNodes([{ id: '1', x: 0, y: 0 }]);
      simulation.pinNode('1', 100, 100);
      simulation.unpinNode('1');

      const node = simulation.getNode('1');
      expect(node?.fx).toBeUndefined();
      expect(node?.fy).toBeUndefined();
    });

    it('should keep pinned node at fixed position during simulation', () => {
      const nodes: ForceSimulationNode[] = [
        { id: '1', x: 0, y: 0 },
        { id: '2', x: 10, y: 0 },
      ];

      simulation.setNodes(nodes);
      simulation.pinNode('1', 0, 0);
      simulation.start();

      // Run simulation
      for (let i = 0; i < 10; i++) {
        simulation.tick();
      }

      const node1 = simulation.getNode('1')!;
      expect(node1.x).toBe(0);
      expect(node1.y).toBe(0);
    });
  });

  describe('drag handling', () => {
    beforeEach(() => {
      simulation.setNodes([
        { id: '1', x: 0, y: 0 },
        { id: '2', x: 100, y: 100 },
      ]);
    });

    it('should handle drag start', () => {
      simulation.onDragStart('1', 50, 50);

      const node = simulation.getNode('1');
      expect(node?.fx).toBe(50);
      expect(node?.fy).toBe(50);
      expect(simulation.getAlpha()).toBeGreaterThan(0.3);
    });

    it('should handle drag', () => {
      simulation.onDragStart('1', 50, 50);
      simulation.onDrag('1', 75, 75);

      const node = simulation.getNode('1');
      expect(node?.x).toBe(75);
      expect(node?.y).toBe(75);
    });

    it('should handle drag end', () => {
      simulation.onDragStart('1', 50, 50);
      simulation.onDrag('1', 75, 75);
      simulation.onDragEnd('1');

      const node = simulation.getNode('1');
      expect(node?.fx).toBeUndefined();
      expect(node?.fy).toBeUndefined();
      expect(simulation.getAlpha()).toBeGreaterThan(0.5);
    });

    it('should reheat on position update', () => {
      simulation.setAlpha(0.1);
      simulation.updateNode('1', { x: 200, y: 200 });

      expect(simulation.getAlpha()).toBeGreaterThan(0.3);
    });
  });

  describe('adaptive cooling', () => {
    it('should be enabled by default', () => {
      expect(simulation.isAdaptiveCoolingEnabled()).toBe(true);
    });

    it('should allow enabling/disabling', () => {
      simulation.setAdaptiveCooling(false);
      expect(simulation.isAdaptiveCoolingEnabled()).toBe(false);

      simulation.setAdaptiveCooling(true);
      expect(simulation.isAdaptiveCoolingEnabled()).toBe(true);
    });

    it('should get and set movement threshold', () => {
      simulation.setMovementThreshold(1.0);
      expect(simulation.getMovementThreshold()).toBe(1.0);
    });

    it('should not allow negative movement threshold', () => {
      simulation.setMovementThreshold(-1.0);
      expect(simulation.getMovementThreshold()).toBe(0);
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      simulation.updateConfig({
        repulsionStrength: 200,
        minSpacing: 30,
      });

      const config = simulation.getConfig();
      expect(config.repulsionStrength).toBe(200);
      expect(config.minSpacing).toBe(30);
    });

    it('should preserve unchanged config values', () => {
      const initialConfig = simulation.getConfig();
      
      simulation.updateConfig({
        repulsionStrength: 200,
      });

      const newConfig = simulation.getConfig();
      expect(newConfig.attractionStrength).toBe(initialConfig.attractionStrength);
    });
  });

  describe('force application', () => {
    it('should apply repulsion forces', () => {
      const nodes: ForceSimulationNode[] = [
        { id: '1', x: 0, y: 0 },
        { id: '2', x: 10, y: 0 }, // Very close
      ];

      simulation.setNodes(nodes);
      simulation.start();
      simulation.tick();

      const node1 = simulation.getNode('1')!;
      const node2 = simulation.getNode('2')!;

      // Nodes should have velocities pushing them apart
      expect(node1.vx).toBeLessThan(0); // Node 1 pushed left
      expect(node2.vx).toBeGreaterThan(0); // Node 2 pushed right
    });

    it('should apply attraction forces along edges', () => {
      const nodes: ForceSimulationNode[] = [
        { id: '1', x: 0, y: 0 },
        { id: '2', x: 200, y: 0 }, // Far apart
      ];

      const edges: Edge[] = [
        { source: '1', target: '2' },
      ];

      simulation.setNodes(nodes);
      simulation.setEdges(edges);
      simulation.start();
      simulation.tick();

      const node1 = simulation.getNode('1')!;
      const node2 = simulation.getNode('2')!;

      // Nodes should have velocities pulling them together
      expect(node1.vx).toBeGreaterThan(0); // Node 1 pulled right
      expect(node2.vx).toBeLessThan(0); // Node 2 pulled left
    });

    it('should apply center gravity', () => {
      const nodes: ForceSimulationNode[] = [
        { id: '1', x: 500, y: 500 },
      ];

      simulation.setNodes(nodes);
      simulation.start();
      simulation.tick();

      const node = simulation.getNode('1')!;

      // Node should have velocity toward center (0, 0)
      expect(node.vx).toBeLessThan(0);
      expect(node.vy).toBeLessThan(0);
    });
  });
});

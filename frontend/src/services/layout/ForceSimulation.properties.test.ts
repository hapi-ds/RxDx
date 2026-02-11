/**
 * Property-based tests for ForceSimulation
 * 
 * **Validates: Requirements 1.5, 21.2**
 * 
 * Property 2: Barnes-Hut optimization activation
 * For any graph with more than 50 nodes, the force-directed layout algorithm 
 * should use Barnes-Hut spatial partitioning for force calculations.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ForceSimulation, type ForceSimulationNode } from './ForceSimulation';

describe('ForceSimulation - Property-Based Tests', () => {
  describe('Property 2: Barnes-Hut activation threshold', () => {
    it('should NOT use Barnes-Hut for graphs with <= 50 nodes', () => {
      fc.assert(
        fc.property(
          // Generate node count from 1 to 50
          fc.integer({ min: 1, max: 50 }),
          (nodeCount) => {
            // Generate nodes
            const nodes: ForceSimulationNode[] = [];
            for (let i = 0; i < nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                x: Math.random() * 1000,
                y: Math.random() * 1000,
              });
            }

            // Create simulation with default config (useBarnesHut: true)
            const simulation = new ForceSimulation();
            simulation.setNodes(nodes);

            // Property: Barnes-Hut should NOT be active for <= 50 nodes
            expect(simulation.isBarnesHutActive()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use Barnes-Hut for graphs with > 50 nodes', () => {
      fc.assert(
        fc.property(
          // Generate node count from 51 to 200
          fc.integer({ min: 51, max: 200 }),
          (nodeCount) => {
            // Generate nodes
            const nodes: ForceSimulationNode[] = [];
            for (let i = 0; i < nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                x: Math.random() * 1000,
                y: Math.random() * 1000,
              });
            }

            // Create simulation with default config (useBarnesHut: true)
            const simulation = new ForceSimulation();
            simulation.setNodes(nodes);

            // Property: Barnes-Hut SHOULD be active for > 50 nodes
            expect(simulation.isBarnesHutActive()).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect manual Barnes-Hut disable regardless of node count', () => {
      fc.assert(
        fc.property(
          // Generate any node count from 1 to 200
          fc.integer({ min: 1, max: 200 }),
          (nodeCount) => {
            // Generate nodes
            const nodes: ForceSimulationNode[] = [];
            for (let i = 0; i < nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                x: Math.random() * 1000,
                y: Math.random() * 1000,
              });
            }

            // Create simulation with Barnes-Hut explicitly disabled
            const simulation = new ForceSimulation({ useBarnesHut: false });
            simulation.setNodes(nodes);

            // Property: Barnes-Hut should NEVER be active when manually disabled
            expect(simulation.isBarnesHutActive()).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should activate Barnes-Hut exactly at threshold boundary (51 nodes)', () => {
      const threshold = ForceSimulation.getBarnesHutThreshold();
      
      // Test at threshold
      const nodesAtThreshold: ForceSimulationNode[] = [];
      for (let i = 0; i < threshold; i++) {
        nodesAtThreshold.push({
          id: `node-${i}`,
          x: Math.random() * 1000,
          y: Math.random() * 1000,
        });
      }

      const simAtThreshold = new ForceSimulation();
      simAtThreshold.setNodes(nodesAtThreshold);
      expect(simAtThreshold.isBarnesHutActive()).toBe(false);

      // Test at threshold + 1
      const nodesAboveThreshold: ForceSimulationNode[] = [];
      for (let i = 0; i < threshold + 1; i++) {
        nodesAboveThreshold.push({
          id: `node-${i}`,
          x: Math.random() * 1000,
          y: Math.random() * 1000,
        });
      }

      const simAboveThreshold = new ForceSimulation();
      simAboveThreshold.setNodes(nodesAboveThreshold);
      expect(simAboveThreshold.isBarnesHutActive()).toBe(true);
    });

    it('should maintain Barnes-Hut state when nodes are updated', () => {
      fc.assert(
        fc.property(
          // Generate initial node count > 50
          fc.integer({ min: 51, max: 100 }),
          (nodeCount) => {
            // Generate nodes
            const nodes: ForceSimulationNode[] = [];
            for (let i = 0; i < nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                x: Math.random() * 1000,
                y: Math.random() * 1000,
              });
            }

            const simulation = new ForceSimulation();
            simulation.setNodes(nodes);

            const initialBarnesHutState = simulation.isBarnesHutActive();

            // Update a node position
            simulation.updateNode('node-0', { x: 500, y: 500 });

            // Property: Barnes-Hut state should remain unchanged after node update
            expect(simulation.isBarnesHutActive()).toBe(initialBarnesHutState);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should re-evaluate Barnes-Hut when node count changes', () => {
      // Start with > 50 nodes
      const manyNodes: ForceSimulationNode[] = [];
      for (let i = 0; i < 60; i++) {
        manyNodes.push({
          id: `node-${i}`,
          x: Math.random() * 1000,
          y: Math.random() * 1000,
        });
      }

      const simulation = new ForceSimulation();
      simulation.setNodes(manyNodes);
      expect(simulation.isBarnesHutActive()).toBe(true);

      // Change to <= 50 nodes
      const fewNodes: ForceSimulationNode[] = [];
      for (let i = 0; i < 30; i++) {
        fewNodes.push({
          id: `node-${i}`,
          x: Math.random() * 1000,
          y: Math.random() * 1000,
        });
      }

      simulation.setNodes(fewNodes);
      expect(simulation.isBarnesHutActive()).toBe(false);
    });

    it('should use correct threshold value of 50', () => {
      const threshold = ForceSimulation.getBarnesHutThreshold();
      expect(threshold).toBe(50);
    });
  });

  describe('Property 3: Temperature increase on drag', () => {
    it('should increase temperature when node is dragged', () => {
      fc.assert(
        fc.property(
          // Generate initial alpha between 0.1 and 0.5
          fc.double({ min: 0.1, max: 0.5, noNaN: true }),
          // Generate drag position
          fc.record({
            x: fc.double({ min: 0, max: 1000, noNaN: true }),
            y: fc.double({ min: 0, max: 1000, noNaN: true }),
          }),
          (initialAlpha, dragPos) => {
            const nodes: ForceSimulationNode[] = [
              { id: 'node-1', x: 100, y: 100 },
              { id: 'node-2', x: 200, y: 200 },
            ];

            const simulation = new ForceSimulation();
            simulation.setNodes(nodes);
            simulation.setAlpha(initialAlpha);

            const alphaBeforeDrag = simulation.getAlpha();

            // Drag node
            simulation.onDragStart('node-1', dragPos.x, dragPos.y);

            const alphaAfterDrag = simulation.getAlpha();

            // Property: Temperature should increase after drag
            expect(alphaAfterDrag).toBeGreaterThan(alphaBeforeDrag);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should increase temperature on drag end', () => {
      fc.assert(
        fc.property(
          // Generate initial alpha between 0.1 and 0.4
          fc.double({ min: 0.1, max: 0.4, noNaN: true }),
          (initialAlpha) => {
            const nodes: ForceSimulationNode[] = [
              { id: 'node-1', x: 100, y: 100 },
              { id: 'node-2', x: 200, y: 200 },
            ];

            const simulation = new ForceSimulation();
            simulation.setNodes(nodes);
            simulation.setAlpha(initialAlpha);

            simulation.onDragStart('node-1', 150, 150);
            simulation.setAlpha(initialAlpha); // Reset to test drag end

            const alphaBeforeDragEnd = simulation.getAlpha();

            // End drag
            simulation.onDragEnd('node-1');

            const alphaAfterDragEnd = simulation.getAlpha();

            // Property: Temperature should increase after drag end
            expect(alphaAfterDragEnd).toBeGreaterThan(alphaBeforeDragEnd);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain heat during drag', () => {
      fc.assert(
        fc.property(
          // Generate drag positions
          fc.array(
            fc.record({
              x: fc.double({ min: 0, max: 1000, noNaN: true }),
              y: fc.double({ min: 0, max: 1000, noNaN: true }),
            }),
            { minLength: 5, maxLength: 10 }
          ),
          (dragPositions) => {
            const nodes: ForceSimulationNode[] = [
              { id: 'node-1', x: 100, y: 100 },
            ];

            const simulation = new ForceSimulation();
            simulation.setNodes(nodes);
            simulation.onDragStart('node-1', dragPositions[0].x, dragPositions[0].y);

            // Simulate continuous drag
            for (let i = 1; i < dragPositions.length; i++) {
              simulation.setAlpha(0.2); // Simulate cooling
              const alphaBeforeDrag = simulation.getAlpha();
              
              simulation.onDrag('node-1', dragPositions[i].x, dragPositions[i].y);
              
              const alphaAfterDrag = simulation.getAlpha();

              // Property: If alpha is low during drag, it should be reheated
              if (alphaBeforeDrag < 0.3) {
                expect(alphaAfterDrag).toBeGreaterThanOrEqual(alphaBeforeDrag);
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

/**
 * Property-based tests for HierarchicalLayout
 * 
 * **Validates: Requirements 2.2**
 * 
 * Property 4: Hierarchical level assignment
 * For any tree-structured graph using hierarchical layout, nodes at the same depth
 * from the root should be positioned at the same vertical level (for TB/BT direction)
 * or horizontal level (for LR/RL direction).
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { HierarchicalLayout, type HierarchicalNode, type HierarchicalEdge } from './HierarchicalLayout';

describe('HierarchicalLayout Properties', () => {
  describe('Property 4: Same-level nodes at same vertical/horizontal position', () => {
    it('should position nodes at same layer at same vertical position for TB direction', () => {
      fc.assert(
        fc.property(
          // Generate a simple tree structure
          fc.record({
            nodeCount: fc.integer({ min: 2, max: 20 }),
            direction: fc.constant('TB' as const),
            levelSeparation: fc.integer({ min: 50, max: 200 }),
            nodeSeparation: fc.integer({ min: 20, max: 100 }),
          }),
          (config) => {
            // Create nodes
            const nodes: HierarchicalNode[] = [];
            for (let i = 0; i < config.nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                width: 50,
                height: 50,
              });
            }

            // Create a tree structure (each node connects to next 1-2 nodes)
            const edges: HierarchicalEdge[] = [];
            for (let i = 0; i < config.nodeCount - 1; i++) {
              edges.push({
                source: `node-${i}`,
                target: `node-${i + 1}`,
              });
            }

            // Calculate layout
            const layout = new HierarchicalLayout({
              direction: config.direction,
              levelSeparation: config.levelSeparation,
              nodeSeparation: config.nodeSeparation,
            });

            const positions = layout.calculateLayout(nodes, edges);
            const layerAssignments = layout.getLayerAssignments(nodes, edges);

            // Group nodes by layer
            const nodesByLayer = new Map<number, string[]>();
            for (const assignment of layerAssignments) {
              if (!nodesByLayer.has(assignment.layer)) {
                nodesByLayer.set(assignment.layer, []);
              }
              nodesByLayer.get(assignment.layer)!.push(assignment.nodeId);
            }

            // Verify: All nodes in the same layer have the same Y coordinate (for TB direction)
            for (const [layer, nodeIds] of nodesByLayer.entries()) {
              if (nodeIds.length > 1) {
                const yPositions = nodeIds.map(id => positions.get(id)?.y);
                const firstY = yPositions[0];

                for (const y of yPositions) {
                  expect(y).toBe(firstY);
                }
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should position nodes at same layer at same vertical position for BT direction', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeCount: fc.integer({ min: 2, max: 20 }),
            direction: fc.constant('BT' as const),
            levelSeparation: fc.integer({ min: 50, max: 200 }),
            nodeSeparation: fc.integer({ min: 20, max: 100 }),
          }),
          (config) => {
            const nodes: HierarchicalNode[] = [];
            for (let i = 0; i < config.nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                width: 50,
                height: 50,
              });
            }

            const edges: HierarchicalEdge[] = [];
            for (let i = 0; i < config.nodeCount - 1; i++) {
              edges.push({
                source: `node-${i}`,
                target: `node-${i + 1}`,
              });
            }

            const layout = new HierarchicalLayout({
              direction: config.direction,
              levelSeparation: config.levelSeparation,
              nodeSeparation: config.nodeSeparation,
            });

            const positions = layout.calculateLayout(nodes, edges);
            const layerAssignments = layout.getLayerAssignments(nodes, edges);

            const nodesByLayer = new Map<number, string[]>();
            for (const assignment of layerAssignments) {
              if (!nodesByLayer.has(assignment.layer)) {
                nodesByLayer.set(assignment.layer, []);
              }
              nodesByLayer.get(assignment.layer)!.push(assignment.nodeId);
            }

            // Verify: All nodes in the same layer have the same Y coordinate (for BT direction)
            for (const [layer, nodeIds] of nodesByLayer.entries()) {
              if (nodeIds.length > 1) {
                const yPositions = nodeIds.map(id => positions.get(id)?.y);
                const firstY = yPositions[0];

                for (const y of yPositions) {
                  expect(Math.abs((y || 0) - (firstY || 0))).toBeLessThan(0.001);
                }
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should position nodes at same layer at same horizontal position for LR direction', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeCount: fc.integer({ min: 2, max: 20 }),
            direction: fc.constant('LR' as const),
            levelSeparation: fc.integer({ min: 50, max: 200 }),
            nodeSeparation: fc.integer({ min: 20, max: 100 }),
          }),
          (config) => {
            const nodes: HierarchicalNode[] = [];
            for (let i = 0; i < config.nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                width: 50,
                height: 50,
              });
            }

            const edges: HierarchicalEdge[] = [];
            for (let i = 0; i < config.nodeCount - 1; i++) {
              edges.push({
                source: `node-${i}`,
                target: `node-${i + 1}`,
              });
            }

            const layout = new HierarchicalLayout({
              direction: config.direction,
              levelSeparation: config.levelSeparation,
              nodeSeparation: config.nodeSeparation,
            });

            const positions = layout.calculateLayout(nodes, edges);
            const layerAssignments = layout.getLayerAssignments(nodes, edges);

            const nodesByLayer = new Map<number, string[]>();
            for (const assignment of layerAssignments) {
              if (!nodesByLayer.has(assignment.layer)) {
                nodesByLayer.set(assignment.layer, []);
              }
              nodesByLayer.get(assignment.layer)!.push(assignment.nodeId);
            }

            // Verify: All nodes in the same layer have the same X coordinate (for LR direction)
            for (const [layer, nodeIds] of nodesByLayer.entries()) {
              if (nodeIds.length > 1) {
                const xPositions = nodeIds.map(id => positions.get(id)?.x);
                const firstX = xPositions[0];

                for (const x of xPositions) {
                  expect(x).toBe(firstX);
                }
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should position nodes at same layer at same horizontal position for RL direction', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeCount: fc.integer({ min: 2, max: 20 }),
            direction: fc.constant('RL' as const),
            levelSeparation: fc.integer({ min: 50, max: 200 }),
            nodeSeparation: fc.integer({ min: 20, max: 100 }),
          }),
          (config) => {
            const nodes: HierarchicalNode[] = [];
            for (let i = 0; i < config.nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                width: 50,
                height: 50,
              });
            }

            const edges: HierarchicalEdge[] = [];
            for (let i = 0; i < config.nodeCount - 1; i++) {
              edges.push({
                source: `node-${i}`,
                target: `node-${i + 1}`,
              });
            }

            const layout = new HierarchicalLayout({
              direction: config.direction,
              levelSeparation: config.levelSeparation,
              nodeSeparation: config.nodeSeparation,
            });

            const positions = layout.calculateLayout(nodes, edges);
            const layerAssignments = layout.getLayerAssignments(nodes, edges);

            const nodesByLayer = new Map<number, string[]>();
            for (const assignment of layerAssignments) {
              if (!nodesByLayer.has(assignment.layer)) {
                nodesByLayer.set(assignment.layer, []);
              }
              nodesByLayer.get(assignment.layer)!.push(assignment.nodeId);
            }

            // Verify: All nodes in the same layer have the same X coordinate (for RL direction)
            for (const [layer, nodeIds] of nodesByLayer.entries()) {
              if (nodeIds.length > 1) {
                const xPositions = nodeIds.map(id => positions.get(id)?.x);
                const firstX = xPositions[0];

                for (const x of xPositions) {
                  expect(Math.abs((x || 0) - (firstX || 0))).toBeLessThan(0.001);
                }
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain layer consistency with multiple roots (forest structure)', () => {
      fc.assert(
        fc.property(
          fc.record({
            treeCount: fc.integer({ min: 2, max: 5 }),
            nodesPerTree: fc.integer({ min: 2, max: 10 }),
            direction: fc.constantFrom('TB' as const, 'BT' as const, 'LR' as const, 'RL' as const),
          }),
          (config) => {
            const nodes: HierarchicalNode[] = [];
            const edges: HierarchicalEdge[] = [];

            // Create multiple trees
            for (let tree = 0; tree < config.treeCount; tree++) {
              for (let i = 0; i < config.nodesPerTree; i++) {
                nodes.push({
                  id: `tree${tree}-node${i}`,
                  width: 50,
                  height: 50,
                });

                if (i > 0) {
                  edges.push({
                    source: `tree${tree}-node${i - 1}`,
                    target: `tree${tree}-node${i}`,
                  });
                }
              }
            }

            const layout = new HierarchicalLayout({ direction: config.direction });
            const positions = layout.calculateLayout(nodes, edges);
            const layerAssignments = layout.getLayerAssignments(nodes, edges);

            const nodesByLayer = new Map<number, string[]>();
            for (const assignment of layerAssignments) {
              if (!nodesByLayer.has(assignment.layer)) {
                nodesByLayer.set(assignment.layer, []);
              }
              nodesByLayer.get(assignment.layer)!.push(assignment.nodeId);
            }

            // Verify: All nodes in the same layer have the same coordinate on the layer axis
            const isHorizontal = config.direction === 'LR' || config.direction === 'RL';

            for (const [layer, nodeIds] of nodesByLayer.entries()) {
              if (nodeIds.length > 1) {
                const coords = nodeIds.map(id => {
                  const pos = positions.get(id);
                  return isHorizontal ? pos?.x : pos?.y;
                });

                const firstCoord = coords[0];
                for (const coord of coords) {
                  expect(Math.abs((coord || 0) - (firstCoord || 0))).toBeLessThan(0.001);
                }
              }
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

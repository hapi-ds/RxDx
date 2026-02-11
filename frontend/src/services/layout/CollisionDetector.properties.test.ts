/**
 * Property-based tests for collision detection
 * Validates: Requirements 1.1, 1.3 - No overlapping nodes after layout stabilization
 * 
 * Property 1: Collision-free layout
 * For any graph with nodes positioned by the layout algorithm, no two nodes should have
 * bounding boxes that overlap or are closer than 20 pixels apart.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CollisionDetector, type NodeBounds } from './CollisionDetector';
import { CollisionResolver, type NodePosition } from './CollisionResolver';

describe('CollisionDetector - Property-Based Tests', () => {
  describe('Property 1: Collision-free layout after stabilization', () => {
    it('should have no overlapping nodes after collision resolution', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary list of nodes with random positions
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 10 }),
              x: fc.float({ min: 0, max: 1000 }),
              y: fc.float({ min: 0, max: 1000 }),
              width: fc.float({ min: 50, max: 150 }),
              height: fc.float({ min: 30, max: 100 }),
            }),
            { minLength: 2, maxLength: 20 }
          ),
          (nodeData) => {
            // Ensure unique IDs
            const uniqueNodes = nodeData.filter(
              (node, index, self) => 
                self.findIndex(n => n.id === node.id) === index
            );

            if (uniqueNodes.length < 2) {
              // Skip if we don't have at least 2 unique nodes
              return true;
            }

            // Create node bounds
            const nodes: NodeBounds[] = uniqueNodes.map(n => ({
              id: n.id,
              x: n.x,
              y: n.y,
              width: n.width,
              height: n.height,
            }));

            // Create collision resolver with 20px minimum spacing
            const resolver = new CollisionResolver(20, 0.7);

            // Create position map
            const positions = new Map<string, NodePosition>();
            for (const node of nodes) {
              positions.set(node.id, {
                id: node.id,
                x: node.x,
                y: node.y,
                vx: 0,
                vy: 0,
              });
            }

            // Resolve collisions iteratively
            const iterations = resolver.resolveCollisions(nodes, positions, 50, 1.0);

            // Update node bounds with resolved positions
            const resolvedNodes = nodes.map(node => {
              const pos = positions.get(node.id)!;
              return { ...node, x: pos.x, y: pos.y };
            });

            // Check that layout is stabilized (no collisions)
            const isStabilized = resolver.isStabilized(resolvedNodes);

            // Property: After collision resolution, there should be no overlapping nodes
            expect(isStabilized).toBe(true);

            // Additional check: Verify minimum spacing is maintained
            const detector = resolver.getDetector();
            const result = detector.detectCollisions(resolvedNodes);
            
            return !result.hasCollision;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should maintain minimum spacing of 20 pixels between all node pairs', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary list of nodes
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 10 }),
              x: fc.float({ min: 0, max: 800 }),
              y: fc.float({ min: 0, max: 800 }),
              width: fc.float({ min: 40, max: 120 }),
              height: fc.float({ min: 30, max: 80 }),
            }),
            { minLength: 2, maxLength: 15 }
          ),
          (nodeData) => {
            // Ensure unique IDs
            const uniqueNodes = nodeData.filter(
              (node, index, self) => 
                self.findIndex(n => n.id === node.id) === index
            );

            if (uniqueNodes.length < 2) {
              return true;
            }

            // Create node bounds
            const nodes: NodeBounds[] = uniqueNodes.map(n => ({
              id: n.id,
              x: n.x,
              y: n.y,
              width: n.width,
              height: n.height,
            }));

            // Create collision resolver
            const resolver = new CollisionResolver(20, 0.7);

            // Create position map
            const positions = new Map<string, NodePosition>();
            for (const node of nodes) {
              positions.set(node.id, {
                id: node.id,
                x: node.x,
                y: node.y,
              });
            }

            // Resolve collisions
            resolver.resolveCollisions(nodes, positions, 50, 1.0);

            // Update node bounds
            const resolvedNodes = nodes.map(node => {
              const pos = positions.get(node.id)!;
              return { ...node, x: pos.x, y: pos.y };
            });

            // Check all pairs of nodes
            const detector = resolver.getDetector();
            for (let i = 0; i < resolvedNodes.length; i++) {
              for (let j = i + 1; j < resolvedNodes.length; j++) {
                const nodeA = resolvedNodes[i];
                const nodeB = resolvedNodes[j];

                // Calculate actual distance between nodes
                const dx = nodeB.x - nodeA.x;
                const dy = nodeB.y - nodeA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Calculate minimum required distance
                const minDistance = detector.getMinimumDistance(nodeA, nodeB);

                // Property: Distance should be at least the minimum required
                if (distance < minDistance - 0.1) { // Small tolerance for floating point
                  return false;
                }
              }
            }

            return true;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should handle edge case of nodes at same initial position', () => {
      fc.assert(
        fc.property(
          // Generate nodes all at the same position
          fc.record({
            x: fc.float({ min: 100, max: 900 }),
            y: fc.float({ min: 100, max: 900 }),
            count: fc.integer({ min: 2, max: 10 }),
          }),
          ({ x, y, count }) => {
            // Create nodes all at same position
            const nodes: NodeBounds[] = [];
            for (let i = 0; i < count; i++) {
              nodes.push({
                id: `node-${i}`,
                x,
                y,
                width: 100,
                height: 50,
              });
            }

            // Create collision resolver
            const resolver = new CollisionResolver(20, 0.7);

            // Create position map
            const positions = new Map<string, NodePosition>();
            for (const node of nodes) {
              positions.set(node.id, {
                id: node.id,
                x: node.x,
                y: node.y,
              });
            }

            // Resolve collisions
            resolver.resolveCollisions(nodes, positions, 100, 1.0);

            // Update node bounds
            const resolvedNodes = nodes.map(node => {
              const pos = positions.get(node.id)!;
              return { ...node, x: pos.x, y: pos.y };
            });

            // Property: After resolution, nodes should be separated
            const detector = resolver.getDetector();
            const result = detector.detectCollisions(resolvedNodes);

            return !result.hasCollision;
          }
        ),
        {
          numRuns: 50,
          verbose: true,
        }
      );
    });

    it('should preserve node count during collision resolution', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 10 }),
              x: fc.float({ min: 0, max: 1000 }),
              y: fc.float({ min: 0, max: 1000 }),
              width: fc.float({ min: 50, max: 150 }),
              height: fc.float({ min: 30, max: 100 }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (nodeData) => {
            // Ensure unique IDs
            const uniqueNodes = nodeData.filter(
              (node, index, self) => 
                self.findIndex(n => n.id === node.id) === index
            );

            const initialCount = uniqueNodes.length;

            // Create node bounds
            const nodes: NodeBounds[] = uniqueNodes.map(n => ({
              id: n.id,
              x: n.x,
              y: n.y,
              width: n.width,
              height: n.height,
            }));

            // Create collision resolver
            const resolver = new CollisionResolver(20, 0.7);

            // Create position map
            const positions = new Map<string, NodePosition>();
            for (const node of nodes) {
              positions.set(node.id, {
                id: node.id,
                x: node.x,
                y: node.y,
              });
            }

            // Resolve collisions
            resolver.resolveCollisions(nodes, positions, 50, 1.0);

            // Property: Node count should remain the same
            return positions.size === initialCount;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });
  });
});

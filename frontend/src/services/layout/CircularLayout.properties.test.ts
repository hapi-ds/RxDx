/**
 * Property-based tests for CircularLayout
 * 
 * **Validates: Requirements 2.3**
 * 
 * Property 5: Circular distance mapping
 * For any graph using circular layout, the radial distance of each node from the
 * center should be proportional to its graph distance from the center node.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CircularLayout, type CircularNode, type CircularEdge } from './CircularLayout';

describe('CircularLayout Properties', () => {
  describe('Property 5: Radial distance proportional to graph distance', () => {
    it('should place nodes at radial distances proportional to their graph distance from center', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeCount: fc.integer({ min: 3, max: 20 }),
            radius: fc.integer({ min: 50, max: 300 }),
          }),
          (config) => {
            // Create a star topology (hub and spokes) for clear distance relationships
            const nodes: CircularNode[] = [];
            const edges: CircularEdge[] = [];

            // Create hub node
            nodes.push({
              id: 'hub',
              width: 50,
              height: 50,
            });

            // Create spoke nodes connected to hub
            for (let i = 0; i < config.nodeCount - 1; i++) {
              nodes.push({
                id: `spoke-${i}`,
                width: 50,
                height: 50,
              });

              edges.push({
                source: 'hub',
                target: `spoke-${i}`,
              });
            }

            // Calculate layout
            const layout = new CircularLayout({ radius: config.radius });
            const positions = layout.calculateLayout(nodes, edges);
            const assignments = layout.getCircleAssignments(nodes, edges);

            // Verify: Hub should be at center (distance 0)
            const hubPos = positions.get('hub')!;
            const hubDistance = Math.sqrt(hubPos.x ** 2 + hubPos.y ** 2);
            expect(hubDistance).toBeLessThan(0.001);

            // Verify: All spoke nodes should be at the same radial distance (1 * radius)
            for (let i = 0; i < config.nodeCount - 1; i++) {
              const spokePos = positions.get(`spoke-${i}`)!;
              const spokeDistance = Math.sqrt(spokePos.x ** 2 + spokePos.y ** 2);
              expect(Math.abs(spokeDistance - config.radius)).toBeLessThan(1);
            }

            // Verify: Circle assignments match radial distances
            const hubAssignment = assignments.find(a => a.nodeId === 'hub')!;
            expect(hubAssignment.circle).toBe(0);
            expect(hubAssignment.distance).toBe(0);

            for (let i = 0; i < config.nodeCount - 1; i++) {
              const spokeAssignment = assignments.find(a => a.nodeId === `spoke-${i}`)!;
              expect(spokeAssignment.circle).toBe(1);
              expect(spokeAssignment.distance).toBe(config.radius);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should place nodes at increasing radial distances for chain topology', () => {
      fc.assert(
        fc.property(
          fc.record({
            chainLength: fc.integer({ min: 3, max: 10 }),
            radius: fc.integer({ min: 50, max: 200 }),
          }),
          (config) => {
            // Create a linear chain topology
            const nodes: CircularNode[] = [];
            const edges: CircularEdge[] = [];

            for (let i = 0; i < config.chainLength; i++) {
              nodes.push({
                id: `node-${i}`,
                width: 50,
                height: 50,
              });

              if (i > 0) {
                edges.push({
                  source: `node-${i - 1}`,
                  target: `node-${i}`,
                });
              }
            }

            // Calculate layout
            const layout = new CircularLayout({ radius: config.radius });
            const positions = layout.calculateLayout(nodes, edges);
            const assignments = layout.getCircleAssignments(nodes, edges);

            // Verify: Nodes should be at increasing radial distances
            const nodeDistances = new Map<string, number>();
            for (const [nodeId, pos] of positions.entries()) {
              const distance = Math.sqrt(pos.x ** 2 + pos.y ** 2);
              nodeDistances.set(nodeId, distance);
            }

            // Verify: Circle assignments are consistent with radial distances
            for (const assignment of assignments) {
              const expectedDistance = assignment.circle * config.radius;
              const actualDistance = nodeDistances.get(assignment.nodeId)!;

              // Allow small tolerance for floating point errors
              expect(Math.abs(actualDistance - expectedDistance)).toBeLessThan(1);
            }

            // Verify: Nodes at higher circle numbers have greater radial distances
            const sortedAssignments = [...assignments].sort((a, b) => a.circle - b.circle);
            for (let i = 1; i < sortedAssignments.length; i++) {
              const prevDistance = nodeDistances.get(sortedAssignments[i - 1].nodeId)!;
              const currDistance = nodeDistances.get(sortedAssignments[i].nodeId)!;

              // Current node should be at same or greater distance than previous
              expect(currDistance).toBeGreaterThanOrEqual(prevDistance - 1);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain proportional distances for tree topology', () => {
      fc.assert(
        fc.property(
          fc.record({
            depth: fc.integer({ min: 2, max: 5 }),
            branchingFactor: fc.integer({ min: 2, max: 4 }),
            radius: fc.integer({ min: 50, max: 200 }),
          }),
          (config) => {
            // Create a tree topology
            const nodes: CircularNode[] = [];
            const edges: CircularEdge[] = [];

            let nodeId = 0;
            const createTree = (parentId: number | null, currentDepth: number) => {
              if (currentDepth > config.depth) return;

              const currentId = nodeId++;
              nodes.push({
                id: `node-${currentId}`,
                width: 50,
                height: 50,
              });

              if (parentId !== null) {
                edges.push({
                  source: `node-${parentId}`,
                  target: `node-${currentId}`,
                });
              }

              // Create children
              if (currentDepth < config.depth) {
                for (let i = 0; i < config.branchingFactor; i++) {
                  createTree(currentId, currentDepth + 1);
                }
              }
            };

            createTree(null, 0);

            // Calculate layout
            const layout = new CircularLayout({ radius: config.radius });
            const positions = layout.calculateLayout(nodes, edges);
            const assignments = layout.getCircleAssignments(nodes, edges);

            // Verify: Radial distance equals circle number × radius
            for (const assignment of assignments) {
              const pos = positions.get(assignment.nodeId)!;
              const actualDistance = Math.sqrt(pos.x ** 2 + pos.y ** 2);
              const expectedDistance = assignment.circle * config.radius;

              // Allow tolerance for floating point errors
              expect(Math.abs(actualDistance - expectedDistance)).toBeLessThan(1);
            }

            // Verify: All nodes at the same circle have the same radial distance
            const nodesByCircle = new Map<number, string[]>();
            for (const assignment of assignments) {
              if (!nodesByCircle.has(assignment.circle)) {
                nodesByCircle.set(assignment.circle, []);
              }
              nodesByCircle.get(assignment.circle)!.push(assignment.nodeId);
            }

            for (const [circle, nodeIds] of nodesByCircle.entries()) {
              const distances = nodeIds.map(id => {
                const pos = positions.get(id)!;
                return Math.sqrt(pos.x ** 2 + pos.y ** 2);
              });

              // All nodes in the same circle should have the same radial distance
              const firstDistance = distances[0];
              for (const distance of distances) {
                expect(Math.abs(distance - firstDistance)).toBeLessThan(1);
              }

              // Distance should match circle number × radius
              const expectedDistance = circle * config.radius;
              expect(Math.abs(firstDistance - expectedDistance)).toBeLessThan(1);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should respect custom radius configuration', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeCount: fc.integer({ min: 4, max: 15 }),
            radius: fc.integer({ min: 100, max: 500 }),
          }),
          (config) => {
            // Create a simple connected graph
            const nodes: CircularNode[] = [];
            const edges: CircularEdge[] = [];

            for (let i = 0; i < config.nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                width: 50,
                height: 50,
              });

              if (i > 0) {
                edges.push({
                  source: `node-${i - 1}`,
                  target: `node-${i}`,
                });
              }
            }

            // Calculate layout
            const layout = new CircularLayout({ radius: config.radius });
            const assignments = layout.getCircleAssignments(nodes, edges);

            // Verify: Distance between consecutive circles equals the configured radius
            const circles = [...new Set(assignments.map(a => a.circle))].sort((a, b) => a - b);

            for (let i = 1; i < circles.length; i++) {
              const prevCircle = circles[i - 1];
              const currCircle = circles[i];

              const prevDistance = assignments.find(a => a.circle === prevCircle)!.distance;
              const currDistance = assignments.find(a => a.circle === currCircle)!.distance;

              const distanceDiff = currDistance - prevDistance;

              // Distance difference should equal the configured radius
              expect(Math.abs(distanceDiff - config.radius)).toBeLessThan(1);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle disconnected components correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            componentSize: fc.integer({ min: 2, max: 5 }),
            componentCount: fc.integer({ min: 2, max: 4 }),
            radius: fc.integer({ min: 50, max: 200 }),
          }),
          (config) => {
            // Create multiple disconnected components
            const nodes: CircularNode[] = [];
            const edges: CircularEdge[] = [];

            for (let comp = 0; comp < config.componentCount; comp++) {
              for (let i = 0; i < config.componentSize; i++) {
                nodes.push({
                  id: `comp${comp}-node${i}`,
                  width: 50,
                  height: 50,
                });

                if (i > 0) {
                  edges.push({
                    source: `comp${comp}-node${i - 1}`,
                    target: `comp${comp}-node${i}`,
                  });
                }
              }
            }

            // Calculate layout
            const layout = new CircularLayout({ radius: config.radius });
            const positions = layout.calculateLayout(nodes, edges);
            const assignments = layout.getCircleAssignments(nodes, edges);

            // Verify: All nodes have valid positions
            expect(positions.size).toBe(nodes.length);

            // Verify: All nodes have circle assignments
            expect(assignments.length).toBe(nodes.length);

            // Verify: Radial distances match circle assignments
            for (const assignment of assignments) {
              const pos = positions.get(assignment.nodeId)!;
              const actualDistance = Math.sqrt(pos.x ** 2 + pos.y ** 2);
              const expectedDistance = assignment.circle * config.radius;

              expect(Math.abs(actualDistance - expectedDistance)).toBeLessThan(1);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

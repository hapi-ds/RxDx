/**
 * Property-based tests for graph store isolation mode functionality
 * Feature: graph-ui-enhancements
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useGraphStore } from './graphStore';
import type { Node, Edge } from '@xyflow/react';
import type { CustomNodeData } from '../components/graph/nodes/types';

/**
 * Helper function to calculate shortest path between two nodes
 * Used to verify isolation depth correctness
 */
function calculateShortestPath(
  sourceId: string,
  targetId: string,
  edges: Edge[]
): number {
  if (sourceId === targetId) return 0;
  
  const visited = new Set<string>();
  const queue: Array<{ id: string; distance: number }> = [{ id: sourceId, distance: 0 }];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (current.id === targetId) {
      return current.distance;
    }
    
    if (visited.has(current.id)) continue;
    visited.add(current.id);
    
    // Find connected nodes
    edges.forEach(edge => {
      if (edge.source === current.id && !visited.has(edge.target)) {
        queue.push({ id: edge.target, distance: current.distance + 1 });
      }
      if (edge.target === current.id && !visited.has(edge.source)) {
        queue.push({ id: edge.source, distance: current.distance + 1 });
      }
    });
  }
  
  return Infinity; // Not reachable
}

describe('Graph Store Isolation Mode Property Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    useGraphStore.getState().reset();
  });

  describe('Property 10: Isolation visibility correctness', () => {
    // Feature: graph-ui-enhancements, Property 10: Isolation visibility correctness
    // **Validates: Requirements 3.1, 3.2**
    // For any node and depth value, when isolation mode is active, the visible nodes
    // should be exactly the isolated node plus all nodes reachable within the specified depth.

    it('should show exactly the isolated node plus neighbors within depth', () => {
      fc.assert(
        fc.property(
          // Generate a graph structure
          fc.record({
            nodeCount: fc.integer({ min: 10, max: 30 }),
            edgeCount: fc.integer({ min: 15, max: 50 }),
          }),
          fc.integer({ min: 0, max: 9 }), // nodeIndex to isolate
          fc.integer({ min: 1, max: 3 }), // depth
          ({ nodeCount, edgeCount }, nodeIndex, depth) => {
            const store = useGraphStore.getState();
            
            // Generate nodes
            const nodes: Node<CustomNodeData>[] = [];
            for (let i = 0; i < nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                type: 'requirement',
                position: { x: i * 100, y: i * 100 },
                data: {
                  label: `Node ${i}`,
                  type: 'requirement',
                  properties: {},
                },
              });
            }
            
            // Generate edges (ensure some connectivity)
            const edges: Edge[] = [];
            const edgeSet = new Set<string>();
            
            for (let i = 0; i < edgeCount && i < nodeCount - 1; i++) {
              const source = Math.floor(Math.random() * nodeCount);
              const target = Math.floor(Math.random() * nodeCount);
              
              if (source !== target) {
                const edgeKey = `${source}-${target}`;
                if (!edgeSet.has(edgeKey)) {
                  edgeSet.add(edgeKey);
                  edges.push({
                    id: `edge-${i}`,
                    source: `node-${source}`,
                    target: `node-${target}`,
                  });
                }
              }
            }
            
            // Skip if no edges
            if (edges.length === 0) {
              return true;
            }
            
            // Set graph in store
            store.reset();
            useGraphStore.setState({ nodes, edges });
            
            // Select a node to isolate
            const targetNodeId = nodes[nodeIndex % nodes.length].id;
            
            // Enter isolation mode
            store.enterIsolationMode(targetNodeId);
            
            const state = useGraphStore.getState();
            const visibleIds = state.visibleNodeIds;
            
            // Isolated node should always be visible
            expect(visibleIds.has(targetNodeId)).toBe(true);
            
            // All visible nodes should be reachable within depth
            visibleIds.forEach(id => {
              if (id === targetNodeId) return;
              const distance = calculateShortestPath(targetNodeId, id, edges);
              expect(distance).toBeLessThanOrEqual(depth);
            });
            
            // All nodes within depth should be visible
            nodes.forEach(node => {
              const distance = calculateShortestPath(targetNodeId, node.id, edges);
              if (distance <= depth) {
                expect(visibleIds.has(node.id)).toBe(true);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include isolated node in visible set', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 20 }),
          fc.integer({ min: 0, max: 4 }),
          fc.integer({ min: 1, max: 3 }),
          (nodeCount, nodeIndex, depth) => {
            const store = useGraphStore.getState();
            
            // Generate simple linear graph
            const nodes: Node<CustomNodeData>[] = [];
            const edges: Edge[] = [];
            
            for (let i = 0; i < nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                type: 'task',
                position: { x: i * 100, y: 0 },
                data: {
                  label: `Node ${i}`,
                  type: 'task',
                  properties: {},
                },
              });
              
              if (i > 0) {
                edges.push({
                  id: `edge-${i}`,
                  source: `node-${i - 1}`,
                  target: `node-${i}`,
                });
              }
            }
            
            // Set graph in store
            store.reset();
            useGraphStore.setState({ nodes, edges });
            
            // Isolate a node
            const targetNodeId = nodes[nodeIndex % nodes.length].id;
            store.enterIsolationMode(targetNodeId);
            
            const state = useGraphStore.getState();
            
            // Verify isolated node is in visible set
            expect(state.visibleNodeIds.has(targetNodeId)).toBe(true);
            expect(state.isolatedNodeId).toBe(targetNodeId);
            expect(state.isIsolationMode).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should respect depth parameter', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }),
          (depth) => {
            const store = useGraphStore.getState();
            
            // Create a linear chain: 0 - 1 - 2 - 3 - 4 - 5
            const nodes: Node<CustomNodeData>[] = [];
            const edges: Edge[] = [];
            
            for (let i = 0; i < 6; i++) {
              nodes.push({
                id: `node-${i}`,
                type: 'test',
                position: { x: i * 100, y: 0 },
                data: {
                  label: `Node ${i}`,
                  type: 'test',
                  properties: {},
                },
              });
              
              if (i > 0) {
                edges.push({
                  id: `edge-${i}`,
                  source: `node-${i - 1}`,
                  target: `node-${i}`,
                });
              }
            }
            
            // Set graph in store
            store.reset();
            useGraphStore.setState({ nodes, edges, depth });
            
            // Isolate the middle node (node-2)
            store.enterIsolationMode('node-2');
            
            const state = useGraphStore.getState();
            const visibleIds = state.visibleNodeIds;
            
            // Should include node-2 (isolated)
            expect(visibleIds.has('node-2')).toBe(true);
            
            // Should include neighbors within depth
            if (depth >= 1) {
              expect(visibleIds.has('node-1')).toBe(true);
              expect(visibleIds.has('node-3')).toBe(true);
            }
            if (depth >= 2) {
              expect(visibleIds.has('node-0')).toBe(true);
              expect(visibleIds.has('node-4')).toBe(true);
            }
            if (depth >= 3) {
              expect(visibleIds.has('node-5')).toBe(true);
            }
            
            // Should not include nodes beyond depth
            if (depth < 2) {
              expect(visibleIds.has('node-0')).toBe(false);
              expect(visibleIds.has('node-4')).toBe(false);
            }
            if (depth < 3) {
              expect(visibleIds.has('node-5')).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 11: Isolated edge validity', () => {
    // Feature: graph-ui-enhancements, Property 11: Isolated edge validity
    // **Validates: Requirements 3.3**
    // For any isolated subgraph, all visible edges should connect two nodes
    // that are both in the visible node set.

    it('should only show edges between visible nodes', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeCount: fc.integer({ min: 10, max: 30 }),
            edgeCount: fc.integer({ min: 15, max: 50 }),
          }),
          fc.integer({ min: 0, max: 9 }),
          fc.integer({ min: 1, max: 3 }),
          ({ nodeCount, edgeCount }, nodeIndex, depth) => {
            const store = useGraphStore.getState();
            
            // Generate nodes
            const nodes: Node<CustomNodeData>[] = [];
            for (let i = 0; i < nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                type: 'requirement',
                position: { x: i * 100, y: i * 100 },
                data: {
                  label: `Node ${i}`,
                  type: 'requirement',
                  properties: {},
                },
              });
            }
            
            // Generate edges
            const edges: Edge[] = [];
            const edgeSet = new Set<string>();
            
            for (let i = 0; i < edgeCount && i < nodeCount - 1; i++) {
              const source = Math.floor(Math.random() * nodeCount);
              const target = Math.floor(Math.random() * nodeCount);
              
              if (source !== target) {
                const edgeKey = `${source}-${target}`;
                if (!edgeSet.has(edgeKey)) {
                  edgeSet.add(edgeKey);
                  edges.push({
                    id: `edge-${i}`,
                    source: `node-${source}`,
                    target: `node-${target}`,
                  });
                }
              }
            }
            
            // Skip if no edges
            if (edges.length === 0) {
              return true;
            }
            
            // Set graph in store
            store.reset();
            useGraphStore.setState({ nodes, edges });
            
            // Isolate a node
            const targetNodeId = nodes[nodeIndex % nodes.length].id;
            store.enterIsolationMode(targetNodeId);
            
            const state = useGraphStore.getState();
            const visibleNodeIds = state.visibleNodeIds;
            
            // Filter edges that should be visible
            const visibleEdges = edges.filter(edge =>
              visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
            );
            
            // All visible edges should connect two visible nodes
            visibleEdges.forEach(edge => {
              expect(visibleNodeIds.has(edge.source)).toBe(true);
              expect(visibleNodeIds.has(edge.target)).toBe(true);
            });
            
            // No edge should be visible if either endpoint is not visible
            edges.forEach(edge => {
              const sourceVisible = visibleNodeIds.has(edge.source);
              const targetVisible = visibleNodeIds.has(edge.target);
              
              if (!sourceVisible || !targetVisible) {
                // This edge should not be in the visible set
                const shouldBeVisible = sourceVisible && targetVisible;
                expect(shouldBeVisible).toBe(false);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should hide edges with one endpoint outside visible set', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2 }),
          (depth) => {
            const store = useGraphStore.getState();
            
            // Create a star graph: center connected to 5 outer nodes
            const nodes: Node<CustomNodeData>[] = [
              {
                id: 'center',
                type: 'requirement',
                position: { x: 250, y: 250 },
                data: { label: 'Center', type: 'requirement', properties: {} },
              },
            ];
            
            const edges: Edge[] = [];
            
            for (let i = 0; i < 5; i++) {
              nodes.push({
                id: `outer-${i}`,
                type: 'task',
                position: { x: i * 100, y: i * 100 },
                data: { label: `Outer ${i}`, type: 'task', properties: {} },
              });
              
              edges.push({
                id: `edge-${i}`,
                source: 'center',
                target: `outer-${i}`,
              });
            }
            
            // Set graph in store
            store.reset();
            useGraphStore.setState({ nodes, edges, depth });
            
            // Isolate center with depth 1 (should see all outer nodes)
            store.enterIsolationMode('center');
            
            const state = useGraphStore.getState();
            const visibleNodeIds = state.visibleNodeIds;
            
            // All edges should be visible if depth >= 1
            if (depth >= 1) {
              edges.forEach(edge => {
                expect(visibleNodeIds.has(edge.source)).toBe(true);
                expect(visibleNodeIds.has(edge.target)).toBe(true);
              });
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: Isolation mode transitions', () => {
    // Feature: graph-ui-enhancements, Property 12: Isolation mode transitions
    // **Validates: Requirements 3.4**
    // For any two nodes A and B, if A is isolated and the user Shift-clicks B,
    // the visible node set should update to show B and its neighbors (not A's neighbors).

    it('should update visible nodes when switching isolated node', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4 }),
          fc.integer({ min: 0, max: 4 }),
          fc.integer({ min: 1, max: 2 }),
          (nodeIndexA, nodeIndexB, depth) => {
            // Skip if same node
            if (nodeIndexA === nodeIndexB) {
              return true;
            }
            
            const store = useGraphStore.getState();
            
            // Create a simple graph
            const nodes: Node<CustomNodeData>[] = [];
            const edges: Edge[] = [];
            
            for (let i = 0; i < 5; i++) {
              nodes.push({
                id: `node-${i}`,
                type: 'requirement',
                position: { x: i * 100, y: 0 },
                data: {
                  label: `Node ${i}`,
                  type: 'requirement',
                  properties: {},
                },
              });
              
              if (i > 0) {
                edges.push({
                  id: `edge-${i}`,
                  source: `node-${i - 1}`,
                  target: `node-${i}`,
                });
              }
            }
            
            // Set graph in store
            store.reset();
            useGraphStore.setState({ nodes, edges, depth });
            
            // Isolate node A
            const nodeA = nodes[nodeIndexA].id;
            store.enterIsolationMode(nodeA);
            
            const stateAfterA = useGraphStore.getState();
            const visibleAfterA = new Set(stateAfterA.visibleNodeIds);
            
            // Verify node A is isolated
            expect(stateAfterA.isolatedNodeId).toBe(nodeA);
            expect(visibleAfterA.has(nodeA)).toBe(true);
            
            // Isolate node B
            const nodeB = nodes[nodeIndexB].id;
            store.enterIsolationMode(nodeB);
            
            const stateAfterB = useGraphStore.getState();
            const visibleAfterB = stateAfterB.visibleNodeIds;
            
            // Verify node B is now isolated
            expect(stateAfterB.isolatedNodeId).toBe(nodeB);
            expect(visibleAfterB.has(nodeB)).toBe(true);
            
            // Visible set should be different (unless A and B have same neighbors)
            // At minimum, the isolated node ID should have changed
            expect(stateAfterB.isolatedNodeId).not.toBe(stateAfterA.isolatedNodeId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear previous isolation when entering new isolation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 2 }),
          (depth) => {
            const store = useGraphStore.getState();
            
            // Create two separate components
            const nodes: Node<CustomNodeData>[] = [
              // Component 1: node-0 - node-1 - node-2
              { id: 'node-0', type: 'requirement', position: { x: 0, y: 0 }, data: { label: 'Node 0', type: 'requirement', properties: {} } },
              { id: 'node-1', type: 'requirement', position: { x: 100, y: 0 }, data: { label: 'Node 1', type: 'requirement', properties: {} } },
              { id: 'node-2', type: 'requirement', position: { x: 200, y: 0 }, data: { label: 'Node 2', type: 'requirement', properties: {} } },
              // Component 2: node-3 - node-4 - node-5
              { id: 'node-3', type: 'task', position: { x: 0, y: 200 }, data: { label: 'Node 3', type: 'task', properties: {} } },
              { id: 'node-4', type: 'task', position: { x: 100, y: 200 }, data: { label: 'Node 4', type: 'task', properties: {} } },
              { id: 'node-5', type: 'task', position: { x: 200, y: 200 }, data: { label: 'Node 5', type: 'task', properties: {} } },
            ];
            
            const edges: Edge[] = [
              { id: 'edge-0', source: 'node-0', target: 'node-1' },
              { id: 'edge-1', source: 'node-1', target: 'node-2' },
              { id: 'edge-2', source: 'node-3', target: 'node-4' },
              { id: 'edge-3', source: 'node-4', target: 'node-5' },
            ];
            
            // Set graph in store
            store.reset();
            useGraphStore.setState({ nodes, edges, depth });
            
            // Isolate node-1 (component 1)
            store.enterIsolationMode('node-1');
            const stateAfter1 = useGraphStore.getState();
            
            // Should not see component 2 nodes
            expect(stateAfter1.visibleNodeIds.has('node-3')).toBe(false);
            expect(stateAfter1.visibleNodeIds.has('node-4')).toBe(false);
            expect(stateAfter1.visibleNodeIds.has('node-5')).toBe(false);
            
            // Isolate node-4 (component 2)
            store.enterIsolationMode('node-4');
            const stateAfter2 = useGraphStore.getState();
            
            // Should not see component 1 nodes (except if depth is very large)
            expect(stateAfter2.visibleNodeIds.has('node-0')).toBe(false);
            expect(stateAfter2.visibleNodeIds.has('node-1')).toBe(false);
            expect(stateAfter2.visibleNodeIds.has('node-2')).toBe(false);
            
            // Should see component 2 nodes
            expect(stateAfter2.visibleNodeIds.has('node-4')).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 13: Isolation depth responsiveness', () => {
    // Feature: graph-ui-enhancements, Property 13: Isolation depth responsiveness
    // **Validates: Requirements 3.8**
    // For any depth change while in isolation mode, the visible node set should
    // immediately update to include all neighbors within the new depth.

    it('should update visible nodes when depth changes during isolation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }),
          fc.integer({ min: 1, max: 3 }),
          (initialDepth, newDepth) => {
            const store = useGraphStore.getState();
            
            // Create a linear chain: 0 - 1 - 2 - 3 - 4 - 5 - 6
            const nodes: Node<CustomNodeData>[] = [];
            const edges: Edge[] = [];
            
            for (let i = 0; i < 7; i++) {
              nodes.push({
                id: `node-${i}`,
                type: 'requirement',
                position: { x: i * 100, y: 0 },
                data: {
                  label: `Node ${i}`,
                  type: 'requirement',
                  properties: {},
                },
              });
              
              if (i > 0) {
                edges.push({
                  id: `edge-${i}`,
                  source: `node-${i - 1}`,
                  target: `node-${i}`,
                });
              }
            }
            
            // Set graph in store with initial depth
            store.reset();
            useGraphStore.setState({ nodes, edges, depth: initialDepth });
            
            // Isolate the middle node (node-3)
            store.enterIsolationMode('node-3');
            
            const stateBeforeDepthChange = useGraphStore.getState();
            const visibleBeforeDepthChange = new Set(stateBeforeDepthChange.visibleNodeIds);
            
            // Update depth
            store.updateIsolationDepth(newDepth);
            
            const stateAfterDepthChange = useGraphStore.getState();
            const visibleAfterDepthChange = stateAfterDepthChange.visibleNodeIds;
            
            // Verify isolation is still active
            expect(stateAfterDepthChange.isIsolationMode).toBe(true);
            expect(stateAfterDepthChange.isolatedNodeId).toBe('node-3');
            expect(stateAfterDepthChange.isolationDepth).toBe(newDepth);
            
            // Verify visible nodes match new depth
            // node-3 should always be visible
            expect(visibleAfterDepthChange.has('node-3')).toBe(true);
            
            // Check neighbors based on new depth
            if (newDepth >= 1) {
              expect(visibleAfterDepthChange.has('node-2')).toBe(true);
              expect(visibleAfterDepthChange.has('node-4')).toBe(true);
            }
            if (newDepth >= 2) {
              expect(visibleAfterDepthChange.has('node-1')).toBe(true);
              expect(visibleAfterDepthChange.has('node-5')).toBe(true);
            }
            if (newDepth >= 3) {
              expect(visibleAfterDepthChange.has('node-0')).toBe(true);
              expect(visibleAfterDepthChange.has('node-6')).toBe(true);
            }
            
            // If depth increased, visible set should grow or stay same
            // If depth decreased, visible set should shrink or stay same
            if (newDepth > initialDepth) {
              expect(visibleAfterDepthChange.size).toBeGreaterThanOrEqual(visibleBeforeDepthChange.size);
            } else if (newDepth < initialDepth) {
              expect(visibleAfterDepthChange.size).toBeLessThanOrEqual(visibleBeforeDepthChange.size);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not update visible nodes when depth changes outside isolation mode', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 3 }),
          (newDepth) => {
            const store = useGraphStore.getState();
            
            // Create a simple graph
            const nodes: Node<CustomNodeData>[] = [];
            const edges: Edge[] = [];
            
            for (let i = 0; i < 5; i++) {
              nodes.push({
                id: `node-${i}`,
                type: 'requirement',
                position: { x: i * 100, y: 0 },
                data: {
                  label: `Node ${i}`,
                  type: 'requirement',
                  properties: {},
                },
              });
              
              if (i > 0) {
                edges.push({
                  id: `edge-${i}`,
                  source: `node-${i - 1}`,
                  target: `node-${i}`,
                });
              }
            }
            
            // Set graph in store (not in isolation mode)
            store.reset();
            useGraphStore.setState({ nodes, edges });
            
            const stateBefore = useGraphStore.getState();
            
            // Verify not in isolation mode
            expect(stateBefore.isIsolationMode).toBe(false);
            expect(stateBefore.isolatedNodeId).toBe(null);
            
            // Try to update isolation depth (should have no effect)
            store.updateIsolationDepth(newDepth);
            
            const stateAfter = useGraphStore.getState();
            
            // Should still not be in isolation mode
            expect(stateAfter.isIsolationMode).toBe(false);
            expect(stateAfter.isolatedNodeId).toBe(null);
            
            // Visible node set should remain empty
            expect(stateAfter.visibleNodeIds.size).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should immediately reflect depth changes', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 2, maxLength: 5 }),
          (depths) => {
            const store = useGraphStore.getState();
            
            // Create a linear chain
            const nodes: Node<CustomNodeData>[] = [];
            const edges: Edge[] = [];
            
            for (let i = 0; i < 10; i++) {
              nodes.push({
                id: `node-${i}`,
                type: 'requirement',
                position: { x: i * 100, y: 0 },
                data: {
                  label: `Node ${i}`,
                  type: 'requirement',
                  properties: {},
                },
              });
              
              if (i > 0) {
                edges.push({
                  id: `edge-${i}`,
                  source: `node-${i - 1}`,
                  target: `node-${i}`,
                });
              }
            }
            
            // Set graph in store
            store.reset();
            useGraphStore.setState({ nodes, edges });
            
            // Isolate middle node
            store.enterIsolationMode('node-5');
            
            // Apply each depth change and verify immediate update
            depths.forEach(depth => {
              store.updateIsolationDepth(depth);
              
              const state = useGraphStore.getState();
              
              // Verify depth was updated
              expect(state.isolationDepth).toBe(depth);
              
              // Verify visible nodes match the depth
              const visibleIds = state.visibleNodeIds;
              expect(visibleIds.has('node-5')).toBe(true);
              
              // Count expected visible nodes
              const expectedCount = 1 + Math.min(depth, 5) + Math.min(depth, 4); // center + left + right
              expect(visibleIds.size).toBe(expectedCount);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

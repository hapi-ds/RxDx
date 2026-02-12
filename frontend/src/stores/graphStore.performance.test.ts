/**
 * Performance tests for graph store
 * 
 * Tests graph rendering with large datasets and enforces 1000 node limit
 * (Requirement 13.4)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGraphStore } from './graphStore';
import * as graphService from '../services/graphService';
import type { GraphNode, GraphEdge } from '../services/graphService';

// Mock the graph service
vi.mock('../services/graphService', () => ({
  graphService: {
    getVisualization: vi.fn(),
    search: vi.fn(),
    createRelationship: vi.fn(),
    updateRelationship: vi.fn(),
    deleteRelationship: vi.fn(),
    getAvailableNodeTypes: vi.fn(),
  },
}));

describe('Graph Store Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useGraphStore.getState().reset();
  });

  /**
   * Helper function to generate mock graph data
   */
  function generateMockGraphData(nodeCount: number, edgeCount: number) {
    const nodes: GraphNode[] = Array.from({ length: nodeCount }, (_, i) => ({
      id: `node-${i}`,
      type: 'WorkItem',
      label: `Node ${i}`,
      properties: {
        title: `Node ${i}`,
        description: `Description for node ${i}`,
      },
      position: {
        x: Math.random() * 1000,
        y: Math.random() * 1000,
      },
    }));

    const edges: GraphEdge[] = Array.from({ length: edgeCount }, (_, i) => ({
      id: `edge-${i}`,
      source: `node-${i % nodeCount}`,
      target: `node-${(i + 1) % nodeCount}`,
      type: 'RELATES_TO',
      label: 'relates to',
      properties: {},
    }));

    return { nodes, edges };
  }

  it('should load graph with 100 nodes within reasonable time', async () => {
    const mockData = generateMockGraphData(100, 150);
    vi.mocked(graphService.graphService.getVisualization).mockResolvedValue(mockData);

    const store = useGraphStore.getState();

    // Measure load time
    const startTime = performance.now();
    
    await store.loadGraph('node-0', 2);
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify data was loaded
    const state = useGraphStore.getState();
    expect(state.nodes.length).toBe(100);
    expect(state.edges.length).toBe(150);

    // Verify load time is reasonable (under 1000ms)
    expect(duration).toBeLessThan(1000);
    console.log(`Load time for 100 nodes: ${duration.toFixed(2)}ms`);
  });

  it('should load graph with 500 nodes within reasonable time', async () => {
    const mockData = generateMockGraphData(500, 750);
    vi.mocked(graphService.graphService.getVisualization).mockResolvedValue(mockData);

    const store = useGraphStore.getState();

    // Measure load time
    const startTime = performance.now();
    
    await store.loadGraph('node-0', 2);
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify data was loaded
    const state = useGraphStore.getState();
    expect(state.nodes.length).toBe(500);
    expect(state.edges.length).toBe(750);

    // Verify load time is reasonable (under 2000ms)
    expect(duration).toBeLessThan(2000);
    console.log(`Load time for 500 nodes: ${duration.toFixed(2)}ms`);
  });

  it('should enforce 1000 node limit (Requirement 13.4)', async () => {
    const mockData = generateMockGraphData(1500, 2000);
    vi.mocked(graphService.graphService.getVisualization).mockResolvedValue(mockData);

    const store = useGraphStore.getState();

    await store.loadGraph('node-0', 2);

    // Verify only 1000 nodes are loaded
    const state = useGraphStore.getState();
    expect(state.nodes.length).toBe(1000);
    expect(state.nodes.length).toBeLessThanOrEqual(1000);

    // Verify warning message is set
    expect(state.error).toContain('1500 nodes');
    expect(state.error).toContain('1000 nodes');
    expect(state.error).toContain('filter');

    console.log('1000 node limit enforced successfully');
  });

  it('should load graph with exactly 1000 nodes without warning', async () => {
    const mockData = generateMockGraphData(1000, 1500);
    vi.mocked(graphService.graphService.getVisualization).mockResolvedValue(mockData);

    const store = useGraphStore.getState();

    await store.loadGraph('node-0', 2);

    // Verify all 1000 nodes are loaded
    const state = useGraphStore.getState();
    expect(state.nodes.length).toBe(1000);

    // Verify no warning message
    expect(state.error).toBeNull();

    console.log('Loaded exactly 1000 nodes without warning');
  });

  it('should filter nodes efficiently with large dataset', async () => {
    const mockData = generateMockGraphData(1000, 1500);
    vi.mocked(graphService.graphService.getVisualization).mockResolvedValue(mockData);

    const store = useGraphStore.getState();
    await store.loadGraph('node-0', 2);

    // Measure filter time
    const startTime = performance.now();
    
    // Toggle filter to hide WorkItem nodes
    store.toggleNodeTypeFilter('WorkItem');
    
    // Get filtered nodes
    const filteredNodes = store.getFilteredNodes();
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify filtering worked (all nodes should be hidden since they're all WorkItem type)
    expect(filteredNodes.length).toBe(0);

    // Verify filter time is under 500ms (Requirement 13.1)
    expect(duration).toBeLessThan(500);
    console.log(`Filter time for 1000 nodes: ${duration.toFixed(2)}ms`);
  });

  it('should get filtered edges efficiently with large dataset', async () => {
    const mockData = generateMockGraphData(1000, 1500);
    vi.mocked(graphService.graphService.getVisualization).mockResolvedValue(mockData);

    const store = useGraphStore.getState();
    await store.loadGraph('node-0', 2);

    // Measure filter time
    const startTime = performance.now();
    
    // Toggle filter to hide WorkItem nodes
    store.toggleNodeTypeFilter('WorkItem');
    
    // Get filtered edges
    const filteredEdges = store.getFilteredEdges();
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify edge filtering worked (all edges should be hidden since all nodes are hidden)
    expect(filteredEdges.length).toBe(0);

    // Verify filter time is under 500ms (Requirement 13.1)
    expect(duration).toBeLessThan(500);
    console.log(`Edge filter time for 1500 edges: ${duration.toFixed(2)}ms`);
  });

  it('should handle multiple filter toggles efficiently', async () => {
    const mockData = generateMockGraphData(500, 750);
    vi.mocked(graphService.graphService.getVisualization).mockResolvedValue(mockData);

    const store = useGraphStore.getState();
    await store.loadGraph('node-0', 2);

    // Measure time for multiple filter toggles
    const startTime = performance.now();
    
    store.toggleNodeTypeFilter('WorkItem');
    store.getFilteredNodes();
    
    store.toggleNodeTypeFilter('Project');
    store.getFilteredNodes();
    
    store.toggleNodeTypeFilter('Phase');
    store.getFilteredNodes();
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify total time for 3 filter operations is reasonable (under 1500ms)
    expect(duration).toBeLessThan(1500);
    console.log(`Time for 3 filter operations on 500 nodes: ${duration.toFixed(2)}ms`);
  });

  it('should update node position efficiently', async () => {
    const mockData = generateMockGraphData(100, 150);
    vi.mocked(graphService.graphService.getVisualization).mockResolvedValue(mockData);

    const store = useGraphStore.getState();
    await store.loadGraph('node-0', 2);

    // Measure time to update node position
    const startTime = performance.now();
    
    store.updateNodePosition('node-0', { x: 100, y: 200 });
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify position was updated
    const state = useGraphStore.getState();
    const nodePosition = state.nodePositions.get('node-0');
    expect(nodePosition?.position2D.x).toBe(100);
    expect(nodePosition?.position2D.y).toBe(200);

    // Verify update time is very fast (under 50ms)
    expect(duration).toBeLessThan(50);
    console.log(`Node position update time: ${duration.toFixed(2)}ms`);
  });

  it('should sync positions between 2D and 3D efficiently', async () => {
    const mockData = generateMockGraphData(100, 150);
    vi.mocked(graphService.graphService.getVisualization).mockResolvedValue(mockData);

    const store = useGraphStore.getState();
    await store.loadGraph('node-0', 2);

    // Measure time to sync positions
    const startTime = performance.now();
    
    store.syncPositions2Dto3D();
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify sync completed
    const state = useGraphStore.getState();
    expect(state.nodePositions.size).toBe(100);

    // Verify sync time is reasonable (under 500ms for 100 nodes)
    expect(duration).toBeLessThan(500);
    console.log(`Position sync time for 100 nodes: ${duration.toFixed(2)}ms`);
  });

  it('should handle view mode switch efficiently', async () => {
    const mockData = generateMockGraphData(100, 150);
    vi.mocked(graphService.graphService.getVisualization).mockResolvedValue(mockData);

    const store = useGraphStore.getState();
    await store.loadGraph('node-0', 2);

    // Measure time to switch view mode
    const startTime = performance.now();
    
    store.setViewMode('3d');
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify view mode was changed
    const state = useGraphStore.getState();
    expect(state.viewMode).toBe('3d');

    // Verify switch time is very fast (under 100ms)
    expect(duration).toBeLessThan(100);
    console.log(`View mode switch time: ${duration.toFixed(2)}ms`);
  });
});

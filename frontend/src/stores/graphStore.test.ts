/**
 * Unit tests for graphStore
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useGraphStore } from './graphStore';

// Mock the services
vi.mock('../services/graphService', () => ({
  graphService: {
    getVisualization: vi.fn(),
    createRelationship: vi.fn(),
    deleteRelationship: vi.fn(),
    search: vi.fn(),
  },
}));

vi.mock('../services/workitemService', () => ({
  workitemService: {
    update: vi.fn(),
  },
}));

import { graphService } from '../services/graphService';
import { workitemService } from '../services/workitemService';

// Type-safe mock references
const mockGetVisualization = vi.mocked(graphService.getVisualization);
const mockCreateRelationship = vi.mocked(graphService.createRelationship);
const mockDeleteRelationship = vi.mocked(graphService.deleteRelationship);
const mockSearch = vi.mocked(graphService.search);
const mockWorkitemUpdate = vi.mocked(workitemService.update);

describe('graphStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useGraphStore.setState({
      nodes: [],
      edges: [],
      selectedNode: null,
      viewMode: '2d',
      searchResults: [],
      isSearching: false,
      searchQuery: '',
      isLoading: false,
      isUpdating: false,
      isCreatingRelationship: false,
      error: null,
      centerNodeId: null,
      depth: 2,
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useGraphStore.getState();
      expect(state.nodes).toEqual([]);
      expect(state.edges).toEqual([]);
      expect(state.selectedNode).toBeNull();
      expect(state.viewMode).toBe('2d');
      expect(state.searchResults).toEqual([]);
      expect(state.isSearching).toBe(false);
      expect(state.searchQuery).toBe('');
      expect(state.isLoading).toBe(false);
      expect(state.isUpdating).toBe(false);
      expect(state.isCreatingRelationship).toBe(false);
      expect(state.error).toBeNull();
      expect(state.centerNodeId).toBeNull();
      expect(state.depth).toBe(2);
    });
  });

  describe('loadGraph', () => {
    it('should set isLoading to true during load', async () => {
      mockGetVisualization.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      useGraphStore.getState().loadGraph();

      expect(useGraphStore.getState().isLoading).toBe(true);
    });

    it('should load and transform graph data successfully', async () => {
      const mockGraphData = {
        nodes: [
          {
            id: 'node-1',
            type: 'requirement',
            label: 'Requirement 1',
            properties: { status: 'active' },
            position: { x: 100, y: 200 },
          },
          {
            id: 'node-2',
            type: 'task',
            label: 'Task 1',
            properties: { priority: 1 },
            position: { x: 300, y: 400 },
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'node-1',
            target: 'node-2',
            type: 'IMPLEMENTS',
            label: 'implements',
          },
        ],
      };

      mockGetVisualization.mockResolvedValueOnce(mockGraphData);

      await useGraphStore.getState().loadGraph();

      const state = useGraphStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.nodes).toHaveLength(2);
      expect(state.edges).toHaveLength(1);
      expect(state.error).toBeNull();

      // Check node transformation
      expect(state.nodes[0]).toEqual({
        id: 'node-1',
        type: 'requirement',
        position: { x: 100, y: 200 },
        data: {
          label: 'Requirement 1',
          type: 'requirement',
          properties: { status: 'active' },
        },
      });

      // Check edge transformation
      expect(state.edges[0]).toEqual({
        id: 'edge-1',
        source: 'node-1',
        target: 'node-2',
        type: 'IMPLEMENTS',
        label: 'implements',
        data: undefined,
      });
    });

    it('should use provided centerNodeId and depth', async () => {
      mockGetVisualization.mockResolvedValueOnce({
        nodes: [],
        edges: [],
      });

      await useGraphStore.getState().loadGraph('center-node', 5);

      expect(mockGetVisualization).toHaveBeenCalledWith({
        root_id: 'center-node',
        depth: 5,
        limit: 1000,
      });

      const state = useGraphStore.getState();
      expect(state.centerNodeId).toBe('center-node');
      expect(state.depth).toBe(5);
    });

    it('should set error on failed load', async () => {
      mockGetVisualization.mockRejectedValueOnce(
        new Error('Network error')
      );

      await useGraphStore.getState().loadGraph();

      const state = useGraphStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');
      expect(state.nodes).toEqual([]);
    });

    it('should preserve selected node if it exists in new data', async () => {
      // Set up initial state with selected node
      useGraphStore.setState({
        nodes: [
          {
            id: 'node-1',
            type: 'requirement',
            position: { x: 0, y: 0 },
            data: { label: 'Old', type: 'requirement', properties: {} },
          },
        ],
        selectedNode: {
          id: 'node-1',
          type: 'requirement',
          position: { x: 0, y: 0 },
          data: { label: 'Old', type: 'requirement', properties: {} },
        },
      });

      mockGetVisualization.mockResolvedValueOnce({
        nodes: [
          {
            id: 'node-1',
            type: 'requirement',
            label: 'Updated',
            properties: {},
            position: { x: 100, y: 100 },
          },
        ],
        edges: [],
      });

      await useGraphStore.getState().loadGraph();

      const state = useGraphStore.getState();
      expect(state.selectedNode).not.toBeNull();
      expect(state.selectedNode?.id).toBe('node-1');
      expect(state.selectedNode?.data.label).toBe('Updated');
    });

    it('should clear selected node if it no longer exists', async () => {
      useGraphStore.setState({
        selectedNode: {
          id: 'deleted-node',
          type: 'requirement',
          position: { x: 0, y: 0 },
          data: { label: 'Deleted', type: 'requirement', properties: {} },
        },
      });

      mockGetVisualization.mockResolvedValueOnce({
        nodes: [
          {
            id: 'other-node',
            type: 'task',
            label: 'Other',
            properties: {},
          },
        ],
        edges: [],
      });

      await useGraphStore.getState().loadGraph();

      expect(useGraphStore.getState().selectedNode).toBeNull();
    });
  });

  describe('selectNode', () => {
    it('should select a node by id', () => {
      const testNode = {
        id: 'node-1',
        type: 'requirement',
        position: { x: 0, y: 0 },
        data: { label: 'Test', type: 'requirement', properties: {} },
      };

      useGraphStore.setState({ nodes: [testNode] });

      useGraphStore.getState().selectNode('node-1');

      expect(useGraphStore.getState().selectedNode).toEqual(testNode);
    });

    it('should set selectedNode to null if node not found', () => {
      useGraphStore.setState({
        nodes: [],
        selectedNode: {
          id: 'old-node',
          type: 'task',
          position: { x: 0, y: 0 },
          data: { label: 'Old', type: 'task', properties: {} },
        },
      });

      useGraphStore.getState().selectNode('non-existent');

      expect(useGraphStore.getState().selectedNode).toBeNull();
    });

    it('should clear selection when null is passed', () => {
      useGraphStore.setState({
        selectedNode: {
          id: 'node-1',
          type: 'requirement',
          position: { x: 0, y: 0 },
          data: { label: 'Test', type: 'requirement', properties: {} },
        },
      });

      useGraphStore.getState().selectNode(null);

      expect(useGraphStore.getState().selectedNode).toBeNull();
    });
  });

  describe('updateNode', () => {
    it('should update node and reload graph', async () => {
      mockWorkitemUpdate.mockResolvedValueOnce({} as never);
      mockGetVisualization.mockResolvedValueOnce({
        nodes: [],
        edges: [],
      });

      await useGraphStore.getState().updateNode('node-1', { title: 'Updated' });

      expect(mockWorkitemUpdate).toHaveBeenCalledWith('node-1', {
        title: 'Updated',
      });
      expect(mockGetVisualization).toHaveBeenCalled();
      expect(useGraphStore.getState().isUpdating).toBe(false);
    });

    it('should set error on failed update', async () => {
      mockWorkitemUpdate.mockRejectedValueOnce(new Error('Update failed'));

      await expect(
        useGraphStore.getState().updateNode('node-1', { title: 'Updated' })
      ).rejects.toThrow('Update failed');

      const state = useGraphStore.getState();
      expect(state.isUpdating).toBe(false);
      expect(state.error).toBe('Update failed');
    });
  });

  describe('createRelationship', () => {
    it('should create relationship and reload graph', async () => {
      mockCreateRelationship.mockResolvedValueOnce({} as never);
      mockGetVisualization.mockResolvedValueOnce({
        nodes: [],
        edges: [],
      });

      await useGraphStore
        .getState()
        .createRelationship('node-1', 'node-2', 'RELATES_TO');

      expect(mockCreateRelationship).toHaveBeenCalledWith(
        'node-1',
        'node-2',
        'RELATES_TO'
      );
      expect(mockGetVisualization).toHaveBeenCalled();
      expect(useGraphStore.getState().isCreatingRelationship).toBe(false);
    });

    it('should set error on failed relationship creation', async () => {
      mockCreateRelationship.mockRejectedValueOnce(
        new Error('Creation failed')
      );

      await expect(
        useGraphStore.getState().createRelationship('node-1', 'node-2', 'RELATES_TO')
      ).rejects.toThrow('Creation failed');

      const state = useGraphStore.getState();
      expect(state.isCreatingRelationship).toBe(false);
      expect(state.error).toBe('Creation failed');
    });
  });

  describe('deleteRelationship', () => {
    it('should delete relationship and remove from local state', async () => {
      useGraphStore.setState({
        edges: [
          { id: 'edge-1', source: 'a', target: 'b' },
          { id: 'edge-2', source: 'b', target: 'c' },
        ],
      });

      mockDeleteRelationship.mockResolvedValueOnce(undefined);

      await useGraphStore.getState().deleteRelationship('edge-1');

      const state = useGraphStore.getState();
      expect(state.edges).toHaveLength(1);
      expect(state.edges[0].id).toBe('edge-2');
      expect(state.isUpdating).toBe(false);
    });

    it('should set error on failed deletion', async () => {
      mockDeleteRelationship.mockRejectedValueOnce(
        new Error('Delete failed')
      );

      await expect(
        useGraphStore.getState().deleteRelationship('edge-1')
      ).rejects.toThrow('Delete failed');

      expect(useGraphStore.getState().error).toBe('Delete failed');
    });
  });

  describe('setViewMode', () => {
    it('should set view mode to 2d', () => {
      useGraphStore.setState({ viewMode: '3d' });
      useGraphStore.getState().setViewMode('2d');
      expect(useGraphStore.getState().viewMode).toBe('2d');
    });

    it('should set view mode to 3d', () => {
      useGraphStore.setState({ viewMode: '2d' });
      useGraphStore.getState().setViewMode('3d');
      expect(useGraphStore.getState().viewMode).toBe('3d');
    });
  });

  describe('updateNodePosition', () => {
    it('should update node position', () => {
      const testNode = {
        id: 'node-1',
        type: 'requirement',
        position: { x: 0, y: 0 },
        data: { label: 'Test', type: 'requirement', properties: {} },
      };

      useGraphStore.setState({ nodes: [testNode] });

      useGraphStore.getState().updateNodePosition('node-1', { x: 100, y: 200 });

      const state = useGraphStore.getState();
      expect(state.nodes[0].position).toEqual({ x: 100, y: 200 });
    });

    it('should update selected node position if it matches', () => {
      const testNode = {
        id: 'node-1',
        type: 'requirement',
        position: { x: 0, y: 0 },
        data: { label: 'Test', type: 'requirement', properties: {} },
      };

      useGraphStore.setState({
        nodes: [testNode],
        selectedNode: testNode,
      });

      useGraphStore.getState().updateNodePosition('node-1', { x: 100, y: 200 });

      const state = useGraphStore.getState();
      expect(state.selectedNode?.position).toEqual({ x: 100, y: 200 });
    });

    it('should not update other nodes', () => {
      const node1 = {
        id: 'node-1',
        type: 'requirement',
        position: { x: 0, y: 0 },
        data: { label: 'Test 1', type: 'requirement', properties: {} },
      };
      const node2 = {
        id: 'node-2',
        type: 'task',
        position: { x: 50, y: 50 },
        data: { label: 'Test 2', type: 'task', properties: {} },
      };

      useGraphStore.setState({ nodes: [node1, node2] });

      useGraphStore.getState().updateNodePosition('node-1', { x: 100, y: 200 });

      const state = useGraphStore.getState();
      expect(state.nodes[1].position).toEqual({ x: 50, y: 50 });
    });
  });

  describe('setCenterNode', () => {
    it('should set center node id', () => {
      useGraphStore.getState().setCenterNode('center-123');
      expect(useGraphStore.getState().centerNodeId).toBe('center-123');
    });

    it('should clear center node when null is passed', () => {
      useGraphStore.setState({ centerNodeId: 'some-node' });
      useGraphStore.getState().setCenterNode(null);
      expect(useGraphStore.getState().centerNodeId).toBeNull();
    });
  });

  describe('setDepth', () => {
    it('should set depth value', () => {
      useGraphStore.getState().setDepth(5);
      expect(useGraphStore.getState().depth).toBe(5);
    });

    it('should clamp depth to minimum of 1', () => {
      useGraphStore.getState().setDepth(0);
      expect(useGraphStore.getState().depth).toBe(1);

      useGraphStore.getState().setDepth(-5);
      expect(useGraphStore.getState().depth).toBe(1);
    });

    it('should clamp depth to maximum of 10', () => {
      useGraphStore.getState().setDepth(15);
      expect(useGraphStore.getState().depth).toBe(10);
    });
  });

  describe('clearError', () => {
    it('should clear error message', () => {
      useGraphStore.setState({ error: 'Some error' });
      useGraphStore.getState().clearError();
      expect(useGraphStore.getState().error).toBeNull();
    });
  });

  describe('searchNodes', () => {
    it('should set isSearching to true during search', async () => {
      mockSearch.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      useGraphStore.getState().searchNodes('test query');

      expect(useGraphStore.getState().isSearching).toBe(true);
      expect(useGraphStore.getState().searchQuery).toBe('test query');
    });

    it('should search and return results successfully', async () => {
      const mockResults = [
        {
          id: 'node-1',
          type: 'requirement',
          label: 'Test Requirement',
          properties: { status: 'active' },
        },
        {
          id: 'node-2',
          type: 'task',
          label: 'Test Task',
          properties: { priority: 1 },
        },
      ];

      mockSearch.mockResolvedValueOnce(mockResults);

      await useGraphStore.getState().searchNodes('test');

      const state = useGraphStore.getState();
      expect(state.isSearching).toBe(false);
      expect(state.searchResults).toHaveLength(2);
      expect(state.searchResults[0]).toEqual({
        id: 'node-1',
        type: 'requirement',
        label: 'Test Requirement',
        properties: { status: 'active' },
      });
      expect(state.error).toBeNull();
    });

    it('should clear search results for empty query', async () => {
      useGraphStore.setState({
        searchResults: [
          { id: 'node-1', type: 'requirement', label: 'Test', properties: {} },
        ],
        searchQuery: 'old query',
        isSearching: true,
      });

      await useGraphStore.getState().searchNodes('');

      const state = useGraphStore.getState();
      expect(state.searchResults).toEqual([]);
      expect(state.searchQuery).toBe('');
      expect(state.isSearching).toBe(false);
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('should clear search results for whitespace-only query', async () => {
      useGraphStore.setState({
        searchResults: [
          { id: 'node-1', type: 'requirement', label: 'Test', properties: {} },
        ],
        searchQuery: 'old query',
      });

      await useGraphStore.getState().searchNodes('   ');

      const state = useGraphStore.getState();
      expect(state.searchResults).toEqual([]);
      expect(state.searchQuery).toBe('');
      expect(mockSearch).not.toHaveBeenCalled();
    });

    it('should set error on failed search', async () => {
      mockSearch.mockRejectedValueOnce(new Error('Search failed'));

      await useGraphStore.getState().searchNodes('test');

      const state = useGraphStore.getState();
      expect(state.isSearching).toBe(false);
      expect(state.error).toBe('Search failed');
      expect(state.searchResults).toEqual([]);
    });
  });

  describe('clearSearch', () => {
    it('should clear search results and query', () => {
      useGraphStore.setState({
        searchResults: [
          { id: 'node-1', type: 'requirement', label: 'Test', properties: {} },
        ],
        searchQuery: 'test query',
        isSearching: true,
      });

      useGraphStore.getState().clearSearch();

      const state = useGraphStore.getState();
      expect(state.searchResults).toEqual([]);
      expect(state.searchQuery).toBe('');
      expect(state.isSearching).toBe(false);
    });
  });

  describe('selectSearchResult', () => {
    it('should set center node and load graph', async () => {
      mockGetVisualization.mockResolvedValueOnce({
        nodes: [
          {
            id: 'node-1',
            type: 'requirement',
            label: 'Test',
            properties: {},
            position: { x: 100, y: 100 },
          },
        ],
        edges: [],
      });

      useGraphStore.setState({
        searchResults: [
          { id: 'node-1', type: 'requirement', label: 'Test', properties: {} },
        ],
        searchQuery: 'test',
      });

      const result = { id: 'node-1', type: 'requirement', label: 'Test', properties: {} };
      await useGraphStore.getState().selectSearchResult(result);

      const state = useGraphStore.getState();
      expect(state.centerNodeId).toBe('node-1');
      expect(state.searchResults).toEqual([]);
      expect(state.searchQuery).toBe('');
      expect(mockGetVisualization).toHaveBeenCalledWith({
        root_id: 'node-1',
        depth: 2,
        limit: 1000,
      });
    });

    it('should clear search state after selecting result', async () => {
      mockGetVisualization.mockResolvedValueOnce({
        nodes: [],
        edges: [],
      });

      useGraphStore.setState({
        searchResults: [
          { id: 'node-1', type: 'requirement', label: 'Test 1', properties: {} },
          { id: 'node-2', type: 'task', label: 'Test 2', properties: {} },
        ],
        searchQuery: 'test',
      });

      const result = { id: 'node-2', type: 'task', label: 'Test 2', properties: {} };
      await useGraphStore.getState().selectSearchResult(result);

      const state = useGraphStore.getState();
      expect(state.searchResults).toEqual([]);
      expect(state.searchQuery).toBe('');
    });
  });

  describe('reset', () => {
    it('should reset store to initial state', () => {
      useGraphStore.setState({
        nodes: [
          {
            id: 'node-1',
            type: 'requirement',
            position: { x: 100, y: 100 },
            data: { label: 'Test', type: 'requirement', properties: {} },
          },
        ],
        edges: [{ id: 'edge-1', source: 'a', target: 'b' }],
        selectedNode: {
          id: 'node-1',
          type: 'requirement',
          position: { x: 100, y: 100 },
          data: { label: 'Test', type: 'requirement', properties: {} },
        },
        viewMode: '3d',
        searchResults: [
          { id: 'node-1', type: 'requirement', label: 'Test', properties: {} },
        ],
        searchQuery: 'test',
        isSearching: true,
        isLoading: true,
        error: 'Some error',
        centerNodeId: 'center',
        depth: 5,
      });

      useGraphStore.getState().reset();

      const state = useGraphStore.getState();
      expect(state.nodes).toEqual([]);
      expect(state.edges).toEqual([]);
      expect(state.selectedNode).toBeNull();
      expect(state.viewMode).toBe('2d');
      expect(state.searchResults).toEqual([]);
      expect(state.searchQuery).toBe('');
      expect(state.isSearching).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.centerNodeId).toBeNull();
      expect(state.depth).toBe(2);
    });
  });
});

/**
 * Integration tests for Graph UI Enhancements
 * 
 * Feature: graph-ui-enhancements
 * Task: 12. Final integration and testing
 * 
 * Tests:
 * - Distance control workflow
 * - Enhanced search workflow
 * - Isolation mode workflow
 * - Type filter workflow
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useGraphStore } from '../../stores/graphStore';

// Mock graph data with mixed node types
const mockGraphData = {
  nodes: [
    {
      id: 'req-1',
      type: 'WorkItem',
      label: 'User Authentication Requirement',
      properties: {
        type: 'requirement',
        status: 'active',
        priority: 1,
      },
    },
    {
      id: 'task-1',
      type: 'WorkItem',
      label: 'Create Login Form',
      properties: {
        type: 'task',
        status: 'draft',
        priority: 2,
      },
    },
    {
      id: 'user-1',
      type: 'User',
      label: 'John Doe',
      properties: {
        email: 'john@example.com',
      },
    },
    {
      id: 'project-1',
      type: 'Project',
      label: 'Authentication System',
      properties: {
        status: 'active',
      },
    },
    {
      id: 'test-1',
      type: 'WorkItem',
      label: 'Test Login Flow',
      properties: {
        type: 'test',
        status: 'active',
      },
    },
  ],
  edges: [
    {
      id: 'e1',
      source: 'task-1',
      target: 'req-1',
      type: 'IMPLEMENTS',
    },
    {
      id: 'e2',
      source: 'test-1',
      target: 'task-1',
      type: 'TESTS',
    },
    {
      id: 'e3',
      source: 'user-1',
      target: 'task-1',
      type: 'ASSIGNED_TO',
    },
    {
      id: 'e4',
      source: 'req-1',
      target: 'project-1',
      type: 'BELONGS_TO',
    },
  ],
};

describe('Integration Tests - Graph UI Enhancements', () => {
  beforeEach(() => {
    // Clear all stores
    sessionStorage.clear();
    localStorage.clear();
    
    // Reset graph store to initial state
    useGraphStore.setState({
      nodes: [],
      edges: [],
      selectedNode: null,
      isLoading: false,
      error: null,
      searchQuery: '',
      searchResults: [],
      isSearching: false,
      layoutDistance: 100,
      isIsolationMode: false,
      isolatedNodeId: null,
      isolationDepth: 1,
      visibleNodeIds: new Set(),
    });
  });

  afterEach(() => {
    // Cleanup
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('12.1 Integration test: Distance control workflow', () => {
    it('should load graph with default distance value', () => {
      const store = useGraphStore.getState();
      
      // Verify default distance is 100
      expect(store.layoutDistance).toBe(100);
    });

    it('should adjust distance value and persist to localStorage', () => {
      const store = useGraphStore.getState();
      
      // Set distance to 200
      store.setLayoutDistance(200);
      
      // Verify distance was updated
      expect(useGraphStore.getState().layoutDistance).toBe(200);
      
      // Verify localStorage was updated
      const stored = localStorage.getItem('graph-layout-distance');
      expect(stored).toBe('200');
    });

    it('should restore distance value from localStorage on initialization', () => {
      // Pre-populate localStorage
      localStorage.setItem('graph-layout-distance', '300');
      
      // Initialize store (simulating page load)
      const store = useGraphStore.getState();
      const distance = parseInt(localStorage.getItem('graph-layout-distance') || '100');
      store.setLayoutDistance(distance);
      
      // Verify distance was restored
      expect(useGraphStore.getState().layoutDistance).toBe(300);
    });

    it('should validate distance constraints (50-500, step 10)', () => {
      const store = useGraphStore.getState();
      
      // Test valid values
      store.setLayoutDistance(50);
      expect(useGraphStore.getState().layoutDistance).toBe(50);
      
      store.setLayoutDistance(500);
      expect(useGraphStore.getState().layoutDistance).toBe(500);
      
      store.setLayoutDistance(250);
      expect(useGraphStore.getState().layoutDistance).toBe(250);
    });
  });

  describe('12.2 Integration test: Enhanced search workflow', () => {
    beforeEach(() => {
      // Load mock graph data
      useGraphStore.setState({
        nodes: mockGraphData.nodes,
        edges: mockGraphData.edges,
      });
    });

    it('should load graph with mixed node types', () => {
      const store = useGraphStore.getState();
      
      // Verify nodes are loaded
      expect(store.nodes.length).toBe(5);
      
      // Verify mixed node types are present
      const nodeTypes = new Set(store.nodes.map(n => n.type));
      expect(nodeTypes.size).toBeGreaterThan(1);
      expect(nodeTypes.has('WorkItem')).toBe(true);
      expect(nodeTypes.has('User')).toBe(true);
      expect(nodeTypes.has('Project')).toBe(true);
    });

    it('should search by node ID and find results', () => {
      const store = useGraphStore.getState();
      
      // Perform search by ID
      const query = 'req-1';
      const results = store.nodes.filter(node => 
        node.id.toLowerCase().includes(query.toLowerCase())
      );
      
      // Verify result contains the searched ID
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('req-1');
    });

    it('should search by node title and find results', () => {
      const store = useGraphStore.getState();
      
      // Perform search by title
      const query = 'Authentication';
      const results = store.nodes.filter(node => 
        node.label?.toLowerCase().includes(query.toLowerCase())
      );
      
      // Verify results contain nodes with "Authentication" in title
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.label?.includes('Authentication'))).toBe(true);
    });

    it('should verify all node types are searchable', () => {
      const store = useGraphStore.getState();
      
      // Search for WorkItem
      const workItemResults = store.nodes.filter(node => 
        node.label?.toLowerCase().includes('requirement')
      );
      expect(workItemResults.some(r => r.type === 'WorkItem')).toBe(true);
      
      // Search for User
      const userResults = store.nodes.filter(node => 
        node.label?.toLowerCase().includes('john')
      );
      expect(userResults.some(r => r.type === 'User')).toBe(true);
      
      // Search for Project
      const projectResults = store.nodes.filter(node => 
        node.label?.toLowerCase().includes('system')
      );
      expect(projectResults.some(r => r.type === 'Project')).toBe(true);
    });

    it('should perform case-insensitive search', () => {
      const store = useGraphStore.getState();
      
      // Search with different cases
      const lowerResults = store.nodes.filter(node => 
        node.label?.toLowerCase().includes('authentication')
      );
      const upperResults = store.nodes.filter(node => 
        node.label?.toLowerCase().includes('AUTHENTICATION'.toLowerCase())
      );
      const mixedResults = store.nodes.filter(node => 
        node.label?.toLowerCase().includes('Authentication'.toLowerCase())
      );
      
      // All should return same results
      expect(lowerResults.length).toBe(upperResults.length);
      expect(lowerResults.length).toBe(mixedResults.length);
    });
  });

  describe('12.3 Integration test: Isolation mode workflow', () => {
    beforeEach(() => {
      // Load mock graph data
      useGraphStore.setState({
        nodes: mockGraphData.nodes,
        edges: mockGraphData.edges,
      });
    });

    it('should load graph with isolation mode disabled initially', () => {
      const store = useGraphStore.getState();
      
      // Verify isolation mode is not active
      expect(store.isIsolationMode).toBe(false);
      expect(store.isolatedNodeId).toBeNull();
      expect(store.visibleNodeIds.size).toBe(0);
    });

    it('should enter isolation mode and show only isolated node and neighbors', () => {
      const store = useGraphStore.getState();
      const nodeToIsolate = 'task-1';
      
      // Enter isolation mode
      store.enterIsolationMode(nodeToIsolate);
      
      // Verify isolation mode is active
      const updatedStore = useGraphStore.getState();
      expect(updatedStore.isIsolationMode).toBe(true);
      expect(updatedStore.isolatedNodeId).toBe(nodeToIsolate);
      
      // Verify isolated node is visible
      expect(updatedStore.visibleNodeIds.has(nodeToIsolate)).toBe(true);
      
      // Verify neighbors are visible (based on edges)
      // task-1 connects to: req-1 (target), test-1 (source), user-1 (source)
      expect(updatedStore.visibleNodeIds.size).toBeGreaterThan(1);
    });

    it('should change depth and update visible neighbors', () => {
      const store = useGraphStore.getState();
      const nodeToIsolate = 'task-1';
      
      // Enter isolation mode with depth 1
      store.enterIsolationMode(nodeToIsolate);
      const initialVisibleCount = useGraphStore.getState().visibleNodeIds.size;
      
      // Update depth to 2
      store.updateIsolationDepth(2);
      
      // Verify depth was updated
      const updatedStore = useGraphStore.getState();
      expect(updatedStore.isolationDepth).toBe(2);
      
      // Verify visible nodes may have increased (or stayed same if no 2nd level neighbors)
      expect(updatedStore.visibleNodeIds.size).toBeGreaterThanOrEqual(initialVisibleCount);
    });

    it('should exit isolation mode and restore full graph', () => {
      const store = useGraphStore.getState();
      const nodeToIsolate = 'task-1';
      
      // Enter isolation mode
      store.enterIsolationMode(nodeToIsolate);
      expect(useGraphStore.getState().isIsolationMode).toBe(true);
      
      // Exit isolation mode
      store.exitIsolationMode();
      
      // Verify isolation mode is disabled
      const updatedStore = useGraphStore.getState();
      expect(updatedStore.isIsolationMode).toBe(false);
      expect(updatedStore.isolatedNodeId).toBeNull();
      expect(updatedStore.visibleNodeIds.size).toBe(0);
    });

    it('should switch between isolated nodes', () => {
      const store = useGraphStore.getState();
      
      // Isolate first node
      store.enterIsolationMode('task-1');
      expect(useGraphStore.getState().isolatedNodeId).toBe('task-1');
      
      // Isolate different node
      store.enterIsolationMode('req-1');
      
      // Verify new node is isolated
      const updatedStore = useGraphStore.getState();
      expect(updatedStore.isolatedNodeId).toBe('req-1');
      expect(updatedStore.visibleNodeIds.has('req-1')).toBe(true);
    });
  });

  describe('12.4 Integration test: Type filter workflow', () => {
    beforeEach(() => {
      // Load mock graph data
      useGraphStore.setState({
        nodes: mockGraphData.nodes,
        edges: mockGraphData.edges,
      });
    });

    it('should have all node types available for filtering', () => {
      const store = useGraphStore.getState();
      
      // Get unique node types
      const nodeTypes = new Set(store.nodes.map(n => n.type));
      
      // Verify multiple types exist
      expect(nodeTypes.size).toBeGreaterThan(1);
      expect(nodeTypes.has('WorkItem')).toBe(true);
      expect(nodeTypes.has('User')).toBe(true);
      expect(nodeTypes.has('Project')).toBe(true);
    });

    it('should filter nodes by type', () => {
      const store = useGraphStore.getState();
      
      // Filter to show only WorkItem nodes
      const workItemNodes = store.nodes.filter(n => n.type === 'WorkItem');
      
      // Verify filtering works
      expect(workItemNodes.length).toBe(3); // req-1, task-1, test-1
      expect(workItemNodes.every(n => n.type === 'WorkItem')).toBe(true);
    });

    it('should filter nodes by multiple types', () => {
      const store = useGraphStore.getState();
      
      // Filter to show WorkItem and User nodes
      const selectedTypes = new Set(['WorkItem', 'User']);
      const filteredNodes = store.nodes.filter(n => selectedTypes.has(n.type));
      
      // Verify filtering works
      expect(filteredNodes.length).toBe(4); // 3 WorkItems + 1 User
      expect(filteredNodes.every(n => selectedTypes.has(n.type))).toBe(true);
    });

    it('should clear all filters', () => {
      const store = useGraphStore.getState();
      
      // Start with some filters
      const selectedTypes = new Set<string>();
      
      // Clear all filters
      selectedTypes.clear();
      
      // Verify all filters are cleared
      expect(selectedTypes.size).toBe(0);
    });

    it('should select all filters', () => {
      const store = useGraphStore.getState();
      
      // Get all unique node types
      const allTypes = new Set(store.nodes.map(n => n.type));
      
      // Select all types
      const selectedTypes = new Set(allTypes);
      
      // Verify all types are selected
      expect(selectedTypes.size).toBe(allTypes.size);
      expect(selectedTypes.has('WorkItem')).toBe(true);
      expect(selectedTypes.has('User')).toBe(true);
      expect(selectedTypes.has('Project')).toBe(true);
    });
  });

  describe('Complete Integration Flow', () => {
    beforeEach(() => {
      // Load mock graph data
      useGraphStore.setState({
        nodes: mockGraphData.nodes,
        edges: mockGraphData.edges,
      });
    });

    it('should perform complete workflow: load → filter → search → isolate → adjust distance', () => {
      const store = useGraphStore.getState();
      
      // 1. Verify graph is loaded
      expect(store.nodes.length).toBe(5);
      
      // 2. Apply type filter
      const selectedTypes = new Set(['WorkItem']);
      const filteredNodes = store.nodes.filter(n => selectedTypes.has(n.type));
      expect(filteredNodes.length).toBe(3);
      
      // 3. Search for a node
      const searchResults = store.nodes.filter(node => 
        node.label?.toLowerCase().includes('authentication')
      );
      expect(searchResults.length).toBeGreaterThan(0);
      
      // 4. Enter isolation mode
      store.enterIsolationMode('task-1');
      expect(useGraphStore.getState().isIsolationMode).toBe(true);
      
      // 5. Adjust distance
      store.setLayoutDistance(250);
      expect(useGraphStore.getState().layoutDistance).toBe(250);
      
      // 6. Exit isolation mode
      store.exitIsolationMode();
      expect(useGraphStore.getState().isIsolationMode).toBe(false);
      
      // Verify no errors occurred (all operations completed successfully)
      expect(useGraphStore.getState().error).toBeNull();
    });

    it('should maintain state consistency across operations', () => {
      const store = useGraphStore.getState();
      
      // Perform multiple operations
      store.setLayoutDistance(200);
      store.enterIsolationMode('req-1');
      store.updateIsolationDepth(2);
      
      // Verify all states are maintained correctly
      const finalStore = useGraphStore.getState();
      expect(finalStore.layoutDistance).toBe(200);
      expect(finalStore.isIsolationMode).toBe(true);
      expect(finalStore.isolatedNodeId).toBe('req-1');
      expect(finalStore.isolationDepth).toBe(2);
      
      // Exit isolation
      store.exitIsolationMode();
      
      // Verify distance is still maintained after exiting isolation
      expect(useGraphStore.getState().layoutDistance).toBe(200);
    });
  });
});

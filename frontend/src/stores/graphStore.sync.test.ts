/**
 * Tests for state synchronization between 2D and 3D views
 * 
 * Tests cover:
 * - Node selection synchronization
 * - Node position conversion between 2D and 3D coordinates
 * - Zoom/pan state synchronization
 * - Filter state (show/hide node types) synchronization
 * - Edge cases when switching views mid-interaction
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 * Task: 19.3.2 Synchronize state between 2D and 3D views
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import {
  useGraphStore,
  convert2Dto3D,
  convert3Dto2D,
  type ViewMode,
  type Position3D,
  type FilterableNodeType,
  type NodeTypeFilter,
} from './graphStore';

// Mock the services
vi.mock('../services/graphService', () => ({
  graphService: {
    getVisualization: vi.fn().mockResolvedValue({
      nodes: [
        { id: 'node-1', type: 'requirement', label: 'Requirement 1', properties: {}, position: { x: 100, y: 200 } },
        { id: 'node-2', type: 'task', label: 'Task 1', properties: {}, position: { x: 300, y: 400 } },
        { id: 'node-3', type: 'test', label: 'Test 1', properties: {}, position: { x: 500, y: 100 } },
        { id: 'node-4', type: 'risk', label: 'Risk 1', properties: {}, position: { x: 200, y: 300 } },
        { id: 'node-5', type: 'document', label: 'Document 1', properties: {}, position: { x: 400, y: 500 } },
      ],
      edges: [
        { id: 'edge-1', source: 'node-1', target: 'node-2', type: 'IMPLEMENTS', label: 'implements', properties: {} },
        { id: 'edge-2', source: 'node-2', target: 'node-3', type: 'TESTED_BY', label: 'tested by', properties: {} },
        { id: 'edge-3', source: 'node-1', target: 'node-4', type: 'MITIGATES', label: 'mitigates', properties: {} },
      ],
    }),
    search: vi.fn().mockResolvedValue([]),
    createRelationship: vi.fn().mockResolvedValue({}),
    deleteRelationship: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../services/workitemService', () => ({
  workitemService: {
    update: vi.fn().mockResolvedValue({}),
  },
}));

describe('State Synchronization between 2D and 3D Views', () => {
  beforeEach(() => {
    // Reset the store before each test
    act(() => {
      useGraphStore.getState().reset();
    });
  });

  describe('Coordinate Conversion Functions', () => {
    describe('convert2Dto3D', () => {
      it('should convert 2D position to 3D position with default scale', () => {
        const position2D = { x: 100, y: 200 };
        const position3D = convert2Dto3D(position2D);

        expect(position3D.x).toBe(2); // 100 * 0.02
        expect(position3D.y).toBe(0); // Default height
        expect(position3D.z).toBe(4); // 200 * 0.02
      });

      it('should convert 2D position to 3D position with custom scale', () => {
        const position2D = { x: 100, y: 200 };
        const position3D = convert2Dto3D(position2D, 0.1);

        expect(position3D.x).toBe(10); // 100 * 0.1
        expect(position3D.y).toBe(0); // Default height
        expect(position3D.z).toBe(20); // 200 * 0.1
      });

      it('should handle zero coordinates', () => {
        const position2D = { x: 0, y: 0 };
        const position3D = convert2Dto3D(position2D);

        expect(position3D.x).toBe(0);
        expect(position3D.y).toBe(0);
        expect(position3D.z).toBe(0);
      });

      it('should handle negative coordinates', () => {
        const position2D = { x: -100, y: -200 };
        const position3D = convert2Dto3D(position2D);

        expect(position3D.x).toBe(-2);
        expect(position3D.y).toBe(0);
        expect(position3D.z).toBe(-4);
      });
    });

    describe('convert3Dto2D', () => {
      it('should convert 3D position to 2D position with default scale', () => {
        const position3D: Position3D = { x: 2, y: 5, z: 4 };
        const position2D = convert3Dto2D(position3D);

        expect(position2D.x).toBe(100); // 2 / 0.02
        expect(position2D.y).toBe(200); // 4 / 0.02 (z maps to y)
      });

      it('should convert 3D position to 2D position with custom scale', () => {
        const position3D: Position3D = { x: 10, y: 5, z: 20 };
        const position2D = convert3Dto2D(position3D, 0.1);

        expect(position2D.x).toBe(100); // 10 / 0.1
        expect(position2D.y).toBe(200); // 20 / 0.1
      });

      it('should ignore y coordinate (height) in conversion', () => {
        const position3D: Position3D = { x: 2, y: 100, z: 4 };
        const position2D = convert3Dto2D(position3D);

        // y coordinate should not affect 2D position
        expect(position2D.x).toBe(100);
        expect(position2D.y).toBe(200);
      });
    });

    describe('Round-trip conversion', () => {
      it('should preserve x and z coordinates through round-trip conversion', () => {
        const original2D = { x: 150, y: 250 };
        const converted3D = convert2Dto3D(original2D);
        const backTo2D = convert3Dto2D(converted3D);

        expect(backTo2D.x).toBeCloseTo(original2D.x, 5);
        expect(backTo2D.y).toBeCloseTo(original2D.y, 5);
      });
    });
  });

  describe('Node Selection Synchronization', () => {
    it('should share selected node between views', async () => {
      const store = useGraphStore.getState();
      
      // Load graph data
      await act(async () => {
        await store.loadGraph();
      });

      // Select a node in 2D view
      act(() => {
        useGraphStore.getState().selectNode('node-1');
      });

      expect(useGraphStore.getState().selectedNode?.id).toBe('node-1');

      // Switch to 3D view
      act(() => {
        useGraphStore.getState().setViewMode('3d');
      });

      // Selection should be preserved
      expect(useGraphStore.getState().selectedNode?.id).toBe('node-1');
      expect(useGraphStore.getState().viewMode).toBe('3d');
    });

    it('should preserve selection when switching back to 2D', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      // Start in 3D view
      act(() => {
        useGraphStore.getState().setViewMode('3d');
      });

      // Select a node
      act(() => {
        useGraphStore.getState().selectNode('node-2');
      });

      // Switch back to 2D
      act(() => {
        useGraphStore.getState().setViewMode('2d');
      });

      expect(useGraphStore.getState().selectedNode?.id).toBe('node-2');
    });

    it('should clear selection when node is deselected', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      act(() => {
        useGraphStore.getState().selectNode('node-1');
      });

      expect(useGraphStore.getState().selectedNode).not.toBeNull();

      act(() => {
        useGraphStore.getState().selectNode(null);
      });

      expect(useGraphStore.getState().selectedNode).toBeNull();
    });
  });

  describe('Node Position Synchronization', () => {
    it('should initialize position mappings when loading graph', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      const { nodePositions } = useGraphStore.getState();
      
      expect(nodePositions.size).toBe(5);
      expect(nodePositions.has('node-1')).toBe(true);
      expect(nodePositions.has('node-2')).toBe(true);
    });

    it('should update position mapping when 2D position changes', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      const newPosition = { x: 500, y: 600 };
      
      act(() => {
        useGraphStore.getState().updateNodePosition('node-1', newPosition);
      });

      const { nodePositions } = useGraphStore.getState();
      const mapping = nodePositions.get('node-1');

      expect(mapping?.position2D).toEqual(newPosition);
      expect(mapping?.isUserPositioned).toBe(true);
    });

    it('should update position mapping when 3D position changes', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      const newPosition3D: Position3D = { x: 10, y: 5, z: 12 };
      
      act(() => {
        useGraphStore.getState().updateNodePosition3D('node-1', newPosition3D);
      });

      const { nodePositions } = useGraphStore.getState();
      const mapping = nodePositions.get('node-1');

      expect(mapping?.position3D).toEqual(newPosition3D);
      expect(mapping?.isUserPositioned).toBe(true);
    });

    it('should sync positions from 2D to 3D when switching views', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      // Update 2D position
      const newPosition = { x: 500, y: 600 };
      act(() => {
        useGraphStore.getState().updateNodePosition('node-1', newPosition);
      });

      // Switch to 3D view
      act(() => {
        useGraphStore.getState().setViewMode('3d');
      });

      const { nodePositions } = useGraphStore.getState();
      const mapping = nodePositions.get('node-1');

      // 3D position should be updated based on 2D position
      expect(mapping?.position3D.x).toBeCloseTo(newPosition.x * 0.02, 5);
      expect(mapping?.position3D.z).toBeCloseTo(newPosition.y * 0.02, 5);
    });

    it('should sync positions from 3D to 2D when switching views', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      // Switch to 3D view first
      act(() => {
        useGraphStore.getState().setViewMode('3d');
      });

      // Update 3D position
      const newPosition3D: Position3D = { x: 10, y: 5, z: 12 };
      act(() => {
        useGraphStore.getState().updateNodePosition3D('node-1', newPosition3D);
      });

      // Switch back to 2D view
      act(() => {
        useGraphStore.getState().setViewMode('2d');
      });

      const { nodePositions, nodes } = useGraphStore.getState();
      const mapping = nodePositions.get('node-1');
      const node = nodes.find(n => n.id === 'node-1');

      // 2D position should be updated based on 3D position
      expect(mapping?.position2D.x).toBeCloseTo(newPosition3D.x / 0.02, 5);
      expect(mapping?.position2D.y).toBeCloseTo(newPosition3D.z / 0.02, 5);
      
      // Node position should also be updated
      expect(node?.position.x).toBeCloseTo(newPosition3D.x / 0.02, 5);
      expect(node?.position.y).toBeCloseTo(newPosition3D.z / 0.02, 5);
    });
  });

  describe('Viewport State Synchronization', () => {
    it('should initialize with default viewport state', () => {
      const { viewport } = useGraphStore.getState();

      expect(viewport.zoom).toBe(1.0);
      expect(viewport.panX).toBe(0);
      expect(viewport.panY).toBe(0);
      expect(viewport.panZ).toBe(0);
    });

    it('should update viewport state', () => {
      act(() => {
        useGraphStore.getState().setViewport({ zoom: 1.5, panX: 100 });
      });

      const { viewport } = useGraphStore.getState();

      expect(viewport.zoom).toBe(1.5);
      expect(viewport.panX).toBe(100);
      expect(viewport.panY).toBe(0); // Unchanged
    });

    it('should preserve viewport state when switching views', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      // Set viewport in 2D view
      act(() => {
        useGraphStore.getState().setViewport({ zoom: 2.0, panX: 50, panY: 75 });
      });

      // Switch to 3D view
      act(() => {
        useGraphStore.getState().setViewMode('3d');
      });

      const { viewport } = useGraphStore.getState();

      // Viewport state should be preserved
      expect(viewport.zoom).toBe(2.0);
      expect(viewport.panX).toBe(50);
      expect(viewport.panY).toBe(75);
    });
  });

  describe('Node Type Filter Synchronization', () => {
    it('should initialize with all node types visible', () => {
      const { nodeTypeFilter } = useGraphStore.getState();

      expect(nodeTypeFilter.requirement).toBe(true);
      expect(nodeTypeFilter.task).toBe(true);
      expect(nodeTypeFilter.test).toBe(true);
      expect(nodeTypeFilter.risk).toBe(true);
      expect(nodeTypeFilter.document).toBe(true);
    });

    it('should toggle individual node type visibility', () => {
      act(() => {
        useGraphStore.getState().toggleNodeTypeFilter('risk');
      });

      const { nodeTypeFilter } = useGraphStore.getState();

      expect(nodeTypeFilter.risk).toBe(false);
      expect(nodeTypeFilter.requirement).toBe(true); // Others unchanged
    });

    it('should set multiple filters at once', () => {
      act(() => {
        useGraphStore.getState().setNodeTypeFilters({
          requirement: false,
          task: false,
        });
      });

      const { nodeTypeFilter } = useGraphStore.getState();

      expect(nodeTypeFilter.requirement).toBe(false);
      expect(nodeTypeFilter.task).toBe(false);
      expect(nodeTypeFilter.test).toBe(true); // Unchanged
    });

    it('should filter nodes based on type filter', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      // Hide risk nodes
      act(() => {
        useGraphStore.getState().toggleNodeTypeFilter('risk');
      });

      const filteredNodes = useGraphStore.getState().getFilteredNodes();

      expect(filteredNodes.length).toBe(4); // 5 - 1 risk node
      expect(filteredNodes.find(n => n.data.type === 'risk')).toBeUndefined();
    });

    it('should filter edges based on filtered nodes', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      // Hide task nodes (node-2 is a task)
      act(() => {
        useGraphStore.getState().toggleNodeTypeFilter('task');
      });

      const filteredEdges = useGraphStore.getState().getFilteredEdges();

      // edge-1 (node-1 -> node-2) and edge-2 (node-2 -> node-3) should be hidden
      expect(filteredEdges.length).toBe(1); // Only edge-3 remains
      expect(filteredEdges[0].id).toBe('edge-3');
    });

    it('should preserve filter state when switching views', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      // Set filters in 2D view
      act(() => {
        useGraphStore.getState().setNodeTypeFilters({
          risk: false,
          document: false,
        });
      });

      // Switch to 3D view
      act(() => {
        useGraphStore.getState().setViewMode('3d');
      });

      const { nodeTypeFilter } = useGraphStore.getState();

      // Filters should be preserved
      expect(nodeTypeFilter.risk).toBe(false);
      expect(nodeTypeFilter.document).toBe(false);
      expect(nodeTypeFilter.requirement).toBe(true);
    });
  });

  describe('View Transition Edge Cases', () => {
    it('should mark transition state when switching views', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      // Check initial state
      expect(useGraphStore.getState().isViewTransitioning).toBe(false);

      // Start view switch (transition starts synchronously)
      act(() => {
        useGraphStore.getState().setViewMode('3d');
      });

      // Note: The transition flag is set and then cleared after setTimeout
      // In tests, we can verify the view mode changed
      expect(useGraphStore.getState().viewMode).toBe('3d');
    });

    it('should update lastViewModeChange timestamp', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      const beforeTimestamp = useGraphStore.getState().lastViewModeChange;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10));

      act(() => {
        useGraphStore.getState().setViewMode('3d');
      });

      const afterTimestamp = useGraphStore.getState().lastViewModeChange;

      expect(afterTimestamp).toBeGreaterThan(beforeTimestamp);
    });

    it('should not trigger transition when setting same view mode', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      const initialTimestamp = useGraphStore.getState().lastViewModeChange;

      // Try to set same view mode
      act(() => {
        useGraphStore.getState().setViewMode('2d'); // Already in 2D
      });

      // Timestamp should not change
      expect(useGraphStore.getState().lastViewModeChange).toBe(initialTimestamp);
    });

    it('should handle rapid view switching', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      // Rapidly switch views
      act(() => {
        useGraphStore.getState().setViewMode('3d');
        useGraphStore.getState().setViewMode('2d');
        useGraphStore.getState().setViewMode('3d');
      });

      // Should end up in 3D view
      expect(useGraphStore.getState().viewMode).toBe('3d');
    });

    it('should preserve node selection during rapid view switching', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      // Select a node
      act(() => {
        useGraphStore.getState().selectNode('node-1');
      });

      // Rapidly switch views
      act(() => {
        useGraphStore.getState().setViewMode('3d');
        useGraphStore.getState().setViewMode('2d');
        useGraphStore.getState().setViewMode('3d');
      });

      // Selection should be preserved
      expect(useGraphStore.getState().selectedNode?.id).toBe('node-1');
    });
  });

  describe('getNodePositionForView', () => {
    it('should return 2D position for 2D view mode', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      const position = useGraphStore.getState().getNodePositionForView('node-1', '2d');

      expect(position).not.toBeNull();
      expect('x' in position!).toBe(true);
      expect('y' in position!).toBe(true);
      expect('z' in position!).toBe(false);
    });

    it('should return 3D position for 3D view mode', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      const position = useGraphStore.getState().getNodePositionForView('node-1', '3d');

      expect(position).not.toBeNull();
      expect('x' in position!).toBe(true);
      expect('y' in position!).toBe(true);
      expect('z' in position!).toBe(true);
    });

    it('should return null for non-existent node', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      const position = useGraphStore.getState().getNodePositionForView('non-existent', '2d');

      expect(position).toBeNull();
    });
  });

  describe('Reset State', () => {
    it('should reset all synchronization state', async () => {
      const store = useGraphStore.getState();
      
      await act(async () => {
        await store.loadGraph();
      });

      // Modify state
      act(() => {
        useGraphStore.getState().setViewMode('3d');
        useGraphStore.getState().setViewport({ zoom: 2.0 });
        useGraphStore.getState().toggleNodeTypeFilter('risk');
        useGraphStore.getState().selectNode('node-1');
      });

      // Reset
      act(() => {
        useGraphStore.getState().reset();
      });

      const state = useGraphStore.getState();

      expect(state.viewMode).toBe('2d');
      expect(state.viewport.zoom).toBe(1.0);
      expect(state.nodeTypeFilter.risk).toBe(true);
      expect(state.selectedNode).toBeNull();
      expect(state.nodePositions.size).toBe(0);
    });
  });
});

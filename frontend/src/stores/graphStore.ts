/**
 * Graph store using Zustand
 * Handles graph state management for 2D/3D visualization including nodes, edges,
 * selection, view mode switching, and search functionality
 */

import { create } from 'zustand';
import type { Node, Edge } from '@xyflow/react';
import {
  graphService,
  type GraphNode,
  type GraphEdge,
  type GraphVisualizationParams,
} from '../services/graphService';
import { workitemService, type WorkItemUpdate } from '../services/workitemService';

export interface SearchResult {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
}

export type ViewMode = '2d' | '3d';

export interface GraphNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  properties: Record<string, unknown>;
}

export interface GraphState {
  // Data
  nodes: Node<GraphNodeData>[];
  edges: Edge[];
  selectedNode: Node<GraphNodeData> | null;
  viewMode: ViewMode;

  // Search state
  searchResults: SearchResult[];
  isSearching: boolean;
  searchQuery: string;

  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  isCreatingRelationship: boolean;

  // Error state
  error: string | null;

  // Query parameters
  centerNodeId: string | null;
  depth: number;
}

export interface GraphActions {
  // Core operations
  loadGraph: (centerNodeId?: string, depth?: number) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  updateNode: (nodeId: string, data: WorkItemUpdate) => Promise<void>;
  createRelationship: (fromId: string, toId: string, type: string) => Promise<void>;
  deleteRelationship: (relationshipId: string) => Promise<void>;

  // Search operations
  searchNodes: (query: string) => Promise<void>;
  clearSearch: () => void;
  selectSearchResult: (result: SearchResult) => Promise<void>;

  // View mode
  setViewMode: (mode: ViewMode) => void;

  // Node position updates (for react-flow drag)
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;

  // Query parameters
  setCenterNode: (nodeId: string | null) => void;
  setDepth: (depth: number) => void;

  // Error handling
  clearError: () => void;

  // Reset
  reset: () => void;
}

export type GraphStore = GraphState & GraphActions;

const initialState: GraphState = {
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
};

/**
 * Transform API GraphNode to react-flow Node format
 */
const transformNode = (node: GraphNode): Node<GraphNodeData> => ({
  id: node.id,
  type: node.type,
  position: node.position ?? { x: Math.random() * 500, y: Math.random() * 500 },
  data: {
    label: node.label,
    type: node.type,
    properties: node.properties,
  },
});

/**
 * Transform API GraphEdge to react-flow Edge format
 */
const transformEdge = (edge: GraphEdge): Edge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  type: edge.type,
  label: edge.label,
  data: edge.properties,
});

export const useGraphStore = create<GraphStore>()((set, get) => ({
  ...initialState,

  loadGraph: async (centerNodeId?: string, depth?: number): Promise<void> => {
    set({ isLoading: true, error: null });

    try {
      const params: GraphVisualizationParams = {
        root_id: centerNodeId ?? get().centerNodeId ?? undefined,
        depth: depth ?? get().depth,
        limit: 1000, // Performance optimization as per design
      };

      const graphData = await graphService.getVisualization(params);

      const nodes = graphData.nodes.map(transformNode);
      const edges = graphData.edges.map(transformEdge);

      // Preserve selected node if it still exists in the new data
      const { selectedNode } = get();
      const newSelectedNode = selectedNode
        ? nodes.find((n) => n.id === selectedNode.id) ?? null
        : null;

      set({
        nodes,
        edges,
        selectedNode: newSelectedNode,
        centerNodeId: centerNodeId ?? get().centerNodeId,
        depth: depth ?? get().depth,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load graph';
      set({ error: message, isLoading: false });
    }
  },

  selectNode: (nodeId: string | null): void => {
    if (nodeId === null) {
      set({ selectedNode: null });
      return;
    }

    const node = get().nodes.find((n) => n.id === nodeId);
    set({ selectedNode: node ?? null });
  },

  updateNode: async (nodeId: string, data: WorkItemUpdate): Promise<void> => {
    set({ isUpdating: true, error: null });

    try {
      await workitemService.update(nodeId, data);

      // Reload graph to get updated data
      await get().loadGraph();

      set({ isUpdating: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update node';
      set({ error: message, isUpdating: false });
      throw error;
    }
  },

  createRelationship: async (
    fromId: string,
    toId: string,
    type: string
  ): Promise<void> => {
    set({ isCreatingRelationship: true, error: null });

    try {
      await graphService.createRelationship(fromId, toId, type);

      // Reload graph to get updated relationships
      await get().loadGraph();

      set({ isCreatingRelationship: false });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create relationship';
      set({ error: message, isCreatingRelationship: false });
      throw error;
    }
  },

  deleteRelationship: async (relationshipId: string): Promise<void> => {
    set({ isUpdating: true, error: null });

    try {
      await graphService.deleteRelationship(relationshipId);

      // Remove edge from local state immediately for better UX
      set((state) => ({
        edges: state.edges.filter((e) => e.id !== relationshipId),
        isUpdating: false,
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete relationship';
      set({ error: message, isUpdating: false });
      throw error;
    }
  },

  setViewMode: (mode: ViewMode): void => {
    set({ viewMode: mode });
  },

  updateNodePosition: (nodeId: string, position: { x: number; y: number }): void => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, position } : node
      ),
      // Update selected node position if it's the one being moved
      selectedNode:
        state.selectedNode?.id === nodeId
          ? { ...state.selectedNode, position }
          : state.selectedNode,
    }));
  },

  setCenterNode: (nodeId: string | null): void => {
    set({ centerNodeId: nodeId });
  },

  setDepth: (depth: number): void => {
    set({ depth: Math.max(1, Math.min(depth, 10)) }); // Clamp between 1 and 10
  },

  clearError: (): void => {
    set({ error: null });
  },

  searchNodes: async (query: string): Promise<void> => {
    // Clear search results if query is empty
    if (!query.trim()) {
      set({ searchResults: [], searchQuery: '', isSearching: false });
      return;
    }

    set({ isSearching: true, searchQuery: query, error: null });

    try {
      const results = await graphService.search(query);
      
      // Transform GraphNode results to SearchResult format
      const searchResults: SearchResult[] = results.map((node) => ({
        id: node.id,
        type: node.type,
        label: node.label,
        properties: node.properties,
      }));

      set({ searchResults, isSearching: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Search failed';
      set({ error: message, isSearching: false, searchResults: [] });
    }
  },

  clearSearch: (): void => {
    set({ searchResults: [], searchQuery: '', isSearching: false });
  },

  selectSearchResult: async (result: SearchResult): Promise<void> => {
    // Set the selected node as center and reload the graph
    set({ centerNodeId: result.id, searchResults: [], searchQuery: '' });
    
    // Load the graph centered on the selected node
    await get().loadGraph(result.id);
  },

  reset: (): void => {
    set(initialState);
  },
}));

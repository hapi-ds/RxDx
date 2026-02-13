/**
 * Graph store using Zustand
 * Handles graph state management for 2D/3D visualization including nodes, edges,
 * selection, view mode switching, search functionality, and state synchronization
 * between 2D and 3D views.
 * 
 * State Synchronization Features:
 * - Node selection is shared between views
 * - Node positions are converted between 2D (x,y) and 3D (x,y,z) coordinate systems
 * - Zoom/pan state is synchronized where applicable
 * - Filter state (show/hide node types) is shared between views
 * - Edge cases during view switching are handled gracefully
 * 
 * References: Requirement 16 (Dual Frontend Interface)
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
import type { CustomNodeData } from '../components/graph/nodes/types';

export interface SearchResult {
  id: string;
  type: string;
  label: string;
  properties: Record<string, unknown>;
}

export type ViewMode = '2d' | '3d';

/**
 * Node types that can be filtered in the graph view
 * Includes all graph node types, not just work items
 */
export type FilterableNodeType = 
  | 'requirement' 
  | 'task' 
  | 'test' 
  | 'risk' 
  | 'document'
  | 'WorkItem'
  | 'Project'
  | 'Phase'
  | 'Workpackage'
  | 'Resource'
  | 'Company'
  | 'Department'
  | 'Milestone'
  | 'Sprint'
  | 'Backlog'
  | 'User'
  | 'Entity'
  | 'Document'
  | 'Failure';

/**
 * Filter state for showing/hiding node types
 * All node types are visible by default
 */
export interface NodeTypeFilter {
  // Work item types (lowercase for backward compatibility)
  requirement: boolean;
  task: boolean;
  test: boolean;
  risk: boolean;
  document: boolean;
  // Graph node types (PascalCase as returned by backend)
  WorkItem: boolean;
  Project: boolean;
  Phase: boolean;
  Workpackage: boolean;
  Resource: boolean;
  Company: boolean;
  Department: boolean;
  Milestone: boolean;
  Sprint: boolean;
  Backlog: boolean;
  User: boolean;
  Entity: boolean;
  Document: boolean;
  Failure: boolean;
}

/**
 * 3D position with x, y, z coordinates
 */
export interface Position3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Viewport state for zoom and pan synchronization
 */
export interface ViewportState {
  /** Zoom level (1.0 = 100%) */
  zoom: number;
  /** Pan offset X */
  panX: number;
  /** Pan offset Y */
  panY: number;
  /** Pan offset Z (3D only, defaults to 0 for 2D) */
  panZ: number;
}

/**
 * Node position mapping for synchronization between views
 * Maps node ID to both 2D and 3D positions
 */
export interface NodePositionMap {
  /** 2D position (x, y) */
  position2D: { x: number; y: number };
  /** 3D position (x, y, z) */
  position3D: Position3D;
  /** Whether the position was set by user interaction (dragging) */
  isUserPositioned: boolean;
  /** Timestamp of last position update */
  lastUpdated: number;
}

export interface GraphNodeData extends Record<string, unknown> {
  label: string;
  type: string;
  properties: Record<string, unknown>;
}

/**
 * Layout algorithm types
 */
export type LayoutAlgorithm = 'force' | 'hierarchical' | 'circular' | 'grid';

export interface GraphState {
  // Data
  nodes: Node<CustomNodeData>[];
  edges: Edge[];
  selectedNode: Node<CustomNodeData> | null;
  selectedRelationship: GraphEdge | null;
  viewMode: ViewMode;

  // Search state
  searchResults: SearchResult[];
  isSearching: boolean;
  searchQuery: string;

  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  isCreatingRelationship: boolean;
  isLoadingNodeTypes: boolean;

  // Error state
  error: string | null;

  // Connection mode state
  isConnectionMode: boolean;
  connectionSource: string | null;
  connectionTarget: string | null;

  // Query parameters
  centerNodeId: string | null;
  depth: number;

  // Layout state
  /** Selected layout algorithm */
  layoutAlgorithm: LayoutAlgorithm;
  /** Layout distance parameter (50-500 pixels) */
  layoutDistance: number;

  // Edge bundling state
  /** Whether edge bundling is enabled */
  edgeBundlingEnabled: boolean;

  // Isolation mode state
  /** Whether isolation mode is active */
  isIsolationMode: boolean;
  /** ID of the isolated node */
  isolatedNodeId: string | null;
  /** Depth of neighbor traversal */
  isolationDepth: number;
  /** Set of visible node IDs (isolated node + neighbors) */
  visibleNodeIds: Set<string>;

  // State synchronization between 2D and 3D views
  /** Node position mappings for synchronization between views */
  nodePositions: Map<string, NodePositionMap>;
  /** Current viewport state (zoom/pan) */
  viewport: ViewportState;
  /** Filter state for showing/hiding node types */
  nodeTypeFilter: NodeTypeFilter;
  /** Available node types from the backend */
  availableNodeTypes: string[];
  /** Whether a view transition is in progress */
  isViewTransitioning: boolean;
  /** Timestamp of last view mode change */
  lastViewModeChange: number;
}

export interface GraphActions {
  // Core operations
  loadGraph: (centerNodeId?: string, depth?: number) => Promise<void>;
  selectNode: (nodeId: string | null) => void;
  selectRelationship: (relationship: GraphEdge | null) => void;
  updateNode: (nodeId: string, data: WorkItemUpdate) => Promise<void>;
  updateRelationship: (relationshipId: string, type: string) => Promise<void>;
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

  // Layout operations
  /** Set the layout algorithm */
  setLayoutAlgorithm: (algorithm: LayoutAlgorithm) => void;
  /** Set the layout distance parameter */
  setLayoutDistance: (distance: number) => void;

  // Edge bundling operations
  /** Toggle edge bundling on/off */
  toggleEdgeBundling: () => void;
  /** Set edge bundling state */
  setEdgeBundling: (enabled: boolean) => void;

  // Isolation mode operations
  /** Enter isolation mode for a specific node */
  enterIsolationMode: (nodeId: string) => void;
  /** Exit isolation mode and restore full graph */
  exitIsolationMode: () => void;
  /** Update isolation depth and recalculate visible neighbors */
  updateIsolationDepth: (depth: number) => void;

  // Error handling
  clearError: () => void;

  // Connection mode operations
  /** Toggle connection mode on/off */
  toggleConnectionMode: () => void;
  /** Set the source node for connection */
  setConnectionSource: (nodeId: string | null) => void;
  /** Set the target node for connection */
  setConnectionTarget: (nodeId: string | null) => void;
  /** Create connection with duplicate check */
  createConnection: (sourceId: string, targetId: string, type: string) => Promise<void>;

  // Reset
  reset: () => void;

  // State synchronization between 2D and 3D views
  /** Update node position in 3D space (from 3D view) */
  updateNodePosition3D: (nodeId: string, position: Position3D) => void;
  /** Synchronize positions from 2D to 3D coordinate system */
  syncPositions2Dto3D: () => void;
  /** Synchronize positions from 3D to 2D coordinate system */
  syncPositions3Dto2D: () => void;
  /** Update viewport state (zoom/pan) */
  setViewport: (viewport: Partial<ViewportState>) => void;
  /** Toggle visibility of a node type */
  toggleNodeTypeFilter: (nodeType: FilterableNodeType) => void;
  /** Set all node type filters at once */
  setNodeTypeFilters: (filters: Partial<NodeTypeFilter>) => void;
  /** Get filtered nodes based on current filter state */
  getFilteredNodes: () => Node<GraphNodeData>[];
  /** Get filtered edges based on filtered nodes */
  getFilteredEdges: () => Edge[];
  /** Load available node types from backend */
  loadAvailableNodeTypes: () => Promise<void>;
  /** Mark view transition as starting */
  startViewTransition: () => void;
  /** Mark view transition as complete */
  endViewTransition: () => void;
  /** Get node position for a specific view mode */
  getNodePositionForView: (nodeId: string, viewMode: ViewMode) => { x: number; y: number } | Position3D | null;
}

export type GraphStore = GraphState & GraphActions;

/**
 * Default filter state - all node types visible
 */
const defaultNodeTypeFilter: NodeTypeFilter = {
  // Work item types
  requirement: true,
  task: true,
  test: true,
  risk: true,
  document: true,
  // Graph node types
  WorkItem: true,
  Project: true,
  Phase: true,
  Workpackage: true,
  Resource: true,
  Company: true,
  Department: true,
  Milestone: true,
  Sprint: true,
  Backlog: true,
  User: true,
  Entity: true,
  Document: true,
  Failure: true,
};

/**
 * Default viewport state
 */
const defaultViewport: ViewportState = {
  zoom: 1.0,
  panX: 0,
  panY: 0,
  panZ: 0,
};

/**
 * Load layout algorithm from local storage
 */
const loadLayoutAlgorithm = (): LayoutAlgorithm => {
  try {
    const stored = localStorage.getItem('graph-layout-algorithm');
    if (stored && ['force', 'hierarchical', 'circular', 'grid'].includes(stored)) {
      return stored as LayoutAlgorithm;
    }
  } catch (error) {
    console.error('Failed to load layout algorithm from storage:', error);
  }
  return 'force'; // Default
};

/**
 * Load layout distance from local storage
 */
const loadLayoutDistance = (): number => {
  try {
    const stored = localStorage.getItem('graph-layout-distance');
    if (stored !== null) {
      const distance = parseInt(stored, 10);
      // Validate: must be between 50-500 and multiple of 10
      if (!isNaN(distance) && distance >= 50 && distance <= 500 && distance % 10 === 0) {
        return distance;
      }
    }
  } catch (error) {
    console.error('Failed to load layout distance from storage:', error);
  }
  return 100; // Default
};

/**
 * Load edge bundling preference from local storage
 */
const loadEdgeBundlingEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem('graph-edge-bundling-enabled');
    if (stored !== null) {
      return stored === 'true';
    }
  } catch (error) {
    console.error('Failed to load edge bundling preference from storage:', error);
  }
  return false; // Default: disabled
};

const initialState: GraphState = {
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedRelationship: null,
  viewMode: '2d',
  searchResults: [],
  isSearching: false,
  searchQuery: '',
  isLoading: false,
  isUpdating: false,
  isCreatingRelationship: false,
  isLoadingNodeTypes: false,
  error: null,
  isConnectionMode: false,
  connectionSource: null,
  connectionTarget: null,
  centerNodeId: null,
  depth: 2,
  // Layout state
  layoutAlgorithm: loadLayoutAlgorithm(),
  layoutDistance: loadLayoutDistance(),
  // Edge bundling state
  edgeBundlingEnabled: loadEdgeBundlingEnabled(),
  // Isolation mode state
  isIsolationMode: false,
  isolatedNodeId: null,
  isolationDepth: 2,
  visibleNodeIds: new Set(),
  // State synchronization
  nodePositions: new Map(),
  viewport: { ...defaultViewport },
  nodeTypeFilter: { ...defaultNodeTypeFilter },
  availableNodeTypes: [],
  isViewTransitioning: false,
  lastViewModeChange: 0,
};

/**
 * Convert 2D position to 3D position
 * Maps 2D (x, y) to 3D (x, y, z) with y becoming z and a default y height
 * 
 * @param position2D - 2D position with x and y coordinates
 * @param scale - Scale factor for coordinate conversion (default: 0.02)
 * @returns 3D position with x, y, z coordinates
 */
export const convert2Dto3D = (
  position2D: { x: number; y: number },
  scale: number = 0.02
): Position3D => {
  return {
    x: position2D.x * scale,
    y: 0, // Default height in 3D space
    z: position2D.y * scale, // 2D y maps to 3D z
  };
};

/**
 * Convert 3D position to 2D position
 * Maps 3D (x, y, z) to 2D (x, y) with z becoming y
 * 
 * @param position3D - 3D position with x, y, z coordinates
 * @param scale - Scale factor for coordinate conversion (default: 0.02)
 * @returns 2D position with x and y coordinates
 */
export const convert3Dto2D = (
  position3D: Position3D,
  scale: number = 0.02
): { x: number; y: number } => {
  return {
    x: position3D.x / scale,
    y: position3D.z / scale, // 3D z maps to 2D y
  };
};

/**
 * Transform API GraphNode to react-flow Node format
 * Also initializes position mapping for synchronization
 */
const transformNode = (node: GraphNode): Node<CustomNodeData> => {
  const position2D = node.position ?? { x: Math.random() * 500, y: Math.random() * 500 };
  // Ensure node type is lowercase to match react-flow nodeTypes keys
  const nodeType = node.type?.toLowerCase() ?? 'default';
  
  // Extract common properties for easier access
  const priority = typeof node.properties.priority === 'number' ? node.properties.priority : undefined;
  const status = typeof node.properties.status === 'string' ? node.properties.status : undefined;
  
  const transformedNode = {
    id: node.id,
    type: nodeType,
    position: position2D,
    data: {
      label: node.label,
      type: nodeType,
      properties: node.properties,
      priority, // Extract for easier access
      status, // Extract for easier access
    },
  };
  
  console.log('[GraphStore] Transformed node:', {
    id: transformedNode.id,
    type: transformedNode.type,
    position: transformedNode.position,
    hasData: !!transformedNode.data,
    label: transformedNode.data.label,
    priority: transformedNode.data.priority,
    status: transformedNode.data.status,
  });
  
  return transformedNode;
};

/**
 * Create initial position mapping for a node
 */
const createPositionMapping = (
  _nodeId: string,
  position2D: { x: number; y: number }
): NodePositionMap => {
  return {
    position2D,
    position3D: convert2Dto3D(position2D),
    isUserPositioned: false,
    lastUpdated: Date.now(),
  };
};

/**
 * Transform API GraphEdge to react-flow Edge format
 */
const transformEdge = (edge: GraphEdge): Edge => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  type: 'straight', // Use straight edge type for proper node boundary connections
  label: edge.label,
  data: {
    ...edge.properties,
    age_id: edge.age_id,  // Preserve AGE ID for updates/deletes
    weight: edge.weight,  // Pass weight for thickness calculation
  },
});

/**
 * Calculate neighbors of a node up to a specified depth using breadth-first search
 * Handles both directed and undirected edges
 * 
 * @param nodeId - The starting node ID
 * @param nodes - Array of all nodes in the graph
 * @param edges - Array of all edges in the graph
 * @param depth - Maximum depth to traverse (1 = direct neighbors only)
 * @returns Array of neighbor node IDs (excluding the starting node)
 */
const calculateNeighbors = (
  nodeId: string,
  edges: Edge[],
  depth: number
): string[] => {
  const distances = new Map<string, number>();
  const queue: Array<{ id: string; level: number }> = [{ id: nodeId, level: 0 }];
  
  distances.set(nodeId, 0);
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    // Skip if we've already processed this node at a shorter distance
    if (distances.get(current.id)! < current.level) {
      continue;
    }
    
    // Skip if we've reached the depth limit
    if (current.level >= depth) continue;
    
    const nextLevel = current.level + 1;
    
    // Find all connected nodes (both directions for undirected graph behavior)
    edges.forEach(edge => {
      // Check if current node is the source
      if (edge.source === current.id) {
        const existingDistance = distances.get(edge.target);
        // Only process if this would be a shorter path and within depth
        if (nextLevel <= depth && (existingDistance === undefined || existingDistance > nextLevel)) {
          distances.set(edge.target, nextLevel);
          queue.push({ id: edge.target, level: nextLevel });
        }
      }
      // Check if current node is the target (undirected behavior)
      if (edge.target === current.id) {
        const existingDistance = distances.get(edge.source);
        // Only process if this would be a shorter path and within depth
        if (nextLevel <= depth && (existingDistance === undefined || existingDistance > nextLevel)) {
          distances.set(edge.source, nextLevel);
          queue.push({ id: edge.source, level: nextLevel });
        }
      }
    });
  }
  
  // Return all nodes within depth, excluding the starting node
  const neighbors: string[] = [];
  distances.forEach((distance, id) => {
    if (id !== nodeId && distance > 0 && distance <= depth) {
      neighbors.push(id);
    }
  });
  
  return neighbors;
};

export const useGraphStore = create<GraphStore>()((set, get) => ({
  ...initialState,

  loadGraph: async (centerNodeId?: string, depth?: number): Promise<void> => {
    console.log('[GraphStore] loadGraph called:', { centerNodeId, depth });
    set({ isLoading: true, error: null });

    try {
      const params: GraphVisualizationParams = {
        center_node_id: centerNodeId ?? get().centerNodeId ?? undefined,
        depth: depth ?? get().depth,
        limit: 1000, // Performance optimization as per design
      };

      console.log('[GraphStore] Calling graphService.getVisualization with params:', params);
      const graphData = await graphService.getVisualization(params);
      console.log('[GraphStore] Received graph data:', { 
        nodeCount: graphData.nodes.length, 
        edgeCount: graphData.edges.length 
      });

      // Enforce 1000 node limit (Requirement 13.4)
      let nodes = graphData.nodes.map(transformNode);
      let limitWarning: string | null = null;
      
      if (nodes.length > 1000) {
        console.warn('[GraphStore] Node count exceeds 1000, limiting to 1000 nodes');
        limitWarning = `Graph contains ${nodes.length} nodes. Displaying first 1000 nodes. Please use filters to reduce the dataset.`;
        nodes = nodes.slice(0, 1000);
      }

      const edges = graphData.edges.map(transformEdge);

      console.log('[GraphStore] Transformed data:', { 
        nodeCount: nodes.length, 
        edgeCount: edges.length 
      });

      // Initialize position mappings for all nodes
      const nodePositions = new Map<string, NodePositionMap>();
      nodes.forEach((node) => {
        const position = node.position || { x: 0, y: 0 };
        nodePositions.set(node.id, createPositionMapping(node.id, position));
      });

      // Preserve selected node if it still exists in the new data
      const { selectedNode } = get();
      const newSelectedNode = selectedNode
        ? nodes.find((n) => n.id === selectedNode.id) ?? null
        : null;

      console.log('[GraphStore] Setting state with nodes and edges');
      set({
        nodes,
        edges,
        selectedNode: newSelectedNode,
        centerNodeId: centerNodeId ?? get().centerNodeId,
        depth: depth ?? get().depth,
        nodePositions,
        isLoading: false,
        error: limitWarning, // Show warning if node limit exceeded
      });
      console.log('[GraphStore] State updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load graph';
      console.error('[GraphStore] Error loading graph:', error);
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

  selectRelationship: (relationship: GraphEdge | null): void => {
    set({ selectedRelationship: relationship });
    // Deselect node when selecting a relationship
    if (relationship) {
      set({ selectedNode: null });
    }
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

  updateRelationship: async (relationshipId: string, type: string): Promise<void> => {
    set({ isUpdating: true, error: null });

    try {
      const state = get();
      
      console.log('[GraphStore] updateRelationship called:', { relationshipId, type });
      console.log('[GraphStore] Current selectedRelationship:', state.selectedRelationship);
      
      // Find the edge being updated (before the update)
      const edgeToUpdate = state.edges.find((e) => e.id === relationshipId);
      
      console.log('[GraphStore] Edge to update:', edgeToUpdate);
      
      if (!edgeToUpdate) {
        throw new Error('Relationship not found in local state');
      }

      // Call backend to update (this creates a new relationship with new AGE ID)
      const updatedRelationship = await graphService.updateRelationship(relationshipId, type);
      
      console.log('[GraphStore] Backend returned:', updatedRelationship);

      // Update edge in local state - match by source/target since AGE ID changed
      set((state) => {
        const shouldUpdateSelected = state.selectedRelationship?.source === edgeToUpdate.source &&
                                     state.selectedRelationship?.target === edgeToUpdate.target;
        
        console.log('[GraphStore] Should update selected?', shouldUpdateSelected);
        console.log('[GraphStore] Comparison:', {
          selectedSource: state.selectedRelationship?.source,
          edgeSource: edgeToUpdate.source,
          selectedTarget: state.selectedRelationship?.target,
          edgeTarget: edgeToUpdate.target,
        });
        
        const newSelectedRelationship = shouldUpdateSelected
          ? {
              ...state.selectedRelationship!,
              type,
              id: updatedRelationship.id?.toString() || state.selectedRelationship!.id,
              age_id: typeof updatedRelationship.id === 'number' ? updatedRelationship.id : undefined,
            }
          : state.selectedRelationship;
        
        console.log('[GraphStore] New selectedRelationship:', newSelectedRelationship);
        
        return {
          edges: state.edges.map((e) => {
            // Match by source and target (since AGE ID changed)
            if (e.source === edgeToUpdate.source && e.target === edgeToUpdate.target) {
              // Update with new type and new AGE ID from backend
              return {
                ...e,
                type,
                // Update the ID if backend returned a new one
                id: updatedRelationship.id?.toString() || e.id,
                data: {
                  ...e.data,
                  age_id: typeof updatedRelationship.id === 'number' ? updatedRelationship.id : undefined,
                },
              };
            }
            return e;
          }),
          selectedRelationship: newSelectedRelationship,
          isUpdating: false,
        };
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to update relationship';
      console.error('[GraphStore] Update failed:', error);
      set({ error: message, isUpdating: false });
      throw error;
    }
  },

  deleteRelationship: async (relationshipId: string): Promise<void> => {
    set({ isUpdating: true, error: null });

    try {
      const state = get();
      
      console.log('[GraphStore] deleteRelationship called:', { relationshipId });
      console.log('[GraphStore] Current selectedRelationship:', state.selectedRelationship);
      
      // Find the edge being deleted (before deletion)
      const edgeToDelete = state.edges.find((e) => e.id === relationshipId);
      
      console.log('[GraphStore] Edge to delete:', edgeToDelete);
      
      if (!edgeToDelete) {
        throw new Error('Relationship not found in local state');
      }

      // Call backend to delete
      await graphService.deleteRelationship(relationshipId);
      
      console.log('[GraphStore] Backend delete successful');

      // Remove edge from local state - match by source/target to be safe
      set((state) => {
        const shouldClearSelected = state.selectedRelationship?.source === edgeToDelete.source &&
                                    state.selectedRelationship?.target === edgeToDelete.target;
        
        console.log('[GraphStore] Should clear selected?', shouldClearSelected);
        
        return {
          edges: state.edges.filter((e) => 
            !(e.source === edgeToDelete.source && e.target === edgeToDelete.target)
          ),
          selectedRelationship: shouldClearSelected ? null : state.selectedRelationship,
          isUpdating: false,
        };
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete relationship';
      console.error('[GraphStore] Delete failed:', error);
      set({ error: message, isUpdating: false });
      throw error;
    }
  },

  setViewMode: (mode: ViewMode): void => {
    const currentMode = get().viewMode;
    if (currentMode === mode) return;

    // Mark transition as starting
    set({ isViewTransitioning: true });

    // Synchronize positions before switching
    // Note: Filter state (nodeTypeFilter) is automatically preserved
    // during view transitions as it's part of the store state
    if (currentMode === '2d' && mode === '3d') {
      // Switching from 2D to 3D - sync 2D positions to 3D
      get().syncPositions2Dto3D();
    } else if (currentMode === '3d' && mode === '2d') {
      // Switching from 3D to 2D - sync 3D positions to 2D
      get().syncPositions3Dto2D();
    }

    set({ 
      viewMode: mode,
      lastViewModeChange: Date.now(),
    });

    // End transition after a short delay to allow view to render
    setTimeout(() => {
      set({ isViewTransitioning: false });
    }, 100);
  },

  updateNodePosition: (nodeId: string, position: { x: number; y: number }): void => {
    const { nodePositions } = get();
    const existingMapping = nodePositions.get(nodeId);
    
    // Update position mapping
    const newMapping: NodePositionMap = {
      position2D: position,
      position3D: existingMapping?.position3D ?? convert2Dto3D(position),
      isUserPositioned: true,
      lastUpdated: Date.now(),
    };
    
    const newPositions = new Map(nodePositions);
    newPositions.set(nodeId, newMapping);

    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, position } : node
      ),
      // Update selected node position if it's the one being moved
      selectedNode:
        state.selectedNode?.id === nodeId
          ? { ...state.selectedNode, position }
          : state.selectedNode,
      nodePositions: newPositions,
    }));
  },

  setCenterNode: (nodeId: string | null): void => {
    set({ centerNodeId: nodeId });
  },

  setDepth: (depth: number): void => {
    set({ depth: Math.max(1, Math.min(depth, 10)) }); // Clamp between 1 and 10
  },

  setLayoutAlgorithm: (algorithm: LayoutAlgorithm): void => {
    set({ layoutAlgorithm: algorithm });
    // Persist to local storage
    try {
      localStorage.setItem('graph-layout-algorithm', algorithm);
    } catch (error) {
      console.error('Failed to persist layout algorithm:', error);
    }
  },

  setLayoutDistance: (distance: number): void => {
    // Validate and clamp distance value (50-500, multiples of 10)
    let validDistance = Math.max(50, Math.min(500, distance));
    // Round to nearest multiple of 10
    validDistance = Math.round(validDistance / 10) * 10;
    
    set({ layoutDistance: validDistance });
    // Persist to local storage
    try {
      localStorage.setItem('graph-layout-distance', validDistance.toString());
    } catch (error) {
      console.error('Failed to persist layout distance:', error);
    }
  },

  toggleEdgeBundling: (): void => {
    const newValue = !get().edgeBundlingEnabled;
    set({ edgeBundlingEnabled: newValue });
    // Persist to local storage
    try {
      localStorage.setItem('graph-edge-bundling-enabled', String(newValue));
    } catch (error) {
      console.error('Failed to persist edge bundling preference:', error);
    }
  },

  setEdgeBundling: (enabled: boolean): void => {
    set({ edgeBundlingEnabled: enabled });
    // Persist to local storage
    try {
      localStorage.setItem('graph-edge-bundling-enabled', String(enabled));
    } catch (error) {
      console.error('Failed to persist edge bundling preference:', error);
    }
  },

  // ============================================================================
  // Isolation Mode Methods
  // ============================================================================

  /**
   * Enter isolation mode for a specific node
   * Calculates and displays only the isolated node and its neighbors up to the current depth
   */
  enterIsolationMode: (nodeId: string): void => {
    const state = get();
    const depth = state.depth;
    
    // Calculate neighbors up to depth
    const neighbors = calculateNeighbors(nodeId, state.edges, depth);
    const visibleIds = new Set([nodeId, ...neighbors]);
    
    set({
      isIsolationMode: true,
      isolatedNodeId: nodeId,
      isolationDepth: depth,
      visibleNodeIds: visibleIds,
    });
  },

  /**
   * Exit isolation mode and restore full graph view
   */
  exitIsolationMode: (): void => {
    set({
      isIsolationMode: false,
      isolatedNodeId: null,
      visibleNodeIds: new Set(),
    });
  },

  /**
   * Update isolation depth and recalculate visible neighbors
   * Only has effect when isolation mode is active
   */
  updateIsolationDepth: (depth: number): void => {
    const state = get();
    if (!state.isIsolationMode || !state.isolatedNodeId) return;
    
    // Recalculate neighbors with new depth
    const neighbors = calculateNeighbors(
      state.isolatedNodeId,
      state.edges,
      depth
    );
    const visibleIds = new Set([state.isolatedNodeId, ...neighbors]);
    
    set({
      isolationDepth: depth,
      visibleNodeIds: visibleIds,
    });
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
      // Search across ALL nodes in the current graph, not just via API
      const state = get();
      const allNodes = state.nodes;
      const normalizedQuery = query.toLowerCase().trim();
      
      // Filter nodes by ID or label (case-insensitive)
      const matchingNodes = allNodes.filter(node => {
        const idMatch = node.id.toLowerCase().includes(normalizedQuery);
        const labelMatch = node.data?.label?.toLowerCase().includes(normalizedQuery);
        return idMatch || labelMatch;
      });
      
      // Transform to SearchResult format
      const searchResults: SearchResult[] = matchingNodes.map(node => ({
        id: node.id,
        type: node.data?.type || node.type || 'unknown',
        label: node.data?.label || 'Untitled',
        properties: node.data?.properties || {},
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
    // Clear search results and query
    set({ searchResults: [], searchQuery: '', isSearching: false });
    
    // Set the selected node as center and reload the graph
    set({ centerNodeId: result.id });
    
    // Load the graph centered on the selected node
    await get().loadGraph(result.id);
    
    // After loading, select the node to highlight it
    const state = get();
    const node = state.nodes.find(n => n.id === result.id);
    if (node) {
      set({ selectedNode: node });
    }
  },

  // ============================================================================
  // Connection Mode Methods
  // ============================================================================

  /**
   * Toggle connection mode on/off
   * Resets connection state when toggling off
   */
  toggleConnectionMode: (): void => {
    set((state) => ({
      isConnectionMode: !state.isConnectionMode,
      connectionSource: !state.isConnectionMode ? null : state.connectionSource,
      connectionTarget: null,
      error: null,
    }));
  },

  /**
   * Set the source node for connection
   * First node selected in connection mode
   */
  setConnectionSource: (nodeId: string | null): void => {
    set({ connectionSource: nodeId, connectionTarget: null, error: null });
  },

  /**
   * Set the target node for connection
   * Second node selected in connection mode
   */
  setConnectionTarget: (nodeId: string | null): void => {
    set({ connectionTarget: nodeId, error: null });
  },

  /**
   * Create connection with duplicate relationship prevention
   * Validates that no duplicate relationship exists before creating
   */
  createConnection: async (sourceId: string, targetId: string, type: string): Promise<void> => {
    set({ isCreatingRelationship: true, error: null });

    try {
      // Check for duplicate relationships
      const { edges } = get();
      const duplicateExists = edges.some(
        (edge) =>
          edge.source === sourceId &&
          edge.target === targetId &&
          edge.type === type
      );

      if (duplicateExists) {
        throw new Error(
          `A relationship of type "${type}" already exists between these nodes`
        );
      }

      // Create the relationship
      await graphService.createRelationship(sourceId, targetId, type);

      // Reload graph to get updated relationships
      await get().loadGraph();

      // Reset connection mode state
      set({
        isCreatingRelationship: false,
        isConnectionMode: false,
        connectionSource: null,
        connectionTarget: null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create relationship';
      set({ error: message, isCreatingRelationship: false });
      throw error;
    }
  },

  reset: (): void => {
    set({
      ...initialState,
      nodePositions: new Map(),
      viewport: { ...defaultViewport },
      nodeTypeFilter: { ...defaultNodeTypeFilter },
    });
  },

  // ============================================================================
  // State Synchronization Methods
  // ============================================================================

  /**
   * Update node position in 3D space (called from 3D view)
   * Also updates the position mapping for synchronization
   */
  updateNodePosition3D: (nodeId: string, position: Position3D): void => {
    const { nodePositions } = get();
    const existingMapping = nodePositions.get(nodeId);
    
    // Update position mapping with new 3D position
    const newMapping: NodePositionMap = {
      position2D: existingMapping?.position2D ?? convert3Dto2D(position),
      position3D: position,
      isUserPositioned: true,
      lastUpdated: Date.now(),
    };
    
    const newPositions = new Map(nodePositions);
    newPositions.set(nodeId, newMapping);

    set({ nodePositions: newPositions });
  },

  /**
   * Synchronize positions from 2D to 3D coordinate system
   * Called when switching from 2D to 3D view
   */
  syncPositions2Dto3D: (): void => {
    const { nodes, nodePositions } = get();
    const newPositions = new Map(nodePositions);

    nodes.forEach((node) => {
      const existingMapping = nodePositions.get(node.id);
      const position2D = node.position;
      
      // Convert 2D position to 3D
      const position3D = convert2Dto3D(position2D);
      
      newPositions.set(node.id, {
        position2D,
        position3D,
        isUserPositioned: existingMapping?.isUserPositioned ?? false,
        lastUpdated: Date.now(),
      });
    });

    set({ nodePositions: newPositions });
  },

  /**
   * Synchronize positions from 3D to 2D coordinate system
   * Called when switching from 3D to 2D view
   */
  syncPositions3Dto2D: (): void => {
    const { nodes, nodePositions } = get();
    const newPositions = new Map(nodePositions);
    const updatedNodes: Node<GraphNodeData>[] = [];

    nodes.forEach((node) => {
      const existingMapping = nodePositions.get(node.id);
      
      if (existingMapping && existingMapping.isUserPositioned) {
        // Convert 3D position back to 2D
        const position2D = convert3Dto2D(existingMapping.position3D);
        
        updatedNodes.push({
          ...node,
          position: position2D,
        });
        
        newPositions.set(node.id, {
          position2D,
          position3D: existingMapping.position3D,
          isUserPositioned: true,
          lastUpdated: Date.now(),
        });
      } else {
        updatedNodes.push(node);
      }
    });

    set({ 
      nodes: updatedNodes,
      nodePositions: newPositions,
    });
  },

  /**
   * Update viewport state (zoom/pan)
   * Synchronizes viewport between 2D and 3D views where applicable
   */
  setViewport: (viewport: Partial<ViewportState>): void => {
    set((state) => ({
      viewport: {
        ...state.viewport,
        ...viewport,
      },
    }));
  },

  /**
   * Toggle visibility of a specific node type
   */
  toggleNodeTypeFilter: (nodeType: FilterableNodeType): void => {
    set((state) => ({
      nodeTypeFilter: {
        ...state.nodeTypeFilter,
        [nodeType]: !state.nodeTypeFilter[nodeType],
      },
    }));
  },

  /**
   * Set multiple node type filters at once
   */
  setNodeTypeFilters: (filters: Partial<NodeTypeFilter>): void => {
    set((state) => ({
      nodeTypeFilter: {
        ...state.nodeTypeFilter,
        ...filters,
      },
    }));
  },

  /**
   * Get filtered nodes based on current filter state
   * Returns only nodes whose types are enabled in the filter
   * Handles both work item types (lowercase) and graph node types (PascalCase)
   */
  getFilteredNodes: (): Node<GraphNodeData>[] => {
    const { nodes, nodeTypeFilter } = get();
    return nodes.filter((node) => {
      const nodeType = (node.data?.type || node.type || 'default') as string;
      
      // Check if this node type is in the filter (exact match)
      if (nodeType in nodeTypeFilter) {
        return nodeTypeFilter[nodeType as FilterableNodeType];
      }
      
      // Check case-insensitive match (e.g., "project" matches "Project")
      const filterKeys = Object.keys(nodeTypeFilter);
      const matchingKey = filterKeys.find(key => key.toLowerCase() === nodeType.toLowerCase());
      if (matchingKey) {
        return nodeTypeFilter[matchingKey as FilterableNodeType];
      }
      
      // For WorkItem nodes, also check the work item subtype
      // Backend may return nodes with type "WorkItem" and properties.type = "requirement"
      if (nodeType.toLowerCase() === 'workitem') {
        const workItemType = node.data?.properties?.type as string | undefined;
        if (workItemType) {
          // Check exact match
          if (workItemType in nodeTypeFilter) {
            return nodeTypeFilter[workItemType as FilterableNodeType];
          }
          // Check case-insensitive match
          const workItemMatchingKey = filterKeys.find(key => key.toLowerCase() === workItemType.toLowerCase());
          if (workItemMatchingKey) {
            return nodeTypeFilter[workItemMatchingKey as FilterableNodeType];
          }
        }
        // If WorkItem filter exists, use it
        if ('WorkItem' in nodeTypeFilter) {
          return nodeTypeFilter.WorkItem;
        }
        // Check case-insensitive for WorkItem
        const workItemKey = filterKeys.find(key => key.toLowerCase() === 'workitem');
        if (workItemKey) {
          return nodeTypeFilter[workItemKey as FilterableNodeType];
        }
      }
      
      // Hide nodes with unknown types by default (if not in filter, don't show)
      return false;
    });
  },

  /**
   * Get filtered edges based on filtered nodes
   * Returns only edges where both source and target nodes are visible
   */
  getFilteredEdges: (): Edge[] => {
    const { edges } = get();
    const filteredNodes = get().getFilteredNodes();
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    
    return edges.filter((edge) => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
  },

  /**
   * Load available node types from backend
   * Updates availableNodeTypes state with types from the graph schema
   */
  loadAvailableNodeTypes: async (): Promise<void> => {
    set({ isLoadingNodeTypes: true, error: null });

    try {
      const nodeTypes = await graphService.getAvailableNodeTypes();
      set({ availableNodeTypes: nodeTypes, isLoadingNodeTypes: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load node types';
      console.error('[GraphStore] Error loading node types:', error);
      set({ error: message, isLoadingNodeTypes: false });
    }
  },

  /**
   * Mark view transition as starting
   * Used to handle edge cases during view switching
   */
  startViewTransition: (): void => {
    set({ isViewTransitioning: true });
  },

  /**
   * Mark view transition as complete
   */
  endViewTransition: (): void => {
    set({ isViewTransitioning: false });
  },

  /**
   * Get node position for a specific view mode
   * Returns the appropriate position format based on the view mode
   */
  getNodePositionForView: (
    nodeId: string, 
    viewMode: ViewMode
  ): { x: number; y: number } | Position3D | null => {
    const { nodePositions } = get();
    const mapping = nodePositions.get(nodeId);
    
    if (!mapping) return null;
    
    return viewMode === '2d' ? mapping.position2D : mapping.position3D;
  },
}));

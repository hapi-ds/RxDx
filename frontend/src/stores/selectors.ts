/**
 * Zustand selector utilities for optimized state management
 * 
 * Provides shallow equality comparison and selector helpers to prevent
 * unnecessary re-renders when using Zustand stores.
 * 
 * Usage:
 * ```typescript
 * // Instead of:
 * const { nodes, edges, isLoading } = useGraphStore();
 * 
 * // Use:
 * const { nodes, edges, isLoading } = useGraphStore(
 *   selectGraphData,
 *   shallow
 * );
 * ```
 */

import { shallow } from 'zustand/shallow';
import type { GraphStore } from './graphStore';
import type { WorkItemStore } from './workitemStore';

/**
 * Shallow equality comparison for Zustand selectors
 * Re-exported from zustand/shallow for convenience
 */
export { shallow };

/**
 * Graph store selectors
 */

/**
 * Select only graph data (nodes and edges)
 * Use this when you only need to render the graph
 */
export const selectGraphData = (state: GraphStore) => ({
  nodes: state.nodes,
  edges: state.edges,
});

/**
 * Select only graph loading states
 * Use this when you only need to show loading indicators
 */
export const selectGraphLoadingStates = (state: GraphStore) => ({
  isLoading: state.isLoading,
  isUpdating: state.isUpdating,
  isCreatingRelationship: state.isCreatingRelationship,
  isLoadingNodeTypes: state.isLoadingNodeTypes,
  isViewTransitioning: state.isViewTransitioning,
});

/**
 * Select only graph selection state
 * Use this when you only need to know what's selected
 */
export const selectGraphSelection = (state: GraphStore) => ({
  selectedNode: state.selectedNode,
  selectedRelationship: state.selectedRelationship,
});

/**
 * Select only graph filter state
 * Use this when you only need filter information
 */
export const selectGraphFilters = (state: GraphStore) => ({
  nodeTypeFilter: state.nodeTypeFilter,
  availableNodeTypes: state.availableNodeTypes,
});

/**
 * Select only graph search state
 * Use this when you only need search information
 */
export const selectGraphSearch = (state: GraphStore) => ({
  searchResults: state.searchResults,
  isSearching: state.isSearching,
  searchQuery: state.searchQuery,
});

/**
 * Select only graph connection mode state
 * Use this when you only need connection mode information
 */
export const selectGraphConnectionMode = (state: GraphStore) => ({
  isConnectionMode: state.isConnectionMode,
  connectionSource: state.connectionSource,
  connectionTarget: state.connectionTarget,
});

/**
 * Select only graph actions
 * Use this when you only need to call actions
 */
export const selectGraphActions = (state: GraphStore) => ({
  loadGraph: state.loadGraph,
  selectNode: state.selectNode,
  selectRelationship: state.selectRelationship,
  updateNode: state.updateNode,
  updateRelationship: state.updateRelationship,
  createRelationship: state.createRelationship,
  deleteRelationship: state.deleteRelationship,
  searchNodes: state.searchNodes,
  clearSearch: state.clearSearch,
  selectSearchResult: state.selectSearchResult,
  setViewMode: state.setViewMode,
  updateNodePosition: state.updateNodePosition,
  setCenterNode: state.setCenterNode,
  setDepth: state.setDepth,
  setLayoutAlgorithm: state.setLayoutAlgorithm,
  clearError: state.clearError,
  toggleConnectionMode: state.toggleConnectionMode,
  setConnectionSource: state.setConnectionSource,
  setConnectionTarget: state.setConnectionTarget,
  createConnection: state.createConnection,
  reset: state.reset,
  updateNodePosition3D: state.updateNodePosition3D,
  syncPositions2Dto3D: state.syncPositions2Dto3D,
  syncPositions3Dto2D: state.syncPositions3Dto2D,
  setViewport: state.setViewport,
  toggleNodeTypeFilter: state.toggleNodeTypeFilter,
  setNodeTypeFilters: state.setNodeTypeFilters,
  getFilteredNodes: state.getFilteredNodes,
  getFilteredEdges: state.getFilteredEdges,
  loadAvailableNodeTypes: state.loadAvailableNodeTypes,
  startViewTransition: state.startViewTransition,
  endViewTransition: state.endViewTransition,
  getNodePositionForView: state.getNodePositionForView,
});

/**
 * WorkItem store selectors
 */

/**
 * Select only workitem data
 * Use this when you only need to render the list
 */
export const selectWorkItemData = (state: WorkItemStore) => ({
  items: state.items,
});

/**
 * Select only workitem loading states
 * Use this when you only need to show loading indicators
 */
export const selectWorkItemLoadingStates = (state: WorkItemStore) => ({
  isLoading: state.isLoading,
  isSaving: state.isSaving,
  isDeleting: state.isDeleting,
  isBulkUpdating: state.isBulkUpdating,
});

/**
 * Select only workitem filter state
 * Use this when you only need filter information
 */
export const selectWorkItemFilters = (state: WorkItemStore) => ({
  filters: state.filters,
});

/**
 * Select only workitem bulk edit state
 * Use this when you only need bulk edit information
 */
export const selectWorkItemBulkEdit = (state: WorkItemStore) => ({
  isBulkEditing: state.isBulkEditing,
  selectedIds: state.selectedIds,
});

/**
 * Select only workitem actions
 * Use this when you only need to call actions
 */
export const selectWorkItemActions = (state: WorkItemStore) => ({
  fetchItems: state.fetchItems,
  createItem: state.createItem,
  updateItem: state.updateItem,
  deleteItem: state.deleteItem,
  setFilters: state.setFilters,
  clearFilters: state.clearFilters,
  toggleBulkEdit: state.toggleBulkEdit,
  selectItemForBulk: state.selectItemForBulk,
  deselectItemForBulk: state.deselectItemForBulk,
  selectAll: state.selectAll,
  deselectAll: state.deselectAll,
  bulkUpdate: state.bulkUpdate,
  clearError: state.clearError,
});

/**
 * Create a selector that only returns a specific field
 * Use this for primitive values that change frequently
 * 
 * @example
 * const isLoading = useGraphStore(selectField('isLoading'));
 */
export function selectField<T extends GraphStore | WorkItemStore, K extends keyof T>(
  field: K
): (state: T) => T[K] {
  return (state: T) => state[field];
}

/**
 * Create a selector that returns multiple fields
 * Use this when you need several related fields
 * 
 * @example
 * const { nodes, edges } = useGraphStore(
 *   selectFields(['nodes', 'edges']),
 *   shallow
 * );
 */
export function selectFields<T extends GraphStore | WorkItemStore, K extends keyof T>(
  fields: K[]
): (state: T) => Pick<T, K> {
  return (state: T) => {
    const result = {} as Pick<T, K>;
    fields.forEach((field) => {
      result[field] = state[field];
    });
    return result;
  };
}

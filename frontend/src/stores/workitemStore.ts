/**
 * WorkItem store using Zustand
 * Handles workitem state management including CRUD operations, filtering, and version history
 */

import { create } from 'zustand';
import {
  workitemService,
  type WorkItem,
  type WorkItemCreate,
  type WorkItemUpdate,
  type WorkItemListParams,
  type WorkItemType,
  type WorkItemStatus,
  type VersionHistoryItem,
  type BulkUpdateData,
} from '../services/workitemService';

export interface WorkItemFilters {
  type?: WorkItemType;
  status?: WorkItemStatus;
  assignedTo?: string;
  search?: string;
  nodeTypes?: Set<string>; // Multi-select node type filter
}

export interface WorkItemState {
  // Data
  items: WorkItem[];
  selectedItem: WorkItem | null;
  versionHistory: VersionHistoryItem[];
  total: number;
  
  // Pagination
  skip: number;
  limit: number;
  
  // Filters
  filters: WorkItemFilters;
  
  // Bulk edit state
  selectedIds: Set<string>;
  isBulkEditing: boolean;
  isBulkUpdating: boolean;
  
  // Loading states
  isLoading: boolean;
  isLoadingItem: boolean;
  isLoadingHistory: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  
  // Error state
  error: string | null;
}

export interface WorkItemActions {
  // CRUD operations
  fetchItems: (params?: WorkItemListParams) => Promise<void>;
  fetchItem: (id: string) => Promise<void>;
  createItem: (data: WorkItemCreate) => Promise<WorkItem>;
  updateItem: (id: string, data: WorkItemUpdate, changeDescription?: string) => Promise<WorkItem>;
  deleteItem: (id: string) => Promise<void>;
  
  // Version history
  fetchVersionHistory: (id: string) => Promise<void>;
  fetchVersion: (id: string, version: string) => Promise<WorkItem>;
  
  // Selection
  selectItem: (item: WorkItem | null) => void;
  clearSelection: () => void;
  
  // Bulk edit operations
  toggleBulkEdit: () => void;
  selectItemForBulk: (id: string) => void;
  deselectItemForBulk: (id: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  bulkUpdate: (data: BulkUpdateData) => Promise<void>;
  
  // Filters
  setFilters: (filters: WorkItemFilters) => void;
  clearFilters: () => void;
  setNodeTypeFilter: (types: Set<string>) => void; // New method for node type filter
  
  // Pagination
  setPage: (skip: number) => void;
  setLimit: (limit: number) => void;
  
  // Error handling
  clearError: () => void;
  
  // Reset
  reset: () => void;
}

export type WorkItemStore = WorkItemState & WorkItemActions;

const initialState: WorkItemState = {
  items: [],
  selectedItem: null,
  versionHistory: [],
  total: 0,
  skip: 0,
  limit: 20,
  filters: {},
  selectedIds: new Set<string>(),
  isBulkEditing: false,
  isBulkUpdating: false,
  isLoading: false,
  isLoadingItem: false,
  isLoadingHistory: false,
  isSaving: false,
  isDeleting: false,
  error: null,
};

export const useWorkItemStore = create<WorkItemStore>()((set, get) => ({
  ...initialState,

  fetchItems: async (params?: WorkItemListParams): Promise<void> => {
    set({ isLoading: true, error: null });
    
    try {
      const { filters, skip, limit } = get();
      const queryParams: WorkItemListParams = {
        ...filters,
        skip,
        limit,
        ...params,
      };
      
      // Map filter keys to API format
      if (filters.assignedTo) {
        queryParams.assigned_to = filters.assignedTo;
      }
      
      // Handle nodeTypes filter - if set, use it instead of single type filter
      if (filters.nodeTypes && filters.nodeTypes.size > 0) {
        // Convert Set to array
        const types = Array.from(filters.nodeTypes);
        if (types.length === 1) {
          // Single type - use backend filter
          queryParams.type = types[0] as WorkItemType;
        } else {
          // Multiple types - need to fetch more items for client-side filtering
          // Increase limit to ensure we get enough items of each type
          // Use a large limit (e.g., 1000) to get all items
          queryParams.limit = 1000;
          delete queryParams.type; // Don't filter by type on backend
        }
      }
      
      const response = await workitemService.list(queryParams);
      
      // Client-side filtering for multiple node types until backend supports it
      let filteredItems = response.items;
      if (filters.nodeTypes && filters.nodeTypes.size > 0 && filters.nodeTypes.size > 1) {
        filteredItems = response.items.filter(item => 
          filters.nodeTypes!.has(item.type)
        );
      }
      
      set({
        items: filteredItems,
        total: filteredItems.length, // Adjust total for client-side filtering
        skip: response.skip,
        limit: response.limit,
        isLoading: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch work items';
      set({ error: message, isLoading: false });
    }
  },

  fetchItem: async (id: string): Promise<void> => {
    set({ isLoadingItem: true, error: null });
    
    try {
      const item = await workitemService.get(id);
      set({ selectedItem: item, isLoadingItem: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch work item';
      set({ error: message, isLoadingItem: false });
    }
  },

  createItem: async (data: WorkItemCreate): Promise<WorkItem> => {
    set({ isSaving: true, error: null });
    
    try {
      const newItem = await workitemService.create(data);
      
      // Add to items list
      set((state) => ({
        items: [newItem, ...state.items],
        total: state.total + 1,
        isSaving: false,
      }));
      
      return newItem;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create work item';
      set({ error: message, isSaving: false });
      throw error;
    }
  },

  updateItem: async (id: string, data: WorkItemUpdate, changeDescription?: string): Promise<WorkItem> => {
    set({ isSaving: true, error: null });
    
    try {
      const updatedItem = await workitemService.update(id, data, changeDescription);
      
      // Update in items list
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? updatedItem : item
        ),
        selectedItem: state.selectedItem?.id === id ? updatedItem : state.selectedItem,
        isSaving: false,
      }));
      
      return updatedItem;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update work item';
      set({ error: message, isSaving: false });
      throw error;
    }
  },

  deleteItem: async (id: string): Promise<void> => {
    set({ isDeleting: true, error: null });
    
    try {
      await workitemService.delete(id);
      
      // Remove from items list
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        total: state.total - 1,
        selectedItem: state.selectedItem?.id === id ? null : state.selectedItem,
        isDeleting: false,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete work item';
      set({ error: message, isDeleting: false });
      throw error;
    }
  },

  fetchVersionHistory: async (id: string): Promise<void> => {
    set({ isLoadingHistory: true, error: null });
    
    try {
      const history = await workitemService.getHistory(id);
      set({ versionHistory: history, isLoadingHistory: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch version history';
      set({ error: message, isLoadingHistory: false });
    }
  },

  fetchVersion: async (id: string, version: string): Promise<WorkItem> => {
    set({ isLoadingItem: true, error: null });
    
    try {
      const item = await workitemService.getVersion(id, version);
      set({ isLoadingItem: false });
      return item;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch version';
      set({ error: message, isLoadingItem: false });
      throw error;
    }
  },

  selectItem: (item: WorkItem | null): void => {
    set({ selectedItem: item });
  },

  clearSelection: (): void => {
    set({ selectedItem: null, versionHistory: [] });
  },

  toggleBulkEdit: (): void => {
    set((state) => ({
      isBulkEditing: !state.isBulkEditing,
      selectedIds: new Set<string>(), // Clear selections when toggling
    }));
  },

  selectItemForBulk: (id: string): void => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedIds);
      newSelectedIds.add(id);
      return { selectedIds: newSelectedIds };
    });
  },

  deselectItemForBulk: (id: string): void => {
    set((state) => {
      const newSelectedIds = new Set(state.selectedIds);
      newSelectedIds.delete(id);
      return { selectedIds: newSelectedIds };
    });
  },

  selectAll: (): void => {
    set((state) => {
      const allIds = new Set(state.items.map((item) => item.id));
      return { selectedIds: allIds };
    });
  },

  deselectAll: (): void => {
    set({ selectedIds: new Set<string>() });
  },

  bulkUpdate: async (data: BulkUpdateData): Promise<void> => {
    const { selectedIds } = get();
    
    if (selectedIds.size === 0) {
      set({ error: 'No items selected for bulk update' });
      return;
    }

    set({ isBulkUpdating: true, error: null });

    try {
      const ids = Array.from(selectedIds);
      const response = await workitemService.bulkUpdate(ids, data);

      // Update items in the store with the updated items
      set((state) => {
        const updatedItemsMap = new Map(
          response.updated.map((item) => [item.id, item])
        );

        const updatedItems = state.items.map((item) =>
          updatedItemsMap.has(item.id) ? updatedItemsMap.get(item.id)! : item
        );

        return {
          items: updatedItems,
          isBulkUpdating: false,
          isBulkEditing: false,
          selectedIds: new Set<string>(),
        };
      });

      // If there were failures, set error message
      if (response.failed.length > 0) {
        const failedCount = response.failed.length;
        const successCount = response.updated.length;
        set({
          error: `Bulk update completed with ${successCount} success(es) and ${failedCount} failure(s)`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to bulk update work items';
      set({ error: message, isBulkUpdating: false });
      throw error;
    }
  },

  setFilters: (filters: WorkItemFilters): void => {
    set({ filters, skip: 0 });
  },

  clearFilters: (): void => {
    set({ filters: {}, skip: 0 });
  },

  setNodeTypeFilter: (types: Set<string>): void => {
    set((state) => ({
      filters: { ...state.filters, nodeTypes: types },
      skip: 0,
    }));
  },

  setPage: (skip: number): void => {
    set({ skip });
  },

  setLimit: (limit: number): void => {
    set({ limit, skip: 0 });
  },

  clearError: (): void => {
    set({ error: null });
  },

  reset: (): void => {
    set(initialState);
  },
}));

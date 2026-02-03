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
} from '../services/workitemService';

export interface WorkItemFilters {
  type?: WorkItemType;
  status?: WorkItemStatus;
  assignedTo?: string;
  search?: string;
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
  
  // Filters
  setFilters: (filters: WorkItemFilters) => void;
  clearFilters: () => void;
  
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
      
      const response = await workitemService.list(queryParams);
      
      set({
        items: response.items,
        total: response.total,
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

  setFilters: (filters: WorkItemFilters): void => {
    set({ filters, skip: 0 });
  },

  clearFilters: (): void => {
    set({ filters: {}, skip: 0 });
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

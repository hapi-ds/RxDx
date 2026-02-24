/**
 * Time Tracking store using Zustand
 * Handles time tracking state management including tasks, active tracking, and time entries
 */

import { create } from 'zustand';
import {
  timeTrackingService,
  type Task,
  type ActiveTracking,
  type TimeEntry,
} from '../services/timeTrackingService';

// ============================================================================
// State Interface
// ============================================================================

export interface TimeTrackingState {
  // Data
  tasks: Task[];
  activeTracking: ActiveTracking | null;
  entries: TimeEntry[];
  
  // UI State
  selectedTaskId: string | null;
  searchQuery: string;
  
  // Pagination
  entriesPage: number;
  entriesHasMore: boolean;
  
  // Loading States
  isLoadingTasks: boolean;
  isLoadingEntries: boolean;
  isStarting: boolean;
  isStopping: boolean;
  
  // Error State
  error: string | null;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface TimeTrackingActions {
  // Task operations
  fetchTasks: () => Promise<void>;
  selectTask: (taskId: string | null) => void;
  setSearchQuery: (query: string) => void;
  
  // Time tracking operations
  startTracking: (taskId: string, description: string) => Promise<void>;
  stopTracking: (description: string) => Promise<void>;
  checkActiveTracking: () => Promise<void>;
  
  // Time entry operations
  fetchEntries: () => Promise<void>;
  loadMoreEntries: () => Promise<void>;
  
  // Error handling
  clearError: () => void;
  
  // Reset
  reset: () => void;
  
  // Computed values
  getFilteredAndSortedTasks: () => Task[];
}

export type TimeTrackingStore = TimeTrackingState & TimeTrackingActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: TimeTrackingState = {
  // Data
  tasks: [],
  activeTracking: null,
  entries: [],
  
  // UI State
  selectedTaskId: null,
  searchQuery: '',
  
  // Pagination
  entriesPage: 0,
  entriesHasMore: true,
  
  // Loading States
  isLoadingTasks: false,
  isLoadingEntries: false,
  isStarting: false,
  isStopping: false,
  
  // Error State
  error: null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useTimeTrackingStore = create<TimeTrackingStore>()((set, get) => ({
  ...initialState,

  // Task operations
  fetchTasks: async (): Promise<void> => {
    set({ isLoadingTasks: true, error: null });
    
    try {
      const tasks = await timeTrackingService.getTasks();
      set({
        tasks,
        isLoadingTasks: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
      set({ error: message, isLoadingTasks: false });
    }
  },

  selectTask: (taskId: string | null): void => {
    set({ selectedTaskId: taskId });
  },

  setSearchQuery: (query: string): void => {
    set({ searchQuery: query });
  },

  // Time tracking operations
  startTracking: async (taskId: string, description: string): Promise<void> => {
    const { activeTracking } = get();
    
    // Validation: prevent starting if already tracking
    if (activeTracking) {
      set({ error: 'You already have an active tracking session' });
      return;
    }
    
    set({ isStarting: true, error: null });
    
    try {
      const result = await timeTrackingService.startTracking(taskId, description);
      set({
        activeTracking: result,
        isStarting: false,
      });
      
      // Persist to localStorage for recovery on page refresh
      localStorage.setItem('activeTracking', JSON.stringify(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start tracking';
      set({ error: message, isStarting: false });
      throw error;
    }
  },

  stopTracking: async (description: string): Promise<void> => {
    set({ isStopping: true, error: null });
    
    try {
      await timeTrackingService.stopTracking(description);
      set({
        activeTracking: null,
        isStopping: false,
      });
      
      // Clear localStorage
      localStorage.removeItem('activeTracking');
      
      // Refresh entries to show the newly completed entry
      get().fetchEntries();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop tracking';
      set({ error: message, isStopping: false });
      throw error;
    }
  },

  checkActiveTracking: async (): Promise<void> => {
    try {
      const activeTracking = await timeTrackingService.getActiveTracking();
      set({ activeTracking });
      
      // Update localStorage
      if (activeTracking) {
        localStorage.setItem('activeTracking', JSON.stringify(activeTracking));
      } else {
        localStorage.removeItem('activeTracking');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check active tracking';
      set({ error: message });
    }
  },

  // Time entry operations
  fetchEntries: async (): Promise<void> => {
    set({ isLoadingEntries: true, error: null, entriesPage: 0 });
    
    try {
      const response = await timeTrackingService.getEntries({
        skip: 0,
        limit: 10,
      });
      
      set({
        entries: response.entries,
        entriesPage: 1,
        entriesHasMore: response.entries.length < response.total,
        isLoadingEntries: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch time entries';
      set({ error: message, isLoadingEntries: false });
    }
  },

  loadMoreEntries: async (): Promise<void> => {
    const { entriesPage, entries } = get();
    
    set({ isLoadingEntries: true, error: null });
    
    try {
      const response = await timeTrackingService.getEntries({
        skip: entriesPage * 10,
        limit: 10,
      });
      
      set({
        entries: [...entries, ...response.entries],
        entriesPage: entriesPage + 1,
        entriesHasMore: (entriesPage + 1) * 10 < response.total,
        isLoadingEntries: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load more entries';
      set({ error: message, isLoadingEntries: false });
    }
  },

  // Error handling
  clearError: (): void => {
    set({ error: null });
  },

  // Reset
  reset: (): void => {
    set(initialState);
  },

  // Computed values
  getFilteredAndSortedTasks: (): Task[] => {
    const { tasks, searchQuery } = get();
    
    // Step 1: Filter tasks by search query
    let filteredTasks = tasks;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredTasks = tasks.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query)
      );
    }
    
    // Step 2: Sort tasks by priority
    // Priority order:
    // 1. Tasks with active tracking by current user (user_is_tracking === true)
    // 2. Tasks scheduled next (has scheduled_start date)
    // 3. All other tasks
    const sortedTasks = [...filteredTasks].sort((a, b) => {
      // Priority 1: User is tracking
      if (a.user_is_tracking && !b.user_is_tracking) return -1;
      if (!a.user_is_tracking && b.user_is_tracking) return 1;
      
      // Priority 2: Scheduled tasks
      const aHasSchedule = !!a.scheduled_start;
      const bHasSchedule = !!b.scheduled_start;
      
      if (aHasSchedule && !bHasSchedule) return -1;
      if (!aHasSchedule && bHasSchedule) return 1;
      
      // If both have schedules, sort by scheduled_start date (earlier first)
      if (aHasSchedule && bHasSchedule) {
        const aDate = new Date(a.scheduled_start!).getTime();
        const bDate = new Date(b.scheduled_start!).getTime();
        return aDate - bDate;
      }
      
      // Priority 3: All other tasks - maintain original order
      return 0;
    });
    
    return sortedTasks;
  },
}));

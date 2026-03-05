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

/**
 * Type of operation that can be retried
 */
export type RetryableOperation =
  | 'fetchTasks'
  | 'fetchEntries'
  | 'loadMoreEntries'
  | 'startTracking'
  | 'stopTracking'
  | 'checkActiveTracking';

/**
 * Context for retrying a failed operation
 */
export interface RetryContext {
  operation: RetryableOperation;
  params?: {
    taskId?: string;
    description?: string;
  };
}

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
  lastFailedOperation: RetryContext | null;
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
  retryLastOperation: () => Promise<void>;

  // Reset
  reset: () => void;

  // Computed values
  getFilteredAndSortedTasks: () => Task[];
}

export type TimeTrackingStore = TimeTrackingState & TimeTrackingActions;

// ============================================================================
// Storage Keys
// ============================================================================

const ACTIVE_TRACKING_KEY = 'rxdx_active_tracking';
const SESSION_SELECTED_TASK_KEY = 'rxdx_session_selected_task';
const SESSION_SEARCH_QUERY_KEY = 'rxdx_session_search_query';

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validates active tracking data from localStorage
 * Ensures all required fields are present and have correct types
 */
function validateActiveTracking(data: unknown): data is ActiveTracking {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const tracking = data as Record<string, unknown>;

  // Check required fields
  if (
    typeof tracking.id !== 'string' ||
    typeof tracking.task_id !== 'string' ||
    typeof tracking.task_title !== 'string' ||
    typeof tracking.start_time !== 'string' ||
    typeof tracking.description !== 'string'
  ) {
    return false;
  }

  // Validate start_time is a valid ISO date string
  const startTime = new Date(tracking.start_time);
  if (isNaN(startTime.getTime())) {
    return false;
  }

  // Validate start_time is not in the future
  if (startTime.getTime() > Date.now()) {
    return false;
  }

  // Validate start_time is not too old (more than 24 hours)
  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
  if (startTime.getTime() < twentyFourHoursAgo) {
    return false;
  }

  return true;
}

/**
 * Recovers active tracking from localStorage
 * Returns null if data is invalid or corrupted
 */
function recoverActiveTracking(): ActiveTracking | null {
  try {
    const stored = localStorage.getItem(ACTIVE_TRACKING_KEY);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    if (!validateActiveTracking(parsed)) {
      // Invalid data - clear it
      localStorage.removeItem(ACTIVE_TRACKING_KEY);
      return null;
    }

    return parsed as ActiveTracking;
  } catch (error) {
    // Corrupted JSON or other error - clear it
    console.error('Failed to recover active tracking from localStorage:', error);
    localStorage.removeItem(ACTIVE_TRACKING_KEY);
    return null;
  }
}

/**
 * Saves active tracking to localStorage
 */
function saveActiveTracking(tracking: ActiveTracking): void {
  try {
    localStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(tracking));
  } catch (error) {
    // localStorage quota exceeded or other error
    console.error('Failed to save active tracking to localStorage:', error);
  }
}

/**
 * Clears active tracking from localStorage
 */
function clearActiveTracking(): void {
  try {
    localStorage.removeItem(ACTIVE_TRACKING_KEY);
  } catch (error) {
    console.error('Failed to clear active tracking from localStorage:', error);
  }
}

// ============================================================================
// sessionStorage Utilities
// ============================================================================

/**
 * Recovers selected task ID from sessionStorage
 * Returns null if not found or invalid
 */
function recoverSelectedTaskId(): string | null {
  try {
    const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
    if (!stored) {
      return null;
    }

    // Validate it's a non-empty string
    const taskId = stored.trim();
    return taskId || null;
  } catch (error) {
    console.error('Failed to recover selected task from sessionStorage:', error);
    return null;
  }
}

/**
 * Saves selected task ID to sessionStorage
 */
function saveSelectedTaskId(taskId: string | null): void {
  try {
    if (taskId) {
      sessionStorage.setItem(SESSION_SELECTED_TASK_KEY, taskId);
    } else {
      sessionStorage.removeItem(SESSION_SELECTED_TASK_KEY);
    }
  } catch (error) {
    console.error('Failed to save selected task to sessionStorage:', error);
  }
}

/**
 * Recovers search query from sessionStorage
 * Returns empty string if not found
 */
function recoverSearchQuery(): string {
  try {
    const stored = sessionStorage.getItem(SESSION_SEARCH_QUERY_KEY);
    return stored || '';
  } catch (error) {
    console.error('Failed to recover search query from sessionStorage:', error);
    return '';
  }
}

/**
 * Saves search query to sessionStorage
 */
function saveSearchQuery(query: string): void {
  try {
    if (query) {
      sessionStorage.setItem(SESSION_SEARCH_QUERY_KEY, query);
    } else {
      sessionStorage.removeItem(SESSION_SEARCH_QUERY_KEY);
    }
  } catch (error) {
    console.error('Failed to save search query to sessionStorage:', error);
  }
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: TimeTrackingState = {
  // Data
  tasks: [],
  activeTracking: recoverActiveTracking(), // Recover from localStorage on initialization
  entries: [],

  // UI State
  selectedTaskId: recoverSelectedTaskId(), // Recover from sessionStorage on initialization
  searchQuery: recoverSearchQuery(), // Recover from sessionStorage on initialization

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
  lastFailedOperation: null,
};

// ============================================================================
// Store Implementation
// ============================================================================

export const useTimeTrackingStore = create<TimeTrackingStore>()((set, get) => ({
  ...initialState,

  // Task operations
  fetchTasks: async (): Promise<void> => {
    set({ isLoadingTasks: true, error: null, lastFailedOperation: null });

    try {
      const tasks = await timeTrackingService.getTasks();
      set({
        tasks,
        isLoadingTasks: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch tasks';
      set({
        error: message,
        isLoadingTasks: false,
        lastFailedOperation: { operation: 'fetchTasks' },
      });
    }
  },

  selectTask: (taskId: string | null): void => {
    set({ selectedTaskId: taskId });
    // Persist to sessionStorage
    saveSelectedTaskId(taskId);
  },

  setSearchQuery: (query: string): void => {
    set({ searchQuery: query });
    // Persist to sessionStorage
    saveSearchQuery(query);
  },

  // Time tracking operations
  startTracking: async (taskId: string, description: string): Promise<void> => {
    const { activeTracking, tasks } = get();

    // Validation: prevent starting if already tracking
    if (activeTracking) {
      set({ error: 'You already have an active tracking session' });
      return;
    }

    // Find the task to get its title for optimistic update
    const task = tasks.find((t) => t.id === taskId);
    if (!task) {
      set({ error: 'Task not found' });
      return;
    }

    // Create optimistic active tracking state
    const optimisticTracking: ActiveTracking = {
      id: 'optimistic-' + Date.now(), // Temporary ID
      task_id: taskId,
      task_title: task.title,
      start_time: new Date().toISOString(),
      description,
    };

    // Store previous state for rollback
    const previousActiveTracking = activeTracking;

    // Optimistic update: Update UI immediately
    set({
      activeTracking: optimisticTracking,
      isStarting: true,
      error: null,
      lastFailedOperation: null,
    });

    // Persist optimistic state to localStorage
    saveActiveTracking(optimisticTracking);

    try {
      // Make API call
      const result = await timeTrackingService.startTracking(taskId, description);

      // Update with real data from backend
      set({
        activeTracking: result,
        isStarting: false,
      });

      // Persist real data to localStorage
      saveActiveTracking(result);
    } catch (error) {
      // Rollback on error: Revert to previous state
      set({
        activeTracking: previousActiveTracking,
        isStarting: false,
      });

      // Rollback localStorage
      if (previousActiveTracking) {
        saveActiveTracking(previousActiveTracking);
      } else {
        clearActiveTracking();
      }

      const message = error instanceof Error ? error.message : 'Failed to start tracking';
      set({
        error: message,
        lastFailedOperation: {
          operation: 'startTracking',
          params: { taskId, description },
        },
      });
      throw error;
    }
  },

  /**
   * Stops time tracking with optimistic UI updates
   * 
   * Optimistic Update Flow:
   * 1. Immediately clears activeTracking and updates UI
   * 2. Clears localStorage optimistically
   * 3. Makes API call to stop tracking
   * 4. On success: Refreshes entries to show completed entry
   * 5. On error: Rolls back UI state and localStorage
   * 
   * Requirements: 14.7 (Optimistic UI updates for start/stop actions)
   */
  stopTracking: async (description: string): Promise<void> => {
    const { activeTracking } = get();

    // Validation: can't stop if not tracking
    if (!activeTracking) {
      set({ error: 'No active tracking session to stop' });
      return;
    }

    // Store previous state for rollback
    const previousActiveTracking = activeTracking;

    // Optimistic update: Update UI immediately
    set({
      activeTracking: null,
      isStopping: true,
      error: null,
      lastFailedOperation: null,
    });

    // Clear localStorage optimistically
    clearActiveTracking();

    try {
      // Make API call with worked_id from active tracking
      await timeTrackingService.stopTracking(previousActiveTracking.id, description);

      // Success: Keep the optimistic state (activeTracking already null)
      set({
        isStopping: false,
      });

      // Refresh entries to show the newly completed entry
      get().fetchEntries();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stop tracking';

      // If the entry was already stopped, don't roll back — just clear the state
      if (message.toLowerCase().includes('already stopped')) {
        set({
          activeTracking: null,
          isStopping: false,
          error: null,
        });
        clearActiveTracking();
        get().fetchEntries();
        return;
      }

      // Rollback on error: Revert to previous state
      set({
        activeTracking: previousActiveTracking,
        isStopping: false,
      });

      // Rollback localStorage
      saveActiveTracking(previousActiveTracking);

      set({
        error: message,
        lastFailedOperation: {
          operation: 'stopTracking',
          params: { description },
        },
      });
      throw error;
    }
  },

  checkActiveTracking: async (): Promise<void> => {
    set({ error: null, lastFailedOperation: null });

    try {
      const activeTracking = await timeTrackingService.getActiveTracking();
      set({ activeTracking });

      // Update localStorage to sync with backend
      if (activeTracking) {
        saveActiveTracking(activeTracking);
      } else {
        clearActiveTracking();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check active tracking';
      set({
        error: message,
        lastFailedOperation: { operation: 'checkActiveTracking' },
      });
    }
  },

  // Time entry operations
  fetchEntries: async (): Promise<void> => {
    set({ isLoadingEntries: true, error: null, entriesPage: 0, lastFailedOperation: null });

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
      set({
        error: message,
        isLoadingEntries: false,
        lastFailedOperation: { operation: 'fetchEntries' },
      });
    }
  },

  loadMoreEntries: async (): Promise<void> => {
    const { entriesPage, entries } = get();

    set({ isLoadingEntries: true, error: null, lastFailedOperation: null });

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
      set({
        error: message,
        isLoadingEntries: false,
        lastFailedOperation: { operation: 'loadMoreEntries' },
      });
    }
  },

  // Error handling
  clearError: (): void => {
    set({ error: null, lastFailedOperation: null });
  },

  /**
   * Retries the last failed operation
   * Uses the stored retry context to determine which operation to retry
   * and with what parameters
   * 
   * Requirements: 13.6, 13.7 (Error recovery with retry)
   */
  retryLastOperation: async (): Promise<void> => {
    const { lastFailedOperation } = get();

    if (!lastFailedOperation) {
      console.warn('No failed operation to retry');
      return;
    }

    const { operation, params } = lastFailedOperation;

    // Clear error before retrying
    set({ error: null, lastFailedOperation: null });

    try {
      switch (operation) {
        case 'fetchTasks':
          await get().fetchTasks();
          break;

        case 'fetchEntries':
          await get().fetchEntries();
          break;

        case 'loadMoreEntries':
          await get().loadMoreEntries();
          break;

        case 'startTracking':
          if (params?.taskId && params?.description !== undefined) {
            await get().startTracking(params.taskId, params.description);
          } else {
            console.error('Missing parameters for startTracking retry');
          }
          break;

        case 'stopTracking':
          if (params?.description !== undefined) {
            await get().stopTracking(params.description);
          } else {
            console.error('Missing parameters for stopTracking retry');
          }
          break;

        case 'checkActiveTracking':
          await get().checkActiveTracking();
          break;

        default:
          console.error('Unknown operation to retry:', operation);
      }
    } catch (error) {
      // Error is already handled by the individual operation
      // Just log it for debugging
      console.error('Retry failed:', error);
    }
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
          (task.description || '').toLowerCase().includes(query)
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

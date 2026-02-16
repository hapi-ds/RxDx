import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import timeTrackingService from '../services/TimeTrackingService';
import storageService from '../services/StorageService';
import {Task} from '../types';

// Define TasksContextType interface
export interface TasksContextType {
  tasks: Task[];
  filteredTasks: Task[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  searchQuery: string;
  lastFetchTime: number | null;
  fetchTasks: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  searchTasks: (query: string) => void;
}

// Tasks state interface
interface TasksState {
  tasks: Task[];
  filteredTasks: Task[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  searchQuery: string;
  lastFetchTime: number | null;
}

// Tasks action types
type TasksAction =
  | {type: 'TASKS_LOADING'}
  | {type: 'TASKS_REFRESHING'}
  | {type: 'TASKS_SUCCESS'; payload: {tasks: Task[]; timestamp: number}}
  | {type: 'TASKS_ERROR'; payload: string}
  | {type: 'SEARCH_TASKS'; payload: string}
  | {type: 'RESTORE_CACHE'; payload: {tasks: Task[]; timestamp: number}};

// Storage keys
const STORAGE_KEYS = {
  TASKS_CACHE: 'tasks_cache',
  TASKS_TIMESTAMP: 'tasks_cache_timestamp',
};

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Initial state
const initialState: TasksState = {
  tasks: [],
  filteredTasks: [],
  isLoading: true,
  isRefreshing: false,
  error: null,
  searchQuery: '',
  lastFetchTime: null,
};

// Filter tasks based on search query
function filterTasks(tasks: Task[], query: string): Task[] {
  if (!query.trim()) {
    return tasks;
  }

  const lowerQuery = query.toLowerCase();
  return tasks.filter(
    task =>
      task.title.toLowerCase().includes(lowerQuery) ||
      (task.description && task.description.toLowerCase().includes(lowerQuery)),
  );
}

// Tasks reducer
function tasksReducer(state: TasksState, action: TasksAction): TasksState {
  switch (action.type) {
    case 'TASKS_LOADING':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'TASKS_REFRESHING':
      return {
        ...state,
        isRefreshing: true,
        error: null,
      };
    case 'TASKS_SUCCESS':
      return {
        ...state,
        tasks: action.payload.tasks,
        filteredTasks: filterTasks(action.payload.tasks, state.searchQuery),
        lastFetchTime: action.payload.timestamp,
        isLoading: false,
        isRefreshing: false,
        error: null,
      };
    case 'TASKS_ERROR':
      return {
        ...state,
        isLoading: false,
        isRefreshing: false,
        error: action.payload,
      };
    case 'SEARCH_TASKS':
      return {
        ...state,
        searchQuery: action.payload,
        filteredTasks: filterTasks(state.tasks, action.payload),
      };
    case 'RESTORE_CACHE':
      return {
        ...state,
        tasks: action.payload.tasks,
        filteredTasks: filterTasks(action.payload.tasks, state.searchQuery),
        lastFetchTime: action.payload.timestamp,
        isLoading: false,
        error: null,
      };
    default:
      return state;
  }
}

// Create context
export const TasksContext = createContext<TasksContextType | undefined>(
  undefined,
);

// TasksProvider props
interface TasksProviderProps {
  children: ReactNode;
}

// TasksProvider component
export function TasksProvider({
  children,
}: TasksProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(tasksReducer, initialState);

  // Cache tasks to storage
  const cacheTasks = useCallback(async (tasks: Task[], timestamp: number) => {
    try {
      await storageService.setItem(STORAGE_KEYS.TASKS_CACHE, tasks);
      await storageService.setItem(STORAGE_KEYS.TASKS_TIMESTAMP, timestamp);
    } catch (error) {
      console.error('Failed to cache tasks:', error);
    }
  }, []);

  // Check if cache is valid
  const isCacheValid = useCallback((timestamp: number | null): boolean => {
    if (!timestamp) {
      return false;
    }
    const now = Date.now();
    return now - timestamp < CACHE_TTL;
  }, []);

  // Restore tasks from cache on app start
  useEffect(() => {
    async function restoreCache() {
      try {
        const cachedTasks = await storageService.getItem<Task[]>(
          STORAGE_KEYS.TASKS_CACHE,
        );
        const cachedTimestamp = await storageService.getItem<number>(
          STORAGE_KEYS.TASKS_TIMESTAMP,
        );

        if (cachedTasks && cachedTimestamp && isCacheValid(cachedTimestamp)) {
          // Restore from cache
          dispatch({
            type: 'RESTORE_CACHE',
            payload: {tasks: cachedTasks, timestamp: cachedTimestamp},
          });
        } else {
          // Cache is invalid or doesn't exist, fetch fresh data
          dispatch({type: 'TASKS_LOADING'});
          try {
            const tasks = await timeTrackingService.getTasks();
            const timestamp = Date.now();
            await cacheTasks(tasks, timestamp);
            dispatch({
              type: 'TASKS_SUCCESS',
              payload: {tasks, timestamp},
            });
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : 'Failed to fetch tasks';
            dispatch({type: 'TASKS_ERROR', payload: errorMessage});
          }
        }
      } catch (error) {
        console.error('Failed to restore cache:', error);
        dispatch({type: 'TASKS_LOADING'});
        try {
          const tasks = await timeTrackingService.getTasks();
          const timestamp = Date.now();
          await cacheTasks(tasks, timestamp);
          dispatch({
            type: 'TASKS_SUCCESS',
            payload: {tasks, timestamp},
          });
        } catch (fetchError) {
          const errorMessage =
            fetchError instanceof Error ? fetchError.message : 'Failed to fetch tasks';
          dispatch({type: 'TASKS_ERROR', payload: errorMessage});
        }
      }
    }

    restoreCache();
  }, [isCacheValid, cacheTasks]);

  // Fetch tasks action
  const fetchTasks = useCallback(async (): Promise<void> => {
    try {
      // Only show loading if we don't have cached data
      if (state.tasks.length === 0) {
        dispatch({type: 'TASKS_LOADING'});
      }

      const tasks = await timeTrackingService.getTasks();
      const timestamp = Date.now();

      // Cache the tasks
      await cacheTasks(tasks, timestamp);

      dispatch({
        type: 'TASKS_SUCCESS',
        payload: {tasks, timestamp},
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to fetch tasks';
      dispatch({type: 'TASKS_ERROR', payload: errorMessage});
      throw error;
    }
  }, [state.tasks.length, cacheTasks]);

  // Refresh tasks action (for pull-to-refresh)
  const refreshTasks = useCallback(async (): Promise<void> => {
    try {
      dispatch({type: 'TASKS_REFRESHING'});

      const tasks = await timeTrackingService.getTasks();
      const timestamp = Date.now();

      // Cache the tasks
      await cacheTasks(tasks, timestamp);

      dispatch({
        type: 'TASKS_SUCCESS',
        payload: {tasks, timestamp},
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to refresh tasks';
      dispatch({type: 'TASKS_ERROR', payload: errorMessage});
      throw error;
    }
  }, [cacheTasks]);

  // Search tasks function
  const searchTasks = useCallback((query: string) => {
    dispatch({type: 'SEARCH_TASKS', payload: query});
  }, []);

  const value: TasksContextType = {
    tasks: state.tasks,
    filteredTasks: state.filteredTasks,
    isLoading: state.isLoading,
    isRefreshing: state.isRefreshing,
    error: state.error,
    searchQuery: state.searchQuery,
    lastFetchTime: state.lastFetchTime,
    fetchTasks,
    refreshTasks,
    searchTasks,
  };

  return (
    <TasksContext.Provider value={value}>{children}</TasksContext.Provider>
  );
}

// useTasks custom hook
export function useTasks(): TasksContextType {
  const context = useContext(TasksContext);

  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }

  return context;
}

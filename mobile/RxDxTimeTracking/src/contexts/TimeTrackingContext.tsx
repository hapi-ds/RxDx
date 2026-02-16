import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import timeTrackingService from '../services/TimeTrackingService';
import storageService from '../services/StorageService';
import {WorkedEntry, Task} from '../types';

// Define TimeTrackingContextType interface
export interface TimeTrackingContextType {
  activeEntry: WorkedEntry | null;
  elapsedTime: number;
  isTracking: boolean;
  isLoading: boolean;
  error: string | null;
  description: string;
  startTracking: (task: Task, description?: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  updateDescription: (description: string) => void;
}

// Time tracking state interface
interface TimeTrackingState {
  activeEntry: WorkedEntry | null;
  elapsedTime: number;
  isTracking: boolean;
  isLoading: boolean;
  error: string | null;
  description: string;
}

// Time tracking action types
type TimeTrackingAction =
  | {type: 'TRACKING_LOADING'}
  | {
      type: 'START_TRACKING_SUCCESS';
      payload: {entry: WorkedEntry; description: string};
    }
  | {type: 'STOP_TRACKING_SUCCESS'}
  | {type: 'TRACKING_ERROR'; payload: string}
  | {type: 'UPDATE_ELAPSED_TIME'; payload: number}
  | {type: 'UPDATE_DESCRIPTION'; payload: string}
  | {
      type: 'RESTORE_TRACKING';
      payload: {entry: WorkedEntry; description: string; elapsedTime: number};
    };

// Storage keys
const STORAGE_KEYS = {
  ACTIVE_ENTRY: 'active_tracking_entry',
  DESCRIPTION: 'active_tracking_description',
  START_TIME: 'active_tracking_start_time',
};

// Initial state
const initialState: TimeTrackingState = {
  activeEntry: null,
  elapsedTime: 0,
  isTracking: false,
  isLoading: true,
  error: null,
  description: '',
};

// Time tracking reducer
function timeTrackingReducer(
  state: TimeTrackingState,
  action: TimeTrackingAction,
): TimeTrackingState {
  switch (action.type) {
    case 'TRACKING_LOADING':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'START_TRACKING_SUCCESS':
      return {
        ...state,
        activeEntry: action.payload.entry,
        description: action.payload.description,
        elapsedTime: 0,
        isTracking: true,
        isLoading: false,
        error: null,
      };
    case 'STOP_TRACKING_SUCCESS':
      return {
        ...state,
        activeEntry: null,
        description: '',
        elapsedTime: 0,
        isTracking: false,
        isLoading: false,
        error: null,
      };
    case 'TRACKING_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case 'UPDATE_ELAPSED_TIME':
      return {
        ...state,
        elapsedTime: action.payload,
      };
    case 'UPDATE_DESCRIPTION':
      return {
        ...state,
        description: action.payload,
      };
    case 'RESTORE_TRACKING':
      return {
        ...state,
        activeEntry: action.payload.entry,
        description: action.payload.description,
        elapsedTime: action.payload.elapsedTime,
        isTracking: true,
        isLoading: false,
        error: null,
      };
    default:
      return state;
  }
}

// Create context
export const TimeTrackingContext = createContext<
  TimeTrackingContextType | undefined
>(undefined);

// TimeTrackingProvider props
interface TimeTrackingProviderProps {
  children: ReactNode;
}

// TimeTrackingProvider component
export function TimeTrackingProvider({
  children,
}: TimeTrackingProviderProps): React.ReactElement {
  const [state, dispatch] = useReducer(timeTrackingReducer, initialState);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate elapsed time from start time
  const calculateElapsedTime = useCallback((startTime: string): number => {
    const start = new Date(startTime);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / 1000);
  }, []);

  // Persist active tracking state
  const persistTrackingState = useCallback(
    async (entry: WorkedEntry | null, description: string) => {
      try {
        if (entry) {
          await storageService.setItem(STORAGE_KEYS.ACTIVE_ENTRY, entry);
          await storageService.setItem(STORAGE_KEYS.DESCRIPTION, description);
          await storageService.setItem(
            STORAGE_KEYS.START_TIME,
            entry.start_time,
          );
        } else {
          await storageService.removeItem(STORAGE_KEYS.ACTIVE_ENTRY);
          await storageService.removeItem(STORAGE_KEYS.DESCRIPTION);
          await storageService.removeItem(STORAGE_KEYS.START_TIME);
        }
      } catch (error) {
        console.error('Failed to persist tracking state:', error);
      }
    },
    [],
  );

  // Start timer
  const startTimer = useCallback(
    (startTime: string) => {
      // Clear existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Update elapsed time immediately
      const elapsed = calculateElapsedTime(startTime);
      dispatch({type: 'UPDATE_ELAPSED_TIME', payload: elapsed});

      // Start interval to update every second
      timerRef.current = setInterval(() => {
        const newElapsed = calculateElapsedTime(startTime);
        dispatch({type: 'UPDATE_ELAPSED_TIME', payload: newElapsed});
      }, 1000);
    },
    [calculateElapsedTime],
  );

  // Stop timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Restore active tracking on app start
  useEffect(() => {
    async function restoreTracking() {
      try {
        const storedEntry = await storageService.getItem<WorkedEntry>(
          STORAGE_KEYS.ACTIVE_ENTRY,
        );
        const storedDescription = await storageService.getItem<string>(
          STORAGE_KEYS.DESCRIPTION,
        );

        if (storedEntry && storedEntry.end_time === null) {
          // Calculate elapsed time
          const elapsed = calculateElapsedTime(storedEntry.start_time);

          dispatch({
            type: 'RESTORE_TRACKING',
            payload: {
              entry: storedEntry,
              description: storedDescription || '',
              elapsedTime: elapsed,
            },
          });

          // Start timer
          startTimer(storedEntry.start_time);
        } else {
          // No active tracking, finish loading
          dispatch({type: 'STOP_TRACKING_SUCCESS'});
        }
      } catch (error) {
        console.error('Failed to restore tracking:', error);
        dispatch({type: 'STOP_TRACKING_SUCCESS'});
      }
    }

    restoreTracking();

    // Cleanup timer on unmount
    return () => {
      stopTimer();
    };
  }, [calculateElapsedTime, startTimer, stopTimer]);

  // Start tracking action
  const startTracking = async (
    task: Task,
    description?: string,
  ): Promise<void> => {
    try {
      dispatch({type: 'TRACKING_LOADING'});

      const entry = await timeTrackingService.startTracking(
        task.id,
        description,
      );

      const desc = description || '';

      // Persist state
      await persistTrackingState(entry, desc);

      dispatch({
        type: 'START_TRACKING_SUCCESS',
        payload: {entry, description: desc},
      });

      // Start timer
      startTimer(entry.start_time);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start tracking';
      dispatch({type: 'TRACKING_ERROR', payload: errorMessage});
      throw error;
    }
  };

  // Stop tracking action
  const stopTracking = async (): Promise<void> => {
    try {
      if (!state.activeEntry) {
        throw new Error('No active tracking to stop');
      }

      dispatch({type: 'TRACKING_LOADING'});

      await timeTrackingService.stopTracking(state.activeEntry.id);

      // Clear persisted state
      await persistTrackingState(null, '');

      // Stop timer
      stopTimer();

      dispatch({type: 'STOP_TRACKING_SUCCESS'});
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to stop tracking';
      dispatch({type: 'TRACKING_ERROR', payload: errorMessage});
      throw error;
    }
  };

  // Update description action
  const updateDescription = useCallback(
    (description: string) => {
      dispatch({type: 'UPDATE_DESCRIPTION', payload: description});

      // Persist description
      if (state.activeEntry) {
        persistTrackingState(state.activeEntry, description);
      }
    },
    [state.activeEntry, persistTrackingState],
  );

  const value: TimeTrackingContextType = {
    activeEntry: state.activeEntry,
    elapsedTime: state.elapsedTime,
    isTracking: state.isTracking,
    isLoading: state.isLoading,
    error: state.error,
    description: state.description,
    startTracking,
    stopTracking,
    updateDescription,
  };

  return (
    <TimeTrackingContext.Provider value={value}>
      {children}
    </TimeTrackingContext.Provider>
  );
}

// useTimeTracking custom hook
export function useTimeTracking(): TimeTrackingContextType {
  const context = useContext(TimeTrackingContext);

  if (context === undefined) {
    throw new Error(
      'useTimeTracking must be used within a TimeTrackingProvider',
    );
  }

  return context;
}

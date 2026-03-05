/**
 * Unit tests for optimistic updates in timeTrackingStore
 * Tests UI updates before API response, rollback on error, and retry functionality
 * 
 * Requirements: 14.7 (Optimistic UI updates for start/stop actions)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTimeTrackingStore } from './timeTrackingStore';
import {
  timeTrackingService,
  type Task,
  type ActiveTracking,
  type TimeEntriesResponse,
} from '../services/timeTrackingService';

// Mock the timeTrackingService
vi.mock('../services/timeTrackingService', () => ({
  timeTrackingService: {
    getTasks: vi.fn(),
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
    getActiveTracking: vi.fn(),
    getEntries: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Optimistic Updates - Start Tracking', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTimeTrackingStore.getState().reset();
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('UI updates before API response', () => {
    it('updates activeTracking immediately when startTracking is called', async () => {
      // Setup: Add task to store
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Test description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      // Setup: Create a promise that we control
      let resolvePromise: (value: ActiveTracking) => void;
      const controlledPromise = new Promise<ActiveTracking>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(timeTrackingService.startTracking).mockReturnValue(controlledPromise);

      // Act: Start tracking (don't await yet)
      const startPromise = useTimeTrackingStore.getState().startTracking('task-1', 'Working on feature');

      // Assert: Check that optimistic update happened immediately (before API resolves)
      const stateBeforeApiResponse = useTimeTrackingStore.getState();
      expect(stateBeforeApiResponse.activeTracking).not.toBeNull();
      expect(stateBeforeApiResponse.activeTracking?.task_id).toBe('task-1');
      expect(stateBeforeApiResponse.activeTracking?.task_title).toBe('Test Task');
      expect(stateBeforeApiResponse.activeTracking?.description).toBe('Working on feature');
      expect(stateBeforeApiResponse.activeTracking?.id).toMatch(/^optimistic-/);
      expect(stateBeforeApiResponse.isStarting).toBe(true);

      // Cleanup: Resolve the promise
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working on feature',
      };
      resolvePromise!(mockActiveTracking);
      await startPromise;
    });

    it('creates optimistic tracking with correct task information', async () => {
      // Setup: Add task with specific details
      const mockTask: Task = {
        id: 'task-123',
        title: 'Implement Authentication',
        description: 'Add JWT authentication',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 8,
        worked_sum: 2.5,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      // Setup: Delay API response
      let resolvePromise: (value: ActiveTracking) => void;
      const controlledPromise = new Promise<ActiveTracking>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(timeTrackingService.startTracking).mockReturnValue(controlledPromise);

      // Act: Start tracking
      const startPromise = useTimeTrackingStore.getState().startTracking('task-123', 'Adding JWT tokens');

      // Assert: Optimistic tracking has correct task info
      const state = useTimeTrackingStore.getState();
      expect(state.activeTracking?.task_id).toBe('task-123');
      expect(state.activeTracking?.task_title).toBe('Implement Authentication');
      expect(state.activeTracking?.description).toBe('Adding JWT tokens');
      expect(state.activeTracking?.start_time).toBeDefined();
      
      // Verify start_time is recent (within last second)
      const startTime = new Date(state.activeTracking!.start_time).getTime();
      const now = Date.now();
      expect(now - startTime).toBeLessThan(1000);

      // Cleanup
      resolvePromise!({
        id: 'tracking-1',
        task_id: 'task-123',
        task_title: 'Implement Authentication',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Adding JWT tokens',
      });
      await startPromise;
    });

    it('persists optimistic tracking to localStorage immediately', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      let resolvePromise: (value: ActiveTracking) => void;
      const controlledPromise = new Promise<ActiveTracking>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(timeTrackingService.startTracking).mockReturnValue(controlledPromise);

      // Act: Start tracking
      const startPromise = useTimeTrackingStore.getState().startTracking('task-1', 'Working');

      // Assert: localStorage has optimistic data immediately
      const stored = localStorage.getItem('rxdx_active_tracking');
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.task_id).toBe('task-1');
      expect(parsed.task_title).toBe('Test Task');
      expect(parsed.description).toBe('Working');
      expect(parsed.id).toMatch(/^optimistic-/);

      // Cleanup
      resolvePromise!({
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      });
      await startPromise;
    });

    it('replaces optimistic data with real data when API responds', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      const realActiveTracking: ActiveTracking = {
        id: 'real-tracking-id',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      let resolvePromise: (value: ActiveTracking) => void;
      const controlledPromise = new Promise<ActiveTracking>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(timeTrackingService.startTracking).mockReturnValue(controlledPromise);

      // Act: Start tracking
      const startPromise = useTimeTrackingStore.getState().startTracking('task-1', 'Working');

      // Check optimistic state
      const optimisticState = useTimeTrackingStore.getState();
      expect(optimisticState.activeTracking?.id).toMatch(/^optimistic-/);
      expect(optimisticState.isStarting).toBe(true);

      // Resolve with real data
      resolvePromise!(realActiveTracking);
      await startPromise;

      // Assert: Real data replaced optimistic data
      const finalState = useTimeTrackingStore.getState();
      expect(finalState.activeTracking).toEqual(realActiveTracking);
      expect(finalState.activeTracking?.id).toBe('real-tracking-id');
      expect(finalState.isStarting).toBe(false);
      expect(finalState.error).toBeNull();
    });

    it('updates localStorage with real data when API responds', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      const realActiveTracking: ActiveTracking = {
        id: 'real-tracking-id',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      vi.mocked(timeTrackingService.startTracking).mockResolvedValue(realActiveTracking);

      // Act: Start tracking
      await useTimeTrackingStore.getState().startTracking('task-1', 'Working');

      // Assert: localStorage has real data
      const stored = localStorage.getItem('rxdx_active_tracking');
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(realActiveTracking);
      expect(parsed.id).toBe('real-tracking-id');
    });
  });

  describe('Rollback on error', () => {
    it('reverts activeTracking to null when API call fails', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      const errorMessage = 'Network error';
      let rejectPromise: (error: Error) => void;
      const controlledPromise = new Promise<ActiveTracking>((_, reject) => {
        rejectPromise = reject;
      });
      vi.mocked(timeTrackingService.startTracking).mockReturnValue(controlledPromise);

      // Act: Start tracking
      const startPromise = useTimeTrackingStore.getState().startTracking('task-1', 'Working');

      // Verify optimistic update happened
      const optimisticState = useTimeTrackingStore.getState();
      expect(optimisticState.activeTracking).not.toBeNull();
      expect(optimisticState.activeTracking?.id).toMatch(/^optimistic-/);

      // Reject the API call
      rejectPromise!(new Error(errorMessage));

      // Wait for error handling
      await expect(startPromise).rejects.toThrow(errorMessage);

      // Assert: State rolled back to null
      const finalState = useTimeTrackingStore.getState();
      expect(finalState.activeTracking).toBeNull();
      expect(finalState.error).toBe(errorMessage);
      expect(finalState.isStarting).toBe(false);
    });

    it('reverts activeTracking to previous state when already tracking', async () => {
      // Setup: User already has active tracking
      const previousTracking: ActiveTracking = {
        id: 'previous-tracking',
        task_id: 'task-old',
        task_title: 'Old Task',
        start_time: '2024-01-15T09:00:00Z',
        description: 'Previous work',
      };

      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };

      useTimeTrackingStore.setState({
        tasks: [mockTask],
        activeTracking: previousTracking,
      });

      // Note: This test verifies the validation prevents starting when already tracking
      // The store should not allow this, but if it did and failed, it should rollback

      // Act: Try to start tracking (should be prevented by validation)
      await useTimeTrackingStore.getState().startTracking('task-1', 'Working');

      // Assert: Previous tracking unchanged, error set
      const state = useTimeTrackingStore.getState();
      expect(state.activeTracking).toEqual(previousTracking);
      expect(state.error).toBe('You already have an active tracking session');
    });

    it('clears localStorage when API call fails', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      const errorMessage = 'API error';
      vi.mocked(timeTrackingService.startTracking).mockRejectedValue(new Error(errorMessage));

      // Act: Start tracking (will fail)
      await expect(
        useTimeTrackingStore.getState().startTracking('task-1', 'Working')
      ).rejects.toThrow(errorMessage);

      // Assert: localStorage cleared
      expect(localStorage.getItem('rxdx_active_tracking')).toBeNull();
    });

    it('sets error message when API call fails', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      const errorMessage = 'Failed to connect to server';
      vi.mocked(timeTrackingService.startTracking).mockRejectedValue(new Error(errorMessage));

      // Act: Start tracking (will fail)
      await expect(
        useTimeTrackingStore.getState().startTracking('task-1', 'Working')
      ).rejects.toThrow(errorMessage);

      // Assert: Error message set
      const state = useTimeTrackingStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isStarting).toBe(false);
    });

    it('stores retry context when API call fails', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      const errorMessage = 'Network timeout';
      vi.mocked(timeTrackingService.startTracking).mockRejectedValue(new Error(errorMessage));

      // Act: Start tracking (will fail)
      await expect(
        useTimeTrackingStore.getState().startTracking('task-1', 'Working on feature')
      ).rejects.toThrow(errorMessage);

      // Assert: Retry context stored
      const state = useTimeTrackingStore.getState();
      expect(state.lastFailedOperation).toEqual({
        operation: 'startTracking',
        params: {
          taskId: 'task-1',
          description: 'Working on feature',
        },
      });
    });
  });

  describe('Retry functionality', () => {
    it('retries startTracking with original parameters', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working on feature',
      };

      // First call fails
      vi.mocked(timeTrackingService.startTracking).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        useTimeTrackingStore.getState().startTracking('task-1', 'Working on feature')
      ).rejects.toThrow('Network error');

      // Verify error state
      expect(useTimeTrackingStore.getState().error).toBe('Network error');
      expect(useTimeTrackingStore.getState().lastFailedOperation).toBeTruthy();

      // Second call succeeds
      vi.mocked(timeTrackingService.startTracking).mockResolvedValue(mockActiveTracking);

      // Act: Retry
      await useTimeTrackingStore.getState().retryLastOperation();

      // Assert: Retry called with original parameters
      expect(timeTrackingService.startTracking).toHaveBeenCalledWith('task-1', 'Working on feature');
      expect(timeTrackingService.startTracking).toHaveBeenCalledTimes(2);

      // Assert: Success state
      const state = useTimeTrackingStore.getState();
      expect(state.activeTracking).toEqual(mockActiveTracking);
      expect(state.error).toBeNull();
      expect(state.lastFailedOperation).toBeNull();
    });

    it('clears error and retry context on successful retry', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      // First call fails
      vi.mocked(timeTrackingService.startTracking).mockRejectedValueOnce(
        new Error('Temporary error')
      );

      await expect(
        useTimeTrackingStore.getState().startTracking('task-1', 'Working')
      ).rejects.toThrow();

      // Verify error state exists
      expect(useTimeTrackingStore.getState().error).toBeTruthy();
      expect(useTimeTrackingStore.getState().lastFailedOperation).toBeTruthy();

      // Second call succeeds
      vi.mocked(timeTrackingService.startTracking).mockResolvedValue(mockActiveTracking);

      // Act: Retry
      await useTimeTrackingStore.getState().retryLastOperation();

      // Assert: Error and retry context cleared
      const state = useTimeTrackingStore.getState();
      expect(state.error).toBeNull();
      expect(state.lastFailedOperation).toBeNull();
    });

    it('performs optimistic update on retry', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      // First call fails
      vi.mocked(timeTrackingService.startTracking).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        useTimeTrackingStore.getState().startTracking('task-1', 'Working')
      ).rejects.toThrow();

      // Setup controlled promise for retry
      let resolveRetry: (value: ActiveTracking) => void;
      const retryPromise = new Promise<ActiveTracking>((resolve) => {
        resolveRetry = resolve;
      });
      vi.mocked(timeTrackingService.startTracking).mockReturnValue(retryPromise);

      // Act: Retry (don't await)
      const retryOperation = useTimeTrackingStore.getState().retryLastOperation();

      // Assert: Optimistic update happened immediately on retry
      const stateBeforeRetryResponse = useTimeTrackingStore.getState();
      expect(stateBeforeRetryResponse.activeTracking).not.toBeNull();
      expect(stateBeforeRetryResponse.activeTracking?.task_id).toBe('task-1');
      expect(stateBeforeRetryResponse.activeTracking?.id).toMatch(/^optimistic-/);

      // Cleanup: Resolve retry
      resolveRetry!({
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      });
      await retryOperation;
    });

    it('handles retry failure with rollback', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      // First call fails
      vi.mocked(timeTrackingService.startTracking).mockRejectedValueOnce(
        new Error('First error')
      );

      await expect(
        useTimeTrackingStore.getState().startTracking('task-1', 'Working')
      ).rejects.toThrow('First error');

      // Retry also fails
      vi.mocked(timeTrackingService.startTracking).mockRejectedValueOnce(
        new Error('Second error')
      );

      // Act: Retry (will fail again)
      await useTimeTrackingStore.getState().retryLastOperation();

      // Assert: State rolled back, new error set
      const state = useTimeTrackingStore.getState();
      expect(state.activeTracking).toBeNull();
      expect(state.error).toBe('Second error');
      expect(state.lastFailedOperation).toBeTruthy();
    });
  });
});

describe('Optimistic Updates - Stop Tracking', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTimeTrackingStore.getState().reset();
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('UI updates before API response', () => {
    it('clears activeTracking immediately when stopTracking is called', async () => {
      // Setup: User has active tracking
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // Setup: Create a promise that we control
      let resolvePromise: (value: void) => void;
      const controlledPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(timeTrackingService.stopTracking).mockReturnValue(controlledPromise);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      // Act: Stop tracking (don't await yet)
      const stopPromise = useTimeTrackingStore.getState().stopTracking('Completed work');

      // Assert: Check that optimistic update happened immediately (before API resolves)
      const stateBeforeApiResponse = useTimeTrackingStore.getState();
      expect(stateBeforeApiResponse.activeTracking).toBeNull();
      expect(stateBeforeApiResponse.isStopping).toBe(true);

      // Cleanup: Resolve the promise
      resolvePromise!();
      await stopPromise;
    });

    it('clears localStorage immediately when stopTracking is called', async () => {
      // Setup: User has active tracking
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      localStorage.setItem('rxdx_active_tracking', JSON.stringify(existingTracking));
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // Setup: Delay API response
      let resolvePromise: (value: void) => void;
      const controlledPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(timeTrackingService.stopTracking).mockReturnValue(controlledPromise);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      // Act: Stop tracking
      const stopPromise = useTimeTrackingStore.getState().stopTracking('Done');

      // Assert: localStorage cleared immediately
      expect(localStorage.getItem('rxdx_active_tracking')).toBeNull();

      // Cleanup
      resolvePromise!();
      await stopPromise;
    });

    it('keeps activeTracking null when API responds successfully', async () => {
      // Setup
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      vi.mocked(timeTrackingService.stopTracking).mockResolvedValue(undefined);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      // Act: Stop tracking
      await useTimeTrackingStore.getState().stopTracking('Completed');

      // Assert: activeTracking remains null
      const state = useTimeTrackingStore.getState();
      expect(state.activeTracking).toBeNull();
      expect(state.isStopping).toBe(false);
      expect(state.error).toBeNull();
    });

    it('refreshes entries after successful stop', async () => {
      // Setup
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      vi.mocked(timeTrackingService.stopTracking).mockResolvedValue(undefined);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      // Act: Stop tracking
      await useTimeTrackingStore.getState().stopTracking('Done');

      // Assert: getEntries was called to refresh
      expect(timeTrackingService.getEntries).toHaveBeenCalled();
    });
  });

  describe('Rollback on error', () => {
    it('restores activeTracking when API call fails', async () => {
      // Setup: User has active tracking
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      const errorMessage = 'Failed to stop tracking';
      let rejectPromise: (error: Error) => void;
      const controlledPromise = new Promise<void>((_, reject) => {
        rejectPromise = reject;
      });
      vi.mocked(timeTrackingService.stopTracking).mockReturnValue(controlledPromise);

      // Act: Stop tracking
      const stopPromise = useTimeTrackingStore.getState().stopTracking('Done');

      // Verify optimistic update happened (cleared)
      const optimisticState = useTimeTrackingStore.getState();
      expect(optimisticState.activeTracking).toBeNull();

      // Reject the API call
      rejectPromise!(new Error(errorMessage));

      // Wait for error handling
      await expect(stopPromise).rejects.toThrow(errorMessage);

      // Assert: State rolled back to previous tracking
      const finalState = useTimeTrackingStore.getState();
      expect(finalState.activeTracking).toEqual(existingTracking);
      expect(finalState.error).toBe(errorMessage);
      expect(finalState.isStopping).toBe(false);
    });

    it('restores localStorage when API call fails', async () => {
      // Setup
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      localStorage.setItem('rxdx_active_tracking', JSON.stringify(existingTracking));
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      const errorMessage = 'Network error';
      vi.mocked(timeTrackingService.stopTracking).mockRejectedValue(new Error(errorMessage));

      // Act: Stop tracking (will fail)
      await expect(
        useTimeTrackingStore.getState().stopTracking('Done')
      ).rejects.toThrow(errorMessage);

      // Assert: localStorage restored
      const stored = localStorage.getItem('rxdx_active_tracking');
      expect(stored).not.toBeNull();
      
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(existingTracking);
    });

    it('sets error message when API call fails', async () => {
      // Setup
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      const errorMessage = 'Server unavailable';
      vi.mocked(timeTrackingService.stopTracking).mockRejectedValue(new Error(errorMessage));

      // Act: Stop tracking (will fail)
      await expect(
        useTimeTrackingStore.getState().stopTracking('Done')
      ).rejects.toThrow(errorMessage);

      // Assert: Error message set
      const state = useTimeTrackingStore.getState();
      expect(state.error).toBe(errorMessage);
      expect(state.isStopping).toBe(false);
    });

    it('stores retry context when API call fails', async () => {
      // Setup
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      const errorMessage = 'Connection timeout';
      vi.mocked(timeTrackingService.stopTracking).mockRejectedValue(new Error(errorMessage));

      // Act: Stop tracking (will fail)
      await expect(
        useTimeTrackingStore.getState().stopTracking('Completed feature')
      ).rejects.toThrow(errorMessage);

      // Assert: Retry context stored
      const state = useTimeTrackingStore.getState();
      expect(state.lastFailedOperation).toEqual({
        operation: 'stopTracking',
        params: {
          description: 'Completed feature',
        },
      });
    });

    it('does not refresh entries when stop fails', async () => {
      // Setup
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      vi.mocked(timeTrackingService.stopTracking).mockRejectedValue(new Error('Stop failed'));

      // Act: Stop tracking (will fail)
      await expect(
        useTimeTrackingStore.getState().stopTracking('Done')
      ).rejects.toThrow();

      // Assert: getEntries was NOT called
      expect(timeTrackingService.getEntries).not.toHaveBeenCalled();
    });
  });

  describe('Retry functionality', () => {
    it('retries stopTracking with original parameters', async () => {
      // Setup
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // First call fails
      vi.mocked(timeTrackingService.stopTracking).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        useTimeTrackingStore.getState().stopTracking('Completed feature')
      ).rejects.toThrow('Network error');

      // Verify error state
      expect(useTimeTrackingStore.getState().error).toBe('Network error');
      expect(useTimeTrackingStore.getState().lastFailedOperation).toBeTruthy();

      // Restore active tracking for retry (since it was rolled back)
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // Second call succeeds
      vi.mocked(timeTrackingService.stopTracking).mockResolvedValue(undefined);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      // Act: Retry
      await useTimeTrackingStore.getState().retryLastOperation();

      // Assert: Retry called with original parameters
      expect(timeTrackingService.stopTracking).toHaveBeenCalledWith('Completed feature');
      expect(timeTrackingService.stopTracking).toHaveBeenCalledTimes(2);

      // Assert: Success state
      const state = useTimeTrackingStore.getState();
      expect(state.activeTracking).toBeNull();
      expect(state.error).toBeNull();
      expect(state.lastFailedOperation).toBeNull();
    });

    it('clears error and retry context on successful retry', async () => {
      // Setup
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // First call fails
      vi.mocked(timeTrackingService.stopTracking).mockRejectedValueOnce(
        new Error('Temporary error')
      );

      await expect(
        useTimeTrackingStore.getState().stopTracking('Done')
      ).rejects.toThrow();

      // Verify error state exists
      expect(useTimeTrackingStore.getState().error).toBeTruthy();
      expect(useTimeTrackingStore.getState().lastFailedOperation).toBeTruthy();

      // Restore active tracking for retry
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // Second call succeeds
      vi.mocked(timeTrackingService.stopTracking).mockResolvedValue(undefined);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      // Act: Retry
      await useTimeTrackingStore.getState().retryLastOperation();

      // Assert: Error and retry context cleared
      const state = useTimeTrackingStore.getState();
      expect(state.error).toBeNull();
      expect(state.lastFailedOperation).toBeNull();
    });

    it('performs optimistic update on retry', async () => {
      // Setup
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // First call fails
      vi.mocked(timeTrackingService.stopTracking).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        useTimeTrackingStore.getState().stopTracking('Done')
      ).rejects.toThrow();

      // Restore active tracking for retry
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // Setup controlled promise for retry
      let resolveRetry: (value: void) => void;
      const retryPromise = new Promise<void>((resolve) => {
        resolveRetry = resolve;
      });
      vi.mocked(timeTrackingService.stopTracking).mockReturnValue(retryPromise);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      // Act: Retry (don't await)
      const retryOperation = useTimeTrackingStore.getState().retryLastOperation();

      // Assert: Optimistic update happened immediately on retry (cleared)
      const stateBeforeRetryResponse = useTimeTrackingStore.getState();
      expect(stateBeforeRetryResponse.activeTracking).toBeNull();
      expect(stateBeforeRetryResponse.isStopping).toBe(true);

      // Cleanup: Resolve retry
      resolveRetry!();
      await retryOperation;
    });

    it('handles retry failure with rollback', async () => {
      // Setup
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // First call fails
      vi.mocked(timeTrackingService.stopTracking).mockRejectedValueOnce(
        new Error('First error')
      );

      await expect(
        useTimeTrackingStore.getState().stopTracking('Done')
      ).rejects.toThrow('First error');

      // Restore active tracking for retry
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // Retry also fails
      vi.mocked(timeTrackingService.stopTracking).mockRejectedValueOnce(
        new Error('Second error')
      );

      // Act: Retry (will fail again)
      await useTimeTrackingStore.getState().retryLastOperation();

      // Assert: State rolled back, new error set
      const state = useTimeTrackingStore.getState();
      expect(state.activeTracking).toEqual(existingTracking);
      expect(state.error).toBe('Second error');
      expect(state.lastFailedOperation).toBeTruthy();
    });

    it('refreshes entries on successful retry', async () => {
      // Setup
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // First call fails
      vi.mocked(timeTrackingService.stopTracking).mockRejectedValueOnce(
        new Error('Network error')
      );

      await expect(
        useTimeTrackingStore.getState().stopTracking('Done')
      ).rejects.toThrow();

      // Restore active tracking for retry
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // Second call succeeds
      vi.mocked(timeTrackingService.stopTracking).mockResolvedValue(undefined);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      // Act: Retry
      await useTimeTrackingStore.getState().retryLastOperation();

      // Assert: Entries refreshed
      expect(timeTrackingService.getEntries).toHaveBeenCalled();
    });
  });
});

describe('Optimistic Updates - Edge Cases', () => {
  beforeEach(() => {
    useTimeTrackingStore.getState().reset();
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('Concurrent operations', () => {
    it('prevents starting tracking while another start is in progress', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      // Setup: First call is slow
      let resolveFirst: (value: ActiveTracking) => void;
      const firstPromise = new Promise<ActiveTracking>((resolve) => {
        resolveFirst = resolve;
      });
      vi.mocked(timeTrackingService.startTracking).mockReturnValue(firstPromise);

      // Act: Start first tracking (don't await)
      const firstStart = useTimeTrackingStore.getState().startTracking('task-1', 'First');

      // Try to start second tracking while first is in progress
      await useTimeTrackingStore.getState().startTracking('task-1', 'Second');

      // Assert: Second start was prevented
      const state = useTimeTrackingStore.getState();
      expect(state.error).toBe('You already have an active tracking session');
      expect(timeTrackingService.startTracking).toHaveBeenCalledTimes(1);

      // Cleanup
      resolveFirst!({
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'First',
      });
      await firstStart;
    });

    it('prevents stopping tracking while another stop is in progress', async () => {
      // Setup
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // Setup: First call is slow
      let resolveFirst: (value: void) => void;
      const firstPromise = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });
      vi.mocked(timeTrackingService.stopTracking).mockReturnValue(firstPromise);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      // Act: Start first stop (don't await)
      const firstStop = useTimeTrackingStore.getState().stopTracking('First');

      // Try to stop again while first is in progress
      await useTimeTrackingStore.getState().stopTracking('Second');

      // Assert: Second stop was prevented
      const state = useTimeTrackingStore.getState();
      expect(state.error).toBe('No active tracking session to stop');
      expect(timeTrackingService.stopTracking).toHaveBeenCalledTimes(1);

      // Cleanup
      resolveFirst!();
      await firstStop;
    });
  });

  describe('localStorage edge cases', () => {
    it('handles localStorage quota exceeded on optimistic update', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      // Mock localStorage.setItem to throw quota exceeded error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      vi.mocked(timeTrackingService.startTracking).mockResolvedValue(mockActiveTracking);

      // Act: Start tracking (should not crash despite localStorage error)
      await useTimeTrackingStore.getState().startTracking('task-1', 'Working');

      // Assert: Operation succeeded despite localStorage error
      const state = useTimeTrackingStore.getState();
      expect(state.activeTracking).toEqual(mockActiveTracking);
      expect(state.error).toBeNull();

      // Restore
      localStorage.setItem = originalSetItem;
    });

    it('handles localStorage unavailable (private browsing)', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      // Mock localStorage to be unavailable
      const originalSetItem = localStorage.setItem;
      const originalGetItem = localStorage.getItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('localStorage is not available');
      });
      localStorage.getItem = vi.fn(() => {
        throw new Error('localStorage is not available');
      });

      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      vi.mocked(timeTrackingService.startTracking).mockResolvedValue(mockActiveTracking);

      // Act: Start tracking (should not crash)
      await useTimeTrackingStore.getState().startTracking('task-1', 'Working');

      // Assert: Operation succeeded
      const state = useTimeTrackingStore.getState();
      expect(state.activeTracking).toEqual(mockActiveTracking);

      // Restore
      localStorage.setItem = originalSetItem;
      localStorage.getItem = originalGetItem;
    });
  });

  describe('Validation edge cases', () => {
    it('prevents starting tracking when task not found', async () => {
      // Setup: Empty tasks array
      useTimeTrackingStore.setState({ tasks: [] });

      // Act: Try to start tracking for non-existent task
      await useTimeTrackingStore.getState().startTracking('nonexistent-task', 'Working');

      // Assert: Error set, no API call made
      const state = useTimeTrackingStore.getState();
      expect(state.error).toBe('Task not found');
      expect(state.activeTracking).toBeNull();
      expect(timeTrackingService.startTracking).not.toHaveBeenCalled();
    });

    it('prevents stopping tracking when no active tracking exists', async () => {
      // Setup: No active tracking
      useTimeTrackingStore.setState({ activeTracking: null });

      // Act: Try to stop tracking
      await useTimeTrackingStore.getState().stopTracking('Done');

      // Assert: Error set, no API call made
      const state = useTimeTrackingStore.getState();
      expect(state.error).toBe('No active tracking session to stop');
      expect(timeTrackingService.stopTracking).not.toHaveBeenCalled();
    });
  });

  describe('Error message handling', () => {
    it('handles non-Error objects in startTracking failure', async () => {
      // Setup
      const mockTask: Task = {
        id: 'task-1',
        title: 'Test Task',
        description: 'Description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      };
      useTimeTrackingStore.setState({ tasks: [mockTask] });

      // Mock rejection with non-Error object
      vi.mocked(timeTrackingService.startTracking).mockRejectedValue('String error');

      // Act: Start tracking (will fail)
      await expect(
        useTimeTrackingStore.getState().startTracking('task-1', 'Working')
      ).rejects.toBe('String error');

      // Assert: Generic error message used
      const state = useTimeTrackingStore.getState();
      expect(state.error).toBe('Failed to start tracking');
      expect(state.activeTracking).toBeNull();
    });

    it('handles non-Error objects in stopTracking failure', async () => {
      // Setup
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      // Mock rejection with non-Error object
      vi.mocked(timeTrackingService.stopTracking).mockRejectedValue({ code: 500 });

      // Act: Stop tracking (will fail)
      await expect(
        useTimeTrackingStore.getState().stopTracking('Done')
      ).rejects.toEqual({ code: 500 });

      // Assert: Generic error message used, state rolled back
      const state = useTimeTrackingStore.getState();
      expect(state.error).toBe('Failed to stop tracking');
      expect(state.activeTracking).toEqual(existingTracking);
    });
  });
});

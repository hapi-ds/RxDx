/**
 * Property-Based Test: Optimistic UI Update Rollback
 * 
 * **Validates: Requirements 14.7**
 * 
 * Property 13: Optimistic UI Update Rollback
 * For any optimistic update (start/stop tracking), if the API call fails,
 * the UI state should revert to the previous state.
 * 
 * This property test validates that:
 * 1. Regardless of the operation type (start/stop)
 * 2. Regardless of the error type
 * 3. Regardless of the previous state
 * 4. The UI always rolls back to the exact previous state on failure
 * 5. localStorage is also rolled back correctly
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import { useTimeTrackingStore } from './timeTrackingStore';
import {
  timeTrackingService,
  type Task,
  type ActiveTracking,
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

// Arbitraries for property-based testing

/**
 * Generates arbitrary Task objects
 */
const taskArbitrary = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ maxLength: 500 }),
  status: fc.constantFrom('not_started', 'in_progress', 'completed', 'blocked'),
  priority: fc.integer({ min: 1, max: 5 }),
  estimated_hours: fc.float({ min: 0, max: 100 }),
  worked_sum: fc.float({ min: 0, max: 100 }),
  has_active_tracking: fc.boolean(),
  user_is_tracking: fc.boolean(),
}) as fc.Arbitrary<Task>;

/**
 * Generates arbitrary ActiveTracking objects
 */
const activeTrackingArbitrary = fc.record({
  id: fc.uuid(),
  task_id: fc.uuid(),
  task_title: fc.string({ minLength: 1, maxLength: 100 }),
  start_time: fc.date({ min: new Date('2024-01-01'), max: new Date() }).map(d => d.toISOString()),
  description: fc.string({ maxLength: 500 }),
}) as fc.Arbitrary<ActiveTracking>;

/**
 * Generates arbitrary error messages
 */
const errorArbitrary = fc.oneof(
  fc.constant('Network error'),
  fc.constant('Server unavailable'),
  fc.constant('Connection timeout'),
  fc.constant('Internal server error'),
  fc.constant('Unauthorized'),
  fc.constant('Bad request'),
  fc.string({ minLength: 5, maxLength: 100 }),
);

/**
 * Generates arbitrary operation types
 */
const operationArbitrary = fc.constantFrom('startTracking', 'stopTracking');

describe('Property 13: Optimistic UI Update Rollback', () => {
  beforeEach(() => {
    useTimeTrackingStore.getState().reset();
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('Property: startTracking always rolls back to previous state on any error', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
        fc.option(activeTrackingArbitrary, { nil: null }),
        fc.string({ maxLength: 500 }),
        errorArbitrary,
        async (tasks, previousActiveTracking, description, errorMessage) => {
          // Setup: Initialize store with previous state
          useTimeTrackingStore.setState({
            tasks,
            activeTracking: previousActiveTracking,
          });

          // Setup localStorage to match previous state
          if (previousActiveTracking) {
            localStorage.setItem('rxdx_active_tracking', JSON.stringify(previousActiveTracking));
          } else {
            localStorage.removeItem('rxdx_active_tracking');
          }

          // Capture previous state
          const stateBefore = {
            activeTracking: previousActiveTracking,
            localStorageBefore: localStorage.getItem('rxdx_active_tracking'),
          };

          // Mock API to fail
          vi.mocked(timeTrackingService.startTracking).mockRejectedValue(
            new Error(errorMessage)
          );

          // Select a task to track
          const taskToTrack = tasks[0];

          // Act: Attempt to start tracking (will fail)
          try {
            await useTimeTrackingStore.getState().startTracking(taskToTrack.id, description);
          } catch {
            // Expected to throw
          }

          // Assert: State rolled back to previous state
          const stateAfter = useTimeTrackingStore.getState();
          expect(stateAfter.activeTracking).toEqual(stateBefore.activeTracking);

          // Assert: localStorage rolled back
          const localStorageAfter = localStorage.getItem('rxdx_active_tracking');
          expect(localStorageAfter).toEqual(stateBefore.localStorageBefore);

          // Assert: Error is set
          expect(stateAfter.error).toBeTruthy();

          // Assert: Loading state is cleared
          expect(stateAfter.isStarting).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: stopTracking always rolls back to previous state on any error', () => {
    fc.assert(
      fc.asyncProperty(
        activeTrackingArbitrary,
        fc.string({ maxLength: 500 }),
        errorArbitrary,
        async (previousActiveTracking, description, errorMessage) => {
          // Setup: Initialize store with active tracking
          useTimeTrackingStore.setState({
            activeTracking: previousActiveTracking,
          });

          // Setup localStorage
          localStorage.setItem('rxdx_active_tracking', JSON.stringify(previousActiveTracking));

          // Capture previous state
          const stateBefore = {
            activeTracking: previousActiveTracking,
            localStorageBefore: localStorage.getItem('rxdx_active_tracking'),
          };

          // Mock API to fail
          vi.mocked(timeTrackingService.stopTracking).mockRejectedValue(
            new Error(errorMessage)
          );

          // Act: Attempt to stop tracking (will fail)
          try {
            await useTimeTrackingStore.getState().stopTracking(description);
          } catch {
            // Expected to throw
          }

          // Assert: State rolled back to previous state
          const stateAfter = useTimeTrackingStore.getState();
          expect(stateAfter.activeTracking).toEqual(stateBefore.activeTracking);

          // Assert: localStorage rolled back
          const localStorageAfter = localStorage.getItem('rxdx_active_tracking');
          expect(localStorageAfter).toEqual(stateBefore.localStorageBefore);

          // Assert: Error is set
          expect(stateAfter.error).toBeTruthy();

          // Assert: Loading state is cleared
          expect(stateAfter.isStopping).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: startTracking with null previous state rolls back to null', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
        fc.string({ maxLength: 500 }),
        errorArbitrary,
        async (tasks, description, errorMessage) => {
          // Setup: No previous active tracking
          useTimeTrackingStore.setState({
            tasks,
            activeTracking: null,
          });

          // Ensure localStorage is clear
          localStorage.removeItem('rxdx_active_tracking');

          // Mock API to fail
          vi.mocked(timeTrackingService.startTracking).mockRejectedValue(
            new Error(errorMessage)
          );

          // Select a task to track
          const taskToTrack = tasks[0];

          // Act: Attempt to start tracking (will fail)
          try {
            await useTimeTrackingStore.getState().startTracking(taskToTrack.id, description);
          } catch {
            // Expected to throw
          }

          // Assert: State rolled back to null
          const stateAfter = useTimeTrackingStore.getState();
          expect(stateAfter.activeTracking).toBeNull();

          // Assert: localStorage remains clear
          expect(localStorage.getItem('rxdx_active_tracking')).toBeNull();

          // Assert: Error is set
          expect(stateAfter.error).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Rollback preserves exact previous state structure', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
        activeTrackingArbitrary,
        fc.string({ maxLength: 500 }),
        errorArbitrary,
        async (tasks, previousActiveTracking, description, errorMessage) => {
          // Setup: Initialize with previous state
          useTimeTrackingStore.setState({
            tasks,
            activeTracking: previousActiveTracking,
          });

          localStorage.setItem('rxdx_active_tracking', JSON.stringify(previousActiveTracking));

          // Create a deep copy of previous state for comparison
          const previousStateCopy = JSON.parse(JSON.stringify(previousActiveTracking));

          // Mock API to fail
          vi.mocked(timeTrackingService.startTracking).mockRejectedValue(
            new Error(errorMessage)
          );

          // Act: Attempt to start tracking (will fail)
          try {
            await useTimeTrackingStore.getState().startTracking(tasks[0].id, description);
          } catch {
            // Expected to throw
          }

          // Assert: Rolled back state is structurally identical to previous state
          const stateAfter = useTimeTrackingStore.getState();
          expect(JSON.stringify(stateAfter.activeTracking)).toEqual(
            JSON.stringify(previousStateCopy)
          );

          // Assert: All fields match exactly
          if (stateAfter.activeTracking && previousActiveTracking) {
            expect(stateAfter.activeTracking.id).toBe(previousActiveTracking.id);
            expect(stateAfter.activeTracking.task_id).toBe(previousActiveTracking.task_id);
            expect(stateAfter.activeTracking.task_title).toBe(previousActiveTracking.task_title);
            expect(stateAfter.activeTracking.start_time).toBe(previousActiveTracking.start_time);
            expect(stateAfter.activeTracking.description).toBe(previousActiveTracking.description);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Multiple consecutive failures always maintain rollback integrity', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
        fc.option(activeTrackingArbitrary, { nil: null }),
        fc.array(errorArbitrary, { minLength: 2, maxLength: 5 }),
        fc.string({ maxLength: 500 }),
        async (tasks, initialActiveTracking, errorMessages, description) => {
          // Setup: Initialize with initial state
          useTimeTrackingStore.setState({
            tasks,
            activeTracking: initialActiveTracking,
          });

          if (initialActiveTracking) {
            localStorage.setItem('rxdx_active_tracking', JSON.stringify(initialActiveTracking));
          }

          const taskToTrack = tasks[0];

          // Act: Attempt multiple operations that all fail
          for (const errorMessage of errorMessages) {
            // Capture state before this attempt
            const stateBefore = useTimeTrackingStore.getState().activeTracking;
            const localStorageBefore = localStorage.getItem('rxdx_active_tracking');

            // Mock API to fail with this error
            vi.mocked(timeTrackingService.startTracking).mockRejectedValue(
              new Error(errorMessage)
            );

            // Attempt operation
            try {
              await useTimeTrackingStore.getState().startTracking(taskToTrack.id, description);
            } catch {
              // Expected to throw
            }

            // Assert: State rolled back to what it was before this attempt
            const stateAfter = useTimeTrackingStore.getState();
            expect(stateAfter.activeTracking).toEqual(stateBefore);
            expect(localStorage.getItem('rxdx_active_tracking')).toEqual(localStorageBefore);
          }

          // Final assertion: State is still the initial state
          const finalState = useTimeTrackingStore.getState();
          expect(finalState.activeTracking).toEqual(initialActiveTracking);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property: Rollback works regardless of error type (Error vs non-Error)', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
        fc.option(activeTrackingArbitrary, { nil: null }),
        fc.string({ maxLength: 500 }),
        fc.oneof(
          // Error objects
          errorArbitrary.map(msg => new Error(msg)),
          // Non-Error objects
          fc.string(),
          fc.record({ code: fc.integer(), message: fc.string() }),
          fc.constant(null),
          fc.constant(undefined),
        ),
        async (tasks, previousActiveTracking, description, errorValue) => {
          // Setup
          useTimeTrackingStore.setState({
            tasks,
            activeTracking: previousActiveTracking,
          });

          if (previousActiveTracking) {
            localStorage.setItem('rxdx_active_tracking', JSON.stringify(previousActiveTracking));
          }

          const stateBefore = {
            activeTracking: previousActiveTracking,
            localStorageBefore: localStorage.getItem('rxdx_active_tracking'),
          };

          // Mock API to fail with any error type
          vi.mocked(timeTrackingService.startTracking).mockRejectedValue(errorValue);

          // Act
          try {
            await useTimeTrackingStore.getState().startTracking(tasks[0].id, description);
          } catch {
            // Expected to throw
          }

          // Assert: Rollback works regardless of error type
          const stateAfter = useTimeTrackingStore.getState();
          expect(stateAfter.activeTracking).toEqual(stateBefore.activeTracking);
          expect(localStorage.getItem('rxdx_active_tracking')).toEqual(
            stateBefore.localStorageBefore
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Rollback clears optimistic loading states', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
        fc.option(activeTrackingArbitrary, { nil: null }),
        fc.string({ maxLength: 500 }),
        errorArbitrary,
        operationArbitrary,
        async (tasks, previousActiveTracking, description, errorMessage, operation) => {
          // Setup
          if (operation === 'startTracking') {
            useTimeTrackingStore.setState({
              tasks,
              activeTracking: previousActiveTracking,
            });

            if (previousActiveTracking) {
              localStorage.setItem('rxdx_active_tracking', JSON.stringify(previousActiveTracking));
            }

            vi.mocked(timeTrackingService.startTracking).mockRejectedValue(
              new Error(errorMessage)
            );

            // Act
            try {
              await useTimeTrackingStore.getState().startTracking(tasks[0].id, description);
            } catch {
              // Expected
            }

            // Assert: Loading state cleared
            expect(useTimeTrackingStore.getState().isStarting).toBe(false);
          } else {
            // stopTracking case
            if (!previousActiveTracking) {
              // Skip if no active tracking (can't stop)
              return;
            }

            useTimeTrackingStore.setState({
              activeTracking: previousActiveTracking,
            });

            localStorage.setItem('rxdx_active_tracking', JSON.stringify(previousActiveTracking));

            vi.mocked(timeTrackingService.stopTracking).mockRejectedValue(
              new Error(errorMessage)
            );

            // Act
            try {
              await useTimeTrackingStore.getState().stopTracking(description);
            } catch {
              // Expected
            }

            // Assert: Loading state cleared
            expect(useTimeTrackingStore.getState().isStopping).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Rollback sets error message for all failure scenarios', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
        fc.option(activeTrackingArbitrary, { nil: null }),
        fc.string({ maxLength: 500 }),
        errorArbitrary,
        operationArbitrary,
        async (tasks, previousActiveTracking, description, errorMessage, operation) => {
          // Setup
          if (operation === 'startTracking') {
            useTimeTrackingStore.setState({
              tasks,
              activeTracking: previousActiveTracking,
            });

            vi.mocked(timeTrackingService.startTracking).mockRejectedValue(
              new Error(errorMessage)
            );

            // Act
            try {
              await useTimeTrackingStore.getState().startTracking(tasks[0].id, description);
            } catch {
              // Expected
            }

            // Assert: Error message set
            const state = useTimeTrackingStore.getState();
            expect(state.error).toBeTruthy();
            expect(typeof state.error).toBe('string');
          } else {
            // stopTracking case
            if (!previousActiveTracking) {
              return; // Skip
            }

            useTimeTrackingStore.setState({
              activeTracking: previousActiveTracking,
            });

            vi.mocked(timeTrackingService.stopTracking).mockRejectedValue(
              new Error(errorMessage)
            );

            // Act
            try {
              await useTimeTrackingStore.getState().stopTracking(description);
            } catch {
              // Expected
            }

            // Assert: Error message set
            const state = useTimeTrackingStore.getState();
            expect(state.error).toBeTruthy();
            expect(typeof state.error).toBe('string');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: Rollback stores retry context for all failures', () => {
    fc.assert(
      fc.asyncProperty(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 10 }),
        fc.option(activeTrackingArbitrary, { nil: null }),
        fc.string({ maxLength: 500 }),
        errorArbitrary,
        operationArbitrary,
        async (tasks, previousActiveTracking, description, errorMessage, operation) => {
          // Setup
          if (operation === 'startTracking') {
            useTimeTrackingStore.setState({
              tasks,
              activeTracking: previousActiveTracking,
            });

            vi.mocked(timeTrackingService.startTracking).mockRejectedValue(
              new Error(errorMessage)
            );

            const taskId = tasks[0].id;

            // Act
            try {
              await useTimeTrackingStore.getState().startTracking(taskId, description);
            } catch {
              // Expected
            }

            // Assert: Retry context stored
            const state = useTimeTrackingStore.getState();
            expect(state.lastFailedOperation).toBeTruthy();
            expect(state.lastFailedOperation?.operation).toBe('startTracking');
            expect(state.lastFailedOperation?.params).toEqual({ taskId, description });
          } else {
            // stopTracking case
            if (!previousActiveTracking) {
              return; // Skip
            }

            useTimeTrackingStore.setState({
              activeTracking: previousActiveTracking,
            });

            vi.mocked(timeTrackingService.stopTracking).mockRejectedValue(
              new Error(errorMessage)
            );

            // Act
            try {
              await useTimeTrackingStore.getState().stopTracking(description);
            } catch {
              // Expected
            }

            // Assert: Retry context stored
            const state = useTimeTrackingStore.getState();
            expect(state.lastFailedOperation).toBeTruthy();
            expect(state.lastFailedOperation?.operation).toBe('stopTracking');
            expect(state.lastFailedOperation?.params).toEqual({ description });
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

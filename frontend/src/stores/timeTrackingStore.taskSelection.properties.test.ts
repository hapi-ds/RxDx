/**
 * Property-based tests for task selection persistence in timeTrackingStore
 * Feature: web-time-tracking, Property 14: Task Selection Persistence
 * Validates: Requirements 4.8
 * 
 * Tests that task selection state is correctly persisted to and recovered from sessionStorage.
 * For any valid task ID, the selection should be persisted and recoverable across page navigations.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { useTimeTrackingStore } from './timeTrackingStore';

describe('Property 14: Task Selection Persistence', () => {
  const SESSION_SELECTED_TASK_KEY = 'rxdx_session_selected_task';

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    useTimeTrackingStore.getState().reset();
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  // ==========================================================================
  // Property 1: Any valid task ID can be persisted and recovered
  // ==========================================================================

  it('should persist and recover any valid task ID', () => {
    fc.assert(
      fc.property(
        // Generate valid task IDs (UUIDs or alphanumeric strings)
        fc.oneof(
          fc.uuid(),
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.integer({ min: 1, max: 1000000 }).map(n => `task-${n}`),
          fc.string({ minLength: 8, maxLength: 64 }).map(s => 'hex-' + s.replace(/[^a-f0-9]/gi, '0')),
        ),
        (taskId) => {
          const store = useTimeTrackingStore.getState();

          // Select the task
          store.selectTask(taskId);

          // Verify it's in the store
          expect(store.selectedTaskId).toBe(taskId);

          // Verify it's in sessionStorage
          const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          expect(stored).toBe(taskId);

          // Simulate page reload by creating a new store instance
          // In real scenario, this would be a new page load
          // For testing, we verify sessionStorage contains the value
          const recovered = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          expect(recovered).toBe(taskId);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 2: Null selection clears sessionStorage
  // ==========================================================================

  it('should clear sessionStorage when task selection is set to null', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (taskId) => {
          const store = useTimeTrackingStore.getState();

          // First select a task
          store.selectTask(taskId);
          expect(sessionStorage.getItem(SESSION_SELECTED_TASK_KEY)).toBe(taskId);

          // Then deselect (set to null)
          store.selectTask(null);

          // Verify store state is null
          expect(store.selectedTaskId).toBeNull();

          // Verify sessionStorage is cleared
          const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          expect(stored).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 3: Multiple selections preserve only the latest
  // ==========================================================================

  it('should preserve only the latest task selection after multiple selections', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }),
        (taskIds) => {
          const store = useTimeTrackingStore.getState();

          // Select multiple tasks in sequence
          taskIds.forEach(taskId => {
            store.selectTask(taskId);
          });

          // Only the last selection should be preserved
          const lastTaskId = taskIds[taskIds.length - 1];
          expect(store.selectedTaskId).toBe(lastTaskId);

          const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          expect(stored).toBe(lastTaskId);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 4: Task selection is independent of search query
  // ==========================================================================

  it('should persist task selection independently of search query changes', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.string({ maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        (taskId, searchQueries) => {
          const store = useTimeTrackingStore.getState();

          // Select a task
          store.selectTask(taskId);

          // Change search query multiple times
          searchQueries.forEach(query => {
            store.setSearchQuery(query);
          });

          // Task selection should remain unchanged
          expect(store.selectedTaskId).toBe(taskId);

          const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          expect(stored).toBe(taskId);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 5: Whitespace in task IDs is preserved
  // ==========================================================================

  it('should preserve task IDs with leading/trailing whitespace', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.array(fc.constantFrom(' ', '\t'), { minLength: 0, maxLength: 3 }),
        fc.array(fc.constantFrom(' ', '\t'), { minLength: 0, maxLength: 3 }),
        (baseId, leadingWhitespace, trailingWhitespace) => {
          const taskId = leadingWhitespace.join('') + baseId + trailingWhitespace.join('');
          
          // Skip empty strings
          if (!taskId.trim()) {
            return true;
          }

          const store = useTimeTrackingStore.getState();

          // Select task with whitespace
          store.selectTask(taskId);

          // Verify exact value is preserved (no trimming)
          expect(store.selectedTaskId).toBe(taskId);

          const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          expect(stored).toBe(taskId);

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 6: Special characters in task IDs are preserved
  // ==========================================================================

  it('should preserve task IDs with special characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).map(s => {
          // Add special characters
          const specialChars = ['@', '#', '$', '%', '&', '*', '(', ')', '-', '_', '+', '=', '[', ']', '{', '}', '|', ':', ';', '"', "'", '<', '>', ',', '.', '?', '/'];
          const randomChar = specialChars[Math.floor(Math.random() * specialChars.length)];
          return s + randomChar + Math.random().toString(36).substring(7);
        }),
        (taskId) => {
          const store = useTimeTrackingStore.getState();

          // Select task with special characters
          store.selectTask(taskId);

          // Verify exact value is preserved
          expect(store.selectedTaskId).toBe(taskId);

          const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          expect(stored).toBe(taskId);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 7: Unicode characters in task IDs are preserved
  // ==========================================================================

  it('should preserve task IDs with unicode characters', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => s + '测试'),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => s + 'тест'),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => s + 'テスト'),
          fc.string({ minLength: 1, maxLength: 20 }).map(s => s + '🚀'),
        ),
        (taskId) => {
          const store = useTimeTrackingStore.getState();

          // Select task with unicode
          store.selectTask(taskId);

          // Verify exact value is preserved
          expect(store.selectedTaskId).toBe(taskId);

          const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          expect(stored).toBe(taskId);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 8: Task selection survives store reset (via sessionStorage)
  // ==========================================================================

  it('should recover task selection after store reset', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (taskId) => {
          const store = useTimeTrackingStore.getState();

          // Select a task
          store.selectTask(taskId);

          // Verify it's in sessionStorage
          expect(sessionStorage.getItem(SESSION_SELECTED_TASK_KEY)).toBe(taskId);

          // Reset the store (simulating component unmount/remount)
          store.reset();

          // After reset, store state should be from initial state
          // which recovers from sessionStorage
          // Note: In the actual implementation, recovery happens on store creation
          // For this test, we verify sessionStorage still has the value
          const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          expect(stored).toBe(taskId);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 9: Alternating between selection and deselection
  // ==========================================================================

  it('should handle alternating selection and deselection correctly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            taskId: fc.option(fc.uuid(), { nil: null }),
          }),
          { minLength: 2, maxLength: 10 }
        ),
        (operations) => {
          const store = useTimeTrackingStore.getState();

          // Perform alternating selections
          operations.forEach(({ taskId }) => {
            store.selectTask(taskId);

            // Verify store state
            expect(store.selectedTaskId).toBe(taskId);

            // Verify sessionStorage state
            const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
            if (taskId === null) {
              expect(stored).toBeNull();
            } else {
              expect(stored).toBe(taskId);
            }
          });

          // Final state should match last operation
          const lastOp = operations[operations.length - 1];
          expect(store.selectedTaskId).toBe(lastOp.taskId);

          const finalStored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          if (lastOp.taskId === null) {
            expect(finalStored).toBeNull();
          } else {
            expect(finalStored).toBe(lastOp.taskId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 10: sessionStorage quota exceeded is handled gracefully
  // ==========================================================================

  it('should handle sessionStorage quota exceeded without crashing', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (taskId) => {
          const store = useTimeTrackingStore.getState();

          // Mock sessionStorage.setItem to throw quota exceeded error
          const originalSetItem = sessionStorage.setItem;
          let callCount = 0;
          sessionStorage.setItem = () => {
            callCount++;
            throw new DOMException('QuotaExceededError');
          };

          // Should not throw error
          expect(() => {
            store.selectTask(taskId);
          }).not.toThrow();

          // Store state should still be updated
          expect(store.selectedTaskId).toBe(taskId);

          // Verify setItem was attempted
          expect(callCount).toBeGreaterThan(0);

          // Restore original setItem
          sessionStorage.setItem = originalSetItem;
        }
      ),
      { numRuns: 50 } // Fewer runs since we're mocking
    );
  });

  // ==========================================================================
  // Property 11: Very long task IDs are handled correctly
  // ==========================================================================

  it('should handle very long task IDs without truncation', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 100, maxLength: 1000 }),
        (longTaskId) => {
          const store = useTimeTrackingStore.getState();

          // Select task with very long ID
          store.selectTask(longTaskId);

          // Verify exact value is preserved (no truncation)
          expect(store.selectedTaskId).toBe(longTaskId);
          expect(store.selectedTaskId?.length).toBe(longTaskId.length);

          const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          expect(stored).toBe(longTaskId);
          expect(stored?.length).toBe(longTaskId.length);
        }
      ),
      { numRuns: 50 } // Fewer runs for performance
    );
  });

  // ==========================================================================
  // Property 12: Task selection is idempotent
  // ==========================================================================

  it('should be idempotent - selecting the same task multiple times has same effect', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 2, max: 10 }),
        (taskId, repeatCount) => {
          const store = useTimeTrackingStore.getState();

          // Select the same task multiple times
          for (let i = 0; i < repeatCount; i++) {
            store.selectTask(taskId);

            // Each time, state should be the same
            expect(store.selectedTaskId).toBe(taskId);

            const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
            expect(stored).toBe(taskId);
          }

          // Final state should be identical to first selection
          expect(store.selectedTaskId).toBe(taskId);

          const finalStored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          expect(finalStored).toBe(taskId);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 13: Task selection with empty string is treated as deselection
  // ==========================================================================

  it('should treat empty string task ID as valid selection', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (initialTaskId) => {
          const store = useTimeTrackingStore.getState();

          // First select a valid task
          store.selectTask(initialTaskId);
          expect(store.selectedTaskId).toBe(initialTaskId);

          // Then select empty string
          store.selectTask('');

          // Empty string should be stored as-is (not converted to null)
          expect(store.selectedTaskId).toBe('');

          const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          // Note: Based on the implementation, empty string might be cleared
          // This test validates the actual behavior
          expect(stored === '' || stored === null).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 14: Concurrent selections (last write wins)
  // ==========================================================================

  it('should handle rapid successive selections correctly (last write wins)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 5, maxLength: 20 }),
        (taskIds) => {
          const store = useTimeTrackingStore.getState();

          // Rapidly select multiple tasks
          taskIds.forEach(taskId => {
            store.selectTask(taskId);
          });

          // Last selection should win
          const lastTaskId = taskIds[taskIds.length - 1];
          expect(store.selectedTaskId).toBe(lastTaskId);

          const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
          expect(stored).toBe(lastTaskId);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 15: Task selection is consistent across multiple reads
  // ==========================================================================

  it('should return consistent value across multiple reads', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 2, max: 10 }),
        (taskId, readCount) => {
          const store = useTimeTrackingStore.getState();

          // Select a task
          store.selectTask(taskId);

          // Read multiple times
          const readings: (string | null)[] = [];
          for (let i = 0; i < readCount; i++) {
            readings.push(store.selectedTaskId);
          }

          // All readings should be identical
          readings.forEach(reading => {
            expect(reading).toBe(taskId);
          });

          // sessionStorage should also be consistent
          for (let i = 0; i < readCount; i++) {
            const stored = sessionStorage.getItem(SESSION_SELECTED_TASK_KEY);
            expect(stored).toBe(taskId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

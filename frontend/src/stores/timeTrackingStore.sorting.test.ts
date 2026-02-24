/**
 * Property-based tests for task sorting in time tracking store
 * Feature: web-time-tracking, Property 1: Task List Sorting Consistency
 * Validates: Requirements 3.2
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Task } from '../services/timeTrackingService';

/**
 * Helper function to sort tasks using the same logic as the store
 * This is extracted to test the sorting logic independently
 */
function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
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
}

/**
 * Arbitrary generator for Task objects
 */
const taskArbitrary = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  description: fc.string({ maxLength: 500 }),
  status: fc.constantFrom('not_started', 'in_progress', 'completed', 'blocked'),
  priority: fc.integer({ min: 1, max: 5 }),
  estimated_hours: fc.float({ min: 0, max: 100 }),
  worked_sum: fc.float({ min: 0, max: 100 }),
  assigned_to: fc.option(fc.uuid(), { nil: undefined }),
  scheduled_start: fc.option(
    fc.integer({ min: new Date('2024-01-01').getTime(), max: new Date('2025-12-31').getTime() })
      .map(timestamp => new Date(timestamp).toISOString()),
    { nil: undefined }
  ),
  scheduled_end: fc.option(
    fc.integer({ min: new Date('2024-01-01').getTime(), max: new Date('2025-12-31').getTime() })
      .map(timestamp => new Date(timestamp).toISOString()),
    { nil: undefined }
  ),
  has_active_tracking: fc.boolean(),
  user_is_tracking: fc.boolean(),
}) as fc.Arbitrary<Task>;

describe('Property 1: Task List Sorting Consistency', () => {
  it('tasks with user_is_tracking=true appear before scheduled tasks', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 2, maxLength: 50 }),
        (tasks) => {
          const sorted = sortTasks(tasks);
          
          // Find indices of first task in each category
          const firstTrackingIndex = sorted.findIndex(t => t.user_is_tracking);
          const firstScheduledIndex = sorted.findIndex(t => !t.user_is_tracking && t.scheduled_start);
          
          // If both categories exist, tracking should come before scheduled
          if (firstTrackingIndex !== -1 && firstScheduledIndex !== -1) {
            expect(firstTrackingIndex).toBeLessThan(firstScheduledIndex);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('scheduled tasks appear before unscheduled tasks', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 2, maxLength: 50 }),
        (tasks) => {
          const sorted = sortTasks(tasks);
          
          // Find indices of first task in each category
          const firstScheduledIndex = sorted.findIndex(t => !t.user_is_tracking && t.scheduled_start);
          const firstUnscheduledIndex = sorted.findIndex(
            t => !t.user_is_tracking && !t.scheduled_start
          );
          
          // If both categories exist, scheduled should come before unscheduled
          if (firstScheduledIndex !== -1 && firstUnscheduledIndex !== -1) {
            expect(firstScheduledIndex).toBeLessThan(firstUnscheduledIndex);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('maintains complete priority order: tracking < scheduled < other', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 3, maxLength: 50 }),
        (tasks) => {
          const sorted = sortTasks(tasks);
          
          // Find indices of first task in each category
          const firstTrackingIndex = sorted.findIndex(t => t.user_is_tracking);
          const firstScheduledIndex = sorted.findIndex(t => !t.user_is_tracking && t.scheduled_start);
          const firstOtherIndex = sorted.findIndex(
            t => !t.user_is_tracking && !t.scheduled_start
          );
          
          // Verify complete order
          if (firstTrackingIndex !== -1 && firstScheduledIndex !== -1) {
            expect(firstTrackingIndex).toBeLessThan(firstScheduledIndex);
          }
          if (firstScheduledIndex !== -1 && firstOtherIndex !== -1) {
            expect(firstScheduledIndex).toBeLessThan(firstOtherIndex);
          }
          if (firstTrackingIndex !== -1 && firstOtherIndex !== -1) {
            expect(firstTrackingIndex).toBeLessThan(firstOtherIndex);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('scheduled tasks are sorted by date (earlier first)', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 2, maxLength: 50 }),
        (tasks) => {
          const sorted = sortTasks(tasks);
          
          // Extract scheduled tasks (not being tracked by user)
          const scheduledTasks = sorted.filter(t => !t.user_is_tracking && t.scheduled_start);
          
          // Verify they are sorted by scheduled_start date
          for (let i = 0; i < scheduledTasks.length - 1; i++) {
            const currentDate = new Date(scheduledTasks[i].scheduled_start!).getTime();
            const nextDate = new Date(scheduledTasks[i + 1].scheduled_start!).getTime();
            
            expect(currentDate).toBeLessThanOrEqual(nextDate);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all tracking tasks appear before all non-tracking tasks', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 2, maxLength: 50 }),
        (tasks) => {
          const sorted = sortTasks(tasks);
          
          // Find the last tracking task and first non-tracking task
          let lastTrackingIndex = -1;
          let firstNonTrackingIndex = -1;
          
          for (let i = 0; i < sorted.length; i++) {
            if (sorted[i].user_is_tracking) {
              lastTrackingIndex = i;
            } else if (firstNonTrackingIndex === -1) {
              firstNonTrackingIndex = i;
            }
          }
          
          // If both exist, last tracking should come before first non-tracking
          if (lastTrackingIndex !== -1 && firstNonTrackingIndex !== -1) {
            expect(lastTrackingIndex).toBeLessThan(firstNonTrackingIndex);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sorting is stable (preserves relative order within same priority)', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 2, maxLength: 20 }),
        (tasks) => {
          // Create tasks with same priority characteristics
          const samePriorityTasks = tasks.map(t => ({
            ...t,
            user_is_tracking: false,
            scheduled_start: undefined,
          }));
          
          const sorted = sortTasks(samePriorityTasks);
          
          // For tasks with same priority, order should be preserved
          // We verify this by checking that the relative order of IDs is maintained
          const originalIds = samePriorityTasks.map(t => t.id);
          const sortedIds = sorted.map(t => t.id);
          
          // Check that sorted IDs appear in the same relative order as original
          const originalIndices = new Map(originalIds.map((id, idx) => [id, idx]));
          
          for (let i = 0; i < sortedIds.length - 1; i++) {
            const currentOriginalIndex = originalIndices.get(sortedIds[i])!;
            const nextOriginalIndex = originalIndices.get(sortedIds[i + 1])!;
            
            // Relative order should be preserved
            expect(currentOriginalIndex).toBeLessThanOrEqual(nextOriginalIndex);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('sorting handles empty arrays', () => {
    const sorted = sortTasks([]);
    expect(sorted).toEqual([]);
  });

  it('sorting handles single task', () => {
    fc.assert(
      fc.property(
        taskArbitrary,
        (task) => {
          const sorted = sortTasks([task]);
          expect(sorted).toEqual([task]);
        }
      ),
      { numRuns: 100 }
    );
  });
});

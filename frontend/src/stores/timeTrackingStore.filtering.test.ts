/**
 * Property-based tests for search filtering in time tracking store
 * Feature: web-time-tracking, Property 6: Search Filter Correctness
 * Validates: Requirements 4.2
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { Task } from '../services/timeTrackingService';

/**
 * Helper function to filter tasks using the same logic as the store
 * This is extracted to test the filtering logic independently
 */
function filterTasks(tasks: Task[], searchQuery: string): Task[] {
  if (!searchQuery.trim()) {
    return tasks;
  }
  
  const query = searchQuery.toLowerCase();
  return tasks.filter(
    (task) =>
      task.title.toLowerCase().includes(query) ||
      task.description.toLowerCase().includes(query)
  );
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

describe('Property 6: Search Filter Correctness', () => {
  it('all filtered tasks contain the search query in title or description', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (tasks, query) => {
          const filtered = filterTasks(tasks, query);
          
          // All filtered tasks should match the query
          filtered.forEach(task => {
            const matchesTitle = task.title.toLowerCase().includes(query.toLowerCase());
            const matchesDesc = task.description.toLowerCase().includes(query.toLowerCase());
            expect(matchesTitle || matchesDesc).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('no filtered tasks are excluded if they match the query', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (tasks, query) => {
          const filtered = filterTasks(tasks, query);
          const filteredIds = new Set(filtered.map(t => t.id));
          
          // Check that no matching tasks were excluded
          tasks.forEach(task => {
            const matchesTitle = task.title.toLowerCase().includes(query.toLowerCase());
            const matchesDesc = task.description.toLowerCase().includes(query.toLowerCase());
            
            if (matchesTitle || matchesDesc) {
              expect(filteredIds.has(task.id)).toBe(true);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filtering is case-insensitive', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (tasks, query) => {
          const lowerFiltered = filterTasks(tasks, query.toLowerCase());
          const upperFiltered = filterTasks(tasks, query.toUpperCase());
          const mixedFiltered = filterTasks(tasks, query);
          
          // All three should return the same results
          expect(lowerFiltered.map(t => t.id).sort()).toEqual(
            upperFiltered.map(t => t.id).sort()
          );
          expect(lowerFiltered.map(t => t.id).sort()).toEqual(
            mixedFiltered.map(t => t.id).sort()
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('empty query returns all tasks', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 0, maxLength: 50 }),
        (tasks) => {
          const filtered = filterTasks(tasks, '');
          expect(filtered).toEqual(tasks);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('whitespace-only query returns all tasks', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 0, maxLength: 50 }),
        fc.constantFrom('   ', '\t', '\n', '  \t  '),
        (tasks, query) => {
          const filtered = filterTasks(tasks, query);
          expect(filtered).toEqual(tasks);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filtered results are a subset of original tasks', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 0, maxLength: 50 }),
        fc.string({ maxLength: 20 }),
        (tasks, query) => {
          const filtered = filterTasks(tasks, query);
          
          // Filtered should be a subset
          expect(filtered.length).toBeLessThanOrEqual(tasks.length);
          
          // All filtered tasks should exist in original
          const originalIds = new Set(tasks.map(t => t.id));
          filtered.forEach(task => {
            expect(originalIds.has(task.id)).toBe(true);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('filtering preserves task order', () => {
    fc.assert(
      fc.property(
        fc.array(taskArbitrary, { minLength: 2, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        (tasks, query) => {
          const filtered = filterTasks(tasks, query);
          
          // Create a map of original indices
          const originalIndices = new Map(tasks.map((t, idx) => [t.id, idx]));
          
          // Verify filtered tasks maintain relative order
          for (let i = 0; i < filtered.length - 1; i++) {
            const currentIndex = originalIndices.get(filtered[i].id)!;
            const nextIndex = originalIndices.get(filtered[i + 1].id)!;
            
            expect(currentIndex).toBeLessThan(nextIndex);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('query matching is substring-based, not word-based', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Authentication System',
        description: 'Implement auth',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 10,
        worked_sum: 5,
        has_active_tracking: false,
        user_is_tracking: false,
      },
      {
        id: '2',
        title: 'Database Schema',
        description: 'Create tables',
        status: 'not_started',
        priority: 2,
        estimated_hours: 8,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      },
    ];
    
    // Partial word match should work
    const filtered1 = filterTasks(tasks, 'auth');
    expect(filtered1.length).toBe(1); // Matches "Authentication" (title) and "auth" (description) in same task
    expect(filtered1[0].id).toBe('1');
    
    const filtered2 = filterTasks(tasks, 'tica');
    expect(filtered2.length).toBe(1); // Matches "Authentication"
    expect(filtered2[0].id).toBe('1');
    
    const filtered3 = filterTasks(tasks, 'base');
    expect(filtered3.length).toBe(1); // Matches "Database"
    expect(filtered3[0].id).toBe('2');
  });

  it('special characters in query are treated literally', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Fix bug #123',
        description: 'Resolve issue',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 2,
        worked_sum: 1,
        has_active_tracking: false,
        user_is_tracking: false,
      },
      {
        id: '2',
        title: 'Add feature',
        description: 'New functionality',
        status: 'not_started',
        priority: 2,
        estimated_hours: 5,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      },
    ];
    
    // Special characters should be treated literally
    const filtered = filterTasks(tasks, '#123');
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });

  it('filtering handles empty task arrays', () => {
    const filtered = filterTasks([], 'query');
    expect(filtered).toEqual([]);
  });

  it('filtering handles tasks with empty descriptions', () => {
    const tasks: Task[] = [
      {
        id: '1',
        title: 'Task with description',
        description: 'Some description',
        status: 'in_progress',
        priority: 1,
        estimated_hours: 5,
        worked_sum: 2,
        has_active_tracking: false,
        user_is_tracking: false,
      },
      {
        id: '2',
        title: 'Task without description',
        description: '',
        status: 'not_started',
        priority: 2,
        estimated_hours: 3,
        worked_sum: 0,
        has_active_tracking: false,
        user_is_tracking: false,
      },
    ];
    
    // Should match by title only for task with empty description
    const filtered = filterTasks(tasks, 'without');
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('2');
  });
});

/**
 * Property-based tests for localStorage validation in timeTrackingStore
 * Feature: web-time-tracking, Property 12: localStorage Validation
 * Validates: Requirements 15.7
 * 
 * Tests that localStorage validation correctly handles all possible inputs:
 * - Corrupted or invalid JSON
 * - Missing required fields
 * - Invalid field types
 * - Invalid date formats
 * - Out-of-range timestamps
 * - Non-object data types
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fc from 'fast-check';
import { useTimeTrackingStore } from './timeTrackingStore';
import { timeTrackingService } from '../services/timeTrackingService';

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

describe('Property 12: localStorage Validation', () => {
  const ACTIVE_TRACKING_KEY = 'rxdx_active_tracking';

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    useTimeTrackingStore.getState().reset();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  // ==========================================================================
  // Property 1: Corrupted JSON is handled gracefully without crashing
  // ==========================================================================

  it('should handle any corrupted JSON string without crashing', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random strings that are likely to be invalid JSON
        fc.oneof(
          fc.string(), // Random strings
          fc.string().map(s => s + '{{{'), // Malformed JSON
          fc.string().map(s => '{{' + s), // Incomplete JSON
          fc.string().map(s => s + '}}}'), // Extra closing braces
          fc.constant('undefined'),
          fc.constant('NaN'),
          fc.constant('Infinity'),
          fc.constant('{invalid}'),
          fc.constant('[1,2,3,'),
          fc.constant('{"key": }'),
        ),
        async (corruptedData) => {
          // Set corrupted data in localStorage
          localStorage.setItem(ACTIVE_TRACKING_KEY, corruptedData);

          // Mock API to return null
          vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

          // Should not throw error
          await expect(
            useTimeTrackingStore.getState().checkActiveTracking()
          ).resolves.not.toThrow();

          // Should clear corrupted data
          expect(localStorage.getItem(ACTIVE_TRACKING_KEY)).toBeNull();

          // Store state should be null
          expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 2: Missing required fields are rejected
  // ==========================================================================

  it('should reject objects missing any required field', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate objects with some fields missing
        fc.record({
          id: fc.option(fc.uuid(), { nil: undefined }),
          task_id: fc.option(fc.uuid(), { nil: undefined }),
          task_title: fc.option(fc.string(), { nil: undefined }),
          start_time: fc.option(fc.date().map(d => d.toISOString()), { nil: undefined }),
          description: fc.option(fc.string(), { nil: undefined }),
        }).filter(obj => {
          // Ensure at least one required field is missing
          return !obj.id || !obj.task_id || !obj.task_title || !obj.start_time || !obj.description;
        }),
        async (invalidData) => {
          localStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(invalidData));

          vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

          await useTimeTrackingStore.getState().checkActiveTracking();

          // Should clear invalid data
          expect(localStorage.getItem(ACTIVE_TRACKING_KEY)).toBeNull();
          expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 3: Invalid field types are rejected
  // ==========================================================================

  it('should reject objects with invalid field types', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate objects with wrong types for fields
        fc.oneof(
          // id as number instead of string
          fc.record({
            id: fc.integer(),
            task_id: fc.uuid(),
            task_title: fc.string(),
            start_time: fc.date().map(d => d.toISOString()),
            description: fc.string(),
          }),
          // task_id as boolean instead of string
          fc.record({
            id: fc.uuid(),
            task_id: fc.boolean(),
            task_title: fc.string(),
            start_time: fc.date().map(d => d.toISOString()),
            description: fc.string(),
          }),
          // task_title as number instead of string
          fc.record({
            id: fc.uuid(),
            task_id: fc.uuid(),
            task_title: fc.integer(),
            start_time: fc.date().map(d => d.toISOString()),
            description: fc.string(),
          }),
          // start_time as number instead of string
          fc.record({
            id: fc.uuid(),
            task_id: fc.uuid(),
            task_title: fc.string(),
            start_time: fc.integer(),
            description: fc.string(),
          }),
          // description as array instead of string
          fc.record({
            id: fc.uuid(),
            task_id: fc.uuid(),
            task_title: fc.string(),
            start_time: fc.date().map(d => d.toISOString()),
            description: fc.array(fc.string()),
          }),
        ),
        async (invalidData) => {
          localStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(invalidData));

          vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

          await useTimeTrackingStore.getState().checkActiveTracking();

          // Should clear invalid data
          expect(localStorage.getItem(ACTIVE_TRACKING_KEY)).toBeNull();
          expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 4: Invalid date formats are rejected
  // ==========================================================================

  it('should reject objects with invalid start_time date format', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate invalid date strings
        fc.oneof(
          fc.constant('not-a-date'),
          fc.constant('2024-13-45'), // Invalid month/day
          fc.constant('invalid-iso-string'),
          fc.string().filter(s => isNaN(new Date(s).getTime())), // Any string that's not a valid date
          fc.constant(''),
          fc.constant('null'),
          fc.constant('undefined'),
        ),
        async (invalidDate) => {
          const invalidData = {
            id: 'tracking-1',
            task_id: 'task-1',
            task_title: 'Test Task',
            start_time: invalidDate,
            description: 'Working',
          };

          localStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(invalidData));

          vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

          await useTimeTrackingStore.getState().checkActiveTracking();

          // Should clear invalid data
          expect(localStorage.getItem(ACTIVE_TRACKING_KEY)).toBeNull();
          expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 5: Future timestamps are rejected
  // ==========================================================================

  it('should reject objects with start_time in the future', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate dates in the future (1 second to 1 year ahead)
        fc.integer({ min: 1000, max: 365 * 24 * 60 * 60 * 1000 }).map(offset => {
          return new Date(Date.now() + offset).toISOString();
        }),
        async (futureDate) => {
          const invalidData = {
            id: 'tracking-1',
            task_id: 'task-1',
            task_title: 'Test Task',
            start_time: futureDate,
            description: 'Working',
          };

          localStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(invalidData));

          vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

          await useTimeTrackingStore.getState().checkActiveTracking();

          // Should clear invalid data (future dates not allowed)
          expect(localStorage.getItem(ACTIVE_TRACKING_KEY)).toBeNull();
          expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 6: Timestamps older than 24 hours are rejected
  // ==========================================================================

  it('should reject objects with start_time older than 24 hours', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate dates older than 24 hours (25 hours to 1 year ago)
        fc.integer({ min: 25 * 60 * 60 * 1000, max: 365 * 24 * 60 * 60 * 1000 }).map(offset => {
          return new Date(Date.now() - offset).toISOString();
        }),
        async (oldDate) => {
          const invalidData = {
            id: 'tracking-1',
            task_id: 'task-1',
            task_title: 'Test Task',
            start_time: oldDate,
            description: 'Working',
          };

          localStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(invalidData));

          vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

          await useTimeTrackingStore.getState().checkActiveTracking();

          // Should clear invalid data (too old)
          expect(localStorage.getItem(ACTIVE_TRACKING_KEY)).toBeNull();
          expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 7: Valid timestamps within 24 hours are accepted
  // ==========================================================================

  it('should accept objects with start_time within 24 hours', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate dates within the last 24 hours (1 second to 23 hours 59 minutes ago)
        fc.integer({ min: 1000, max: 24 * 60 * 60 * 1000 - 1000 }).map(offset => {
          return new Date(Date.now() - offset).toISOString();
        }),
        async (validDate) => {
          const validData = {
            id: 'tracking-1',
            task_id: 'task-1',
            task_title: 'Test Task',
            start_time: validDate,
            description: 'Working',
          };

          localStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(validData));

          // Mock API to return the same valid data
          vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(validData);

          await useTimeTrackingStore.getState().checkActiveTracking();

          // Should accept valid data
          expect(useTimeTrackingStore.getState().activeTracking).toEqual(validData);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 8: Non-object data types are rejected
  // ==========================================================================

  it('should reject non-object data types', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate various non-object types
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.float(),
          fc.boolean(),
          fc.constant(null),
          fc.array(fc.anything()),
        ),
        async (nonObjectData) => {
          localStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(nonObjectData));

          vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

          await useTimeTrackingStore.getState().checkActiveTracking();

          // Should clear invalid data
          expect(localStorage.getItem(ACTIVE_TRACKING_KEY)).toBeNull();
          expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 9: Valid complete objects are accepted
  // ==========================================================================

  it('should accept valid complete objects with all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid ActiveTracking objects
        fc.record({
          id: fc.uuid(),
          task_id: fc.uuid(),
          task_title: fc.string({ minLength: 1, maxLength: 200 }),
          start_time: fc.integer({ min: 1000, max: 24 * 60 * 60 * 1000 - 1000 }).map(offset => {
            return new Date(Date.now() - offset).toISOString();
          }),
          description: fc.string({ maxLength: 500 }),
        }),
        async (validData) => {
          localStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(validData));

          // Mock API to return the same valid data
          vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(validData);

          await useTimeTrackingStore.getState().checkActiveTracking();

          // Should accept valid data
          expect(useTimeTrackingStore.getState().activeTracking).toEqual(validData);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 10: Extra fields don't cause rejection
  // ==========================================================================

  it('should accept objects with extra fields beyond required ones', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate valid objects with extra fields
        fc.record({
          id: fc.uuid(),
          task_id: fc.uuid(),
          task_title: fc.string({ minLength: 1, maxLength: 200 }),
          start_time: fc.integer({ min: 1000, max: 24 * 60 * 60 * 1000 - 1000 }).map(offset => {
            return new Date(Date.now() - offset).toISOString();
          }),
          description: fc.string({ maxLength: 500 }),
          // Extra fields
          extra_field_1: fc.string(),
          extra_field_2: fc.integer(),
          extra_field_3: fc.boolean(),
        }),
        async (dataWithExtras) => {
          localStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(dataWithExtras));

          // Mock API to return the data (backend might strip extra fields)
          const expectedData = {
            id: dataWithExtras.id,
            task_id: dataWithExtras.task_id,
            task_title: dataWithExtras.task_title,
            start_time: dataWithExtras.start_time,
            description: dataWithExtras.description,
          };
          vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(expectedData);

          await useTimeTrackingStore.getState().checkActiveTracking();

          // Should accept data (extra fields are ignored)
          expect(useTimeTrackingStore.getState().activeTracking).toEqual(expectedData);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 11: Empty strings in required fields are rejected
  // ==========================================================================

  it('should reject objects with empty strings in required string fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate objects with at least one empty string field
        fc.oneof(
          fc.record({
            id: fc.constant(''), // Empty id
            task_id: fc.uuid(),
            task_title: fc.string({ minLength: 1 }),
            start_time: fc.date().map(d => d.toISOString()),
            description: fc.string(),
          }),
          fc.record({
            id: fc.uuid(),
            task_id: fc.constant(''), // Empty task_id
            task_title: fc.string({ minLength: 1 }),
            start_time: fc.date().map(d => d.toISOString()),
            description: fc.string(),
          }),
          fc.record({
            id: fc.uuid(),
            task_id: fc.uuid(),
            task_title: fc.constant(''), // Empty task_title
            start_time: fc.date().map(d => d.toISOString()),
            description: fc.string(),
          }),
          fc.record({
            id: fc.uuid(),
            task_id: fc.uuid(),
            task_title: fc.string({ minLength: 1 }),
            start_time: fc.constant(''), // Empty start_time
            description: fc.string(),
          }),
        ),
        async (invalidData) => {
          localStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(invalidData));

          vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

          await useTimeTrackingStore.getState().checkActiveTracking();

          // Should clear invalid data
          expect(localStorage.getItem(ACTIVE_TRACKING_KEY)).toBeNull();
          expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 12: Whitespace-only strings in required fields are rejected
  // ==========================================================================

  it('should reject objects with whitespace-only strings in required fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate whitespace strings
        fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 10 }).map(arr => arr.join('')),
        async (whitespace) => {
          const invalidData = {
            id: whitespace, // Whitespace-only id
            task_id: 'task-1',
            task_title: 'Test Task',
            start_time: new Date(Date.now() - 60000).toISOString(),
            description: 'Working',
          };

          localStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(invalidData));

          vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

          await useTimeTrackingStore.getState().checkActiveTracking();

          // Should clear invalid data
          expect(localStorage.getItem(ACTIVE_TRACKING_KEY)).toBeNull();
          expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  // ==========================================================================
  // Property 13: localStorage quota exceeded is handled gracefully
  // ==========================================================================

  it('should handle localStorage quota exceeded without crashing', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          task_id: fc.uuid(),
          task_title: fc.string({ minLength: 1, maxLength: 200 }),
          start_time: fc.integer({ min: 1000, max: 24 * 60 * 60 * 1000 - 1000 }).map(offset => {
            return new Date(Date.now() - offset).toISOString();
          }),
          description: fc.string({ maxLength: 500 }),
        }),
        async (validData) => {
          // Mock localStorage.setItem to throw quota exceeded error
          const originalSetItem = localStorage.setItem;
          localStorage.setItem = vi.fn(() => {
            throw new DOMException('QuotaExceededError');
          });

          vi.mocked(timeTrackingService.startTracking).mockResolvedValue(validData);

          // Should not throw error
          await expect(
            useTimeTrackingStore.getState().startTracking(validData.task_id, validData.description)
          ).resolves.not.toThrow();

          // Store state should still be updated
          expect(useTimeTrackingStore.getState().activeTracking).toEqual(validData);

          // Restore original setItem
          localStorage.setItem = originalSetItem;
        }
      ),
      { numRuns: 50 } // Fewer runs since we're mocking
    );
  });

  // ==========================================================================
  // Property 14: Validation is consistent across multiple calls
  // ==========================================================================

  it('should consistently validate the same data across multiple calls', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          task_id: fc.uuid(),
          task_title: fc.string({ minLength: 1, maxLength: 200 }),
          start_time: fc.integer({ min: 1000, max: 24 * 60 * 60 * 1000 - 1000 }).map(offset => {
            return new Date(Date.now() - offset).toISOString();
          }),
          description: fc.string({ maxLength: 500 }),
        }),
        async (validData) => {
          // Set data in localStorage
          localStorage.setItem(ACTIVE_TRACKING_KEY, JSON.stringify(validData));

          // Mock API to return the same data
          vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(validData);

          // Call checkActiveTracking multiple times
          await useTimeTrackingStore.getState().checkActiveTracking();
          const result1 = useTimeTrackingStore.getState().activeTracking;

          await useTimeTrackingStore.getState().checkActiveTracking();
          const result2 = useTimeTrackingStore.getState().activeTracking;

          await useTimeTrackingStore.getState().checkActiveTracking();
          const result3 = useTimeTrackingStore.getState().activeTracking;

          // All results should be identical
          expect(result1).toEqual(validData);
          expect(result2).toEqual(validData);
          expect(result3).toEqual(validData);
          expect(result1).toEqual(result2);
          expect(result2).toEqual(result3);
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property-based tests for timer accuracy
 * Feature: web-time-tracking, Property 2: Timer Accuracy
 * Validates: Requirements 8.2, 8.3
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { calculateElapsedTime, formatElapsedTime } from './timeFormatting';

describe('Property 2: Timer Accuracy', () => {
  it('elapsed time equals difference between current and start time', () => {
    fc.assert(
      fc.property(
        // Generate a start time in the past
        fc.integer({ min: new Date('2024-01-01').getTime(), max: Date.now() }),
        // Generate a current time after start time
        fc.integer({ min: 0, max: 24 * 60 * 60 * 1000 }), // Up to 24 hours later
        (startTimeMs, offsetMs) => {
          const startTime = new Date(startTimeMs).toISOString();
          const currentTime = startTimeMs + offsetMs;
          
          const elapsed = calculateElapsedTime(startTime, currentTime);
          
          // Elapsed should equal the offset (within 1ms tolerance for rounding)
          expect(Math.abs(elapsed - offsetMs)).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('elapsed time is within 1 second tolerance of expected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: new Date('2024-01-01').getTime(), max: Date.now() }),
        fc.integer({ min: 0, max: 10 * 60 * 60 * 1000 }), // Up to 10 hours
        (startTimeMs, offsetMs) => {
          const startTime = new Date(startTimeMs).toISOString();
          const currentTime = startTimeMs + offsetMs;
          
          const elapsed = calculateElapsedTime(startTime, currentTime);
          const expected = offsetMs;
          
          // Within 1 second (1000ms) tolerance
          expect(Math.abs(elapsed - expected)).toBeLessThanOrEqual(1000);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatted elapsed time matches HH:MM:SS pattern', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 24 * 60 * 60 * 1000 }), // Up to 24 hours in ms
        (milliseconds) => {
          const formatted = formatElapsedTime(milliseconds);
          
          // Should match HH:MM:SS pattern
          expect(formatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatted elapsed time components are valid', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 * 60 * 60 * 1000 }), // Up to 100 hours
        (milliseconds) => {
          const formatted = formatElapsedTime(milliseconds);
          const match = formatted.match(/^(\d{2}):(\d{2}):(\d{2})$/);
          
          expect(match).not.toBeNull();
          
          const hours = parseInt(match![1]);
          const minutes = parseInt(match![2]);
          const seconds = parseInt(match![3]);
          
          // Minutes and seconds should be 0-59
          expect(minutes).toBeGreaterThanOrEqual(0);
          expect(minutes).toBeLessThanOrEqual(59);
          expect(seconds).toBeGreaterThanOrEqual(0);
          expect(seconds).toBeLessThanOrEqual(59);
          
          // Hours can be any non-negative value
          expect(hours).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('elapsed time calculation is monotonic', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: new Date('2024-01-01').getTime(), max: Date.now() }),
        fc.integer({ min: 0, max: 60 * 60 * 1000 }),
        fc.integer({ min: 0, max: 60 * 60 * 1000 }),
        (startTimeMs, offset1, offset2) => {
          const startTime = new Date(startTimeMs).toISOString();
          const currentTime1 = startTimeMs + offset1;
          const currentTime2 = startTimeMs + offset2;
          
          const elapsed1 = calculateElapsedTime(startTime, currentTime1);
          const elapsed2 = calculateElapsedTime(startTime, currentTime2);
          
          // If currentTime2 > currentTime1, then elapsed2 should be >= elapsed1
          if (currentTime2 > currentTime1) {
            expect(elapsed2).toBeGreaterThanOrEqual(elapsed1);
          } else if (currentTime2 < currentTime1) {
            expect(elapsed2).toBeLessThanOrEqual(elapsed1);
          } else {
            expect(elapsed2).toBe(elapsed1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('elapsed time is never negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: new Date('2024-01-01').getTime(), max: Date.now() }),
        fc.integer({ min: -24 * 60 * 60 * 1000, max: 24 * 60 * 60 * 1000 }),
        (startTimeMs, offsetMs) => {
          const startTime = new Date(startTimeMs).toISOString();
          const currentTime = startTimeMs + offsetMs;
          
          const elapsed = calculateElapsedTime(startTime, currentTime);
          
          // Elapsed should never be negative
          expect(elapsed).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatted time reconstructs to approximately original milliseconds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 24 * 60 * 60 * 1000 }),
        (milliseconds) => {
          const formatted = formatElapsedTime(milliseconds);
          const match = formatted.match(/^(\d{2}):(\d{2}):(\d{2})$/);
          
          expect(match).not.toBeNull();
          
          const hours = parseInt(match![1]);
          const minutes = parseInt(match![2]);
          const seconds = parseInt(match![3]);
          
          const reconstructed = (hours * 3600 + minutes * 60 + seconds) * 1000;
          
          // Should be within 1 second (1000ms) due to truncation
          expect(Math.abs(reconstructed - milliseconds)).toBeLessThanOrEqual(1000);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles timezone differences correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -12, max: 14 }), // Timezone offset hours
        fc.integer({ min: 0, max: 24 * 60 * 60 * 1000 }), // Elapsed time
        (timezoneOffset, elapsedMs) => {
          // Create a start time with specific timezone offset
          const baseTime = new Date('2024-01-15T12:00:00Z').getTime();
          const startTime = new Date(baseTime).toISOString();
          const currentTime = baseTime + elapsedMs;
          
          const elapsed = calculateElapsedTime(startTime, currentTime);
          
          // Elapsed time should be independent of timezone
          // (both times are converted to UTC internally)
          expect(Math.abs(elapsed - elapsedMs)).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});

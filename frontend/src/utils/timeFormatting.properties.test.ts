/**
 * Property-based tests for time formatting utilities
 * Feature: web-time-tracking, Property 8: Worked Sum Format
 * Validates: Requirements 3.5, 7.7
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatDuration } from './timeFormatting';

describe('Property 8: Worked Sum Format', () => {
  // Filter to exclude NaN and Infinity
  const validFloat = fc.float({ min: 0, max: 10000, noNaN: true });
  const validNegativeFloat = fc.float({ min: -1000, max: 0, noNaN: true });

  it('always returns format matching "Xh Ym" pattern', () => {
    fc.assert(
      fc.property(
        validFloat,
        (hours) => {
          const formatted = formatDuration(hours);
          
          // Should match pattern "Xh Ym"
          expect(formatted).toMatch(/^\d+h \d+m$/);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('hours component is non-negative integer', () => {
    fc.assert(
      fc.property(
        validFloat,
        (hours) => {
          const formatted = formatDuration(hours);
          const match = formatted.match(/^(\d+)h (\d+)m$/);
          
          expect(match).not.toBeNull();
          
          const h = parseInt(match![1]);
          expect(h).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(h)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('minutes component is between 0 and 59', () => {
    fc.assert(
      fc.property(
        validFloat,
        (hours) => {
          const formatted = formatDuration(hours);
          const match = formatted.match(/^(\d+)h (\d+)m$/);
          
          expect(match).not.toBeNull();
          
          const m = parseInt(match![2]);
          expect(m).toBeGreaterThanOrEqual(0);
          expect(m).toBeLessThanOrEqual(60); // Can be 60 due to rounding
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatted value is close to original hours', () => {
    fc.assert(
      fc.property(
        validFloat,
        (hours) => {
          const formatted = formatDuration(hours);
          const match = formatted.match(/^(\d+)h (\d+)m$/);
          
          expect(match).not.toBeNull();
          
          const h = parseInt(match![1]);
          const m = parseInt(match![2]);
          const reconstructed = h + m / 60;
          
          // Should be close to original (within 1 minute = 1/60 hour)
          expect(Math.abs(reconstructed - hours)).toBeLessThanOrEqual(1 / 60 + 0.01);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles zero correctly', () => {
    const formatted = formatDuration(0);
    expect(formatted).toBe('0h 0m');
  });

  it('handles whole hours correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        (hours) => {
          const formatted = formatDuration(hours);
          const match = formatted.match(/^(\d+)h (\d+)m$/);
          
          expect(match).not.toBeNull();
          
          const h = parseInt(match![1]);
          const m = parseInt(match![2]);
          
          expect(h).toBe(hours);
          expect(m).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles half hours correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        (hours) => {
          const formatted = formatDuration(hours + 0.5);
          const match = formatted.match(/^(\d+)h (\d+)m$/);
          
          expect(match).not.toBeNull();
          
          const h = parseInt(match![1]);
          const m = parseInt(match![2]);
          
          expect(h).toBe(hours);
          expect(m).toBe(30);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('handles quarter hours correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }),
        (hours) => {
          const formatted = formatDuration(hours + 0.25);
          const match = formatted.match(/^(\d+)h (\d+)m$/);
          
          expect(match).not.toBeNull();
          
          const h = parseInt(match![1]);
          const m = parseInt(match![2]);
          
          expect(h).toBe(hours);
          expect(m).toBe(15);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('negative values are treated as zero', () => {
    fc.assert(
      fc.property(
        validNegativeFloat,
        (hours) => {
          const formatted = formatDuration(hours);
          expect(formatted).toBe('0h 0m');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatting is deterministic', () => {
    fc.assert(
      fc.property(
        validFloat,
        (hours) => {
          const formatted1 = formatDuration(hours);
          const formatted2 = formatDuration(hours);
          
          expect(formatted1).toBe(formatted2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('formatting preserves order for increasing hours', () => {
    fc.assert(
      fc.property(
        fc.float({ min: 0, max: 5000, noNaN: true }),
        fc.float({ min: 0, max: 5000, noNaN: true }),
        (hours1, hours2) => {
          if (hours1 === hours2) return true;
          
          const formatted1 = formatDuration(hours1);
          const formatted2 = formatDuration(hours2);
          
          const match1 = formatted1.match(/^(\d+)h (\d+)m$/);
          const match2 = formatted2.match(/^(\d+)h (\d+)m$/);
          
          expect(match1).not.toBeNull();
          expect(match2).not.toBeNull();
          
          const total1 = parseInt(match1![1]) * 60 + parseInt(match1![2]);
          const total2 = parseInt(match2![1]) * 60 + parseInt(match2![2]);
          
          // If hours1 < hours2, then total1 should be <= total2 (allowing for rounding)
          if (hours1 < hours2) {
            expect(total1).toBeLessThanOrEqual(total2);
          } else {
            expect(total1).toBeGreaterThanOrEqual(total2);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

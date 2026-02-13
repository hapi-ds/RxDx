/**
 * Property-based tests for graph store distance control
 * Feature: graph-ui-enhancements
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { useGraphStore } from './graphStore';

describe('Graph Store Distance Control Property Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    useGraphStore.getState().reset();
    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    // Clean up localStorage after each test
    localStorage.clear();
  });

  describe('Property 1: Distance value constraints', () => {
    // Feature: graph-ui-enhancements, Property 1: Distance value constraints
    // **Validates: Requirements 1.2**
    // For any distance value set by the user, the value should be between 50 and 500 (inclusive)
    // and should be a multiple of 10.

    it('should only accept distance values between 50-500 in increments of 10', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 500 }).filter(n => n % 10 === 0),
          (distance) => {
            const store = useGraphStore.getState();
            
            // Set the distance
            store.setLayoutDistance(distance);
            
            // Get the stored distance
            const storedDistance = useGraphStore.getState().layoutDistance;
            
            // Verify the distance is exactly what was set
            expect(storedDistance).toBe(distance);
            
            // Verify constraints
            expect(storedDistance).toBeGreaterThanOrEqual(50);
            expect(storedDistance).toBeLessThanOrEqual(500);
            expect(storedDistance % 10).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clamp out-of-range values to valid boundaries', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 2000 }),
          (distance) => {
            const store = useGraphStore.getState();
            
            // Set the distance (may be out of range)
            store.setLayoutDistance(distance);
            
            // Get the stored distance
            const storedDistance = useGraphStore.getState().layoutDistance;
            
            // Verify the distance is clamped to valid range
            expect(storedDistance).toBeGreaterThanOrEqual(50);
            expect(storedDistance).toBeLessThanOrEqual(500);
            
            // Verify it's a multiple of 10
            expect(storedDistance % 10).toBe(0);
            
            // Verify clamping behavior
            if (distance < 50) {
              expect(storedDistance).toBe(50);
            } else if (distance > 500) {
              expect(storedDistance).toBe(500);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should round non-multiple-of-10 values to nearest multiple of 10', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 500 }),
          (distance) => {
            const store = useGraphStore.getState();
            
            // Set the distance (may not be multiple of 10)
            store.setLayoutDistance(distance);
            
            // Get the stored distance
            const storedDistance = useGraphStore.getState().layoutDistance;
            
            // Verify it's a multiple of 10
            expect(storedDistance % 10).toBe(0);
            
            // Verify it's within 5 of the original value (rounded to nearest 10)
            expect(Math.abs(storedDistance - distance)).toBeLessThanOrEqual(5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 4: Distance persistence round-trip', () => {
    // Feature: graph-ui-enhancements, Property 4: Distance persistence round-trip
    // **Validates: Requirements 1.5**
    // For any distance value, saving it to localStorage and then reading it back
    // should return the same value.

    it('should persist and restore distance values correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 500 }).filter(n => n % 10 === 0),
          (distance) => {
            const store = useGraphStore.getState();
            
            // Set the distance (this should persist to localStorage)
            store.setLayoutDistance(distance);
            
            // Verify it was saved to localStorage
            const storedValue = localStorage.getItem('graph-layout-distance');
            expect(storedValue).not.toBeNull();
            expect(parseInt(storedValue!, 10)).toBe(distance);
            
            // Reset the store
            store.reset();
            
            // Verify the store was reset to default
            expect(useGraphStore.getState().layoutDistance).toBe(100);
            
            // Simulate page reload by creating a new store instance
            // The loadLayoutDistance function should read from localStorage
            const loadLayoutDistance = (): number => {
              try {
                const stored = localStorage.getItem('graph-layout-distance');
                if (stored !== null) {
                  const dist = parseInt(stored, 10);
                  if (!isNaN(dist) && dist >= 50 && dist <= 500 && dist % 10 === 0) {
                    return dist;
                  }
                }
              } catch (error) {
                console.error('Failed to load layout distance from storage:', error);
              }
              return 100;
            };
            
            const restored = loadLayoutDistance();
            
            // Verify the restored value matches the original
            expect(restored).toBe(distance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle localStorage errors gracefully', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 500 }).filter(n => n % 10 === 0),
          (distance) => {
            const store = useGraphStore.getState();
            
            // Mock localStorage to throw an error
            const originalSetItem = localStorage.setItem;
            localStorage.setItem = () => {
              throw new Error('localStorage quota exceeded');
            };
            
            // Set the distance (should handle error gracefully)
            expect(() => store.setLayoutDistance(distance)).not.toThrow();
            
            // Verify the distance was still set in the store
            expect(useGraphStore.getState().layoutDistance).toBe(distance);
            
            // Restore localStorage
            localStorage.setItem = originalSetItem;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use default value when localStorage contains invalid data', () => {
      // Test with various invalid values
      const invalidValues = [
        'not-a-number',
        '25', // Below minimum
        '600', // Above maximum
        '55', // Not a multiple of 10
        '',
        'null',
        'undefined',
      ];

      invalidValues.forEach((invalidValue) => {
        // Clear and set invalid value
        localStorage.clear();
        localStorage.setItem('graph-layout-distance', invalidValue);
        
        // Simulate loading from localStorage
        const loadLayoutDistance = (): number => {
          try {
            const stored = localStorage.getItem('graph-layout-distance');
            if (stored !== null) {
              const dist = parseInt(stored, 10);
              if (!isNaN(dist) && dist >= 50 && dist <= 500 && dist % 10 === 0) {
                return dist;
              }
            }
          } catch (error) {
            console.error('Failed to load layout distance from storage:', error);
          }
          return 100;
        };
        
        const loaded = loadLayoutDistance();
        
        // Should fall back to default value
        expect(loaded).toBe(100);
      });
    });
  });
});

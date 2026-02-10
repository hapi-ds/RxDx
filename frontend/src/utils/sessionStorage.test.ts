/**
 * Property-based tests for session storage utilities
 * 
 * Feature: graph-table-ui-enhancements
 * Property 4: Session Filter Persistence Round Trip
 * Validates: Requirements 3.5, 8.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  saveFilterState,
  loadFilterState,
  clearFilterState,
  clearPageFilterState,
} from './sessionStorage';

describe('Session Storage Utilities', () => {
  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    sessionStorage.clear();
  });

  describe('Unit Tests', () => {
    it('saves and loads filter state for table page', () => {
      const filterState = new Set(['requirement', 'task', 'test']);
      saveFilterState('table', filterState);

      const loaded = loadFilterState('table');
      expect(loaded).not.toBeNull();
      expect(loaded?.size).toBe(3);
      expect(loaded?.has('requirement')).toBe(true);
      expect(loaded?.has('task')).toBe(true);
      expect(loaded?.has('test')).toBe(true);
    });

    it('saves and loads filter state for graph page', () => {
      const filterState = new Set(['Project', 'Phase', 'Workpackage']);
      saveFilterState('graph', filterState);

      const loaded = loadFilterState('graph');
      expect(loaded).not.toBeNull();
      expect(loaded?.size).toBe(3);
      expect(loaded?.has('Project')).toBe(true);
      expect(loaded?.has('Phase')).toBe(true);
      expect(loaded?.has('Workpackage')).toBe(true);
    });

    it('returns null when no filter state exists', () => {
      const loaded = loadFilterState('table');
      expect(loaded).toBeNull();
    });

    it('maintains separate state for table and graph pages', () => {
      const tableState = new Set(['requirement', 'task']);
      const graphState = new Set(['Project', 'Phase']);

      saveFilterState('table', tableState);
      saveFilterState('graph', graphState);

      const loadedTable = loadFilterState('table');
      const loadedGraph = loadFilterState('graph');

      expect(loadedTable?.size).toBe(2);
      expect(loadedTable?.has('requirement')).toBe(true);
      expect(loadedTable?.has('task')).toBe(true);

      expect(loadedGraph?.size).toBe(2);
      expect(loadedGraph?.has('Project')).toBe(true);
      expect(loadedGraph?.has('Phase')).toBe(true);
    });

    it('handles empty filter state', () => {
      const emptyState = new Set<string>();
      saveFilterState('table', emptyState);

      const loaded = loadFilterState('table');
      // Empty state is saved but returns null when loaded (no filters = no state)
      expect(loaded).toBeNull();
    });

    it('clears all filter state', () => {
      saveFilterState('table', new Set(['requirement']));
      saveFilterState('graph', new Set(['Project']));

      clearFilterState();

      expect(loadFilterState('table')).toBeNull();
      expect(loadFilterState('graph')).toBeNull();
    });

    it('clears filter state for specific page', () => {
      saveFilterState('table', new Set(['requirement']));
      saveFilterState('graph', new Set(['Project']));

      clearPageFilterState('table');

      const loadedTable = loadFilterState('table');
      const loadedGraph = loadFilterState('graph');

      // Cleared page returns null (empty array)
      expect(loadedTable).toBeNull();
      expect(loadedGraph?.size).toBe(1);
    });

    it('handles corrupted session storage gracefully', () => {
      // Manually corrupt the storage
      sessionStorage.setItem('rxdx_node_filters', 'invalid json');

      const loaded = loadFilterState('table');
      expect(loaded).toBeNull();
    });

    it('handles invalid structure gracefully', () => {
      // Save invalid structure
      sessionStorage.setItem('rxdx_node_filters', JSON.stringify({ invalid: 'structure' }));

      const loaded = loadFilterState('table');
      expect(loaded).toBeNull();
    });

    it('overwrites existing filter state', () => {
      saveFilterState('table', new Set(['requirement', 'task']));
      saveFilterState('table', new Set(['test', 'risk']));

      const loaded = loadFilterState('table');
      expect(loaded?.size).toBe(2);
      expect(loaded?.has('test')).toBe(true);
      expect(loaded?.has('risk')).toBe(true);
      expect(loaded?.has('requirement')).toBe(false);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 4: Session Filter Persistence Round Trip
     * 
     * For any set of filter state strings, saving and then loading
     * should return the exact same set.
     * 
     * Validates: Requirements 3.5, 8.2
     */
    it('Feature: graph-table-ui-enhancements, Property 4: Session filter persistence round trip', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary sets of strings
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 20 }),
          fc.constantFrom('table' as const, 'graph' as const),
          (filterArray, page) => {
            // Convert array to Set to ensure uniqueness
            const filterState = new Set(filterArray);

            // Save the filter state
            saveFilterState(page, filterState);

            // Load the filter state
            const restored = loadFilterState(page);

            // Verify round trip
            if (filterState.size === 0) {
              // Empty sets should be restored as null (no filters = no state)
              return restored === null;
            } else {
              // Non-empty sets should be restored exactly
              return (
                restored !== null &&
                restored.size === filterState.size &&
                Array.from(filterState).every(item => restored.has(item)) &&
                Array.from(restored).every(item => filterState.has(item))
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Filter state independence
     * 
     * Saving filter state for one page should not affect the other page.
     */
    it('maintains independence between table and graph filter states', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
          (tableArray, graphArray) => {
            const tableState = new Set(tableArray);
            const graphState = new Set(graphArray);

            // Save both states
            saveFilterState('table', tableState);
            saveFilterState('graph', graphState);

            // Load both states
            const loadedTable = loadFilterState('table');
            const loadedGraph = loadFilterState('graph');

            // Verify independence (both should have non-empty data)
            const tableMatches =
              loadedTable !== null &&
              loadedTable.size === tableState.size &&
              Array.from(tableState).every(item => loadedTable.has(item));

            const graphMatches =
              loadedGraph !== null &&
              loadedGraph.size === graphState.size &&
              Array.from(graphState).every(item => loadedGraph.has(item));

            return tableMatches && graphMatches;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Idempotent save
     * 
     * Saving the same filter state multiple times should produce
     * the same result as saving it once.
     */
    it('saving filter state is idempotent', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 20 }),
          fc.constantFrom('table' as const, 'graph' as const),
          (filterArray, page) => {
            const filterState = new Set(filterArray);

            // Save once
            saveFilterState(page, filterState);
            const firstLoad = loadFilterState(page);

            // Save again with same data
            saveFilterState(page, filterState);
            const secondLoad = loadFilterState(page);

            // Both loads should be identical
            if (firstLoad === null || secondLoad === null) {
              return firstLoad === secondLoad;
            }

            return (
              firstLoad.size === secondLoad.size &&
              Array.from(firstLoad).every(item => secondLoad.has(item))
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Clear is complete
     * 
     * After clearing filter state, loading should return null or empty.
     */
    it('clearing filter state removes all data', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
          fc.constantFrom('table' as const, 'graph' as const),
          (filterArray, page) => {
            const filterState = new Set(filterArray);

            // Save state
            saveFilterState(page, filterState);

            // Clear all
            clearFilterState();

            // Load should return null
            const loaded = loadFilterState(page);
            return loaded === null;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Page-specific clear
     * 
     * Clearing one page's filter state should not affect the other page.
     */
    it('page-specific clear does not affect other page', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 20 }),
          (tableArray, graphArray) => {
            const tableState = new Set(tableArray);
            const graphState = new Set(graphArray);

            // Save both
            saveFilterState('table', tableState);
            saveFilterState('graph', graphState);

            // Clear only table
            clearPageFilterState('table');

            // Table should be null (cleared), graph should be unchanged
            const loadedTable = loadFilterState('table');
            const loadedGraph = loadFilterState('graph');

            const tableCleared = loadedTable === null;
            const graphUnchanged =
              loadedGraph !== null &&
              loadedGraph.size === graphState.size &&
              Array.from(graphState).every(item => loadedGraph.has(item));

            return tableCleared && graphUnchanged;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Handles special characters
     * 
     * Filter state with special characters should round-trip correctly.
     */
    it('handles special characters in filter values', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({
              minLength: 1,
              maxLength: 50,
            }),
            { minLength: 1, maxLength: 20 }
          ),
          fc.constantFrom('table' as const, 'graph' as const),
          (filterArray, page) => {
            const filterState = new Set(filterArray);

            saveFilterState(page, filterState);
            const restored = loadFilterState(page);

            // Non-empty sets should be restored exactly
            return (
              restored !== null &&
              restored.size === filterState.size &&
              Array.from(filterState).every(item => restored.has(item))
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

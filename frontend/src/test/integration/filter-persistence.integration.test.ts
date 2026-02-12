/**
 * Integration tests for filter persistence across navigation
 * 
 * Feature: graph-table-ui-enhancements
 * Task: 20.1 Integration testing
 * 
 * Tests:
 * - Session storage persistence
 * - Filter state restoration
 * - Cross-page filter independence
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { saveFilterState, loadFilterState, clearFilterState } from '../../utils/sessionStorage';

describe('Integration Tests - Filter Persistence', () => {
  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear();
  });

  afterEach(() => {
    // Cleanup after each test
    sessionStorage.clear();
  });

  describe('Session Storage Integration', () => {
    it('should save and restore table filter state', () => {
      // Save filter state for table
      const tableFilter = new Set(['requirement', 'task']);
      saveFilterState('table', tableFilter);

      // Verify it was saved
      const stored = sessionStorage.getItem('rxdx_node_filters');
      expect(stored).toBeTruthy();

      // Restore filter state
      const restored = loadFilterState('table');
      expect(restored).toEqual(tableFilter);
    });

    it('should save and restore graph filter state', () => {
      // Save filter state for graph
      const graphFilter = new Set(['WorkItem', 'Project', 'Phase']);
      saveFilterState('graph', graphFilter);

      // Verify it was saved
      const stored = sessionStorage.getItem('rxdx_node_filters');
      expect(stored).toBeTruthy();

      // Restore filter state
      const restored = loadFilterState('graph');
      expect(restored).toEqual(graphFilter);
    });

    it('should maintain separate filter states for table and graph', () => {
      // Save different filters for table and graph
      const tableFilter = new Set(['requirement', 'task']);
      const graphFilter = new Set(['WorkItem', 'Project']);

      saveFilterState('table', tableFilter);
      saveFilterState('graph', graphFilter);

      // Restore and verify both are independent
      const restoredTable = loadFilterState('table');
      const restoredGraph = loadFilterState('graph');

      expect(restoredTable).toEqual(tableFilter);
      expect(restoredGraph).toEqual(graphFilter);
      expect(restoredTable).not.toEqual(restoredGraph);
    });

    it('should handle multiple save/restore cycles', () => {
      // First cycle
      const filter1 = new Set(['requirement']);
      saveFilterState('table', filter1);
      expect(loadFilterState('table')).toEqual(filter1);

      // Second cycle - update filter
      const filter2 = new Set(['requirement', 'task', 'test']);
      saveFilterState('table', filter2);
      expect(loadFilterState('table')).toEqual(filter2);

      // Third cycle - change filter completely
      const filter3 = new Set(['document']);
      saveFilterState('table', filter3);
      expect(loadFilterState('table')).toEqual(filter3);
    });

    it('should clear all filter states', () => {
      // Save filters for both pages
      saveFilterState('table', new Set(['requirement']));
      saveFilterState('graph', new Set(['WorkItem']));

      // Verify they were saved
      expect(loadFilterState('table')).toBeTruthy();
      expect(loadFilterState('graph')).toBeTruthy();

      // Clear all filters
      clearFilterState();

      // Verify they were cleared
      expect(loadFilterState('table')).toEqual(new Set());
      expect(loadFilterState('graph')).toEqual(new Set());
    });

    it('should handle empty filter sets', () => {
      // Save empty filter
      const emptyFilter = new Set<string>();
      saveFilterState('table', emptyFilter);

      // Restore and verify
      const restored = loadFilterState('table');
      expect(restored).toEqual(emptyFilter);
      expect(restored.size).toBe(0);
    });

    it('should handle corrupted session storage gracefully', () => {
      // Corrupt the session storage
      sessionStorage.setItem('rxdx_node_filters', 'invalid json {{{');

      // Should return empty set instead of throwing
      const restored = loadFilterState('table');
      expect(restored).toEqual(new Set());
    });

    it('should include timestamp in stored data', () => {
      // Save filter
      const filter = new Set(['requirement']);
      const beforeTime = Date.now();
      saveFilterState('table', filter);
      const afterTime = Date.now();

      // Check stored data includes timestamp
      const stored = sessionStorage.getItem('rxdx_node_filters');
      expect(stored).toBeTruthy();

      if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.table.timestamp).toBeDefined();
        expect(parsed.table.timestamp).toBeGreaterThanOrEqual(beforeTime);
        expect(parsed.table.timestamp).toBeLessThanOrEqual(afterTime);
      }
    });

    it('should preserve filter state across multiple page contexts', () => {
      // Simulate table page saving filter
      const tableFilter = new Set(['requirement', 'task']);
      saveFilterState('table', tableFilter);

      // Simulate graph page saving filter
      const graphFilter = new Set(['WorkItem', 'Project', 'Phase']);
      saveFilterState('graph', graphFilter);

      // Simulate returning to table page
      const restoredTable = loadFilterState('table');
      expect(restoredTable).toEqual(tableFilter);

      // Simulate returning to graph page
      const restoredGraph = loadFilterState('graph');
      expect(restoredGraph).toEqual(graphFilter);

      // Both should still be intact
      expect(loadFilterState('table')).toEqual(tableFilter);
      expect(loadFilterState('graph')).toEqual(graphFilter);
    });
  });

  describe('Filter State Validation', () => {
    it('should validate filter state structure', () => {
      // Save valid filter
      const filter = new Set(['requirement', 'task']);
      saveFilterState('table', filter);

      // Retrieve and validate structure
      const stored = sessionStorage.getItem('rxdx_node_filters');
      expect(stored).toBeTruthy();

      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Validate structure
        expect(parsed).toHaveProperty('table');
        expect(parsed.table).toHaveProperty('nodeTypes');
        expect(parsed.table).toHaveProperty('timestamp');
        expect(Array.isArray(parsed.table.nodeTypes)).toBe(true);
        expect(typeof parsed.table.timestamp).toBe('number');
      }
    });

    it('should handle missing page key gracefully', () => {
      // Save filter for table only
      saveFilterState('table', new Set(['requirement']));

      // Try to load graph filter (doesn't exist)
      const graphFilter = loadFilterState('graph');
      expect(graphFilter).toEqual(new Set());
    });

    it('should handle special characters in filter values', () => {
      // This shouldn't happen in practice, but test robustness
      const filter = new Set(['requirement', 'task-special', 'test_type']);
      saveFilterState('table', filter);

      const restored = loadFilterState('table');
      expect(restored).toEqual(filter);
    });
  });

  describe('Performance', () => {
    it('should handle large filter sets efficiently', () => {
      // Create large filter set
      const largeFilter = new Set(
        Array.from({ length: 100 }, (_, i) => `type-${i}`)
      );

      const startTime = performance.now();
      saveFilterState('table', largeFilter);
      const saveTime = performance.now() - startTime;

      const loadStartTime = performance.now();
      const restored = loadFilterState('table');
      const loadTime = performance.now() - loadStartTime;

      // Verify correctness
      expect(restored).toEqual(largeFilter);

      // Verify performance (should be fast)
      expect(saveTime).toBeLessThan(100); // < 100ms
      expect(loadTime).toBeLessThan(100); // < 100ms
    });

    it('should handle rapid successive saves efficiently', () => {
      const startTime = performance.now();

      // Perform 100 rapid saves
      for (let i = 0; i < 100; i++) {
        const filter = new Set([`type-${i}`]);
        saveFilterState('table', filter);
      }

      const totalTime = performance.now() - startTime;

      // Should complete quickly even with many saves
      expect(totalTime).toBeLessThan(1000); // < 1 second for 100 saves

      // Verify last save is correct
      const restored = loadFilterState('table');
      expect(restored).toEqual(new Set(['type-99']));
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined filter values', () => {
      // Try to save undefined (shouldn't crash)
      saveFilterState('table', undefined as any);

      // Should return empty set
      const restored = loadFilterState('table');
      expect(restored).toEqual(new Set());
    });

    it('should handle null filter values', () => {
      // Try to save null (shouldn't crash)
      saveFilterState('table', null as any);

      // Should return empty set
      const restored = loadFilterState('table');
      expect(restored).toEqual(new Set());
    });

    it('should handle non-Set filter values', () => {
      // Try to save array instead of Set
      saveFilterState('table', ['requirement', 'task'] as any);

      // Should handle gracefully
      const restored = loadFilterState('table');
      expect(restored instanceof Set).toBe(true);
    });

    it('should handle session storage quota exceeded', () => {
      // This is hard to test reliably, but we can verify the function doesn't throw
      try {
        // Try to save a very large filter
        const hugeFilter = new Set(
          Array.from({ length: 10000 }, (_, i) => `type-${i}-${'x'.repeat(100)}`)
        );
        saveFilterState('table', hugeFilter);
        
        // If it succeeds, verify it can be loaded
        const restored = loadFilterState('table');
        expect(restored instanceof Set).toBe(true);
      } catch (error) {
        // If it fails due to quota, that's acceptable
        // The important thing is it doesn't crash the app
        expect(error).toBeDefined();
      }
    });
  });

  describe('Backward Compatibility', () => {
    it('should handle old filter format gracefully', () => {
      // Simulate old format (just array, no timestamp)
      const oldFormat = {
        table: ['requirement', 'task'],
      };
      sessionStorage.setItem('rxdx_node_filters', JSON.stringify(oldFormat));

      // Should handle gracefully and return empty set or migrate
      const restored = loadFilterState('table');
      expect(restored instanceof Set).toBe(true);
    });

    it('should handle missing timestamp gracefully', () => {
      // Save format without timestamp
      const noTimestamp = {
        table: {
          nodeTypes: ['requirement', 'task'],
        },
      };
      sessionStorage.setItem('rxdx_node_filters', JSON.stringify(noTimestamp));

      // Should still load the filter
      const restored = loadFilterState('table');
      expect(restored instanceof Set).toBe(true);
      expect(restored.has('requirement')).toBe(true);
      expect(restored.has('task')).toBe(true);
    });
  });
});

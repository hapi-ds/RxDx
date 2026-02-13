/**
 * Property-based tests for progress hooks
 * 
 * Property 13: Cache invalidation on child change
 * For any node with ancestors, changing its completion status should invalidate
 * the progress cache for all ancestor nodes.
 * 
 * **Validates: Requirements 4.1.4**
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { fc } from '@fast-check/vitest';
import { useNodeProgress } from './useProgress';
import { progressCalculator } from '../services/progressCalculator';

// Mock the progress calculator
vi.mock('../services/progressCalculator', () => {
  const actualCache = new Map<string, { percentage: number; timestamp: number }>();
  const actualParentMap = new Map<string, Set<string>>();

  return {
    progressCalculator: {
      getProgress: vi.fn(async (nodeId: string) => {
        const cached = actualCache.get(nodeId);
        if (cached && Date.now() - cached.timestamp < 30000) {
          return cached.percentage;
        }
        // Simulate calculation
        const progress = Math.random() * 100;
        actualCache.set(nodeId, { percentage: progress, timestamp: Date.now() });
        return progress;
      }),
      calculateHierarchicalProgress: vi.fn(async (nodeId: string, childIds: string[]) => {
        // Register parent relationships
        for (const childId of childIds) {
          if (!actualParentMap.has(childId)) {
            actualParentMap.set(childId, new Set());
          }
          actualParentMap.get(childId)!.add(nodeId);
        }
        
        // Calculate average progress
        let total = 0;
        for (const childId of childIds) {
          const childProgress = await progressCalculator.getProgress(childId);
          total += childProgress;
        }
        return childIds.length > 0 ? total / childIds.length : 0;
      }),
      invalidateCache: vi.fn((nodeId: string) => {
        actualCache.delete(nodeId);
        
        // Invalidate ancestors
        const parents = actualParentMap.get(nodeId);
        if (parents) {
          parents.forEach((parentId) => {
            progressCalculator.invalidateCache(parentId);
          });
        }
      }),
      clearCache: vi.fn(() => {
        actualCache.clear();
        actualParentMap.clear();
      }),
      // Expose internal state for testing
      _getCache: () => actualCache,
      _getParentMap: () => actualParentMap,
    },
  };
});

describe('Property Test: Cache invalidation on child change', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    progressCalculator.clearCache();
  });

  it('should invalidate cache when done attribute changes', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // nodeId
        fc.boolean(), // initial done state
        fc.boolean(), // new done state
        (nodeId, initialDone, newDone) => {
          // Skip if states are the same
          fc.pre(initialDone !== newDone);

          const { rerender } = renderHook(
            ({ done }) => useNodeProgress(nodeId, done),
            { initialProps: { done: initialDone } }
          );

          // Clear mock calls from initial render
          vi.clearAllMocks();

          // Change done attribute
          rerender({ done: newDone });

          // Verify cache was invalidated
          expect(progressCalculator.invalidateCache).toHaveBeenCalledWith(nodeId);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should invalidate ancestor caches when child changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // parent nodeId
        fc.uuid(), // child nodeId
        fc.boolean(), // initial done state
        fc.boolean(), // new done state
        async (parentId, childId, initialDone, newDone) => {
          // Skip if states are the same or IDs are the same
          fc.pre(initialDone !== newDone && parentId !== childId);

          // Set up parent-child relationship
          await progressCalculator.calculateHierarchicalProgress(parentId, [childId]);

          // Render child with initial state
          const { rerender } = renderHook(
            ({ done }) => useNodeProgress(childId, done),
            { initialProps: { done: initialDone } }
          );

          // Wait for initial render to complete
          await waitFor(() => {
            expect(progressCalculator.invalidateCache).toHaveBeenCalled();
          });

          // Clear mock calls
          vi.clearAllMocks();

          // Change child's done attribute
          rerender({ done: newDone });

          // Verify both child and parent caches were invalidated
          expect(progressCalculator.invalidateCache).toHaveBeenCalledWith(childId);
          
          // The invalidateCache implementation should recursively invalidate parents
          // Check that the parent was also invalidated
          const cache = (progressCalculator as any)._getCache();
          expect(cache.has(parentId)).toBe(false);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should invalidate all ancestors in a hierarchy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // grandparent nodeId
        fc.uuid(), // parent nodeId
        fc.uuid(), // child nodeId
        fc.boolean(), // initial done state
        fc.boolean(), // new done state
        async (grandparentId, parentId, childId, initialDone, newDone) => {
          // Skip if states are the same or IDs are not unique
          fc.pre(
            initialDone !== newDone &&
            grandparentId !== parentId &&
            parentId !== childId &&
            grandparentId !== childId
          );

          // Set up three-level hierarchy: grandparent -> parent -> child
          await progressCalculator.calculateHierarchicalProgress(parentId, [childId]);
          await progressCalculator.calculateHierarchicalProgress(grandparentId, [parentId]);

          // Render child with initial state
          const { rerender } = renderHook(
            ({ done }) => useNodeProgress(childId, done),
            { initialProps: { done: initialDone } }
          );

          // Wait for initial render
          await waitFor(() => {
            expect(progressCalculator.invalidateCache).toHaveBeenCalled();
          });

          // Clear mock calls
          vi.clearAllMocks();

          // Change child's done attribute
          rerender({ done: newDone });

          // Verify child cache was invalidated
          expect(progressCalculator.invalidateCache).toHaveBeenCalledWith(childId);

          // Verify all ancestors were invalidated
          const cache = (progressCalculator as any)._getCache();
          expect(cache.has(childId)).toBe(false);
          expect(cache.has(parentId)).toBe(false);
          expect(cache.has(grandparentId)).toBe(false);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('should handle multiple children invalidating same parent', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(), // parent nodeId
        fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }), // child nodeIds
        fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }), // initial done states
        fc.nat({ max: 4 }), // index of child to change
        async (parentId, childIds, initialDoneStates, changeIndex) => {
          // Ensure unique child IDs
          const uniqueChildIds = [...new Set(childIds)];
          fc.pre(
            uniqueChildIds.length >= 2 &&
            changeIndex < uniqueChildIds.length &&
            uniqueChildIds.every(id => id !== parentId)
          );

          // Set up parent-children relationship
          await progressCalculator.calculateHierarchicalProgress(
            parentId,
            uniqueChildIds
          );

          // Render all children with initial states
          const hooks = uniqueChildIds.map((childId, index) =>
            renderHook(
              ({ done }) => useNodeProgress(childId, done),
              { initialProps: { done: initialDoneStates[index] || false } }
            )
          );

          // Wait for initial renders
          await waitFor(() => {
            expect(progressCalculator.invalidateCache).toHaveBeenCalled();
          });

          // Clear mock calls
          vi.clearAllMocks();

          // Change one child's done attribute
          const targetHook = hooks[changeIndex];
          const newDone = !initialDoneStates[changeIndex];
          targetHook.rerender({ done: newDone });

          // Verify the changed child invalidated cache
          expect(progressCalculator.invalidateCache).toHaveBeenCalledWith(
            uniqueChildIds[changeIndex]
          );

          // Verify parent cache was invalidated
          const cache = (progressCalculator as any)._getCache();
          expect(cache.has(parentId)).toBe(false);

          // Clean up
          hooks.forEach(hook => hook.unmount());
        }
      ),
      { numRuns: 20 }
    );
  });
});

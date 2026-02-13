/**
 * Property-based tests for ProgressCalculator service
 * 
 * These tests validate correctness properties that should hold
 * for all valid inputs using fast-check library.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { progressCalculator } from './progressCalculator';
import { graphService } from './graphService';

// Mock graphService
vi.mock('./graphService', () => ({
  graphService: {
    getVisualization: vi.fn(),
  },
}));

describe('ProgressCalculator Properties', () => {
  beforeEach(() => {
    progressCalculator.clearCache();
    vi.clearAllMocks();
  });

  /**
   * Property 10: Task completion mapping
   * For any task node, if the "done" attribute is true, the calculated progress
   * should be 100%; if false or absent, it should be 0%.
   * 
   * Validates: Requirements 4.2, 4.3, 4.1.6
   */
  it('Property 10: task completion maps done=true to 100% and done=false/absent to 0%', () => {
    fc.assert(
      fc.property(
        fc.record({
          nodeId: fc.uuid(),
          done: fc.option(fc.boolean(), { nil: undefined }),
          otherProps: fc.dictionary(fc.string(), fc.anything()),
        }),
        ({ nodeId, done, otherProps }) => {
          const properties = { ...otherProps, done };
          const progress = progressCalculator.calculateNodeProgress(
            nodeId,
            'task',
            properties
          );

          if (done === true) {
            expect(progress).toBe(100);
          } else {
            // done is false, undefined, or any other value
            expect(progress).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 11: Hierarchical progress aggregation
   * For any container node with N children, the progress percentage should
   * equal the sum of all child progress percentages divided by N.
   * 
   * Validates: Requirements 4.4, 4.5, 4.1.2, 4.1.7
   */
  it('Property 11: hierarchical progress equals sum of child progress divided by N', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          parentId: fc.uuid(),
          children: fc.array(
            fc.record({
              id: fc.uuid(),
              done: fc.boolean(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
        }),
        async ({ parentId, children }) => {
          // Mock graph service to return child nodes
          vi.mocked(graphService.getVisualization).mockImplementation(
            async ({ center_node_id }) => {
              const child = children.find((c) => c.id === center_node_id);
              if (child) {
                return {
                  nodes: [
                    {
                      id: child.id,
                      type: 'task',
                      label: `Task ${child.id}`,
                      properties: { done: child.done },
                    },
                  ],
                  edges: [],
                };
              }
              return { nodes: [], edges: [] };
            }
          );

          const childIds = children.map((c) => c.id);
          const progress = await progressCalculator.calculateHierarchicalProgress(
            parentId,
            childIds
          );

          // Calculate expected progress
          const expectedProgress =
            children.reduce((sum, child) => sum + (child.done ? 100 : 0), 0) /
            children.length;

          expect(progress).toBeCloseTo(expectedProgress, 5);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 12: Progress cache validity
   * For any node, requesting progress twice within 30 seconds should return
   * the cached value without making additional database queries.
   * 
   * Validates: Requirements 4.1.3
   */
  it('Property 12: progress cache valid within 30 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          nodeId: fc.uuid(),
          done: fc.boolean(),
          delayMs: fc.integer({ min: 0, max: 29999 }), // Within 30 seconds
        }),
        async ({ nodeId, done, delayMs }) => {
          // Clear cache and mocks for each property test run
          progressCalculator.clearCache();
          vi.clearAllMocks();

          // Mock graph service
          vi.mocked(graphService.getVisualization).mockResolvedValue({
            nodes: [
              {
                id: nodeId,
                type: 'task',
                label: `Task ${nodeId}`,
                properties: { done },
              },
            ],
            edges: [],
          });

          // First call
          const progress1 = await progressCalculator.getProgress(nodeId);

          // Simulate time passing (but within TTL)
          vi.useFakeTimers();
          vi.advanceTimersByTime(delayMs);

          // Second call should use cache
          const progress2 = await progressCalculator.getProgress(nodeId);

          vi.useRealTimers();

          // Progress should be the same
          expect(progress1).toBe(progress2);

          // Should only call API once (cached on second call)
          expect(graphService.getVisualization).toHaveBeenCalledTimes(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 12b: Cache expiration after 30 seconds
   * For any node, requesting progress after 30 seconds should recalculate
   * and make a new database query.
   * 
   * Validates: Requirements 4.1.3
   */
  it('Property 12b: progress cache expires after 30 seconds', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          nodeId: fc.uuid(),
          done: fc.boolean(),
          delayMs: fc.integer({ min: 30000, max: 60000 }), // After 30 seconds
        }),
        async ({ nodeId, done, delayMs }) => {
          // Clear cache and mocks for each property test run
          progressCalculator.clearCache();
          vi.clearAllMocks();

          // Mock graph service
          vi.mocked(graphService.getVisualization).mockResolvedValue({
            nodes: [
              {
                id: nodeId,
                type: 'task',
                label: `Task ${nodeId}`,
                properties: { done },
              },
            ],
            edges: [],
          });

          // First call
          await progressCalculator.getProgress(nodeId);

          // Simulate time passing (beyond TTL)
          vi.useFakeTimers();
          vi.advanceTimersByTime(delayMs);

          // Second call should recalculate
          await progressCalculator.getProgress(nodeId);

          vi.useRealTimers();

          // Should call API twice (cache expired)
          expect(graphService.getVisualization).toHaveBeenCalledTimes(2);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 13: Cache invalidation on child change
   * For any node with ancestors, changing its completion status should
   * invalidate the progress cache for all ancestor nodes.
   * 
   * Validates: Requirements 4.1.4
   */
  it('Property 13: cache invalidation propagates to ancestors', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          parentId: fc.uuid(),
          childId: fc.uuid(),
          initialDone: fc.boolean(),
        }),
        async ({ parentId, childId, initialDone }) => {
          // Mock graph service
          vi.mocked(graphService.getVisualization).mockImplementation(
            async ({ center_node_id }) => {
              if (center_node_id === parentId) {
                return {
                  nodes: [
                    {
                      id: parentId,
                      type: 'workpackage',
                      label: 'Parent',
                      properties: { children: [childId] },
                    },
                  ],
                  edges: [],
                };
              }
              if (center_node_id === childId) {
                return {
                  nodes: [
                    {
                      id: childId,
                      type: 'task',
                      label: 'Child',
                      properties: { done: initialDone },
                    },
                  ],
                  edges: [],
                };
              }
              return { nodes: [], edges: [] };
            }
          );

          // Cache parent progress (establishes parent-child relationship)
          await progressCalculator.getProgress(parentId);

          // Invalidate child
          progressCalculator.invalidateCache(childId);

          // Clear mock to verify recalculation
          vi.mocked(graphService.getVisualization).mockClear();

          // Getting parent progress should recalculate
          await progressCalculator.getProgress(parentId);

          // Should have made API calls (parent cache was invalidated)
          expect(graphService.getVisualization).toHaveBeenCalled();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Additional property: Non-task nodes always return 0% progress
   * For any non-task node type, the progress should always be 0%.
   */
  it('Property: non-task nodes always return 0% progress', () => {
    fc.assert(
      fc.property(
        fc.record({
          nodeId: fc.uuid(),
          nodeType: fc.constantFrom(
            'requirement',
            'test',
            'risk',
            'document',
            'workpackage',
            'project'
          ),
          properties: fc.dictionary(fc.string(), fc.anything()),
        }),
        ({ nodeId, nodeType, properties }) => {
          const progress = progressCalculator.calculateNodeProgress(
            nodeId,
            nodeType,
            properties
          );

          expect(progress).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Additional property: Empty children array returns 0% progress
   * For any container node with no children, the progress should be 0%.
   */
  it('Property: empty children array returns 0% progress', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (parentId) => {
        const progress = await progressCalculator.calculateHierarchicalProgress(
          parentId,
          []
        );

        expect(progress).toBe(0);
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Additional property: Progress is always between 0 and 100
   * For any node, the calculated progress should be in the range [0, 100].
   */
  it('Property: progress is always between 0 and 100', () => {
    fc.assert(
      fc.property(
        fc.record({
          nodeId: fc.uuid(),
          nodeType: fc.constantFrom('task', 'requirement', 'test', 'risk'),
          properties: fc.dictionary(fc.string(), fc.anything()),
        }),
        ({ nodeId, nodeType, properties }) => {
          const progress = progressCalculator.calculateNodeProgress(
            nodeId,
            nodeType,
            properties
          );

          expect(progress).toBeGreaterThanOrEqual(0);
          expect(progress).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });
});

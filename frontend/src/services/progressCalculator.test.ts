/**
 * Unit tests for ProgressCalculator service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { progressCalculator } from './progressCalculator';
import { graphService } from './graphService';

// Mock graphService
vi.mock('./graphService', () => ({
  graphService: {
    getVisualization: vi.fn(),
  },
}));

describe('ProgressCalculator', () => {
  beforeEach(() => {
    // Clear cache before each test
    progressCalculator.clearCache();
    vi.clearAllMocks();
  });

  describe('calculateNodeProgress', () => {
    it('should return 100 for completed task nodes', () => {
      const progress = progressCalculator.calculateNodeProgress(
        'task-1',
        'task',
        { done: true }
      );
      expect(progress).toBe(100);
    });

    it('should return 0 for incomplete task nodes', () => {
      const progress = progressCalculator.calculateNodeProgress(
        'task-2',
        'task',
        { done: false }
      );
      expect(progress).toBe(0);
    });

    it('should return 0 for task nodes without done property', () => {
      const progress = progressCalculator.calculateNodeProgress(
        'task-3',
        'task',
        {}
      );
      expect(progress).toBe(0);
    });

    it('should return 0 for non-task nodes', () => {
      const progress = progressCalculator.calculateNodeProgress(
        'req-1',
        'requirement',
        { done: true }
      );
      expect(progress).toBe(0);
    });
  });

  describe('calculateHierarchicalProgress', () => {
    it('should return 0 for nodes with no children', async () => {
      const progress = await progressCalculator.calculateHierarchicalProgress(
        'parent-1',
        []
      );
      expect(progress).toBe(0);
    });

    it('should calculate average progress of children', async () => {
      // Mock child nodes
      vi.mocked(graphService.getVisualization).mockImplementation(
        async ({ center_node_id }) => {
          if (center_node_id === 'child-1') {
            return {
              nodes: [
                {
                  id: 'child-1',
                  type: 'task',
                  label: 'Child 1',
                  properties: { done: true },
                },
              ],
              edges: [],
            };
          }
          if (center_node_id === 'child-2') {
            return {
              nodes: [
                {
                  id: 'child-2',
                  type: 'task',
                  label: 'Child 2',
                  properties: { done: false },
                },
              ],
              edges: [],
            };
          }
          return { nodes: [], edges: [] };
        }
      );

      const progress = await progressCalculator.calculateHierarchicalProgress(
        'parent-1',
        ['child-1', 'child-2']
      );

      // Average of 100 and 0 = 50
      expect(progress).toBe(50);
    });

    it('should handle all completed children', async () => {
      vi.mocked(graphService.getVisualization).mockImplementation(
        async ({ center_node_id }) => {
          return {
            nodes: [
              {
                id: center_node_id!,
                type: 'task',
                label: `Task ${center_node_id}`,
                properties: { done: true },
              },
            ],
            edges: [],
          };
        }
      );

      const progress = await progressCalculator.calculateHierarchicalProgress(
        'parent-1',
        ['child-1', 'child-2', 'child-3']
      );

      expect(progress).toBe(100);
    });

    it('should handle all incomplete children', async () => {
      vi.mocked(graphService.getVisualization).mockImplementation(
        async ({ center_node_id }) => {
          return {
            nodes: [
              {
                id: center_node_id!,
                type: 'task',
                label: `Task ${center_node_id}`,
                properties: { done: false },
              },
            ],
            edges: [],
          };
        }
      );

      const progress = await progressCalculator.calculateHierarchicalProgress(
        'parent-1',
        ['child-1', 'child-2']
      );

      expect(progress).toBe(0);
    });
  });

  describe('getProgress', () => {
    it('should calculate progress for leaf task node', async () => {
      vi.mocked(graphService.getVisualization).mockResolvedValue({
        nodes: [
          {
            id: 'task-1',
            type: 'task',
            label: 'Task 1',
            properties: { done: true },
          },
        ],
        edges: [],
      });

      const progress = await progressCalculator.getProgress('task-1');
      expect(progress).toBe(100);
    });

    it('should calculate hierarchical progress for container node', async () => {
      vi.mocked(graphService.getVisualization).mockImplementation(
        async ({ center_node_id }) => {
          if (center_node_id === 'parent-1') {
            return {
              nodes: [
                {
                  id: 'parent-1',
                  type: 'workpackage',
                  label: 'Parent',
                  properties: { children: ['child-1', 'child-2'] },
                },
              ],
              edges: [],
            };
          }
          if (center_node_id === 'child-1') {
            return {
              nodes: [
                {
                  id: 'child-1',
                  type: 'task',
                  label: 'Child 1',
                  properties: { done: true },
                },
              ],
              edges: [],
            };
          }
          if (center_node_id === 'child-2') {
            return {
              nodes: [
                {
                  id: 'child-2',
                  type: 'task',
                  label: 'Child 2',
                  properties: { done: false },
                },
              ],
              edges: [],
            };
          }
          return { nodes: [], edges: [] };
        }
      );

      const progress = await progressCalculator.getProgress('parent-1');
      expect(progress).toBe(50);
    });

    it('should return cached progress within TTL', async () => {
      vi.mocked(graphService.getVisualization).mockResolvedValue({
        nodes: [
          {
            id: 'task-1',
            type: 'task',
            label: 'Task 1',
            properties: { done: true },
          },
        ],
        edges: [],
      });

      // First call
      const progress1 = await progressCalculator.getProgress('task-1');
      expect(progress1).toBe(100);

      // Second call should use cache
      const progress2 = await progressCalculator.getProgress('task-1');
      expect(progress2).toBe(100);

      // Should only call API once
      expect(graphService.getVisualization).toHaveBeenCalledTimes(1);
    });

    it('should recalculate progress after cache expires', async () => {
      vi.mocked(graphService.getVisualization).mockResolvedValue({
        nodes: [
          {
            id: 'task-1',
            type: 'task',
            label: 'Task 1',
            properties: { done: true },
          },
        ],
        edges: [],
      });

      // First call
      await progressCalculator.getProgress('task-1');

      // Mock time passing (31 seconds)
      vi.useFakeTimers();
      vi.advanceTimersByTime(31000);

      // Second call should recalculate
      await progressCalculator.getProgress('task-1');

      // Should call API twice
      expect(graphService.getVisualization).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('invalidateCache', () => {
    it('should remove node from cache', async () => {
      vi.mocked(graphService.getVisualization).mockResolvedValue({
        nodes: [
          {
            id: 'task-1',
            type: 'task',
            label: 'Task 1',
            properties: { done: true },
          },
        ],
        edges: [],
      });

      // Cache the progress
      await progressCalculator.getProgress('task-1');
      expect(graphService.getVisualization).toHaveBeenCalledTimes(1);

      // Invalidate cache
      progressCalculator.invalidateCache('task-1');

      // Next call should recalculate
      await progressCalculator.getProgress('task-1');
      expect(graphService.getVisualization).toHaveBeenCalledTimes(2);
    });

    it('should invalidate ancestor caches', async () => {
      vi.mocked(graphService.getVisualization).mockImplementation(
        async ({ center_node_id }) => {
          if (center_node_id === 'parent-1') {
            return {
              nodes: [
                {
                  id: 'parent-1',
                  type: 'workpackage',
                  label: 'Parent',
                  properties: { children: ['child-1'] },
                },
              ],
              edges: [],
            };
          }
          if (center_node_id === 'child-1') {
            return {
              nodes: [
                {
                  id: 'child-1',
                  type: 'task',
                  label: 'Child 1',
                  properties: { done: true },
                },
              ],
              edges: [],
            };
          }
          return { nodes: [], edges: [] };
        }
      );

      // Cache parent progress (which will cache child and establish parent-child relationship)
      const progress1 = await progressCalculator.getProgress('parent-1');
      expect(progress1).toBe(100);

      // Invalidate child - this should also invalidate parent
      progressCalculator.invalidateCache('child-1');
      
      // Clear mock to verify parent is recalculated
      vi.mocked(graphService.getVisualization).mockClear();

      // Getting parent progress should recalculate because child was invalidated
      const progress2 = await progressCalculator.getProgress('parent-1');
      expect(progress2).toBe(100);
      
      // Parent should have been recalculated (cache was invalidated)
      expect(graphService.getVisualization).toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached progress', async () => {
      vi.mocked(graphService.getVisualization).mockImplementation(
        async ({ center_node_id }) => {
          return {
            nodes: [
              {
                id: center_node_id!,
                type: 'task',
                label: `Task ${center_node_id}`,
                properties: { done: true },
              },
            ],
            edges: [],
          };
        }
      );

      // Cache multiple nodes
      await progressCalculator.getProgress('task-1');
      await progressCalculator.getProgress('task-2');

      // Clear cache
      progressCalculator.clearCache();

      // Next calls should recalculate
      await progressCalculator.getProgress('task-1');
      await progressCalculator.getProgress('task-2');

      // Should have called API 4 times total (2 initial + 2 after clear)
      expect(graphService.getVisualization).toHaveBeenCalledTimes(4);
    });
  });
});

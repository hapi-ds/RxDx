/**
 * React hooks for progress calculation
 * Provides convenient access to node progress with caching
 */

import { useEffect, useState, useCallback } from 'react';
import { progressCalculator } from '../services/progressCalculator';

/**
 * Hook to get node progress with caching
 * For leaf nodes (tasks) - uses done attribute directly
 * Automatically invalidates cache when done attribute changes
 * 
 * @param nodeId - Node UUID
 * @param doneAttribute - Optional done attribute for task nodes
 * @returns Progress percentage (0-100)
 */
export function useNodeProgress(
  nodeId: string,
  doneAttribute?: boolean
): number {
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    // For simple task nodes, use done attribute directly
    if (doneAttribute !== undefined) {
      setProgress(doneAttribute ? 100 : 0);
      
      // Invalidate cache when done attribute changes
      // This ensures parent nodes recalculate their progress
      progressCalculator.invalidateCache(nodeId);
      
      return;
    }

    // For other nodes, calculate from service
    let mounted = true;

    const fetchProgress = async (): Promise<void> => {
      try {
        const result = await progressCalculator.getProgress(nodeId);
        if (mounted) {
          setProgress(result);
        }
      } catch (error) {
        console.error(`Failed to fetch progress for node ${nodeId}:`, error);
        if (mounted) {
          setProgress(0);
        }
      }
    };

    fetchProgress();

    return () => {
      mounted = false;
    };
  }, [nodeId, doneAttribute]);

  return progress;
}

/**
 * Hook to get hierarchical progress for container nodes
 * Calculates progress based on children completion
 * Automatically refetches when child IDs change
 * 
 * @param nodeId - Node UUID
 * @param childIds - Array of child node IDs
 * @returns Progress percentage (0-100)
 */
export function useHierarchicalProgress(
  nodeId: string,
  childIds?: string[]
): number {
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (!childIds || childIds.length === 0) {
      setProgress(0);
      return;
    }

    let mounted = true;

    const fetchProgress = async (): Promise<void> => {
      try {
        const result = await progressCalculator.calculateHierarchicalProgress(
          nodeId,
          childIds
        );
        if (mounted) {
          setProgress(result);
        }
      } catch (error) {
        console.error(
          `Failed to fetch hierarchical progress for node ${nodeId}:`,
          error
        );
        if (mounted) {
          setProgress(0);
        }
      }
    };

    fetchProgress();

    return () => {
      mounted = false;
    };
  }, [nodeId, childIds]);

  return progress;
}

/**
 * Hook to invalidate progress cache for a node
 * Useful when node data changes
 * 
 * @param nodeId - Node UUID to invalidate
 * @returns Function to trigger cache invalidation
 */
export function useProgressInvalidation(nodeId: string): () => void {
  return useCallback(() => {
    progressCalculator.invalidateCache(nodeId);
  }, [nodeId]);
}

/**
 * Hook to clear all progress cache
 * Useful for global data refresh
 * 
 * @returns Function to clear all cache
 */
export function useClearProgressCache(): () => void {
  return useCallback(() => {
    progressCalculator.clearCache();
  }, []);
}

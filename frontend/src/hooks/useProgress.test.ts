/**
 * Unit tests for progress hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
  useNodeProgress,
  useHierarchicalProgress,
  useProgressInvalidation,
  useClearProgressCache,
} from './useProgress';
import { progressCalculator } from '../services/progressCalculator';

// Mock the progress calculator
vi.mock('../services/progressCalculator', () => ({
  progressCalculator: {
    getProgress: vi.fn(),
    calculateHierarchicalProgress: vi.fn(),
    invalidateCache: vi.fn(),
    clearCache: vi.fn(),
  },
}));

describe('useNodeProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 100 when doneAttribute is true', () => {
    const { result } = renderHook(() =>
      useNodeProgress('node-1', true)
    );

    expect(result.current).toBe(100);
  });

  it('should return 0 when doneAttribute is false', () => {
    const { result } = renderHook(() =>
      useNodeProgress('node-1', false)
    );

    expect(result.current).toBe(0);
  });

  it('should invalidate cache when doneAttribute changes', () => {
    const { rerender } = renderHook(
      ({ done }) => useNodeProgress('node-1', done),
      { initialProps: { done: false } }
    );

    expect(progressCalculator.invalidateCache).toHaveBeenCalledWith('node-1');

    vi.clearAllMocks();

    rerender({ done: true });

    expect(progressCalculator.invalidateCache).toHaveBeenCalledWith('node-1');
  });

  it('should fetch progress from calculator when doneAttribute is undefined', async () => {
    vi.mocked(progressCalculator.getProgress).mockResolvedValue(75);

    const { result } = renderHook(() => useNodeProgress('node-1'));

    // Initial state
    expect(result.current).toBe(0);

    // Wait for async update
    await waitFor(() => {
      expect(result.current).toBe(75);
    });

    expect(progressCalculator.getProgress).toHaveBeenCalledWith('node-1');
  });

  it('should return 0 on error', async () => {
    vi.mocked(progressCalculator.getProgress).mockRejectedValue(
      new Error('Failed to fetch')
    );

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useNodeProgress('node-1'));

    await waitFor(() => {
      expect(result.current).toBe(0);
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should update when nodeId changes', async () => {
    vi.mocked(progressCalculator.getProgress)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(75);

    const { result, rerender } = renderHook(
      ({ id }) => useNodeProgress(id),
      { initialProps: { id: 'node-1' } }
    );

    await waitFor(() => {
      expect(result.current).toBe(50);
    });

    rerender({ id: 'node-2' });

    await waitFor(() => {
      expect(result.current).toBe(75);
    });

    expect(progressCalculator.getProgress).toHaveBeenCalledWith('node-1');
    expect(progressCalculator.getProgress).toHaveBeenCalledWith('node-2');
  });

  it('should not update state after unmount', async () => {
    vi.mocked(progressCalculator.getProgress).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(50), 100))
    );

    const { result, unmount } = renderHook(() => useNodeProgress('node-1'));

    unmount();

    // Wait to ensure no state update happens
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should still be initial value
    expect(result.current).toBe(0);
  });
});

describe('useHierarchicalProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 0 when childIds is undefined', () => {
    const { result } = renderHook(() =>
      useHierarchicalProgress('node-1', undefined)
    );

    expect(result.current).toBe(0);
  });

  it('should return 0 when childIds is empty', () => {
    const { result } = renderHook(() =>
      useHierarchicalProgress('node-1', [])
    );

    expect(result.current).toBe(0);
  });

  it('should calculate hierarchical progress', async () => {
    vi.mocked(progressCalculator.calculateHierarchicalProgress).mockResolvedValue(60);

    const { result } = renderHook(() =>
      useHierarchicalProgress('node-1', ['child-1', 'child-2'])
    );

    // Initial state
    expect(result.current).toBe(0);

    // Wait for async update
    await waitFor(() => {
      expect(result.current).toBe(60);
    });

    expect(progressCalculator.calculateHierarchicalProgress).toHaveBeenCalledWith(
      'node-1',
      ['child-1', 'child-2']
    );
  });

  it('should return 0 on error', async () => {
    vi.mocked(progressCalculator.calculateHierarchicalProgress).mockRejectedValue(
      new Error('Failed to calculate')
    );

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useHierarchicalProgress('node-1', ['child-1'])
    );

    await waitFor(() => {
      expect(result.current).toBe(0);
    });

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should update when childIds change', async () => {
    vi.mocked(progressCalculator.calculateHierarchicalProgress)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(75);

    const { result, rerender } = renderHook(
      ({ children }) => useHierarchicalProgress('node-1', children),
      { initialProps: { children: ['child-1'] } }
    );

    await waitFor(() => {
      expect(result.current).toBe(50);
    });

    rerender({ children: ['child-1', 'child-2'] });

    await waitFor(() => {
      expect(result.current).toBe(75);
    });

    expect(progressCalculator.calculateHierarchicalProgress).toHaveBeenCalledWith(
      'node-1',
      ['child-1']
    );
    expect(progressCalculator.calculateHierarchicalProgress).toHaveBeenCalledWith(
      'node-1',
      ['child-1', 'child-2']
    );
  });

  it('should not update state after unmount', async () => {
    vi.mocked(progressCalculator.calculateHierarchicalProgress).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(50), 100))
    );

    const { result, unmount } = renderHook(() =>
      useHierarchicalProgress('node-1', ['child-1'])
    );

    unmount();

    // Wait to ensure no state update happens
    await new Promise((resolve) => setTimeout(resolve, 150));

    // Should still be initial value
    expect(result.current).toBe(0);
  });
});

describe('useProgressInvalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a function that invalidates cache', () => {
    const { result } = renderHook(() => useProgressInvalidation('node-1'));

    expect(typeof result.current).toBe('function');

    result.current();

    expect(progressCalculator.invalidateCache).toHaveBeenCalledWith('node-1');
  });

  it('should return stable function reference', () => {
    const { result, rerender } = renderHook(
      ({ id }) => useProgressInvalidation(id),
      { initialProps: { id: 'node-1' } }
    );

    const firstRef = result.current;

    rerender({ id: 'node-1' });

    expect(result.current).toBe(firstRef);
  });

  it('should update function when nodeId changes', () => {
    const { result, rerender } = renderHook(
      ({ id }) => useProgressInvalidation(id),
      { initialProps: { id: 'node-1' } }
    );

    result.current();
    expect(progressCalculator.invalidateCache).toHaveBeenCalledWith('node-1');

    vi.clearAllMocks();

    rerender({ id: 'node-2' });

    result.current();
    expect(progressCalculator.invalidateCache).toHaveBeenCalledWith('node-2');
  });
});

describe('useClearProgressCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a function that clears cache', () => {
    const { result } = renderHook(() => useClearProgressCache());

    expect(typeof result.current).toBe('function');

    result.current();

    expect(progressCalculator.clearCache).toHaveBeenCalled();
  });

  it('should return stable function reference', () => {
    const { result, rerender } = renderHook(() => useClearProgressCache());

    const firstRef = result.current;

    rerender();

    expect(result.current).toBe(firstRef);
  });
});

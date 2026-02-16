import React from 'react';
import {renderHook, act, waitFor} from '@testing-library/react-native';
import {TasksProvider, useTasks} from '../TasksContext';
import timeTrackingService from '../../services/TimeTrackingService';
import storageService from '../../services/StorageService';
import {Task} from '../../types';

// Mock services
jest.mock('../../services/TimeTrackingService');
jest.mock('../../services/StorageService');

const mockTimeTrackingService = timeTrackingService as jest.Mocked<
  typeof timeTrackingService
>;
const mockStorageService = storageService as jest.Mocked<typeof storageService>;

// Mock tasks data
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Task 1',
    description: 'Description 1',
    status: 'active',
    priority: 1,
    scheduled_start: null,
    scheduled_end: null,
    worked_sum: '2h 30m',
    has_active_tracking: false,
  },
  {
    id: '2',
    title: 'Task 2',
    description: 'Description 2',
    status: 'active',
    priority: 2,
    scheduled_start: null,
    scheduled_end: null,
    worked_sum: '1h 15m',
    has_active_tracking: true,
  },
  {
    id: '3',
    title: 'Another Task',
    description: null,
    status: 'active',
    priority: 3,
    scheduled_start: null,
    scheduled_end: null,
    worked_sum: '0h 0m',
    has_active_tracking: false,
  },
];

describe('TasksContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementations
    mockStorageService.getItem.mockResolvedValue(null);
    mockStorageService.setItem.mockResolvedValue();
    mockTimeTrackingService.getTasks.mockResolvedValue(mockTasks);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const wrapper = ({children}: {children: React.ReactNode}) => (
    <TasksProvider>{children}</TasksProvider>
  );

  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const {result} = renderHook(() => useTasks(), {wrapper});

      expect(result.current.tasks).toEqual([]);
      expect(result.current.filteredTasks).toEqual([]);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.searchQuery).toBe('');
      expect(result.current.lastFetchTime).toBeNull();
    });

    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTasks());
      }).toThrow('useTasks must be used within a TasksProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Cache Restoration', () => {
    it('should restore tasks from valid cache', async () => {
      const cachedTimestamp = Date.now();
      mockStorageService.getItem
        .mockResolvedValueOnce(mockTasks) // TASKS_CACHE
        .mockResolvedValueOnce(cachedTimestamp); // TASKS_TIMESTAMP

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual(mockTasks);
      expect(result.current.filteredTasks).toEqual(mockTasks);
      expect(result.current.lastFetchTime).toBe(cachedTimestamp);
      expect(mockTimeTrackingService.getTasks).not.toHaveBeenCalled();
    });

    it('should fetch fresh data if cache is expired', async () => {
      const expiredTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      mockStorageService.getItem
        .mockResolvedValueOnce(mockTasks) // TASKS_CACHE
        .mockResolvedValueOnce(expiredTimestamp); // TASKS_TIMESTAMP

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockTimeTrackingService.getTasks).toHaveBeenCalled();
      expect(result.current.tasks).toEqual(mockTasks);
    });

    it('should fetch fresh data if cache does not exist', async () => {
      mockStorageService.getItem.mockResolvedValue(null);

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockTimeTrackingService.getTasks).toHaveBeenCalled();
      expect(result.current.tasks).toEqual(mockTasks);
    });

    it('should handle cache restoration errors gracefully', async () => {
      mockStorageService.getItem.mockRejectedValue(
        new Error('Storage error'),
      );

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockTimeTrackingService.getTasks).toHaveBeenCalled();
      expect(result.current.tasks).toEqual(mockTasks);
    });
  });

  describe('fetchTasks', () => {
    it('should fetch tasks successfully', async () => {
      mockStorageService.getItem.mockResolvedValue(null);

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tasks).toEqual(mockTasks);
      expect(result.current.filteredTasks).toEqual(mockTasks);
      expect(result.current.error).toBeNull();
      expect(result.current.lastFetchTime).toBeGreaterThan(0);
    });

    it('should cache fetched tasks', async () => {
      mockStorageService.getItem.mockResolvedValue(null);

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockStorageService.setItem).toHaveBeenCalledWith(
        'tasks_cache',
        mockTasks,
      );
      expect(mockStorageService.setItem).toHaveBeenCalledWith(
        'tasks_cache_timestamp',
        expect.any(Number),
      );
    });

    it('should handle fetch errors', async () => {
      mockStorageService.getItem.mockResolvedValue(null);
      const errorMessage = 'Network error';
      mockTimeTrackingService.getTasks.mockRejectedValue(
        new Error(errorMessage),
      );

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.tasks).toEqual([]);
    });

    it('should not show loading if tasks are already cached', async () => {
      const cachedTimestamp = Date.now();
      mockStorageService.getItem
        .mockResolvedValueOnce(mockTasks)
        .mockResolvedValueOnce(cachedTimestamp);

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Manually call fetchTasks
      await act(async () => {
        await result.current.fetchTasks();
      });

      // Should not have shown loading state
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('refreshTasks', () => {
    it('should refresh tasks successfully', async () => {
      mockStorageService.getItem.mockResolvedValue(null);

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const updatedTasks = [...mockTasks, {
        id: '4',
        title: 'New Task',
        description: 'New Description',
        status: 'active' as const,
        priority: 1,
        scheduled_start: null,
        scheduled_end: null,
        worked_sum: '0h 0m',
        has_active_tracking: false,
      }];

      mockTimeTrackingService.getTasks.mockResolvedValue(updatedTasks);

      await act(async () => {
        await result.current.refreshTasks();
      });

      expect(result.current.tasks).toEqual(updatedTasks);
      expect(result.current.isRefreshing).toBe(false);
    });

    it('should show refreshing state', async () => {
      mockStorageService.getItem.mockResolvedValue(null);

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let refreshingState = false;

      act(() => {
        result.current.refreshTasks().then(() => {
          // Promise resolved
        });
      });

      // Check if refreshing state was set
      await waitFor(() => {
        if (result.current.isRefreshing) {
          refreshingState = true;
        }
      });

      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(false);
      });

      expect(refreshingState).toBe(true);
    });

    it('should handle refresh errors', async () => {
      mockStorageService.getItem.mockResolvedValue(null);

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const errorMessage = 'Refresh failed';
      mockTimeTrackingService.getTasks.mockRejectedValue(
        new Error(errorMessage),
      );

      await act(async () => {
        try {
          await result.current.refreshTasks();
        } catch (error) {
          // Expected error
        }
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  describe('searchTasks', () => {
    beforeEach(async () => {
      mockStorageService.getItem.mockResolvedValue(null);
    });

    it('should filter tasks by title', async () => {
      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.searchTasks('Task 1');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].id).toBe('1');
      expect(result.current.searchQuery).toBe('Task 1');
    });

    it('should filter tasks by description', async () => {
      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.searchTasks('Description 2');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].id).toBe('2');
    });

    it('should be case-insensitive', async () => {
      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.searchTasks('TASK');
      });

      expect(result.current.filteredTasks).toHaveLength(3);
    });

    it('should return all tasks for empty query', async () => {
      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.searchTasks('Task 1');
      });

      expect(result.current.filteredTasks).toHaveLength(1);

      act(() => {
        result.current.searchTasks('');
      });

      expect(result.current.filteredTasks).toHaveLength(3);
    });

    it('should return empty array for no matches', async () => {
      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.searchTasks('NonexistentTask');
      });

      expect(result.current.filteredTasks).toHaveLength(0);
    });

    it('should handle null descriptions', async () => {
      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.searchTasks('Another');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].id).toBe('3');
    });
  });

  describe('Cache TTL', () => {
    it('should auto-fetch when cache expires', async () => {
      const expiredTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      mockStorageService.getItem
        .mockResolvedValueOnce(mockTasks)
        .mockResolvedValueOnce(expiredTimestamp);

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should have fetched fresh data
      expect(mockTimeTrackingService.getTasks).toHaveBeenCalled();
      expect(result.current.lastFetchTime).toBeGreaterThan(expiredTimestamp);
    });

    it('should not auto-fetch when cache is valid', async () => {
      const validTimestamp = Date.now() - 2 * 60 * 1000; // 2 minutes ago
      mockStorageService.getItem
        .mockResolvedValueOnce(mockTasks)
        .mockResolvedValueOnce(validTimestamp);

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should not have fetched fresh data
      expect(mockTimeTrackingService.getTasks).not.toHaveBeenCalled();
      expect(result.current.lastFetchTime).toBe(validTimestamp);
    });
  });

  describe('Search with cached data', () => {
    it('should apply search to restored cached tasks', async () => {
      const cachedTimestamp = Date.now();
      mockStorageService.getItem
        .mockResolvedValueOnce(mockTasks)
        .mockResolvedValueOnce(cachedTimestamp);

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.searchTasks('Task 1');
      });

      expect(result.current.filteredTasks).toHaveLength(1);
      expect(result.current.filteredTasks[0].id).toBe('1');
    });

    it('should preserve search query when fetching new data', async () => {
      mockStorageService.getItem.mockResolvedValue(null);

      const {result} = renderHook(() => useTasks(), {wrapper});

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.searchTasks('Task 1');
      });

      expect(result.current.filteredTasks).toHaveLength(1);

      // Fetch new data
      await act(async () => {
        await result.current.fetchTasks();
      });

      // Search query should be preserved
      expect(result.current.searchQuery).toBe('Task 1');
      expect(result.current.filteredTasks).toHaveLength(1);
    });
  });
});

/**
 * Unit tests for Time Tracking Service
 * Tests service layer methods, API calls, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  timeTrackingService,
  type Task,
  type ActiveTracking,
  type TimeEntry,
  type TimeEntriesResponse,
} from './timeTrackingService';
import { apiClient } from './api';

// Helper to create mock Axios response
const createMockResponse = <T>(data: T) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {} as any,
});

// Mock the API client
vi.mock('./api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  getErrorMessage: vi.fn((error: any) => {
    if (error?.response?.data?.detail) {
      return error.response.data.detail;
    }
    if (error?.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }),
}));

// Mock the logger
vi.mock('./logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('TimeTrackingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test getTasks() API call and error handling
   * Requirements: 12.1, 12.2, 12.3, 12.4
   */
  describe('getTasks()', () => {
    it('should fetch tasks successfully', async () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: 'Description 1',
          status: 'not_started',
          priority: 1,
          estimated_hours: 8,
          worked_sum: 0,
          assigned_to: 'user-1',
          scheduled_start: '2024-01-01',
          scheduled_end: '2024-01-02',
          has_active_tracking: false,
          user_is_tracking: false,
        },
        {
          id: '2',
          title: 'Task 2',
          description: 'Description 2',
          status: 'in_progress',
          priority: 2,
          estimated_hours: 16,
          worked_sum: 4.5,
          has_active_tracking: true,
          user_is_tracking: true,
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue(createMockResponse(mockTasks));

      const result = await timeTrackingService.getTasks();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/time-tracking/tasks');
      expect(result).toEqual(mockTasks);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no tasks exist', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(createMockResponse([]));

      const result = await timeTrackingService.getTasks();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should throw error when API call fails', async () => {
      const mockError = {
        response: {
          data: {
            detail: 'Failed to fetch tasks',
          },
        },
      };

      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(timeTrackingService.getTasks()).rejects.toThrow('Failed to fetch tasks');
    });

    it('should throw generic error when API returns unexpected error', async () => {
      const mockError = new Error('Network error');

      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(timeTrackingService.getTasks()).rejects.toThrow('Network error');
    });
  });

  /**
   * Test startTracking() API call and error handling
   * Requirements: 12.1, 12.2, 12.3, 12.4
   */
  describe('startTracking()', () => {
    it('should start tracking successfully with description', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-01T10:00:00Z',
        description: 'Working on feature',
      };

      vi.mocked(apiClient.post).mockResolvedValue(createMockResponse(mockActiveTracking));

      const result = await timeTrackingService.startTracking('task-1', 'Working on feature');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/time-tracking/start', {
        task_id: 'task-1',
        description: 'Working on feature',
      });
      expect(result).toEqual(mockActiveTracking);
    });

    it('should start tracking successfully without description', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-01T10:00:00Z',
        description: '',
      };

      vi.mocked(apiClient.post).mockResolvedValue(createMockResponse(mockActiveTracking));

      const result = await timeTrackingService.startTracking('task-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/time-tracking/start', {
        task_id: 'task-1',
      });
      expect(result).toEqual(mockActiveTracking);
    });

    it('should throw error when starting tracking fails', async () => {
      const mockError = {
        response: {
          data: {
            detail: 'You already have an active tracking session',
          },
        },
      };

      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(
        timeTrackingService.startTracking('task-1', 'Working on feature')
      ).rejects.toThrow('You already have an active tracking session');
    });

    it('should throw error when task not found', async () => {
      const mockError = {
        response: {
          data: {
            detail: 'Task not found',
          },
        },
      };

      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(timeTrackingService.startTracking('invalid-task-id')).rejects.toThrow(
        'Task not found'
      );
    });
  });

  /**
   * Test stopTracking() API call and error handling
   * Requirements: 12.1, 12.2, 12.3, 12.4
   */
  describe('stopTracking()', () => {
    it('should stop tracking successfully with description', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(createMockResponse(null));

      await timeTrackingService.stopTracking('Completed feature implementation');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/time-tracking/stop', {
        description: 'Completed feature implementation',
      });
    });

    it('should stop tracking successfully without description', async () => {
      vi.mocked(apiClient.post).mockResolvedValue(createMockResponse(null));

      await timeTrackingService.stopTracking();

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/time-tracking/stop', {});
    });

    it('should throw error when no active tracking exists', async () => {
      const mockError = {
        response: {
          data: {
            detail: 'No active tracking session found',
          },
        },
      };

      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(timeTrackingService.stopTracking()).rejects.toThrow(
        'No active tracking session found'
      );
    });

    it('should throw error when stop tracking fails', async () => {
      const mockError = new Error('Network error');

      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(timeTrackingService.stopTracking('Description')).rejects.toThrow(
        'Network error'
      );
    });
  });

  /**
   * Test getActiveTracking() API call
   * Requirements: 12.1, 12.2, 12.3, 12.4
   */
  describe('getActiveTracking()', () => {
    it('should return active tracking when it exists', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-01T10:00:00Z',
        description: 'Working on feature',
      };

      vi.mocked(apiClient.get).mockResolvedValue(createMockResponse(mockActiveTracking));

      const result = await timeTrackingService.getActiveTracking();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/time-tracking/active');
      expect(result).toEqual(mockActiveTracking);
    });

    it('should return null when no active tracking exists', async () => {
      vi.mocked(apiClient.get).mockResolvedValue(createMockResponse(null));

      const result = await timeTrackingService.getActiveTracking();

      expect(result).toBeNull();
    });

    it('should throw error when API call fails', async () => {
      const mockError = {
        response: {
          data: {
            detail: 'Failed to get active tracking',
          },
        },
      };

      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(timeTrackingService.getActiveTracking()).rejects.toThrow(
        'Failed to get active tracking'
      );
    });
  });

  /**
   * Test getEntries() API call with pagination
   * Requirements: 12.1, 12.2, 12.3, 12.4
   */
  describe('getEntries()', () => {
    it('should fetch entries successfully without pagination params', async () => {
      const mockResponse: TimeEntriesResponse = {
        entries: [
          {
            id: 'entry-1',
            task_id: 'task-1',
            task_title: 'Task 1',
            start_time: '2024-01-01T10:00:00Z',
            end_time: '2024-01-01T12:00:00Z',
            duration_hours: 2,
            description: 'Worked on feature',
            created_at: '2024-01-01T12:00:00Z',
          },
        ],
        total: 1,
        skip: 0,
        limit: 10,
      };

      vi.mocked(apiClient.get).mockResolvedValue(createMockResponse(mockResponse));

      const result = await timeTrackingService.getEntries();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/time-tracking/entries');
      expect(result).toEqual(mockResponse);
      expect(result.entries).toHaveLength(1);
    });

    it('should fetch entries with pagination params', async () => {
      const mockResponse: TimeEntriesResponse = {
        entries: [
          {
            id: 'entry-2',
            task_id: 'task-2',
            task_title: 'Task 2',
            start_time: '2024-01-02T10:00:00Z',
            end_time: '2024-01-02T11:30:00Z',
            duration_hours: 1.5,
            description: 'Fixed bug',
            created_at: '2024-01-02T11:30:00Z',
          },
        ],
        total: 20,
        skip: 10,
        limit: 10,
      };

      vi.mocked(apiClient.get).mockResolvedValue(createMockResponse(mockResponse));

      const result = await timeTrackingService.getEntries({ skip: 10, limit: 10 });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/v1/time-tracking/entries?skip=10&limit=10'
      );
      expect(result).toEqual(mockResponse);
      expect(result.skip).toBe(10);
      expect(result.limit).toBe(10);
    });

    it('should return empty entries array when no entries exist', async () => {
      const mockResponse: TimeEntriesResponse = {
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      };

      vi.mocked(apiClient.get).mockResolvedValue(createMockResponse(mockResponse));

      const result = await timeTrackingService.getEntries();

      expect(result.entries).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should throw error when API call fails', async () => {
      const mockError = {
        response: {
          data: {
            detail: 'Failed to fetch time entries',
          },
        },
      };

      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(timeTrackingService.getEntries()).rejects.toThrow(
        'Failed to fetch time entries'
      );
    });

    it('should handle pagination with skip=0', async () => {
      const mockResponse: TimeEntriesResponse = {
        entries: [],
        total: 0,
        skip: 0,
        limit: 20,
      };

      vi.mocked(apiClient.get).mockResolvedValue(createMockResponse(mockResponse));

      const result = await timeTrackingService.getEntries({ skip: 0, limit: 20 });

      expect(apiClient.get).toHaveBeenCalledWith(
        '/api/v1/time-tracking/entries?skip=0&limit=20'
      );
      expect(result.skip).toBe(0);
      expect(result.limit).toBe(20);
    });
  });

  /**
   * Test error handling patterns
   * Requirements: 12.4
   */
  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');

      vi.mocked(apiClient.get).mockRejectedValue(networkError);

      await expect(timeTrackingService.getTasks()).rejects.toThrow('Network Error');
    });

    it('should handle 401 unauthorized errors', async () => {
      const authError = {
        response: {
          status: 401,
          data: {
            detail: 'Unauthorized',
          },
        },
      };

      vi.mocked(apiClient.get).mockRejectedValue(authError);

      await expect(timeTrackingService.getTasks()).rejects.toThrow('Unauthorized');
    });

    it('should handle 404 not found errors', async () => {
      const notFoundError = {
        response: {
          status: 404,
          data: {
            detail: 'Task not found',
          },
        },
      };

      vi.mocked(apiClient.post).mockRejectedValue(notFoundError);

      await expect(timeTrackingService.startTracking('invalid-id')).rejects.toThrow(
        'Task not found'
      );
    });

    it('should handle 500 server errors', async () => {
      const serverError = {
        response: {
          status: 500,
          data: {
            detail: 'Internal server error',
          },
        },
      };

      vi.mocked(apiClient.get).mockRejectedValue(serverError);

      await expect(timeTrackingService.getActiveTracking()).rejects.toThrow(
        'Internal server error'
      );
    });
  });
});

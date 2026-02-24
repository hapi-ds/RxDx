/**
 * Unit tests for timeTrackingStore
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useTimeTrackingStore } from './timeTrackingStore';
import {
  timeTrackingService,
  type Task,
  type ActiveTracking,
  type TimeEntry,
  type TimeEntriesResponse,
} from '../services/timeTrackingService';

// Mock the timeTrackingService
vi.mock('../services/timeTrackingService', () => ({
  timeTrackingService: {
    getTasks: vi.fn(),
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
    getActiveTracking: vi.fn(),
    getEntries: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('timeTrackingStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTimeTrackingStore.getState().reset();
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  describe('getFilteredAndSortedTasks', () => {
    it('returns all tasks when search query is empty', () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: 'Description 1',
          status: 'in_progress',
          priority: 1,
          estimated_hours: 5,
          worked_sum: 2.5,
          has_active_tracking: false,
          user_is_tracking: false,
        },
        {
          id: '2',
          title: 'Task 2',
          description: 'Description 2',
          status: 'not_started',
          priority: 2,
          estimated_hours: 3,
          worked_sum: 0,
          has_active_tracking: false,
          user_is_tracking: false,
        },
      ];

      useTimeTrackingStore.setState({ tasks: mockTasks, searchQuery: '' });

      const result = useTimeTrackingStore.getState().getFilteredAndSortedTasks();

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockTasks);
    });

    it('filters tasks by title (case-insensitive)', () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Authentication System',
          description: 'Build auth',
          status: 'in_progress',
          priority: 1,
          estimated_hours: 5,
          worked_sum: 2.5,
          has_active_tracking: false,
          user_is_tracking: false,
        },
        {
          id: '2',
          title: 'Database Schema',
          description: 'Design schema',
          status: 'not_started',
          priority: 2,
          estimated_hours: 3,
          worked_sum: 0,
          has_active_tracking: false,
          user_is_tracking: false,
        },
      ];

      useTimeTrackingStore.setState({ tasks: mockTasks, searchQuery: 'auth' });

      const result = useTimeTrackingStore.getState().getFilteredAndSortedTasks();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Authentication System');
    });

    it('filters tasks by description (case-insensitive)', () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: 'Implement authentication',
          status: 'in_progress',
          priority: 1,
          estimated_hours: 5,
          worked_sum: 2.5,
          has_active_tracking: false,
          user_is_tracking: false,
        },
        {
          id: '2',
          title: 'Task 2',
          description: 'Design database',
          status: 'not_started',
          priority: 2,
          estimated_hours: 3,
          worked_sum: 0,
          has_active_tracking: false,
          user_is_tracking: false,
        },
      ];

      useTimeTrackingStore.setState({ tasks: mockTasks, searchQuery: 'database' });

      const result = useTimeTrackingStore.getState().getFilteredAndSortedTasks();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Task 2');
    });

    it('returns empty array when no tasks match search query', () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: 'Description 1',
          status: 'in_progress',
          priority: 1,
          estimated_hours: 5,
          worked_sum: 2.5,
          has_active_tracking: false,
          user_is_tracking: false,
        },
      ];

      useTimeTrackingStore.setState({ tasks: mockTasks, searchQuery: 'nonexistent' });

      const result = useTimeTrackingStore.getState().getFilteredAndSortedTasks();

      expect(result).toHaveLength(0);
    });

    it('sorts tasks with user_is_tracking first', () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: 'Description 1',
          status: 'in_progress',
          priority: 1,
          estimated_hours: 5,
          worked_sum: 2.5,
          has_active_tracking: false,
          user_is_tracking: false,
        },
        {
          id: '2',
          title: 'Task 2',
          description: 'Description 2',
          status: 'in_progress',
          priority: 2,
          estimated_hours: 3,
          worked_sum: 1.0,
          has_active_tracking: true,
          user_is_tracking: true,
        },
        {
          id: '3',
          title: 'Task 3',
          description: 'Description 3',
          status: 'not_started',
          priority: 3,
          estimated_hours: 2,
          worked_sum: 0,
          has_active_tracking: false,
          user_is_tracking: false,
        },
      ];

      useTimeTrackingStore.setState({ tasks: mockTasks, searchQuery: '' });

      const result = useTimeTrackingStore.getState().getFilteredAndSortedTasks();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('2'); // user_is_tracking task first
      expect(result[0].user_is_tracking).toBe(true);
    });

    it('sorts scheduled tasks before unscheduled tasks', () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: 'Description 1',
          status: 'not_started',
          priority: 1,
          estimated_hours: 5,
          worked_sum: 0,
          has_active_tracking: false,
          user_is_tracking: false,
        },
        {
          id: '2',
          title: 'Task 2',
          description: 'Description 2',
          status: 'not_started',
          priority: 2,
          estimated_hours: 3,
          worked_sum: 0,
          scheduled_start: '2024-01-15T09:00:00Z',
          has_active_tracking: false,
          user_is_tracking: false,
        },
      ];

      useTimeTrackingStore.setState({ tasks: mockTasks, searchQuery: '' });

      const result = useTimeTrackingStore.getState().getFilteredAndSortedTasks();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2'); // scheduled task first
      expect(result[0].scheduled_start).toBeDefined();
    });

    it('sorts scheduled tasks by date (earlier first)', () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: 'Description 1',
          status: 'not_started',
          priority: 1,
          estimated_hours: 5,
          worked_sum: 0,
          scheduled_start: '2024-01-20T09:00:00Z',
          has_active_tracking: false,
          user_is_tracking: false,
        },
        {
          id: '2',
          title: 'Task 2',
          description: 'Description 2',
          status: 'not_started',
          priority: 2,
          estimated_hours: 3,
          worked_sum: 0,
          scheduled_start: '2024-01-15T09:00:00Z',
          has_active_tracking: false,
          user_is_tracking: false,
        },
      ];

      useTimeTrackingStore.setState({ tasks: mockTasks, searchQuery: '' });

      const result = useTimeTrackingStore.getState().getFilteredAndSortedTasks();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2'); // earlier scheduled task first
      expect(result[1].id).toBe('1');
    });

    it('applies correct priority order: tracking > scheduled > other', () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Other Task',
          description: 'No schedule, not tracking',
          status: 'not_started',
          priority: 1,
          estimated_hours: 5,
          worked_sum: 0,
          has_active_tracking: false,
          user_is_tracking: false,
        },
        {
          id: '2',
          title: 'Scheduled Task',
          description: 'Has schedule',
          status: 'not_started',
          priority: 2,
          estimated_hours: 3,
          worked_sum: 0,
          scheduled_start: '2024-01-15T09:00:00Z',
          has_active_tracking: false,
          user_is_tracking: false,
        },
        {
          id: '3',
          title: 'Tracking Task',
          description: 'User is tracking',
          status: 'in_progress',
          priority: 3,
          estimated_hours: 2,
          worked_sum: 1.0,
          has_active_tracking: true,
          user_is_tracking: true,
        },
      ];

      useTimeTrackingStore.setState({ tasks: mockTasks, searchQuery: '' });

      const result = useTimeTrackingStore.getState().getFilteredAndSortedTasks();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe('3'); // tracking task first
      expect(result[1].id).toBe('2'); // scheduled task second
      expect(result[2].id).toBe('1'); // other task last
    });

    it('filters and sorts tasks correctly', () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Authentication System',
          description: 'Build auth',
          status: 'not_started',
          priority: 1,
          estimated_hours: 5,
          worked_sum: 0,
          has_active_tracking: false,
          user_is_tracking: false,
        },
        {
          id: '2',
          title: 'Authentication API',
          description: 'API endpoints',
          status: 'not_started',
          priority: 2,
          estimated_hours: 3,
          worked_sum: 0,
          scheduled_start: '2024-01-15T09:00:00Z',
          has_active_tracking: false,
          user_is_tracking: false,
        },
        {
          id: '3',
          title: 'Database Schema',
          description: 'Design schema',
          status: 'not_started',
          priority: 3,
          estimated_hours: 2,
          worked_sum: 0,
          has_active_tracking: false,
          user_is_tracking: false,
        },
      ];

      useTimeTrackingStore.setState({ tasks: mockTasks, searchQuery: 'auth' });

      const result = useTimeTrackingStore.getState().getFilteredAndSortedTasks();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('2'); // scheduled auth task first
      expect(result[1].id).toBe('1'); // unscheduled auth task second
    });

    it('handles empty tasks array', () => {
      useTimeTrackingStore.setState({ tasks: [], searchQuery: '' });

      const result = useTimeTrackingStore.getState().getFilteredAndSortedTasks();

      expect(result).toHaveLength(0);
    });

    it('handles whitespace-only search query', () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: 'Description 1',
          status: 'in_progress',
          priority: 1,
          estimated_hours: 5,
          worked_sum: 2.5,
          has_active_tracking: false,
          user_is_tracking: false,
        },
      ];

      useTimeTrackingStore.setState({ tasks: mockTasks, searchQuery: '   ' });

      const result = useTimeTrackingStore.getState().getFilteredAndSortedTasks();

      expect(result).toHaveLength(1);
      expect(result).toEqual(mockTasks);
    });
  });

  describe('setSearchQuery', () => {
    it('updates search query state', () => {
      useTimeTrackingStore.getState().setSearchQuery('test query');

      expect(useTimeTrackingStore.getState().searchQuery).toBe('test query');
    });

    it('updates search query to empty string', () => {
      useTimeTrackingStore.setState({ searchQuery: 'previous query' });
      useTimeTrackingStore.getState().setSearchQuery('');

      expect(useTimeTrackingStore.getState().searchQuery).toBe('');
    });
  });

  describe('selectTask', () => {
    it('updates selected task ID', () => {
      useTimeTrackingStore.getState().selectTask('task-123');

      expect(useTimeTrackingStore.getState().selectedTaskId).toBe('task-123');
    });

    it('clears selected task when null is passed', () => {
      useTimeTrackingStore.setState({ selectedTaskId: 'task-123' });
      useTimeTrackingStore.getState().selectTask(null);

      expect(useTimeTrackingStore.getState().selectedTaskId).toBeNull();
    });
  });

  // ============================================================================
  // Async Actions Tests
  // ============================================================================

  describe('fetchTasks', () => {
    it('fetches tasks successfully and updates state', async () => {
      const mockTasks: Task[] = [
        {
          id: '1',
          title: 'Task 1',
          description: 'Description 1',
          status: 'in_progress',
          priority: 1,
          estimated_hours: 5,
          worked_sum: 2.5,
          has_active_tracking: false,
          user_is_tracking: false,
        },
      ];

      vi.mocked(timeTrackingService.getTasks).mockResolvedValue(mockTasks);

      await useTimeTrackingStore.getState().fetchTasks();

      expect(timeTrackingService.getTasks).toHaveBeenCalledTimes(1);
      expect(useTimeTrackingStore.getState().tasks).toEqual(mockTasks);
      expect(useTimeTrackingStore.getState().isLoadingTasks).toBe(false);
      expect(useTimeTrackingStore.getState().error).toBeNull();
    });

    it('sets loading state while fetching', async () => {
      const mockTasks: Task[] = [];
      vi.mocked(timeTrackingService.getTasks).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockTasks), 100);
          })
      );

      const fetchPromise = useTimeTrackingStore.getState().fetchTasks();
      expect(useTimeTrackingStore.getState().isLoadingTasks).toBe(true);

      await fetchPromise;
      expect(useTimeTrackingStore.getState().isLoadingTasks).toBe(false);
    });

    it('handles fetch error and sets error state', async () => {
      const errorMessage = 'Network error';
      vi.mocked(timeTrackingService.getTasks).mockRejectedValue(new Error(errorMessage));

      await useTimeTrackingStore.getState().fetchTasks();

      expect(useTimeTrackingStore.getState().error).toBe(errorMessage);
      expect(useTimeTrackingStore.getState().isLoadingTasks).toBe(false);
      expect(useTimeTrackingStore.getState().tasks).toEqual([]);
    });
  });

  describe('startTracking', () => {
    it('starts tracking successfully and updates state', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working on feature',
      };

      vi.mocked(timeTrackingService.startTracking).mockResolvedValue(mockActiveTracking);

      await useTimeTrackingStore.getState().startTracking('task-1', 'Working on feature');

      expect(timeTrackingService.startTracking).toHaveBeenCalledWith('task-1', 'Working on feature');
      expect(useTimeTrackingStore.getState().activeTracking).toEqual(mockActiveTracking);
      expect(useTimeTrackingStore.getState().isStarting).toBe(false);
      expect(useTimeTrackingStore.getState().error).toBeNull();
    });

    it('persists active tracking to localStorage', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working on feature',
      };

      vi.mocked(timeTrackingService.startTracking).mockResolvedValue(mockActiveTracking);

      await useTimeTrackingStore.getState().startTracking('task-1', 'Working on feature');

      const stored = localStorage.getItem('activeTracking');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(mockActiveTracking);
    });

    it('prevents starting when already tracking', async () => {
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Existing Task',
        start_time: '2024-01-15T09:00:00Z',
        description: 'Already tracking',
      };

      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      await useTimeTrackingStore.getState().startTracking('task-2', 'New task');

      expect(timeTrackingService.startTracking).not.toHaveBeenCalled();
      expect(useTimeTrackingStore.getState().error).toBe('You already have an active tracking session');
      expect(useTimeTrackingStore.getState().activeTracking).toEqual(existingTracking);
    });

    it('handles start tracking error', async () => {
      const errorMessage = 'Failed to start tracking';
      vi.mocked(timeTrackingService.startTracking).mockRejectedValue(new Error(errorMessage));

      await expect(
        useTimeTrackingStore.getState().startTracking('task-1', 'Description')
      ).rejects.toThrow(errorMessage);

      expect(useTimeTrackingStore.getState().error).toBe(errorMessage);
      expect(useTimeTrackingStore.getState().isStarting).toBe(false);
      expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
    });

    it('sets loading state while starting', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      vi.mocked(timeTrackingService.startTracking).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockActiveTracking), 100);
          })
      );

      const startPromise = useTimeTrackingStore.getState().startTracking('task-1', 'Working');
      expect(useTimeTrackingStore.getState().isStarting).toBe(true);

      await startPromise;
      expect(useTimeTrackingStore.getState().isStarting).toBe(false);
    });
  });

  describe('stopTracking', () => {
    it('stops tracking successfully and clears state', async () => {
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      useTimeTrackingStore.setState({ activeTracking: existingTracking });
      vi.mocked(timeTrackingService.stopTracking).mockResolvedValue(undefined);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      await useTimeTrackingStore.getState().stopTracking('Completed work');

      expect(timeTrackingService.stopTracking).toHaveBeenCalledWith('Completed work');
      expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
      expect(useTimeTrackingStore.getState().isStopping).toBe(false);
      expect(useTimeTrackingStore.getState().error).toBeNull();
    });

    it('removes active tracking from localStorage', async () => {
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      localStorage.setItem('activeTracking', JSON.stringify(existingTracking));
      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      vi.mocked(timeTrackingService.stopTracking).mockResolvedValue(undefined);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      await useTimeTrackingStore.getState().stopTracking('Done');

      expect(localStorage.getItem('activeTracking')).toBeNull();
    });

    it('refreshes entries after stopping', async () => {
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      const mockEntries: TimeEntry[] = [
        {
          id: 'entry-1',
          task_id: 'task-1',
          task_title: 'Test Task',
          start_time: '2024-01-15T10:00:00Z',
          end_time: '2024-01-15T11:00:00Z',
          duration_hours: 1,
          description: 'Completed work',
          created_at: '2024-01-15T11:00:00Z',
        },
      ];

      vi.mocked(timeTrackingService.stopTracking).mockResolvedValue(undefined);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: mockEntries,
        total: 1,
        skip: 0,
        limit: 10,
      });

      await useTimeTrackingStore.getState().stopTracking('Completed work');

      expect(timeTrackingService.getEntries).toHaveBeenCalled();
    });

    it('handles stop tracking error', async () => {
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      const errorMessage = 'Failed to stop tracking';
      vi.mocked(timeTrackingService.stopTracking).mockRejectedValue(new Error(errorMessage));

      await expect(useTimeTrackingStore.getState().stopTracking('Done')).rejects.toThrow(
        errorMessage
      );

      expect(useTimeTrackingStore.getState().error).toBe(errorMessage);
      expect(useTimeTrackingStore.getState().isStopping).toBe(false);
      expect(useTimeTrackingStore.getState().activeTracking).toEqual(existingTracking);
    });

    it('sets loading state while stopping', async () => {
      const existingTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      useTimeTrackingStore.setState({ activeTracking: existingTracking });

      vi.mocked(timeTrackingService.stopTracking).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(undefined), 100);
          })
      );
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      const stopPromise = useTimeTrackingStore.getState().stopTracking('Done');
      expect(useTimeTrackingStore.getState().isStopping).toBe(true);

      await stopPromise;
      expect(useTimeTrackingStore.getState().isStopping).toBe(false);
    });
  });

  describe('checkActiveTracking', () => {
    it('updates state with active tracking from API', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(mockActiveTracking);

      await useTimeTrackingStore.getState().checkActiveTracking();

      expect(timeTrackingService.getActiveTracking).toHaveBeenCalledTimes(1);
      expect(useTimeTrackingStore.getState().activeTracking).toEqual(mockActiveTracking);
    });

    it('persists active tracking to localStorage when found', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(mockActiveTracking);

      await useTimeTrackingStore.getState().checkActiveTracking();

      const stored = localStorage.getItem('activeTracking');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(mockActiveTracking);
    });

    it('clears state and localStorage when no active tracking', async () => {
      localStorage.setItem('activeTracking', JSON.stringify({ id: 'old' }));
      useTimeTrackingStore.setState({
        activeTracking: {
          id: 'old',
          task_id: 'task-1',
          task_title: 'Old',
          start_time: '2024-01-15T09:00:00Z',
          description: 'Old',
        },
      });

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

      await useTimeTrackingStore.getState().checkActiveTracking();

      expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
      expect(localStorage.getItem('activeTracking')).toBeNull();
    });

    it('handles check active tracking error', async () => {
      const errorMessage = 'Failed to check active tracking';
      vi.mocked(timeTrackingService.getActiveTracking).mockRejectedValue(
        new Error(errorMessage)
      );

      await useTimeTrackingStore.getState().checkActiveTracking();

      expect(useTimeTrackingStore.getState().error).toBe(errorMessage);
    });
  });

  describe('fetchEntries', () => {
    it('fetches entries successfully and updates state', async () => {
      const mockEntries: TimeEntry[] = [
        {
          id: 'entry-1',
          task_id: 'task-1',
          task_title: 'Test Task',
          start_time: '2024-01-15T10:00:00Z',
          end_time: '2024-01-15T11:00:00Z',
          duration_hours: 1,
          description: 'Work done',
          created_at: '2024-01-15T11:00:00Z',
        },
      ];

      const mockResponse: TimeEntriesResponse = {
        entries: mockEntries,
        total: 1,
        skip: 0,
        limit: 10,
      };

      vi.mocked(timeTrackingService.getEntries).mockResolvedValue(mockResponse);

      await useTimeTrackingStore.getState().fetchEntries();

      expect(timeTrackingService.getEntries).toHaveBeenCalledWith({ skip: 0, limit: 10 });
      expect(useTimeTrackingStore.getState().entries).toEqual(mockEntries);
      expect(useTimeTrackingStore.getState().entriesPage).toBe(1);
      expect(useTimeTrackingStore.getState().entriesHasMore).toBe(false);
      expect(useTimeTrackingStore.getState().isLoadingEntries).toBe(false);
    });

    it('sets hasMore to true when more entries available', async () => {
      const mockEntries: TimeEntry[] = Array.from({ length: 10 }, (_, i) => ({
        id: `entry-${i}`,
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        end_time: '2024-01-15T11:00:00Z',
        duration_hours: 1,
        description: 'Work',
        created_at: '2024-01-15T11:00:00Z',
      }));

      const mockResponse: TimeEntriesResponse = {
        entries: mockEntries,
        total: 25,
        skip: 0,
        limit: 10,
      };

      vi.mocked(timeTrackingService.getEntries).mockResolvedValue(mockResponse);

      await useTimeTrackingStore.getState().fetchEntries();

      expect(useTimeTrackingStore.getState().entriesHasMore).toBe(true);
    });

    it('handles fetch entries error', async () => {
      const errorMessage = 'Failed to fetch entries';
      vi.mocked(timeTrackingService.getEntries).mockRejectedValue(new Error(errorMessage));

      await useTimeTrackingStore.getState().fetchEntries();

      expect(useTimeTrackingStore.getState().error).toBe(errorMessage);
      expect(useTimeTrackingStore.getState().isLoadingEntries).toBe(false);
    });

    it('resets page to 0 on fetch', async () => {
      useTimeTrackingStore.setState({ entriesPage: 5 });

      const mockResponse: TimeEntriesResponse = {
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      };

      vi.mocked(timeTrackingService.getEntries).mockResolvedValue(mockResponse);

      await useTimeTrackingStore.getState().fetchEntries();

      expect(useTimeTrackingStore.getState().entriesPage).toBe(1);
    });
  });

  describe('loadMoreEntries', () => {
    it('loads more entries and appends to existing', async () => {
      const existingEntries: TimeEntry[] = [
        {
          id: 'entry-1',
          task_id: 'task-1',
          task_title: 'Task 1',
          start_time: '2024-01-15T10:00:00Z',
          end_time: '2024-01-15T11:00:00Z',
          duration_hours: 1,
          description: 'Work 1',
          created_at: '2024-01-15T11:00:00Z',
        },
      ];

      const newEntries: TimeEntry[] = [
        {
          id: 'entry-2',
          task_id: 'task-2',
          task_title: 'Task 2',
          start_time: '2024-01-14T10:00:00Z',
          end_time: '2024-01-14T11:00:00Z',
          duration_hours: 1,
          description: 'Work 2',
          created_at: '2024-01-14T11:00:00Z',
        },
      ];

      useTimeTrackingStore.setState({ entries: existingEntries, entriesPage: 1 });

      const mockResponse: TimeEntriesResponse = {
        entries: newEntries,
        total: 2,
        skip: 10,
        limit: 10,
      };

      vi.mocked(timeTrackingService.getEntries).mockResolvedValue(mockResponse);

      await useTimeTrackingStore.getState().loadMoreEntries();

      expect(timeTrackingService.getEntries).toHaveBeenCalledWith({ skip: 10, limit: 10 });
      expect(useTimeTrackingStore.getState().entries).toEqual([...existingEntries, ...newEntries]);
      expect(useTimeTrackingStore.getState().entriesPage).toBe(2);
    });

    it('updates hasMore correctly when more entries available', async () => {
      useTimeTrackingStore.setState({ entries: [], entriesPage: 1 });

      const mockResponse: TimeEntriesResponse = {
        entries: Array.from({ length: 10 }, (_, i) => ({
          id: `entry-${i}`,
          task_id: 'task-1',
          task_title: 'Task',
          start_time: '2024-01-15T10:00:00Z',
          end_time: '2024-01-15T11:00:00Z',
          duration_hours: 1,
          description: 'Work',
          created_at: '2024-01-15T11:00:00Z',
        })),
        total: 25,
        skip: 10,
        limit: 10,
      };

      vi.mocked(timeTrackingService.getEntries).mockResolvedValue(mockResponse);

      await useTimeTrackingStore.getState().loadMoreEntries();

      expect(useTimeTrackingStore.getState().entriesHasMore).toBe(true);
    });

    it('sets hasMore to false when no more entries', async () => {
      useTimeTrackingStore.setState({ entries: [], entriesPage: 2 });

      const mockResponse: TimeEntriesResponse = {
        entries: [],
        total: 20,
        skip: 20,
        limit: 10,
      };

      vi.mocked(timeTrackingService.getEntries).mockResolvedValue(mockResponse);

      await useTimeTrackingStore.getState().loadMoreEntries();

      expect(useTimeTrackingStore.getState().entriesHasMore).toBe(false);
    });

    it('handles load more error', async () => {
      useTimeTrackingStore.setState({ entries: [], entriesPage: 1 });

      const errorMessage = 'Failed to load more entries';
      vi.mocked(timeTrackingService.getEntries).mockRejectedValue(new Error(errorMessage));

      await useTimeTrackingStore.getState().loadMoreEntries();

      expect(useTimeTrackingStore.getState().error).toBe(errorMessage);
      expect(useTimeTrackingStore.getState().isLoadingEntries).toBe(false);
    });
  });

  // ============================================================================
  // localStorage Persistence Tests
  // ============================================================================

  describe('localStorage persistence', () => {
    it('persists active tracking on start', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      vi.mocked(timeTrackingService.startTracking).mockResolvedValue(mockActiveTracking);

      await useTimeTrackingStore.getState().startTracking('task-1', 'Working');

      const stored = localStorage.getItem('activeTracking');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(mockActiveTracking);
    });

    it('removes active tracking from localStorage on stop', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      localStorage.setItem('activeTracking', JSON.stringify(mockActiveTracking));
      useTimeTrackingStore.setState({ activeTracking: mockActiveTracking });

      vi.mocked(timeTrackingService.stopTracking).mockResolvedValue(undefined);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      await useTimeTrackingStore.getState().stopTracking('Done');

      expect(localStorage.getItem('activeTracking')).toBeNull();
    });

    it('updates localStorage when checking active tracking', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(mockActiveTracking);

      await useTimeTrackingStore.getState().checkActiveTracking();

      const stored = localStorage.getItem('activeTracking');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(mockActiveTracking);
    });

    it('clears localStorage when no active tracking found', async () => {
      localStorage.setItem('activeTracking', JSON.stringify({ id: 'old' }));

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

      await useTimeTrackingStore.getState().checkActiveTracking();

      expect(localStorage.getItem('activeTracking')).toBeNull();
    });

    it('does not persist to localStorage on start error', async () => {
      vi.mocked(timeTrackingService.startTracking).mockRejectedValue(
        new Error('Start failed')
      );

      await expect(
        useTimeTrackingStore.getState().startTracking('task-1', 'Working')
      ).rejects.toThrow();

      expect(localStorage.getItem('activeTracking')).toBeNull();
    });

    it('does not clear localStorage on stop error', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      localStorage.setItem('activeTracking', JSON.stringify(mockActiveTracking));
      useTimeTrackingStore.setState({ activeTracking: mockActiveTracking });

      vi.mocked(timeTrackingService.stopTracking).mockRejectedValue(new Error('Stop failed'));

      await expect(useTimeTrackingStore.getState().stopTracking('Done')).rejects.toThrow();

      const stored = localStorage.getItem('activeTracking');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(mockActiveTracking);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('error handling', () => {
    it('clearError clears error state', () => {
      useTimeTrackingStore.setState({ error: 'Some error' });

      useTimeTrackingStore.getState().clearError();

      expect(useTimeTrackingStore.getState().error).toBeNull();
    });

    it('clears previous error on new fetchTasks', async () => {
      useTimeTrackingStore.setState({ error: 'Previous error' });

      vi.mocked(timeTrackingService.getTasks).mockResolvedValue([]);

      await useTimeTrackingStore.getState().fetchTasks();

      expect(useTimeTrackingStore.getState().error).toBeNull();
    });

    it('clears previous error on new startTracking', async () => {
      useTimeTrackingStore.setState({ error: 'Previous error' });

      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      vi.mocked(timeTrackingService.startTracking).mockResolvedValue(mockActiveTracking);

      await useTimeTrackingStore.getState().startTracking('task-1', 'Working');

      expect(useTimeTrackingStore.getState().error).toBeNull();
    });

    it('handles non-Error objects in fetchTasks', async () => {
      vi.mocked(timeTrackingService.getTasks).mockRejectedValue('String error');

      await useTimeTrackingStore.getState().fetchTasks();

      expect(useTimeTrackingStore.getState().error).toBe('Failed to fetch tasks');
    });

    it('handles non-Error objects in startTracking', async () => {
      vi.mocked(timeTrackingService.startTracking).mockRejectedValue('String error');

      await expect(
        useTimeTrackingStore.getState().startTracking('task-1', 'Working')
      ).rejects.toBe('String error');

      expect(useTimeTrackingStore.getState().error).toBe('Failed to start tracking');
    });

    it('handles non-Error objects in stopTracking', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      useTimeTrackingStore.setState({ activeTracking: mockActiveTracking });

      vi.mocked(timeTrackingService.stopTracking).mockRejectedValue('String error');

      await expect(useTimeTrackingStore.getState().stopTracking('Done')).rejects.toBe(
        'String error'
      );

      expect(useTimeTrackingStore.getState().error).toBe('Failed to stop tracking');
    });
  });
});

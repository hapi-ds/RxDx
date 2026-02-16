import TimeTrackingService from '../TimeTrackingService';
import apiService from '../ApiService';
import {Task, WorkedEntry} from '../../types';

// Mock API service
jest.mock('../ApiService', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('TimeTrackingService', () => {
  const mockTask: Task = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test description',
    status: 'active',
    priority: 1,
    scheduled_start: '2024-01-01T09:00:00Z',
    scheduled_end: '2024-01-01T17:00:00Z',
    worked_sum: '2h 30m',
    has_active_tracking: false,
  };

  const mockWorkedEntry: WorkedEntry = {
    id: 'worked-123',
    resource: 'user-123',
    task_id: 'task-123',
    date: '2024-01-01',
    start_time: '09:00:00',
    end_time: null,
    description: 'Working on feature',
    created_at: '2024-01-01T09:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('startTracking', () => {
    it('should start tracking without description', async () => {
      (apiService.post as jest.Mock).mockResolvedValueOnce(mockWorkedEntry);

      const result = await TimeTrackingService.startTracking('task-123');

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/v1/time-tracking/start',
        {
          task_id: 'task-123',
        },
      );
      expect(result).toEqual(mockWorkedEntry);
    });

    it('should start tracking with description', async () => {
      (apiService.post as jest.Mock).mockResolvedValueOnce(mockWorkedEntry);

      const result = await TimeTrackingService.startTracking(
        'task-123',
        'Working on feature',
      );

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/v1/time-tracking/start',
        {
          task_id: 'task-123',
          description: 'Working on feature',
        },
      );
      expect(result).toEqual(mockWorkedEntry);
    });

    it('should throw error when start tracking fails', async () => {
      const error = new Error('API error');
      (apiService.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        TimeTrackingService.startTracking('task-123'),
      ).rejects.toThrow('API error');
    });
  });

  describe('stopTracking', () => {
    it('should stop tracking', async () => {
      const stoppedEntry = {...mockWorkedEntry, end_time: '17:00:00'};
      (apiService.post as jest.Mock).mockResolvedValueOnce(stoppedEntry);

      const result = await TimeTrackingService.stopTracking('worked-123');

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/v1/time-tracking/stop',
        {
          worked_id: 'worked-123',
        },
      );
      expect(result).toEqual(stoppedEntry);
    });

    it('should throw error when stop tracking fails', async () => {
      const error = new Error('API error');
      (apiService.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        TimeTrackingService.stopTracking('worked-123'),
      ).rejects.toThrow('API error');
    });
  });

  describe('getActiveTracking', () => {
    it('should get active tracking entries', async () => {
      const activeEntries = [mockWorkedEntry];
      (apiService.get as jest.Mock).mockResolvedValueOnce(activeEntries);

      const result = await TimeTrackingService.getActiveTracking();

      expect(apiService.get).toHaveBeenCalledWith(
        '/api/v1/time-tracking/active',
      );
      expect(result).toEqual(activeEntries);
    });

    it('should return empty array when no active tracking', async () => {
      (apiService.get as jest.Mock).mockResolvedValueOnce([]);

      const result = await TimeTrackingService.getActiveTracking();

      expect(result).toEqual([]);
    });

    it('should throw error when get active tracking fails', async () => {
      const error = new Error('API error');
      (apiService.get as jest.Mock).mockRejectedValueOnce(error);

      await expect(TimeTrackingService.getActiveTracking()).rejects.toThrow(
        'API error',
      );
    });
  });

  describe('getTasks', () => {
    it('should get tasks', async () => {
      const tasks = [mockTask];
      (apiService.get as jest.Mock).mockResolvedValueOnce(tasks);

      const result = await TimeTrackingService.getTasks();

      expect(apiService.get).toHaveBeenCalledWith(
        '/api/v1/time-tracking/tasks',
      );
      expect(result).toEqual(tasks);
    });

    it('should return empty array when no tasks', async () => {
      (apiService.get as jest.Mock).mockResolvedValueOnce([]);

      const result = await TimeTrackingService.getTasks();

      expect(result).toEqual([]);
    });

    it('should throw error when get tasks fails', async () => {
      const error = new Error('API error');
      (apiService.get as jest.Mock).mockRejectedValueOnce(error);

      await expect(TimeTrackingService.getTasks()).rejects.toThrow('API error');
    });
  });

  describe('getTaskWorkedSum', () => {
    it('should get task worked sum', async () => {
      (apiService.get as jest.Mock).mockResolvedValueOnce({worked_sum: 9000});

      const result = await TimeTrackingService.getTaskWorkedSum('task-123');

      expect(apiService.get).toHaveBeenCalledWith(
        '/api/v1/time-tracking/tasks/task-123/worked-sum',
      );
      expect(result).toBe(9000);
    });

    it('should throw error when get worked sum fails', async () => {
      const error = new Error('API error');
      (apiService.get as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        TimeTrackingService.getTaskWorkedSum('task-123'),
      ).rejects.toThrow('API error');
    });
  });
});

import apiService from './ApiService';
import {Task, WorkedEntry, StartTrackingRequest} from '../types';

/**
 * TimeTrackingService handles time tracking operations
 */
class TimeTrackingService {
  /**
   * Start time tracking for a task
   * @param taskId - Task ID
   * @param description - Optional description
   * @returns WorkedEntry object
   */
  async startTracking(
    taskId: string,
    description?: string,
  ): Promise<WorkedEntry> {
    try {
      const data: StartTrackingRequest = {
        task_id: taskId,
      };

      if (description) {
        data.description = description;
      }

      const response = await apiService.post<WorkedEntry>(
        '/api/v1/time-tracking/start',
        data,
      );

      return response;
    } catch (error) {
      console.error('Failed to start tracking:', error);
      throw error;
    }
  }

  /**
   * Stop time tracking
   * @param workedId - Worked entry ID
   * @returns Updated WorkedEntry object
   */
  async stopTracking(workedId: string): Promise<WorkedEntry> {
    try {
      const response = await apiService.post<WorkedEntry>(
        '/api/v1/time-tracking/stop',
        {
          worked_id: workedId,
        },
      );

      return response;
    } catch (error) {
      console.error('Failed to stop tracking:', error);
      throw error;
    }
  }

  /**
   * Get active tracking entries for the current user
   * @returns Array of active WorkedEntry objects
   */
  async getActiveTracking(): Promise<WorkedEntry[]> {
    try {
      const response = await apiService.get<WorkedEntry[]>(
        '/api/v1/time-tracking/active',
      );

      return response;
    } catch (error) {
      console.error('Failed to get active tracking:', error);
      throw error;
    }
  }

  /**
   * Get sorted task list
   * @returns Array of Task objects sorted by priority
   */
  async getTasks(): Promise<Task[]> {
    try {
      const response = await apiService.get<Task[]>(
        '/api/v1/time-tracking/tasks',
      );

      return response;
    } catch (error) {
      console.error('Failed to get tasks:', error);
      throw error;
    }
  }

  /**
   * Get worked sum for a task
   * @param taskId - Task ID
   * @returns Worked sum in seconds
   */
  async getTaskWorkedSum(taskId: string): Promise<number> {
    try {
      const response = await apiService.get<{worked_sum: number}>(
        `/api/v1/time-tracking/tasks/${taskId}/worked-sum`,
      );

      return response.worked_sum;
    } catch (error) {
      console.error('Failed to get task worked sum:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export default new TimeTrackingService();

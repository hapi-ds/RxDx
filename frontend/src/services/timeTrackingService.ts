/**
 * Time Tracking service
 * Handles all time tracking-related API calls
 */

import { apiClient, getErrorMessage } from './api';
import { logger } from './logger';

// ============================================================================
// Type Definitions
// ============================================================================

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  priority: number;
  estimated_hours: number;
  worked_sum: number; // Total hours worked (all users)
  assigned_to?: string;
  scheduled_start?: string; // ISO date
  scheduled_end?: string; // ISO date
  has_active_tracking: boolean; // True if any user is tracking
  user_is_tracking: boolean; // True if current user is tracking
}

export interface ActiveTracking {
  id: string;
  task_id: string;
  task_title: string;
  start_time: string; // ISO datetime
  description: string;
}

export interface TimeEntry {
  id: string;
  task_id: string;
  task_title: string;
  start_time: string; // ISO datetime
  end_time: string; // ISO datetime
  duration_hours: number;
  description: string;
  created_at: string; // ISO datetime
}

export interface StartTrackingRequest {
  task_id: string;
  description?: string;
}

export interface StopTrackingRequest {
  description?: string;
}

export interface TimeEntriesParams {
  skip?: number;
  limit?: number;
}

export interface TimeEntriesResponse {
  entries: TimeEntry[];
  total: number;
  skip: number;
  limit: number;
}

// ============================================================================
// Service Implementation
// ============================================================================

class TimeTrackingService {
  private readonly basePath = '/api/v1/time-tracking';

  /**
   * Get list of tasks available for time tracking
   * Tasks are returned sorted by relevance (active tracking > scheduled > others)
   */
  async getTasks(): Promise<Task[]> {
    try {
      logger.debug('Fetching time tracking tasks');
      const response = await apiClient.get<Task[]>(`${this.basePath}/tasks`);
      logger.info('Time tracking tasks fetched', {
        count: response.data.length,
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch time tracking tasks', {
        error,
        message: getErrorMessage(error),
      });
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Start time tracking for a task
   * @param taskId - UUID of the task to track
   * @param description - Optional description of work being performed
   */
  async startTracking(taskId: string, description?: string): Promise<ActiveTracking> {
    try {
      logger.debug('Starting time tracking', { taskId, hasDescription: !!description });
      
      const requestData: StartTrackingRequest = {
        task_id: taskId,
      };
      
      if (description) {
        requestData.description = description;
      }
      
      const response = await apiClient.post<ActiveTracking>(
        `${this.basePath}/start`,
        requestData
      );
      
      logger.info('Time tracking started', {
        trackingId: response.data.id,
        taskId: response.data.task_id,
        taskTitle: response.data.task_title,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to start time tracking', {
        taskId,
        error,
        message: getErrorMessage(error),
      });
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Stop active time tracking
   * @param description - Optional description to update/add
   */
  async stopTracking(description?: string): Promise<void> {
    try {
      logger.debug('Stopping time tracking', { hasDescription: !!description });
      
      const requestData: StopTrackingRequest = {};
      
      if (description) {
        requestData.description = description;
      }
      
      await apiClient.post(`${this.basePath}/stop`, requestData);
      
      logger.info('Time tracking stopped');
    } catch (error) {
      logger.error('Failed to stop time tracking', {
        error,
        message: getErrorMessage(error),
      });
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Get current active tracking session for the logged-in user
   * Returns null if no active tracking
   */
  async getActiveTracking(): Promise<ActiveTracking | null> {
    try {
      logger.debug('Checking for active tracking');
      const response = await apiClient.get<ActiveTracking | null>(
        `${this.basePath}/active`
      );
      
      if (response.data) {
        logger.info('Active tracking found', {
          trackingId: response.data.id,
          taskId: response.data.task_id,
          taskTitle: response.data.task_title,
        });
      } else {
        logger.debug('No active tracking found');
      }
      
      return response.data;
    } catch (error) {
      logger.error('Failed to get active tracking', {
        error,
        message: getErrorMessage(error),
      });
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Get time entry history for the logged-in user
   * @param params - Pagination parameters (skip, limit)
   */
  async getEntries(params?: TimeEntriesParams): Promise<TimeEntriesResponse> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params?.skip !== undefined) {
        queryParams.append('skip', params.skip.toString());
      }
      if (params?.limit !== undefined) {
        queryParams.append('limit', params.limit.toString());
      }
      
      const url = queryParams.toString()
        ? `${this.basePath}/entries?${queryParams.toString()}`
        : `${this.basePath}/entries`;
      
      logger.debug('Fetching time entries', {
        skip: params?.skip,
        limit: params?.limit,
      });
      
      const response = await apiClient.get<TimeEntriesResponse>(url);
      
      logger.info('Time entries fetched', {
        count: response.data.entries.length,
        total: response.data.total,
      });
      
      return response.data;
    } catch (error) {
      logger.error('Failed to fetch time entries', {
        error,
        message: getErrorMessage(error),
      });
      throw new Error(getErrorMessage(error));
    }
  }
}

export const timeTrackingService = new TimeTrackingService();

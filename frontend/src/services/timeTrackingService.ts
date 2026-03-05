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
      
      // Backend returns WorkedResponse with date + from (time only)
      // Pydantic uses alias "from" for start_time field
      interface BackendWorkedResponse {
        id: string;
        task_id: string;
        task_title: string | null;
        date: string;
        from: string; // Time only like "18:28:34.822595"
        to: string | null;
        description: string | null;
        created_at: string;
      }
      
      const response = await apiClient.post<BackendWorkedResponse>(
        `${this.basePath}/start`,
        requestData
      );
      
      const data = response.data;
      
      // Map to ActiveTracking: combine date + from into full ISO datetime with UTC timezone
      // Backend stores times in UTC, so we need to add 'Z' suffix
      const result: ActiveTracking = {
        id: data.id,
        task_id: data.task_id,
        task_title: data.task_title || '',
        start_time: `${data.date}T${data.from}Z`, // Add Z for UTC
        description: data.description || '',
      };
      
      logger.info('Time tracking started', {
        trackingId: result.id,
        taskId: result.task_id,
        taskTitle: result.task_title,
      });
      
      return result;
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
   * @param workedId - UUID of the worked entry to stop
   * @param description - Optional description to update/add
   */
  async stopTracking(workedId: string, description?: string): Promise<void> {
    try {
      logger.debug('Stopping time tracking', { workedId, hasDescription: !!description });
      
      const requestData: StopTrackingRequest & { worked_id: string } = {
        worked_id: workedId,
      };
      
      if (description) {
        requestData.description = description;
      }
      
      await apiClient.post(`${this.basePath}/stop`, requestData);
      
      logger.info('Time tracking stopped', { workedId });
    } catch (error) {
      logger.error('Failed to stop time tracking', {
        workedId,
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
      
      // Backend returns { entries: [...], count: number }
      // Each entry has: id, task_id, task_title, date, from, description, etc.
      // Pydantic uses alias "from" for start_time field
      interface BackendActiveEntry {
        id: string;
        task_id: string;
        task_title: string;
        date: string;
        from: string; // Time string like "14:30:00"
        to: string | null;
        description: string;
        created_at: string;
      }
      
      const response = await apiClient.get<{ entries: BackendActiveEntry[]; count: number }>(
        `${this.basePath}/active`
      );
      
      // Extract first entry (user can only have one active tracking at a time)
      if (response.data.entries.length === 0) {
        logger.debug('No active tracking found');
        return null;
      }
      
      const entry = response.data.entries[0];
      
      // Transform to frontend format: combine date and time into ISO datetime with UTC timezone
      // Backend stores times in UTC, so we need to add 'Z' suffix
      const activeTracking: ActiveTracking = {
        id: entry.id,
        task_id: entry.task_id,
        task_title: entry.task_title,
        start_time: `${entry.date}T${entry.from}Z`, // Add Z for UTC
        description: entry.description || '',
      };
      
      logger.info('Active tracking found', {
        trackingId: activeTracking.id,
        taskId: activeTracking.task_id,
        taskTitle: activeTracking.task_title,
      });
      
      return activeTracking;
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

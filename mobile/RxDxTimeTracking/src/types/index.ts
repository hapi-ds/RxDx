/**
 * Core types for the mobile time tracking app
 */

export * from './user';
export * from './errors';
export * from './navigation';

/**
 * Task interface
 */
export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  priority: number; // 1=started, 2=scheduled, 3=other
  scheduled_start: string | null; // ISO 8601
  scheduled_end: string | null; // ISO 8601
  worked_sum?: string; // e.g., "2h 30m"
  has_active_tracking?: boolean;
}

/**
 * WorkedEntry interface
 */
export interface WorkedEntry {
  id: string;
  resource: string; // user_id
  task_id: string;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string | null; // HH:MM:SS
  description: string | null;
  created_at: string; // ISO 8601
}

/**
 * Start tracking request
 */
export interface StartTrackingRequest {
  task_id: string;
  description?: string;
}

/**
 * Stop tracking request
 */
export interface StopTrackingRequest {
  worked_id: string;
}

/**
 * API response wrapper for list endpoints
 */
export interface ApiListResponse<T> {
  items: T[];
  total?: number;
}

/**
 * Task list response
 */
export interface TaskListResponse {
  tasks: Task[];
}

/**
 * Active tracking response
 */
export interface ActiveTrackingResponse {
  active_entries: WorkedEntry[];
}

/**
 * Task worked sum response
 */
export interface TaskWorkedSumResponse {
  task_id: string;
  worked_sum: string;
  total_seconds: number;
}

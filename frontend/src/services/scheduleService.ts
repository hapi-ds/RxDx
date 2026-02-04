/**
 * Schedule Service
 * Handles API calls for project scheduling functionality
 * Supports Requirement 7 (Offline Project Scheduling)
 */

import { apiClient } from './api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  estimated_hours: number;
  start_date?: string;
  end_date?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  priority?: number;
  assigned_to?: string;
  dependencies?: string[];
  required_resources?: string[];
  resource_demand?: Record<string, number>;
}

export interface Resource {
  id: string;
  name: string;
  type: string;
  capacity: number;
  availability?: number;
}

export interface ScheduleConstraints {
  horizon_days?: number;
  working_hours_per_day?: number;
  start_date?: string;
  deadline?: string;
}

export interface ScheduledTask {
  task_id: string;
  task_title: string;
  start_date: string;
  end_date: string;
  duration_hours: number;
  assigned_resources?: string[];
}

export interface ScheduleResult {
  status: 'success' | 'infeasible' | 'conflict';
  schedule?: ScheduledTask[];
  project_duration_hours?: number;
  conflicts?: string[];
  message?: string;
}

export interface ScheduleFilters {
  project_id?: string;
  status?: Task['status'];
  assigned_to?: string;
  page?: number;
  size?: number;
}

export interface ScheduleStatistics {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  blocked_tasks: number;
  total_estimated_hours: number;
  completion_percentage: number;
  critical_path_tasks?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

class ScheduleService {
  /**
   * Get all tasks with optional filters
   */
  async getTasks(filters?: ScheduleFilters): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams();
    
    // Tasks are workitems with type="task"
    params.append('type', 'task');
    
    if (filters?.status) params.append('status', filters.status);
    if (filters?.assigned_to) params.append('assigned_to', filters.assigned_to);
    if (filters?.size) params.append('limit', filters.size.toString());
    
    // Calculate offset from page and size
    const offset = ((filters?.page || 1) - 1) * (filters?.size || 20);
    params.append('offset', offset.toString());

    const response = await apiClient.get<Task[]>(`/workitems?${params.toString()}`);
    const items = response.data;
    
    // Since workitems endpoint doesn't return pagination metadata,
    // we'll construct it from the response
    return {
      items,
      total: items.length, // This is approximate - backend doesn't return total count
      page: filters?.page || 1,
      size: filters?.size || 20,
      pages: Math.ceil(items.length / (filters?.size || 20)),
    };
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<Task> {
    const response = await apiClient.get<Task>(`/schedule/tasks/${taskId}`);
    return response.data;
  }

  /**
   * Create a new task
   */
  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    const response = await apiClient.post<Task>('/schedule/tasks', task);
    return response.data;
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const response = await apiClient.patch<Task>(`/schedule/tasks/${taskId}`, updates);
    return response.data;
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    await apiClient.delete(`/schedule/tasks/${taskId}`);
  }

  /**
   * Get all resources
   */
  async getResources(): Promise<Resource[]> {
    const response = await apiClient.get<Resource[]>('/schedule/resources');
    return response.data;
  }

  /**
   * Calculate project schedule using constraint programming
   */
  async calculateSchedule(
    projectId: string,
    constraints?: ScheduleConstraints
  ): Promise<ScheduleResult> {
    const response = await apiClient.post<ScheduleResult>('/schedule/calculate', {
      project_id: projectId,
      constraints,
    });
    return response.data;
  }

  /**
   * Get current schedule for a project
   */
  async getSchedule(projectId: string): Promise<ScheduleResult> {
    const response = await apiClient.get<ScheduleResult>(`/schedule/${projectId}`);
    return response.data;
  }

  /**
   * Update schedule manually
   */
  async updateSchedule(
    projectId: string,
    schedule: ScheduledTask[]
  ): Promise<ScheduleResult> {
    const response = await apiClient.patch<ScheduleResult>(`/schedule/${projectId}`, { schedule });
    return response.data;
  }

  /**
   * Get Gantt chart data
   */
  async getGanttData(projectId: string): Promise<ScheduledTask[]> {
    const response = await apiClient.get<ScheduledTask[]>(`/schedule/${projectId}/gantt`);
    return response.data;
  }

  /**
   * Get schedule statistics
   */
  async getStatistics(_projectId?: string): Promise<ScheduleStatistics> {
    // Get all tasks and calculate statistics
    const tasks = await this.getTasks({ size: 1000 }); // Get all tasks
    
    const total_tasks = tasks.items.length;
    const completed_tasks = tasks.items.filter(t => t.status === 'completed').length;
    const in_progress_tasks = tasks.items.filter(t => t.status === 'in_progress').length;
    const blocked_tasks = tasks.items.filter(t => t.status === 'blocked').length;
    const total_estimated_hours = tasks.items.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);
    const completion_percentage = total_tasks > 0 ? (completed_tasks / total_tasks) * 100 : 0;
    
    return {
      total_tasks,
      completed_tasks,
      in_progress_tasks,
      blocked_tasks,
      total_estimated_hours,
      completion_percentage,
    };
  }

  /**
   * Export project data for offline scheduling
   */
  async exportProjectData(projectId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/schedule/${projectId}/export`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Import schedule calculated offline
   */
  async importSchedule(
    projectId: string,
    scheduleFile: File
  ): Promise<ScheduleResult> {
    const formData = new FormData();
    formData.append('schedule', scheduleFile);

    const response = await apiClient.post<ScheduleResult>(
      `/schedule/${projectId}/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }
}

export const scheduleService = new ScheduleService();

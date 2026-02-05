/**
 * Schedule Service
 * Handles API calls for project scheduling functionality
 * Supports Requirement 7 (Offline Project Scheduling)
 */

import { apiClient } from './api';

/**
 * Helper function to handle API errors consistently
 * Extracts error details and provides user-friendly messages
 * 
 * @param error - Error object from API call
 * @param methodName - Name of the method that failed (for logging)
 * @param context - Additional context for logging
 * @returns Never (always throws)
 */
function handleApiError(error: unknown, methodName: string, context?: Record<string, unknown>): never {
  // Check if it's an axios error with response
  if (error && typeof error === 'object' && 'isAxiosError' in error && error.isAxiosError) {
    const axiosError = error as { response?: { status?: number; data?: { detail?: string } }; message?: string };
    
    if (axiosError.response) {
      const status = axiosError.response.status;
      const detail = axiosError.response.data?.detail || axiosError.message || 'Unknown error';
      
      // Provide specific messages for different HTTP status codes
      let errorMessage: string;
      switch (status) {
        case 400:
          errorMessage = `Invalid request: ${detail}`;
          break;
        case 401:
          errorMessage = 'Authentication required. Please log in.';
          break;
        case 403:
          errorMessage = 'You do not have permission to perform this action.';
          break;
        case 404:
          errorMessage = 'Resource not found. Please contact support.';
          break;
        case 500:
          errorMessage = `Server error: ${detail}. Please try again later.`;
          break;
        case 503:
          errorMessage = 'Service temporarily unavailable. Please try again later.';
          break;
        default:
          errorMessage = `Error ${status}: ${detail}`;
      }
      
      // Log full error object to console for debugging
      console.error(`${methodName} failed:`, {
        status,
        detail,
        ...context,
        error: axiosError,
      });
      
      throw new Error(errorMessage);
    } else {
      // No response received - this is a network error
      console.error(`${methodName} network error:`, {
        message: axiosError.message,
        ...context,
        error: axiosError,
      });
      
      throw new Error('Network error: Please check your internet connection');
    }
  }
  
  // If we get here, error is not an axios error
  // This is an unexpected error type
  console.error(`${methodName} unexpected error:`, {
    ...context,
    error,
  });
  
  // Preserve the original error if it's an Error instance
  if (error instanceof Error) {
    throw error;
  }
  
  throw new Error('An unexpected error occurred');
}

/**
 * Backend WorkItem response interface
 * Matches the WorkItemResponse model from backend
 */
export interface WorkItemResponse {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: string;
  priority: number | null;
  assigned_to: string | null;
  version: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_signed: boolean;
  // Task-specific fields
  estimated_hours: number | null;
  start_date: string | null;
  end_date: string | null;
  dependencies: string[] | null;
  required_resources: string[] | null;
  resource_demand: Record<string, number> | null;
}

/**
 * Maps backend status values to frontend status values
 * Backend uses: 'draft', 'active', 'completed', 'archived'
 * Frontend uses: 'not_started', 'in_progress', 'completed', 'blocked'
 * 
 * @param backendStatus - Status value from backend API
 * @returns Mapped frontend status value
 */
function mapBackendStatus(backendStatus: string): Task['status'] {
  const statusMap: Record<string, Task['status']> = {
    'draft': 'not_started',
    'active': 'in_progress',
    'completed': 'completed',
    'archived': 'completed',
  };
  return statusMap[backendStatus] || 'not_started';
}

/**
 * Maps frontend status values to backend status values
 * Frontend uses: 'not_started', 'in_progress', 'completed', 'blocked'
 * Backend uses: 'draft', 'active', 'completed', 'archived'
 * 
 * @param frontendStatus - Status value from frontend
 * @returns Mapped backend status value
 */
function mapFrontendStatus(frontendStatus: Task['status']): string {
  const statusMap: Record<Task['status'], string> = {
    'not_started': 'draft',
    'in_progress': 'active',
    'completed': 'completed',
    'blocked': 'active', // Map blocked to active for backend
  };
  return statusMap[frontendStatus];
}

/**
 * Maps WorkItemResponse from backend to Task interface for frontend
 * Handles type conversions and null/undefined values
 * Validates required fields and throws descriptive errors for invalid data
 * 
 * @param workitem - WorkItem response from backend API
 * @returns Task object for frontend use
 * @throws Error if required fields are missing or invalid
 */
function mapWorkItemToTask(workitem: WorkItemResponse): Task {
  // Validate required fields
  if (!workitem.id || typeof workitem.id !== 'string') {
    console.error('Invalid task data: missing or invalid id', { workitem });
    throw new Error('Invalid task data: missing or invalid id');
  }
  
  if (!workitem.title || typeof workitem.title !== 'string') {
    console.error('Invalid task data: missing or invalid title', { workitem });
    throw new Error('Invalid task data: missing or invalid title');
  }
  
  // estimated_hours is required for scheduling, but may be null in backend
  // Default to 0 if not provided
  const estimatedHours = workitem.estimated_hours ?? 0;
  if (typeof estimatedHours !== 'number' || estimatedHours < 0) {
    console.error('Invalid task data: invalid estimated_hours', { workitem, estimatedHours });
    throw new Error('Invalid task data: estimated_hours must be a non-negative number');
  }
  
  // Validate status field exists
  if (!workitem.status || typeof workitem.status !== 'string') {
    console.error('Invalid task data: missing or invalid status', { workitem });
    throw new Error('Invalid task data: missing or invalid status');
  }
  
  // Handle optional fields gracefully
  return {
    id: workitem.id,
    title: workitem.title,
    description: workitem.description || undefined,
    estimated_hours: estimatedHours,
    start_date: workitem.start_date || undefined,
    end_date: workitem.end_date || undefined,
    status: mapBackendStatus(workitem.status),
    priority: workitem.priority || undefined,
    assigned_to: workitem.assigned_to || undefined,
    dependencies: workitem.dependencies || undefined,
    required_resources: workitem.required_resources || undefined,
    resource_demand: workitem.resource_demand || undefined,
  };
}

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
   * Implements client-side pagination since backend doesn't return pagination metadata
   */
  async getTasks(filters?: ScheduleFilters): Promise<PaginatedResponse<Task>> {
    try {
      const params = new URLSearchParams();
      
      // Tasks are workitems with type="task"
      params.append('type', 'task');
      
      // Fetch all tasks with high limit (backend max is 1000)
      params.append('limit', '1000');
      
      // Map frontend status to backend status for filtering
      if (filters?.status) {
        params.append('status', mapFrontendStatus(filters.status));
      }
      if (filters?.assigned_to) {
        params.append('assigned_to', filters.assigned_to);
      }

      const response = await apiClient.get<WorkItemResponse[]>(`/workitems?${params.toString()}`);
      
      // Map backend WorkItemResponse to frontend Task interface
      const allItems = response.data.map(mapWorkItemToTask);
      
      // Apply client-side pagination with validation
      const size = filters?.size || 20;
      const totalPages = allItems.length > 0 ? Math.ceil(allItems.length / size) : 1;
      
      // Validate and clamp page number
      let page = filters?.page || 1;
      page = Math.max(1, Math.min(page, totalPages)); // Ensure 1 <= page <= totalPages
      
      const start = (page - 1) * size;
      const end = start + size;
      const items = allItems.slice(start, end);
      
      // Calculate correct pagination metadata from all items
      return {
        items,
        total: allItems.length,
        page,
        size,
        pages: totalPages,
      };
    } catch (error) {
      handleApiError(error, 'getTasks', { filters });
    }
  }

  /**
   * Get a single task by ID
   */
  async getTask(taskId: string): Promise<Task> {
    try {
      const response = await apiClient.get<WorkItemResponse>(`/workitems/${taskId}`);
      return mapWorkItemToTask(response.data);
    } catch (error) {
      handleApiError(error, 'getTask', { taskId });
    }
  }

  /**
   * Create a new task
   */
  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    try {
      // Create WorkItemCreate payload with type='task'
      const workitemData = {
        type: 'task',
        title: task.title,
        description: task.description || undefined,
        status: mapFrontendStatus(task.status),
        priority: task.priority || undefined,
        assigned_to: task.assigned_to || undefined,
        estimated_hours: task.estimated_hours,
        start_date: task.start_date || undefined,
        end_date: task.end_date || undefined,
        dependencies: task.dependencies || undefined,
        required_resources: task.required_resources || undefined,
        resource_demand: task.resource_demand || undefined,
      };
      
      const response = await apiClient.post<WorkItemResponse>('/workitems', workitemData);
      return mapWorkItemToTask(response.data);
    } catch (error) {
      handleApiError(error, 'createTask', { task });
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    try {
      // Create WorkItemUpdate payload
      const workitemUpdates: Record<string, unknown> = {};
      
      if (updates.title !== undefined) workitemUpdates.title = updates.title;
      if (updates.description !== undefined) workitemUpdates.description = updates.description;
      if (updates.status !== undefined) workitemUpdates.status = mapFrontendStatus(updates.status);
      if (updates.priority !== undefined) workitemUpdates.priority = updates.priority;
      if (updates.assigned_to !== undefined) workitemUpdates.assigned_to = updates.assigned_to;
      if (updates.estimated_hours !== undefined) workitemUpdates.estimated_hours = updates.estimated_hours;
      if (updates.start_date !== undefined) workitemUpdates.start_date = updates.start_date;
      if (updates.end_date !== undefined) workitemUpdates.end_date = updates.end_date;
      if (updates.dependencies !== undefined) workitemUpdates.dependencies = updates.dependencies;
      if (updates.required_resources !== undefined) workitemUpdates.required_resources = updates.required_resources;
      if (updates.resource_demand !== undefined) workitemUpdates.resource_demand = updates.resource_demand;
      
      const response = await apiClient.patch<WorkItemResponse>(
        `/workitems/${taskId}?change_description=Task updated`,
        workitemUpdates
      );
      return mapWorkItemToTask(response.data);
    } catch (error) {
      handleApiError(error, 'updateTask', { taskId, updates });
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      await apiClient.delete(`/workitems/${taskId}`);
    } catch (error) {
      handleApiError(error, 'deleteTask', { taskId });
    }
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
   * 
   * @deprecated Backend endpoint not yet implemented
   * @throws Error indicating feature is not available
   */
  async calculateSchedule(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _projectId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _constraints?: ScheduleConstraints
  ): Promise<ScheduleResult> {
    // TODO: Backend endpoint /schedule/calculate not yet implemented
    throw new Error('Schedule calculation feature is coming soon. Backend endpoint not yet implemented.');
  }

  /**
   * Get current schedule for a project
   * 
   * @deprecated Backend endpoint not yet implemented
   * @throws Error indicating feature is not available
   */
  async getSchedule(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _projectId: string
  ): Promise<ScheduleResult> {
    // TODO: Backend endpoint /schedule/{projectId} not yet implemented
    throw new Error('Get schedule feature is coming soon. Backend endpoint not yet implemented.');
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
   * 
   * @deprecated Backend endpoint not yet implemented
   * @throws Error indicating feature is not available
   */
  async getGanttData(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _projectId: string
  ): Promise<ScheduledTask[]> {
    // TODO: Backend endpoint /schedule/{projectId}/gantt not yet implemented
    throw new Error('Gantt chart data feature is coming soon. Backend endpoint not yet implemented.');
  }

  /**
   * Get schedule statistics
   */
  async getStatistics(): Promise<ScheduleStatistics> {
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

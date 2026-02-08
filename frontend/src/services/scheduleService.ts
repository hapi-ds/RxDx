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
    const axiosError = error as { response?: { status?: number; data?: { detail?: string | unknown[] } }; message?: string };
    
    if (axiosError.response) {
      const status = axiosError.response.status;
      const detail = axiosError.response.data?.detail || axiosError.message || 'Unknown error';
      
      // For 422 validation errors, detail is an array of validation errors
      if (status === 422 && Array.isArray(detail)) {
        console.error(`${methodName} validation errors:`, {
          status,
          validationErrors: detail,
          ...context,
        });
        
        // Format validation errors for display
        const errorMessages = detail.map((err: any) => {
          const loc = err.loc ? err.loc.join(' -> ') : 'unknown';
          return `${loc}: ${err.msg}`;
        }).join('; ');
        
        throw new Error(`Validation failed: ${errorMessages}`);
      }
      
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
 * Type guard to validate if an object is a valid WorkItemResponse
 * Checks for required fields and their types
 * 
 * @param obj - Object to validate
 * @returns True if object is a valid WorkItemResponse
 */
function isWorkItemResponse(obj: unknown): obj is WorkItemResponse {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  
  const item = obj as Record<string, unknown>;
  
  // Check required string fields
  if (typeof item.id !== 'string' || !item.id) return false;
  if (typeof item.type !== 'string' || !item.type) return false;
  if (typeof item.title !== 'string' || !item.title) return false;
  if (typeof item.status !== 'string' || !item.status) return false;
  if (typeof item.version !== 'string') return false;
  if (typeof item.created_by !== 'string') return false;
  if (typeof item.created_at !== 'string') return false;
  if (typeof item.updated_at !== 'string') return false;
  if (typeof item.is_signed !== 'boolean') return false;
  
  // Check nullable/optional string fields - allow undefined
  if (item.description !== null && item.description !== undefined && typeof item.description !== 'string') return false;
  if (item.assigned_to !== null && item.assigned_to !== undefined && typeof item.assigned_to !== 'string') return false;
  if (item.start_date !== null && item.start_date !== undefined && typeof item.start_date !== 'string') return false;
  if (item.end_date !== null && item.end_date !== undefined && typeof item.end_date !== 'string') return false;
  
  // Check nullable/optional number fields - allow undefined
  if (item.priority !== null && item.priority !== undefined && typeof item.priority !== 'number') return false;
  if (item.estimated_hours !== null && item.estimated_hours !== undefined && typeof item.estimated_hours !== 'number') return false;
  
  // Check nullable/optional array fields - allow undefined
  if (item.dependencies !== null && item.dependencies !== undefined && !Array.isArray(item.dependencies)) return false;
  if (item.dependencies !== null && item.dependencies !== undefined && !item.dependencies.every((d: unknown) => typeof d === 'string')) return false;
  if (item.required_resources !== null && item.required_resources !== undefined && !Array.isArray(item.required_resources)) return false;
  if (item.required_resources !== null && item.required_resources !== undefined && !item.required_resources.every((r: unknown) => typeof r === 'string')) return false;
  
  // Check nullable/optional object field - allow undefined
  if (item.resource_demand !== null && item.resource_demand !== undefined) {
    if (typeof item.resource_demand !== 'object' || Array.isArray(item.resource_demand)) return false;
    // Validate all values are numbers
    const demand = item.resource_demand as Record<string, unknown>;
    if (!Object.values(demand).every(v => typeof v === 'number')) return false;
  }
  
  return true;
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
  // Default to 0 if not provided using null coalescing
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
  
  // Handle optional fields gracefully using null coalescing and optional chaining
  return {
    id: workitem.id,
    title: workitem.title,
    description: workitem.description ?? undefined,
    estimated_hours: estimatedHours,
    start_date: workitem.start_date ?? undefined,
    end_date: workitem.end_date ?? undefined,
    status: mapBackendStatus(workitem.status),
    priority: workitem.priority ?? undefined,
    assigned_to: workitem.assigned_to ?? undefined,
    dependencies: workitem.dependencies ?? undefined,
    required_resources: workitem.required_resources ?? undefined,
    resource_demand: workitem.resource_demand ?? undefined,
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
   * 
   * @param filters - Optional filters for tasks
   * @param filters.project_id - Filter by project ID
   * @param filters.status - Filter by task status (not_started, in_progress, completed, blocked)
   * @param filters.assigned_to - Filter by assigned user ID
   * @param filters.page - Page number for pagination (default: 1)
   * @param filters.size - Number of items per page (default: 20)
   * 
   * @returns Promise resolving to paginated response with tasks
   * @returns {PaginatedResponse<Task>} Object containing:
   *   - items: Array of tasks for current page
   *   - total: Total number of tasks (after filtering)
   *   - page: Current page number
   *   - size: Number of items per page
   *   - pages: Total number of pages
   * 
   * @throws {Error} Network error if connection fails
   * @throws {Error} HTTP error with specific message based on status code
   * @throws {Error} Validation error if response data is invalid
   * 
   * @example
   * // Get first page of all tasks
   * const tasks = await scheduleService.getTasks();
   * 
   * @example
   * // Get completed tasks, page 2
   * const tasks = await scheduleService.getTasks({
   *   status: 'completed',
   *   page: 2,
   *   size: 10
   * });
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

      const response = await apiClient.get<WorkItemResponse[]>(`/api/v1/workitems?${params.toString()}`);
      
      // Validate response structure before mapping
      if (!Array.isArray(response.data)) {
        console.error('Invalid response: expected array of WorkItems', { response: response.data });
        throw new Error('Invalid response from server: expected array of tasks');
      }
      
      // Validate each item and filter out invalid ones
      const validItems = response.data.filter((item, index) => {
        if (!isWorkItemResponse(item)) {
          console.error(`Invalid WorkItem at index ${index}:`, item);
          return false;
        }
        return true;
      });
      
      if (validItems.length < response.data.length) {
        console.warn(`Filtered out ${response.data.length - validItems.length} invalid WorkItems`);
      }
      
      // Map backend WorkItemResponse to frontend Task interface
      const allItems = validItems.map(mapWorkItemToTask);
      
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
   * 
   * @param taskId - UUID of the task to retrieve
   * 
   * @returns Promise resolving to the task object
   * 
   * @throws {Error} Network error if connection fails
   * @throws {Error} 404 error if task not found
   * @throws {Error} Validation error if response data is invalid
   * 
   * @example
   * const task = await scheduleService.getTask('123e4567-e89b-12d3-a456-426614174000');
   */
  async getTask(taskId: string): Promise<Task> {
    try {
      const response = await apiClient.get<WorkItemResponse>(`/api/v1/workitems/${taskId}`);
      
      // Validate response structure before mapping
      if (!isWorkItemResponse(response.data)) {
        console.error('Invalid WorkItem response:', response.data);
        throw new Error('Invalid response from server: expected valid WorkItem');
      }
      
      return mapWorkItemToTask(response.data);
    } catch (error) {
      handleApiError(error, 'getTask', { taskId });
    }
  }

  /**
   * Create a new task
   * 
   * @param task - Task data without ID (ID will be generated by backend)
   * @param task.title - Task title (required)
   * @param task.estimated_hours - Estimated hours for task completion (required)
   * @param task.status - Task status (required)
   * @param task.description - Task description (optional)
   * @param task.priority - Task priority 1-5 (optional)
   * @param task.assigned_to - UUID of assigned user (optional)
   * @param task.start_date - ISO date string for start date (optional)
   * @param task.end_date - ISO date string for end date (optional)
   * @param task.dependencies - Array of task IDs this task depends on (optional)
   * @param task.required_resources - Array of required resource IDs (optional)
   * @param task.resource_demand - Map of resource ID to demand amount (optional)
   * 
   * @returns Promise resolving to the created task with generated ID
   * 
   * @throws {Error} Network error if connection fails
   * @throws {Error} 400 error if validation fails
   * @throws {Error} 401 error if not authenticated
   * @throws {Error} Validation error if response data is invalid
   * 
   * @example
   * const newTask = await scheduleService.createTask({
   *   title: 'Implement user authentication',
   *   estimated_hours: 8,
   *   status: 'not_started',
   *   priority: 1,
   *   description: 'Add JWT-based authentication'
   * });
   */
  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    try {
      // Create WorkItemCreate payload with type='task'
      // Use null coalescing to handle undefined values
      const workitemData = {
        type: 'task',
        title: task.title,
        description: task.description ?? undefined,
        status: mapFrontendStatus(task.status),
        priority: task.priority ?? undefined,
        assigned_to: task.assigned_to ?? undefined,
        estimated_hours: task.estimated_hours,
        start_date: task.start_date ?? undefined,
        end_date: task.end_date ?? undefined,
        dependencies: task.dependencies ?? undefined,
        required_resources: task.required_resources ?? undefined,
        resource_demand: task.resource_demand ?? undefined,
      };
      
      const response = await apiClient.post<WorkItemResponse>('/api/v1/workitems', workitemData);
      
      // Validate response structure before mapping
      if (!isWorkItemResponse(response.data)) {
        console.error('Invalid WorkItem response:', response.data);
        throw new Error('Invalid response from server: expected valid WorkItem');
      }
      
      return mapWorkItemToTask(response.data);
    } catch (error) {
      handleApiError(error, 'createTask', { task });
    }
  }

  /**
   * Update an existing task
   * 
   * @param taskId - UUID of the task to update
   * @param updates - Partial task object with fields to update
   * @param updates.title - New task title (optional)
   * @param updates.description - New task description (optional)
   * @param updates.status - New task status (optional)
   * @param updates.priority - New task priority (optional)
   * @param updates.assigned_to - New assigned user ID (optional)
   * @param updates.estimated_hours - New estimated hours (optional)
   * @param updates.start_date - New start date (optional)
   * @param updates.end_date - New end date (optional)
   * @param updates.dependencies - New dependencies array (optional)
   * @param updates.required_resources - New required resources (optional)
   * @param updates.resource_demand - New resource demand (optional)
   * 
   * @returns Promise resolving to the updated task
   * 
   * @throws {Error} Network error if connection fails
   * @throws {Error} 400 error if validation fails
   * @throws {Error} 404 error if task not found
   * @throws {Error} 401 error if not authenticated
   * @throws {Error} Validation error if response data is invalid
   * 
   * @example
   * const updatedTask = await scheduleService.updateTask(
   *   '123e4567-e89b-12d3-a456-426614174000',
   *   { status: 'in_progress', assigned_to: 'user-uuid' }
   * );
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
        `/api/v1/workitems/${taskId}?change_description=Task updated`,
        workitemUpdates
      );
      
      // Validate response structure before mapping
      if (!isWorkItemResponse(response.data)) {
        console.error('Invalid WorkItem response:', response.data);
        throw new Error('Invalid response from server: expected valid WorkItem');
      }
      
      return mapWorkItemToTask(response.data);
    } catch (error) {
      handleApiError(error, 'updateTask', { taskId, updates });
    }
  }

  /**
   * Delete a task
   * 
   * @param taskId - UUID of the task to delete
   * 
   * @returns Promise that resolves when task is deleted
   * 
   * @throws {Error} Network error if connection fails
   * @throws {Error} 404 error if task not found
   * @throws {Error} 401 error if not authenticated
   * @throws {Error} 403 error if not authorized to delete
   * 
   * @example
   * await scheduleService.deleteTask('123e4567-e89b-12d3-a456-426614174000');
   */
  async deleteTask(taskId: string): Promise<void> {
    try {
      await apiClient.delete(`/api/v1/workitems/${taskId}`);
    } catch (error) {
      handleApiError(error, 'deleteTask', { taskId });
    }
  }

  /**
   * Get all resources
   * 
   * @returns Promise resolving to array of resources
   * 
   * @throws {Error} Network error if connection fails
   * @throws {Error} HTTP error with specific message based on status code
   * 
   * @example
   * const resources = await scheduleService.getResources();
   */
  async getResources(): Promise<Resource[]> {
    const response = await apiClient.get<Resource[]>('/api/v1/schedule/resources');
    return response.data;
  }

  /**
   * Calculate project schedule using constraint programming
   * 
   * @param projectId - UUID of the project to schedule
   * @param constraints - Optional scheduling constraints
   * 
   * @returns Promise resolving to schedule result with status and scheduled tasks
   * 
   * @throws {Error} Network error if connection fails
   * @throws {Error} 500 error if schedule calculation fails
   * 
   * @example
   * const result = await scheduleService.calculateSchedule(projectId, {
   *   horizon_days: 365,
   *   working_hours_per_day: 8
   * });
   */
  async calculateSchedule(
    projectId: string,
    constraints?: ScheduleConstraints
  ): Promise<ScheduleResult> {
    try {
      // Fetch all tasks for the project
      const tasksResponse = await this.getTasks({ size: 1000 });
      const tasks = tasksResponse.items || [];

      // Convert tasks to the format expected by the backend
      const scheduleTasks = tasks.map(task => ({
        id: task.id,
        title: task.title,
        estimated_hours: Math.max(1, Math.floor(task.estimated_hours || 8)), // Ensure integer >= 1
        dependencies: [], // Dependencies will be fetched from graph database by backend
        required_resources: [],
        resource_demand: {}, // Empty dict - backend will handle resource allocation
        priority: task.priority || 3,
      }));

      const response = await apiClient.post<ScheduleResult>('/api/v1/schedule/calculate', {
        project_id: projectId,
        tasks: scheduleTasks,
        resources: [], // Resources will be fetched from graph database by backend
        constraints: constraints || {
          horizon_days: 365,
          working_hours_per_day: 8,
        },
      });
      return response.data;
    } catch (error) {
      handleApiError(error, 'calculateSchedule', { projectId, constraints });
    }
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
   * 
   * @param projectId - UUID of the project
   * @param schedule - Array of scheduled tasks with dates and assignments
   * 
   * @returns Promise resolving to schedule result with status and conflicts
   * 
   * @throws {Error} Network error if connection fails
   * @throws {Error} 400 error if validation fails
   * @throws {Error} 404 error if project not found
   * 
   * @example
   * const result = await scheduleService.updateSchedule(projectId, [
   *   {
   *     task_id: 'task-uuid',
   *     task_title: 'Task 1',
   *     start_date: '2024-01-01',
   *     end_date: '2024-01-05',
   *     duration_hours: 40
   *   }
   * ]);
   */
  async updateSchedule(
    projectId: string,
    schedule: ScheduledTask[]
  ): Promise<ScheduleResult> {
    const response = await apiClient.patch<ScheduleResult>(`/api/v1/schedule/${projectId}`, { schedule });
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
   * Calculates statistics from all tasks in the system
   * 
   * @returns Promise resolving to statistics object containing:
   *   - total_tasks: Total number of tasks
   *   - completed_tasks: Number of completed tasks
   *   - in_progress_tasks: Number of in-progress tasks
   *   - blocked_tasks: Number of blocked tasks
   *   - total_estimated_hours: Sum of estimated hours for all tasks
   *   - completion_percentage: Percentage of completed tasks (0-100)
   * 
   * @throws {Error} Network error if connection fails
   * @throws {Error} HTTP error with specific message based on status code
   * 
   * @example
   * const stats = await scheduleService.getStatistics();
   * console.log(`${stats.completion_percentage}% complete`);
   */
  async getStatistics(): Promise<ScheduleStatistics> {
    // Get all tasks and calculate statistics
    const tasks = await this.getTasks({ size: 1000 }); // Get all tasks
    
    const total_tasks = tasks.items?.length ?? 0;
    const completed_tasks = tasks.items?.filter(t => t.status === 'completed').length ?? 0;
    const in_progress_tasks = tasks.items?.filter(t => t.status === 'in_progress').length ?? 0;
    const blocked_tasks = tasks.items?.filter(t => t.status === 'blocked').length ?? 0;
    const total_estimated_hours = tasks.items?.reduce((sum, t) => sum + (t.estimated_hours ?? 0), 0) ?? 0;
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
   * Downloads project data as a file that can be used for offline schedule calculation
   * 
   * @param projectId - UUID of the project to export
   * 
   * @returns Promise resolving to Blob containing project data
   * 
   * @throws {Error} Network error if connection fails
   * @throws {Error} 404 error if project not found
   * 
   * @example
   * const blob = await scheduleService.exportProjectData(projectId);
   * const url = URL.createObjectURL(blob);
   * const a = document.createElement('a');
   * a.href = url;
   * a.download = 'project-data.json';
   * a.click();
   */
  async exportProjectData(projectId: string): Promise<Blob> {
    const response = await apiClient.get<Blob>(`/api/v1/schedule/${projectId}/export`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Import schedule calculated offline
   * Uploads a schedule file that was calculated offline and applies it to the project
   * 
   * @param projectId - UUID of the project
   * @param scheduleFile - File containing the calculated schedule
   * 
   * @returns Promise resolving to schedule result with status and any conflicts
   * 
   * @throws {Error} Network error if connection fails
   * @throws {Error} 400 error if file format is invalid
   * @throws {Error} 404 error if project not found
   * 
   * @example
   * const fileInput = document.querySelector('input[type="file"]');
   * const file = fileInput.files[0];
   * const result = await scheduleService.importSchedule(projectId, file);
   * if (result.status === 'success') {
   *   console.log('Schedule imported successfully');
   * }
   */
  async importSchedule(
    projectId: string,
    scheduleFile: File
  ): Promise<ScheduleResult> {
    const formData = new FormData();
    formData.append('schedule', scheduleFile);

    const response = await apiClient.post<ScheduleResult>(
      `/api/v1/schedule/${projectId}/import`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  }

  /**
   * Get Gantt chart visualization data for a project
   * 
   * @param projectId - UUID of the project
   * 
   * @returns Promise resolving to Gantt chart data including:
   *   - tasks: Scheduled tasks with dates and resource assignments
   *   - dependencies: Task dependencies with relationship types
   *   - critical_path: Task IDs on the critical path
   *   - milestones: Milestones with target dates and dependencies
   *   - sprints: Sprint boundaries with dates
   *   - project_start_date: Overall project start date
   *   - project_end_date: Overall project end date
   *   - completion_percentage: Percentage of completed tasks
   * 
   * @throws {Error} Network error if connection fails
   * @throws {Error} 404 error if no schedule exists for the project
   * 
   * @example
   * const ganttData = await scheduleService.getGanttChartData(projectId);
   */
  async getGanttChartData(projectId: string): Promise<{
    tasks: ScheduledTask[];
    dependencies: Array<{
      from_task_id: string;
      to_task_id: string;
      type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
    }>;
    critical_path: string[];
    milestones: Array<{
      id: string;
      title: string;
      target_date: string;
      status: 'draft' | 'active' | 'completed';
      dependent_task_ids?: string[];
    }>;
    sprints: Array<{
      id: string;
      name: string;
      start_date: string;
      end_date: string;
      status: 'planning' | 'active' | 'completed';
    }>;
    project_start_date: string;
    project_end_date: string;
    completion_percentage: number;
  }> {
    try {
      const response = await apiClient.get<{
        tasks: ScheduledTask[];
        dependencies: Array<{
          from_task_id: string;
          to_task_id: string;
          type: 'finish-to-start' | 'start-to-start' | 'finish-to-finish' | 'start-to-finish';
        }>;
        critical_path: string[];
        milestones: Array<{
          id: string;
          title: string;
          target_date: string;
          status: 'draft' | 'active' | 'completed';
          dependent_task_ids?: string[];
        }>;
        sprints: Array<{
          id: string;
          name: string;
          start_date: string;
          end_date: string;
          status: 'planning' | 'active' | 'completed';
        }>;
        project_start_date: string;
        project_end_date: string;
        completion_percentage: number;
      }>(`/api/v1/schedule/${projectId}/gantt`);
      return response.data;
    } catch (error) {
      handleApiError(error, 'getGanttChartData', { projectId });
    }
  }
}

export const scheduleService = new ScheduleService();

/**
 * Unit tests for Schedule Service
 * Tests service layer methods, data transformations, and error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scheduleService, Task, WorkItemResponse } from './scheduleService';
import { apiClient } from './api';

// Mock the API client
vi.mock('./api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ScheduleService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Task 8.1: Test status mapping functions
   * Tests bidirectional status mapping between backend and frontend
   */
  describe('Status Mapping Functions', () => {
    describe('mapBackendStatus', () => {
      it('should map "draft" to "not_started"', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Test Task',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        expect(response.items[0].status).toBe('not_started');
      });

      it('should map "active" to "in_progress"', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Test Task',
          description: null,
          status: 'active',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        expect(response.items[0].status).toBe('in_progress');
      });

      it('should map "completed" to "completed"', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Test Task',
          description: null,
          status: 'completed',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        expect(response.items[0].status).toBe('completed');
      });

      it('should map "archived" to "completed"', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Test Task',
          description: null,
          status: 'archived',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        expect(response.items[0].status).toBe('completed');
      });

      it('should default to "not_started" for unknown status values', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Test Task',
          description: null,
          status: 'unknown_status',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        expect(response.items[0].status).toBe('not_started');
      });
    });

    describe('mapFrontendStatus', () => {
      it('should map "not_started" to "draft" when creating task', async () => {
        const mockCreatedWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'New Task',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.post).mockResolvedValue({ data: mockCreatedWorkItem });

        const newTask = {
          title: 'New Task',
          estimated_hours: 8,
          status: 'not_started' as const,
        };

        await scheduleService.createTask(newTask);

        // Verify the API was called with "draft" status
        expect(apiClient.post).toHaveBeenCalledWith(
          '/api/v1/workitems',
          expect.objectContaining({
            status: 'draft',
          })
        );
      });

      it('should map "in_progress" to "active" when creating task', async () => {
        const mockCreatedWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'New Task',
          description: null,
          status: 'active',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.post).mockResolvedValue({ data: mockCreatedWorkItem });

        const newTask = {
          title: 'New Task',
          estimated_hours: 8,
          status: 'in_progress' as const,
        };

        await scheduleService.createTask(newTask);

        // Verify the API was called with "active" status
        expect(apiClient.post).toHaveBeenCalledWith(
          '/api/v1/workitems',
          expect.objectContaining({
            status: 'active',
          })
        );
      });

      it('should map "completed" to "completed" when creating task', async () => {
        const mockCreatedWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'New Task',
          description: null,
          status: 'completed',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.post).mockResolvedValue({ data: mockCreatedWorkItem });

        const newTask = {
          title: 'New Task',
          estimated_hours: 8,
          status: 'completed' as const,
        };

        await scheduleService.createTask(newTask);

        // Verify the API was called with "completed" status
        expect(apiClient.post).toHaveBeenCalledWith(
          '/api/v1/workitems',
          expect.objectContaining({
            status: 'completed',
          })
        );
      });

      it('should map "blocked" to "active" when creating task', async () => {
        const mockCreatedWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'New Task',
          description: null,
          status: 'active',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.post).mockResolvedValue({ data: mockCreatedWorkItem });

        const newTask = {
          title: 'New Task',
          estimated_hours: 8,
          status: 'blocked' as const,
        };

        await scheduleService.createTask(newTask);

        // Verify the API was called with "active" status (blocked maps to active)
        expect(apiClient.post).toHaveBeenCalledWith(
          '/api/v1/workitems',
          expect.objectContaining({
            status: 'active',
          })
        );
      });
    });

    describe('Bidirectional Mapping Consistency', () => {
      it('should preserve semantic meaning: draft → not_started → draft', async () => {
        // Test that mapping backend "draft" to frontend and back preserves meaning
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Test Task',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });
        vi.mocked(apiClient.patch).mockResolvedValue({ data: mockWorkItem });

        // Get task (backend → frontend)
        const response = await scheduleService.getTasks();
        const task = response.items[0];
        expect(task.status).toBe('not_started');

        // Update task (frontend → backend)
        await scheduleService.updateTask(task.id, { status: task.status });

        // Verify the API was called with "draft" status
        expect(apiClient.patch).toHaveBeenCalledWith(
          `/api/v1/workitems/${task.id}?change_description=Task updated`,
          expect.objectContaining({
            status: 'draft',
          })
        );
      });

      it('should preserve semantic meaning: active → in_progress → active', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Test Task',
          description: null,
          status: 'active',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });
        vi.mocked(apiClient.patch).mockResolvedValue({ data: mockWorkItem });

        // Get task (backend → frontend)
        const response = await scheduleService.getTasks();
        const task = response.items[0];
        expect(task.status).toBe('in_progress');

        // Update task (frontend → backend)
        await scheduleService.updateTask(task.id, { status: task.status });

        // Verify the API was called with "active" status
        expect(apiClient.patch).toHaveBeenCalledWith(
          `/api/v1/workitems/${task.id}?change_description=Task updated`,
          expect.objectContaining({
            status: 'active',
          })
        );
      });

      it('should preserve semantic meaning: completed → completed → completed', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Test Task',
          description: null,
          status: 'completed',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });
        vi.mocked(apiClient.patch).mockResolvedValue({ data: mockWorkItem });

        // Get task (backend → frontend)
        const response = await scheduleService.getTasks();
        const task = response.items[0];
        expect(task.status).toBe('completed');

        // Update task (frontend → backend)
        await scheduleService.updateTask(task.id, { status: task.status });

        // Verify the API was called with "completed" status
        expect(apiClient.patch).toHaveBeenCalledWith(
          `/api/v1/workitems/${task.id}?change_description=Task updated`,
          expect.objectContaining({
            status: 'completed',
          })
        );
      });
    });
  });
});

  /**
   * Task 8.2: Test mapWorkItemToTask() function
   * Tests data transformation from backend WorkItemResponse to frontend Task
   */
  describe('mapWorkItemToTask() Function', () => {
    describe('Complete WorkItemResponse', () => {
      it('should map all fields correctly with complete data', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          type: 'task',
          title: 'Complete Task',
          description: 'Task description',
          status: 'active',
          priority: 3,
          assigned_to: 'user-123',
          version: '1.0',
          created_by: 'user-456',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          is_signed: false,
          estimated_hours: 16,
          start_date: '2024-01-01',
          end_date: '2024-01-03',
          dependencies: ['dep-1', 'dep-2'],
          required_resources: ['resource-1', 'resource-2'],
          resource_demand: { 'resource-1': 0.5, 'resource-2': 1.0 },
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        const task = response.items[0];

        expect(task.id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(task.title).toBe('Complete Task');
        expect(task.description).toBe('Task description');
        expect(task.status).toBe('in_progress'); // 'active' maps to 'in_progress'
        expect(task.priority).toBe(3);
        expect(task.assigned_to).toBe('user-123');
        expect(task.estimated_hours).toBe(16);
        expect(task.start_date).toBe('2024-01-01');
        expect(task.end_date).toBe('2024-01-03');
        expect(task.dependencies).toEqual(['dep-1', 'dep-2']);
        expect(task.required_resources).toEqual(['resource-1', 'resource-2']);
        expect(task.resource_demand).toEqual({ 'resource-1': 0.5, 'resource-2': 1.0 });
      });
    });

    describe('Minimal Required Fields', () => {
      it('should map task with only required fields', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Minimal Task',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: null, // Will default to 0
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        const task = response.items[0];

        expect(task.id).toBe('123');
        expect(task.title).toBe('Minimal Task');
        expect(task.description).toBeUndefined();
        expect(task.status).toBe('not_started');
        expect(task.priority).toBeUndefined();
        expect(task.assigned_to).toBeUndefined();
        expect(task.estimated_hours).toBe(0); // Defaults to 0
        expect(task.start_date).toBeUndefined();
        expect(task.end_date).toBeUndefined();
        expect(task.dependencies).toBeUndefined();
        expect(task.required_resources).toBeUndefined();
        expect(task.resource_demand).toBeUndefined();
      });

      it('should default estimated_hours to 0 when null', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Task without hours',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: null,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        const task = response.items[0];

        expect(task.estimated_hours).toBe(0);
      });
    });

    describe('Null/Undefined Optional Fields', () => {
      it('should handle null description', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Task',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        const task = response.items[0];

        expect(task.description).toBeUndefined();
      });

      it('should handle null priority', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Task',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        const task = response.items[0];

        expect(task.priority).toBeUndefined();
      });

      it('should handle null assigned_to', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Task',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        const task = response.items[0];

        expect(task.assigned_to).toBeUndefined();
      });

      it('should handle null dates', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Task',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        const task = response.items[0];

        expect(task.start_date).toBeUndefined();
        expect(task.end_date).toBeUndefined();
      });

      it('should handle null dependencies', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Task',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        const task = response.items[0];

        expect(task.dependencies).toBeUndefined();
      });

      it('should handle null required_resources', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Task',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        const task = response.items[0];

        expect(task.required_resources).toBeUndefined();
      });

      it('should handle null resource_demand', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Task',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        const task = response.items[0];

        expect(task.resource_demand).toBeUndefined();
      });
    });

    describe('Dependencies Array Conversion', () => {
      it('should convert dependencies array correctly', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Task with dependencies',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: ['dep-1', 'dep-2', 'dep-3'],
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        const task = response.items[0];

        expect(task.dependencies).toEqual(['dep-1', 'dep-2', 'dep-3']);
        expect(Array.isArray(task.dependencies)).toBe(true);
      });

      it('should handle empty dependencies array', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123',
          type: 'task',
          title: 'Task',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: [],
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: [mockWorkItem] });

        const response = await scheduleService.getTasks();
        const task = response.items[0];

        expect(task.dependencies).toEqual([]);
        expect(Array.isArray(task.dependencies)).toBe(true);
      });
    });
  });

  /**
   * Task 8.3: Test getTasks() method
   * Tests data fetching, filtering, pagination, and error handling
   */
  describe('getTasks() Method', () => {
    describe('Successful Data Fetch', () => {
      it('should fetch tasks successfully', async () => {
        const mockWorkItems: WorkItemResponse[] = [
          {
            id: '1',
            type: 'task',
            title: 'Task 1',
            description: null,
            status: 'draft',
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 8,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
          {
            id: '2',
            type: 'task',
            title: 'Task 2',
            description: null,
            status: 'active',
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 16,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
        ];

        vi.mocked(apiClient.get).mockResolvedValue({ data: mockWorkItems });

        const response = await scheduleService.getTasks();

        expect(response.items).toHaveLength(2);
        expect(response.items[0].title).toBe('Task 1');
        expect(response.items[1].title).toBe('Task 2');
        expect(response.total).toBe(2);
      });

      it('should call API with correct endpoint and parameters', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

        await scheduleService.getTasks();

        expect(apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('/api/v1/workitems')
        );
        expect(apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('type=task')
        );
        expect(apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('limit=1000')
        );
      });
    });

    describe('Filtering', () => {
      it('should filter by status', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

        await scheduleService.getTasks({ status: 'in_progress' });

        // Should map frontend status to backend status
        expect(apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('status=active')
        );
      });

      it('should filter by assigned_to', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

        await scheduleService.getTasks({ assigned_to: 'user-123' });

        expect(apiClient.get).toHaveBeenCalledWith(
          expect.stringContaining('assigned_to=user-123')
        );
      });

      it('should apply multiple filters', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

        await scheduleService.getTasks({
          status: 'completed',
          assigned_to: 'user-456',
        });

        // Verify API was called with both filters
        expect(apiClient.get).toHaveBeenCalledWith(
          expect.stringMatching(/status=completed/)
        );
        expect(apiClient.get).toHaveBeenCalledWith(
          expect.stringMatching(/assigned_to=user-456/)
        );
      });
    });

    describe('Pagination Calculation', () => {
      it('should calculate pagination metadata correctly', async () => {
        const mockWorkItems: WorkItemResponse[] = Array.from({ length: 50 }, (_, i) => ({
          id: `task-${i}`,
          type: 'task',
          title: `Task ${i}`,
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        }));

        vi.mocked(apiClient.get).mockResolvedValue({ data: mockWorkItems });

        const response = await scheduleService.getTasks({ page: 1, size: 20 });

        expect(response.total).toBe(50);
        expect(response.page).toBe(1);
        expect(response.size).toBe(20);
        expect(response.pages).toBe(3); // Math.ceil(50 / 20) = 3
        expect(response.items).toHaveLength(20);
      });

      it('should return correct items for page 2', async () => {
        const mockWorkItems: WorkItemResponse[] = Array.from({ length: 50 }, (_, i) => ({
          id: `task-${i}`,
          type: 'task',
          title: `Task ${i}`,
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        }));

        vi.mocked(apiClient.get).mockResolvedValue({ data: mockWorkItems });

        const response = await scheduleService.getTasks({ page: 2, size: 20 });

        expect(response.page).toBe(2);
        expect(response.items).toHaveLength(20);
        expect(response.items[0].id).toBe('task-20'); // First item on page 2
      });

      it('should return correct items for last page', async () => {
        const mockWorkItems: WorkItemResponse[] = Array.from({ length: 50 }, (_, i) => ({
          id: `task-${i}`,
          type: 'task',
          title: `Task ${i}`,
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        }));

        vi.mocked(apiClient.get).mockResolvedValue({ data: mockWorkItems });

        const response = await scheduleService.getTasks({ page: 3, size: 20 });

        expect(response.page).toBe(3);
        expect(response.items).toHaveLength(10); // Last page has 10 items
        expect(response.items[0].id).toBe('task-40'); // First item on page 3
      });

      it('should handle page number beyond total pages', async () => {
        const mockWorkItems: WorkItemResponse[] = Array.from({ length: 10 }, (_, i) => ({
          id: `task-${i}`,
          type: 'task',
          title: `Task ${i}`,
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        }));

        vi.mocked(apiClient.get).mockResolvedValue({ data: mockWorkItems });

        // Request page 5 when there's only 1 page
        const response = await scheduleService.getTasks({ page: 5, size: 20 });

        // Should clamp to last page
        expect(response.page).toBe(1);
        expect(response.pages).toBe(1);
      });

      it('should handle empty results', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

        const response = await scheduleService.getTasks();

        expect(response.items).toHaveLength(0);
        expect(response.total).toBe(0);
        expect(response.pages).toBe(1); // At least 1 page even with no items
      });
    });

    describe('Error Handling', () => {
      it('should handle network errors', async () => {
        const networkError = {
          isAxiosError: true,
          message: 'Network Error',
        };

        vi.mocked(apiClient.get).mockRejectedValue(networkError);

        await expect(scheduleService.getTasks()).rejects.toThrow(
          'Network error: Please check your internet connection'
        );
      });

      it('should handle 400 Bad Request', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 400,
            data: { detail: 'Invalid parameters' },
          },
          message: 'Bad Request',
        };

        vi.mocked(apiClient.get).mockRejectedValue(error);

        await expect(scheduleService.getTasks()).rejects.toThrow(
          'Invalid request: Invalid parameters'
        );
      });

      it('should handle 401 Unauthorized', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 401,
            data: { detail: 'Not authenticated' },
          },
          message: 'Unauthorized',
        };

        vi.mocked(apiClient.get).mockRejectedValue(error);

        await expect(scheduleService.getTasks()).rejects.toThrow(
          'Authentication required. Please log in.'
        );
      });

      it('should handle 403 Forbidden', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 403,
            data: { detail: 'Insufficient permissions' },
          },
          message: 'Forbidden',
        };

        vi.mocked(apiClient.get).mockRejectedValue(error);

        await expect(scheduleService.getTasks()).rejects.toThrow(
          'You do not have permission to perform this action.'
        );
      });

      it('should handle 404 Not Found', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 404,
            data: { detail: 'Resource not found' },
          },
          message: 'Not Found',
        };

        vi.mocked(apiClient.get).mockRejectedValue(error);

        await expect(scheduleService.getTasks()).rejects.toThrow(
          'Resource not found. Please contact support.'
        );
      });

      it('should handle 500 Internal Server Error', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 500,
            data: { detail: 'Database connection failed' },
          },
          message: 'Internal Server Error',
        };

        vi.mocked(apiClient.get).mockRejectedValue(error);

        await expect(scheduleService.getTasks()).rejects.toThrow(
          'Server error: Database connection failed. Please try again later.'
        );
      });

      it('should handle 503 Service Unavailable', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 503,
            data: { detail: 'Service temporarily unavailable' },
          },
          message: 'Service Unavailable',
        };

        vi.mocked(apiClient.get).mockRejectedValue(error);

        await expect(scheduleService.getTasks()).rejects.toThrow(
          'Service temporarily unavailable. Please try again later.'
        );
      });

      it('should handle invalid response structure', async () => {
        // Return non-array response
        vi.mocked(apiClient.get).mockResolvedValue({ data: { invalid: 'structure' } });

        await expect(scheduleService.getTasks()).rejects.toThrow(
          'Invalid response from server: expected array of tasks'
        );
      });

      it('should filter out invalid WorkItems', async () => {
        const mockWorkItems = [
          {
            id: '1',
            type: 'task',
            title: 'Valid Task',
            description: null,
            status: 'draft',
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 8,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
          {
            // Invalid: missing required fields
            id: '2',
            title: 'Invalid Task',
          },
        ];

        vi.mocked(apiClient.get).mockResolvedValue({ data: mockWorkItems });

        const response = await scheduleService.getTasks();

        // Should only include valid task
        expect(response.items).toHaveLength(1);
        expect(response.items[0].id).toBe('1');
      });
    });
  });

  /**
   * Task 8.4: Test CRUD methods
   * Tests getTask, createTask, updateTask, deleteTask methods
   */
  describe('CRUD Methods', () => {
    describe('getTask()', () => {
      it('should fetch a single task by ID', async () => {
        const mockWorkItem: WorkItemResponse = {
          id: '123e4567-e89b-12d3-a456-426614174000',
          type: 'task',
          title: 'Single Task',
          description: 'Task description',
          status: 'active',
          priority: 2,
          assigned_to: 'user-123',
          version: '1.0',
          created_by: 'user-456',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: '2024-01-01',
          end_date: '2024-01-03',
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.get).mockResolvedValue({ data: mockWorkItem });

        const task = await scheduleService.getTask('123e4567-e89b-12d3-a456-426614174000');

        expect(task.id).toBe('123e4567-e89b-12d3-a456-426614174000');
        expect(task.title).toBe('Single Task');
        expect(task.status).toBe('in_progress'); // 'active' maps to 'in_progress'
        expect(apiClient.get).toHaveBeenCalledWith(
          '/api/v1/workitems/123e4567-e89b-12d3-a456-426614174000'
        );
      });

      it('should handle 404 error when task not found', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 404,
            data: { detail: 'Task not found' },
          },
          message: 'Not Found',
        };

        vi.mocked(apiClient.get).mockRejectedValue(error);

        await expect(
          scheduleService.getTask('nonexistent-id')
        ).rejects.toThrow('Resource not found. Please contact support.');
      });

      it('should handle network errors', async () => {
        const networkError = {
          isAxiosError: true,
          message: 'Network Error',
        };

        vi.mocked(apiClient.get).mockRejectedValue(networkError);

        await expect(
          scheduleService.getTask('123')
        ).rejects.toThrow('Network error: Please check your internet connection');
      });
    });

    describe('createTask()', () => {
      it('should create a new task with valid data', async () => {
        const newTask = {
          title: 'New Task',
          estimated_hours: 16,
          status: 'not_started' as const,
          description: 'Task description',
          priority: 3,
        };

        const mockCreatedWorkItem: WorkItemResponse = {
          id: 'new-task-id',
          type: 'task',
          title: 'New Task',
          description: 'Task description',
          status: 'draft',
          priority: 3,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 16,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.post).mockResolvedValue({ data: mockCreatedWorkItem });

        const result = await scheduleService.createTask(newTask);

        expect(result.id).toBe('new-task-id');
        expect(result.title).toBe('New Task');
        expect(result.status).toBe('not_started');
        expect(apiClient.post).toHaveBeenCalledWith(
          '/api/v1/workitems',
          expect.objectContaining({
            type: 'task',
            title: 'New Task',
            description: 'Task description',
            status: 'draft', // Frontend 'not_started' maps to backend 'draft'
            priority: 3,
            estimated_hours: 16,
          })
        );
      });

      it('should create task with minimal required fields', async () => {
        const newTask = {
          title: 'Minimal Task',
          estimated_hours: 8,
          status: 'not_started' as const,
        };

        const mockCreatedWorkItem: WorkItemResponse = {
          id: 'new-task-id',
          type: 'task',
          title: 'Minimal Task',
          description: null,
          status: 'draft',
          priority: null,
          assigned_to: null,
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.post).mockResolvedValue({ data: mockCreatedWorkItem });

        const result = await scheduleService.createTask(newTask);

        expect(result.id).toBe('new-task-id');
        expect(result.title).toBe('Minimal Task');
      });

      it('should handle 400 error for invalid data', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 400,
            data: { detail: 'Title is required' },
          },
          message: 'Bad Request',
        };

        vi.mocked(apiClient.post).mockRejectedValue(error);

        const newTask = {
          title: '',
          estimated_hours: 8,
          status: 'not_started' as const,
        };

        await expect(
          scheduleService.createTask(newTask)
        ).rejects.toThrow('Invalid request: Title is required');
      });

      it('should handle 401 error when not authenticated', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 401,
            data: { detail: 'Not authenticated' },
          },
          message: 'Unauthorized',
        };

        vi.mocked(apiClient.post).mockRejectedValue(error);

        const newTask = {
          title: 'New Task',
          estimated_hours: 8,
          status: 'not_started' as const,
        };

        await expect(
          scheduleService.createTask(newTask)
        ).rejects.toThrow('Authentication required. Please log in.');
      });
    });

    describe('updateTask()', () => {
      it('should update task with partial updates', async () => {
        const updates = {
          title: 'Updated Title',
          status: 'in_progress' as const,
        };

        const mockUpdatedWorkItem: WorkItemResponse = {
          id: 'task-123',
          type: 'task',
          title: 'Updated Title',
          description: 'Original description',
          status: 'active',
          priority: 2,
          assigned_to: null,
          version: '1.1',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.patch).mockResolvedValue({ data: mockUpdatedWorkItem });

        const result = await scheduleService.updateTask('task-123', updates);

        expect(result.title).toBe('Updated Title');
        expect(result.status).toBe('in_progress');
        expect(apiClient.patch).toHaveBeenCalledWith(
          '/api/v1/workitems/task-123?change_description=Task updated',
          expect.objectContaining({
            title: 'Updated Title',
            status: 'active', // Frontend 'in_progress' maps to backend 'active'
          })
        );
      });

      it('should update only specified fields', async () => {
        const updates = {
          priority: 5,
        };

        const mockUpdatedWorkItem: WorkItemResponse = {
          id: 'task-123',
          type: 'task',
          title: 'Original Title',
          description: null,
          status: 'draft',
          priority: 5,
          assigned_to: null,
          version: '1.1',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          is_signed: false,
          estimated_hours: 8,
          start_date: null,
          end_date: null,
          dependencies: null,
          required_resources: null,
          resource_demand: null,
        };

        vi.mocked(apiClient.patch).mockResolvedValue({ data: mockUpdatedWorkItem });

        const result = await scheduleService.updateTask('task-123', updates);

        expect(result.priority).toBe(5);
        expect(apiClient.patch).toHaveBeenCalledWith(
          '/api/v1/workitems/task-123?change_description=Task updated',
          expect.objectContaining({
            priority: 5,
          })
        );
      });

      it('should handle 404 error when task not found', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 404,
            data: { detail: 'Task not found' },
          },
          message: 'Not Found',
        };

        vi.mocked(apiClient.patch).mockRejectedValue(error);

        await expect(
          scheduleService.updateTask('nonexistent-id', { title: 'New Title' })
        ).rejects.toThrow('Resource not found. Please contact support.');
      });

      it('should handle 400 error for invalid updates', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 400,
            data: { detail: 'Invalid priority value' },
          },
          message: 'Bad Request',
        };

        vi.mocked(apiClient.patch).mockRejectedValue(error);

        await expect(
          scheduleService.updateTask('task-123', { priority: 10 })
        ).rejects.toThrow('Invalid request: Invalid priority value');
      });
    });

    describe('deleteTask()', () => {
      it('should delete task with valid ID', async () => {
        vi.mocked(apiClient.delete).mockResolvedValue({ data: null });

        await scheduleService.deleteTask('task-123');

        expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/workitems/task-123');
      });

      it('should handle 404 error when task not found', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 404,
            data: { detail: 'Task not found' },
          },
          message: 'Not Found',
        };

        vi.mocked(apiClient.delete).mockRejectedValue(error);

        await expect(
          scheduleService.deleteTask('nonexistent-id')
        ).rejects.toThrow('Resource not found. Please contact support.');
      });

      it('should handle 403 error when not authorized', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 403,
            data: { detail: 'Not authorized to delete this task' },
          },
          message: 'Forbidden',
        };

        vi.mocked(apiClient.delete).mockRejectedValue(error);

        await expect(
          scheduleService.deleteTask('task-123')
        ).rejects.toThrow('You do not have permission to perform this action.');
      });

      it('should handle network errors', async () => {
        const networkError = {
          isAxiosError: true,
          message: 'Network Error',
        };

        vi.mocked(apiClient.delete).mockRejectedValue(networkError);

        await expect(
          scheduleService.deleteTask('task-123')
        ).rejects.toThrow('Network error: Please check your internet connection');
      });
    });
  });

  /**
   * Task 8.5: Test getStatistics() method
   * Tests statistics calculation from task arrays
   */
  describe('getStatistics() Method', () => {
    describe('Statistics Calculation', () => {
      it('should calculate statistics with various task statuses', async () => {
        const mockWorkItems: WorkItemResponse[] = [
          {
            id: '1',
            type: 'task',
            title: 'Task 1',
            description: null,
            status: 'draft', // not_started
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 8,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
          {
            id: '2',
            type: 'task',
            title: 'Task 2',
            description: null,
            status: 'active', // in_progress
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 16,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
          {
            id: '3',
            type: 'task',
            title: 'Task 3',
            description: null,
            status: 'completed', // completed
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 24,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
          {
            id: '4',
            type: 'task',
            title: 'Task 4',
            description: null,
            status: 'completed', // completed
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 12,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
        ];

        vi.mocked(apiClient.get).mockResolvedValue({ data: mockWorkItems });

        const stats = await scheduleService.getStatistics();

        expect(stats.total_tasks).toBe(4);
        expect(stats.completed_tasks).toBe(2);
        expect(stats.in_progress_tasks).toBe(1);
        expect(stats.blocked_tasks).toBe(0);
        expect(stats.total_estimated_hours).toBe(60); // 8 + 16 + 24 + 12
        expect(stats.completion_percentage).toBe(50); // 2/4 * 100
      });

      it('should calculate completion percentage correctly', async () => {
        const mockWorkItems: WorkItemResponse[] = [
          {
            id: '1',
            type: 'task',
            title: 'Task 1',
            description: null,
            status: 'completed',
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 8,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
          {
            id: '2',
            type: 'task',
            title: 'Task 2',
            description: null,
            status: 'completed',
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 8,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
          {
            id: '3',
            type: 'task',
            title: 'Task 3',
            description: null,
            status: 'completed',
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 8,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
          {
            id: '4',
            type: 'task',
            title: 'Task 4',
            description: null,
            status: 'draft',
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 8,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
        ];

        vi.mocked(apiClient.get).mockResolvedValue({ data: mockWorkItems });

        const stats = await scheduleService.getStatistics();

        expect(stats.completion_percentage).toBe(75); // 3/4 * 100
      });

      it('should handle empty task array', async () => {
        vi.mocked(apiClient.get).mockResolvedValue({ data: [] });

        const stats = await scheduleService.getStatistics();

        expect(stats.total_tasks).toBe(0);
        expect(stats.completed_tasks).toBe(0);
        expect(stats.in_progress_tasks).toBe(0);
        expect(stats.blocked_tasks).toBe(0);
        expect(stats.total_estimated_hours).toBe(0);
        expect(stats.completion_percentage).toBe(0);
      });

      it('should handle all tasks completed', async () => {
        const mockWorkItems: WorkItemResponse[] = [
          {
            id: '1',
            type: 'task',
            title: 'Task 1',
            description: null,
            status: 'completed',
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 8,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
          {
            id: '2',
            type: 'task',
            title: 'Task 2',
            description: null,
            status: 'completed',
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 16,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
        ];

        vi.mocked(apiClient.get).mockResolvedValue({ data: mockWorkItems });

        const stats = await scheduleService.getStatistics();

        expect(stats.total_tasks).toBe(2);
        expect(stats.completed_tasks).toBe(2);
        expect(stats.completion_percentage).toBe(100);
      });

      it('should handle tasks with null estimated_hours', async () => {
        const mockWorkItems: WorkItemResponse[] = [
          {
            id: '1',
            type: 'task',
            title: 'Task 1',
            description: null,
            status: 'draft',
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: null, // Will default to 0
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
          {
            id: '2',
            type: 'task',
            title: 'Task 2',
            description: null,
            status: 'active',
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 8,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
        ];

        vi.mocked(apiClient.get).mockResolvedValue({ data: mockWorkItems });

        const stats = await scheduleService.getStatistics();

        expect(stats.total_estimated_hours).toBe(8); // 0 + 8
      });

      it('should count blocked tasks correctly', async () => {
        // Note: Backend doesn't have 'blocked' status, so we can't test this directly
        // This test documents that blocked tasks would need special handling
        const mockWorkItems: WorkItemResponse[] = [
          {
            id: '1',
            type: 'task',
            title: 'Task 1',
            description: null,
            status: 'draft',
            priority: null,
            assigned_to: null,
            version: '1.0',
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            is_signed: false,
            estimated_hours: 8,
            start_date: null,
            end_date: null,
            dependencies: null,
            required_resources: null,
            resource_demand: null,
          },
        ];

        vi.mocked(apiClient.get).mockResolvedValue({ data: mockWorkItems });

        const stats = await scheduleService.getStatistics();

        // Backend doesn't support 'blocked' status, so count should be 0
        expect(stats.blocked_tasks).toBe(0);
      });
    });

    describe('Error Handling', () => {
      it('should propagate errors from getTasks', async () => {
        const error = {
          isAxiosError: true,
          response: {
            status: 500,
            data: { detail: 'Database error' },
          },
          message: 'Internal Server Error',
        };

        vi.mocked(apiClient.get).mockRejectedValue(error);

        await expect(scheduleService.getStatistics()).rejects.toThrow(
          'Server error: Database error. Please try again later.'
        );
      });

      it('should handle network errors', async () => {
        const networkError = {
          isAxiosError: true,
          message: 'Network Error',
        };

        vi.mocked(apiClient.get).mockRejectedValue(networkError);

        await expect(scheduleService.getStatistics()).rejects.toThrow(
          'Network error: Please check your internet connection'
        );
      });
    });
  });


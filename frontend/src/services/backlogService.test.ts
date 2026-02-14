/**
 * Tests for backlogService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { backlogService, Backlog, BacklogCreate, BacklogTask, ReorderRequest } from './backlogService';
import { apiClient } from './api';

vi.mock('./api');

describe('BacklogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBacklog', () => {
    it('should create a backlog', async () => {
      const projectId = 'project-123';
      const createData: BacklogCreate = {
        name: 'Product Backlog',
        description: 'Main product backlog',
      };
      const mockBacklog: Backlog = {
        id: 'backlog-123',
        name: 'Product Backlog',
        description: 'Main product backlog',
        project_id: projectId,
        created_at: '2024-01-01T00:00:00Z',
        task_count: 0,
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockBacklog } as any);

      const result = await backlogService.createBacklog(projectId, createData);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/v1/projects/${projectId}/backlogs`,
        createData
      );
      expect(result).toEqual(mockBacklog);
    });

    it('should throw error on failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('API Error'));

      await expect(
        backlogService.createBacklog('project-123', { name: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('getBacklogs', () => {
    it('should get all backlogs for a project', async () => {
      const projectId = 'project-123';
      const mockBacklogs: Backlog[] = [
        {
          id: 'backlog-1',
          name: 'Backlog 1',
          project_id: projectId,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'backlog-2',
          name: 'Backlog 2',
          project_id: projectId,
          created_at: '2024-01-02T00:00:00Z',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBacklogs } as any);

      const result = await backlogService.getBacklogs(projectId);

      expect(apiClient.get).toHaveBeenCalledWith(`/api/v1/projects/${projectId}/backlogs`);
      expect(result).toEqual(mockBacklogs);
    });
  });

  describe('getBacklog', () => {
    it('should get a single backlog', async () => {
      const backlogId = 'backlog-123';
      const mockBacklog: Backlog = {
        id: backlogId,
        name: 'Product Backlog',
        project_id: 'project-123',
        created_at: '2024-01-01T00:00:00Z',
        task_count: 5,
      };

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockBacklog } as any);

      const result = await backlogService.getBacklog(backlogId);

      expect(apiClient.get).toHaveBeenCalledWith(`/api/v1/backlogs/${backlogId}`);
      expect(result).toEqual(mockBacklog);
    });
  });

  describe('updateBacklog', () => {
    it('should update a backlog', async () => {
      const backlogId = 'backlog-123';
      const updateData = { name: 'Updated Backlog' };
      const mockBacklog: Backlog = {
        id: backlogId,
        name: 'Updated Backlog',
        project_id: 'project-123',
        created_at: '2024-01-01T00:00:00Z',
      };

      vi.mocked(apiClient.patch).mockResolvedValue({ data: mockBacklog } as any);

      const result = await backlogService.updateBacklog(backlogId, updateData);

      expect(apiClient.patch).toHaveBeenCalledWith(
        `/api/v1/backlogs/${backlogId}`,
        updateData
      );
      expect(result).toEqual(mockBacklog);
    });
  });

  describe('deleteBacklog', () => {
    it('should delete a backlog', async () => {
      const backlogId = 'backlog-123';

      vi.mocked(apiClient.delete).mockResolvedValue({} as any);

      await backlogService.deleteBacklog(backlogId);

      expect(apiClient.delete).toHaveBeenCalledWith(`/api/v1/backlogs/${backlogId}`);
    });
  });

  describe('getBacklogTasks', () => {
    it('should get all tasks in a backlog', async () => {
      const backlogId = 'backlog-123';
      const mockTasks: BacklogTask[] = [
        {
          id: 'task-1',
          type: 'task',
          title: 'Task 1',
          status: 'ready',
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          is_signed: false,
          priority_order: 1,
          added_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'task-2',
          type: 'task',
          title: 'Task 2',
          status: 'ready',
          version: '1.0',
          created_by: 'user-1',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          is_signed: false,
          priority_order: 2,
          added_at: '2024-01-02T00:00:00Z',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockTasks } as any);

      const result = await backlogService.getBacklogTasks(backlogId);

      expect(apiClient.get).toHaveBeenCalledWith(`/api/v1/backlogs/${backlogId}/tasks`);
      expect(result).toEqual(mockTasks);
    });
  });

  describe('addTaskToBacklog', () => {
    it('should add a task to backlog', async () => {
      const backlogId = 'backlog-123';
      const taskId = 'task-123';

      vi.mocked(apiClient.post).mockResolvedValue({} as any);

      await backlogService.addTaskToBacklog(backlogId, taskId);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/v1/backlogs/${backlogId}/tasks/${taskId}`
      );
    });
  });

  describe('removeTaskFromBacklog', () => {
    it('should remove a task from backlog', async () => {
      const backlogId = 'backlog-123';
      const taskId = 'task-123';

      vi.mocked(apiClient.delete).mockResolvedValue({} as any);

      await backlogService.removeTaskFromBacklog(backlogId, taskId);

      expect(apiClient.delete).toHaveBeenCalledWith(
        `/api/v1/backlogs/${backlogId}/tasks/${taskId}`
      );
    });
  });

  describe('reorderBacklogTasks', () => {
    it('should reorder backlog tasks', async () => {
      const backlogId = 'backlog-123';
      const reorders: ReorderRequest[] = [
        { task_id: 'task-1', new_priority_order: 2 },
        { task_id: 'task-2', new_priority_order: 1 },
      ];

      vi.mocked(apiClient.post).mockResolvedValue({} as any);

      await backlogService.reorderBacklogTasks(backlogId, reorders);

      expect(apiClient.post).toHaveBeenCalledWith(
        `/api/v1/backlogs/${backlogId}/reorder`,
        { reorders }
      );
    });
  });

  describe('getTaskBacklogStatus', () => {
    it('should get task backlog status when in backlog', async () => {
      const taskId = 'task-123';
      const mockStatus = { in_backlog: true, backlog_id: 'backlog-123' };

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatus } as any);

      const result = await backlogService.getTaskBacklogStatus(taskId);

      expect(apiClient.get).toHaveBeenCalledWith(`/api/v1/tasks/${taskId}/backlog-status`);
      expect(result).toEqual(mockStatus);
    });

    it('should get task backlog status when not in backlog', async () => {
      const taskId = 'task-123';
      const mockStatus = { in_backlog: false };

      vi.mocked(apiClient.get).mockResolvedValue({ data: mockStatus } as any);

      const result = await backlogService.getTaskBacklogStatus(taskId);

      expect(result).toEqual(mockStatus);
    });
  });
});

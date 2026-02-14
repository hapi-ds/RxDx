import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sprintService, Sprint, SprintCreate, SprintUpdate, SprintVelocity, BurndownPoint, SprintStatistics } from './sprintService';
import { apiClient } from './api';

vi.mock('./api');

describe('SprintService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockSprint: Sprint = {
    id: 'sprint-1',
    name: 'Sprint 1',
    goal: 'Complete user authentication',
    start_date: '2024-01-01',
    end_date: '2024-01-14',
    capacity_hours: 80,
    capacity_story_points: 20,
    actual_velocity_hours: 0,
    actual_velocity_story_points: 0,
    status: 'planning',
    project_id: 'project-1',
    created_at: '2024-01-01T00:00:00Z',
  };

  describe('createSprint', () => {
    it('should create a sprint', async () => {
      const createData: SprintCreate = {
        name: 'Sprint 1',
        goal: 'Complete user authentication',
        start_date: '2024-01-01',
        end_date: '2024-01-14',
        capacity_hours: 80,
        capacity_story_points: 20,
      };

      vi.mocked(apiClient.post).mockResolvedValue({ data: mockSprint } as any);

      const result = await sprintService.createSprint('project-1', createData);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/projects/project-1/sprints',
        createData
      );
      expect(result).toEqual(mockSprint);
    });

    it('should throw error on API failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('API Error'));

      await expect(
        sprintService.createSprint('project-1', {} as SprintCreate)
      ).rejects.toThrow();
    });
  });

  describe('getSprints', () => {
    it('should get all sprints for a project', async () => {
      const sprints = [mockSprint];
      vi.mocked(apiClient.get).mockResolvedValue({ data: sprints } as any);

      const result = await sprintService.getSprints('project-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/projects/project-1/sprints');
      expect(result).toEqual(sprints);
    });

    it('should throw error on API failure', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('API Error'));

      await expect(sprintService.getSprints('project-1')).rejects.toThrow();
    });
  });

  describe('getSprint', () => {
    it('should get a single sprint', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ data: mockSprint } as any);

      const result = await sprintService.getSprint('sprint-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/sprints/sprint-1');
      expect(result).toEqual(mockSprint);
    });

    it('should throw error on API failure', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('API Error'));

      await expect(sprintService.getSprint('sprint-1')).rejects.toThrow();
    });
  });

  describe('updateSprint', () => {
    it('should update a sprint', async () => {
      const updateData: SprintUpdate = {
        name: 'Sprint 1 Updated',
        goal: 'Updated goal',
      };

      const updatedSprint = { ...mockSprint, ...updateData };
      vi.mocked(apiClient.patch).mockResolvedValue({ data: updatedSprint } as any);

      const result = await sprintService.updateSprint('sprint-1', updateData);

      expect(apiClient.patch).toHaveBeenCalledWith(
        '/api/v1/sprints/sprint-1',
        updateData
      );
      expect(result).toEqual(updatedSprint);
    });

    it('should throw error on API failure', async () => {
      vi.mocked(apiClient.patch).mockRejectedValue(new Error('API Error'));

      await expect(
        sprintService.updateSprint('sprint-1', {})
      ).rejects.toThrow();
    });
  });

  describe('deleteSprint', () => {
    it('should delete a sprint', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({} as any);

      await sprintService.deleteSprint('sprint-1');

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/sprints/sprint-1');
    });

    it('should throw error on API failure', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('API Error'));

      await expect(sprintService.deleteSprint('sprint-1')).rejects.toThrow();
    });
  });

  describe('getSprintTasks', () => {
    it('should get tasks for a sprint', async () => {
      const tasks = [{ id: 'task-1', title: 'Task 1' }];
      vi.mocked(apiClient.get).mockResolvedValue({ data: tasks } as any);

      const result = await sprintService.getSprintTasks('sprint-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/sprints/sprint-1/tasks');
      expect(result).toEqual(tasks);
    });

    it('should throw error on API failure', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('API Error'));

      await expect(sprintService.getSprintTasks('sprint-1')).rejects.toThrow();
    });
  });

  describe('assignTaskToSprint', () => {
    it('should assign a task to a sprint', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({} as any);

      await sprintService.assignTaskToSprint('sprint-1', 'task-1');

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/sprints/sprint-1/tasks/task-1'
      );
    });

    it('should throw error on API failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('API Error'));

      await expect(
        sprintService.assignTaskToSprint('sprint-1', 'task-1')
      ).rejects.toThrow();
    });
  });

  describe('removeTaskFromSprint', () => {
    it('should remove a task from a sprint', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({} as any);

      await sprintService.removeTaskFromSprint('sprint-1', 'task-1');

      expect(apiClient.delete).toHaveBeenCalledWith(
        '/api/v1/sprints/sprint-1/tasks/task-1'
      );
    });

    it('should throw error on API failure', async () => {
      vi.mocked(apiClient.delete).mockRejectedValue(new Error('API Error'));

      await expect(
        sprintService.removeTaskFromSprint('sprint-1', 'task-1')
      ).rejects.toThrow();
    });
  });

  describe('startSprint', () => {
    it('should start a sprint', async () => {
      const activeSprint = { ...mockSprint, status: 'active' as const };
      vi.mocked(apiClient.post).mockResolvedValue({ data: activeSprint } as any);

      const result = await sprintService.startSprint('sprint-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/sprints/sprint-1/start');
      expect(result).toEqual(activeSprint);
    });

    it('should throw error on API failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('API Error'));

      await expect(sprintService.startSprint('sprint-1')).rejects.toThrow();
    });
  });

  describe('completeSprint', () => {
    it('should complete a sprint', async () => {
      const completedSprint = {
        ...mockSprint,
        status: 'completed' as const,
        actual_velocity_hours: 75,
        actual_velocity_story_points: 18,
      };
      vi.mocked(apiClient.post).mockResolvedValue({ data: completedSprint } as any);

      const result = await sprintService.completeSprint('sprint-1');

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/sprints/sprint-1/complete');
      expect(result).toEqual(completedSprint);
    });

    it('should throw error on API failure', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('API Error'));

      await expect(sprintService.completeSprint('sprint-1')).rejects.toThrow();
    });
  });

  describe('getSprintVelocity', () => {
    it('should get sprint velocity', async () => {
      const velocity: SprintVelocity = {
        sprint_id: 'sprint-1',
        sprint_name: 'Sprint 1',
        velocity_hours: 75,
        velocity_story_points: 18,
        completed_tasks: 9,
        total_tasks: 10,
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: velocity } as any);

      const result = await sprintService.getSprintVelocity('sprint-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/sprints/sprint-1/velocity');
      expect(result).toEqual(velocity);
    });

    it('should throw error on API failure', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('API Error'));

      await expect(sprintService.getSprintVelocity('sprint-1')).rejects.toThrow();
    });
  });

  describe('getSprintBurndown', () => {
    it('should get sprint burndown data', async () => {
      const burndown: BurndownPoint[] = [
        {
          date: '2024-01-01',
          ideal_remaining_hours: 80,
          actual_remaining_hours: 80,
          ideal_remaining_points: 20,
          actual_remaining_points: 20,
        },
        {
          date: '2024-01-07',
          ideal_remaining_hours: 40,
          actual_remaining_hours: 45,
          ideal_remaining_points: 10,
          actual_remaining_points: 11,
        },
      ];
      vi.mocked(apiClient.get).mockResolvedValue({ data: burndown } as any);

      const result = await sprintService.getSprintBurndown('sprint-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/sprints/sprint-1/burndown');
      expect(result).toEqual(burndown);
    });

    it('should throw error on API failure', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('API Error'));

      await expect(sprintService.getSprintBurndown('sprint-1')).rejects.toThrow();
    });
  });

  describe('getSprintStatistics', () => {
    it('should get sprint statistics', async () => {
      const stats: SprintStatistics = {
        total_tasks: 10,
        completed_tasks: 7,
        in_progress_tasks: 2,
        remaining_hours: 15,
        completed_hours: 65,
        completion_percentage: 70,
      };
      vi.mocked(apiClient.get).mockResolvedValue({ data: stats } as any);

      const result = await sprintService.getSprintStatistics('sprint-1');

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/sprints/sprint-1/statistics');
      expect(result).toEqual(stats);
    });

    it('should throw error on API failure', async () => {
      vi.mocked(apiClient.get).mockRejectedValue(new Error('API Error'));

      await expect(sprintService.getSprintStatistics('sprint-1')).rejects.toThrow();
    });
  });
});

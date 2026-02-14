/**
 * Sprint service
 * Handles all sprint-related API calls
 */

import { apiClient, getErrorMessage } from './api';

export type SprintStatus = 'planning' | 'active' | 'completed' | 'cancelled';

// WorkItem interface for sprint tasks
export interface WorkItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  status: string;
  priority?: number;
  assigned_to?: string;
  version: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_signed: boolean;
}

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  capacity_hours?: number;
  capacity_story_points?: number;
  actual_velocity_hours?: number;
  actual_velocity_story_points?: number;
  status: SprintStatus;
  project_id: string;
  created_at: string;
}

export interface SprintCreate {
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  capacity_hours?: number;
  capacity_story_points?: number;
}

export interface SprintUpdate {
  name?: string;
  goal?: string;
  start_date?: string;
  end_date?: string;
  capacity_hours?: number;
  capacity_story_points?: number;
  status?: SprintStatus;
}

export interface SprintVelocity {
  sprint_id: string;
  sprint_name: string;
  velocity_hours: number;
  velocity_story_points: number;
  completed_tasks: number;
  total_tasks: number;
}

export interface BurndownPoint {
  date: string;
  ideal_remaining_hours: number;
  actual_remaining_hours: number;
  ideal_remaining_points: number;
  actual_remaining_points: number;
}

export interface SprintStatistics {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  remaining_hours: number;
  completed_hours: number;
  completion_percentage: number;
}

class SprintService {
  private readonly basePath = '/api/v1';

  async createSprint(projectId: string, data: SprintCreate): Promise<Sprint> {
    try {
      const response = await apiClient.post<Sprint>(
        `${this.basePath}/projects/${projectId}/sprints`,
        data
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getSprints(projectId: string): Promise<Sprint[]> {
    try {
      const response = await apiClient.get<Sprint[]>(
        `${this.basePath}/projects/${projectId}/sprints`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getSprint(sprintId: string): Promise<Sprint> {
    try {
      const response = await apiClient.get<Sprint>(
        `${this.basePath}/sprints/${sprintId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async updateSprint(sprintId: string, data: SprintUpdate): Promise<Sprint> {
    try {
      const response = await apiClient.patch<Sprint>(
        `${this.basePath}/sprints/${sprintId}`,
        data
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async deleteSprint(sprintId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.basePath}/sprints/${sprintId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getSprintTasks(sprintId: string): Promise<WorkItem[]> {
    try {
      const response = await apiClient.get<WorkItem[]>(
        `${this.basePath}/sprints/${sprintId}/tasks`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async assignTaskToSprint(sprintId: string, taskId: string): Promise<void> {
    try {
      await apiClient.post(
        `${this.basePath}/sprints/${sprintId}/tasks/${taskId}`
      );
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async removeTaskFromSprint(sprintId: string, taskId: string): Promise<void> {
    try {
      await apiClient.delete(
        `${this.basePath}/sprints/${sprintId}/tasks/${taskId}`
      );
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async startSprint(sprintId: string): Promise<Sprint> {
    try {
      const response = await apiClient.post<Sprint>(
        `${this.basePath}/sprints/${sprintId}/start`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async completeSprint(sprintId: string): Promise<Sprint> {
    try {
      const response = await apiClient.post<Sprint>(
        `${this.basePath}/sprints/${sprintId}/complete`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getSprintVelocity(sprintId: string): Promise<SprintVelocity> {
    try {
      const response = await apiClient.get<SprintVelocity>(
        `${this.basePath}/sprints/${sprintId}/velocity`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getSprintBurndown(sprintId: string): Promise<BurndownPoint[]> {
    try {
      const response = await apiClient.get<BurndownPoint[]>(
        `${this.basePath}/sprints/${sprintId}/burndown`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getSprintStatistics(sprintId: string): Promise<SprintStatistics> {
    try {
      const response = await apiClient.get<SprintStatistics>(
        `${this.basePath}/sprints/${sprintId}/statistics`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
}

export const sprintService = new SprintService();

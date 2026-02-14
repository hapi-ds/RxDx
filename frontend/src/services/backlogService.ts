/**
 * Backlog service
 * Handles all backlog-related API calls
 */

import { apiClient, getErrorMessage } from './api';

// WorkItem interface for backlog tasks
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

export interface Backlog {
  id: string;
  name: string;
  description?: string;
  project_id: string;
  created_at: string;
  task_count?: number;
}

export interface BacklogCreate {
  name: string;
  description?: string;
}

export interface BacklogUpdate {
  name?: string;
  description?: string;
}

export interface BacklogTask extends WorkItem {
  priority_order: number;
  added_at: string;
}

export interface ReorderRequest {
  task_id: string;
  new_priority_order: number;
}

class BacklogService {
  private readonly basePath = '/api/v1';

  async createBacklog(projectId: string, data: BacklogCreate): Promise<Backlog> {
    try {
      const response = await apiClient.post<Backlog>(
        `${this.basePath}/projects/${projectId}/backlogs`,
        data
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getBacklogs(projectId: string): Promise<Backlog[]> {
    try {
      const response = await apiClient.get<Backlog[]>(
        `${this.basePath}/projects/${projectId}/backlogs`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getBacklog(backlogId: string): Promise<Backlog> {
    try {
      const response = await apiClient.get<Backlog>(
        `${this.basePath}/backlogs/${backlogId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async updateBacklog(backlogId: string, data: BacklogUpdate): Promise<Backlog> {
    try {
      const response = await apiClient.patch<Backlog>(
        `${this.basePath}/backlogs/${backlogId}`,
        data
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async deleteBacklog(backlogId: string): Promise<void> {
    try {
      await apiClient.delete(`${this.basePath}/backlogs/${backlogId}`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getBacklogTasks(backlogId: string): Promise<BacklogTask[]> {
    try {
      const response = await apiClient.get<BacklogTask[]>(
        `${this.basePath}/backlogs/${backlogId}/tasks`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async addTaskToBacklog(backlogId: string, taskId: string): Promise<void> {
    try {
      await apiClient.post(
        `${this.basePath}/backlogs/${backlogId}/tasks/${taskId}`
      );
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async removeTaskFromBacklog(backlogId: string, taskId: string): Promise<void> {
    try {
      await apiClient.delete(
        `${this.basePath}/backlogs/${backlogId}/tasks/${taskId}`
      );
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async reorderBacklogTasks(backlogId: string, reorders: ReorderRequest[]): Promise<void> {
    try {
      await apiClient.post(
        `${this.basePath}/backlogs/${backlogId}/reorder`,
        { reorders }
      );
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getTaskBacklogStatus(taskId: string): Promise<{ in_backlog: boolean; backlog_id?: string }> {
    try {
      const response = await apiClient.get<{ in_backlog: boolean; backlog_id?: string }>(
        `${this.basePath}/tasks/${taskId}/backlog-status`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
}

export const backlogService = new BacklogService();

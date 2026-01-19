/**
 * WorkItem service
 * Handles all workitem-related API calls
 */

import { apiClient, getErrorMessage } from './api';

export type WorkItemType = 'requirement' | 'task' | 'test' | 'risk' | 'document';
export type WorkItemStatus = 'draft' | 'active' | 'completed' | 'archived';

export interface WorkItem {
  id: string;
  type: WorkItemType;
  title: string;
  description?: string;
  status: WorkItemStatus;
  priority?: number;
  assigned_to?: string;
  version: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_signed: boolean;
}

export interface WorkItemCreate {
  type: WorkItemType;
  title: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: number;
  assigned_to?: string;
}

export interface WorkItemUpdate {
  title?: string;
  description?: string;
  status?: WorkItemStatus;
  priority?: number;
  assigned_to?: string;
}

export interface WorkItemListParams {
  type?: WorkItemType;
  status?: WorkItemStatus;
  assigned_to?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface WorkItemListResponse {
  items: WorkItem[];
  total: number;
  skip: number;
  limit: number;
}

export interface VersionHistoryItem {
  version: string;
  title: string;
  description?: string;
  status: WorkItemStatus;
  created_by: string;
  created_at: string;
  change_description?: string;
}

class WorkItemService {
  private readonly basePath = '/api/v1/workitems';

  async list(params?: WorkItemListParams): Promise<WorkItemListResponse> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.type) queryParams.append('type', params.type);
      if (params?.status) queryParams.append('status', params.status);
      if (params?.assigned_to) queryParams.append('assigned_to', params.assigned_to);
      if (params?.search) queryParams.append('search', params.search);
      // Backend uses 'offset' instead of 'skip'
      if (params?.skip !== undefined) queryParams.append('offset', params.skip.toString());
      if (params?.limit !== undefined) queryParams.append('limit', params.limit.toString());

      const url = queryParams.toString()
        ? `${this.basePath}?${queryParams.toString()}`
        : this.basePath;

      // Backend returns array directly, not paginated response object
      const response = await apiClient.get<WorkItem[]>(url);
      const items = response.data || [];
      
      // Wrap in expected response format
      return {
        items,
        total: items.length,
        skip: params?.skip || 0,
        limit: params?.limit || 100,
      };
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async get(id: string): Promise<WorkItem> {
    try {
      const response = await apiClient.get<WorkItem>(`${this.basePath}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async create(data: WorkItemCreate): Promise<WorkItem> {
    try {
      const response = await apiClient.post<WorkItem>(this.basePath, data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async update(id: string, data: WorkItemUpdate): Promise<WorkItem> {
    try {
      const response = await apiClient.patch<WorkItem>(`${this.basePath}/${id}`, data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await apiClient.delete(`${this.basePath}/${id}`);
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getHistory(id: string): Promise<VersionHistoryItem[]> {
    try {
      const response = await apiClient.get<VersionHistoryItem[]>(
        `${this.basePath}/${id}/history`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getVersion(id: string, version: string): Promise<WorkItem> {
    try {
      const response = await apiClient.get<WorkItem>(
        `${this.basePath}/${id}/version/${version}`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
}

export const workitemService = new WorkItemService();

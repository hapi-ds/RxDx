/**
 * Common TypeScript type definitions
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'project_manager' | 'validator' | 'auditor' | 'user';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkItem {
  id: string;
  type: 'requirement' | 'task' | 'test' | 'risk' | 'document';
  title: string;
  description?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  priority?: number;
  assignedTo?: string;
  version: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isSigned: boolean;
}

export interface DigitalSignature {
  id: string;
  workitemId: string;
  workitemVersion: string;
  userId: string;
  signatureHash: string;
  contentHash: string;
  signedAt: string;
  isValid: boolean;
  invalidatedAt?: string;
  invalidationReason?: string;
}

export interface ApiError {
  message: string;
  detail?: string;
  statusCode: number;
}

// Re-export filter types
export type {
  NodeTypeOption,
  FilterLayout,
  NodeTypeCategory,
  WorkItemType,
  GraphNodeType,
} from './filters';

export {
  WORK_ITEM_TYPE_OPTIONS,
  GRAPH_NODE_TYPE_OPTIONS,
  CATEGORY_LABELS,
} from './filters';

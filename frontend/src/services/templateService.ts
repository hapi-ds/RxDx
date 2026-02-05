/**
 * Template management service
 * Handles API calls for template operations
 */

import { apiClient } from './api';

export interface TemplateMetadata {
  name: string;
  version: string;
  description: string;
  author: string;
}

export interface TemplateSettings {
  default_password?: string;
}

export interface TemplateUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active?: boolean;
}

export interface WorkItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  status?: string;
  priority?: number;
  assigned_to?: string;
  [key: string]: any;
}

export interface WorkItems {
  requirements?: WorkItem[];
  tasks?: WorkItem[];
  tests?: WorkItem[];
  risks?: WorkItem[];
  documents?: WorkItem[];
}

export interface Relationship {
  from_id: string;
  to_id: string;
  relationship_type: string;
}

export interface TemplateDefinition {
  metadata: TemplateMetadata;
  settings?: TemplateSettings;
  users?: TemplateUser[];
  workitems?: WorkItems;
  relationships?: Relationship[];
}

export interface EntityResult {
  id: string;
  type: string;
  status: 'created' | 'skipped' | 'failed';
  message: string;
  error?: string;
}

export interface ApplicationResult {
  success: boolean;
  template_name: string;
  dry_run: boolean;
  created_count: number;
  skipped_count: number;
  failed_count: number;
  entities: EntityResult[];
}

export interface ValidationError {
  path: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationError[];
}

class TemplateService {
  private basePath = '/templates';

  /**
   * List all available templates
   */
  async listTemplates(): Promise<TemplateMetadata[]> {
    const response = await apiClient.get<TemplateMetadata[]>(this.basePath);
    return response.data;
  }

  /**
   * Get template details by name
   */
  async getTemplate(name: string): Promise<TemplateDefinition> {
    const response = await apiClient.get<TemplateDefinition>(`${this.basePath}/${name}`);
    return response.data;
  }

  /**
   * Apply a template to the database
   */
  async applyTemplate(name: string, dryRun: boolean = false): Promise<ApplicationResult> {
    const response = await apiClient.post<ApplicationResult>(
      `${this.basePath}/${name}/apply`,
      null,
      {
        params: { dry_run: dryRun },
      }
    );
    return response.data;
  }

  /**
   * Validate a template without applying it
   */
  async validateTemplate(name: string): Promise<ValidationResult> {
    const response = await apiClient.post<ValidationResult>(
      `${this.basePath}/${name}/validate`
    );
    return response.data;
  }
}

export const templateService = new TemplateService();

/**
 * Document generation service
 * Handles API calls for document generation and retrieval
 */

import { apiClient } from './api';

export const DocumentType = {
  DESIGN_REVIEW: 'design_review',
  TRACEABILITY_MATRIX: 'traceability_matrix',
  FMEA: 'fmea',
  INVOICE: 'invoice',
} as const;

export type DocumentType = typeof DocumentType[keyof typeof DocumentType];

export const DocumentFormat = {
  PDF: 'pdf',
  EXCEL: 'excel',
  WORD: 'word',
} as const;

export type DocumentFormat = typeof DocumentFormat[keyof typeof DocumentFormat];

export const DocumentStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type DocumentStatus = typeof DocumentStatus[keyof typeof DocumentStatus];

export interface DocumentRecord {
  id: string;
  project_id: string;
  document_type: DocumentType;
  format: DocumentFormat;
  status: DocumentStatus;
  filename: string;
  file_path: string;
  file_size_bytes: number;
  content_hash: string;
  version: string;
  metadata: Record<string, any>;
  generated_at: string;
  generated_by: string;
}

export interface DesignReviewRequest {
  project_id: string;
  title?: string;
  requirement_ids?: string[];
  include_signatures?: boolean;
  include_version_history?: boolean;
}

export interface DesignReviewResponse {
  document_id: string;
  project_id: string;
  status: DocumentStatus;
  filename: string;
  file_size_bytes: number;
  requirement_count: number;
  signature_count: number;
  generated_at: string;
  generated_by: string;
  download_url: string;
}

export interface TraceabilityMatrixRequest {
  project_id: string;
  requirement_ids?: string[];
  include_tests?: boolean;
  include_risks?: boolean;
  include_signatures?: boolean;
}

export interface TraceabilityMatrixResponse {
  document_id: string;
  project_id: string;
  status: DocumentStatus;
  filename: string;
  file_size_bytes: number;
  requirement_count: number;
  test_count: number;
  risk_count: number;
  coverage_percentage: number;
  generated_at: string;
  generated_by: string;
  download_url: string;
}

export interface FMEARequest {
  project_id: string;
  risk_ids?: string[];
  min_rpn?: number;
  include_failure_chains?: boolean;
  include_mitigations?: boolean;
}

export interface FMEAResponse {
  document_id: string;
  project_id: string;
  status: DocumentStatus;
  filename: string;
  file_size_bytes: number;
  risk_count: number;
  failure_count: number;
  mitigation_count: number;
  average_rpn: number;
  max_rpn: number;
  generated_at: string;
  generated_by: string;
  download_url: string;
}

export interface BillingPeriod {
  start_date: string;
  end_date: string;
}

export interface InvoiceRequest {
  project_id: string;
  invoice_number: string;
  billing_period: BillingPeriod;
  client_name: string;
  client_address?: string;
  hourly_rate?: number;
  tax_rate?: number;
  notes?: string;
  template_path?: string;
}

export interface InvoiceResponse {
  document_id: string;
  project_id: string;
  status: DocumentStatus;
  filename: string;
  file_size_bytes: number;
  invoice_number: string;
  total_hours: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  generated_at: string;
  generated_by: string;
  download_url: string;
}

export interface DocumentListParams {
  project_id?: string;
  document_type?: DocumentType;
  limit?: number;
  offset?: number;
}

export interface DocumentListResponse {
  documents: DocumentRecord[];
  total: number;
  limit: number;
  offset: number;
}

class DocumentService {
  private basePath = '/documents';

  /**
   * Generate a design review PDF document
   */
  async generateDesignReview(request: DesignReviewRequest): Promise<DesignReviewResponse> {
    const response = await apiClient.post<DesignReviewResponse>(
      `${this.basePath}/design-review`,
      request
    );
    return response.data;
  }

  /**
   * Generate a traceability matrix PDF document
   */
  async generateTraceabilityMatrix(
    request: TraceabilityMatrixRequest
  ): Promise<TraceabilityMatrixResponse> {
    const response = await apiClient.post<TraceabilityMatrixResponse>(
      `${this.basePath}/traceability-matrix`,
      request
    );
    return response.data;
  }

  /**
   * Generate an FMEA Excel document
   */
  async generateFMEA(request: FMEARequest): Promise<FMEAResponse> {
    const response = await apiClient.post<FMEAResponse>(
      `${this.basePath}/fmea`,
      request
    );
    return response.data;
  }

  /**
   * Generate an invoice Word document
   */
  async generateInvoice(request: InvoiceRequest): Promise<InvoiceResponse> {
    const response = await apiClient.post<InvoiceResponse>(
      `${this.basePath}/invoice`,
      request
    );
    return response.data;
  }

  /**
   * Get document metadata by ID
   */
  async getDocument(documentId: string): Promise<DocumentRecord> {
    const response = await apiClient.get<DocumentRecord>(
      `${this.basePath}/${documentId}`
    );
    return response.data;
  }

  /**
   * Download a document file
   */
  async downloadDocument(documentId: string, filename: string): Promise<void> {
    const response = await apiClient.get<Blob>(`${this.basePath}/${documentId}/download`, {
      responseType: 'blob',
    });

    // Create a download link
    const url = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * List documents with optional filtering
   */
  async listDocuments(params?: DocumentListParams): Promise<DocumentListResponse> {
    const response = await apiClient.get<DocumentListResponse>(this.basePath, {
      params,
    });
    return response.data;
  }
}

export const documentService = new DocumentService();

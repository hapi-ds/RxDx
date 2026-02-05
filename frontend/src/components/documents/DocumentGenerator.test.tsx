/**
 * Unit tests for DocumentGenerator component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DocumentGenerator } from './DocumentGenerator';
import * as documentService from '../../services/documentService';

// Mock the document service
vi.mock('../../services/documentService', () => ({
  documentService: {
    generateDesignReview: vi.fn(),
    generateTraceabilityMatrix: vi.fn(),
    generateFMEA: vi.fn(),
    generateInvoice: vi.fn(),
  },
  DocumentType: {
    DESIGN_REVIEW: 'design_review',
    TRACEABILITY_MATRIX: 'traceability_matrix',
    FMEA: 'fmea',
    INVOICE: 'invoice',
  },
  DocumentFormat: {
    PDF: 'pdf',
    EXCEL: 'excel',
    WORD: 'word',
  },
  DocumentStatus: {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
  },
}));

describe('DocumentGenerator', () => {
  const mockOnClose = vi.fn();
  const mockOnGenerated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Design Review Generator', () => {
    it('renders design review form', () => {
      render(
        <DocumentGenerator
          type="design_review"
          onClose={mockOnClose}
          onGenerated={mockOnGenerated}
        />
      );

      expect(screen.getByText('Generate Design Review')).toBeInTheDocument();
      expect(screen.getByLabelText(/Project ID/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Document Title/i)).toBeInTheDocument();
      expect(screen.getByText(/Include Digital Signatures/i)).toBeInTheDocument();
    });

    it('generates design review with valid input', async () => {
      const mockResponse = {
        document_id: 'doc-123',
        project_id: 'proj-123',
        status: 'completed',
        filename: 'design_review.pdf',
        file_size_bytes: 1024,
        requirement_count: 5,
        signature_count: 2,
        generated_at: new Date().toISOString(),
        generated_by: 'user-123',
        download_url: '/api/v1/documents/doc-123',
      };

      vi.mocked(documentService.documentService.generateDesignReview).mockResolvedValue(mockResponse);

      render(
        <DocumentGenerator
          type="design_review"
          onClose={mockOnClose}
          onGenerated={mockOnGenerated}
        />
      );

      const projectIdInput = screen.getByLabelText(/Project ID/i);
      fireEvent.change(projectIdInput, { target: { value: 'proj-123' } });

      const generateButton = screen.getByText(/Generate Document/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(documentService.documentService.generateDesignReview).toHaveBeenCalledWith({
          project_id: 'proj-123',
          title: undefined,
          include_signatures: true,
          include_version_history: false,
        });
        expect(mockOnGenerated).toHaveBeenCalled();
      });
    });

    it('shows error when project ID is missing', async () => {
      render(
        <DocumentGenerator
          type="design_review"
          onClose={mockOnClose}
          onGenerated={mockOnGenerated}
        />
      );

      const generateButton = screen.getByText(/Generate Document/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Project ID is required/i)).toBeInTheDocument();
      });
    });
  });

  describe('FMEA Generator', () => {
    it('renders FMEA form with min RPN field', () => {
      render(
        <DocumentGenerator
          type="fmea"
          onClose={mockOnClose}
          onGenerated={mockOnGenerated}
        />
      );

      expect(screen.getByText('Generate FMEA Report')).toBeInTheDocument();
      expect(screen.getByLabelText(/Minimum RPN/i)).toBeInTheDocument();
      expect(screen.getByText(/Include Failure Chains/i)).toBeInTheDocument();
    });
  });

  describe('Invoice Generator', () => {
    it('renders invoice form with required fields', () => {
      render(
        <DocumentGenerator
          type="invoice"
          onClose={mockOnClose}
          onGenerated={mockOnGenerated}
        />
      );

      expect(screen.getByText('Generate Invoice')).toBeInTheDocument();
      expect(screen.getByLabelText(/Invoice Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Client Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Billing Start Date/i)).toBeInTheDocument();
    });

    it('shows error when client name is missing', async () => {
      render(
        <DocumentGenerator
          type="invoice"
          onClose={mockOnClose}
          onGenerated={mockOnGenerated}
        />
      );

      const projectIdInput = screen.getByLabelText(/Project ID/i);
      fireEvent.change(projectIdInput, { target: { value: 'proj-123' } });

      const generateButton = screen.getByText(/Generate Document/i);
      fireEvent.click(generateButton);

      await waitFor(() => {
        expect(screen.getByText(/Client name is required/i)).toBeInTheDocument();
      });
    });
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <DocumentGenerator
        type="design_review"
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking outside modal', () => {
    render(
      <DocumentGenerator
        type="design_review"
        onClose={mockOnClose}
        onGenerated={mockOnGenerated}
      />
    );

    const overlay = screen.getByText('Generate Design Review').closest('.modal-overlay');
    if (overlay) {
      fireEvent.click(overlay);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });
});

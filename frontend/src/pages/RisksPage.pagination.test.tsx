/**
 * Risks Page Pagination Tests
 * Tests pagination functionality for the Risks page
 * Validates task 24.3.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RisksPage } from './RisksPage';
import { riskService, type RiskNode, type RiskListResponse } from '../services';

// Mock the services
vi.mock('../services', async () => {
  const actual = await vi.importActual('../services');
  return {
    ...actual,
    riskService: {
      getRisks: vi.fn(),
      deleteRisk: vi.fn(),
    },
  };
});

// Mock RiskCard component
vi.mock('../components/risks', () => ({
  RiskCard: ({ risk, onClick }: { risk: RiskNode; onClick: (risk: RiskNode) => void }) => (
    <div 
      data-testid={`risk-card-${risk.id}`}
      onClick={() => onClick(risk)}
      role="button"
      aria-label={`View risk ${risk.title}`}
    >
      <h3>{risk.title}</h3>
      <p>RPN: {risk.rpn}</p>
      <p>Status: {risk.status}</p>
    </div>
  ),
}));

describe('RisksPage Pagination', () => {
  const mockRisks: RiskNode[] = Array.from({ length: 50 }, (_, i) => ({
    id: `risk-${i + 1}`,
    title: `Risk ${i + 1}`,
    description: `Description for risk ${i + 1}`,
    status: 'identified' as const,
    severity: 5,
    occurrence: 4,
    detection: 3,
    rpn: 60,
    version: '1.0',
    created_by: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_signed: false,
    linked_design_items: [],
    linked_process_items: [],
    mitigation_count: 0,
    has_open_mitigations: false,
  }));

  const createMockResponse = (page: number, size: number): RiskListResponse => {
    const start = (page - 1) * size;
    const end = start + size;
    const items = mockRisks.slice(start, end);
    
    return {
      items,
      total: mockRisks.length,
      page,
      size,
      pages: Math.ceil(mockRisks.length / size),
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementation
    vi.mocked(riskService.getRisks).mockImplementation(async (filters) => {
      const page = filters?.page || 1;
      const size = filters?.size || 20;
      return createMockResponse(page, size);
    });
  });

  it('should display pagination controls when there are multiple pages', async () => {
    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
    });

    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('should not display pagination when there is only one page', async () => {
    // Mock response with fewer risks
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: mockRisks.slice(0, 10),
      total: 10,
      page: 1,
      size: 20,
      pages: 1,
    });

    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByTestId('risk-card-risk-1')).toBeInTheDocument();
    });

    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
  });

  it('should disable Previous button on first page', async () => {
    render(<RisksPage />);

    await waitFor(() => {
      const prevButton = screen.getByText('Previous').closest('button');
      expect(prevButton).toBeDisabled();
    });
  });

  it('should disable Next button on last page', async () => {
    // Mock only 2 pages of data (40 risks)
    const smallerMockRisks = mockRisks.slice(0, 40);
    vi.mocked(riskService.getRisks).mockImplementation(async (filters) => {
      const page = filters?.page || 1;
      const size = filters?.size || 20;
      const start = (page - 1) * size;
      const end = start + size;
      const items = smallerMockRisks.slice(start, end);
      
      return {
        items,
        total: smallerMockRisks.length,
        page,
        size,
        pages: Math.ceil(smallerMockRisks.length / size),
      };
    });

    const user = userEvent.setup();
    render(<RisksPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('risk-card-risk-1')).toBeInTheDocument();
    });

    // Navigate to last page (page 2)
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
    });

    expect(nextButton.closest('button')).toBeDisabled();
  });

  it('should navigate to next page when Next button is clicked', async () => {
    const user = userEvent.setup();
    render(<RisksPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('risk-card-risk-1')).toBeInTheDocument();
    });

    // Click Next button
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Verify getRisks was called with page 2
    await waitFor(() => {
      expect(riskService.getRisks).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });
  });

  it('should navigate to previous page when Previous button is clicked', async () => {
    const user = userEvent.setup();
    render(<RisksPage />);

    // Wait for initial load on page 1
    await waitFor(() => {
      expect(screen.getByTestId('risk-card-risk-1')).toBeInTheDocument();
    });

    // Navigate to page 2 first
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    });

    // Click Previous button to go back to page 1
    const prevButton = screen.getByText('Previous');
    await user.click(prevButton);

    // Verify getRisks was called with page 1
    await waitFor(() => {
      expect(riskService.getRisks).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });
  });

  it('should display correct page information', async () => {
    render(<RisksPage />);

    await waitFor(() => {
      const pageInfo = screen.getByText(/Page 1 of 3 \(50 total\)/);
      expect(pageInfo).toBeInTheDocument();
    });
  });

  it('should reset to page 1 when filters change', async () => {
    const user = userEvent.setup();
    render(<RisksPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('risk-card-risk-1')).toBeInTheDocument();
    });

    // Navigate to page 2
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(riskService.getRisks).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });

    // Change filter
    const statusFilter = screen.getByLabelText('Status');
    await user.selectOptions(statusFilter, 'assessed');

    // Verify getRisks was called with page 1
    await waitFor(() => {
      expect(riskService.getRisks).toHaveBeenCalledWith(
        expect.objectContaining({ 
          page: 1,
          status: 'assessed'
        })
      );
    });
  });

  it('should maintain page size across pagination', async () => {
    const user = userEvent.setup();
    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByTestId('risk-card-risk-1')).toBeInTheDocument();
    });

    // Navigate to page 2
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    // Verify size is maintained
    await waitFor(() => {
      expect(riskService.getRisks).toHaveBeenCalledWith(
        expect.objectContaining({ 
          page: 2,
          size: 20
        })
      );
    });
  });

  it('should handle pagination with RPN filters', async () => {
    const user = userEvent.setup();
    
    // Mock filtered results
    const highRPNRisks = mockRisks.filter(r => r.rpn >= 100).slice(0, 25);
    vi.mocked(riskService.getRisks).mockImplementation(async (filters) => {
      if (filters?.min_rpn) {
        const page = filters.page || 1;
        const size = filters.size || 20;
        const start = (page - 1) * size;
        const end = start + size;
        return {
          items: highRPNRisks.slice(start, end),
          total: highRPNRisks.length,
          page,
          size,
          pages: Math.ceil(highRPNRisks.length / size),
        };
      }
      return createMockResponse(filters?.page || 1, filters?.size || 20);
    });

    render(<RisksPage />);

    // Apply RPN filter
    const minRPNFilter = screen.getByLabelText('Min RPN');
    await user.type(minRPNFilter, '100');

    await waitFor(() => {
      expect(riskService.getRisks).toHaveBeenCalledWith(
        expect.objectContaining({ 
          min_rpn: 100,
          page: 1
        })
      );
    });
  });

  it('should display correct total count in pagination info', async () => {
    render(<RisksPage />);

    await waitFor(() => {
      const totalText = screen.getByText(/50 total/);
      expect(totalText).toBeInTheDocument();
    });
  });

  it('should handle empty results gracefully', async () => {
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      size: 20,
      pages: 0,
    });

    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByText('No risks found')).toBeInTheDocument();
    });

    // Pagination should not be visible
    expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
  });

  it('should handle API errors during pagination', async () => {
    const user = userEvent.setup();
    
    // First call succeeds
    vi.mocked(riskService.getRisks).mockResolvedValueOnce(
      createMockResponse(1, 20)
    );

    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByTestId('risk-card-risk-1')).toBeInTheDocument();
    });

    // Second call fails
    vi.mocked(riskService.getRisks).mockRejectedValueOnce(
      new Error('Network error')
    );

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to load risks')).toBeInTheDocument();
    });
  });

  it('should preserve pagination state when returning from detail view', async () => {
    const user = userEvent.setup();
    render(<RisksPage />);

    // Navigate to page 2
    await waitFor(() => {
      expect(screen.getByTestId('risk-card-risk-1')).toBeInTheDocument();
    });

    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    });

    // Click on a risk to view details
    const riskCard = screen.getByLabelText(/View risk Risk 21/);
    await user.click(riskCard);

    await waitFor(() => {
      expect(screen.getByText('Risk detail view coming soon...')).toBeInTheDocument();
    });

    // Go back to list
    const backButton = screen.getByText('← Back to List');
    await user.click(backButton);

    // Should still be on page 2
    await waitFor(() => {
      expect(screen.getByText(/Page 2 of 3/)).toBeInTheDocument();
    });
  });

  it('should handle multiple filter combinations with pagination', async () => {
    const user = userEvent.setup();
    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByTestId('risk-card-risk-1')).toBeInTheDocument();
    });

    // Apply multiple filters
    const statusFilter = screen.getByLabelText('Status');
    await user.selectOptions(statusFilter, 'assessed');

    const minRPNFilter = screen.getByLabelText('Min RPN');
    await user.type(minRPNFilter, '50');

    const maxRPNFilter = screen.getByLabelText('Max RPN');
    await user.type(maxRPNFilter, '200');

    // Verify getRisks was called with all filters and page reset to 1
    await waitFor(() => {
      expect(riskService.getRisks).toHaveBeenCalledWith(
        expect.objectContaining({ 
          page: 1,
          status: 'assessed',
          min_rpn: 50,
          max_rpn: 200
        })
      );
    });
  });

  it('should display correct number of risk cards per page', async () => {
    render(<RisksPage />);

    await waitFor(() => {
      const riskCards = screen.getAllByTestId(/risk-card-/);
      expect(riskCards).toHaveLength(20); // Default page size
    });
  });

  it('should handle last page with fewer items than page size', async () => {
    // Mock last page with only 10 items
    vi.mocked(riskService.getRisks).mockImplementation(async (filters) => {
      const page = filters?.page || 1;
      if (page === 1) {
        return createMockResponse(1, 20);
      }
      // Page 2 has only 10 items
      return {
        items: mockRisks.slice(20, 30),
        total: 30,
        page: 2,
        size: 20,
        pages: 2,
      };
    });

    const user = userEvent.setup();
    render(<RisksPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByTestId('risk-card-risk-1')).toBeInTheDocument();
    });

    // Navigate to page 2
    const nextButton = screen.getByText('Next');
    await user.click(nextButton);

    await waitFor(() => {
      const riskCards = screen.getAllByTestId(/risk-card-/);
      expect(riskCards).toHaveLength(10); // Only 10 items on last page
    });

    expect(screen.getByText(/Page 2 of 2/)).toBeInTheDocument();
  });
});

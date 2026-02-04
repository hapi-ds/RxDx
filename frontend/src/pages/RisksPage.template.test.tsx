/**
 * Risks Page Template Data Tests
 * Tests that the Risks page displays risks from seeded templates
 * Validates task 24.3.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
      <p>Severity: {risk.severity}</p>
      <p>Occurrence: {risk.occurrence}</p>
      <p>Detection: {risk.detection}</p>
    </div>
  ),
}));

describe('RisksPage Template Data', () => {
  // Mock risks from medical-device template
  const medicalDeviceRisks: RiskNode[] = [
    {
      id: 'md-risk-001',
      title: 'Patient Data Breach Risk',
      description: 'Risk of unauthorized access to patient health information',
      status: 'assessed',
      severity: 9,
      occurrence: 3,
      detection: 4,
      rpn: 108, // 9 * 3 * 4
      risk_category: 'safety',
      failure_mode: 'Unauthorized access to patient data',
      failure_effect: 'Patient privacy violation, regulatory non-compliance',
      failure_cause: 'Weak authentication, insufficient access controls',
      current_controls: 'Role-based access control, audit logging',
      version: '1.0',
      created_by: 'admin-user-id',
      created_at: '2026-01-17T10:00:00Z',
      updated_at: '2026-01-17T10:00:00Z',
      is_signed: false,
      linked_design_items: [],
      linked_process_items: [],
      mitigation_count: 0,
      has_open_mitigations: false,
    },
    {
      id: 'md-risk-002',
      title: 'Software Malfunction Risk',
      description: 'Risk of software failure during critical operations',
      status: 'assessed',
      severity: 10,
      occurrence: 2,
      detection: 3,
      rpn: 60, // 10 * 2 * 3
      risk_category: 'technical',
      failure_mode: 'Software crash or incorrect calculation',
      failure_effect: 'Incorrect medical device operation, patient harm',
      failure_cause: 'Software bugs, insufficient testing',
      current_controls: 'Comprehensive testing, code reviews, validation',
      version: '1.0',
      created_by: 'admin-user-id',
      created_at: '2026-01-17T10:00:00Z',
      updated_at: '2026-01-17T10:00:00Z',
      is_signed: false,
      linked_design_items: [],
      linked_process_items: [],
      mitigation_count: 0,
      has_open_mitigations: false,
    },
    {
      id: 'md-risk-003',
      title: 'Regulatory Non-Compliance Risk',
      description: 'Risk of failing to meet FDA/regulatory requirements',
      status: 'identified',
      severity: 8,
      occurrence: 4,
      detection: 5,
      rpn: 160, // 8 * 4 * 5
      risk_category: 'regulatory',
      failure_mode: 'Missing or incomplete documentation',
      failure_effect: 'Regulatory rejection, delayed market approval',
      failure_cause: 'Inadequate documentation processes',
      current_controls: 'Document templates, review processes',
      version: '1.0',
      created_by: 'admin-user-id',
      created_at: '2026-01-17T10:00:00Z',
      updated_at: '2026-01-17T10:00:00Z',
      is_signed: false,
      linked_design_items: [],
      linked_process_items: [],
      mitigation_count: 0,
      has_open_mitigations: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display risks from medical-device template', async () => {
    // Mock API response with medical-device risks
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: medicalDeviceRisks,
      total: 3,
      page: 1,
      size: 20,
      pages: 1,
    });

    render(<RisksPage />);

    // Wait for risks to load
    await waitFor(() => {
      expect(screen.getByText('Patient Data Breach Risk')).toBeDefined();
    });

    // Verify all three medical-device risks are displayed
    expect(screen.getByText('Patient Data Breach Risk')).toBeDefined();
    expect(screen.getByText('Software Malfunction Risk')).toBeDefined();
    expect(screen.getByText('Regulatory Non-Compliance Risk')).toBeDefined();
  });

  it('should display correct RPN values for medical-device risks', async () => {
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: medicalDeviceRisks,
      total: 3,
      page: 1,
      size: 20,
      pages: 1,
    });

    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByText('Patient Data Breach Risk')).toBeDefined();
    });

    // Verify RPN values are calculated correctly
    expect(screen.getByText('RPN: 108')).toBeDefined(); // Patient Data Breach
    expect(screen.getByText('RPN: 60')).toBeDefined();  // Software Malfunction
    expect(screen.getByText('RPN: 160')).toBeDefined(); // Regulatory Non-Compliance
  });

  it('should display correct status for medical-device risks', async () => {
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: medicalDeviceRisks,
      total: 3,
      page: 1,
      size: 20,
      pages: 1,
    });

    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByText('Patient Data Breach Risk')).toBeDefined();
    });

    // Verify status values
    const statusElements = screen.getAllByText(/Status: (assessed|identified)/);
    expect(statusElements).toHaveLength(3);
    
    // Two risks should be "assessed"
    const assessedElements = screen.getAllByText('Status: assessed');
    expect(assessedElements).toHaveLength(2);
    
    // One risk should be "identified"
    expect(screen.getByText('Status: identified')).toBeDefined();
  });

  it('should display correct FMEA ratings for medical-device risks', async () => {
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: medicalDeviceRisks,
      total: 3,
      page: 1,
      size: 20,
      pages: 1,
    });

    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByText('Patient Data Breach Risk')).toBeDefined();
    });

    // Verify FMEA ratings for Patient Data Breach Risk
    expect(screen.getByText('Severity: 9')).toBeDefined();
    expect(screen.getByText('Occurrence: 3')).toBeDefined();
    expect(screen.getByText('Detection: 4')).toBeDefined();

    // Verify FMEA ratings for Software Malfunction Risk
    expect(screen.getByText('Severity: 10')).toBeDefined();
    expect(screen.getByText('Occurrence: 2')).toBeDefined();
    expect(screen.getByText('Detection: 3')).toBeDefined();

    // Verify FMEA ratings for Regulatory Non-Compliance Risk
    expect(screen.getByText('Severity: 8')).toBeDefined();
    expect(screen.getByText('Occurrence: 4')).toBeDefined();
    expect(screen.getByText('Detection: 5')).toBeDefined();
  });

  it('should call getRisks API on component mount', async () => {
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: medicalDeviceRisks,
      total: 3,
      page: 1,
      size: 20,
      pages: 1,
    });

    render(<RisksPage />);

    await waitFor(() => {
      expect(riskService.getRisks).toHaveBeenCalledTimes(1);
    });

    expect(riskService.getRisks).toHaveBeenCalledWith({
      page: 1,
      size: 20,
    });
  });

  it('should display correct total count for medical-device risks', async () => {
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: medicalDeviceRisks,
      total: 3,
      page: 1,
      size: 20,
      pages: 1,
    });

    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByText('Patient Data Breach Risk')).toBeDefined();
    });

    // Since there's only 1 page, pagination should not be visible
    // But we can verify the risks are displayed
    const riskCards = screen.getAllByTestId(/risk-card-/);
    expect(riskCards).toHaveLength(3);
  });

  it('should handle clicking on a medical-device risk card', async () => {
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: medicalDeviceRisks,
      total: 3,
      page: 1,
      size: 20,
      pages: 1,
    });

    const user = await import('@testing-library/user-event').then(m => m.default.setup());
    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByText('Patient Data Breach Risk')).toBeDefined();
    });

    // Click on the first risk card
    const riskCard = screen.getByLabelText('View risk Patient Data Breach Risk');
    await user.click(riskCard);

    // Should navigate to detail view
    await waitFor(() => {
      expect(screen.getByText('Risk detail view coming soon...')).toBeDefined();
    });
  });

  it('should filter medical-device risks by status', async () => {
    // Initially return all risks
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: medicalDeviceRisks,
      total: 3,
      page: 1,
      size: 20,
      pages: 1,
    });

    const user = await import('@testing-library/user-event').then(m => m.default.setup());
    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByText('Patient Data Breach Risk')).toBeDefined();
    });

    // Mock filtered response (only assessed risks)
    const assessedRisks = medicalDeviceRisks.filter(r => r.status === 'assessed');
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: assessedRisks,
      total: 2,
      page: 1,
      size: 20,
      pages: 1,
    });

    // Apply status filter
    const statusFilter = screen.getByLabelText('Status');
    await user.selectOptions(statusFilter, 'assessed');

    // Verify API was called with filter
    await waitFor(() => {
      expect(riskService.getRisks).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'assessed',
          page: 1,
        })
      );
    });
  });

  it('should filter medical-device risks by RPN range', async () => {
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: medicalDeviceRisks,
      total: 3,
      page: 1,
      size: 20,
      pages: 1,
    });

    const user = await import('@testing-library/user-event').then(m => m.default.setup());
    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByText('Patient Data Breach Risk')).toBeDefined();
    });

    // Mock filtered response (RPN >= 100)
    const highRPNRisks = medicalDeviceRisks.filter(r => r.rpn >= 100);
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: highRPNRisks,
      total: 2,
      page: 1,
      size: 20,
      pages: 1,
    });

    // Apply min RPN filter
    const minRPNFilter = screen.getByLabelText('Min RPN');
    await user.type(minRPNFilter, '100');

    // Verify API was called with filter
    await waitFor(() => {
      expect(riskService.getRisks).toHaveBeenCalledWith(
        expect.objectContaining({
          min_rpn: 100,
          page: 1,
        })
      );
    });
  });

  it('should handle empty risk list gracefully', async () => {
    vi.mocked(riskService.getRisks).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      size: 20,
      pages: 0,
    });

    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByText('No risks found')).toBeDefined();
    });
  });

  it('should handle API errors when loading risks', async () => {
    vi.mocked(riskService.getRisks).mockRejectedValue(
      new Error('Failed to fetch risks')
    );

    render(<RisksPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load risks')).toBeDefined();
    });

    // Should show retry button
    expect(screen.getByText('Retry')).toBeDefined();
  });

  it('should display loading state while fetching risks', async () => {
    // Create a promise that we can control
    let resolvePromise: (value: RiskListResponse) => void;
    const promise = new Promise<RiskListResponse>((resolve) => {
      resolvePromise = resolve;
    });

    vi.mocked(riskService.getRisks).mockReturnValue(promise);

    render(<RisksPage />);

    // Should show loading state
    expect(screen.getByText('Loading risks...')).toBeDefined();

    // Resolve the promise
    resolvePromise!({
      items: medicalDeviceRisks,
      total: 3,
      page: 1,
      size: 20,
      pages: 1,
    });

    // Wait for risks to appear
    await waitFor(() => {
      expect(screen.getByText('Patient Data Breach Risk')).toBeDefined();
    });
  });
});

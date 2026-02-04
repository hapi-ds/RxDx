/**
 * Tests for MitigationTracker component
 * Validates Requirement 10 (Risk Management with FMEA)
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MitigationTracker } from './MitigationTracker';
import type { MitigationAction } from '../../services/riskService';

describe('MitigationTracker', () => {
  const mockMitigations: MitigationAction[] = [
    {
      id: 'mit-1',
      risk_id: 'risk-1',
      title: 'Implement Safety Interlock',
      description: 'Add hardware safety interlock to prevent operation during maintenance',
      action_type: 'Design Change',
      status: 'in_progress',
      assigned_to: 'John Doe',
      due_date: '2024-12-31T00:00:00Z',
      expected_severity_reduction: 3,
      expected_occurrence_reduction: 2,
      expected_detection_improvement: 1,
      verification_method: 'Design Review and Testing',
      created_by: 'user-1',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    },
    {
      id: 'mit-2',
      risk_id: 'risk-1',
      title: 'Update Operating Procedures',
      description: 'Revise SOPs to include new safety checks',
      action_type: 'Process Change',
      status: 'completed',
      assigned_to: 'Jane Smith',
      due_date: '2024-06-30T00:00:00Z',
      completed_date: '2024-06-15T00:00:00Z',
      expected_occurrence_reduction: 2,
      verification_method: 'Procedure Review',
      verification_result: 'Verified - All procedures updated and approved',
      created_by: 'user-2',
      created_at: '2024-01-10T00:00:00Z',
      updated_at: '2024-06-15T00:00:00Z',
    },
    {
      id: 'mit-3',
      risk_id: 'risk-1',
      title: 'Install Monitoring System',
      description: 'Add real-time monitoring for critical parameters',
      action_type: 'Control Enhancement',
      status: 'planned',
      assigned_to: 'Bob Johnson',
      due_date: '2025-03-31T00:00:00Z',
      expected_detection_improvement: 4,
      created_by: 'user-3',
      created_at: '2024-02-01T00:00:00Z',
      updated_at: '2024-02-01T00:00:00Z',
    },
    {
      id: 'mit-4',
      risk_id: 'risk-1',
      title: 'Cancelled Mitigation',
      description: 'This was cancelled due to cost',
      action_type: 'Design Change',
      status: 'cancelled',
      created_by: 'user-4',
      created_at: '2024-01-05T00:00:00Z',
      updated_at: '2024-01-20T00:00:00Z',
    },
  ];

  describe('Empty State', () => {
    it('should render empty state when no mitigations provided', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[]} />);
      
      expect(screen.getByText('No mitigation actions found for this risk')).toBeInTheDocument();
      expect(screen.getByText(/Mitigation actions help reduce risk/)).toBeInTheDocument();
    });

    it('should show refresh button in empty state when onRefresh provided', () => {
      const handleRefresh = vi.fn();
      render(<MitigationTracker riskId="risk-1" mitigations={[]} onRefresh={handleRefresh} />);
      
      const refreshButton = screen.getByLabelText('Refresh mitigations');
      expect(refreshButton).toBeInTheDocument();
      
      fireEvent.click(refreshButton);
      expect(handleRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Header and Statistics', () => {
    it('should render tracker title', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={mockMitigations} />);
      
      expect(screen.getByText('Mitigation Actions')).toBeInTheDocument();
    });

    it('should display total mitigation count', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={mockMitigations} />);
      
      expect(screen.getByText('4 total')).toBeInTheDocument();
    });

    it('should display statistics summary', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={mockMitigations} />);
      
      expect(screen.getByText('Planned')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });

    it('should calculate correct statistics', () => {
      const { container } = render(<MitigationTracker riskId="risk-1" mitigations={mockMitigations} />);
      
      const statValues = container.querySelectorAll('.stat-value');
      expect(statValues[0].textContent).toBe('1'); // planned
      expect(statValues[1].textContent).toBe('1'); // in_progress
      expect(statValues[2].textContent).toBe('1'); // completed
      expect(statValues[3].textContent).toBe('0'); // verified
      expect(statValues[4].textContent).toBe('1'); // cancelled
    });

    it('should not show cancelled stat when count is zero', () => {
      const mitigationsWithoutCancelled = mockMitigations.filter(m => m.status !== 'cancelled');
      render(<MitigationTracker riskId="risk-1" mitigations={mitigationsWithoutCancelled} />);
      
      expect(screen.queryByText('Cancelled')).not.toBeInTheDocument();
    });

    it('should call onRefresh when refresh button clicked', () => {
      const handleRefresh = vi.fn();
      render(<MitigationTracker riskId="risk-1" mitigations={mockMitigations} onRefresh={handleRefresh} />);
      
      const refreshButton = screen.getByLabelText('Refresh mitigations');
      fireEvent.click(refreshButton);
      
      expect(handleRefresh).toHaveBeenCalledTimes(1);
    });
  });

  describe('Status Filtering', () => {
    it('should render status filter when showFilters is true', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={mockMitigations} showFilters={true} />);
      
      expect(screen.getByLabelText('Filter by Status:')).toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should not render status filter when showFilters is false', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={mockMitigations} showFilters={false} />);
      
      expect(screen.queryByLabelText('Filter by Status:')).not.toBeInTheDocument();
    });

    it('should filter mitigations by status', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={mockMitigations} />);
      
      const filter = screen.getByRole('combobox');
      
      // Initially shows all
      expect(screen.getByText('Implement Safety Interlock')).toBeInTheDocument();
      expect(screen.getByText('Update Operating Procedures')).toBeInTheDocument();
      expect(screen.getByText('Install Monitoring System')).toBeInTheDocument();
      
      // Filter to in_progress
      fireEvent.change(filter, { target: { value: 'in_progress' } });
      expect(screen.getByText('Implement Safety Interlock')).toBeInTheDocument();
      expect(screen.queryByText('Update Operating Procedures')).not.toBeInTheDocument();
      expect(screen.queryByText('Install Monitoring System')).not.toBeInTheDocument();
      
      // Filter to completed
      fireEvent.change(filter, { target: { value: 'completed' } });
      expect(screen.queryByText('Implement Safety Interlock')).not.toBeInTheDocument();
      expect(screen.getByText('Update Operating Procedures')).toBeInTheDocument();
      expect(screen.queryByText('Install Monitoring System')).not.toBeInTheDocument();
    });

    it('should show no results message when filter matches nothing', () => {
      const singleMitigation = [mockMitigations[0]];
      render(<MitigationTracker riskId="risk-1" mitigations={singleMitigation} />);
      
      const filter = screen.getByRole('combobox');
      fireEvent.change(filter, { target: { value: 'verified' } });
      
      expect(screen.getByText('No mitigations match the selected filter')).toBeInTheDocument();
    });

    it('should show counts in filter options', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={mockMitigations} />);
      
      const filter = screen.getByRole('combobox') as HTMLSelectElement;
      const options = Array.from(filter.options).map(opt => opt.text);
      
      expect(options).toContain('All (4)');
      expect(options).toContain('Planned (1)');
      expect(options).toContain('In Progress (1)');
      expect(options).toContain('Completed (1)');
      expect(options).toContain('Verified (0)');
      expect(options).toContain('Cancelled (1)');
    });
  });

  describe('Mitigation Card Rendering', () => {
    it('should render mitigation title', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[0]]} />);
      
      expect(screen.getByText('Implement Safety Interlock')).toBeInTheDocument();
    });

    it('should render mitigation description', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[0]]} />);
      
      expect(screen.getByText(/Add hardware safety interlock/)).toBeInTheDocument();
    });

    it('should render status badge with correct text', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[0]]} />);
      
      expect(screen.getByText('IN PROGRESS')).toBeInTheDocument();
    });

    it('should render action type', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[0]]} />);
      
      expect(screen.getByText('Type:')).toBeInTheDocument();
      expect(screen.getByText('Design Change')).toBeInTheDocument();
    });

    it('should render assigned person', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[0]]} />);
      
      expect(screen.getByText('Assigned to:')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should not render assigned person when not provided', () => {
      const mitigationWithoutAssignee = { ...mockMitigations[0], assigned_to: undefined };
      render(<MitigationTracker riskId="risk-1" mitigations={[mitigationWithoutAssignee]} />);
      
      expect(screen.queryByText('Assigned to:')).not.toBeInTheDocument();
    });

    it('should render due date', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[0]]} />);
      
      expect(screen.getByText('Due Date:')).toBeInTheDocument();
      expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument();
    });

    it('should render completed date when present', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[1]]} />);
      
      expect(screen.getByText('Completed:')).toBeInTheDocument();
      expect(screen.getByText(/Jun 15, 2024/)).toBeInTheDocument();
    });

    it('should show "Not set" for missing due date', () => {
      const mitigationWithoutDueDate = { ...mockMitigations[0], due_date: undefined };
      render(<MitigationTracker riskId="risk-1" mitigations={[mitigationWithoutDueDate]} />);
      
      expect(screen.getByText('Not set')).toBeInTheDocument();
    });

    it('should render created info', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[0]]} />);
      
      expect(screen.getByText(/Created Jan 1, 2024 by user-1/)).toBeInTheDocument();
    });
  });

  describe('RPN Reduction Display', () => {
    it('should render RPN reduction section when reductions are present', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[0]]} />);
      
      expect(screen.getByText('Expected RPN Reduction:')).toBeInTheDocument();
    });

    it('should display severity reduction', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[0]]} />);
      
      expect(screen.getByText('Severity:')).toBeInTheDocument();
      expect(screen.getByText('-3')).toBeInTheDocument();
    });

    it('should display occurrence reduction', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[0]]} />);
      
      expect(screen.getByText('Occurrence:')).toBeInTheDocument();
      expect(screen.getByText('-2')).toBeInTheDocument();
    });

    it('should display detection improvement', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[0]]} />);
      
      expect(screen.getByText('Detection:')).toBeInTheDocument();
      expect(screen.getByText('-1')).toBeInTheDocument();
    });

    it('should not render RPN reduction section when no reductions', () => {
      const mitigationWithoutReductions = {
        ...mockMitigations[0],
        expected_severity_reduction: undefined,
        expected_occurrence_reduction: undefined,
        expected_detection_improvement: undefined,
      };
      render(<MitigationTracker riskId="risk-1" mitigations={[mitigationWithoutReductions]} />);
      
      expect(screen.queryByText('Expected RPN Reduction:')).not.toBeInTheDocument();
    });

    it('should only show provided reduction values', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[2]]} />);
      
      expect(screen.getByText('Expected RPN Reduction:')).toBeInTheDocument();
      expect(screen.getByText('Detection:')).toBeInTheDocument();
      expect(screen.queryByText('Severity:')).not.toBeInTheDocument();
      expect(screen.queryByText('Occurrence:')).not.toBeInTheDocument();
    });
  });

  describe('Verification Display', () => {
    it('should render verification method when present', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[1]]} />);
      
      expect(screen.getByText('Verification Method:')).toBeInTheDocument();
      expect(screen.getByText('Procedure Review')).toBeInTheDocument();
    });

    it('should render verification result when present', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[1]]} />);
      
      expect(screen.getByText('Verification Result:')).toBeInTheDocument();
      expect(screen.getByText(/Verified - All procedures updated/)).toBeInTheDocument();
    });

    it('should not render verification section when method not present', () => {
      const mitigationWithoutVerification = {
        ...mockMitigations[0],
        verification_method: undefined,
        verification_result: undefined,
      };
      render(<MitigationTracker riskId="risk-1" mitigations={[mitigationWithoutVerification]} />);
      
      expect(screen.queryByText('Verification Method:')).not.toBeInTheDocument();
      expect(screen.queryByText('Verification Result:')).not.toBeInTheDocument();
    });
  });

  describe('Overdue Handling', () => {
    it('should mark overdue mitigations', () => {
      const overdueMitigation: MitigationAction = {
        ...mockMitigations[0],
        due_date: '2020-01-01T00:00:00Z',
        status: 'in_progress',
      };
      const { container } = render(<MitigationTracker riskId="risk-1" mitigations={[overdueMitigation]} />);
      
      const card = container.querySelector('.mitigation-card');
      expect(card).toHaveClass('overdue');
      expect(screen.getByText('(OVERDUE)')).toBeInTheDocument();
    });

    it('should not mark completed mitigations as overdue', () => {
      const completedMitigation: MitigationAction = {
        ...mockMitigations[0],
        due_date: '2020-01-01T00:00:00Z',
        status: 'completed',
      };
      const { container } = render(<MitigationTracker riskId="risk-1" mitigations={[completedMitigation]} />);
      
      const card = container.querySelector('.mitigation-card');
      expect(card).not.toHaveClass('overdue');
      expect(screen.queryByText('(OVERDUE)')).not.toBeInTheDocument();
    });

    it('should not mark verified mitigations as overdue', () => {
      const verifiedMitigation: MitigationAction = {
        ...mockMitigations[0],
        due_date: '2020-01-01T00:00:00Z',
        status: 'verified',
      };
      const { container } = render(<MitigationTracker riskId="risk-1" mitigations={[verifiedMitigation]} />);
      
      const card = container.querySelector('.mitigation-card');
      expect(card).not.toHaveClass('overdue');
    });

    it('should not mark cancelled mitigations as overdue', () => {
      const cancelledMitigation: MitigationAction = {
        ...mockMitigations[0],
        due_date: '2020-01-01T00:00:00Z',
        status: 'cancelled',
      };
      const { container } = render(<MitigationTracker riskId="risk-1" mitigations={[cancelledMitigation]} />);
      
      const card = container.querySelector('.mitigation-card');
      expect(card).not.toHaveClass('overdue');
    });
  });

  describe('Click Handling', () => {
    it('should call onMitigationClick when card is clicked', () => {
      const handleClick = vi.fn();
      render(
        <MitigationTracker 
          riskId="risk-1" 
          mitigations={[mockMitigations[0]]} 
          onMitigationClick={handleClick}
        />
      );
      
      const card = screen.getByRole('button');
      fireEvent.click(card);
      
      expect(handleClick).toHaveBeenCalledWith(mockMitigations[0]);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onMitigationClick when Enter key is pressed', () => {
      const handleClick = vi.fn();
      render(
        <MitigationTracker 
          riskId="risk-1" 
          mitigations={[mockMitigations[0]]} 
          onMitigationClick={handleClick}
        />
      );
      
      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });
      
      expect(handleClick).toHaveBeenCalledWith(mockMitigations[0]);
    });

    it('should not call onMitigationClick for other keys', () => {
      const handleClick = vi.fn();
      render(
        <MitigationTracker 
          riskId="risk-1" 
          mitigations={[mockMitigations[0]]} 
          onMitigationClick={handleClick}
        />
      );
      
      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Space' });
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should apply clickable class when onMitigationClick is provided', () => {
      const handleClick = vi.fn();
      const { container } = render(
        <MitigationTracker 
          riskId="risk-1" 
          mitigations={[mockMitigations[0]]} 
          onMitigationClick={handleClick}
        />
      );
      
      const card = container.querySelector('.mitigation-card');
      expect(card).toHaveClass('clickable');
    });

    it('should not apply clickable class when onMitigationClick is not provided', () => {
      const { container } = render(
        <MitigationTracker riskId="risk-1" mitigations={[mockMitigations[0]]} />
      );
      
      const card = container.querySelector('.mitigation-card');
      expect(card).not.toHaveClass('clickable');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <MitigationTracker 
          riskId="risk-1" 
          mitigations={mockMitigations} 
          className="custom-class"
        />
      );
      
      const element = container.querySelector('.mitigation-tracker');
      expect(element).toHaveClass('custom-class');
    });
  });

  describe('Multiple Mitigations', () => {
    it('should render all mitigations', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={mockMitigations} />);
      
      expect(screen.getByText('Implement Safety Interlock')).toBeInTheDocument();
      expect(screen.getByText('Update Operating Procedures')).toBeInTheDocument();
      expect(screen.getByText('Install Monitoring System')).toBeInTheDocument();
      expect(screen.getByText('Cancelled Mitigation')).toBeInTheDocument();
    });

    it('should render mitigations in order', () => {
      const { container } = render(<MitigationTracker riskId="risk-1" mitigations={mockMitigations} />);
      
      const cards = container.querySelectorAll('.mitigation-card');
      expect(cards).toHaveLength(4);
    });
  });

  describe('Status Badge Colors', () => {
    it('should apply correct color for planned status', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[2]]} />);
      
      const badge = screen.getByText('PLANNED');
      expect(badge).toHaveStyle({ backgroundColor: '#6b7280' });
    });

    it('should apply correct color for in_progress status', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[0]]} />);
      
      const badge = screen.getByText('IN PROGRESS');
      expect(badge).toHaveStyle({ backgroundColor: '#3b82f6' });
    });

    it('should apply correct color for completed status', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[1]]} />);
      
      const badge = screen.getByText('COMPLETED');
      expect(badge).toHaveStyle({ backgroundColor: '#10b981' });
    });

    it('should apply correct color for cancelled status', () => {
      render(<MitigationTracker riskId="risk-1" mitigations={[mockMitigations[3]]} />);
      
      const badge = screen.getByText('CANCELLED');
      expect(badge).toHaveStyle({ backgroundColor: '#ef4444' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle mitigation without description', () => {
      const mitigationWithoutDesc = { ...mockMitigations[0], description: undefined };
      render(<MitigationTracker riskId="risk-1" mitigations={[mitigationWithoutDesc]} />);
      
      expect(screen.getByText('Implement Safety Interlock')).toBeInTheDocument();
      expect(screen.queryByText(/Add hardware safety interlock/)).not.toBeInTheDocument();
    });

    it('should handle all optional fields missing', () => {
      const minimalMitigation: MitigationAction = {
        id: 'mit-min',
        risk_id: 'risk-1',
        title: 'Minimal Mitigation',
        description: 'Basic mitigation',
        action_type: 'Other',
        status: 'planned',
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };
      
      render(<MitigationTracker riskId="risk-1" mitigations={[minimalMitigation]} />);
      
      expect(screen.getByText('Minimal Mitigation')).toBeInTheDocument();
      expect(screen.getByText('Not set')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      const handleRefresh = vi.fn();
      render(<MitigationTracker riskId="risk-1" mitigations={mockMitigations} onRefresh={handleRefresh} />);
      
      expect(screen.getByLabelText('Refresh mitigations')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by Status:')).toBeInTheDocument();
    });

    it('should render semantic HTML structure', () => {
      const { container } = render(<MitigationTracker riskId="risk-1" mitigations={mockMitigations} />);
      
      expect(container.querySelector('h2')).toBeInTheDocument();
      expect(container.querySelector('select')).toBeInTheDocument();
    });

    it('should support keyboard navigation for clickable cards', () => {
      const handleClick = vi.fn();
      render(
        <MitigationTracker 
          riskId="risk-1" 
          mitigations={[mockMitigations[0]]} 
          onMitigationClick={handleClick}
        />
      );
      
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });
  });
});

/**
 * TestResultsDisplay component tests
 * Tests for test execution results display component
 */


import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestResultsDisplay } from './TestResultsDisplay';
import type { TestRun, TestResultsDisplayProps } from './TestResultsDisplay';
import type { TestSpec } from './TestSpecList';

// Mock test data
const mockTestSpec: TestSpec = {
  id: 'test-spec-1',
  title: 'User Authentication Test',
  description: 'Test user login and authentication flow',
  test_type: 'integration',
  priority: 1,
  status: 'active',
  version: '1.0',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  is_signed: true,
  linked_requirements: ['req-1', 'req-2'],
  test_steps: [
    {
      step_number: 1,
      description: 'Navigate to login page',
      expected_result: 'Login page is displayed',
      status: 'not_run',
    },
    {
      step_number: 2,
      description: 'Enter valid credentials',
      expected_result: 'Credentials are accepted',
      status: 'not_run',
    },
  ],
};

const mockPassedTestRun: TestRun = {
  id: 'run-1',
  test_spec_id: 'test-spec-1',
  test_spec_version: '1.0',
  executed_by: 'user-1',
  executed_by_name: 'John Doe',
  execution_date: '2024-01-20T14:30:00Z',
  environment: 'staging',
  overall_status: 'pass',
  step_results: [
    {
      step_number: 1,
      description: 'Navigate to login page',
      expected_result: 'Login page is displayed',
      status: 'pass',
      actual_result: 'Login page displayed successfully',
      notes: 'Page loaded in 1.2 seconds',
    },
    {
      step_number: 2,
      description: 'Enter valid credentials',
      expected_result: 'Credentials are accepted',
      status: 'pass',
      actual_result: 'User logged in successfully',
    },
  ],
  execution_notes: 'Test executed without issues',
  linked_defects: [],
  is_signed: true,
  signatures: [
    {
      id: 'sig-1',
      user_name: 'Jane Smith',
      signed_at: '2024-01-20T15:00:00Z',
      is_valid: true,
    },
  ],
};

const mockFailedTestRun: TestRun = {
  id: 'run-2',
  test_spec_id: 'test-spec-1',
  test_spec_version: '1.0',
  executed_by: 'user-2',
  executed_by_name: 'Alice Johnson',
  execution_date: '2024-01-21T09:15:00Z',
  environment: 'production',
  overall_status: 'fail',
  step_results: [
    {
      step_number: 1,
      description: 'Navigate to login page',
      expected_result: 'Login page is displayed',
      status: 'pass',
      actual_result: 'Login page displayed',
    },
    {
      step_number: 2,
      description: 'Enter valid credentials',
      expected_result: 'Credentials are accepted',
      status: 'fail',
      actual_result: 'Error: Invalid credentials',
      notes: 'Authentication service returned 401',
      linked_defect_id: 'defect-123',
    },
  ],
  failure_description: 'Authentication failed due to backend service error',
  execution_notes: 'Backend service was experiencing issues',
  linked_defects: ['defect-123'],
  is_signed: false,
};

const mockBlockedTestRun: TestRun = {
  id: 'run-3',
  test_spec_id: 'test-spec-1',
  test_spec_version: '1.0',
  executed_by: 'user-3',
  execution_date: '2024-01-22T11:00:00Z',
  environment: 'qa',
  overall_status: 'blocked',
  step_results: [
    {
      step_number: 1,
      description: 'Navigate to login page',
      expected_result: 'Login page is displayed',
      status: 'blocked',
      actual_result: 'Page not accessible',
      notes: 'Server is down',
    },
    {
      step_number: 2,
      description: 'Enter valid credentials',
      expected_result: 'Credentials are accepted',
      status: 'not_run',
    },
  ],
  linked_defects: [],
};

describe('TestResultsDisplay', () => {
  const defaultProps: TestResultsDisplayProps = {
    testRun: mockPassedTestRun,
    testSpec: mockTestSpec,
  };

  describe('Rendering', () => {
    it('should render the component with test run data', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      expect(screen.getByText('Test Execution Results')).toBeInTheDocument();
      expect(screen.getByText('User Authentication Test')).toBeInTheDocument();
      expect(screen.getByText('v1.0')).toBeInTheDocument();
    });

    it('should display overall status badge', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      const statusBadges = screen.getAllByText(/Pass/i);
      const overallBadge = statusBadges.find(badge => 
        badge.className && badge.className.includes('overall-status-badge')
      );
      
      expect(overallBadge).toBeDefined();
      if (overallBadge) {
        expect(overallBadge.textContent).toContain('Pass');
        expect(overallBadge.textContent).toContain('✓');
      }
    });

    it('should display metadata information', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Staging')).toBeInTheDocument();
      expect(screen.getByText('run-1')).toBeInTheDocument();
    });

    it('should display execution notes when present', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      expect(screen.getByText('Test executed without issues')).toBeInTheDocument();
    });

    it('should not display execution notes when absent', () => {
      const propsWithoutNotes = {
        ...defaultProps,
        testRun: { ...mockPassedTestRun, execution_notes: undefined },
      };
      render(<TestResultsDisplay {...propsWithoutNotes} />);

      expect(screen.queryByText('Execution Notes:')).not.toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('should display correct statistics for passed test', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      const statsSection = screen.getByText('Test Statistics').parentElement!;
      const totalStepsStat = within(statsSection).getByText('Total Steps').parentElement!;
      expect(within(totalStepsStat).getByText('2')).toBeInTheDocument();
      expect(within(statsSection).getByText('Passed')).toBeInTheDocument();
      expect(within(statsSection).getByText('100.0%')).toBeInTheDocument(); // Pass rate
    });

    it('should display correct statistics for failed test', () => {
      const props = { ...defaultProps, testRun: mockFailedTestRun };
      render(<TestResultsDisplay {...props} />);

      const statsSection = screen.getByText('Test Statistics').parentElement!;
      const passedStat = within(statsSection).getByText('Passed').parentElement!;
      const failedStat = within(statsSection).getByText('Failed').parentElement!;

      expect(within(passedStat).getByText('1')).toBeInTheDocument();
      expect(within(failedStat).getByText('1')).toBeInTheDocument();
    });

    it('should calculate pass rate correctly', () => {
      const props = { ...defaultProps, testRun: mockFailedTestRun };
      render(<TestResultsDisplay {...props} />);

      expect(screen.getByText('50.0%')).toBeInTheDocument();
    });
  });

  describe('Failure Display', () => {
    it('should display failure section for failed tests', () => {
      const props = { ...defaultProps, testRun: mockFailedTestRun };
      render(<TestResultsDisplay {...props} />);

      expect(screen.getByText('Failure Summary')).toBeInTheDocument();
      expect(
        screen.getByText('Authentication failed due to backend service error')
      ).toBeInTheDocument();
    });

    it('should not display failure section for passed tests', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      expect(screen.queryByText('Failure Summary')).not.toBeInTheDocument();
    });

    it('should display linked defects in failure section', () => {
      const props = { ...defaultProps, testRun: mockFailedTestRun };
      render(<TestResultsDisplay {...props} />);

      expect(screen.getByText('Linked Defects:')).toBeInTheDocument();
      const defectLinks = screen.getAllByText('defect-123');
      expect(defectLinks.length).toBeGreaterThan(0);
    });

    it('should call onViewDefect when defect link is clicked', async () => {
      const user = userEvent.setup();
      const onViewDefect = vi.fn();
      const props = {
        ...defaultProps,
        testRun: mockFailedTestRun,
        onViewDefect,
      };
      render(<TestResultsDisplay {...props} />);

      const defectLinks = screen.getAllByText('defect-123');
      await user.click(defectLinks[0]);

      expect(onViewDefect).toHaveBeenCalledWith('defect-123');
    });
  });

  describe('Step Results Display', () => {
    it('should display all test steps', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
    });

    it('should display step descriptions and expected results', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      expect(screen.getByText('Navigate to login page')).toBeInTheDocument();
      expect(screen.getByText('Login page is displayed')).toBeInTheDocument();
    });

    it('should display actual results when present', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      expect(screen.getByText('Login page displayed successfully')).toBeInTheDocument();
      expect(screen.getByText('User logged in successfully')).toBeInTheDocument();
    });

    it('should display step notes when present', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      expect(screen.getByText('Page loaded in 1.2 seconds')).toBeInTheDocument();
    });

    it('should highlight failed steps', () => {
      const props = { ...defaultProps, testRun: mockFailedTestRun };
      render(<TestResultsDisplay {...props} />);

      const failedStep = screen.getByText('Step 2').closest('.step-result-card');
      expect(failedStep).toHaveClass('failed');
    });

    it('should highlight blocked steps', () => {
      const props = { ...defaultProps, testRun: mockBlockedTestRun };
      render(<TestResultsDisplay {...props} />);

      const blockedStep = screen.getByText('Step 1').closest('.step-result-card');
      expect(blockedStep).toHaveClass('blocked');
    });

    it('should display step status badges with correct icons', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      // Check that status badges exist with Pass text
      const statusBadges = screen.getAllByText(/Pass/i);
      expect(statusBadges.length).toBeGreaterThan(0);
      
      // Check the overall status badge contains the icon
      const overallBadge = statusBadges.find(badge => 
        badge.className.includes('overall-status-badge')
      );
      if (overallBadge) {
        expect(overallBadge.textContent).toContain('✓');
      }
    });

    it('should display linked defect for failed step', () => {
      const props = { ...defaultProps, testRun: mockFailedTestRun };
      render(<TestResultsDisplay {...props} />);

      const stepSection = screen.getByText('Step 2').closest('.step-result-card')!;
      expect(within(stepSection as HTMLElement).getByText('Linked Defect:')).toBeInTheDocument();
      const defectLinks = within(stepSection as HTMLElement).getAllByText('defect-123');
      expect(defectLinks.length).toBeGreaterThan(0);
    });
  });

  describe('Digital Signatures Display', () => {
    it('should display signatures section when test is signed', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      expect(screen.getByText('Digital Signatures')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Valid Signature')).toBeInTheDocument();
    });

    it('should not display signatures section when test is not signed', () => {
      const props = { ...defaultProps, testRun: mockFailedTestRun };
      render(<TestResultsDisplay {...props} />);

      expect(screen.queryByText('Digital Signatures')).not.toBeInTheDocument();
    });

    it('should display signature validation status', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      const signature = screen.getByText('Jane Smith').closest('.signature-card')!;
      expect(within(signature as HTMLElement).getByText('✓')).toBeInTheDocument();
      expect(within(signature as HTMLElement).getByText('Valid Signature')).toBeInTheDocument();
    });

    it('should display invalid signature status', () => {
      const invalidSignatureRun = {
        ...mockPassedTestRun,
        signatures: [
          {
            id: 'sig-2',
            user_name: 'Bob Wilson',
            signed_at: '2024-01-20T16:00:00Z',
            is_valid: false,
          },
        ],
      };
      const props = { ...defaultProps, testRun: invalidSignatureRun };
      render(<TestResultsDisplay {...props} />);

      expect(screen.getByText('Invalid Signature')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should display action buttons when showActions is true', () => {
      const props = {
        ...defaultProps,
        onViewHistory: vi.fn(),
        onExport: vi.fn(),
        onSign: vi.fn(),
        showActions: true,
      };
      render(<TestResultsDisplay {...props} />);

      expect(screen.getByText('View History')).toBeInTheDocument();
      expect(screen.getByText('Export Results')).toBeInTheDocument();
    });

    it('should not display action buttons when showActions is false', () => {
      const props = {
        ...defaultProps,
        onViewHistory: vi.fn(),
        onExport: vi.fn(),
        showActions: false,
      };
      render(<TestResultsDisplay {...props} />);

      expect(screen.queryByText('View History')).not.toBeInTheDocument();
      expect(screen.queryByText('Export Results')).not.toBeInTheDocument();
    });

    it('should call onViewHistory when button is clicked', async () => {
      const user = userEvent.setup();
      const onViewHistory = vi.fn();
      const props = { ...defaultProps, onViewHistory };
      render(<TestResultsDisplay {...props} />);

      await user.click(screen.getByText('View History'));

      expect(onViewHistory).toHaveBeenCalledTimes(1);
    });

    it('should call onExport when button is clicked', async () => {
      const user = userEvent.setup();
      const onExport = vi.fn();
      const props = { ...defaultProps, onExport };
      render(<TestResultsDisplay {...props} />);

      await user.click(screen.getByText('Export Results'));

      expect(onExport).toHaveBeenCalledTimes(1);
    });

    it('should display sign button for unsigned tests', () => {
      const props = {
        ...defaultProps,
        testRun: mockFailedTestRun,
        onSign: vi.fn(),
      };
      render(<TestResultsDisplay {...props} />);

      expect(screen.getByText('Sign Results')).toBeInTheDocument();
    });

    it('should not display sign button for signed tests', () => {
      const props = { ...defaultProps, onSign: vi.fn() };
      render(<TestResultsDisplay {...props} />);

      expect(screen.queryByText('Sign Results')).not.toBeInTheDocument();
    });

    it('should call onSign when sign button is clicked', async () => {
      const user = userEvent.setup();
      const onSign = vi.fn();
      const props = {
        ...defaultProps,
        testRun: mockFailedTestRun,
        onSign,
      };
      render(<TestResultsDisplay {...props} />);

      await user.click(screen.getByText('Sign Results'));

      expect(onSign).toHaveBeenCalledTimes(1);
    });
  });

  describe('Status Colors', () => {
    it('should apply correct color for pass status', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      const statusBadge = screen.getAllByText(/✓ Pass/i)[0];
      expect(statusBadge).toHaveStyle({ backgroundColor: '#10b981' });
    });

    it('should apply correct color for fail status', () => {
      const props = { ...defaultProps, testRun: mockFailedTestRun };
      render(<TestResultsDisplay {...props} />);

      const statusBadge = screen.getAllByText(/✗ Fail/i)[0];
      expect(statusBadge).toHaveStyle({ backgroundColor: '#ef4444' });
    });

    it('should apply correct color for blocked status', () => {
      const props = { ...defaultProps, testRun: mockBlockedTestRun };
      render(<TestResultsDisplay {...props} />);

      const statusBadge = screen.getAllByText(/⊘ Blocked/i)[0];
      expect(statusBadge).toHaveStyle({ backgroundColor: '#f59e0b' });
    });
  });

  describe('Date Formatting', () => {
    it('should format execution date correctly', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      // Date should be formatted as locale string - check in metadata section
      const metadataSection = screen.getByText('Executed By:').closest('.metadata-section')!;
      expect(within(metadataSection as HTMLElement).getByText(/Jan 20, 2024/i)).toBeInTheDocument();
    });

    it('should format signature date correctly', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      const signatureCard = screen.getByText('Jane Smith').closest('.signature-card')!;
      expect(within(signatureCard as HTMLElement).getByText(/Jan 20, 2024/i)).toBeInTheDocument();
    });
  });

  describe('Environment Display', () => {
    it('should capitalize environment name', () => {
      render(<TestResultsDisplay {...defaultProps} />);

      expect(screen.getByText('Staging')).toBeInTheDocument();
    });

    it('should handle different environment values', () => {
      const environments = ['development', 'qa', 'production', 'uat'];

      environments.forEach((env) => {
        const props = {
          ...defaultProps,
          testRun: { ...mockPassedTestRun, environment: env },
        };
        const { unmount } = render(<TestResultsDisplay {...props} />);

        const expected = env.charAt(0).toUpperCase() + env.slice(1);
        expect(screen.getByText(expected)).toBeInTheDocument();

        unmount();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle test run without test spec', () => {
      const props = { ...defaultProps, testSpec: undefined };
      render(<TestResultsDisplay {...props} />);

      expect(screen.getByText('Test Execution Results')).toBeInTheDocument();
      expect(screen.queryByText('Test Specification:')).not.toBeInTheDocument();
    });

    it('should handle test run with no step results', () => {
      const emptyRun = {
        ...mockPassedTestRun,
        step_results: [],
      };
      const props = { ...defaultProps, testRun: emptyRun };
      render(<TestResultsDisplay {...props} />);

      const statsSection = screen.getByText('Test Statistics').parentElement!;
      const totalStepsStat = within(statsSection).getByText('Total Steps').parentElement!;
      expect(within(totalStepsStat).getByText('0')).toBeInTheDocument();
      expect(screen.getByText('0.0%')).toBeInTheDocument(); // Pass rate
    });

    it('should handle test run without executed_by_name', () => {
      const runWithoutName = {
        ...mockPassedTestRun,
        executed_by_name: undefined,
      };
      const props = { ...defaultProps, testRun: runWithoutName };
      render(<TestResultsDisplay {...props} />);

      expect(screen.getByText('user-1')).toBeInTheDocument();
    });

    it('should handle multiple signatures', () => {
      const multiSigRun = {
        ...mockPassedTestRun,
        signatures: [
          {
            id: 'sig-1',
            user_name: 'Jane Smith',
            signed_at: '2024-01-20T15:00:00Z',
            is_valid: true,
          },
          {
            id: 'sig-2',
            user_name: 'Bob Wilson',
            signed_at: '2024-01-20T16:00:00Z',
            is_valid: true,
          },
        ],
      };
      const props = { ...defaultProps, testRun: multiSigRun };
      render(<TestResultsDisplay {...props} />);

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
    });
  });
});

/**
 * TestRunForm component tests
 * Tests for test run execution form with step-by-step result recording
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TestRunForm } from './TestRunForm';
import type { TestSpec } from './TestSpecList';

describe('TestRunForm', () => {
  const mockTestSpec: TestSpec = {
    id: 'test-spec-1',
    title: 'User Authentication Test',
    description: 'Test user login functionality',
    test_type: 'integration',
    priority: 1,
    status: 'active',
    version: '1.0',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_signed: false,
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
      {
        step_number: 3,
        description: 'Click login button',
        expected_result: 'User is logged in successfully',
        status: 'not_run',
      },
    ],
  };

  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form with test spec information', () => {
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Execute Test Run')).toBeInTheDocument();
      expect(screen.getByText('User Authentication Test')).toBeInTheDocument();
      expect(screen.getByText('v1.0')).toBeInTheDocument();
    });

    it('should render all test steps', () => {
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Navigate to login page')).toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
      expect(screen.getByText('Enter valid credentials')).toBeInTheDocument();
      expect(screen.getByText('Step 3')).toBeInTheDocument();
      expect(screen.getByText('Click login button')).toBeInTheDocument();
    });

    it('should render environment selector', () => {
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const environmentSelect = screen.getByLabelText(/environment/i);
      expect(environmentSelect).toBeInTheDocument();
    });

    it('should render execution notes textarea', () => {
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByLabelText(/execution notes/i)).toBeInTheDocument();
    });

    it('should render digital signature notice', () => {
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      expect(screen.getByText(/digital signature will be required/i)).toBeInTheDocument();
    });

    it('should show edit mode title when mode is edit', () => {
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="edit"
        />
      );

      expect(screen.getByText('Edit Test Run')).toBeInTheDocument();
    });
  });

  describe('Environment Selection', () => {
    it('should allow selecting environment', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const environmentSelect = screen.getByLabelText(/environment/i);
      await user.selectOptions(environmentSelect, 'qa');

      expect(environmentSelect).toHaveValue('qa');
    });

    it('should show all environment options', () => {
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const environmentSelect = screen.getByLabelText(/environment/i);
      const options = Array.from(environmentSelect.querySelectorAll('option'));
      const optionTexts = options.map(opt => opt.textContent);

      expect(optionTexts).toContain('Development');
      expect(optionTexts).toContain('Staging');
      expect(optionTexts).toContain('Production');
      expect(optionTexts).toContain('QA');
      expect(optionTexts).toContain('UAT (User Acceptance Testing)');
      expect(optionTexts).toContain('Integration');
    });
  });

  describe('Step Status Management', () => {
    it('should allow changing step status', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'pass');

      expect(statusSelects[0]).toHaveValue('pass');
    });

    it('should show all status options for each step', () => {
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      const firstSelect = statusSelects[0];
      const options = Array.from(firstSelect.querySelectorAll('option'));
      const optionValues = options.map(opt => opt.getAttribute('value'));

      expect(optionValues).toContain('not_run');
      expect(optionValues).toContain('pass');
      expect(optionValues).toContain('fail');
      expect(optionValues).toContain('blocked');
      expect(optionValues).toContain('skipped');
    });

    it('should update overall status to pass when all steps pass', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      
      for (const select of statusSelects) {
        await user.selectOptions(select, 'pass');
      }

      expect(screen.getByText(/overall: pass/i)).toBeInTheDocument();
    });

    it('should update overall status to fail when any step fails', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'pass');
      await user.selectOptions(statusSelects[1], 'fail');
      await user.selectOptions(statusSelects[2], 'pass');

      expect(screen.getByText(/overall: fail/i)).toBeInTheDocument();
    });

    it('should update overall status to blocked when any step is blocked', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'pass');
      await user.selectOptions(statusSelects[1], 'blocked');

      expect(screen.getByText(/overall: blocked/i)).toBeInTheDocument();
    });
  });

  describe('Step Result Recording', () => {
    it('should allow entering actual result for a step', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // First change step status to enable the input
      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'pass');

      const actualResultInputs = screen.getAllByLabelText(/actual result/i);
      await user.type(actualResultInputs[0], 'Login page displayed correctly');

      expect(actualResultInputs[0]).toHaveValue('Login page displayed correctly');
    });

    it('should allow entering notes for a step', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      // First change step status to enable the textarea
      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'pass');

      const notesTextareas = screen.getAllByLabelText(/^notes$/i);
      await user.type(notesTextareas[0], 'Page loaded in 2 seconds');

      expect(notesTextareas[0]).toHaveValue('Page loaded in 2 seconds');
    });

    it('should show defect linking field when step fails', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'fail');

      await waitFor(() => {
        expect(screen.getByLabelText(/linked defect workitem id/i)).toBeInTheDocument();
      });
    });

    it('should allow linking defect for failed step', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'fail');

      const defectInput = await screen.findByLabelText(/linked defect workitem id/i);
      await user.type(defectInput, 'defect-123');

      expect(defectInput).toHaveValue('defect-123');
    });
  });

  describe('Failure Description', () => {
    it('should show failure description field when any step fails', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'fail');

      await waitFor(() => {
        expect(screen.getByLabelText(/failure description/i)).toBeInTheDocument();
      });
    });

    it('should not show failure description when all steps pass', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'pass');

      expect(screen.queryByLabelText(/failure description/i)).not.toBeInTheDocument();
    });

    it('should allow entering failure description', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'fail');

      const failureDescInput = await screen.findByLabelText(/failure description/i);
      await user.type(failureDescInput, 'Login page did not load');

      expect(failureDescInput).toHaveValue('Login page did not load');
    });
  });

  describe('Form Validation', () => {
    it('should require environment selection', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const submitButton = screen.getByRole('button', { name: /complete test run/i });
      await user.click(submitButton);

      // Validation should prevent submission
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should require at least one step to be executed', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const environmentSelect = screen.getByLabelText(/environment/i);
      await user.selectOptions(environmentSelect, 'qa');

      const submitButton = screen.getByRole('button', { name: /complete test run/i });
      await user.click(submitButton);

      // Validation should prevent submission
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should require failure description when tests fail', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const environmentSelect = screen.getByLabelText(/environment/i);
      await user.selectOptions(environmentSelect, 'qa');

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'fail');

      const submitButton = screen.getByRole('button', { name: /complete test run/i });
      await user.click(submitButton);

      // Validation should prevent submission
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should require actual result for failed steps', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const environmentSelect = screen.getByLabelText(/environment/i);
      await user.selectOptions(environmentSelect, 'qa');

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'fail');

      const failureDescInput = await screen.findByLabelText(/failure description/i);
      await user.type(failureDescInput, 'Test failed');

      const submitButton = screen.getByRole('button', { name: /complete test run/i });
      await user.click(submitButton);

      // Validation should prevent submission
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    it('should submit valid test run with passing steps', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const environmentSelect = screen.getByLabelText(/environment/i);
      await user.selectOptions(environmentSelect, 'qa');

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      for (const select of statusSelects) {
        await user.selectOptions(select, 'pass');
      }

      const submitButton = screen.getByRole('button', { name: /complete test run/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.test_spec_id).toBe('test-spec-1');
      expect(submittedData.test_spec_version).toBe('1.0');
      expect(submittedData.environment).toBe('qa');
      expect(submittedData.overall_status).toBe('pass');
      expect(submittedData.step_results).toHaveLength(3);
      expect(submittedData.defect_workitem_ids).toEqual([]);
    });

    it('should submit test run with failure information', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const environmentSelect = screen.getByLabelText(/environment/i);
      await user.selectOptions(environmentSelect, 'staging');

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'fail');

      const actualResultInputs = screen.getAllByLabelText(/actual result/i);
      await user.type(actualResultInputs[0], 'Page did not load');

      const failureDescInput = await screen.findByLabelText(/failure description/i);
      await user.type(failureDescInput, 'Critical failure in login flow');

      const submitButton = screen.getByRole('button', { name: /complete test run/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.overall_status).toBe('fail');
      expect(submittedData.failure_description).toBe('Critical failure in login flow');
      expect(submittedData.step_results[0].status).toBe('fail');
      expect(submittedData.step_results[0].actual_result).toBe('Page did not load');
    });

    it('should include linked defects in submission', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const environmentSelect = screen.getByLabelText(/environment/i);
      await user.selectOptions(environmentSelect, 'qa');

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'fail');

      const actualResultInputs = screen.getAllByLabelText(/actual result/i);
      await user.type(actualResultInputs[0], 'Failed');

      const defectInput = await screen.findByLabelText(/linked defect workitem id/i);
      await user.type(defectInput, 'defect-456');

      const failureDescInput = await screen.findByLabelText(/failure description/i);
      await user.type(failureDescInput, 'Test failed');

      const submitButton = screen.getByRole('button', { name: /complete test run/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.defect_workitem_ids).toContain('defect-456');
    });

    it('should include execution notes in submission', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const environmentSelect = screen.getByLabelText(/environment/i);
      await user.selectOptions(environmentSelect, 'production');

      const executionNotes = screen.getByLabelText(/execution notes/i);
      await user.type(executionNotes, 'Tested with latest build');

      const statusSelects = screen.getAllByRole('combobox', { name: /status/i });
      await user.selectOptions(statusSelects[0], 'pass');

      const submitButton = screen.getByRole('button', { name: /complete test run/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.execution_notes).toBe('Tested with latest build');
    });
  });

  describe('Form Actions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should disable form when submitting', () => {
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isSubmitting={true}
        />
      );

      const submitButton = screen.getByRole('button', { name: /saving/i });
      expect(submitButton).toBeDisabled();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('should show correct button text in edit mode', () => {
      render(
        <TestRunForm
          testSpec={mockTestSpec}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="edit"
        />
      );

      expect(screen.getByRole('button', { name: /update test run/i })).toBeInTheDocument();
    });
  });

  describe('Initial Data', () => {
    it('should populate form with initial data', () => {
      const initialData = {
        id: 'run-1',
        environment: 'staging',
        execution_notes: 'Initial test run',
        overall_status: 'pass' as const,
        step_results: mockTestSpec.test_steps.map(step => ({
          ...step,
          status: 'pass' as const,
          actual_result: 'Passed',
          notes: 'All good',
        })),
        linked_defects: [],
      };

      render(
        <TestRunForm
          testSpec={mockTestSpec}
          initialData={initialData}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          mode="edit"
        />
      );

      const environmentSelect = screen.getByLabelText(/environment/i);
      expect(environmentSelect).toHaveValue('staging');

      const executionNotes = screen.getByLabelText(/execution notes/i);
      expect(executionNotes).toHaveValue('Initial test run');
    });
  });
});

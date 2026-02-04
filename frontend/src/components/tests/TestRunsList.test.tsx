/**
 * TestRunsList component tests
 * Tests for test run list display and edit functionality
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TestRunsList } from './TestRunsList';
import type { TestRun } from '../../services/testService';

describe('TestRunsList', () => {
  const mockTestRuns: TestRun[] = [
    {
      id: 'run-1',
      test_spec_id: 'spec-1',
      test_spec_version: '1.0.0',
      executed_by: 'user-1',
      execution_date: '2024-01-15T10:00:00Z',
      environment: 'staging',
      overall_status: 'pass',
      step_results: [],
      defect_workitem_ids: [],
      execution_notes: 'Test passed successfully',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
      is_signed: false,
    },
    {
      id: 'run-2',
      test_spec_id: 'spec-1',
      test_spec_version: '1.0.0',
      executed_by: 'user-2',
      execution_date: '2024-01-16T10:00:00Z',
      environment: 'production',
      overall_status: 'fail',
      step_results: [],
      defect_workitem_ids: [],
      failure_description: 'Test failed due to timeout',
      created_at: '2024-01-16T10:00:00Z',
      updated_at: '2024-01-16T10:00:00Z',
      is_signed: true,
    },
  ];

  it('should render test runs list', () => {
    const onCreateRun = vi.fn();
    render(<TestRunsList testRuns={mockTestRuns} onCreateRun={onCreateRun} />);

    expect(screen.getByText(/Test Runs \(2\)/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('test-run-card')).toHaveLength(2);
  });

  it('should show edit button for unsigned test runs', () => {
    const onCreateRun = vi.fn();
    const onEditRun = vi.fn();
    render(
      <TestRunsList
        testRuns={mockTestRuns}
        onCreateRun={onCreateRun}
        onEditRun={onEditRun}
      />
    );

    const editButtons = screen.getAllByText('Edit');
    expect(editButtons).toHaveLength(1); // Only one unsigned run
  });

  it('should not show edit button for signed test runs', () => {
    const onCreateRun = vi.fn();
    const onEditRun = vi.fn();
    render(
      <TestRunsList
        testRuns={[mockTestRuns[1]]} // Only the signed run
        onCreateRun={onCreateRun}
        onEditRun={onEditRun}
      />
    );

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });

  it('should call onEditRun when edit button is clicked', () => {
    const onCreateRun = vi.fn();
    const onEditRun = vi.fn();
    render(
      <TestRunsList
        testRuns={mockTestRuns}
        onCreateRun={onCreateRun}
        onEditRun={onEditRun}
      />
    );

    const editButton = screen.getByText('Edit');
    fireEvent.click(editButton);

    expect(onEditRun).toHaveBeenCalledWith(mockTestRuns[0]);
  });

  it('should not show edit button when onEditRun is not provided', () => {
    const onCreateRun = vi.fn();
    render(<TestRunsList testRuns={mockTestRuns} onCreateRun={onCreateRun} />);

    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
  });
});

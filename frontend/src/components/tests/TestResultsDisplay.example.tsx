/**
 * TestResultsDisplay Usage Example
 * Demonstrates how to integrate the TestResultsDisplay component
 */


import { TestResultsDisplay } from './TestResultsDisplay';
import type { TestRun } from './TestResultsDisplay';
import type { TestSpec } from './TestSpecList';

// Example usage in a page component
export function TestRunDetailPage() {
  // Mock data - in real usage, fetch from API
  const testSpec: TestSpec = {
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
    test_steps: [],
  };

  const testRun: TestRun = {
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

  const handleViewDefect = (defectId: string) => {
    console.log('View defect:', defectId);
    // Navigate to defect detail page
  };

  const handleViewHistory = () => {
    console.log('View test run history');
    // Navigate to test run history page
  };

  const handleSign = () => {
    console.log('Sign test results');
    // Open signature dialog
  };

  const handleExport = () => {
    console.log('Export test results');
    // Export results as PDF or other format
  };

  return (
    <div className="test-run-detail-page">
      <TestResultsDisplay
        testRun={testRun}
        testSpec={testSpec}
        onViewDefect={handleViewDefect}
        onViewHistory={handleViewHistory}
        onSign={handleSign}
        onExport={handleExport}
        showActions={true}
      />
    </div>
  );
}

// Example: Display results without actions (read-only view)
export function TestRunReadOnlyView({ testRun }: { testRun: TestRun }) {
  return (
    <TestResultsDisplay
      testRun={testRun}
      showActions={false}
    />
  );
}

// Example: Display results with custom handlers
export function TestRunWithCustomHandlers({ testRun, testSpec }: { testRun: TestRun; testSpec: TestSpec }) {
  const handleViewDefect = async (defectId: string) => {
    // Custom defect viewing logic
    const response = await fetch(`/api/v1/workitems/${defectId}`);
    await response.json();
    // Show defect in modal or navigate to detail page
  };

  return (
    <TestResultsDisplay
      testRun={testRun}
      testSpec={testSpec}
      onViewDefect={handleViewDefect}
    />
  );
}

export default TestRunDetailPage;

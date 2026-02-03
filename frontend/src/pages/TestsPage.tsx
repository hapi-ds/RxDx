/**
 * Tests page
 * Main page for managing test specifications and test runs
 * Supports VV (Verification and Validation) management per Requirement 9
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../components/common';
import { TestSpecList, type TestSpec, TestCoverageChart } from '../components/tests';

type ViewMode = 'list' | 'detail' | 'create' | 'runs';

// TestRun interface for future use when implementing test runs view
// interface TestRun {
//   id: string;
//   test_spec_id: string;
//   test_spec_version: string;
//   executed_by: string;
//   execution_date: string;
//   environment?: string;
//   overall_status: 'pass' | 'fail' | 'blocked' | 'not_run';
//   step_results: TestStep[];
//   failure_description?: string;
//   execution_notes?: string;
// }

interface TestCoverage {
  total_requirements: number;
  requirements_with_tests: number;
  requirements_with_passing_tests: number;
  coverage_percentage: number;
}

export function TestsPage(): React.ReactElement {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [testSpecs, setTestSpecs] = useState<TestSpec[]>([]);
  const [coverage, setCoverage] = useState<TestCoverage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load test specs on mount
  useEffect(() => {
    loadTestSpecs();
    loadCoverage();
  }, []);

  const loadTestSpecs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/v1/tests/');
      // const data = await response.json();
      // setTestSpecs(data.items);
      
      // Mock data for now
      setTestSpecs([]);
    } catch (err) {
      setError('Failed to load test specifications');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadCoverage = useCallback(async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/v1/tests/coverage');
      // const data = await response.json();
      // setCoverage(data);
      
      // Mock data for now
      setCoverage({
        total_requirements: 0,
        requirements_with_tests: 0,
        requirements_with_passing_tests: 0,
        coverage_percentage: 0,
      });
    } catch (err) {
      console.error('Failed to load coverage:', err);
    }
  }, []);

  const handleTestClick = useCallback((test: TestSpec) => {
    setSelectedTestId(test.id);
    setViewMode('detail');
  }, []);

  const handleCreateClick = useCallback(() => {
    setSelectedTestId(null);
    setViewMode('create');
  }, []);

  const handleBackToList = useCallback(() => {
    setViewMode('list');
    setSelectedTestId(null);
  }, []);

  const handleViewRuns = useCallback((testId: string) => {
    setSelectedTestId(testId);
    setViewMode('runs');
  }, []);

  return (
    <div className="tests-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Tests</h1>
          <p className="page-subtitle">
            Manage test specifications, execute test runs, and track test coverage
          </p>
        </div>
        {viewMode !== 'list' && (
          <Button variant="secondary" onClick={handleBackToList}>
            ← Back to List
          </Button>
        )}
      </div>

      {/* Coverage Dashboard */}
      {viewMode === 'list' && coverage && (
        <div className="coverage-dashboard">
          <h2 className="dashboard-title">Test Coverage</h2>
          <TestCoverageChart 
            data={coverage}
            visualizationType="all"
            showLegend={true}
            showStatistics={true}
          />
        </div>
      )}

      <div className="page-content">
        {viewMode === 'list' && (
          <div className="test-list-container">
            <div className="list-header">
              <h2 className="list-title">Test Specifications</h2>
              <Button variant="primary" onClick={handleCreateClick}>
                + Create Test Spec
              </Button>
            </div>

            <TestSpecList
              testSpecs={testSpecs}
              onTestClick={handleTestClick}
              onViewRuns={handleViewRuns}
              isLoading={isLoading}
              error={error}
            />
          </div>
        )}

        {viewMode === 'create' && (
          <div className="form-container">
            <h2 className="form-title">Create Test Specification</h2>
            <div className="coming-soon-message">
              <p>Test specification form coming soon...</p>
              <p className="hint">
                This will include fields for title, description, test type, priority,
                test steps, and linked requirements.
              </p>
            </div>
          </div>
        )}

        {viewMode === 'detail' && selectedTestId && (
          <div className="detail-container">
            <h2 className="detail-title">Test Specification Detail</h2>
            <div className="coming-soon-message">
              <p>Test specification detail view coming soon...</p>
              <p className="hint">
                This will display test details, steps, linked requirements, version history,
                and digital signatures.
              </p>
            </div>
          </div>
        )}

        {viewMode === 'runs' && selectedTestId && (
          <div className="runs-container">
            <h2 className="runs-title">Test Runs</h2>
            <div className="coming-soon-message">
              <p>Test runs view coming soon...</p>
              <p className="hint">
                This will display all test execution runs for the selected test specification,
                including execution results, timestamps, and failure descriptions.
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        .tests-page {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 1.5rem;
          background-color: #f9fafb;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .page-title-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .page-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }

        .page-subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .coverage-dashboard {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .dashboard-title {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .page-content {
          flex: 1;
          overflow: auto;
        }

        .test-list-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .list-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .list-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .form-container,
        .detail-container,
        .runs-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .form-title,
        .detail-title,
        .runs-title {
          margin: 0 0 1.5rem 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .coming-soon-message {
          padding: 3rem 2rem;
          text-align: center;
          background: #f9fafb;
          border-radius: 6px;
          border: 2px dashed #d1d5db;
        }

        .coming-soon-message p {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          color: #374151;
        }

        .coming-soon-message .hint {
          font-size: 0.875rem;
          color: #6b7280;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .tests-page {
            padding: 1rem;
          }

          .page-header {
            flex-direction: column;
            gap: 1rem;
          }

          .list-header {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

export default TestsPage;

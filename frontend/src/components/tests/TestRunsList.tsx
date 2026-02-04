/**
 * TestRunsList component
 * Displays a list of test runs for a test specification
 * Shows execution date, executed by, environment, and overall status
 */

import React from 'react';
import { Button } from '../common';
import type { TestRun } from '../../services/testService';

export interface TestRunsListProps {
  testRuns: TestRun[];
  onCreateRun: () => void;
  onEditRun?: (run: TestRun) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function TestRunsList({
  testRuns,
  onCreateRun,
  onEditRun,
  isLoading = false,
  error = null,
  onRetry,
}: TestRunsListProps): React.ReactElement {
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pass: '#10b981',
      fail: '#ef4444',
      blocked: '#f59e0b',
      not_run: '#9ca3af',
    };
    return colors[status] || '#9ca3af';
  };

  // Get status label
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      pass: 'Pass',
      fail: 'Fail',
      blocked: 'Blocked',
      not_run: 'Not Run',
    };
    return labels[status] || status;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="test-runs-list">
        <div className="list-header">
          <h3 className="list-title">Test Runs</h3>
          <Button variant="primary" onClick={onCreateRun} disabled>
            + Create Test Run
          </Button>
        </div>
        <div className="loading-container">
          <div className="loading-spinner" />
          <p className="loading-text">Loading test runs...</p>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="test-runs-list">
        <div className="list-header">
          <h3 className="list-title">Test Runs</h3>
          <Button variant="primary" onClick={onCreateRun}>
            + Create Test Run
          </Button>
        </div>
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error}</p>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // Empty state
  if (testRuns.length === 0) {
    return (
      <div className="test-runs-list">
        <div className="list-header">
          <h3 className="list-title">Test Runs</h3>
          <Button variant="primary" onClick={onCreateRun}>
            + Create Test Run
          </Button>
        </div>
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h4 className="empty-title">No Test Runs Yet</h4>
          <p className="empty-description">
            Create your first test run to start tracking test execution results.
          </p>
          <Button variant="primary" onClick={onCreateRun}>
            Create First Test Run
          </Button>
        </div>
        <style>{styles}</style>
      </div>
    );
  }

  // List view
  return (
    <div className="test-runs-list">
      <div className="list-header">
        <h3 className="list-title">Test Runs ({testRuns.length})</h3>
        <Button variant="primary" onClick={onCreateRun}>
          + Create Test Run
        </Button>
      </div>

      <div className="runs-grid">
        {testRuns.map((run) => (
          <div key={run.id} className="run-card" data-testid="test-run-card">
            <div className="run-header">
              <div className="run-info">
                <span className="run-date" data-testid="run-execution-date">
                  {formatDate(run.execution_date)}
                </span>
                <span className="run-version">v{run.test_spec_version}</span>
              </div>
              <div
                className="run-status"
                data-testid="run-overall-status"
                style={{ backgroundColor: getStatusColor(run.overall_status) }}
              >
                {getStatusLabel(run.overall_status)}
              </div>
            </div>

            <div className="run-details">
              <div className="detail-row">
                <span className="detail-label">Executed By:</span>
                <span className="detail-value" data-testid="run-executed-by">
                  {run.executed_by}
                </span>
              </div>

              {run.environment && (
                <div className="detail-row">
                  <span className="detail-label">Environment:</span>
                  <span className="detail-value" data-testid="run-environment">
                    {run.environment}
                  </span>
                </div>
              )}

              {run.execution_notes && (
                <div className="detail-row notes-row">
                  <span className="detail-label">Notes:</span>
                  <p className="detail-notes">{run.execution_notes}</p>
                </div>
              )}

              {run.failure_description && (
                <div className="detail-row failure-row">
                  <span className="detail-label">Failure:</span>
                  <p className="detail-failure">{run.failure_description}</p>
                </div>
              )}
            </div>

            {run.is_signed && (
              <div className="signature-badge">
                <span className="signature-icon">✓</span>
                <span className="signature-text">Digitally Signed</span>
              </div>
            )}

            {onEditRun && !run.is_signed && (
              <div className="run-actions">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditRun(run);
                  }}
                >
                  Edit
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .test-runs-list {
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

  /* Loading State */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #e5e7eb;
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-text {
    margin: 1rem 0 0 0;
    font-size: 0.875rem;
    color: #6b7280;
  }

  /* Error State */
  .error-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 3rem 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .error-icon {
    font-size: 3rem;
  }

  .error-message {
    margin: 0;
    font-size: 0.875rem;
    color: #dc2626;
    text-align: center;
  }

  /* Empty State */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    padding: 4rem 2rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .empty-icon {
    font-size: 4rem;
    opacity: 0.5;
  }

  .empty-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .empty-description {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
    max-width: 400px;
  }

  /* Runs Grid */
  .runs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 1.5rem;
  }

  .run-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
    cursor: pointer;
  }

  .run-card:hover {
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .run-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .run-info {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .run-date {
    font-size: 0.875rem;
    font-weight: 600;
    color: #111827;
  }

  .run-version {
    font-size: 0.75rem;
    color: #6b7280;
    font-weight: 500;
  }

  .run-status {
    display: inline-flex;
    align-items: center;
    padding: 0.375rem 0.75rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .run-details {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .detail-row {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .detail-row.notes-row,
  .detail-row.failure-row {
    padding-top: 0.75rem;
    border-top: 1px solid #e5e7eb;
  }

  .detail-row.failure-row {
    background: #fef2f2;
    padding: 0.75rem;
    border-radius: 4px;
    border: 1px solid #fecaca;
  }

  .detail-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-value {
    font-size: 0.875rem;
    color: #111827;
    font-weight: 500;
  }

  .detail-notes,
  .detail-failure {
    margin: 0;
    font-size: 0.875rem;
    color: #374151;
    line-height: 1.5;
  }

  .detail-failure {
    color: #dc2626;
  }

  .signature-badge {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
  }

  .signature-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: #10b981;
    color: white;
    border-radius: 50%;
    font-size: 0.75rem;
    font-weight: 700;
  }

  .signature-text {
    font-size: 0.75rem;
    font-weight: 600;
    color: #065f46;
  }

  .run-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.75rem;
    border-top: 1px solid #e5e7eb;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .list-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
      padding: 1rem;
    }

    .list-title {
      font-size: 1.125rem;
    }

    .list-header button {
      width: 100%;
    }

    .runs-grid {
      grid-template-columns: 1fr;
      gap: 1rem;
    }

    .run-card {
      padding: 1rem;
    }

    .run-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .empty-state {
      padding: 3rem 1.5rem;
    }

    .empty-icon {
      font-size: 3rem;
    }

    .empty-title {
      font-size: 1.125rem;
    }
  }
`;

export default TestRunsList;

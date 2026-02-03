/**
 * TestResultsDisplay component
 * Displays test execution results in a clear, readable format
 * Implements Requirement 9 (Verification and Validation Management)
 * 
 * Features:
 * - Overall status display with color coding
 * - Environment and execution metadata
 * - Step-by-step results with pass/fail/blocked/skipped status
 * - Failure highlighting with descriptions
 * - Linked defects display
 * - Historical test runs support
 * - Digital signature display
 */

import React, { useMemo } from 'react';
import { Button } from '../common';
import type { TestSpec, TestStep } from './TestSpecList';

export interface TestRun {
  id: string;
  test_spec_id: string;
  test_spec_version: string;
  executed_by: string;
  executed_by_name?: string;
  execution_date: string;
  environment: string;
  overall_status: 'pass' | 'fail' | 'blocked' | 'not_run';
  step_results: TestStepResult[];
  failure_description?: string;
  execution_notes?: string;
  linked_defects: string[];
  is_signed?: boolean;
  signatures?: TestRunSignature[];
}

export interface TestStepResult extends TestStep {
  actual_result?: string;
  notes?: string;
  linked_defect_id?: string;
}

export interface TestRunSignature {
  id: string;
  user_name: string;
  signed_at: string;
  is_valid: boolean;
}

export interface TestResultsDisplayProps {
  testRun: TestRun;
  testSpec?: TestSpec;
  onViewDefect?: (defectId: string) => void;
  onViewHistory?: () => void;
  onSign?: () => void;
  onExport?: () => void;
  showActions?: boolean;
}

type StepStatus = 'pass' | 'fail' | 'blocked' | 'skipped' | 'not_run';

export function TestResultsDisplay({
  testRun,
  testSpec,
  onViewDefect,
  onViewHistory,
  onSign,
  onExport,
  showActions = true,
}: TestResultsDisplayProps): React.ReactElement {
  // Calculate statistics
  const statistics = useMemo(() => {
    const total = testRun.step_results.length;
    const passed = testRun.step_results.filter(s => s.status === 'pass').length;
    const failed = testRun.step_results.filter(s => s.status === 'fail').length;
    const blocked = testRun.step_results.filter(s => s.status === 'blocked').length;
    const skipped = testRun.step_results.filter(s => s.status === 'skipped').length;
    const notRun = testRun.step_results.filter(s => s.status === 'not_run').length;
    const passRate = total > 0 ? ((passed / (total - skipped - notRun)) * 100) : 0;

    return {
      total,
      passed,
      failed,
      blocked,
      skipped,
      notRun,
      passRate: isNaN(passRate) ? 0 : passRate,
    };
  }, [testRun.step_results]);

  // Get status color
  const getStatusColor = (status: StepStatus): string => {
    const colors: Record<StepStatus, string> = {
      pass: '#10b981',
      fail: '#ef4444',
      blocked: '#f59e0b',
      skipped: '#6b7280',
      not_run: '#9ca3af',
    };
    return colors[status];
  };

  // Get status label
  const getStatusLabel = (status: StepStatus): string => {
    const labels: Record<StepStatus, string> = {
      pass: 'Pass',
      fail: 'Fail',
      blocked: 'Blocked',
      skipped: 'Skipped',
      not_run: 'Not Run',
    };
    return labels[status];
  };

  // Get status icon
  const getStatusIcon = (status: StepStatus): string => {
    const icons: Record<StepStatus, string> = {
      pass: '✓',
      fail: '✗',
      blocked: '⊘',
      skipped: '⊝',
      not_run: '○',
    };
    return icons[status];
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Format environment
  const formatEnvironment = (env: string): string => {
    return env.charAt(0).toUpperCase() + env.slice(1);
  };

  return (
    <div className="test-results-display">
      {/* Header Section */}
      <div className="results-header">
        <div className="header-content">
          <div className="header-title-section">
            <h2 className="results-title">Test Execution Results</h2>
            {testSpec && (
              <div className="test-spec-info">
                <span className="spec-label">Test Specification:</span>
                <span className="spec-value">{testSpec.title}</span>
                <span className="version-badge">v{testRun.test_spec_version}</span>
              </div>
            )}
          </div>
          <div
            className="overall-status-badge"
            style={{ backgroundColor: getStatusColor(testRun.overall_status) }}
          >
            {getStatusIcon(testRun.overall_status)} {getStatusLabel(testRun.overall_status)}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="header-actions">
            {onViewHistory && (
              <Button variant="secondary" size="sm" onClick={onViewHistory}>
                View History
              </Button>
            )}
            {onExport && (
              <Button variant="secondary" size="sm" onClick={onExport}>
                Export Results
              </Button>
            )}
            {onSign && !testRun.is_signed && (
              <Button variant="primary" size="sm" onClick={onSign}>
                Sign Results
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Metadata Section */}
      <div className="metadata-section">
        <div className="metadata-grid">
          <div className="metadata-item">
            <span className="metadata-label">Executed By:</span>
            <span className="metadata-value">
              {testRun.executed_by_name || testRun.executed_by}
            </span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Execution Date:</span>
            <span className="metadata-value">{formatDate(testRun.execution_date)}</span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Environment:</span>
            <span className="metadata-value environment-badge">
              {formatEnvironment(testRun.environment)}
            </span>
          </div>
          <div className="metadata-item">
            <span className="metadata-label">Test Run ID:</span>
            <span className="metadata-value mono">{testRun.id}</span>
          </div>
        </div>

        {/* Execution Notes */}
        {testRun.execution_notes && (
          <div className="execution-notes">
            <span className="notes-label">Execution Notes:</span>
            <p className="notes-content">{testRun.execution_notes}</p>
          </div>
        )}
      </div>

      {/* Statistics Section */}
      <div className="statistics-section">
        <h3 className="section-title">Test Statistics</h3>
        <div className="statistics-grid">
          <div className="stat-card">
            <div className="stat-value">{statistics.total}</div>
            <div className="stat-label">Total Steps</div>
          </div>
          <div className="stat-card success">
            <div className="stat-value">{statistics.passed}</div>
            <div className="stat-label">Passed</div>
          </div>
          <div className="stat-card danger">
            <div className="stat-value">{statistics.failed}</div>
            <div className="stat-label">Failed</div>
          </div>
          <div className="stat-card warning">
            <div className="stat-value">{statistics.blocked}</div>
            <div className="stat-label">Blocked</div>
          </div>
          <div className="stat-card neutral">
            <div className="stat-value">{statistics.skipped}</div>
            <div className="stat-label">Skipped</div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-value">{statistics.passRate.toFixed(1)}%</div>
            <div className="stat-label">Pass Rate</div>
          </div>
        </div>
      </div>

      {/* Failure Summary (if applicable) */}
      {testRun.overall_status === 'fail' && testRun.failure_description && (
        <div className="failure-section">
          <h3 className="section-title">Failure Summary</h3>
          <div className="failure-content">
            <div className="failure-icon">⚠️</div>
            <p className="failure-description">{testRun.failure_description}</p>
          </div>
          {testRun.linked_defects.length > 0 && (
            <div className="linked-defects">
              <span className="defects-label">Linked Defects:</span>
              <div className="defects-list">
                {testRun.linked_defects.map((defectId) => (
                  <button
                    key={defectId}
                    className="defect-link"
                    onClick={() => onViewDefect?.(defectId)}
                    type="button"
                  >
                    {defectId}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step Results Section */}
      <div className="step-results-section">
        <h3 className="section-title">Step-by-Step Results</h3>
        <div className="steps-container">
          {testRun.step_results.map((step) => (
            <div
              key={step.step_number}
              className={`step-result-card ${step.status === 'fail' ? 'failed' : ''} ${
                step.status === 'blocked' ? 'blocked' : ''
              }`}
            >
              <div className="step-header">
                <div className="step-number-section">
                  <span className="step-number">Step {step.step_number}</span>
                  <div
                    className="step-status-badge"
                    style={{ backgroundColor: getStatusColor(step.status) }}
                  >
                    {getStatusIcon(step.status)} {getStatusLabel(step.status)}
                  </div>
                </div>
              </div>

              <div className="step-content">
                <div className="step-field">
                  <label className="field-label">Description:</label>
                  <p className="field-value">{step.description}</p>
                </div>

                <div className="step-field">
                  <label className="field-label">Expected Result:</label>
                  <p className="field-value expected-result">{step.expected_result}</p>
                </div>

                {step.actual_result && (
                  <div className="step-field">
                    <label className="field-label">Actual Result:</label>
                    <p
                      className={`field-value actual-result ${
                        step.status === 'fail' ? 'failed' : ''
                      }`}
                    >
                      {step.actual_result}
                    </p>
                  </div>
                )}

                {step.notes && (
                  <div className="step-field">
                    <label className="field-label">Notes:</label>
                    <p className="field-value notes">{step.notes}</p>
                  </div>
                )}

                {step.linked_defect_id && (
                  <div className="step-field defect-field">
                    <label className="field-label">Linked Defect:</label>
                    <button
                      className="defect-link"
                      onClick={() => onViewDefect?.(step.linked_defect_id!)}
                      type="button"
                    >
                      {step.linked_defect_id}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Digital Signatures Section */}
      {testRun.is_signed && testRun.signatures && testRun.signatures.length > 0 && (
        <div className="signatures-section">
          <h3 className="section-title">Digital Signatures</h3>
          <div className="signatures-list">
            {testRun.signatures.map((signature) => (
              <div key={signature.id} className="signature-card">
                <div className="signature-icon">
                  {signature.is_valid ? '✓' : '✗'}
                </div>
                <div className="signature-info">
                  <div className="signature-user">{signature.user_name}</div>
                  <div className="signature-date">{formatDate(signature.signed_at)}</div>
                  <div
                    className={`signature-status ${
                      signature.is_valid ? 'valid' : 'invalid'
                    }`}
                  >
                    {signature.is_valid ? 'Valid Signature' : 'Invalid Signature'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .test-results-display {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Header Section */
        .results-header {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .header-title-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .results-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }

        .test-spec-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .spec-label {
          color: #6b7280;
          font-weight: 500;
        }

        .spec-value {
          color: #111827;
          font-weight: 600;
        }

        .version-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          background: #f3f4f6;
          color: #374151;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .overall-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: 6px;
          font-size: 1rem;
          font-weight: 700;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          white-space: nowrap;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        /* Metadata Section */
        .metadata-section {
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .metadata-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .metadata-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .metadata-value {
          font-size: 0.875rem;
          color: #111827;
          font-weight: 500;
        }

        .metadata-value.mono {
          font-family: 'Courier New', monospace;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .environment-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          background: #eff6ff;
          color: #1e40af;
          border-radius: 4px;
          font-weight: 600;
          width: fit-content;
        }

        .execution-notes {
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .notes-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          margin-bottom: 0.5rem;
        }

        .notes-content {
          margin: 0;
          font-size: 0.875rem;
          color: #374151;
          line-height: 1.6;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 4px;
          border-left: 3px solid #667eea;
        }

        /* Statistics Section */
        .statistics-section {
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-title {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .statistics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 1rem;
        }

        .stat-card {
          padding: 1rem;
          background: #f9fafb;
          border-radius: 6px;
          text-align: center;
          border: 2px solid #e5e7eb;
          transition: all 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .stat-card.success {
          background: #f0fdf4;
          border-color: #86efac;
        }

        .stat-card.danger {
          background: #fef2f2;
          border-color: #fca5a5;
        }

        .stat-card.warning {
          background: #fffbeb;
          border-color: #fcd34d;
        }

        .stat-card.neutral {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .stat-card.highlight {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: #667eea;
        }

        .stat-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          margin-bottom: 0.25rem;
        }

        .stat-card.highlight .stat-value {
          color: white;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .stat-card.highlight .stat-label {
          color: rgba(255, 255, 255, 0.9);
        }

        /* Failure Section */
        .failure-section {
          padding: 1.5rem;
          background: #fef2f2;
          border: 2px solid #fca5a5;
          border-radius: 8px;
        }

        .failure-content {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .failure-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .failure-description {
          margin: 0;
          font-size: 0.875rem;
          color: #7f1d1d;
          line-height: 1.6;
          flex: 1;
        }

        .linked-defects {
          padding-top: 1rem;
          border-top: 1px solid #fca5a5;
        }

        .defects-label {
          display: block;
          font-size: 0.75rem;
          font-weight: 600;
          color: #7f1d1d;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          margin-bottom: 0.5rem;
        }

        .defects-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .defect-link {
          padding: 0.375rem 0.75rem;
          background: white;
          color: #dc2626;
          border: 1px solid #fca5a5;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: 'Courier New', monospace;
          cursor: pointer;
          transition: all 0.2s;
        }

        .defect-link:hover {
          background: #fee2e2;
          border-color: #f87171;
        }

        /* Step Results Section */
        .step-results-section {
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .steps-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .step-result-card {
          padding: 1.25rem;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .step-result-card.failed {
          background: #fef2f2;
          border-color: #fca5a5;
        }

        .step-result-card.blocked {
          background: #fffbeb;
          border-color: #fcd34d;
        }

        .step-result-card:hover {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .step-header {
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .step-result-card.failed .step-header {
          border-bottom-color: #fca5a5;
        }

        .step-result-card.blocked .step-header {
          border-bottom-color: #fcd34d;
        }

        .step-number-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
        }

        .step-number {
          font-size: 0.875rem;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .step-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.75rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .step-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .step-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .field-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .field-value {
          margin: 0;
          padding: 0.75rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          font-size: 0.875rem;
          color: #111827;
          line-height: 1.5;
        }

        .field-value.expected-result {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .field-value.actual-result {
          background: #eff6ff;
          border-color: #bfdbfe;
        }

        .field-value.actual-result.failed {
          background: #fee2e2;
          border-color: #fca5a5;
        }

        .field-value.notes {
          background: #fefce8;
          border-color: #fde047;
          font-style: italic;
        }

        .defect-field {
          padding-top: 0.75rem;
          border-top: 1px dashed #ef4444;
        }

        /* Signatures Section */
        .signatures-section {
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 2px solid #10b981;
        }

        .signatures-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .signature-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: #f0fdf4;
          border: 1px solid #86efac;
          border-radius: 6px;
        }

        .signature-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          background: #10b981;
          color: white;
          border-radius: 50%;
          font-size: 1.25rem;
          font-weight: 700;
          flex-shrink: 0;
        }

        .signature-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }

        .signature-user {
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
        }

        .signature-date {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .signature-status {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .signature-status.valid {
          color: #059669;
        }

        .signature-status.invalid {
          color: #dc2626;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .test-results-display {
            gap: 1rem;
          }

          .header-content {
            flex-direction: column;
          }

          .overall-status-badge {
            align-self: flex-start;
          }

          .header-actions {
            width: 100%;
          }

          .header-actions button {
            flex: 1;
          }

          .metadata-grid {
            grid-template-columns: 1fr;
          }

          .statistics-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .step-number-section {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

export default TestResultsDisplay;

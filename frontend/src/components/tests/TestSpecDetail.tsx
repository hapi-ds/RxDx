/**
 * TestSpecDetail component
 * Displays full test specification details including test steps, linked requirements,
 * version information, and digital signatures
 * Implements Requirements 5.1-5.7, 7.1, 8.1, 9.1
 */

import React from 'react';
import { Button } from '../common';

export interface TestStep {
  step_number: number;
  description: string;
  expected_result: string;
  status: 'pass' | 'fail' | 'blocked' | 'skipped' | 'not_run';
  actual_result?: string;
  notes?: string;
}

export interface TestSpec {
  id: string;
  title: string;
  description?: string;
  test_type: 'unit' | 'integration' | 'system' | 'acceptance' | 'regression';
  priority?: number;
  preconditions?: string;
  test_steps: TestStep[];
  linked_requirements: string[];
  version: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_signed: boolean;
}

export interface TestSpecDetailProps {
  testSpec: TestSpec;
  onEdit: () => void;
  onDelete: () => void;
  onViewRuns: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function TestSpecDetail({
  testSpec,
  onEdit,
  onDelete,
  onViewRuns,
  onBack,
  isLoading = false,
}: TestSpecDetailProps): React.ReactElement {
  const getTestTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      unit: '#10b981',
      integration: '#3b82f6',
      system: '#8b5cf6',
      acceptance: '#f59e0b',
      regression: '#ef4444',
    };
    return colors[type] || '#6b7280';
  };

  const getPriorityLabel = (priority?: number): string => {
    if (!priority) return 'Not Set';
    const labels: Record<number, string> = {
      1: 'Critical',
      2: 'High',
      3: 'Medium',
      4: 'Low',
      5: 'Trivial',
    };
    return labels[priority] || 'Not Set';
  };

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

  const getStepStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      pass: '#10b981',
      fail: '#ef4444',
      blocked: '#f59e0b',
      skipped: '#6b7280',
      not_run: '#9ca3af',
    };
    return colors[status] || '#6b7280';
  };

  if (isLoading) {
    return (
      <div className="test-spec-detail loading">
        <div className="loading-spinner" />
        <span>Loading test specification...</span>
      </div>
    );
  }

  return (
    <div className="test-spec-detail">
      {/* Header Section */}
      <div className="detail-header">
        <div className="header-top">
          <Button variant="secondary" size="sm" onClick={onBack}>
            ← Back to List
          </Button>
          <div className="header-actions">
            <Button variant="secondary" size="sm" onClick={onViewRuns}>
              View Runs
            </Button>
            <Button variant="secondary" size="sm" onClick={onEdit}>
              Edit
            </Button>
            <Button variant="danger" size="sm" onClick={onDelete}>
              Delete
            </Button>
          </div>
        </div>

        <div className="header-content">
          <div className="title-section">
            <h1 className="test-title">{testSpec.title}</h1>
            <div className="badges">
              <span
                className="test-type-badge"
                style={{ backgroundColor: getTestTypeColor(testSpec.test_type) }}
              >
                {testSpec.test_type}
              </span>
              <span className="version-badge">v{testSpec.version}</span>
              {testSpec.is_signed && (
                <span className="signed-badge" title="Digitally Signed">
                  ✓ Signed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="detail-content">
        {/* Basic Information */}
        <section className="detail-section">
          <h2 className="section-title">Basic Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Priority:</span>
              <span className="info-value">{getPriorityLabel(testSpec.priority)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Test Steps:</span>
              <span className="info-value">{testSpec.test_steps.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Linked Requirements:</span>
              <span className="info-value">{testSpec.linked_requirements.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Created:</span>
              <span className="info-value">{formatDate(testSpec.created_at)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Last Updated:</span>
              <span className="info-value">{formatDate(testSpec.updated_at)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Created By:</span>
              <span className="info-value">{testSpec.created_by}</span>
            </div>
          </div>
        </section>

        {/* Description */}
        {testSpec.description && (
          <section className="detail-section">
            <h2 className="section-title">Description</h2>
            <p className="description-text">{testSpec.description}</p>
          </section>
        )}

        {/* Preconditions */}
        {testSpec.preconditions && (
          <section className="detail-section">
            <h2 className="section-title">Preconditions</h2>
            <p className="preconditions-text">{testSpec.preconditions}</p>
          </section>
        )}

        {/* Test Steps */}
        <section className="detail-section">
          <h2 className="section-title">Test Steps</h2>
          <div className="test-steps">
            {testSpec.test_steps.map((step) => (
              <div key={step.step_number} className="test-step">
                <div className="step-header">
                  <span className="step-number">Step {step.step_number}</span>
                  <span
                    className="step-status"
                    style={{ backgroundColor: getStepStatusColor(step.status) }}
                  >
                    {step.status}
                  </span>
                </div>
                <div className="step-content">
                  <div className="step-field">
                    <span className="step-label">Description:</span>
                    <p className="step-text">{step.description}</p>
                  </div>
                  <div className="step-field">
                    <span className="step-label">Expected Result:</span>
                    <p className="step-text">{step.expected_result}</p>
                  </div>
                  {step.actual_result && (
                    <div className="step-field">
                      <span className="step-label">Actual Result:</span>
                      <p className="step-text">{step.actual_result}</p>
                    </div>
                  )}
                  {step.notes && (
                    <div className="step-field">
                      <span className="step-label">Notes:</span>
                      <p className="step-text">{step.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Linked Requirements */}
        {testSpec.linked_requirements.length > 0 && (
          <section className="detail-section">
            <h2 className="section-title">Linked Requirements</h2>
            <div className="requirements-list">
              {testSpec.linked_requirements.map((reqId) => (
                <div key={reqId} className="requirement-item">
                  <span className="requirement-icon">📋</span>
                  <span className="requirement-id">{reqId}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Signature Information */}
        <section className="detail-section">
          <h2 className="section-title">Signature Status</h2>
          <div className="signature-info">
            {testSpec.is_signed ? (
              <div className="signature-status signed">
                <span className="signature-icon">✓</span>
                <div className="signature-text">
                  <span className="signature-label">Digitally Signed</span>
                  <span className="signature-description">
                    This test specification has been digitally signed and is protected from modification.
                  </span>
                </div>
              </div>
            ) : (
              <div className="signature-status unsigned">
                <span className="signature-icon">○</span>
                <div className="signature-text">
                  <span className="signature-label">Not Signed</span>
                  <span className="signature-description">
                    This test specification has not been digitally signed yet.
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <style>{`
        .test-spec-detail {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 1200px;
          margin: 0 auto;
        }

        .test-spec-detail.loading {
          align-items: center;
          justify-content: center;
          padding: 3rem;
          min-height: 400px;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Header Section */
        .detail-header {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .header-actions {
          display: flex;
          gap: 0.5rem;
        }

        .header-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .title-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .test-title {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 600;
          color: #111827;
          line-height: 1.3;
        }

        .badges {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .test-type-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.875rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          color: white;
        }

        .version-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.875rem;
          background: #f3f4f6;
          color: #374151;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .signed-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.375rem 0.875rem;
          background: #dcfce7;
          color: #166534;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        /* Main Content */
        .detail-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .detail-section {
          background: white;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .section-title {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        /* Basic Information */
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .info-value {
          font-size: 0.875rem;
          color: #111827;
          font-weight: 500;
        }

        /* Description and Preconditions */
        .description-text,
        .preconditions-text {
          margin: 0;
          font-size: 0.875rem;
          color: #374151;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        /* Test Steps */
        .test-steps {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .test-step {
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1rem;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .step-number {
          font-size: 0.875rem;
          font-weight: 600;
          color: #111827;
        }

        .step-status {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: white;
        }

        .step-content {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .step-field {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .step-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .step-text {
          margin: 0;
          font-size: 0.875rem;
          color: #374151;
          line-height: 1.5;
          white-space: pre-wrap;
        }

        /* Linked Requirements */
        .requirements-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .requirement-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .requirement-icon {
          font-size: 1rem;
        }

        .requirement-id {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          font-family: monospace;
        }

        /* Signature Information */
        .signature-info {
          display: flex;
          flex-direction: column;
        }

        .signature-status {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1rem;
          border-radius: 6px;
        }

        .signature-status.signed {
          background: #dcfce7;
          border: 1px solid #86efac;
        }

        .signature-status.unsigned {
          background: #f3f4f6;
          border: 1px solid #d1d5db;
        }

        .signature-icon {
          font-size: 1.5rem;
          line-height: 1;
        }

        .signature-status.signed .signature-icon {
          color: #166534;
        }

        .signature-status.unsigned .signature-icon {
          color: #6b7280;
        }

        .signature-text {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .signature-label {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .signature-status.signed .signature-label {
          color: #166534;
        }

        .signature-status.unsigned .signature-label {
          color: #374151;
        }

        .signature-description {
          font-size: 0.75rem;
        }

        .signature-status.signed .signature-description {
          color: #15803d;
        }

        .signature-status.unsigned .signature-description {
          color: #6b7280;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .test-spec-detail {
            gap: 1rem;
          }

          .detail-header {
            padding: 1rem;
          }

          .header-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .header-actions {
            width: 100%;
            flex-wrap: wrap;
          }

          .test-title {
            font-size: 1.5rem;
          }

          .detail-section {
            padding: 1rem;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default TestSpecDetail;

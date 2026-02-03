/**
 * TestRunForm component
 * Form for executing test runs with step-by-step result recording
 * Implements Requirement 9 (Verification and Validation Management)
 * 
 * Features:
 * - Environment selection
 * - Execution notes
 * - Step-by-step result recording (pass/fail/blocked/skipped)
 * - Actual results and notes per step
 * - Defect WorkItem linking for failures
 * - Digital signature requirement on completion
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button, Input, Textarea, Select } from '../common';
import type { TestSpec, TestStep } from './TestSpecList';

export interface TestRun {
  id?: string;
  test_spec_id: string;
  test_spec_version: string;
  executed_by?: string;
  execution_date?: string;
  environment: string;
  overall_status: 'pass' | 'fail' | 'blocked' | 'not_run';
  step_results: TestStepResult[];
  failure_description?: string;
  execution_notes?: string;
  linked_defects: string[];
}

export interface TestStepResult extends TestStep {
  actual_result?: string;
  notes?: string;
  linked_defect_id?: string;
}

export interface TestRunFormProps {
  testSpec: TestSpec;
  initialData?: Partial<TestRun>;
  onSubmit: (testRun: TestRun) => void | Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  mode?: 'create' | 'edit';
}

type StepStatus = 'pass' | 'fail' | 'blocked' | 'skipped' | 'not_run';

const ENVIRONMENT_OPTIONS = [
  { value: 'development', label: 'Development' },
  { value: 'staging', label: 'Staging' },
  { value: 'production', label: 'Production' },
  { value: 'qa', label: 'QA' },
  { value: 'uat', label: 'UAT (User Acceptance Testing)' },
  { value: 'integration', label: 'Integration' },
];

export function TestRunForm({
  testSpec,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode = 'create',
}: TestRunFormProps): React.ReactElement {
  // Form state
  const [environment, setEnvironment] = useState<string>(initialData?.environment || '');
  const [executionNotes, setExecutionNotes] = useState<string>(initialData?.execution_notes || '');
  const [failureDescription, setFailureDescription] = useState<string>(initialData?.failure_description || '');
  
  // Initialize step results from test spec
  const [stepResults, setStepResults] = useState<TestStepResult[]>(() => {
    if (initialData?.step_results) {
      return initialData.step_results;
    }
    return testSpec.test_steps.map(step => ({
      ...step,
      status: 'not_run' as StepStatus,
      actual_result: '',
      notes: '',
      linked_defect_id: undefined,
    }));
  });

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate overall status based on step results
  const overallStatus = useMemo((): 'pass' | 'fail' | 'blocked' | 'not_run' => {
    const statuses = stepResults.map(s => s.status);
    
    if (statuses.every(s => s === 'not_run')) return 'not_run';
    if (statuses.some(s => s === 'fail')) return 'fail';
    if (statuses.some(s => s === 'blocked')) return 'blocked';
    if (statuses.every(s => s === 'pass' || s === 'skipped')) return 'pass';
    
    return 'not_run';
  }, [stepResults]);

  // Check if any step has failed
  const hasFailedSteps = useMemo(() => {
    return stepResults.some(s => s.status === 'fail');
  }, [stepResults]);

  // Update step status
  const handleStepStatusChange = useCallback((stepIndex: number, status: StepStatus) => {
    setStepResults(prev => {
      const updated = [...prev];
      updated[stepIndex] = { ...updated[stepIndex], status };
      return updated;
    });
  }, []);

  // Update step actual result
  const handleStepActualResultChange = useCallback((stepIndex: number, actualResult: string) => {
    setStepResults(prev => {
      const updated = [...prev];
      updated[stepIndex] = { ...updated[stepIndex], actual_result: actualResult };
      return updated;
    });
  }, []);

  // Update step notes
  const handleStepNotesChange = useCallback((stepIndex: number, notes: string) => {
    setStepResults(prev => {
      const updated = [...prev];
      updated[stepIndex] = { ...updated[stepIndex], notes };
      return updated;
    });
  }, []);

  // Update step linked defect
  const handleStepDefectChange = useCallback((stepIndex: number, defectId: string) => {
    setStepResults(prev => {
      const updated = [...prev];
      updated[stepIndex] = { ...updated[stepIndex], linked_defect_id: defectId };
      return updated;
    });
  }, []);

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!environment) {
      newErrors.environment = 'Environment is required';
    }

    // Check if at least one step has been executed
    const hasExecutedSteps = stepResults.some(s => s.status !== 'not_run');
    if (!hasExecutedSteps) {
      newErrors.steps = 'At least one test step must be executed';
    }

    // If any step failed, require failure description
    if (hasFailedSteps && !failureDescription.trim()) {
      newErrors.failureDescription = 'Failure description is required when tests fail';
    }

    // Validate failed steps have actual results
    stepResults.forEach((step, index) => {
      if (step.status === 'fail' && !step.actual_result?.trim()) {
        newErrors[`step_${index}_actual`] = 'Actual result is required for failed steps';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [environment, stepResults, hasFailedSteps, failureDescription]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Collect all linked defects
    const linkedDefects = stepResults
      .filter(s => s.linked_defect_id)
      .map(s => s.linked_defect_id as string);

    const testRun: TestRun = {
      ...(initialData?.id && { id: initialData.id }),
      test_spec_id: testSpec.id,
      test_spec_version: testSpec.version,
      environment,
      overall_status: overallStatus,
      step_results: stepResults,
      execution_notes: executionNotes.trim() || undefined,
      failure_description: hasFailedSteps ? failureDescription.trim() : undefined,
      linked_defects: linkedDefects,
    };

    await onSubmit(testRun);
  }, [validate, testSpec, environment, overallStatus, stepResults, executionNotes, failureDescription, hasFailedSteps, initialData, onSubmit]);

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

  return (
    <form onSubmit={handleSubmit} className="test-run-form">
      <div className="form-header">
        <div className="header-content">
          <h2 className="form-title">
            {mode === 'create' ? 'Execute Test Run' : 'Edit Test Run'}
          </h2>
          <div className="test-spec-info">
            <span className="info-label">Test Specification:</span>
            <span className="info-value">{testSpec.title}</span>
            <span className="version-badge">v{testSpec.version}</span>
          </div>
        </div>
        <div className="overall-status-badge" style={{ backgroundColor: getStatusColor(overallStatus) }}>
          Overall: {getStatusLabel(overallStatus)}
        </div>
      </div>

      {/* General Information Section */}
      <div className="form-section">
        <h3 className="section-title">General Information</h3>
        
        <div className="form-row">
          <Select
            label="Environment"
            options={ENVIRONMENT_OPTIONS}
            value={environment}
            onChange={(e) => {
              setEnvironment(e.target.value);
              // Clear error when user makes a selection
              if (errors.environment) {
                setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.environment;
                  return newErrors;
                });
              }
            }}
            placeholder="Select environment"
            required
            error={errors.environment}
            disabled={isSubmitting}
          />
        </div>

        <div className="form-row">
          <Textarea
            label="Execution Notes"
            value={executionNotes}
            onChange={(e) => setExecutionNotes(e.target.value)}
            placeholder="Add any general notes about this test execution..."
            rows={3}
            hint="Optional: Add context, setup details, or observations"
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Test Steps Section */}
      <div className="form-section">
        <div className="section-header">
          <h3 className="section-title">Test Steps</h3>
          {errors.steps && <span className="section-error">{errors.steps}</span>}
        </div>

        <div className="steps-container">
          {stepResults.map((step, index) => (
            <div key={step.step_number} className="step-card">
              <div className="step-header">
                <span className="step-number">Step {step.step_number}</span>
                <div className="step-status-selector">
                  <label htmlFor={`step-${index}-status`} className="status-label">
                    Status:
                  </label>
                  <select
                    id={`step-${index}-status`}
                    value={step.status}
                    onChange={(e) => handleStepStatusChange(index, e.target.value as StepStatus)}
                    className="status-select"
                    style={{ borderColor: getStatusColor(step.status) }}
                    disabled={isSubmitting}
                  >
                    <option value="not_run">Not Run</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                    <option value="blocked">Blocked</option>
                    <option value="skipped">Skipped</option>
                  </select>
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

                <div className="step-field">
                  <Input
                    label="Actual Result"
                    value={step.actual_result || ''}
                    onChange={(e) => {
                      handleStepActualResultChange(index, e.target.value);
                      // Clear error when user types
                      const errorKey = `step_${index}_actual`;
                      if (errors[errorKey]) {
                        setErrors(prev => {
                          const newErrors = { ...prev };
                          delete newErrors[errorKey];
                          return newErrors;
                        });
                      }
                    }}
                    placeholder="Enter the actual result observed..."
                    required={step.status === 'fail'}
                    error={errors[`step_${index}_actual`]}
                    disabled={isSubmitting || step.status === 'not_run'}
                  />
                </div>

                <div className="step-field">
                  <Textarea
                    label="Notes"
                    value={step.notes || ''}
                    onChange={(e) => handleStepNotesChange(index, e.target.value)}
                    placeholder="Add any additional notes for this step..."
                    rows={2}
                    disabled={isSubmitting || step.status === 'not_run'}
                  />
                </div>

                {step.status === 'fail' && (
                  <div className="step-field defect-field">
                    <Input
                      label="Linked Defect WorkItem ID"
                      value={step.linked_defect_id || ''}
                      onChange={(e) => handleStepDefectChange(index, e.target.value)}
                      placeholder="Enter defect WorkItem ID (optional)"
                      hint="Link to a defect WorkItem for tracking"
                      disabled={isSubmitting}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Failure Description Section (shown when any step fails) */}
      {hasFailedSteps && (
        <div className="form-section failure-section">
          <h3 className="section-title">Failure Summary</h3>
        <div className="form-row">
          <Textarea
            label="Failure Description"
            value={failureDescription}
            onChange={(e) => {
              setFailureDescription(e.target.value);
              // Clear error when user types
              if (errors.failureDescription) {
                setErrors(prev => {
                  const newErrors = { ...prev };
                  delete newErrors.failureDescription;
                  return newErrors;
                });
              }
            }}
            placeholder="Provide a summary of the test failures and their impact..."
            rows={4}
            required
            error={errors.failureDescription}
            hint="Required when one or more test steps fail"
            disabled={isSubmitting}
          />
        </div>
        </div>
      )}

      {/* Signature Notice */}
      <div className="signature-notice">
        <span className="notice-icon">ℹ️</span>
        <span className="notice-text">
          A digital signature will be required after completing this test run.
        </span>
      </div>

      {/* Form Actions */}
      <div className="form-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : mode === 'create' ? 'Complete Test Run' : 'Update Test Run'}
        </Button>
      </div>

      <style>{`
        .test-run-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        /* Form Header */
        .form-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .header-content {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-title {
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

        .info-label {
          color: #6b7280;
          font-weight: 500;
        }

        .info-value {
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
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        /* Form Sections */
        .form-section {
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .form-section.failure-section {
          border: 2px solid #ef4444;
          background: #fef2f2;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .section-title {
          margin: 0 0 1rem 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .section-error {
          font-size: 0.875rem;
          color: #dc2626;
          font-weight: 500;
        }

        .form-row {
          margin-bottom: 1rem;
        }

        .form-row:last-child {
          margin-bottom: 0;
        }

        /* Test Steps */
        .steps-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .step-card {
          padding: 1.25rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          transition: all 0.2s;
        }

        .step-card:hover {
          border-color: #d1d5db;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid #e5e7eb;
        }

        .step-number {
          font-size: 0.875rem;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .step-status-selector {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .status-select {
          padding: 0.375rem 0.75rem;
          border: 2px solid;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .status-select:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
        }

        .status-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
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

        .defect-field {
          padding-top: 0.75rem;
          border-top: 1px dashed #ef4444;
        }

        /* Signature Notice */
        .signature-notice {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 6px;
        }

        .notice-icon {
          font-size: 1.25rem;
        }

        .notice-text {
          font-size: 0.875rem;
          color: #1e40af;
          font-weight: 500;
        }

        /* Form Actions */
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          padding: 1.5rem;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .test-run-form {
            gap: 1rem;
          }

          .form-header {
            flex-direction: column;
            gap: 1rem;
          }

          .overall-status-badge {
            align-self: flex-start;
          }

          .step-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .form-actions {
            flex-direction: column-reverse;
          }

          .form-actions button {
            width: 100%;
          }
        }
      `}</style>
    </form>
  );
}

export default TestRunForm;

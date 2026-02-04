/**
 * TestSpecForm component
 * Form for creating and editing test specifications
 * Implements Requirements 6.1, 6.2
 */

import React, { useState, useCallback } from 'react';
import { Input, Select, Textarea, Button } from '../common';
import type { TestSpecCreate, TestType, TestStep, StepExecutionStatus } from '../../services/testService';

export interface TestSpecFormProps {
  initialData?: Partial<TestSpecCreate>;
  onSubmit: (data: TestSpecCreate) => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

interface FormErrors {
  title?: string;
  test_type?: string;
  test_steps?: string;
  [key: string]: string | undefined;
}

const testTypeOptions = [
  { value: 'unit', label: 'Unit' },
  { value: 'integration', label: 'Integration' },
  { value: 'system', label: 'System' },
  { value: 'acceptance', label: 'Acceptance' },
  { value: 'regression', label: 'Regression' },
];

const priorityOptions = [
  { value: '1', label: '1 - Critical' },
  { value: '2', label: '2 - High' },
  { value: '3', label: '3 - Medium' },
  { value: '4', label: '4 - Low' },
  { value: '5', label: '5 - Trivial' },
];

export function TestSpecForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Create Test Specification',
}: TestSpecFormProps): React.ReactElement {
  // Form state
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [testType, setTestType] = useState<TestType | ''>(initialData?.test_type || '');
  const [priority, setPriority] = useState<string>(initialData?.priority?.toString() || '3');
  const [preconditions, setPreconditions] = useState(initialData?.preconditions || '');
  const [testSteps, setTestSteps] = useState<TestStep[]>(
    initialData?.test_steps || [
      {
        step_number: 1,
        description: '',
        expected_result: '',
        status: 'not_run' as StepExecutionStatus,
      },
    ]
  );
  const [linkedRequirements, setLinkedRequirements] = useState<string>(
    initialData?.linked_requirements?.join(', ') || ''
  );
  const [errors, setErrors] = useState<FormErrors>({});

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required';
    } else if (title.length > 500) {
      newErrors.title = 'Title must be 500 characters or less';
    }

    if (!testType) {
      newErrors.test_type = 'Test type is required';
    }

    if (testSteps.length === 0) {
      newErrors.test_steps = 'At least one test step is required';
    } else {
      const hasInvalidSteps = testSteps.some(
        (step) => !step.description.trim() || !step.expected_result.trim()
      );
      if (hasInvalidSteps) {
        newErrors.test_steps = 'All test steps must have description and expected result';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, testType, testSteps]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        return;
      }

      // Parse linked requirements
      const requirementIds = linkedRequirements
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      const formData: TestSpecCreate = {
        title: title.trim(),
        description: description.trim() || undefined,
        test_type: testType as TestType,
        priority: priority ? parseInt(priority, 10) : undefined,
        preconditions: preconditions.trim() || undefined,
        test_steps: testSteps.map((step, index) => ({
          ...step,
          step_number: index + 1,
          description: step.description.trim(),
          expected_result: step.expected_result.trim(),
        })),
        linked_requirements: requirementIds,
      };

      await onSubmit(formData);
    },
    [title, description, testType, priority, preconditions, testSteps, linkedRequirements, validate, onSubmit]
  );

  // Test step management
  const addTestStep = useCallback(() => {
    setTestSteps((prev) => [
      ...prev,
      {
        step_number: prev.length + 1,
        description: '',
        expected_result: '',
        status: 'not_run' as StepExecutionStatus,
      },
    ]);
  }, []);

  const removeTestStep = useCallback((index: number) => {
    setTestSteps((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateTestStep = useCallback((index: number, field: keyof TestStep, value: string) => {
    setTestSteps((prev) =>
      prev.map((step, i) => (i === index ? { ...step, [field]: value } : step))
    );
  }, []);

  return (
    <form onSubmit={handleSubmit} className="test-spec-form">
      <div className="form-section">
        <h3 className="section-title">Basic Information</h3>

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
          required
          maxLength={500}
          placeholder="Enter test specification title"
          disabled={isLoading}
        />

        <Textarea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          placeholder="Enter test specification description (optional)"
          disabled={isLoading}
          rows={3}
        />

        <div className="form-row">
          <Select
            label="Test Type"
            value={testType}
            onChange={(e) => setTestType(e.target.value as TestType)}
            options={testTypeOptions}
            error={errors.test_type}
            required
            placeholder="Select test type"
            disabled={isLoading}
          />

          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            options={priorityOptions}
            disabled={isLoading}
          />
        </div>

        <Textarea
          label="Preconditions"
          value={preconditions}
          onChange={(e) => setPreconditions(e.target.value)}
          maxLength={1000}
          placeholder="Enter any preconditions for this test (optional)"
          disabled={isLoading}
          rows={2}
        />
      </div>

      <div className="form-section">
        <div className="section-header">
          <h3 className="section-title">Test Steps</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={addTestStep}
            disabled={isLoading}
          >
            + Add Step
          </Button>
        </div>

        {errors.test_steps && (
          <div className="form-error-banner" role="alert">
            {errors.test_steps}
          </div>
        )}

        <div className="test-steps-list">
          {testSteps.map((step, index) => (
            <div key={index} className="test-step-item">
              <div className="step-header">
                <span className="step-number">Step {index + 1}</span>
                {testSteps.length > 1 && (
                  <button
                    type="button"
                    className="remove-step-btn"
                    onClick={() => removeTestStep(index)}
                    disabled={isLoading}
                    aria-label={`Remove step ${index + 1}`}
                  >
                    ✕
                  </button>
                )}
              </div>

              <Input
                label="Description"
                value={step.description}
                onChange={(e) => updateTestStep(index, 'description', e.target.value)}
                maxLength={1000}
                placeholder="What action should be performed?"
                required
                disabled={isLoading}
              />

              <Input
                label="Expected Result"
                value={step.expected_result}
                onChange={(e) => updateTestStep(index, 'expected_result', e.target.value)}
                maxLength={1000}
                placeholder="What should happen?"
                required
                disabled={isLoading}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="form-section">
        <h3 className="section-title">Linked Requirements</h3>

        <Input
          label="Requirement IDs"
          value={linkedRequirements}
          onChange={(e) => setLinkedRequirements(e.target.value)}
          placeholder="Enter requirement IDs separated by commas (optional)"
          hint="Example: REQ-001, REQ-002, REQ-003"
          disabled={isLoading}
        />
      </div>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" isLoading={isLoading}>
          {submitLabel}
        </Button>
      </div>

      <style>{`
        .test-spec-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-section {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .section-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-error-banner {
          padding: 0.75rem 1rem;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #dc2626;
          font-size: 0.875rem;
        }

        .test-steps-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .test-step-item {
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
        }

        .step-number {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }

        .remove-step-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          padding: 0;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 1rem;
        }

        .remove-step-btn:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .remove-step-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </form>
  );
}

export default TestSpecForm;

/**
 * BulkEditModal component
 * Modal for editing multiple work items simultaneously
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Modal, Button, Select, Input, Checkbox, Spinner } from '../common';
import type { BulkUpdateData, WorkItemStatus } from '../../services/workitemService';

export interface BulkEditModalProps {
  /** Selected work item IDs */
  selectedIds: string[];
  /** Callback when bulk edit completes */
  onSuccess: () => void;
  /** Callback to close modal */
  onCancel: () => void;
  /** Whether bulk update is in progress */
  isUpdating?: boolean;
  /** Error message if update failed */
  error?: string | null;
  /** Function to perform bulk update */
  onBulkUpdate: (data: BulkUpdateData) => Promise<void>;
}

interface FormData {
  status: WorkItemStatus | '';
  priority: string;
  assigned_to: string;
}

interface FieldEnabled {
  status: boolean;
  priority: boolean;
  assigned_to: boolean;
}

const statusOptions = [
  { value: '', label: 'Select status...' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'identified', label: 'Identified' },
  { value: 'assessed', label: 'Assessed' },
  { value: 'mitigated', label: 'Mitigated' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'closed', label: 'Closed' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
  { value: 'rejected', label: 'Rejected' },
];

export function BulkEditModal({
  selectedIds,
  onSuccess,
  onCancel,
  isUpdating = false,
  error = null,
  onBulkUpdate,
}: BulkEditModalProps): React.ReactElement {
  const [formData, setFormData] = useState<FormData>({
    status: '',
    priority: '',
    assigned_to: '',
  });

  const [fieldEnabled, setFieldEnabled] = useState<FieldEnabled>({
    status: false,
    priority: false,
    assigned_to: false,
  });

  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [touched, setTouched] = useState<Set<keyof FormData>>(new Set());

  // Reset form when modal opens
  useEffect(() => {
    setFormData({
      status: '',
      priority: '',
      assigned_to: '',
    });
    setFieldEnabled({
      status: false,
      priority: false,
      assigned_to: false,
    });
    setValidationErrors({});
    setTouched(new Set());
  }, [selectedIds]);

  const handleFieldChange = useCallback((field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear validation error when user changes the field
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const handleFieldBlur = useCallback((field: keyof FormData) => {
    setTouched((prev) => new Set(prev).add(field));
  }, []);

  const handleFieldEnabledChange = useCallback((field: keyof FieldEnabled, enabled: boolean) => {
    setFieldEnabled((prev) => ({ ...prev, [field]: enabled }));
    
    // Clear validation error when field is disabled
    if (!enabled) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, []);

  const validateForm = useCallback((): boolean => {
    const errors: Partial<Record<keyof FormData, string>> = {};

    // Check if at least one field is enabled
    if (!fieldEnabled.status && !fieldEnabled.priority && !fieldEnabled.assigned_to) {
      // Set a general error - we'll display this separately
      return false;
    }

    // Validate enabled fields
    if (fieldEnabled.status && !formData.status) {
      errors.status = 'Status is required when enabled';
    }

    if (fieldEnabled.priority) {
      const priority = parseInt(formData.priority);
      if (!formData.priority || isNaN(priority)) {
        errors.priority = 'Priority must be a number';
      } else if (priority < 1 || priority > 5) {
        errors.priority = 'Priority must be between 1 and 5';
      }
    }

    if (fieldEnabled.assigned_to && !formData.assigned_to.trim()) {
      errors.assigned_to = 'Assigned to is required when enabled';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, fieldEnabled]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all enabled fields as touched
    const newTouched = new Set<keyof FormData>();
    if (fieldEnabled.status) newTouched.add('status');
    if (fieldEnabled.priority) newTouched.add('priority');
    if (fieldEnabled.assigned_to) newTouched.add('assigned_to');
    setTouched(newTouched);

    if (!validateForm()) {
      return;
    }

    try {
      // Build update data with only enabled fields
      const updateData: BulkUpdateData = {};

      if (fieldEnabled.status && formData.status) {
        updateData.status = formData.status as WorkItemStatus;
      }

      if (fieldEnabled.priority && formData.priority) {
        updateData.priority = parseInt(formData.priority);
      }

      if (fieldEnabled.assigned_to && formData.assigned_to) {
        updateData.assigned_to = formData.assigned_to.trim();
      }

      await onBulkUpdate(updateData);
      onSuccess();
    } catch {
      // Error is handled by parent component
    }
  }, [formData, fieldEnabled, validateForm, onBulkUpdate, onSuccess]);

  const hasEnabledFields = fieldEnabled.status || fieldEnabled.priority || fieldEnabled.assigned_to;

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Bulk Edit Work Items"
      size="md"
    >
      <form onSubmit={handleSubmit} className="bulk-edit-form">
        <div className="bulk-edit-info">
          <p>
            Editing <strong>{selectedIds.length}</strong> work item{selectedIds.length !== 1 ? 's' : ''}
          </p>
          <p className="info-text">
            Enable the fields you want to update and provide new values.
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {!hasEnabledFields && touched.size > 0 && (
          <div className="error-message">
            Please enable at least one field to update
          </div>
        )}

        <div className="form-fields">
          {/* Status Field */}
          <div className="field-group">
            <div className="field-header">
              <Checkbox
                checked={fieldEnabled.status}
                onChange={(e) => handleFieldEnabledChange('status', e.target.checked)}
                label="Update Status"
              />
            </div>
            <Select
              options={statusOptions}
              value={formData.status}
              onChange={(e) => handleFieldChange('status', e.target.value)}
              onBlur={() => handleFieldBlur('status')}
              disabled={!fieldEnabled.status}
              error={touched.has('status') ? validationErrors.status : undefined}
            />
          </div>

          {/* Priority Field */}
          <div className="field-group">
            <div className="field-header">
              <Checkbox
                checked={fieldEnabled.priority}
                onChange={(e) => handleFieldEnabledChange('priority', e.target.checked)}
                label="Update Priority"
              />
            </div>
            <Input
              type="number"
              value={formData.priority}
              onChange={(e) => handleFieldChange('priority', e.target.value)}
              onBlur={() => handleFieldBlur('priority')}
              disabled={!fieldEnabled.priority}
              placeholder="1-5"
              error={touched.has('priority') ? validationErrors.priority : undefined}
              hint="Priority from 1 (highest) to 5 (lowest)"
            />
          </div>

          {/* Assigned To Field */}
          <div className="field-group">
            <div className="field-header">
              <Checkbox
                checked={fieldEnabled.assigned_to}
                onChange={(e) => handleFieldEnabledChange('assigned_to', e.target.checked)}
                label="Update Assigned To"
              />
            </div>
            <Input
              type="text"
              value={formData.assigned_to}
              onChange={(e) => handleFieldChange('assigned_to', e.target.value)}
              onBlur={() => handleFieldBlur('assigned_to')}
              disabled={!fieldEnabled.assigned_to}
              placeholder="User ID or email"
              error={touched.has('assigned_to') ? validationErrors.assigned_to : undefined}
            />
          </div>
        </div>

        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isUpdating || !hasEnabledFields}
          >
            {isUpdating ? (
              <>
                <Spinner size="sm" />
                <span>Updating...</span>
              </>
            ) : (
              `Update ${selectedIds.length} Item${selectedIds.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      </form>

      <style>{`
        .bulk-edit-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .bulk-edit-info {
          padding: 1rem;
          background: #f3f4f6;
          border-radius: 6px;
        }

        .bulk-edit-info p {
          margin: 0;
          font-size: 0.875rem;
          color: #374151;
        }

        .bulk-edit-info p:not(:last-child) {
          margin-bottom: 0.5rem;
        }

        .info-text {
          color: #6b7280 !important;
        }

        .error-message {
          padding: 0.75rem 1rem;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #b91c1c;
          font-size: 0.875rem;
        }

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field-header {
          display: flex;
          align-items: center;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 0.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .form-actions button {
          min-width: 100px;
        }

        .form-actions button[type="submit"] {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
        }

        @media (max-width: 640px) {
          .form-actions {
            flex-direction: column-reverse;
          }

          .form-actions button {
            width: 100%;
          }
        }
      `}</style>
    </Modal>
  );
}

export default BulkEditModal;

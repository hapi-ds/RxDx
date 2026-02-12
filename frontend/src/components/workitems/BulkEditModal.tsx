/**
 * BulkEditModal component
 * Modal for editing multiple work items simultaneously
 * 
 * Keyboard Navigation:
 * - Tab: Navigate through form fields
 * - Escape: Cancel and close modal
 * - Enter: Submit form (when focused on submit button)
 * - Space: Toggle checkboxes
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
  const [announcement, setAnnouncement] = useState<string>('');

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
    setAnnouncement(`Bulk edit modal opened. Editing ${selectedIds.length} work items.`);
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
    
    // Announce field enable/disable
    const fieldNames: Record<keyof FieldEnabled, string> = {
      status: 'Status',
      priority: 'Priority',
      assigned_to: 'Assigned To',
    };
    setAnnouncement(`${fieldNames[field]} field ${enabled ? 'enabled' : 'disabled'}.`);
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
      setAnnouncement('Form validation failed. Please check the fields and try again.');
      return;
    }

    try {
      setAnnouncement(`Updating ${selectedIds.length} work items...`);
      
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
      setAnnouncement(`Successfully updated ${selectedIds.length} work items.`);
      onSuccess();
    } catch {
      setAnnouncement('Bulk update failed. Please try again.');
      // Error is handled by parent component
    }
  }, [formData, fieldEnabled, validateForm, onBulkUpdate, onSuccess, selectedIds.length]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }, [onCancel]);

  const hasEnabledFields = fieldEnabled.status || fieldEnabled.priority || fieldEnabled.assigned_to;

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title="Bulk Edit Work Items"
      size="md"
    >
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="bulk-edit-form">
        {/* Screen reader announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>

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
          <div className="field-group" role="group" aria-labelledby="status-field-label">
            <div className="field-header">
              <Checkbox
                checked={fieldEnabled.status}
                onChange={(e) => handleFieldEnabledChange('status', e.target.checked)}
                label="Update Status"
                id="status-field-label"
              />
            </div>
            <Select
              options={statusOptions}
              value={formData.status}
              onChange={(e) => handleFieldChange('status', e.target.value)}
              onBlur={() => handleFieldBlur('status')}
              disabled={!fieldEnabled.status}
              error={touched.has('status') ? validationErrors.status : undefined}
              aria-label="Work item status"
              aria-describedby={fieldEnabled.status ? 'status-hint' : undefined}
            />
            {fieldEnabled.status && (
              <span id="status-hint" className="sr-only">
                Select the new status for all selected work items
              </span>
            )}
          </div>

          {/* Priority Field */}
          <div className="field-group" role="group" aria-labelledby="priority-field-label">
            <div className="field-header">
              <Checkbox
                checked={fieldEnabled.priority}
                onChange={(e) => handleFieldEnabledChange('priority', e.target.checked)}
                label="Update Priority"
                id="priority-field-label"
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
              aria-label="Work item priority"
              aria-describedby="priority-hint"
            />
            <span id="priority-hint" className="sr-only">
              Enter a priority value between 1 and 5, where 1 is highest priority
            </span>
          </div>

          {/* Assigned To Field */}
          <div className="field-group" role="group" aria-labelledby="assigned-to-field-label">
            <div className="field-header">
              <Checkbox
                checked={fieldEnabled.assigned_to}
                onChange={(e) => handleFieldEnabledChange('assigned_to', e.target.checked)}
                label="Update Assigned To"
                id="assigned-to-field-label"
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
              aria-label="Assigned to user"
              aria-describedby="assigned-to-hint"
            />
            <span id="assigned-to-hint" className="sr-only">
              Enter the user ID or email address to assign the work items to
            </span>
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
          max-height: 70vh;
          overflow-y: auto;
        }

        /* Screen reader only content */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
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
          margin-top: auto;
        }

        .form-actions button {
          min-width: 100px;
          min-height: 40px;
        }

        .form-actions button[type="submit"] {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
        }

        /* Mobile responsive styles (< 768px) */
        @media (max-width: 767px) {
          .bulk-edit-form {
            gap: 1.25rem;
            max-height: 80vh;
          }

          .bulk-edit-info {
            padding: 0.875rem;
          }

          .bulk-edit-info p {
            font-size: 1rem;
          }

          .error-message {
            padding: 0.875rem 1rem;
            font-size: 1rem;
          }

          .form-fields {
            gap: 1.5rem;
          }

          .field-group {
            gap: 0.75rem;
          }

          .field-header label {
            font-size: 1rem;
          }

          .form-actions {
            flex-direction: column-reverse;
            gap: 0.75rem;
            padding-top: 1rem;
          }

          .form-actions button {
            width: 100%;
            min-height: 44px;
            font-size: 1rem;
            padding: 0.75rem 1rem;
          }
        }

        /* Tablet responsive styles (768px - 1024px) */
        @media (min-width: 768px) and (max-width: 1024px) {
          .bulk-edit-form {
            max-height: 75vh;
          }

          .form-actions button {
            min-width: 120px;
            min-height: 42px;
          }
        }

        /* Touch-friendly enhancements */
        @media (hover: none) and (pointer: coarse) {
          .form-actions button {
            min-height: 44px;
            padding: 0.75rem 1rem;
          }

          .field-header label {
            min-height: 44px;
            display: flex;
            align-items: center;
          }
        }

        /* Ensure scrollable content on small screens */
        @media (max-height: 600px) {
          .bulk-edit-form {
            max-height: 60vh;
          }
        }
      `}</style>
    </Modal>
  );
}

export default BulkEditModal;

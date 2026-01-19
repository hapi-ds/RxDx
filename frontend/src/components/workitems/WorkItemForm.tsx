/**
 * WorkItemForm component
 * Form for creating and editing work items
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useWorkItemStore } from '../../stores/workitemStore';
import { Input, Select, Textarea, Button, ErrorMessage } from '../common';
import type {
  WorkItem,
  WorkItemCreate,
  WorkItemUpdate,
  WorkItemType,
  WorkItemStatus,
} from '../../services/workitemService';

export interface WorkItemFormProps {
  item?: WorkItem;
  onSuccess?: (item: WorkItem) => void;
  onCancel?: () => void;
  defaultType?: WorkItemType;
}

interface FormData {
  type: WorkItemType;
  title: string;
  description: string;
  status: WorkItemStatus;
  priority: string;
  assigned_to: string;
}

interface FormErrors {
  type?: string;
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
}

const typeOptions = [
  { value: 'requirement', label: 'Requirement' },
  { value: 'task', label: 'Task' },
  { value: 'test', label: 'Test' },
  { value: 'risk', label: 'Risk' },
  { value: 'document', label: 'Document' },
];

const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const priorityOptions = [
  { value: '', label: 'No Priority' },
  { value: '1', label: 'P1 - Critical' },
  { value: '2', label: 'P2 - High' },
  { value: '3', label: 'P3 - Medium' },
  { value: '4', label: 'P4 - Low' },
  { value: '5', label: 'P5 - Minimal' },
];

const initialFormData: FormData = {
  type: 'requirement',
  title: '',
  description: '',
  status: 'draft',
  priority: '',
  assigned_to: '',
};

export function WorkItemForm({
  item,
  onSuccess,
  onCancel,
  defaultType,
}: WorkItemFormProps): React.ReactElement {
  const { createItem, updateItem, isSaving, error, clearError } = useWorkItemStore();
  
  const isEditing = !!item;

  const [formData, setFormData] = useState<FormData>(() => {
    if (item) {
      return {
        type: item.type,
        title: item.title,
        description: item.description || '',
        status: item.status,
        priority: item.priority?.toString() || '',
        assigned_to: item.assigned_to || '',
      };
    }
    return {
      ...initialFormData,
      type: defaultType || 'requirement',
    };
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const validateField = useCallback((name: keyof FormData, value: string): string | undefined => {
    switch (name) {
      case 'title':
        if (!value.trim()) {
          return 'Title is required';
        }
        if (value.length > 500) {
          return 'Title must be 500 characters or less';
        }
        break;
      case 'priority':
        if (value && (parseInt(value) < 1 || parseInt(value) > 5)) {
          return 'Priority must be between 1 and 5';
        }
        break;
    }
    return undefined;
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    
    const titleError = validateField('title', formData.title);
    if (titleError) newErrors.title = titleError;
    
    const priorityError = validateField('priority', formData.priority);
    if (priorityError) newErrors.priority = priorityError;
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, validateField]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      
      // Clear field error when user starts typing
      if (errors[name as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [name]: undefined }));
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setTouched((prev) => new Set(prev).add(name));
      
      const fieldError = validateField(name as keyof FormData, value);
      if (fieldError) {
        setErrors((prev) => ({ ...prev, [name]: fieldError }));
      }
    },
    [validateField]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      let result: WorkItem;
      
      if (isEditing && item) {
        const updateData: WorkItemUpdate = {
          title: formData.title,
          description: formData.description || undefined,
          status: formData.status,
          priority: formData.priority ? parseInt(formData.priority) : undefined,
          assigned_to: formData.assigned_to || undefined,
        };
        result = await updateItem(item.id, updateData);
      } else {
        const createData: WorkItemCreate = {
          type: formData.type,
          title: formData.title,
          description: formData.description || undefined,
          status: formData.status,
          priority: formData.priority ? parseInt(formData.priority) : undefined,
          assigned_to: formData.assigned_to || undefined,
        };
        result = await createItem(createData);
      }
      
      onSuccess?.(result);
    } catch {
      // Error is handled by the store
    }
  };

  const handleCancel = () => {
    clearError();
    onCancel?.();
  };

  return (
    <form className="workitem-form" onSubmit={handleSubmit}>
      {error && (
        <ErrorMessage
          message={error}
          onDismiss={clearError}
          variant="banner"
        />
      )}

      <div className="form-grid">
        {!isEditing && (
          <Select
            name="type"
            label="Type"
            options={typeOptions}
            value={formData.type}
            onChange={handleChange}
            required
          />
        )}

        <Input
          name="title"
          label="Title"
          value={formData.title}
          onChange={handleChange}
          onBlur={handleBlur}
          error={touched.has('title') ? errors.title : undefined}
          placeholder="Enter work item title"
          required
          maxLength={500}
        />

        <Textarea
          name="description"
          label="Description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Enter detailed description"
          rows={4}
        />

        <div className="form-row">
          <Select
            name="status"
            label="Status"
            options={statusOptions}
            value={formData.status}
            onChange={handleChange}
          />

          <Select
            name="priority"
            label="Priority"
            options={priorityOptions}
            value={formData.priority}
            onChange={handleChange}
            error={touched.has('priority') ? errors.priority : undefined}
          />
        </div>

        <Input
          name="assigned_to"
          label="Assigned To"
          value={formData.assigned_to}
          onChange={handleChange}
          placeholder="User ID or email"
          hint="Enter the user ID to assign this work item"
        />
      </div>

      <div className="form-actions">
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isSaving}
          disabled={isSaving}
        >
          {isEditing ? 'Update Work Item' : 'Create Work Item'}
        </Button>
      </div>

      <style>{`
        .workitem-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 640px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>
    </form>
  );
}

export default WorkItemForm;

/**
 * NodeEditor Component
 * Displays and allows editing of node properties when a node is selected in the graph view
 * Integrates with graphStore for selection state and workitemService for saving changes
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useGraphStore } from '../../stores/graphStore';
import type { WorkItemUpdate, WorkItemStatus } from '../../services/workitemService';

// Node styling constants (matching GraphView2D)
const NODE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  requirement: { bg: '#e3f2fd', border: '#1976d2', text: '#0d47a1' },
  task: { bg: '#e8f5e9', border: '#388e3c', text: '#1b5e20' },
  test: { bg: '#fff3e0', border: '#f57c00', text: '#e65100' },
  risk: { bg: '#ffebee', border: '#d32f2f', text: '#b71c1c' },
  document: { bg: '#f3e5f5', border: '#7b1fa2', text: '#4a148c' },
  default: { bg: '#fafafa', border: '#9e9e9e', text: '#424242' },
};

const NODE_TYPE_LABELS: Record<string, string> = {
  requirement: 'Requirement',
  task: 'Task',
  test: 'Test',
  risk: 'Risk',
  document: 'Document',
};

const STATUS_OPTIONS: WorkItemStatus[] = ['draft', 'active', 'completed', 'archived'];
const PRIORITY_OPTIONS = [1, 2, 3, 4, 5];

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '320px',
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 1000,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0,
    fontSize: '14px',
    fontWeight: 600,
  },
  typeBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    fontSize: '18px',
    color: '#757575',
    lineHeight: 1,
    borderRadius: '4px',
  },
  content: {
    padding: '16px',
    maxHeight: '400px',
    overflowY: 'auto' as const,
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '4px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#616161',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    resize: 'vertical' as const,
    minHeight: '80px',
    fontFamily: 'inherit',
  },
  select: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    backgroundColor: '#ffffff',
    cursor: 'pointer',
  },
  readOnlyField: {
    padding: '8px 12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '14px',
    color: '#616161',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '12px 16px',
    borderTop: '1px solid #e0e0e0',
    backgroundColor: '#fafafa',
  },
  button: {
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    color: '#616161',
  },
  saveButton: {
    backgroundColor: '#1976d2',
    border: 'none',
    color: '#ffffff',
  },
  saveButtonDisabled: {
    backgroundColor: '#bdbdbd',
    cursor: 'not-allowed',
  },
  errorMessage: {
    padding: '8px 12px',
    backgroundColor: '#ffebee',
    color: '#c62828',
    borderRadius: '4px',
    fontSize: '13px',
    marginBottom: '16px',
  },
  loadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
  },
};

export interface NodeEditorProps {
  /** Optional CSS class name */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
  /** Callback when the editor is closed */
  onClose?: () => void;
  /** Callback when changes are saved successfully */
  onSave?: (nodeId: string) => void;
}

interface EditableFields {
  title: string;
  description: string;
  status: WorkItemStatus;
  priority: number | undefined;
}

/**
 * NodeEditor - Component for viewing and editing selected node properties
 * Appears when a node is selected in the graph view
 */
export const NodeEditor: React.FC<NodeEditorProps> = ({
  className,
  style,
  onClose,
  onSave,
}) => {
  const { selectedNode, selectNode, updateNode, isUpdating, error, clearError } = useGraphStore();
  const storeError: string | null = error;

  // Local form state
  const [formData, setFormData] = useState<EditableFields>({
    title: '',
    description: '',
    status: 'draft',
    priority: undefined,
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Initialize form data when selected node changes
  useEffect(() => {
    if (selectedNode) {
      const properties = selectedNode.data.properties || {};
      setFormData({
        title: selectedNode.data.label || '',
        description: (properties.description as string) || '',
        status: (properties.status as WorkItemStatus) || 'draft',
        priority: properties.priority as number | undefined,
      });
      setHasChanges(false);
      setLocalError(null);
      clearError();
    }
  }, [selectedNode, clearError]);

  // Handle input changes
  const handleChange = useCallback(
    (field: keyof EditableFields, value: string | number | undefined) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setHasChanges(true);
      setLocalError(null);
    },
    []
  );

  // Handle close
  const handleClose = useCallback(() => {
    selectNode(null);
    onClose?.();
  }, [selectNode, onClose]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!selectedNode || !hasChanges) return;

    setLocalError(null);

    // Validate required fields
    if (!formData.title.trim()) {
      setLocalError('Title is required');
      return;
    }

    try {
      const updateData: WorkItemUpdate = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        priority: formData.priority,
      };

      await updateNode(selectedNode.id, updateData);
      setHasChanges(false);
      onSave?.(selectedNode.id);
    } catch (err) {
      // Error is already set in the store
      setLocalError(err instanceof Error ? err.message : 'Failed to save changes');
    }
  }, [selectedNode, hasChanges, formData, updateNode, onSave]);

  // Handle cancel (reset form)
  const handleCancel = useCallback(() => {
    if (selectedNode) {
      const properties = selectedNode.data.properties || {};
      setFormData({
        title: selectedNode.data.label || '',
        description: (properties.description as string) || '',
        status: (properties.status as WorkItemStatus) || 'draft',
        priority: properties.priority as number | undefined,
      });
      setHasChanges(false);
      setLocalError(null);
    }
  }, [selectedNode]);

  // Don't render if no node is selected
  if (!selectedNode) {
    return null;
  }

  const nodeType = selectedNode.data.type || selectedNode.type || 'default';
  const colors = NODE_COLORS[nodeType] || NODE_COLORS.default;
  const typeLabel = NODE_TYPE_LABELS[nodeType] || nodeType;
  const properties = selectedNode.data.properties || {};
  const displayError: string | null = localError || storeError;

  return (
    <div
      className={className}
      style={{ ...styles.container, ...style }}
      data-testid="node-editor"
    >
      {/* Loading overlay */}
      {isUpdating && (
        <div style={styles.loadingOverlay}>
          <span>Saving...</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.headerTitle}>
          <span
            style={{
              ...styles.typeBadge,
              backgroundColor: colors.bg,
              color: colors.text,
              border: `1px solid ${colors.border}`,
            }}
          >
            {typeLabel}
          </span>
          Edit Node
        </h3>
        <button
          style={styles.closeButton}
          onClick={handleClose}
          title="Close"
          aria-label="Close editor"
          data-testid="node-editor-close"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div style={styles.content}>
        {/* Error message */}
        {displayError !== null && displayError !== '' ? (
          <div style={styles.errorMessage} role="alert">
            {displayError}
          </div>
        ) : null}

        {/* Node ID (read-only) */}
        <div style={styles.field}>
          <label style={styles.label}>ID</label>
          <div style={styles.readOnlyField}>{selectedNode.id}</div>
        </div>

        {/* Version (read-only) */}
        {typeof properties.version === 'string' && properties.version && (
          <div style={styles.field}>
            <label style={styles.label}>Version</label>
            <div style={styles.readOnlyField}>{properties.version}</div>
          </div>
        )}

        {/* Title (editable) */}
        <div style={styles.field}>
          <label style={styles.label} htmlFor="node-title">
            Title *
          </label>
          <input
            id="node-title"
            type="text"
            style={styles.input}
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Enter title"
            data-testid="node-editor-title"
          />
        </div>

        {/* Description (editable) */}
        <div style={styles.field}>
          <label style={styles.label} htmlFor="node-description">
            Description
          </label>
          <textarea
            id="node-description"
            style={styles.textarea}
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Enter description"
            data-testid="node-editor-description"
          />
        </div>

        {/* Status (editable) */}
        <div style={styles.field}>
          <label style={styles.label} htmlFor="node-status">
            Status
          </label>
          <select
            id="node-status"
            style={styles.select}
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as WorkItemStatus)}
            data-testid="node-editor-status"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* Priority (editable) */}
        <div style={styles.field}>
          <label style={styles.label} htmlFor="node-priority">
            Priority
          </label>
          <select
            id="node-priority"
            style={styles.select}
            value={formData.priority ?? ''}
            onChange={(e) =>
              handleChange('priority', e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            data-testid="node-editor-priority"
          >
            <option value="">None</option>
            {PRIORITY_OPTIONS.map((priority) => (
              <option key={priority} value={priority}>
                {priority} - {priority === 1 ? 'Highest' : priority === 5 ? 'Lowest' : `Priority ${priority}`}
              </option>
            ))}
          </select>
        </div>

        {/* Signed status (read-only) */}
        {properties.is_signed !== undefined && (
          <div style={styles.field}>
            <label style={styles.label}>Signed</label>
            <div style={styles.readOnlyField}>
              {properties.is_signed ? '✓ Yes' : '✗ No'}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <button
          style={{ ...styles.button, ...styles.cancelButton }}
          onClick={hasChanges ? handleCancel : handleClose}
          disabled={isUpdating}
          data-testid="node-editor-cancel"
        >
          {hasChanges ? 'Reset' : 'Close'}
        </button>
        <button
          style={{
            ...styles.button,
            ...styles.saveButton,
            ...((!hasChanges || isUpdating) ? styles.saveButtonDisabled : {}),
          }}
          onClick={handleSave}
          disabled={!hasChanges || isUpdating}
          data-testid="node-editor-save"
        >
          {isUpdating ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default NodeEditor;

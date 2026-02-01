/**
 * RelationshipTypeDialog Component
 * Modal dialog for selecting relationship type when creating a connection between nodes
 * Appears when a user drags from one node handle to another in the graph view
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Available relationship types in the system
 * Based on the design document's graph schema
 */
export const RELATIONSHIP_TYPES = [
  { value: 'RELATES_TO', label: 'Relates To', description: 'General relationship between items' },
  { value: 'IMPLEMENTS', label: 'Implements', description: 'Task implements a requirement' },
  { value: 'TESTED_BY', label: 'Tested By', description: 'Requirement is tested by a test' },
  { value: 'MITIGATES', label: 'Mitigates', description: 'Requirement mitigates a risk' },
  { value: 'DEPENDS_ON', label: 'Depends On', description: 'Item depends on another item' },
  { value: 'LEADS_TO', label: 'Leads To', description: 'Risk leads to a failure (FMEA)' },
] as const;

export type RelationshipType = typeof RELATIONSHIP_TYPES[number]['value'];

export interface PendingConnection {
  sourceId: string;
  targetId: string;
  sourceLabel?: string;
  targetLabel?: string;
}

export interface RelationshipTypeDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** The pending connection details */
  connection: PendingConnection | null;
  /** Callback when a relationship type is selected and confirmed */
  onConfirm: (sourceId: string, targetId: string, type: RelationshipType) => void;
  /** Callback when the dialog is cancelled */
  onCancel: () => void;
  /** Whether the relationship is being created (loading state) */
  isLoading?: boolean;
  /** Optional CSS class name */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    width: '400px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'hidden',
    animation: 'fadeIn 0.2s ease-out',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#fafafa',
  },
  headerTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#212121',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    fontSize: '20px',
    color: '#757575',
    lineHeight: 1,
    borderRadius: '4px',
    transition: 'background-color 0.2s',
  },
  content: {
    padding: '20px',
  },
  connectionInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '20px',
    padding: '12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
  },
  nodeLabel: {
    padding: '6px 12px',
    backgroundColor: '#e3f2fd',
    border: '1px solid #1976d2',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#0d47a1',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  arrow: {
    fontSize: '18px',
    color: '#757575',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#424242',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: '4px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    backgroundColor: '#ffffff',
    cursor: 'pointer',
    transition: 'border-color 0.2s',
  },
  selectFocused: {
    borderColor: '#1976d2',
    outline: 'none',
  },
  description: {
    marginTop: '8px',
    padding: '10px 12px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '13px',
    color: '#616161',
    lineHeight: 1.4,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #e0e0e0',
    backgroundColor: '#fafafa',
  },
  button: {
    padding: '10px 20px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s, opacity 0.2s',
    minWidth: '80px',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    border: '1px solid #e0e0e0',
    color: '#616161',
  },
  confirmButton: {
    backgroundColor: '#1976d2',
    border: 'none',
    color: '#ffffff',
  },
  confirmButtonDisabled: {
    backgroundColor: '#bdbdbd',
    cursor: 'not-allowed',
  },
  loadingSpinner: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    border: '2px solid #ffffff',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    marginRight: '8px',
    verticalAlign: 'middle',
  },
};

// Add keyframes for animations
const styleSheet = typeof document !== 'undefined' ? document.createElement('style') : null;
if (styleSheet) {
  styleSheet.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.head.querySelector('[data-relationship-dialog-styles]')) {
    styleSheet.setAttribute('data-relationship-dialog-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}

/**
 * RelationshipTypeDialog - Modal for selecting relationship type when creating connections
 */
export const RelationshipTypeDialog: React.FC<RelationshipTypeDialogProps> = ({
  isOpen,
  connection,
  onConfirm,
  onCancel,
  isLoading = false,
  className,
  style,
}) => {
  const [selectedType, setSelectedType] = useState<RelationshipType>('RELATES_TO');
  const selectRef = useRef<HTMLSelectElement>(null);

  // Reset selection when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Use a callback to avoid setState in effect
      Promise.resolve().then(() => {
        setSelectedType('RELATES_TO');
      });
      // Focus the select element when dialog opens
      setTimeout(() => {
        selectRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Handle keyboard events
  const handleConfirm = useCallback(() => {
    if (connection && !isLoading) {
      onConfirm(connection.sourceId, connection.targetId, selectedType);
    }
  }, [connection, selectedType, onConfirm, isLoading]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      } else if (e.key === 'Enter' && !isLoading) {
        handleConfirm();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel, handleConfirm]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isLoading) {
        onCancel();
      }
    },
    [onCancel, isLoading]
  );

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value as RelationshipType);
  }, []);

  // Get description for selected type
  const selectedTypeInfo = RELATIONSHIP_TYPES.find((t) => t.value === selectedType);

  if (!isOpen || !connection) {
    return null;
  }

  return (
    <div
      style={styles.overlay}
      onClick={handleOverlayClick}
      data-testid="relationship-dialog-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="relationship-dialog-title"
    >
      <div
        className={className}
        style={{ ...styles.dialog, ...style }}
        data-testid="relationship-dialog"
      >
        {/* Header */}
        <div style={styles.header}>
          <h2 id="relationship-dialog-title" style={styles.headerTitle}>
            Create Relationship
          </h2>
          <button
            style={styles.closeButton}
            onClick={onCancel}
            disabled={isLoading}
            title="Cancel"
            aria-label="Cancel"
            data-testid="relationship-dialog-close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Connection visualization */}
          <div style={styles.connectionInfo}>
            <span style={styles.nodeLabel} title={connection.sourceLabel || connection.sourceId}>
              {connection.sourceLabel || connection.sourceId}
            </span>
            <span style={styles.arrow}>→</span>
            <span style={styles.nodeLabel} title={connection.targetLabel || connection.targetId}>
              {connection.targetLabel || connection.targetId}
            </span>
          </div>

          {/* Relationship type selector */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="relationship-type">
              Relationship Type
            </label>
            <select
              ref={selectRef}
              id="relationship-type"
              style={styles.select}
              value={selectedType}
              onChange={handleTypeChange}
              disabled={isLoading}
              data-testid="relationship-type-select"
            >
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description of selected type */}
          {selectedTypeInfo && (
            <div style={styles.description} data-testid="relationship-type-description">
              {selectedTypeInfo.description}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            style={{ ...styles.button, ...styles.cancelButton }}
            onClick={onCancel}
            disabled={isLoading}
            data-testid="relationship-dialog-cancel"
          >
            Cancel
          </button>
          <button
            style={{
              ...styles.button,
              ...styles.confirmButton,
              ...(isLoading ? styles.confirmButtonDisabled : {}),
            }}
            onClick={handleConfirm}
            disabled={isLoading}
            data-testid="relationship-dialog-confirm"
          >
            {isLoading && <span style={styles.loadingSpinner} />}
            {isLoading ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RelationshipTypeDialog;

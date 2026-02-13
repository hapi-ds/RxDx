/**
 * RelationshipEditor Component
 * Panel for viewing and editing graph relationship properties
 * Allows changing relationship type and deleting relationships
 * 
 * Features:
 * - Display relationship details (source, target, type)
 * - Dropdown to change relationship type
 * - Delete button with confirmation dialog
 * - Property editor for relationship metadata
 * - Validation of relationship types
 * 
 * References: Requirements 6.1, 6.2, 6.3, 6.5
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { GraphEdge } from '../../services/graphService';
import { useGraphStore } from '../../stores/graphStore';

// Available relationship types (from design document)
const RELATIONSHIP_TYPES = [
  // Work Item Relationships
  { value: 'TESTED_BY', label: 'Tested By', description: 'Requirement → Test' },
  { value: 'MITIGATES', label: 'Mitigates', description: 'Requirement → Risk' },
  { value: 'DEPENDS_ON', label: 'Depends On', description: 'WorkItem → WorkItem' },
  { value: 'IMPLEMENTS', label: 'Implements', description: 'Task → Requirement' },
  { value: 'REFERENCES', label: 'References', description: 'WorkItem → WorkItem' },
  // Project Structure Relationships
  { value: 'BELONGS_TO', label: 'Belongs To', description: 'Phase → Project, Workpackage → Phase' },
  { value: 'PARENT_OF', label: 'Parent Of', description: 'Company → Department' },
  { value: 'LINKED_TO_DEPARTMENT', label: 'Linked To Department', description: 'Workpackage → Department' },
  // Resource Relationships
  { value: 'ALLOCATED_TO', label: 'Allocated To', description: 'Resource → Project/Task' },
  { value: 'ASSIGNED_TO', label: 'Assigned To', description: 'WorkItem → User' },
  { value: 'CREATED_BY', label: 'Created By', description: 'WorkItem → User' },
  // Sprint/Backlog Relationships
  { value: 'IN_BACKLOG', label: 'In Backlog', description: 'Task → Backlog' },
  { value: 'ASSIGNED_TO_SPRINT', label: 'Assigned To Sprint', description: 'Task → Sprint' },
  { value: 'BLOCKS', label: 'Blocks', description: 'Task → Milestone' },
  // Risk Relationships
  { value: 'LEADS_TO', label: 'Leads To', description: 'Risk → Failure' },
  { value: 'has_risk', label: 'Has Risk', description: 'Task → Risk' },
  // Other Relationships
  { value: 'RELATES_TO', label: 'Relates To', description: 'Entity → Entity' },
  { value: 'MENTIONED_IN', label: 'Mentioned In', description: 'Entity → WorkItem' },
  { value: 'NEXT_VERSION', label: 'Next Version', description: 'WorkItem → WorkItem' },
  { value: 'implements', label: 'implements', description: 'Generic implementation' },
];

export interface RelationshipEditorProps {
  /** Selected edge/relationship */
  relationship: GraphEdge | null;
  /** Callback when relationship is updated */
  onUpdate: (relationshipId: string, type: string) => Promise<void>;
  /** Callback when relationship is deleted */
  onDelete: (relationshipId: string) => Promise<void>;
  /** Callback to close editor */
  onClose: () => void;
}

/**
 * RelationshipEditor - Component for editing graph relationships
 * Displays relationship details and provides controls for updating type and deleting
 */
export const RelationshipEditor: React.FC<RelationshipEditorProps> = ({
  relationship,
  onUpdate,
  onDelete,
  onClose,
}) => {
  const { nodes, isUpdating } = useGraphStore();
  
  // Local state for form
  const [selectedType, setSelectedType] = useState<string>('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when relationship changes
  useEffect(() => {
    console.log('[RelationshipEditor] Relationship changed:', relationship);
    if (relationship) {
      setSelectedType(relationship.type);
      setHasChanges(false);
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [relationship]);

  // Get source and target node labels
  const sourceNode = nodes.find((n) => n.id === relationship?.source);
  const targetNode = nodes.find((n) => n.id === relationship?.target);

  // Handle type change
  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setSelectedType(newType);
    setHasChanges(newType !== relationship?.type);
    setError(null);
  }, [relationship]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!relationship || !hasChanges) return;

    if (!selectedType) {
      setError('Please select a relationship type');
      return;
    }

    try {
      setError(null);
      // Use age_id if available, otherwise fall back to composite ID
      const relationshipId = relationship.age_id?.toString() || relationship.id;
      console.log('[RelationshipEditor] Calling onUpdate with:', { relationshipId, selectedType, relationship });
      await onUpdate(relationshipId, selectedType);
      console.log('[RelationshipEditor] onUpdate completed');
      setHasChanges(false);
    } catch (err) {
      console.error('[RelationshipEditor] onUpdate failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to update relationship');
    }
  }, [relationship, selectedType, hasChanges, onUpdate]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!relationship) return;

    try {
      setError(null);
      // Use age_id if available, otherwise fall back to composite ID
      const relationshipId = relationship.age_id?.toString() || relationship.id;
      await onDelete(relationshipId);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete relationship');
      setShowDeleteConfirm(false);
    }
  }, [relationship, onDelete, onClose]);

  // Handle cancel delete
  const handleCancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
  }, []);

  // Handle close
  const handleClose = useCallback(() => {
    if (hasChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to close?');
      if (!confirmed) return;
    }
    onClose();
  }, [hasChanges, onClose]);

  if (!relationship) {
    console.log('[RelationshipEditor] Relationship is null, not rendering');
    return null;
  }

  // Prevent clicks from propagating to the graph pane
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div 
      className="relationship-editor" 
      style={styles.container}
      onClick={handleContainerClick}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={styles.header}>
        <h3 style={styles.title}>Relationship Details</h3>
        <button
          onClick={handleClose}
          style={styles.closeButton}
          aria-label="Close relationship editor"
        >
          ×
        </button>
      </div>

      {/* Scrollable Content */}
      <div style={styles.content}>

      {/* Error message */}
      {error && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}

      {/* Relationship info */}
      <div style={styles.section}>
        <div style={styles.infoRow}>
          <span style={styles.label}>Source:</span>
          <span style={styles.value}>{sourceNode?.data?.label || relationship.source}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.label}>Target:</span>
          <span style={styles.value}>{targetNode?.data?.label || relationship.target}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.label}>ID:</span>
          <span style={styles.value} title={relationship.id}>
            {relationship.id.substring(0, 8)}...
          </span>
        </div>
      </div>

      {/* Type selector */}
      <div style={styles.section}>
        <label htmlFor="relationship-type" style={styles.label}>
          Relationship Type:
        </label>
        <select
          id="relationship-type"
          value={selectedType}
          onChange={handleTypeChange}
          style={styles.select}
          disabled={isUpdating}
        >
          <option value="">Select type...</option>
          {RELATIONSHIP_TYPES.map((type) => (
            <option key={type.value} value={type.value} title={type.description}>
              {type.label}
            </option>
          ))}
        </select>
        {selectedType && (
          <div style={styles.hint}>
            {RELATIONSHIP_TYPES.find((t) => t.value === selectedType)?.description}
          </div>
        )}
      </div>

      {/* Properties section */}
      {relationship.properties && Object.keys(relationship.properties).length > 0 && (
        <div style={styles.section}>
          <div style={styles.label}>Properties:</div>
          <div style={styles.properties}>
            {Object.entries(relationship.properties).map(([key, value]) => (
              <div key={key} style={styles.propertyRow}>
                <span style={styles.propertyKey}>{key}:</span>
                <span style={styles.propertyValue}>{JSON.stringify(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={styles.actions}>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isUpdating}
          style={{
            ...styles.button,
            ...styles.saveButton,
            ...((!hasChanges || isUpdating) && styles.buttonDisabled),
          }}
        >
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isUpdating}
          style={{
            ...styles.button,
            ...styles.deleteButton,
            ...(isUpdating && styles.buttonDisabled),
          }}
        >
          Delete Relationship
        </button>
      </div>

      </div> {/* End of scrollable content */}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <div style={styles.overlay}>
          <div style={styles.dialog}>
            <h4 style={styles.dialogTitle}>Confirm Delete</h4>
            <p style={styles.dialogMessage}>
              Are you sure you want to delete this relationship?
              <br />
              <strong>
                {sourceNode?.data?.label || relationship.source} → {targetNode?.data?.label || relationship.target}
              </strong>
              <br />
              This action cannot be undone.
            </p>
            <div style={styles.dialogActions}>
              <button
                onClick={handleCancelDelete}
                style={{ ...styles.button, ...styles.cancelButton }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{ ...styles.button, ...styles.confirmDeleteButton }}
                disabled={isUpdating}
              >
                {isUpdating ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: '80px',
    right: '20px',
    zIndex: 1000,
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '400px',
    width: '100%',
    pointerEvents: 'auto',
    overflow: 'hidden', // Container doesn't scroll
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e0e0e0',
  },
  content: {
    padding: '16px',
    maxHeight: '400px', // Fixed height like NodeEditor
    overflowY: 'auto' as const, // Content scrolls
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: '0',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: '8px 12px',
    borderRadius: '4px',
    marginBottom: '12px',
    fontSize: '14px',
  },
  section: {
    marginBottom: '16px',
  },
  infoRow: {
    display: 'flex',
    marginBottom: '8px',
    fontSize: '14px',
  },
  label: {
    fontWeight: 600,
    color: '#666',
    marginRight: '8px',
    minWidth: '80px',
    fontSize: '14px',
  },
  value: {
    color: '#333',
    flex: 1,
    wordBreak: 'break-word',
  },
  select: {
    width: '100%',
    padding: '8px',
    fontSize: '14px',
    border: '1px solid #ccc',
    borderRadius: '4px',
    marginTop: '4px',
  },
  hint: {
    fontSize: '12px',
    color: '#666',
    marginTop: '4px',
    fontStyle: 'italic',
  },
  properties: {
    backgroundColor: '#f5f5f5',
    padding: '8px',
    borderRadius: '4px',
    marginTop: '4px',
  },
  propertyRow: {
    display: 'flex',
    marginBottom: '4px',
    fontSize: '12px',
  },
  propertyKey: {
    fontWeight: 600,
    color: '#666',
    marginRight: '8px',
    minWidth: '100px',
  },
  propertyValue: {
    color: '#333',
    flex: 1,
    wordBreak: 'break-word',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '16px',
  },
  button: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    flex: 1,
    transition: 'background-color 0.2s',
  },
  saveButton: {
    backgroundColor: '#1976d2',
    color: '#fff',
  },
  deleteButton: {
    backgroundColor: '#d32f2f',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    color: '#333',
  },
  confirmDeleteButton: {
    backgroundColor: '#d32f2f',
    color: '#fff',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
  },
  dialogTitle: {
    margin: '0 0 16px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#333',
  },
  dialogMessage: {
    margin: '0 0 24px 0',
    fontSize: '14px',
    color: '#666',
    lineHeight: 1.5,
  },
  dialogActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
  },
};

export default RelationshipEditor;

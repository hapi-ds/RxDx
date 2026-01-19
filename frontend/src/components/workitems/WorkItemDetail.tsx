/**
 * WorkItemDetail component
 * Displays detailed information about a single work item
 */

import React, { useEffect } from 'react';
import { useWorkItemStore } from '../../stores/workitemStore';
import { Button, Spinner, ErrorMessage } from '../common';
import type { WorkItem, WorkItemStatus, WorkItemType } from '../../services/workitemService';

export interface WorkItemDetailProps {
  workItemId: string;
  onEdit?: (item: WorkItem) => void;
  onDelete?: (item: WorkItem) => void;
  onClose?: () => void;
  onViewHistory?: (item: WorkItem) => void;
  showActions?: boolean;
}

const getStatusColor = (status: WorkItemStatus): string => {
  const colors: Record<WorkItemStatus, string> = {
    draft: '#6b7280',
    active: '#2563eb',
    completed: '#059669',
    archived: '#d97706',
  };
  return colors[status] || '#6b7280';
};

const getTypeIcon = (type: WorkItemType): string => {
  const icons: Record<WorkItemType, string> = {
    requirement: '📋',
    task: '✅',
    test: '🧪',
    risk: '⚠️',
    document: '📄',
  };
  return icons[type] || '📋';
};

export function WorkItemDetail({
  workItemId,
  onEdit,
  onDelete,
  onClose,
  onViewHistory,
  showActions = true,
}: WorkItemDetailProps): React.ReactElement {
  const {
    selectedItem,
    isLoadingItem,
    error,
    fetchItem,
    clearError,
    clearSelection,
  } = useWorkItemStore();

  useEffect(() => {
    if (workItemId) {
      fetchItem(workItemId);
    }
    return () => {
      clearSelection();
    };
  }, [workItemId, fetchItem, clearSelection]);

  const handleEdit = () => {
    if (selectedItem && onEdit) {
      onEdit(selectedItem);
    }
  };

  const handleDelete = () => {
    if (selectedItem && onDelete) {
      onDelete(selectedItem);
    }
  };

  const handleViewHistory = () => {
    if (selectedItem && onViewHistory) {
      onViewHistory(selectedItem);
    }
  };

  if (isLoadingItem) {
    return (
      <div className="workitem-detail-loading">
        <Spinner size="lg" />
        <span>Loading work item...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workitem-detail-error">
        <ErrorMessage message={error} onDismiss={clearError} />
        <Button variant="secondary" onClick={() => fetchItem(workItemId)}>
          Retry
        </Button>
      </div>
    );
  }

  if (!selectedItem) {
    return (
      <div className="workitem-detail-empty">
        <span>Work item not found</span>
        {onClose && (
          <Button variant="secondary" onClick={onClose}>
            Go Back
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="workitem-detail">
      <div className="workitem-detail-header">
        <div className="workitem-detail-title-row">
          <span className="workitem-type-icon">{getTypeIcon(selectedItem.type)}</span>
          <h2 className="workitem-detail-title">{selectedItem.title}</h2>
          {selectedItem.is_signed && (
            <span className="signed-badge" title="This work item is signed">
              ✓ Signed
            </span>
          )}
        </div>
        
        <div className="workitem-detail-meta">
          <span
            className="status-badge"
            style={{ backgroundColor: getStatusColor(selectedItem.status) }}
          >
            {selectedItem.status}
          </span>
          <span className="version-badge">v{selectedItem.version}</span>
          <span className="type-label">{selectedItem.type}</span>
        </div>
      </div>

      <div className="workitem-detail-body">
        {selectedItem.description ? (
          <div className="workitem-section">
            <h3 className="section-title">Description</h3>
            <p className="workitem-description">{selectedItem.description}</p>
          </div>
        ) : (
          <div className="workitem-section">
            <p className="no-description">No description provided</p>
          </div>
        )}

        <div className="workitem-info-grid">
          <div className="info-item">
            <span className="info-label">Priority</span>
            <span className="info-value">
              {selectedItem.priority ? `P${selectedItem.priority}` : 'Not set'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Assigned To</span>
            <span className="info-value">
              {selectedItem.assigned_to || 'Unassigned'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Created</span>
            <span className="info-value">
              {new Date(selectedItem.created_at).toLocaleString()}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Last Updated</span>
            <span className="info-value">
              {new Date(selectedItem.updated_at).toLocaleString()}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Created By</span>
            <span className="info-value">{selectedItem.created_by}</span>
          </div>
          <div className="info-item">
            <span className="info-label">ID</span>
            <span className="info-value id-value">{selectedItem.id}</span>
          </div>
        </div>
      </div>

      {showActions && (
        <div className="workitem-detail-actions">
          {onViewHistory && (
            <Button variant="secondary" onClick={handleViewHistory}>
              View History
            </Button>
          )}
          {onEdit && !selectedItem.is_signed && (
            <Button variant="primary" onClick={handleEdit}>
              Edit
            </Button>
          )}
          {onDelete && !selectedItem.is_signed && (
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      )}

      <style>{`
        .workitem-detail {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .workitem-detail-loading,
        .workitem-detail-error,
        .workitem-detail-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          gap: 1rem;
          color: #6b7280;
        }

        .workitem-detail-header {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .workitem-detail-title-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .workitem-type-icon {
          font-size: 1.5rem;
        }

        .workitem-detail-title {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
          flex: 1;
        }

        .signed-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
          background: #d1fae5;
          color: #047857;
          border-radius: 9999px;
        }

        .workitem-detail-meta {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          font-size: 0.75rem;
          font-weight: 500;
          color: white;
          border-radius: 4px;
          text-transform: capitalize;
        }

        .version-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          font-size: 0.75rem;
          font-weight: 500;
          background: #f3f4f6;
          color: #374151;
          border-radius: 4px;
        }

        .type-label {
          font-size: 0.875rem;
          color: #6b7280;
          text-transform: capitalize;
        }

        .workitem-detail-body {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .workitem-section {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .section-title {
          margin: 0;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .workitem-description {
          margin: 0;
          font-size: 0.9375rem;
          line-height: 1.6;
          color: #4b5563;
          white-space: pre-wrap;
        }

        .no-description {
          margin: 0;
          font-size: 0.875rem;
          color: #9ca3af;
          font-style: italic;
        }

        .workitem-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 8px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-value {
          font-size: 0.875rem;
          color: #111827;
        }

        .id-value {
          font-family: monospace;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .workitem-detail-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }
      `}</style>
    </div>
  );
}

export default WorkItemDetail;

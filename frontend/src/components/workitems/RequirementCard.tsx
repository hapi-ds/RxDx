/**
 * RequirementCard component
 * Compact card view for displaying a requirement summary
 */

import React from 'react';
import type { WorkItem, WorkItemStatus } from '../../services/workitemService';

export interface RequirementCardProps {
  requirement: WorkItem;
  onClick?: (requirement: WorkItem) => void;
  onEdit?: (requirement: WorkItem) => void;
  onSign?: (requirement: WorkItem) => void;
  isSelected?: boolean;
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

const getPriorityLabel = (priority?: number): string => {
  if (!priority) return '';
  const labels: Record<number, string> = {
    1: 'Critical',
    2: 'High',
    3: 'Medium',
    4: 'Low',
    5: 'Minimal',
  };
  return labels[priority] || '';
};

const getPriorityColor = (priority?: number): string => {
  if (!priority) return '#9ca3af';
  const colors: Record<number, string> = {
    1: '#dc2626',
    2: '#ea580c',
    3: '#ca8a04',
    4: '#2563eb',
    5: '#6b7280',
  };
  return colors[priority] || '#9ca3af';
};

export function RequirementCard({
  requirement,
  onClick,
  onEdit,
  onSign,
  isSelected = false,
  showActions = true,
}: RequirementCardProps): React.ReactElement {
  const handleClick = () => {
    onClick?.(requirement);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(requirement);
  };

  const handleSign = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSign?.(requirement);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`requirement-card ${isSelected ? 'selected' : ''} ${onClick ? 'clickable' : ''}`}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && handleClick() : undefined}
    >
      <div className="card-header">
        <div className="card-title-row">
          <h3 className="card-title">{requirement.title}</h3>
          {requirement.is_signed && (
            <span className="signed-indicator" title="Signed">
              ✓
            </span>
          )}
        </div>
        <div className="card-badges">
          <span
            className="status-badge"
            style={{ backgroundColor: getStatusColor(requirement.status) }}
          >
            {requirement.status}
          </span>
          <span className="version-badge">v{requirement.version}</span>
        </div>
      </div>

      {requirement.description && (
        <p className="card-description">{requirement.description}</p>
      )}

      <div className="card-footer">
        <div className="card-meta">
          {requirement.priority && (
            <span
              className="priority-indicator"
              style={{ color: getPriorityColor(requirement.priority) }}
            >
              P{requirement.priority} - {getPriorityLabel(requirement.priority)}
            </span>
          )}
          <span className="date-info">Updated {formatDate(requirement.updated_at)}</span>
        </div>

        {showActions && (
          <div className="card-actions">
            {!requirement.is_signed && onEdit && (
              <button
                className="action-button edit"
                onClick={handleEdit}
                title="Edit requirement"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M11.333 2a1.886 1.886 0 012.667 2.667l-8.667 8.666-3.333.667.667-3.333 8.666-8.667z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
            {!requirement.is_signed && onSign && (
              <button
                className="action-button sign"
                onClick={handleSign}
                title="Sign requirement"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M13.333 6v6.667A1.333 1.333 0 0112 14H4a1.333 1.333 0 01-1.333-1.333V4.667A1.333 1.333 0 014 3.333h6.667"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 10l2 2 5.333-6.667"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        .requirement-card {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          padding: 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .requirement-card.clickable {
          cursor: pointer;
        }

        .requirement-card.clickable:hover {
          border-color: #d1d5db;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .requirement-card.selected {
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }

        .requirement-card:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .card-title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
          min-width: 0;
        }

        .card-title {
          margin: 0;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #111827;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .signed-indicator {
          color: #10b981;
          font-weight: 600;
          flex-shrink: 0;
        }

        .card-badges {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.5rem;
          font-size: 0.6875rem;
          font-weight: 500;
          color: white;
          border-radius: 4px;
          text-transform: capitalize;
        }

        .version-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.125rem 0.375rem;
          font-size: 0.6875rem;
          font-weight: 500;
          background: #f3f4f6;
          color: #374151;
          border-radius: 4px;
        }

        .card-description {
          margin: 0;
          font-size: 0.8125rem;
          line-height: 1.5;
          color: #6b7280;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
        }

        .card-meta {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .priority-indicator {
          font-size: 0.75rem;
          font-weight: 500;
        }

        .date-info {
          font-size: 0.6875rem;
          color: #9ca3af;
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
        }

        .action-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          padding: 0;
          background: transparent;
          border: 1px solid #e5e7eb;
          border-radius: 4px;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-button:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          color: #374151;
        }

        .action-button.edit:hover {
          color: #2563eb;
          border-color: #2563eb;
        }

        .action-button.sign:hover {
          color: #059669;
          border-color: #059669;
        }
      `}</style>
    </div>
  );
}

export default RequirementCard;

/**
 * MitigationTracker component
 * Displays and manages mitigation actions for risks
 * Implements Requirement 10 (Risk Management with FMEA)
 * 
 * Features:
 * - Displays list of mitigation actions for a specific risk
 * - Shows mitigation status (planned, in_progress, completed, verified, cancelled)
 * - Displays assigned person, due dates, and completion dates
 * - Shows expected RPN reductions (severity, occurrence, detection improvements)
 * - Supports filtering by status
 * - Displays verification methods and results
 * - Responsive design
 */

import React, { useState, useMemo } from 'react';
import type { MitigationAction, MitigationStatus } from '../../services/riskService';

export interface MitigationTrackerProps {
  mitigations: MitigationAction[];
  onRefresh?: () => void;
  onMitigationClick?: (mitigation: MitigationAction) => void;
  showFilters?: boolean;
  className?: string;
}

export function MitigationTracker({
  mitigations,
  onRefresh,
  onMitigationClick,
  showFilters = true,
  className = '',
}: MitigationTrackerProps): React.ReactElement {
  const [statusFilter, setStatusFilter] = useState<MitigationStatus | 'all'>('all');

  // Filter mitigations based on status
  const filteredMitigations = useMemo(() => {
    if (statusFilter === 'all') {
      return mitigations;
    }
    return mitigations.filter(m => m.status === statusFilter);
  }, [mitigations, statusFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const total = mitigations.length;
    const planned = mitigations.filter(m => m.status === 'planned').length;
    const inProgress = mitigations.filter(m => m.status === 'in_progress').length;
    const completed = mitigations.filter(m => m.status === 'completed').length;
    const verified = mitigations.filter(m => m.status === 'verified').length;
    const cancelled = mitigations.filter(m => m.status === 'cancelled').length;

    return { total, planned, inProgress, completed, verified, cancelled };
  }, [mitigations]);

  // Get status badge color
  const getStatusColor = (status: MitigationStatus): string => {
    switch (status) {
      case 'planned':
        return '#6b7280'; // gray
      case 'in_progress':
        return '#3b82f6'; // blue
      case 'completed':
        return '#10b981'; // green
      case 'verified':
        return '#059669'; // dark green
      case 'cancelled':
        return '#ef4444'; // red
      default:
        return '#6b7280';
    }
  };

  // Format date for display
  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Check if mitigation is overdue
  const isOverdue = (mitigation: MitigationAction): boolean => {
    if (!mitigation.due_date || mitigation.status === 'completed' || mitigation.status === 'verified' || mitigation.status === 'cancelled') {
      return false;
    }
    return new Date(mitigation.due_date) < new Date();
  };

  // Render status badge
  const renderStatusBadge = (status: MitigationStatus) => (
    <span
      className="status-badge"
      style={{ backgroundColor: getStatusColor(status) }}
    >
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );

  // Render RPN reduction indicators
  const renderRPNReduction = (mitigation: MitigationAction) => {
    const hasSeverityReduction = mitigation.expected_severity_reduction && mitigation.expected_severity_reduction > 0;
    const hasOccurrenceReduction = mitigation.expected_occurrence_reduction && mitigation.expected_occurrence_reduction > 0;
    const hasDetectionImprovement = mitigation.expected_detection_improvement && mitigation.expected_detection_improvement > 0;

    if (!hasSeverityReduction && !hasOccurrenceReduction && !hasDetectionImprovement) {
      return null;
    }

    return (
      <div className="rpn-reduction">
        <div className="rpn-reduction-title">Expected RPN Reduction:</div>
        <div className="rpn-reduction-values">
          {hasSeverityReduction && (
            <div className="reduction-item">
              <span className="reduction-label">Severity:</span>
              <span className="reduction-value">-{mitigation.expected_severity_reduction}</span>
            </div>
          )}
          {hasOccurrenceReduction && (
            <div className="reduction-item">
              <span className="reduction-label">Occurrence:</span>
              <span className="reduction-value">-{mitigation.expected_occurrence_reduction}</span>
            </div>
          )}
          {hasDetectionImprovement && (
            <div className="reduction-item">
              <span className="reduction-label">Detection:</span>
              <span className="reduction-value">-{mitigation.expected_detection_improvement}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render single mitigation card
  const renderMitigation = (mitigation: MitigationAction) => {
    const overdue = isOverdue(mitigation);

    return (
      <div
        key={mitigation.id}
        className={`mitigation-card ${onMitigationClick ? 'clickable' : ''} ${overdue ? 'overdue' : ''}`}
        onClick={onMitigationClick ? () => onMitigationClick(mitigation) : undefined}
        role={onMitigationClick ? 'button' : undefined}
        tabIndex={onMitigationClick ? 0 : undefined}
        onKeyDown={onMitigationClick ? (e) => e.key === 'Enter' && onMitigationClick(mitigation) : undefined}
      >
        <div className="mitigation-header">
          <h3 className="mitigation-title">{mitigation.title}</h3>
          {renderStatusBadge(mitigation.status)}
        </div>

        {mitigation.description && (
          <p className="mitigation-description">{mitigation.description}</p>
        )}

        <div className="mitigation-details">
          <div className="detail-row">
            <div className="detail-item">
              <span className="detail-label">Type:</span>
              <span className="detail-value">{mitigation.action_type}</span>
            </div>
            {mitigation.assigned_to && (
              <div className="detail-item">
                <span className="detail-label">Assigned to:</span>
                <span className="detail-value">{mitigation.assigned_to}</span>
              </div>
            )}
          </div>

          <div className="detail-row">
            <div className="detail-item">
              <span className="detail-label">Due Date:</span>
              <span className={`detail-value ${overdue ? 'overdue-text' : ''}`}>
                {formatDate(mitigation.due_date)}
                {overdue && <span className="overdue-indicator"> (OVERDUE)</span>}
              </span>
            </div>
            {mitigation.completed_date && (
              <div className="detail-item">
                <span className="detail-label">Completed:</span>
                <span className="detail-value">{formatDate(mitigation.completed_date)}</span>
              </div>
            )}
          </div>
        </div>

        {renderRPNReduction(mitigation)}

        {mitigation.verification_method && (
          <div className="verification-section">
            <div className="verification-method">
              <span className="verification-label">Verification Method:</span>
              <span className="verification-value">{mitigation.verification_method}</span>
            </div>
            {mitigation.verification_result && (
              <div className="verification-result">
                <span className="verification-label">Verification Result:</span>
                <span className="verification-value">{mitigation.verification_result}</span>
              </div>
            )}
          </div>
        )}

        <div className="mitigation-footer">
          <span className="created-info">
            Created {formatDate(mitigation.created_at)} by {mitigation.created_by}
          </span>
        </div>
      </div>
    );
  };

  // Empty state
  if (mitigations.length === 0) {
    return (
      <div className={`mitigation-tracker ${className}`}>
        <div className="tracker-header">
          <h2 className="tracker-title">Mitigation Actions</h2>
          {onRefresh && (
            <button className="refresh-button" onClick={onRefresh} aria-label="Refresh mitigations">
              ↻ Refresh
            </button>
          )}
        </div>

        <div className="empty-state">
          <p>No mitigation actions found for this risk</p>
          <p className="hint">Mitigation actions help reduce risk severity, occurrence, or improve detection.</p>
        </div>

        <style>{styles}</style>
      </div>
    );
  }

  return (
    <div className={`mitigation-tracker ${className}`}>
      <div className="tracker-header">
        <div className="header-left">
          <h2 className="tracker-title">Mitigation Actions</h2>
          <span className="mitigation-count">{stats.total} total</span>
        </div>
        {onRefresh && (
          <button className="refresh-button" onClick={onRefresh} aria-label="Refresh mitigations">
            ↻ Refresh
          </button>
        )}
      </div>

      {/* Statistics Summary */}
      <div className="stats-summary">
        <div className="stat-item">
          <span className="stat-value">{stats.planned}</span>
          <span className="stat-label">Planned</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.inProgress}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-item">
          <span className="stat-value">{stats.verified}</span>
          <span className="stat-label">Verified</span>
        </div>
        {stats.cancelled > 0 && (
          <div className="stat-item">
            <span className="stat-value">{stats.cancelled}</span>
            <span className="stat-label">Cancelled</span>
          </div>
        )}
      </div>

      {/* Status Filter */}
      {showFilters && (
        <div className="filter-section">
          <label htmlFor="status-filter" className="filter-label">
            Filter by Status:
          </label>
          <select
            id="status-filter"
            className="status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as MitigationStatus | 'all')}
          >
            <option value="all">All ({stats.total})</option>
            <option value="planned">Planned ({stats.planned})</option>
            <option value="in_progress">In Progress ({stats.inProgress})</option>
            <option value="completed">Completed ({stats.completed})</option>
            <option value="verified">Verified ({stats.verified})</option>
            {stats.cancelled > 0 && (
              <option value="cancelled">Cancelled ({stats.cancelled})</option>
            )}
          </select>
        </div>
      )}

      {/* Mitigations List */}
      <div className="mitigations-list">
        {filteredMitigations.length === 0 ? (
          <div className="no-results">
            <p>No mitigations match the selected filter</p>
          </div>
        ) : (
          filteredMitigations.map(renderMitigation)
        )}
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .mitigation-tracker {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    padding: 1.5rem;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .tracker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .tracker-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .mitigation-count {
    padding: 0.25rem 0.75rem;
    background: #f3f4f6;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 500;
    color: #6b7280;
  }

  .refresh-button {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .refresh-button:hover {
    background: #2563eb;
  }

  .refresh-button:active {
    background: #1d4ed8;
  }

  .stats-summary {
    display: flex;
    gap: 1.5rem;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 6px;
    flex-wrap: wrap;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #111827;
  }

  .stat-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .filter-section {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .filter-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .status-filter {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #111827;
    background: white;
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .status-filter:hover {
    border-color: #3b82f6;
  }

  .status-filter:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .mitigations-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .mitigation-card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    transition: all 0.2s;
  }

  .mitigation-card.clickable {
    cursor: pointer;
  }

  .mitigation-card.clickable:hover {
    border-color: #3b82f6;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .mitigation-card.overdue {
    border-left: 4px solid #ef4444;
  }

  .mitigation-card:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .mitigation-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .mitigation-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
    flex: 1;
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    color: white;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .mitigation-description {
    margin: 0;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.5;
  }

  .mitigation-details {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .detail-row {
    display: flex;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .detail-item {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
  }

  .detail-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: #6b7280;
  }

  .detail-value {
    font-size: 0.875rem;
    color: #111827;
    font-weight: 500;
  }

  .overdue-text {
    color: #ef4444;
  }

  .overdue-indicator {
    font-weight: 700;
    font-size: 0.75rem;
  }

  .rpn-reduction {
    padding: 0.75rem;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 6px;
  }

  .rpn-reduction-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #1e40af;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .rpn-reduction-values {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .reduction-item {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
  }

  .reduction-label {
    font-size: 0.75rem;
    color: #3b82f6;
    font-weight: 500;
  }

  .reduction-value {
    font-size: 0.875rem;
    font-weight: 700;
    color: #1e40af;
  }

  .verification-section {
    padding: 0.75rem;
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .verification-method,
  .verification-result {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
  }

  .verification-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #166534;
  }

  .verification-value {
    font-size: 0.875rem;
    color: #15803d;
  }

  .mitigation-footer {
    padding-top: 0.75rem;
    border-top: 1px solid #e5e7eb;
  }

  .created-info {
    font-size: 0.75rem;
    color: #9ca3af;
    font-style: italic;
  }

  .empty-state,
  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    text-align: center;
    background: white;
    border: 2px dashed #d1d5db;
    border-radius: 6px;
  }

  .empty-state p,
  .no-results p {
    margin: 0 0 0.5rem 0;
    color: #6b7280;
    font-size: 0.875rem;
  }

  .empty-state .hint {
    font-size: 0.75rem;
    font-style: italic;
    color: #9ca3af;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .mitigation-tracker {
      padding: 1rem;
    }

    .tracker-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .header-left {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .stats-summary {
      gap: 1rem;
    }

    .stat-item {
      flex: 1;
      min-width: 80px;
    }

    .filter-section {
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
    }

    .status-filter {
      width: 100%;
    }

    .detail-row {
      flex-direction: column;
      gap: 0.5rem;
    }

    .rpn-reduction-values {
      flex-direction: column;
      gap: 0.5rem;
    }
  }

  /* Accessibility */
  @media (prefers-reduced-motion: reduce) {
    .mitigation-card,
    .refresh-button,
    .status-filter {
      transition: none;
    }
  }

  /* Print Styles */
  @media print {
    .mitigation-tracker {
      box-shadow: none;
      border: 1px solid #e5e7eb;
    }

    .refresh-button {
      display: none;
    }

    .filter-section {
      display: none;
    }

    .mitigation-card {
      break-inside: avoid;
    }
  }
`;

export default MitigationTracker;

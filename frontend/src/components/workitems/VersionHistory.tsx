/**
 * VersionHistory component
 * Displays version history for a work item with comparison capabilities
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useWorkItemStore } from '../../stores/workitemStore';
import { Button, Spinner, ErrorMessage } from '../common';
import type { VersionHistoryItem, WorkItem } from '../../services/workitemService';

export interface VersionHistoryProps {
  workItemId: string;
  onVersionSelect?: (version: VersionHistoryItem) => void;
  onClose?: () => void;
}

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    draft: '#6b7280',
    active: '#2563eb',
    completed: '#059669',
    archived: '#d97706',
  };
  return colors[status] || '#6b7280';
};

export function VersionHistory({
  workItemId,
  onVersionSelect,
  onClose,
}: VersionHistoryProps): React.ReactElement {
  const {
    versionHistory,
    selectedItem,
    isLoadingHistory,
    isLoadingItem,
    error,
    fetchVersionHistory,
    fetchVersion,
    clearError,
  } = useWorkItemStore();

  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [versionDetail, setVersionDetail] = useState<WorkItem | null>(null);

  useEffect(() => {
    if (workItemId) {
      fetchVersionHistory(workItemId);
    }
  }, [workItemId, fetchVersionHistory]);

  const handleVersionClick = useCallback(
    async (version: VersionHistoryItem) => {
      setSelectedVersion(version.version);
      
      if (onVersionSelect) {
        onVersionSelect(version);
      } else {
        try {
          const detail = await fetchVersion(workItemId, version.version);
          setVersionDetail(detail);
        } catch {
          // Error handled by store
        }
      }
    },
    [workItemId, fetchVersion, onVersionSelect]
  );

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes} minutes ago`;
      }
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (isLoadingHistory && versionHistory.length === 0) {
    return (
      <div className="version-history-loading">
        <Spinner size="lg" />
        <span>Loading version history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="version-history-error">
        <ErrorMessage message={error} onDismiss={clearError} />
        <Button variant="secondary" onClick={() => fetchVersionHistory(workItemId)}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="version-history">
      <div className="version-history-header">
        <h3 className="version-history-title">
          Version History
          {selectedItem && (
            <span className="current-version">
              Current: v{selectedItem.version}
            </span>
          )}
        </h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <div className="version-history-content">
        <div className="version-list">
          {versionHistory.length === 0 ? (
            <div className="no-history">
              <span>No version history available</span>
            </div>
          ) : (
            <ul className="version-timeline">
              {versionHistory.map((version, index) => {
                const isCurrentVersion = selectedItem && version.version === selectedItem.version;
                return (
                  <li
                    key={version.version}
                    className={`version-item ${
                      selectedVersion === version.version ? 'selected' : ''
                    } ${index === 0 ? 'latest' : ''} ${isCurrentVersion ? 'current' : ''}`}
                    onClick={() => handleVersionClick(version)}
                  >
                    <div className="version-marker">
                      <div className="marker-dot" />
                      {index < versionHistory.length - 1 && (
                        <div className="marker-line" />
                      )}
                    </div>
                    
                    <div className="version-content">
                      <div className="version-header">
                        <span className="version-number">v{version.version}</span>
                        <span
                          className="version-status"
                          style={{ backgroundColor: getStatusColor(version.status) }}
                        >
                          {version.status}
                        </span>
                        {index === 0 && (
                          <span className="latest-badge">Latest</span>
                        )}
                        {isCurrentVersion && (
                          <span className="current-badge">Current</span>
                        )}
                      </div>
                      
                      <div className="version-title">{version.title}</div>
                      
                      {version.change_description && (
                        <div className="version-change">
                          {version.change_description}
                        </div>
                      )}
                      
                      <div className="version-meta">
                        <span className="version-author">
                          by {version.created_by}
                        </span>
                        <span className="version-time" title={formatDate(version.created_at)}>
                          {formatRelativeTime(version.created_at)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selectedVersion && !onVersionSelect && (
          <div className="version-detail">
            {isLoadingItem ? (
              <div className="version-detail-loading">
                <Spinner size="md" />
                <span>Loading version details...</span>
              </div>
            ) : versionDetail ? (
              <div className="version-detail-content">
                <h4 className="detail-title">
                  Version {versionDetail.version} Details
                </h4>
                
                <div className="detail-section">
                  <label className="detail-label">Title</label>
                  <p className="detail-value">{versionDetail.title}</p>
                </div>
                
                <div className="detail-section">
                  <label className="detail-label">Description</label>
                  <p className="detail-value">
                    {versionDetail.description || 'No description'}
                  </p>
                </div>
                
                <div className="detail-grid">
                  <div className="detail-section">
                    <label className="detail-label">Status</label>
                    <p className="detail-value">{versionDetail.status}</p>
                  </div>
                  <div className="detail-section">
                    <label className="detail-label">Priority</label>
                    <p className="detail-value">
                      {versionDetail.priority ? `P${versionDetail.priority}` : 'Not set'}
                    </p>
                  </div>
                </div>
                
                <div className="detail-section">
                  <label className="detail-label">Created At</label>
                  <p className="detail-value">
                    {formatDate(versionDetail.created_at)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <style>{`
        .version-history {
          display: flex;
          flex-direction: column;
          height: 100%;
        }

        .version-history-loading,
        .version-history-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          gap: 1rem;
          color: #6b7280;
        }

        .version-history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 1rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .version-history-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .current-version {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
          background: #f3f4f6;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .version-history-content {
          display: flex;
          gap: 1.5rem;
          flex: 1;
          overflow: hidden;
          padding-top: 1rem;
        }

        .version-list {
          flex: 1;
          overflow-y: auto;
          min-width: 300px;
        }

        .no-history {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: #6b7280;
        }

        .version-timeline {
          list-style: none;
          margin: 0;
          padding: 0;
        }

        .version-item {
          display: flex;
          gap: 1rem;
          padding: 0.75rem;
          cursor: pointer;
          border-radius: 8px;
          transition: background-color 0.2s;
        }

        .version-item:hover {
          background: #f9fafb;
        }

        .version-item.selected {
          background: #eff6ff;
        }

        .version-item.current {
          background: #fef3c7;
          border: 1px solid #fbbf24;
        }

        .version-item.current:hover {
          background: #fde68a;
        }

        .version-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 20px;
        }

        .marker-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #d1d5db;
          border: 2px solid white;
          box-shadow: 0 0 0 2px #d1d5db;
        }

        .version-item.latest .marker-dot {
          background: #2563eb;
          box-shadow: 0 0 0 2px #2563eb;
        }

        .version-item.selected .marker-dot {
          background: #667eea;
          box-shadow: 0 0 0 2px #667eea;
        }

        .version-item.current .marker-dot {
          background: #fbbf24;
          box-shadow: 0 0 0 2px #fbbf24;
        }

        .marker-line {
          width: 2px;
          flex: 1;
          background: #e5e7eb;
          margin-top: 4px;
        }

        .version-content {
          flex: 1;
          min-width: 0;
        }

        .version-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .version-number {
          font-weight: 600;
          color: #111827;
        }

        .version-status {
          font-size: 0.625rem;
          font-weight: 500;
          color: white;
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          text-transform: uppercase;
        }

        .latest-badge {
          font-size: 0.625rem;
          font-weight: 500;
          color: #2563eb;
          background: #dbeafe;
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
        }

        .current-badge {
          font-size: 0.625rem;
          font-weight: 500;
          color: #92400e;
          background: #fef3c7;
          padding: 0.125rem 0.375rem;
          border-radius: 3px;
          border: 1px solid #fbbf24;
        }

        .version-title {
          font-size: 0.875rem;
          color: #374151;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .version-change {
          font-size: 0.75rem;
          color: #6b7280;
          margin-top: 0.25rem;
          font-style: italic;
        }

        .version-meta {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .version-detail {
          flex: 1;
          border-left: 1px solid #e5e7eb;
          padding-left: 1.5rem;
          overflow-y: auto;
        }

        .version-detail-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 0.5rem;
          color: #6b7280;
        }

        .version-detail-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .detail-title {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
        }

        .detail-section {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .detail-label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .detail-value {
          margin: 0;
          font-size: 0.875rem;
          color: #111827;
        }

        .detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
      `}</style>
    </div>
  );
}

export default VersionHistory;

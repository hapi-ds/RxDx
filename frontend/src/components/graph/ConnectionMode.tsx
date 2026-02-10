/**
 * ConnectionMode component
 * Provides UI controls for creating relationships between nodes in the graph
 * Includes toggle button, visual feedback, two-step node selection, and relationship type selector
 * 
 * References: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../common';

export interface ConnectionModeProps {
  /** Whether connection mode is active */
  isActive: boolean;
  /** Callback to toggle connection mode */
  onToggle: () => void;
  /** Callback when connection is created */
  onConnectionCreated: (sourceId: string, targetId: string, type: string) => void;
  /** Source node ID (first selected node) */
  sourceNodeId: string | null;
  /** Target node ID (second selected node) */
  targetNodeId: string | null;
  /** Available relationship types */
  relationshipTypes?: string[];
  /** Whether a relationship is being created */
  isCreating?: boolean;
  /** Error message if creation fails */
  error?: string | null;
  /** Callback to clear error */
  onClearError?: () => void;
}

/**
 * Default relationship types available in the system
 * Based on the design document's relationship types list
 */
const DEFAULT_RELATIONSHIP_TYPES = [
  'TESTED_BY',
  'MITIGATES',
  'DEPENDS_ON',
  'IMPLEMENTS',
  'LEADS_TO',
  'RELATES_TO',
  'MENTIONED_IN',
  'REFERENCES',
  'NEXT_VERSION',
  'CREATED_BY',
  'ASSIGNED_TO',
  'PARENT_OF',
  'BELONGS_TO',
  'ALLOCATED_TO',
  'LINKED_TO_DEPARTMENT',
  'IN_BACKLOG',
  'ASSIGNED_TO_SPRINT',
  'has_risk',
  'implements',
  'BLOCKS',
];

/**
 * ConnectionMode component for creating relationships between graph nodes
 * Provides a two-step selection process with visual feedback and relationship type selection
 */
export function ConnectionMode({
  isActive,
  onToggle,
  onConnectionCreated,
  sourceNodeId,
  targetNodeId,
  relationshipTypes = DEFAULT_RELATIONSHIP_TYPES,
  isCreating = false,
  error = null,
  onClearError,
}: ConnectionModeProps): React.ReactElement {
  const [selectedType, setSelectedType] = useState<string>(relationshipTypes[0] || 'RELATES_TO');
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  // Show type selector when both nodes are selected
  useEffect(() => {
    if (sourceNodeId && targetNodeId && isActive) {
      setShowTypeSelector(true);
    } else {
      setShowTypeSelector(false);
    }
  }, [sourceNodeId, targetNodeId, isActive]);

  // Reset selected type when connection mode is toggled off
  useEffect(() => {
    if (!isActive) {
      setSelectedType(relationshipTypes[0] || 'RELATES_TO');
      setShowTypeSelector(false);
    }
  }, [isActive, relationshipTypes]);

  // Handle relationship type selection
  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value);
  }, []);

  // Handle create button click
  const handleCreate = useCallback(() => {
    if (sourceNodeId && targetNodeId && selectedType) {
      onConnectionCreated(sourceNodeId, targetNodeId, selectedType);
    }
  }, [sourceNodeId, targetNodeId, selectedType, onConnectionCreated]);

  // Handle cancel button click
  const handleCancel = useCallback(() => {
    setShowTypeSelector(false);
    onToggle(); // Exit connection mode
  }, [onToggle]);

  // Get status text based on current state
  const getStatusText = (): string => {
    if (!isActive) {
      return 'Create Relationship';
    }
    if (!sourceNodeId) {
      return 'Select source node';
    }
    if (!targetNodeId) {
      return 'Select target node';
    }
    return 'Choose relationship type';
  };

  return (
    <div className="connection-mode">
      {/* Toggle Button */}
      <Button
        variant={isActive ? 'primary' : 'secondary'}
        size="sm"
        onClick={onToggle}
        disabled={isCreating}
        className={`connection-mode-toggle ${isActive ? 'active' : ''}`}
        aria-pressed={isActive}
        aria-label={isActive ? 'Exit connection mode' : 'Enter connection mode'}
      >
        {isActive ? '✕ Cancel' : '+ Create Relationship'}
      </Button>

      {/* Status Indicator */}
      {isActive && (
        <div className="connection-mode-status">
          <span className="status-text">{getStatusText()}</span>
          {sourceNodeId && (
            <span className="status-badge source-badge">
              Source: {sourceNodeId.substring(0, 8)}...
            </span>
          )}
          {targetNodeId && (
            <span className="status-badge target-badge">
              Target: {targetNodeId.substring(0, 8)}...
            </span>
          )}
        </div>
      )}

      {/* Relationship Type Selector Dialog */}
      {showTypeSelector && (
        <div className="relationship-type-dialog">
          <div className="dialog-overlay" onClick={handleCancel} />
          <div className="dialog-content">
            <h3 className="dialog-title">Create Relationship</h3>
            
            <div className="dialog-body">
              <p className="dialog-description">
                Select the type of relationship between the selected nodes:
              </p>

              <div className="node-info">
                <div className="node-info-item">
                  <span className="node-label">Source:</span>
                  <span className="node-id">{sourceNodeId?.substring(0, 8)}...</span>
                </div>
                <div className="arrow">→</div>
                <div className="node-info-item">
                  <span className="node-label">Target:</span>
                  <span className="node-id">{targetNodeId?.substring(0, 8)}...</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="relationship-type" className="form-label">
                  Relationship Type
                </label>
                <select
                  id="relationship-type"
                  className="form-select"
                  value={selectedType}
                  onChange={handleTypeChange}
                  disabled={isCreating}
                  aria-label="Select relationship type"
                >
                  {relationshipTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="error-message" role="alert">
                  {error}
                  {onClearError && (
                    <button
                      className="error-dismiss"
                      onClick={onClearError}
                      aria-label="Dismiss error"
                    >
                      ×
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="dialog-footer">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancel}
                disabled={isCreating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreate}
                disabled={isCreating || !selectedType}
              >
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .connection-mode {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .connection-mode-toggle {
          white-space: nowrap;
        }

        .connection-mode-toggle.active {
          background-color: #667eea;
          border-color: #667eea;
          color: white;
        }

        .connection-mode-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #f3f4f6;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .status-text {
          color: #374151;
          font-weight: 500;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
        }

        .source-badge {
          background-color: #3b82f6;
        }

        .target-badge {
          background-color: #10b981;
        }

        .relationship-type-dialog {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dialog-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(2px);
        }

        .dialog-content {
          position: relative;
          background: white;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          z-index: 10000;
        }

        .dialog-title {
          margin: 0;
          padding: 1.5rem 1.5rem 1rem;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
          border-bottom: 1px solid #e5e7eb;
        }

        .dialog-body {
          padding: 1.5rem;
        }

        .dialog-description {
          margin: 0 0 1rem;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .node-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 1rem;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .node-info-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
        }

        .node-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #9ca3af;
        }

        .node-id {
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
          font-family: monospace;
        }

        .arrow {
          font-size: 1.5rem;
          color: #9ca3af;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          color: #374151;
        }

        .form-select {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .form-select:focus {
          outline: none;
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .form-select:disabled {
          background: #f3f4f6;
          cursor: not-allowed;
          opacity: 0.6;
        }

        .error-message {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: #fee2e2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          color: #dc2626;
          font-size: 0.875rem;
          margin-top: 1rem;
        }

        .error-dismiss {
          background: none;
          border: none;
          color: #dc2626;
          font-size: 1.25rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .error-dismiss:hover {
          opacity: 1;
        }

        .dialog-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1rem 1.5rem 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        @media (max-width: 768px) {
          .connection-mode {
            flex-wrap: wrap;
          }

          .connection-mode-status {
            flex-direction: column;
            align-items: flex-start;
            width: 100%;
          }

          .dialog-content {
            width: 95%;
            margin: 1rem;
          }

          .node-info {
            flex-direction: column;
            gap: 0.5rem;
          }

          .arrow {
            transform: rotate(90deg);
          }
        }

        @media (max-width: 480px) {
          .status-badge {
            font-size: 0.625rem;
            padding: 0.125rem 0.375rem;
          }

          .dialog-title {
            font-size: 1.125rem;
            padding: 1.25rem 1.25rem 0.75rem;
          }

          .dialog-body {
            padding: 1.25rem;
          }

          .dialog-footer {
            padding: 0.75rem 1.25rem 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}


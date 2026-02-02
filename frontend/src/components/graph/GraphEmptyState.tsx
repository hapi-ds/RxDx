/**
 * GraphEmptyState Component
 * Displays a helpful message when no graph data exists
 * Provides guidance on how to populate data and navigation to create content
 * 
 * References: Requirement 4 (Empty State Handling)
 */

import React from 'react';
import { Button } from '../common/Button';

/**
 * Props for the GraphEmptyState component
 */
export interface GraphEmptyStateProps {
  /** Optional callback when refresh button is clicked */
  onRefresh?: () => void;
  /** Optional CSS class name for the container */
  className?: string;
  /** Optional inline styles for the container */
  style?: React.CSSProperties;
}

/**
 * Icon component for empty state
 * Displays a graph/network icon to represent the empty graph
 */
const EmptyGraphIcon: React.FC<{ size?: number }> = ({ size = 64 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {/* Network/graph icon with disconnected nodes */}
    <circle cx="16" cy="16" r="6" opacity="0.3" />
    <circle cx="48" cy="16" r="6" opacity="0.3" />
    <circle cx="16" cy="48" r="6" opacity="0.3" />
    <circle cx="48" cy="48" r="6" opacity="0.3" />
    <circle cx="32" cy="32" r="6" opacity="0.3" />
    
    {/* Dashed lines showing potential connections */}
    <line x1="22" y1="16" x2="42" y2="16" strokeDasharray="4 4" opacity="0.2" />
    <line x1="16" y1="22" x2="16" y2="42" strokeDasharray="4 4" opacity="0.2" />
    <line x1="22" y1="22" x2="26" y2="26" strokeDasharray="4 4" opacity="0.2" />
    <line x1="38" y1="26" x2="42" y2="22" strokeDasharray="4 4" opacity="0.2" />
  </svg>
);

/**
 * GraphEmptyState - Component displayed when no graph data exists
 * 
 * Features:
 * - Clear visual indication of empty state
 * - Helpful guidance on how to populate data
 * - Navigation button to create requirements
 * - Optional refresh button to reload data
 * - Accessible with semantic HTML and ARIA attributes
 * 
 * Requirements:
 * - 4.1: Display empty state message when graph has zero nodes
 * - 4.2: Provide guidance on how to populate data
 */
export const GraphEmptyState: React.FC<GraphEmptyStateProps> = ({
  onRefresh,
  className,
  style,
}) => {
  /**
   * Navigate to requirements page
   */
  const handleCreateRequirements = (): void => {
    window.location.href = '/requirements';
  };

  return (
    <div
      className={`graph-empty-state ${className ?? ''}`}
      style={style}
      role="status"
      aria-live="polite"
    >
      <div className="empty-state-content">
        {/* Icon */}
        <div className="empty-state-icon">
          <EmptyGraphIcon size={80} />
        </div>

        {/* Heading */}
        <h3 className="empty-state-heading">No Graph Data Available</h3>

        {/* Description */}
        <p className="empty-state-description">
          The knowledge graph is empty. Create some requirements, tasks, or tests
          to see them visualized here.
        </p>

        {/* Action buttons */}
        <div className="empty-state-actions">
          <Button
            variant="primary"
            size="md"
            onClick={handleCreateRequirements}
            aria-label="Navigate to requirements page to create new requirements"
          >
            Create Requirements
          </Button>
          {onRefresh && (
            <Button
              variant="secondary"
              size="md"
              onClick={onRefresh}
              aria-label="Refresh graph data"
            >
              Refresh Graph
            </Button>
          )}
        </div>
      </div>

      <style>{`
        .graph-empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          min-height: 400px;
          padding: 2rem;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }

        .empty-state-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          max-width: 500px;
          text-align: center;
          gap: 1.5rem;
        }

        .empty-state-icon {
          color: #9ca3af;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .empty-state-heading {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
        }

        .empty-state-description {
          margin: 0;
          font-size: 1rem;
          line-height: 1.6;
          color: #6b7280;
        }

        .empty-state-actions {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        /* Responsive design */
        @media (max-width: 640px) {
          .graph-empty-state {
            min-height: 300px;
            padding: 1rem;
          }

          .empty-state-content {
            gap: 1rem;
          }

          .empty-state-heading {
            font-size: 1.25rem;
          }

          .empty-state-description {
            font-size: 0.875rem;
          }

          .empty-state-actions {
            flex-direction: column;
            width: 100%;
          }

          .empty-state-actions button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default GraphEmptyState;

/**
 * IsolationIndicator Component
 * Displays a banner when isolation mode is active, showing the isolated node name and depth
 * Provides an "Exit" button to leave isolation mode
 * 
 * References: Requirements 3.6, 3.7
 */

import React from 'react';

export interface IsolationIndicatorProps {
  /** Name of the isolated node */
  nodeName: string;
  /** Current isolation depth */
  depth: number;
  /** Callback to exit isolation mode */
  onExit: () => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * IsolationIndicator - Banner component for isolation mode
 * Shows when a node is isolated with Shift-click
 */
export const IsolationIndicator: React.FC<IsolationIndicatorProps> = ({
  nodeName,
  depth,
  onExit,
  className = '',
}) => {
  return (
    <div className={`isolation-indicator ${className}`} role="status" aria-live="polite">
      <div className="isolation-content">
        <div className="isolation-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <circle cx="12" cy="12" r="10" strokeDasharray="2 2" />
          </svg>
        </div>
        
        <div className="isolation-info">
          <span className="isolation-label">Isolated:</span>
          <span className="isolation-node-name" title={nodeName}>
            {nodeName}
          </span>
          <span className="isolation-depth-label">
            (Depth: {depth})
          </span>
        </div>
      </div>

      <button
        className="isolation-exit-button"
        onClick={onExit}
        aria-label="Exit isolation mode"
        title="Exit isolation mode (or press Escape)"
      >
        Exit
      </button>

      <style>{`
        .isolation-indicator {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-radius: 0.5rem;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
          margin-bottom: 1rem;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .isolation-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
          min-width: 0;
        }

        .isolation-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .isolation-icon svg {
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
        }

        .isolation-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex: 1;
          min-width: 0;
          font-size: 0.875rem;
        }

        .isolation-label {
          font-weight: 600;
          white-space: nowrap;
        }

        .isolation-node-name {
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 300px;
        }

        .isolation-depth-label {
          font-weight: 400;
          opacity: 0.9;
          white-space: nowrap;
        }

        .isolation-exit-button {
          padding: 0.375rem 1rem;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 0.375rem;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .isolation-exit-button:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .isolation-exit-button:active {
          transform: translateY(0);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .isolation-exit-button:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.4);
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .isolation-indicator {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }

          .isolation-node-name {
            max-width: 200px;
          }

          .isolation-exit-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default IsolationIndicator;

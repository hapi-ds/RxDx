/**
 * Error components
 * Various error display states
 */

import React from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';

export type ErrorVariant = 'inline' | 'banner' | 'page';

export interface ErrorMessageProps {
  message: string;
  variant?: ErrorVariant;
  title?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorMessage({
  message,
  variant = 'inline',
  title,
  onRetry,
  onDismiss,
  className = '',
}: ErrorMessageProps): React.ReactElement {
  if (variant === 'page') {
    return (
      <div className={`error-page ${className}`}>
        <div className="error-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#dc2626" strokeWidth="2" />
            <path d="M12 8v4" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill="#dc2626" />
          </svg>
        </div>
        <h2 className="error-title">{title || 'Something went wrong'}</h2>
        <p className="error-message">{message}</p>
        {(onRetry || onDismiss) && (
          <div className="error-actions">
            {onRetry && (
              <Button variant="primary" onClick={onRetry}>
                Try Again
              </Button>
            )}
            {onDismiss && (
              <Button variant="secondary" onClick={onDismiss}>
                Go Back
              </Button>
            )}
          </div>
        )}

        <style>{`
          .error-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 400px;
            padding: 2rem;
            text-align: center;
          }

          .error-icon {
            margin-bottom: 1.5rem;
          }

          .error-title {
            margin: 0 0 0.5rem;
            font-size: 1.5rem;
            color: #111827;
          }

          .error-page .error-message {
            margin: 0 0 1.5rem;
            color: #6b7280;
            max-width: 400px;
          }

          .error-actions {
            display: flex;
            gap: 0.75rem;
          }
        `}</style>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`error-banner ${className}`} role="alert">
        <div className="error-banner-content">
          <svg className="error-banner-icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16" r="1" fill="currentColor" />
          </svg>
          <div className="error-banner-text">
            {title && <strong className="error-banner-title">{title}: </strong>}
            <span>{message}</span>
          </div>
        </div>
        <div className="error-banner-actions">
          {onRetry && (
            <button className="error-banner-btn" onClick={onRetry}>
              Retry
            </button>
          )}
          {onDismiss && (
            <button className="error-banner-dismiss" onClick={onDismiss} aria-label="Dismiss">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>

        <style>{`
          .error-banner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1rem;
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 6px;
            color: #dc2626;
          }

          .error-banner-content {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .error-banner-icon {
            flex-shrink: 0;
            margin-top: 0.125rem;
          }

          .error-banner-text {
            font-size: 0.875rem;
            line-height: 1.5;
          }

          .error-banner-title {
            font-weight: 600;
          }

          .error-banner-actions {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin-left: 1rem;
          }

          .error-banner-btn {
            padding: 0.25rem 0.75rem;
            font-size: 0.75rem;
            font-weight: 500;
            color: #dc2626;
            background: white;
            border: 1px solid #fecaca;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;
          }

          .error-banner-btn:hover {
            background: #fef2f2;
          }

          .error-banner-dismiss {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0.25rem;
            background: transparent;
            border: none;
            color: #dc2626;
            cursor: pointer;
            border-radius: 4px;
            transition: background 0.2s;
          }

          .error-banner-dismiss:hover {
            background: rgba(220, 38, 38, 0.1);
          }
        `}</style>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <div className={`error-inline ${className}`} role="alert">
      <svg className="error-inline-icon" width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M12 8v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="16" r="1" fill="currentColor" />
      </svg>
      <span className="error-inline-text">{message}</span>

      <style>{`
        .error-inline {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          color: #dc2626;
          font-size: 0.75rem;
        }

        .error-inline-icon {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}

export interface ErrorBoundaryFallbackProps {
  error: Error;
  resetError: () => void;
}

export function ErrorBoundaryFallback({
  error,
  resetError,
}: ErrorBoundaryFallbackProps): React.ReactElement {
  return (
    <ErrorMessage
      variant="page"
      title="Application Error"
      message={error.message || 'An unexpected error occurred'}
      onRetry={resetError}
    />
  );
}

export interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  message,
  icon,
  action,
  className = '',
}: EmptyStateProps): React.ReactElement {
  return (
    <div className={`empty-state ${className}`}>
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3 className="empty-state-title">{title}</h3>
      {message && <p className="empty-state-message">{message}</p>}
      {action && <div className="empty-state-action">{action}</div>}

      <style>{`
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          text-align: center;
        }

        .empty-state-icon {
          margin-bottom: 1rem;
          color: #9ca3af;
        }

        .empty-state-title {
          margin: 0 0 0.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
        }

        .empty-state-message {
          margin: 0 0 1.5rem;
          color: #6b7280;
          max-width: 300px;
        }
      `}</style>
    </div>
  );
}

export default { ErrorMessage, ErrorBoundaryFallback, EmptyState };

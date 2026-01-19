/**
 * Loading components
 * Various loading indicators and states
 */

import React from 'react';
import type { ReactNode } from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: string;
  className?: string;
}

const spinnerSizes: Record<SpinnerSize, { width: string; border: string }> = {
  sm: { width: '16px', border: '2px' },
  md: { width: '24px', border: '3px' },
  lg: { width: '40px', border: '4px' },
  xl: { width: '56px', border: '5px' },
};

export function Spinner({
  size = 'md',
  color = '#667eea',
  className = '',
}: SpinnerProps): React.ReactElement {
  const { width, border } = spinnerSizes[size];

  return (
    <>
      <div
        className={`spinner ${className}`}
        role="status"
        aria-label="Loading"
        style={{
          width,
          height: width,
          borderWidth: border,
          borderTopColor: color,
        }}
      />
      <style>{`
        .spinner {
          border-style: solid;
          border-color: #e5e7eb;
          border-radius: 50%;
          animation: spinner-rotate 0.75s linear infinite;
        }

        @keyframes spinner-rotate {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}

export interface LoadingOverlayProps {
  isLoading: boolean;
  children: ReactNode;
  message?: string;
  blur?: boolean;
}

export function LoadingOverlay({
  isLoading,
  children,
  message = 'Loading...',
  blur = true,
}: LoadingOverlayProps): React.ReactElement {
  return (
    <div className="loading-overlay-container">
      {children}
      {isLoading && (
        <div className={`loading-overlay ${blur ? 'blur' : ''}`}>
          <div className="loading-content">
            <Spinner size="lg" />
            {message && <p className="loading-message">{message}</p>}
          </div>
        </div>
      )}

      <style>{`
        .loading-overlay-container {
          position: relative;
        }

        .loading-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.8);
          z-index: 10;
        }

        .loading-overlay.blur {
          backdrop-filter: blur(2px);
        }

        .loading-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .loading-message {
          margin: 0;
          color: #4b5563;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

export interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius = '4px',
  className = '',
}: SkeletonProps): React.ReactElement {
  return (
    <>
      <div
        className={`skeleton ${className}`}
        style={{ width, height, borderRadius }}
        aria-hidden="true"
      />
      <style>{`
        .skeleton {
          background: linear-gradient(
            90deg,
            #f0f0f0 25%,
            #e0e0e0 50%,
            #f0f0f0 75%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s infinite;
        }

        @keyframes skeleton-shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </>
  );
}

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className = '' }: SkeletonTextProps): React.ReactElement {
  return (
    <div className={`skeleton-text ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '60%' : '100%'}
          height="0.875rem"
        />
      ))}

      <style>{`
        .skeleton-text {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
}

export interface LoadingPageProps {
  message?: string;
}

export function LoadingPage({ message = 'Loading...' }: LoadingPageProps): React.ReactElement {
  return (
    <div className="loading-page">
      <Spinner size="xl" />
      <p className="loading-page-message">{message}</p>

      <style>{`
        .loading-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 1.5rem;
        }

        .loading-page-message {
          margin: 0;
          color: #6b7280;
          font-size: 1rem;
        }
      `}</style>
    </div>
  );
}

export default { Spinner, LoadingOverlay, Skeleton, SkeletonText, LoadingPage };

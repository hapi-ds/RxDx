/**
 * VersionIndicator component
 * Displays version number in a badge/pill style
 */

import React from 'react';

export interface VersionIndicatorProps {
  version: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'success';
  className?: string;
}

const sizeStyles: Record<string, string> = {
  sm: 'padding: 0.125rem 0.375rem; font-size: 0.625rem;',
  md: 'padding: 0.25rem 0.5rem; font-size: 0.75rem;',
  lg: 'padding: 0.375rem 0.75rem; font-size: 0.875rem;',
};

const variantStyles: Record<string, string> = {
  default: 'background: #f3f4f6; color: #374151;',
  primary: 'background: #dbeafe; color: #1e40af;',
  success: 'background: #d1fae5; color: #047857;',
};

export function VersionIndicator({
  version,
  size = 'md',
  variant = 'default',
  className = '',
}: VersionIndicatorProps): React.ReactElement {
  return (
    <>
      <span
        className={`version-indicator version-indicator-${size} version-indicator-${variant} ${className}`}
        title={`Version ${version}`}
      >
        v{version}
      </span>

      <style>{`
        .version-indicator {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-weight: 500;
          border-radius: 9999px;
          white-space: nowrap;
          line-height: 1;
        }

        /* Sizes */
        .version-indicator-sm {
          ${sizeStyles.sm}
        }

        .version-indicator-md {
          ${sizeStyles.md}
        }

        .version-indicator-lg {
          ${sizeStyles.lg}
        }

        /* Variants */
        .version-indicator-default {
          ${variantStyles.default}
        }

        .version-indicator-primary {
          ${variantStyles.primary}
        }

        .version-indicator-success {
          ${variantStyles.success}
        }
      `}</style>
    </>
  );
}

export default VersionIndicator;

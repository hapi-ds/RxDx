/**
 * Button component
 * Reusable button with variants and states
 */

import React from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: `
    background: #667eea;
    color: white;
    border: none;
  `,
  secondary: `
    background: white;
    color: #333;
    border: 1px solid #ddd;
  `,
  danger: `
    background: #dc2626;
    color: white;
    border: none;
  `,
  ghost: `
    background: transparent;
    color: #333;
    border: none;
  `,
  link: `
    background: transparent;
    color: #667eea;
    border: none;
    text-decoration: underline;
    padding: 0;
  `,
};

const variantHoverStyles: Record<ButtonVariant, string> = {
  primary: 'background: #5a67d8;',
  secondary: 'background: #f5f5f5; border-color: #ccc;',
  danger: 'background: #b91c1c;',
  ghost: 'background: #f5f5f5;',
  link: 'color: #5a67d8;',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'padding: 0.375rem 0.75rem; font-size: 0.875rem;',
  md: 'padding: 0.5rem 1rem; font-size: 1rem;',
  lg: 'padding: 0.75rem 1.5rem; font-size: 1.125rem;',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  children,
  className = '',
  ...props
}: ButtonProps): React.ReactElement {
  const isDisabled = disabled || isLoading;

  return (
    <>
      <button
        className={`btn btn-${variant} btn-${size} ${fullWidth ? 'btn-full' : ''} ${className}`}
        disabled={isDisabled}
        {...props}
      >
        {isLoading && <span className="btn-spinner" aria-hidden="true" />}
        {!isLoading && leftIcon && <span className="btn-icon-left">{leftIcon}</span>}
        <span className="btn-content">{children}</span>
        {!isLoading && rightIcon && <span className="btn-icon-right">{rightIcon}</span>}
      </button>

      <style>{`
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          border-radius: 4px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.3);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-full {
          width: 100%;
        }

        /* Variants */
        .btn-primary {
          ${variantStyles.primary}
        }
        .btn-primary:hover:not(:disabled) {
          ${variantHoverStyles.primary}
        }

        .btn-secondary {
          ${variantStyles.secondary}
        }
        .btn-secondary:hover:not(:disabled) {
          ${variantHoverStyles.secondary}
        }

        .btn-danger {
          ${variantStyles.danger}
        }
        .btn-danger:hover:not(:disabled) {
          ${variantHoverStyles.danger}
        }

        .btn-ghost {
          ${variantStyles.ghost}
        }
        .btn-ghost:hover:not(:disabled) {
          ${variantHoverStyles.ghost}
        }

        .btn-link {
          ${variantStyles.link}
        }
        .btn-link:hover:not(:disabled) {
          ${variantHoverStyles.link}
        }

        /* Sizes */
        .btn-sm {
          ${sizeStyles.sm}
        }
        .btn-md {
          ${sizeStyles.md}
        }
        .btn-lg {
          ${sizeStyles.lg}
        }

        /* Icons */
        .btn-icon-left,
        .btn-icon-right {
          display: inline-flex;
          align-items: center;
        }

        /* Spinner */
        .btn-spinner {
          width: 1em;
          height: 1em;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: btn-spin 0.75s linear infinite;
        }

        @keyframes btn-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </>
  );
}

export default Button;

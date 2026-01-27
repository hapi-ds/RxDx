/**
 * Form components
 * Reusable form inputs with consistent styling
 */

import {
  forwardRef,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type ReactNode,
} from 'react';

// Shared styles
const baseInputStyles = `
  width: 100%;
  padding: 0.625rem 0.75rem;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #111827;
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  transition: border-color 0.2s, box-shadow 0.2s;
`;

const focusStyles = `
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
`;

const errorStyles = `
  border-color: #dc2626;
`;

const disabledStyles = `
  background: #f9fafb;
  color: #9ca3af;
  cursor: not-allowed;
`;

let inputCounter = 0;
let selectCounter = 0;
let textareaCounter = 0;
let checkboxCounter = 0;

// Input Component
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftAddon?: ReactNode;
  rightAddon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftAddon, rightAddon, id, className = '', ...props }, ref) => {
    const inputId = id || `input-${inputCounter++}`;
    const hasError = !!error;

    return (
      <div className={`form-field ${className}`}>
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
            {props.required && <span className="form-required">*</span>}
          </label>
        )}

        <div className={`input-wrapper ${leftAddon ? 'has-left-addon' : ''} ${rightAddon ? 'has-right-addon' : ''}`}>
          {leftAddon && <span className="input-addon input-addon-left">{leftAddon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`form-input ${hasError ? 'has-error' : ''}`}
            aria-invalid={hasError}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightAddon && <span className="input-addon input-addon-right">{rightAddon}</span>}
        </div>

        {error && (
          <span id={`${inputId}-error`} className="form-error" role="alert">
            {error}
          </span>
        )}
        {!error && hint && (
          <span id={`${inputId}-hint`} className="form-hint">
            {hint}
          </span>
        )}

        <style>{`
          .form-field {
            display: flex;
            flex-direction: column;
            gap: 0.375rem;
          }

          .form-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
          }

          .form-required {
            color: #dc2626;
            margin-left: 0.25rem;
          }

          .input-wrapper {
            position: relative;
            display: flex;
          }

          .form-input {
            ${baseInputStyles}
          }

          .form-input:focus {
            ${focusStyles}
          }

          .form-input.has-error {
            ${errorStyles}
          }

          .form-input:disabled {
            ${disabledStyles}
          }

          .has-left-addon .form-input {
            border-top-left-radius: 0;
            border-bottom-left-radius: 0;
          }

          .has-right-addon .form-input {
            border-top-right-radius: 0;
            border-bottom-right-radius: 0;
          }

          .input-addon {
            display: flex;
            align-items: center;
            padding: 0 0.75rem;
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            color: #6b7280;
            font-size: 0.875rem;
          }

          .input-addon-left {
            border-right: none;
            border-radius: 6px 0 0 6px;
          }

          .input-addon-right {
            border-left: none;
            border-radius: 0 6px 6px 0;
          }

          .form-error {
            font-size: 0.75rem;
            color: #dc2626;
          }

          .form-hint {
            font-size: 0.75rem;
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }
);

Input.displayName = 'Input';

// Select Component
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, placeholder, id, className = '', ...props }, ref) => {
    const selectId = id || `select-${selectCounter++}`;
    const hasError = !!error;

    return (
      <div className={`form-field ${className}`}>
        {label && (
          <label htmlFor={selectId} className="form-label">
            {label}
            {props.required && <span className="form-required">*</span>}
          </label>
        )}

        <div className="select-wrapper">
          <select
            ref={ref}
            id={selectId}
            className={`form-select ${hasError ? 'has-error' : ''}`}
            aria-invalid={hasError}
            aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
          <span className="select-arrow">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
        </div>

        {error && (
          <span id={`${selectId}-error`} className="form-error" role="alert">
            {error}
          </span>
        )}
        {!error && hint && (
          <span id={`${selectId}-hint`} className="form-hint">
            {hint}
          </span>
        )}

        <style>{`
          .select-wrapper {
            position: relative;
          }

          .form-select {
            ${baseInputStyles}
            appearance: none;
            padding-right: 2.5rem;
            cursor: pointer;
          }

          .form-select:focus {
            ${focusStyles}
          }

          .form-select.has-error {
            ${errorStyles}
          }

          .form-select:disabled {
            ${disabledStyles}
          }

          .select-arrow {
            position: absolute;
            right: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            pointer-events: none;
            color: #6b7280;
          }
        `}</style>
      </div>
    );
  }
);

Select.displayName = 'Select';

// Textarea Component
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, resize = 'vertical', id, className = '', ...props }, ref) => {
    const textareaId = id || `textarea-${textareaCounter++}`;
    const hasError = !!error;

    return (
      <div className={`form-field ${className}`}>
        {label && (
          <label htmlFor={textareaId} className="form-label">
            {label}
            {props.required && <span className="form-required">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          className={`form-textarea ${hasError ? 'has-error' : ''}`}
          style={{ resize }}
          aria-invalid={hasError}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          {...props}
        />

        {error && (
          <span id={`${textareaId}-error`} className="form-error" role="alert">
            {error}
          </span>
        )}
        {!error && hint && (
          <span id={`${textareaId}-hint`} className="form-hint">
            {hint}
          </span>
        )}

        <style>{`
          .form-textarea {
            ${baseInputStyles}
            min-height: 100px;
          }

          .form-textarea:focus {
            ${focusStyles}
          }

          .form-textarea.has-error {
            ${errorStyles}
          }

          .form-textarea:disabled {
            ${disabledStyles}
          }
        `}</style>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

// Checkbox Component
export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const checkboxId = id || `checkbox-${checkboxCounter++}`;

    return (
      <div className={`checkbox-field ${className}`}>
        <label className="checkbox-label">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className="checkbox-input"
            {...props}
          />
          <span className="checkbox-custom" />
          <span className="checkbox-text">{label}</span>
        </label>

        {error && (
          <span className="form-error" role="alert">
            {error}
          </span>
        )}

        <style>{`
          .checkbox-field {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
          }

          .checkbox-label {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            cursor: pointer;
          }

          .checkbox-input {
            position: absolute;
            opacity: 0;
            width: 0;
            height: 0;
          }

          .checkbox-custom {
            width: 18px;
            height: 18px;
            border: 2px solid #d1d5db;
            border-radius: 4px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .checkbox-input:checked + .checkbox-custom {
            background: #667eea;
            border-color: #667eea;
          }

          .checkbox-input:checked + .checkbox-custom::after {
            content: '';
            width: 5px;
            height: 9px;
            border: solid white;
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
            margin-bottom: 2px;
          }

          .checkbox-input:focus + .checkbox-custom {
            box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
          }

          .checkbox-input:disabled + .checkbox-custom {
            background: #f3f4f6;
            border-color: #e5e7eb;
          }

          .checkbox-text {
            font-size: 0.875rem;
            color: #374151;
          }
        `}</style>
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default { Input, Select, Textarea, Checkbox };

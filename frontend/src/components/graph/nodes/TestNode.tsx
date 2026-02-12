/**
 * TestNode Component
 * Test node with unified design pattern
 * Features:
 * - Unified node design (circular background + rounded rectangle)
 * - Test-specific icon
 * - "Test" type label
 * - Status-specific icon below box
 */

import React, { useMemo } from 'react';
import type { CustomNodeProps } from './types';
import { UnifiedNode } from './UnifiedNode';

/**
 * TestIcon - SVG icon component for test nodes
 * Displays a beaker/flask icon representing testing
 */
const TestIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = '#9c27b0',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Beaker/flask icon */}
    <path
      d="M7 2v2h1v14c0 2.21 1.79 4 4 4s4-1.79 4-4V4h1V2H7zm2 2h6v3H9V4zm0 5h6v9c0 1.1-.9 2-2 2s-2-.9-2-2V9z"
      fill={color}
    />
  </svg>
);

/**
 * Get status icon component based on status value
 */
const getStatusIcon = (
  status?: string
): React.ComponentType<{ size?: number; color?: string }> | undefined => {
  if (!status) return undefined;

  switch (status) {
    case 'draft':
      // Draft icon - pencil/edit icon
      return ({ size = 16, color = '#9e9e9e' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
            fill={color}
          />
        </svg>
      );

    case 'active':
      // Active icon - play/arrow icon
      return ({ size = 16, color = '#2196f3' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M8 5v14l11-7z" fill={color} />
        </svg>
      );

    case 'completed':
      // Completed icon - checkmark in circle
      return ({ size = 16, color = '#388e3c' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
          <path
            d="M8 12l2 2 4-4"
            stroke={color}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'archived':
      // Archived icon - box/archive icon
      return ({ size = 16, color = '#757575' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"
            fill={color}
          />
        </svg>
      );

    case 'passed':
      // Passed icon - checkmark in circle (green)
      return ({ size = 16, color = '#388e3c' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" fill={color} />
          <path
            d="M8 12l2 2 4-4"
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'failed':
      // Failed icon - X in circle (red)
      return ({ size = 16, color = '#d32f2f' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" fill={color} />
          <path
            d="M8 8l8 8M16 8l-8 8"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'pending':
      // Pending icon - clock icon
      return ({ size = 16, color = '#ff9800' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
          <path
            d="M12 6v6l4 2"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    default:
      return undefined;
  }
};

/**
 * TestNode - Test node component with unified design
 * Extends UnifiedNode with test-specific configuration
 */
export const TestNode: React.FC<CustomNodeProps> = ({
  data,
  selected,
  dragging,
  ...props
}) => {
  // Get status icon based on actual status
  const StatusIcon = useMemo(() => {
    return getStatusIcon(data.status);
  }, [data.status]);

  return (
    <UnifiedNode
      {...props}
      data={data}
      selected={selected}
      dragging={dragging}
      typeIcon={TestIcon}
      typeName="Test"
      statusIcon={StatusIcon}
      gauges={[]} // No gauges for test nodes
      iconPosition="upper-left"
    />
  );
};

export default TestNode;

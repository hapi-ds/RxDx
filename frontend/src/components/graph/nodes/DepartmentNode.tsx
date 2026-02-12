/**
 * DepartmentNode Component
 * Department node with unified design pattern
 * Features:
 * - Unified node design (circular background + rounded rectangle)
 * - Department-specific icon (users)
 * - No progress gauge (departments don't have progress)
 * - Status-specific icon below box
 */

import React, { useMemo } from 'react';
import type { CustomNodeProps } from './types';
import { UnifiedNode } from './UnifiedNode';

/**
 * DepartmentIcon - SVG icon component for department nodes
 * Displays a users icon
 */
const DepartmentIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = '#a855f7',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Users icon */}
    <path
      d="M9 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0-6c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm0 7c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4zm6 5H3v-.99C3.2 16.29 6.3 15 9 15s5.8 1.29 6 2v1zm3-4v-3h-3V9h3V6h2v3h3v2h-3v3h-2z"
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
    case 'active':
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

    case 'inactive':
      return ({ size = 16, color = '#9e9e9e' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" fill="none" />
          <path
            d="M8 12h8"
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
 * DepartmentNode - Department node component with unified design
 * Extends UnifiedNode with department-specific configuration
 */
export const DepartmentNode: React.FC<CustomNodeProps> = ({
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
      typeIcon={DepartmentIcon}
      typeName="Department"
      statusIcon={StatusIcon}
      gauges={[]} // No gauges for departments
      iconPosition="upper-left"
    />
  );
};

export default DepartmentNode;

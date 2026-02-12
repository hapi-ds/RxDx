/**
 * CompanyNode Component
 * Company node with unified design pattern
 * Features:
 * - Unified node design (circular background + rounded rectangle)
 * - Company-specific icon (office-building)
 * - No progress gauge (companies don't have progress)
 * - Status-specific icon below box
 */

import React, { useMemo } from 'react';
import type { CustomNodeProps } from './types';
import { UnifiedNode } from './UnifiedNode';

/**
 * CompanyIcon - SVG icon component for company nodes
 * Displays an office-building icon
 */
const CompanyIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = '#6366f1',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Office building icon */}
    <path
      d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"
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
 * CompanyNode - Company node component with unified design
 * Extends UnifiedNode with company-specific configuration
 */
export const CompanyNode: React.FC<CustomNodeProps> = ({
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
      typeIcon={CompanyIcon}
      typeName="Company"
      statusIcon={StatusIcon}
      gauges={[]} // No gauges for companies
      iconPosition="upper-left"
    />
  );
};

export default CompanyNode;

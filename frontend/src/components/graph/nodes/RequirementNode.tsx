/**
 * RequirementNode Component
 * Requirement node with unified design pattern
 * Features:
 * - Unified node design (circular background + rounded rectangle)
 * - Requirement-specific icon
 * - Signed indicator as dial gauge (0-90 degrees) if applicable
 * - Status-specific icon below box
 */

import React, { useMemo } from 'react';
import type { CustomNodeProps, GaugeDefinition } from './types';
import { UnifiedNode } from './UnifiedNode';

/**
 * RequirementIcon - SVG icon component for requirement nodes
 * Displays a document/list icon
 */
const RequirementIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = '#1976d2',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Document/list icon */}
    <path
      d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"
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

    default:
      return undefined;
  }
};

/**
 * RequirementNode - Requirement node component with unified design
 * Extends UnifiedNode with requirement-specific configuration
 */
export const RequirementNode: React.FC<CustomNodeProps> = ({
  data,
  selected,
  dragging,
  ...props
}) => {
  // Configure signed indicator as dial gauge (0-90 degrees) if applicable
  const gauges: GaugeDefinition[] = useMemo(() => {
    const gaugeList: GaugeDefinition[] = [];

    // Add signed indicator if the requirement is signed
    if (data.properties?.is_signed === true) {
      gaugeList.push({
        id: 'signed',
        label: 'Signed',
        value: 100, // Full arc when signed
        min: 0,
        max: 100,
        startAngle: 0,
        endAngle: 90, // 90-degree arc (quarter circle)
        color: '#388e3c', // Green color for signed
        showValue: false,
      });
    }

    return gaugeList;
  }, [data.properties?.is_signed]);

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
      typeIcon={RequirementIcon}
      typeName="Requirement"
      statusIcon={StatusIcon}
      gauges={gauges}
      iconPosition="upper-left"
    />
  );
};

export default RequirementNode;

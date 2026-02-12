/**
 * MilestoneNode Component
 * Milestone node with unified design pattern
 * Features:
 * - Unified node design (circular background + rounded rectangle)
 * - Milestone-specific icon (flag)
 * - Progress dial gauge (0-360 degrees, pink)
 * - Status-specific icon below box
 */

import React, { useMemo } from 'react';
import type { CustomNodeProps, GaugeDefinition } from './types';
import { UnifiedNode } from './UnifiedNode';

/**
 * MilestoneIcon - SVG icon component for milestone nodes
 * Displays a flag icon
 */
const MilestoneIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = '#ec4899',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Flag icon */}
    <path
      d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"
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
    case 'pending':
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
            d="M12 6v6l4 2"
            stroke={color}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'active':
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

    case 'missed':
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

    default:
      return undefined;
  }
};

/**
 * MilestoneNode - Milestone node component with unified design
 * Extends UnifiedNode with milestone-specific configuration
 */
export const MilestoneNode: React.FC<CustomNodeProps> = ({
  data,
  selected,
  dragging,
  ...props
}) => {
  // Calculate progress from properties
  const progress = useMemo(() => {
    return (data.properties?.progress as number | undefined) || 0;
  }, [data.properties?.progress]);

  // Configure progress dial gauge
  const gauges: GaugeDefinition[] = useMemo(
    () => [
      {
        id: 'progress',
        label: 'Progress',
        value: progress,
        min: 0,
        max: 100,
        startAngle: 0,
        endAngle: 360,
        color: '#ec4899', // Pink color for milestone progress
        showValue: true,
      },
    ],
    [progress]
  );

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
      typeIcon={MilestoneIcon}
      typeName="Milestone"
      statusIcon={StatusIcon}
      gauges={gauges}
      iconPosition="upper-left"
    />
  );
};

export default MilestoneNode;

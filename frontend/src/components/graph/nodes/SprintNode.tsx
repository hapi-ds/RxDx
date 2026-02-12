/**
 * SprintNode Component
 * Sprint node with unified design pattern
 * Features:
 * - Unified node design (circular background + rounded rectangle)
 * - Sprint-specific icon (lightning-bolt)
 * - Progress dial gauge (0-360 degrees, green)
 * - Status-specific icon below box
 */

import React, { useMemo } from 'react';
import type { CustomNodeProps, GaugeDefinition } from './types';
import { UnifiedNode } from './UnifiedNode';

/**
 * SprintIcon - SVG icon component for sprint nodes
 * Displays a lightning-bolt icon
 */
const SprintIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = '#22c55e',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Lightning bolt icon */}
    <path
      d="M7 2v11h3v9l7-12h-4l4-8z"
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
    case 'planned':
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

    default:
      return undefined;
  }
};

/**
 * SprintNode - Sprint node component with unified design
 * Extends UnifiedNode with sprint-specific configuration
 */
export const SprintNode: React.FC<CustomNodeProps> = ({
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
        color: '#22c55e', // Green color for sprint progress
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
      typeIcon={SprintIcon}
      typeName="Sprint"
      statusIcon={StatusIcon}
      gauges={gauges}
      iconPosition="upper-left"
    />
  );
};

export default SprintNode;

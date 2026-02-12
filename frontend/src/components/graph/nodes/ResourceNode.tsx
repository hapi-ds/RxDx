/**
 * ResourceNode Component
 * Resource node with unified design pattern
 * Features:
 * - Unified node design (circular background + rounded rectangle)
 * - Resource-specific icon (user-group)
 * - Capacity dial gauge (0-360 degrees, orange)
 * - Status-specific icon below box
 */

import React, { useMemo } from 'react';
import type { CustomNodeProps, GaugeDefinition } from './types';
import { UnifiedNode } from './UnifiedNode';

/**
 * ResourceIcon - SVG icon component for resource nodes
 * Displays a user-group icon
 */
const ResourceIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = '#f97316',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* User-group icon */}
    <path
      d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
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
    case 'available':
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

    case 'busy':
      return ({ size = 16, color = '#f59e0b' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="12" r="10" fill={color} />
          <path
            d="M12 6v6l4 2"
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'unavailable':
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
 * ResourceNode - Resource node component with unified design
 * Extends UnifiedNode with resource-specific configuration
 */
export const ResourceNode: React.FC<CustomNodeProps> = ({
  data,
  selected,
  dragging,
  ...props
}) => {
  // Calculate capacity utilization from properties
  const utilization = useMemo(() => {
    const capacity = (data.properties?.capacity as number | undefined) || 100;
    const allocated = (data.properties?.allocated as number | undefined) || 0;
    return Math.min((allocated / capacity) * 100, 100);
  }, [data.properties?.capacity, data.properties?.allocated]);

  // Configure capacity dial gauge
  const gauges: GaugeDefinition[] = useMemo(
    () => [
      {
        id: 'capacity',
        label: 'Capacity',
        value: utilization,
        min: 0,
        max: 100,
        startAngle: 0,
        endAngle: 360,
        color: '#f97316', // Orange color for resource capacity
        showValue: true,
      },
    ],
    [utilization]
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
      typeIcon={ResourceIcon}
      typeName="Resource"
      statusIcon={StatusIcon}
      gauges={gauges}
      iconPosition="upper-left"
    />
  );
};

export default ResourceNode;

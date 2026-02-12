/**
 * RiskNode Component
 * Risk node with unified design pattern
 * Features:
 * - Unified node design (circular background + rounded rectangle)
 * - Risk-specific warning icon
 * - RPN dial gauge (0-270 degrees, color-coded by value)
 * - Status-specific icon below box
 */

import React, { useMemo } from 'react';
import type { CustomNodeProps, GaugeDefinition } from './types';
import { UnifiedNode } from './UnifiedNode';

/**
 * WarningIcon - SVG icon component for risk nodes
 * Displays a warning/alert triangle icon
 */
const WarningIcon: React.FC<{ size?: number; color?: string }> = ({
  size = 16,
  color = '#f57c00',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Warning triangle icon */}
    <path
      d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
      fill={color}
    />
  </svg>
);

/**
 * Get RPN color based on risk level
 * Critical (>=200): Red
 * High (>=100): Orange
 * Medium (>=50): Yellow
 * Low (<50): Green
 */
const getRPNColor = (rpn: number): string => {
  if (rpn >= 200) return '#dc2626'; // red-600 - critical
  if (rpn >= 100) return '#f57c00'; // orange-600 - high
  if (rpn >= 50) return '#fbc02d'; // yellow-700 - medium
  return '#388e3c'; // green-700 - low
};

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
      // Active icon - alert/warning icon
      return ({ size = 16, color = '#f57c00' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"
            fill={color}
          />
        </svg>
      );

    case 'mitigated':
      // Mitigated icon - shield/check icon
      return ({ size = 16, color = '#388e3c' }) => (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"
            fill={color}
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
 * RiskNode - Risk node component with unified design
 * Extends UnifiedNode with risk-specific configuration
 */
export const RiskNode: React.FC<CustomNodeProps> = ({
  data,
  selected,
  dragging,
  ...props
}) => {
  // Extract RPN from properties
  const rpn = useMemo(() => {
    const rpnValue = data.properties?.rpn;
    return typeof rpnValue === 'number' ? rpnValue : 0;
  }, [data.properties?.rpn]);

  // Calculate RPN percentage (0-100) for display
  const rpnPercentage = useMemo(() => {
    return (rpn / 1000) * 100;
  }, [rpn]);

  // Configure RPN dial gauge (0-270 degrees, color-coded by value)
  const gauges: GaugeDefinition[] = useMemo(
    () => [
      {
        id: 'rpn',
        label: 'RPN',
        value: rpnPercentage, // Use percentage for mini pie chart
        min: 0,
        max: 100,
        startAngle: 0,
        endAngle: 270, // 270 degrees (3/4 circle)
        color: getRPNColor(rpn),
        showValue: true,
      },
    ],
    [rpn, rpnPercentage]
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
      typeIcon={WarningIcon}
      typeName="Risk"
      statusIcon={StatusIcon}
      gauges={gauges}
      iconPosition="upper-left"
    />
  );
};

export default RiskNode;

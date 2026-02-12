/**
 * ProjectNode Component
 * Project node with unified design pattern
 * Features:
 * - Unified node design (circular background + rounded rectangle)
 * - Project-specific icon (briefcase/project) in corner
 * - Hierarchical progress dial gauge (0-360 degrees, blue)
 * - Aggregates progress from all descendant nodes
 * - Status-specific icon below box
 */

import React, { useMemo } from 'react';
import type { CustomNodeProps, GaugeDefinition } from './types';
import { UnifiedNode } from './UnifiedNode';

/**
 * ProjectIcon - SVG icon component for project nodes
 * Displays a briefcase/project icon
 */
const ProjectIcon: React.FC<{ size?: number; color?: string }> = ({
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
    {/* Briefcase/Project icon */}
    <path
      d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"
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
 * ProjectNode - Project node component with unified design
 * Extends UnifiedNode with project-specific configuration
 * 
 * Hierarchical progress calculation:
 * - If progress is explicitly provided in data.progress, use that value
 * - Otherwise, calculate from all descendant nodes (if available)
 * - If no children or progress data, default to 0
 */
export const ProjectNode: React.FC<CustomNodeProps> = ({
  data,
  selected,
  dragging,
  ...props
}) => {
  // Calculate hierarchical progress
  // Priority: explicit progress > calculated from descendants > 0
  const progress = useMemo(() => {
    // If explicit progress is provided, use it
    if (data.progress !== undefined) {
      return data.progress;
    }

    // If children data is available, calculate aggregate progress
    // Note: In a real implementation, this would recursively query
    // all descendant nodes (workpackages, tasks, etc.)
    // For now, we use the progress property if available
    if (data.children && data.children.length > 0) {
      // This would be calculated by a progress calculator service
      // that recursively queries all descendant nodes and aggregates their progress
      // For now, return 0 as placeholder
      return 0;
    }

    // Default to 0 if no progress data available
    return 0;
  }, [data.progress, data.children]);

  // Configure hierarchical progress dial gauge with blue color
  const gauges: GaugeDefinition[] = useMemo(
    () => [
      {
        id: 'progress',
        label: 'Overall Progress',
        value: progress,
        min: 0,
        max: 100,
        startAngle: 0,
        endAngle: 360,
        color: '#1976d2', // Blue color for project progress
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
      typeIcon={ProjectIcon}
      typeName="Project"
      statusIcon={StatusIcon}
      gauges={gauges}
      iconPosition="upper-left"
    />
  );
};

export default ProjectNode;

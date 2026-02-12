/**
 * PriorityBadge Component
 * Displays priority as a numeric badge with color coding
 * Shows priority number (1-5) and directional icon
 */

import React from 'react';

export interface PriorityBadgeProps {
  /** Priority level (1-5) */
  priority: number;
}

/**
 * Get color for priority level
 * Priority 1 (highest) = red, Priority 5 (lowest) = blue
 */
const getPriorityColor = (priority: number): string => {
  if (priority === 1) return '#d32f2f'; // High priority - red
  if (priority === 2) return '#f57c00'; // Medium-high - orange
  if (priority === 3) return '#fbc02d'; // Medium - yellow
  if (priority === 4) return '#388e3c'; // Medium-low - green
  return '#1976d2'; // Low priority - blue
};

/**
 * Get icon for priority level
 * High priority = up arrow, Medium = right arrow, Low = down arrow
 */
const getPriorityIcon = (priority: number): string => {
  if (priority <= 2) return '⬆'; // High priority
  if (priority === 3) return '➡'; // Medium priority
  return '⬇'; // Low priority
};

/**
 * PriorityBadge - Renders a circular badge with priority number and icon
 */
export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const color = getPriorityColor(priority);
  const icon = getPriorityIcon(priority);

  return (
    <g className="priority-badge">
      {/* Badge background circle */}
      <circle r={12} fill={color} stroke="white" strokeWidth={2} />

      {/* Priority number */}
      <text
        y={-2}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        fill="white"
        fontWeight="bold"
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {priority}
      </text>

      {/* Priority icon */}
      <text
        y={8}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={8}
        fill="white"
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {icon}
      </text>

      {/* Tooltip */}
      <title>Priority: {priority} (1=Highest, 5=Lowest)</title>
    </g>
  );
};

export default PriorityBadge;

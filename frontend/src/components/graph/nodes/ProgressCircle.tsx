/**
 * ProgressCircle Component
 * Reusable component for rendering concentric circle progress indicators
 * Used to visualize completion percentages on nodes
 */

import React from 'react';

export interface ProgressCircleProps {
  /** Progress percentage (0-100) */
  percentage: number;
  /** Circle radius in pixels */
  radius: number;
  /** Stroke width in pixels */
  strokeWidth: number;
  /** Color for the progress arc */
  color: string;
  /** Background color for the incomplete portion */
  backgroundColor?: string;
  /** Whether to animate progress changes */
  animated?: boolean;
}

/**
 * ProgressCircle - Renders a circular progress indicator
 * Uses SVG stroke-dasharray technique for smooth progress visualization
 */
export const ProgressCircle: React.FC<ProgressCircleProps> = ({
  percentage,
  radius,
  strokeWidth,
  color,
  backgroundColor = '#e0e0e0',
  animated = true,
}) => {
  // Calculate circumference for stroke-dasharray
  const circumference = 2 * Math.PI * radius;
  
  // Calculate offset based on percentage
  // Offset determines how much of the circle is "drawn"
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <g>
      {/* Background circle (incomplete portion) */}
      <circle
        r={radius}
        fill="none"
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        opacity={0.3}
      />

      {/* Progress arc (completed portion) */}
      <circle
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90)"
        style={{
          transition: animated ? 'stroke-dashoffset 300ms ease-in-out' : 'none',
          transformOrigin: 'center',
        }}
      />
    </g>
  );
};

export default ProgressCircle;

/**
 * MiniPieChart Component
 * Small pie chart for displaying progress/completion percentage
 */

import React from 'react';

export interface MiniPieChartProps {
  /** Progress percentage (0-100) */
  percentage: number;
  /** Size of the pie chart in pixels */
  size?: number;
  /** Color for the filled portion */
  fillColor?: string;
  /** Color for the unfilled portion */
  backgroundColor?: string;
  /** Whether to show percentage text */
  showText?: boolean;
}

/**
 * MiniPieChart - Renders a small pie chart showing completion percentage
 */
export const MiniPieChart: React.FC<MiniPieChartProps> = ({
  percentage,
  size = 24,
  fillColor = '#388e3c',
  backgroundColor = '#e0e0e0',
  showText = true,
}) => {
  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));
  
  // Calculate the angle for the pie slice (in degrees)
  const angle = (clampedPercentage / 100) * 360;
  
  // Calculate the end point of the arc
  const radius = size / 2;
  const centerX = radius;
  const centerY = radius;
  
  // Convert angle to radians and calculate end point
  // Start from top (12 o'clock position)
  const angleRad = ((angle - 90) * Math.PI) / 180;
  const endX = centerX + radius * Math.cos(angleRad);
  const endY = centerY + radius * Math.sin(angleRad);
  
  // Determine if we need a large arc (>180 degrees)
  const largeArcFlag = angle > 180 ? 1 : 0;
  
  // Create the pie slice path
  let piePath = '';
  if (clampedPercentage === 0) {
    // Empty pie - just show background circle
    piePath = '';
  } else if (clampedPercentage === 100) {
    // Full circle
    piePath = `M ${centerX},${centerY} m 0,-${radius} a ${radius},${radius} 0 1,1 0,${radius * 2} a ${radius},${radius} 0 1,1 0,-${radius * 2}`;
  } else {
    // Partial pie slice
    piePath = `M ${centerX},${centerY} L ${centerX},${centerY - radius} A ${radius},${radius} 0 ${largeArcFlag},1 ${endX},${endY} Z`;
  }
  
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ overflow: 'visible' }}
    >
      {/* Background circle */}
      <circle
        cx={centerX}
        cy={centerY}
        r={radius}
        fill={backgroundColor}
      />
      
      {/* Filled pie slice */}
      {clampedPercentage > 0 && (
        <path
          d={piePath}
          fill={fillColor}
        />
      )}
      
      {/* Percentage text */}
      {showText && (
        <text
          x={centerX}
          y={centerY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={size * 0.35}
          fill="#333"
          fontWeight="bold"
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {clampedPercentage.toFixed(0)}
        </text>
      )}
      
      {/* Tooltip */}
      <title>{clampedPercentage.toFixed(1)}% complete</title>
    </svg>
  );
};

export default MiniPieChart;

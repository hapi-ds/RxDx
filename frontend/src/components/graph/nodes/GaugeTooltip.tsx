/**
 * GaugeTooltip Component
 * Displays detailed information about a gauge indicator on hover
 * Shows label, current value, and value range with appropriate formatting
 */

import React, { useState, useCallback } from 'react';

export interface GaugeTooltipProps {
  /** Unique identifier for the gauge */
  id: string;
  /** Label to display */
  label: string;
  /** Current value */
  value: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Circle radius for positioning */
  radius: number;
  /** Stroke width for positioning */
  strokeWidth: number;
  /** Start angle in degrees */
  startAngle: number;
  /** End angle in degrees */
  endAngle: number;
  /** Children elements (the gauge paths) */
  children: React.ReactNode;
}

/**
 * Format a numeric value with appropriate precision
 * - Integers: no decimal places
 * - Values < 10: 1 decimal place
 * - Values >= 10: no decimal places
 */
function formatValue(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  
  if (Math.abs(value) < 10) {
    return value.toFixed(1);
  }
  
  return Math.round(value).toString();
}

/**
 * GaugeTooltip - Wraps gauge elements with hover-triggered tooltip
 */
export const GaugeTooltip: React.FC<GaugeTooltipProps> = ({
  id,
  label,
  value,
  min,
  max,
  radius,
  strokeWidth,
  startAngle,
  endAngle,
  children,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Calculate tooltip position at the midpoint of the gauge arc
  const midAngle = (startAngle + endAngle) / 2;
  const midRad = ((midAngle - 90) * Math.PI) / 180;
  
  // Position tooltip slightly outside the gauge
  const tooltipRadius = radius + strokeWidth + 15;
  const tooltipX = tooltipRadius * Math.cos(midRad);
  const tooltipY = tooltipRadius * Math.sin(midRad);

  // Format values for display
  const formattedValue = formatValue(value);
  const formattedMin = formatValue(min);
  const formattedMax = formatValue(max);

  return (
    <g
      className="gauge-tooltip-wrapper"
      data-gauge-id={id}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ cursor: 'pointer' }}
    >
      {/* Render the gauge elements */}
      {children}

      {/* Invisible hover target (larger area for easier hovering) */}
      <circle
        r={radius + strokeWidth / 2}
        fill="none"
        stroke="transparent"
        strokeWidth={strokeWidth * 2}
        style={{ pointerEvents: 'all' }}
      />

      {/* Tooltip (visible on hover) */}
      {isHovered && (
        <g className="gauge-tooltip" transform={`translate(${tooltipX}, ${tooltipY})`}>
          {/* Tooltip background */}
          <rect
            x={-50}
            y={-30}
            width={100}
            height={50}
            rx={4}
            ry={4}
            fill="rgba(0, 0, 0, 0.85)"
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={1}
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
            }}
          />

          {/* Tooltip label */}
          <text
            x={0}
            y={-12}
            textAnchor="middle"
            fontSize={11}
            fontWeight="600"
            fill="rgba(255, 255, 255, 0.9)"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {label}
          </text>

          {/* Tooltip value */}
          <text
            x={0}
            y={4}
            textAnchor="middle"
            fontSize={14}
            fontWeight="bold"
            fill="#ffffff"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {formattedValue}
          </text>

          {/* Tooltip range */}
          <text
            x={0}
            y={18}
            textAnchor="middle"
            fontSize={9}
            fill="rgba(255, 255, 255, 0.7)"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            ({formattedMin} - {formattedMax})
          </text>
        </g>
      )}
    </g>
  );
};

export default GaugeTooltip;

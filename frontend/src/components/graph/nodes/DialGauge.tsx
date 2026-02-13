/**
 * DialGauge Component
 * Reusable component for rendering dial-type gauge indicators
 * Displays as a circular arc with configurable angles and value range
 */

import React from 'react';
import type { GaugeDefinition } from './types';
import { GaugeTooltip } from './GaugeTooltip';

export interface DialGaugeProps extends GaugeDefinition {
  /** Circle radius in pixels */
  radius: number;
  /** Stroke width in pixels */
  strokeWidth: number;
  /** Background color for the unfilled portion */
  backgroundColor?: string;
  /** Whether to animate value changes */
  animated?: boolean;
}

/**
 * DialGauge - Renders a dial-type gauge as a circular arc
 * Uses SVG arc paths for precise angle control
 */
export const DialGauge: React.FC<DialGaugeProps> = ({
  id,
  label,
  value,
  min,
  max,
  startAngle,
  endAngle,
  radius,
  strokeWidth,
  color,
  backgroundColor = '#e0e0e0',
  showValue = false,
  animated = true,
}) => {
  // Normalize value to 0-1 range
  const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Convert angles from degrees to radians
  // Subtract 90 to make 0 degrees point to the top
  const startRad = ((startAngle - 90) * Math.PI) / 180;
  const endRad = ((endAngle - 90) * Math.PI) / 180;
  const totalAngle = endRad - startRad;
  const valueAngle = startRad + totalAngle * normalizedValue;

  // Calculate arc path coordinates
  const startX = radius * Math.cos(startRad);
  const startY = radius * Math.sin(startRad);
  const endX = radius * Math.cos(endRad);
  const endY = radius * Math.sin(endRad);
  const valueX = radius * Math.cos(valueAngle);
  const valueY = radius * Math.sin(valueAngle);

  // Determine if arc is large (>180 degrees)
  const largeArcFlag = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
  const valueLargeArcFlag =
    Math.abs(valueAngle - startRad) > Math.PI ? 1 : 0;

  // Background arc path (full range)
  const backgroundPath = `
    M ${startX} ${startY}
    A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}
  `;

  // Value arc path (filled portion)
  const valuePath = `
    M ${startX} ${startY}
    A ${radius} ${radius} 0 ${valueLargeArcFlag} 1 ${valueX} ${valueY}
  `;

  return (
    <GaugeTooltip
      id={id}
      label={label}
      value={value}
      min={min}
      max={max}
      radius={radius}
      strokeWidth={strokeWidth}
      startAngle={startAngle}
      endAngle={endAngle}
    >
      <g className="dial-gauge" data-gauge-id={id}>
        {/* Background arc (unfilled portion) */}
        <path
          d={backgroundPath}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={0.6}
        />

        {/* Value arc (filled portion) */}
        <path
          d={valuePath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          opacity={1.0}
          style={{
            transition: animated ? 'd 300ms ease-in-out' : 'none',
          }}
        />

        {/* Value text (if enabled) */}
        {showValue && (
          <text
            x={valueX * 1.15}
            y={valueY * 1.15}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={10}
            fill={color}
            fontWeight="bold"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {value.toFixed(0)}
          </text>
        )}
      </g>
    </GaugeTooltip>
  );
};

export default DialGauge;

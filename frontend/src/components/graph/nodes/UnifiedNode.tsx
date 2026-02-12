/**
 * UnifiedNode Component
 * Base component for all node types with unified design
 * Layout:
 * - Above box: Node icon (left) | Type label (center) | Status icon (right)
 * - Content box: Rounded rectangle with label
 * - Below box: Mini pie chart (left) | Priority number (right)
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { CustomNodeProps, GaugeDefinition } from './types';
import { useNodeInteraction, useNodeStyles } from './hooks';
import { MiniPieChart } from './MiniPieChart';

export interface UnifiedNodeProps extends CustomNodeProps {
  /** Type icon component */
  typeIcon: React.ComponentType<{ size?: number; color?: string }>;
  /** Type name for label */
  typeName: string;
  /** Optional status icon component */
  statusIcon?: React.ComponentType<{ size?: number; color?: string }>;
  /** Gauge definitions for dial indicators (converted to pie chart) */
  gauges?: GaugeDefinition[];
  /** Icon placement position */
  iconPosition?: 'upper-left' | 'upper-right' | 'lower-left' | 'lower-right';
}

/**
 * UnifiedNode - Base component with unified design for all node types
 * Provides consistent structure and styling across different node types
 */
export const UnifiedNode: React.FC<UnifiedNodeProps> = ({
  data,
  selected,
  dragging,
  typeIcon: TypeIcon,
  typeName,
  statusIcon: StatusIcon,
  gauges = [],
}) => {
  // Node interaction state
  const { nodeState, handlers } = useNodeInteraction(selected, dragging);

  // Node styles based on state and priority
  const { colors, boxShadow } = useNodeStyles(
    data.type,
    nodeState,
    data.priority
  );

  // Layout constants
  const boxWidth = 150; // Width of rounded rectangle
  const boxHeight = 60; // Height of rounded rectangle
  const boxRadius = 8; // Border radius of rounded rectangle
  const headerHeight = 35; // Height of header area above box (increased for more spacing)
  const footerHeight = 30; // Height of footer area below box
  const iconSize = 20; // Size of icons

  // Calculate total dimensions
  const totalWidth = boxWidth + 40; // Add padding
  const totalHeight = headerHeight + boxHeight + footerHeight + 20;

  // Split label into lines for text wrapping
  const wrapText = (text: string, maxWidth: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      // Rough estimate: 7 pixels per character
      if (testLine.length * 7 > maxWidth) {
        if (currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          lines.push(word);
        }
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    // Limit to 3 lines
    return lines.slice(0, 3);
  };

  const labelLines = wrapText(data.label, boxWidth - 20);

  return (
    <div
      style={{
        width: totalWidth,
        height: totalHeight,
        position: 'relative',
      }}
      {...handlers}
      data-node-type={data.type}
      data-selected={selected}
      data-hovered={nodeState.hovered}
    >
      {/* Target handle (top) */}
      <Handle type="target" position={Position.Top} />

      {/* SVG container */}
      <svg
        width={totalWidth}
        height={totalHeight}
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        style={{
          overflow: 'visible',
          filter: `drop-shadow(${boxShadow})`,
          transform:
            nodeState.hovered && !nodeState.dragging
              ? 'scale(1.05)'
              : 'scale(1)',
          transition: 'transform 0.2s ease-in-out',
        }}
      >
        {/* Header area - Above the box */}
        <g transform={`translate(20, 5)`}>
          {/* Node icon (left) */}
          <g transform={`translate(0, 8)`}>
            <TypeIcon size={iconSize} color={colors.border} />
          </g>

          {/* Type label (center) */}
          <text
            x={boxWidth / 2}
            y={headerHeight - 8}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fill={colors.text}
            fontWeight="600"
            style={{
              pointerEvents: 'none',
              userSelect: 'none',
            }}
          >
            {typeName}
          </text>

          {/* Status icon (right) */}
          {StatusIcon && (
            <g transform={`translate(${boxWidth - iconSize}, 8)`}>
              <StatusIcon size={iconSize} color={colors.border} />
            </g>
          )}
        </g>

        {/* Content box */}
        <g transform={`translate(20, ${headerHeight + 5})`}>
          <rect
            x={0}
            y={0}
            width={boxWidth}
            height={boxHeight}
            rx={boxRadius}
            ry={boxRadius}
            fill="white"
            stroke={selected ? '#000' : colors.border}
            strokeWidth={selected ? 3 : 2}
          />

          {/* Node label (inside box, multi-line) */}
          {labelLines.map((line, index) => (
            <text
              key={index}
              x={boxWidth / 2}
              y={boxHeight / 2 - ((labelLines.length - 1) * 6) + index * 12}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fill="#333"
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            >
              {line}
            </text>
          ))}
        </g>

        {/* Footer area - Below the box */}
        <g transform={`translate(20, ${headerHeight + boxHeight + 10})`}>
          {/* Mini pie chart (left) */}
          {gauges.length > 0 && (
            <g transform={`translate(0, ${footerHeight / 2 - 12})`}>
              <MiniPieChart
                percentage={gauges[0].value}
                size={24}
                fillColor={gauges[0].color}
                showText={true}
              />
            </g>
          )}

          {/* Priority number (right) */}
          {data.priority && (
            <g transform={`translate(${boxWidth - 24}, ${footerHeight / 2})`}>
              <circle
                cx={12}
                cy={0}
                r={12}
                fill={colors.border}
                opacity={0.2}
              />
              <text
                x={12}
                y={0}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={14}
                fill={colors.border}
                fontWeight="bold"
                style={{
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
              >
                {data.priority}
              </text>
            </g>
          )}
        </g>
      </svg>

      {/* Source handle (bottom) */}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default UnifiedNode;

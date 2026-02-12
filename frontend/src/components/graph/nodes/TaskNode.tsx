/**
 * TaskNode Component
 * Circular node with progress indicator for task visualization
 * Displays task icon, label, and completion status
 */

import React from 'react';
import { Handle, Position } from '@xyflow/react';
import type { CustomNodeProps } from './types';
import { useNodeInteraction, useNodeStyles } from './hooks';
import { ProgressCircle } from './ProgressCircle';

/**
 * TaskNode - Circular node component for tasks
 * Features:
 * - Circular SVG shape
 * - Task icon in upper left corner
 * - Concentric circle progress indicator
 * - "done" attribute visualization
 */
export const TaskNode: React.FC<CustomNodeProps> = ({
  data,
  selected,
  dragging,
}) => {
  // Node interaction state
  const { nodeState, handlers } = useNodeInteraction(selected, dragging);

  // Node styles based on state and priority
  const { colors, boxShadow } = useNodeStyles(
    'task',
    nodeState,
    data.priority
  );

  // Calculate progress from "done" attribute
  // done = true → 100%, done = false/undefined → 0%
  const progress = data.properties?.done === true ? 100 : 0;

  // Base radius for the node circle
  const baseRadius = 32;

  // Calculate node size based on priority
  // Priority 1 = 1.5x, Priority 5 = 1.0x
  const sizeMultiplier = data.priority ? 2 - data.priority / 5 : 1.25;
  const nodeRadius = baseRadius * sizeMultiplier;
  const progressIndicatorRadius = nodeRadius + 8;

  // SVG viewBox size (needs to accommodate progress indicator)
  const viewBoxSize = (progressIndicatorRadius + 10) * 2;

  return (
    <div
      style={{
        width: viewBoxSize,
        height: viewBoxSize,
        position: 'relative',
      }}
      {...handlers}
      data-node-type="task"
      data-selected={selected}
      data-hovered={nodeState.hovered}
    >
      {/* Target handle (top) */}
      <Handle type="target" position={Position.Top} />

      {/* SVG container */}
      <svg
        width={viewBoxSize}
        height={viewBoxSize}
        viewBox={`${-viewBoxSize / 2} ${-viewBoxSize / 2} ${viewBoxSize} ${viewBoxSize}`}
        style={{
          overflow: 'visible',
          filter: `drop-shadow(${boxShadow})`,
          transform: nodeState.hovered && !nodeState.dragging ? 'scale(1.1)' : 'scale(1)',
          transition: 'transform 0.2s ease-in-out',
        }}
      >
        {/* Progress indicator (concentric circle) */}
        <ProgressCircle
          percentage={progress}
          radius={progressIndicatorRadius}
          strokeWidth={4}
          color="#388e3c"
          backgroundColor="#e0e0e0"
          animated={true}
        />

        {/* Node circle */}
        <circle
          r={nodeRadius}
          fill={colors.bg}
          stroke={selected ? '#000' : colors.border}
          strokeWidth={selected ? 3 : 2}
        />

        {/* Task icon placeholder (upper left corner) */}
        <g transform={`translate(${-nodeRadius + 8}, ${-nodeRadius + 8})`}>
          {/* Simple checkmark icon */}
          <circle r={8} fill={colors.border} opacity={0.2} />
          <path
            d="M -3,-1 L -1,2 L 4,-3"
            stroke={colors.border}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Label */}
        <text
          y={0}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={colors.text}
          fontSize={12}
          fontWeight={500}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {data.label}
        </text>
      </svg>

      {/* Source handle (bottom) */}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default TaskNode;

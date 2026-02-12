/**
 * BaseNode Component
 * Base component for custom node types with common features
 * Provides shared functionality for selection, hover states, and styling
 */

import React, { useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { CustomNodeProps } from './types';
import { NODE_COLORS, type NodeColorScheme } from './constants';

/**
 * Base styles for all custom nodes
 */
const baseNodeStyle: React.CSSProperties = {
  padding: '10px 15px',
  borderRadius: '8px',
  borderWidth: '2px',
  borderStyle: 'solid',
  minWidth: '150px',
  maxWidth: '250px',
  fontSize: '12px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  transition: 'all 0.2s ease-in-out',
  cursor: 'pointer',
};

/**
 * Props for BaseNode component
 */
export interface BaseNodeProps extends CustomNodeProps {
  /** Node type for color scheme */
  nodeType: string;
  /** Optional custom color scheme */
  colors?: NodeColorScheme;
  /** Children to render inside the node */
  children?: React.ReactNode;
  /** Whether to show handles */
  showHandles?: boolean;
  /** Custom styles to merge with base styles */
  customStyles?: React.CSSProperties;
}

/**
 * BaseNode - Reusable base component for custom nodes
 * Handles common features like selection, hover, and color schemes
 */
export const BaseNode: React.FC<BaseNodeProps> = ({
  selected,
  dragging = false,
  nodeType,
  colors: customColors,
  children,
  showHandles = true,
  customStyles = {},
}) => {
  // Local hover state
  const [hovered, setHovered] = useState(false);

  // Get color scheme
  const colors = customColors || NODE_COLORS[nodeType] || NODE_COLORS.default;

  // Handle mouse enter
  const handleMouseEnter = useCallback(() => {
    setHovered(true);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  // Calculate dynamic styles based on state
  const dynamicStyles: React.CSSProperties = {
    backgroundColor: colors.bg,
    borderColor: selected ? '#000' : colors.border,
    color: colors.text,
    transform: hovered && !dragging ? 'scale(1.05)' : 'scale(1)',
    boxShadow: selected
      ? '0 4px 12px rgba(0,0,0,0.2)'
      : hovered
      ? '0 4px 8px rgba(0,0,0,0.15)'
      : '0 2px 4px rgba(0,0,0,0.1)',
  };

  // Merge all styles
  const finalStyles: React.CSSProperties = {
    ...baseNodeStyle,
    ...dynamicStyles,
    ...customStyles,
  };

  return (
    <div
      style={finalStyles}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-node-type={nodeType}
      data-selected={selected}
      data-hovered={hovered}
    >
      {/* Target handle (top) */}
      {showHandles && <Handle type="target" position={Position.Top} />}

      {/* Node content */}
      {children}

      {/* Source handle (bottom) */}
      {showHandles && <Handle type="source" position={Position.Bottom} />}
    </div>
  );
};

export default BaseNode;

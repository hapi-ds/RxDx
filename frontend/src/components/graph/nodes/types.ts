/**
 * Type definitions for custom node components
 */

import type { NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '../../../stores/graphStore';

/**
 * Extended node data with progress and priority
 */
export interface CustomNodeData extends GraphNodeData {
  /** Progress percentage (0-100) for progress indicators */
  progress?: number;
  /** Priority level (1-5) for size scaling */
  priority?: number;
  /** Child node IDs for hierarchical progress calculation */
  children?: string[];
}

/**
 * Props for custom node components
 * Extends React Flow's NodeProps with custom data
 */
export interface CustomNodeProps extends NodeProps {
  data: CustomNodeData;
  selected: boolean;
  dragging: boolean;
}

/**
 * Node state for styling
 */
export interface NodeState {
  selected: boolean;
  hovered: boolean;
  dragging: boolean;
}

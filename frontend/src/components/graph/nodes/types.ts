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
  /** Node status for status icon display */
  status?: string;
  /** Gauge definitions for dial-type gauges */
  gauges?: GaugeDefinition[];
}

/**
 * Definition for a dial-type gauge indicator
 * Renders as a circular arc around the node
 */
export interface GaugeDefinition {
  /** Unique identifier for the gauge */
  id: string;
  /** Label for tooltip display */
  label: string;
  /** Current value */
  value: number;
  /** Minimum value */
  min: number;
  /** Maximum value */
  max: number;
  /** Start angle in degrees (0 = top) */
  startAngle: number;
  /** End angle in degrees */
  endAngle: number;
  /** Gauge color */
  color: string;
  /** Whether to show numeric value */
  showValue: boolean;
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

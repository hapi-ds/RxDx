/**
 * Utility functions for custom node components
 */

import { NODE_COLORS, type NodeColorScheme } from './constants';

/**
 * Get color scheme for a node type
 * Falls back to default if type not found
 */
export const getNodeColors = (nodeType: string): NodeColorScheme => {
  return NODE_COLORS[nodeType] || NODE_COLORS.default;
};

/**
 * Calculate node size based on priority
 * Formula: base_size × (2 - priority/5)
 * Priority 1 = 1.5x base size, Priority 5 = 1.0x base size
 */
export const calculateNodeSize = (
  baseSize: number,
  priority?: number
): number => {
  if (priority === undefined || priority < 1 || priority > 5) {
    return baseSize;
  }
  return baseSize * (2 - priority / 5);
};

/**
 * Get border width based on selection state
 */
export const getBorderWidth = (selected: boolean): number => {
  return selected ? 3 : 2;
};

/**
 * Get shadow style based on node state
 */
export const getShadowStyle = (
  selected: boolean,
  hovered: boolean
): string => {
  if (selected) {
    return '0 4px 12px rgba(0,0,0,0.2)';
  }
  if (hovered) {
    return '0 4px 8px rgba(0,0,0,0.15)';
  }
  return '0 2px 4px rgba(0,0,0,0.1)';
};

/**
 * Get transform scale based on hover state
 * Increases size by 10% on hover
 */
export const getHoverScale = (hovered: boolean, dragging: boolean): string => {
  if (dragging) {
    return 'scale(1)';
  }
  return hovered ? 'scale(1.1)' : 'scale(1)';
};

/**
 * Validate priority value
 * Returns clamped value between 1 and 5
 */
export const validatePriority = (priority?: number): number | undefined => {
  if (priority === undefined) {
    return undefined;
  }
  return Math.max(1, Math.min(5, priority));
};

/**
 * Validate progress value
 * Returns clamped value between 0 and 100
 */
export const validateProgress = (progress?: number): number | undefined => {
  if (progress === undefined) {
    return undefined;
  }
  return Math.max(0, Math.min(100, progress));
};

/**
 * Custom hooks for node components
 */

import { useState, useCallback, useMemo } from 'react';
import type { NodeState } from './types';
import {
  getNodeColors,
  calculateNodeSize,
  getBorderWidth,
  getShadowStyle,
  getHoverScale,
} from './utils';
import type { NodeColorScheme } from './constants';

/**
 * Hook for managing node interaction state
 * Handles hover, selection, and dragging states
 */
export const useNodeInteraction = (
  selected: boolean,
  dragging?: boolean
): {
  nodeState: NodeState;
  handlers: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
} => {
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHovered(false);
  }, []);

  const nodeState: NodeState = useMemo(
    () => ({
      selected,
      hovered,
      dragging: dragging || false,
    }),
    [selected, hovered, dragging]
  );

  return {
    nodeState,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
};

/**
 * Hook for computing node styles based on state
 */
export const useNodeStyles = (
  nodeType: string,
  nodeState: NodeState,
  priority?: number,
  customColors?: NodeColorScheme
): {
  colors: NodeColorScheme;
  borderWidth: number;
  boxShadow: string;
  transform: string;
  size: number;
} => {
  const colors = useMemo(
    () => customColors || getNodeColors(nodeType),
    [nodeType, customColors]
  );

  const borderWidth = useMemo(
    () => getBorderWidth(nodeState.selected),
    [nodeState.selected]
  );

  const boxShadow = useMemo(
    () => getShadowStyle(nodeState.selected, nodeState.hovered),
    [nodeState.selected, nodeState.hovered]
  );

  const transform = useMemo(
    () => getHoverScale(nodeState.hovered, nodeState.dragging),
    [nodeState.hovered, nodeState.dragging]
  );

  const size = useMemo(
    () => calculateNodeSize(150, priority), // 150px base size
    [priority]
  );

  return {
    colors,
    borderWidth,
    boxShadow,
    transform,
    size,
  };
};

/**
 * Hook for managing node progress state
 * Can be used for progress indicators
 */
export const useNodeProgress = (
  progress?: number
): {
  percentage: number;
  isComplete: boolean;
  displayText: string;
} => {
  const percentage = useMemo(() => {
    if (progress === undefined) return 0;
    return Math.max(0, Math.min(100, progress));
  }, [progress]);

  const isComplete = useMemo(() => percentage === 100, [percentage]);

  const displayText = useMemo(
    () => `${percentage.toFixed(0)}%`,
    [percentage]
  );

  return {
    percentage,
    isComplete,
    displayText,
  };
};

/**
 * Hook for managing connected node highlighting
 * Returns whether the node should be highlighted based on hover state
 */
export const useConnectedHighlight = (
  nodeId: string,
  hoveredNodeId: string | null,
  connectedNodeIds: string[]
): {
  isHighlighted: boolean;
  isDimmed: boolean;
} => {
  const isHighlighted = useMemo(() => {
    if (!hoveredNodeId) return false;
    return nodeId === hoveredNodeId || connectedNodeIds.includes(hoveredNodeId);
  }, [nodeId, hoveredNodeId, connectedNodeIds]);

  const isDimmed = useMemo(() => {
    if (!hoveredNodeId) return false;
    return !isHighlighted;
  }, [hoveredNodeId, isHighlighted]);

  return {
    isHighlighted,
    isDimmed,
  };
};

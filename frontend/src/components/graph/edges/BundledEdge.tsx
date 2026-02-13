/**
 * BundledEdge Component
 * Renders a bundle of similar edges as a single thick path
 * Highlights all edges in the bundle on hover
 * 
 * References: Requirement 10 (Edge Bundling)
 */

import React, { useState } from 'react';
import { BaseEdge, type EdgeProps } from '@xyflow/react';
import type { EdgeBundle } from '../../../services/EdgeBundler';

export interface BundledEdgeProps extends EdgeProps {
  /** The edge bundle containing this edge */
  bundle: EdgeBundle;
  /** Callback when bundle is hovered */
  onBundleHover?: (edgeIds: string[], isHovered: boolean) => void;
  /** Whether this bundle is currently highlighted */
  isHighlighted?: boolean;
}

/**
 * BundledEdge - Renders a bundle of similar edges
 * Shows all edges in the bundle as a single thick path
 * Highlights on hover to show which edges are bundled together
 */
export const BundledEdge: React.FC<BundledEdgeProps> = ({
  id,
  bundle,
  onBundleHover,
  isHighlighted = false,
  selected,
  style,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (onBundleHover) {
      const edgeIds = bundle.edges.map((e) => e.id);
      onBundleHover(edgeIds, true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (onBundleHover) {
      const edgeIds = bundle.edges.map((e) => e.id);
      onBundleHover(edgeIds, false);
    }
  };

  // Determine stroke color based on state
  const getStrokeColor = (): string => {
    if (selected) return '#1976d2';
    if (isHovered || isHighlighted) return '#ff9800'; // Orange for highlight
    return '#9e9e9e';
  };

  // Determine stroke width based on state
  const getStrokeWidth = (): number => {
    if (isHovered || isHighlighted) return bundle.width + 2;
    return bundle.width;
  };

  // Determine opacity based on state
  const getOpacity = (): number => {
    if (isHovered || isHighlighted) return 1.0;
    return 0.6;
  };

  const edgeStyle = {
    stroke: getStrokeColor(),
    strokeWidth: getStrokeWidth(),
    opacity: getOpacity(),
    transition: 'all 200ms ease-in-out',
    cursor: 'pointer',
    ...style,
  };

  return (
    <g
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ pointerEvents: 'all' }}
    >
      {/* Invisible wider path for easier hover detection */}
      <path
        d={bundle.path}
        fill="none"
        stroke="transparent"
        strokeWidth={bundle.width + 10}
        style={{ pointerEvents: 'stroke' }}
      />

      {/* Visible bundle path */}
      <BaseEdge id={id} path={bundle.path} style={edgeStyle} />

      {/* Show edge count badge when hovered */}
      {(isHovered || isHighlighted) && bundle.controlPoints.length >= 2 && (
        <g>
          {/* Position badge at the midpoint */}
          <circle
            cx={bundle.controlPoints[1]?.x ?? bundle.controlPoints[0].x}
            cy={bundle.controlPoints[1]?.y ?? bundle.controlPoints[0].y}
            r={12}
            fill="#ff9800"
            stroke="white"
            strokeWidth={2}
          />
          <text
            x={bundle.controlPoints[1]?.x ?? bundle.controlPoints[0].x}
            y={(bundle.controlPoints[1]?.y ?? bundle.controlPoints[0].y) + 4}
            textAnchor="middle"
            fontSize={10}
            fontWeight="bold"
            fill="white"
          >
            {bundle.edges.length}
          </text>
        </g>
      )}
    </g>
  );
};

export default BundledEdge;

/**
 * ArrowMarkers Component
 * SVG marker definitions for directional arrows on edges
 * 
 * References: Requirement 8 (Directional Edge Arrows)
 */

import React from 'react';

export interface ArrowMarkersProps {
  /** Default arrow color */
  defaultColor?: string;
  /** Selected arrow color */
  selectedColor?: string;
}

/**
 * ArrowMarkers - Defines SVG markers for edge arrows
 * Creates reusable arrow markers that can be referenced by edges
 * Includes both default and selected state markers
 */
export const ArrowMarkers: React.FC<ArrowMarkersProps> = ({
  defaultColor = '#9e9e9e',
  selectedColor = '#1976d2',
}) => {
  return (
    <defs>
      {/* Default arrow marker */}
      <marker
        id="arrow-default"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <path
          d="M 0 0 L 10 5 L 0 10 z"
          fill={defaultColor}
          stroke="none"
        />
      </marker>

      {/* Selected arrow marker */}
      <marker
        id="arrow-selected"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto"
        markerUnits="userSpaceOnUse"
      >
        <path
          d="M 0 0 L 10 5 L 0 10 z"
          fill={selectedColor}
          stroke="none"
        />
      </marker>
    </defs>
  );
};

export default ArrowMarkers;

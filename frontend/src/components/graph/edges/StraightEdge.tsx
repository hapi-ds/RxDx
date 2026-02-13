/**
 * StraightEdge Component
 * Custom edge component that renders straight lines between nodes
 * Calculates proper connection points on rounded rectangle node boundaries
 * Includes directional arrows positioned at target node boundary
 * 
 * References: Requirements 6, 7, 8, 9 (Straight Edge Rendering, Connection Points, Arrows, Labels)
 */

import React from 'react';
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import {
  calculateNodeBoundaryIntersection,
  calculateEdgeThickness,
} from './edgeUtils';

export interface StraightEdgeProps extends EdgeProps {
  /** Edge label text */
  label?: React.ReactNode;
  /** Edge thickness (default: calculated from weight) */
  strokeWidth?: number;
  /** Edge color (default: #9e9e9e) */
  stroke?: string;
  /** Whether edge is animated */
  animated?: boolean;
  /** Edge weight for thickness calculation (1-5, default: 1) */
  weight?: number;
  /** Total number of edges in the graph (for density detection) */
  totalEdgeCount?: number;
}

/**
 * StraightEdge - Renders a straight line between nodes
 * Calculates proper connection points on rounded rectangle node boundaries
 * Includes directional arrow positioned at target node boundary
 */
export const StraightEdge: React.FC<StraightEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  label,
  strokeWidth,
  stroke = '#9e9e9e',
  selected,
  weight,
  totalEdgeCount,
  style,
  data,
}) => {
  // Extract weight from edge data if not provided as prop
  const edgeWeight = weight ?? (data as any)?.weight;
  
  // Extract totalEdgeCount from edge data if not provided as prop
  const edgeCount = totalEdgeCount ?? (data as any)?.totalEdgeCount;
  
  // Calculate thickness from weight if strokeWidth not explicitly provided
  const calculatedThickness = strokeWidth ?? calculateEdgeThickness(edgeWeight);
  
  // Determine if graph is dense (>100 edges)
  const isDenseGraph = edgeCount !== undefined && edgeCount > 100;
  
  // Hide label for thin edges (<3px) in dense graphs (Requirement 9)
  const shouldShowLabel = label && (!isDenseGraph || calculatedThickness >= 3);
  
  // Calculate node centers from handle positions
  // React Flow provides sourceX/sourceY (source handle at bottom) and targetX/targetY (target handle at top)
  // Node structure: headerHeight(35) + boxHeight(60) + footerHeight(30) + padding(20) = 145px total
  // Source handle is at bottom, so node center is 72.5px above it
  // Target handle is at top, so node center is 72.5px below it
  const NODE_HALF_HEIGHT = 72.5; // Half of total node height (145px / 2)
  
  const sourceCenterX = sourceX;
  const sourceCenterY = sourceY - NODE_HALF_HEIGHT; // Source handle is at bottom
  
  const targetCenterX = targetX;
  const targetCenterY = targetY + NODE_HALF_HEIGHT; // Target handle is at top
  
  // Calculate connection points on node boundaries
  // Nodes use rounded rectangle content boxes (150px × 60px)
  
  // For source node: find where the line exits the source boundary
  // The line goes FROM source center TOWARDS target center
  const [adjustedSourceX, adjustedSourceY] = calculateNodeBoundaryIntersection(
    sourceCenterX,      // Rectangle center (source node)
    sourceCenterY,
    targetCenterX,      // Direction point: towards target center
    targetCenterY,
    sourceCenterX,      // Line starts from source center
    sourceCenterY
  );

  // For target node: find where the line enters the target boundary
  // The line goes FROM source center TOWARDS target center
  const [adjustedTargetX, adjustedTargetY] = calculateNodeBoundaryIntersection(
    targetCenterX,      // Rectangle center (target node)
    targetCenterY,
    targetCenterX,      // Direction point: towards target center
    targetCenterY,
    sourceCenterX,      // Line starts from source center
    sourceCenterY
  );

  // Create straight line path from boundary to boundary
  const path = `M ${adjustedSourceX},${adjustedSourceY} L ${adjustedTargetX},${adjustedTargetY}`;

  // Calculate midpoint for label positioning
  const labelX = (adjustedSourceX + adjustedTargetX) / 2;
  const labelY = (adjustedSourceY + adjustedTargetY) / 2;

  // Generate unique marker IDs for this edge
  const markerId = `arrow-${id}`;
  const markerIdSelected = `arrow-${id}-selected`;
  
  // Determine which marker to use based on selection state
  const currentMarkerId = selected ? markerIdSelected : markerId;
  const currentColor = selected ? '#1976d2' : stroke;

  // Edge style
  const edgeStyle = {
    stroke: currentColor,
    strokeWidth: selected ? calculatedThickness + 1 : calculatedThickness,
    ...style,
  };

  return (
    <>
      {/* SVG marker definitions for directional arrows (Requirement 8.1) */}
      <defs>
        {/* Normal arrow marker - 8-pixel size (Requirement 8.4) */}
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill={stroke}
          />
        </marker>
        
        {/* Selected arrow marker - 8-pixel size with selection color (Requirement 8.5) */}
        <marker
          id={markerIdSelected}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill="#1976d2"
          />
        </marker>
      </defs>

      {/* Render the straight edge path with arrow marker (Requirement 8.2, 8.3) */}
      <BaseEdge
        id={id}
        path={path}
        style={edgeStyle}
        markerEnd={`url(#${currentMarkerId})`}
      />

      {/* Render edge label if provided */}
      {shouldShowLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              fontSize: '12px',
              fontWeight: 500,
              background: 'white',
              padding: '2px 6px',
              borderRadius: '3px',
              border: '1px solid #e0e0e0',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default StraightEdge;

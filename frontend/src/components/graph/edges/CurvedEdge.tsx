/**
 * CurvedEdge Component
 * Custom edge component that renders smooth Bezier curves
 * Supports multiple edges between same nodes with offset curves
 * Includes directional arrows positioned 10 pixels from target node
 * 
 * References: Requirements 6, 7, 8, 9 (Curved Edge Rendering, Connection Points, Arrows, Labels)
 */

import React from 'react';
import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import {
  calculateControlPoint,
  createBezierPath,
  getBezierMidpoint,
  calculateEdgeOffset,
  getCircleIntersection,
  getArrowPosition,
  calculateEdgeThickness,
  adjustLabelPosition,
} from './edgeUtils';

export interface CurvedEdgeProps extends EdgeProps {
  /** Edge label text */
  label?: React.ReactNode;
  /** Edge thickness (default: calculated from weight) */
  strokeWidth?: number;
  /** Edge color (default: #9e9e9e) */
  stroke?: string;
  /** Whether edge is animated */
  animated?: boolean;
  /** Index of this edge among parallel edges (for offset calculation) */
  edgeIndex?: number;
  /** Total number of edges between these nodes */
  totalParallelEdges?: number;
  /** Edge weight for thickness calculation (1-5, default: 1) */
  weight?: number;
  /** Total number of edges in the graph (for density detection) */
  totalEdgeCount?: number;
}

// Node dimensions based on UnifiedNode component
// The circular background has a radius that encompasses the entire node
const NODE_CIRCLE_RADIUS = 95; // Radius of the circular background

/**
 * CurvedEdge - Renders a smooth quadratic Bezier curve between nodes
 * Automatically handles multiple edges between the same nodes by offsetting curves
 * Calculates proper connection points on node perimeters
 * Includes directional arrow positioned 10 pixels from target node
 */
export const CurvedEdge: React.FC<CurvedEdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  strokeWidth,
  stroke = '#9e9e9e',
  selected,
  edgeIndex = 0,
  totalParallelEdges = 1,
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
  
  // Calculate offset for multiple edges between same nodes
  const offset = calculateEdgeOffset(edgeIndex, totalParallelEdges);

  // Calculate connection points on node perimeters
  // All nodes use circular backgrounds, so we use circle intersection
  const [adjustedSourceX, adjustedSourceY] = getCircleIntersection(
    sourceX,
    sourceY,
    NODE_CIRCLE_RADIUS,
    targetX,
    targetY,
    sourceX,
    sourceY
  );

  const [adjustedTargetX, adjustedTargetY] = getCircleIntersection(
    targetX,
    targetY,
    NODE_CIRCLE_RADIUS,
    sourceX,
    sourceY,
    targetX,
    targetY
  );

  // Calculate control point for Bezier curve using adjusted connection points
  const [controlX, controlY] = calculateControlPoint(
    adjustedSourceX,
    adjustedSourceY,
    adjustedTargetX,
    adjustedTargetY,
    sourcePosition,
    targetPosition,
    offset
  );

  // Create Bezier path with adjusted connection points
  const path = createBezierPath(
    adjustedSourceX,
    adjustedSourceY,
    adjustedTargetX,
    adjustedTargetY,
    controlX,
    controlY
  );

  // Calculate arrow position (10 pixels from target node)
  const [arrowX, arrowY, arrowAngle] = getArrowPosition(
    adjustedSourceX,
    adjustedSourceY,
    adjustedTargetX,
    adjustedTargetY,
    controlX,
    controlY,
    10 // 10 pixels from target node
  );

  // Calculate midpoint for label positioning
  const [initialLabelX, initialLabelY] = getBezierMidpoint(
    adjustedSourceX,
    adjustedSourceY,
    adjustedTargetX,
    adjustedTargetY,
    controlX,
    controlY
  );
  
  // Adjust label position to avoid overlapping with nodes (Requirement 9)
  const [labelX, labelY] = adjustLabelPosition(
    initialLabelX,
    initialLabelY,
    adjustedSourceX,
    adjustedSourceY,
    adjustedTargetX,
    adjustedTargetY,
    controlX,
    controlY,
    NODE_CIRCLE_RADIUS
  );

  // Edge style
  const edgeStyle = {
    stroke: selected ? '#1976d2' : stroke,
    strokeWidth: selected ? calculatedThickness + 1 : calculatedThickness,
    ...style,
  };

  return (
    <>
      {/* Render the curved edge path */}
      <BaseEdge
        id={id}
        path={path}
        style={edgeStyle}
      />

      {/* Render directional arrow (8-pixel size) */}
      <g transform={`translate(${arrowX}, ${arrowY}) rotate(${(arrowAngle * 180) / Math.PI})`}>
        <path
          d="M 0 0 L 8 4 L 0 8 z"
          fill={selected ? '#1976d2' : stroke}
          stroke="none"
          transform="translate(-8, -4)"
        />
      </g>

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

export default CurvedEdge;

/**
 * Edge Utilities
 * Utility functions for edge rendering calculations
 * 
 * References: Requirements 6, 7 (Curved Edge Rendering, Edge Connection Points)
 */

import type { Position } from '@xyflow/react';

/**
 * Calculate control point for quadratic Bezier curve
 * Creates a smooth curve by placing the control point perpendicular to the midpoint
 * 
 * @param sourceX - Source node X coordinate
 * @param sourceY - Source node Y coordinate
 * @param targetX - Target node X coordinate
 * @param targetY - Target node Y coordinate
 * @param sourcePosition - Source handle position (top, right, bottom, left)
 * @param targetPosition - Target handle position (top, right, bottom, left)
 * @param offset - Optional offset for multiple edges between same nodes (default: 0)
 * @returns Tuple of [controlX, controlY]
 */
export function calculateControlPoint(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  _sourcePosition: Position,
  _targetPosition: Position,
  offset: number = 0
): [number, number] {
  // Calculate midpoint
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  // Calculate direction vector
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Avoid division by zero for overlapping nodes
  if (length === 0) {
    return [midX, midY];
  }

  // Calculate perpendicular vector (rotate 90 degrees)
  const perpX = -dy / length;
  const perpY = dx / length;

  // Base offset is 20% of edge length for natural curve
  const baseOffset = length * 0.2;
  
  // Add additional offset for multiple edges
  const totalOffset = baseOffset + offset;

  // Control point offset from midpoint
  const controlX = midX + perpX * totalOffset;
  const controlY = midY + perpY * totalOffset;

  return [controlX, controlY];
}

/**
 * Calculate the path string for a quadratic Bezier curve
 * 
 * @param sourceX - Source node X coordinate
 * @param sourceY - Source node Y coordinate
 * @param targetX - Target node X coordinate
 * @param targetY - Target node Y coordinate
 * @param controlX - Control point X coordinate
 * @param controlY - Control point Y coordinate
 * @returns SVG path string
 */
export function createBezierPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  controlX: number,
  controlY: number
): string {
  return `M ${sourceX},${sourceY} Q ${controlX},${controlY} ${targetX},${targetY}`;
}

/**
 * Calculate the midpoint of a quadratic Bezier curve
 * Used for label positioning
 * 
 * @param sourceX - Source node X coordinate
 * @param sourceY - Source node Y coordinate
 * @param targetX - Target node X coordinate
 * @param targetY - Target node Y coordinate
 * @param controlX - Control point X coordinate
 * @param controlY - Control point Y coordinate
 * @returns Tuple of [midX, midY]
 */
export function getBezierMidpoint(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  controlX: number,
  controlY: number
): [number, number] {
  // For quadratic Bezier, the midpoint at t=0.5 is:
  // B(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2
  const t = 0.5;
  const oneMinusT = 1 - t;
  
  const midX = oneMinusT * oneMinusT * sourceX + 
               2 * oneMinusT * t * controlX + 
               t * t * targetX;
  
  const midY = oneMinusT * oneMinusT * sourceY + 
               2 * oneMinusT * t * controlY + 
               t * t * targetY;

  return [midX, midY];
}

/**
 * Calculate offset for multiple edges between the same nodes
 * Distributes edges evenly on both sides of the direct line
 * 
 * @param edgeIndex - Index of this edge among parallel edges (0-based)
 * @param totalEdges - Total number of edges between these nodes
 * @returns Offset value in pixels
 */
export function calculateEdgeOffset(
  edgeIndex: number,
  totalEdges: number
): number {
  if (totalEdges <= 1) {
    return 0;
  }

  // Distribute edges evenly: -spacing, 0, +spacing for 3 edges
  const spacing = 30; // pixels between parallel edges
  const center = (totalEdges - 1) / 2;
  const offset = (edgeIndex - center) * spacing;

  return offset;
}

/**
 * Get the angle of the tangent at a point on a quadratic Bezier curve
 * Used for arrow orientation
 * 
 * @param sourceX - Source node X coordinate
 * @param sourceY - Source node Y coordinate
 * @param targetX - Target node X coordinate
 * @param targetY - Target node Y coordinate
 * @param controlX - Control point X coordinate
 * @param controlY - Control point Y coordinate
 * @param t - Parameter value (0 to 1) along the curve
 * @returns Angle in radians
 */
export function getBezierTangentAngle(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  controlX: number,
  controlY: number,
  t: number
): number {
  // Derivative of quadratic Bezier: B'(t) = 2(1-t)(P1-P0) + 2t(P2-P1)
  const oneMinusT = 1 - t;
  
  const dx = 2 * oneMinusT * (controlX - sourceX) + 2 * t * (targetX - controlX);
  const dy = 2 * oneMinusT * (controlY - sourceY) + 2 * t * (targetY - controlY);

  return Math.atan2(dy, dx);
}

/**
 * Calculate a point on a quadratic Bezier curve at parameter t
 * 
 * @param sourceX - Source node X coordinate
 * @param sourceY - Source node Y coordinate
 * @param targetX - Target node X coordinate
 * @param targetY - Target node Y coordinate
 * @param controlX - Control point X coordinate
 * @param controlY - Control point Y coordinate
 * @param t - Parameter value (0 to 1) along the curve
 * @returns Tuple of [x, y]
 */
export function getPointOnBezier(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  controlX: number,
  controlY: number,
  t: number
): [number, number] {
  const oneMinusT = 1 - t;
  
  const x = oneMinusT * oneMinusT * sourceX + 
            2 * oneMinusT * t * controlX + 
            t * t * targetX;
  
  const y = oneMinusT * oneMinusT * sourceY + 
            2 * oneMinusT * t * controlY + 
            t * t * targetY;

  return [x, y];
}

/**
 * Calculate the intersection point of a line with a circle's perimeter
 * 
 * The line is defined by a point (lineX, lineY) and a direction towards (targetX, targetY).
 * The circle is centered at (centerX, centerY) with the given radius.
 * 
 * @param centerX - Circle center X coordinate
 * @param centerY - Circle center Y coordinate
 * @param radius - Circle radius
 * @param lineX - Starting point X of the line (typically the other node's center)
 * @param lineY - Starting point Y of the line
 * @param targetX - Direction point X (typically this node's center) - unused but kept for API consistency
 * @param targetY - Direction point Y - unused but kept for API consistency
 * @returns Tuple of [x, y] representing the intersection point on the circle perimeter
 */
export function getCircleIntersection(
  centerX: number,
  centerY: number,
  radius: number,
  lineX: number,
  lineY: number,
  targetX: number,
  targetY: number
): [number, number] {
  // Note: targetX and targetY are unused but kept for API consistency with other intersection functions
  void targetX;
  void targetY;
  
  // Calculate direction vector from line point towards the circle center
  // This gives us the direction the edge is coming from
  const dx = centerX - lineX;
  const dy = centerY - lineY;
  const length = Math.sqrt(dx * dx + dy * dy);

  // Handle edge case: overlapping points
  if (length === 0) {
    return [centerX + radius, centerY];
  }

  // Normalize direction vector
  const dirX = dx / length;
  const dirY = dy / length;

  // Calculate intersection point on circle perimeter
  // The intersection is at center - radius * direction (pointing outward from center towards line point)
  const intersectionX = centerX - dirX * radius;
  const intersectionY = centerY - dirY * radius;

  return [intersectionX, intersectionY];
}

/**
 * Calculate the intersection point of a line with a rectangle's perimeter
 * 
 * The line is defined by a point (lineX, lineY) and a direction towards (targetX, targetY).
 * The rectangle is centered at (centerX, centerY) with the given width and height.
 * 
 * @param centerX - Rectangle center X coordinate
 * @param centerY - Rectangle center Y coordinate
 * @param width - Rectangle width
 * @param height - Rectangle height
 * @param lineX - Starting point X of the line (typically the other node's center)
 * @param lineY - Starting point Y of the line
 * @param targetX - Direction point X (typically this node's center)
 * @param targetY - Direction point Y
 * @returns Tuple of [x, y] representing the intersection point on the rectangle perimeter
 */
export function getRectangleIntersection(
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  lineX: number,
  lineY: number,
  targetX: number,
  targetY: number
): [number, number] {
  // Calculate direction vector from line point to target
  const dx = targetX - lineX;
  const dy = targetY - lineY;

  // Handle edge case: overlapping points
  if (dx === 0 && dy === 0) {
    return [centerX + width / 2, centerY];
  }

  // Calculate rectangle bounds
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const top = centerY - height / 2;
  const bottom = centerY + height / 2;

  // Calculate the parametric line equation: P = (lineX, lineY) + t * (dx, dy)
  // Find intersections with all four sides and choose the closest one in the direction of the target

  let minT = Infinity;
  let intersectionX = centerX;
  let intersectionY = centerY;

  // Check intersection with left edge (x = left)
  if (dx !== 0) {
    const t = (left - lineX) / dx;
    const y = lineY + t * dy;
    if (t > 0 && y >= top && y <= bottom && t < minT) {
      minT = t;
      intersectionX = left;
      intersectionY = y;
    }
  }

  // Check intersection with right edge (x = right)
  if (dx !== 0) {
    const t = (right - lineX) / dx;
    const y = lineY + t * dy;
    if (t > 0 && y >= top && y <= bottom && t < minT) {
      minT = t;
      intersectionX = right;
      intersectionY = y;
    }
  }

  // Check intersection with top edge (y = top)
  if (dy !== 0) {
    const t = (top - lineY) / dy;
    const x = lineX + t * dx;
    if (t > 0 && x >= left && x <= right && t < minT) {
      minT = t;
      intersectionX = x;
      intersectionY = top;
    }
  }

  // Check intersection with bottom edge (y = bottom)
  if (dy !== 0) {
    const t = (bottom - lineY) / dy;
    const x = lineX + t * dx;
    if (t > 0 && x >= left && x <= right && t < minT) {
      minT = t;
      intersectionX = x;
      intersectionY = bottom;
    }
  }

  return [intersectionX, intersectionY];
}

/**
 * Calculate the intersection point of a line with a polygon's perimeter
 * 
 * The line is defined by a point (lineX, lineY) and a direction towards (targetX, targetY).
 * The polygon is defined by an array of vertices in clockwise or counter-clockwise order.
 * 
 * @param vertices - Array of [x, y] tuples defining the polygon vertices
 * @param lineX - Starting point X of the line (typically the other node's center)
 * @param lineY - Starting point Y of the line
 * @param targetX - Direction point X (typically this node's center)
 * @param targetY - Direction point Y
 * @returns Tuple of [x, y] representing the intersection point on the polygon perimeter
 */
export function getPolygonIntersection(
  vertices: Array<[number, number]>,
  lineX: number,
  lineY: number,
  targetX: number,
  targetY: number
): [number, number] {
  // Calculate direction vector from line point to target
  const dx = targetX - lineX;
  const dy = targetY - lineY;

  // Handle edge case: overlapping points or no vertices
  if ((dx === 0 && dy === 0) || vertices.length < 3) {
    return vertices.length > 0 ? vertices[0] : [lineX, lineY];
  }

  // Find the closest intersection with any edge of the polygon
  let minT = Infinity;
  let intersectionX = vertices[0][0];
  let intersectionY = vertices[0][1];

  // Check each edge of the polygon
  for (let i = 0; i < vertices.length; i++) {
    const [x1, y1] = vertices[i];
    const [x2, y2] = vertices[(i + 1) % vertices.length]; // Wrap around to first vertex

    // Calculate intersection of line with edge using parametric equations
    // Line: P = (lineX, lineY) + t * (dx, dy)
    // Edge: Q = (x1, y1) + s * (x2 - x1, y2 - y1)
    // Solve for t and s where P = Q

    const edgeDx = x2 - x1;
    const edgeDy = y2 - y1;

    // Calculate determinant
    const det = dx * edgeDy - dy * edgeDx;

    // Skip parallel edges
    if (Math.abs(det) < 1e-10) {
      continue;
    }

    // Calculate parameters
    const t = ((x1 - lineX) * edgeDy - (y1 - lineY) * edgeDx) / det;
    const s = ((x1 - lineX) * dy - (y1 - lineY) * dx) / det;

    // Check if intersection is valid (on the edge and in the direction of the target)
    if (t > 0 && s >= 0 && s <= 1 && t < minT) {
      minT = t;
      intersectionX = lineX + t * dx;
      intersectionY = lineY + t * dy;
    }
  }

  return [intersectionX, intersectionY];
}

/**
 * Calculate edge thickness based on weight
 * Formula: 2 + (weight - 1) pixels, max 6px
 * 
 * @param weight - Edge weight (1-5, default: 1)
 * @returns Edge thickness in pixels (2-6)
 */
export function calculateEdgeThickness(weight?: number): number {
  // Default weight is 1 if not provided
  const w = weight ?? 1;
  
  // Clamp weight to valid range (1-5)
  const clampedWeight = Math.max(1, Math.min(5, w));
  
  // Calculate thickness: 2 + (weight - 1)
  const thickness = 2 + (clampedWeight - 1);
  
  // Ensure max thickness of 6px
  return Math.min(6, thickness);
}

/**
 * Calculate the position for an arrow marker along a Bezier curve
 * Positions the arrow at a specified distance from the target node
 * 
 * @param sourceX - Source node X coordinate
 * @param sourceY - Source node Y coordinate
 * @param targetX - Target node X coordinate
 * @param targetY - Target node Y coordinate
 * @param controlX - Control point X coordinate
 * @param controlY - Control point Y coordinate
 * @param distanceFromTarget - Distance in pixels from target node (default: 10)
 * @returns Tuple of [x, y, angle] where angle is in radians for arrow orientation
 */
export function getArrowPosition(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  controlX: number,
  controlY: number,
  distanceFromTarget: number = 10
): [number, number, number] {
  // Calculate the total length of the curve (approximate)
  const segments = 20;
  let totalLength = 0;
  let prevX = sourceX;
  let prevY = sourceY;

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const [x, y] = getPointOnBezier(sourceX, sourceY, targetX, targetY, controlX, controlY, t);
    const dx = x - prevX;
    const dy = y - prevY;
    totalLength += Math.sqrt(dx * dx + dy * dy);
    prevX = x;
    prevY = y;
  }

  // Calculate the target length (total length minus distance from target)
  const targetLength = Math.max(0, totalLength - distanceFromTarget);

  // Find the parameter t that corresponds to this length
  let currentLength = 0;
  prevX = sourceX;
  prevY = sourceY;
  let arrowT = 1.0;

  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const [x, y] = getPointOnBezier(sourceX, sourceY, targetX, targetY, controlX, controlY, t);
    const dx = x - prevX;
    const dy = y - prevY;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);
    
    if (currentLength + segmentLength >= targetLength) {
      // Interpolate within this segment
      const remaining = targetLength - currentLength;
      const ratio = segmentLength > 0 ? remaining / segmentLength : 0;
      arrowT = (i - 1) / segments + ratio / segments;
      break;
    }
    
    currentLength += segmentLength;
    prevX = x;
    prevY = y;
  }

  // Get the position and angle at the calculated parameter
  const [arrowX, arrowY] = getPointOnBezier(
    sourceX,
    sourceY,
    targetX,
    targetY,
    controlX,
    controlY,
    arrowT
  );

  const angle = getBezierTangentAngle(
    sourceX,
    sourceY,
    targetX,
    targetY,
    controlX,
    controlY,
    arrowT
  );

  return [arrowX, arrowY, angle];
}

/**
 * Calculate intersection point of line with node boundary (rounded rectangle)
 * This is a specialized function for node boundaries with exact dimensions (150px × 60px)
 * 
 * The node uses a rounded rectangle content box with these dimensions.
 * This function calculates which edge (top, bottom, left, right) the line intersects first
 * and returns the exact intersection point on the rectangle perimeter.
 * 
 * @param centerX - Node center X coordinate
 * @param centerY - Node center Y coordinate
 * @param targetX - Direction point X (typically the other node's center)
 * @param targetY - Direction point Y
 * @param lineX - Starting point X of the line (typically the other node's center)
 * @param lineY - Starting point Y of the line
 * @returns Tuple of [x, y] representing the intersection point on the node boundary
 */
export function calculateNodeBoundaryIntersection(
  centerX: number,
  centerY: number,
  targetX: number,
  targetY: number,
  lineX: number,
  lineY: number
): [number, number] {
  // Node dimensions from UnifiedNode component (Requirement 7.2)
  // The content box is a rounded rectangle with these exact dimensions
  const NODE_BOX_WIDTH = 150;
  const NODE_BOX_HEIGHT = 60;
  
  return getRectangleIntersection(
    centerX,
    centerY,
    NODE_BOX_WIDTH,
    NODE_BOX_HEIGHT,
    lineX,
    lineY,
    targetX,
    targetY
  );
}

/**
 * Check if a point is inside a circle (node)
 * @param pointX - X coordinate of the point
 * @param pointY - Y coordinate of the point
 * @param nodeX - X coordinate of the node center
 * @param nodeY - Y coordinate of the node center
 * @param nodeRadius - Radius of the node
 * @returns True if the point is inside the node
 */
export function isPointInNode(
  pointX: number,
  pointY: number,
  nodeX: number,
  nodeY: number,
  nodeRadius: number
): boolean {
  const dx = pointX - nodeX;
  const dy = pointY - nodeY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < nodeRadius;
}

/**
 * Adjust label position to avoid overlapping with nodes
 * Moves the label along the edge curve if it would overlap with a node
 * @param labelX - Original label X position
 * @param labelY - Original label Y position
 * @param sourceX - Source node X position
 * @param sourceY - Source node Y position
 * @param targetX - Target node X position
 * @param targetY - Target node Y position
 * @param controlX - Control point X position
 * @param controlY - Control point Y position
 * @param nodeRadius - Radius of nodes to avoid
 * @returns Adjusted label position [x, y]
 */
export function adjustLabelPosition(
  labelX: number,
  labelY: number,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  controlX: number,
  controlY: number,
  nodeRadius: number
): [number, number] {
  // Check if label overlaps with source or target node
  const overlapsSource = isPointInNode(labelX, labelY, sourceX, sourceY, nodeRadius);
  const overlapsTarget = isPointInNode(labelX, labelY, targetX, targetY, nodeRadius);
  
  if (!overlapsSource && !overlapsTarget) {
    // No overlap, return original position
    return [labelX, labelY];
  }
  
  // Try positions at different points along the curve (30%, 40%, 60%, 70%)
  // Skip 50% as that's the original position
  const testPositions = [0.3, 0.4, 0.6, 0.7];
  
  for (const t of testPositions) {
    const [testX, testY] = getPointOnBezier(sourceX, sourceY, targetX, targetY, controlX, controlY, t);
    
    if (!isPointInNode(testX, testY, sourceX, sourceY, nodeRadius) &&
        !isPointInNode(testX, testY, targetX, targetY, nodeRadius)) {
      return [testX, testY];
    }
  }
  
  // If all positions overlap, return the original (better than nothing)
  return [labelX, labelY];
}

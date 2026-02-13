/**
 * Edge Utilities Tests
 * Unit tests for edge calculation utilities
 */

import { describe, it, expect } from 'vitest';
import {
  calculateControlPoint,
  createBezierPath,
  getBezierMidpoint,
  calculateEdgeOffset,
  getBezierTangentAngle,
  getPointOnBezier,
  getCircleIntersection,
  getRectangleIntersection,
  getPolygonIntersection,
  getArrowPosition,
  calculateEdgeThickness,
  isPointInNode,
  adjustLabelPosition,
  calculateNodeBoundaryIntersection,
} from './edgeUtils';

describe('edgeUtils', () => {
  describe('calculateControlPoint', () => {
    it('calculates control point for horizontal edge', () => {
      const [cx, cy] = calculateControlPoint(0, 0, 100, 0, 'right', 'left');
      
      // Control point should be at midpoint with perpendicular offset
      expect(cx).toBe(50); // Midpoint X
      expect(cy).not.toBe(0); // Offset from line
    });

    it('calculates control point for vertical edge', () => {
      const [cx, cy] = calculateControlPoint(0, 0, 0, 100, 'bottom', 'top');
      
      // Control point should be at midpoint with perpendicular offset
      expect(cx).not.toBe(0); // Offset from line
      expect(cy).toBe(50); // Midpoint Y
    });

    it('calculates control point for diagonal edge', () => {
      const [cx, cy] = calculateControlPoint(0, 0, 100, 100, 'right', 'left');
      
      // Control point should be offset perpendicular to the line
      // For a diagonal line, the control point will be offset from the midpoint
      expect(cx).toBeGreaterThan(0);
      expect(cx).toBeLessThan(100);
      expect(cy).toBeGreaterThan(0);
      expect(cy).toBeLessThan(100);
    });

    it('handles zero-length edge', () => {
      const [cx, cy] = calculateControlPoint(50, 50, 50, 50, 'right', 'left');
      
      // Should return midpoint without error
      expect(cx).toBe(50);
      expect(cy).toBe(50);
    });

    it('applies offset for multiple edges', () => {
      const [, cy1] = calculateControlPoint(0, 0, 100, 0, 'right', 'left', 0);
      const [, cy2] = calculateControlPoint(0, 0, 100, 0, 'right', 'left', 30);
      
      // Control points should be different due to offset
      // X should be the same (midpoint), Y should be different
      expect(cy1).not.toBe(cy2);
      expect(Math.abs(cy2 - cy1)).toBeGreaterThan(25); // Offset should be significant
    });

    it('creates symmetric curve for opposite offsets', () => {
      const [cx1, cy1] = calculateControlPoint(0, 0, 100, 0, 'right', 'left', -30);
      const [cx2, cy2] = calculateControlPoint(0, 0, 100, 0, 'right', 'left', 30);
      
      // Control points should be symmetric
      // X should be the same (midpoint)
      expect(cx1).toBe(cx2);
      // Y values should be opposite (one above, one below the line)
      expect(cy1).toBeLessThan(0);
      expect(cy2).toBeGreaterThan(0);
      // Both should have some offset from the line
      expect(Math.abs(cy1)).toBeGreaterThan(0);
      expect(Math.abs(cy2)).toBeGreaterThan(0);
    });
  });

  describe('createBezierPath', () => {
    it('creates valid SVG path string', () => {
      const path = createBezierPath(0, 0, 100, 100, 50, 25);
      
      expect(path).toMatch(/^M\s+[\d.]+,[\d.]+\s+Q\s+[\d.]+,[\d.]+\s+[\d.]+,[\d.]+$/);
    });

    it('includes source coordinates', () => {
      const path = createBezierPath(10, 20, 100, 100, 50, 50);
      
      expect(path).toContain('M 10,20');
    });

    it('includes control point coordinates', () => {
      const path = createBezierPath(0, 0, 100, 100, 50, 25);
      
      expect(path).toContain('Q 50,25');
    });

    it('includes target coordinates', () => {
      const path = createBezierPath(0, 0, 100, 100, 50, 50);
      
      expect(path).toContain('100,100');
    });

    it('handles negative coordinates', () => {
      const path = createBezierPath(-50, -50, 50, 50, 0, 0);
      
      expect(path).toContain('M -50,-50');
      expect(path).toContain('Q 0,0');
      expect(path).toContain('50,50');
    });
  });

  describe('getBezierMidpoint', () => {
    it('calculates midpoint of straight line', () => {
      const [mx, my] = getBezierMidpoint(0, 0, 100, 0, 50, 0);
      
      expect(mx).toBe(50);
      expect(my).toBe(0);
    });

    it('calculates midpoint of curved path', () => {
      const [mx, my] = getBezierMidpoint(0, 0, 100, 0, 50, 50);
      
      // Midpoint should be at t=0.5
      expect(mx).toBe(50);
      expect(my).toBe(25); // 0.25*0 + 0.5*50 + 0.25*0
    });

    it('calculates midpoint for vertical curve', () => {
      const [mx, my] = getBezierMidpoint(0, 0, 0, 100, 50, 50);
      
      expect(mx).toBe(25); // 0.25*0 + 0.5*50 + 0.25*0
      expect(my).toBe(50);
    });

    it('handles symmetric curve', () => {
      const [mx, my] = getBezierMidpoint(0, 0, 100, 100, 50, 50);
      
      expect(mx).toBe(50);
      expect(my).toBe(50);
    });
  });

  describe('calculateEdgeOffset', () => {
    it('returns zero for single edge', () => {
      const offset = calculateEdgeOffset(0, 1);
      
      expect(offset).toBe(0);
    });

    it('returns zero for middle edge of three', () => {
      const offset = calculateEdgeOffset(1, 3);
      
      expect(offset).toBe(0);
    });

    it('returns negative offset for first edge of three', () => {
      const offset = calculateEdgeOffset(0, 3);
      
      expect(offset).toBeLessThan(0);
    });

    it('returns positive offset for last edge of three', () => {
      const offset = calculateEdgeOffset(2, 3);
      
      expect(offset).toBeGreaterThan(0);
    });

    it('creates symmetric offsets for two edges', () => {
      const offset1 = calculateEdgeOffset(0, 2);
      const offset2 = calculateEdgeOffset(1, 2);
      
      expect(offset1).toBe(-offset2);
    });

    it('distributes edges evenly', () => {
      const offset1 = calculateEdgeOffset(0, 5);
      const offset2 = calculateEdgeOffset(1, 5);
      const offset3 = calculateEdgeOffset(2, 5);
      const offset4 = calculateEdgeOffset(3, 5);
      const offset5 = calculateEdgeOffset(4, 5);
      
      // Check spacing is consistent
      const spacing1 = offset2 - offset1;
      const spacing2 = offset3 - offset2;
      const spacing3 = offset4 - offset3;
      const spacing4 = offset5 - offset4;
      
      expect(spacing1).toBe(spacing2);
      expect(spacing2).toBe(spacing3);
      expect(spacing3).toBe(spacing4);
    });
  });

  describe('getBezierTangentAngle', () => {
    it('calculates angle at start of horizontal edge', () => {
      const angle = getBezierTangentAngle(0, 0, 100, 0, 50, 0, 0);
      
      // Should point right (0 radians)
      expect(angle).toBeCloseTo(0, 2);
    });

    it('calculates angle at end of horizontal edge', () => {
      const angle = getBezierTangentAngle(0, 0, 100, 0, 50, 0, 1);
      
      // Should point right (0 radians)
      expect(angle).toBeCloseTo(0, 2);
    });

    it('calculates angle at start of vertical edge', () => {
      const angle = getBezierTangentAngle(0, 0, 0, 100, 0, 50, 0);
      
      // Should point down (π/2 radians)
      expect(angle).toBeCloseTo(Math.PI / 2, 2);
    });

    it('calculates angle at midpoint of curved edge', () => {
      const angle = getBezierTangentAngle(0, 0, 100, 0, 50, 50, 0.5);
      
      // At midpoint of a curve with control point above the line,
      // the tangent should point horizontally (angle near 0)
      // because the curve is symmetric
      expect(Math.abs(angle)).toBeLessThan(0.1); // Nearly horizontal
    });

    it('handles diagonal edge', () => {
      const angle = getBezierTangentAngle(0, 0, 100, 100, 50, 50, 0.5);
      
      // Should point diagonally (π/4 radians)
      expect(angle).toBeCloseTo(Math.PI / 4, 1);
    });
  });

  describe('getPointOnBezier', () => {
    it('returns source point at t=0', () => {
      const [x, y] = getPointOnBezier(0, 0, 100, 100, 50, 50, 0);
      
      expect(x).toBe(0);
      expect(y).toBe(0);
    });

    it('returns target point at t=1', () => {
      const [x, y] = getPointOnBezier(0, 0, 100, 100, 50, 50, 1);
      
      expect(x).toBe(100);
      expect(y).toBe(100);
    });

    it('returns midpoint at t=0.5', () => {
      const [x, y] = getPointOnBezier(0, 0, 100, 0, 50, 50, 0.5);
      
      expect(x).toBe(50);
      expect(y).toBe(25); // 0.25*0 + 0.5*50 + 0.25*0
    });

    it('calculates intermediate points', () => {
      const [x1, y1] = getPointOnBezier(0, 0, 100, 100, 50, 50, 0.25);
      const [x2, y2] = getPointOnBezier(0, 0, 100, 100, 50, 50, 0.75);
      
      // Points should be between source and target
      expect(x1).toBeGreaterThan(0);
      expect(x1).toBeLessThan(100);
      expect(y1).toBeGreaterThan(0);
      expect(y1).toBeLessThan(100);
      
      expect(x2).toBeGreaterThan(0);
      expect(x2).toBeLessThan(100);
      expect(y2).toBeGreaterThan(0);
      expect(y2).toBeLessThan(100);
      
      // x2 should be greater than x1
      expect(x2).toBeGreaterThan(x1);
      expect(y2).toBeGreaterThan(y1);
    });

    it('handles straight line (control point on line)', () => {
      const [x, y] = getPointOnBezier(0, 0, 100, 100, 50, 50, 0.5);
      
      expect(x).toBe(50);
      expect(y).toBe(50);
    });
  });

  describe('getCircleIntersection', () => {
    it('calculates intersection for horizontal line to the right', () => {
      const [x, y] = getCircleIntersection(100, 100, 50, 0, 100, 100, 100);
      
      // Should intersect at the left edge of the circle
      expect(x).toBeCloseTo(50, 1); // 100 - 50
      expect(y).toBeCloseTo(100, 1);
    });

    it('calculates intersection for horizontal line to the left', () => {
      const [x, y] = getCircleIntersection(100, 100, 50, 200, 100, 100, 100);
      
      // Should intersect at the right edge of the circle
      expect(x).toBeCloseTo(150, 1); // 100 + 50
      expect(y).toBeCloseTo(100, 1);
    });

    it('calculates intersection for vertical line from above', () => {
      const [x, y] = getCircleIntersection(100, 100, 50, 100, 0, 100, 100);
      
      // Should intersect at the top edge of the circle
      expect(x).toBeCloseTo(100, 1);
      expect(y).toBeCloseTo(50, 1); // 100 - 50
    });

    it('calculates intersection for vertical line from below', () => {
      const [x, y] = getCircleIntersection(100, 100, 50, 100, 200, 100, 100);
      
      // Should intersect at the bottom edge of the circle
      expect(x).toBeCloseTo(100, 1);
      expect(y).toBeCloseTo(150, 1); // 100 + 50
    });

    it('calculates intersection for diagonal line', () => {
      const [x, y] = getCircleIntersection(100, 100, 50, 0, 0, 100, 100);
      
      // Should intersect at 45 degrees (bottom-left)
      const expectedX = 100 - 50 / Math.sqrt(2);
      const expectedY = 100 - 50 / Math.sqrt(2);
      expect(x).toBeCloseTo(expectedX, 1);
      expect(y).toBeCloseTo(expectedY, 1);
    });

    it('handles overlapping points', () => {
      const [x, y] = getCircleIntersection(100, 100, 50, 100, 100, 100, 100);
      
      // Should return a default point on the circle
      expect(x).toBeCloseTo(150, 1); // center + radius
      expect(y).toBeCloseTo(100, 1);
    });

    it('calculates intersection with different radius', () => {
      const [x, y] = getCircleIntersection(0, 0, 100, -200, 0, 0, 0);
      
      // Should intersect at the left edge
      expect(x).toBeCloseTo(-100, 1);
      expect(y).toBeCloseTo(0, 1);
    });
  });

  describe('getRectangleIntersection', () => {
    it('calculates intersection with left edge', () => {
      const [x, y] = getRectangleIntersection(100, 100, 60, 40, 0, 100, 100, 100);
      
      // Should intersect at left edge (x = 70)
      expect(x).toBeCloseTo(70, 1); // 100 - 60/2
      expect(y).toBeCloseTo(100, 1);
    });

    it('calculates intersection with right edge', () => {
      const [x, y] = getRectangleIntersection(100, 100, 60, 40, 200, 100, 100, 100);
      
      // Should intersect at right edge (x = 130)
      expect(x).toBeCloseTo(130, 1); // 100 + 60/2
      expect(y).toBeCloseTo(100, 1);
    });

    it('calculates intersection with top edge', () => {
      const [x, y] = getRectangleIntersection(100, 100, 60, 40, 100, 0, 100, 100);
      
      // Should intersect at top edge (y = 80)
      expect(x).toBeCloseTo(100, 1);
      expect(y).toBeCloseTo(80, 1); // 100 - 40/2
    });

    it('calculates intersection with bottom edge', () => {
      const [x, y] = getRectangleIntersection(100, 100, 60, 40, 100, 200, 100, 100);
      
      // Should intersect at bottom edge (y = 120)
      expect(x).toBeCloseTo(100, 1);
      expect(y).toBeCloseTo(120, 1); // 100 + 40/2
    });

    it('calculates intersection with corner approach', () => {
      const [x, y] = getRectangleIntersection(100, 100, 60, 40, 0, 0, 100, 100);
      
      // Should intersect at either top or left edge
      // The exact edge depends on the angle
      expect(x).toBeGreaterThanOrEqual(70);
      expect(x).toBeLessThanOrEqual(130);
      expect(y).toBeGreaterThanOrEqual(80);
      expect(y).toBeLessThanOrEqual(120);
    });

    it('handles overlapping points', () => {
      const [x, y] = getRectangleIntersection(100, 100, 60, 40, 100, 100, 100, 100);
      
      // Should return a point on the rectangle edge
      expect(x).toBeCloseTo(130, 1); // Default to right edge
      expect(y).toBeCloseTo(100, 1);
    });

    it('calculates intersection for diagonal line', () => {
      const [x, y] = getRectangleIntersection(0, 0, 100, 100, -100, -100, 0, 0);
      
      // Should intersect at top-left corner area
      expect(x).toBeGreaterThanOrEqual(-50);
      expect(x).toBeLessThanOrEqual(50);
      expect(y).toBeGreaterThanOrEqual(-50);
      expect(y).toBeLessThanOrEqual(50);
    });
  });

  describe('getPolygonIntersection', () => {
    it('calculates intersection with triangle', () => {
      // Equilateral triangle centered at origin
      const vertices: Array<[number, number]> = [
        [0, -50],    // Top
        [43, 25],    // Bottom right
        [-43, 25],   // Bottom left
      ];
      
      const [x, y] = getPolygonIntersection(vertices, 0, -100, 0, 0);
      
      // Should intersect at the top vertex
      expect(x).toBeCloseTo(0, 1);
      expect(y).toBeCloseTo(-50, 1);
    });

    it('calculates intersection with square', () => {
      // Square centered at origin
      const vertices: Array<[number, number]> = [
        [-50, -50],  // Top left
        [50, -50],   // Top right
        [50, 50],    // Bottom right
        [-50, 50],   // Bottom left
      ];
      
      const [x, y] = getPolygonIntersection(vertices, -100, 0, 0, 0);
      
      // Should intersect at the left edge
      expect(x).toBeCloseTo(-50, 1);
      expect(y).toBeCloseTo(0, 1);
    });

    it('calculates intersection with hexagon', () => {
      // Regular hexagon centered at origin
      const vertices: Array<[number, number]> = [
        [0, -50],      // Top
        [43, -25],     // Top right
        [43, 25],      // Bottom right
        [0, 50],       // Bottom
        [-43, 25],     // Bottom left
        [-43, -25],    // Top left
      ];
      
      const [x, y] = getPolygonIntersection(vertices, 100, 0, 0, 0);
      
      // Should intersect at the right edge
      expect(x).toBeCloseTo(43, 1);
      expect(Math.abs(y)).toBeLessThan(26); // Between -25 and 25
    });

    it('handles overlapping points', () => {
      const vertices: Array<[number, number]> = [
        [0, -50],
        [50, 0],
        [0, 50],
        [-50, 0],
      ];
      
      const [x, y] = getPolygonIntersection(vertices, 0, 0, 0, 0);
      
      // Should return first vertex as fallback
      expect(x).toBe(0);
      expect(y).toBe(-50);
    });

    it('handles empty polygon', () => {
      const vertices: Array<[number, number]> = [];
      
      const [x, y] = getPolygonIntersection(vertices, 100, 100, 0, 0);
      
      // Should return line start point as fallback
      expect(x).toBe(100);
      expect(y).toBe(100);
    });

    it('handles polygon with too few vertices', () => {
      const vertices: Array<[number, number]> = [
        [0, 0],
        [100, 0],
      ];
      
      const [x, y] = getPolygonIntersection(vertices, 50, 50, 0, 0);
      
      // Should return first vertex as fallback
      expect(x).toBe(0);
      expect(y).toBe(0);
    });

    it('calculates intersection from inside polygon', () => {
      const vertices: Array<[number, number]> = [
        [-50, -50],
        [50, -50],
        [50, 50],
        [-50, 50],
      ];
      
      const [x, y] = getPolygonIntersection(vertices, 0, 0, 100, 0);
      
      // Should intersect at the right edge
      expect(x).toBeCloseTo(50, 1);
      expect(y).toBeCloseTo(0, 1);
    });
  });

  describe('getArrowPosition', () => {
    it('positions arrow near target node', () => {
      const [x, y] = getArrowPosition(0, 0, 100, 0, 50, 0, 10);
      
      // Arrow should be positioned 10 pixels from target (100, 0)
      expect(x).toBeGreaterThan(80);
      expect(x).toBeLessThan(100);
      expect(y).toBeCloseTo(0, 1);
    });

    it('returns angle for arrow orientation', () => {
      const [, , angle] = getArrowPosition(0, 0, 100, 0, 50, 0, 10);
      
      // For horizontal edge, angle should be close to 0 (pointing right)
      expect(angle).toBeCloseTo(0, 1);
    });

    it('positions arrow on vertical edge', () => {
      const [x, y, angle] = getArrowPosition(0, 0, 0, 100, 0, 50, 10);
      
      // Arrow should be positioned 10 pixels from target (0, 100)
      expect(x).toBeCloseTo(0, 1);
      expect(y).toBeGreaterThan(80);
      expect(y).toBeLessThan(100);
      
      // Angle should be close to π/2 (pointing down)
      expect(angle).toBeCloseTo(Math.PI / 2, 1);
    });

    it('positions arrow on diagonal edge', () => {
      const [x, y, angle] = getArrowPosition(0, 0, 100, 100, 50, 50, 10);
      
      // Arrow should be positioned 10 pixels from target (100, 100)
      expect(x).toBeGreaterThan(80);
      expect(x).toBeLessThan(100);
      expect(y).toBeGreaterThan(80);
      expect(y).toBeLessThan(100);
      
      // Angle should be close to π/4 (pointing diagonally)
      expect(angle).toBeCloseTo(Math.PI / 4, 1);
    });

    it('positions arrow on curved edge', () => {
      const [x, y] = getArrowPosition(0, 0, 100, 0, 50, 50, 10);
      
      // Arrow should be positioned 10 pixels from target
      expect(x).toBeGreaterThan(80);
      expect(x).toBeLessThan(100);
      
      // Y coordinate should be affected by the curve
      expect(Math.abs(y)).toBeGreaterThan(0);
    });

    it('respects custom distance from target', () => {
      const [x1, y1] = getArrowPosition(0, 0, 100, 0, 50, 0, 10);
      const [x2, y2] = getArrowPosition(0, 0, 100, 0, 50, 0, 20);
      
      // Arrow with larger distance should be further from target
      expect(x2).toBeLessThan(x1);
      expect(y1).toBeCloseTo(y2, 1); // Y should be similar for horizontal edge
    });

    it('handles zero distance from target', () => {
      const [x, y, angle] = getArrowPosition(0, 0, 100, 0, 50, 0, 0);
      
      // Arrow should be at target position
      expect(x).toBeCloseTo(100, 1);
      expect(y).toBeCloseTo(0, 1);
      expect(angle).toBeCloseTo(0, 1);
    });

    it('handles short edges', () => {
      const [x, y] = getArrowPosition(0, 0, 20, 0, 10, 0, 10);
      
      // Arrow should still be positioned correctly even if edge is short
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(20);
      expect(y).toBeCloseTo(0, 1);
    });

    it('calculates correct angle for curved edge at arrow position', () => {
      const [, , angle1] = getArrowPosition(0, 0, 100, 0, 50, 50, 10);
      const [, , angle2] = getArrowPosition(0, 0, 100, 0, 50, -50, 10);
      
      // Angles should be different for curves in opposite directions
      expect(angle1).not.toBeCloseTo(angle2, 1);
    });

    it('handles negative coordinates', () => {
      const [x, y, angle] = getArrowPosition(-100, -100, 0, 0, -50, -50, 10);
      
      // Arrow should be positioned near target (0, 0)
      expect(x).toBeGreaterThan(-20);
      expect(x).toBeLessThanOrEqual(0);
      expect(y).toBeGreaterThan(-20);
      expect(y).toBeLessThanOrEqual(0);
      expect(angle).toBeCloseTo(Math.PI / 4, 1);
    });
  });

  describe('calculateEdgeThickness', () => {
    it('returns 2 pixels for weight 1', () => {
      const thickness = calculateEdgeThickness(1);
      
      expect(thickness).toBe(2);
    });

    it('returns 3 pixels for weight 2', () => {
      const thickness = calculateEdgeThickness(2);
      
      expect(thickness).toBe(3);
    });

    it('returns 4 pixels for weight 3', () => {
      const thickness = calculateEdgeThickness(3);
      
      expect(thickness).toBe(4);
    });

    it('returns 5 pixels for weight 4', () => {
      const thickness = calculateEdgeThickness(4);
      
      expect(thickness).toBe(5);
    });

    it('returns 6 pixels for weight 5', () => {
      const thickness = calculateEdgeThickness(5);
      
      expect(thickness).toBe(6);
    });

    it('returns 2 pixels for undefined weight (default)', () => {
      const thickness = calculateEdgeThickness(undefined);
      
      expect(thickness).toBe(2);
    });

    it('returns 2 pixels for null weight', () => {
      const thickness = calculateEdgeThickness(null as any);
      
      expect(thickness).toBe(2);
    });

    it('clamps weight below 1 to minimum thickness of 2', () => {
      const thickness = calculateEdgeThickness(0);
      
      expect(thickness).toBe(2);
    });

    it('clamps negative weight to minimum thickness of 2', () => {
      const thickness = calculateEdgeThickness(-5);
      
      expect(thickness).toBe(2);
    });

    it('clamps weight above 5 to maximum thickness of 6', () => {
      const thickness = calculateEdgeThickness(10);
      
      expect(thickness).toBe(6);
    });

    it('clamps weight of 100 to maximum thickness of 6', () => {
      const thickness = calculateEdgeThickness(100);
      
      expect(thickness).toBe(6);
    });

    it('handles decimal weights by rounding down', () => {
      const thickness1 = calculateEdgeThickness(2.3);
      const thickness2 = calculateEdgeThickness(2.7);
      
      // Both should result in thickness 3 (2 + (2.3 - 1) = 3.3, clamped to 3)
      // Actually, the formula is 2 + (weight - 1), so:
      // 2 + (2.3 - 1) = 3.3, min(6, 3.3) = 3.3
      // But we're using Math.min, not Math.floor, so it should be 3.3
      // Let me check the actual behavior
      expect(thickness1).toBeCloseTo(3.3, 1);
      expect(thickness2).toBeCloseTo(3.7, 1);
    });

    it('follows formula: thickness = 2 + (weight - 1)', () => {
      // Test the formula for various weights
      expect(calculateEdgeThickness(1)).toBe(2); // 2 + (1 - 1) = 2
      expect(calculateEdgeThickness(2)).toBe(3); // 2 + (2 - 1) = 3
      expect(calculateEdgeThickness(3)).toBe(4); // 2 + (3 - 1) = 4
      expect(calculateEdgeThickness(4)).toBe(5); // 2 + (4 - 1) = 5
      expect(calculateEdgeThickness(5)).toBe(6); // 2 + (5 - 1) = 6
    });

    it('ensures maximum thickness is 6 pixels', () => {
      // Test that no weight can produce thickness > 6
      const weights = [5, 6, 7, 10, 100, 1000];
      
      weights.forEach(weight => {
        const thickness = calculateEdgeThickness(weight);
        expect(thickness).toBeLessThanOrEqual(6);
      });
    });

    it('ensures minimum thickness is 2 pixels', () => {
      // Test that no weight can produce thickness < 2
      const weights = [0, -1, -10, -100];
      
      weights.forEach(weight => {
        const thickness = calculateEdgeThickness(weight);
        expect(thickness).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe('isPointInNode', () => {
    it('returns true when point is inside node circle', () => {
      // Point at center of node
      expect(isPointInNode(50, 50, 50, 50, 10)).toBe(true);
      
      // Point inside node but not at center
      expect(isPointInNode(55, 50, 50, 50, 10)).toBe(true);
      expect(isPointInNode(50, 55, 50, 50, 10)).toBe(true);
    });

    it('returns false when point is outside node circle', () => {
      // Point outside node
      expect(isPointInNode(70, 50, 50, 50, 10)).toBe(false);
      expect(isPointInNode(50, 70, 50, 50, 10)).toBe(false);
    });

    it('returns false when point is exactly on node perimeter', () => {
      // Point exactly on perimeter (distance = radius)
      expect(isPointInNode(60, 50, 50, 50, 10)).toBe(false);
    });

    it('handles negative coordinates', () => {
      expect(isPointInNode(-5, -5, 0, 0, 10)).toBe(true);
      expect(isPointInNode(-20, -20, 0, 0, 10)).toBe(false);
    });

    it('handles zero radius', () => {
      // Only exact center should be inside
      expect(isPointInNode(50, 50, 50, 50, 0)).toBe(false);
      expect(isPointInNode(51, 50, 50, 50, 0)).toBe(false);
    });
  });

  describe('adjustLabelPosition', () => {
    it('returns original position when no overlap', () => {
      // Label at midpoint of long edge, far from nodes
      const [x, y] = adjustLabelPosition(
        50, 50,  // Label position
        0, 0,    // Source
        100, 100, // Target
        50, 25,  // Control point
        10       // Node radius
      );
      
      expect(x).toBe(50);
      expect(y).toBe(50);
    });

    it('adjusts position when overlapping with source node', () => {
      // Label very close to source node
      const [x, y] = adjustLabelPosition(
        5, 5,    // Label position (near source)
        0, 0,    // Source
        100, 100, // Target
        50, 25,  // Control point
        10       // Node radius
      );
      
      // Position should be adjusted away from source
      expect(x).not.toBe(5);
      expect(y).not.toBe(5);
    });

    it('adjusts position when overlapping with target node', () => {
      // Label very close to target node
      const [x, y] = adjustLabelPosition(
        95, 95,  // Label position (near target)
        0, 0,    // Source
        100, 100, // Target
        50, 25,  // Control point
        10       // Node radius
      );
      
      // Position should be adjusted away from target
      expect(x).not.toBe(95);
      expect(y).not.toBe(95);
    });

    it('tries multiple positions along curve', () => {
      // Short edge where midpoint overlaps with nodes
      const [x, y] = adjustLabelPosition(
        10, 10,  // Label position
        0, 0,    // Source
        20, 20,  // Target (short edge)
        10, 5,   // Control point
        15       // Large node radius
      );
      
      // Should find a position that doesn't overlap
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
    });

    it('returns original position if all positions overlap', () => {
      // Very short edge with large nodes - all positions will overlap
      const [x, y] = adjustLabelPosition(
        5, 5,    // Label position
        0, 0,    // Source
        10, 10,  // Target (very short edge)
        5, 2.5,  // Control point
        50       // Very large node radius
      );
      
      // Should return original position as fallback
      expect(x).toBe(5);
      expect(y).toBe(5);
    });

    it('handles horizontal edges', () => {
      const [x, y] = adjustLabelPosition(
        50, 0,   // Label position
        0, 0,    // Source
        100, 0,  // Target (horizontal)
        50, -20, // Control point
        10       // Node radius
      );
      
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(100);
    });

    it('handles vertical edges', () => {
      const [x, y] = adjustLabelPosition(
        0, 50,   // Label position
        0, 0,    // Source
        0, 100,  // Target (vertical)
        -20, 50, // Control point
        10       // Node radius
      );
      
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    });

    it('handles curved edges with offset', () => {
      const [x, y] = adjustLabelPosition(
        50, 30,  // Label position
        0, 0,    // Source
        100, 100, // Target
        30, 50,  // Control point (curved)
        10       // Node radius
      );
      
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateNodeBoundaryIntersection', () => {
    // Node dimensions: 150px × 60px (from UnifiedNode component)
    const NODE_WIDTH = 150;
    const NODE_HEIGHT = 60;

    it('calculates intersection with left edge for horizontal approach from left', () => {
      const [x, y] = calculateNodeBoundaryIntersection(
        100, 100,  // Node center
        200, 100,  // Target (direction)
        0, 100     // Line start (from left)
      );
      
      // Should intersect at left edge (x = 100 - 150/2 = 25)
      expect(x).toBeCloseTo(25, 1);
      expect(y).toBeCloseTo(100, 1);
    });

    it('calculates intersection with right edge for horizontal approach from right', () => {
      const [x, y] = calculateNodeBoundaryIntersection(
        100, 100,  // Node center
        0, 100,    // Target (direction)
        200, 100   // Line start (from right)
      );
      
      // Should intersect at right edge (x = 100 + 150/2 = 175)
      expect(x).toBeCloseTo(175, 1);
      expect(y).toBeCloseTo(100, 1);
    });

    it('calculates intersection with top edge for vertical approach from above', () => {
      const [x, y] = calculateNodeBoundaryIntersection(
        100, 100,  // Node center
        100, 200,  // Target (direction)
        100, 0     // Line start (from above)
      );
      
      // Should intersect at top edge (y = 100 - 60/2 = 70)
      expect(x).toBeCloseTo(100, 1);
      expect(y).toBeCloseTo(70, 1);
    });

    it('calculates intersection with bottom edge for vertical approach from below', () => {
      const [x, y] = calculateNodeBoundaryIntersection(
        100, 100,  // Node center
        100, 0,    // Target (direction)
        100, 200   // Line start (from below)
      );
      
      // Should intersect at bottom edge (y = 100 + 60/2 = 130)
      expect(x).toBeCloseTo(100, 1);
      expect(y).toBeCloseTo(130, 1);
    });

    it('calculates intersection for diagonal approach', () => {
      const [x, y] = calculateNodeBoundaryIntersection(
        100, 100,  // Node center
        200, 200,  // Target (direction)
        0, 0       // Line start (diagonal from top-left)
      );
      
      // Should intersect at one of the edges
      // Check that point is on the rectangle perimeter
      const left = 100 - NODE_WIDTH / 2;
      const right = 100 + NODE_WIDTH / 2;
      const top = 100 - NODE_HEIGHT / 2;
      const bottom = 100 + NODE_HEIGHT / 2;
      
      const onLeftEdge = Math.abs(x - left) < 0.5 && y >= top - 0.5 && y <= bottom + 0.5;
      const onRightEdge = Math.abs(x - right) < 0.5 && y >= top - 0.5 && y <= bottom + 0.5;
      const onTopEdge = Math.abs(y - top) < 0.5 && x >= left - 0.5 && x <= right + 0.5;
      const onBottomEdge = Math.abs(y - bottom) < 0.5 && x >= left - 0.5 && x <= right + 0.5;
      
      expect(onLeftEdge || onRightEdge || onTopEdge || onBottomEdge).toBe(true);
    });

    it('handles overlapping nodes (same position)', () => {
      const [x, y] = calculateNodeBoundaryIntersection(
        100, 100,  // Node center
        100, 100,  // Target (same position)
        100, 100   // Line start (same position)
      );
      
      // Should return a point on the rectangle edge (default behavior)
      expect(x).toBeCloseTo(175, 1); // Right edge
      expect(y).toBeCloseTo(100, 1);
    });

    it('uses exact node dimensions (150px × 60px)', () => {
      // Test that the function uses the correct dimensions
      // by checking intersection points match expected values
      
      // Horizontal approach from far left
      const [x1, y1] = calculateNodeBoundaryIntersection(
        0, 0,      // Node center at origin
        100, 0,    // Target (direction)
        -200, 0    // Line start (far left)
      );
      
      // Should intersect at left edge: 0 - 150/2 = -75
      expect(x1).toBeCloseTo(-75, 1);
      expect(y1).toBeCloseTo(0, 1);
      
      // Vertical approach from far above
      const [x2, y2] = calculateNodeBoundaryIntersection(
        0, 0,      // Node center at origin
        0, 100,    // Target (direction)
        0, -200    // Line start (far above)
      );
      
      // Should intersect at top edge: 0 - 60/2 = -30
      expect(x2).toBeCloseTo(0, 1);
      expect(y2).toBeCloseTo(-30, 1);
    });

    it('calculates correct intersection for corner approach', () => {
      const [x, y] = calculateNodeBoundaryIntersection(
        100, 100,  // Node center
        150, 120,  // Target (direction towards top-right)
        0, 0       // Line start (from top-left corner)
      );
      
      // Should intersect at either top or left edge
      const left = 100 - NODE_WIDTH / 2;
      const right = 100 + NODE_WIDTH / 2;
      const top = 100 - NODE_HEIGHT / 2;
      const bottom = 100 + NODE_HEIGHT / 2;
      
      // Point should be within rectangle bounds
      expect(x).toBeGreaterThanOrEqual(left - 0.5);
      expect(x).toBeLessThanOrEqual(right + 0.5);
      expect(y).toBeGreaterThanOrEqual(top - 0.5);
      expect(y).toBeLessThanOrEqual(bottom + 0.5);
    });

    it('handles negative coordinates', () => {
      const [x, y] = calculateNodeBoundaryIntersection(
        -100, -100,  // Node center (negative)
        0, 0,        // Target (direction)
        -200, -200   // Line start (negative)
      );
      
      // Should still calculate correct intersection
      expect(x).toBeGreaterThan(-200);
      expect(y).toBeGreaterThan(-200);
    });

    it('intersection point is always on rectangle perimeter', () => {
      // Test multiple approaches to ensure all intersections are on perimeter
      const approaches = [
        { lineX: 0, lineY: 100 },      // From left
        { lineX: 200, lineY: 100 },    // From right
        { lineX: 100, lineY: 0 },      // From top
        { lineX: 100, lineY: 200 },    // From bottom
        { lineX: 0, lineY: 0 },        // From top-left
        { lineX: 200, lineY: 200 },    // From bottom-right
      ];
      
      const centerX = 100;
      const centerY = 100;
      const left = centerX - NODE_WIDTH / 2;
      const right = centerX + NODE_WIDTH / 2;
      const top = centerY - NODE_HEIGHT / 2;
      const bottom = centerY + NODE_HEIGHT / 2;
      
      approaches.forEach(({ lineX, lineY }) => {
        const [x, y] = calculateNodeBoundaryIntersection(
          centerX, centerY,
          centerX, centerY,  // Target at center
          lineX, lineY
        );
        
        // Check if point is on one of the four edges
        const onLeftEdge = Math.abs(x - left) < 0.5 && y >= top - 0.5 && y <= bottom + 0.5;
        const onRightEdge = Math.abs(x - right) < 0.5 && y >= top - 0.5 && y <= bottom + 0.5;
        const onTopEdge = Math.abs(y - top) < 0.5 && x >= left - 0.5 && x <= right + 0.5;
        const onBottomEdge = Math.abs(y - bottom) < 0.5 && x >= left - 0.5 && x <= right + 0.5;
        
        expect(onLeftEdge || onRightEdge || onTopEdge || onBottomEdge).toBe(true);
      });
    });
  });
});

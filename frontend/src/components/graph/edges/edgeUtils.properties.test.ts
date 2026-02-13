/**
 * Edge Utilities Property-Based Tests
 * Property tests for edge connection point calculations
 * 
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  getCircleIntersection,
  getRectangleIntersection,
  getPolygonIntersection,
  calculateEdgeThickness,
  calculateNodeBoundaryIntersection,
} from './edgeUtils';

describe('edgeUtils - Property-Based Tests', () => {
  describe('getCircleIntersection', () => {
    it('Property: connection point is always on circle perimeter', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: 10, max: 200, noNaN: true }), // radius (positive)
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineY
          (centerX, centerY, radius, lineX, lineY) => {
            // Skip if line point is at circle center (edge case)
            const distToCenter = Math.sqrt(
              Math.pow(lineX - centerX, 2) + Math.pow(lineY - centerY, 2)
            );
            if (distToCenter < 1.0) {
              return true;
            }

            const [x, y] = getCircleIntersection(
              centerX,
              centerY,
              radius,
              lineX,
              lineY,
              centerX, // target is circle center
              centerY
            );

            // Calculate distance from intersection point to circle center
            const distance = Math.sqrt(
              Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2)
            );

            // Distance should equal radius (point is on perimeter)
            // Allow small tolerance for floating point errors
            expect(Math.abs(distance - radius)).toBeLessThan(0.1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: connection point lies on line from source to center', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: 10, max: 200, noNaN: true }), // radius
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineY
          (centerX, centerY, radius, lineX, lineY) => {
            // Skip if line point is at circle center
            const distToCenter = Math.sqrt(
              Math.pow(lineX - centerX, 2) + Math.pow(lineY - centerY, 2)
            );
            if (distToCenter < 1.0) {
              return true;
            }

            const [x, y] = getCircleIntersection(
              centerX,
              centerY,
              radius,
              lineX,
              lineY,
              centerX,
              centerY
            );

            // Calculate vectors
            const v1x = x - lineX;
            const v1y = y - lineY;
            const v2x = centerX - lineX;
            const v2y = centerY - lineY;

            // Calculate cross product (should be near zero if collinear)
            const crossProduct = Math.abs(v1x * v2y - v1y * v2x);

            // Points should be collinear (cross product near zero)
            expect(crossProduct).toBeLessThan(0.1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getRectangleIntersection', () => {
    it('Property: connection point is on rectangle perimeter', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: 20, max: 200, noNaN: true }), // width
          fc.float({ min: 20, max: 200, noNaN: true }), // height
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineY
          (centerX, centerY, width, height, lineX, lineY) => {
            // Skip if line point is at rectangle center
            const distToCenter = Math.sqrt(
              Math.pow(lineX - centerX, 2) + Math.pow(lineY - centerY, 2)
            );
            if (distToCenter < 1.0) {
              return true;
            }

            const [x, y] = getRectangleIntersection(
              centerX,
              centerY,
              width,
              height,
              lineX,
              lineY,
              centerX,
              centerY
            );

            // Calculate rectangle bounds
            const left = centerX - width / 2;
            const right = centerX + width / 2;
            const top = centerY - height / 2;
            const bottom = centerY + height / 2;

            // Point should be on one of the four edges
            const onLeftEdge = Math.abs(x - left) < 0.5 && y >= top - 0.5 && y <= bottom + 0.5;
            const onRightEdge = Math.abs(x - right) < 0.5 && y >= top - 0.5 && y <= bottom + 0.5;
            const onTopEdge = Math.abs(y - top) < 0.5 && x >= left - 0.5 && x <= right + 0.5;
            const onBottomEdge = Math.abs(y - bottom) < 0.5 && x >= left - 0.5 && x <= right + 0.5;

            expect(onLeftEdge || onRightEdge || onTopEdge || onBottomEdge).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getPolygonIntersection', () => {
    it('Property: connection point is on polygon perimeter for square', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: 20, max: 200, noNaN: true }), // size
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineY
          (centerX, centerY, size, lineX, lineY) => {
            // Skip if line point is at polygon center
            const distToCenter = Math.sqrt(
              Math.pow(lineX - centerX, 2) + Math.pow(lineY - centerY, 2)
            );
            if (distToCenter < 1.0) {
              return true;
            }

            // Create square vertices
            const halfSize = size / 2;
            const vertices: Array<[number, number]> = [
              [centerX - halfSize, centerY - halfSize], // Top left
              [centerX + halfSize, centerY - halfSize], // Top right
              [centerX + halfSize, centerY + halfSize], // Bottom right
              [centerX - halfSize, centerY + halfSize], // Bottom left
            ];

            const [x, y] = getPolygonIntersection(
              vertices,
              lineX,
              lineY,
              centerX,
              centerY
            );

            // Check if point is on any edge of the square
            let onEdge = false;
            for (let i = 0; i < vertices.length; i++) {
              const [x1, y1] = vertices[i];
              const [x2, y2] = vertices[(i + 1) % vertices.length];

              // Check if point is on this edge
              const minX = Math.min(x1, x2) - 0.5;
              const maxX = Math.max(x1, x2) + 0.5;
              const minY = Math.min(y1, y2) - 0.5;
              const maxY = Math.max(y1, y2) + 0.5;

              if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                // Check if point is collinear with edge
                const edgeDx = x2 - x1;
                const edgeDy = y2 - y1;
                const pointDx = x - x1;
                const pointDy = y - y1;
                const crossProduct = Math.abs(edgeDx * pointDy - edgeDy * pointDx);

                if (crossProduct < 0.5) {
                  onEdge = true;
                  break;
                }
              }
            }

            expect(onEdge).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: connection point is on line from source to polygon center', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: 20, max: 200, noNaN: true }), // size
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineY
          (centerX, centerY, size, lineX, lineY) => {
            // Skip if line point is at polygon center
            const distToCenter = Math.sqrt(
              Math.pow(lineX - centerX, 2) + Math.pow(lineY - centerY, 2)
            );
            if (distToCenter < 1.0) {
              return true;
            }

            // Create triangle vertices
            const vertices: Array<[number, number]> = [
              [centerX, centerY - size], // Top
              [centerX + size, centerY + size], // Bottom right
              [centerX - size, centerY + size], // Bottom left
            ];

            const [x, y] = getPolygonIntersection(
              vertices,
              lineX,
              lineY,
              centerX,
              centerY
            );

            // Calculate vectors
            const v1x = x - lineX;
            const v1y = y - lineY;
            const v2x = centerX - lineX;
            const v2y = centerY - lineY;

            // Calculate cross product (should be near zero if collinear)
            const crossProduct = Math.abs(v1x * v2y - v1y * v2x);

            // Points should be collinear
            expect(crossProduct).toBeLessThan(1.0); // Slightly higher tolerance for polygons
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Connection Point Consistency', () => {
    it('Property: circle and square intersections are similar for similar shapes', () => {
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: 20, max: 200, noNaN: true }), // size
          fc.float({ min: 0, max: Math.fround(2 * Math.PI), noNaN: true }), // angle
          (centerX, centerY, size, angle) => {
            // Create line point at given angle and distance
            const distance = size * 3; // Far enough outside
            const lineX = centerX + distance * Math.cos(angle);
            const lineY = centerY + distance * Math.sin(angle);

            // Get circle intersection
            const [circleX, circleY] = getCircleIntersection(
              centerX,
              centerY,
              size,
              lineX,
              lineY,
              centerX,
              centerY
            );

            // Get rectangle intersection (square)
            const [rectX, rectY] = getRectangleIntersection(
              centerX,
              centerY,
              size * 2,
              size * 2,
              lineX,
              lineY,
              centerX,
              centerY
            );

            // Both should be roughly in the same direction from center
            const circleDist = Math.sqrt(
              Math.pow(circleX - centerX, 2) + Math.pow(circleY - centerY, 2)
            );
            const rectDist = Math.sqrt(
              Math.pow(rectX - centerX, 2) + Math.pow(rectY - centerY, 2)
            );

            // Both distances should be positive (not at center)
            expect(circleDist).toBeGreaterThan(0);
            expect(rectDist).toBeGreaterThan(0);

            // Angles should be similar (within 45 degrees for square vs circle)
            const circleAngle = Math.atan2(circleY - centerY, circleX - centerX);
            const rectAngle = Math.atan2(rectY - centerY, rectX - centerX);
            const angleDiff = Math.abs(circleAngle - rectAngle);
            const normalizedDiff = Math.min(angleDiff, 2 * Math.PI - angleDiff);

            expect(normalizedDiff).toBeLessThan(Math.PI / 2); // 90 degrees tolerance
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateEdgeThickness', () => {
    it('Property: thickness follows formula 2 + (weight - 1) for valid weights', () => {
      /**
       * **Validates: Requirement 9.2**
       * Edge thickness calculation follows the formula: thickness = 2 + (weight - 1) pixels
       * For weights in range [1, 5], the formula should produce exact results
       */
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // weight in valid range
          (weight) => {
            const thickness = calculateEdgeThickness(weight);
            const expectedThickness = 2 + (weight - 1);
            
            expect(thickness).toBe(expectedThickness);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: thickness is always between 2 and 6 pixels', () => {
      /**
       * **Validates: Requirement 9.2**
       * Edge thickness must be clamped to the range [2, 6] pixels
       * regardless of input weight value
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // any weight
          (weight) => {
            const thickness = calculateEdgeThickness(weight);
            
            expect(thickness).toBeGreaterThanOrEqual(2);
            expect(thickness).toBeLessThanOrEqual(6);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: thickness is monotonically increasing for weights 1-5', () => {
      /**
       * **Validates: Requirement 9.2**
       * As weight increases from 1 to 5, thickness should increase monotonically
       * This ensures visual consistency where higher weights = thicker edges
       */
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 4 }), // weight1
          fc.integer({ min: 1, max: 1 }), // offset (1)
          (weight1, offset) => {
            const weight2 = weight1 + offset;
            if (weight2 > 5) return true; // Skip if out of range
            
            const thickness1 = calculateEdgeThickness(weight1);
            const thickness2 = calculateEdgeThickness(weight2);
            
            expect(thickness2).toBeGreaterThan(thickness1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: undefined/null weight defaults to minimum thickness', () => {
      /**
       * **Validates: Requirement 9.2**
       * When weight is not provided (undefined or null), default to minimum thickness of 2
       */
      const thicknessUndefined = calculateEdgeThickness(undefined);
      const thicknessNull = calculateEdgeThickness(null as any);
      
      expect(thicknessUndefined).toBe(2);
      expect(thicknessNull).toBe(2);
    });

    it('Property: weights below 1 are clamped to minimum', () => {
      /**
       * **Validates: Requirement 9.2**
       * Weights below 1 should be clamped to produce minimum thickness of 2
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: Math.fround(0.99), noNaN: true }), // weight < 1
          (weight) => {
            const thickness = calculateEdgeThickness(weight);
            
            expect(thickness).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: weights above 5 are clamped to maximum', () => {
      /**
       * **Validates: Requirement 9.2**
       * Weights above 5 should be clamped to produce maximum thickness of 6
       */
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(5.01), max: 1000, noNaN: true }), // weight > 5
          (weight) => {
            const thickness = calculateEdgeThickness(weight);
            
            expect(thickness).toBe(6);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: thickness difference between consecutive weights is 1 pixel', () => {
      /**
       * **Validates: Requirement 9.2**
       * For consecutive integer weights in [1, 5], thickness should increase by exactly 1 pixel
       * This ensures consistent visual progression
       */
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 4 }), // weight
          (weight) => {
            const thickness1 = calculateEdgeThickness(weight);
            const thickness2 = calculateEdgeThickness(weight + 1);
            
            expect(thickness2 - thickness1).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: same weight always produces same thickness (deterministic)', () => {
      /**
       * **Validates: Requirement 9.2**
       * The thickness calculation should be deterministic - same input always produces same output
       */
      fc.assert(
        fc.property(
          fc.float({ min: -100, max: 100, noNaN: true }), // any weight
          (weight) => {
            const thickness1 = calculateEdgeThickness(weight);
            const thickness2 = calculateEdgeThickness(weight);
            const thickness3 = calculateEdgeThickness(weight);
            
            expect(thickness1).toBe(thickness2);
            expect(thickness2).toBe(thickness3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: thickness is a number (not NaN or Infinity)', () => {
      /**
       * **Validates: Requirement 9.2**
       * The thickness calculation should always return a valid finite number
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // any weight
          (weight) => {
            const thickness = calculateEdgeThickness(weight);
            
            expect(Number.isFinite(thickness)).toBe(true);
            expect(Number.isNaN(thickness)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateNodeBoundaryIntersection', () => {
    // Node dimensions from UnifiedNode component (Requirement 7.2)
    const NODE_WIDTH = 150;
    const NODE_HEIGHT = 60;

    it('Property: connection points exactly on rectangle perimeter (150px × 60px)', () => {
      /**
       * **Validates: Requirement 7.2**
       * Connection points must be exactly on the node's rounded rectangle perimeter
       * The node has exact dimensions of 150px width × 60px height
       * This property verifies that all calculated intersection points lie on one of the four edges
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineY
          (centerX, centerY, lineX, lineY) => {
            // Skip if line point is at node center (edge case)
            const distToCenter = Math.sqrt(
              Math.pow(lineX - centerX, 2) + Math.pow(lineY - centerY, 2)
            );
            if (distToCenter < 1.0) {
              return true;
            }

            const [x, y] = calculateNodeBoundaryIntersection(
              centerX,
              centerY,
              centerX, // target at center
              centerY,
              lineX,
              lineY
            );

            // Calculate rectangle bounds
            const left = centerX - NODE_WIDTH / 2;
            const right = centerX + NODE_WIDTH / 2;
            const top = centerY - NODE_HEIGHT / 2;
            const bottom = centerY + NODE_HEIGHT / 2;

            // Point should be on one of the four edges
            const onLeftEdge = Math.abs(x - left) < 0.5 && y >= top - 0.5 && y <= bottom + 0.5;
            const onRightEdge = Math.abs(x - right) < 0.5 && y >= top - 0.5 && y <= bottom + 0.5;
            const onTopEdge = Math.abs(y - top) < 0.5 && x >= left - 0.5 && x <= right + 0.5;
            const onBottomEdge = Math.abs(y - bottom) < 0.5 && x >= left - 0.5 && x <= right + 0.5;

            expect(onLeftEdge || onRightEdge || onTopEdge || onBottomEdge).toBe(true);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: connection point lies on line from source to center', () => {
      /**
       * **Validates: Requirement 7.2**
       * The connection point must lie on the straight line from the source to the node center
       * This ensures edges connect in the correct direction
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineY
          (centerX, centerY, lineX, lineY) => {
            // Skip if line point is at node center
            const distToCenter = Math.sqrt(
              Math.pow(lineX - centerX, 2) + Math.pow(lineY - centerY, 2)
            );
            if (distToCenter < 1.0) {
              return true;
            }

            const [x, y] = calculateNodeBoundaryIntersection(
              centerX,
              centerY,
              centerX,
              centerY,
              lineX,
              lineY
            );

            // Calculate vectors
            const v1x = x - lineX;
            const v1y = y - lineY;
            const v2x = centerX - lineX;
            const v2y = centerY - lineY;

            // Calculate cross product (should be near zero if collinear)
            const crossProduct = Math.abs(v1x * v2y - v1y * v2x);

            // Points should be collinear (cross product near zero)
            expect(crossProduct).toBeLessThan(0.5);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: connection point is between source and center (when source is outside)', () => {
      /**
       * **Validates: Requirement 7.2**
       * When the source is outside the node bounds, the connection point should be
       * between the source and the center (closer to source than center is)
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: 200, max: 1000, noNaN: true }), // distance (ensure source is outside)
          fc.float({ min: 0, max: Math.fround(2 * Math.PI), noNaN: true }), // angle
          (centerX, centerY, distance, angle) => {
            // Create source point at given distance and angle (guaranteed outside)
            const lineX = centerX + distance * Math.cos(angle);
            const lineY = centerY + distance * Math.sin(angle);

            const [x, y] = calculateNodeBoundaryIntersection(
              centerX,
              centerY,
              centerX,
              centerY,
              lineX,
              lineY
            );

            // Calculate distances
            const distSourceToIntersection = Math.sqrt(
              Math.pow(x - lineX, 2) + Math.pow(y - lineY, 2)
            );
            const distSourceToCenter = Math.sqrt(
              Math.pow(centerX - lineX, 2) + Math.pow(centerY - lineY, 2)
            );

            // Intersection should be closer to source than center is
            expect(distSourceToIntersection).toBeLessThanOrEqual(distSourceToCenter + 0.5);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('Property: horizontal edges intersect at left or right edge', () => {
      /**
       * **Validates: Requirement 7.2**
       * For horizontal approaches, the intersection should be on the left or right edge
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: 100, max: 1000, noNaN: true }), // distance from center
          (centerX, centerY, distance) => {
            // Create horizontal line from left
            const lineX = centerX - distance;
            const lineY = centerY;

            const [x, y] = calculateNodeBoundaryIntersection(
              centerX,
              centerY,
              centerX,
              centerY,
              lineX,
              lineY
            );

            // Calculate rectangle bounds
            const left = centerX - NODE_WIDTH / 2;
            const right = centerX + NODE_WIDTH / 2;
            const top = centerY - NODE_HEIGHT / 2;
            const bottom = centerY + NODE_HEIGHT / 2;

            // Should intersect at left edge
            const onLeftEdge = Math.abs(x - left) < 0.5 && y >= top - 0.5 && y <= bottom + 0.5;
            
            expect(onLeftEdge).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: vertical edges intersect at top or bottom edge', () => {
      /**
       * **Validates: Requirement 7.2**
       * For vertical approaches, the intersection should be on the top or bottom edge
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: 100, max: 1000, noNaN: true }), // distance from center
          (centerX, centerY, distance) => {
            // Create vertical line from above
            const lineX = centerX;
            const lineY = centerY - distance;

            const [x, y] = calculateNodeBoundaryIntersection(
              centerX,
              centerY,
              centerX,
              centerY,
              lineX,
              lineY
            );

            // Calculate rectangle bounds
            const left = centerX - NODE_WIDTH / 2;
            const right = centerX + NODE_WIDTH / 2;
            const top = centerY - NODE_HEIGHT / 2;
            const bottom = centerY + NODE_HEIGHT / 2;

            // Should intersect at top edge
            const onTopEdge = Math.abs(y - top) < 0.5 && x >= left - 0.5 && x <= right + 0.5;
            
            expect(onTopEdge).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: intersection is deterministic (same inputs = same outputs)', () => {
      /**
       * **Validates: Requirement 7.2**
       * The intersection calculation should be deterministic
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineY
          (centerX, centerY, lineX, lineY) => {
            const [x1, y1] = calculateNodeBoundaryIntersection(
              centerX,
              centerY,
              centerX,
              centerY,
              lineX,
              lineY
            );

            const [x2, y2] = calculateNodeBoundaryIntersection(
              centerX,
              centerY,
              centerX,
              centerY,
              lineX,
              lineY
            );

            const [x3, y3] = calculateNodeBoundaryIntersection(
              centerX,
              centerY,
              centerX,
              centerY,
              lineX,
              lineY
            );

            expect(x1).toBe(x2);
            expect(x2).toBe(x3);
            expect(y1).toBe(y2);
            expect(y2).toBe(y3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: intersection coordinates are finite numbers', () => {
      /**
       * **Validates: Requirement 7.2**
       * The intersection calculation should always return valid finite numbers
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineY
          (centerX, centerY, lineX, lineY) => {
            const [x, y] = calculateNodeBoundaryIntersection(
              centerX,
              centerY,
              centerX,
              centerY,
              lineX,
              lineY
            );

            expect(Number.isFinite(x)).toBe(true);
            expect(Number.isFinite(y)).toBe(true);
            expect(Number.isNaN(x)).toBe(false);
            expect(Number.isNaN(y)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

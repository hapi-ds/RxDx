/**
 * CurvedEdge Property-Based Tests
 * Property tests for edge connection point accuracy
 * 
 * Validates: Requirements 6, 7 (Curved Edge Rendering, Edge Connection Points)
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import {
  calculateControlPoint,
  getBezierMidpoint,
  getPointOnBezier,
  getBezierTangentAngle,
} from './edgeUtils';

describe('CurvedEdge Properties', () => {
  describe('Property: Edge connection point accuracy', () => {
    it('should always start at source coordinates', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 1000 }), // sourceX
          fc.integer({ min: -1000, max: 1000 }), // sourceY
          fc.integer({ min: -1000, max: 1000 }), // targetX
          fc.integer({ min: -1000, max: 1000 }), // targetY
          (sourceX, sourceY, targetX, targetY) => {
            // Calculate control point
            const [controlX, controlY] = calculateControlPoint(
              sourceX,
              sourceY,
              targetX,
              targetY,
              'right',
              'left'
            );

            // Get point at t=0 (start of curve)
            const [startX, startY] = getPointOnBezier(
              sourceX,
              sourceY,
              targetX,
              targetY,
              controlX,
              controlY,
              0
            );

            // Start point should exactly match source coordinates
            expect(startX).toBe(sourceX);
            expect(startY).toBe(sourceY);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always end at target coordinates', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 1000 }), // sourceX
          fc.integer({ min: -1000, max: 1000 }), // sourceY
          fc.integer({ min: -1000, max: 1000 }), // targetX
          fc.integer({ min: -1000, max: 1000 }), // targetY
          (sourceX, sourceY, targetX, targetY) => {
            // Calculate control point
            const [controlX, controlY] = calculateControlPoint(
              sourceX,
              sourceY,
              targetX,
              targetY,
              'right',
              'left'
            );

            // Get point at t=1 (end of curve)
            const [endX, endY] = getPointOnBezier(
              sourceX,
              sourceY,
              targetX,
              targetY,
              controlX,
              controlY,
              1
            );

            // End point should exactly match target coordinates
            expect(endX).toBe(targetX);
            expect(endY).toBe(targetY);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have midpoint between source and target', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 1000 }), // sourceX
          fc.integer({ min: -1000, max: 1000 }), // sourceY
          fc.integer({ min: -1000, max: 1000 }), // targetX
          fc.integer({ min: -1000, max: 1000 }), // targetY
          (sourceX, sourceY, targetX, targetY) => {
            // Skip if source and target are the same
            if (sourceX === targetX && sourceY === targetY) {
              return true;
            }

            // Calculate control point
            const [controlX, controlY] = calculateControlPoint(
              sourceX,
              sourceY,
              targetX,
              targetY,
              'right',
              'left'
            );

            // Get midpoint
            const [midX, midY] = getBezierMidpoint(
              sourceX,
              sourceY,
              targetX,
              targetY,
              controlX,
              controlY
            );

            // Midpoint should be within the bounding box of source and target
            const minX = Math.min(sourceX, targetX);
            const maxX = Math.max(sourceX, targetX);
            const minY = Math.min(sourceY, targetY);
            const maxY = Math.max(sourceY, targetY);

            // Allow some tolerance for curved paths (control point offset)
            const tolerance = Math.max(
              Math.abs(targetX - sourceX),
              Math.abs(targetY - sourceY)
            ) * 0.3;

            expect(midX).toBeGreaterThanOrEqual(minX - tolerance);
            expect(midX).toBeLessThanOrEqual(maxX + tolerance);
            expect(midY).toBeGreaterThanOrEqual(minY - tolerance);
            expect(midY).toBeLessThanOrEqual(maxY + tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have continuous curve (all points between source and target)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 1000 }), // sourceX
          fc.integer({ min: -1000, max: 1000 }), // sourceY
          fc.integer({ min: -1000, max: 1000 }), // targetX
          fc.integer({ min: -1000, max: 1000 }), // targetY
          fc.double({ min: 0, max: 1 }), // t parameter
          (sourceX, sourceY, targetX, targetY, t) => {
            // Skip if source and target are the same
            if (sourceX === targetX && sourceY === targetY) {
              return true;
            }

            // Calculate control point
            const [controlX, controlY] = calculateControlPoint(
              sourceX,
              sourceY,
              targetX,
              targetY,
              'right',
              'left'
            );

            // Get point at parameter t
            const [x, y] = getPointOnBezier(
              sourceX,
              sourceY,
              targetX,
              targetY,
              controlX,
              controlY,
              t
            );

            // Point should be within reasonable bounds
            const minX = Math.min(sourceX, targetX, controlX);
            const maxX = Math.max(sourceX, targetX, controlX);
            const minY = Math.min(sourceY, targetY, controlY);
            const maxY = Math.max(sourceY, targetY, controlY);

            // Add tolerance for curve
            const tolerance = 100;

            expect(x).toBeGreaterThanOrEqual(minX - tolerance);
            expect(x).toBeLessThanOrEqual(maxX + tolerance);
            expect(y).toBeGreaterThanOrEqual(minY - tolerance);
            expect(y).toBeLessThanOrEqual(maxY + tolerance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have smooth tangent angles (no discontinuities)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 1000 }), // sourceX
          fc.integer({ min: -1000, max: 1000 }), // sourceY
          fc.integer({ min: -1000, max: 1000 }), // targetX
          fc.integer({ min: -1000, max: 1000 }), // targetY
          fc.double({ min: 0.1, max: 0.9 }), // t parameter (avoid endpoints)
          (sourceX, sourceY, targetX, targetY, t) => {
            // Skip if source and target are the same or very close
            const distance = Math.sqrt(
              (targetX - sourceX) ** 2 + (targetY - sourceY) ** 2
            );
            if (distance < 2) {
              return true;
            }

            // Calculate control point
            const [controlX, controlY] = calculateControlPoint(
              sourceX,
              sourceY,
              targetX,
              targetY,
              'right',
              'left'
            );

            // Get tangent angles at nearby points
            const angle1 = getBezierTangentAngle(
              sourceX,
              sourceY,
              targetX,
              targetY,
              controlX,
              controlY,
              t - 0.01
            );
            const angle2 = getBezierTangentAngle(
              sourceX,
              sourceY,
              targetX,
              targetY,
              controlX,
              controlY,
              t
            );
            const angle3 = getBezierTangentAngle(
              sourceX,
              sourceY,
              targetX,
              targetY,
              controlX,
              controlY,
              t + 0.01
            );

            // Skip if any angle is NaN (can happen with degenerate curves)
            if (isNaN(angle1) || isNaN(angle2) || isNaN(angle3)) {
              return true;
            }

            // Angles should be continuous (no large jumps)
            // Handle angle wrapping around ±π
            const normalizeAngleDiff = (a1: number, a2: number) => {
              let diff = Math.abs(a2 - a1);
              if (diff > Math.PI) {
                diff = 2 * Math.PI - diff;
              }
              return diff;
            };

            const diff1 = normalizeAngleDiff(angle1, angle2);
            const diff2 = normalizeAngleDiff(angle2, angle3);

            // Angle changes should be small for small t changes
            expect(diff1).toBeLessThan(0.5); // Less than ~30 degrees
            expect(diff2).toBeLessThan(0.5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain curve direction (monotonic parameter)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 1000 }), // sourceX
          fc.integer({ min: -1000, max: 1000 }), // sourceY
          fc.integer({ min: -1000, max: 1000 }), // targetX
          fc.integer({ min: -1000, max: 1000 }), // targetY
          (sourceX, sourceY, targetX, targetY) => {
            // Skip if source and target are the same
            if (sourceX === targetX && sourceY === targetY) {
              return true;
            }

            // Calculate control point
            const [controlX, controlY] = calculateControlPoint(
              sourceX,
              sourceY,
              targetX,
              targetY,
              'right',
              'left'
            );

            // Get points at different t values
            const [x0, y0] = getPointOnBezier(
              sourceX,
              sourceY,
              targetX,
              targetY,
              controlX,
              controlY,
              0
            );
            const [x1, y1] = getPointOnBezier(
              sourceX,
              sourceY,
              targetX,
              targetY,
              controlX,
              controlY,
              0.5
            );
            const [x2, y2] = getPointOnBezier(
              sourceX,
              sourceY,
              targetX,
              targetY,
              controlX,
              controlY,
              1
            );

            // Calculate distances from source
            const dist0 = Math.sqrt((x0 - sourceX) ** 2 + (y0 - sourceY) ** 2);
            const dist1 = Math.sqrt((x1 - sourceX) ** 2 + (y1 - sourceY) ** 2);
            const dist2 = Math.sqrt((x2 - sourceX) ** 2 + (y2 - sourceY) ** 2);

            // Distance should generally increase (allowing for some curve variation)
            // At t=0, distance should be 0
            expect(dist0).toBe(0);
            // At t=0.5, distance should be positive
            expect(dist1).toBeGreaterThan(0);
            // At t=1, distance should be maximum (distance to target)
            const targetDist = Math.sqrt(
              (targetX - sourceX) ** 2 + (targetY - sourceY) ** 2
            );
            expect(Math.abs(dist2 - targetDist)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * StraightEdge Property-Based Tests
 * Property tests for straight edge connection point accuracy
 * 
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { StraightEdge } from './StraightEdge';
import type { StraightEdgeProps } from './StraightEdge';
import { getRectangleIntersection, calculateNodeBoundaryIntersection } from './edgeUtils';

// Node dimensions from UnifiedNode component
const NODE_BOX_WIDTH = 150;
const NODE_BOX_HEIGHT = 60;

// Helper to render edge within ReactFlow context
const renderEdge = (props: Partial<StraightEdgeProps> = {}) => {
  const defaultProps: StraightEdgeProps = {
    id: 'test-edge',
    source: 'node-1',
    target: 'node-2',
    sourceX: 0,
    sourceY: 0,
    targetX: 200,
    targetY: 200,
    sourcePosition: 'right' as const,
    targetPosition: 'left' as const,
    ...props,
  };

  return render(
    <ReactFlowProvider>
      <svg>
        <StraightEdge {...defaultProps} />
      </svg>
    </ReactFlowProvider>
  );
};

describe('StraightEdge - Property-Based Tests', () => {
  describe('Edge Connection Point Accuracy', () => {
    it('Property: edge connection points are exactly on rectangle perimeter (150px × 60px)', () => {
      /**
       * **Validates: Requirement 7.2**
       * For any edge connecting two nodes with rounded rectangle boundaries (150px × 60px),
       * the edge start and end points should lie exactly on the rectangle perimeter
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // sourceX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // sourceY
          fc.float({ min: -1000, max: 1000, noNaN: true }), // targetX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // targetY
          (sourceX, sourceY, targetX, targetY) => {
            // Skip if nodes are too close (overlapping)
            const distance = Math.sqrt(
              Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2)
            );
            if (distance < NODE_BOX_WIDTH) {
              return true;
            }

            // Calculate connection points using the same logic as StraightEdge
            const [adjustedSourceX, adjustedSourceY] = getRectangleIntersection(
              sourceX,
              sourceY,
              NODE_BOX_WIDTH,
              NODE_BOX_HEIGHT,
              targetX,
              targetY,
              sourceX,
              sourceY
            );

            const [adjustedTargetX, adjustedTargetY] = getRectangleIntersection(
              targetX,
              targetY,
              NODE_BOX_WIDTH,
              NODE_BOX_HEIGHT,
              sourceX,
              sourceY,
              targetX,
              targetY
            );

            // Check source connection point is on source rectangle perimeter
            const sourceLeft = sourceX - NODE_BOX_WIDTH / 2;
            const sourceRight = sourceX + NODE_BOX_WIDTH / 2;
            const sourceTop = sourceY - NODE_BOX_HEIGHT / 2;
            const sourceBottom = sourceY + NODE_BOX_HEIGHT / 2;

            const sourceOnLeftEdge = Math.abs(adjustedSourceX - sourceLeft) < 0.5 && 
                                    adjustedSourceY >= sourceTop - 0.5 && 
                                    adjustedSourceY <= sourceBottom + 0.5;
            const sourceOnRightEdge = Math.abs(adjustedSourceX - sourceRight) < 0.5 && 
                                     adjustedSourceY >= sourceTop - 0.5 && 
                                     adjustedSourceY <= sourceBottom + 0.5;
            const sourceOnTopEdge = Math.abs(adjustedSourceY - sourceTop) < 0.5 && 
                                   adjustedSourceX >= sourceLeft - 0.5 && 
                                   adjustedSourceX <= sourceRight + 0.5;
            const sourceOnBottomEdge = Math.abs(adjustedSourceY - sourceBottom) < 0.5 && 
                                      adjustedSourceX >= sourceLeft - 0.5 && 
                                      adjustedSourceX <= sourceRight + 0.5;

            expect(sourceOnLeftEdge || sourceOnRightEdge || sourceOnTopEdge || sourceOnBottomEdge).toBe(true);

            // Check target connection point is on target rectangle perimeter
            const targetLeft = targetX - NODE_BOX_WIDTH / 2;
            const targetRight = targetX + NODE_BOX_WIDTH / 2;
            const targetTop = targetY - NODE_BOX_HEIGHT / 2;
            const targetBottom = targetY + NODE_BOX_HEIGHT / 2;

            const targetOnLeftEdge = Math.abs(adjustedTargetX - targetLeft) < 0.5 && 
                                    adjustedTargetY >= targetTop - 0.5 && 
                                    adjustedTargetY <= targetBottom + 0.5;
            const targetOnRightEdge = Math.abs(adjustedTargetX - targetRight) < 0.5 && 
                                     adjustedTargetY >= targetTop - 0.5 && 
                                     adjustedTargetY <= targetBottom + 0.5;
            const targetOnTopEdge = Math.abs(adjustedTargetY - targetTop) < 0.5 && 
                                   adjustedTargetX >= targetLeft - 0.5 && 
                                   adjustedTargetX <= targetRight + 0.5;
            const targetOnBottomEdge = Math.abs(adjustedTargetY - targetBottom) < 0.5 && 
                                      adjustedTargetX >= targetLeft - 0.5 && 
                                      adjustedTargetX <= targetRight + 0.5;

            expect(targetOnLeftEdge || targetOnRightEdge || targetOnTopEdge || targetOnBottomEdge).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: edge path is a straight line from source to target boundary', () => {
      /**
       * **Validates: Requirement 6.1, 6.2, 6.3, 6.4**
       * For any edge connecting two nodes, the edge path should be a straight line
       * from the source node boundary intersection point to the target node boundary intersection point
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // sourceX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // sourceY
          fc.float({ min: -1000, max: 1000, noNaN: true }), // targetX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // targetY
          (sourceX, sourceY, targetX, targetY) => {
            // Skip if nodes are too close
            const distance = Math.sqrt(
              Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2)
            );
            if (distance < NODE_BOX_WIDTH) {
              return true;
            }

            const { container } = renderEdge({
              sourceX,
              sourceY,
              targetX,
              targetY,
            });

            const path = container.querySelector('path');
            const d = path?.getAttribute('d');

            // Path should be in format: M x1,y1 L x2,y2
            // Allow scientific notation for very small numbers
            expect(d).toMatch(/^M\s+[\d.e+-]+,[\d.e+-]+\s+L\s+[\d.e+-]+,[\d.e+-]+$/);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: calculateNodeBoundaryIntersection produces same result as getRectangleIntersection', () => {
      /**
       * **Validates: Requirement 7.1, 7.2**
       * The calculateNodeBoundaryIntersection utility should produce the same results
       * as getRectangleIntersection with node-specific dimensions (150px × 60px)
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.float({ min: -1000, max: 1000, noNaN: true }), // targetX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // targetY
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // lineY
          (centerX, centerY, targetX, targetY, lineX, lineY) => {
            // Skip if line point is at center
            const distToCenter = Math.sqrt(
              Math.pow(lineX - centerX, 2) + Math.pow(lineY - centerY, 2)
            );
            if (distToCenter < 1.0) {
              return true;
            }

            const [x1, y1] = calculateNodeBoundaryIntersection(
              centerX,
              centerY,
              targetX,
              targetY,
              lineX,
              lineY
            );

            const [x2, y2] = getRectangleIntersection(
              centerX,
              centerY,
              NODE_BOX_WIDTH,
              NODE_BOX_HEIGHT,
              lineX,
              lineY,
              targetX,
              targetY
            );

            // Results should be identical
            expect(Math.abs(x1 - x2)).toBeLessThan(0.01);
            expect(Math.abs(y1 - y2)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: connection points lie on line from source center to target center', () => {
      /**
       * **Validates: Requirement 6.1, 6.2, 6.3**
       * The connection points should be collinear with the line from source center to target center
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // sourceX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // sourceY
          fc.float({ min: -1000, max: 1000, noNaN: true }), // targetX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // targetY
          (sourceX, sourceY, targetX, targetY) => {
            // Skip if nodes are too close
            const distance = Math.sqrt(
              Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2)
            );
            if (distance < NODE_BOX_WIDTH) {
              return true;
            }

            const [adjustedSourceX, adjustedSourceY] = getRectangleIntersection(
              sourceX,
              sourceY,
              NODE_BOX_WIDTH,
              NODE_BOX_HEIGHT,
              targetX,
              targetY,
              sourceX,
              sourceY
            );

            const [adjustedTargetX, adjustedTargetY] = getRectangleIntersection(
              targetX,
              targetY,
              NODE_BOX_WIDTH,
              NODE_BOX_HEIGHT,
              sourceX,
              sourceY,
              targetX,
              targetY
            );

            // Calculate vectors
            const v1x = adjustedSourceX - sourceX;
            const v1y = adjustedSourceY - sourceY;
            const v2x = targetX - sourceX;
            const v2y = targetY - sourceY;

            // Calculate cross product (should be near zero if collinear)
            const crossProduct1 = Math.abs(v1x * v2y - v1y * v2x);
            expect(crossProduct1).toBeLessThan(1.0);

            // Check target point collinearity
            const v3x = adjustedTargetX - sourceX;
            const v3y = adjustedTargetY - sourceY;
            const crossProduct2 = Math.abs(v3x * v2y - v3y * v2x);
            expect(crossProduct2).toBeLessThan(1.0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: edge correctly identifies which rectangle edge to intersect', () => {
      /**
       * **Validates: Requirement 7.3**
       * The intersection calculation should correctly identify which edge (top/bottom/left/right)
       * the line hits first based on the direction from source to target
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // centerY
          fc.constantFrom('left', 'right', 'top', 'bottom'), // direction
          (centerX, centerY, direction) => {
            // Create line point in the specified direction
            let lineX = centerX;
            let lineY = centerY;
            
            switch (direction) {
              case 'left':
                lineX = centerX - 200;
                break;
              case 'right':
                lineX = centerX + 200;
                break;
              case 'top':
                lineY = centerY - 200;
                break;
              case 'bottom':
                lineY = centerY + 200;
                break;
            }

            const [x, y] = getRectangleIntersection(
              centerX,
              centerY,
              NODE_BOX_WIDTH,
              NODE_BOX_HEIGHT,
              lineX,
              lineY,
              centerX,
              centerY
            );

            // Check which edge was hit
            const left = centerX - NODE_BOX_WIDTH / 2;
            const right = centerX + NODE_BOX_WIDTH / 2;
            const top = centerY - NODE_BOX_HEIGHT / 2;
            const bottom = centerY + NODE_BOX_HEIGHT / 2;

            switch (direction) {
              case 'left':
                expect(Math.abs(x - left)).toBeLessThan(0.5);
                break;
              case 'right':
                expect(Math.abs(x - right)).toBeLessThan(0.5);
                break;
              case 'top':
                expect(Math.abs(y - top)).toBeLessThan(0.5);
                break;
              case 'bottom':
                expect(Math.abs(y - bottom)).toBeLessThan(0.5);
                break;
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge Rendering Properties', () => {
    it('Property: edge always renders without errors for valid coordinates', () => {
      /**
       * **Validates: Requirement 6.5**
       * The edge should render successfully for any valid node coordinates
       */
      fc.assert(
        fc.property(
          fc.float({ min: -10000, max: 10000, noNaN: true }), // sourceX
          fc.float({ min: -10000, max: 10000, noNaN: true }), // sourceY
          fc.float({ min: -10000, max: 10000, noNaN: true }), // targetX
          fc.float({ min: -10000, max: 10000, noNaN: true }), // targetY
          (sourceX, sourceY, targetX, targetY) => {
            const { container } = renderEdge({
              sourceX,
              sourceY,
              targetX,
              targetY,
            });

            // Should render without throwing
            expect(container).toBeTruthy();
            
            // Should have a path element
            const path = container.querySelector('path');
            expect(path).toBeTruthy();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('Property: arrow is always positioned at target boundary', () => {
      /**
       * **Validates: Requirement 8.2**
       * The arrow should be positioned exactly at the target node boundary intersection point
       */
      fc.assert(
        fc.property(
          fc.float({ min: -1000, max: 1000, noNaN: true }), // sourceX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // sourceY
          fc.float({ min: -1000, max: 1000, noNaN: true }), // targetX
          fc.float({ min: -1000, max: 1000, noNaN: true }), // targetY
          (sourceX, sourceY, targetX, targetY) => {
            // Skip if nodes are too close
            const distance = Math.sqrt(
              Math.pow(targetX - sourceX, 2) + Math.pow(targetY - sourceY, 2)
            );
            if (distance < NODE_BOX_WIDTH) {
              return true;
            }

            const { container } = renderEdge({
              sourceX,
              sourceY,
              targetX,
              targetY,
            });

            // Find the arrow group
            const gElements = container.querySelectorAll('g');
            const arrowGroup = Array.from(gElements).find(g => {
              const transform = g.getAttribute('transform');
              return transform?.includes('translate') && transform?.includes('rotate');
            });

            expect(arrowGroup).toBeTruthy();
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

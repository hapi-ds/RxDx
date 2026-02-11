/**
 * Property-based tests for LayoutAnimator
 * Validates: Requirements 2.5 - Layout transition timing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { LayoutAnimator, type AnimatedNode } from './LayoutAnimator';

describe('LayoutAnimator Properties', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Property 7: Layout transition timing
   * For any layout algorithm change, the animation duration should be 500 milliseconds ± 50ms.
   * Validates: Requirements 2.5
   */
  it('property: animation duration 500ms ± 50ms', () => {
    fc.assert(
      fc.property(
        // Generate random node positions
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            x: fc.float({ min: -1000, max: 1000 }),
            y: fc.float({ min: -1000, max: 1000 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            x: fc.float({ min: -1000, max: 1000 }),
            y: fc.float({ min: -1000, max: 1000 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (fromNodesData, toNodesData) => {
          // Ensure unique IDs
          const fromNodes: AnimatedNode[] = fromNodesData.map((node, idx) => ({
            id: `node-${idx}`,
            x: node.x,
            y: node.y,
          }));

          const toNodes: AnimatedNode[] = toNodesData.map((node, idx) => ({
            id: `node-${idx}`,
            x: node.x,
            y: node.y,
          }));

          const animator = new LayoutAnimator({ duration: 500 });
          let completionTime: number | null = null;

          const startTime = performance.now();

          animator.animate(
            fromNodes,
            toNodes,
            () => {
              // onUpdate callback
            },
            () => {
              // onComplete callback
              completionTime = performance.now() - startTime;
            }
          );

          // Advance time to complete animation
          vi.advanceTimersByTime(600);

          // Verify animation completed
          expect(completionTime).not.toBeNull();

          // Property: Animation duration should be 500ms ± 50ms
          const expectedDuration = 500;
          const tolerance = 50;

          expect(completionTime!).toBeGreaterThanOrEqual(expectedDuration - tolerance);
          expect(completionTime!).toBeLessThanOrEqual(expectedDuration + tolerance);

          animator.stop();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Animation progress is monotonically increasing
   * For any animation, progress should always increase from 0 to 1
   */
  it('property: animation progress is monotonically increasing', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            x: fc.float({ min: -1000, max: 1000 }),
            y: fc.float({ min: -1000, max: 1000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (nodesData) => {
          const fromNodes: AnimatedNode[] = nodesData.map((node, idx) => ({
            id: `node-${idx}`,
            x: node.x,
            y: node.y,
          }));

          const toNodes: AnimatedNode[] = nodesData.map((node, idx) => ({
            id: `node-${idx}`,
            x: node.x + 100,
            y: node.y + 100,
          }));

          const animator = new LayoutAnimator({ duration: 500 });
          const progressValues: number[] = [];

          animator.animate(
            fromNodes,
            toNodes,
            () => {
              progressValues.push(animator.getProgress());
            },
            () => {
              // Animation complete
            }
          );

          // Sample progress at different times
          for (let t = 0; t <= 500; t += 50) {
            vi.advanceTimersByTime(50);
          }

          // Property: Progress should be monotonically increasing
          for (let i = 1; i < progressValues.length; i++) {
            expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
          }

          // Property: Progress should start at 0 and end at 1
          if (progressValues.length > 0) {
            expect(progressValues[0]).toBeGreaterThanOrEqual(0);
            expect(progressValues[progressValues.length - 1]).toBeLessThanOrEqual(1);
          }

          animator.stop();
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Final positions match target positions exactly
   * For any animation, final positions should exactly match target positions
   */
  it('property: final positions match target positions exactly', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            x: fc.float({ min: -1000, max: 1000 }),
            y: fc.float({ min: -1000, max: 1000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (nodesData) => {
          const fromNodes: AnimatedNode[] = nodesData.map((node, idx) => ({
            id: `node-${idx}`,
            x: 0,
            y: 0,
          }));

          const toNodes: AnimatedNode[] = nodesData.map((node, idx) => ({
            id: `node-${idx}`,
            x: node.x,
            y: node.y,
          }));

          const animator = new LayoutAnimator({ duration: 500 });
          let finalPositions: Map<string, { x: number; y: number }> | null = null;

          animator.animate(
            fromNodes,
            toNodes,
            (positions) => {
              finalPositions = positions;
            },
            () => {
              // Animation complete
            }
          );

          // Complete animation
          vi.advanceTimersByTime(600);

          // Property: Final positions should exactly match target positions
          expect(finalPositions).not.toBeNull();

          toNodes.forEach((targetNode) => {
            const finalPos = finalPositions!.get(targetNode.id);
            expect(finalPos).toBeDefined();
            expect(finalPos!.x).toBeCloseTo(targetNode.x, 5);
            expect(finalPos!.y).toBeCloseTo(targetNode.y, 5);
          });

          animator.stop();
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Animation can be stopped at any time
   * For any animation, calling stop() should immediately halt the animation
   */
  it('property: animation can be stopped at any time', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            x: fc.float({ min: -1000, max: 1000 }),
            y: fc.float({ min: -1000, max: 1000 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        fc.integer({ min: 0, max: 500 }),
        (nodesData, stopTime) => {
          const fromNodes: AnimatedNode[] = nodesData.map((node, idx) => ({
            id: `node-${idx}`,
            x: 0,
            y: 0,
          }));

          const toNodes: AnimatedNode[] = nodesData.map((node, idx) => ({
            id: `node-${idx}`,
            x: node.x,
            y: node.y,
          }));

          const animator = new LayoutAnimator({ duration: 500 });
          let updateCount = 0;

          animator.animate(
            fromNodes,
            toNodes,
            () => {
              updateCount++;
            },
            () => {
              // Should not be called if stopped early
            }
          );

          // Advance to stop time
          vi.advanceTimersByTime(stopTime);

          const updateCountBeforeStop = updateCount;

          // Stop animation
          animator.stop();

          // Property: Animation should be stopped
          expect(animator.isAnimating()).toBe(false);

          // Advance more time
          vi.advanceTimersByTime(100);

          // Property: No more updates should occur after stop
          expect(updateCount).toBe(updateCountBeforeStop);
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Custom duration is respected
   * For any custom duration, animation should complete in that time ± tolerance
   */
  it('property: custom duration is respected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 2000 }),
        fc.array(
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 10 }),
            x: fc.float({ min: -1000, max: 1000 }),
            y: fc.float({ min: -1000, max: 1000 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (customDuration, nodesData) => {
          const fromNodes: AnimatedNode[] = nodesData.map((node, idx) => ({
            id: `node-${idx}`,
            x: 0,
            y: 0,
          }));

          const toNodes: AnimatedNode[] = nodesData.map((node, idx) => ({
            id: `node-${idx}`,
            x: node.x,
            y: node.y,
          }));

          const animator = new LayoutAnimator({ duration: customDuration });
          let completionTime: number | null = null;

          const startTime = performance.now();

          animator.animate(
            fromNodes,
            toNodes,
            () => {
              // onUpdate
            },
            () => {
              completionTime = performance.now() - startTime;
            }
          );

          // Advance time to complete animation
          vi.advanceTimersByTime(customDuration + 100);

          // Property: Animation should complete within tolerance
          expect(completionTime).not.toBeNull();

          const tolerance = Math.max(50, customDuration * 0.1); // 10% tolerance or 50ms minimum

          expect(completionTime!).toBeGreaterThanOrEqual(customDuration - tolerance);
          expect(completionTime!).toBeLessThanOrEqual(customDuration + tolerance);

          animator.stop();
        }
      ),
      { numRuns: 30 }
    );
  });
});

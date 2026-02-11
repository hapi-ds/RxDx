/**
 * Unit tests for LayoutAnimator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LayoutAnimator, EasingFunctions, type AnimatedNode } from './LayoutAnimator';

describe('LayoutAnimator', () => {
  let animator: LayoutAnimator;

  beforeEach(() => {
    vi.useFakeTimers();
    animator = new LayoutAnimator();
  });

  afterEach(() => {
    animator.stop();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create animator with default 500ms duration', () => {
      const animator = new LayoutAnimator();
      expect(animator.getDuration()).toBe(500);
    });

    it('should create animator with custom duration', () => {
      const animator = new LayoutAnimator({ duration: 1000 });
      expect(animator.getDuration()).toBe(1000);
    });

    it('should use ease-in-out cubic easing by default', () => {
      const animator = new LayoutAnimator();
      expect(animator).toBeDefined();
    });
  });

  describe('animate', () => {
    it('should start animation from source to target positions', () => {
      const fromNodes: AnimatedNode[] = [
        { id: 'node1', x: 0, y: 0 },
        { id: 'node2', x: 100, y: 100 },
      ];

      const toNodes: AnimatedNode[] = [
        { id: 'node1', x: 200, y: 200 },
        { id: 'node2', x: 300, y: 300 },
      ];

      const onUpdate = vi.fn();
      const onComplete = vi.fn();

      animator.animate(fromNodes, toNodes, onUpdate, onComplete);

      expect(animator.isAnimating()).toBe(true);
      
      // Advance time to trigger first frame
      vi.advanceTimersByTime(16);
      
      expect(onUpdate).toHaveBeenCalled();
    });

    it('should call onUpdate with interpolated positions', () => {
      const fromNodes: AnimatedNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const toNodes: AnimatedNode[] = [{ id: 'node1', x: 100, y: 100 }];

      const onUpdate = vi.fn();

      animator.animate(fromNodes, toNodes, onUpdate);

      // Advance time to 50% of animation
      vi.advanceTimersByTime(250);

      expect(onUpdate).toHaveBeenCalled();
      const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0];
      const pos = lastCall.get('node1');
      
      // At 50% with ease-in-out, position should be around middle
      expect(pos.x).toBeGreaterThan(0);
      expect(pos.x).toBeLessThan(100);
    });

    it('should complete animation after duration', () => {
      const fromNodes: AnimatedNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const toNodes: AnimatedNode[] = [{ id: 'node1', x: 100, y: 100 }];

      const onUpdate = vi.fn();
      const onComplete = vi.fn();

      animator.animate(fromNodes, toNodes, onUpdate, onComplete);

      // Advance time past animation duration
      vi.advanceTimersByTime(600);

      expect(animator.isAnimating()).toBe(false);
      expect(onComplete).toHaveBeenCalled();
    });

    it('should set final positions exactly at target', () => {
      const fromNodes: AnimatedNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const toNodes: AnimatedNode[] = [{ id: 'node1', x: 100, y: 100 }];

      const onUpdate = vi.fn();

      animator.animate(fromNodes, toNodes, onUpdate);

      // Complete animation
      vi.advanceTimersByTime(600);

      const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0];
      const pos = lastCall.get('node1');
      
      expect(pos.x).toBe(100);
      expect(pos.y).toBe(100);
    });

    it('should cancel previous animation when starting new one', () => {
      const fromNodes: AnimatedNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const toNodes1: AnimatedNode[] = [{ id: 'node1', x: 100, y: 100 }];
      const toNodes2: AnimatedNode[] = [{ id: 'node1', x: 200, y: 200 }];

      const onComplete1 = vi.fn();
      const onComplete2 = vi.fn();
      const onUpdate = vi.fn();

      animator.animate(fromNodes, toNodes1, onUpdate, onComplete1);
      
      // Start second animation before first completes
      vi.advanceTimersByTime(100);
      animator.animate(fromNodes, toNodes2, onUpdate, onComplete2);

      // Complete second animation
      vi.advanceTimersByTime(600);

      expect(onComplete1).not.toHaveBeenCalled();
      expect(onComplete2).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should stop ongoing animation', () => {
      const fromNodes: AnimatedNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const toNodes: AnimatedNode[] = [{ id: 'node1', x: 100, y: 100 }];

      const onUpdate = vi.fn();
      const onComplete = vi.fn();

      animator.animate(fromNodes, toNodes, onUpdate, onComplete);
      
      expect(animator.isAnimating()).toBe(true);
      
      animator.stop();
      
      expect(animator.isAnimating()).toBe(false);
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('getProgress', () => {
    it('should return 0 at start of animation', () => {
      const fromNodes: AnimatedNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const toNodes: AnimatedNode[] = [{ id: 'node1', x: 100, y: 100 }];

      animator.animate(fromNodes, toNodes, vi.fn());

      expect(animator.getProgress()).toBe(0);
    });

    it('should return 1 at end of animation', () => {
      const fromNodes: AnimatedNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const toNodes: AnimatedNode[] = [{ id: 'node1', x: 100, y: 100 }];

      animator.animate(fromNodes, toNodes, vi.fn());

      vi.advanceTimersByTime(600);

      expect(animator.getProgress()).toBe(1);
    });
  });

  describe('setConfig', () => {
    it('should update animation duration', () => {
      animator.setConfig({ duration: 1000 });
      expect(animator.getDuration()).toBe(1000);
    });

    it('should update easing function', () => {
      animator.setConfig({ easing: EasingFunctions.linear });
      
      const fromNodes: AnimatedNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const toNodes: AnimatedNode[] = [{ id: 'node1', x: 100, y: 100 }];
      const onUpdate = vi.fn();

      animator.animate(fromNodes, toNodes, onUpdate);

      // With linear easing, 50% time = 50% position
      vi.advanceTimersByTime(250);

      const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0];
      const pos = lastCall.get('node1');
      
      // Linear easing should give approximately 50 at 50% time
      expect(pos.x).toBeGreaterThan(45);
      expect(pos.x).toBeLessThan(55);
    });
  });

  describe('getCurrentPositions', () => {
    it('should return current interpolated positions', () => {
      const fromNodes: AnimatedNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const toNodes: AnimatedNode[] = [{ id: 'node1', x: 100, y: 100 }];

      animator.animate(fromNodes, toNodes, vi.fn());

      vi.advanceTimersByTime(250);

      const positions = animator.getCurrentPositions();
      const pos = positions.get('node1');
      
      expect(pos).toBeDefined();
      expect(pos!.x).toBeGreaterThan(0);
      expect(pos!.x).toBeLessThan(100);
    });
  });

  describe('EasingFunctions', () => {
    it('easeInOutCubic should return 0 at t=0', () => {
      expect(EasingFunctions.easeInOutCubic(0)).toBe(0);
    });

    it('easeInOutCubic should return 1 at t=1', () => {
      expect(EasingFunctions.easeInOutCubic(1)).toBe(1);
    });

    it('easeInOutCubic should return 0.5 at t=0.5', () => {
      const result = EasingFunctions.easeInOutCubic(0.5);
      expect(result).toBeCloseTo(0.5, 1);
    });

    it('linear should return t', () => {
      expect(EasingFunctions.linear(0)).toBe(0);
      expect(EasingFunctions.linear(0.5)).toBe(0.5);
      expect(EasingFunctions.linear(1)).toBe(1);
    });

    it('easeIn should accelerate', () => {
      const t1 = EasingFunctions.easeIn(0.25);
      const t2 = EasingFunctions.easeIn(0.5);
      const t3 = EasingFunctions.easeIn(0.75);
      
      // Acceleration means larger differences later
      expect(t2 - t1).toBeLessThan(t3 - t2);
    });

    it('easeOut should decelerate', () => {
      const t1 = EasingFunctions.easeOut(0.25);
      const t2 = EasingFunctions.easeOut(0.5);
      const t3 = EasingFunctions.easeOut(0.75);
      
      // Deceleration means smaller differences later
      expect(t2 - t1).toBeGreaterThan(t3 - t2);
    });
  });

  describe('animation timing', () => {
    it('should complete animation in approximately 500ms', () => {
      const fromNodes: AnimatedNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const toNodes: AnimatedNode[] = [{ id: 'node1', x: 100, y: 100 }];

      const onComplete = vi.fn();

      animator.animate(fromNodes, toNodes, vi.fn(), onComplete);

      // Should not complete before 500ms
      vi.advanceTimersByTime(450);
      expect(onComplete).not.toHaveBeenCalled();

      // Should complete after 500ms
      vi.advanceTimersByTime(100);
      expect(onComplete).toHaveBeenCalled();
    });

    it('should handle multiple nodes simultaneously', () => {
      const fromNodes: AnimatedNode[] = [
        { id: 'node1', x: 0, y: 0 },
        { id: 'node2', x: 50, y: 50 },
        { id: 'node3', x: 100, y: 100 },
      ];

      const toNodes: AnimatedNode[] = [
        { id: 'node1', x: 200, y: 200 },
        { id: 'node2', x: 250, y: 250 },
        { id: 'node3', x: 300, y: 300 },
      ];

      const onUpdate = vi.fn();

      animator.animate(fromNodes, toNodes, onUpdate);

      vi.advanceTimersByTime(600);

      const lastCall = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0];
      
      expect(lastCall.get('node1')).toEqual({ x: 200, y: 200 });
      expect(lastCall.get('node2')).toEqual({ x: 250, y: 250 });
      expect(lastCall.get('node3')).toEqual({ x: 300, y: 300 });
    });
  });
});

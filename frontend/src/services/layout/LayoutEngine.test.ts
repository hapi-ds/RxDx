/**
 * Unit tests for LayoutEngine
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LayoutEngine, type LayoutNode, type LayoutEdge, type LayoutConfig } from './LayoutEngine';

describe('LayoutEngine', () => {
  let engine: LayoutEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new LayoutEngine();
  });

  afterEach(() => {
    engine.stopAnimation();
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should create engine with default 500ms animation duration', () => {
      const engine = new LayoutEngine();
      expect(engine.getAnimationDuration()).toBe(500);
    });

    it('should create engine with custom animation duration', () => {
      const engine = new LayoutEngine({ animationDuration: 1000 });
      expect(engine.getAnimationDuration()).toBe(1000);
    });

    it('should preserve selection by default', () => {
      const engine = new LayoutEngine();
      engine.setSelectedNodes(['node1', 'node2']);
      expect(engine.getSelectedNodes()).toEqual(['node1', 'node2']);
    });
  });

  describe('calculateLayout', () => {
    const nodes: LayoutNode[] = [
      { id: 'node1', x: 0, y: 0 },
      { id: 'node2', x: 100, y: 100 },
      { id: 'node3', x: 200, y: 200 },
    ];

    const edges: LayoutEdge[] = [
      { source: 'node1', target: 'node2' },
      { source: 'node2', target: 'node3' },
    ];

    it('should calculate force layout', () => {
      const config: LayoutConfig = { algorithm: 'force' };
      const positions = engine.calculateLayout(nodes, edges, config);

      expect(positions.size).toBe(3);
      expect(positions.has('node1')).toBe(true);
      expect(positions.has('node2')).toBe(true);
      expect(positions.has('node3')).toBe(true);
    });

    it('should calculate hierarchical layout', () => {
      const config: LayoutConfig = { algorithm: 'hierarchical' };
      const positions = engine.calculateLayout(nodes, edges, config);

      expect(positions.size).toBe(3);
      expect(positions.has('node1')).toBe(true);
    });

    it('should calculate circular layout', () => {
      const config: LayoutConfig = { algorithm: 'circular' };
      const positions = engine.calculateLayout(nodes, edges, config);

      expect(positions.size).toBe(3);
      expect(positions.has('node1')).toBe(true);
    });

    it('should calculate grid layout', () => {
      const config: LayoutConfig = { algorithm: 'grid' };
      const positions = engine.calculateLayout(nodes, [], config);

      expect(positions.size).toBe(3);
      expect(positions.has('node1')).toBe(true);
    });

    it('should throw error for unknown algorithm', () => {
      const config = { algorithm: 'unknown' } as LayoutConfig;
      
      expect(() => {
        engine.calculateLayout(nodes, edges, config);
      }).toThrow('Unknown layout algorithm');
    });
  });

  describe('transitionToLayout', () => {
    const nodes: LayoutNode[] = [
      { id: 'node1', x: 0, y: 0 },
      { id: 'node2', x: 100, y: 100 },
    ];

    const edges: LayoutEdge[] = [
      { source: 'node1', target: 'node2' },
    ];

    it('should start transition animation', async () => {
      const fromPositions = new Map([
        ['node1', { x: 0, y: 0 }],
        ['node2', { x: 100, y: 100 }],
      ]);

      const config: LayoutConfig = { algorithm: 'grid' };
      const onUpdate = vi.fn();

      const promise = engine.transitionToLayout(nodes, edges, fromPositions, config, onUpdate);

      expect(engine.isAnimating()).toBe(true);

      // Complete animation
      vi.advanceTimersByTime(600);

      await promise;

      expect(engine.isAnimating()).toBe(false);
      expect(onUpdate).toHaveBeenCalled();
    });

    it('should update current algorithm after transition', async () => {
      const fromPositions = new Map([
        ['node1', { x: 0, y: 0 }],
        ['node2', { x: 100, y: 100 }],
      ]);

      const config: LayoutConfig = { algorithm: 'circular' };

      const promise = engine.transitionToLayout(nodes, edges, fromPositions, config, vi.fn());

      vi.advanceTimersByTime(600);

      await promise;

      expect(engine.getCurrentAlgorithm()).toBe('circular');
    });

    it('should call onUpdate with interpolated positions', async () => {
      const fromPositions = new Map([
        ['node1', { x: 0, y: 0 }],
      ]);

      const config: LayoutConfig = { algorithm: 'grid' };
      const onUpdate = vi.fn();

      const promise = engine.transitionToLayout(nodes.slice(0, 1), [], fromPositions, config, onUpdate);

      // Advance to middle of animation
      vi.advanceTimersByTime(250);

      expect(onUpdate).toHaveBeenCalled();

      // Complete animation
      vi.advanceTimersByTime(400);
      await promise;
    });
  });

  describe('selection preservation', () => {
    it('should preserve selected nodes', () => {
      engine.setSelectedNodes(['node1', 'node2', 'node3']);
      
      const selected = engine.getSelectedNodes();
      
      expect(selected).toEqual(['node1', 'node2', 'node3']);
    });

    it('should update selected nodes', () => {
      engine.setSelectedNodes(['node1', 'node2']);
      expect(engine.getSelectedNodes()).toEqual(['node1', 'node2']);
      
      engine.setSelectedNodes(['node3', 'node4']);
      expect(engine.getSelectedNodes()).toEqual(['node3', 'node4']);
    });

    it('should handle empty selection', () => {
      engine.setSelectedNodes([]);
      expect(engine.getSelectedNodes()).toEqual([]);
    });
  });

  describe('animation control', () => {
    it('should stop animation', async () => {
      const nodes: LayoutNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const fromPositions = new Map([['node1', { x: 0, y: 0 }]]);
      const config: LayoutConfig = { algorithm: 'grid' };

      engine.transitionToLayout(nodes, [], fromPositions, config, vi.fn());

      expect(engine.isAnimating()).toBe(true);

      engine.stopAnimation();

      expect(engine.isAnimating()).toBe(false);
    });

    it('should update animation duration', () => {
      engine.setAnimationDuration(1000);
      expect(engine.getAnimationDuration()).toBe(1000);
    });
  });

  describe('getCurrentAlgorithm', () => {
    it('should return force as default algorithm', () => {
      expect(engine.getCurrentAlgorithm()).toBe('force');
    });

    it('should return current algorithm after transition', async () => {
      const nodes: LayoutNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const fromPositions = new Map([['node1', { x: 0, y: 0 }]]);
      const config: LayoutConfig = { algorithm: 'hierarchical' };

      const promise = engine.transitionToLayout(nodes, [], fromPositions, config, vi.fn());

      vi.advanceTimersByTime(600);
      await promise;

      expect(engine.getCurrentAlgorithm()).toBe('hierarchical');
    });
  });

  describe('animation timing', () => {
    it('should complete transition in approximately 500ms', async () => {
      const nodes: LayoutNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const fromPositions = new Map([['node1', { x: 0, y: 0 }]]);
      const config: LayoutConfig = { algorithm: 'grid' };

      const startTime = performance.now();
      const promise = engine.transitionToLayout(nodes, [], fromPositions, config, vi.fn());

      // Should not complete before 500ms
      vi.advanceTimersByTime(450);
      expect(engine.isAnimating()).toBe(true);

      // Should complete after 500ms
      vi.advanceTimersByTime(100);
      await promise;

      expect(engine.isAnimating()).toBe(false);
    });

    it('should respect custom animation duration', async () => {
      engine.setAnimationDuration(1000);

      const nodes: LayoutNode[] = [{ id: 'node1', x: 0, y: 0 }];
      const fromPositions = new Map([['node1', { x: 0, y: 0 }]]);
      const config: LayoutConfig = { algorithm: 'grid' };

      const promise = engine.transitionToLayout(nodes, [], fromPositions, config, vi.fn());

      // Should not complete before 1000ms
      vi.advanceTimersByTime(900);
      expect(engine.isAnimating()).toBe(true);

      // Should complete after 1000ms
      vi.advanceTimersByTime(200);
      await promise;

      expect(engine.isAnimating()).toBe(false);
    });
  });
});

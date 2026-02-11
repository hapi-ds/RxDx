/**
 * Unit tests for Quadtree spatial partitioning
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Quadtree, type Point, type Rectangle } from './Quadtree';

describe('Quadtree', () => {
  let quadtree: Quadtree<string>;
  let boundary: Rectangle;

  beforeEach(() => {
    boundary = { x: 0, y: 0, width: 400, height: 400 };
    quadtree = new Quadtree<string>(boundary, 4);
  });

  describe('insert', () => {
    it('should insert point within boundary', () => {
      const point: Point = { x: 100, y: 100 };
      const result = quadtree.insert(point, 'node1');
      expect(result).toBe(true);
    });

    it('should reject point outside boundary', () => {
      const point: Point = { x: 500, y: 500 };
      const result = quadtree.insert(point, 'node1');
      expect(result).toBe(false);
    });

    it('should insert multiple points', () => {
      expect(quadtree.insert({ x: 100, y: 100 }, 'node1')).toBe(true);
      expect(quadtree.insert({ x: 200, y: 200 }, 'node2')).toBe(true);
      expect(quadtree.insert({ x: 300, y: 300 }, 'node3')).toBe(true);
    });

    it('should subdivide when capacity exceeded', () => {
      // Insert 5 points (capacity is 4)
      quadtree.insert({ x: 100, y: 100 }, 'node1');
      quadtree.insert({ x: 150, y: 150 }, 'node2');
      quadtree.insert({ x: 200, y: 200 }, 'node3');
      quadtree.insert({ x: 250, y: 250 }, 'node4');
      quadtree.insert({ x: 300, y: 300 }, 'node5');

      // All nodes should still be retrievable
      const all = quadtree.getAllNodes();
      expect(all).toHaveLength(5);
    });
  });

  describe('query', () => {
    beforeEach(() => {
      // Insert test data
      quadtree.insert({ x: 50, y: 50 }, 'node1');
      quadtree.insert({ x: 150, y: 150 }, 'node2');
      quadtree.insert({ x: 250, y: 250 }, 'node3');
      quadtree.insert({ x: 350, y: 350 }, 'node4');
    });

    it('should find points within range', () => {
      const range: Rectangle = { x: 0, y: 0, width: 200, height: 200 };
      const found = quadtree.query(range);
      expect(found).toHaveLength(2);
      expect(found.map(n => n.data)).toContain('node1');
      expect(found.map(n => n.data)).toContain('node2');
    });

    it('should return empty array for range with no points', () => {
      const range: Rectangle = { x: 400, y: 400, width: 100, height: 100 };
      const found = quadtree.query(range);
      expect(found).toHaveLength(0);
    });

    it('should find all points when range covers entire boundary', () => {
      const range: Rectangle = { x: 0, y: 0, width: 400, height: 400 };
      const found = quadtree.query(range);
      expect(found).toHaveLength(4);
    });
  });

  describe('queryRadius', () => {
    beforeEach(() => {
      // Insert test data in a pattern
      quadtree.insert({ x: 200, y: 200 }, 'center');
      quadtree.insert({ x: 210, y: 200 }, 'near1');
      quadtree.insert({ x: 200, y: 210 }, 'near2');
      quadtree.insert({ x: 300, y: 300 }, 'far');
    });

    it('should find points within radius', () => {
      const center: Point = { x: 200, y: 200 };
      const found = quadtree.queryRadius(center, 20);
      expect(found.length).toBeGreaterThanOrEqual(2);
      expect(found.map(n => n.data)).toContain('center');
      expect(found.map(n => n.data)).toContain('near1');
    });

    it('should not find points outside radius', () => {
      const center: Point = { x: 200, y: 200 };
      const found = quadtree.queryRadius(center, 20);
      expect(found.map(n => n.data)).not.toContain('far');
    });

    it('should find all points with large radius', () => {
      const center: Point = { x: 200, y: 200 };
      const found = quadtree.queryRadius(center, 200);
      expect(found).toHaveLength(4);
    });

    it('should return empty array for radius with no points', () => {
      const center: Point = { x: 0, y: 0 };
      const found = quadtree.queryRadius(center, 10);
      expect(found).toHaveLength(0);
    });
  });

  describe('getAllNodes', () => {
    it('should return empty array for empty quadtree', () => {
      const all = quadtree.getAllNodes();
      expect(all).toHaveLength(0);
    });

    it('should return all inserted nodes', () => {
      quadtree.insert({ x: 100, y: 100 }, 'node1');
      quadtree.insert({ x: 200, y: 200 }, 'node2');
      quadtree.insert({ x: 300, y: 300 }, 'node3');

      const all = quadtree.getAllNodes();
      expect(all).toHaveLength(3);
      expect(all.map(n => n.data)).toContain('node1');
      expect(all.map(n => n.data)).toContain('node2');
      expect(all.map(n => n.data)).toContain('node3');
    });

    it('should return all nodes after subdivision', () => {
      // Insert more than capacity to trigger subdivision
      for (let i = 0; i < 10; i++) {
        quadtree.insert({ x: i * 30, y: i * 30 }, `node${i}`);
      }

      const all = quadtree.getAllNodes();
      expect(all).toHaveLength(10);
    });
  });

  describe('clear', () => {
    it('should remove all nodes', () => {
      quadtree.insert({ x: 100, y: 100 }, 'node1');
      quadtree.insert({ x: 200, y: 200 }, 'node2');
      
      quadtree.clear();
      
      const all = quadtree.getAllNodes();
      expect(all).toHaveLength(0);
    });

    it('should allow new insertions after clear', () => {
      quadtree.insert({ x: 100, y: 100 }, 'node1');
      quadtree.clear();
      
      const result = quadtree.insert({ x: 200, y: 200 }, 'node2');
      expect(result).toBe(true);
      
      const all = quadtree.getAllNodes();
      expect(all).toHaveLength(1);
      expect(all[0].data).toBe('node2');
    });
  });

  describe('edge cases', () => {
    it('should handle points at boundary edges', () => {
      expect(quadtree.insert({ x: 0, y: 0 }, 'corner1')).toBe(true);
      expect(quadtree.insert({ x: 399, y: 399 }, 'corner2')).toBe(true);
    });

    it('should handle many points in same location', () => {
      for (let i = 0; i < 10; i++) {
        quadtree.insert({ x: 200, y: 200 }, `node${i}`);
      }
      
      const all = quadtree.getAllNodes();
      expect(all).toHaveLength(10);
    });

    it('should handle very small boundary', () => {
      const smallBoundary: Rectangle = { x: 0, y: 0, width: 10, height: 10 };
      const smallTree = new Quadtree<string>(smallBoundary);
      
      expect(smallTree.insert({ x: 5, y: 5 }, 'node1')).toBe(true);
      expect(smallTree.insert({ x: 15, y: 15 }, 'node2')).toBe(false);
    });
  });

  describe('performance', () => {
    it('should handle large number of insertions efficiently', () => {
      const startTime = performance.now();
      
      // Insert 1000 points
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 400;
        const y = Math.random() * 400;
        quadtree.insert({ x, y }, `node${i}`);
      }
      
      const endTime = performance.now();
      
      // Should complete in reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      
      const all = quadtree.getAllNodes();
      expect(all).toHaveLength(1000);
    });

    it('should query efficiently with many points', () => {
      // Insert 1000 points
      for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 400;
        const y = Math.random() * 400;
        quadtree.insert({ x, y }, `node${i}`);
      }
      
      const startTime = performance.now();
      
      // Query a small region
      const range: Rectangle = { x: 100, y: 100, width: 50, height: 50 };
      quadtree.query(range);
      
      const endTime = performance.now();
      
      // Should complete very quickly (< 10ms)
      expect(endTime - startTime).toBeLessThan(10);
    });
  });
});

/**
 * Unit tests for CollisionDetector
 * Tests quadtree-based collision detection with minimum spacing enforcement
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CollisionDetector, type NodeBounds } from './CollisionDetector';

describe('CollisionDetector', () => {
  let detector: CollisionDetector;

  beforeEach(() => {
    detector = new CollisionDetector(20); // 20px minimum spacing
  });

  describe('detectCollisions', () => {
    it('should detect no collisions for empty node list', () => {
      const result = detector.detectCollisions([]);
      expect(result.hasCollision).toBe(false);
      expect(result.collidingPairs).toHaveLength(0);
    });

    it('should detect no collisions for single node', () => {
      const nodes: NodeBounds[] = [
        { id: 'node1', x: 0, y: 0, width: 100, height: 50 },
      ];
      const result = detector.detectCollisions(nodes);
      expect(result.hasCollision).toBe(false);
      expect(result.collidingPairs).toHaveLength(0);
    });

    it('should detect no collisions for well-spaced nodes', () => {
      const nodes: NodeBounds[] = [
        { id: 'node1', x: 0, y: 0, width: 100, height: 50 },
        { id: 'node2', x: 200, y: 0, width: 100, height: 50 },
        { id: 'node3', x: 0, y: 200, width: 100, height: 50 },
      ];
      const result = detector.detectCollisions(nodes);
      expect(result.hasCollision).toBe(false);
      expect(result.collidingPairs).toHaveLength(0);
    });

    it('should detect collision when nodes are too close', () => {
      const nodes: NodeBounds[] = [
        { id: 'node1', x: 0, y: 0, width: 100, height: 50 },
        { id: 'node2', x: 60, y: 0, width: 100, height: 50 }, // Too close
      ];
      const result = detector.detectCollisions(nodes);
      expect(result.hasCollision).toBe(true);
      expect(result.collidingPairs).toHaveLength(1);
      expect(result.collidingPairs[0].nodeA).toBe('node1');
      expect(result.collidingPairs[0].nodeB).toBe('node2');
      expect(result.collidingPairs[0].overlap).toBeGreaterThan(0);
    });

    it('should detect collision when nodes overlap exactly', () => {
      const nodes: NodeBounds[] = [
        { id: 'node1', x: 0, y: 0, width: 100, height: 50 },
        { id: 'node2', x: 0, y: 0, width: 100, height: 50 }, // Same position
      ];
      const result = detector.detectCollisions(nodes);
      expect(result.hasCollision).toBe(true);
      expect(result.collidingPairs).toHaveLength(1);
    });

    it('should detect multiple collisions', () => {
      const nodes: NodeBounds[] = [
        { id: 'node1', x: 0, y: 0, width: 100, height: 50 },
        { id: 'node2', x: 60, y: 0, width: 100, height: 50 },
        { id: 'node3', x: 120, y: 0, width: 100, height: 50 },
      ];
      const result = detector.detectCollisions(nodes);
      expect(result.hasCollision).toBe(true);
      expect(result.collidingPairs.length).toBeGreaterThanOrEqual(2);
    });

    it('should respect minimum spacing of 20 pixels', () => {
      // Nodes exactly at minimum spacing should not collide
      const nodes: NodeBounds[] = [
        { id: 'node1', x: 0, y: 0, width: 100, height: 50, radius: 50 },
        { id: 'node2', x: 120, y: 0, width: 100, height: 50, radius: 50 }, // 50 + 50 + 20 = 120
      ];
      const result = detector.detectCollisions(nodes);
      expect(result.hasCollision).toBe(false);
    });

    it('should detect collision when spacing is less than minimum', () => {
      const nodes: NodeBounds[] = [
        { id: 'node1', x: 0, y: 0, width: 100, height: 50, radius: 50 },
        { id: 'node2', x: 115, y: 0, width: 100, height: 50, radius: 50 }, // Less than 120
      ];
      const result = detector.detectCollisions(nodes);
      expect(result.hasCollision).toBe(true);
    });

    it('should handle circular nodes with radius', () => {
      const nodes: NodeBounds[] = [
        { id: 'node1', x: 0, y: 0, width: 100, height: 100, radius: 50 },
        { id: 'node2', x: 100, y: 0, width: 100, height: 100, radius: 50 },
      ];
      const result = detector.detectCollisions(nodes);
      expect(result.hasCollision).toBe(true); // 50 + 50 = 100, but need 120 with spacing
    });

    it('should not report same pair twice', () => {
      const nodes: NodeBounds[] = [
        { id: 'node1', x: 0, y: 0, width: 100, height: 50 },
        { id: 'node2', x: 50, y: 0, width: 100, height: 50 },
      ];
      const result = detector.detectCollisions(nodes);
      expect(result.collidingPairs).toHaveLength(1);
    });
  });

  describe('areNodesColliding', () => {
    it('should return false for well-spaced nodes', () => {
      const nodeA: NodeBounds = { id: 'a', x: 0, y: 0, width: 100, height: 50 };
      const nodeB: NodeBounds = { id: 'b', x: 200, y: 0, width: 100, height: 50 };
      expect(detector.areNodesColliding(nodeA, nodeB)).toBe(false);
    });

    it('should return true for overlapping nodes', () => {
      const nodeA: NodeBounds = { id: 'a', x: 0, y: 0, width: 100, height: 50 };
      const nodeB: NodeBounds = { id: 'b', x: 50, y: 0, width: 100, height: 50 };
      expect(detector.areNodesColliding(nodeA, nodeB)).toBe(true);
    });
  });

  describe('getMinimumDistance', () => {
    it('should calculate correct minimum distance', () => {
      const nodeA: NodeBounds = { id: 'a', x: 0, y: 0, width: 100, height: 50, radius: 50 };
      const nodeB: NodeBounds = { id: 'b', x: 0, y: 0, width: 100, height: 50, radius: 50 };
      const minDist = detector.getMinimumDistance(nodeA, nodeB);
      expect(minDist).toBe(120); // 50 + 50 + 20
    });

    it('should use width/height when radius not provided', () => {
      const nodeA: NodeBounds = { id: 'a', x: 0, y: 0, width: 100, height: 50 };
      const nodeB: NodeBounds = { id: 'b', x: 0, y: 0, width: 100, height: 50 };
      const minDist = detector.getMinimumDistance(nodeA, nodeB);
      expect(minDist).toBe(120); // 50 + 50 + 20 (using max of width/height / 2)
    });
  });

  describe('setMinSpacing', () => {
    it('should update minimum spacing', () => {
      detector.setMinSpacing(30);
      expect(detector.getMinSpacing()).toBe(30);
    });

    it('should affect collision detection', () => {
      const nodes: NodeBounds[] = [
        { id: 'node1', x: 0, y: 0, width: 100, height: 50, radius: 50 },
        { id: 'node2', x: 115, y: 0, width: 100, height: 50, radius: 50 },
      ];

      // With 20px spacing, should collide
      detector.setMinSpacing(20);
      let result = detector.detectCollisions(nodes);
      expect(result.hasCollision).toBe(true);

      // With 10px spacing, should not collide
      detector.setMinSpacing(10);
      result = detector.detectCollisions(nodes);
      expect(result.hasCollision).toBe(false);
    });
  });

  describe('performance', () => {
    it('should handle large number of nodes efficiently', () => {
      // Generate 100 nodes in a grid
      const nodes: NodeBounds[] = [];
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          nodes.push({
            id: `node-${i}-${j}`,
            x: i * 150,
            y: j * 150,
            width: 100,
            height: 50,
          });
        }
      }

      const startTime = performance.now();
      const result = detector.detectCollisions(nodes);
      const endTime = performance.now();

      // Should complete in reasonable time (< 100ms for 100 nodes)
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.hasCollision).toBe(false); // Grid is well-spaced
    });
  });
});

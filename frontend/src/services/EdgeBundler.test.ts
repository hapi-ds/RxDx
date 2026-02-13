/**
 * EdgeBundler Unit Tests
 * Tests for edge bundling functionality
 */

import { describe, it, expect } from 'vitest';
import { EdgeBundler } from './EdgeBundler';
import type { Edge, Node } from '@xyflow/react';

describe('EdgeBundler', () => {
  const bundler = new EdgeBundler();

  // Helper to create a node
  const createNode = (id: string, x: number, y: number): Node => ({
    id,
    type: 'default',
    position: { x, y },
    data: { label: id },
  });

  // Helper to create an edge
  const createEdge = (id: string, source: string, target: string): Edge => ({
    id,
    source,
    target,
  });

  describe('areSimilar', () => {
    it('should detect similar edges with same direction', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
        ['n3', createNode('n3', 0, 10)],
        ['n4', createNode('n4', 100, 10)],
      ]);

      const edge1 = createEdge('e1', 'n1', 'n2');
      const edge2 = createEdge('e2', 'n3', 'n4');

      // Both edges go horizontally to the right
      expect(bundler.areSimilar(edge1, edge2, nodes)).toBe(true);
    });

    it('should detect dissimilar edges with different directions', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
        ['n3', createNode('n3', 0, 0)],
        ['n4', createNode('n4', 0, 100)],
      ]);

      const edge1 = createEdge('e1', 'n1', 'n2'); // Horizontal
      const edge2 = createEdge('e2', 'n3', 'n4'); // Vertical

      // 90-degree difference should not be similar
      expect(bundler.areSimilar(edge1, edge2, nodes)).toBe(false);
    });

    it('should detect similar edges within 15-degree threshold', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
        ['n3', createNode('n3', 0, 0)],
        ['n4', createNode('n4', 100, 10)], // Slight angle
      ]);

      const edge1 = createEdge('e1', 'n1', 'n2');
      const edge2 = createEdge('e2', 'n3', 'n4');

      // Small angle difference should be similar
      expect(bundler.areSimilar(edge1, edge2, nodes)).toBe(true);
    });

    it('should return false if nodes do not exist', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
      ]);

      const edge1 = createEdge('e1', 'n1', 'n2');
      const edge2 = createEdge('e2', 'n3', 'n4'); // n3 and n4 don't exist

      expect(bundler.areSimilar(edge1, edge2, nodes)).toBe(false);
    });
  });

  describe('bundleEdges', () => {
    it('should create bundles for similar edges', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
        ['n3', createNode('n3', 0, 10)],
        ['n4', createNode('n4', 100, 10)],
        ['n5', createNode('n5', 0, 20)],
        ['n6', createNode('n6', 100, 20)],
      ]);

      const edges = [
        createEdge('e1', 'n1', 'n2'),
        createEdge('e2', 'n3', 'n4'),
        createEdge('e3', 'n5', 'n6'),
      ];

      const bundles = bundler.bundleEdges(edges, nodes);

      // All three edges should be bundled together (similar horizontal direction)
      expect(bundles.length).toBeGreaterThan(0);
      
      // Check that at least one bundle contains multiple edges
      const hasMultiEdgeBundle = bundles.some(b => b.edges.length >= 2);
      expect(hasMultiEdgeBundle).toBe(true);
    });

    it('should not create bundles for dissimilar edges', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
        ['n3', createNode('n3', 0, 0)],
        ['n4', createNode('n4', 0, 100)],
      ]);

      const edges = [
        createEdge('e1', 'n1', 'n2'), // Horizontal
        createEdge('e2', 'n3', 'n4'), // Vertical
      ];

      const bundles = bundler.bundleEdges(edges, nodes);

      // No bundles should be created (edges are too different)
      expect(bundles.length).toBe(0);
    });

    it('should not create bundles with only one edge', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
      ]);

      const edges = [createEdge('e1', 'n1', 'n2')];

      const bundles = bundler.bundleEdges(edges, nodes);

      // Single edge should not form a bundle
      expect(bundles.length).toBe(0);
    });

    it('should create bundle with correct properties', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
        ['n3', createNode('n3', 0, 10)],
        ['n4', createNode('n4', 100, 10)],
      ]);

      const edges = [
        createEdge('e1', 'n1', 'n2'),
        createEdge('e2', 'n3', 'n4'),
      ];

      const bundles = bundler.bundleEdges(edges, nodes);

      expect(bundles.length).toBeGreaterThan(0);
      
      const bundle = bundles[0];
      expect(bundle.edges.length).toBe(2);
      expect(bundle.path).toBeTruthy();
      expect(bundle.width).toBeGreaterThan(0);
      expect(bundle.width).toBeLessThanOrEqual(10); // Max width
      expect(bundle.controlPoints.length).toBeGreaterThan(0);
    });
  });

  describe('getEdgesInBundle', () => {
    it('should return edges in the same bundle', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
        ['n3', createNode('n3', 0, 10)],
        ['n4', createNode('n4', 100, 10)],
      ]);

      const edges = [
        createEdge('e1', 'n1', 'n2'),
        createEdge('e2', 'n3', 'n4'),
      ];

      const bundles = bundler.bundleEdges(edges, nodes);

      if (bundles.length > 0) {
        const edgesInBundle = bundler.getEdgesInBundle('e1', bundles);
        expect(edgesInBundle).toContain('e1');
        expect(edgesInBundle).toContain('e2');
      }
    });

    it('should return empty array for unbundled edge', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
      ]);

      const edges = [createEdge('e1', 'n1', 'n2')];

      const bundles = bundler.bundleEdges(edges, nodes);

      const edgesInBundle = bundler.getEdgesInBundle('e1', bundles);
      expect(edgesInBundle).toEqual([]);
    });
  });

  describe('isEdgeBundled', () => {
    it('should return true for bundled edge', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
        ['n3', createNode('n3', 0, 10)],
        ['n4', createNode('n4', 100, 10)],
      ]);

      const edges = [
        createEdge('e1', 'n1', 'n2'),
        createEdge('e2', 'n3', 'n4'),
      ];

      const bundles = bundler.bundleEdges(edges, nodes);

      if (bundles.length > 0) {
        expect(bundler.isEdgeBundled('e1', bundles)).toBe(true);
      }
    });

    it('should return false for unbundled edge', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
      ]);

      const edges = [createEdge('e1', 'n1', 'n2')];

      const bundles = bundler.bundleEdges(edges, nodes);

      expect(bundler.isEdgeBundled('e1', bundles)).toBe(false);
    });
  });

  describe('bundle path calculation', () => {
    it('should create valid SVG path', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
        ['n3', createNode('n3', 0, 10)],
        ['n4', createNode('n4', 100, 10)],
      ]);

      const edges = [
        createEdge('e1', 'n1', 'n2'),
        createEdge('e2', 'n3', 'n4'),
      ];

      const bundles = bundler.bundleEdges(edges, nodes);

      if (bundles.length > 0) {
        const bundle = bundles[0];
        
        // Path should start with M (move to)
        expect(bundle.path).toMatch(/^M/);
        
        // Path should contain Q (quadratic bezier) or L (line)
        expect(bundle.path).toMatch(/[QL]/);
      }
    });

    it('should have control points', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
        ['n3', createNode('n3', 0, 10)],
        ['n4', createNode('n4', 100, 10)],
      ]);

      const edges = [
        createEdge('e1', 'n1', 'n2'),
        createEdge('e2', 'n3', 'n4'),
      ];

      const bundles = bundler.bundleEdges(edges, nodes);

      if (bundles.length > 0) {
        const bundle = bundles[0];
        
        // Should have at least 2 control points (start and end)
        expect(bundle.controlPoints.length).toBeGreaterThanOrEqual(2);
        
        // Control points should have x and y coordinates
        bundle.controlPoints.forEach((point) => {
          expect(typeof point.x).toBe('number');
          expect(typeof point.y).toBe('number');
        });
      }
    });
  });

  describe('bundle width calculation', () => {
    it('should scale width with number of edges', () => {
      const nodes = new Map<string, Node>([
        ['n1', createNode('n1', 0, 0)],
        ['n2', createNode('n2', 100, 0)],
        ['n3', createNode('n3', 0, 10)],
        ['n4', createNode('n4', 100, 10)],
        ['n5', createNode('n5', 0, 20)],
        ['n6', createNode('n6', 100, 20)],
      ]);

      const edges = [
        createEdge('e1', 'n1', 'n2'),
        createEdge('e2', 'n3', 'n4'),
        createEdge('e3', 'n5', 'n6'),
      ];

      const bundles = bundler.bundleEdges(edges, nodes);

      if (bundles.length > 0) {
        const bundle = bundles[0];
        
        // Width should be proportional to edge count (2 pixels per edge)
        const expectedWidth = Math.min(bundle.edges.length * 2, 10);
        expect(bundle.width).toBe(expectedWidth);
      }
    });

    it('should cap width at maximum', () => {
      const nodes = new Map<string, Node>();
      const edges: Edge[] = [];

      // Create many similar edges
      for (let i = 0; i < 10; i++) {
        nodes.set(`n${i}a`, createNode(`n${i}a`, 0, i * 10));
        nodes.set(`n${i}b`, createNode(`n${i}b`, 100, i * 10));
        edges.push(createEdge(`e${i}`, `n${i}a`, `n${i}b`));
      }

      const bundles = bundler.bundleEdges(edges, nodes);

      if (bundles.length > 0) {
        const bundle = bundles[0];
        
        // Width should not exceed maximum of 10 pixels
        expect(bundle.width).toBeLessThanOrEqual(10);
      }
    });
  });
});

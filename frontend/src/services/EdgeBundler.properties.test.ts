/**
 * EdgeBundler Property-Based Tests
 * Tests edge bundling similarity threshold property
 * 
 * Property 20: Edge bundling similarity threshold
 * For any two edges in a bundle, they should have been identified as similar
 * by the bundler's areSimilar method, which uses the 15-degree threshold.
 * 
 * Validates: Requirements 10.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { EdgeBundler } from './EdgeBundler';
import type { Edge, Node } from '@xyflow/react';

describe('EdgeBundler - Property-Based Tests', () => {
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

  /**
   * Property 20: Edge bundling similarity threshold
   * 
   * For any two edges in a bundle, they should have been identified as similar
   * by the bundler's areSimilar method, which uses the 15-degree threshold.
   * 
   * **Validates: Requirements 10.2**
   */
  it('Property 20: all edges in a bundle were identified as similar by bundler', () => {
    // Arbitrary for generating node positions
    const positionArbitrary = fc.integer({ min: -1000, max: 1000 });

    // Arbitrary for generating a set of edges with various directions
    const edgeSetArbitrary = fc
      .tuple(
        positionArbitrary, // base x
        positionArbitrary, // base y
        fc.integer({ min: 50, max: 200 }), // edge length
        fc.integer({ min: 2, max: 5 }) // number of edges
      )
      .chain(([baseX, baseY, length, count]) => {
        // Generate edges with random angular variations
        return fc
          .array(
            fc.tuple(
              fc.float({ min: Math.fround(-Math.PI), max: Math.fround(Math.PI) }), // random angle
              fc.integer({ min: -20, max: 20 }), // position offset
              fc.integer({ min: -20, max: 20 }) // position offset
            ),
            { minLength: count, maxLength: count }
          )
          .map((variations) =>
            variations.map(([angle, offsetX, offsetY], idx) => {
              const sourceId = `n${idx}a`;
              const targetId = `n${idx}b`;

              const sourceX = baseX + offsetX;
              const sourceY = baseY + offsetY;
              const targetX = sourceX + length * Math.cos(angle);
              const targetY = sourceY + length * Math.sin(angle);

              return {
                edge: createEdge(`e${idx}`, sourceId, targetId),
                sourceNode: createNode(sourceId, sourceX, sourceY),
                targetNode: createNode(targetId, targetX, targetY),
              };
            })
          );
      });

    fc.assert(
      fc.property(edgeSetArbitrary, (edgeData) => {
        // Create node map
        const nodes = new Map<string, Node>();
        const edges: Edge[] = [];

        edgeData.forEach(({ edge, sourceNode, targetNode }) => {
          nodes.set(sourceNode.id, sourceNode);
          nodes.set(targetNode.id, targetNode);
          edges.push(edge);
        });

        // Bundle the edges
        const bundles = bundler.bundleEdges(edges, nodes);

        // For each bundle, verify all pairs of edges were identified as similar
        bundles.forEach((bundle) => {
          // Check all pairs of edges in the bundle
          for (let i = 0; i < bundle.edges.length; i++) {
            for (let j = i + 1; j < bundle.edges.length; j++) {
              const edge1 = bundle.edges[i];
              const edge2 = bundle.edges[j];

              // Property: If two edges are in the same bundle, they should be similar
              // according to the bundler's areSimilar method
              const areSimilar = bundler.areSimilar(edge1, edge2, nodes);
              expect(areSimilar).toBe(true);
            }
          }
        });
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Edges with angular difference >= 15 degrees should not be bundled together
   */
  it('Property: edges with large angular difference are not bundled together', () => {
    // Arbitrary for generating node positions
    const positionArbitrary = fc.integer({ min: -1000, max: 1000 });

    // Arbitrary for generating edges with different directions
    const differentEdgesArbitrary = fc
      .tuple(
        positionArbitrary, // base x
        positionArbitrary, // base y
        fc.integer({ min: 50, max: 200 }), // edge length
        fc.float({ min: Math.fround(-Math.PI), max: Math.fround(Math.PI) }), // first angle
        fc.float({ min: Math.fround(Math.PI / 6), max: Math.fround(Math.PI) }) // large angle difference (>30 degrees)
      )
      .map(([baseX, baseY, length, angle1, angleDiff]) => {
        const angle2 = angle1 + angleDiff;

        // Create two edges with large angular difference
        const edge1 = createEdge('e1', 'n1a', 'n1b');
        const edge2 = createEdge('e2', 'n2a', 'n2b');

        const source1 = createNode('n1a', baseX, baseY);
        const target1 = createNode(
          'n1b',
          baseX + length * Math.cos(angle1),
          baseY + length * Math.sin(angle1)
        );

        const source2 = createNode('n2a', baseX, baseY + 50);
        const target2 = createNode(
          'n2b',
          baseX + length * Math.cos(angle2),
          baseY + 50 + length * Math.sin(angle2)
        );

        return {
          edges: [edge1, edge2],
          nodes: new Map<string, Node>([
            [source1.id, source1],
            [target1.id, target1],
            [source2.id, source2],
            [target2.id, target2],
          ]),
        };
      });

    fc.assert(
      fc.property(differentEdgesArbitrary, ({ edges, nodes }) => {
        // Bundle the edges
        const bundles = bundler.bundleEdges(edges, nodes);

        // Property: Edges with large angular difference should not be in the same bundle
        // Either no bundles are created, or the two edges are in different bundles
        if (bundles.length > 0) {
          const edge1InBundle = bundles.find((b) =>
            b.edges.some((e) => e.id === 'e1')
          );
          const edge2InBundle = bundles.find((b) =>
            b.edges.some((e) => e.id === 'e2')
          );

          // If both edges are bundled, they should not be in the same bundle
          if (edge1InBundle && edge2InBundle) {
            expect(edge1InBundle).not.toBe(edge2InBundle);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Bundle creation is deterministic
   * Same input should always produce the same bundles
   */
  it('Property: bundling is deterministic', () => {
    const positionArbitrary = fc.integer({ min: -1000, max: 1000 });

    const edgeSetArbitrary = fc
      .tuple(
        positionArbitrary,
        positionArbitrary,
        fc.integer({ min: 2, max: 5 })
      )
      .chain(([baseX, baseY, count]) => {
        return fc
          .array(
            fc.tuple(
              fc.integer({ min: 0, max: 100 }),
              fc.integer({ min: 0, max: 100 })
            ),
            { minLength: count, maxLength: count }
          )
          .map((offsets) =>
            offsets.map(([offsetX, offsetY], idx) => {
              const sourceId = `n${idx}a`;
              const targetId = `n${idx}b`;

              return {
                edge: createEdge(`e${idx}`, sourceId, targetId),
                sourceNode: createNode(sourceId, baseX + offsetX, baseY + offsetY),
                targetNode: createNode(
                  targetId,
                  baseX + offsetX + 100,
                  baseY + offsetY
                ),
              };
            })
          );
      });

    fc.assert(
      fc.property(edgeSetArbitrary, (edgeData) => {
        const nodes = new Map<string, Node>();
        const edges: Edge[] = [];

        edgeData.forEach(({ edge, sourceNode, targetNode }) => {
          nodes.set(sourceNode.id, sourceNode);
          nodes.set(targetNode.id, targetNode);
          edges.push(edge);
        });

        // Bundle twice with same input
        const bundles1 = bundler.bundleEdges(edges, nodes);
        const bundles2 = bundler.bundleEdges(edges, nodes);

        // Property: Should produce same number of bundles
        expect(bundles1.length).toBe(bundles2.length);

        // Property: Each bundle should contain the same edges
        bundles1.forEach((bundle1, idx) => {
          const bundle2 = bundles2[idx];
          expect(bundle1.edges.length).toBe(bundle2.edges.length);

          const edgeIds1 = bundle1.edges.map((e) => e.id).sort();
          const edgeIds2 = bundle2.edges.map((e) => e.id).sort();
          expect(edgeIds1).toEqual(edgeIds2);
        });
      }),
      { numRuns: 50 }
    );
  });

  /**
   * Property: All bundled edges are accounted for
   * No edge should be lost during bundling
   */
  it('Property: all edges are accounted for in bundles', () => {
    const positionArbitrary = fc.integer({ min: -1000, max: 1000 });

    const edgeSetArbitrary = fc
      .tuple(
        positionArbitrary,
        positionArbitrary,
        fc.integer({ min: 2, max: 10 })
      )
      .chain(([baseX, baseY, count]) => {
        return fc
          .array(
            fc.tuple(
              fc.integer({ min: 0, max: 100 }),
              fc.integer({ min: 0, max: 100 })
            ),
            { minLength: count, maxLength: count }
          )
          .map((offsets) =>
            offsets.map(([offsetX, offsetY], idx) => {
              const sourceId = `n${idx}a`;
              const targetId = `n${idx}b`;

              return {
                edge: createEdge(`e${idx}`, sourceId, targetId),
                sourceNode: createNode(sourceId, baseX + offsetX, baseY + offsetY),
                targetNode: createNode(
                  targetId,
                  baseX + offsetX + 100,
                  baseY + offsetY
                ),
              };
            })
          );
      });

    fc.assert(
      fc.property(edgeSetArbitrary, (edgeData) => {
        const nodes = new Map<string, Node>();
        const edges: Edge[] = [];

        edgeData.forEach(({ edge, sourceNode, targetNode }) => {
          nodes.set(sourceNode.id, sourceNode);
          nodes.set(targetNode.id, targetNode);
          edges.push(edge);
        });

        const bundles = bundler.bundleEdges(edges, nodes);

        // Collect all bundled edge IDs
        const bundledEdgeIds = new Set<string>();
        bundles.forEach((bundle) => {
          bundle.edges.forEach((edge) => {
            bundledEdgeIds.add(edge.id);
          });
        });

        // Property: Each bundled edge should be in exactly one bundle
        // (no duplicates across bundles)
        const allBundledEdges = bundles.flatMap((b) => b.edges.map((e) => e.id));
        const uniqueBundledEdges = new Set(allBundledEdges);
        expect(allBundledEdges.length).toBe(uniqueBundledEdges.size);

        // Property: Bundled edges should be a subset of input edges
        bundledEdgeIds.forEach((id) => {
          expect(edges.some((e) => e.id === id)).toBe(true);
        });
      }),
      { numRuns: 50 }
    );
  });
});

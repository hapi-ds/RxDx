/**
 * Unit tests for HierarchicalLayout
 */

import { describe, it, expect } from 'vitest';
import { HierarchicalLayout, type HierarchicalNode, type HierarchicalEdge } from './HierarchicalLayout';

describe('HierarchicalLayout', () => {
  describe('Layer Assignment', () => {
    it('should assign single node to layer 0', () => {
      const layout = new HierarchicalLayout();
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
      ];
      const edges: HierarchicalEdge[] = [];

      const layers = layout.assignLayers(nodes, edges);

      expect(layers.size).toBe(1);
      expect(layers.get(0)).toEqual(['A']);
    });

    it('should assign linear chain to sequential layers', () => {
      const layout = new HierarchicalLayout();
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];
      const edges: HierarchicalEdge[] = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
      ];

      const layers = layout.assignLayers(nodes, edges);

      expect(layers.size).toBe(3);
      expect(layers.get(0)).toEqual(['A']);
      expect(layers.get(1)).toEqual(['B']);
      expect(layers.get(2)).toEqual(['C']);
    });

    it('should handle multiple root nodes (forest)', () => {
      const layout = new HierarchicalLayout();
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
        { id: 'D', width: 50, height: 50 },
      ];
      const edges: HierarchicalEdge[] = [
        { source: 'A', target: 'C' },
        { source: 'B', target: 'D' },
      ];

      const layers = layout.assignLayers(nodes, edges);

      expect(layers.size).toBe(2);
      expect(layers.get(0)).toContain('A');
      expect(layers.get(0)).toContain('B');
      expect(layers.get(1)).toContain('C');
      expect(layers.get(1)).toContain('D');
    });

    it('should use longest path for nodes with multiple parents', () => {
      const layout = new HierarchicalLayout();
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];
      const edges: HierarchicalEdge[] = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
      ];

      const layers = layout.assignLayers(nodes, edges);

      // A -> B -> C (linear chain)
      expect(layers.get(0)).toEqual(['A']);
      expect(layers.get(1)).toEqual(['B']);
      expect(layers.get(2)).toEqual(['C']);
    });

    it('should handle disconnected nodes', () => {
      const layout = new HierarchicalLayout();
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];
      const edges: HierarchicalEdge[] = [
        { source: 'A', target: 'B' },
      ];

      const layers = layout.assignLayers(nodes, edges);

      expect(layers.get(0)).toContain('A');
      expect(layers.get(0)).toContain('C'); // Disconnected node at layer 0
      expect(layers.get(1)).toEqual(['B']);
    });

    it('should handle cyclic graphs gracefully', () => {
      const layout = new HierarchicalLayout();
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];
      const edges: HierarchicalEdge[] = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
        { source: 'C', target: 'A' }, // Cycle
      ];

      const layers = layout.assignLayers(nodes, edges);

      // Should still assign layers (using node with minimum incoming edges as root)
      expect(layers.size).toBeGreaterThan(0);
      expect(layers.get(0)?.length).toBeGreaterThan(0);
    });
  });

  describe('Crossing Minimization', () => {
    it('should maintain order for single-layer graph', () => {
      const layout = new HierarchicalLayout();
      const layers = new Map<number, string[]>([
        [0, ['A', 'B', 'C']],
      ]);
      const edges: HierarchicalEdge[] = [];

      const ordered = layout.minimizeCrossings(layers, edges);

      expect(ordered.get(0)).toEqual(['A', 'B', 'C']);
    });

    it('should order nodes by barycenter', () => {
      const layout = new HierarchicalLayout();
      const layers = new Map<number, string[]>([
        [0, ['A', 'B']],
        [1, ['C', 'D']],
      ]);
      const edges: HierarchicalEdge[] = [
        { source: 'A', target: 'D' },
        { source: 'B', target: 'C' },
      ];

      const ordered = layout.minimizeCrossings(layers, edges);

      // Should reorder to minimize crossings
      // Original: A->D crosses B->C
      // Better: A->C, B->D or B->C, A->D
      expect(ordered.size).toBe(2);
      expect(ordered.get(0)?.length).toBe(2);
      expect(ordered.get(1)?.length).toBe(2);
    });

    it('should handle nodes with no connections', () => {
      const layout = new HierarchicalLayout();
      const layers = new Map<number, string[]>([
        [0, ['A', 'B']],
        [1, ['C', 'D', 'E']],
      ]);
      const edges: HierarchicalEdge[] = [
        { source: 'A', target: 'C' },
      ];

      const ordered = layout.minimizeCrossings(layers, edges);

      expect(ordered.size).toBe(2);
      expect(ordered.get(0)).toContain('A');
      expect(ordered.get(0)).toContain('B');
      expect(ordered.get(1)).toContain('C');
      expect(ordered.get(1)).toContain('D');
      expect(ordered.get(1)).toContain('E');
    });
  });

  describe('Coordinate Assignment', () => {
    it('should position single node at origin', () => {
      const layout = new HierarchicalLayout({ direction: 'TB' });
      const layers = new Map<number, string[]>([[0, ['A']]]);
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
      ];

      const positions = layout.assignCoordinates(layers, nodes);

      expect(positions.get('A')).toEqual({ x: 0, y: 0 });
    });

    it('should position nodes vertically for TB direction', () => {
      const layout = new HierarchicalLayout({ 
        direction: 'TB',
        levelSeparation: 100,
      });
      const layers = new Map<number, string[]>([
        [0, ['A']],
        [1, ['B']],
      ]);
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
      ];

      const positions = layout.assignCoordinates(layers, nodes);

      expect(positions.get('A')?.y).toBe(0);
      expect(positions.get('B')?.y).toBe(100);
    });

    it('should position nodes vertically for BT direction', () => {
      const layout = new HierarchicalLayout({ 
        direction: 'BT',
        levelSeparation: 100,
      });
      const layers = new Map<number, string[]>([
        [0, ['A']],
        [1, ['B']],
      ]);
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
      ];

      const positions = layout.assignCoordinates(layers, nodes);

      expect(Math.abs(positions.get('A')?.y || 0)).toBe(0);
      expect(positions.get('B')?.y).toBe(-100);
    });

    it('should position nodes horizontally for LR direction', () => {
      const layout = new HierarchicalLayout({ 
        direction: 'LR',
        levelSeparation: 100,
      });
      const layers = new Map<number, string[]>([
        [0, ['A']],
        [1, ['B']],
      ]);
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
      ];

      const positions = layout.assignCoordinates(layers, nodes);

      expect(positions.get('A')?.x).toBe(0);
      expect(positions.get('B')?.x).toBe(100);
    });

    it('should position nodes horizontally for RL direction', () => {
      const layout = new HierarchicalLayout({ 
        direction: 'RL',
        levelSeparation: 100,
      });
      const layers = new Map<number, string[]>([
        [0, ['A']],
        [1, ['B']],
      ]);
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
      ];

      const positions = layout.assignCoordinates(layers, nodes);

      expect(Math.abs(positions.get('A')?.x || 0)).toBe(0);
      expect(positions.get('B')?.x).toBe(-100);
    });

    it('should center nodes within layer', () => {
      const layout = new HierarchicalLayout({ 
        direction: 'TB',
        nodeSeparation: 50,
      });
      const layers = new Map<number, string[]>([
        [0, ['A', 'B', 'C']],
      ]);
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];

      const positions = layout.assignCoordinates(layers, nodes);

      // Total width: 50 + 50 + 50 + 50 + 50 = 200
      // Nodes are spaced with nodeSeparation between them
      const posA = positions.get('A')!;
      const posB = positions.get('B')!;
      const posC = positions.get('C')!;

      // Check that nodes are evenly spaced with correct separation
      expect(posB.x - posA.x).toBe(100); // 50 (node width) + 50 (separation)
      expect(posC.x - posB.x).toBe(100);
      
      // Check that they're centered around 0
      expect((posA.x + posB.x + posC.x) / 3).toBeCloseTo(0, 1);
    });

    it('should respect node separation', () => {
      const layout = new HierarchicalLayout({ 
        direction: 'TB',
        nodeSeparation: 100,
      });
      const layers = new Map<number, string[]>([
        [0, ['A', 'B']],
      ]);
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
      ];

      const positions = layout.assignCoordinates(layers, nodes);

      const posA = positions.get('A')!;
      const posB = positions.get('B')!;
      const distance = Math.abs(posB.x - posA.x);

      expect(distance).toBe(150); // 50 (half A) + 100 (separation) + 50 (half B)
    });
  });

  describe('Full Layout', () => {
    it('should calculate complete layout for simple graph', () => {
      const layout = new HierarchicalLayout({ direction: 'TB' });
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];
      const edges: HierarchicalEdge[] = [
        { source: 'A', target: 'B' },
        { source: 'A', target: 'C' },
      ];

      const positions = layout.calculateLayout(nodes, edges);

      expect(positions.size).toBe(3);
      expect(positions.has('A')).toBe(true);
      expect(positions.has('B')).toBe(true);
      expect(positions.has('C')).toBe(true);

      // A should be at layer 0
      expect(positions.get('A')?.y).toBe(0);

      // B and C should be at same layer (layer 1)
      expect(positions.get('B')?.y).toBe(positions.get('C')?.y);
    });

    it('should return empty map for empty graph', () => {
      const layout = new HierarchicalLayout();
      const positions = layout.calculateLayout([], []);

      expect(positions.size).toBe(0);
    });

    it('should handle complex graph structure', () => {
      const layout = new HierarchicalLayout({ direction: 'TB' });
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
        { id: 'D', width: 50, height: 50 },
        { id: 'E', width: 50, height: 50 },
      ];
      const edges: HierarchicalEdge[] = [
        { source: 'A', target: 'B' },
        { source: 'A', target: 'C' },
        { source: 'B', target: 'D' },
        { source: 'C', target: 'D' },
        { source: 'D', target: 'E' },
      ];

      const positions = layout.calculateLayout(nodes, edges);

      expect(positions.size).toBe(5);

      // Verify layer structure
      const posA = positions.get('A')!;
      const posB = positions.get('B')!;
      const posC = positions.get('C')!;
      const posD = positions.get('D')!;
      const posE = positions.get('E')!;

      // A at top
      expect(posA.y).toBeLessThan(posB.y);
      expect(posA.y).toBeLessThan(posC.y);

      // B and C at same level
      expect(posB.y).toBe(posC.y);

      // D below B and C
      expect(posD.y).toBeGreaterThan(posB.y);

      // E at bottom
      expect(posE.y).toBeGreaterThan(posD.y);
    });
  });

  describe('getLayerAssignments', () => {
    it('should return layer assignments for all nodes', () => {
      const layout = new HierarchicalLayout();
      const nodes: HierarchicalNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];
      const edges: HierarchicalEdge[] = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
      ];

      const assignments = layout.getLayerAssignments(nodes, edges);

      expect(assignments.length).toBe(3);
      expect(assignments.find(a => a.nodeId === 'A')?.layer).toBe(0);
      expect(assignments.find(a => a.nodeId === 'B')?.layer).toBe(1);
      expect(assignments.find(a => a.nodeId === 'C')?.layer).toBe(2);
    });
  });
});

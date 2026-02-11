import { describe, it, expect } from 'vitest';
import { CircularLayout, type CircularNode, type CircularEdge } from './CircularLayout';

describe('CircularLayout', () => {
  describe('calculateDegrees', () => {
    it('should calculate node degrees correctly', () => {
      const layout = new CircularLayout();
      const nodes: CircularNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];
      const edges: CircularEdge[] = [
        { source: 'A', target: 'B' },
        { source: 'A', target: 'C' },
        { source: 'B', target: 'C' },
      ];

      const degrees = layout.calculateDegrees(nodes, edges);

      expect(degrees.get('A')).toBe(2);
      expect(degrees.get('B')).toBe(2);
      expect(degrees.get('C')).toBe(2);
    });

    it('should handle nodes with no edges', () => {
      const layout = new CircularLayout();
      const nodes: CircularNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
      ];
      const edges: CircularEdge[] = [];

      const degrees = layout.calculateDegrees(nodes, edges);

      expect(degrees.get('A')).toBe(0);
      expect(degrees.get('B')).toBe(0);
    });

    it('should handle hub node with multiple connections', () => {
      const layout = new CircularLayout();
      const nodes: CircularNode[] = [
        { id: 'hub', width: 50, height: 50 },
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];
      const edges: CircularEdge[] = [
        { source: 'hub', target: 'A' },
        { source: 'hub', target: 'B' },
        { source: 'hub', target: 'C' },
      ];

      const degrees = layout.calculateDegrees(nodes, edges);

      expect(degrees.get('hub')).toBe(3);
      expect(degrees.get('A')).toBe(1);
      expect(degrees.get('B')).toBe(1);
      expect(degrees.get('C')).toBe(1);
    });
  });

  describe('sortNodesByDegree', () => {
    it('should sort nodes by degree in descending order', () => {
      const layout = new CircularLayout({ sortBy: 'degree' });
      const nodes: CircularNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];
      const degrees = new Map([
        ['A', 1],
        ['B', 3],
        ['C', 2],
      ]);

      const sorted = layout.sortNodesByDegree(nodes, degrees);

      expect(sorted[0].id).toBe('B'); // degree 3
      expect(sorted[1].id).toBe('C'); // degree 2
      expect(sorted[2].id).toBe('A'); // degree 1
    });

    it('should not sort when sortBy is "none"', () => {
      const layout = new CircularLayout({ sortBy: 'none' });
      const nodes: CircularNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];
      const degrees = new Map([
        ['A', 1],
        ['B', 3],
        ['C', 2],
      ]);

      const sorted = layout.sortNodesByDegree(nodes, degrees);

      expect(sorted[0].id).toBe('A');
      expect(sorted[1].id).toBe('B');
      expect(sorted[2].id).toBe('C');
    });
  });

  describe('assignToCircles', () => {
    it('should assign nodes to circles based on graph distance', () => {
      const layout = new CircularLayout();
      const nodes: CircularNode[] = [
        { id: 'hub', width: 50, height: 50 },
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];
      const edges: CircularEdge[] = [
        { source: 'hub', target: 'A' },
        { source: 'hub', target: 'B' },
        { source: 'hub', target: 'C' },
      ];

      // Sort by degree first (hub has highest degree: 3)
      const degrees = layout.calculateDegrees(nodes, edges);
      const sortedNodes = layout.sortNodesByDegree(nodes, degrees);
      const circles = layout.assignToCircles(sortedNodes, edges);

      // Hub node should be at circle 0 (highest degree)
      expect(circles.get(0)).toBeDefined();
      expect(circles.get(0)!.length).toBe(1);
      expect(circles.get(0)!.some(n => n.id === 'hub')).toBe(true);

      // A, B, C should be at circle 1 (distance 1 from hub)
      expect(circles.get(1)).toBeDefined();
      expect(circles.get(1)!.length).toBe(3);
      expect(circles.get(1)!.some(n => n.id === 'A')).toBe(true);
      expect(circles.get(1)!.some(n => n.id === 'B')).toBe(true);
      expect(circles.get(1)!.some(n => n.id === 'C')).toBe(true);
    });

    it('should handle disconnected nodes', () => {
      const layout = new CircularLayout();
      const nodes: CircularNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'isolated', width: 50, height: 50 },
      ];
      const edges: CircularEdge[] = [
        { source: 'A', target: 'B' },
      ];

      const degrees = layout.calculateDegrees(nodes, edges);
      const sortedNodes = layout.sortNodesByDegree(nodes, degrees);
      const circles = layout.assignToCircles(sortedNodes, edges);

      // Isolated node should be assigned to a circle
      const allNodes = Array.from(circles.values()).flat();
      expect(allNodes.some(n => n.id === 'isolated')).toBe(true);
    });
  });

  describe('calculateLayout', () => {
    it('should return empty map for empty node list', () => {
      const layout = new CircularLayout();
      const positions = layout.calculateLayout([], []);

      expect(positions.size).toBe(0);
    });

    it('should place single node at center', () => {
      const layout = new CircularLayout();
      const nodes: CircularNode[] = [{ id: 'A', width: 50, height: 50 }];
      const positions = layout.calculateLayout(nodes, []);

      expect(positions.size).toBe(1);
      const pos = positions.get('A')!;
      expect(pos.x).toBe(0);
      expect(pos.y).toBe(0);
    });

    it('should arrange nodes in circles', () => {
      const layout = new CircularLayout({ radius: 100 });
      const nodes: CircularNode[] = [
        { id: 'center', width: 50, height: 50 },
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];
      const edges: CircularEdge[] = [
        { source: 'center', target: 'A' },
        { source: 'center', target: 'B' },
        { source: 'center', target: 'C' },
      ];

      const positions = layout.calculateLayout(nodes, edges);

      expect(positions.size).toBe(4);

      // Center should be at origin
      const centerPos = positions.get('center')!;
      expect(centerPos.x).toBe(0);
      expect(centerPos.y).toBe(0);

      // Other nodes should be on circle with radius 100
      const aPos = positions.get('A')!;
      const bPos = positions.get('B')!;
      const cPos = positions.get('C')!;

      const aDistance = Math.sqrt(aPos.x ** 2 + aPos.y ** 2);
      const bDistance = Math.sqrt(bPos.x ** 2 + bPos.y ** 2);
      const cDistance = Math.sqrt(cPos.x ** 2 + cPos.y ** 2);

      expect(aDistance).toBeCloseTo(100, 1);
      expect(bDistance).toBeCloseTo(100, 1);
      expect(cDistance).toBeCloseTo(100, 1);
    });

    it('should respect custom radius', () => {
      const layout = new CircularLayout({ radius: 200 });
      const nodes: CircularNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
      ];
      const edges: CircularEdge[] = [{ source: 'A', target: 'B' }];

      const positions = layout.calculateLayout(nodes, edges);

      // One node at center, one at radius 200
      const distances = Array.from(positions.values()).map(pos =>
        Math.sqrt(pos.x ** 2 + pos.y ** 2)
      );

      expect(distances).toContain(0); // Center node
      expect(distances.some(d => Math.abs(d - 200) < 1)).toBe(true); // Node at radius 200
    });

    it('should respect start and end angles', () => {
      const layout = new CircularLayout({
        radius: 100,
        startAngle: 0,
        endAngle: Math.PI, // Half circle
      });
      const nodes: CircularNode[] = [
        { id: 'center', width: 50, height: 50 },
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
      ];
      const edges: CircularEdge[] = [
        { source: 'center', target: 'A' },
        { source: 'center', target: 'B' },
      ];

      const positions = layout.calculateLayout(nodes, edges);

      // A and B should be positioned within the half circle (0 to π)
      const aPos = positions.get('A')!;
      const bPos = positions.get('B')!;

      const aAngle = Math.atan2(aPos.y, aPos.x);
      const bAngle = Math.atan2(bPos.y, bPos.x);

      // Angles should be between 0 and π
      expect(aAngle).toBeGreaterThanOrEqual(0);
      expect(aAngle).toBeLessThanOrEqual(Math.PI);
      expect(bAngle).toBeGreaterThanOrEqual(0);
      expect(bAngle).toBeLessThanOrEqual(Math.PI);
    });
  });

  describe('getCircleAssignments', () => {
    it('should return circle assignments for all nodes', () => {
      const layout = new CircularLayout({ radius: 100 });
      const nodes: CircularNode[] = [
        { id: 'hub', width: 50, height: 50 },
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
      ];
      const edges: CircularEdge[] = [
        { source: 'hub', target: 'A' },
        { source: 'hub', target: 'B' },
      ];

      const assignments = layout.getCircleAssignments(nodes, edges);

      expect(assignments.length).toBe(3);

      // Check that each node has an assignment
      expect(assignments.some(a => a.nodeId === 'hub')).toBe(true);
      expect(assignments.some(a => a.nodeId === 'A')).toBe(true);
      expect(assignments.some(a => a.nodeId === 'B')).toBe(true);

      // Hub has highest degree (2), should be at center
      const hubAssignment = assignments.find(a => a.nodeId === 'hub')!;
      expect(hubAssignment.circle).toBe(0);
      expect(hubAssignment.distance).toBe(0);

      // A and B should be at circle 1
      const aAssignment = assignments.find(a => a.nodeId === 'A')!;
      expect(aAssignment.circle).toBe(1);
      expect(aAssignment.distance).toBe(100);

      const bAssignment = assignments.find(a => a.nodeId === 'B')!;
      expect(bAssignment.circle).toBe(1);
      expect(bAssignment.distance).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('should handle graph with all nodes having same degree', () => {
      const layout = new CircularLayout();
      const nodes: CircularNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
      ];
      const edges: CircularEdge[] = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
        { source: 'C', target: 'A' },
      ];

      const positions = layout.calculateLayout(nodes, edges);

      expect(positions.size).toBe(3);
      // All nodes should have positions
      expect(positions.has('A')).toBe(true);
      expect(positions.has('B')).toBe(true);
      expect(positions.has('C')).toBe(true);
    });

    it('should handle star topology', () => {
      const layout = new CircularLayout({ radius: 100 });
      const nodes: CircularNode[] = [
        { id: 'hub', width: 50, height: 50 },
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
        { id: 'D', width: 50, height: 50 },
      ];
      const edges: CircularEdge[] = [
        { source: 'hub', target: 'A' },
        { source: 'hub', target: 'B' },
        { source: 'hub', target: 'C' },
        { source: 'hub', target: 'D' },
      ];

      const positions = layout.calculateLayout(nodes, edges);

      // Hub should be at center
      const hubPos = positions.get('hub')!;
      expect(hubPos.x).toBe(0);
      expect(hubPos.y).toBe(0);

      // All other nodes should be at same distance (radius 100)
      const distances = ['A', 'B', 'C', 'D'].map(id => {
        const pos = positions.get(id)!;
        return Math.sqrt(pos.x ** 2 + pos.y ** 2);
      });

      distances.forEach(d => {
        expect(d).toBeCloseTo(100, 1);
      });
    });

    it('should handle linear chain', () => {
      const layout = new CircularLayout({ radius: 100 });
      const nodes: CircularNode[] = [
        { id: 'A', width: 50, height: 50 },
        { id: 'B', width: 50, height: 50 },
        { id: 'C', width: 50, height: 50 },
        { id: 'D', width: 50, height: 50 },
      ];
      const edges: CircularEdge[] = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
        { source: 'C', target: 'D' },
      ];

      const positions = layout.calculateLayout(nodes, edges);

      expect(positions.size).toBe(4);

      // Nodes should be at increasing distances
      const assignments = layout.getCircleAssignments(nodes, edges);
      const circles = assignments.map(a => a.circle);

      // Should have nodes at different circle levels
      const uniqueCircles = new Set(circles);
      expect(uniqueCircles.size).toBeGreaterThan(1);
    });
  });
});

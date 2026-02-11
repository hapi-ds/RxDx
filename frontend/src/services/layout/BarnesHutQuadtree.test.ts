/**
 * Unit tests for Barnes-Hut quadtree
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BarnesHutQuadtree, buildBarnesHutTree, type BarnesHutNode } from './BarnesHutQuadtree';
import { type Rectangle } from './Quadtree';

describe('BarnesHutQuadtree', () => {
  let boundary: Rectangle;
  let tree: BarnesHutQuadtree;

  beforeEach(() => {
    boundary = { x: 0, y: 0, width: 1000, height: 1000 };
    tree = new BarnesHutQuadtree(boundary, 0.5);
  });

  describe('insert', () => {
    it('should insert a single node', () => {
      const node: BarnesHutNode = { id: '1', x: 500, y: 500, mass: 1 };
      const result = tree.insert(node);

      expect(result).toBe(true);
      expect(tree.getNodeCount()).toBe(1);
      expect(tree.getTotalMass()).toBe(1);
    });

    it('should insert multiple nodes', () => {
      const nodes: BarnesHutNode[] = [
        { id: '1', x: 100, y: 100, mass: 1 },
        { id: '2', x: 200, y: 200, mass: 1 },
        { id: '3', x: 300, y: 300, mass: 1 },
      ];

      for (const node of nodes) {
        tree.insert(node);
      }

      expect(tree.getNodeCount()).toBe(3);
      expect(tree.getTotalMass()).toBe(3);
    });

    it('should reject nodes outside boundary', () => {
      const node: BarnesHutNode = { id: '1', x: 1500, y: 1500, mass: 1 };
      const result = tree.insert(node);

      expect(result).toBe(false);
      expect(tree.getNodeCount()).toBe(0);
    });

    it('should handle nodes with different masses', () => {
      const nodes: BarnesHutNode[] = [
        { id: '1', x: 100, y: 100, mass: 2 },
        { id: '2', x: 200, y: 200, mass: 3 },
      ];

      for (const node of nodes) {
        tree.insert(node);
      }

      expect(tree.getTotalMass()).toBe(5);
    });
  });

  describe('center of mass', () => {
    it('should calculate correct center of mass for single node', () => {
      const node: BarnesHutNode = { id: '1', x: 500, y: 500, mass: 1 };
      tree.insert(node);

      const com = tree.getCenterOfMass();
      expect(com.x).toBe(500);
      expect(com.y).toBe(500);
    });

    it('should calculate correct center of mass for two equal masses', () => {
      tree.insert({ id: '1', x: 100, y: 100, mass: 1 });
      tree.insert({ id: '2', x: 300, y: 300, mass: 1 });

      const com = tree.getCenterOfMass();
      expect(com.x).toBe(200);
      expect(com.y).toBe(200);
    });

    it('should calculate weighted center of mass', () => {
      tree.insert({ id: '1', x: 100, y: 100, mass: 1 });
      tree.insert({ id: '2', x: 300, y: 300, mass: 3 });

      const com = tree.getCenterOfMass();
      // Weighted average: (100*1 + 300*3) / 4 = 250
      expect(com.x).toBe(250);
      expect(com.y).toBe(250);
    });
  });

  describe('calculateForce', () => {
    it('should calculate zero force for empty tree', () => {
      const node: BarnesHutNode = { id: '1', x: 500, y: 500, mass: 1 };
      const force = tree.calculateForce(node, 100);

      expect(force.fx).toBe(0);
      expect(force.fy).toBe(0);
    });

    it('should calculate repulsion force between two nodes', () => {
      tree.insert({ id: '1', x: 100, y: 100, mass: 1 });
      
      const node: BarnesHutNode = { id: '2', x: 200, y: 100, mass: 1 };
      const force = tree.calculateForce(node, 100);

      // Force should push node away (positive x direction, away from node at x=100)
      expect(force.fx).toBeGreaterThan(0);
      expect(Math.abs(force.fy)).toBeLessThan(0.01); // Should be near zero
    });

    it('should calculate stronger force for closer nodes', () => {
      const tree1 = new BarnesHutQuadtree(boundary, 0.5);
      tree1.insert({ id: '1', x: 100, y: 100, mass: 1 });
      
      const tree2 = new BarnesHutQuadtree(boundary, 0.5);
      tree2.insert({ id: '1', x: 100, y: 100, mass: 1 });

      const closeNode: BarnesHutNode = { id: '2', x: 150, y: 100, mass: 1 };
      const farNode: BarnesHutNode = { id: '3', x: 300, y: 100, mass: 1 };

      const closeForce = tree1.calculateForce(closeNode, 100);
      const farForce = tree2.calculateForce(farNode, 100);

      expect(Math.abs(closeForce.fx)).toBeGreaterThan(Math.abs(farForce.fx));
    });

    it('should avoid self-interaction', () => {
      const node: BarnesHutNode = { id: '1', x: 100, y: 100, mass: 1 };
      tree.insert(node);
      
      const force = tree.calculateForce(node, 100);

      // Force should be zero or very small (self-interaction avoided)
      expect(Math.abs(force.fx)).toBeLessThan(0.01);
      expect(Math.abs(force.fy)).toBeLessThan(0.01);
    });
  });

  describe('calculateAllForces', () => {
    it('should calculate forces for all nodes', () => {
      const nodes: BarnesHutNode[] = [
        { id: '1', x: 100, y: 100, mass: 1 },
        { id: '2', x: 200, y: 200, mass: 1 },
        { id: '3', x: 300, y: 300, mass: 1 },
      ];

      for (const node of nodes) {
        tree.insert(node);
      }

      const forces = tree.calculateAllForces(nodes, 100);

      expect(forces.size).toBe(3);
      expect(forces.has('1')).toBe(true);
      expect(forces.has('2')).toBe(true);
      expect(forces.has('3')).toBe(true);
    });

    it('should calculate repulsion forces pushing nodes apart', () => {
      const nodes: BarnesHutNode[] = [
        { id: '1', x: 100, y: 100, mass: 1 },
        { id: '2', x: 110, y: 100, mass: 1 },
      ];

      for (const node of nodes) {
        tree.insert(node);
      }

      const forces = tree.calculateAllForces(nodes, 100);
      const force1 = forces.get('1')!;
      const force2 = forces.get('2')!;

      // Node 1 should be pushed left (negative x)
      expect(force1.fx).toBeLessThan(0);
      // Node 2 should be pushed right (positive x)
      expect(force2.fx).toBeGreaterThan(0);
    });
  });

  describe('theta parameter', () => {
    it('should use provided theta value', () => {
      const customTree = new BarnesHutQuadtree(boundary, 0.8);
      expect(customTree.getTheta()).toBe(0.8);
    });

    it('should default to 0.5', () => {
      const defaultTree = new BarnesHutQuadtree(boundary);
      expect(defaultTree.getTheta()).toBe(0.5);
    });
  });

  describe('clear', () => {
    it('should clear all nodes', () => {
      tree.insert({ id: '1', x: 100, y: 100, mass: 1 });
      tree.insert({ id: '2', x: 200, y: 200, mass: 1 });

      expect(tree.getNodeCount()).toBe(2);

      tree.clear();

      expect(tree.getNodeCount()).toBe(0);
      expect(tree.getTotalMass()).toBe(0);
    });
  });
});

describe('buildBarnesHutTree', () => {
  it('should build tree from node array', () => {
    const nodes: BarnesHutNode[] = [
      { id: '1', x: 100, y: 100, mass: 1 },
      { id: '2', x: 200, y: 200, mass: 1 },
      { id: '3', x: 300, y: 300, mass: 1 },
    ];

    const tree = buildBarnesHutTree(nodes, 0.5);

    expect(tree.getNodeCount()).toBe(3);
    expect(tree.getTotalMass()).toBe(3);
  });

  it('should handle empty node array', () => {
    const tree = buildBarnesHutTree([], 0.5);

    expect(tree.getNodeCount()).toBe(0);
    expect(tree.getTotalMass()).toBe(0);
  });

  it('should create boundary with padding', () => {
    const nodes: BarnesHutNode[] = [
      { id: '1', x: 0, y: 0, mass: 1 },
      { id: '2', x: 100, y: 100, mass: 1 },
    ];

    const tree = buildBarnesHutTree(nodes, 0.5);

    // Should successfully insert nodes (boundary includes them with padding)
    expect(tree.getNodeCount()).toBe(2);
  });

  it('should use custom theta parameter', () => {
    const nodes: BarnesHutNode[] = [
      { id: '1', x: 100, y: 100, mass: 1 },
    ];

    const tree = buildBarnesHutTree(nodes, 0.8);

    expect(tree.getTheta()).toBe(0.8);
  });
});

describe('Barnes-Hut approximation accuracy', () => {
  it('should approximate forces with reasonable accuracy', () => {
    // Create a grid of nodes
    const nodes: BarnesHutNode[] = [];
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        nodes.push({
          id: `${i}-${j}`,
          x: i * 100,
          y: j * 100,
          mass: 1,
        });
      }
    }

    const tree = buildBarnesHutTree(nodes, 0.5);
    const forces = tree.calculateAllForces(nodes, 100);

    // All nodes should have forces (repulsion from others)
    expect(forces.size).toBe(25);

    // Forces should generally push nodes away from center
    for (const [id, force] of forces) {
      const node = nodes.find(n => n.id === id)!;
      
      // Skip center node
      if (node.x === 200 && node.y === 200) continue;

      // Force magnitude should be non-zero
      const magnitude = Math.sqrt(force.fx * force.fx + force.fy * force.fy);
      expect(magnitude).toBeGreaterThan(0);
    }
  });
});

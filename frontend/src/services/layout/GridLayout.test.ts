import { describe, it, expect } from 'vitest';
import { GridLayout, type GridNode } from './GridLayout';

describe('GridLayout', () => {
  describe('calculateOptimalColumns', () => {
    it('should calculate optimal columns using ceil(sqrt(nodeCount))', () => {
      const layout = new GridLayout();

      // Test various node counts
      expect(layout.calculateOptimalColumns(1)).toBe(1); // ceil(sqrt(1)) = 1
      expect(layout.calculateOptimalColumns(4)).toBe(2); // ceil(sqrt(4)) = 2
      expect(layout.calculateOptimalColumns(5)).toBe(3); // ceil(sqrt(5)) = 3
      expect(layout.calculateOptimalColumns(9)).toBe(3); // ceil(sqrt(9)) = 3
      expect(layout.calculateOptimalColumns(10)).toBe(4); // ceil(sqrt(10)) = 4
      expect(layout.calculateOptimalColumns(16)).toBe(4); // ceil(sqrt(16)) = 4
      expect(layout.calculateOptimalColumns(17)).toBe(5); // ceil(sqrt(17)) = 5
      expect(layout.calculateOptimalColumns(25)).toBe(5); // ceil(sqrt(25)) = 5
      expect(layout.calculateOptimalColumns(100)).toBe(10); // ceil(sqrt(100)) = 10
    });

    it('should use configured columns if provided', () => {
      const layout = new GridLayout({ columns: 5 });

      expect(layout.calculateOptimalColumns(10)).toBe(5);
      expect(layout.calculateOptimalColumns(100)).toBe(5);
    });

    it('should calculate optimal columns if configured columns is 0', () => {
      const layout = new GridLayout({ columns: 0 });

      expect(layout.calculateOptimalColumns(9)).toBe(3);
    });
  });

  describe('sortNodes', () => {
    const createNode = (id: string, type?: string, priority?: number): GridNode => ({
      id,
      width: 50,
      height: 50,
      type,
      priority,
    });

    it('should not sort when sortBy is "none"', () => {
      const layout = new GridLayout({ sortBy: 'none' });
      const nodes = [
        createNode('1', 'task', 3),
        createNode('2', 'requirement', 1),
        createNode('3', 'test', 2),
      ];

      const sorted = layout.sortNodes(nodes);

      expect(sorted.map(n => n.id)).toEqual(['1', '2', '3']);
    });

    it('should sort by type first, then priority when sortBy is "type"', () => {
      const layout = new GridLayout({ sortBy: 'type' });
      const nodes = [
        createNode('1', 'task', 1),
        createNode('2', 'requirement', 3),
        createNode('3', 'task', 2),
        createNode('4', 'requirement', 1),
        createNode('5', 'test', 2),
      ];

      const sorted = layout.sortNodes(nodes);

      // Expected order: requirement (priority 3, 1), task (priority 2, 1), test (priority 2)
      expect(sorted.map(n => n.id)).toEqual(['2', '4', '3', '1', '5']);
    });

    it('should sort by priority first, then type when sortBy is "priority"', () => {
      const layout = new GridLayout({ sortBy: 'priority' });
      const nodes = [
        createNode('1', 'task', 1),
        createNode('2', 'requirement', 3),
        createNode('3', 'task', 2),
        createNode('4', 'test', 3),
        createNode('5', 'requirement', 2),
      ];

      const sorted = layout.sortNodes(nodes);

      // Expected order: priority 3 (requirement, test), priority 2 (requirement, task), priority 1 (task)
      expect(sorted.map(n => n.id)).toEqual(['2', '4', '5', '3', '1']);
    });

    it('should handle nodes without type or priority', () => {
      const layout = new GridLayout({ sortBy: 'type' });
      const nodes = [
        createNode('1', 'task'),
        createNode('2'),
        createNode('3', undefined, 2),
      ];

      const sorted = layout.sortNodes(nodes);

      // Nodes without type should come first (empty string sorts before other strings)
      // Within same type, higher priority comes first
      expect(sorted[0].id).toBe('3'); // No type, priority 2
      expect(sorted[1].id).toBe('2'); // No type, no priority (0)
      expect(sorted[2].id).toBe('1'); // type 'task'
    });
  });

  describe('placeNodes', () => {
    const createNode = (id: string): GridNode => ({
      id,
      width: 50,
      height: 50,
    });

    it('should place nodes in left-to-right, top-to-bottom order', () => {
      const layout = new GridLayout({ rowSpacing: 100, columnSpacing: 150 });
      const nodes = [
        createNode('1'),
        createNode('2'),
        createNode('3'),
        createNode('4'),
        createNode('5'),
        createNode('6'),
      ];

      const positions = layout.placeNodes(nodes, 3);

      // Row 0: nodes 1, 2, 3
      expect(positions.get('1')).toEqual({ x: 0, y: 0 });
      expect(positions.get('2')).toEqual({ x: 150, y: 0 });
      expect(positions.get('3')).toEqual({ x: 300, y: 0 });

      // Row 1: nodes 4, 5, 6
      expect(positions.get('4')).toEqual({ x: 0, y: 100 });
      expect(positions.get('5')).toEqual({ x: 150, y: 100 });
      expect(positions.get('6')).toEqual({ x: 300, y: 100 });
    });

    it('should handle incomplete last row', () => {
      const layout = new GridLayout({ rowSpacing: 100, columnSpacing: 150 });
      const nodes = [
        createNode('1'),
        createNode('2'),
        createNode('3'),
        createNode('4'),
        createNode('5'),
      ];

      const positions = layout.placeNodes(nodes, 3);

      // Row 0: nodes 1, 2, 3
      expect(positions.get('1')).toEqual({ x: 0, y: 0 });
      expect(positions.get('2')).toEqual({ x: 150, y: 0 });
      expect(positions.get('3')).toEqual({ x: 300, y: 0 });

      // Row 1: nodes 4, 5 (incomplete row)
      expect(positions.get('4')).toEqual({ x: 0, y: 100 });
      expect(positions.get('5')).toEqual({ x: 150, y: 100 });
    });

    it('should use configured spacing', () => {
      const layout = new GridLayout({ rowSpacing: 200, columnSpacing: 250 });
      const nodes = [createNode('1'), createNode('2'), createNode('3')];

      const positions = layout.placeNodes(nodes, 2);

      expect(positions.get('1')).toEqual({ x: 0, y: 0 });
      expect(positions.get('2')).toEqual({ x: 250, y: 0 });
      expect(positions.get('3')).toEqual({ x: 0, y: 200 });
    });

    it('should handle single column', () => {
      const layout = new GridLayout({ rowSpacing: 100, columnSpacing: 150 });
      const nodes = [createNode('1'), createNode('2'), createNode('3')];

      const positions = layout.placeNodes(nodes, 1);

      expect(positions.get('1')).toEqual({ x: 0, y: 0 });
      expect(positions.get('2')).toEqual({ x: 0, y: 100 });
      expect(positions.get('3')).toEqual({ x: 0, y: 200 });
    });

    it('should handle single row', () => {
      const layout = new GridLayout({ rowSpacing: 100, columnSpacing: 150 });
      const nodes = [createNode('1'), createNode('2'), createNode('3')];

      const positions = layout.placeNodes(nodes, 10);

      expect(positions.get('1')).toEqual({ x: 0, y: 0 });
      expect(positions.get('2')).toEqual({ x: 150, y: 0 });
      expect(positions.get('3')).toEqual({ x: 300, y: 0 });
    });
  });

  describe('calculateLayout', () => {
    const createNode = (id: string, type?: string, priority?: number): GridNode => ({
      id,
      width: 50,
      height: 50,
      type,
      priority,
    });

    it('should return empty map for empty nodes', () => {
      const layout = new GridLayout();
      const positions = layout.calculateLayout([]);

      expect(positions.size).toBe(0);
    });

    it('should calculate complete layout with optimal columns', () => {
      const layout = new GridLayout({ rowSpacing: 100, columnSpacing: 150 });
      const nodes = [
        createNode('1'),
        createNode('2'),
        createNode('3'),
        createNode('4'),
        createNode('5'),
      ];

      const positions = layout.calculateLayout(nodes);

      // 5 nodes -> ceil(sqrt(5)) = 3 columns
      expect(positions.size).toBe(5);
      expect(positions.get('1')).toEqual({ x: 0, y: 0 });
      expect(positions.get('2')).toEqual({ x: 150, y: 0 });
      expect(positions.get('3')).toEqual({ x: 300, y: 0 });
      expect(positions.get('4')).toEqual({ x: 0, y: 100 });
      expect(positions.get('5')).toEqual({ x: 150, y: 100 });
    });

    it('should sort nodes before placement when sortBy is configured', () => {
      const layout = new GridLayout({
        rowSpacing: 100,
        columnSpacing: 150,
        sortBy: 'priority',
      });
      const nodes = [
        createNode('1', 'task', 1),
        createNode('2', 'task', 3),
        createNode('3', 'task', 2),
      ];

      const positions = layout.calculateLayout(nodes);

      // Should be sorted by priority: 2 (priority 3), 3 (priority 2), 1 (priority 1)
      // Then placed in grid
      expect(positions.get('2')).toEqual({ x: 0, y: 0 }); // First position
      expect(positions.get('3')).toEqual({ x: 150, y: 0 }); // Second position
      expect(positions.get('1')).toEqual({ x: 0, y: 100 }); // Third position
    });

    it('should use configured columns if provided', () => {
      const layout = new GridLayout({
        columns: 2,
        rowSpacing: 100,
        columnSpacing: 150,
      });
      const nodes = [
        createNode('1'),
        createNode('2'),
        createNode('3'),
        createNode('4'),
      ];

      const positions = layout.calculateLayout(nodes);

      // 2 columns configured
      expect(positions.get('1')).toEqual({ x: 0, y: 0 });
      expect(positions.get('2')).toEqual({ x: 150, y: 0 });
      expect(positions.get('3')).toEqual({ x: 0, y: 100 });
      expect(positions.get('4')).toEqual({ x: 150, y: 100 });
    });
  });

  describe('getGridDimensions', () => {
    it('should calculate grid dimensions correctly', () => {
      const layout = new GridLayout();

      expect(layout.getGridDimensions(1)).toEqual({ columns: 1, rows: 1 });
      expect(layout.getGridDimensions(4)).toEqual({ columns: 2, rows: 2 });
      expect(layout.getGridDimensions(5)).toEqual({ columns: 3, rows: 2 });
      expect(layout.getGridDimensions(9)).toEqual({ columns: 3, rows: 3 });
      expect(layout.getGridDimensions(10)).toEqual({ columns: 4, rows: 3 });
    });

    it('should use configured columns', () => {
      const layout = new GridLayout({ columns: 5 });

      expect(layout.getGridDimensions(10)).toEqual({ columns: 5, rows: 2 });
      expect(layout.getGridDimensions(12)).toEqual({ columns: 5, rows: 3 });
    });
  });

  describe('getGridCell', () => {
    it('should calculate grid cell for node index', () => {
      const layout = new GridLayout();

      // 3 columns
      expect(layout.getGridCell(0, 3)).toEqual({ row: 0, col: 0 });
      expect(layout.getGridCell(1, 3)).toEqual({ row: 0, col: 1 });
      expect(layout.getGridCell(2, 3)).toEqual({ row: 0, col: 2 });
      expect(layout.getGridCell(3, 3)).toEqual({ row: 1, col: 0 });
      expect(layout.getGridCell(4, 3)).toEqual({ row: 1, col: 1 });
      expect(layout.getGridCell(5, 3)).toEqual({ row: 1, col: 2 });
    });

    it('should work with different column counts', () => {
      const layout = new GridLayout();

      // 2 columns
      expect(layout.getGridCell(0, 2)).toEqual({ row: 0, col: 0 });
      expect(layout.getGridCell(1, 2)).toEqual({ row: 0, col: 1 });
      expect(layout.getGridCell(2, 2)).toEqual({ row: 1, col: 0 });
      expect(layout.getGridCell(3, 2)).toEqual({ row: 1, col: 1 });

      // 5 columns
      expect(layout.getGridCell(0, 5)).toEqual({ row: 0, col: 0 });
      expect(layout.getGridCell(4, 5)).toEqual({ row: 0, col: 4 });
      expect(layout.getGridCell(5, 5)).toEqual({ row: 1, col: 0 });
    });
  });
});

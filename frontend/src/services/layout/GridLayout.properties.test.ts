/**
 * Property-based tests for GridLayout
 * 
 * **Validates: Requirements 2.4**
 * 
 * Property 6: Grid regularity
 * For any graph using grid layout, the spacing between adjacent nodes should be
 * consistent both horizontally and vertically.
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { GridLayout, type GridNode } from './GridLayout';

describe('GridLayout Properties', () => {
  describe('Property 6: Consistent spacing between adjacent nodes', () => {
    it('should maintain consistent horizontal spacing between adjacent nodes in same row', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeCount: fc.integer({ min: 4, max: 50 }),
            columnSpacing: fc.integer({ min: 50, max: 300 }),
            rowSpacing: fc.integer({ min: 50, max: 300 }),
          }),
          (config) => {
            // Create nodes
            const nodes: GridNode[] = [];
            for (let i = 0; i < config.nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                width: 50,
                height: 50,
              });
            }

            // Calculate layout
            const layout = new GridLayout({
              columnSpacing: config.columnSpacing,
              rowSpacing: config.rowSpacing,
            });
            const positions = layout.calculateLayout(nodes);
            const dimensions = layout.getGridDimensions(config.nodeCount);

            // Verify: Horizontal spacing between adjacent nodes in same row
            for (let row = 0; row < dimensions.rows; row++) {
              const nodesInRow: Array<{ id: string; x: number }> = [];

              for (let col = 0; col < dimensions.columns; col++) {
                const nodeIndex = row * dimensions.columns + col;
                if (nodeIndex < config.nodeCount) {
                  const nodeId = `node-${nodeIndex}`;
                  const pos = positions.get(nodeId)!;
                  nodesInRow.push({ id: nodeId, x: pos.x });
                }
              }

              // Check spacing between consecutive nodes in this row
              for (let i = 1; i < nodesInRow.length; i++) {
                const spacing = nodesInRow[i].x - nodesInRow[i - 1].x;
                expect(spacing).toBe(config.columnSpacing);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain consistent vertical spacing between adjacent nodes in same column', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeCount: fc.integer({ min: 4, max: 50 }),
            columnSpacing: fc.integer({ min: 50, max: 300 }),
            rowSpacing: fc.integer({ min: 50, max: 300 }),
          }),
          (config) => {
            // Create nodes
            const nodes: GridNode[] = [];
            for (let i = 0; i < config.nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                width: 50,
                height: 50,
              });
            }

            // Calculate layout
            const layout = new GridLayout({
              columnSpacing: config.columnSpacing,
              rowSpacing: config.rowSpacing,
            });
            const positions = layout.calculateLayout(nodes);
            const dimensions = layout.getGridDimensions(config.nodeCount);

            // Verify: Vertical spacing between adjacent nodes in same column
            for (let col = 0; col < dimensions.columns; col++) {
              const nodesInColumn: Array<{ id: string; y: number }> = [];

              for (let row = 0; row < dimensions.rows; row++) {
                const nodeIndex = row * dimensions.columns + col;
                if (nodeIndex < config.nodeCount) {
                  const nodeId = `node-${nodeIndex}`;
                  const pos = positions.get(nodeId)!;
                  nodesInColumn.push({ id: nodeId, y: pos.y });
                }
              }

              // Check spacing between consecutive nodes in this column
              for (let i = 1; i < nodesInColumn.length; i++) {
                const spacing = nodesInColumn[i].y - nodesInColumn[i - 1].y;
                expect(spacing).toBe(config.rowSpacing);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should place all nodes at grid intersection points', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeCount: fc.integer({ min: 1, max: 50 }),
            columnSpacing: fc.integer({ min: 50, max: 300 }),
            rowSpacing: fc.integer({ min: 50, max: 300 }),
          }),
          (config) => {
            // Create nodes
            const nodes: GridNode[] = [];
            for (let i = 0; i < config.nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                width: 50,
                height: 50,
              });
            }

            // Calculate layout
            const layout = new GridLayout({
              columnSpacing: config.columnSpacing,
              rowSpacing: config.rowSpacing,
            });
            const positions = layout.calculateLayout(nodes);

            // Verify: All nodes are at valid grid positions
            for (const [nodeId, pos] of positions.entries()) {
              // X coordinate should be a multiple of columnSpacing
              const xRemainder = pos.x % config.columnSpacing;
              expect(xRemainder).toBe(0);

              // Y coordinate should be a multiple of rowSpacing
              const yRemainder = pos.y % config.rowSpacing;
              expect(yRemainder).toBe(0);

              // Calculate expected grid cell
              const col = pos.x / config.columnSpacing;
              const row = pos.y / config.rowSpacing;

              // Grid cell indices should be non-negative integers
              expect(col).toBeGreaterThanOrEqual(0);
              expect(row).toBeGreaterThanOrEqual(0);
              expect(Number.isInteger(col)).toBe(true);
              expect(Number.isInteger(row)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain grid regularity with custom column count', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeCount: fc.integer({ min: 4, max: 50 }),
            columns: fc.integer({ min: 2, max: 10 }),
            columnSpacing: fc.integer({ min: 50, max: 300 }),
            rowSpacing: fc.integer({ min: 50, max: 300 }),
          }),
          (config) => {
            // Create nodes
            const nodes: GridNode[] = [];
            for (let i = 0; i < config.nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                width: 50,
                height: 50,
              });
            }

            // Calculate layout with custom columns
            const layout = new GridLayout({
              columns: config.columns,
              columnSpacing: config.columnSpacing,
              rowSpacing: config.rowSpacing,
            });
            const positions = layout.calculateLayout(nodes);

            // Verify: Horizontal spacing is consistent
            const rows = Math.ceil(config.nodeCount / config.columns);
            for (let row = 0; row < rows; row++) {
              const nodesInRow: Array<{ x: number }> = [];

              for (let col = 0; col < config.columns; col++) {
                const nodeIndex = row * config.columns + col;
                if (nodeIndex < config.nodeCount) {
                  const nodeId = `node-${nodeIndex}`;
                  const pos = positions.get(nodeId)!;
                  nodesInRow.push({ x: pos.x });
                }
              }

              // Check horizontal spacing
              for (let i = 1; i < nodesInRow.length; i++) {
                const spacing = nodesInRow[i].x - nodesInRow[i - 1].x;
                expect(spacing).toBe(config.columnSpacing);
              }
            }

            // Verify: Vertical spacing is consistent
            for (let col = 0; col < config.columns; col++) {
              const nodesInColumn: Array<{ y: number }> = [];

              for (let row = 0; row < rows; row++) {
                const nodeIndex = row * config.columns + col;
                if (nodeIndex < config.nodeCount) {
                  const nodeId = `node-${nodeIndex}`;
                  const pos = positions.get(nodeId)!;
                  nodesInColumn.push({ y: pos.y });
                }
              }

              // Check vertical spacing
              for (let i = 1; i < nodesInColumn.length; i++) {
                const spacing = nodesInColumn[i].y - nodesInColumn[i - 1].y;
                expect(spacing).toBe(config.rowSpacing);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain spacing consistency regardless of node sorting', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeCount: fc.integer({ min: 4, max: 30 }),
            columnSpacing: fc.integer({ min: 50, max: 300 }),
            rowSpacing: fc.integer({ min: 50, max: 300 }),
            sortBy: fc.constantFrom('none', 'type', 'priority'),
          }),
          (config) => {
            // Create nodes with random types and priorities
            const nodes: GridNode[] = [];
            const types = ['requirement', 'task', 'test', 'risk'];

            for (let i = 0; i < config.nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                width: 50,
                height: 50,
                type: types[i % types.length],
                priority: (i % 5) + 1,
              });
            }

            // Calculate layout with sorting
            const layout = new GridLayout({
              columnSpacing: config.columnSpacing,
              rowSpacing: config.rowSpacing,
              sortBy: config.sortBy as 'none' | 'type' | 'priority',
            });
            const positions = layout.calculateLayout(nodes);
            const dimensions = layout.getGridDimensions(config.nodeCount);

            // Verify: Spacing is consistent regardless of sorting
            // Check horizontal spacing
            for (let row = 0; row < dimensions.rows; row++) {
              const xPositions: number[] = [];

              for (let col = 0; col < dimensions.columns; col++) {
                const nodeIndex = row * dimensions.columns + col;
                if (nodeIndex < config.nodeCount) {
                  // Find the node at this grid position
                  for (const [, pos] of positions.entries()) {
                    if (pos.y === row * config.rowSpacing && pos.x === col * config.columnSpacing) {
                      xPositions.push(pos.x);
                      break;
                    }
                  }
                }
              }

              // Check spacing between consecutive positions
              for (let i = 1; i < xPositions.length; i++) {
                const spacing = xPositions[i] - xPositions[i - 1];
                expect(spacing).toBe(config.columnSpacing);
              }
            }

            // Check vertical spacing
            for (let col = 0; col < dimensions.columns; col++) {
              const yPositions: number[] = [];

              for (let row = 0; row < dimensions.rows; row++) {
                const nodeIndex = row * dimensions.columns + col;
                if (nodeIndex < config.nodeCount) {
                  // Find the node at this grid position
                  for (const [, pos] of positions.entries()) {
                    if (pos.x === col * config.columnSpacing && pos.y === row * config.rowSpacing) {
                      yPositions.push(pos.y);
                      break;
                    }
                  }
                }
              }

              // Check spacing between consecutive positions
              for (let i = 1; i < yPositions.length; i++) {
                const spacing = yPositions[i] - yPositions[i - 1];
                expect(spacing).toBe(config.rowSpacing);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle edge cases with consistent spacing', () => {
      fc.assert(
        fc.property(
          fc.record({
            nodeCount: fc.constantFrom(1, 2, 3),
            columnSpacing: fc.integer({ min: 100, max: 200 }),
            rowSpacing: fc.integer({ min: 100, max: 200 }),
          }),
          (config) => {
            // Create nodes
            const nodes: GridNode[] = [];
            for (let i = 0; i < config.nodeCount; i++) {
              nodes.push({
                id: `node-${i}`,
                width: 50,
                height: 50,
              });
            }

            // Calculate layout
            const layout = new GridLayout({
              columnSpacing: config.columnSpacing,
              rowSpacing: config.rowSpacing,
            });
            const positions = layout.calculateLayout(nodes);

            // Verify: All positions are at valid grid points
            for (const [, pos] of positions.entries()) {
              expect(pos.x % config.columnSpacing).toBe(0);
              expect(pos.y % config.rowSpacing).toBe(0);
            }

            // Verify: For 2+ nodes, spacing is consistent
            if (config.nodeCount >= 2) {
              const posArray = Array.from(positions.values());
              const dimensions = layout.getGridDimensions(config.nodeCount);

              // If nodes are in same row, check horizontal spacing
              if (dimensions.rows === 1) {
                for (let i = 1; i < posArray.length; i++) {
                  const spacing = posArray[i].x - posArray[i - 1].x;
                  expect(spacing).toBe(config.columnSpacing);
                }
              }

              // If nodes are in same column, check vertical spacing
              if (dimensions.columns === 1) {
                for (let i = 1; i < posArray.length; i++) {
                  const spacing = posArray[i].y - posArray[i - 1].y;
                  expect(spacing).toBe(config.rowSpacing);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

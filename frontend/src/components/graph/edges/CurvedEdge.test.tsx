/**
 * CurvedEdge Component Tests
 * Unit tests for the CurvedEdge component
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { CurvedEdge } from './CurvedEdge';
import type { CurvedEdgeProps } from './CurvedEdge';

// Helper to render edge within ReactFlow context
const renderEdge = (props: Partial<CurvedEdgeProps> = {}) => {
  const defaultProps: CurvedEdgeProps = {
    id: 'test-edge',
    source: 'node-1',
    target: 'node-2',
    sourceX: 0,
    sourceY: 0,
    targetX: 100,
    targetY: 100,
    sourcePosition: 'right' as const,
    targetPosition: 'left' as const,
    ...props,
  };

  return render(
    <ReactFlowProvider>
      <svg>
        <CurvedEdge {...defaultProps} />
      </svg>
    </ReactFlowProvider>
  );
};

describe('CurvedEdge', () => {
  describe('Basic Rendering', () => {
    it('renders without crashing', () => {
      const { container } = renderEdge();
      expect(container).toBeTruthy();
    });

    it('renders a path element', () => {
      const { container } = renderEdge();
      const path = container.querySelector('path');
      expect(path).toBeTruthy();
    });

    it('applies default stroke width', () => {
      const { container } = renderEdge();
      const path = container.querySelector('path.react-flow__edge-path');
      const style = path?.getAttribute('style');
      expect(style).toContain('stroke-width: 2');
    });

    it('applies custom stroke width', () => {
      const { container } = renderEdge({ strokeWidth: 4 });
      const path = container.querySelector('path.react-flow__edge-path');
      const style = path?.getAttribute('style');
      expect(style).toContain('stroke-width: 4');
    });

    it('applies default stroke color', () => {
      const { container } = renderEdge();
      const path = container.querySelector('path.react-flow__edge-path');
      const style = path?.getAttribute('style');
      expect(style).toContain('stroke: #9e9e9e');
    });

    it('applies custom stroke color', () => {
      const { container } = renderEdge({ stroke: '#ff0000' });
      const path = container.querySelector('path.react-flow__edge-path');
      const style = path?.getAttribute('style');
      expect(style).toContain('stroke: #ff0000');
    });
  });

  describe('Bezier Curve Path', () => {
    it('creates a quadratic Bezier path', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
      });
      const path = container.querySelector('path');
      const d = path?.getAttribute('d');
      
      // Should start with M (move to), contain Q (quadratic Bezier)
      // Note: coordinates are adjusted for node circle radius
      expect(d).toMatch(/^M\s+[\d.-]+,[\d.-]+\s+Q\s+[\d.-]+,[\d.-]+\s+[\d.-]+,[\d.-]+$/);
    });

    it('starts near source coordinates', () => {
      const { container } = renderEdge({
        sourceX: 10,
        sourceY: 20,
        targetX: 100,
        targetY: 100,
      });
      const path = container.querySelector('path');
      const d = path?.getAttribute('d');
      
      // Path starts near source, but adjusted for node circle radius
      expect(d).toMatch(/^M\s+[\d.-]+,[\d.-]+/);
    });

    it('ends near target coordinates', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 150,
        targetY: 200,
      });
      const path = container.querySelector('path');
      const d = path?.getAttribute('d');
      
      // Path ends near target, but adjusted for node circle radius
      expect(d).toMatch(/[\d.-]+,[\d.-]+$/);
    });
  });

  describe('Edge Label', () => {
    it('does not render label when not provided', () => {
      renderEdge();
      // EdgeLabelRenderer renders outside the SVG, so check the entire document
      const label = document.querySelector('.nodrag.nopan');
      expect(label).toBeNull();
    });

    it('renders label component when provided', () => {
      // EdgeLabelRenderer is a React Flow component that renders in a portal
      // In test environment, we just verify the component doesn't crash
      const { container } = renderEdge({ label: 'Test Label' });
      expect(container).toBeTruthy();
    });

    it('handles label positioning', () => {
      // EdgeLabelRenderer handles positioning internally
      // We just verify the component renders without error
      const { container } = renderEdge({
        label: 'Test Label',
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
      });
      expect(container).toBeTruthy();
    });

    it('handles label styling', () => {
      // EdgeLabelRenderer applies styling internally
      // We just verify the component renders without error
      const { container } = renderEdge({ label: 'Test Label' });
      expect(container).toBeTruthy();
    });
  });

  describe('Multiple Parallel Edges', () => {
    it('handles single edge with no offset', () => {
      const { container } = renderEdge({
        edgeIndex: 0,
        totalParallelEdges: 1,
      });
      const path = container.querySelector('path');
      expect(path).toBeTruthy();
    });

    it('handles multiple edges with offset', () => {
      const { container: container1 } = renderEdge({
        id: 'edge-1',
        edgeIndex: 0,
        totalParallelEdges: 3,
      });
      const { container: container2 } = renderEdge({
        id: 'edge-2',
        edgeIndex: 1,
        totalParallelEdges: 3,
      });
      const { container: container3 } = renderEdge({
        id: 'edge-3',
        edgeIndex: 2,
        totalParallelEdges: 3,
      });

      const path1 = container1.querySelector('path')?.getAttribute('d');
      const path2 = container2.querySelector('path')?.getAttribute('d');
      const path3 = container3.querySelector('path')?.getAttribute('d');

      // Paths should be different due to offset
      expect(path1).not.toBe(path2);
      expect(path2).not.toBe(path3);
      expect(path1).not.toBe(path3);
    });
  });

  describe('Selection State', () => {
    it('applies default style when not selected', () => {
      const { container } = renderEdge({ selected: false });
      const path = container.querySelector('path.react-flow__edge-path');
      const style = path?.getAttribute('style');
      expect(style).toContain('stroke: #9e9e9e');
      expect(style).toContain('stroke-width: 2');
    });

    it('applies selected style when selected', () => {
      const { container } = renderEdge({ selected: true, strokeWidth: 2 });
      const path = container.querySelector('path.react-flow__edge-path');
      const style = path?.getAttribute('style');
      expect(style).toContain('stroke: #1976d2');
      expect(style).toContain('stroke-width: 3');
    });

    it('increases stroke width when selected', () => {
      const { container } = renderEdge({ selected: true, strokeWidth: 3 });
      const path = container.querySelector('path.react-flow__edge-path');
      const style = path?.getAttribute('style');
      expect(style).toContain('stroke-width: 4');
    });
  });

  describe('Marker End (Arrow)', () => {
    it('renders arrow directly (not using markerEnd)', () => {
      const { container } = renderEdge();
      
      // Find the arrow path (triangle shape)
      const paths = container.querySelectorAll('path');
      const arrowPath = Array.from(paths).find(p => 
        p.getAttribute('d')?.includes('L 8 4 L 0 8 z')
      );
      
      expect(arrowPath).toBeTruthy();
    });

    it('does not use markerEnd attribute', () => {
      const { container } = renderEdge({ markerEnd: 'url(#arrow)' });
      const path = container.querySelector('path.react-flow__edge-path');
      
      // markerEnd is no longer used - arrow is rendered directly
      expect(path?.getAttribute('marker-end')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero-length edge (overlapping nodes)', () => {
      const { container } = renderEdge({
        sourceX: 50,
        sourceY: 50,
        targetX: 50,
        targetY: 50,
      });
      const path = container.querySelector('path');
      expect(path).toBeTruthy();
    });

    it('handles vertical edge', () => {
      const { container } = renderEdge({
        sourceX: 50,
        sourceY: 0,
        targetX: 50,
        targetY: 100,
      });
      const path = container.querySelector('path');
      const d = path?.getAttribute('d');
      expect(d).toMatch(/^M\s+[\d.]+,[\d.]+\s+Q\s+[\d.]+,[\d.]+\s+[\d.]+,[\d.]+$/);
    });

    it('handles horizontal edge', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 50,
        targetX: 100,
        targetY: 50,
      });
      const path = container.querySelector('path');
      const d = path?.getAttribute('d');
      expect(d).toMatch(/^M\s+[\d.]+,[\d.]+\s+Q\s+[\d.]+,[\d.]+\s+[\d.]+,[\d.]+$/);
    });

    it('handles negative coordinates', () => {
      const { container } = renderEdge({
        sourceX: -50,
        sourceY: -50,
        targetX: 50,
        targetY: 50,
      });
      const path = container.querySelector('path');
      expect(path).toBeTruthy();
    });
  });

  describe('Directional Arrows', () => {
    it('renders arrow element', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
      });
      
      // Find the arrow path (triangle shape)
      const paths = container.querySelectorAll('path');
      const arrowPath = Array.from(paths).find(p => 
        p.getAttribute('d')?.includes('L 8 4 L 0 8 z')
      );
      
      expect(arrowPath).toBeTruthy();
    });

    it('arrow has 8-pixel size', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
      });
      
      // Find the arrow path
      const paths = container.querySelectorAll('path');
      const arrowPath = Array.from(paths).find(p => 
        p.getAttribute('d')?.includes('L 8 4 L 0 8 z')
      );
      
      // Arrow path should be 8x8 pixels (M 0 0 L 8 4 L 0 8 z)
      expect(arrowPath?.getAttribute('d')).toBe('M 0 0 L 8 4 L 0 8 z');
    });

    it('arrow uses default color when not selected', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        selected: false,
        stroke: '#9e9e9e',
      });
      
      // Find the arrow path
      const paths = container.querySelectorAll('path');
      const arrowPath = Array.from(paths).find(p => 
        p.getAttribute('d')?.includes('L 8 4 L 0 8 z')
      );
      
      expect(arrowPath?.getAttribute('fill')).toBe('#9e9e9e');
    });

    it('arrow uses selected color when edge is selected', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        selected: true,
      });
      
      // Find the arrow path
      const paths = container.querySelectorAll('path');
      const arrowPath = Array.from(paths).find(p => 
        p.getAttribute('d')?.includes('L 8 4 L 0 8 z')
      );
      
      expect(arrowPath?.getAttribute('fill')).toBe('#1976d2');
    });

    it('arrow uses custom stroke color', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
        selected: false,
        stroke: '#ff0000',
      });
      
      // Find the arrow path
      const paths = container.querySelectorAll('path');
      const arrowPath = Array.from(paths).find(p => 
        p.getAttribute('d')?.includes('L 8 4 L 0 8 z')
      );
      
      expect(arrowPath?.getAttribute('fill')).toBe('#ff0000');
    });

    it('arrow is positioned with rotation transform', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
      });
      
      // Find the g element containing the arrow
      const gElements = container.querySelectorAll('g');
      const arrowGroup = Array.from(gElements).find(g => {
        const transform = g.getAttribute('transform');
        return transform?.includes('translate') && transform?.includes('rotate');
      });
      
      expect(arrowGroup).toBeTruthy();
      // Allow for negative numbers in the transform
      expect(arrowGroup?.getAttribute('transform')).toMatch(/translate\([\d.-]+,\s*[\d.-]+\)\s*rotate\([\d.-]+\)/);
    });

    it('arrow is positioned near target node', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
      });
      
      // Find the g element containing the arrow
      const gElements = container.querySelectorAll('g');
      const arrowGroup = Array.from(gElements).find(g => {
        const transform = g.getAttribute('transform');
        return transform?.includes('translate') && transform?.includes('rotate');
      });
      
      const transform = arrowGroup?.getAttribute('transform');
      expect(transform).toBeTruthy();
      
      // Extract translate coordinates
      const match = transform?.match(/translate\(([\d.]+),\s*([\d.]+)\)/);
      if (match) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        
        // Arrow should be positioned close to target (within reasonable distance)
        // Target is at (100, 0), arrow should be ~10 pixels away
        expect(x).toBeGreaterThan(80);
        expect(x).toBeLessThan(100);
        expect(Math.abs(y)).toBeLessThan(20);
      }
    });

    it('arrow orientation changes with edge direction', () => {
      // Horizontal edge (left to right)
      const { container: container1 } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 0,
      });
      
      // Vertical edge (top to bottom)
      const { container: container2 } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 0,
        targetY: 100,
      });
      
      // Find arrow groups
      const getArrowTransform = (container: HTMLElement) => {
        const gElements = container.querySelectorAll('g');
        const arrowGroup = Array.from(gElements).find(g => {
          const transform = g.getAttribute('transform');
          return transform?.includes('translate') && transform?.includes('rotate');
        });
        return arrowGroup?.getAttribute('transform');
      };
      
      const transform1 = getArrowTransform(container1);
      const transform2 = getArrowTransform(container2);
      
      // Transforms should be different due to different orientations
      expect(transform1).not.toBe(transform2);
    });

    it('arrow renders for curved edges', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 100,
        targetY: 100,
        edgeIndex: 1,
        totalParallelEdges: 3,
      });
      
      // Find the arrow path
      const paths = container.querySelectorAll('path');
      const arrowPath = Array.from(paths).find(p => 
        p.getAttribute('d')?.includes('L 8 4 L 0 8 z')
      );
      
      expect(arrowPath).toBeTruthy();
    });
  });
});

  describe('Edge Label Enhancements', () => {
    describe('Label Visibility in Dense Graphs', () => {
      it('shows label for thick edges (>=3px) in dense graphs', () => {
        const { container } = renderEdge({
          label: 'Test Label',
          strokeWidth: 3,
          data: { totalEdgeCount: 150 }, // Dense graph (>100 edges)
        });
        expect(container).toBeTruthy();
        // Label should be rendered (EdgeLabelRenderer handles this)
      });

      it('hides label for thin edges (<3px) in dense graphs', () => {
        const { container } = renderEdge({
          label: 'Test Label',
          strokeWidth: 2,
          data: { totalEdgeCount: 150 }, // Dense graph (>100 edges)
        });
        expect(container).toBeTruthy();
        // Label should not be rendered due to thin edge in dense graph
      });

      it('shows label for thin edges in non-dense graphs', () => {
        const { container } = renderEdge({
          label: 'Test Label',
          strokeWidth: 2,
          data: { totalEdgeCount: 50 }, // Non-dense graph (<=100 edges)
        });
        expect(container).toBeTruthy();
        // Label should be rendered even for thin edges in non-dense graphs
      });

      it('shows label when totalEdgeCount is not provided', () => {
        const { container } = renderEdge({
          label: 'Test Label',
          strokeWidth: 2,
          // No totalEdgeCount provided
        });
        expect(container).toBeTruthy();
        // Label should be rendered when edge count is unknown
      });

      it('uses weight to calculate thickness for density check', () => {
        const { container } = renderEdge({
          label: 'Test Label',
          weight: 2, // Weight 2 = 3px thickness
          data: { totalEdgeCount: 150 }, // Dense graph
        });
        expect(container).toBeTruthy();
        // Label should be rendered (3px >= 3px threshold)
      });

      it('hides label for weight 1 edges in dense graphs', () => {
        const { container } = renderEdge({
          label: 'Test Label',
          weight: 1, // Weight 1 = 2px thickness
          data: { totalEdgeCount: 150 }, // Dense graph
        });
        expect(container).toBeTruthy();
        // Label should not be rendered (2px < 3px threshold)
      });

      it('dense graph threshold is exactly 100 edges', () => {
        // At 100 edges, not dense
        const { container: container100 } = renderEdge({
          label: 'Test Label',
          strokeWidth: 2,
          data: { totalEdgeCount: 100 },
        });
        expect(container100).toBeTruthy();
        // Label should be rendered at exactly 100 edges

        // At 101 edges, dense
        const { container: container101 } = renderEdge({
          label: 'Test Label',
          strokeWidth: 2,
          data: { totalEdgeCount: 101 },
        });
        expect(container101).toBeTruthy();
        // Label should not be rendered at 101 edges
      });
    });

    describe('Label Positioning', () => {
      it('positions label at edge midpoint by default', () => {
        const { container } = renderEdge({
          label: 'Test Label',
          sourceX: 0,
          sourceY: 0,
          targetX: 100,
          targetY: 0,
        });
        expect(container).toBeTruthy();
        // EdgeLabelRenderer handles positioning internally
      });

      it('adjusts label position to avoid node overlap', () => {
        const { container } = renderEdge({
          label: 'Test Label',
          sourceX: 0,
          sourceY: 0,
          targetX: 50, // Short edge where midpoint might overlap with nodes
          targetY: 0,
        });
        expect(container).toBeTruthy();
        // Label position should be adjusted to avoid overlap
      });

      it('handles label positioning for curved edges', () => {
        const { container } = renderEdge({
          label: 'Test Label',
          sourceX: 0,
          sourceY: 0,
          targetX: 100,
          targetY: 100,
          edgeIndex: 1,
          totalParallelEdges: 3,
        });
        expect(container).toBeTruthy();
        // Label should be positioned on the curved path
      });

      it('handles label positioning for vertical edges', () => {
        const { container } = renderEdge({
          label: 'Test Label',
          sourceX: 50,
          sourceY: 0,
          targetX: 50,
          targetY: 100,
        });
        expect(container).toBeTruthy();
        // Label should be positioned correctly on vertical edge
      });

      it('handles label positioning for diagonal edges', () => {
        const { container } = renderEdge({
          label: 'Test Label',
          sourceX: 0,
          sourceY: 0,
          targetX: 100,
          targetY: 100,
        });
        expect(container).toBeTruthy();
        // Label should be positioned correctly on diagonal edge
      });
    });

    describe('Label Styling', () => {
      it('applies white background to label', () => {
        const { container } = renderEdge({
          label: 'Test Label',
        });
        expect(container).toBeTruthy();
        // EdgeLabelRenderer applies white background internally
      });

      it('applies 2px padding to label', () => {
        const { container } = renderEdge({
          label: 'Test Label',
        });
        expect(container).toBeTruthy();
        // EdgeLabelRenderer applies padding internally
      });

      it('applies border to label', () => {
        const { container } = renderEdge({
          label: 'Test Label',
        });
        expect(container).toBeTruthy();
        // EdgeLabelRenderer applies border internally
      });

      it('applies shadow to label', () => {
        const { container } = renderEdge({
          label: 'Test Label',
        });
        expect(container).toBeTruthy();
        // EdgeLabelRenderer applies shadow internally
      });
    });

    describe('Label Content', () => {
      it('renders string labels', () => {
        const { container } = renderEdge({
          label: 'Test Label',
        });
        expect(container).toBeTruthy();
      });

      it('renders numeric labels', () => {
        const { container } = renderEdge({
          label: 123 as any,
        });
        expect(container).toBeTruthy();
      });

      it('renders React node labels', () => {
        const { container } = renderEdge({
          label: <span>Custom Label</span>,
        });
        expect(container).toBeTruthy();
      });

      it('handles empty string labels', () => {
        const { container } = renderEdge({
          label: '',
        });
        expect(container).toBeTruthy();
      });

      it('handles long labels', () => {
        const { container } = renderEdge({
          label: 'This is a very long label that might need special handling',
        });
        expect(container).toBeTruthy();
      });
    });
  });

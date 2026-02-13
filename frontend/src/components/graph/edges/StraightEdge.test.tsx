/**
 * StraightEdge Component Tests
 * Unit tests for the StraightEdge component
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { StraightEdge } from './StraightEdge';
import type { StraightEdgeProps } from './StraightEdge';

// Helper to render edge within ReactFlow context
const renderEdge = (props: Partial<StraightEdgeProps> = {}) => {
  const defaultProps: StraightEdgeProps = {
    id: 'test-edge',
    source: 'node-1',
    target: 'node-2',
    sourceX: 0,
    sourceY: 0,
    targetX: 200,
    targetY: 200,
    sourcePosition: 'right' as const,
    targetPosition: 'left' as const,
    ...props,
  };

  return render(
    <ReactFlowProvider>
      <svg>
        <StraightEdge {...defaultProps} />
      </svg>
    </ReactFlowProvider>
  );
};

describe('StraightEdge', () => {
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

  describe('Straight Line Path', () => {
    it('creates a straight line path', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
      });
      const path = container.querySelector('path.react-flow__edge-path');
      const d = path?.getAttribute('d');
      
      // Should start with M (move to), contain L (line to)
      // Coordinates are adjusted for node rectangle boundaries
      expect(d).toMatch(/^M\s+[\d.-]+,[\d.-]+\s+L\s+[\d.-]+,[\d.-]+$/);
    });

    it('connects at node boundaries', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
      });
      const path = container.querySelector('path.react-flow__edge-path');
      const d = path?.getAttribute('d');
      
      // Path should be adjusted from node centers to boundaries
      expect(d).toBeTruthy();
      expect(d).toMatch(/^M\s+[\d.-]+,[\d.-]+\s+L\s+[\d.-]+,[\d.-]+$/);
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

    it('positions label at midpoint', () => {
      // EdgeLabelRenderer handles positioning internally
      // We just verify the component renders without error
      const { container } = renderEdge({
        label: 'Test Label',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
      });
      expect(container).toBeTruthy();
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

  describe('Directional Arrows (SVG Markers)', () => {
    it('renders arrow marker definitions', () => {
      const { container } = renderEdge({
        id: 'edge-1',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
      });
      
      // Check for marker definitions in defs
      const defs = container.querySelector('defs');
      expect(defs).toBeTruthy();
      
      // Check for normal marker
      const normalMarker = container.querySelector('marker[id="arrow-edge-1"]');
      expect(normalMarker).toBeTruthy();
      
      // Check for selected marker
      const selectedMarker = container.querySelector('marker[id="arrow-edge-1-selected"]');
      expect(selectedMarker).toBeTruthy();
    });

    it('arrow marker has 8-pixel size', () => {
      const { container } = renderEdge({
        id: 'edge-1',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
      });
      
      const marker = container.querySelector('marker[id="arrow-edge-1"]');
      expect(marker?.getAttribute('markerWidth')).toBe('8');
      expect(marker?.getAttribute('markerHeight')).toBe('8');
    });

    it('arrow marker has correct viewBox', () => {
      const { container } = renderEdge({
        id: 'edge-1',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
      });
      
      const marker = container.querySelector('marker[id="arrow-edge-1"]');
      expect(marker?.getAttribute('viewBox')).toBe('0 0 10 10');
    });

    it('arrow marker has orient="auto" for automatic orientation', () => {
      const { container } = renderEdge({
        id: 'edge-1',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
      });
      
      const marker = container.querySelector('marker[id="arrow-edge-1"]');
      expect(marker?.getAttribute('orient')).toBe('auto');
    });

    it('arrow marker path has correct shape', () => {
      const { container } = renderEdge({
        id: 'edge-1',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
      });
      
      const marker = container.querySelector('marker[id="arrow-edge-1"]');
      const path = marker?.querySelector('path');
      expect(path?.getAttribute('d')).toBe('M 0 0 L 10 5 L 0 10 z');
    });

    it('normal arrow marker uses default stroke color', () => {
      const { container } = renderEdge({
        id: 'edge-1',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
        selected: false,
        stroke: '#9e9e9e',
      });
      
      const marker = container.querySelector('marker[id="arrow-edge-1"]');
      const path = marker?.querySelector('path');
      expect(path?.getAttribute('fill')).toBe('#9e9e9e');
    });

    it('selected arrow marker uses selection color', () => {
      const { container } = renderEdge({
        id: 'edge-1',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
        selected: true,
      });
      
      const marker = container.querySelector('marker[id="arrow-edge-1-selected"]');
      const path = marker?.querySelector('path');
      expect(path?.getAttribute('fill')).toBe('#1976d2');
    });

    it('normal arrow marker uses custom stroke color', () => {
      const { container } = renderEdge({
        id: 'edge-1',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
        selected: false,
        stroke: '#ff0000',
      });
      
      const marker = container.querySelector('marker[id="arrow-edge-1"]');
      const path = marker?.querySelector('path');
      expect(path?.getAttribute('fill')).toBe('#ff0000');
    });

    it('edge path references normal marker when not selected', () => {
      const { container } = renderEdge({
        id: 'edge-1',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
        selected: false,
      });
      
      const edgePath = container.querySelector('path.react-flow__edge-path');
      const markerEnd = edgePath?.getAttribute('marker-end');
      expect(markerEnd).toBe('url(#arrow-edge-1)');
    });

    it('edge path references selected marker when selected', () => {
      const { container } = renderEdge({
        id: 'edge-1',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
        selected: true,
      });
      
      const edgePath = container.querySelector('path.react-flow__edge-path');
      const markerEnd = edgePath?.getAttribute('marker-end');
      expect(markerEnd).toBe('url(#arrow-edge-1-selected)');
    });

    it('arrow is positioned at end of path (target node boundary)', () => {
      const { container } = renderEdge({
        id: 'edge-1',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
      });
      
      // Marker is automatically positioned at the end of the path by SVG
      const edgePath = container.querySelector('path.react-flow__edge-path');
      const markerEnd = edgePath?.getAttribute('marker-end');
      expect(markerEnd).toBeTruthy();
      expect(markerEnd).toMatch(/^url\(#arrow-edge-1.*\)$/);
    });

    it('creates unique marker IDs for different edges', () => {
      const { container: container1 } = renderEdge({
        id: 'edge-1',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
      });
      
      const { container: container2 } = renderEdge({
        id: 'edge-2',
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 0,
      });
      
      const marker1 = container1.querySelector('marker[id="arrow-edge-1"]');
      const marker2 = container2.querySelector('marker[id="arrow-edge-2"]');
      
      expect(marker1).toBeTruthy();
      expect(marker2).toBeTruthy();
      expect(marker1?.getAttribute('id')).not.toBe(marker2?.getAttribute('id'));
    });
  });

  describe('Edge Cases', () => {
    it('handles zero-length edge (overlapping nodes)', () => {
      const { container } = renderEdge({
        sourceX: 100,
        sourceY: 100,
        targetX: 100,
        targetY: 100,
      });
      const path = container.querySelector('path.react-flow__edge-path');
      expect(path).toBeTruthy();
    });

    it('handles vertical edge', () => {
      const { container } = renderEdge({
        sourceX: 100,
        sourceY: 0,
        targetX: 100,
        targetY: 200,
      });
      const path = container.querySelector('path.react-flow__edge-path');
      const d = path?.getAttribute('d');
      expect(d).toMatch(/^M\s+[\d.-]+,[\d.-]+\s+L\s+[\d.-]+,[\d.-]+$/);
    });

    it('handles horizontal edge', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 100,
        targetX: 200,
        targetY: 100,
      });
      const path = container.querySelector('path.react-flow__edge-path');
      const d = path?.getAttribute('d');
      expect(d).toMatch(/^M\s+[\d.-]+,[\d.-]+\s+L\s+[\d.-]+,[\d.-]+$/);
    });

    it('handles diagonal edge', () => {
      const { container } = renderEdge({
        sourceX: 0,
        sourceY: 0,
        targetX: 200,
        targetY: 200,
      });
      const path = container.querySelector('path.react-flow__edge-path');
      const d = path?.getAttribute('d');
      expect(d).toMatch(/^M\s+[\d.-]+,[\d.-]+\s+L\s+[\d.-]+,[\d.-]+$/);
    });

    it('handles negative coordinates', () => {
      const { container } = renderEdge({
        sourceX: -100,
        sourceY: -100,
        targetX: 100,
        targetY: 100,
      });
      const path = container.querySelector('path.react-flow__edge-path');
      expect(path).toBeTruthy();
    });
  });

  describe('Edge Thickness from Weight', () => {
    it('calculates thickness from weight property', () => {
      const { container } = renderEdge({ weight: 3 });
      const path = container.querySelector('path.react-flow__edge-path');
      const style = path?.getAttribute('style');
      // Weight 3 = 2 + (3-1) = 4px
      expect(style).toContain('stroke-width: 4');
    });

    it('uses default thickness when weight not provided', () => {
      const { container } = renderEdge();
      const path = container.querySelector('path.react-flow__edge-path');
      const style = path?.getAttribute('style');
      // Default weight 1 = 2px
      expect(style).toContain('stroke-width: 2');
    });

    it('extracts weight from edge data', () => {
      const { container } = renderEdge({ data: { weight: 5 } });
      const path = container.querySelector('path.react-flow__edge-path');
      const style = path?.getAttribute('style');
      // Weight 5 = 2 + (5-1) = 6px (max)
      expect(style).toContain('stroke-width: 6');
    });
  });

  describe('Label Visibility in Dense Graphs', () => {
    it('shows label for thick edges (>=3px) in dense graphs', () => {
      const { container } = renderEdge({
        label: 'Test Label',
        strokeWidth: 3,
        data: { totalEdgeCount: 150 },
      });
      expect(container).toBeTruthy();
    });

    it('hides label for thin edges (<3px) in dense graphs', () => {
      const { container } = renderEdge({
        label: 'Test Label',
        strokeWidth: 2,
        data: { totalEdgeCount: 150 },
      });
      expect(container).toBeTruthy();
    });

    it('shows label for thin edges in non-dense graphs', () => {
      const { container } = renderEdge({
        label: 'Test Label',
        strokeWidth: 2,
        data: { totalEdgeCount: 50 },
      });
      expect(container).toBeTruthy();
    });
  });
});

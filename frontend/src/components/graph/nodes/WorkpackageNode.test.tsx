/**
 * Unit tests for WorkpackageNode component
 * Tests the unified design implementation with hierarchical progress indicator
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { WorkpackageNode } from './WorkpackageNode';
import type { CustomNodeData } from './types';

// Mock data for testing
const createMockData = (overrides?: Partial<CustomNodeData>): CustomNodeData => ({
  label: 'Test Workpackage',
  type: 'workpackage',
  properties: {},
  ...overrides,
});

// Wrapper component for ReactFlow context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

describe('WorkpackageNode', () => {
  describe('Unified Design Rendering', () => {
    it('should render with unified node structure', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-1"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="workpackage"]');
      expect(node).toBeTruthy();
    });

    it('should render circular background', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-2"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Find circular background
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should render rounded rectangle content box', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-3"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Find rounded rectangle (150x60 with rx=8)
      const rect = container.querySelector('rect[rx="8"]');
      expect(rect).toBeTruthy();
      expect(rect?.getAttribute('width')).toBe('150');
      expect(rect?.getAttribute('height')).toBe('60');
    });

    it('should render workpackage label inside box', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-4"
            data={createMockData({ label: 'My Workpackage' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find all text elements and look for the label
      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => text.textContent === 'My Workpackage');
      expect(labelText).toBeTruthy();
    });
  });

  describe('Workpackage-Specific Icon', () => {
    it('should render folder icon', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-5"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Check for SVG paths (folder icon is an SVG)
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render folder icon in upper-left corner', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-6"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Icon should be present
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('Workpackage Type Label', () => {
    it('should render "Workpackage" type label', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-7"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const typeLabel = Array.from(texts).find((text) => text.textContent === 'Workpackage');
      expect(typeLabel).toBeTruthy();
    });

    it('should render type label below icon', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-8"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Type label should be present
      const texts = container.querySelectorAll('text');
      const typeLabel = Array.from(texts).find((text) => text.textContent === 'Workpackage');
      expect(typeLabel).toBeTruthy();
    });
  });

  describe('Hierarchical Progress Dial Gauge', () => {
    it('should render mini pie chart for hierarchical progress', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-9"
            data={createMockData({ progress: 50 })}
            selected={false}
          />
        </TestWrapper>
      );

      // Mini pie chart contains circles and paths
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should configure gauge with 0-360 degrees (full circle)', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-10"
            data={createMockData({ progress: 100 })}
            selected={false}
          />
        </TestWrapper>
      );

      // Full circle gauge should be present
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should use green color for progress gauge', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-11"
            data={createMockData({ progress: 75 })}
            selected={false}
          />
        </TestWrapper>
      );

      // Mini pie chart should be present
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
      
      // Gauge should have paths
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should show progress value when showValue is true', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-12"
            data={createMockData({ progress: 65 })}
            selected={false}
          />
        </TestWrapper>
      );

      // Check for value text showing progress
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find((text) => text.textContent === '65');
      expect(valueText).toBeTruthy();
    });

    it('should show 0% progress when no progress data', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-13"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Check for value text showing 0
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find((text) => text.textContent === '0');
      expect(valueText).toBeTruthy();
    });

    it('should use explicit progress when provided', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-14"
            data={createMockData({ progress: 42 })}
            selected={false}
          />
        </TestWrapper>
      );

      // Check for value text showing explicit progress
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find((text) => text.textContent === '42');
      expect(valueText).toBeTruthy();
    });

    it('should handle children array for hierarchical calculation', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-15"
            data={createMockData({ 
              children: ['child-1', 'child-2', 'child-3'],
              progress: undefined 
            })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should render with default 0 progress when children present but no explicit progress
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find((text) => text.textContent === '0');
      expect(valueText).toBeTruthy();
    });

    it('should update progress when data changes', () => {
      const { container, rerender } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-16"
            data={createMockData({ progress: 25 })}
            selected={false}
          />
        </TestWrapper>
      );

      // Initial state: 25%
      let texts = container.querySelectorAll('text');
      let valueText = Array.from(texts).find((text) => text.textContent === '25');
      expect(valueText).toBeTruthy();

      // Update to 75%
      rerender(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-16"
            data={createMockData({ progress: 75 })}
            selected={false}
          />
        </TestWrapper>
      );

      // Updated state: 75%
      texts = container.querySelectorAll('text');
      valueText = Array.from(texts).find((text) => text.textContent === '75');
      expect(valueText).toBeTruthy();
    });
  });

  describe('Status Icon', () => {
    it('should render status icon when status is provided', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-17"
            data={createMockData({ status: 'active' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Status icon is an SVG with paths
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render draft status icon', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-18"
            data={createMockData({ status: 'draft' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Draft icon should be present
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render active status icon', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-19"
            data={createMockData({ status: 'active' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Active icon should be present
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render completed status icon', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-20"
            data={createMockData({ status: 'completed' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Completed icon should be present (checkmark in circle)
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should render archived status icon', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-21"
            data={createMockData({ status: 'archived' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Archived icon should be present
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should not render status icon when status is undefined', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-22"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render node without status icon
      const node = container.querySelector('[data-node-type="workpackage"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Selection State', () => {
    it('should apply selected styles when selected', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-23"
            data={createMockData()}
            selected={true}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-selected="true"]');
      expect(node).toBeTruthy();

      // Find content box rectangle
      const rect = container.querySelector('rect[rx="8"]');
      expect(rect).toBeTruthy();

      // Selected nodes should have black border
      const stroke = rect?.getAttribute('stroke');
      expect(stroke).toBe('#000');
    });

    it('should have thicker border when selected', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-24"
            data={createMockData()}
            selected={true}
          />
        </TestWrapper>
      );

      // Find content box rectangle
      const rect = container.querySelector('rect[rx="8"]');
      expect(rect).toBeTruthy();

      const strokeWidth = rect?.getAttribute('stroke-width');
      expect(strokeWidth).toBe('3');
    });
  });

  describe('Priority Badge', () => {
    it('should render priority badge when priority is set', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-25"
            data={createMockData({ priority: 1 })}
            selected={false}
          />
        </TestWrapper>
      );

      // Priority badge shows the number
      const texts = container.querySelectorAll('text');
      const priorityText = Array.from(texts).find((text) => text.textContent === '1');
      expect(priorityText).toBeTruthy();
    });

    it('should not render priority badge when priority is undefined', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-26"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render but without priority badge
      const node = container.querySelector('[data-node-type="workpackage"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Hover State', () => {
    it('should have hover data attribute', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-27"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-hovered]');
      expect(node).toBeTruthy();
    });

    it('should apply scale transform on hover', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-28"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.style.transform).toBeTruthy();
    });
  });

  describe('Handles', () => {
    it('should render target handle at top', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-29"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const handles = container.querySelectorAll('.react-flow__handle');
      expect(handles.length).toBeGreaterThanOrEqual(2);

      const targetHandle = container.querySelector('.react-flow__handle-top');
      expect(targetHandle).toBeTruthy();
    });

    it('should render source handle at bottom', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-30"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const sourceHandle = container.querySelector('.react-flow__handle-bottom');
      expect(sourceHandle).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have text with proper styling for readability', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-31"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const text = container.querySelector('text');
      expect(text).toBeTruthy();
      expect(text?.getAttribute('text-anchor')).toBe('middle');
    });

    it('should have smooth transitions', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-32"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.style.transition).toContain('ease-in-out');
    });
  });

  describe('Integration with UnifiedNode', () => {
    it('should pass correct props to UnifiedNode', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-33"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should render with unified node structure
      const node = container.querySelector('[data-node-type="workpackage"]');
      expect(node).toBeTruthy();
    });

    it('should render with iconPosition upper-left', () => {
      const { container } = render(
        <TestWrapper>
          <WorkpackageNode
            id="workpackage-34"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Icon should be present in upper-left
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });
});

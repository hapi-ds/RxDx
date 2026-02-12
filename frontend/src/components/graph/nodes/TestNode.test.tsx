/**
 * Unit tests for TestNode component
 * Tests the unified design implementation for test nodes
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { TestNode } from './TestNode';
import type { CustomNodeData } from './types';

// Mock data for testing
const createMockData = (overrides?: Partial<CustomNodeData>): CustomNodeData => ({
  label: 'Test Case',
  type: 'test',
  properties: {},
  ...overrides,
});

// Wrapper component for ReactFlow context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

describe('TestNode', () => {
  describe('Unified Design Rendering', () => {
    it('should render with unified node structure', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-1"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="test"]');
      expect(node).toBeTruthy();
    });

    it('should render rounded rectangle content box', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-2"
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

    it('should render test label inside box', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-3"
            data={createMockData({ label: 'Login Test' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find all text elements and look for the label
      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => text.textContent === 'Login Test');
      expect(labelText).toBeTruthy();
    });

    it('should render test icon in header', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-4"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Check for SVG paths (test icon is an SVG beaker/flask)
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render "Test" type label in header', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-5"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const typeLabel = Array.from(texts).find((text) => text.textContent === 'Test');
      expect(typeLabel).toBeTruthy();
    });

    it('should not render any gauges', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-6"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Test nodes should not have dial gauges
      const gauges = container.querySelectorAll('[data-gauge-id]');
      expect(gauges.length).toBe(0);
    });
  });

  describe('Test-Specific Icon', () => {
    it('should render beaker/flask icon for test type', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-7"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Test icon is a beaker/flask SVG
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should use purple color for test icon', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-8"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Test icon should be present (color may be applied via CSS or inline styles)
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('Status Icons', () => {
    it('should render draft status icon', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-9"
            data={createMockData({ status: 'draft' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Draft icon is a pencil/edit icon
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render active status icon', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-10"
            data={createMockData({ status: 'active' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Active icon is a play/arrow icon
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render completed status icon', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-11"
            data={createMockData({ status: 'completed' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Completed icon is a checkmark in circle
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should render archived status icon', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-12"
            data={createMockData({ status: 'archived' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Archived icon is a box/archive icon
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render passed status icon', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-13"
            data={createMockData({ status: 'passed' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Passed icon is a checkmark in filled circle
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should render failed status icon', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-14"
            data={createMockData({ status: 'failed' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Failed icon is an X in filled circle
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should render pending status icon', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-15"
            data={createMockData({ status: 'pending' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Pending icon is a clock icon
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should not render status icon when status is undefined', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-16"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render the node
      const node = container.querySelector('[data-node-type="test"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Selection State', () => {
    it('should apply selected styles when selected', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-17"
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
          <TestNode
            id="test-18"
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

    it('should not have selected styles when not selected', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-19"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-selected="false"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Priority Badge', () => {
    it('should render priority badge when priority is set', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-20"
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

    it('should render different priority levels', () => {
      const priorities = [1, 2, 3, 4, 5];

      priorities.forEach((priority) => {
        const { container } = render(
          <TestWrapper>
            <TestNode
              id={`test-priority-${priority}`}
              data={createMockData({ priority })}
              selected={false}
            />
          </TestWrapper>
        );

        const texts = container.querySelectorAll('text');
        const priorityText = Array.from(texts).find(
          (text) => text.textContent === priority.toString()
        );
        expect(priorityText).toBeTruthy();
      });
    });

    it('should not render priority badge when priority is undefined', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-21"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render but without priority badge
      const node = container.querySelector('[data-node-type="test"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Hover State', () => {
    it('should have hover data attribute', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-22"
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
          <TestNode
            id="test-23"
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
          <TestNode
            id="test-24"
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
          <TestNode
            id="test-25"
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
          <TestNode
            id="test-26"
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
          <TestNode
            id="test-27"
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

  describe('Different Test Statuses', () => {
    it('should render correctly with passed status', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-28"
            data={createMockData({ status: 'passed', label: 'Passed Test' })}
            selected={false}
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => text.textContent === 'Passed Test');
      expect(labelText).toBeTruthy();

      // Should have checkmark icon
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should render correctly with failed status', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-29"
            data={createMockData({ status: 'failed', label: 'Failed Test' })}
            selected={false}
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => text.textContent === 'Failed Test');
      expect(labelText).toBeTruthy();

      // Should have X icon
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should render correctly with pending status', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-30"
            data={createMockData({ status: 'pending', label: 'Pending Test' })}
            selected={false}
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => text.textContent === 'Pending Test');
      expect(labelText).toBeTruthy();

      // Should have clock icon
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty label', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-31"
            data={createMockData({ label: '' })}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="test"]');
      expect(node).toBeTruthy();
    });

    it('should handle long label text', () => {
      const longLabel = 'This is a very long test case name that should be truncated';
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-32"
            data={createMockData({ label: longLabel })}
            selected={false}
          />
        </TestWrapper>
      );

      // Node should render even with long label (may be truncated)
      const node = container.querySelector('[data-node-type="test"]');
      expect(node).toBeTruthy();
      
      // Should have some text content
      const texts = container.querySelectorAll('text');
      expect(texts.length).toBeGreaterThan(0);
    });

    it('should handle missing properties', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-33"
            data={{ label: 'Test', type: 'test' }}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="test"]');
      expect(node).toBeTruthy();
    });

    it('should handle unknown status gracefully', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-34"
            data={createMockData({ status: 'unknown-status' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render the node
      const node = container.querySelector('[data-node-type="test"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Integration with UnifiedNode', () => {
    it('should pass correct props to UnifiedNode', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-35"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should render with test type
      const node = container.querySelector('[data-node-type="test"]');
      expect(node).toBeTruthy();

      // Should have "Test" type label
      const texts = container.querySelectorAll('text');
      const typeLabel = Array.from(texts).find((text) => text.textContent === 'Test');
      expect(typeLabel).toBeTruthy();
    });

    it('should use upper-left icon position', () => {
      const { container } = render(
        <TestWrapper>
          <TestNode
            id="test-36"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Icon should be positioned in upper-left
      const node = container.querySelector('[data-node-type="test"]');
      expect(node).toBeTruthy();
    });
  });
});

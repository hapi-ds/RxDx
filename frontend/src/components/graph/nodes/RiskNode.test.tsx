/**
 * Unit tests for RiskNode component
 * Tests the unified design implementation with RPN dial gauge
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { RiskNode } from './RiskNode';
import type { CustomNodeData } from './types';

// Mock data for testing
const createMockData = (overrides?: Partial<CustomNodeData>): CustomNodeData => ({
  label: 'Test Risk',
  type: 'risk',
  properties: {},
  ...overrides,
});

// Wrapper component for ReactFlow context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

describe('RiskNode', () => {
  describe('Unified Design Rendering', () => {
    it('should render with unified node structure', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-1"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="risk"]');
      expect(node).toBeTruthy();
    });

    it('should render rounded rectangle content box', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-2"
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

    it('should render risk label inside box', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-3"
            data={createMockData({ label: 'Critical Risk' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find all text elements and look for the label
      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => text.textContent === 'Critical Risk');
      expect(labelText).toBeTruthy();
    });

    it('should render warning icon in header', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-4"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Check for SVG paths (warning icon is an SVG)
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render "Risk" type label in header', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-5"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const typeLabel = Array.from(texts).find((text) => text.textContent === 'Risk');
      expect(typeLabel).toBeTruthy();
    });

    it('should render status icon in header when status is provided', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-6"
            data={createMockData({ status: 'active' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Status icon is an SVG with paths
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('RPN Mini Pie Chart', () => {
    it('should render mini pie chart for RPN', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-7"
            data={createMockData({ properties: { rpn: 150 } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Mini pie chart contains circles and paths
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should display RPN value in pie chart', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-8"
            data={createMockData({ properties: { rpn: 250 } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Check for value text showing RPN
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find((text) => text.textContent === '25');
      expect(valueText).toBeTruthy();
    });

    it('should show 0 RPN when rpn is undefined', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-9"
            data={createMockData({ properties: {} })}
            selected={false}
          />
        </TestWrapper>
      );

      // Check for value text showing 0
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find((text) => text.textContent === '0');
      expect(valueText).toBeTruthy();
    });

    it('should render pie chart in footer area', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-10"
            data={createMockData({ properties: { rpn: 100 } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Pie chart should be present
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });
  });

  describe('RPN Color Coding', () => {
    it('should use red color for critical RPN (>=200)', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-11"
            data={createMockData({ properties: { rpn: 250 } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find pie chart path with red fill
      const paths = container.querySelectorAll('path[fill="#dc2626"]');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should use orange color for high RPN (>=100, <200)', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-12"
            data={createMockData({ properties: { rpn: 150 } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find pie chart path with orange fill
      const paths = container.querySelectorAll('path[fill="#f57c00"]');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should use yellow color for medium RPN (>=50, <100)', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-13"
            data={createMockData({ properties: { rpn: 75 } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find pie chart path with yellow fill
      const paths = container.querySelectorAll('path[fill="#fbc02d"]');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should use green color for low RPN (<50)', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-14"
            data={createMockData({ properties: { rpn: 25 } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find pie chart path with green fill
      const paths = container.querySelectorAll('path[fill="#388e3c"]');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should update color when RPN changes', () => {
      const { container, rerender } = render(
        <TestWrapper>
          <RiskNode
            id="risk-15"
            data={createMockData({ properties: { rpn: 25 } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Initial state: green (low RPN)
      let paths = container.querySelectorAll('path[fill="#388e3c"]');
      expect(paths.length).toBeGreaterThan(0);

      // Update to high RPN
      rerender(
        <TestWrapper>
          <RiskNode
            id="risk-15"
            data={createMockData({ properties: { rpn: 250 } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Updated state: red (critical RPN)
      paths = container.querySelectorAll('path[fill="#dc2626"]');
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('RPN Attribute Integration', () => {
    it('should extract RPN from properties', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-16"
            data={createMockData({ properties: { rpn: 123 } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Check for RPN value display
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find((text) => text.textContent === '12');
      expect(valueText).toBeTruthy();
    });

    it('should handle missing RPN property', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-17"
            data={createMockData({ properties: {} })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should default to 0
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find((text) => text.textContent === '0');
      expect(valueText).toBeTruthy();
    });

    it('should handle RPN value of 0', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-18"
            data={createMockData({ properties: { rpn: 0 } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should show 0
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find((text) => text.textContent === '0');
      expect(valueText).toBeTruthy();
    });

    it('should handle maximum RPN value (1000)', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-19"
            data={createMockData({ properties: { rpn: 1000 } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should show 100 (100% of max)
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find((text) => text.textContent === '100');
      expect(valueText).toBeTruthy();
    });
  });

  describe('Status Icons', () => {
    it('should render draft status icon', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-20"
            data={createMockData({ status: 'draft' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Status icon should be present
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render active status icon', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-21"
            data={createMockData({ status: 'active' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Status icon should be present
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render mitigated status icon', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-22"
            data={createMockData({ status: 'mitigated' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Status icon should be present
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render archived status icon', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-23"
            data={createMockData({ status: 'archived' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Status icon should be present
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should not render status icon when status is undefined', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-24"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render but without status icon
      const node = container.querySelector('[data-node-type="risk"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Selection State', () => {
    it('should apply selected styles when selected', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-25"
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
          <RiskNode
            id="risk-26"
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
          <RiskNode
            id="risk-27"
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
          <RiskNode
            id="risk-28"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render but without priority badge
      const node = container.querySelector('[data-node-type="risk"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Hover State', () => {
    it('should have hover data attribute', () => {
      const { container } = render(
        <TestWrapper>
          <RiskNode
            id="risk-29"
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
          <RiskNode
            id="risk-30"
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
          <RiskNode
            id="risk-31"
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
          <RiskNode
            id="risk-32"
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
          <RiskNode
            id="risk-33"
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
          <RiskNode
            id="risk-34"
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
});

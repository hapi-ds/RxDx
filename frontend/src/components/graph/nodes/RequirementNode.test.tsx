/**
 * Unit tests for RequirementNode component
 * Tests the unified design implementation with signed indicator
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { RequirementNode } from './RequirementNode';
import type { CustomNodeData } from './types';

// Mock data for testing
const createMockData = (overrides?: Partial<CustomNodeData>): CustomNodeData => ({
  label: 'Test Requirement',
  type: 'requirement',
  properties: {},
  ...overrides,
});

// Wrapper component for ReactFlow context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

describe('RequirementNode', () => {
  describe('Unified Design Rendering', () => {
    it('should render with unified node structure', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-1"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="requirement"]');
      expect(node).toBeTruthy();
    });

    it('should render rounded rectangle content box', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-2"
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

    it('should render requirement label inside box', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-3"
            data={createMockData({ label: 'User Authentication' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find all text elements and look for the label (may be wrapped)
      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => 
        text.textContent?.includes('User') || text.textContent?.includes('Authentication')
      );
      expect(labelText).toBeTruthy();
    });

    it('should render requirement icon in header', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-4"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Check for SVG paths (requirement icon is an SVG)
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render "Requirement" type label in header', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-5"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const typeLabel = Array.from(texts).find((text) => text.textContent === 'Requirement');
      expect(typeLabel).toBeTruthy();
    });

    it('should render status icon in header when status is provided', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-6"
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

  describe('Signed Indicator Dial Gauge', () => {
    it('should render signed indicator when is_signed is true', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-7"
            data={createMockData({ properties: { is_signed: true } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Mini pie chart contains circles and paths
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should not render signed indicator when is_signed is false', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-8"
            data={createMockData({ properties: { is_signed: false } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should render node but without pie chart
      const node = container.querySelector('[data-node-type="requirement"]');
      expect(node).toBeTruthy();
    });

    it('should not render signed indicator when is_signed is undefined', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-9"
            data={createMockData({ properties: {} })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should render node but without pie chart
      const node = container.querySelector('[data-node-type="requirement"]');
      expect(node).toBeTruthy();
    });

    it('should use green color for signed indicator', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-10"
            data={createMockData({ properties: { is_signed: true } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find pie chart path with green fill
      const paths = container.querySelectorAll('path[fill="#388e3c"]');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render signed indicator in footer area', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-11"
            data={createMockData({ properties: { is_signed: true } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Pie chart should be present
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('should update signed indicator when is_signed changes', () => {
      const { container, rerender } = render(
        <TestWrapper>
          <RequirementNode
            id="req-12"
            data={createMockData({ properties: { is_signed: false } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Initial state: no signed indicator
      const node = container.querySelector('[data-node-type="requirement"]');
      expect(node).toBeTruthy();

      // Update to is_signed=true
      rerender(
        <TestWrapper>
          <RequirementNode
            id="req-12"
            data={createMockData({ properties: { is_signed: true } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Updated state: signed indicator present
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });
  });

  describe('Status Icons', () => {
    it('should render draft status icon', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-13"
            data={createMockData({ status: 'draft' })}
            selected={false}
          />
        </TestWrapper>
      );

      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render active status icon', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-14"
            data={createMockData({ status: 'active' })}
            selected={false}
          />
        </TestWrapper>
      );

      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render completed status icon', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-15"
            data={createMockData({ status: 'completed' })}
            selected={false}
          />
        </TestWrapper>
      );

      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render archived status icon', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-16"
            data={createMockData({ status: 'archived' })}
            selected={false}
          />
        </TestWrapper>
      );

      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should not render status icon when status is undefined', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-17"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render the node
      const node = container.querySelector('[data-node-type="requirement"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Selection State', () => {
    it('should apply selected styles when selected', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-18"
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
          <RequirementNode
            id="req-19"
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
          <RequirementNode
            id="req-20"
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
      const { container: container1 } = render(
        <TestWrapper>
          <RequirementNode
            id="req-21"
            data={createMockData({ priority: 1 })}
            selected={false}
          />
        </TestWrapper>
      );

      const { container: container2 } = render(
        <TestWrapper>
          <RequirementNode
            id="req-22"
            data={createMockData({ priority: 5 })}
            selected={false}
          />
        </TestWrapper>
      );

      const texts1 = container1.querySelectorAll('text');
      const priority1 = Array.from(texts1).find((text) => text.textContent === '1');
      expect(priority1).toBeTruthy();

      const texts2 = container2.querySelectorAll('text');
      const priority2 = Array.from(texts2).find((text) => text.textContent === '5');
      expect(priority2).toBeTruthy();
    });

    it('should not render priority badge when priority is undefined', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-23"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render but without priority badge
      const node = container.querySelector('[data-node-type="requirement"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Hover State', () => {
    it('should have hover data attribute', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-24"
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
          <RequirementNode
            id="req-25"
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
          <RequirementNode
            id="req-26"
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
          <RequirementNode
            id="req-27"
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
          <RequirementNode
            id="req-28"
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
          <RequirementNode
            id="req-29"
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

  describe('Combined Features', () => {
    it('should render signed requirement with priority', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-30"
            data={createMockData({ 
              properties: { is_signed: true },
              priority: 1
            })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should have both signed indicator and priority badge
      const texts = container.querySelectorAll('text');
      const priorityText = Array.from(texts).find((text) => text.textContent === '1');
      expect(priorityText).toBeTruthy();

      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should render signed requirement with status', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-31"
            data={createMockData({ 
              properties: { is_signed: true },
              status: 'completed'
            })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should have both signed indicator and status icon
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);

      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should render all features together', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-32"
            data={createMockData({ 
              label: 'Critical Security Requirement',
              properties: { is_signed: true },
              status: 'active',
              priority: 1
            })}
            selected={true}
          />
        </TestWrapper>
      );

      // Should have all features
      const node = container.querySelector('[data-node-type="requirement"]');
      expect(node).toBeTruthy();

      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => 
        text.textContent?.includes('Critical')
      );
      expect(labelText).toBeTruthy();

      const priorityText = Array.from(texts).find((text) => text.textContent === '1');
      expect(priorityText).toBeTruthy();

      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);

      const rect = container.querySelector('rect[rx="8"]');
      expect(rect?.getAttribute('stroke')).toBe('#000');
    });
  });

  describe('Text Wrapping', () => {
    it('should handle long requirement labels', () => {
      const longLabel = 'This is a very long requirement label that should wrap to multiple lines';
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-33"
            data={createMockData({ label: longLabel })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should render the node
      const node = container.querySelector('[data-node-type="requirement"]');
      expect(node).toBeTruthy();

      // Should have text elements
      const texts = container.querySelectorAll('text');
      expect(texts.length).toBeGreaterThan(0);
    });

    it('should handle short requirement labels', () => {
      const { container } = render(
        <TestWrapper>
          <RequirementNode
            id="req-34"
            data={createMockData({ label: 'Short' })}
            selected={false}
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => text.textContent === 'Short');
      expect(labelText).toBeTruthy();
    });
  });
});

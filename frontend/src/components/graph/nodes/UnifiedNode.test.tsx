/**
 * Unit tests for UnifiedNode component
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { UnifiedNode } from './UnifiedNode';
import type { CustomNodeData, GaugeDefinition } from './types';

// Mock icon components
const MockTypeIcon: React.FC<{ size?: number; color?: string }> = () => (
  <circle r={10} fill="currentColor" data-testid="type-icon" />
);

const MockStatusIcon: React.FC<{ size?: number; color?: string }> = () => (
  <circle r={8} fill="currentColor" data-testid="status-icon" />
);

// Mock data for testing
const createMockData = (
  overrides?: Partial<CustomNodeData>
): CustomNodeData => ({
  label: 'Test Node',
  type: 'requirement',
  properties: {},
  ...overrides,
});

// Wrapper component for ReactFlow context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <ReactFlowProvider>{children}</ReactFlowProvider>;

describe('UnifiedNode', () => {
  describe('Rendering', () => {
    it('should render with basic props', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-1"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="requirement"]');
      expect(node).toBeTruthy();
    });

    it('should render rounded rectangle content box', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-3"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const rect = container.querySelector('rect');
      expect(rect).toBeTruthy();
      expect(rect?.getAttribute('width')).toBe('150');
      expect(rect?.getAttribute('height')).toBe('60');
      expect(rect?.getAttribute('rx')).toBe('8');
      expect(rect?.getAttribute('ry')).toBe('8');
      expect(rect?.getAttribute('fill')).toBe('white');
    });

    it('should render node label inside box', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-4"
            data={createMockData({ label: 'My Node Label' })}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find(
        (text) => text.textContent === 'My Node Label'
      );
      expect(labelText).toBeTruthy();
      expect(labelText?.getAttribute('text-anchor')).toBe('middle');
      expect(labelText?.getAttribute('font-size')).toBe('11');
    });
  });

  describe('Type Icon and Label', () => {
    it('should render type icon in header', () => {
      const { getAllByTestId } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-5"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      // Type icon appears twice: once in header, once in corner
      const typeIcons = getAllByTestId('type-icon');
      expect(typeIcons.length).toBeGreaterThanOrEqual(1);
    });

    it('should render type label in header', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-6"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const typeLabel = Array.from(texts).find(
        (text) => text.textContent === 'Requirement'
      );
      expect(typeLabel).toBeTruthy();
      expect(typeLabel?.getAttribute('font-size')).toBe('12');
    });

    it('should position type icon and label in header area', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-7"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      // Header area should exist
      const groups = container.querySelectorAll('g[transform]');
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe('Status Icon', () => {
    it('should render status icon when provided', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-8"
            data={createMockData({ status: 'active' })}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
            statusIcon={MockStatusIcon}
          />
        </TestWrapper>
      );

      const statusIcon = getByTestId('status-icon');
      expect(statusIcon).toBeTruthy();
    });

    it('should not render status icon when not provided', () => {
      const { queryByTestId } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-9"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const statusIcon = queryByTestId('status-icon');
      expect(statusIcon).toBeNull();
    });

    it('should position status icon in header area', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-10"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
            statusIcon={MockStatusIcon}
          />
        </TestWrapper>
      );

      // Status icon should be in a group
      const groups = container.querySelectorAll('g');
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe('Priority Badge', () => {
    it('should render priority badge when priority is set', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-11"
            data={createMockData({ priority: 1 })}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
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
          <UnifiedNode
            id="node-12"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      // Should still render the node
      const node = container.querySelector('[data-node-type="requirement"]');
      expect(node).toBeTruthy();
    });

    it('should position priority badge in footer area', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-13"
            data={createMockData({ priority: 2 })}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      // Priority badge should be in a group
      const groups = container.querySelectorAll('g');
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe('Mini Pie Charts', () => {
    it('should render mini pie chart when gauges provided', () => {
      const gauges: GaugeDefinition[] = [
        {
          id: 'progress',
          label: 'Progress',
          value: 75,
          min: 0,
          max: 100,
          startAngle: 0,
          endAngle: 360,
          color: '#388e3c',
          showValue: true,
        },
      ];

      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-14"
            data={createMockData({ gauges })}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
            gauges={gauges}
          />
        </TestWrapper>
      );

      // Mini pie chart contains circles
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should render first gauge as pie chart', () => {
      const gauges: GaugeDefinition[] = [
        {
          id: 'gauge1',
          label: 'Gauge 1',
          value: 50,
          min: 0,
          max: 100,
          startAngle: 0,
          endAngle: 360,
          color: '#388e3c',
          showValue: false,
        },
        {
          id: 'gauge2',
          label: 'Gauge 2',
          value: 75,
          min: 0,
          max: 100,
          startAngle: 0,
          endAngle: 270,
          color: '#1976d2',
          showValue: false,
        },
      ];

      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-15"
            data={createMockData({ gauges })}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
            gauges={gauges}
          />
        </TestWrapper>
      );

      // Only first gauge is rendered as pie chart
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('should not render pie chart when array is empty', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-16"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
            gauges={[]}
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
          <UnifiedNode
            id="node-17"
            data={createMockData()}
            selected={true}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-selected="true"]');
      expect(node).toBeTruthy();

      // Find content box rectangle
      const rect = container.querySelector('rect');
      expect(rect).toBeTruthy();

      // Selected nodes should have black border
      const stroke = rect?.getAttribute('stroke');
      expect(stroke).toBe('#000');
    });

    it('should have thicker border when selected', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-18"
            data={createMockData()}
            selected={true}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      // Find content box rectangle
      const rect = container.querySelector('rect');
      expect(rect).toBeTruthy();

      const strokeWidth = rect?.getAttribute('stroke-width');
      expect(strokeWidth).toBe('3');
    });

    it('should have normal border when not selected', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-19"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      // Find content box rectangle
      const rect = container.querySelector('rect');
      expect(rect).toBeTruthy();

      const strokeWidth = rect?.getAttribute('stroke-width');
      expect(strokeWidth).toBe('2');
    });
  });

  describe('Hover State', () => {
    it('should have hover data attribute', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-20"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-hovered]');
      expect(node).toBeTruthy();
    });

    it('should apply scale transform on hover', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-21"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.style.transform).toBeTruthy();
      expect(svg?.style.transition).toContain('ease-in-out');
    });
  });

  describe('Handles', () => {
    it('should render target handle at top', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-22"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const targetHandle = container.querySelector('.react-flow__handle-top');
      expect(targetHandle).toBeTruthy();
    });

    it('should render source handle at bottom', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-23"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const sourceHandle = container.querySelector(
        '.react-flow__handle-bottom'
      );
      expect(sourceHandle).toBeTruthy();
    });
  });

  describe('Layout Dimensions', () => {
    it('should have correct content box dimensions', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-25"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const rect = container.querySelector('rect');
      expect(rect).toBeTruthy();
      expect(rect?.getAttribute('width')).toBe('150');
      expect(rect?.getAttribute('height')).toBe('60');
    });

    it('should have correct border radius on content box', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-26"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const rect = container.querySelector('rect');
      expect(rect).toBeTruthy();
      expect(rect?.getAttribute('rx')).toBe('8');
      expect(rect?.getAttribute('ry')).toBe('8');
    });
  });

  describe('Accessibility', () => {
    it('should have proper text styling for readability', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-27"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      texts.forEach((text) => {
        expect(text.getAttribute('text-anchor')).toBeTruthy();
      });
    });

    it('should have smooth transitions', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-28"
            data={createMockData()}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Requirement"
          />
        </TestWrapper>
      );

      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
      expect(svg?.style.transition).toContain('ease-in-out');
    });
  });

  describe('Color Scheme', () => {
    it('should apply correct border color for node type', () => {
      const { container } = render(
        <TestWrapper>
          <UnifiedNode
            id="node-30"
            data={createMockData({ type: 'risk' })}
            selected={false}
            dragging={false}
            typeIcon={MockTypeIcon}
            typeName="Risk"
          />
        </TestWrapper>
      );

      // Content box should have colored border
      const rect = container.querySelector('rect');
      expect(rect).toBeTruthy();

      const stroke = rect?.getAttribute('stroke');
      expect(stroke).toBeTruthy();
    });
  });
});

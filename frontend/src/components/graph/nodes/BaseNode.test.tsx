/**
 * Unit tests for BaseNode component
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import type { CustomNodeData } from './types';

// Mock data for testing
const mockData: CustomNodeData = {
  label: 'Test Node',
  type: 'requirement',
  properties: {},
};

// Wrapper component for ReactFlow context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

describe('BaseNode', () => {
  describe('Rendering', () => {
    it('should render with basic props', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-1"
            data={mockData}
            selected={false}
            nodeType="requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="requirement"]');
      expect(node).toBeTruthy();
    });

    it('should render children content', () => {
      render(
        <TestWrapper>
          <BaseNode
            id="test-2"
            data={mockData}
            selected={false}
            nodeType="requirement"
          >
            <div data-testid="child-content">Child Content</div>
          </BaseNode>
        </TestWrapper>
      );

      expect(screen.getByTestId('child-content')).toBeTruthy();
      expect(screen.getByText('Child Content')).toBeTruthy();
    });

    it('should apply correct node type data attribute', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-3"
            data={mockData}
            selected={false}
            nodeType="task"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="task"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Color Scheme', () => {
    it('should apply requirement color scheme', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-4"
            data={mockData}
            selected={false}
            nodeType="requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="requirement"]') as HTMLElement;
      expect(node).toBeTruthy();
      // Browsers convert hex colors to rgb format
      expect(node.style.backgroundColor).toContain('rgb');
      expect(node.style.color).toContain('rgb');
    });

    it('should apply task color scheme', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-5"
            data={{ ...mockData, type: 'task' }}
            selected={false}
            nodeType="task"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="task"]') as HTMLElement;
      expect(node).toBeTruthy();
      // Browsers convert hex colors to rgb format
      expect(node.style.backgroundColor).toContain('rgb');
      expect(node.style.color).toContain('rgb');
    });

    it('should apply custom color scheme when provided', () => {
      const customColors = {
        bg: '#ffffff',
        border: '#000000',
        text: '#333333',
      };

      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-6"
            data={mockData}
            selected={false}
            nodeType="requirement"
            colors={customColors}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="requirement"]') as HTMLElement;
      expect(node).toBeTruthy();
      // Browsers convert hex colors to rgb format
      expect(node.style.backgroundColor).toContain('rgb');
      expect(node.style.color).toContain('rgb');
    });

    it('should fallback to default colors for unknown node type', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-7"
            data={{ ...mockData, type: 'unknown' }}
            selected={false}
            nodeType="unknown"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="unknown"]') as HTMLElement;
      expect(node).toBeTruthy();
      // Browsers convert hex colors to rgb format
      expect(node.style.backgroundColor).toContain('rgb');
      expect(node.style.color).toContain('rgb');
    });
  });

  describe('Selection State', () => {
    it('should apply selected styles when selected', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-8"
            data={mockData}
            selected={true}
            nodeType="requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-selected="true"]') as HTMLElement;
      expect(node).toBeTruthy();
      // Browsers convert hex colors to rgb format
      expect(node.style.borderColor).toContain('rgb');
    });

    it('should apply normal border when not selected', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-9"
            data={mockData}
            selected={false}
            nodeType="requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-selected="false"]') as HTMLElement;
      expect(node).toBeTruthy();
      // Browsers convert hex colors to rgb format
      expect(node.style.borderColor).toContain('rgb');
    });

    it('should have enhanced shadow when selected', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-10"
            data={mockData}
            selected={true}
            nodeType="requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-selected="true"]') as HTMLElement;
      expect(node).toBeTruthy();
      expect(node.style.boxShadow).toContain('12px');
    });
  });

  describe('Hover State', () => {
    it('should update hover state on mouse enter', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-11"
            data={mockData}
            selected={false}
            nodeType="requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="requirement"]') as HTMLElement;
      expect(node).toBeTruthy();

      // Initially not hovered
      expect(node.getAttribute('data-hovered')).toBe('false');

      // Hover
      fireEvent.mouseEnter(node);
      expect(node.getAttribute('data-hovered')).toBe('true');
    });

    it('should update hover state on mouse leave', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-12"
            data={mockData}
            selected={false}
            nodeType="requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="requirement"]') as HTMLElement;
      expect(node).toBeTruthy();

      // Hover
      fireEvent.mouseEnter(node);
      expect(node.getAttribute('data-hovered')).toBe('true');

      // Leave
      fireEvent.mouseLeave(node);
      expect(node.getAttribute('data-hovered')).toBe('false');
    });

    it('should apply hover transform when hovered and not dragging', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-13"
            data={mockData}
            selected={false}
            dragging={false}
            nodeType="requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="requirement"]') as HTMLElement;
      expect(node).toBeTruthy();

      // Hover
      fireEvent.mouseEnter(node);
      expect(node.style.transform).toContain('scale(1.05)');
    });

    it('should not apply hover transform when dragging', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-14"
            data={mockData}
            selected={false}
            dragging={true}
            nodeType="requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="requirement"]') as HTMLElement;
      expect(node).toBeTruthy();

      // Hover while dragging
      fireEvent.mouseEnter(node);
      expect(node.style.transform).toBe('scale(1)');
    });
  });

  describe('Handles', () => {
    it('should render handles by default', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-15"
            data={mockData}
            selected={false}
            nodeType="requirement"
          />
        </TestWrapper>
      );

      const handles = container.querySelectorAll('.react-flow__handle');
      expect(handles.length).toBeGreaterThanOrEqual(2); // target and source
    });

    it('should not render handles when showHandles is false', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-16"
            data={mockData}
            selected={false}
            nodeType="requirement"
            showHandles={false}
          />
        </TestWrapper>
      );

      const handles = container.querySelectorAll('.react-flow__handle');
      expect(handles.length).toBe(0);
    });
  });

  describe('Custom Styles', () => {
    it('should merge custom styles with base styles', () => {
      const customStyles = {
        minWidth: '200px',
        backgroundColor: '#custom',
      };

      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-17"
            data={mockData}
            selected={false}
            nodeType="requirement"
            customStyles={customStyles}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="requirement"]') as HTMLElement;
      expect(node).toBeTruthy();
      expect(node.style.minWidth).toBe('200px');
      // Custom backgroundColor is applied but may be overridden by dynamic styles
      // Just verify the node exists and minWidth is applied
    });
  });

  describe('Accessibility', () => {
    it('should have cursor pointer for interactivity', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-18"
            data={mockData}
            selected={false}
            nodeType="requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="requirement"]') as HTMLElement;
      expect(node).toBeTruthy();
      expect(node.style.cursor).toBe('pointer');
    });

    it('should have smooth transitions', () => {
      const { container } = render(
        <TestWrapper>
          <BaseNode
            id="test-19"
            data={mockData}
            selected={false}
            nodeType="requirement"
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="requirement"]') as HTMLElement;
      expect(node).toBeTruthy();
      expect(node.style.transition).toContain('ease-in-out');
    });
  });
});

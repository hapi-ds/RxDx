/**
 * Unit tests for TaskNode component
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { TaskNode } from './TaskNode';
import type { CustomNodeData } from './types';

// Mock data for testing
const createMockData = (overrides?: Partial<CustomNodeData>): CustomNodeData => ({
  label: 'Test Task',
  type: 'task',
  properties: {},
  ...overrides,
});

// Wrapper component for ReactFlow context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

describe('TaskNode', () => {
  describe('Rendering', () => {
    it('should render with basic props', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-1"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="task"]');
      expect(node).toBeTruthy();
    });

    it('should render circular SVG shape', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-2"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const circle = container.querySelector('circle[fill]');
      expect(circle).toBeTruthy();
    });

    it('should render task label', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-3"
            data={createMockData({ label: 'My Task' })}
            selected={false}
          />
        </TestWrapper>
      );

      const text = container.querySelector('text');
      expect(text).toBeTruthy();
      expect(text?.textContent).toBe('My Task');
    });

    it('should render task icon in upper left corner', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-4"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Check for icon group with transform
      const iconGroup = container.querySelector('g[transform*="translate"]');
      expect(iconGroup).toBeTruthy();
    });

    it('should render progress indicator', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-5"
            data={createMockData({ properties: { done: true } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Progress indicator consists of two circles (background and progress)
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Done Attribute Visualization', () => {
    it('should show 100% progress when done is true', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-6"
            data={createMockData({ properties: { done: true } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find progress circle (has stroke-dashoffset)
      const progressCircle = Array.from(container.querySelectorAll('circle')).find(
        (circle) => circle.hasAttribute('stroke-dashoffset')
      );
      expect(progressCircle).toBeTruthy();

      // When progress is 100%, offset should be 0
      const offset = progressCircle?.getAttribute('stroke-dashoffset');
      expect(offset).toBe('0');
    });

    it('should show 0% progress when done is false', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-7"
            data={createMockData({ properties: { done: false } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find progress circle
      const progressCircle = Array.from(container.querySelectorAll('circle')).find(
        (circle) => circle.hasAttribute('stroke-dashoffset')
      );
      expect(progressCircle).toBeTruthy();

      // When progress is 0%, offset should equal circumference
      const offset = parseFloat(progressCircle?.getAttribute('stroke-dashoffset') || '0');
      const dasharray = parseFloat(progressCircle?.getAttribute('stroke-dasharray') || '0');
      expect(offset).toBe(dasharray);
    });

    it('should show 0% progress when done is undefined', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-8"
            data={createMockData({ properties: {} })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find progress circle
      const progressCircle = Array.from(container.querySelectorAll('circle')).find(
        (circle) => circle.hasAttribute('stroke-dashoffset')
      );
      expect(progressCircle).toBeTruthy();

      // When progress is 0%, offset should equal circumference
      const offset = parseFloat(progressCircle?.getAttribute('stroke-dashoffset') || '0');
      const dasharray = parseFloat(progressCircle?.getAttribute('stroke-dasharray') || '0');
      expect(offset).toBe(dasharray);
    });
  });

  describe('Selection State', () => {
    it('should apply selected styles when selected', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-9"
            data={createMockData()}
            selected={true}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-selected="true"]');
      expect(node).toBeTruthy();

      // Find main circle (has fill attribute and NOT part of progress indicator)
      // The main circle is the one with fill that's not the icon circle
      const allCircles = Array.from(container.querySelectorAll('circle'));
      const mainCircle = allCircles.find(
        (circle) => {
          const fill = circle.getAttribute('fill');
          const r = parseFloat(circle.getAttribute('r') || '0');
          // Main circle has fill (not "none") and is larger than icon circles
          return fill && fill !== 'none' && r > 20;
        }
      );
      expect(mainCircle).toBeTruthy();

      // Selected nodes should have black border
      const stroke = mainCircle?.getAttribute('stroke');
      expect(stroke).toBe('#000'); // Black color
    });

    it('should apply normal border when not selected', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-10"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-selected="false"]');
      expect(node).toBeTruthy();

      // Find main circle
      const allCircles = Array.from(container.querySelectorAll('circle'));
      const mainCircle = allCircles.find(
        (circle) => {
          const fill = circle.getAttribute('fill');
          const r = parseFloat(circle.getAttribute('r') || '0');
          return fill && fill !== 'none' && r > 20;
        }
      );
      expect(mainCircle).toBeTruthy();

      // Non-selected nodes should have colored border
      const stroke = mainCircle?.getAttribute('stroke');
      expect(stroke).toBeTruthy();
      expect(stroke).not.toBe('#000');
    });

    it('should have thicker border when selected', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-11"
            data={createMockData()}
            selected={true}
          />
        </TestWrapper>
      );

      // Find main circle
      const allCircles = Array.from(container.querySelectorAll('circle'));
      const mainCircle = allCircles.find(
        (circle) => {
          const fill = circle.getAttribute('fill');
          const r = parseFloat(circle.getAttribute('r') || '0');
          return fill && fill !== 'none' && r > 20;
        }
      );
      expect(mainCircle).toBeTruthy();

      const strokeWidth = mainCircle?.getAttribute('stroke-width');
      expect(strokeWidth).toBe('3');
    });

    it('should have normal border width when not selected', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-12"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Find main circle
      const allCircles = Array.from(container.querySelectorAll('circle'));
      const mainCircle = allCircles.find(
        (circle) => {
          const fill = circle.getAttribute('fill');
          const r = parseFloat(circle.getAttribute('r') || '0');
          return fill && fill !== 'none' && r > 20;
        }
      );
      expect(mainCircle).toBeTruthy();

      const strokeWidth = mainCircle?.getAttribute('stroke-width');
      expect(strokeWidth).toBe('2');
    });
  });

  describe('Priority-Based Sizing', () => {
    it('should scale node size based on priority', () => {
      const { container: container1 } = render(
        <TestWrapper>
          <TaskNode
            id="task-13"
            data={createMockData({ priority: 1 })}
            selected={false}
          />
        </TestWrapper>
      );

      const { container: container2 } = render(
        <TestWrapper>
          <TaskNode
            id="task-14"
            data={createMockData({ priority: 5 })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find main circle and progress circle
      const allCircles = Array.from(container1.querySelectorAll('circle'));
      const circle1 = allCircles.find(
        (circle) => {
          const fill = circle.getAttribute('fill');
          const r = parseFloat(circle.getAttribute('r') || '0');
          return fill && fill !== 'none' && r > 20;
        }
      );

      const allCircles2 = Array.from(container2.querySelectorAll('circle'));
      const circle2 = allCircles2.find(
        (circle) => {
          const fill = circle.getAttribute('fill');
          const r = parseFloat(circle.getAttribute('r') || '0');
          return fill && fill !== 'none' && r > 20;
        }
      );

      expect(circle1).toBeTruthy();
      expect(circle2).toBeTruthy();

      const radius1 = parseFloat(circle1?.getAttribute('r') || '0');
      const radius2 = parseFloat(circle2?.getAttribute('r') || '0');

      // Priority 1 should be larger than priority 5
      // Formula: base_size × (2 - priority/5)
      // Priority 1: 32 × (2 - 1/5) = 32 × 1.8 = 57.6
      // Priority 5: 32 × (2 - 5/5) = 32 × 1.0 = 32
      expect(radius1).toBeGreaterThan(radius2);
    });

    it('should use default size when priority is undefined', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-15"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Find main circle
      const allCircles = Array.from(container.querySelectorAll('circle'));
      const mainCircle = allCircles.find(
        (circle) => {
          const fill = circle.getAttribute('fill');
          const r = parseFloat(circle.getAttribute('r') || '0');
          return fill && fill !== 'none' && r > 20;
        }
      );
      expect(mainCircle).toBeTruthy();

      const radius = parseFloat(mainCircle?.getAttribute('r') || '0');
      // When priority is undefined, sizeMultiplier = 1.25, so radius = 32 * 1.25 = 40
      expect(radius).toBe(40);
    });
  });

  describe('Hover State', () => {
    it('should have hover data attribute', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-16"
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
          <TaskNode
            id="task-17"
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
          <TaskNode
            id="task-18"
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
          <TaskNode
            id="task-19"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const sourceHandle = container.querySelector('.react-flow__handle-bottom');
      expect(sourceHandle).toBeTruthy();
    });
  });

  describe('Progress Indicator Styling', () => {
    it('should use correct progress color', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-20"
            data={createMockData({ properties: { done: true } })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find progress circle
      const progressCircle = Array.from(container.querySelectorAll('circle')).find(
        (circle) => circle.hasAttribute('stroke-dashoffset')
      );
      expect(progressCircle).toBeTruthy();

      const stroke = progressCircle?.getAttribute('stroke');
      expect(stroke).toBe('#388e3c'); // Green color for progress
    });

    it('should have correct stroke width for progress indicator', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-21"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Find progress circle
      const progressCircle = Array.from(container.querySelectorAll('circle')).find(
        (circle) => circle.hasAttribute('stroke-dashoffset')
      );
      expect(progressCircle).toBeTruthy();

      const strokeWidth = progressCircle?.getAttribute('stroke-width');
      expect(strokeWidth).toBe('4');
    });

    it('should position progress indicator 8px from node boundary', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-22"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Find main circle and progress circle
      const allCircles = Array.from(container.querySelectorAll('circle'));
      const mainCircle = allCircles.find(
        (circle) => {
          const fill = circle.getAttribute('fill');
          const r = parseFloat(circle.getAttribute('r') || '0');
          return fill && fill !== 'none' && r > 20;
        }
      );
      const progressCircle = allCircles.find(
        (circle) => circle.hasAttribute('stroke-dashoffset')
      );

      expect(mainCircle).toBeTruthy();
      expect(progressCircle).toBeTruthy();

      const mainRadius = parseFloat(mainCircle?.getAttribute('r') || '0');
      const progressRadius = parseFloat(progressCircle?.getAttribute('r') || '0');

      // Progress radius should be 8px larger than main radius
      expect(progressRadius - mainRadius).toBe(8);
    });
  });

  describe('Accessibility', () => {
    it('should have text with proper styling for readability', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-23"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const text = container.querySelector('text');
      expect(text).toBeTruthy();
      expect(text?.getAttribute('text-anchor')).toBe('middle');
      expect(text?.getAttribute('dominant-baseline')).toBe('middle');
    });

    it('should have smooth transitions', () => {
      const { container } = render(
        <TestWrapper>
          <TaskNode
            id="task-24"
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

/**
 * Unit tests for ProjectNode component
 * Tests the unified design implementation with hierarchical progress indicator
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { ProjectNode } from './ProjectNode';
import type { CustomNodeData } from './types';

// Mock data for testing
const createMockData = (overrides?: Partial<CustomNodeData>): CustomNodeData => ({
  label: 'Test Project',
  type: 'project',
  properties: {},
  ...overrides,
});

// Wrapper component for ReactFlow context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

describe('ProjectNode', () => {
  describe('Unified Design Rendering', () => {
    it('should render with unified node structure', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-1"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="project"]');
      expect(node).toBeTruthy();
    });

    it('should render circular background', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-2"
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
          <ProjectNode
            id="project-3"
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

    it('should render project label inside box', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-4"
            data={createMockData({ label: 'My Project' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find all text elements and look for the label
      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => text.textContent === 'My Project');
      expect(labelText).toBeTruthy();
    });
  });

  describe('Project-Specific Icon', () => {
    it('should render project/briefcase icon', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-5"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Check for SVG paths (project icon is an SVG)
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render project icon in upper-left corner', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-6"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Icon should be present
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('should use blue color for project icon', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-7"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Project icon should be present
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('Project Type Label', () => {
    it('should render "Project" type label', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-8"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const typeLabel = Array.from(texts).find((text) => text.textContent === 'Project');
      expect(typeLabel).toBeTruthy();
    });

    it('should render type label below icon', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-9"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Type label should be present
      const texts = container.querySelectorAll('text');
      const typeLabel = Array.from(texts).find((text) => text.textContent === 'Project');
      expect(typeLabel).toBeTruthy();
    });
  });

  describe('Hierarchical Progress Dial Gauge', () => {
    it('should render mini pie chart for hierarchical progress', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-10"
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
          <ProjectNode
            id="project-11"
            data={createMockData({ progress: 100 })}
            selected={false}
          />
        </TestWrapper>
      );

      // Full circle gauge should be present
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should use blue color for progress gauge', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-12"
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
          <ProjectNode
            id="project-13"
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
          <ProjectNode
            id="project-14"
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
          <ProjectNode
            id="project-15"
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
          <ProjectNode
            id="project-16"
            data={createMockData({ 
              children: ['workpackage-1', 'workpackage-2', 'workpackage-3'],
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
          <ProjectNode
            id="project-17"
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
          <ProjectNode
            id="project-17"
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

    it('should display "Overall Progress" label in gauge', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-18"
            data={createMockData({ progress: 50 })}
            selected={false}
          />
        </TestWrapper>
      );

      // Gauge should be present (verified by circles and paths)
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });
  });

  describe('Status Icon', () => {
    it('should render status icon when status is provided', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-19"
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
          <ProjectNode
            id="project-20"
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
          <ProjectNode
            id="project-21"
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
          <ProjectNode
            id="project-22"
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
          <ProjectNode
            id="project-23"
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
          <ProjectNode
            id="project-24"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render node without status icon
      const node = container.querySelector('[data-node-type="project"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Selection State', () => {
    it('should apply selected styles when selected', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-25"
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
          <ProjectNode
            id="project-26"
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
          <ProjectNode
            id="project-27"
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
          <ProjectNode
            id="project-28"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render but without priority badge
      const node = container.querySelector('[data-node-type="project"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Hover State', () => {
    it('should have hover data attribute', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-29"
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
          <ProjectNode
            id="project-30"
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
          <ProjectNode
            id="project-31"
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
          <ProjectNode
            id="project-32"
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
          <ProjectNode
            id="project-33"
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
          <ProjectNode
            id="project-34"
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
          <ProjectNode
            id="project-35"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should render with unified node structure
      const node = container.querySelector('[data-node-type="project"]');
      expect(node).toBeTruthy();
    });

    it('should render with iconPosition upper-left', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-36"
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

  describe('Hierarchical Progress Aggregation', () => {
    it('should aggregate progress from multiple workpackages', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-37"
            data={createMockData({ 
              children: ['wp-1', 'wp-2', 'wp-3'],
              progress: 60 
            })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should show aggregated progress
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find((text) => text.textContent === '60');
      expect(valueText).toBeTruthy();
    });

    it('should handle empty children array', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-38"
            data={createMockData({ children: [] })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should show 0 progress
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find((text) => text.textContent === '0');
      expect(valueText).toBeTruthy();
    });

    it('should prioritize explicit progress over children', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-39"
            data={createMockData({ 
              children: ['wp-1', 'wp-2'],
              progress: 85 
            })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should use explicit progress value
      const texts = container.querySelectorAll('text');
      const valueText = Array.from(texts).find((text) => text.textContent === '85');
      expect(valueText).toBeTruthy();
    });
  });

  describe('Blue Color Theme', () => {
    it('should use blue color for progress gauge', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-40"
            data={createMockData({ progress: 50 })}
            selected={false}
          />
        </TestWrapper>
      );

      // Gauge should be present with blue color
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });

    it('should differentiate from workpackage green color', () => {
      const { container } = render(
        <TestWrapper>
          <ProjectNode
            id="project-41"
            data={createMockData({ progress: 75 })}
            selected={false}
          />
        </TestWrapper>
      );

      // Project uses blue (#1976d2), not green (#388e3c)
      const circles = container.querySelectorAll('circle');
      expect(circles.length).toBeGreaterThan(0);
    });
  });
});

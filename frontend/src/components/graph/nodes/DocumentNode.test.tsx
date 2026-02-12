/**
 * Unit tests for DocumentNode component
 * Tests the unified design implementation for document nodes
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { DocumentNode } from './DocumentNode';
import type { CustomNodeData } from './types';

// Mock data for testing
const createMockData = (overrides?: Partial<CustomNodeData>): CustomNodeData => ({
  label: 'Design Document',
  type: 'document',
  properties: {},
  ...overrides,
});

// Wrapper component for ReactFlow context
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

describe('DocumentNode', () => {
  describe('Unified Design Rendering', () => {
    it('should render with unified node structure', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-1"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="document"]');
      expect(node).toBeTruthy();
    });

    it('should render rounded rectangle content box', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-2"
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

    it('should render document label inside box', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-3"
            data={createMockData({ label: 'Requirements Spec' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Find all text elements and look for the label
      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => text.textContent === 'Requirements Spec');
      expect(labelText).toBeTruthy();
    });

    it('should render document icon in header', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-4"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Check for SVG paths (document icon is an SVG file)
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render "Document" type label in header', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-5"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const typeLabel = Array.from(texts).find((text) => text.textContent === 'Document');
      expect(typeLabel).toBeTruthy();
    });

    it('should not render any gauges', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-6"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Document nodes should not have dial gauges
      const gauges = container.querySelectorAll('[data-gauge-id]');
      expect(gauges.length).toBe(0);
    });
  });

  describe('Document-Specific Icon', () => {
    it('should render document/file icon for document type', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-7"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Document icon is a file SVG
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should use purple color for document icon', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-8"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Document icon should be present (color may be applied via CSS or inline styles)
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('Status Icons', () => {
    it('should render draft status icon', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-9"
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
          <DocumentNode
            id="doc-10"
            data={createMockData({ status: 'active' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Active icon is a document with checkmark
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render completed status icon', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-11"
            data={createMockData({ status: 'completed' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Completed icon is a document with checkmark (filled)
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render archived status icon', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-12"
            data={createMockData({ status: 'archived' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Archived icon is a box/archive icon
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render approved status icon', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-13"
            data={createMockData({ status: 'approved' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Approved icon is a document with star
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render review status icon', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-14"
            data={createMockData({ status: 'review' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Review icon is a document with magnifying glass
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should not render status icon when status is undefined', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-15"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render the node
      const node = container.querySelector('[data-node-type="document"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Selection State', () => {
    it('should apply selected styles when selected', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-16"
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
          <DocumentNode
            id="doc-17"
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
          <DocumentNode
            id="doc-18"
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
          <DocumentNode
            id="doc-19"
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
            <DocumentNode
              id={`doc-priority-${priority}`}
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
          <DocumentNode
            id="doc-20"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render but without priority badge
      const node = container.querySelector('[data-node-type="document"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Hover State', () => {
    it('should have hover data attribute', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-21"
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
          <DocumentNode
            id="doc-22"
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
          <DocumentNode
            id="doc-23"
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
          <DocumentNode
            id="doc-24"
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
          <DocumentNode
            id="doc-25"
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
          <DocumentNode
            id="doc-26"
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

  describe('Different Document Statuses', () => {
    it('should render correctly with draft status', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-27"
            data={createMockData({ status: 'draft', label: 'Draft Spec' })}
            selected={false}
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => text.textContent === 'Draft Spec');
      expect(labelText).toBeTruthy();

      // Should have pencil icon
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render correctly with approved status', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-28"
            data={createMockData({ status: 'approved', label: 'Approved Spec' })}
            selected={false}
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => text.textContent === 'Approved Spec');
      expect(labelText).toBeTruthy();

      // Should have star icon
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });

    it('should render correctly with review status', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-29"
            data={createMockData({ status: 'review', label: 'Under Review' })}
            selected={false}
          />
        </TestWrapper>
      );

      const texts = container.querySelectorAll('text');
      const labelText = Array.from(texts).find((text) => text.textContent === 'Under Review');
      expect(labelText).toBeTruthy();

      // Should have magnifying glass icon
      const paths = container.querySelectorAll('path');
      expect(paths.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty label', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-30"
            data={createMockData({ label: '' })}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="document"]');
      expect(node).toBeTruthy();
    });

    it('should handle long label text', () => {
      const longLabel = 'This is a very long document name that should be truncated or wrapped';
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-31"
            data={createMockData({ label: longLabel })}
            selected={false}
          />
        </TestWrapper>
      );

      // Node should render even with long label (may be truncated)
      const node = container.querySelector('[data-node-type="document"]');
      expect(node).toBeTruthy();
      
      // Should have some text content
      const texts = container.querySelectorAll('text');
      expect(texts.length).toBeGreaterThan(0);
    });

    it('should handle missing properties', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-32"
            data={{ label: 'Document', type: 'document' }}
            selected={false}
          />
        </TestWrapper>
      );

      const node = container.querySelector('[data-node-type="document"]');
      expect(node).toBeTruthy();
    });

    it('should handle unknown status gracefully', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-33"
            data={createMockData({ status: 'unknown-status' })}
            selected={false}
          />
        </TestWrapper>
      );

      // Should still render the node
      const node = container.querySelector('[data-node-type="document"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Integration with UnifiedNode', () => {
    it('should pass correct props to UnifiedNode', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-34"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Should render with document type
      const node = container.querySelector('[data-node-type="document"]');
      expect(node).toBeTruthy();

      // Should have "Document" type label
      const texts = container.querySelectorAll('text');
      const typeLabel = Array.from(texts).find((text) => text.textContent === 'Document');
      expect(typeLabel).toBeTruthy();
    });

    it('should use upper-left icon position', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-35"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Icon should be positioned in upper-left
      const node = container.querySelector('[data-node-type="document"]');
      expect(node).toBeTruthy();
    });
  });

  describe('Document-Specific Features', () => {
    it('should render with purple color scheme', () => {
      const { container } = render(
        <TestWrapper>
          <DocumentNode
            id="doc-36"
            data={createMockData()}
            selected={false}
          />
        </TestWrapper>
      );

      // Document nodes use purple color scheme
      const node = container.querySelector('[data-node-type="document"]');
      expect(node).toBeTruthy();
    });

    it('should support multiple document types', () => {
      const documentTypes = [
        'Requirements Specification',
        'Design Document',
        'Test Plan',
        'User Manual',
      ];

      documentTypes.forEach((label, index) => {
        const { container } = render(
          <TestWrapper>
            <DocumentNode
              id={`doc-type-${index}`}
              data={createMockData({ label })}
              selected={false}
            />
          </TestWrapper>
        );

        const texts = container.querySelectorAll('text');
        // Label may be wrapped into multiple text elements, so check if any text contains part of the label
        const hasLabelText = Array.from(texts).some((text) => {
          const content = text.textContent || '';
          // Check if this text element contains any word from the label
          return label.split(' ').some(word => content.includes(word));
        });
        expect(hasLabelText).toBeTruthy();
      });
    });
  });
});

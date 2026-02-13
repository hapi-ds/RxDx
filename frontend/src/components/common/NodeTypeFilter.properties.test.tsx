/**
 * Property-based tests for NodeTypeFilter component
 * Feature: graph-ui-enhancements
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import * as fc from 'fast-check';
import { NodeTypeFilter } from './NodeTypeFilter';
import type { NodeTypeOption } from '../../types/filters';

describe('NodeTypeFilter Property Tests', () => {
  beforeEach(() => {
    // Clean up before each test
    cleanup();
  });

  afterEach(() => {
    // Clean up after each test
    cleanup();
  });

  describe('Property 15: Type label format', () => {
    // Feature: graph-ui-enhancements, Property 15: Type label format
    // **Validates: Requirements 4.1**
    // For any node type displayed in the filter, the label text should not contain
    // the pattern "(color: ...)".

    it('should not include color text in type labels', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              value: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
              label: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length > 0),
              color: fc.constantFrom('#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#14b8a6', '#f59e0b'),
              category: fc.constantFrom('workitems', 'structure', 'other'),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (types: NodeTypeOption[]) => {
            // Ensure unique values
            const uniqueTypes = Array.from(
              new Map(types.map(t => [t.value, t])).values()
            );

            if (uniqueTypes.length === 0) return;

            const mockOnChange = () => {};
            const { container, unmount } = render(
              <NodeTypeFilter
                selectedTypes={new Set()}
                onChange={mockOnChange}
                availableTypes={uniqueTypes}
              />
            );

            try {
              // Check that no label contains "(color: ...)"
              const labels = container.querySelectorAll('.filter-type-label');
              
              labels.forEach(label => {
                const text = label.textContent || '';
                
                // Should not contain the pattern "(color: ...)"
                expect(text).not.toMatch(/\(color:\s*[^)]+\)/i);
                
                // Should not contain "color:" at all in visible text
                expect(text).not.toMatch(/color:/i);
              });

              // Verify that labels still contain the type names
              uniqueTypes.forEach(type => {
                const labelElements = Array.from(labels);
                const hasLabel = labelElements.some(
                  label => {
                    const labelText = label.textContent?.trim() || '';
                    const typeLabel = type.label.trim();
                    return labelText === typeLabel;
                  }
                );
                expect(hasLabel).toBe(true);
              });
            } finally {
              unmount();
              cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not have screen reader text with color information', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              value: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
              label: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length > 0),
              color: fc.constantFrom('#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#14b8a6', '#f59e0b'),
              category: fc.constantFrom('workitems', 'structure', 'other'),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (types: NodeTypeOption[]) => {
            // Ensure unique values
            const uniqueTypes = Array.from(
              new Map(types.map(t => [t.value, t])).values()
            );

            if (uniqueTypes.length === 0) return;

            const mockOnChange = () => {};
            const { container, unmount } = render(
              <NodeTypeFilter
                selectedTypes={new Set()}
                onChange={mockOnChange}
                availableTypes={uniqueTypes}
              />
            );

            try {
              // Check for screen reader only elements with color text
              const srOnlyElements = container.querySelectorAll('.sr-only');
              
              srOnlyElements.forEach(element => {
                const text = element.textContent || '';
                
                // Screen reader elements should not contain color codes
                // (except for the status announcements which are different)
                if (text.includes('color:')) {
                  // This should not happen - fail the test
                  expect(text).not.toMatch(/\(color:\s*[^)]+\)/);
                }
              });
            } finally {
              unmount();
              cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain visual color indicators without text', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              value: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
              label: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length > 0),
              color: fc.constantFrom('#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#14b8a6', '#f59e0b'),
              category: fc.constantFrom('workitems', 'structure', 'other'),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (types: NodeTypeOption[]) => {
            // Ensure unique values
            const uniqueTypes = Array.from(
              new Map(types.map(t => [t.value, t])).values()
            );

            if (uniqueTypes.length === 0) return;

            const mockOnChange = () => {};
            const { container, unmount } = render(
              <NodeTypeFilter
                selectedTypes={new Set()}
                onChange={mockOnChange}
                availableTypes={uniqueTypes}
              />
            );

            try {
              // Verify color indicators exist
              const colorIndicators = container.querySelectorAll('.filter-type-color');
              expect(colorIndicators.length).toBe(uniqueTypes.length);

              // Verify each color indicator has the correct background color
              colorIndicators.forEach((indicator, index) => {
                const type = uniqueTypes[index];
                const style = (indicator as HTMLElement).style;
                
                if (type.color) {
                  expect(style.backgroundColor).toBeTruthy();
                }
                
                // Color indicator should be aria-hidden
                expect(indicator.getAttribute('aria-hidden')).toBe('true');
              });
            } finally {
              unmount();
              cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: Hover text format', () => {
    // Feature: graph-ui-enhancements, Property 16: Hover text format
    // **Validates: Requirements 4.4**
    // For any type filter option, the hover/title text should not contain
    // technical color codes or the pattern "(color: ...)".

    it('should not contain color codes in title attributes', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              value: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
              label: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length > 0),
              color: fc.constantFrom('#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#14b8a6', '#f59e0b'),
              category: fc.constantFrom('workitems', 'structure', 'other'),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (types: NodeTypeOption[]) => {
            // Ensure unique values
            const uniqueTypes = Array.from(
              new Map(types.map(t => [t.value, t])).values()
            );

            if (uniqueTypes.length === 0) return;

            const mockOnChange = () => {};
            const { container, unmount } = render(
              <NodeTypeFilter
                selectedTypes={new Set()}
                onChange={mockOnChange}
                availableTypes={uniqueTypes}
              />
            );

            try {
              // Check all elements with title attributes
              const elementsWithTitle = container.querySelectorAll('[title]');
              
              elementsWithTitle.forEach(element => {
                const titleText = element.getAttribute('title') || '';
                
                // Should not contain the pattern "(color: ...)"
                expect(titleText).not.toMatch(/\(color:\s*[^)]+\)/i);
                
                // Should not contain hex color codes like #3b82f6
                expect(titleText).not.toMatch(/#[0-9a-fA-F]{6}/);
                
                // Should not contain "color:" followed by a value
                expect(titleText).not.toMatch(/color:\s*[#\w]/i);
              });
            } finally {
              unmount();
              cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have descriptive title text for color indicators', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              value: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
              label: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length > 0),
              color: fc.constantFrom('#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#14b8a6', '#f59e0b'),
              category: fc.constantFrom('workitems', 'structure', 'other'),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (types: NodeTypeOption[]) => {
            // Ensure unique values
            const uniqueTypes = Array.from(
              new Map(types.map(t => [t.value, t])).values()
            );

            if (uniqueTypes.length === 0) return;

            const mockOnChange = () => {};
            const { container, unmount } = render(
              <NodeTypeFilter
                selectedTypes={new Set()}
                onChange={mockOnChange}
                availableTypes={uniqueTypes}
              />
            );

            try {
              // Check color indicator title attributes
              const colorIndicators = container.querySelectorAll('.filter-type-color');
              
              colorIndicators.forEach((indicator) => {
                const titleText = indicator.getAttribute('title') || '';
                
                // Should contain descriptive text
                expect(titleText).toContain('Color indicator');
                
                // Should not contain technical color codes
                expect(titleText).not.toMatch(/#[0-9a-fA-F]{6}/);
              });
            } finally {
              unmount();
              cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have clean title text for type labels', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              value: fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
              label: fc.string({ minLength: 3, maxLength: 30 }).filter(s => s.trim().length > 0),
              color: fc.constantFrom('#3b82f6', '#10b981', '#8b5cf6', '#06b6d4', '#14b8a6', '#f59e0b'),
              category: fc.constantFrom('workitems', 'structure', 'other'),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (types: NodeTypeOption[]) => {
            // Ensure unique values
            const uniqueTypes = Array.from(
              new Map(types.map(t => [t.value, t])).values()
            );

            if (uniqueTypes.length === 0) return;

            const mockOnChange = () => {};
            const { container, unmount } = render(
              <NodeTypeFilter
                selectedTypes={new Set()}
                onChange={mockOnChange}
                availableTypes={uniqueTypes}
              />
            );

            try {
              // Check label title attributes
              const labels = container.querySelectorAll('.filter-type-item');
              
              labels.forEach((label) => {
                const titleText = label.getAttribute('title') || '';
                
                // If there's a title, it should not contain color information
                if (titleText) {
                  expect(titleText).not.toMatch(/\(color:/i);
                  expect(titleText).not.toMatch(/#[0-9a-fA-F]{6}/);
                }
              });
            } finally {
              unmount();
              cleanup();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

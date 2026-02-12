/**
 * Property-based tests for PriorityBadge component
 * Tests universal properties that should hold across all inputs
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PriorityBadge } from './PriorityBadge';
import { fc } from '@fast-check/vitest';

describe('PriorityBadge Properties', () => {
  describe('Property: Priority badge display', () => {
    /**
     * **Validates: Requirements 5.2, 5.3**
     * 
     * Property: For any priority value P in range [1, 5],
     * the badge should:
     * 1. Display the priority number
     * 2. Display an appropriate directional icon (⬆ for high, ➡ for medium, ⬇ for low)
     * 3. Use a color that corresponds to the priority level
     * 4. Render a circular background with radius 12px
     * 5. Include a tooltip with priority information
     */
    it('should display correct priority number for all valid priorities', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (priority) => {
            const { container } = render(
              <svg>
                <PriorityBadge priority={priority} />
              </svg>
            );

            // Should render the badge
            const badge = container.querySelector('.priority-badge');
            expect(badge).toBeTruthy();

            // Should render priority number
            const texts = container.querySelectorAll('text');
            expect(texts.length).toBe(2); // Number + icon

            const numberText = texts[0];
            expect(numberText.textContent).toBe(priority.toString());

            return true;
          }
        ),
        {
          numRuns: 100,
          verbose: true,
        }
      );
    });

    it('should display correct icon for priority level', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (priority) => {
            const { container } = render(
              <svg>
                <PriorityBadge priority={priority} />
              </svg>
            );

            const texts = container.querySelectorAll('text');
            const iconText = texts[1];
            const icon = iconText.textContent;

            // Verify icon matches priority level
            if (priority <= 2) {
              // High priority: up arrow
              expect(icon).toBe('⬆');
            } else if (priority === 3) {
              // Medium priority: right arrow
              expect(icon).toBe('➡');
            } else {
              // Low priority: down arrow
              expect(icon).toBe('⬇');
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use correct color for priority level', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (priority) => {
            const { container } = render(
              <svg>
                <PriorityBadge priority={priority} />
              </svg>
            );

            const circle = container.querySelector('circle');
            expect(circle).toBeTruthy();

            const color = circle?.getAttribute('fill');
            expect(color).toBeTruthy();

            // Verify color matches priority level
            const expectedColors: Record<number, string> = {
              1: '#d32f2f', // Red
              2: '#f57c00', // Orange
              3: '#fbc02d', // Yellow
              4: '#388e3c', // Green
              5: '#1976d2', // Blue
            };

            expect(color).toBe(expectedColors[priority]);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should render circular background with correct radius', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (priority) => {
            const { container } = render(
              <svg>
                <PriorityBadge priority={priority} />
              </svg>
            );

            const circle = container.querySelector('circle');
            expect(circle).toBeTruthy();

            // Verify radius is 12px
            const radius = circle?.getAttribute('r');
            expect(radius).toBe('12');

            // Verify white stroke
            const stroke = circle?.getAttribute('stroke');
            expect(stroke).toBe('white');

            // Verify stroke width
            const strokeWidth = circle?.getAttribute('stroke-width');
            expect(strokeWidth).toBe('2');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include tooltip with priority information', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (priority) => {
            const { container } = render(
              <svg>
                <PriorityBadge priority={priority} />
              </svg>
            );

            const title = container.querySelector('title');
            expect(title).toBeTruthy();

            const tooltipText = title?.textContent || '';

            // Should contain priority number
            expect(tooltipText).toContain(`Priority: ${priority}`);

            // Should contain priority scale information
            expect(tooltipText).toContain('1=Highest');
            expect(tooltipText).toContain('5=Lowest');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Text positioning and styling', () => {
    /**
     * Property: For any priority value, text elements should be:
     * 1. Centered horizontally (text-anchor="middle")
     * 2. Priority number positioned above center (y=-2)
     * 3. Icon positioned below center (y=8)
     * 4. White color for visibility
     * 5. Non-interactive (pointer-events: none, user-select: none)
     */
    it('should position text elements correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (priority) => {
            const { container } = render(
              <svg>
                <PriorityBadge priority={priority} />
              </svg>
            );

            const texts = container.querySelectorAll('text');
            expect(texts.length).toBe(2);

            const numberText = texts[0];
            const iconText = texts[1];

            // Check horizontal centering
            expect(numberText.getAttribute('text-anchor')).toBe('middle');
            expect(iconText.getAttribute('text-anchor')).toBe('middle');

            // Check vertical positioning
            expect(numberText.getAttribute('y')).toBe('-2');
            expect(iconText.getAttribute('y')).toBe('8');

            // Check color
            expect(numberText.getAttribute('fill')).toBe('white');
            expect(iconText.getAttribute('fill')).toBe('white');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have correct font sizes', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (priority) => {
            const { container } = render(
              <svg>
                <PriorityBadge priority={priority} />
              </svg>
            );

            const texts = container.querySelectorAll('text');
            const numberText = texts[0];
            const iconText = texts[1];

            // Priority number should be 10px
            expect(numberText.getAttribute('font-size')).toBe('10');

            // Icon should be 8px
            expect(iconText.getAttribute('font-size')).toBe('8');

            // Number should be bold
            expect(numberText.getAttribute('font-weight')).toBe('bold');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have non-interactive text', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (priority) => {
            const { container } = render(
              <svg>
                <PriorityBadge priority={priority} />
              </svg>
            );

            const texts = container.querySelectorAll('text');

            texts.forEach((text) => {
              const style = text.getAttribute('style');
              expect(style).toBeTruthy();
              expect(style).toContain('pointer-events: none');
              expect(style).toContain('user-select: none');
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Color-priority mapping consistency', () => {
    /**
     * Property: The color-to-priority mapping should be consistent and deterministic.
     * For the same priority value, the color should always be the same.
     */
    it('should have deterministic color mapping', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (priority) => {
            // Render twice with same priority
            const { container: container1 } = render(
              <svg>
                <PriorityBadge priority={priority} />
              </svg>
            );

            const { container: container2 } = render(
              <svg>
                <PriorityBadge priority={priority} />
              </svg>
            );

            const circle1 = container1.querySelector('circle');
            const circle2 = container2.querySelector('circle');

            const color1 = circle1?.getAttribute('fill');
            const color2 = circle2?.getAttribute('fill');

            // Colors should be identical
            expect(color1).toBe(color2);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have unique colors for different priorities', () => {
      // Test that each priority level has a distinct color
      const priorities = [1, 2, 3, 4, 5];
      const colors = new Set<string>();

      priorities.forEach((priority) => {
        const { container } = render(
          <svg>
            <PriorityBadge priority={priority} />
          </svg>
        );

        const circle = container.querySelector('circle');
        const color = circle?.getAttribute('fill');
        expect(color).toBeTruthy();

        colors.add(color!);
      });

      // All 5 priorities should have unique colors
      expect(colors.size).toBe(5);
    });
  });

  describe('Property: Icon-priority mapping consistency', () => {
    /**
     * Property: The icon-to-priority mapping should follow the rule:
     * - Priority 1-2: ⬆ (high)
     * - Priority 3: ➡ (medium)
     * - Priority 4-5: ⬇ (low)
     */
    it('should have consistent icon mapping across priority ranges', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          (priority1, priority2) => {
            const { container: container1 } = render(
              <svg>
                <PriorityBadge priority={priority1} />
              </svg>
            );

            const { container: container2 } = render(
              <svg>
                <PriorityBadge priority={priority2} />
              </svg>
            );

            const icon1 = container1.querySelectorAll('text')[1].textContent;
            const icon2 = container2.querySelectorAll('text')[1].textContent;

            // If priorities are in the same range, icons should match
            const getRange = (p: number) => {
              if (p <= 2) return 'high';
              if (p === 3) return 'medium';
              return 'low';
            };

            if (getRange(priority1) === getRange(priority2)) {
              expect(icon1).toBe(icon2);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Badge structure completeness', () => {
    /**
     * Property: For any valid priority, the badge should always render
     * all required elements: circle, number text, icon text, and tooltip.
     */
    it('should render all required elements', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          (priority) => {
            const { container } = render(
              <svg>
                <PriorityBadge priority={priority} />
              </svg>
            );

            // Should have badge group
            const badge = container.querySelector('.priority-badge');
            expect(badge).toBeTruthy();

            // Should have circle
            const circle = container.querySelector('circle');
            expect(circle).toBeTruthy();

            // Should have 2 text elements
            const texts = container.querySelectorAll('text');
            expect(texts.length).toBe(2);

            // Should have tooltip
            const title = container.querySelector('title');
            expect(title).toBeTruthy();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

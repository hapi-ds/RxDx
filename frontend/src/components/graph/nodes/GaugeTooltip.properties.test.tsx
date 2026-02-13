/**
 * Property-based tests for GaugeTooltip component
 * Tests universal properties that should hold across all inputs
 * 
 * Property 16: Progress tooltip accuracy
 * For any progress indicator hover event, the tooltip should display
 * the exact percentage value with at most 1 decimal place.
 * **Validates: Requirements 4.12**
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { GaugeTooltip } from './GaugeTooltip';
import { fc } from '@fast-check/vitest';

describe('GaugeTooltip Properties', () => {
  describe('Property 16: Tooltip Accuracy', () => {
    it('should display value with at most 1 decimal place for any value', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          async (value, min, max) => {
            // Ensure min <= max
            const [actualMin, actualMax] = min <= max ? [min, max] : [max, min];
            
            const user = userEvent.setup();
            const { container } = render(
              <svg>
                <GaugeTooltip
                  id="test-gauge"
                  label="Test"
                  value={value}
                  min={actualMin}
                  max={actualMax}
                  radius={100}
                  strokeWidth={4}
                  startAngle={0}
                  endAngle={360}
                >
                  <circle r={100} />
                </GaugeTooltip>
              </svg>
            );

            const wrapper = container.querySelector('.gauge-tooltip-wrapper');
            await user.hover(wrapper!);

            // Find the value text in the tooltip
            const texts = Array.from(container.querySelectorAll('.gauge-tooltip text'));
            const valueText = texts.find((text) => {
              const content = text.textContent || '';
              // Value text is the one that's not the label and not the range
              return (
                content !== 'Test' &&
                !content.startsWith('(') &&
                !content.endsWith(')')
              );
            });

            expect(valueText).toBeTruthy();
            const displayedValue = valueText?.textContent || '';

            // Check that the displayed value has at most 1 decimal place
            const decimalMatch = displayedValue.match(/\.(\d+)/);
            if (decimalMatch) {
              const decimalPlaces = decimalMatch[1].length;
              expect(decimalPlaces).toBeLessThanOrEqual(1);
            }

            // Verify the displayed value is accurate
            const parsedValue = parseFloat(displayedValue);
            
            // For integers, should match exactly
            if (Number.isInteger(value)) {
              expect(parsedValue).toBe(value);
            }
            // For small values (< 10), should have 1 decimal place
            else if (Math.abs(value) < 10) {
              const expected = parseFloat(value.toFixed(1));
              expect(Math.abs(parsedValue - expected)).toBeLessThan(0.01);
            }
            // For large values (>= 10), should be rounded
            else {
              const expected = Math.round(value);
              expect(parsedValue).toBe(expected);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should display range values with consistent formatting', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          async (min, max) => {
            // Ensure min <= max
            const [actualMin, actualMax] = min <= max ? [min, max] : [max, min];
            
            const user = userEvent.setup();
            const { container } = render(
              <svg>
                <GaugeTooltip
                  id="test-gauge"
                  label="Test"
                  value={(actualMin + actualMax) / 2}
                  min={actualMin}
                  max={actualMax}
                  radius={100}
                  strokeWidth={4}
                  startAngle={0}
                  endAngle={360}
                >
                  <circle r={100} />
                </GaugeTooltip>
              </svg>
            );

            const wrapper = container.querySelector('.gauge-tooltip-wrapper');
            await user.hover(wrapper!);

            // Find the range text in the tooltip
            const texts = Array.from(container.querySelectorAll('.gauge-tooltip text'));
            const rangeText = texts.find((text) => {
              const content = text.textContent || '';
              return content.startsWith('(') && content.endsWith(')');
            });

            expect(rangeText).toBeTruthy();
            const rangeContent = rangeText?.textContent || '';

            // Extract min and max from range text
            const rangeMatch = rangeContent.match(/\(([-\d.]+)\s*-\s*([-\d.]+)\)/);
            expect(rangeMatch).toBeTruthy();

            if (rangeMatch) {
              const displayedMin = rangeMatch[1];
              const displayedMax = rangeMatch[2];

              // Check decimal places for min
              const minDecimalMatch = displayedMin.match(/\.(\d+)/);
              if (minDecimalMatch) {
                expect(minDecimalMatch[1].length).toBeLessThanOrEqual(1);
              }

              // Check decimal places for max
              const maxDecimalMatch = displayedMax.match(/\.(\d+)/);
              if (maxDecimalMatch) {
                expect(maxDecimalMatch[1].length).toBeLessThanOrEqual(1);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should always show tooltip on hover for any valid configuration', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.integer({ min: 50, max: 200 }),
          fc.integer({ min: 2, max: 10 }),
          fc.integer({ min: 0, max: 360 }),
          fc.integer({ min: 0, max: 360 }),
          async (label, value, min, max, radius, strokeWidth, startAngle, endAngle) => {
            // Ensure min <= max
            const [actualMin, actualMax] = min <= max ? [min, max] : [max, min];
            
            // Ensure startAngle <= endAngle
            const [actualStart, actualEnd] = startAngle <= endAngle 
              ? [startAngle, endAngle] 
              : [endAngle, startAngle];

            const user = userEvent.setup();
            const { container } = render(
              <svg>
                <GaugeTooltip
                  id="test-gauge"
                  label={label}
                  value={value}
                  min={actualMin}
                  max={actualMax}
                  radius={radius}
                  strokeWidth={strokeWidth}
                  startAngle={actualStart}
                  endAngle={actualEnd}
                >
                  <circle r={radius} />
                </GaugeTooltip>
              </svg>
            );

            // Tooltip should not be visible initially
            let tooltip = container.querySelector('.gauge-tooltip');
            expect(tooltip).toBeNull();

            // Hover to show tooltip
            const wrapper = container.querySelector('.gauge-tooltip-wrapper');
            await user.hover(wrapper!);

            // Tooltip should now be visible
            tooltip = container.querySelector('.gauge-tooltip');
            expect(tooltip).toBeTruthy();

            // Tooltip should contain the label
            const texts = Array.from(container.querySelectorAll('.gauge-tooltip text'));
            const labelText = texts.find((text) => text.textContent === label);
            expect(labelText).toBeTruthy();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should position tooltip outside gauge for any radius and stroke width', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 50, max: 200 }),
          fc.integer({ min: 2, max: 10 }),
          fc.integer({ min: 0, max: 360 }),
          fc.integer({ min: 0, max: 360 }),
          async (radius, strokeWidth, startAngle, endAngle) => {
            // Ensure startAngle <= endAngle
            const [actualStart, actualEnd] = startAngle <= endAngle 
              ? [startAngle, endAngle] 
              : [endAngle, startAngle];

            const user = userEvent.setup();
            const { container } = render(
              <svg>
                <GaugeTooltip
                  id="test-gauge"
                  label="Test"
                  value={50}
                  min={0}
                  max={100}
                  radius={radius}
                  strokeWidth={strokeWidth}
                  startAngle={actualStart}
                  endAngle={actualEnd}
                >
                  <circle r={radius} />
                </GaugeTooltip>
              </svg>
            );

            const wrapper = container.querySelector('.gauge-tooltip-wrapper');
            await user.hover(wrapper!);

            const tooltip = container.querySelector('.gauge-tooltip');
            expect(tooltip).toBeTruthy();

            const transform = tooltip?.getAttribute('transform');
            expect(transform).toBeTruthy();

            // Extract x and y from transform
            const match = transform?.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
            expect(match).toBeTruthy();

            if (match) {
              const x = parseFloat(match[1]);
              const y = parseFloat(match[2]);
              const distance = Math.sqrt(x * x + y * y);

              // Tooltip should be positioned at radius + strokeWidth + 15
              const expectedDistance = radius + strokeWidth + 15;
              
              // Allow small tolerance for floating point arithmetic
              expect(Math.abs(distance - expectedDistance)).toBeLessThan(1);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle edge case values correctly', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(0, -0, Number.MIN_VALUE, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER),
          async (value) => {
            const user = userEvent.setup();
            const { container } = render(
              <svg>
                <GaugeTooltip
                  id="test-gauge"
                  label="Test"
                  value={value}
                  min={-Number.MAX_SAFE_INTEGER}
                  max={Number.MAX_SAFE_INTEGER}
                  radius={100}
                  strokeWidth={4}
                  startAngle={0}
                  endAngle={360}
                >
                  <circle r={100} />
                </GaugeTooltip>
              </svg>
            );

            const wrapper = container.querySelector('.gauge-tooltip-wrapper');
            await user.hover(wrapper!);

            // Should render without errors
            const tooltip = container.querySelector('.gauge-tooltip');
            expect(tooltip).toBeTruthy();

            // Should display some value text
            const texts = Array.from(container.querySelectorAll('.gauge-tooltip text'));
            const valueText = texts.find((text) => {
              const content = text.textContent || '';
              return (
                content !== 'Test' &&
                !content.startsWith('(') &&
                !content.endsWith(')')
              );
            });
            expect(valueText).toBeTruthy();
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('Tooltip Visibility Invariants', () => {
    it('should never show tooltip without hover', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          (value, min, max) => {
            const [actualMin, actualMax] = min <= max ? [min, max] : [max, min];
            
            const { container } = render(
              <svg>
                <GaugeTooltip
                  id="test-gauge"
                  label="Test"
                  value={value}
                  min={actualMin}
                  max={actualMax}
                  radius={100}
                  strokeWidth={4}
                  startAngle={0}
                  endAngle={360}
                >
                  <circle r={100} />
                </GaugeTooltip>
              </svg>
            );

            // Tooltip should not be visible without hover
            const tooltip = container.querySelector('.gauge-tooltip');
            expect(tooltip).toBeNull();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should always hide tooltip after unhover', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          async (value, min, max) => {
            const [actualMin, actualMax] = min <= max ? [min, max] : [max, min];
            
            const user = userEvent.setup();
            const { container } = render(
              <svg>
                <GaugeTooltip
                  id="test-gauge"
                  label="Test"
                  value={value}
                  min={actualMin}
                  max={actualMax}
                  radius={100}
                  strokeWidth={4}
                  startAngle={0}
                  endAngle={360}
                >
                  <circle r={100} />
                </GaugeTooltip>
              </svg>
            );

            const wrapper = container.querySelector('.gauge-tooltip-wrapper');
            
            // Hover to show tooltip
            await user.hover(wrapper!);
            let tooltip = container.querySelector('.gauge-tooltip');
            expect(tooltip).toBeTruthy();

            // Unhover to hide tooltip
            await user.unhover(wrapper!);
            tooltip = container.querySelector('.gauge-tooltip');
            expect(tooltip).toBeNull();
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});

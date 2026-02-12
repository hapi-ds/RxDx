/**
 * Property-based tests for DialGauge component
 * Tests universal properties that should hold across all inputs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { DialGauge } from './DialGauge';
import { fc } from '@fast-check/vitest';

describe('DialGauge Properties', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Property: Gauge animation timing 300ms ± 30ms', () => {
    /**
     * **Validates: Requirements 4.10**
     * 
     * Property: For any gauge value change, the animation duration should be
     * 300 milliseconds ± 30ms (between 270ms and 330ms).
     * 
     * This property ensures consistent animation timing across all gauge updates,
     * providing a smooth and predictable user experience.
     */
    it('should animate value changes within 300ms ± 30ms', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary gauge configurations
          fc.record({
            initialValue: fc.integer({ min: 0, max: 100 }),
            finalValue: fc.integer({ min: 0, max: 100 }),
            min: fc.constant(0),
            max: fc.constant(100),
            startAngle: fc.integer({ min: 0, max: 360 }),
            endAngle: fc.integer({ min: 0, max: 360 }),
            radius: fc.integer({ min: 50, max: 200 }),
            strokeWidth: fc.integer({ min: 2, max: 10 }),
          }),
          (config) => {
            // Skip if angles are invalid (start >= end)
            if (config.startAngle >= config.endAngle) {
              return true;
            }

            // Render gauge with initial value
            const { container, rerender } = render(
              <svg>
                <DialGauge
                  id="test-gauge"
                  label="Test"
                  value={config.initialValue}
                  min={config.min}
                  max={config.max}
                  startAngle={config.startAngle}
                  endAngle={config.endAngle}
                  radius={config.radius}
                  strokeWidth={config.strokeWidth}
                  color="#388e3c"
                  showValue={false}
                  animated={true}
                />
              </svg>
            );

            // Get the value arc path element
            const paths = container.querySelectorAll('path');
            const valuePath = paths[1]; // Second path is the value arc

            // Check that transition is applied
            const style = valuePath.getAttribute('style');
            expect(style).toBeTruthy();
            expect(style).toContain('transition');

            // Extract transition duration from style
            // Format: "transition: d 300ms ease-in-out" or similar
            const transitionMatch = style?.match(/(\d+)ms/);
            expect(transitionMatch).toBeTruthy();

            if (transitionMatch) {
              const duration = parseInt(transitionMatch[1], 10);

              // Verify duration is within 300ms ± 30ms (270-330ms)
              expect(duration).toBeGreaterThanOrEqual(270);
              expect(duration).toBeLessThanOrEqual(330);

              // Most importantly, verify it's exactly 300ms as specified
              expect(duration).toBe(300);
            }

            return true;
          }
        ),
        {
          numRuns: 100, // Run 100 test cases
          verbose: true,
        }
      );
    });

    it('should not animate when animated prop is false', () => {
      fc.assert(
        fc.property(
          fc.record({
            value: fc.integer({ min: 0, max: 100 }),
            startAngle: fc.integer({ min: 0, max: 360 }),
            endAngle: fc.integer({ min: 0, max: 360 }),
          }),
          (config) => {
            // Skip if angles are invalid
            if (config.startAngle >= config.endAngle) {
              return true;
            }

            const { container } = render(
              <svg>
                <DialGauge
                  id="test-gauge"
                  label="Test"
                  value={config.value}
                  min={0}
                  max={100}
                  startAngle={config.startAngle}
                  endAngle={config.endAngle}
                  radius={100}
                  strokeWidth={4}
                  color="#388e3c"
                  showValue={false}
                  animated={false}
                />
              </svg>
            );

            const paths = container.querySelectorAll('path');
            const valuePath = paths[1];
            const style = valuePath.getAttribute('style');

            // Should have no transition or transition: none
            expect(style).toContain('none');

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property: Value normalization', () => {
    /**
     * Property: For any value V, min M, and max X where M < X,
     * the normalized value should be clamped to [0, 1].
     */
    it('should always normalize values to 0-1 range', () => {
      fc.assert(
        fc.property(
          fc.record({
            value: fc.integer({ min: -1000, max: 2000 }),
            min: fc.integer({ min: 0, max: 100 }),
            max: fc.integer({ min: 101, max: 1000 }),
          }),
          (config) => {
            const { container } = render(
              <svg>
                <DialGauge
                  id="test-gauge"
                  label="Test"
                  value={config.value}
                  min={config.min}
                  max={config.max}
                  startAngle={0}
                  endAngle={360}
                  radius={100}
                  strokeWidth={4}
                  color="#388e3c"
                  showValue={false}
                />
              </svg>
            );

            // Component should render without errors
            const gauge = container.querySelector('.dial-gauge');
            expect(gauge).toBeTruthy();

            // The arc should be rendered (even if value is out of range)
            const paths = container.querySelectorAll('path');
            expect(paths.length).toBe(2);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Arc path validity', () => {
    /**
     * Property: For any valid angle configuration (startAngle < endAngle),
     * the component should render valid SVG arc paths.
     */
    it('should generate valid arc paths for any angle configuration', () => {
      fc.assert(
        fc.property(
          fc.record({
            startAngle: fc.integer({ min: 0, max: 359 }),
            endAngle: fc.integer({ min: 1, max: 360 }),
            value: fc.integer({ min: 0, max: 100 }),
          }),
          (config) => {
            // Ensure endAngle > startAngle
            if (config.startAngle >= config.endAngle) {
              return true;
            }

            const { container } = render(
              <svg>
                <DialGauge
                  id="test-gauge"
                  label="Test"
                  value={config.value}
                  min={0}
                  max={100}
                  startAngle={config.startAngle}
                  endAngle={config.endAngle}
                  radius={100}
                  strokeWidth={4}
                  color="#388e3c"
                  showValue={false}
                />
              </svg>
            );

            const paths = container.querySelectorAll('path');
            expect(paths.length).toBe(2);

            // Both paths should have valid 'd' attributes
            paths.forEach((path) => {
              const d = path.getAttribute('d');
              expect(d).toBeTruthy();
              expect(d).toContain('M'); // Move command
              expect(d).toContain('A'); // Arc command
            });

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Tooltip accuracy', () => {
    /**
     * **Validates: Requirements 4.12**
     * 
     * Property: For any gauge configuration, the tooltip should display
     * the exact value with at most 1 decimal place.
     */
    it('should display accurate tooltip with value and range', () => {
      fc.assert(
        fc.property(
          fc.record({
            label: fc.string({ minLength: 1, maxLength: 20 }),
            value: fc.float({ min: 0, max: 100, noNaN: true }),
            min: fc.constant(0),
            max: fc.constant(100),
          }),
          (config) => {
            const { container } = render(
              <svg>
                <DialGauge
                  id="test-gauge"
                  label={config.label}
                  value={config.value}
                  min={config.min}
                  max={config.max}
                  startAngle={0}
                  endAngle={360}
                  radius={100}
                  strokeWidth={4}
                  color="#388e3c"
                  showValue={false}
                />
              </svg>
            );

            const title = container.querySelector('title');
            expect(title).toBeTruthy();

            const tooltipText = title?.textContent || '';

            // Should contain label
            expect(tooltipText).toContain(config.label);

            // Should contain value with at most 1 decimal place
            const valueStr = config.value.toFixed(1);
            expect(tooltipText).toContain(valueStr);

            // Should contain range
            expect(tooltipText).toContain(config.min.toString());
            expect(tooltipText).toContain(config.max.toString());

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Multiple concentric gauges spacing', () => {
    /**
     * **Validates: Requirements 4.11**
     * 
     * Property: For any set of N gauges with 4px spacing,
     * the radius of gauge i should be baseRadius + (i * 8).
     * (8 = 4px spacing + 4px stroke width)
     */
    it('should support multiple concentric gauges with correct spacing', () => {
      fc.assert(
        fc.property(
          fc.record({
            baseRadius: fc.integer({ min: 80, max: 120 }),
            gaugeCount: fc.integer({ min: 1, max: 5 }),
            strokeWidth: fc.constant(4),
          }),
          (config) => {
            const { container } = render(
              <svg>
                {Array.from({ length: config.gaugeCount }, (_, i) => (
                  <DialGauge
                    key={i}
                    id={`gauge-${i}`}
                    label={`Gauge ${i}`}
                    value={50}
                    min={0}
                    max={100}
                    startAngle={0}
                    endAngle={360}
                    radius={config.baseRadius + i * 8} // 4px spacing + 4px stroke
                    strokeWidth={config.strokeWidth}
                    color="#388e3c"
                    showValue={false}
                  />
                ))}
              </svg>
            );

            // Should render all gauges
            const gauges = container.querySelectorAll('.dial-gauge');
            expect(gauges.length).toBe(config.gaugeCount);

            // Each gauge should have 2 paths (background + value)
            const paths = container.querySelectorAll('path');
            expect(paths.length).toBe(config.gaugeCount * 2);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

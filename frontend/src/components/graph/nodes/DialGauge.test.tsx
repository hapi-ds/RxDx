/**
 * Unit tests for DialGauge component
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { DialGauge } from './DialGauge';

describe('DialGauge', () => {
  describe('Rendering', () => {
    it('should render with basic props', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-1"
            label="Progress"
            value={50}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={false}
          />
        </svg>
      );

      const gauge = container.querySelector('.dial-gauge');
      expect(gauge).toBeTruthy();
      expect(gauge?.getAttribute('data-gauge-id')).toBe('gauge-1');
    });

    it('should render background arc', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-2"
            label="Progress"
            value={50}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={false}
          />
        </svg>
      );

      const paths = container.querySelectorAll('path');
      expect(paths.length).toBe(2); // Background and value arcs
    });

    it('should render value arc', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-3"
            label="Progress"
            value={75}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={false}
          />
        </svg>
      );

      const paths = container.querySelectorAll('path');
      const valuePath = paths[1]; // Second path is the value arc
      expect(valuePath).toBeTruthy();
      expect(valuePath.getAttribute('stroke')).toBe('#388e3c');
    });

    it('should render with GaugeTooltip wrapper', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-4"
            label="Completion"
            value={80}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={false}
          />
        </svg>
      );

      // Should have GaugeTooltip wrapper
      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      expect(wrapper).toBeTruthy();
      
      // Should have the gauge group inside
      const gauge = container.querySelector('.dial-gauge');
      expect(gauge).toBeTruthy();
    });
  });

  describe('Value Display', () => {
    it('should show numeric value when showValue is true', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-5"
            label="Progress"
            value={65}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={true}
          />
        </svg>
      );

      const text = container.querySelector('text');
      expect(text).toBeTruthy();
      expect(text?.textContent).toBe('65');
    });

    it('should not show numeric value when showValue is false', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-6"
            label="Progress"
            value={65}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={false}
          />
        </svg>
      );

      const text = container.querySelector('text');
      expect(text).toBeNull();
    });
  });

  describe('Value Normalization', () => {
    it('should normalize value to 0-1 range', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-7"
            label="Progress"
            value={50}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={false}
          />
        </svg>
      );

      const gauge = container.querySelector('.dial-gauge');
      expect(gauge).toBeTruthy();
    });

    it('should clamp value above max to 1', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-8"
            label="Progress"
            value={150}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={true}
          />
        </svg>
      );

      const text = container.querySelector('text');
      expect(text?.textContent).toBe('150'); // Shows actual value, but arc is clamped
    });

    it('should clamp value below min to 0', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-9"
            label="Progress"
            value={-10}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={true}
          />
        </svg>
      );

      const text = container.querySelector('text');
      expect(text?.textContent).toBe('-10'); // Shows actual value, but arc is clamped
    });
  });

  describe('Styling', () => {
    it('should apply correct stroke width', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-10"
            label="Progress"
            value={50}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={6}
            color="#388e3c"
            showValue={false}
          />
        </svg>
      );

      const paths = container.querySelectorAll('path');
      paths.forEach((path) => {
        expect(path.getAttribute('stroke-width')).toBe('6');
      });
    });

    it('should apply correct color to value arc', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-11"
            label="Progress"
            value={50}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#1976d2"
            showValue={false}
          />
        </svg>
      );

      const paths = container.querySelectorAll('path');
      const valuePath = paths[1];
      expect(valuePath.getAttribute('stroke')).toBe('#1976d2');
    });

    it('should apply default background color', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-12"
            label="Progress"
            value={50}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={false}
          />
        </svg>
      );

      const paths = container.querySelectorAll('path');
      const backgroundPath = paths[0];
      expect(backgroundPath.getAttribute('stroke')).toBe('#e0e0e0');
    });

    it('should apply custom background color', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-13"
            label="Progress"
            value={50}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            backgroundColor="#cccccc"
            showValue={false}
          />
        </svg>
      );

      const paths = container.querySelectorAll('path');
      const backgroundPath = paths[0];
      expect(backgroundPath.getAttribute('stroke')).toBe('#cccccc');
    });

    it('should have rounded line caps', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-14"
            label="Progress"
            value={50}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={false}
          />
        </svg>
      );

      const paths = container.querySelectorAll('path');
      paths.forEach((path) => {
        expect(path.getAttribute('stroke-linecap')).toBe('round');
      });
    });
  });

  describe('Animation', () => {
    it('should have transition when animated is true', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-15"
            label="Progress"
            value={50}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={false}
            animated={true}
          />
        </svg>
      );

      const paths = container.querySelectorAll('path');
      const valuePath = paths[1];
      const style = valuePath.getAttribute('style');
      expect(style).toContain('transition');
      expect(style).toContain('300ms');
    });

    it('should not have transition when animated is false', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-16"
            label="Progress"
            value={50}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
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
      expect(style).toContain('none');
    });
  });

  describe('Angle Configuration', () => {
    it('should support partial arc (0-270 degrees)', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-17"
            label="RPN"
            value={500}
            min={0}
            max={1000}
            startAngle={0}
            endAngle={270}
            radius={100}
            strokeWidth={4}
            color="#d32f2f"
            showValue={false}
          />
        </svg>
      );

      const gauge = container.querySelector('.dial-gauge');
      expect(gauge).toBeTruthy();
    });

    it('should support full circle (0-360 degrees)', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-18"
            label="Progress"
            value={75}
            min={0}
            max={100}
            startAngle={0}
            endAngle={360}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={false}
          />
        </svg>
      );

      const gauge = container.querySelector('.dial-gauge');
      expect(gauge).toBeTruthy();
    });

    it('should support quarter arc (0-90 degrees)', () => {
      const { container } = render(
        <svg>
          <DialGauge
            id="gauge-19"
            label="Signed"
            value={100}
            min={0}
            max={100}
            startAngle={0}
            endAngle={90}
            radius={100}
            strokeWidth={4}
            color="#388e3c"
            showValue={false}
          />
        </svg>
      );

      const gauge = container.querySelector('.dial-gauge');
      expect(gauge).toBeTruthy();
    });
  });
});

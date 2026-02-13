/**
 * Unit tests for GaugeTooltip component
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { GaugeTooltip } from './GaugeTooltip';

describe('GaugeTooltip', () => {
  const defaultProps = {
    id: 'test-gauge',
    label: 'Progress',
    value: 75,
    min: 0,
    max: 100,
    radius: 100,
    strokeWidth: 4,
    startAngle: 0,
    endAngle: 360,
    children: <circle r={100} fill="blue" />,
  };

  describe('Rendering', () => {
    it('should render children elements', () => {
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} />
        </svg>
      );

      const circle = container.querySelector('circle[fill="blue"]');
      expect(circle).toBeTruthy();
    });

    it('should not show tooltip initially', () => {
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} />
        </svg>
      );

      const tooltip = container.querySelector('.gauge-tooltip');
      expect(tooltip).toBeNull();
    });

    it('should render hover target circle', () => {
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} />
        </svg>
      );

      const hoverTarget = container.querySelector('circle[stroke="transparent"]');
      expect(hoverTarget).toBeTruthy();
    });
  });

  describe('Hover Interaction', () => {
    it('should show tooltip on mouse enter', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      expect(wrapper).toBeTruthy();

      await user.hover(wrapper!);

      const tooltip = container.querySelector('.gauge-tooltip');
      expect(tooltip).toBeTruthy();
    });

    it('should hide tooltip on mouse leave', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      expect(wrapper).toBeTruthy();

      // Hover to show tooltip
      await user.hover(wrapper!);
      let tooltip = container.querySelector('.gauge-tooltip');
      expect(tooltip).toBeTruthy();

      // Unhover to hide tooltip
      await user.unhover(wrapper!);
      tooltip = container.querySelector('.gauge-tooltip');
      expect(tooltip).toBeNull();
    });
  });

  describe('Tooltip Content', () => {
    it('should display label in tooltip', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} label="Test Label" />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const labelText = Array.from(container.querySelectorAll('text')).find(
        (text) => text.textContent === 'Test Label'
      );
      expect(labelText).toBeTruthy();
    });

    it('should display formatted value in tooltip', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} value={75.5} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const valueText = Array.from(container.querySelectorAll('text')).find(
        (text) => text.textContent === '76'
      );
      expect(valueText).toBeTruthy();
    });

    it('should display range in tooltip', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} min={0} max={100} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const rangeText = Array.from(container.querySelectorAll('text')).find(
        (text) => text.textContent === '(0 - 100)'
      );
      expect(rangeText).toBeTruthy();
    });
  });

  describe('Value Formatting', () => {
    it('should format integer values without decimals', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} value={50} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const valueText = Array.from(container.querySelectorAll('text')).find(
        (text) => text.textContent === '50'
      );
      expect(valueText).toBeTruthy();
    });

    it('should format small decimal values with 1 decimal place', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} value={5.67} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const valueText = Array.from(container.querySelectorAll('text')).find(
        (text) => text.textContent === '5.7'
      );
      expect(valueText).toBeTruthy();
    });

    it('should format large decimal values without decimals', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} value={75.67} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const valueText = Array.from(container.querySelectorAll('text')).find(
        (text) => text.textContent === '76'
      );
      expect(valueText).toBeTruthy();
    });

    it('should format range values consistently', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} min={0.5} max={99.9} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const rangeText = Array.from(container.querySelectorAll('text')).find(
        (text) => text.textContent === '(0.5 - 100)'
      );
      expect(rangeText).toBeTruthy();
    });
  });

  describe('Tooltip Positioning', () => {
    it('should position tooltip at midpoint of gauge arc', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip
            {...defaultProps}
            startAngle={0}
            endAngle={180}
            radius={100}
            strokeWidth={4}
          />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const tooltip = container.querySelector('.gauge-tooltip');
      expect(tooltip).toBeTruthy();

      // Tooltip should have a transform attribute
      const transform = tooltip?.getAttribute('transform');
      expect(transform).toBeTruthy();
      expect(transform).toContain('translate');
    });

    it('should position tooltip outside the gauge', async () => {
      const user = userEvent.setup();
      const radius = 100;
      const strokeWidth = 4;
      const { container } = render(
        <svg>
          <GaugeTooltip
            {...defaultProps}
            radius={radius}
            strokeWidth={strokeWidth}
          />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const tooltip = container.querySelector('.gauge-tooltip');
      const transform = tooltip?.getAttribute('transform');
      
      // Extract x and y from transform
      const match = transform?.match(/translate\(([-\d.]+),\s*([-\d.]+)\)/);
      if (match) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        const distance = Math.sqrt(x * x + y * y);
        
        // Tooltip should be positioned at radius + strokeWidth + 15
        const expectedDistance = radius + strokeWidth + 15;
        expect(Math.abs(distance - expectedDistance)).toBeLessThan(1);
      }
    });
  });

  describe('Accessibility', () => {
    it('should have pointer cursor on hover target', () => {
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      expect(wrapper).toBeTruthy();
      
      const style = window.getComputedStyle(wrapper!);
      expect(style.cursor).toBe('pointer');
    });

    it('should have pointer events enabled on hover target', () => {
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} />
        </svg>
      );

      const hoverTarget = container.querySelector('circle[stroke="transparent"]');
      expect(hoverTarget).toBeTruthy();
      
      const style = window.getComputedStyle(hoverTarget!);
      expect(style.pointerEvents).toBe('all');
    });

    it('should have pointer events disabled on tooltip text', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const tooltipTexts = container.querySelectorAll('.gauge-tooltip text');
      tooltipTexts.forEach((text) => {
        const style = window.getComputedStyle(text);
        expect(style.pointerEvents).toBe('none');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero value', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} value={0} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const valueText = Array.from(container.querySelectorAll('text')).find(
        (text) => text.textContent === '0'
      );
      expect(valueText).toBeTruthy();
    });

    it('should handle negative values', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} value={-5.5} min={-10} max={10} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const valueText = Array.from(container.querySelectorAll('text')).find(
        (text) => text.textContent === '-5.5'
      );
      expect(valueText).toBeTruthy();
    });

    it('should handle very large values', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} value={1000000} min={0} max={2000000} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const valueText = Array.from(container.querySelectorAll('text')).find(
        (text) => text.textContent === '1000000'
      );
      expect(valueText).toBeTruthy();
    });

    it('should handle very small decimal values', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <svg>
          <GaugeTooltip {...defaultProps} value={0.123} min={0} max={1} />
        </svg>
      );

      const wrapper = container.querySelector('.gauge-tooltip-wrapper');
      await user.hover(wrapper!);

      const valueText = Array.from(container.querySelectorAll('text')).find(
        (text) => text.textContent === '0.1'
      );
      expect(valueText).toBeTruthy();
    });
  });
});

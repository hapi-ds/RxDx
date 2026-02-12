/**
 * Unit tests for PriorityBadge component
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PriorityBadge } from './PriorityBadge';

describe('PriorityBadge', () => {
  describe('Rendering', () => {
    it('should render with priority 1', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={1} />
        </svg>
      );

      const badge = container.querySelector('.priority-badge');
      expect(badge).toBeTruthy();
    });

    it('should render circular background', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={1} />
        </svg>
      );

      const circle = container.querySelector('circle');
      expect(circle).toBeTruthy();
      expect(circle?.getAttribute('r')).toBe('12');
      expect(circle?.getAttribute('stroke')).toBe('white');
      expect(circle?.getAttribute('stroke-width')).toBe('2');
    });

    it('should render priority number', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={3} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      const numberText = texts[0];
      expect(numberText).toBeTruthy();
      expect(numberText.textContent).toBe('3');
      expect(numberText.getAttribute('fill')).toBe('white');
      expect(numberText.getAttribute('font-weight')).toBe('bold');
    });

    it('should render priority icon', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={2} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      const iconText = texts[1];
      expect(iconText).toBeTruthy();
      expect(iconText.textContent).toBeTruthy();
    });

    it('should render tooltip', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={4} />
        </svg>
      );

      const title = container.querySelector('title');
      expect(title).toBeTruthy();
      expect(title?.textContent).toContain('Priority: 4');
      expect(title?.textContent).toContain('1=Highest');
      expect(title?.textContent).toContain('5=Lowest');
    });
  });

  describe('Priority Colors', () => {
    it('should use red for priority 1 (highest)', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={1} />
        </svg>
      );

      const circle = container.querySelector('circle');
      expect(circle?.getAttribute('fill')).toBe('#d32f2f');
    });

    it('should use orange for priority 2', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={2} />
        </svg>
      );

      const circle = container.querySelector('circle');
      expect(circle?.getAttribute('fill')).toBe('#f57c00');
    });

    it('should use yellow for priority 3 (medium)', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={3} />
        </svg>
      );

      const circle = container.querySelector('circle');
      expect(circle?.getAttribute('fill')).toBe('#fbc02d');
    });

    it('should use green for priority 4', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={4} />
        </svg>
      );

      const circle = container.querySelector('circle');
      expect(circle?.getAttribute('fill')).toBe('#388e3c');
    });

    it('should use blue for priority 5 (lowest)', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={5} />
        </svg>
      );

      const circle = container.querySelector('circle');
      expect(circle?.getAttribute('fill')).toBe('#1976d2');
    });
  });

  describe('Priority Icons', () => {
    it('should show up arrow for priority 1', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={1} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      const iconText = texts[1];
      expect(iconText.textContent).toBe('⬆');
    });

    it('should show up arrow for priority 2', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={2} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      const iconText = texts[1];
      expect(iconText.textContent).toBe('⬆');
    });

    it('should show right arrow for priority 3', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={3} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      const iconText = texts[1];
      expect(iconText.textContent).toBe('➡');
    });

    it('should show down arrow for priority 4', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={4} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      const iconText = texts[1];
      expect(iconText.textContent).toBe('⬇');
    });

    it('should show down arrow for priority 5', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={5} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      const iconText = texts[1];
      expect(iconText.textContent).toBe('⬇');
    });
  });

  describe('Text Positioning', () => {
    it('should position priority number above center', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={2} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      const numberText = texts[0];
      expect(numberText.getAttribute('y')).toBe('-2');
      expect(numberText.getAttribute('text-anchor')).toBe('middle');
    });

    it('should position icon below center', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={2} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      const iconText = texts[1];
      expect(iconText.getAttribute('y')).toBe('8');
      expect(iconText.getAttribute('text-anchor')).toBe('middle');
    });
  });

  describe('Text Styling', () => {
    it('should have correct font size for priority number', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={3} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      const numberText = texts[0];
      expect(numberText.getAttribute('font-size')).toBe('10');
    });

    it('should have correct font size for icon', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={3} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      const iconText = texts[1];
      expect(iconText.getAttribute('font-size')).toBe('8');
    });

    it('should have white text color', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={3} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      texts.forEach((text) => {
        expect(text.getAttribute('fill')).toBe('white');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have pointer-events none on text', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={2} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      texts.forEach((text) => {
        const style = text.getAttribute('style');
        expect(style).toContain('pointer-events: none');
      });
    });

    it('should have user-select none on text', () => {
      const { container } = render(
        <svg>
          <PriorityBadge priority={2} />
        </svg>
      );

      const texts = container.querySelectorAll('text');
      texts.forEach((text) => {
        const style = text.getAttribute('style');
        expect(style).toContain('user-select: none');
      });
    });
  });
});

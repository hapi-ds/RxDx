/**
 * Unit tests for node utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  getNodeColors,
  calculateNodeSize,
  getBorderWidth,
  getShadowStyle,
  getHoverScale,
  validatePriority,
  validateProgress,
} from './utils';
import { NODE_COLORS } from './constants';

describe('Node Utilities', () => {
  describe('getNodeColors', () => {
    it('should return requirement colors', () => {
      const colors = getNodeColors('requirement');
      expect(colors).toEqual(NODE_COLORS.requirement);
    });

    it('should return task colors', () => {
      const colors = getNodeColors('task');
      expect(colors).toEqual(NODE_COLORS.task);
    });

    it('should return test colors', () => {
      const colors = getNodeColors('test');
      expect(colors).toEqual(NODE_COLORS.test);
    });

    it('should return risk colors', () => {
      const colors = getNodeColors('risk');
      expect(colors).toEqual(NODE_COLORS.risk);
    });

    it('should return document colors', () => {
      const colors = getNodeColors('document');
      expect(colors).toEqual(NODE_COLORS.document);
    });

    it('should return default colors for unknown type', () => {
      const colors = getNodeColors('unknown');
      expect(colors).toEqual(NODE_COLORS.default);
    });

    it('should return default colors for empty string', () => {
      const colors = getNodeColors('');
      expect(colors).toEqual(NODE_COLORS.default);
    });
  });

  describe('calculateNodeSize', () => {
    it('should return base size when priority is undefined', () => {
      const size = calculateNodeSize(150);
      expect(size).toBe(150);
    });

    it('should return base size when priority is invalid (< 1)', () => {
      const size = calculateNodeSize(150, 0);
      expect(size).toBe(150);
    });

    it('should return base size when priority is invalid (> 5)', () => {
      const size = calculateNodeSize(150, 6);
      expect(size).toBe(150);
    });

    it('should calculate correct size for priority 1 (1.5x base)', () => {
      const size = calculateNodeSize(150, 1);
      expect(size).toBe(150 * 1.8); // 2 - 1/5 = 1.8
    });

    it('should calculate correct size for priority 3 (1.3x base)', () => {
      const size = calculateNodeSize(150, 3);
      expect(size).toBe(150 * 1.4); // 2 - 3/5 = 1.4
    });

    it('should calculate correct size for priority 5 (1.0x base)', () => {
      const size = calculateNodeSize(150, 5);
      expect(size).toBe(150 * 1.0); // 2 - 5/5 = 1.0
    });

    it('should work with different base sizes', () => {
      const size = calculateNodeSize(200, 2);
      expect(size).toBe(200 * 1.6); // 2 - 2/5 = 1.6
    });
  });

  describe('getBorderWidth', () => {
    it('should return 3 when selected', () => {
      const width = getBorderWidth(true);
      expect(width).toBe(3);
    });

    it('should return 2 when not selected', () => {
      const width = getBorderWidth(false);
      expect(width).toBe(2);
    });
  });

  describe('getShadowStyle', () => {
    it('should return selected shadow when selected', () => {
      const shadow = getShadowStyle(true, false);
      expect(shadow).toBe('0 4px 12px rgba(0,0,0,0.2)');
    });

    it('should return selected shadow even when hovered', () => {
      const shadow = getShadowStyle(true, true);
      expect(shadow).toBe('0 4px 12px rgba(0,0,0,0.2)');
    });

    it('should return hover shadow when hovered but not selected', () => {
      const shadow = getShadowStyle(false, true);
      expect(shadow).toBe('0 4px 8px rgba(0,0,0,0.15)');
    });

    it('should return default shadow when neither selected nor hovered', () => {
      const shadow = getShadowStyle(false, false);
      expect(shadow).toBe('0 2px 4px rgba(0,0,0,0.1)');
    });
  });

  describe('getHoverScale', () => {
    it('should return scale(1) when dragging', () => {
      const scale = getHoverScale(true, true);
      expect(scale).toBe('scale(1)');
    });

    it('should return scale(1) when dragging even if not hovered', () => {
      const scale = getHoverScale(false, true);
      expect(scale).toBe('scale(1)');
    });

    it('should return scale(1.1) when hovered and not dragging', () => {
      const scale = getHoverScale(true, false);
      expect(scale).toBe('scale(1.1)');
    });

    it('should return scale(1) when not hovered and not dragging', () => {
      const scale = getHoverScale(false, false);
      expect(scale).toBe('scale(1)');
    });
  });

  describe('validatePriority', () => {
    it('should return undefined for undefined input', () => {
      const priority = validatePriority(undefined);
      expect(priority).toBeUndefined();
    });

    it('should return valid priority unchanged', () => {
      expect(validatePriority(1)).toBe(1);
      expect(validatePriority(3)).toBe(3);
      expect(validatePriority(5)).toBe(5);
    });

    it('should clamp priority below 1 to 1', () => {
      expect(validatePriority(0)).toBe(1);
      expect(validatePriority(-5)).toBe(1);
    });

    it('should clamp priority above 5 to 5', () => {
      expect(validatePriority(6)).toBe(5);
      expect(validatePriority(10)).toBe(5);
    });

    it('should handle decimal values', () => {
      expect(validatePriority(2.5)).toBe(2.5);
      expect(validatePriority(0.5)).toBe(1);
      expect(validatePriority(5.5)).toBe(5);
    });
  });

  describe('validateProgress', () => {
    it('should return undefined for undefined input', () => {
      const progress = validateProgress(undefined);
      expect(progress).toBeUndefined();
    });

    it('should return valid progress unchanged', () => {
      expect(validateProgress(0)).toBe(0);
      expect(validateProgress(50)).toBe(50);
      expect(validateProgress(100)).toBe(100);
    });

    it('should clamp progress below 0 to 0', () => {
      expect(validateProgress(-10)).toBe(0);
      expect(validateProgress(-0.5)).toBe(0);
    });

    it('should clamp progress above 100 to 100', () => {
      expect(validateProgress(110)).toBe(100);
      expect(validateProgress(200)).toBe(100);
    });

    it('should handle decimal values', () => {
      expect(validateProgress(25.5)).toBe(25.5);
      expect(validateProgress(99.9)).toBe(99.9);
    });
  });
});

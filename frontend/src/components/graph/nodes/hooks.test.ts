/**
 * Unit tests for node hooks
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useNodeInteraction,
  useNodeStyles,
  useNodeProgress,
  useConnectedHighlight,
} from './hooks';
import { NODE_COLORS } from './constants';

describe('Node Hooks', () => {
  describe('useNodeInteraction', () => {
    it('should initialize with correct state', () => {
      const { result } = renderHook(() => useNodeInteraction(false, false));

      expect(result.current.nodeState.selected).toBe(false);
      expect(result.current.nodeState.hovered).toBe(false);
      expect(result.current.nodeState.dragging).toBe(false);
    });

    it('should reflect selected state', () => {
      const { result } = renderHook(() => useNodeInteraction(true, false));

      expect(result.current.nodeState.selected).toBe(true);
    });

    it('should reflect dragging state', () => {
      const { result } = renderHook(() => useNodeInteraction(false, true));

      expect(result.current.nodeState.dragging).toBe(true);
    });

    it('should update hover state on mouse enter', () => {
      const { result } = renderHook(() => useNodeInteraction(false, false));

      expect(result.current.nodeState.hovered).toBe(false);

      act(() => {
        result.current.handlers.onMouseEnter();
      });

      expect(result.current.nodeState.hovered).toBe(true);
    });

    it('should update hover state on mouse leave', () => {
      const { result } = renderHook(() => useNodeInteraction(false, false));

      act(() => {
        result.current.handlers.onMouseEnter();
      });
      expect(result.current.nodeState.hovered).toBe(true);

      act(() => {
        result.current.handlers.onMouseLeave();
      });
      expect(result.current.nodeState.hovered).toBe(false);
    });

    it('should provide stable handler references', () => {
      const { result, rerender } = renderHook(() => useNodeInteraction(false, false));

      const handlers1 = result.current.handlers;
      rerender();
      const handlers2 = result.current.handlers;

      expect(handlers1.onMouseEnter).toBe(handlers2.onMouseEnter);
      expect(handlers1.onMouseLeave).toBe(handlers2.onMouseLeave);
    });
  });

  describe('useNodeStyles', () => {
    it('should return correct colors for node type', () => {
      const { result } = renderHook(() =>
        useNodeStyles('requirement', { selected: false, hovered: false, dragging: false })
      );

      expect(result.current.colors).toEqual(NODE_COLORS.requirement);
    });

    it('should return default colors for unknown type', () => {
      const { result } = renderHook(() =>
        useNodeStyles('unknown', { selected: false, hovered: false, dragging: false })
      );

      expect(result.current.colors).toEqual(NODE_COLORS.default);
    });

    it('should use custom colors when provided', () => {
      const customColors = {
        bg: '#ffffff',
        border: '#000000',
        text: '#333333',
      };

      const { result } = renderHook(() =>
        useNodeStyles(
          'requirement',
          { selected: false, hovered: false, dragging: false },
          undefined,
          customColors
        )
      );

      expect(result.current.colors).toEqual(customColors);
    });

    it('should return correct border width for selected state', () => {
      const { result: selected } = renderHook(() =>
        useNodeStyles('requirement', { selected: true, hovered: false, dragging: false })
      );
      expect(selected.current.borderWidth).toBe(3);

      const { result: notSelected } = renderHook(() =>
        useNodeStyles('requirement', { selected: false, hovered: false, dragging: false })
      );
      expect(notSelected.current.borderWidth).toBe(2);
    });

    it('should return correct shadow for selected state', () => {
      const { result } = renderHook(() =>
        useNodeStyles('requirement', { selected: true, hovered: false, dragging: false })
      );

      expect(result.current.boxShadow).toBe('0 4px 12px rgba(0,0,0,0.2)');
    });

    it('should return correct shadow for hovered state', () => {
      const { result } = renderHook(() =>
        useNodeStyles('requirement', { selected: false, hovered: true, dragging: false })
      );

      expect(result.current.boxShadow).toBe('0 4px 8px rgba(0,0,0,0.15)');
    });

    it('should return correct transform for hovered state', () => {
      const { result } = renderHook(() =>
        useNodeStyles('requirement', { selected: false, hovered: true, dragging: false })
      );

      expect(result.current.transform).toBe('scale(1.1)');
    });

    it('should not scale when dragging', () => {
      const { result } = renderHook(() =>
        useNodeStyles('requirement', { selected: false, hovered: true, dragging: true })
      );

      expect(result.current.transform).toBe('scale(1)');
    });

    it('should calculate size based on priority', () => {
      const { result: priority1 } = renderHook(() =>
        useNodeStyles('requirement', { selected: false, hovered: false, dragging: false }, 1)
      );
      expect(priority1.current.size).toBe(150 * 1.8);

      const { result: priority5 } = renderHook(() =>
        useNodeStyles('requirement', { selected: false, hovered: false, dragging: false }, 5)
      );
      expect(priority5.current.size).toBe(150 * 1.0);
    });

    it('should use base size when priority is undefined', () => {
      const { result } = renderHook(() =>
        useNodeStyles('requirement', { selected: false, hovered: false, dragging: false })
      );

      expect(result.current.size).toBe(150);
    });
  });

  describe('useNodeProgress', () => {
    it('should return 0 percentage for undefined progress', () => {
      const { result } = renderHook(() => useNodeProgress(undefined));

      expect(result.current.percentage).toBe(0);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.displayText).toBe('0%');
    });

    it('should return correct percentage for valid progress', () => {
      const { result } = renderHook(() => useNodeProgress(50));

      expect(result.current.percentage).toBe(50);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.displayText).toBe('50%');
    });

    it('should indicate completion at 100%', () => {
      const { result } = renderHook(() => useNodeProgress(100));

      expect(result.current.percentage).toBe(100);
      expect(result.current.isComplete).toBe(true);
      expect(result.current.displayText).toBe('100%');
    });

    it('should clamp progress below 0', () => {
      const { result } = renderHook(() => useNodeProgress(-10));

      expect(result.current.percentage).toBe(0);
    });

    it('should clamp progress above 100', () => {
      const { result } = renderHook(() => useNodeProgress(150));

      expect(result.current.percentage).toBe(100);
    });

    it('should format display text without decimals', () => {
      const { result } = renderHook(() => useNodeProgress(75.8));

      expect(result.current.displayText).toBe('76%');
    });

    it('should handle decimal progress values', () => {
      const { result } = renderHook(() => useNodeProgress(33.33));

      expect(result.current.percentage).toBe(33.33);
      expect(result.current.displayText).toBe('33%');
    });
  });

  describe('useConnectedHighlight', () => {
    it('should not highlight when no node is hovered', () => {
      const { result } = renderHook(() =>
        useConnectedHighlight('node-1', null, ['node-2', 'node-3'])
      );

      expect(result.current.isHighlighted).toBe(false);
      expect(result.current.isDimmed).toBe(false);
    });

    it('should highlight the hovered node itself', () => {
      const { result } = renderHook(() =>
        useConnectedHighlight('node-1', 'node-1', ['node-2', 'node-3'])
      );

      expect(result.current.isHighlighted).toBe(true);
      expect(result.current.isDimmed).toBe(false);
    });

    it('should highlight connected nodes', () => {
      const { result } = renderHook(() =>
        useConnectedHighlight('node-2', 'node-1', ['node-1', 'node-2'])
      );

      expect(result.current.isHighlighted).toBe(true);
      expect(result.current.isDimmed).toBe(false);
    });

    it('should dim non-connected nodes', () => {
      const { result } = renderHook(() =>
        useConnectedHighlight('node-3', 'node-1', ['node-2'])
      );

      expect(result.current.isHighlighted).toBe(false);
      expect(result.current.isDimmed).toBe(true);
    });

    it('should handle empty connected nodes list', () => {
      const { result } = renderHook(() =>
        useConnectedHighlight('node-2', 'node-1', [])
      );

      expect(result.current.isHighlighted).toBe(false);
      expect(result.current.isDimmed).toBe(true);
    });

    it('should update when hovered node changes', () => {
      const { result, rerender } = renderHook(
        ({ hoveredNodeId }) => useConnectedHighlight('node-2', hoveredNodeId, ['node-1', 'node-2']),
        { initialProps: { hoveredNodeId: 'node-1' } }
      );

      expect(result.current.isHighlighted).toBe(true);

      rerender({ hoveredNodeId: 'node-3' });
      expect(result.current.isHighlighted).toBe(false);
      expect(result.current.isDimmed).toBe(true);
    });
  });
});

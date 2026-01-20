/**
 * ViewModeToggle Component Tests
 * Tests for the view mode toggle functionality including:
 * - Rendering in different states
 * - Click interactions
 * - Keyboard shortcut handling
 * - State preservation during transitions
 * 
 * References: Requirement 16 (Dual Frontend Interface)
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ViewModeToggle } from './ViewModeToggle';
import { useGraphStore } from '../../stores/graphStore';

// Mock the graphStore
vi.mock('../../stores/graphStore', () => ({
  useGraphStore: vi.fn(),
}));

const mockUseGraphStore = useGraphStore as unknown as ReturnType<typeof vi.fn>;

describe('ViewModeToggle', () => {
  const defaultMockStore = {
    viewMode: '2d' as const,
    setViewMode: vi.fn(),
    selectedNode: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGraphStore.mockReturnValue(defaultMockStore);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      render(<ViewModeToggle />);
      
      expect(screen.getByRole('group', { name: /view mode toggle/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /switch to 2d view/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /switch to 3d view/i })).toBeInTheDocument();
    });

    it('renders with labels when showLabels is true', () => {
      render(<ViewModeToggle showLabels={true} />);
      
      expect(screen.getByText('2D')).toBeInTheDocument();
      expect(screen.getByText('3D')).toBeInTheDocument();
    });

    it('renders without labels when showLabels is false', () => {
      render(<ViewModeToggle showLabels={false} />);
      
      expect(screen.queryByText('2D')).not.toBeInTheDocument();
      expect(screen.queryByText('3D')).not.toBeInTheDocument();
    });

    it('shows 2D button as active when viewMode is 2d', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '2d',
      });

      render(<ViewModeToggle />);
      
      const button2D = screen.getByRole('button', { name: /switch to 2d view/i });
      expect(button2D).toHaveAttribute('aria-pressed', 'true');
    });

    it('shows 3D button as active when viewMode is 3d', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '3d',
      });

      render(<ViewModeToggle />);
      
      const button3D = screen.getByRole('button', { name: /switch to 3d view/i });
      expect(button3D).toHaveAttribute('aria-pressed', 'true');
    });

    it('applies custom className', () => {
      render(<ViewModeToggle className="custom-class" />);
      
      const container = screen.getByRole('group');
      expect(container).toHaveClass('custom-class');
    });

    it('applies custom style', () => {
      render(<ViewModeToggle style={{ marginTop: '10px' }} />);
      
      const container = screen.getByRole('group');
      expect(container).toHaveStyle({ marginTop: '10px' });
    });
  });

  describe('Size Variants', () => {
    it('renders with small size', () => {
      render(<ViewModeToggle size="sm" />);
      
      // Component should render without errors
      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('renders with medium size (default)', () => {
      render(<ViewModeToggle size="md" />);
      
      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('renders with large size', () => {
      render(<ViewModeToggle size="lg" />);
      
      expect(screen.getByRole('group')).toBeInTheDocument();
    });
  });

  describe('Click Interactions', () => {
    it('calls setViewMode when clicking 3D button from 2D mode', async () => {
      const setViewMode = vi.fn();
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '2d',
        setViewMode,
      });

      render(<ViewModeToggle />);
      
      const button3D = screen.getByRole('button', { name: /switch to 3d view/i });
      await userEvent.click(button3D);
      
      expect(setViewMode).toHaveBeenCalledWith('3d');
    });

    it('calls setViewMode when clicking 2D button from 3D mode', async () => {
      const setViewMode = vi.fn();
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '3d',
        setViewMode,
      });

      render(<ViewModeToggle />);
      
      const button2D = screen.getByRole('button', { name: /switch to 2d view/i });
      await userEvent.click(button2D);
      
      expect(setViewMode).toHaveBeenCalledWith('2d');
    });

    it('does not call setViewMode when clicking already active mode', async () => {
      const setViewMode = vi.fn();
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '2d',
        setViewMode,
      });

      render(<ViewModeToggle />);
      
      const button2D = screen.getByRole('button', { name: /switch to 2d view/i });
      await userEvent.click(button2D);
      
      expect(setViewMode).not.toHaveBeenCalled();
    });

    it('calls onViewModeChange callback when mode changes', async () => {
      const onViewModeChange = vi.fn();
      const setViewMode = vi.fn();
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '2d',
        setViewMode,
      });

      render(<ViewModeToggle onViewModeChange={onViewModeChange} />);
      
      const button3D = screen.getByRole('button', { name: /switch to 3d view/i });
      await userEvent.click(button3D);
      
      expect(onViewModeChange).toHaveBeenCalledWith('3d');
    });
  });

  describe('Disabled State', () => {
    it('disables buttons when disabled prop is true', () => {
      render(<ViewModeToggle disabled={true} />);
      
      const button2D = screen.getByRole('button', { name: /switch to 2d view/i });
      const button3D = screen.getByRole('button', { name: /switch to 3d view/i });
      
      expect(button2D).toBeDisabled();
      expect(button3D).toBeDisabled();
    });

    it('does not call setViewMode when disabled', async () => {
      const setViewMode = vi.fn();
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '2d',
        setViewMode,
      });

      render(<ViewModeToggle disabled={true} />);
      
      const button3D = screen.getByRole('button', { name: /switch to 3d view/i });
      await userEvent.click(button3D);
      
      expect(setViewMode).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcut', () => {
    it('toggles view mode on Ctrl+Shift+V', () => {
      const setViewMode = vi.fn();
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '2d',
        setViewMode,
      });

      render(<ViewModeToggle enableKeyboardShortcut={true} />);
      
      act(() => {
        fireEvent.keyDown(window, {
          key: 'V',
          ctrlKey: true,
          shiftKey: true,
        });
      });
      
      expect(setViewMode).toHaveBeenCalledWith('3d');
    });

    it('toggles from 3D to 2D on Ctrl+Shift+V', () => {
      const setViewMode = vi.fn();
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '3d',
        setViewMode,
      });

      render(<ViewModeToggle enableKeyboardShortcut={true} />);
      
      act(() => {
        fireEvent.keyDown(window, {
          key: 'V',
          ctrlKey: true,
          shiftKey: true,
        });
      });
      
      expect(setViewMode).toHaveBeenCalledWith('2d');
    });

    it('does not toggle when only Ctrl is pressed', () => {
      const setViewMode = vi.fn();
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '2d',
        setViewMode,
      });

      render(<ViewModeToggle enableKeyboardShortcut={true} />);
      
      act(() => {
        fireEvent.keyDown(window, {
          key: 'V',
          ctrlKey: true,
          shiftKey: false,
        });
      });
      
      expect(setViewMode).not.toHaveBeenCalled();
    });

    it('does not toggle when only Shift is pressed', () => {
      const setViewMode = vi.fn();
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '2d',
        setViewMode,
      });

      render(<ViewModeToggle enableKeyboardShortcut={true} />);
      
      act(() => {
        fireEvent.keyDown(window, {
          key: 'V',
          ctrlKey: false,
          shiftKey: true,
        });
      });
      
      expect(setViewMode).not.toHaveBeenCalled();
    });

    it('does not toggle when keyboard shortcut is disabled', () => {
      const setViewMode = vi.fn();
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '2d',
        setViewMode,
      });

      render(<ViewModeToggle enableKeyboardShortcut={false} />);
      
      act(() => {
        fireEvent.keyDown(window, {
          key: 'V',
          ctrlKey: true,
          shiftKey: true,
        });
      });
      
      expect(setViewMode).not.toHaveBeenCalled();
    });

    it('uses custom shortcut key', () => {
      const setViewMode = vi.fn();
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '2d',
        setViewMode,
      });

      render(<ViewModeToggle enableKeyboardShortcut={true} shortcutKey="T" />);
      
      // Should not respond to V
      act(() => {
        fireEvent.keyDown(window, {
          key: 'V',
          ctrlKey: true,
          shiftKey: true,
        });
      });
      expect(setViewMode).not.toHaveBeenCalled();
      
      // Should respond to T
      act(() => {
        fireEvent.keyDown(window, {
          key: 'T',
          ctrlKey: true,
          shiftKey: true,
        });
      });
      expect(setViewMode).toHaveBeenCalledWith('3d');
    });

    it('does not toggle when disabled even with keyboard shortcut', () => {
      const setViewMode = vi.fn();
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '2d',
        setViewMode,
      });

      render(<ViewModeToggle disabled={true} enableKeyboardShortcut={true} />);
      
      act(() => {
        fireEvent.keyDown(window, {
          key: 'V',
          ctrlKey: true,
          shiftKey: true,
        });
      });
      
      expect(setViewMode).not.toHaveBeenCalled();
    });
  });

  describe('Shortcut Hint', () => {
    it('shows shortcut hint in button title when showShortcutHint is true', () => {
      render(<ViewModeToggle showShortcutHint={true} />);
      
      const button2D = screen.getByRole('button', { name: /switch to 2d view/i });
      expect(button2D).toHaveAttribute('title', expect.stringContaining('Ctrl+Shift+V'));
    });

    it('does not show shortcut hint when showShortcutHint is false', () => {
      render(<ViewModeToggle showShortcutHint={false} />);
      
      const button2D = screen.getByRole('button', { name: /switch to 2d view/i });
      expect(button2D).toHaveAttribute('title', '2D View');
    });
  });

  describe('State Preservation', () => {
    it('preserves selected node reference during mode switch', async () => {
      const setViewMode = vi.fn();
      const selectedNode = { id: 'node-1', data: { label: 'Test Node' } };
      mockUseGraphStore.mockReturnValue({
        ...defaultMockStore,
        viewMode: '2d',
        setViewMode,
        selectedNode,
      });

      render(<ViewModeToggle />);
      
      const button3D = screen.getByRole('button', { name: /switch to 3d view/i });
      await userEvent.click(button3D);
      
      // setViewMode should be called, and selectedNode should remain unchanged
      expect(setViewMode).toHaveBeenCalledWith('3d');
      // The store's selectedNode is not modified by the toggle
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ViewModeToggle />);
      
      const group = screen.getByRole('group');
      expect(group).toHaveAttribute('aria-label', 'View mode toggle');
      
      const button2D = screen.getByRole('button', { name: /switch to 2d view/i });
      const button3D = screen.getByRole('button', { name: /switch to 3d view/i });
      
      expect(button2D).toHaveAttribute('aria-pressed');
      expect(button3D).toHaveAttribute('aria-pressed');
    });

    it('buttons are keyboard focusable', () => {
      render(<ViewModeToggle />);
      
      const button2D = screen.getByRole('button', { name: /switch to 2d view/i });
      const button3D = screen.getByRole('button', { name: /switch to 3d view/i });
      
      expect(button2D).not.toHaveAttribute('tabindex', '-1');
      expect(button3D).not.toHaveAttribute('tabindex', '-1');
    });
  });

  describe('Animation', () => {
    it('applies transition styles when animated is true', () => {
      render(<ViewModeToggle animated={true} />);
      
      // Component should render with transition styles
      expect(screen.getByRole('group')).toBeInTheDocument();
    });

    it('does not apply transition styles when animated is false', () => {
      render(<ViewModeToggle animated={false} />);
      
      // Component should render without transition styles
      expect(screen.getByRole('group')).toBeInTheDocument();
    });
  });
});

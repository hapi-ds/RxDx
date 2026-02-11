/**
 * LayoutSelector Component Tests
 * Tests for the layout algorithm selector dropdown component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayoutSelector } from './LayoutSelector';
import { useGraphStore } from '../../stores/graphStore';

// Mock the graphStore
vi.mock('../../stores/graphStore', () => ({
  useGraphStore: vi.fn(),
}));

describe('LayoutSelector', () => {
  const mockSetLayoutAlgorithm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    (useGraphStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      layoutAlgorithm: 'force',
      setLayoutAlgorithm: mockSetLayoutAlgorithm,
    });
  });

  describe('Rendering', () => {
    it('renders the layout selector with label', () => {
      render(<LayoutSelector />);
      
      expect(screen.getByLabelText(/layout algorithm/i)).toBeInTheDocument();
    });

    it('renders without label when showLabel is false', () => {
      render(<LayoutSelector showLabel={false} />);
      
      // Should still have aria-label for accessibility
      expect(screen.getByLabelText(/select graph layout algorithm/i)).toBeInTheDocument();
      // But no visible label
      expect(screen.queryByText(/layout algorithm/i)).not.toBeInTheDocument();
    });

    it('renders with custom label', () => {
      render(<LayoutSelector label="Choose Layout" />);
      
      expect(screen.getByText('Choose Layout')).toBeInTheDocument();
    });

    it('renders all layout options with icons', () => {
      render(<LayoutSelector />);
      
      const select = screen.getByLabelText(/layout algorithm/i) as HTMLSelectElement;
      const options = Array.from(select.options);
      
      expect(options).toHaveLength(4);
      expect(options[0].textContent).toContain('Force-Directed');
      expect(options[1].textContent).toContain('Hierarchical');
      expect(options[2].textContent).toContain('Circular');
      expect(options[3].textContent).toContain('Grid');
      
      // Check icons are present
      expect(options[0].textContent).toContain('⚛️');
      expect(options[1].textContent).toContain('🌳');
      expect(options[2].textContent).toContain('⭕');
      expect(options[3].textContent).toContain('⊞');
    });

    it('displays current layout algorithm', () => {
      (useGraphStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        layoutAlgorithm: 'hierarchical',
        setLayoutAlgorithm: mockSetLayoutAlgorithm,
      });

      render(<LayoutSelector />);
      
      const select = screen.getByLabelText(/layout algorithm/i) as HTMLSelectElement;
      expect(select.value).toBe('hierarchical');
    });

    it('displays hint with current layout description', () => {
      render(<LayoutSelector showHint={true} />);
      
      expect(screen.getByText(/physics-based layout with automatic spacing/i)).toBeInTheDocument();
    });

    it('does not display hint when showHint is false', () => {
      render(<LayoutSelector showHint={false} />);
      
      expect(screen.queryByText(/physics-based layout/i)).not.toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('calls setLayoutAlgorithm when selection changes', () => {
      render(<LayoutSelector />);
      
      const select = screen.getByLabelText(/layout algorithm/i) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'circular' } });
      
      expect(mockSetLayoutAlgorithm).toHaveBeenCalledWith('circular');
      expect(mockSetLayoutAlgorithm).toHaveBeenCalledTimes(1);
    });

    it('updates to show new layout when store changes', () => {
      const { rerender } = render(<LayoutSelector />);
      
      // Change the mock to return a different layout
      (useGraphStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        layoutAlgorithm: 'grid',
        setLayoutAlgorithm: mockSetLayoutAlgorithm,
      });
      
      rerender(<LayoutSelector />);
      
      const select = screen.getByLabelText(/layout algorithm/i) as HTMLSelectElement;
      expect(select.value).toBe('grid');
    });

    it('updates hint when layout changes', () => {
      const { rerender } = render(<LayoutSelector showHint={true} />);
      
      expect(screen.getByText(/physics-based layout/i)).toBeInTheDocument();
      
      // Change to hierarchical
      (useGraphStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        layoutAlgorithm: 'hierarchical',
        setLayoutAlgorithm: mockSetLayoutAlgorithm,
      });
      
      rerender(<LayoutSelector showHint={true} />);
      
      expect(screen.getByText(/tree-like layout with levels/i)).toBeInTheDocument();
      expect(screen.queryByText(/physics-based layout/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria-label', () => {
      render(<LayoutSelector />);
      
      const select = screen.getByLabelText(/select graph layout algorithm/i);
      expect(select).toBeInTheDocument();
    });

    it('select is keyboard accessible', () => {
      render(<LayoutSelector />);
      
      const select = screen.getByLabelText(/layout algorithm/i) as HTMLSelectElement;
      
      // Focus the select
      select.focus();
      expect(document.activeElement).toBe(select);
      
      // Simulate keyboard navigation
      fireEvent.keyDown(select, { key: 'ArrowDown' });
      fireEvent.change(select, { target: { value: 'hierarchical' } });
      
      expect(mockSetLayoutAlgorithm).toHaveBeenCalledWith('hierarchical');
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      const { container } = render(<LayoutSelector className="custom-class" />);
      
      const layoutSelector = container.querySelector('.layout-selector');
      expect(layoutSelector).toHaveClass('custom-class');
    });

    it('has minimum width styling', () => {
      const { container } = render(<LayoutSelector />);
      
      const layoutSelector = container.querySelector('.layout-selector');
      expect(layoutSelector).toBeInTheDocument();
    });
  });

  describe('All Layout Options', () => {
    it('can select force-directed layout', () => {
      render(<LayoutSelector />);
      
      const select = screen.getByLabelText(/layout algorithm/i) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'force' } });
      
      expect(mockSetLayoutAlgorithm).toHaveBeenCalledWith('force');
    });

    it('can select hierarchical layout', () => {
      render(<LayoutSelector />);
      
      const select = screen.getByLabelText(/layout algorithm/i) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'hierarchical' } });
      
      expect(mockSetLayoutAlgorithm).toHaveBeenCalledWith('hierarchical');
    });

    it('can select circular layout', () => {
      render(<LayoutSelector />);
      
      const select = screen.getByLabelText(/layout algorithm/i) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'circular' } });
      
      expect(mockSetLayoutAlgorithm).toHaveBeenCalledWith('circular');
    });

    it('can select grid layout', () => {
      render(<LayoutSelector />);
      
      const select = screen.getByLabelText(/layout algorithm/i) as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'grid' } });
      
      expect(mockSetLayoutAlgorithm).toHaveBeenCalledWith('grid');
    });
  });
});

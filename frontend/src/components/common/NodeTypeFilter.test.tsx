/**
 * Unit tests for NodeTypeFilter component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { NodeTypeFilter } from './NodeTypeFilter';
import type { NodeTypeOption } from '../../types/filters';

describe('NodeTypeFilter', () => {
  const mockTypes: NodeTypeOption[] = [
    { value: 'requirement', label: 'Requirements', category: 'workitems', color: '#3b82f6' },
    { value: 'task', label: 'Tasks', category: 'workitems', color: '#10b981' },
    { value: 'test', label: 'Tests', category: 'workitems', color: '#8b5cf6' },
    { value: 'Project', label: 'Projects', category: 'structure', color: '#06b6d4' },
    { value: 'Phase', label: 'Phases', category: 'structure', color: '#14b8a6' },
  ];

  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
  });

  describe('Rendering', () => {
    it('renders with default expanded layout', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      expect(screen.getByText('Filter by Type')).toBeInTheDocument();
      expect(screen.getByText('Select All')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('renders with compact layout', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          layout="compact"
        />
      );

      expect(screen.getByRole('button', { name: /filter by node type/i })).toBeInTheDocument();
    });

    it('renders all available types', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      mockTypes.forEach(type => {
        expect(screen.getByLabelText(`Filter by ${type.label}`)).toBeInTheDocument();
      });
    });

    it('renders categories when showCategories is true', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          showCategories={true}
        />
      );

      expect(screen.getByText('Work Items')).toBeInTheDocument();
      expect(screen.getByText('Project Structure')).toBeInTheDocument();
    });

    it('does not render categories when showCategories is false', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          showCategories={false}
        />
      );

      expect(screen.queryByText('Work Items')).not.toBeInTheDocument();
      expect(screen.queryByText('Project Structure')).not.toBeInTheDocument();
    });

    it('filters out work item types when showWorkItemTypes is false', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          showWorkItemTypes={false}
        />
      );

      expect(screen.queryByLabelText('Filter by Requirements')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Filter by Tasks')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Filter by Projects')).toBeInTheDocument();
    });

    it('renders color indicators for types with colors', () => {
      const { container } = render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const colorIndicators = container.querySelectorAll('.filter-type-color');
      expect(colorIndicators.length).toBeGreaterThan(0);
    });

    it('applies custom className', () => {
      const { container } = render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          className="custom-filter"
        />
      );

      expect(container.querySelector('.custom-filter')).toBeInTheDocument();
    });
  });

  describe('Selection behavior', () => {
    it('shows checked state for selected types', () => {
      const selected = new Set(['requirement', 'task']);
      render(
        <NodeTypeFilter
          selectedTypes={selected}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const requirementCheckbox = screen.getByLabelText('Filter by Requirements') as HTMLInputElement;
      const taskCheckbox = screen.getByLabelText('Filter by Tasks') as HTMLInputElement;
      const testCheckbox = screen.getByLabelText('Filter by Tests') as HTMLInputElement;

      expect(requirementCheckbox.checked).toBe(true);
      expect(taskCheckbox.checked).toBe(true);
      expect(testCheckbox.checked).toBe(false);
    });

    it('calls onChange when a type is selected', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const checkbox = screen.getByLabelText('Filter by Requirements');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const newSet = mockOnChange.mock.calls[0][0];
      expect(newSet.has('requirement')).toBe(true);
    });

    it('calls onChange when a type is deselected', () => {
      const selected = new Set(['requirement']);
      render(
        <NodeTypeFilter
          selectedTypes={selected}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const checkbox = screen.getByLabelText('Filter by Requirements');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const newSet = mockOnChange.mock.calls[0][0];
      expect(newSet.has('requirement')).toBe(false);
    });

    it('handles multiple selections', () => {
      const selected = new Set(['requirement']);
      const { rerender } = render(
        <NodeTypeFilter
          selectedTypes={selected}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      // Select task
      fireEvent.click(screen.getByLabelText('Filter by Tasks'));
      expect(mockOnChange).toHaveBeenCalledTimes(1);
      
      const newSelected = new Set(['requirement', 'task']);
      rerender(
        <NodeTypeFilter
          selectedTypes={newSelected}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      // Select test
      fireEvent.click(screen.getByLabelText('Filter by Tests'));
      expect(mockOnChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Select All / Clear All functionality', () => {
    it('Select All button selects all types', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const selectAllButton = screen.getByRole('button', { name: /select all/i });
      fireEvent.click(selectAllButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const newSet = mockOnChange.mock.calls[0][0];
      expect(newSet.size).toBe(mockTypes.length);
      mockTypes.forEach(type => {
        expect(newSet.has(type.value)).toBe(true);
      });
    });

    it('Clear All button clears all selections', () => {
      const selected = new Set(['requirement', 'task', 'test']);
      render(
        <NodeTypeFilter
          selectedTypes={selected}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const clearAllButton = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearAllButton);

      expect(mockOnChange).toHaveBeenCalledTimes(1);
      const newSet = mockOnChange.mock.calls[0][0];
      expect(newSet.size).toBe(0);
    });

    it('disables Select All when all types are selected', () => {
      const allSelected = new Set(mockTypes.map(t => t.value));
      render(
        <NodeTypeFilter
          selectedTypes={allSelected}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const selectAllButton = screen.getByRole('button', { name: /select all/i });
      expect(selectAllButton).toBeDisabled();
    });

    it('disables Clear All when no types are selected', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const clearAllButton = screen.getByRole('button', { name: /clear all/i });
      expect(clearAllButton).toBeDisabled();
    });
  });

  describe('Category collapsing', () => {
    it('collapses and expands categories', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          showCategories={true}
        />
      );

      const categoryButton = screen.getByRole('button', { name: /toggle work items category/i });
      
      // Initially expanded - checkboxes should be visible
      expect(screen.getByLabelText('Filter by Requirements')).toBeInTheDocument();

      // Collapse
      fireEvent.click(categoryButton);
      expect(screen.queryByLabelText('Filter by Requirements')).not.toBeInTheDocument();

      // Expand again
      fireEvent.click(categoryButton);
      expect(screen.getByLabelText('Filter by Requirements')).toBeInTheDocument();
    });

    it('shows correct aria-expanded state', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          showCategories={true}
        />
      );

      const categoryButton = screen.getByRole('button', { name: /toggle work items category/i });
      
      // Initially expanded
      expect(categoryButton).toHaveAttribute('aria-expanded', 'true');

      // Collapse
      fireEvent.click(categoryButton);
      expect(categoryButton).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('Compact layout', () => {
    it('shows dropdown when toggle button is clicked', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          layout="compact"
        />
      );

      const toggleButton = screen.getByRole('button', { name: /filter by node type/i });
      
      // Initially closed - action buttons should not be visible
      expect(screen.queryByRole('button', { name: /select all node types/i })).not.toBeInTheDocument();

      // Open dropdown
      fireEvent.click(toggleButton);
      expect(screen.getByRole('button', { name: /select all node types/i })).toBeInTheDocument();
    });

    it('shows selected count in toggle button', () => {
      const selected = new Set(['requirement', 'task']);
      render(
        <NodeTypeFilter
          selectedTypes={selected}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          layout="compact"
        />
      );

      const toggleButton = screen.getByRole('button', { name: /filter by node type/i });
      expect(toggleButton.textContent).toContain('(2/5)');
    });

    it('updates aria-expanded attribute', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          layout="compact"
        />
      );

      const toggleButton = screen.getByRole('button', { name: /filter by node type/i });
      
      // Initially closed
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      // Open
      fireEvent.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for checkboxes', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      mockTypes.forEach(type => {
        const checkbox = screen.getByLabelText(`Filter by ${type.label}`);
        expect(checkbox).toHaveAttribute('type', 'checkbox');
      });
    });

    it('has proper ARIA labels for action buttons', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      expect(screen.getByRole('button', { name: /select all node types/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear all node type selections/i })).toBeInTheDocument();
    });

    it('has proper ARIA labels for category toggles', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          showCategories={true}
        />
      );

      expect(screen.getByRole('button', { name: /toggle work items category/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /toggle project structure category/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const checkbox = screen.getByLabelText('Filter by Requirements');
      checkbox.focus();
      expect(document.activeElement).toBe(checkbox);
    });
  });

  describe('Edge cases', () => {
    it('handles empty availableTypes array', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={[]}
        />
      );

      expect(screen.getByText('Filter by Type')).toBeInTheDocument();
      expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    it('handles types without categories', () => {
      const typesWithoutCategory: NodeTypeOption[] = [
        { value: 'type1', label: 'Type 1' },
        { value: 'type2', label: 'Type 2' },
      ];

      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={typesWithoutCategory}
          showCategories={true}
        />
      );

      expect(screen.getByLabelText('Filter by Type 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Filter by Type 2')).toBeInTheDocument();
    });

    it('handles types without colors', () => {
      const typesWithoutColor: NodeTypeOption[] = [
        { value: 'type1', label: 'Type 1', category: 'workitems' },
      ];

      const { container } = render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={typesWithoutColor}
        />
      );

      expect(screen.getByLabelText('Filter by Type 1')).toBeInTheDocument();
      // Color indicator should still render but without background color
      const colorIndicators = container.querySelectorAll('.filter-type-color');
      expect(colorIndicators.length).toBe(1);
    });

    it('handles selectedTypes with values not in availableTypes', () => {
      const selected = new Set(['requirement', 'nonexistent']);
      render(
        <NodeTypeFilter
          selectedTypes={selected}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const requirementCheckbox = screen.getByLabelText('Filter by Requirements') as HTMLInputElement;
      expect(requirementCheckbox.checked).toBe(true);
      // Should not crash with nonexistent type
    });
  });
});

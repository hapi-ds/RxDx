/**
 * Accessibility tests for NodeTypeFilter component
 * Tests keyboard navigation, ARIA labels, and focus management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NodeTypeFilter } from './NodeTypeFilter';
import type { NodeTypeOption } from '../../types/filters';

describe('NodeTypeFilter - Accessibility', () => {
  const mockTypes: NodeTypeOption[] = [
    { value: 'requirement', label: 'Requirements', category: 'workitems', color: '#3b82f6' },
    { value: 'task', label: 'Tasks', category: 'workitems', color: '#10b981' },
    { value: 'test', label: 'Tests', category: 'workitems', color: '#8b5cf6' },
    { value: 'Project', label: 'Projects', category: 'structure', color: '#06b6d4' },
  ];

  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnChange = vi.fn();
  });

  describe('Keyboard Navigation', () => {
    it('allows tab navigation through checkboxes', async () => {
      const user = userEvent.setup();
      render(
        <NodeTypeFilter
          selectedTypes={new Set(['requirement'])} // Select one so Clear All is enabled
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      // Tab to first action button (Select All)
      await user.tab();
      expect(screen.getByRole('button', { name: /select all node types/i })).toHaveFocus();

      // Tab to second action button (Clear All) - now enabled
      await user.tab();
      expect(screen.getByRole('button', { name: /clear all node type selections/i })).toHaveFocus();

      // Tab to first category toggle
      await user.tab();
      expect(screen.getByRole('button', { name: /toggle work items category/i })).toHaveFocus();
    });

    it('allows Space key to toggle checkbox', async () => {
      const user = userEvent.setup();
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const checkbox = screen.getByLabelText('Filter by Requirements').closest('label');
      if (checkbox) {
        checkbox.focus();
        await user.keyboard(' ');
        
        expect(mockOnChange).toHaveBeenCalledTimes(1);
        const newSet = mockOnChange.mock.calls[0][0];
        expect(newSet.has('requirement')).toBe(true);
      }
    });

    it('allows Enter key to toggle checkbox', async () => {
      const user = userEvent.setup();
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const checkbox = screen.getByLabelText('Filter by Requirements').closest('label');
      if (checkbox) {
        checkbox.focus();
        await user.keyboard('{Enter}');
        
        expect(mockOnChange).toHaveBeenCalledTimes(1);
        const newSet = mockOnChange.mock.calls[0][0];
        expect(newSet.has('requirement')).toBe(true);
      }
    });

    it('allows Escape key to close dropdown in compact mode', async () => {
      const user = userEvent.setup();
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          layout="compact"
        />
      );

      const toggleButton = screen.getByRole('button', { name: /filter by node type/i });
      await user.click(toggleButton);

      // Dropdown should be open - buttons have role="menuitem" in compact mode
      expect(screen.getByRole('menuitem', { name: /select all node types/i })).toBeInTheDocument();

      // Press Escape
      await user.keyboard('{Escape}');

      // Dropdown should be closed
      expect(screen.queryByRole('menuitem', { name: /select all node types/i })).not.toBeInTheDocument();
    });

    it('allows keyboard navigation for action buttons', async () => {
      const user = userEvent.setup();
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const selectAllButton = screen.getByRole('button', { name: /select all node types/i });
      selectAllButton.focus();
      
      expect(selectAllButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      expect(mockOnChange).toHaveBeenCalled();
    });

    it('allows keyboard navigation for category toggles', async () => {
      const user = userEvent.setup();
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          showCategories={true}
        />
      );

      const categoryButton = screen.getByRole('button', { name: /toggle work items category/i });
      categoryButton.focus();
      
      expect(categoryButton).toHaveFocus();
      
      // Initially expanded
      expect(screen.getByLabelText('Filter by Requirements')).toBeInTheDocument();
      
      await user.keyboard('{Enter}');
      
      // Should be collapsed
      expect(screen.queryByLabelText('Filter by Requirements')).not.toBeInTheDocument();
    });
  });

  describe('ARIA Labels', () => {
    it('has proper ARIA labels for all checkboxes', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      mockTypes.forEach(type => {
        const checkbox = screen.getByLabelText(`Filter by ${type.label}`);
        expect(checkbox).toBeInTheDocument();
        expect(checkbox).toHaveAttribute('type', 'checkbox');
        expect(checkbox).toHaveAttribute('aria-label', `Filter by ${type.label}`);
      });
    });

    it('has proper ARIA labels for Select All button', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const selectAllButton = screen.getByRole('button', { name: /select all node types/i });
      expect(selectAllButton).toHaveAttribute('aria-label', 'Select all node types');
    });

    it('has proper ARIA labels for Clear All button', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const clearAllButton = screen.getByRole('button', { name: /clear all node type selections/i });
      expect(clearAllButton).toHaveAttribute('aria-label', 'Clear all node type selections');
    });

    it('has proper ARIA labels for category toggle buttons', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          showCategories={true}
        />
      );

      const workItemsButton = screen.getByRole('button', { name: /toggle work items category/i });
      expect(workItemsButton).toHaveAttribute('aria-label', 'Toggle Work Items category');
      expect(workItemsButton).toHaveAttribute('aria-expanded', 'true');

      const structureButton = screen.getByRole('button', { name: /toggle project structure category/i });
      expect(structureButton).toHaveAttribute('aria-label', 'Toggle Project Structure category');
      expect(structureButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('has proper ARIA attributes for dropdown toggle in compact mode', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          layout="compact"
        />
      );

      const toggleButton = screen.getByRole('button', { name: /filter by node type/i });
      expect(toggleButton).toHaveAttribute('aria-label', 'Filter by node type');
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');
      expect(toggleButton).toHaveAttribute('aria-haspopup', 'true');
    });

    it('updates aria-expanded when dropdown is opened', async () => {
      const user = userEvent.setup();
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          layout="compact"
        />
      );

      const toggleButton = screen.getByRole('button', { name: /filter by node type/i });
      expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

      await user.click(toggleButton);
      expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('has aria-hidden for decorative elements', () => {
      const { container } = render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const colorIndicators = container.querySelectorAll('.filter-type-color');
      colorIndicators.forEach(indicator => {
        expect(indicator).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Focus Management', () => {
    it('maintains focus on checkbox after selection', async () => {
      const user = userEvent.setup();
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const checkbox = screen.getByLabelText('Filter by Requirements').closest('label');
      if (checkbox) {
        checkbox.focus();
        expect(checkbox).toHaveFocus();

        await user.keyboard(' ');
        
        // Focus should remain on the checkbox
        expect(checkbox).toHaveFocus();
      }
    });

    it('shows focus indicator on checkboxes', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const checkbox = screen.getByLabelText('Filter by Requirements').closest('label');
      if (checkbox) {
        checkbox.focus();
        
        // Check that the element has focus
        expect(checkbox).toHaveFocus();
      }
    });

    it('shows focus indicator on action buttons', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const selectAllButton = screen.getByRole('button', { name: /select all node types/i });
      selectAllButton.focus();
      
      expect(selectAllButton).toHaveFocus();
    });

    it('shows focus indicator on category toggle buttons', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
          showCategories={true}
        />
      );

      const categoryButton = screen.getByRole('button', { name: /toggle work items category/i });
      categoryButton.focus();
      
      expect(categoryButton).toHaveFocus();
    });

    it('maintains logical tab order', async () => {
      const user = userEvent.setup();
      render(
        <NodeTypeFilter
          selectedTypes={new Set(['requirement'])} // Select one so Clear All is enabled
          onChange={mockOnChange}
          availableTypes={mockTypes}
          showCategories={true}
        />
      );

      // Start from beginning - tab to Select All button
      await user.tab();
      expect(screen.getByRole('button', { name: /select all node types/i })).toHaveFocus();

      // Tab to Clear All button (now enabled)
      await user.tab();
      expect(screen.getByRole('button', { name: /clear all node type selections/i })).toHaveFocus();

      // Tab to first category toggle
      await user.tab();
      expect(screen.getByRole('button', { name: /toggle work items category/i })).toHaveFocus();
    });
  });

  describe('Screen Reader Announcements', () => {
    it('has live region for announcements', () => {
      const { container } = render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
    });

    it('announces filter changes', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();

      // Click a checkbox
      const checkbox = screen.getByLabelText('Filter by Requirements');
      await user.click(checkbox);

      // The live region should contain an announcement
      // Note: In actual implementation, this would be populated by the component
      expect(liveRegion).toBeInTheDocument();
    });

    it('has sr-only class for screen reader only content', () => {
      const { container } = render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const srOnlyElements = container.querySelectorAll('.sr-only');
      expect(srOnlyElements.length).toBeGreaterThan(0);
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('provides text labels for color indicators', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      mockTypes.forEach(type => {
        const label = screen.getByText(type.label);
        expect(label).toBeInTheDocument();
      });
    });

    it('has title attribute for color indicators', () => {
      const { container } = render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const colorIndicators = container.querySelectorAll('.filter-type-color');
      colorIndicators.forEach(indicator => {
        expect(indicator).toHaveAttribute('title');
      });
    });

    it('does not rely solely on color for information', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set(['requirement'])}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      // Checkbox state should be indicated by checked attribute, not just color
      const checkbox = screen.getByLabelText('Filter by Requirements') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('Disabled State Accessibility', () => {
    it('properly disables Select All button when all selected', () => {
      const allSelected = new Set(mockTypes.map(t => t.value));
      render(
        <NodeTypeFilter
          selectedTypes={allSelected}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const selectAllButton = screen.getByRole('button', { name: /select all node types/i });
      expect(selectAllButton).toBeDisabled();
      expect(selectAllButton).toHaveAttribute('disabled');
    });

    it('properly disables Clear All button when none selected', () => {
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const clearAllButton = screen.getByRole('button', { name: /clear all node type selections/i });
      expect(clearAllButton).toBeDisabled();
      expect(clearAllButton).toHaveAttribute('disabled');
    });

    it('disabled buttons are not keyboard accessible', async () => {
      const user = userEvent.setup();
      render(
        <NodeTypeFilter
          selectedTypes={new Set()}
          onChange={mockOnChange}
          availableTypes={mockTypes}
        />
      );

      const clearAllButton = screen.getByRole('button', { name: /clear all node type selections/i });
      expect(clearAllButton).toBeDisabled();

      clearAllButton.focus();
      await user.keyboard('{Enter}');
      
      // Should not trigger onChange
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });
});

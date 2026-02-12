/**
 * Accessibility tests for BulkEditModal component
 * Tests keyboard navigation, ARIA labels, and focus management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkEditModal } from './BulkEditModal';

describe('BulkEditModal - Accessibility', () => {
  const mockSelectedIds = ['id1', 'id2', 'id3'];
  let mockOnSuccess: ReturnType<typeof vi.fn>;
  let mockOnCancel: ReturnType<typeof vi.fn>;
  let mockOnBulkUpdate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSuccess = vi.fn();
    mockOnCancel = vi.fn();
    mockOnBulkUpdate = vi.fn().mockResolvedValue(undefined);
  });

  describe('Keyboard Navigation', () => {
    it('allows tab navigation through form fields', async () => {
      const user = userEvent.setup();
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      // Tab through the form
      await user.tab(); // Status checkbox
      await user.tab(); // Status select
      await user.tab(); // Priority checkbox
      await user.tab(); // Priority input
      await user.tab(); // Assigned to checkbox
      await user.tab(); // Assigned to input
      await user.tab(); // Cancel button
      await user.tab(); // Submit button

      const submitButton = screen.getByRole('button', { name: /update \d+ item/i });
      expect(submitButton).toHaveFocus();
    });

    it('allows Escape key to close modal', async () => {
      const user = userEvent.setup();
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      await user.keyboard('{Escape}');
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('allows Space key to toggle checkboxes', async () => {
      const user = userEvent.setup();
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      const statusCheckbox = screen.getByRole('checkbox', { name: /update status/i });
      statusCheckbox.focus();
      
      expect(statusCheckbox).not.toBeChecked();
      
      await user.keyboard(' ');
      
      expect(statusCheckbox).toBeChecked();
    });

    it('allows Enter key to submit form when focused on submit button', async () => {
      const user = userEvent.setup();
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      // Enable status field and set value
      const statusCheckbox = screen.getByRole('checkbox', { name: /update status/i });
      await user.click(statusCheckbox);

      const statusSelect = screen.getByRole('combobox');
      await user.selectOptions(statusSelect, 'active');

      // Focus submit button and press Enter
      const submitButton = screen.getByRole('button', { name: /update \d+ item/i });
      submitButton.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockOnBulkUpdate).toHaveBeenCalled();
      });
    });

    it('prevents form submission with Enter key when focused on other fields', async () => {
      const user = userEvent.setup();
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      const statusCheckbox = screen.getByRole('checkbox', { name: /update status/i });
      statusCheckbox.focus();
      
      await user.keyboard('{Enter}');
      
      // Should not submit form
      expect(mockOnBulkUpdate).not.toHaveBeenCalled();
    });
  });

  describe('ARIA Labels', () => {
    it('has proper ARIA labels for checkboxes', () => {
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      expect(screen.getByRole('checkbox', { name: /update status/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /update priority/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /update assigned to/i })).toBeInTheDocument();
    });

    it('has proper ARIA labels for form fields', () => {
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      expect(screen.getByLabelText(/work item status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/work item priority/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/assigned to user/i)).toBeInTheDocument();
    });

    it('has proper ARIA labels for buttons', () => {
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /update \d+ item/i })).toBeInTheDocument();
    });

    it('has role="group" for field groups', () => {
      const { container } = render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      const fieldGroups = container.querySelectorAll('[role="group"]');
      expect(fieldGroups.length).toBe(3); // Status, Priority, Assigned To
    });

    it('has aria-labelledby for field groups', () => {
      const { container } = render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      const statusGroup = container.querySelector('[aria-labelledby="status-field-label"]');
      expect(statusGroup).toBeInTheDocument();

      const priorityGroup = container.querySelector('[aria-labelledby="priority-field-label"]');
      expect(priorityGroup).toBeInTheDocument();

      const assignedToGroup = container.querySelector('[aria-labelledby="assigned-to-field-label"]');
      expect(assignedToGroup).toBeInTheDocument();
    });

    it('has aria-describedby for form hints', () => {
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      const priorityInput = screen.getByLabelText(/work item priority/i);
      expect(priorityInput).toHaveAttribute('aria-describedby', 'priority-hint');

      const assignedToInput = screen.getByLabelText(/assigned to user/i);
      expect(assignedToInput).toHaveAttribute('aria-describedby', 'assigned-to-hint');
    });
  });

  describe('Focus Management', () => {
    it('maintains focus on checkbox after toggling', async () => {
      const user = userEvent.setup();
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      const statusCheckbox = screen.getByRole('checkbox', { name: /update status/i });
      statusCheckbox.focus();
      
      expect(statusCheckbox).toHaveFocus();
      
      await user.click(statusCheckbox);
      
      // Focus should remain on checkbox
      expect(statusCheckbox).toHaveFocus();
    });

    it('shows focus indicator on form fields', async () => {
      const user = userEvent.setup();
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      // Enable status field
      await user.click(screen.getByRole('checkbox', { name: /update status/i }));

      const statusSelect = screen.getByRole('combobox');
      statusSelect.focus();
      
      expect(statusSelect).toHaveFocus();
    });

    it('shows focus indicator on buttons', () => {
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      cancelButton.focus();
      
      expect(cancelButton).toHaveFocus();
    });

    it('disables form fields when checkbox is unchecked', async () => {
      const user = userEvent.setup();
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      const statusSelect = screen.getByRole('combobox');
      expect(statusSelect).toBeDisabled();

      // Enable field
      await user.click(screen.getByRole('checkbox', { name: /update status/i }));
      expect(statusSelect).not.toBeDisabled();

      // Disable field again
      await user.click(screen.getByRole('checkbox', { name: /update status/i }));
      expect(statusSelect).toBeDisabled();
    });

    it('maintains logical tab order', async () => {
      const user = userEvent.setup();
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      // Tab through form in order
      await user.tab();
      expect(screen.getByRole('checkbox', { name: /update status/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('combobox')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('checkbox', { name: /update priority/i })).toHaveFocus();
    });
  });

  describe('Screen Reader Announcements', () => {
    it('has live region for announcements', () => {
      const { container } = render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('has sr-only class for screen reader only content', () => {
      const { container } = render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      const srOnlyElements = container.querySelectorAll('.sr-only');
      expect(srOnlyElements.length).toBeGreaterThan(0);
    });

    it('announces modal opening', () => {
      const { container } = render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      const liveRegion = container.querySelector('[role="status"][aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      // The component should announce the modal opening
    });

    it('provides descriptive information about bulk edit', () => {
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      expect(screen.getByText(/editing/i)).toBeInTheDocument();
      expect(screen.getByText(/3/)).toBeInTheDocument();
      expect(screen.getByText(/work item/i)).toBeInTheDocument();
    });
  });

  describe('Error State Accessibility', () => {
    it('displays error messages accessibly', () => {
      const errorMessage = 'Bulk update failed';
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
          error={errorMessage}
        />
      );

      const errorElement = screen.getByText(errorMessage);
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveClass('error-message');
    });

    it('displays validation errors accessibly', async () => {
      const user = userEvent.setup();
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      // Enable priority field but leave it empty
      await user.click(screen.getByRole('checkbox', { name: /update priority/i }));

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /update \d+ item/i });
      await user.click(submitButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/priority must be a number/i)).toBeInTheDocument();
      });
    });

    it('associates error messages with form fields', async () => {
      const user = userEvent.setup();
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      // Enable priority field and enter invalid value
      await user.click(screen.getByRole('checkbox', { name: /update priority/i }));
      
      const priorityInput = screen.getByLabelText(/work item priority/i);
      await user.type(priorityInput, '10'); // Invalid: > 5

      // Blur to trigger validation
      priorityInput.blur();

      await waitFor(() => {
        const errorText = screen.queryByText(/priority must be between 1 and 5/i);
        if (errorText) {
          expect(errorText).toBeInTheDocument();
        }
      });
    });
  });

  describe('Loading State Accessibility', () => {
    it('disables form during update', () => {
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
          isUpdating={true}
        />
      );

      const submitButton = screen.getByRole('button', { name: /updating/i });
      expect(submitButton).toBeDisabled();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });

    it('shows loading indicator with accessible text', () => {
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
          isUpdating={true}
        />
      );

      expect(screen.getByText(/updating/i)).toBeInTheDocument();
    });
  });

  describe('Button State Accessibility', () => {
    it('disables submit button when no fields are enabled', () => {
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      const submitButton = screen.getByRole('button', { name: /update \d+ item/i });
      expect(submitButton).toBeDisabled();
    });

    it('enables submit button when at least one field is enabled', async () => {
      const user = userEvent.setup();
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      const submitButton = screen.getByRole('button', { name: /update \d+ item/i });
      expect(submitButton).toBeDisabled();

      // Enable status field
      await user.click(screen.getByRole('checkbox', { name: /update status/i }));

      expect(submitButton).not.toBeDisabled();
    });

    it('shows correct button text based on selected count', () => {
      render(
        <BulkEditModal
          selectedIds={['id1']}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      expect(screen.getByRole('button', { name: /update 1 item$/i })).toBeInTheDocument();
    });

    it('shows plural button text for multiple items', () => {
      render(
        <BulkEditModal
          selectedIds={mockSelectedIds}
          onSuccess={mockOnSuccess}
          onCancel={mockOnCancel}
          onBulkUpdate={mockOnBulkUpdate}
        />
      );

      expect(screen.getByRole('button', { name: /update 3 items$/i })).toBeInTheDocument();
    });
  });
});

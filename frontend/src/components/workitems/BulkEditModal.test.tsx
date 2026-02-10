/**
 * BulkEditModal component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkEditModal } from './BulkEditModal';
import type { BulkUpdateData } from '../../services/workitemService';

describe('BulkEditModal', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnBulkUpdate = vi.fn();

  const defaultProps = {
    selectedIds: ['id1', 'id2', 'id3'],
    onSuccess: mockOnSuccess,
    onCancel: mockOnCancel,
    onBulkUpdate: mockOnBulkUpdate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal with correct title', () => {
      render(<BulkEditModal {...defaultProps} />);
      expect(screen.getByText('Bulk Edit Work Items')).toBeInTheDocument();
    });

    it('should display count of selected items', () => {
      render(<BulkEditModal {...defaultProps} />);
      expect(screen.getByText(/Editing/)).toBeInTheDocument();
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Editing 3 work items';
      })).toBeInTheDocument();
    });

    it('should render all field groups with checkboxes', () => {
      render(<BulkEditModal {...defaultProps} />);
      
      expect(screen.getByLabelText('Update Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Update Priority')).toBeInTheDocument();
      expect(screen.getByLabelText('Update Assigned To')).toBeInTheDocument();
    });

    it('should render cancel and submit buttons', () => {
      render(<BulkEditModal {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Update 3 Items/i })).toBeInTheDocument();
    });

    it('should display singular form for single item', () => {
      render(<BulkEditModal {...defaultProps} selectedIds={['id1']} />);
      
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Editing 1 work item';
      })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Update 1 Item$/i })).toBeInTheDocument();
    });
  });

  describe('Field Enable/Disable', () => {
    it('should disable fields by default', () => {
      render(<BulkEditModal {...defaultProps} />);
      
      const statusSelect = screen.getByRole('combobox');
      const priorityInput = screen.getByPlaceholderText('1-5');
      const assignedToInput = screen.getByPlaceholderText('User ID or email');
      
      expect(statusSelect).toBeDisabled();
      expect(priorityInput).toBeDisabled();
      expect(assignedToInput).toBeDisabled();
    });

    it('should enable field when checkbox is checked', () => {
      render(<BulkEditModal {...defaultProps} />);
      
      const statusCheckbox = screen.getByLabelText('Update Status');
      const statusSelect = screen.getByRole('combobox');
      
      expect(statusSelect).toBeDisabled();
      
      fireEvent.click(statusCheckbox);
      
      expect(statusSelect).not.toBeDisabled();
    });

    it('should disable field when checkbox is unchecked', () => {
      render(<BulkEditModal {...defaultProps} />);
      
      const statusCheckbox = screen.getByLabelText('Update Status');
      const statusSelect = screen.getByRole('combobox');
      
      // Enable field
      fireEvent.click(statusCheckbox);
      expect(statusSelect).not.toBeDisabled();
      
      // Disable field
      fireEvent.click(statusCheckbox);
      expect(statusSelect).toBeDisabled();
    });

    it('should disable submit button when no fields are enabled', () => {
      render(<BulkEditModal {...defaultProps} />);
      
      const submitButton = screen.getByRole('button', { name: /Update 3 Items/i });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when at least one field is enabled', () => {
      render(<BulkEditModal {...defaultProps} />);
      
      const statusCheckbox = screen.getByLabelText('Update Status');
      const submitButton = screen.getByRole('button', { name: /Update 3 Items/i });
      
      expect(submitButton).toBeDisabled();
      
      fireEvent.click(statusCheckbox);
      
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Form Validation', () => {
    it('should show error when status field is enabled but empty', async () => {
      render(<BulkEditModal {...defaultProps} />);
      
      const statusCheckbox = screen.getByLabelText('Update Status');
      fireEvent.click(statusCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /Update 3 Items/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Status is required when enabled/i)).toBeInTheDocument();
      });
      
      expect(mockOnBulkUpdate).not.toHaveBeenCalled();
    });

    it('should show error when priority is not a number', async () => {
      render(<BulkEditModal {...defaultProps} />);
      
      const priorityCheckbox = screen.getByLabelText('Update Priority');
      fireEvent.click(priorityCheckbox);
      
      const priorityInput = screen.getByPlaceholderText('1-5');
      fireEvent.change(priorityInput, { target: { value: 'abc' } });
      
      const submitButton = screen.getByRole('button', { name: /Update 3 Items/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Priority must be a number/i)).toBeInTheDocument();
      });
      
      expect(mockOnBulkUpdate).not.toHaveBeenCalled();
    });

    it('should show error when priority is out of range', async () => {
      render(<BulkEditModal {...defaultProps} />);
      
      const priorityCheckbox = screen.getByLabelText('Update Priority');
      fireEvent.click(priorityCheckbox);
      
      const priorityInput = screen.getByPlaceholderText('1-5') as HTMLInputElement;
      
      // Test with value 0 (below minimum)
      fireEvent.change(priorityInput, { target: { value: '0' } });
      fireEvent.blur(priorityInput);
      
      const submitButton = screen.getByRole('button', { name: /Update 3 Items/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        const errorText = screen.queryByText(/Priority must be between 1 and 5/i);
        expect(errorText).toBeInTheDocument();
      });
      
      expect(mockOnBulkUpdate).not.toHaveBeenCalled();
    });

    it('should show error when assigned_to field is enabled but empty', async () => {
      render(<BulkEditModal {...defaultProps} />);
      
      const assignedToCheckbox = screen.getByLabelText('Update Assigned To');
      fireEvent.click(assignedToCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /Update 3 Items/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Assigned to is required when enabled/i)).toBeInTheDocument();
      });
      
      expect(mockOnBulkUpdate).not.toHaveBeenCalled();
    });

    it('should clear validation error when field value changes', async () => {
      render(<BulkEditModal {...defaultProps} />);
      
      const statusCheckbox = screen.getByLabelText('Update Status');
      fireEvent.click(statusCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /Update 3 Items/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Status is required when enabled/i)).toBeInTheDocument();
      });
      
      const statusSelect = screen.getByRole('combobox');
      fireEvent.change(statusSelect, { target: { value: 'active' } });
      
      await waitFor(() => {
        expect(screen.queryByText(/Status is required when enabled/i)).not.toBeInTheDocument();
      });
    });

    it('should clear validation error when field is disabled', async () => {
      render(<BulkEditModal {...defaultProps} />);
      
      const statusCheckbox = screen.getByLabelText('Update Status');
      fireEvent.click(statusCheckbox);
      
      const submitButton = screen.getByRole('button', { name: /Update 3 Items/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Status is required when enabled/i)).toBeInTheDocument();
      });
      
      // Disable the field
      fireEvent.click(statusCheckbox);
      
      await waitFor(() => {
        expect(screen.queryByText(/Status is required when enabled/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onBulkUpdate with correct data when form is valid', async () => {
      mockOnBulkUpdate.mockResolvedValue(undefined);
      
      render(<BulkEditModal {...defaultProps} />);
      
      // Enable and fill status field
      const statusCheckbox = screen.getByLabelText('Update Status');
      fireEvent.click(statusCheckbox);
      
      const statusSelect = screen.getByRole('combobox');
      fireEvent.change(statusSelect, { target: { value: 'active' } });
      
      const submitButton = screen.getByRole('button', { name: /Update 3 Items/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnBulkUpdate).toHaveBeenCalledWith({
          status: 'active',
        });
      });
    });

    it('should call onBulkUpdate with multiple fields', async () => {
      mockOnBulkUpdate.mockResolvedValue(undefined);
      
      render(<BulkEditModal {...defaultProps} />);
      
      // Enable and fill status field
      const statusCheckbox = screen.getByLabelText('Update Status');
      fireEvent.click(statusCheckbox);
      const statusSelect = screen.getByRole('combobox');
      fireEvent.change(statusSelect, { target: { value: 'completed' } });
      
      // Enable and fill priority field
      const priorityCheckbox = screen.getByLabelText('Update Priority');
      fireEvent.click(priorityCheckbox);
      const priorityInput = screen.getByPlaceholderText('1-5');
      fireEvent.change(priorityInput, { target: { value: '2' } });
      
      // Enable and fill assigned_to field
      const assignedToCheckbox = screen.getByLabelText('Update Assigned To');
      fireEvent.click(assignedToCheckbox);
      const assignedToInput = screen.getByPlaceholderText('User ID or email');
      fireEvent.change(assignedToInput, { target: { value: 'user@example.com' } });
      
      const submitButton = screen.getByRole('button', { name: /Update 3 Items/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnBulkUpdate).toHaveBeenCalledWith({
          status: 'completed',
          priority: 2,
          assigned_to: 'user@example.com',
        });
      });
    });

    it('should call onSuccess after successful update', async () => {
      mockOnBulkUpdate.mockResolvedValue(undefined);
      
      render(<BulkEditModal {...defaultProps} />);
      
      const statusCheckbox = screen.getByLabelText('Update Status');
      fireEvent.click(statusCheckbox);
      
      const statusSelect = screen.getByRole('combobox');
      fireEvent.change(statusSelect, { target: { value: 'active' } });
      
      const submitButton = screen.getByRole('button', { name: /Update 3 Items/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should not call onSuccess if update fails', async () => {
      mockOnBulkUpdate.mockRejectedValue(new Error('Update failed'));
      
      render(<BulkEditModal {...defaultProps} />);
      
      const statusCheckbox = screen.getByLabelText('Update Status');
      fireEvent.click(statusCheckbox);
      
      const statusSelect = screen.getByRole('combobox');
      fireEvent.change(statusSelect, { target: { value: 'active' } });
      
      const submitButton = screen.getByRole('button', { name: /Update 3 Items/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnBulkUpdate).toHaveBeenCalled();
      });
      
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should only include enabled fields in update data', async () => {
      mockOnBulkUpdate.mockResolvedValue(undefined);
      
      render(<BulkEditModal {...defaultProps} />);
      
      // Enable status but not priority or assigned_to
      const statusCheckbox = screen.getByLabelText('Update Status');
      fireEvent.click(statusCheckbox);
      
      const statusSelect = screen.getByRole('combobox');
      fireEvent.change(statusSelect, { target: { value: 'active' } });
      
      // Fill priority and assigned_to but don't enable them
      const priorityInput = screen.getByPlaceholderText('1-5');
      fireEvent.change(priorityInput, { target: { value: '3' } });
      
      const assignedToInput = screen.getByPlaceholderText('User ID or email');
      fireEvent.change(assignedToInput, { target: { value: 'user@example.com' } });
      
      const submitButton = screen.getByRole('button', { name: /Update 3 Items/i });
      fireEvent.click(submitButton);
      
      await waitFor(() => {
        expect(mockOnBulkUpdate).toHaveBeenCalledWith({
          status: 'active',
          // priority and assigned_to should not be included
        });
      });
      
      const callArg = mockOnBulkUpdate.mock.calls[0][0] as BulkUpdateData;
      expect(callArg).not.toHaveProperty('priority');
      expect(callArg).not.toHaveProperty('assigned_to');
    });
  });

  describe('Loading State', () => {
    it('should show loading state when isUpdating is true', () => {
      render(<BulkEditModal {...defaultProps} isUpdating={true} />);
      
      expect(screen.getByText('Updating...')).toBeInTheDocument();
    });

    it('should disable buttons when isUpdating is true', () => {
      render(<BulkEditModal {...defaultProps} isUpdating={true} />);
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      const submitButton = screen.getByRole('button', { name: /Updating/i });
      
      expect(cancelButton).toBeDisabled();
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Error Display', () => {
    it('should display error message when error prop is provided', () => {
      render(<BulkEditModal {...defaultProps} error="Update failed" />);
      
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });

    it('should not display error message when error prop is null', () => {
      render(<BulkEditModal {...defaultProps} error={null} />);
      
      expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
    });
  });

  describe('Cancel Handling', () => {
    it('should call onCancel when cancel button is clicked', () => {
      render(<BulkEditModal {...defaultProps} />);
      
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should call onCancel when modal close is triggered', () => {
      render(<BulkEditModal {...defaultProps} />);
      
      // Modal component should have a close button or overlay click
      // This depends on the Modal component implementation
      // For now, we test the cancel button which is the primary way to close
      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('Form Reset', () => {
    it('should reset form when selectedIds change', () => {
      const { rerender } = render(<BulkEditModal {...defaultProps} />);
      
      // Enable and fill a field
      const statusCheckbox = screen.getByLabelText('Update Status');
      fireEvent.click(statusCheckbox);
      
      const statusSelect = screen.getByRole('combobox');
      fireEvent.change(statusSelect, { target: { value: 'active' } });
      
      expect(statusSelect).toHaveValue('active');
      
      // Change selectedIds
      rerender(<BulkEditModal {...defaultProps} selectedIds={['id4', 'id5']} />);
      
      // Form should be reset
      expect(statusSelect).toHaveValue('');
      expect(statusCheckbox).not.toBeChecked();
    });
  });
});

/**
 * WorkItemForm component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkItemForm } from './WorkItemForm';
import { useWorkItemStore } from '../../stores/workitemStore';
import type { WorkItem } from '../../services/workitemService';

// Mock the store
vi.mock('../../stores/workitemStore', () => ({
  useWorkItemStore: vi.fn(),
}));

const mockWorkItem: WorkItem = {
  id: '1',
  type: 'requirement',
  title: 'Test Requirement',
  description: 'Test description',
  status: 'draft',
  priority: 2,
  assigned_to: 'user-1',
  version: '1.0',
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_signed: false,
};

const mockStoreState = {
  createItem: vi.fn(),
  updateItem: vi.fn(),
  isSaving: false,
  error: null,
  clearError: vi.fn(),
};

describe('WorkItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkItemStore).mockReturnValue(mockStoreState);
  });

  describe('Create mode', () => {
    it('should render create form', () => {
      render(<WorkItemForm />);

      expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
      expect(screen.getByText('Create Work Item')).toBeInTheDocument();
    });

    it('should show type selector in create mode', () => {
      render(<WorkItemForm />);

      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    });

    it('should use default type when provided', () => {
      render(<WorkItemForm defaultType="task" />);

      const typeSelect = screen.getByLabelText(/type/i) as HTMLSelectElement;
      expect(typeSelect.value).toBe('task');
    });

    it('should validate required fields', async () => {
      const user = userEvent.setup();
      render(<WorkItemForm />);

      // Touch the title field and leave it empty
      const titleInput = screen.getByLabelText(/title/i);
      await user.click(titleInput);
      await user.tab(); // Blur to trigger validation

      // Title is required
      expect(screen.getByText('Title is required')).toBeInTheDocument();
    });

    it('should call createItem on submit', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      mockStoreState.createItem.mockResolvedValue(mockWorkItem);

      render(<WorkItemForm onSuccess={onSuccess} />);

      await user.type(screen.getByLabelText(/title/i), 'New Requirement');
      await user.type(screen.getByLabelText(/description/i), 'New description');
      await user.click(screen.getByText('Create Work Item'));

      await waitFor(() => {
        expect(mockStoreState.createItem).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'requirement',
            title: 'New Requirement',
            description: 'New description',
          })
        );
      });

      expect(onSuccess).toHaveBeenCalledWith(mockWorkItem);
    });
  });

  describe('Edit mode', () => {
    it('should render edit form with existing values', () => {
      render(<WorkItemForm item={mockWorkItem} />);

      expect(screen.getByLabelText(/title/i)).toHaveValue('Test Requirement');
      expect(screen.getByLabelText(/description/i)).toHaveValue('Test description');
      expect(screen.getByText('Update Work Item')).toBeInTheDocument();
    });

    it('should not show type selector in edit mode', () => {
      render(<WorkItemForm item={mockWorkItem} />);

      expect(screen.queryByLabelText(/type/i)).not.toBeInTheDocument();
    });

    it('should call updateItem on submit', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      const updatedItem = { ...mockWorkItem, title: 'Updated Title' };
      mockStoreState.updateItem.mockResolvedValue(updatedItem);

      render(<WorkItemForm item={mockWorkItem} onSuccess={onSuccess} />);

      const titleInput = screen.getByLabelText(/title/i);
      await user.clear(titleInput);
      await user.type(titleInput, 'Updated Title');
      await user.click(screen.getByText('Update Work Item'));

      await waitFor(() => {
        expect(mockStoreState.updateItem).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            title: 'Updated Title',
          })
        );
      });

      expect(onSuccess).toHaveBeenCalledWith(updatedItem);
    });
  });

  describe('Form interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(<WorkItemForm onCancel={onCancel} />);

      await user.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalled();
    });

    it('should show loading state when saving', () => {
      vi.mocked(useWorkItemStore).mockReturnValue({
        ...mockStoreState,
        isSaving: true,
      });

      render(<WorkItemForm />);

      expect(screen.getByText('Create Work Item').closest('button')).toBeDisabled();
    });

    it('should show error message', () => {
      vi.mocked(useWorkItemStore).mockReturnValue({
        ...mockStoreState,
        error: 'Failed to save',
      });

      render(<WorkItemForm />);

      expect(screen.getByText('Failed to save')).toBeInTheDocument();
    });

    it('should clear error on unmount', () => {
      const { unmount } = render(<WorkItemForm />);

      unmount();

      expect(mockStoreState.clearError).toHaveBeenCalled();
    });
  });

  describe('Validation', () => {
    it('should validate title length', async () => {
      const user = userEvent.setup();
      render(<WorkItemForm />);

      const titleInput = screen.getByLabelText(/title/i);
      // Type a long string
      await user.click(titleInput);
      fireEvent.change(titleInput, { target: { value: 'a'.repeat(501) } });
      await user.tab(); // Trigger blur

      expect(screen.getByText('Title must be 500 characters or less')).toBeInTheDocument();
    });

    it('should clear field error when user types', async () => {
      const user = userEvent.setup();
      render(<WorkItemForm />);

      // Touch the title field to trigger validation
      const titleInput = screen.getByLabelText(/title/i);
      await user.click(titleInput);
      await user.tab(); // Blur to trigger validation
      
      expect(screen.getByText('Title is required')).toBeInTheDocument();

      // Type in the field
      await user.click(titleInput);
      await user.type(titleInput, 'New title');

      // Error should be cleared
      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    });
  });
});

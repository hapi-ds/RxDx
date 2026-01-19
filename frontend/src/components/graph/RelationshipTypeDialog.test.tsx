/**
 * RelationshipTypeDialog Component Tests
 * Tests for the relationship type selection dialog
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  RelationshipTypeDialog,
  RELATIONSHIP_TYPES,
  type PendingConnection,
} from './RelationshipTypeDialog';

describe('RelationshipTypeDialog', () => {
  const mockConnection: PendingConnection = {
    sourceId: 'node-1',
    targetId: 'node-2',
    sourceLabel: 'Requirement A',
    targetLabel: 'Task B',
  };

  const defaultProps = {
    isOpen: true,
    connection: mockConnection,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      render(<RelationshipTypeDialog {...defaultProps} isOpen={false} />);
      expect(screen.queryByTestId('relationship-dialog')).not.toBeInTheDocument();
    });

    it('renders nothing when connection is null', () => {
      render(<RelationshipTypeDialog {...defaultProps} connection={null} />);
      expect(screen.queryByTestId('relationship-dialog')).not.toBeInTheDocument();
    });

    it('renders the dialog when open with a connection', () => {
      render(<RelationshipTypeDialog {...defaultProps} />);
      expect(screen.getByTestId('relationship-dialog')).toBeInTheDocument();
      expect(screen.getByText('Create Relationship')).toBeInTheDocument();
    });

    it('displays source and target node labels', () => {
      render(<RelationshipTypeDialog {...defaultProps} />);
      expect(screen.getByText('Requirement A')).toBeInTheDocument();
      expect(screen.getByText('Task B')).toBeInTheDocument();
    });

    it('displays node IDs when labels are not provided', () => {
      const connectionWithoutLabels: PendingConnection = {
        sourceId: 'node-1',
        targetId: 'node-2',
      };
      render(
        <RelationshipTypeDialog {...defaultProps} connection={connectionWithoutLabels} />
      );
      expect(screen.getByText('node-1')).toBeInTheDocument();
      expect(screen.getByText('node-2')).toBeInTheDocument();
    });

    it('renders all relationship type options', () => {
      render(<RelationshipTypeDialog {...defaultProps} />);
      const select = screen.getByTestId('relationship-type-select');
      
      RELATIONSHIP_TYPES.forEach((type) => {
        expect(select).toContainHTML(type.label);
      });
    });

    it('shows description for selected relationship type', () => {
      render(<RelationshipTypeDialog {...defaultProps} />);
      // Default selection is RELATES_TO
      expect(screen.getByTestId('relationship-type-description')).toHaveTextContent(
        'General relationship between items'
      );
    });
  });

  describe('Interaction', () => {
    it('calls onCancel when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<RelationshipTypeDialog {...defaultProps} />);
      
      await user.click(screen.getByTestId('relationship-dialog-close'));
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<RelationshipTypeDialog {...defaultProps} />);
      
      await user.click(screen.getByTestId('relationship-dialog-cancel'));
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when clicking overlay', async () => {
      const user = userEvent.setup();
      render(<RelationshipTypeDialog {...defaultProps} />);
      
      await user.click(screen.getByTestId('relationship-dialog-overlay'));
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('does not call onCancel when clicking inside dialog', async () => {
      const user = userEvent.setup();
      render(<RelationshipTypeDialog {...defaultProps} />);
      
      await user.click(screen.getByTestId('relationship-dialog'));
      expect(defaultProps.onCancel).not.toHaveBeenCalled();
    });

    it('calls onConfirm with default type when confirm is clicked', async () => {
      const user = userEvent.setup();
      render(<RelationshipTypeDialog {...defaultProps} />);
      
      await user.click(screen.getByTestId('relationship-dialog-confirm'));
      expect(defaultProps.onConfirm).toHaveBeenCalledWith('node-1', 'node-2', 'RELATES_TO');
    });

    it('allows selecting different relationship types', async () => {
      const user = userEvent.setup();
      render(<RelationshipTypeDialog {...defaultProps} />);
      
      const select = screen.getByTestId('relationship-type-select');
      await user.selectOptions(select, 'IMPLEMENTS');
      
      await user.click(screen.getByTestId('relationship-dialog-confirm'));
      expect(defaultProps.onConfirm).toHaveBeenCalledWith('node-1', 'node-2', 'IMPLEMENTS');
    });

    it('updates description when relationship type changes', async () => {
      const user = userEvent.setup();
      render(<RelationshipTypeDialog {...defaultProps} />);
      
      const select = screen.getByTestId('relationship-type-select');
      await user.selectOptions(select, 'TESTED_BY');
      
      expect(screen.getByTestId('relationship-type-description')).toHaveTextContent(
        'Requirement is tested by a test'
      );
    });
  });

  describe('Keyboard Navigation', () => {
    it('calls onCancel when Escape key is pressed', () => {
      render(<RelationshipTypeDialog {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('calls onConfirm when Enter key is pressed', () => {
      render(<RelationshipTypeDialog {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(defaultProps.onConfirm).toHaveBeenCalledWith('node-1', 'node-2', 'RELATES_TO');
    });

    it('does not call onConfirm on Enter when loading', () => {
      render(<RelationshipTypeDialog {...defaultProps} isLoading={true} />);
      
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(defaultProps.onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('shows loading state on confirm button', () => {
      render(<RelationshipTypeDialog {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('relationship-dialog-confirm')).toHaveTextContent('Creating...');
    });

    it('disables confirm button when loading', () => {
      render(<RelationshipTypeDialog {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('relationship-dialog-confirm')).toBeDisabled();
    });

    it('disables cancel button when loading', () => {
      render(<RelationshipTypeDialog {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('relationship-dialog-cancel')).toBeDisabled();
    });

    it('disables close button when loading', () => {
      render(<RelationshipTypeDialog {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('relationship-dialog-close')).toBeDisabled();
    });

    it('disables select when loading', () => {
      render(<RelationshipTypeDialog {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('relationship-type-select')).toBeDisabled();
    });

    it('does not close on overlay click when loading', async () => {
      const user = userEvent.setup();
      render(<RelationshipTypeDialog {...defaultProps} isLoading={true} />);
      
      await user.click(screen.getByTestId('relationship-dialog-overlay'));
      expect(defaultProps.onCancel).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<RelationshipTypeDialog {...defaultProps} />);
      
      const overlay = screen.getByTestId('relationship-dialog-overlay');
      expect(overlay).toHaveAttribute('role', 'dialog');
      expect(overlay).toHaveAttribute('aria-modal', 'true');
      expect(overlay).toHaveAttribute('aria-labelledby', 'relationship-dialog-title');
    });

    it('has accessible labels for buttons', () => {
      render(<RelationshipTypeDialog {...defaultProps} />);
      
      expect(screen.getByTestId('relationship-dialog-close')).toHaveAttribute('aria-label', 'Cancel');
    });

    it('has label for relationship type select', () => {
      render(<RelationshipTypeDialog {...defaultProps} />);
      
      const select = screen.getByTestId('relationship-type-select');
      expect(select).toHaveAttribute('id', 'relationship-type');
      expect(screen.getByLabelText('Relationship Type')).toBe(select);
    });
  });

  describe('Reset on Open', () => {
    it('resets to default type when dialog reopens', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<RelationshipTypeDialog {...defaultProps} />);
      
      // Change selection
      const select = screen.getByTestId('relationship-type-select');
      await user.selectOptions(select, 'DEPENDS_ON');
      expect(select).toHaveValue('DEPENDS_ON');
      
      // Close and reopen
      rerender(<RelationshipTypeDialog {...defaultProps} isOpen={false} />);
      rerender(<RelationshipTypeDialog {...defaultProps} isOpen={true} />);
      
      // Should be reset to default
      await waitFor(() => {
        expect(screen.getByTestId('relationship-type-select')).toHaveValue('RELATES_TO');
      });
    });
  });
});

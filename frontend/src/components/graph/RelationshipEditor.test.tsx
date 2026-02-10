/**
 * RelationshipEditor Component Tests
 * Tests for the relationship editing panel component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RelationshipEditor } from './RelationshipEditor';
import type { GraphEdge } from '../../services/graphService';

// Mock useGraphStore
vi.mock('../../stores/graphStore', () => ({
  useGraphStore: vi.fn(() => ({
    nodes: [
      {
        id: 'node1',
        type: 'requirement',
        position: { x: 0, y: 0 },
        data: { label: 'Source Node', type: 'requirement', properties: {} },
      },
      {
        id: 'node2',
        type: 'test',
        position: { x: 100, y: 100 },
        data: { label: 'Target Node', type: 'test', properties: {} },
      },
    ],
    isUpdating: false,
  })),
}));

describe('RelationshipEditor', () => {
  const mockRelationship: GraphEdge = {
    id: 'rel1',
    source: 'node1',
    target: 'node2',
    type: 'TESTED_BY',
    label: 'Tested By',
    properties: { weight: 5 },
  };

  const mockOnUpdate = vi.fn();
  const mockOnDelete = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders relationship details', () => {
    render(
      <RelationshipEditor
        relationship={mockRelationship}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Relationship Details')).toBeInTheDocument();
    expect(screen.getByText('Source Node')).toBeInTheDocument();
    expect(screen.getByText('Target Node')).toBeInTheDocument();
  });

  it('displays relationship type in dropdown', () => {
    render(
      <RelationshipEditor
        relationship={mockRelationship}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    const select = screen.getByLabelText('Relationship Type:') as HTMLSelectElement;
    expect(select.value).toBe('TESTED_BY');
  });

  it('displays relationship properties', () => {
    render(
      <RelationshipEditor
        relationship={mockRelationship}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Properties:')).toBeInTheDocument();
    expect(screen.getByText('weight:')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('enables save button when type is changed', async () => {
    render(
      <RelationshipEditor
        relationship={mockRelationship}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    const select = screen.getByLabelText('Relationship Type:');
    const saveButton = screen.getByText('Save Changes');

    // Initially disabled
    expect(saveButton).toBeDisabled();

    // Change type
    fireEvent.change(select, { target: { value: 'DEPENDS_ON' } });

    // Should be enabled
    await waitFor(() => {
      expect(saveButton).not.toBeDisabled();
    });
  });

  it('calls onUpdate when save button is clicked', async () => {
    mockOnUpdate.mockResolvedValue(undefined);

    render(
      <RelationshipEditor
        relationship={mockRelationship}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    const select = screen.getByLabelText('Relationship Type:');
    const saveButton = screen.getByText('Save Changes');

    // Change type
    fireEvent.change(select, { target: { value: 'DEPENDS_ON' } });

    // Click save
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('rel1', 'DEPENDS_ON');
    });
  });

  it('shows delete confirmation dialog when delete button is clicked', () => {
    render(
      <RelationshipEditor
        relationship={mockRelationship}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    const deleteButton = screen.getByText('Delete Relationship');
    fireEvent.click(deleteButton);

    expect(screen.getByText('Confirm Delete')).toBeInTheDocument();
    expect(screen.getByText(/Are you sure you want to delete this relationship/)).toBeInTheDocument();
  });

  it('calls onDelete when delete is confirmed', async () => {
    mockOnDelete.mockResolvedValue(undefined);

    render(
      <RelationshipEditor
        relationship={mockRelationship}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete Relationship');
    fireEvent.click(deleteButton);

    // Confirm delete - get all buttons and find the one in the dialog
    const buttons = screen.getAllByRole('button');
    const confirmButton = buttons.find((btn) => btn.textContent === 'Delete');
    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith('rel1');
    });
  });

  it('cancels delete when cancel button is clicked', () => {
    render(
      <RelationshipEditor
        relationship={mockRelationship}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete Relationship');
    fireEvent.click(deleteButton);

    // Cancel delete
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Dialog should be closed
    expect(screen.queryByText('Confirm Delete')).not.toBeInTheDocument();
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('calls onClose when close button is clicked', () => {
    render(
      <RelationshipEditor
        relationship={mockRelationship}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    const closeButton = screen.getByLabelText('Close relationship editor');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows error message when update fails', async () => {
    mockOnUpdate.mockRejectedValue(new Error('Update failed'));

    render(
      <RelationshipEditor
        relationship={mockRelationship}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    const select = screen.getByLabelText('Relationship Type:');
    const saveButton = screen.getByText('Save Changes');

    // Change type
    fireEvent.change(select, { target: { value: 'DEPENDS_ON' } });

    // Click save
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('shows error message when delete fails', async () => {
    mockOnDelete.mockRejectedValue(new Error('Delete failed'));

    render(
      <RelationshipEditor
        relationship={mockRelationship}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    // Open delete confirmation
    const deleteButton = screen.getByText('Delete Relationship');
    fireEvent.click(deleteButton);

    // Confirm delete - get all buttons and find the one in the dialog
    const buttons = screen.getAllByRole('button');
    const confirmButton = buttons.find((btn) => btn.textContent === 'Delete');
    expect(confirmButton).toBeDefined();
    fireEvent.click(confirmButton!);

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument();
    });
  });

  it('does not render when relationship is null', () => {
    const { container } = render(
      <RelationshipEditor
        relationship={null}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});

/**
 * Unit tests for ConnectionMode component
 * Tests mode toggle, node selection, and relationship creation
 * 
 * References: Requirements 7.1, 7.2, 7.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConnectionMode } from './ConnectionMode';

describe('ConnectionMode', () => {
  const mockOnToggle = vi.fn();
  const mockOnConnectionCreated = vi.fn();
  const mockOnClearError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Mode Toggle', () => {
    it('should render toggle button with correct text when inactive', () => {
      render(
        <ConnectionMode
          isActive={false}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId={null}
          targetNodeId={null}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /enter connection mode/i });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveTextContent('Create Relationship');
    });

    it('should render toggle button with correct text when active', () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId={null}
          targetNodeId={null}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /exit connection mode/i });
      expect(toggleButton).toBeInTheDocument();
      expect(toggleButton).toHaveTextContent('Cancel');
    });

    it('should call onToggle when toggle button is clicked', () => {
      render(
        <ConnectionMode
          isActive={false}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId={null}
          targetNodeId={null}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /enter connection mode/i });
      fireEvent.click(toggleButton);

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('should disable toggle button when creating relationship', () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="node1"
          targetNodeId="node2"
          isCreating={true}
        />
      );

      const toggleButton = screen.getByRole('button', { name: /exit connection mode/i });
      expect(toggleButton).toBeDisabled();
    });
  });

  describe('Node Selection Status', () => {
    it('should show "Select source node" status when active with no nodes selected', () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId={null}
          targetNodeId={null}
        />
      );

      expect(screen.getByText('Select source node')).toBeInTheDocument();
    });

    it('should show source node badge when source is selected', () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="550e8400-e29b-41d4-a716-446655440000"
          targetNodeId={null}
        />
      );

      expect(screen.getByText(/Source: 550e8400\.\.\./)).toBeInTheDocument();
      expect(screen.getByText('Select target node')).toBeInTheDocument();
    });

    it('should show both source and target badges when both are selected', () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="550e8400-e29b-41d4-a716-446655440000"
          targetNodeId="660e8400-e29b-41d4-a716-446655440001"
        />
      );

      expect(screen.getByText(/Source: 550e8400\.\.\./)).toBeInTheDocument();
      expect(screen.getByText(/Target: 660e8400\.\.\./)).toBeInTheDocument();
    });
  });

  describe('Relationship Type Selector Dialog', () => {
    it('should show dialog when both nodes are selected', async () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="node1"
          targetNodeId="node2"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Create Relationship')).toBeInTheDocument();
      });
    });

    it('should not show dialog when only source is selected', () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="node1"
          targetNodeId={null}
        />
      );

      expect(screen.queryByText('Create Relationship')).not.toBeInTheDocument();
    });

    it('should display source and target node IDs in dialog', async () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="550e8400-e29b-41d4-a716-446655440000"
          targetNodeId="660e8400-e29b-41d4-a716-446655440001"
        />
      );

      await waitFor(() => {
        // Check that node IDs appear in the dialog (there will be multiple matches due to status badges)
        const sourceMatches = screen.getAllByText(/550e8400\.\.\./);
        const targetMatches = screen.getAllByText(/660e8400\.\.\./);
        
        // Should have at least 2 matches each (status badge + dialog)
        expect(sourceMatches.length).toBeGreaterThanOrEqual(2);
        expect(targetMatches.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('should have relationship type selector with default types', async () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="node1"
          targetNodeId="node2"
        />
      );

      await waitFor(() => {
        const select = screen.getByLabelText(/relationship type/i);
        expect(select).toBeInTheDocument();
        
        // Check for some default relationship types
        const options = Array.from(select.querySelectorAll('option')).map(
          (opt) => opt.textContent
        );
        expect(options).toContain('TESTED_BY');
        expect(options).toContain('DEPENDS_ON');
        expect(options).toContain('IMPLEMENTS');
      });
    });

    it('should allow changing relationship type', async () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="node1"
          targetNodeId="node2"
        />
      );

      await waitFor(() => {
        const select = screen.getByLabelText(/relationship type/i) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: 'DEPENDS_ON' } });
        expect(select.value).toBe('DEPENDS_ON');
      });
    });
  });

  describe('Relationship Creation', () => {
    it('should call onConnectionCreated with correct parameters when Create button is clicked', async () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="node1"
          targetNodeId="node2"
        />
      );

      await waitFor(() => {
        const select = screen.getByLabelText(/relationship type/i);
        fireEvent.change(select, { target: { value: 'DEPENDS_ON' } });
      });

      const createButton = screen.getByRole('button', { name: /^create$/i });
      fireEvent.click(createButton);

      expect(mockOnConnectionCreated).toHaveBeenCalledWith('node1', 'node2', 'DEPENDS_ON');
    });

    it('should disable Create button when creating', async () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="node1"
          targetNodeId="node2"
          isCreating={true}
        />
      );

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /creating/i });
        expect(createButton).toBeDisabled();
      });
    });

    it('should show "Creating..." text when creating', async () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="node1"
          targetNodeId="node2"
          isCreating={true}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });
    });

    it('should call onToggle when Cancel button is clicked in dialog', async () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="node1"
          targetNodeId="node2"
        />
      );

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelButton);
      });

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('should call onToggle when overlay is clicked', async () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="node1"
          targetNodeId="node2"
        />
      );

      await waitFor(() => {
        const overlay = document.querySelector('.dialog-overlay');
        expect(overlay).toBeInTheDocument();
        if (overlay) {
          fireEvent.click(overlay);
        }
      });

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error prop is provided', async () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="node1"
          targetNodeId="node2"
          error="Failed to create relationship"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to create relationship')).toBeInTheDocument();
      });
    });

    it('should call onClearError when error dismiss button is clicked', async () => {
      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="node1"
          targetNodeId="node2"
          error="Failed to create relationship"
          onClearError={mockOnClearError}
        />
      );

      await waitFor(() => {
        const dismissButton = screen.getByLabelText(/dismiss error/i);
        fireEvent.click(dismissButton);
      });

      expect(mockOnClearError).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Relationship Types', () => {
    it('should use custom relationship types when provided', async () => {
      const customTypes = ['CUSTOM_TYPE_1', 'CUSTOM_TYPE_2', 'CUSTOM_TYPE_3'];

      render(
        <ConnectionMode
          isActive={true}
          onToggle={mockOnToggle}
          onConnectionCreated={mockOnConnectionCreated}
          sourceNodeId="node1"
          targetNodeId="node2"
          relationshipTypes={customTypes}
        />
      );

      await waitFor(() => {
        const select = screen.getByLabelText(/relationship type/i);
        const options = Array.from(select.querySelectorAll('option')).map(
          (opt) => opt.textContent
        );
        
        expect(options).toEqual(customTypes);
      });
    });
  });
});


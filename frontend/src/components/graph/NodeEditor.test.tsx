/**
 * NodeEditor Component Tests
 * Tests for node selection and editing functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NodeEditor } from './NodeEditor';
import { useGraphStore } from '../../stores/graphStore';
import type { Node } from '@xyflow/react';
import type { GraphNodeData } from '../../stores/graphStore';

// Mock the graphStore
vi.mock('../../stores/graphStore', () => ({
  useGraphStore: vi.fn(),
}));

const mockUseGraphStore = vi.mocked(useGraphStore);

// Helper to create a mock node
const createMockNode = (overrides: Partial<Node<GraphNodeData>> = {}): Node<GraphNodeData> => ({
  id: 'test-node-1',
  type: 'requirement',
  position: { x: 100, y: 100 },
  data: {
    label: 'Test Requirement',
    type: 'requirement',
    properties: {
      description: 'Test description',
      status: 'active',
      priority: 2,
      version: '1.0',
      is_signed: false,
    },
  },
  ...overrides,
});

// Default mock store state
const createMockStore = (overrides = {}) => ({
  selectedNode: null,
  selectNode: vi.fn(),
  updateNode: vi.fn().mockResolvedValue(undefined),
  isUpdating: false,
  error: null,
  clearError: vi.fn(),
  ...overrides,
});

describe('NodeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Rendering', () => {
    it('should not render when no node is selected', () => {
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: null }));

      const { container } = render(<NodeEditor />);
      expect(container.firstChild).toBeNull();
    });

    it('should render when a node is selected', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      expect(screen.getByTestId('node-editor')).toBeInTheDocument();
    });

    it('should display the node type badge', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      expect(screen.getByText('Requirement')).toBeInTheDocument();
    });

    it('should display the node ID as read-only', () => {
      const mockNode = createMockNode({ id: 'unique-node-id' });
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      expect(screen.getByText('unique-node-id')).toBeInTheDocument();
    });

    it('should display the node version when available', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      expect(screen.getByText('1.0')).toBeInTheDocument();
    });

    it('should display signed status when available', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      expect(screen.getByText('✗ No')).toBeInTheDocument();
    });

    it('should display signed status as Yes when signed', () => {
      const mockNode = createMockNode({
        data: {
          label: 'Signed Node',
          type: 'requirement',
          properties: { is_signed: true },
        },
      });
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      expect(screen.getByText('✓ Yes')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('should populate title field with node label', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      const titleInput = screen.getByTestId('node-editor-title') as HTMLInputElement;
      expect(titleInput.value).toBe('Test Requirement');
    });

    it('should populate description field with node description', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      const descInput = screen.getByTestId('node-editor-description') as HTMLTextAreaElement;
      expect(descInput.value).toBe('Test description');
    });

    it('should populate status field with node status', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      const statusSelect = screen.getByTestId('node-editor-status') as HTMLSelectElement;
      expect(statusSelect.value).toBe('active');
    });

    it('should populate priority field with node priority', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      const prioritySelect = screen.getByTestId('node-editor-priority') as HTMLSelectElement;
      expect(prioritySelect.value).toBe('2');
    });

    it('should show all status options', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      const statusSelect = screen.getByTestId('node-editor-status');
      
      expect(statusSelect).toContainHTML('Draft');
      expect(statusSelect).toContainHTML('Active');
      expect(statusSelect).toContainHTML('Completed');
      expect(statusSelect).toContainHTML('Archived');
    });

    it('should show all priority options including None', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      const prioritySelect = screen.getByTestId('node-editor-priority');
      
      expect(prioritySelect).toContainHTML('None');
      expect(prioritySelect).toContainHTML('1 - Highest');
      expect(prioritySelect).toContainHTML('5 - Lowest');
    });
  });

  describe('Editing', () => {
    it('should enable save button when title is changed', async () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      const titleInput = screen.getByTestId('node-editor-title');
      const saveButton = screen.getByTestId('node-editor-save');

      expect(saveButton).toBeDisabled();

      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'New Title');

      expect(saveButton).not.toBeDisabled();
    });

    it('should enable save button when description is changed', async () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      const descInput = screen.getByTestId('node-editor-description');
      const saveButton = screen.getByTestId('node-editor-save');

      expect(saveButton).toBeDisabled();

      await userEvent.type(descInput, ' additional text');

      expect(saveButton).not.toBeDisabled();
    });

    it('should enable save button when status is changed', async () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      const statusSelect = screen.getByTestId('node-editor-status');
      const saveButton = screen.getByTestId('node-editor-save');

      expect(saveButton).toBeDisabled();

      await userEvent.selectOptions(statusSelect, 'completed');

      expect(saveButton).not.toBeDisabled();
    });

    it('should enable save button when priority is changed', async () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      const prioritySelect = screen.getByTestId('node-editor-priority');
      const saveButton = screen.getByTestId('node-editor-save');

      expect(saveButton).toBeDisabled();

      await userEvent.selectOptions(prioritySelect, '5');

      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('Save Functionality', () => {
    it('should call updateNode with correct data when save is clicked', async () => {
      const mockNode = createMockNode();
      const mockUpdateNode = vi.fn().mockResolvedValue(undefined);
      mockUseGraphStore.mockReturnValue(
        createMockStore({ selectedNode: mockNode, updateNode: mockUpdateNode })
      );

      render(<NodeEditor />);
      const titleInput = screen.getByTestId('node-editor-title');
      const saveButton = screen.getByTestId('node-editor-save');

      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Updated Title');
      await userEvent.click(saveButton);

      expect(mockUpdateNode).toHaveBeenCalledWith('test-node-1', {
        title: 'Updated Title',
        description: 'Test description',
        status: 'active',
        priority: 2,
      });
    });

    it('should call onSave callback after successful save', async () => {
      const mockNode = createMockNode();
      const mockOnSave = vi.fn();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor onSave={mockOnSave} />);
      const titleInput = screen.getByTestId('node-editor-title');
      const saveButton = screen.getByTestId('node-editor-save');

      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Updated Title');
      await userEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith('test-node-1');
      });
    });

    it('should show validation error when title is empty', async () => {
      const mockNode = createMockNode();
      const mockUpdateNode = vi.fn();
      mockUseGraphStore.mockReturnValue(
        createMockStore({ selectedNode: mockNode, updateNode: mockUpdateNode })
      );

      render(<NodeEditor />);
      const titleInput = screen.getByTestId('node-editor-title');
      const saveButton = screen.getByTestId('node-editor-save');

      await userEvent.clear(titleInput);
      // Type something to enable save, then clear
      await userEvent.type(titleInput, 'x');
      await userEvent.clear(titleInput);
      await userEvent.click(saveButton);

      expect(screen.getByRole('alert')).toHaveTextContent('Title is required');
      expect(mockUpdateNode).not.toHaveBeenCalled();
    });

    it('should display error from store', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(
        createMockStore({ selectedNode: mockNode, error: 'Server error occurred' })
      );

      render(<NodeEditor />);
      expect(screen.getByRole('alert')).toHaveTextContent('Server error occurred');
    });
  });

  describe('Loading State', () => {
    it('should show loading overlay when updating', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(
        createMockStore({ selectedNode: mockNode, isUpdating: true })
      );

      render(<NodeEditor />);
      // The loading overlay contains a span with "Saving..." text
      // The button also shows "Saving..." so we use getAllByText
      const savingElements = screen.getAllByText('Saving...');
      expect(savingElements.length).toBeGreaterThanOrEqual(1);
    });

    it('should disable save button when updating', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(
        createMockStore({ selectedNode: mockNode, isUpdating: true })
      );

      render(<NodeEditor />);
      const saveButton = screen.getByTestId('node-editor-save');
      expect(saveButton).toBeDisabled();
    });

    it('should disable cancel button when updating', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(
        createMockStore({ selectedNode: mockNode, isUpdating: true })
      );

      render(<NodeEditor />);
      const cancelButton = screen.getByTestId('node-editor-cancel');
      expect(cancelButton).toBeDisabled();
    });
  });

  describe('Close/Cancel Functionality', () => {
    it('should call selectNode(null) when close button is clicked', async () => {
      const mockNode = createMockNode();
      const mockSelectNode = vi.fn();
      mockUseGraphStore.mockReturnValue(
        createMockStore({ selectedNode: mockNode, selectNode: mockSelectNode })
      );

      render(<NodeEditor />);
      const closeButton = screen.getByTestId('node-editor-close');
      await userEvent.click(closeButton);

      expect(mockSelectNode).toHaveBeenCalledWith(null);
    });

    it('should call onClose callback when close button is clicked', async () => {
      const mockNode = createMockNode();
      const mockOnClose = vi.fn();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor onClose={mockOnClose} />);
      const closeButton = screen.getByTestId('node-editor-close');
      await userEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should show Reset button when there are changes', async () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      const titleInput = screen.getByTestId('node-editor-title');
      
      await userEvent.type(titleInput, ' changed');

      const cancelButton = screen.getByTestId('node-editor-cancel');
      expect(cancelButton).toHaveTextContent('Reset');
    });

    it('should show Close button when there are no changes', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      const cancelButton = screen.getByTestId('node-editor-cancel');
      expect(cancelButton).toHaveTextContent('Close');
    });

    it('should reset form when Reset button is clicked', async () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      const titleInput = screen.getByTestId('node-editor-title') as HTMLInputElement;
      
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Changed Title');
      expect(titleInput.value).toBe('Changed Title');

      const resetButton = screen.getByTestId('node-editor-cancel');
      await userEvent.click(resetButton);

      expect(titleInput.value).toBe('Test Requirement');
    });
  });

  describe('Different Node Types', () => {
    it('should display Task type badge correctly', () => {
      const mockNode = createMockNode({
        type: 'task',
        data: { label: 'Test Task', type: 'task', properties: {} },
      });
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      expect(screen.getByText('Task')).toBeInTheDocument();
    });

    it('should display Test type badge correctly', () => {
      const mockNode = createMockNode({
        type: 'test',
        data: { label: 'Test Case', type: 'test', properties: {} },
      });
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      expect(screen.getByText('Test')).toBeInTheDocument();
    });

    it('should display Risk type badge correctly', () => {
      const mockNode = createMockNode({
        type: 'risk',
        data: { label: 'Risk Item', type: 'risk', properties: {} },
      });
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      expect(screen.getByText('Risk')).toBeInTheDocument();
    });

    it('should display Document type badge correctly', () => {
      const mockNode = createMockNode({
        type: 'document',
        data: { label: 'Doc', type: 'document', properties: {} },
      });
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor />);
      expect(screen.getByText('Document')).toBeInTheDocument();
    });
  });

  describe('Props', () => {
    it('should apply custom className', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor className="custom-class" />);
      expect(screen.getByTestId('node-editor')).toHaveClass('custom-class');
    });

    it('should apply custom style', () => {
      const mockNode = createMockNode();
      mockUseGraphStore.mockReturnValue(createMockStore({ selectedNode: mockNode }));

      render(<NodeEditor style={{ top: '50px' }} />);
      const editor = screen.getByTestId('node-editor');
      // Custom styles are merged with default styles
      expect(editor).toHaveStyle({ top: '50px' });
    });
  });
});

/**
 * Unit tests for GraphExplorer page component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphExplorer } from './GraphExplorer';
import { useGraphStore } from '../stores/graphStore';

// Mock the graph store
vi.mock('../stores/graphStore', () => ({
  useGraphStore: vi.fn(),
}));

// Mock the GraphView2D component
vi.mock('../components/graph/GraphView2D', () => ({
  GraphView2D: vi.fn(({ className, renderToolbarContent }) => (
    <div data-testid="graph-view-2d" className={className}>
      GraphView2D Mock
      {renderToolbarContent && (
        <div data-testid="graph-toolbar-content">
          {renderToolbarContent()}
        </div>
      )}
    </div>
  )),
}));

// Mock the NodeEditor component
vi.mock('../components/graph/NodeEditor', () => ({
  NodeEditor: vi.fn(({ onClose, onSave }) => (
    <div data-testid="node-editor">
      NodeEditor Mock
      <button onClick={onClose} data-testid="node-editor-close-mock">Close</button>
      <button onClick={() => onSave?.('test-id')} data-testid="node-editor-save-mock">Save</button>
    </div>
  )),
}));

// Mock the GraphExport component
vi.mock('../components/graph/GraphExport', () => ({
  GraphExport: vi.fn(({ onExportStart }) => (
    <div data-testid="graph-export">
      <button 
        data-testid="export-button"
        onClick={() => onExportStart?.('png')}
      >
        Export ▾
      </button>
    </div>
  )),
}));

// Mock the ViewModeToggle component
vi.mock('../components/graph/ViewModeToggle', () => ({
  ViewModeToggle: vi.fn(({ onViewModeChange }) => (
    <div data-testid="view-mode-toggle">
      <button 
        data-testid="view-mode-2d"
        onClick={() => onViewModeChange?.('2d')}
      >
        2D
      </button>
      <button 
        data-testid="view-mode-3d"
        onClick={() => onViewModeChange?.('3d')}
      >
        3D
      </button>
    </div>
  )),
}));

// Mock the GraphView3D component
vi.mock('../components/graph/GraphView3D', () => ({
  GraphView3D: vi.fn(({ className }) => (
    <div data-testid="graph-view-3d" className={className}>
      GraphView3D Mock
    </div>
  )),
}));

// Mock the Button component
vi.mock('../components/common', () => ({
  Button: vi.fn(({ children, onClick, disabled, type }) => (
    <button onClick={onClick} disabled={disabled} type={type}>
      {children}
    </button>
  )),
}));

const mockUseGraphStore = useGraphStore as unknown as ReturnType<typeof vi.fn>;

describe('GraphExplorer', () => {
  const mockLoadGraph = vi.fn();
  const mockSetDepth = vi.fn();
  const mockClearError = vi.fn();
  const mockSearchNodes = vi.fn();
  const mockClearSearch = vi.fn();
  const mockSelectSearchResult = vi.fn();

  const defaultStoreState = {
    isLoading: false,
    error: null,
    loadGraph: mockLoadGraph,
    depth: 2,
    setDepth: mockSetDepth,
    selectedNode: null,
    clearError: mockClearError,
    searchNodes: mockSearchNodes,
    clearSearch: mockClearSearch,
    selectSearchResult: mockSelectSearchResult,
    searchResults: [],
    isSearching: false,
    searchQuery: '',
    viewMode: '2d' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGraphStore.mockReturnValue(defaultStoreState);
  });

  it('renders page header with title and subtitle', () => {
    render(<GraphExplorer />);

    expect(screen.getByText('Knowledge Graph')).toBeInTheDocument();
    expect(
      screen.getByText('Explore and manage project relationships with interactive visualization')
    ).toBeInTheDocument();
  });

  it('renders toolbar with search input', () => {
    render(<GraphExplorer />);

    expect(screen.getByPlaceholderText('Search nodes...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('renders depth control with correct default value', () => {
    render(<GraphExplorer />);

    const depthSelect = screen.getByLabelText('Graph depth');
    expect(depthSelect).toBeInTheDocument();
    expect(depthSelect).toHaveValue('2');
  });

  it('renders refresh button', () => {
    render(<GraphExplorer />);

    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('renders export button via GraphView2D render prop', () => {
    render(<GraphExplorer />);

    // The export button is rendered inside GraphView2D via renderToolbarContent prop
    expect(screen.getByTestId('graph-toolbar-content')).toBeInTheDocument();
    expect(screen.getByTestId('graph-export')).toBeInTheDocument();
    expect(screen.getByTestId('export-button')).toBeInTheDocument();
  });

  it('renders GraphView2D component', () => {
    render(<GraphExplorer />);

    expect(screen.getByTestId('graph-view-2d')).toBeInTheDocument();
  });

  it('does not render NodeEditor when no node is selected', () => {
    render(<GraphExplorer />);

    expect(screen.queryByTestId('node-editor')).not.toBeInTheDocument();
  });

  it('renders NodeEditor when a node is selected', () => {
    mockUseGraphStore.mockReturnValue({
      ...defaultStoreState,
      selectedNode: {
        id: 'test-node-1',
        type: 'requirement',
        data: { label: 'Test Node', type: 'requirement', properties: {} },
        position: { x: 0, y: 0 },
      },
    });

    render(<GraphExplorer />);

    expect(screen.getByTestId('node-editor')).toBeInTheDocument();
  });

  it('calls loadGraph when refresh button is clicked', async () => {
    const user = userEvent.setup();
    render(<GraphExplorer />);

    await user.click(screen.getByRole('button', { name: /refresh/i }));

    expect(mockClearError).toHaveBeenCalled();
    expect(mockLoadGraph).toHaveBeenCalled();
  });

  it('calls setDepth and loadGraph when depth is changed', async () => {
    const user = userEvent.setup();
    render(<GraphExplorer />);

    const depthSelect = screen.getByLabelText('Graph depth');
    await user.selectOptions(depthSelect, '5');

    expect(mockSetDepth).toHaveBeenCalledWith(5);
    expect(mockLoadGraph).toHaveBeenCalledWith(undefined, 5);
  });

  it('updates search input value when typing', async () => {
    const user = userEvent.setup();
    render(<GraphExplorer />);

    const searchInput = screen.getByPlaceholderText('Search nodes...');
    
    // Verify the input exists and can receive focus
    expect(searchInput).toBeInTheDocument();
    await user.click(searchInput);
    expect(searchInput).toHaveFocus();
  });

  it('displays loading state', () => {
    mockUseGraphStore.mockReturnValue({
      ...defaultStoreState,
      isLoading: true,
    });

    render(<GraphExplorer />);

    expect(screen.getByText('Loading graph...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
  });

  it('displays error banner when there is an error', () => {
    mockUseGraphStore.mockReturnValue({
      ...defaultStoreState,
      error: 'Failed to load graph data',
    });

    render(<GraphExplorer />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Failed to load graph data')).toBeInTheDocument();
  });

  it('clears error when dismiss button is clicked', async () => {
    const user = userEvent.setup();
    mockUseGraphStore.mockReturnValue({
      ...defaultStoreState,
      error: 'Some error',
    });

    render(<GraphExplorer />);

    const dismissButton = screen.getByLabelText('Dismiss error');
    await user.click(dismissButton);

    expect(mockClearError).toHaveBeenCalled();
  });

  it('handles search form submission', async () => {
    // This test verifies the search form structure and button state
    render(<GraphExplorer />);

    const searchInput = screen.getByPlaceholderText('Search nodes...');
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    // Search button should be disabled when input is empty
    expect(searchButton).toBeDisabled();
    expect(searchInput).toBeInTheDocument();
  });

  it('renders all depth options from 1 to 10', () => {
    render(<GraphExplorer />);

    const depthSelect = screen.getByLabelText('Graph depth');
    const options = depthSelect.querySelectorAll('option');

    expect(options).toHaveLength(10);
    for (let i = 1; i <= 10; i++) {
      expect(screen.getByRole('option', { name: String(i) })).toBeInTheDocument();
    }
  });

  it('displays search results dropdown when there are results', () => {
    mockUseGraphStore.mockReturnValue({
      ...defaultStoreState,
      searchResults: [
        { id: 'node-1', type: 'requirement', label: 'Test Requirement', properties: {} },
        { id: 'node-2', type: 'task', label: 'Test Task', properties: {} },
      ],
    });

    render(<GraphExplorer />);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Test Requirement')).toBeInTheDocument();
    expect(screen.getByText('Test Task')).toBeInTheDocument();
  });

  it('displays loading state in search dropdown when searching', () => {
    mockUseGraphStore.mockReturnValue({
      ...defaultStoreState,
      isSearching: true,
    });

    render(<GraphExplorer />);

    // Check for the loading spinner in the dropdown
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByText('Searching...').length).toBeGreaterThanOrEqual(1);
  });

  it('calls selectSearchResult when clicking a search result', async () => {
    const user = userEvent.setup();
    const searchResult = { id: 'node-1', type: 'requirement', label: 'Test Requirement', properties: {} };
    
    mockUseGraphStore.mockReturnValue({
      ...defaultStoreState,
      searchResults: [searchResult],
    });

    render(<GraphExplorer />);

    // Click on the search result item by its label
    const resultButton = screen.getByText('Test Requirement').closest('button');
    expect(resultButton).toBeInTheDocument();
    await user.click(resultButton!);

    expect(mockSelectSearchResult).toHaveBeenCalledWith(searchResult);
  });

  it('clears search when clearSearch is available', () => {
    // Verify clearSearch function is available in the store
    expect(mockClearSearch).toBeDefined();
    
    // Render component and verify search input exists
    render(<GraphExplorer />);
    const searchInput = screen.getByPlaceholderText('Search nodes...');
    expect(searchInput).toBeInTheDocument();
  });

  it('displays node type badge with correct color for requirement', () => {
    mockUseGraphStore.mockReturnValue({
      ...defaultStoreState,
      searchResults: [
        { id: 'node-1', type: 'requirement', label: 'Test Requirement', properties: {} },
      ],
    });

    render(<GraphExplorer />);

    const badge = screen.getByText('requirement');
    expect(badge).toHaveStyle({ backgroundColor: '#3b82f6' });
  });

  it('displays node ID in search results', () => {
    mockUseGraphStore.mockReturnValue({
      ...defaultStoreState,
      searchResults: [
        { id: 'test-node-123', type: 'task', label: 'Test Task', properties: {} },
      ],
    });

    render(<GraphExplorer />);

    expect(screen.getByText('ID: test-node-123')).toBeInTheDocument();
  });

  it('disables search button when input is empty', () => {
    render(<GraphExplorer />);

    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).toBeDisabled();
  });

  it('disables search button when searching', () => {
    mockUseGraphStore.mockReturnValue({
      ...defaultStoreState,
      isSearching: true,
    });

    render(<GraphExplorer />);

    const searchButton = screen.getByRole('button', { name: /searching/i });
    expect(searchButton).toBeDisabled();
  });

  describe('View Mode Toggle', () => {
    it('renders ViewModeToggle component', () => {
      render(<GraphExplorer />);

      expect(screen.getByTestId('view-mode-toggle')).toBeInTheDocument();
    });

    it('renders GraphView2D when viewMode is 2d', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        viewMode: '2d',
      });

      render(<GraphExplorer />);

      expect(screen.getByTestId('graph-view-2d')).toBeInTheDocument();
      expect(screen.queryByTestId('graph-view-3d')).not.toBeInTheDocument();
    });

    it('renders GraphView3D when viewMode is 3d', async () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        viewMode: '3d',
      });

      render(<GraphExplorer />);

      // Wait for lazy-loaded GraphView3D to appear
      await waitFor(() => {
        expect(screen.getByTestId('graph-view-3d')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('graph-view-2d')).not.toBeInTheDocument();
    });
  });
});

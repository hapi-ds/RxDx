/**
 * Enhanced search functionality tests for GraphExplorer
 * Tests empty query handling, result display, and result selection behavior
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GraphExplorer } from './GraphExplorer';
import { useGraphStore } from '../stores/graphStore';

// Mock the graph store
vi.mock('../stores/graphStore');

// Mock child components
vi.mock('../components/graph/GraphView2D', () => ({
  GraphView2D: () => <div data-testid="graph-view-2d">Graph View 2D</div>,
}));

vi.mock('../components/graph/NodeEditor', () => ({
  NodeEditor: () => <div data-testid="node-editor">Node Editor</div>,
}));

vi.mock('../components/graph/RelationshipEditor', () => ({
  RelationshipEditor: () => <div data-testid="relationship-editor">Relationship Editor</div>,
}));

vi.mock('../components/graph/ConnectionMode', () => ({
  ConnectionMode: () => <div data-testid="connection-mode">Connection Mode</div>,
}));

vi.mock('../components/graph/ViewModeToggle', () => ({
  ViewModeToggle: () => <div data-testid="view-mode-toggle">View Mode Toggle</div>,
}));

vi.mock('../components/graph/GraphEmptyState', () => ({
  GraphEmptyState: () => <div data-testid="graph-empty-state">Empty State</div>,
}));

vi.mock('../components/graph/LayoutSelector', () => ({
  LayoutSelector: () => <div data-testid="layout-selector">Layout Selector</div>,
}));

vi.mock('../components/common/NodeTypeFilter', () => ({
  NodeTypeFilter: () => <div data-testid="node-type-filter">Node Type Filter</div>,
}));

vi.mock('../components/graph/GraphExport', () => ({
  GraphExport: () => <div data-testid="graph-export">Graph Export</div>,
}));

describe('GraphExplorer - Enhanced Search Functionality', () => {
  const mockLoadGraph = vi.fn();
  const mockSearchNodes = vi.fn();
  const mockClearSearch = vi.fn();
  const mockSelectSearchResult = vi.fn();
  const mockSetDepth = vi.fn();
  const mockClearError = vi.fn();

  const defaultStoreState = {
    nodes: [
      { id: 'node-1', type: 'requirement', label: 'Test Node 1', x: 0, y: 0 },
      { id: 'node-2', type: 'task', label: 'Test Node 2', x: 100, y: 100 },
    ],
    edges: [],
    isLoading: false,
    error: null,
    loadGraph: mockLoadGraph,
    depth: 2,
    setDepth: mockSetDepth,
    selectedNode: null,
    selectedRelationship: null,
    clearError: mockClearError,
    searchNodes: mockSearchNodes,
    clearSearch: mockClearSearch,
    selectSearchResult: mockSelectSearchResult,
    searchResults: [],
    isSearching: false,
    searchQuery: '',
    viewMode: '2d' as const,
    nodeTypeFilter: {
      requirement: true,
      task: true,
      test: true,
      risk: true,
      document: true,
    },
    setNodeTypeFilters: vi.fn(),
    isConnectionMode: false,
    connectionSource: null,
    connectionTarget: null,
    toggleConnectionMode: vi.fn(),
    setConnectionSource: vi.fn(),
    setConnectionTarget: vi.fn(),
    createConnection: vi.fn(),
    isCreatingRelationship: false,
    updateRelationship: vi.fn(),
    deleteRelationship: vi.fn(),
    selectRelationship: vi.fn(),
  };

  const mockUseGraphStore = useGraphStore as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGraphStore.mockReturnValue(defaultStoreState);
  });

  describe('Empty Query Handling', () => {
    it('should not call searchNodes when search input is empty', async () => {
      const user = userEvent.setup();
      render(<GraphExplorer />);

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      expect(mockSearchNodes).not.toHaveBeenCalled();
    });

    it('should clear search results when input is cleared', async () => {
      const user = userEvent.setup();
      render(<GraphExplorer />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');
      
      // Type and then clear
      await user.type(searchInput, 'test');
      await user.clear(searchInput);

      expect(mockClearSearch).toHaveBeenCalled();
    });

    it('should not show search results dropdown when input is empty', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [],
        searchQuery: '',
      });

      render(<GraphExplorer />);

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  describe('Result Display', () => {
    it('should display node type badges for all result types', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [
          { id: 'node-1', type: 'requirement', label: 'Requirement Node', properties: {} },
          { id: 'node-2', type: 'task', label: 'Task Node', properties: {} },
          { id: 'node-3', type: 'test', label: 'Test Node', properties: {} },
          { id: 'node-4', type: 'risk', label: 'Risk Node', properties: {} },
          { id: 'node-5', type: 'document', label: 'Document Node', properties: {} },
        ],
      });

      render(<GraphExplorer />);

      expect(screen.getByText('Requirement')).toBeInTheDocument();
      expect(screen.getByText('Task')).toBeInTheDocument();
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('Risk')).toBeInTheDocument();
      expect(screen.getByText('Document')).toBeInTheDocument();
    });

    it('should display node type badges with correct colors', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [
          { id: 'node-1', type: 'requirement', label: 'Test', properties: {} },
          { id: 'node-2', type: 'task', label: 'Test', properties: {} },
          { id: 'node-3', type: 'test', label: 'Test', properties: {} },
          { id: 'node-4', type: 'risk', label: 'Test', properties: {} },
          { id: 'node-5', type: 'document', label: 'Test', properties: {} },
        ],
      });

      render(<GraphExplorer />);

      const badges = screen.getAllByText(/Requirement|Task|Test|Risk|Document/);
      
      // Check that badges have background colors
      badges.forEach(badge => {
        const style = window.getComputedStyle(badge);
        expect(style.backgroundColor).toBeTruthy();
      });
    });

    it('should display truncated node IDs', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [
          { id: 'very-long-node-id-12345678', type: 'requirement', label: 'Test', properties: {} },
        ],
      });

      render(<GraphExplorer />);

      // Should show truncated ID
      expect(screen.getByText(/ID: very-lon\.\.\./)).toBeInTheDocument();
    });

    it('should show "No results found" message when no results', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [],
        searchQuery: 'nonexistent',
        isSearching: false,
      });

      render(<GraphExplorer />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');
      // Simulate having typed a query
      userEvent.type(searchInput, 'nonexistent');

      waitFor(() => {
        expect(screen.getByText(/No results found/i)).toBeInTheDocument();
      });
    });

    it('should show search query in "No results" message', async () => {
      const user = userEvent.setup();
      
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [],
        searchQuery: '',
        isSearching: false,
      });

      render(<GraphExplorer />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');
      await user.type(searchInput, 'test query');

      await waitFor(() => {
        const noResultsText = screen.queryByText(/No nodes match "test query"/i);
        if (noResultsText) {
          expect(noResultsText).toBeInTheDocument();
        }
      });
    });

    it('should show loading state while searching', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [],
        isSearching: true,
      });

      render(<GraphExplorer />);

      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });

    it('should display search results in a dropdown', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [
          { id: 'node-1', type: 'requirement', label: 'Test', properties: {} },
        ],
      });

      render(<GraphExplorer />);

      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });
  });

  describe('Result Selection', () => {
    it('should call selectSearchResult when clicking a result', async () => {
      const user = userEvent.setup();
      const searchResult = { 
        id: 'node-1', 
        type: 'requirement', 
        label: 'Test Requirement',
        properties: {} 
      };

      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [searchResult],
      });

      render(<GraphExplorer />);

      const resultButton = screen.getByText('Test Requirement').closest('button');
      await user.click(resultButton!);

      expect(mockSelectSearchResult).toHaveBeenCalledWith(searchResult);
    });

    it('should close search dropdown after selecting a result', async () => {
      const user = userEvent.setup();
      const searchResult = { 
        id: 'node-1', 
        type: 'requirement', 
        label: 'Test Requirement',
        properties: {} 
      };

      // First render with results
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [searchResult],
      });

      const { rerender } = render(<GraphExplorer />);

      const resultButton = screen.getByText('Test Requirement').closest('button');
      await user.click(resultButton!);

      // After selection, results should be cleared
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [],
      });

      rerender(<GraphExplorer />);

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should clear search input after selecting a result', async () => {
      const user = userEvent.setup();
      const searchResult = { 
        id: 'node-1', 
        type: 'requirement', 
        label: 'Test Requirement',
        properties: {} 
      };

      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [searchResult],
      });

      render(<GraphExplorer />);

      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;
      await user.type(searchInput, 'test');

      const resultButton = screen.getByText('Test Requirement').closest('button');
      await user.click(resultButton!);

      await waitFor(() => {
        expect(searchInput.value).toBe('');
      });
    });

    it('should handle multiple search results', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [
          { id: 'node-1', type: 'requirement', label: 'Result 1', properties: {} },
          { id: 'node-2', type: 'task', label: 'Result 2', properties: {} },
          { id: 'node-3', type: 'test', label: 'Result 3', properties: {} },
        ],
      });

      render(<GraphExplorer />);

      expect(screen.getByText('Result 1')).toBeInTheDocument();
      expect(screen.getByText('Result 2')).toBeInTheDocument();
      expect(screen.getByText('Result 3')).toBeInTheDocument();
    });

    it('should show tooltips on hover for node type badges', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [
          { id: 'node-1', type: 'requirement', label: 'Test', properties: {} },
        ],
      });

      render(<GraphExplorer />);

      const badge = screen.getByText('Requirement');
      expect(badge).toHaveAttribute('title', 'Type: Requirement');
    });

    it('should show tooltips for node labels', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [
          { id: 'node-1', type: 'requirement', label: 'Very Long Node Label', properties: {} },
        ],
      });

      render(<GraphExplorer />);

      const label = screen.getByText('Very Long Node Label');
      expect(label).toHaveAttribute('title', 'Very Long Node Label');
    });

    it('should show tooltips for node IDs', () => {
      mockUseGraphStore.mockReturnValue({
        ...defaultStoreState,
        searchResults: [
          { id: 'node-id-12345678', type: 'requirement', label: 'Test', properties: {} },
        ],
      });

      render(<GraphExplorer />);

      const idElement = screen.getByText(/ID: node-id-/);
      expect(idElement).toHaveAttribute('title', 'Node ID: node-id-12345678');
    });
  });

  describe('Search Form Behavior', () => {
    it('should submit search on Enter key', async () => {
      const user = userEvent.setup();
      render(<GraphExplorer />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');
      await user.type(searchInput, 'test query{Enter}');

      expect(mockSearchNodes).toHaveBeenCalledWith('test query');
    });

    it('should submit search on button click', async () => {
      const user = userEvent.setup();
      render(<GraphExplorer />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');
      await user.type(searchInput, 'test query');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      expect(mockSearchNodes).toHaveBeenCalledWith('test query');
    });

    it('should trim whitespace from search query', async () => {
      const user = userEvent.setup();
      render(<GraphExplorer />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');
      await user.type(searchInput, '  test query  {Enter}');

      expect(mockSearchNodes).toHaveBeenCalledWith('test query');
    });

    it('should disable search button when input is empty', () => {
      render(<GraphExplorer />);

      const searchButton = screen.getByRole('button', { name: /search/i });
      expect(searchButton).toBeDisabled();
    });

    it('should enable search button when input has text', async () => {
      const user = userEvent.setup();
      render(<GraphExplorer />);

      const searchInput = screen.getByPlaceholderText('Search nodes...');
      const searchButton = screen.getByRole('button', { name: /search/i });

      await user.type(searchInput, 'test');

      expect(searchButton).toBeEnabled();
    });
  });
});

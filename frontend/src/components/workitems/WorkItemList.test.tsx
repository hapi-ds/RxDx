/**
 * WorkItemList component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkItemList } from './WorkItemList';
import { useWorkItemStore } from '../../stores/workitemStore';
import type { WorkItem } from '../../services/workitemService';

// Mock the store
vi.mock('../../stores/workitemStore', () => ({
  useWorkItemStore: vi.fn(),
}));

const mockWorkItems: WorkItem[] = [
  {
    id: '1',
    type: 'requirement',
    title: 'Test Requirement 1',
    description: 'Description 1',
    status: 'draft',
    priority: 1,
    version: '1.0',
    created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    is_signed: false,
  },
  {
    id: '2',
    type: 'task',
    title: 'Test Task 1',
    description: 'Description 2',
    status: 'active',
    priority: 2,
    version: '1.1',
    created_by: 'user-2',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    is_signed: true,
  },
];

const createMockStoreState = (overrides = {}) => ({
  items: mockWorkItems,
  total: 2,
  skip: 0,
  limit: 20,
  filters: {},
  isLoading: false,
  error: null as string | null,
  selectedItem: null,
  versionHistory: [],
  isLoadingItem: false,
  isLoadingHistory: false,
  isSaving: false,
  isDeleting: false,
  fetchItems: vi.fn().mockResolvedValue(undefined),
  fetchItem: vi.fn(),
  createItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
  fetchVersionHistory: vi.fn(),
  fetchVersion: vi.fn(),
  selectItem: vi.fn(),
  clearSelection: vi.fn(),
  setFilters: vi.fn(),
  clearFilters: vi.fn(),
  setPage: vi.fn(),
  setLimit: vi.fn(),
  clearError: vi.fn(),
  reset: vi.fn(),
  ...overrides,
});

// Helper to create selector mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createSelectorMock = (state: ReturnType<typeof createMockStoreState>): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (selector?: (s: any) => unknown) => {
    if (typeof selector === 'function') {
      return selector(state);
    }
    return state;
  };
};

describe('WorkItemList', () => {
  let mockState: ReturnType<typeof createMockStoreState>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockState = createMockStoreState();
    vi.mocked(useWorkItemStore).mockImplementation(createSelectorMock(mockState));
  });

  it('should render work items', () => {
    render(<WorkItemList />);

    expect(screen.getByText('Test Requirement 1')).toBeInTheDocument();
    expect(screen.getByText('Test Task 1')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const loadingState = createMockStoreState({ items: [], isLoading: true });
    vi.mocked(useWorkItemStore).mockImplementation(createSelectorMock(loadingState));

    render(<WorkItemList />);

    expect(screen.getByText('Loading work items...')).toBeInTheDocument();
  });

  it('should show error state', () => {
    const errorState = createMockStoreState({ error: 'Failed to load' });
    vi.mocked(useWorkItemStore).mockImplementation(createSelectorMock(errorState));

    render(<WorkItemList />);

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should show empty state', () => {
    const emptyState = createMockStoreState({ items: [], total: 0 });
    vi.mocked(useWorkItemStore).mockImplementation(createSelectorMock(emptyState));

    render(<WorkItemList />);

    expect(screen.getByText('No work items found')).toBeInTheDocument();
  });

  it('should call onItemClick when row is clicked', () => {
    const onItemClick = vi.fn();
    render(<WorkItemList onItemClick={onItemClick} />);

    fireEvent.click(screen.getByText('Test Requirement 1'));

    expect(onItemClick).toHaveBeenCalledWith(mockWorkItems[0]);
  });

  it('should call onCreateClick when create button is clicked', () => {
    const onCreateClick = vi.fn();
    render(<WorkItemList onCreateClick={onCreateClick} />);

    fireEvent.click(screen.getByText('+ New Work Item'));

    expect(onCreateClick).toHaveBeenCalled();
  });

  it('should show signed indicator for signed items', () => {
    render(<WorkItemList />);

    // The signed item should have a checkmark indicator
    const signedIndicators = screen.getAllByTitle('Signed');
    expect(signedIndicators.length).toBeGreaterThan(0);
  });

  it('should fetch items on mount', () => {
    render(<WorkItemList />);

    expect(mockState.fetchItems).toHaveBeenCalled();
  });

  it('should show filters when showFilters is true', () => {
    render(<WorkItemList showFilters={true} />);

    expect(screen.getByPlaceholderText('Search work items...')).toBeInTheDocument();
  });

  it('should hide filters when showFilters is false', () => {
    render(<WorkItemList showFilters={false} />);

    expect(screen.queryByPlaceholderText('Search work items...')).not.toBeInTheDocument();
  });

  it('should show pagination when total exceeds limit', () => {
    const paginatedState = createMockStoreState({ total: 50 });
    vi.mocked(useWorkItemStore).mockImplementation(createSelectorMock(paginatedState));

    render(<WorkItemList showPagination={true} />);

    expect(screen.getByText(/Showing 1-20 of 50/)).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('should handle filter changes', async () => {
    render(<WorkItemList />);

    const searchInput = screen.getByPlaceholderText('Search work items...');
    fireEvent.change(searchInput, { target: { value: 'test search' } });

    await waitFor(() => {
      expect(mockState.setFilters).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'test search' })
      );
    });
  });

  it('should clear filters when clear button is clicked', () => {
    const filteredState = createMockStoreState({ filters: { type: 'requirement' as const } });
    vi.mocked(useWorkItemStore).mockImplementation(createSelectorMock(filteredState));

    render(<WorkItemList />);

    fireEvent.click(screen.getByText('Clear'));

    expect(filteredState.clearFilters).toHaveBeenCalled();
  });
});

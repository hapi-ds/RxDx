/**
 * WorkItemDetail component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkItemDetail } from './WorkItemDetail';
import { useWorkItemStore } from '../../stores/workitemStore';
import type { WorkItem, VersionHistoryItem } from '../../services/workitemService';

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
  version: '1.2',
  created_by: 'user-1',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  is_signed: false,
};

const mockVersionHistory: VersionHistoryItem[] = [
  { version: '1.0', title: 'Initial', status: 'draft', created_by: 'user-1', created_at: '2024-01-01T00:00:00Z' },
  { version: '1.1', title: 'Updated', status: 'draft', created_by: 'user-1', created_at: '2024-01-02T00:00:00Z' },
  { version: '1.2', title: 'Test Requirement', status: 'draft', created_by: 'user-1', created_at: '2024-01-03T00:00:00Z' },
];

const mockStoreState = {
  selectedItem: mockWorkItem,
  isLoadingItem: false,
  error: null,
  versionHistory: mockVersionHistory,
  fetchItem: vi.fn(),
  fetchVersionHistory: vi.fn(),
  clearError: vi.fn(),
  clearSelection: vi.fn(),
};

describe('WorkItemDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkItemStore).mockReturnValue(mockStoreState);
  });

  describe('Basic rendering', () => {
    it('should render work item details', () => {
      render(<WorkItemDetail workItemId="1" />);

      expect(screen.getByText('Test Requirement')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('should fetch work item on mount', () => {
      render(<WorkItemDetail workItemId="1" />);

      expect(mockStoreState.fetchItem).toHaveBeenCalledWith('1');
      expect(mockStoreState.fetchVersionHistory).toHaveBeenCalledWith('1');
    });

    it('should clear selection on unmount', () => {
      const { unmount } = render(<WorkItemDetail workItemId="1" />);

      unmount();

      expect(mockStoreState.clearSelection).toHaveBeenCalled();
    });
  });

  describe('Version Control UX (Requirement 20)', () => {
    describe('Version badge visibility', () => {
      it('should display version badge with enhanced styling', () => {
        render(<WorkItemDetail workItemId="1" />);

        const versionBadge = screen.getByText(/v1\.2/);
        expect(versionBadge).toBeInTheDocument();
      });

      it('should display version badge for different version numbers', () => {
        const versions = ['1.0', '1.5', '2.3', '10.15'];

        versions.forEach((version) => {
          const item = { ...mockWorkItem, version };
          vi.mocked(useWorkItemStore).mockReturnValue({
            ...mockStoreState,
            selectedItem: item,
          });

          const { unmount } = render(<WorkItemDetail workItemId="1" />);
          expect(screen.getByText(`v${version}`)).toBeInTheDocument();
          unmount();
        });
      });
    });

    describe('Version count indicator', () => {
      it('should display version count when history is available', () => {
        render(<WorkItemDetail workItemId="1" />);

        expect(screen.getByText(/\(3 versions\)/)).toBeInTheDocument();
      });

      it('should display singular "version" for single version', () => {
        vi.mocked(useWorkItemStore).mockReturnValue({
          ...mockStoreState,
          versionHistory: [mockVersionHistory[0]],
        });

        render(<WorkItemDetail workItemId="1" />);

        expect(screen.getByText(/\(1 version\)/)).toBeInTheDocument();
      });

      it('should not display version count when history is empty', () => {
        vi.mocked(useWorkItemStore).mockReturnValue({
          ...mockStoreState,
          versionHistory: [],
        });

        render(<WorkItemDetail workItemId="1" />);

        expect(screen.queryByText(/\(\d+ versions?\)/)).not.toBeInTheDocument();
      });

      it('should display correct count for various history lengths', () => {
        const testCases = [2, 5, 10, 15];

        testCases.forEach((count) => {
          const history = Array.from({ length: count }, (_, i) => ({
            version: `1.${i}`,
            title: `Version ${i}`,
            status: 'draft' as const,
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
          }));

          vi.mocked(useWorkItemStore).mockReturnValue({
            ...mockStoreState,
            versionHistory: history,
          });

          const { unmount } = render(<WorkItemDetail workItemId="1" />);
          expect(screen.getByText(new RegExp(`\\(${count} versions\\)`))).toBeInTheDocument();
          unmount();
        });
      });
    });

    describe('View History button visibility', () => {
      it('should display View History button when history is available', () => {
        render(<WorkItemDetail workItemId="1" onViewHistory={vi.fn()} />);

        expect(screen.getByText(/View History/)).toBeInTheDocument();
      });

      it('should not display View History button when history is empty', () => {
        vi.mocked(useWorkItemStore).mockReturnValue({
          ...mockStoreState,
          versionHistory: [],
        });

        render(<WorkItemDetail workItemId="1" onViewHistory={vi.fn()} />);

        expect(screen.queryByText(/View History/)).not.toBeInTheDocument();
      });

      it('should not display View History button when callback is not provided', () => {
        render(<WorkItemDetail workItemId="1" />);

        expect(screen.queryByText(/View History/)).not.toBeInTheDocument();
      });

      it('should call onViewHistory when button is clicked', async () => {
        const user = userEvent.setup();
        const onViewHistory = vi.fn();

        render(<WorkItemDetail workItemId="1" onViewHistory={onViewHistory} />);

        await user.click(screen.getByText(/View History/));

        expect(onViewHistory).toHaveBeenCalledWith(mockWorkItem);
      });

      it('should display View History button with prominent styling', () => {
        render(<WorkItemDetail workItemId="1" onViewHistory={vi.fn()} />);

        const button = screen.getByText(/View History/);
        expect(button).toBeInTheDocument();
        // Button should have icon
        expect(button.textContent).toContain('📜');
      });
    });
  });

  describe('Loading and error states', () => {
    it('should show loading state', () => {
      vi.mocked(useWorkItemStore).mockReturnValue({
        ...mockStoreState,
        isLoadingItem: true,
        selectedItem: null,
      });

      render(<WorkItemDetail workItemId="1" />);

      expect(screen.getByText('Loading work item...')).toBeInTheDocument();
    });

    it('should show error state', () => {
      vi.mocked(useWorkItemStore).mockReturnValue({
        ...mockStoreState,
        error: 'Failed to load',
        selectedItem: null,
      });

      render(<WorkItemDetail workItemId="1" />);

      expect(screen.getByText('Failed to load')).toBeInTheDocument();
    });

    it('should show not found state', () => {
      vi.mocked(useWorkItemStore).mockReturnValue({
        ...mockStoreState,
        selectedItem: null,
      });

      render(<WorkItemDetail workItemId="1" />);

      expect(screen.getByText('Work item not found')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onEdit when edit button is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      render(<WorkItemDetail workItemId="1" onEdit={onEdit} />);

      await user.click(screen.getByText('Edit'));

      expect(onEdit).toHaveBeenCalledWith(mockWorkItem);
    });

    it('should not show edit button for signed items', () => {
      vi.mocked(useWorkItemStore).mockReturnValue({
        ...mockStoreState,
        selectedItem: { ...mockWorkItem, is_signed: true },
      });

      render(<WorkItemDetail workItemId="1" onEdit={vi.fn()} />);

      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });
  });
});

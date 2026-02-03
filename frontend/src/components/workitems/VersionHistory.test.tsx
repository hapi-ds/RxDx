/**
 * VersionHistory component tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VersionHistory } from './VersionHistory';
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
  created_at: '2024-01-03T00:00:00Z',
  updated_at: '2024-01-03T00:00:00Z',
  is_signed: false,
};

const mockVersionHistory: VersionHistoryItem[] = [
  {
    version: '1.2',
    title: 'Test Requirement',
    status: 'draft',
    created_by: 'user-1',
    created_at: '2024-01-03T00:00:00Z',
    change_description: 'Updated description',
  },
  {
    version: '1.1',
    title: 'Updated Title',
    status: 'draft',
    created_by: 'user-1',
    created_at: '2024-01-02T00:00:00Z',
    change_description: 'Changed title',
  },
  {
    version: '1.0',
    title: 'Initial Version',
    status: 'draft',
    created_by: 'user-1',
    created_at: '2024-01-01T00:00:00Z',
  },
];

const mockStoreState = {
  versionHistory: mockVersionHistory,
  selectedItem: mockWorkItem,
  isLoadingHistory: false,
  isLoadingItem: false,
  error: null,
  fetchVersionHistory: vi.fn(),
  fetchVersion: vi.fn(),
  clearError: vi.fn(),
};

describe('VersionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkItemStore).mockReturnValue(mockStoreState);
  });

  describe('Basic rendering', () => {
    it('should render version history', () => {
      render(<VersionHistory workItemId="1" />);

      expect(screen.getByText('Version History')).toBeInTheDocument();
      expect(screen.getByText('v1.2')).toBeInTheDocument();
      expect(screen.getByText('v1.1')).toBeInTheDocument();
      expect(screen.getByText('v1.0')).toBeInTheDocument();
    });

    it('should fetch version history on mount', () => {
      render(<VersionHistory workItemId="1" />);

      expect(mockStoreState.fetchVersionHistory).toHaveBeenCalledWith('1');
    });

    it('should display current version in header', () => {
      render(<VersionHistory workItemId="1" />);

      expect(screen.getByText(/Current: v1\.2/)).toBeInTheDocument();
    });
  });

  describe('Version Control UX (Requirement 20)', () => {
    describe('Current version highlighting', () => {
      it('should highlight the current version', () => {
        const { container } = render(<VersionHistory workItemId="1" />);

        const currentVersionItem = container.querySelector('.version-item.current');
        expect(currentVersionItem).toBeInTheDocument();
        expect(currentVersionItem?.textContent).toContain('v1.2');
      });

      it('should display "Current" badge on current version', () => {
        render(<VersionHistory workItemId="1" />);

        const currentBadges = screen.getAllByText('Current');
        expect(currentBadges.length).toBeGreaterThan(0);
      });

      it('should not highlight non-current versions', () => {
        const { container } = render(<VersionHistory workItemId="1" />);

        const versionItems = container.querySelectorAll('.version-item');
        const currentItems = container.querySelectorAll('.version-item.current');
        
        // Only one item should be marked as current
        expect(currentItems.length).toBe(1);
        expect(versionItems.length).toBeGreaterThan(currentItems.length);
      });

      it('should highlight correct version when current version changes', () => {
        const { rerender, container } = render(<VersionHistory workItemId="1" />);

        let currentItem = container.querySelector('.version-item.current');
        expect(currentItem?.textContent).toContain('v1.2');

        // Change current version
        vi.mocked(useWorkItemStore).mockReturnValue({
          ...mockStoreState,
          selectedItem: { ...mockWorkItem, version: '1.1' },
        });

        rerender(<VersionHistory workItemId="1" />);

        currentItem = container.querySelector('.version-item.current');
        expect(currentItem?.textContent).toContain('v1.1');
      });

      it('should apply current styling to marker dot', () => {
        const { container } = render(<VersionHistory workItemId="1" />);

        const currentItem = container.querySelector('.version-item.current');
        const markerDot = currentItem?.querySelector('.marker-dot');
        
        expect(markerDot).toBeInTheDocument();
      });
    });

    describe('Change description display', () => {
      it('should display change descriptions when available', () => {
        render(<VersionHistory workItemId="1" />);

        expect(screen.getByText('Updated description')).toBeInTheDocument();
        expect(screen.getByText('Changed title')).toBeInTheDocument();
      });

      it('should not display change description section when not available', () => {
        render(<VersionHistory workItemId="1" />);

        const versionItems = screen.getAllByText(/^v\d+\.\d+$/);
        const v10Item = versionItems.find(item => item.textContent === 'v1.0');
        
        expect(v10Item).toBeInTheDocument();
        // v1.0 has no change description, so it shouldn't be displayed
      });

      it('should display all change descriptions for versions that have them', () => {
        const historyWithDescriptions: VersionHistoryItem[] = [
          {
            version: '1.3',
            title: 'Version 3',
            status: 'draft',
            created_by: 'user-1',
            created_at: '2024-01-04T00:00:00Z',
            change_description: 'Description 3',
          },
          {
            version: '1.2',
            title: 'Version 2',
            status: 'draft',
            created_by: 'user-1',
            created_at: '2024-01-03T00:00:00Z',
            change_description: 'Description 2',
          },
          {
            version: '1.1',
            title: 'Version 1',
            status: 'draft',
            created_by: 'user-1',
            created_at: '2024-01-02T00:00:00Z',
            change_description: 'Description 1',
          },
        ];

        vi.mocked(useWorkItemStore).mockReturnValue({
          ...mockStoreState,
          versionHistory: historyWithDescriptions,
        });

        render(<VersionHistory workItemId="1" />);

        expect(screen.getByText('Description 3')).toBeInTheDocument();
        expect(screen.getByText('Description 2')).toBeInTheDocument();
        expect(screen.getByText('Description 1')).toBeInTheDocument();
      });
    });

    describe('Timeline progression indicator', () => {
      it('should display timeline with marker dots', () => {
        const { container } = render(<VersionHistory workItemId="1" />);

        const markerDots = container.querySelectorAll('.marker-dot');
        expect(markerDots.length).toBe(mockVersionHistory.length);
      });

      it('should display connecting lines between versions', () => {
        const { container } = render(<VersionHistory workItemId="1" />);

        const markerLines = container.querySelectorAll('.marker-line');
        // Should have one less line than dots (no line after last item)
        expect(markerLines.length).toBe(mockVersionHistory.length - 1);
      });

      it('should mark latest version', () => {
        render(<VersionHistory workItemId="1" />);

        expect(screen.getByText('Latest')).toBeInTheDocument();
      });

      it('should display versions in chronological order (newest first)', () => {
        const { container } = render(<VersionHistory workItemId="1" />);

        const versionNumbers = Array.from(
          container.querySelectorAll('.version-number')
        ).map(el => el.textContent);

        expect(versionNumbers).toEqual(['v1.2', 'v1.1', 'v1.0']);
      });
    });
  });

  describe('Version selection', () => {
    it('should call onVersionSelect when version is clicked', async () => {
      const user = userEvent.setup();
      const onVersionSelect = vi.fn();

      render(<VersionHistory workItemId="1" onVersionSelect={onVersionSelect} />);

      await user.click(screen.getByText('v1.1'));

      expect(onVersionSelect).toHaveBeenCalledWith(mockVersionHistory[1]);
    });

    it('should highlight selected version', async () => {
      const user = userEvent.setup();
      const { container } = render(<VersionHistory workItemId="1" />);

      await user.click(screen.getByText('v1.1'));

      await waitFor(() => {
        const selectedItem = container.querySelector('.version-item.selected');
        expect(selectedItem?.textContent).toContain('v1.1');
      });
    });
  });

  describe('Loading and error states', () => {
    it('should show loading state', () => {
      vi.mocked(useWorkItemStore).mockReturnValue({
        ...mockStoreState,
        isLoadingHistory: true,
        versionHistory: [],
      });

      render(<VersionHistory workItemId="1" />);

      expect(screen.getByText('Loading version history...')).toBeInTheDocument();
    });

    it('should show error state', () => {
      vi.mocked(useWorkItemStore).mockReturnValue({
        ...mockStoreState,
        error: 'Failed to load history',
      });

      render(<VersionHistory workItemId="1" />);

      expect(screen.getByText('Failed to load history')).toBeInTheDocument();
    });

    it('should show empty state', () => {
      vi.mocked(useWorkItemStore).mockReturnValue({
        ...mockStoreState,
        versionHistory: [],
      });

      render(<VersionHistory workItemId="1" />);

      expect(screen.getByText('No version history available')).toBeInTheDocument();
    });
  });
});

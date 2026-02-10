/**
 * WorkItem store tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkItemStore } from './workitemStore';
import { workitemService } from '../services/workitemService';
import type { WorkItem, WorkItemListResponse } from '../services/workitemService';

// Mock the workitem service
vi.mock('../services/workitemService', () => ({
  workitemService: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getHistory: vi.fn(),
    getVersion: vi.fn(),
    bulkUpdate: vi.fn(),
  },
}));

const mockWorkItem: WorkItem = {
  id: 'test-id-1',
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

const mockWorkItem2: WorkItem = {
  id: 'test-id-2',
  type: 'task',
  title: 'Test Task',
  description: 'Test task description',
  status: 'draft',
  priority: 1,
  assigned_to: 'user-2',
  version: '1.0',
  created_by: 'user-2',
  created_at: '2024-01-02T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
  is_signed: false,
};

const mockWorkItem3: WorkItem = {
  id: 'test-id-3',
  type: 'test',
  title: 'Test Case',
  description: 'Test case description',
  status: 'active',
  priority: 3,
  assigned_to: 'user-3',
  version: '1.0',
  created_by: 'user-3',
  created_at: '2024-01-03T00:00:00Z',
  updated_at: '2024-01-03T00:00:00Z',
  is_signed: false,
};

const mockListResponse: WorkItemListResponse = {
  items: [mockWorkItem],
  total: 1,
  skip: 0,
  limit: 20,
};

describe('workitemStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useWorkItemStore.getState().reset();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useWorkItemStore.getState();
      
      expect(state.items).toEqual([]);
      expect(state.selectedItem).toBeNull();
      expect(state.versionHistory).toEqual([]);
      expect(state.total).toBe(0);
      expect(state.skip).toBe(0);
      expect(state.limit).toBe(20);
      expect(state.filters).toEqual({});
      expect(state.selectedIds).toEqual(new Set());
      expect(state.isBulkEditing).toBe(false);
      expect(state.isBulkUpdating).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('fetchItems', () => {
    it('should fetch items successfully', async () => {
      vi.mocked(workitemService.list).mockResolvedValue(mockListResponse);

      await useWorkItemStore.getState().fetchItems();

      const state = useWorkItemStore.getState();
      expect(state.items).toEqual([mockWorkItem]);
      expect(state.total).toBe(1);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should handle fetch error', async () => {
      vi.mocked(workitemService.list).mockRejectedValue(new Error('Network error'));

      await useWorkItemStore.getState().fetchItems();

      const state = useWorkItemStore.getState();
      expect(state.items).toEqual([]);
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);
    });

    it('should apply filters when fetching', async () => {
      vi.mocked(workitemService.list).mockResolvedValue(mockListResponse);

      useWorkItemStore.getState().setFilters({ type: 'requirement', status: 'draft' });
      await useWorkItemStore.getState().fetchItems();

      expect(workitemService.list).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'requirement',
          status: 'draft',
        })
      );
    });
  });

  describe('fetchItem', () => {
    it('should fetch single item successfully', async () => {
      vi.mocked(workitemService.get).mockResolvedValue(mockWorkItem);

      await useWorkItemStore.getState().fetchItem('test-id-1');

      const state = useWorkItemStore.getState();
      expect(state.selectedItem).toEqual(mockWorkItem);
      expect(state.isLoadingItem).toBe(false);
    });

    it('should handle fetch item error', async () => {
      vi.mocked(workitemService.get).mockRejectedValue(new Error('Not found'));

      await useWorkItemStore.getState().fetchItem('invalid-id');

      const state = useWorkItemStore.getState();
      expect(state.selectedItem).toBeNull();
      expect(state.error).toBe('Not found');
    });
  });

  describe('createItem', () => {
    it('should create item successfully', async () => {
      vi.mocked(workitemService.create).mockResolvedValue(mockWorkItem);

      const result = await useWorkItemStore.getState().createItem({
        type: 'requirement',
        title: 'Test Requirement',
      });

      const state = useWorkItemStore.getState();
      expect(result).toEqual(mockWorkItem);
      expect(state.items).toContain(mockWorkItem);
      expect(state.total).toBe(1);
      expect(state.isSaving).toBe(false);
    });

    it('should handle create error', async () => {
      vi.mocked(workitemService.create).mockRejectedValue(new Error('Validation error'));

      await expect(
        useWorkItemStore.getState().createItem({
          type: 'requirement',
          title: '',
        })
      ).rejects.toThrow('Validation error');

      const state = useWorkItemStore.getState();
      expect(state.error).toBe('Validation error');
    });
  });

  describe('updateItem', () => {
    it('should update item successfully', async () => {
      const updatedItem = { ...mockWorkItem, title: 'Updated Title' };
      vi.mocked(workitemService.update).mockResolvedValue(updatedItem);

      // First add item to store
      useWorkItemStore.setState({ items: [mockWorkItem] });

      const result = await useWorkItemStore.getState().updateItem('test-id-1', {
        title: 'Updated Title',
      });

      const state = useWorkItemStore.getState();
      expect(result.title).toBe('Updated Title');
      expect(state.items[0].title).toBe('Updated Title');
    });

    it('should update selected item if it matches', async () => {
      const updatedItem = { ...mockWorkItem, title: 'Updated Title' };
      vi.mocked(workitemService.update).mockResolvedValue(updatedItem);

      useWorkItemStore.setState({ 
        items: [mockWorkItem],
        selectedItem: mockWorkItem,
      });

      await useWorkItemStore.getState().updateItem('test-id-1', {
        title: 'Updated Title',
      });

      const state = useWorkItemStore.getState();
      expect(state.selectedItem?.title).toBe('Updated Title');
    });
  });

  describe('deleteItem', () => {
    it('should delete item successfully', async () => {
      vi.mocked(workitemService.delete).mockResolvedValue(undefined);

      useWorkItemStore.setState({ 
        items: [mockWorkItem],
        total: 1,
      });

      await useWorkItemStore.getState().deleteItem('test-id-1');

      const state = useWorkItemStore.getState();
      expect(state.items).toEqual([]);
      expect(state.total).toBe(0);
    });

    it('should clear selected item if deleted', async () => {
      vi.mocked(workitemService.delete).mockResolvedValue(undefined);

      useWorkItemStore.setState({ 
        items: [mockWorkItem],
        selectedItem: mockWorkItem,
        total: 1,
      });

      await useWorkItemStore.getState().deleteItem('test-id-1');

      const state = useWorkItemStore.getState();
      expect(state.selectedItem).toBeNull();
    });
  });

  describe('filters', () => {
    it('should set filters and reset pagination', () => {
      useWorkItemStore.setState({ skip: 20 });

      useWorkItemStore.getState().setFilters({ type: 'task' });

      const state = useWorkItemStore.getState();
      expect(state.filters.type).toBe('task');
      expect(state.skip).toBe(0);
    });

    it('should clear filters', () => {
      useWorkItemStore.setState({ 
        filters: { type: 'task', status: 'active' },
        skip: 20,
      });

      useWorkItemStore.getState().clearFilters();

      const state = useWorkItemStore.getState();
      expect(state.filters).toEqual({});
      expect(state.skip).toBe(0);
    });
  });

  describe('pagination', () => {
    it('should set page', () => {
      useWorkItemStore.getState().setPage(40);

      const state = useWorkItemStore.getState();
      expect(state.skip).toBe(40);
    });

    it('should set limit and reset pagination', () => {
      useWorkItemStore.setState({ skip: 20 });

      useWorkItemStore.getState().setLimit(50);

      const state = useWorkItemStore.getState();
      expect(state.limit).toBe(50);
      expect(state.skip).toBe(0);
    });
  });

  describe('selection', () => {
    it('should select item', () => {
      useWorkItemStore.getState().selectItem(mockWorkItem);

      const state = useWorkItemStore.getState();
      expect(state.selectedItem).toEqual(mockWorkItem);
    });

    it('should clear selection', () => {
      useWorkItemStore.setState({ 
        selectedItem: mockWorkItem,
        versionHistory: [{ version: '1.0', title: 'Test', status: 'draft', created_by: 'user', created_at: '' }],
      });

      useWorkItemStore.getState().clearSelection();

      const state = useWorkItemStore.getState();
      expect(state.selectedItem).toBeNull();
      expect(state.versionHistory).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should clear error', () => {
      useWorkItemStore.setState({ error: 'Some error' });

      useWorkItemStore.getState().clearError();

      const state = useWorkItemStore.getState();
      expect(state.error).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset to initial state', () => {
      useWorkItemStore.setState({
        items: [mockWorkItem],
        selectedItem: mockWorkItem,
        total: 1,
        skip: 20,
        filters: { type: 'task' },
        error: 'Some error',
      });

      useWorkItemStore.getState().reset();

      const state = useWorkItemStore.getState();
      expect(state.items).toEqual([]);
      expect(state.selectedItem).toBeNull();
      expect(state.total).toBe(0);
      expect(state.skip).toBe(0);
      expect(state.filters).toEqual({});
      expect(state.error).toBeNull();
    });
  });

  describe('bulk edit', () => {
    describe('toggleBulkEdit', () => {
      it('should toggle bulk edit mode on', () => {
        useWorkItemStore.getState().toggleBulkEdit();

        const state = useWorkItemStore.getState();
        expect(state.isBulkEditing).toBe(true);
      });

      it('should toggle bulk edit mode off', () => {
        useWorkItemStore.setState({ isBulkEditing: true });

        useWorkItemStore.getState().toggleBulkEdit();

        const state = useWorkItemStore.getState();
        expect(state.isBulkEditing).toBe(false);
      });

      it('should clear selections when toggling', () => {
        useWorkItemStore.setState({ 
          selectedIds: new Set(['test-id-1', 'test-id-2']),
        });

        useWorkItemStore.getState().toggleBulkEdit();

        const state = useWorkItemStore.getState();
        expect(state.selectedIds.size).toBe(0);
      });
    });

    describe('selectItemForBulk', () => {
      it('should select an item', () => {
        useWorkItemStore.getState().selectItemForBulk('test-id-1');

        const state = useWorkItemStore.getState();
        expect(state.selectedIds.has('test-id-1')).toBe(true);
      });

      it('should select multiple items', () => {
        useWorkItemStore.getState().selectItemForBulk('test-id-1');
        useWorkItemStore.getState().selectItemForBulk('test-id-2');

        const state = useWorkItemStore.getState();
        expect(state.selectedIds.has('test-id-1')).toBe(true);
        expect(state.selectedIds.has('test-id-2')).toBe(true);
        expect(state.selectedIds.size).toBe(2);
      });

      it('should not duplicate selections', () => {
        useWorkItemStore.getState().selectItemForBulk('test-id-1');
        useWorkItemStore.getState().selectItemForBulk('test-id-1');

        const state = useWorkItemStore.getState();
        expect(state.selectedIds.size).toBe(1);
      });
    });

    describe('deselectItemForBulk', () => {
      it('should deselect an item', () => {
        useWorkItemStore.setState({ 
          selectedIds: new Set(['test-id-1', 'test-id-2']),
        });

        useWorkItemStore.getState().deselectItemForBulk('test-id-1');

        const state = useWorkItemStore.getState();
        expect(state.selectedIds.has('test-id-1')).toBe(false);
        expect(state.selectedIds.has('test-id-2')).toBe(true);
        expect(state.selectedIds.size).toBe(1);
      });

      it('should handle deselecting non-existent item', () => {
        useWorkItemStore.setState({ 
          selectedIds: new Set(['test-id-1']),
        });

        useWorkItemStore.getState().deselectItemForBulk('test-id-2');

        const state = useWorkItemStore.getState();
        expect(state.selectedIds.size).toBe(1);
      });
    });

    describe('selectAll', () => {
      it('should select all items', () => {
        useWorkItemStore.setState({ 
          items: [mockWorkItem, mockWorkItem2, mockWorkItem3],
        });

        useWorkItemStore.getState().selectAll();

        const state = useWorkItemStore.getState();
        expect(state.selectedIds.size).toBe(3);
        expect(state.selectedIds.has('test-id-1')).toBe(true);
        expect(state.selectedIds.has('test-id-2')).toBe(true);
        expect(state.selectedIds.has('test-id-3')).toBe(true);
      });

      it('should handle empty items list', () => {
        useWorkItemStore.setState({ items: [] });

        useWorkItemStore.getState().selectAll();

        const state = useWorkItemStore.getState();
        expect(state.selectedIds.size).toBe(0);
      });
    });

    describe('deselectAll', () => {
      it('should deselect all items', () => {
        useWorkItemStore.setState({ 
          selectedIds: new Set(['test-id-1', 'test-id-2', 'test-id-3']),
        });

        useWorkItemStore.getState().deselectAll();

        const state = useWorkItemStore.getState();
        expect(state.selectedIds.size).toBe(0);
      });
    });

    describe('bulkUpdate', () => {
      it('should bulk update items successfully', async () => {
        const updatedItem1 = { ...mockWorkItem, status: 'active' as const };
        const updatedItem2 = { ...mockWorkItem2, status: 'active' as const };

        vi.mocked(workitemService.bulkUpdate).mockResolvedValue({
          updated: [updatedItem1, updatedItem2],
          failed: [],
        });

        useWorkItemStore.setState({ 
          items: [mockWorkItem, mockWorkItem2, mockWorkItem3],
          selectedIds: new Set(['test-id-1', 'test-id-2']),
          isBulkEditing: true,
        });

        await useWorkItemStore.getState().bulkUpdate({ status: 'active' });

        const state = useWorkItemStore.getState();
        expect(state.items[0].status).toBe('active');
        expect(state.items[1].status).toBe('active');
        expect(state.items[2].status).toBe('active'); // unchanged
        expect(state.isBulkUpdating).toBe(false);
        expect(state.isBulkEditing).toBe(false);
        expect(state.selectedIds.size).toBe(0);
      });

      it('should handle partial failures', async () => {
        const updatedItem1 = { ...mockWorkItem, status: 'active' as const };

        vi.mocked(workitemService.bulkUpdate).mockResolvedValue({
          updated: [updatedItem1],
          failed: [{ id: 'test-id-2', error: 'Permission denied' }],
        });

        useWorkItemStore.setState({ 
          items: [mockWorkItem, mockWorkItem2],
          selectedIds: new Set(['test-id-1', 'test-id-2']),
        });

        await useWorkItemStore.getState().bulkUpdate({ status: 'active' });

        const state = useWorkItemStore.getState();
        expect(state.items[0].status).toBe('active');
        expect(state.error).toContain('1 success');
        expect(state.error).toContain('1 failure');
      });

      it('should handle no items selected', async () => {
        useWorkItemStore.setState({ 
          items: [mockWorkItem],
          selectedIds: new Set(),
        });

        await useWorkItemStore.getState().bulkUpdate({ status: 'active' });

        const state = useWorkItemStore.getState();
        expect(state.error).toBe('No items selected for bulk update');
        expect(workitemService.bulkUpdate).not.toHaveBeenCalled();
      });

      it('should handle bulk update error', async () => {
        vi.mocked(workitemService.bulkUpdate).mockRejectedValue(
          new Error('Network error')
        );

        useWorkItemStore.setState({ 
          items: [mockWorkItem, mockWorkItem2],
          selectedIds: new Set(['test-id-1', 'test-id-2']),
        });

        await expect(
          useWorkItemStore.getState().bulkUpdate({ status: 'active' })
        ).rejects.toThrow('Network error');

        const state = useWorkItemStore.getState();
        expect(state.error).toBe('Network error');
        expect(state.isBulkUpdating).toBe(false);
      });

      it('should update multiple fields', async () => {
        const updatedItem1 = { 
          ...mockWorkItem, 
          status: 'completed' as const,
          priority: 5,
          assigned_to: 'new-user',
        };

        vi.mocked(workitemService.bulkUpdate).mockResolvedValue({
          updated: [updatedItem1],
          failed: [],
        });

        useWorkItemStore.setState({ 
          items: [mockWorkItem],
          selectedIds: new Set(['test-id-1']),
        });

        await useWorkItemStore.getState().bulkUpdate({ 
          status: 'completed',
          priority: 5,
          assigned_to: 'new-user',
        });

        const state = useWorkItemStore.getState();
        expect(state.items[0].status).toBe('completed');
        expect(state.items[0].priority).toBe(5);
        expect(state.items[0].assigned_to).toBe('new-user');
      });
    });
  });
});

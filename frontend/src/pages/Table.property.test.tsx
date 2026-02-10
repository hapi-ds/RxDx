/**
 * Property-based tests for Table page bulk edit functionality
 * Feature: graph-table-ui-enhancements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { useWorkItemStore } from '../stores/workitemStore';
import type { WorkItem, WorkItemStatus, BulkUpdateData } from '../services/workitemService';
import { workitemService } from '../services/workitemService';

// Mock the workitemService
vi.mock('../services/workitemService', () => ({
  workitemService: {
    list: vi.fn(),
    bulkUpdate: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getHistory: vi.fn(),
    getVersion: vi.fn(),
  },
}));

describe('Table Page - Property-Based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useWorkItemStore.setState({
      items: [],
      selectedIds: new Set(),
      isBulkEditing: false,
      isBulkUpdating: false,
      isLoading: false,
      error: null,
      filters: {},
      total: 0,
      skip: 0,
      limit: 20,
      selectedItem: null,
      versionHistory: [],
      isLoadingItem: false,
      isLoadingHistory: false,
      isSaving: false,
      isDeleting: false,
    });
  });

  /**
   * Property 19: Table Refresh After Bulk Update
   * 
   * For any successful bulk update operation, the table should refresh
   * and display the updated values for all affected work items.
   * 
   * Validates: Requirements 17.12
   */
  it('Feature: graph-table-ui-enhancements, Property 19: Table Refresh After Bulk Update', async () => {
    // Arbitraries for generating test data
    const workItemIdArbitrary = fc.uuid();
    
    const statusArbitrary = fc.constantFrom<WorkItemStatus>(
      'draft',
      'active',
      'completed',
      'archived'
    );
    
    const workItemArbitrary = fc.record({
      id: workItemIdArbitrary,
      type: fc.constantFrom('requirement', 'task', 'test', 'risk', 'document'),
      title: fc.string({ minLength: 5, maxLength: 50 }),
      description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
      status: statusArbitrary,
      priority: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
      assigned_to: fc.option(fc.string({ minLength: 5, maxLength: 30 }), { nil: undefined }),
      version: fc.constant('1.0'),
      created_by: workItemIdArbitrary,
      created_at: fc.constant(new Date().toISOString()),
      updated_at: fc.constant(new Date().toISOString()),
      is_signed: fc.boolean(),
    }) as fc.Arbitrary<WorkItem>;

    // Generate array of work items (2-5 items)
    const workItemsArbitrary = fc.array(workItemArbitrary, { minLength: 2, maxLength: 5 });
    
    const newStatusArbitrary = fc.constantFrom<WorkItemStatus>(
      'active',
      'completed',
      'archived'
    );

    await fc.assert(
      fc.asyncProperty(
        workItemsArbitrary,
        newStatusArbitrary,
        async (initialItems, newStatus) => {
          // Setup initial store state with items
          useWorkItemStore.setState({
            items: initialItems,
            total: initialItems.length,
            isLoading: false,
            isBulkEditing: true,
            selectedIds: new Set(initialItems.map(item => item.id)),
          });

          // Create updated items with new status
          const updatedItems = initialItems.map(item => ({
            ...item,
            status: newStatus,
          }));

          // Mock the bulk update service to return updated items
          vi.mocked(workitemService.bulkUpdate).mockResolvedValue({
            updated: updatedItems,
            failed: [],
          });

          // Perform bulk update
          const updateData: BulkUpdateData = { status: newStatus };
          await useWorkItemStore.getState().bulkUpdate(updateData);

          // Wait for async operations to complete
          await new Promise(resolve => setTimeout(resolve, 50));

          // Property: After successful bulk update, all items in the store should have the new status
          const storeItems = useWorkItemStore.getState().items;
          expect(storeItems.length).toBe(initialItems.length);
          
          storeItems.forEach(item => {
            expect(item.status).toBe(newStatus);
          });

          // Property: Bulk edit mode should be exited
          expect(useWorkItemStore.getState().isBulkEditing).toBe(false);
          
          // Property: Selected IDs should be cleared
          expect(useWorkItemStore.getState().selectedIds.size).toBe(0);

          // Property: Bulk updating flag should be false
          expect(useWorkItemStore.getState().isBulkUpdating).toBe(false);
        }
      ),
      { numRuns: 20, timeout: 10000 }
    );
  }, 15000); // Set test timeout to 15 seconds
});

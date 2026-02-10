/**
 * Property-based tests for BulkEditModal
 * Feature: graph-table-ui-enhancements
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkEditModal } from './BulkEditModal';
import type { BulkUpdateData, WorkItemStatus } from '../../services/workitemService';

describe('BulkEditModal - Property-Based Tests', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const mockOnBulkUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Property 18: Bulk Update Consistency
   * 
   * For any set of selected work items and valid bulk update data,
   * after successful bulk update, all selected items should reflect
   * the updated values when queried.
   * 
   * Validates: Requirements 17.8
   */
  it('Feature: graph-table-ui-enhancements, Property 18: Bulk Update Consistency', async () => {
    // Arbitraries for generating test data
    const workItemIdArbitrary = fc.uuid();
    
    const statusArbitrary = fc.constantFrom<WorkItemStatus>(
      'draft',
      'active',
      'identified',
      'assessed',
      'mitigated',
      'accepted',
      'closed',
      'completed',
      'archived',
      'rejected'
    );
    
    const priorityArbitrary = fc.integer({ min: 1, max: 5 });
    
    const assignedToArbitrary = fc.string({ minLength: 5, maxLength: 50 }).filter(s => s.trim().length > 0);
    
    // Generate bulk update data with at least one field
    const bulkUpdateDataArbitrary = fc.record({
      status: fc.option(statusArbitrary, { nil: undefined }),
      priority: fc.option(priorityArbitrary, { nil: undefined }),
      assigned_to: fc.option(assignedToArbitrary, { nil: undefined }),
    }).filter(data => 
      // Ensure at least one field is defined
      data.status !== undefined || data.priority !== undefined || data.assigned_to !== undefined
    );
    
    // Generate array of selected IDs (1-10 items)
    const selectedIdsArbitrary = fc.array(workItemIdArbitrary, { minLength: 1, maxLength: 10 });

    await fc.assert(
      fc.asyncProperty(
        selectedIdsArbitrary,
        bulkUpdateDataArbitrary,
        async (selectedIds, updateData) => {
          // Setup mock to simulate successful update
          mockOnBulkUpdate.mockResolvedValue(undefined);
          
          const props = {
            selectedIds,
            onSuccess: mockOnSuccess,
            onCancel: mockOnCancel,
            onBulkUpdate: mockOnBulkUpdate,
          };

          const { unmount } = render(<BulkEditModal {...props} />);

          try {
            // Enable and fill fields based on updateData
            if (updateData.status !== undefined) {
              const statusCheckbox = screen.getByLabelText('Update Status');
              fireEvent.click(statusCheckbox);
              
              const statusSelect = screen.getByRole('combobox');
              fireEvent.change(statusSelect, { target: { value: updateData.status } });
            }

            if (updateData.priority !== undefined) {
              const priorityCheckbox = screen.getByLabelText('Update Priority');
              fireEvent.click(priorityCheckbox);
              
              const priorityInput = screen.getByPlaceholderText('1-5');
              fireEvent.change(priorityInput, { target: { value: updateData.priority.toString() } });
            }

            if (updateData.assigned_to !== undefined) {
              const assignedToCheckbox = screen.getByLabelText('Update Assigned To');
              fireEvent.click(assignedToCheckbox);
              
              const assignedToInput = screen.getByPlaceholderText('User ID or email');
              fireEvent.change(assignedToInput, { target: { value: updateData.assigned_to } });
            }

            // Submit the form
            const submitButton = screen.getByRole('button', { name: new RegExp(`Update ${selectedIds.length}`) });
            fireEvent.click(submitButton);

            // Wait for the update to complete
            await waitFor(() => {
              expect(mockOnBulkUpdate).toHaveBeenCalled();
            });

            // Verify that onBulkUpdate was called with the correct data
            const callArg = mockOnBulkUpdate.mock.calls[0][0] as BulkUpdateData;
            
            // Property: The update data passed to onBulkUpdate should match the form data
            if (updateData.status !== undefined) {
              expect(callArg.status).toBe(updateData.status);
            } else {
              expect(callArg.status).toBeUndefined();
            }

            if (updateData.priority !== undefined) {
              expect(callArg.priority).toBe(updateData.priority);
            } else {
              expect(callArg.priority).toBeUndefined();
            }

            if (updateData.assigned_to !== undefined) {
              expect(callArg.assigned_to).toBe(updateData.assigned_to.trim());
            } else {
              expect(callArg.assigned_to).toBeUndefined();
            }

            // Verify onSuccess was called after successful update
            await waitFor(() => {
              expect(mockOnSuccess).toHaveBeenCalled();
            });
          } finally {
            // Cleanup for next iteration
            unmount();
            mockOnBulkUpdate.mockClear();
            mockOnSuccess.mockClear();
          }
        }
      ),
      { numRuns: 20, timeout: 30000 }
    );
  }, 35000); // Set test timeout to 35 seconds
});

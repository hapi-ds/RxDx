/**
 * Performance tests for BulkEditModal component
 * 
 * Tests bulk update time to ensure reasonable performance
 * (Requirement 13.1)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkEditModal } from './BulkEditModal';
import * as workitemService from '../../services/workitemService';

// Mock the workitem service
vi.mock('../../services/workitemService', () => ({
  workitemService: {
    bulkUpdate: vi.fn(),
  },
}));

describe('BulkEditModal Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle bulk update of 10 items within reasonable time', async () => {
    const user = userEvent.setup();
    const selectedIds = Array.from({ length: 10 }, (_, i) => `item-${i}`);
    const onSuccess = vi.fn();
    const onCancel = vi.fn();

    // Mock successful bulk update
    vi.mocked(workitemService.workitemService.bulkUpdate).mockResolvedValue([]);

    render(
      <BulkEditModal
        selectedIds={selectedIds}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );

    // Fill in the form
    const statusCheckbox = screen.getByLabelText(/update status/i);
    await user.click(statusCheckbox);

    const statusSelect = screen.getByLabelText(/status/i);
    await user.selectOptions(statusSelect, 'active');

    // Measure time to submit
    const startTime = performance.now();
    
    const submitButton = screen.getByRole('button', { name: /update \d+ items/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify bulk update was called
    expect(workitemService.workitemService.bulkUpdate).toHaveBeenCalledWith(
      selectedIds,
      expect.objectContaining({ status: 'active' })
    );

    // Verify update time is reasonable (under 2000ms for 10 items)
    expect(duration).toBeLessThan(2000);
    console.log(`Bulk update time for 10 items: ${duration.toFixed(2)}ms`);
  });

  it('should handle bulk update of 50 items within reasonable time', async () => {
    const user = userEvent.setup();
    const selectedIds = Array.from({ length: 50 }, (_, i) => `item-${i}`);
    const onSuccess = vi.fn();
    const onCancel = vi.fn();

    // Mock successful bulk update with delay to simulate network
    vi.mocked(workitemService.workitemService.bulkUpdate).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 500))
    );

    render(
      <BulkEditModal
        selectedIds={selectedIds}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );

    // Fill in the form
    const statusCheckbox = screen.getByLabelText(/update status/i);
    await user.click(statusCheckbox);

    const statusSelect = screen.getByLabelText(/status/i);
    await user.selectOptions(statusSelect, 'active');

    // Measure time to submit
    const startTime = performance.now();
    
    const submitButton = screen.getByRole('button', { name: /update \d+ items/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    }, { timeout: 5000 });
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify bulk update was called
    expect(workitemService.workitemService.bulkUpdate).toHaveBeenCalledWith(
      selectedIds,
      expect.objectContaining({ status: 'active' })
    );

    // Verify update time is reasonable (under 5000ms for 50 items)
    expect(duration).toBeLessThan(5000);
    console.log(`Bulk update time for 50 items: ${duration.toFixed(2)}ms`);
  });

  it('should handle bulk update of 100 items within reasonable time', async () => {
    const user = userEvent.setup();
    const selectedIds = Array.from({ length: 100 }, (_, i) => `item-${i}`);
    const onSuccess = vi.fn();
    const onCancel = vi.fn();

    // Mock successful bulk update with delay to simulate network
    vi.mocked(workitemService.workitemService.bulkUpdate).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 1000))
    );

    render(
      <BulkEditModal
        selectedIds={selectedIds}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );

    // Fill in the form
    const statusCheckbox = screen.getByLabelText(/update status/i);
    await user.click(statusCheckbox);

    const statusSelect = screen.getByLabelText(/status/i);
    await user.selectOptions(statusSelect, 'active');

    // Measure time to submit
    const startTime = performance.now();
    
    const submitButton = screen.getByRole('button', { name: /update \d+ items/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    }, { timeout: 10000 });
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify bulk update was called
    expect(workitemService.workitemService.bulkUpdate).toHaveBeenCalledWith(
      selectedIds,
      expect.objectContaining({ status: 'active' })
    );

    // Verify update time is reasonable (under 10000ms for 100 items)
    expect(duration).toBeLessThan(10000);
    console.log(`Bulk update time for 100 items: ${duration.toFixed(2)}ms`);
  });

  it('should render form efficiently with large selection', () => {
    const selectedIds = Array.from({ length: 100 }, (_, i) => `item-${i}`);
    const onSuccess = vi.fn();
    const onCancel = vi.fn();

    // Measure render time
    const startTime = performance.now();
    
    render(
      <BulkEditModal
        selectedIds={selectedIds}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify modal rendered
    expect(screen.getByText(/bulk edit/i)).toBeInTheDocument();
    expect(screen.getByText(/100 items selected/i)).toBeInTheDocument();

    // Verify render time is reasonable (under 500ms)
    expect(duration).toBeLessThan(500);
    console.log(`Render time for 100 selected items: ${duration.toFixed(2)}ms`);
  });

  it('should show progress indicator during bulk update', async () => {
    const user = userEvent.setup();
    const selectedIds = Array.from({ length: 50 }, (_, i) => `item-${i}`);
    const onSuccess = vi.fn();
    const onCancel = vi.fn();

    // Mock bulk update with delay
    vi.mocked(workitemService.workitemService.bulkUpdate).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 1000))
    );

    render(
      <BulkEditModal
        selectedIds={selectedIds}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    );

    // Fill in the form
    const statusCheckbox = screen.getByLabelText(/update status/i);
    await user.click(statusCheckbox);

    const statusSelect = screen.getByLabelText(/status/i);
    await user.selectOptions(statusSelect, 'active');

    // Submit
    const submitButton = screen.getByRole('button', { name: /update \d+ items/i });
    await user.click(submitButton);

    // Verify progress indicator appears
    await waitFor(() => {
      expect(screen.getByText(/updating/i)).toBeInTheDocument();
    });

    // Wait for completion
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    }, { timeout: 5000 });
  });
});

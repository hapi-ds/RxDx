/**
 * Performance tests for NodeTypeFilter component
 * 
 * Tests filter update time to ensure it meets the 500ms requirement
 * (Requirement 13.1)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NodeTypeFilter } from './NodeTypeFilter';
import type { NodeTypeOption } from '../../types/filters';

describe('NodeTypeFilter Performance Tests', () => {
  const mockAvailableTypes: NodeTypeOption[] = [
    { value: 'requirement', label: 'Requirement', category: 'workitems', color: '#3b82f6' },
    { value: 'task', label: 'Task', category: 'workitems', color: '#10b981' },
    { value: 'test', label: 'Test', category: 'workitems', color: '#f59e0b' },
    { value: 'risk', label: 'Risk', category: 'workitems', color: '#ef4444' },
    { value: 'document', label: 'Document', category: 'workitems', color: '#8b5cf6' },
    { value: 'Project', label: 'Project', category: 'structure', color: '#06b6d4' },
    { value: 'Phase', label: 'Phase', category: 'structure', color: '#14b8a6' },
    { value: 'Workpackage', label: 'Workpackage', category: 'structure', color: '#84cc16' },
    { value: 'Resource', label: 'Resource', category: 'resources', color: '#f97316' },
    { value: 'Company', label: 'Company', category: 'resources', color: '#ec4899' },
  ];

  it('should update filter within 500ms (Requirement 13.1)', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const selectedTypes = new Set<string>(['requirement', 'task']);

    render(
      <NodeTypeFilter
        selectedTypes={selectedTypes}
        onChange={onChange}
        availableTypes={mockAvailableTypes}
      />
    );

    // Measure time to toggle a filter (including debounce delay)
    const startTime = performance.now();
    
    const checkbox = screen.getByLabelText('Filter by Test');
    await user.click(checkbox);
    
    // Wait for debounced onChange to be called (300ms debounce + buffer)
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    }, { timeout: 500 });
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify update time is under 500ms (including debounce)
    expect(duration).toBeLessThan(500);
    console.log(`Filter update time (with debounce): ${duration.toFixed(2)}ms`);
  });

  it('should handle rapid filter changes efficiently', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const selectedTypes = new Set<string>();

    render(
      <NodeTypeFilter
        selectedTypes={selectedTypes}
        onChange={onChange}
        availableTypes={mockAvailableTypes}
      />
    );

    // Measure time for multiple rapid changes (including debounce)
    const startTime = performance.now();
    
    // Toggle multiple filters rapidly
    const requirementCheckbox = screen.getByLabelText('Filter by Requirement');
    const taskCheckbox = screen.getByLabelText('Filter by Task');
    const testCheckbox = screen.getByLabelText('Filter by Test');
    
    await user.click(requirementCheckbox);
    await user.click(taskCheckbox);
    await user.click(testCheckbox);
    
    // Wait for debounced onChange to be called (only last change will trigger due to debouncing)
    await vi.waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    }, { timeout: 1000 });
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // With debouncing, only the last change should trigger onChange
    // This is expected behavior and improves performance
    expect(onChange).toHaveBeenCalled();

    // Verify total time for 3 changes is reasonable (under 1500ms)
    expect(duration).toBeLessThan(1500);
    console.log(`Rapid filter changes time (3 changes with debounce): ${duration.toFixed(2)}ms`);
    console.log(`onChange called ${onChange.mock.calls.length} time(s) due to debouncing`);
  });

  it('should handle Select All efficiently', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const selectedTypes = new Set<string>();

    render(
      <NodeTypeFilter
        selectedTypes={selectedTypes}
        onChange={onChange}
        availableTypes={mockAvailableTypes}
      />
    );

    // Measure time to select all
    const startTime = performance.now();
    
    const selectAllButton = screen.getByRole('button', { name: /select all/i });
    await user.click(selectAllButton);
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify onChange was called with all types
    expect(onChange).toHaveBeenCalled();
    const calledWith = onChange.mock.calls[0][0] as Set<string>;
    expect(calledWith.size).toBe(mockAvailableTypes.length);

    // Verify select all time is under 500ms
    expect(duration).toBeLessThan(500);
    console.log(`Select All time: ${duration.toFixed(2)}ms`);
  });

  it('should handle Clear All efficiently', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const selectedTypes = new Set<string>(mockAvailableTypes.map(t => t.value));

    render(
      <NodeTypeFilter
        selectedTypes={selectedTypes}
        onChange={onChange}
        availableTypes={mockAvailableTypes}
      />
    );

    // Measure time to clear all
    const startTime = performance.now();
    
    const clearAllButton = screen.getByRole('button', { name: /clear all/i });
    await user.click(clearAllButton);
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify onChange was called with empty set
    expect(onChange).toHaveBeenCalled();
    const calledWith = onChange.mock.calls[0][0] as Set<string>;
    expect(calledWith.size).toBe(0);

    // Verify clear all time is under 500ms
    expect(duration).toBeLessThan(500);
    console.log(`Clear All time: ${duration.toFixed(2)}ms`);
  });

  it('should render large number of types efficiently', () => {
    // Create a large list of types
    const largeTypeList: NodeTypeOption[] = Array.from({ length: 50 }, (_, i) => ({
      value: `type-${i}`,
      label: `Type ${i}`,
      category: i % 2 === 0 ? 'workitems' : 'structure',
      color: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
    }));

    const onChange = vi.fn();
    const selectedTypes = new Set<string>();

    // Measure render time
    const startTime = performance.now();
    
    render(
      <NodeTypeFilter
        selectedTypes={selectedTypes}
        onChange={onChange}
        availableTypes={largeTypeList}
      />
    );
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify component rendered
    expect(screen.getByText('Filter by Type')).toBeInTheDocument();

    // Verify render time is reasonable (under 1000ms for 50 types)
    expect(duration).toBeLessThan(1000);
    console.log(`Render time for 50 types: ${duration.toFixed(2)}ms`);
  });

  it('should not re-render unnecessarily with React.memo', () => {
    const onChange = vi.fn();
    const selectedTypes = new Set<string>(['requirement']);

    const { rerender } = render(
      <NodeTypeFilter
        selectedTypes={selectedTypes}
        onChange={onChange}
        availableTypes={mockAvailableTypes}
      />
    );

    // Rerender with same props
    const startTime = performance.now();
    
    rerender(
      <NodeTypeFilter
        selectedTypes={selectedTypes}
        onChange={onChange}
        availableTypes={mockAvailableTypes}
      />
    );
    
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Verify rerender time is very fast (under 50ms) due to React.memo
    expect(duration).toBeLessThan(50);
    console.log(`Rerender time with same props: ${duration.toFixed(2)}ms`);
  });
});

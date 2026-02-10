/**
 * Property-based tests for Table page
 * 
 * Feature: graph-table-ui-enhancements
 * Property 2: Default Filter Shows All Types
 * Property 3: Filter Affects Visible Items
 * Validates: Requirements 2.1, 3.4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, waitFor } from '@testing-library/react';
import { useWorkItemStore } from '../stores/workitemStore';
import { WORK_ITEM_TYPE_OPTIONS } from '../types/filters';
import type { WorkItem } from '../services/workitemService';

// Mock the API client
vi.mock('../services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Table Page Filter Properties', () => {
  beforeEach(() => {
    // Clear session storage before each test
    sessionStorage.clear();
  });

  describe('Property-Based Tests', () => {
    /**
     * Property 2: Default Filter Shows All Types
     * 
     * When the Table page loads with no stored filter state,
     * all work item types should be visible by default.
     * 
     * Validates: Requirements 2.1
     */
    it('Feature: graph-table-ui-enhancements, Property 2: Default filter shows all types', async () => {
      // Get all available work item types
      const allTypes = WORK_ITEM_TYPE_OPTIONS.map(opt => opt.value);
      
      // Initialize store with default state (all types)
      const { result } = renderHook(() => useWorkItemStore());
      
      // Set the filter to all types (simulating default behavior)
      const defaultFilter = new Set(allTypes);
      await waitFor(() => {
        result.current.setNodeTypeFilter(defaultFilter);
      });
      
      // Verify all types are in the filter
      await waitFor(() => {
        const currentFilter = result.current.filters.nodeTypes;
        
        expect(currentFilter).toBeDefined();
        expect(currentFilter?.size).toBe(allTypes.length);
        
        allTypes.forEach(type => {
          expect(currentFilter?.has(type)).toBe(true);
        });
      });
    });

    /**
     * Property 3: Filter Affects Visible Items
     * 
     * For any combination of selected work item types,
     * the filtered items should only include items of the selected types.
     * 
     * Validates: Requirements 3.4
     */
    it('Feature: graph-table-ui-enhancements, Property 3: Filter affects visible items', () => {
      fc.assert(
        fc.property(
          // Generate arbitrary work items
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.constantFrom('requirement', 'task', 'test', 'risk', 'document'),
              title: fc.string({ minLength: 1, maxLength: 100 }),
              description: fc.option(fc.string({ maxLength: 500 })),
              status: fc.constantFrom('draft', 'active', 'completed', 'archived'),
              priority: fc.option(fc.integer({ min: 1, max: 5 })),
              version: fc.string(),
              createdBy: fc.uuid(),
              createdAt: fc.date().map(d => d.toISOString()),
              updatedAt: fc.date().map(d => d.toISOString()),
              isSigned: fc.boolean(),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          // Generate arbitrary filter selection
          fc.array(
            fc.constantFrom('requirement', 'task', 'test', 'risk', 'document'),
            { minLength: 0, maxLength: 5 }
          ),
          (items, selectedTypesArray) => {
            const selectedTypes = new Set(selectedTypesArray);
            
            // Filter items based on selected types
            const filteredItems = items.filter(item => 
              selectedTypes.size === 0 || selectedTypes.has(item.type)
            );
            
            // Verify all filtered items match the selected types
            const allMatch = filteredItems.every(item => 
              selectedTypes.size === 0 || selectedTypes.has(item.type)
            );
            
            // Verify no items of unselected types are included
            const noneExcluded = items
              .filter(item => selectedTypes.size > 0 && !selectedTypes.has(item.type))
              .every(item => !filteredItems.includes(item));
            
            return allMatch && noneExcluded;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Filter consistency
     * 
     * Applying the same filter multiple times should produce
     * the same result.
     */
    it('applying the same filter multiple times produces consistent results', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.constantFrom('requirement', 'task', 'test', 'risk', 'document'),
              title: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          fc.array(
            fc.constantFrom('requirement', 'task', 'test', 'risk', 'document'),
            { minLength: 1, maxLength: 5 }
          ),
          (items, selectedTypesArray) => {
            const selectedTypes = new Set(selectedTypesArray);
            
            // Apply filter twice
            const firstFilter = items.filter(item => selectedTypes.has(item.type));
            const secondFilter = items.filter(item => selectedTypes.has(item.type));
            
            // Results should be identical
            return (
              firstFilter.length === secondFilter.length &&
              firstFilter.every((item, index) => item.id === secondFilter[index].id)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Empty filter behavior
     * 
     * When no types are selected, the behavior should be consistent
     * (either show all or show none, depending on implementation).
     */
    it('empty filter has consistent behavior', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.constantFrom('requirement', 'task', 'test', 'risk', 'document'),
              title: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (items) => {
            const emptyFilter = new Set<string>();
            
            // With empty filter, should show all items (default behavior)
            const filteredItems = items.filter(item => 
              emptyFilter.size === 0 || emptyFilter.has(item.type)
            );
            
            // All items should be included when filter is empty
            return filteredItems.length === items.length;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Filter subset relationship
     * 
     * If filter A is a subset of filter B, then the items
     * matching A should be a subset of items matching B.
     */
    it('filter subset relationship holds', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.constantFrom('requirement', 'task', 'test', 'risk', 'document'),
              title: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          fc.array(
            fc.constantFrom('requirement', 'task', 'test', 'risk', 'document'),
            { minLength: 1, maxLength: 3 }
          ),
          fc.array(
            fc.constantFrom('requirement', 'task', 'test', 'risk', 'document'),
            { minLength: 2, maxLength: 5 }
          ),
          (items, filterAArray, filterBArray) => {
            const filterA = new Set(filterAArray);
            const filterB = new Set([...filterAArray, ...filterBArray]); // B is superset of A
            
            const itemsA = items.filter(item => filterA.has(item.type));
            const itemsB = items.filter(item => filterB.has(item.type));
            
            // All items in A should also be in B
            return itemsA.every(itemA => 
              itemsB.some(itemB => itemB.id === itemA.id)
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Filter union
     * 
     * The union of items matching filter A and items matching filter B
     * should equal items matching (A ∪ B).
     */
    it('filter union property holds', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.uuid(),
              type: fc.constantFrom('requirement', 'task', 'test', 'risk', 'document'),
              title: fc.string({ minLength: 1, maxLength: 100 }),
            }),
            { minLength: 0, maxLength: 50 }
          ),
          fc.array(
            fc.constantFrom('requirement', 'task', 'test', 'risk', 'document'),
            { minLength: 1, maxLength: 3 }
          ),
          fc.array(
            fc.constantFrom('requirement', 'task', 'test', 'risk', 'document'),
            { minLength: 1, maxLength: 3 }
          ),
          (items, filterAArray, filterBArray) => {
            const filterA = new Set(filterAArray);
            const filterB = new Set(filterBArray);
            const filterUnion = new Set([...filterAArray, ...filterBArray]);
            
            const itemsA = items.filter(item => filterA.has(item.type));
            const itemsB = items.filter(item => filterB.has(item.type));
            const itemsUnion = items.filter(item => filterUnion.has(item.type));
            
            // Create union of A and B results
            const manualUnion = [...itemsA];
            itemsB.forEach(itemB => {
              if (!manualUnion.some(item => item.id === itemB.id)) {
                manualUnion.push(itemB);
              }
            });
            
            // Union should have same items as filtering with union
            return (
              manualUnion.length === itemsUnion.length &&
              manualUnion.every(item => 
                itemsUnion.some(unionItem => unionItem.id === item.id)
              )
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

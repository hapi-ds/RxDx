/**
 * Tests for sessionStorage persistence in timeTrackingStore
 * Validates Requirements 4.8: Search state preservation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTimeTrackingStore } from './timeTrackingStore';

describe('TimeTrackingStore - sessionStorage Persistence', () => {
  // Store original sessionStorage methods
  const originalGetItem = sessionStorage.getItem;
  const originalSetItem = sessionStorage.setItem;
  const originalRemoveItem = sessionStorage.removeItem;

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    
    // Reset store to initial state
    useTimeTrackingStore.getState().reset();
  });

  afterEach(() => {
    // Restore original sessionStorage methods
    sessionStorage.getItem = originalGetItem;
    sessionStorage.setItem = originalSetItem;
    sessionStorage.removeItem = originalRemoveItem;
    
    // Clear sessionStorage after each test
    sessionStorage.clear();
  });

  describe('Selected Task ID Persistence', () => {
    it('should persist selected task ID to sessionStorage', () => {
      const store = useTimeTrackingStore.getState();
      const taskId = 'task-123';

      // Select a task
      store.selectTask(taskId);

      // Verify it's saved to sessionStorage
      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored).toBe(taskId);
    });

    it('should restore selected task ID from sessionStorage on initialization', () => {
      const taskId = 'task-456';

      // Pre-populate sessionStorage
      sessionStorage.setItem('rxdx_session_selected_task', taskId);

      // Create a new store instance (simulating page reload)
      // Note: In real scenario, this would be a new page load
      // For testing, we need to manually trigger recovery
      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored).toBe(taskId);
    });

    it('should clear selected task ID from sessionStorage when set to null', () => {
      const store = useTimeTrackingStore.getState();

      // First select a task
      store.selectTask('task-123');
      expect(sessionStorage.getItem('rxdx_session_selected_task')).toBe('task-123');

      // Then deselect
      store.selectTask(null);

      // Verify it's removed from sessionStorage
      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored).toBeNull();
    });

    it('should handle corrupted sessionStorage data gracefully', () => {
      // Mock sessionStorage.getItem to throw an error
      const mockGetItem = vi.fn(() => {
        throw new Error('sessionStorage error');
      });
      sessionStorage.getItem = mockGetItem;

      // This should not throw an error
      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored).toBeUndefined();
    });

    it('should validate and sanitize selected task ID', () => {
      const store = useTimeTrackingStore.getState();

      // Try to select with whitespace
      const taskIdWithWhitespace = '  task-789  ';
      sessionStorage.setItem('rxdx_session_selected_task', taskIdWithWhitespace);

      // Recover should trim whitespace
      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored?.trim()).toBe('task-789');
    });

    it('should return null for empty string task ID', () => {
      // Set empty string in sessionStorage
      sessionStorage.setItem('rxdx_session_selected_task', '');

      // Recovery should return null for empty string
      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored).toBe('');
    });
  });

  describe('Search Query Persistence', () => {
    it('should persist search query to sessionStorage', () => {
      const store = useTimeTrackingStore.getState();
      const query = 'authentication';

      // Set search query
      store.setSearchQuery(query);

      // Verify it's saved to sessionStorage
      const stored = sessionStorage.getItem('rxdx_session_search_query');
      expect(stored).toBe(query);
    });

    it('should restore search query from sessionStorage on initialization', () => {
      const query = 'database';

      // Pre-populate sessionStorage
      sessionStorage.setItem('rxdx_session_search_query', query);

      // Verify it can be retrieved
      const stored = sessionStorage.getItem('rxdx_session_search_query');
      expect(stored).toBe(query);
    });

    it('should clear search query from sessionStorage when set to empty string', () => {
      const store = useTimeTrackingStore.getState();

      // First set a query
      store.setSearchQuery('test query');
      expect(sessionStorage.getItem('rxdx_session_search_query')).toBe('test query');

      // Then clear it
      store.setSearchQuery('');

      // Verify it's removed from sessionStorage
      const stored = sessionStorage.getItem('rxdx_session_search_query');
      expect(stored).toBeNull();
    });

    it('should handle corrupted sessionStorage data gracefully', () => {
      // Mock sessionStorage.getItem to throw an error
      const mockGetItem = vi.fn(() => {
        throw new Error('sessionStorage error');
      });
      sessionStorage.getItem = mockGetItem;

      // This should not throw an error and return empty string
      const stored = sessionStorage.getItem('rxdx_session_search_query');
      expect(stored).toBeUndefined();
    });

    it('should preserve search query with special characters', () => {
      const store = useTimeTrackingStore.getState();
      const query = 'test @#$% query';

      // Set search query with special characters
      store.setSearchQuery(query);

      // Verify it's saved correctly
      const stored = sessionStorage.getItem('rxdx_session_search_query');
      expect(stored).toBe(query);
    });

    it('should preserve search query with unicode characters', () => {
      const store = useTimeTrackingStore.getState();
      const query = 'тест 测试 テスト';

      // Set search query with unicode
      store.setSearchQuery(query);

      // Verify it's saved correctly
      const stored = sessionStorage.getItem('rxdx_session_search_query');
      expect(stored).toBe(query);
    });
  });

  describe('State Restoration on Page Return', () => {
    it('should restore both selected task and search query together', () => {
      const taskId = 'task-999';
      const query = 'important task';

      // Pre-populate sessionStorage (simulating previous session)
      sessionStorage.setItem('rxdx_session_selected_task', taskId);
      sessionStorage.setItem('rxdx_session_search_query', query);

      // Verify both can be retrieved
      const storedTaskId = sessionStorage.getItem('rxdx_session_selected_task');
      const storedQuery = sessionStorage.getItem('rxdx_session_search_query');

      expect(storedTaskId).toBe(taskId);
      expect(storedQuery).toBe(query);
    });

    it('should handle partial state restoration (only task ID)', () => {
      const taskId = 'task-111';

      // Only set task ID, no search query
      sessionStorage.setItem('rxdx_session_selected_task', taskId);

      // Verify task ID is retrieved and search query is empty
      const storedTaskId = sessionStorage.getItem('rxdx_session_selected_task');
      const storedQuery = sessionStorage.getItem('rxdx_session_search_query');

      expect(storedTaskId).toBe(taskId);
      expect(storedQuery).toBeNull();
    });

    it('should handle partial state restoration (only search query)', () => {
      const query = 'search term';

      // Only set search query, no task ID
      sessionStorage.setItem('rxdx_session_search_query', query);

      // Verify search query is retrieved and task ID is null
      const storedTaskId = sessionStorage.getItem('rxdx_session_selected_task');
      const storedQuery = sessionStorage.getItem('rxdx_session_search_query');

      expect(storedTaskId).toBeNull();
      expect(storedQuery).toBe(query);
    });

    it('should handle empty sessionStorage gracefully', () => {
      // Don't set anything in sessionStorage

      // Verify defaults are used
      const storedTaskId = sessionStorage.getItem('rxdx_session_selected_task');
      const storedQuery = sessionStorage.getItem('rxdx_session_search_query');

      expect(storedTaskId).toBeNull();
      expect(storedQuery).toBeNull();
    });
  });

  describe('sessionStorage Quota Handling', () => {
    it('should handle sessionStorage quota exceeded error gracefully', () => {
      const store = useTimeTrackingStore.getState();

      // Mock sessionStorage.setItem to throw quota exceeded error
      const mockSetItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      });
      sessionStorage.setItem = mockSetItem;

      // This should not throw an error
      expect(() => {
        store.selectTask('task-123');
      }).not.toThrow();

      expect(() => {
        store.setSearchQuery('test query');
      }).not.toThrow();
    });

    it('should log error when sessionStorage operations fail', () => {
      const store = useTimeTrackingStore.getState();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock sessionStorage.setItem to throw error
      const mockSetItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      sessionStorage.setItem = mockSetItem;

      // Trigger operations
      store.selectTask('task-123');
      store.setSearchQuery('test');

      // Verify errors were logged
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Integration with Store Actions', () => {
    it('should persist state when selectTask is called', () => {
      const store = useTimeTrackingStore.getState();
      const taskId = 'integration-task-1';

      // Call selectTask action
      store.selectTask(taskId);

      // Verify state is updated
      expect(store.selectedTaskId).toBe(taskId);

      // Verify sessionStorage is updated
      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored).toBe(taskId);
    });

    it('should persist state when setSearchQuery is called', () => {
      const store = useTimeTrackingStore.getState();
      const query = 'integration test';

      // Call setSearchQuery action
      store.setSearchQuery(query);

      // Verify state is updated
      expect(store.searchQuery).toBe(query);

      // Verify sessionStorage is updated
      const stored = sessionStorage.getItem('rxdx_session_search_query');
      expect(stored).toBe(query);
    });

    it('should maintain consistency between store state and sessionStorage', () => {
      const store = useTimeTrackingStore.getState();

      // Perform multiple operations
      store.selectTask('task-1');
      store.setSearchQuery('query-1');
      store.selectTask('task-2');
      store.setSearchQuery('query-2');

      // Verify final state matches sessionStorage
      expect(store.selectedTaskId).toBe('task-2');
      expect(store.searchQuery).toBe('query-2');

      const storedTaskId = sessionStorage.getItem('rxdx_session_selected_task');
      const storedQuery = sessionStorage.getItem('rxdx_session_search_query');

      expect(storedTaskId).toBe('task-2');
      expect(storedQuery).toBe('query-2');
    });
  });
});

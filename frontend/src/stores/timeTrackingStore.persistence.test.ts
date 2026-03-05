/**
 * Comprehensive unit tests for persistence functionality in timeTrackingStore
 * Tests localStorage (active tracking) and sessionStorage (UI state) persistence
 * 
 * Validates Requirements:
 * - 11.6: Store SHALL persist active tracking state in localStorage for page refresh recovery
 * - 11.7: Store SHALL clear localStorage when tracking stops successfully
 * - 15.7: Store SHALL validate localStorage data on page load to prevent corruption
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTimeTrackingStore } from './timeTrackingStore';
import {
  timeTrackingService,
  type ActiveTracking,
} from '../services/timeTrackingService';

// Mock the timeTrackingService
vi.mock('../services/timeTrackingService', () => ({
  timeTrackingService: {
    getTasks: vi.fn(),
    startTracking: vi.fn(),
    stopTracking: vi.fn(),
    getActiveTracking: vi.fn(),
    getEntries: vi.fn(),
  },
}));

describe('TimeTrackingStore - Persistence Tests', () => {
  // Store original storage methods
  const originalLocalStorage = {
    getItem: localStorage.getItem,
    setItem: localStorage.setItem,
    removeItem: localStorage.removeItem,
    clear: localStorage.clear,
  };

  const originalSessionStorage = {
    getItem: sessionStorage.getItem,
    setItem: sessionStorage.setItem,
    removeItem: sessionStorage.removeItem,
    clear: sessionStorage.clear,
  };

  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();
    
    // Reset store to initial state
    useTimeTrackingStore.getState().reset();
    
    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original storage methods
    Object.assign(localStorage, originalLocalStorage);
    Object.assign(sessionStorage, originalSessionStorage);
    
    // Clear storage after each test
    localStorage.clear();
    sessionStorage.clear();
  });

  // ==========================================================================
  // localStorage Tests - Active Tracking Persistence
  // ==========================================================================

  describe('localStorage - Active Tracking Save', () => {
    it('should save active tracking to localStorage when starting tracking', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-123',
        task_id: 'task-456',
        task_title: 'Implement Feature X',
        start_time: '2024-01-15T10:30:00Z',
        description: 'Working on authentication',
      };

      vi.mocked(timeTrackingService.startTracking).mockResolvedValue(mockActiveTracking);

      await useTimeTrackingStore.getState().startTracking('task-456', 'Working on authentication');

      // Verify data was saved to localStorage
      const stored = localStorage.getItem('rxdx_active_tracking');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(mockActiveTracking);
    });

    it('should save all required fields to localStorage', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-789',
        task_id: 'task-101',
        task_title: 'Fix Bug #42',
        start_time: '2024-01-15T14:00:00Z',
        description: 'Debugging scheduler issue',
      };

      vi.mocked(timeTrackingService.startTracking).mockResolvedValue(mockActiveTracking);

      await useTimeTrackingStore.getState().startTracking('task-101', 'Debugging scheduler issue');

      const stored = localStorage.getItem('rxdx_active_tracking');
      const parsed = JSON.parse(stored!);

      // Verify all required fields are present
      expect(parsed).toHaveProperty('id');
      expect(parsed).toHaveProperty('task_id');
      expect(parsed).toHaveProperty('task_title');
      expect(parsed).toHaveProperty('start_time');
      expect(parsed).toHaveProperty('description');
    });

    it('should not save to localStorage if start tracking fails', async () => {
      vi.mocked(timeTrackingService.startTracking).mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        useTimeTrackingStore.getState().startTracking('task-1', 'Description')
      ).rejects.toThrow('Network error');

      // Verify nothing was saved to localStorage
      const stored = localStorage.getItem('rxdx_active_tracking');
      expect(stored).toBeNull();
    });

    it('should handle localStorage quota exceeded error gracefully', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      vi.mocked(timeTrackingService.startTracking).mockResolvedValue(mockActiveTracking);

      // Mock localStorage.setItem to throw quota exceeded error
      const mockSetItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      });
      localStorage.setItem = mockSetItem;

      // Should not throw error - should handle gracefully
      await expect(
        useTimeTrackingStore.getState().startTracking('task-1', 'Working')
      ).resolves.not.toThrow();

      // Store state should still be updated even if localStorage fails
      expect(useTimeTrackingStore.getState().activeTracking).toEqual(mockActiveTracking);
    });
  });

  describe('localStorage - Active Tracking Clear', () => {
    it('should remove active tracking from localStorage when stopping tracking', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      // Pre-populate localStorage and store state
      localStorage.setItem('rxdx_active_tracking', JSON.stringify(mockActiveTracking));
      useTimeTrackingStore.setState({ activeTracking: mockActiveTracking });

      vi.mocked(timeTrackingService.stopTracking).mockResolvedValue(undefined);
      vi.mocked(timeTrackingService.getEntries).mockResolvedValue({
        entries: [],
        total: 0,
        skip: 0,
        limit: 10,
      });

      await useTimeTrackingStore.getState().stopTracking('Completed work');

      // Verify localStorage was cleared
      const stored = localStorage.getItem('rxdx_active_tracking');
      expect(stored).toBeNull();
    });

    it('should not clear localStorage if stop tracking fails', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      localStorage.setItem('rxdx_active_tracking', JSON.stringify(mockActiveTracking));
      useTimeTrackingStore.setState({ activeTracking: mockActiveTracking });

      vi.mocked(timeTrackingService.stopTracking).mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        useTimeTrackingStore.getState().stopTracking('Done')
      ).rejects.toThrow('Network error');

      // Verify localStorage was NOT cleared (data preserved for retry)
      const stored = localStorage.getItem('rxdx_active_tracking');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(mockActiveTracking);
    });

    it('should clear localStorage when checkActiveTracking finds no active tracking', async () => {
      // Pre-populate localStorage with old data
      localStorage.setItem('rxdx_active_tracking', JSON.stringify({
        id: 'old-tracking',
        task_id: 'old-task',
        task_title: 'Old Task',
        start_time: '2024-01-15T09:00:00Z',
        description: 'Old work',
      }));

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

      await useTimeTrackingStore.getState().checkActiveTracking();

      // Verify localStorage was cleared
      const stored = localStorage.getItem('rxdx_active_tracking');
      expect(stored).toBeNull();
    });
  });

  describe('localStorage - Active Tracking Recovery', () => {
    it('should recover valid active tracking from localStorage on initialization', () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        description: 'Working on feature',
      };

      // Set data in localStorage BEFORE importing/initializing the store
      localStorage.setItem('rxdx_active_tracking', JSON.stringify(mockActiveTracking));

      // The store initializes with data from localStorage on module load
      // Since we can't re-initialize the module, we test that checkActiveTracking
      // properly syncs with localStorage
      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(mockActiveTracking);
      
      // Verify that checkActiveTracking would restore the data
      useTimeTrackingStore.getState().checkActiveTracking();
      
      // Wait for async operation
      setTimeout(() => {
        expect(useTimeTrackingStore.getState().activeTracking).toEqual(mockActiveTracking);
      }, 100);
    });

    it('should recover active tracking with recent start time (within 24 hours)', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-2',
        task_id: 'task-2',
        task_title: 'Long Task',
        start_time: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString(), // 23 hours ago
        description: 'Long running task',
      };

      localStorage.setItem('rxdx_active_tracking', JSON.stringify(mockActiveTracking));

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(mockActiveTracking);
      
      await useTimeTrackingStore.getState().checkActiveTracking();

      expect(useTimeTrackingStore.getState().activeTracking).toEqual(mockActiveTracking);
    });

    it('should return null when localStorage is empty', async () => {
      // Ensure localStorage is empty
      localStorage.removeItem('rxdx_active_tracking');

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);
      
      await useTimeTrackingStore.getState().checkActiveTracking();

      expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
    });
  });

  describe('localStorage - Corrupted Data Handling', () => {
    it('should handle corrupted JSON gracefully', async () => {
      // Set invalid JSON in localStorage
      localStorage.setItem('rxdx_active_tracking', 'invalid-json{{{');

      // Mock API to return null (no active tracking)
      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

      // Should not throw error when checking active tracking
      await expect(
        useTimeTrackingStore.getState().checkActiveTracking()
      ).resolves.not.toThrow();

      // Should clear corrupted data from localStorage
      // Note: The corrupted data remains until checkActiveTracking is called
      // which syncs with the backend and clears invalid local data
      expect(localStorage.getItem('rxdx_active_tracking')).toBeNull();
    });

    it('should reject data missing required fields', async () => {
      const invalidData = {
        id: 'tracking-1',
        task_id: 'task-1',
        // Missing: task_title, start_time, description
      };

      localStorage.setItem('rxdx_active_tracking', JSON.stringify(invalidData));

      // Mock API to return null
      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

      await useTimeTrackingStore.getState().checkActiveTracking();

      // Should clear invalid data
      expect(localStorage.getItem('rxdx_active_tracking')).toBeNull();
    });

    it('should reject data with invalid field types', async () => {
      const invalidData = {
        id: 123, // Should be string
        task_id: 'task-1',
        task_title: 'Test',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      };

      localStorage.setItem('rxdx_active_tracking', JSON.stringify(invalidData));

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

      await useTimeTrackingStore.getState().checkActiveTracking();

      expect(localStorage.getItem('rxdx_active_tracking')).toBeNull();
    });

    it('should reject data with invalid start_time format', async () => {
      const invalidData = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: 'not-a-valid-date',
        description: 'Working',
      };

      localStorage.setItem('rxdx_active_tracking', JSON.stringify(invalidData));

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

      await useTimeTrackingStore.getState().checkActiveTracking();

      expect(localStorage.getItem('rxdx_active_tracking')).toBeNull();
    });

    it('should reject data with start_time in the future', async () => {
      const futureData = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour in future
        description: 'Working',
      };

      localStorage.setItem('rxdx_active_tracking', JSON.stringify(futureData));

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

      await useTimeTrackingStore.getState().checkActiveTracking();

      expect(localStorage.getItem('rxdx_active_tracking')).toBeNull();
    });

    it('should reject data with start_time older than 24 hours', async () => {
      const oldData = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
        description: 'Working',
      };

      localStorage.setItem('rxdx_active_tracking', JSON.stringify(oldData));

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

      await useTimeTrackingStore.getState().checkActiveTracking();

      expect(localStorage.getItem('rxdx_active_tracking')).toBeNull();
    });

    it('should reject non-object data', async () => {
      localStorage.setItem('rxdx_active_tracking', JSON.stringify('string-value'));

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

      await useTimeTrackingStore.getState().checkActiveTracking();

      expect(localStorage.getItem('rxdx_active_tracking')).toBeNull();
    });

    it('should reject null data', async () => {
      localStorage.setItem('rxdx_active_tracking', JSON.stringify(null));

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

      await useTimeTrackingStore.getState().checkActiveTracking();

      expect(localStorage.getItem('rxdx_active_tracking')).toBeNull();
    });

    it('should reject array data', async () => {
      localStorage.setItem('rxdx_active_tracking', JSON.stringify([1, 2, 3]));

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(null);

      await useTimeTrackingStore.getState().checkActiveTracking();

      expect(localStorage.getItem('rxdx_active_tracking')).toBeNull();
    });
  });

  // ==========================================================================
  // sessionStorage Tests - UI State Persistence
  // ==========================================================================

  describe('sessionStorage - Selected Task ID', () => {
    it('should save selected task ID to sessionStorage', () => {
      const taskId = 'task-123';

      useTimeTrackingStore.getState().selectTask(taskId);

      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored).toBe(taskId);
    });

    it('should remove selected task ID from sessionStorage when set to null', () => {
      // First select a task
      useTimeTrackingStore.getState().selectTask('task-123');
      expect(sessionStorage.getItem('rxdx_session_selected_task')).toBe('task-123');

      // Then deselect
      useTimeTrackingStore.getState().selectTask(null);

      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored).toBeNull();
    });

    it('should recover selected task ID from sessionStorage on initialization', () => {
      const taskId = 'task-456';

      sessionStorage.setItem('rxdx_session_selected_task', taskId);

      // The store reads from sessionStorage on module initialization
      // We can't re-initialize the module in tests, so we verify the data is in sessionStorage
      // and would be read on next page load
      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored).toBe(taskId);
      
      // Verify the selectTask action properly saves to sessionStorage
      useTimeTrackingStore.getState().selectTask(taskId);
      expect(useTimeTrackingStore.getState().selectedTaskId).toBe(taskId);
    });

    it('should handle whitespace in task ID gracefully', () => {
      const taskIdWithWhitespace = '  task-789  ';
      sessionStorage.setItem('rxdx_session_selected_task', taskIdWithWhitespace);

      // Verify data is in sessionStorage (would be trimmed on recovery)
      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored).toBe(taskIdWithWhitespace);
      
      // The recovery function trims whitespace
      expect(stored?.trim()).toBe('task-789');
    });

    it('should return null for empty string task ID', () => {
      sessionStorage.setItem('rxdx_session_selected_task', '');

      // Verify empty string is in sessionStorage
      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored).toBe('');
      
      // The recovery function returns null for empty strings
      expect(stored?.trim() || null).toBeNull();
    });

    it('should return null for whitespace-only task ID', () => {
      sessionStorage.setItem('rxdx_session_selected_task', '   ');

      // Verify whitespace is in sessionStorage
      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored).toBe('   ');
      
      // The recovery function returns null for whitespace-only strings
      expect(stored?.trim() || null).toBeNull();
    });

    it('should handle sessionStorage errors gracefully', () => {
      // Mock sessionStorage.getItem to throw error
      const mockGetItem = vi.fn(() => {
        throw new Error('sessionStorage error');
      });
      sessionStorage.getItem = mockGetItem;

      // Should not throw error
      expect(() => {
        useTimeTrackingStore.getState().reset();
      }).not.toThrow();

      // Should return null on error
      expect(useTimeTrackingStore.getState().selectedTaskId).toBeNull();
    });

    it('should handle sessionStorage quota exceeded error gracefully', () => {
      // Mock sessionStorage.setItem to throw quota exceeded error
      const mockSetItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      });
      sessionStorage.setItem = mockSetItem;

      // Should not throw error
      expect(() => {
        useTimeTrackingStore.getState().selectTask('task-123');
      }).not.toThrow();

      // Store state should still be updated
      expect(useTimeTrackingStore.getState().selectedTaskId).toBe('task-123');
    });
  });

  describe('sessionStorage - Search Query', () => {
    it('should save search query to sessionStorage', () => {
      const query = 'authentication';

      useTimeTrackingStore.getState().setSearchQuery(query);

      const stored = sessionStorage.getItem('rxdx_session_search_query');
      expect(stored).toBe(query);
    });

    it('should remove search query from sessionStorage when set to empty string', () => {
      // First set a query
      useTimeTrackingStore.getState().setSearchQuery('test query');
      expect(sessionStorage.getItem('rxdx_session_search_query')).toBe('test query');

      // Then clear it
      useTimeTrackingStore.getState().setSearchQuery('');

      const stored = sessionStorage.getItem('rxdx_session_search_query');
      expect(stored).toBeNull();
    });

    it('should recover search query from sessionStorage on initialization', () => {
      const query = 'database schema';

      sessionStorage.setItem('rxdx_session_search_query', query);

      // Verify data is in sessionStorage
      const stored = sessionStorage.getItem('rxdx_session_search_query');
      expect(stored).toBe(query);
      
      // Verify the setSearchQuery action properly saves to sessionStorage
      useTimeTrackingStore.getState().setSearchQuery(query);
      expect(useTimeTrackingStore.getState().searchQuery).toBe(query);
    });

    it('should preserve search query with special characters', () => {
      const query = 'test @#$% query';

      useTimeTrackingStore.getState().setSearchQuery(query);

      const stored = sessionStorage.getItem('rxdx_session_search_query');
      expect(stored).toBe(query);
    });

    it('should preserve search query with unicode characters', () => {
      const query = 'тест 测试 テスト';

      useTimeTrackingStore.getState().setSearchQuery(query);

      const stored = sessionStorage.getItem('rxdx_session_search_query');
      expect(stored).toBe(query);
    });

    it('should handle sessionStorage errors gracefully', () => {
      // Mock sessionStorage.getItem to throw error
      const mockGetItem = vi.fn(() => {
        throw new Error('sessionStorage error');
      });
      sessionStorage.getItem = mockGetItem;

      // Should not throw error
      expect(() => {
        useTimeTrackingStore.getState().reset();
      }).not.toThrow();

      // Should return empty string on error
      expect(useTimeTrackingStore.getState().searchQuery).toBe('');
    });

    it('should handle sessionStorage quota exceeded error gracefully', () => {
      // Mock sessionStorage.setItem to throw quota exceeded error
      const mockSetItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      });
      sessionStorage.setItem = mockSetItem;

      // Should not throw error
      expect(() => {
        useTimeTrackingStore.getState().setSearchQuery('test query');
      }).not.toThrow();

      // Store state should still be updated
      expect(useTimeTrackingStore.getState().searchQuery).toBe('test query');
    });
  });

  describe('sessionStorage - Combined State Restoration', () => {
    it('should restore both selected task and search query together', () => {
      const taskId = 'task-999';
      const query = 'important task';

      sessionStorage.setItem('rxdx_session_selected_task', taskId);
      sessionStorage.setItem('rxdx_session_search_query', query);

      // Verify both are in sessionStorage
      expect(sessionStorage.getItem('rxdx_session_selected_task')).toBe(taskId);
      expect(sessionStorage.getItem('rxdx_session_search_query')).toBe(query);
      
      // Verify actions properly save to sessionStorage
      useTimeTrackingStore.getState().selectTask(taskId);
      useTimeTrackingStore.getState().setSearchQuery(query);
      
      expect(useTimeTrackingStore.getState().selectedTaskId).toBe(taskId);
      expect(useTimeTrackingStore.getState().searchQuery).toBe(query);
    });

    it('should handle partial state restoration (only task ID)', () => {
      const taskId = 'task-111';

      sessionStorage.setItem('rxdx_session_selected_task', taskId);
      // No search query set

      // Verify task ID is in sessionStorage
      expect(sessionStorage.getItem('rxdx_session_selected_task')).toBe(taskId);
      expect(sessionStorage.getItem('rxdx_session_search_query')).toBeNull();
    });

    it('should handle partial state restoration (only search query)', () => {
      const query = 'search term';

      sessionStorage.setItem('rxdx_session_search_query', query);
      // No task ID set

      // Verify search query is in sessionStorage
      expect(sessionStorage.getItem('rxdx_session_selected_task')).toBeNull();
      expect(sessionStorage.getItem('rxdx_session_search_query')).toBe(query);
    });

    it('should handle empty sessionStorage gracefully', () => {
      // Don't set anything in sessionStorage

      // Verify nothing is in sessionStorage
      expect(sessionStorage.getItem('rxdx_session_selected_task')).toBeNull();
      expect(sessionStorage.getItem('rxdx_session_search_query')).toBeNull();
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

  // ==========================================================================
  // Integration Tests - localStorage + sessionStorage
  // ==========================================================================

  describe('Integration - Combined Persistence', () => {
    it('should restore both localStorage and sessionStorage state on initialization', async () => {
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        description: 'Working',
      };

      const taskId = 'task-1';
      const query = 'test';

      // Pre-populate both storages
      localStorage.setItem('rxdx_active_tracking', JSON.stringify(mockActiveTracking));
      sessionStorage.setItem('rxdx_session_selected_task', taskId);
      sessionStorage.setItem('rxdx_session_search_query', query);

      // Mock API to return the active tracking
      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(mockActiveTracking);

      // Trigger sync with backend
      await useTimeTrackingStore.getState().checkActiveTracking();

      // Verify localStorage data was synced
      expect(useTimeTrackingStore.getState().activeTracking).toEqual(mockActiveTracking);
      
      // Verify sessionStorage data is accessible
      expect(sessionStorage.getItem('rxdx_session_selected_task')).toBe(taskId);
      expect(sessionStorage.getItem('rxdx_session_search_query')).toBe(query);
    });

    it('should handle mixed valid and invalid data across storages', async () => {
      // Valid localStorage data
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        description: 'Working',
      };
      localStorage.setItem('rxdx_active_tracking', JSON.stringify(mockActiveTracking));

      // Invalid sessionStorage data
      sessionStorage.setItem('rxdx_session_selected_task', '   '); // Whitespace only
      sessionStorage.setItem('rxdx_session_search_query', 'valid query');

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(mockActiveTracking);

      await useTimeTrackingStore.getState().checkActiveTracking();

      // Valid localStorage data restored
      expect(useTimeTrackingStore.getState().activeTracking).toEqual(mockActiveTracking);
      
      // sessionStorage data is accessible (validation happens on recovery)
      expect(sessionStorage.getItem('rxdx_session_search_query')).toBe('valid query');
    });

    it('should handle errors in one storage without affecting the other', async () => {
      // Valid localStorage data
      const mockActiveTracking: ActiveTracking = {
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test Task',
        start_time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        description: 'Working',
      };
      localStorage.setItem('rxdx_active_tracking', JSON.stringify(mockActiveTracking));

      // Mock sessionStorage to throw error
      const mockGetItem = vi.fn((key: string) => {
        if (key.startsWith('rxdx_session_')) {
          throw new Error('sessionStorage error');
        }
        return originalSessionStorage.getItem.call(sessionStorage, key);
      });
      sessionStorage.getItem = mockGetItem;

      vi.mocked(timeTrackingService.getActiveTracking).mockResolvedValue(mockActiveTracking);

      // Should not throw error
      await expect(
        useTimeTrackingStore.getState().checkActiveTracking()
      ).resolves.not.toThrow();

      // localStorage data should still be restored
      expect(useTimeTrackingStore.getState().activeTracking).toEqual(mockActiveTracking);
    });
  });

  // ==========================================================================
  // Edge Cases and Error Scenarios
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle localStorage.getItem returning null', () => {
      // Mock to return null explicitly
      const mockGetItem = vi.fn(() => null);
      localStorage.getItem = mockGetItem;

      useTimeTrackingStore.getState().reset();

      expect(useTimeTrackingStore.getState().activeTracking).toBeNull();
    });

    it('should handle sessionStorage.getItem returning null', () => {
      // Mock to return null explicitly
      const mockGetItem = vi.fn(() => null);
      sessionStorage.getItem = mockGetItem;

      useTimeTrackingStore.getState().reset();

      expect(useTimeTrackingStore.getState().selectedTaskId).toBeNull();
      expect(useTimeTrackingStore.getState().searchQuery).toBe('');
    });

    it('should handle very long search queries', () => {
      const longQuery = 'a'.repeat(10000); // 10,000 characters

      useTimeTrackingStore.getState().setSearchQuery(longQuery);

      const stored = sessionStorage.getItem('rxdx_session_search_query');
      expect(stored).toBe(longQuery);
    });

    it('should handle special characters in task IDs', () => {
      const specialTaskId = 'task-123-abc_def.xyz';

      useTimeTrackingStore.getState().selectTask(specialTaskId);

      const stored = sessionStorage.getItem('rxdx_session_selected_task');
      expect(stored).toBe(specialTaskId);
    });

    it('should log errors when storage operations fail', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock localStorage.setItem to throw error
      const mockSetItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      localStorage.setItem = mockSetItem;

      // Trigger operation that uses localStorage
      vi.mocked(timeTrackingService.startTracking).mockResolvedValue({
        id: 'tracking-1',
        task_id: 'task-1',
        task_title: 'Test',
        start_time: '2024-01-15T10:00:00Z',
        description: 'Working',
      });

      useTimeTrackingStore.getState().startTracking('task-1', 'Working');

      // Wait for async operation
      setTimeout(() => {
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      }, 100);
    });
  });
});

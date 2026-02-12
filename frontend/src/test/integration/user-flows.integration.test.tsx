/**
 * Integration tests for complete user flows
 * 
 * Feature: graph-table-ui-enhancements
 * Task: 20.1 Integration testing
 * 
 * Tests:
 * - Complete user flows across pages
 * - Cross-page navigation
 * - Session persistence
 * - Filter state management
 * - Bulk edit workflows
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from '../../App';
import { useWorkItemStore } from '../../stores/workitemStore';
import { useGraphStore } from '../../stores/graphStore';
import { useAuthStore } from '../../stores/authStore';
import type { WorkItem } from '../../services/workitemService';

// Mock API client
vi.mock('../../services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  getErrorMessage: vi.fn((error: any) => error?.message || 'Unknown error'),
}));

// Mock data
const mockWorkItems: WorkItem[] = [
  {
    id: '1',
    type: 'requirement',
    title: 'User Authentication',
    description: 'Implement user login',
    status: 'active',
    priority: 1,
    version: '1.0',
    createdBy: 'user1',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    isSigned: false,
  },
  {
    id: '2',
    type: 'task',
    title: 'Create login form',
    description: 'Build the login UI',
    status: 'draft',
    priority: 2,
    version: '1.0',
    createdBy: 'user1',
    createdAt: '2024-01-02T00:00:00Z',
    updatedAt: '2024-01-02T00:00:00Z',
    isSigned: false,
  },
  {
    id: '3',
    type: 'test',
    title: 'Test login functionality',
    description: 'Verify login works',
    status: 'active',
    priority: 1,
    version: '1.0',
    createdBy: 'user1',
    createdAt: '2024-01-03T00:00:00Z',
    updatedAt: '2024-01-03T00:00:00Z',
    isSigned: false,
  },
];

const mockGraphData = {
  nodes: [
    {
      id: '1',
      type: 'WorkItem',
      label: 'User Authentication',
      properties: {
        type: 'requirement',
        status: 'active',
        priority: 1,
      },
    },
    {
      id: '2',
      type: 'WorkItem',
      label: 'Create login form',
      properties: {
        type: 'task',
        status: 'draft',
        priority: 2,
      },
    },
  ],
  edges: [
    {
      id: 'e1',
      source: '2',
      target: '1',
      type: 'IMPLEMENTS',
    },
  ],
};

describe('Integration Tests - User Flows', () => {
  let mockApiClient: any;

  beforeEach(async () => {
    // Get mock API client
    const { apiClient } = await import('../../services/api');
    mockApiClient = apiClient;
    
    // Clear all stores
    sessionStorage.clear();
    localStorage.clear();
    
    // Reset mocks
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockApiClient.get.mockImplementation((url: string) => {
      if (url.includes('/workitems')) {
        return Promise.resolve({ data: mockWorkItems });
      }
      if (url.includes('/graph/visualization')) {
        return Promise.resolve({ data: mockGraphData });
      }
      if (url.includes('/health')) {
        return Promise.resolve({ data: { status: 'ok' } });
      }
      return Promise.reject(new Error('Not found'));
    });
    
    // Mock authentication
    const authStore = useAuthStore.getState();
    authStore.setUser({
      id: 'user1',
      email: 'test@example.com',
      name: 'Test User',
    });
    authStore.setToken('mock-token');
  });

  afterEach(() => {
    // Cleanup
    sessionStorage.clear();
    localStorage.clear();
  });

  describe('Complete User Flow: Table → Filter → View', () => {
    it('should allow user to navigate to table, apply filters, and view filtered items', async () => {
      const user = userEvent.setup();
      
      // Render app with table route
      render(
        <MemoryRouter initialEntries={['/table']}>
          <App />
        </MemoryRouter>
      );

      // Wait for table to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Verify all items are visible initially
      await waitFor(() => {
        expect(screen.getByText('User Authentication')).toBeInTheDocument();
        expect(screen.getByText('Create login form')).toBeInTheDocument();
        expect(screen.getByText('Test login functionality')).toBeInTheDocument();
      });

      // Apply filter to show only requirements
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      const requirementCheckbox = screen.getByRole('checkbox', { name: /requirement/i });
      await user.click(requirementCheckbox);

      // Verify only requirements are visible
      await waitFor(() => {
        expect(screen.getByText('User Authentication')).toBeInTheDocument();
        expect(screen.queryByText('Create login form')).not.toBeInTheDocument();
        expect(screen.queryByText('Test login functionality')).not.toBeInTheDocument();
      });
    });

    it('should persist filter state when navigating away and back', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter initialEntries={['/table']}>
          <App />
        </MemoryRouter>
      );

      // Wait for table to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Apply filter
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      const taskCheckbox = screen.getByRole('checkbox', { name: /task/i });
      await user.click(taskCheckbox);

      // Verify filter is applied
      await waitFor(() => {
        expect(screen.getByText('Create login form')).toBeInTheDocument();
        expect(screen.queryByText('User Authentication')).not.toBeInTheDocument();
      });

      // Navigate to graph page
      const graphLink = screen.getByRole('link', { name: /graph/i });
      await user.click(graphLink);

      // Wait for graph to load
      await waitFor(() => {
        expect(screen.getByText(/graph explorer/i)).toBeInTheDocument();
      });

      // Navigate back to table
      const tableLink = screen.getByRole('link', { name: /table/i });
      await user.click(tableLink);

      // Verify filter is still applied
      await waitFor(() => {
        expect(screen.getByText('Create login form')).toBeInTheDocument();
        expect(screen.queryByText('User Authentication')).not.toBeInTheDocument();
      });
    });
  });

  describe('Complete User Flow: Bulk Edit', () => {
    it('should allow user to select items and perform bulk edit', async () => {
      const user = userEvent.setup();
      
      // Mock bulk update endpoint
      mockApiClient.patch.mockResolvedValue({
        data: {
          updated: mockWorkItems.map(item => ({ ...item, status: 'completed' })),
          failed: [],
        },
      });

      render(
        <MemoryRouter initialEntries={['/table']}>
          <App />
        </MemoryRouter>
      );

      // Wait for table to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Enter bulk edit mode
      const bulkEditButton = screen.getByRole('button', { name: /bulk edit/i });
      await user.click(bulkEditButton);

      // Select items
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Select first item
      await user.click(checkboxes[1]); // Select second item

      // Open bulk edit modal
      const editSelectedButton = screen.getByRole('button', { name: /edit selected/i });
      await user.click(editSelectedButton);

      // Fill in bulk edit form
      const statusSelect = screen.getByLabelText(/status/i);
      await user.selectOptions(statusSelect, 'completed');

      // Submit bulk edit
      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Verify success message
      await waitFor(() => {
        expect(screen.getByText(/successfully updated/i)).toBeInTheDocument();
      });

      // Verify API was called
      expect(mockApiClient.patch).toHaveBeenCalledWith(
        expect.stringContaining('/workitems/bulk'),
        expect.objectContaining({
          ids: expect.arrayContaining(['1', '2']),
          data: expect.objectContaining({ status: 'completed' }),
        })
      );
    });
  });

  describe('Cross-Page Navigation', () => {
    it('should maintain application state across page navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      );

      // Navigate to table
      const tableLink = screen.getByRole('link', { name: /table/i });
      await user.click(tableLink);

      await waitFor(() => {
        expect(screen.getByText(/table/i)).toBeInTheDocument();
      });

      // Navigate to graph
      const graphLink = screen.getByRole('link', { name: /graph/i });
      await user.click(graphLink);

      await waitFor(() => {
        expect(screen.getByText(/graph explorer/i)).toBeInTheDocument();
      });

      // Navigate to schedule
      const scheduleLink = screen.getByRole('link', { name: /schedule/i });
      await user.click(scheduleLink);

      await waitFor(() => {
        expect(screen.getByText(/schedule/i)).toBeInTheDocument();
      });

      // Navigate back to table
      const tableLink2 = screen.getByRole('link', { name: /table/i });
      await user.click(tableLink2);

      await waitFor(() => {
        expect(screen.getByText(/table/i)).toBeInTheDocument();
      });

      // Verify no errors occurred
      expect(screen.queryByText(/error/i)).not.toBeInTheDocument();
    });

    it('should handle backward compatibility redirect from /requirements to /table', async () => {
      render(
        <MemoryRouter initialEntries={['/requirements']}>
          <App />
        </MemoryRouter>
      );

      // Should redirect to /table
      await waitFor(() => {
        expect(screen.getByText(/table/i)).toBeInTheDocument();
      });

      // Verify URL was updated
      expect(window.location.pathname).toBe('/table');
    });
  });

  describe('Session Persistence', () => {
    it('should persist filter state in session storage', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter initialEntries={['/table']}>
          <App />
        </MemoryRouter>
      );

      // Wait for table to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Apply filter
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      const requirementCheckbox = screen.getByRole('checkbox', { name: /requirement/i });
      await user.click(requirementCheckbox);

      // Verify session storage was updated
      await waitFor(() => {
        const stored = sessionStorage.getItem('rxdx_node_filters');
        expect(stored).toBeTruthy();
        
        if (stored) {
          const parsed = JSON.parse(stored);
          expect(parsed.table).toBeDefined();
          expect(parsed.table.nodeTypes).toContain('requirement');
        }
      });
    });

    it('should restore filter state from session storage on page load', async () => {
      // Pre-populate session storage
      const filterState = {
        table: {
          nodeTypes: ['task', 'test'],
          timestamp: Date.now(),
        },
      };
      sessionStorage.setItem('rxdx_node_filters', JSON.stringify(filterState));

      render(
        <MemoryRouter initialEntries={['/table']}>
          <App />
        </MemoryRouter>
      );

      // Wait for table to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Verify filter was restored
      await waitFor(() => {
        // Should show task and test items
        expect(screen.getByText('Create login form')).toBeInTheDocument();
        expect(screen.getByText('Test login functionality')).toBeInTheDocument();
        
        // Should not show requirement items
        expect(screen.queryByText('User Authentication')).not.toBeInTheDocument();
      });
    });

    it('should clear filter state on logout', async () => {
      const user = userEvent.setup();
      
      // Pre-populate session storage
      const filterState = {
        table: {
          nodeTypes: ['requirement'],
          timestamp: Date.now(),
        },
      };
      sessionStorage.setItem('rxdx_node_filters', JSON.stringify(filterState));

      render(
        <MemoryRouter initialEntries={['/table']}>
          <App />
        </MemoryRouter>
      );

      // Logout
      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await user.click(logoutButton);

      // Verify session storage was cleared
      await waitFor(() => {
        const stored = sessionStorage.getItem('rxdx_node_filters');
        expect(stored).toBeNull();
      });
    });
  });

  describe('Graph and Table Integration', () => {
    it('should synchronize filter state between graph and table views', async () => {
      const user = userEvent.setup();
      
      render(
        <MemoryRouter initialEntries={['/graph']}>
          <App />
        </MemoryRouter>
      );

      // Wait for graph to load
      await waitFor(() => {
        expect(screen.getByText(/graph explorer/i)).toBeInTheDocument();
      });

      // Apply filter in graph view
      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      const requirementCheckbox = screen.getByRole('checkbox', { name: /requirement/i });
      await user.click(requirementCheckbox);

      // Navigate to table
      const tableLink = screen.getByRole('link', { name: /table/i });
      await user.click(tableLink);

      // Verify filter is NOT synchronized (separate filter states)
      await waitFor(() => {
        // Table should show all items (separate filter state)
        expect(screen.getByText('User Authentication')).toBeInTheDocument();
        expect(screen.getByText('Create login form')).toBeInTheDocument();
        expect(screen.getByText('Test login functionality')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully during filter operations', async () => {
      const user = userEvent.setup();
      
      // Mock API error
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      render(
        <MemoryRouter initialEntries={['/table']}>
          <App />
        </MemoryRouter>
      );

      // Wait for error message
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Verify error is displayed
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
    });

    it('should handle bulk edit failures gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock bulk update failure
      mockApiClient.patch.mockRejectedValue(new Error('Bulk update failed'));

      render(
        <MemoryRouter initialEntries={['/table']}>
          <App />
        </MemoryRouter>
      );

      // Wait for table to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Enter bulk edit mode
      const bulkEditButton = screen.getByRole('button', { name: /bulk edit/i });
      await user.click(bulkEditButton);

      // Select items
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      // Open bulk edit modal
      const editSelectedButton = screen.getByRole('button', { name: /edit selected/i });
      await user.click(editSelectedButton);

      // Submit bulk edit
      const submitButton = screen.getByRole('button', { name: /save/i });
      await user.click(submitButton);

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/bulk update failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', async () => {
      // Create large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        type: ['requirement', 'task', 'test', 'risk', 'document'][i % 5] as WorkItem['type'],
        title: `Item ${i}`,
        description: `Description for item ${i}`,
        status: 'active' as const,
        priority: (i % 5) + 1,
        version: '1.0',
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSigned: false,
      }));

      mockApiClient.get.mockResolvedValue({ data: largeDataset });

      const startTime = performance.now();

      render(
        <MemoryRouter initialEntries={['/table']}>
          <App />
        </MemoryRouter>
      );

      // Wait for table to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      }, { timeout: 5000 });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Verify load time is reasonable (< 3 seconds)
      expect(loadTime).toBeLessThan(3000);
    });

    it('should apply filters quickly on large datasets', async () => {
      const user = userEvent.setup();
      
      // Create large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        type: ['requirement', 'task', 'test', 'risk', 'document'][i % 5] as WorkItem['type'],
        title: `Item ${i}`,
        description: `Description for item ${i}`,
        status: 'active' as const,
        priority: (i % 5) + 1,
        version: '1.0',
        createdBy: 'user1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSigned: false,
      }));

      mockApiClient.get.mockResolvedValue({ data: largeDataset });

      render(
        <MemoryRouter initialEntries={['/table']}>
          <App />
        </MemoryRouter>
      );

      // Wait for table to load
      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });

      // Apply filter and measure time
      const startTime = performance.now();

      const filterButton = screen.getByRole('button', { name: /filter/i });
      await user.click(filterButton);

      const requirementCheckbox = screen.getByRole('checkbox', { name: /requirement/i });
      await user.click(requirementCheckbox);

      await waitFor(() => {
        // Verify filter was applied
        const items = screen.getAllByRole('row');
        expect(items.length).toBeGreaterThan(0);
      });

      const endTime = performance.now();
      const filterTime = endTime - startTime;

      // Verify filter time is reasonable (< 500ms as per requirements)
      expect(filterTime).toBeLessThan(500);
    });
  });
});

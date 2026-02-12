/**
 * Unit tests for GraphService search functionality
 * Tests empty query handling, result display, and result selection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { graphService } from './graphService';
import { apiClient } from './api';

// Mock apiClient
vi.mock('./api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

describe('GraphService - Search Functionality', () => {
  const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty Query Handling', () => {
    it('should return empty array for empty string query', async () => {
      const results = await graphService.search('');
      
      expect(results).toEqual([]);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should return empty array for whitespace-only query', async () => {
      const results = await graphService.search('   ');
      
      expect(results).toEqual([]);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should trim query before sending to API', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          results: [],
        },
      });

      await graphService.search('  test query  ');
      
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('query=test+query')
      );
    });
  });

  describe('Response Validation', () => {
    it('should handle response without results array', async () => {
      mockGet.mockResolvedValueOnce({
        data: {},
      });

      const results = await graphService.search('test');
      
      expect(results).toEqual([]);
    });

    it('should filter out null nodes from transformation', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 'node-1',
              type: 'WorkItem',
              label: 'Valid Node',
              properties: { type: 'requirement', title: 'Valid Node' },
            },
          ],
        },
      });

      const results = await graphService.search('test');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id).toBe('node-1');
    });
  });

  describe('Successful Search', () => {
    it('should return transformed nodes for valid search', async () => {
      const mockBackendNodes = [
        {
          id: 'node-1',
          type: 'WorkItem',
          label: 'Test Requirement',
          properties: {
            type: 'requirement',
            title: 'Test Requirement',
            description: 'Test description',
            status: 'active',
          },
        },
      ];

      mockGet.mockResolvedValueOnce({
        data: {
          results: mockBackendNodes,
        },
      });

      const results = await graphService.search('test');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('node-1');
      expect(results[0].type).toBe('requirement');
    });

    it('should include limit parameter when provided', async () => {
      mockGet.mockResolvedValueOnce({
        data: {
          results: [],
        },
      });

      await graphService.search('test', 10);
      
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('limit=10')
      );
    });
  });

  describe('Error Handling', () => {
    it('should throw error with message on API failure', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network error'));

      await expect(graphService.search('test')).rejects.toThrow('Network error');
    });
  });
});

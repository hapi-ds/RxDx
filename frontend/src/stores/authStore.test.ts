/**
 * Unit tests for authStore
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAuthStore } from './authStore';

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    mockFetch.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('login', () => {
    it('should set isLoading to true during login', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      useAuthStore.getState().login('test@example.com', 'password');
      
      // Check loading state immediately
      expect(useAuthStore.getState().isLoading).toBe(true);
      
      // Clean up
      mockFetch.mockReset();
    });

    it('should set user and tokens on successful login', async () => {
      const mockTokenResponse = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 1800,
      };

      const mockUserResponse = {
        id: 'user-123',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'user',
        is_active: true,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockUserResponse),
        });

      await useAuthStore.getState().login('test@example.com', 'password');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        fullName: 'Test User',
        role: 'user',
        isActive: true,
      });
      expect(state.tokens?.accessToken).toBe('test-access-token');
      expect(state.tokens?.refreshToken).toBe('test-refresh-token');
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should set error on failed login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ detail: 'Invalid credentials' }),
      });

      await expect(
        useAuthStore.getState().login('test@example.com', 'wrong-password')
      ).rejects.toThrow('Invalid credentials');

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.error).toBe('Invalid credentials');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear user and tokens on logout', () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'user',
          isActive: true,
        },
        tokens: {
          accessToken: 'test-token',
          refreshToken: 'test-refresh',
          expiresAt: Date.now() + 1800000,
        },
        isAuthenticated: true,
      });

      mockFetch.mockResolvedValueOnce({ ok: true });

      useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('refreshToken', () => {
    it('should update tokens on successful refresh', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        tokens: {
          accessToken: 'old-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() - 1000, // Expired
        },
        isAuthenticated: true,
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-access-token',
            refresh_token: 'new-refresh-token',
            expires_in: 1800,
          }),
      });

      const result = await useAuthStore.getState().refreshToken();

      expect(result).toBe(true);
      const state = useAuthStore.getState();
      expect(state.tokens?.accessToken).toBe('new-access-token');
    });

    it('should logout on failed refresh', async () => {
      useAuthStore.setState({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'user',
          isActive: true,
        },
        tokens: {
          accessToken: 'old-token',
          refreshToken: 'refresh-token',
          expiresAt: Date.now() - 1000,
        },
        isAuthenticated: true,
      });

      // Mock both the refresh call (fails) and the logout call
      mockFetch
        .mockResolvedValueOnce({ ok: false }) // refresh fails
        .mockResolvedValueOnce({ ok: true }); // logout succeeds

      const result = await useAuthStore.getState().refreshToken();

      expect(result).toBe(false);
      // Note: The store calls logout internally which clears state
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it('should return false if no refresh token exists', async () => {
      useAuthStore.setState({
        tokens: null,
        isAuthenticated: false,
      });

      const result = await useAuthStore.getState().refreshToken();

      expect(result).toBe(false);
    });
  });

  describe('isTokenExpired', () => {
    it('should return true if no tokens exist', () => {
      useAuthStore.setState({ tokens: null });
      expect(useAuthStore.getState().isTokenExpired()).toBe(true);
    });

    it('should return true if token is expired', () => {
      useAuthStore.setState({
        tokens: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() - 1000,
        },
      });
      expect(useAuthStore.getState().isTokenExpired()).toBe(true);
    });

    it('should return false if token is valid', () => {
      useAuthStore.setState({
        tokens: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 60000, // 1 minute from now
        },
      });
      expect(useAuthStore.getState().isTokenExpired()).toBe(false);
    });
  });

  describe('getAccessToken', () => {
    it('should return null if no tokens exist', () => {
      useAuthStore.setState({ tokens: null });
      expect(useAuthStore.getState().getAccessToken()).toBeNull();
    });

    it('should return access token if it exists', () => {
      useAuthStore.setState({
        tokens: {
          accessToken: 'my-token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 60000,
        },
      });
      expect(useAuthStore.getState().getAccessToken()).toBe('my-token');
    });
  });

  describe('setError and clearError', () => {
    it('should set error message', () => {
      useAuthStore.getState().setError('Test error');
      expect(useAuthStore.getState().error).toBe('Test error');
    });

    it('should clear error message', () => {
      useAuthStore.setState({ error: 'Some error' });
      useAuthStore.getState().clearError();
      expect(useAuthStore.getState().error).toBeNull();
    });
  });
});

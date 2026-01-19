/**
 * Unit tests for useAuth hook
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuth, useAccessToken, useTokenExpiry } from './useAuth';
import { useAuthStore } from '../stores/authStore';

// Mock timers
vi.useFakeTimers();

describe('useAuth', () => {
  beforeEach(() => {
    // Reset store state
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('basic state', () => {
    it('should return initial unauthenticated state', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return authenticated state when user is logged in', () => {
      useAuthStore.setState({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'admin',
          isActive: true,
        },
        tokens: {
          accessToken: 'token',
          refreshToken: 'refresh',
          expiresAt: Date.now() + 60000,
        },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.user).not.toBeNull();
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.user?.email).toBe('test@example.com');
    });
  });

  describe('hasRole', () => {
    it('should return false when user is not authenticated', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.hasRole('admin')).toBe(false);
    });

    it('should return true when user has the specified role', () => {
      useAuthStore.setState({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'admin',
          isActive: true,
        },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.hasRole('admin')).toBe(true);
      expect(result.current.hasRole('user')).toBe(false);
    });

    it('should check against array of roles', () => {
      useAuthStore.setState({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'project_manager',
          isActive: true,
        },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.hasRole(['admin', 'project_manager'])).toBe(true);
      expect(result.current.hasRole(['admin', 'validator'])).toBe(false);
    });
  });

  describe('role helpers', () => {
    it('should correctly identify admin role', () => {
      useAuthStore.setState({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'admin',
          isActive: true,
        },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isProjectManager).toBe(false);
      expect(result.current.isValidator).toBe(false);
      expect(result.current.isAuditor).toBe(false);
    });

    it('should correctly identify project_manager role', () => {
      useAuthStore.setState({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          fullName: 'Test User',
          role: 'project_manager',
          isActive: true,
        },
        isAuthenticated: true,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isProjectManager).toBe(true);
    });
  });
});

describe('useAccessToken', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
    });
  });

  it('should return null when no tokens exist', () => {
    const { result } = renderHook(() => useAccessToken());
    expect(result.current).toBeNull();
  });

  it('should return access token when it exists', () => {
    useAuthStore.setState({
      tokens: {
        accessToken: 'my-access-token',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 60000,
      },
    });

    const { result } = renderHook(() => useAccessToken());
    expect(result.current).toBe('my-access-token');
  });
});

describe('useTokenExpiry', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
    });
  });

  it('should return expired state when no tokens exist', () => {
    const { result } = renderHook(() => useTokenExpiry());

    expect(result.current.isExpired).toBe(true);
    expect(result.current.expiresAt).toBeNull();
    expect(result.current.timeUntilExpiry).toBeNull();
  });

  it('should return correct expiry info for valid token', () => {
    const expiresAt = Date.now() + 60000; // 1 minute from now
    useAuthStore.setState({
      tokens: {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt,
      },
    });

    const { result } = renderHook(() => useTokenExpiry());

    expect(result.current.isExpired).toBe(false);
    expect(result.current.expiresAt).toBe(expiresAt);
    expect(result.current.timeUntilExpiry).toBeGreaterThan(0);
  });

  it('should return expired state for expired token', () => {
    const expiresAt = Date.now() - 1000; // 1 second ago
    useAuthStore.setState({
      tokens: {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresAt,
      },
    });

    const { result } = renderHook(() => useTokenExpiry());

    expect(result.current.isExpired).toBe(true);
    expect(result.current.timeUntilExpiry).toBe(0);
  });
});

/**
 * Custom hook for authentication
 * Provides convenient access to auth state and actions
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore, type User } from '../stores/authStore';

export interface UseAuthReturn {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  clearError: () => void;
  
  // Utilities
  hasRole: (role: User['role'] | User['role'][]) => boolean;
  isAdmin: boolean;
  isProjectManager: boolean;
  isValidator: boolean;
  isAuditor: boolean;
}

const TOKEN_REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function useAuth(): UseAuthReturn {
  const {
    user,
    tokens,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshToken,
    clearError,
    isTokenExpired,
  } = useAuthStore();

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!isAuthenticated || !tokens) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    const checkAndRefresh = async (): Promise<void> => {
      if (isTokenExpired()) {
        await refreshToken();
      }
    };

    // Initial check
    checkAndRefresh();

    // Set up interval for periodic checks
    refreshIntervalRef.current = setInterval(checkAndRefresh, TOKEN_REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, tokens, isTokenExpired, refreshToken]);

  const hasRole = useCallback(
    (role: User['role'] | User['role'][]): boolean => {
      if (!user) return false;
      if (Array.isArray(role)) {
        return role.includes(user.role);
      }
      return user.role === role;
    },
    [user]
  );

  const isAdmin = user?.role === 'admin';
  const isProjectManager = user?.role === 'project_manager';
  const isValidator = user?.role === 'validator';
  const isAuditor = user?.role === 'auditor';

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshToken,
    clearError,
    hasRole,
    isAdmin,
    isProjectManager,
    isValidator,
    isAuditor,
  };
}

/**
 * Hook to check if user has required permission
 */
export function useRequireAuth(redirectTo?: string): {
  isAuthenticated: boolean;
  isLoading: boolean;
} {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && redirectTo) {
      // In a real app, you'd use a router here
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, isLoading, redirectTo]);

  return { isAuthenticated, isLoading };
}

/**
 * Hook to get current access token
 */
export function useAccessToken(): string | null {
  const tokens = useAuthStore((state) => state.tokens);
  return tokens?.accessToken || null;
}

/**
 * Hook to get token expiry status
 */
export function useTokenExpiry(): {
  isExpired: boolean;
  expiresAt: number | null;
  timeUntilExpiry: number | null;
} {
  const tokens = useAuthStore((state) => state.tokens);
  const [now, setNow] = useState(() => Date.now());
  
  // Update current time periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  if (!tokens) {
    return { isExpired: true, expiresAt: null, timeUntilExpiry: null };
  }

  const isExpired = now >= tokens.expiresAt;
  const timeUntilExpiry = isExpired ? 0 : tokens.expiresAt - now;

  return {
    isExpired,
    expiresAt: tokens.expiresAt,
    timeUntilExpiry,
  };
}

export default useAuth;

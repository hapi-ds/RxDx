/**
 * Authentication store using Zustand
 * Handles login, logout, token refresh, and user state management
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { clearFilterState } from '../utils/sessionStorage';

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'project_manager' | 'validator' | 'auditor' | 'user';
  isActive: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  isTokenExpired: () => boolean;
  getAccessToken: () => string | null;
}

export type AuthStore = AuthState & AuthActions;

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, password: string): Promise<void> => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: email,
              password: password,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            let errorMessage = 'Login failed';
            if (errorData.detail) {
              if (typeof errorData.detail === 'string') {
                errorMessage = errorData.detail;
              } else if (Array.isArray(errorData.detail)) {
                errorMessage = errorData.detail.map((e: { msg?: string }) => e.msg || JSON.stringify(e)).join(', ');
              } else {
                errorMessage = JSON.stringify(errorData.detail);
              }
            }
            throw new Error(errorMessage);
          }

          const data = await response.json();
          
          const tokens: AuthTokens = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || data.access_token,
            expiresAt: Date.now() + (data.expires_in || 1800) * 1000,
          };

          // Fetch user profile
          const userResponse = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          });

          if (!userResponse.ok) {
            throw new Error('Failed to fetch user profile');
          }

          const userData = await userResponse.json();
          
          const user: User = {
            id: userData.id,
            email: userData.email,
            fullName: userData.full_name,
            role: userData.role,
            isActive: userData.is_active,
          };

          set({
            user,
            tokens,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({
            user: null,
            tokens: null,
            isAuthenticated: false,
            isLoading: false,
            error: message,
          });
          throw error;
        }
      },

      logout: (): void => {
        const { tokens } = get();
        
        // Call logout endpoint (fire and forget)
        if (tokens?.accessToken) {
          fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          }).catch(() => {
            // Ignore errors on logout
          });
        }

        // Clear filter state from session storage
        clearFilterState();

        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      refreshToken: async (): Promise<boolean> => {
        const { tokens } = get();
        
        if (!tokens?.refreshToken) {
          return false;
        }

        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokens.refreshToken}`,
            },
          });

          if (!response.ok) {
            get().logout();
            return false;
          }

          const data = await response.json();
          
          const newTokens: AuthTokens = {
            accessToken: data.access_token,
            refreshToken: data.refresh_token || tokens.refreshToken,
            expiresAt: Date.now() + (data.expires_in || 1800) * 1000,
          };

          set({ tokens: newTokens });
          return true;
        } catch {
          get().logout();
          return false;
        }
      },

      setUser: (user: User | null): void => {
        set({ user, isAuthenticated: !!user });
      },

      setTokens: (tokens: AuthTokens | null): void => {
        set({ tokens, isAuthenticated: !!tokens });
      },

      setError: (error: string | null): void => {
        set({ error });
      },

      clearError: (): void => {
        set({ error: null });
      },

      isTokenExpired: (): boolean => {
        const { tokens } = get();
        if (!tokens) return true;
        // Consider token expired 30 seconds before actual expiry
        return Date.now() >= tokens.expiresAt - 30000;
      },

      getAccessToken: (): string | null => {
        const { tokens } = get();
        return tokens?.accessToken || null;
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

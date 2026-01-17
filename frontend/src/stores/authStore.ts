/**
 * Authentication store using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'project_manager' | 'validator' | 'auditor' | 'user';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string): Promise<void> => {
        // TODO: Implement actual API call
        console.log('Login:', email, password);
        throw new Error('Not implemented');
      },

      logout: (): void => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      refreshToken: async (): Promise<void> => {
        // TODO: Implement token refresh
        console.log('Refresh token');
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

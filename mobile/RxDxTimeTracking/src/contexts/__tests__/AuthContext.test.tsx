import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { AuthProvider, useAuth, AuthContextType } from '../AuthContext';
import { AuthService } from '../../services/AuthService';
import { ApiService } from '../../services/ApiService';
import { User } from '../../types';

// Mock services
jest.mock('../../services/AuthService');
jest.mock('../../services/ApiService');

describe('AuthContext', () => {
  let mockAuthService: jest.Mocked<AuthService>;
  let mockApiService: jest.Mocked<ApiService>;
  let mockUser: User;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock user
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      full_name: 'Test User',
      role: 'user',
    };

    // Create mock services
    mockAuthService = {
      login: jest.fn(),
      logout: jest.fn(),
      getStoredToken: jest.fn(),
      getStoredUser: jest.fn(),
      storeToken: jest.fn(),
      storeUser: jest.fn(),
      clearAuth: jest.fn(),
    } as any;

    mockApiService = {
      setToken: jest.fn(),
      clearToken: jest.fn(),
    } as any;

    // Default mock implementations
    mockAuthService.getStoredToken.mockResolvedValue(null);
    mockAuthService.getStoredUser.mockResolvedValue(null);
  });

  describe('useAuth hook', () => {
    it('should throw error when used outside AuthProvider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      function TestComponent() {
        useAuth(); // This should throw
        return null;
      }

      try {
        renderer.create(<TestComponent />);
        // If we get here, the test should fail
        expect(true).toBe(false); // Force failure
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('useAuth must be used within an AuthProvider');
      }

      consoleSpy.mockRestore();
    });

    it('should provide auth context when used within AuthProvider', async () => {
      let contextValue: AuthContextType | null = null;

      function TestComponent() {
        contextValue = useAuth();
        return null;
      }

      await act(async () => {
        renderer.create(
          <AuthProvider authService={mockAuthService} apiService={mockApiService}>
            <TestComponent />
          </AuthProvider>
        );

        // Wait for initial loading
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(contextValue).not.toBeNull();
      expect(contextValue?.user).toBeNull();
      expect(contextValue?.token).toBeNull();
      expect(contextValue?.isAuthenticated).toBe(false);
      expect(typeof contextValue?.login).toBe('function');
      expect(typeof contextValue?.logout).toBe('function');
    });
  });

  describe('Initial state', () => {
    it('should start with loading state', () => {
      let contextValue: AuthContextType | null = null;

      function TestComponent() {
        contextValue = useAuth();
        return null;
      }

      act(() => {
        renderer.create(
          <AuthProvider authService={mockAuthService} apiService={mockApiService}>
            <TestComponent />
          </AuthProvider>
        );
      });

      expect(contextValue?.isLoading).toBe(true);
    });

    it('should restore token on mount if stored', async () => {
      const storedToken = 'stored-token-123';
      mockAuthService.getStoredToken.mockResolvedValue(storedToken);
      mockAuthService.getStoredUser.mockResolvedValue(mockUser);

      let contextValue: AuthContextType | null = null;

      function TestComponent() {
        contextValue = useAuth();
        return null;
      }

      await act(async () => {
        renderer.create(
          <AuthProvider authService={mockAuthService} apiService={mockApiService}>
            <TestComponent />
          </AuthProvider>
        );

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockAuthService.getStoredToken).toHaveBeenCalled();
      expect(mockAuthService.getStoredUser).toHaveBeenCalled();
      expect(mockApiService.setToken).toHaveBeenCalledWith(storedToken);
      expect(contextValue?.user).toEqual(mockUser);
      expect(contextValue?.token).toBe(storedToken);
      expect(contextValue?.isAuthenticated).toBe(true);
      expect(contextValue?.isLoading).toBe(false);
    });

    it('should not restore token if none stored', async () => {
      mockAuthService.getStoredToken.mockResolvedValue(null);
      mockAuthService.getStoredUser.mockResolvedValue(null);

      let contextValue: AuthContextType | null = null;

      function TestComponent() {
        contextValue = useAuth();
        return null;
      }

      await act(async () => {
        renderer.create(
          <AuthProvider authService={mockAuthService} apiService={mockApiService}>
            <TestComponent />
          </AuthProvider>
        );

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      expect(mockApiService.setToken).not.toHaveBeenCalled();
      expect(contextValue?.user).toBeNull();
      expect(contextValue?.token).toBeNull();
      expect(contextValue?.isAuthenticated).toBe(false);
      expect(contextValue?.isLoading).toBe(false);
    });
  });

  describe('login action', () => {
    it('should login successfully', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const token = 'new-token-123';

      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        token,
      });

      let contextValue: AuthContextType | null = null;

      function TestComponent() {
        contextValue = useAuth();
        return null;
      }

      await act(async () => {
        renderer.create(
          <AuthProvider authService={mockAuthService} apiService={mockApiService}>
            <TestComponent />
          </AuthProvider>
        );

        // Wait for initial loading
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Perform login
      await act(async () => {
        await contextValue?.login(email, password);
      });

      expect(mockAuthService.login).toHaveBeenCalledWith(email, password);
      expect(mockApiService.setToken).toHaveBeenCalledWith(token);
      expect(contextValue?.user).toEqual(mockUser);
      expect(contextValue?.token).toBe(token);
      expect(contextValue?.isAuthenticated).toBe(true);
      expect(contextValue?.error).toBeNull();
    });

    it('should handle login error', async () => {
      const email = 'test@example.com';
      const password = 'wrong-password';
      const errorMessage = 'Invalid credentials';

      mockAuthService.login.mockRejectedValue(new Error(errorMessage));

      let contextValue: AuthContextType | null = null;

      function TestComponent() {
        contextValue = useAuth();
        return null;
      }

      await act(async () => {
        renderer.create(
          <AuthProvider authService={mockAuthService} apiService={mockApiService}>
            <TestComponent />
          </AuthProvider>
        );

        // Wait for initial loading
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Attempt login and expect it to throw
      try {
        await act(async () => {
          await contextValue?.login(email, password);
        });
        // If we get here, test should fail
        expect(true).toBe(false);
      } catch (error) {
        // Error was thrown as expected
        expect((error as Error).message).toBe(errorMessage);
      }

      // Check state after error
      expect(contextValue?.user).toBeNull();
      expect(contextValue?.token).toBeNull();
      expect(contextValue?.isAuthenticated).toBe(false);
      expect(contextValue?.error).toBe(errorMessage);
    });
  });

  describe('logout action', () => {
    it('should logout successfully', async () => {
      // Setup: First login
      const token = 'token-123';
      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        token,
      });
      mockAuthService.logout.mockResolvedValue();

      let contextValue: AuthContextType | null = null;

      function TestComponent() {
        contextValue = useAuth();
        return null;
      }

      await act(async () => {
        renderer.create(
          <AuthProvider authService={mockAuthService} apiService={mockApiService}>
            <TestComponent />
          </AuthProvider>
        );

        // Wait for initial loading
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Login
      await act(async () => {
        await contextValue?.login('test@example.com', 'password');
      });

      expect(contextValue?.isAuthenticated).toBe(true);

      // Logout
      await act(async () => {
        await contextValue?.logout();
      });

      expect(mockAuthService.logout).toHaveBeenCalled();
      expect(mockApiService.clearToken).toHaveBeenCalled();
      expect(contextValue?.user).toBeNull();
      expect(contextValue?.token).toBeNull();
      expect(contextValue?.isAuthenticated).toBe(false);
      expect(contextValue?.error).toBeNull();
    });
  });

  describe('AuthProvider props', () => {
    it('should accept custom authService and apiService', () => {
      let contextValue: AuthContextType | null = null;

      function TestComponent() {
        contextValue = useAuth();
        return null;
      }

      act(() => {
        renderer.create(
          <AuthProvider authService={mockAuthService} apiService={mockApiService}>
            <TestComponent />
          </AuthProvider>
        );
      });

      expect(contextValue).not.toBeNull();
      expect(typeof contextValue?.login).toBe('function');
      expect(typeof contextValue?.logout).toBe('function');
    });
  });
});

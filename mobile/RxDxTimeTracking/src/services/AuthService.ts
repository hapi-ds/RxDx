import apiService from './ApiService';
import StorageService from './StorageService';
import {User, LoginResponse} from '../types/user';

// Storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

/**
 * AuthService handles authentication operations and token management
 */
class AuthService {
  /**
   * Login with email and password
   * @param email - User email
   * @param password - User password
   * @returns User object
   */
  async login(email: string, password: string): Promise<User> {
    try {
      // Call login API endpoint
      const response = await apiService.post<LoginResponse>(
        '/api/v1/auth/login',
        {
          username: email, // Backend expects 'username' field
          password,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      // Store token and user
      await this.storeToken(response.access_token);
      await this.storeUser(response.user);

      // Set token in API service
      apiService.setToken(response.access_token);

      return response.user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Logout and clear authentication data
   */
  async logout(): Promise<void> {
    try {
      // Clear token from API service
      apiService.clearToken();

      // Clear stored auth data
      await this.clearAuth();
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  }

  /**
   * Get stored authentication token
   * @returns Token string or null
   */
  async getStoredToken(): Promise<string | null> {
    try {
      return await StorageService.getItem<string>(TOKEN_KEY);
    } catch (error) {
      console.error('Failed to get stored token:', error);
      return null;
    }
  }

  /**
   * Get stored user data
   * @returns User object or null
   */
  async getStoredUser(): Promise<User | null> {
    try {
      return await StorageService.getItem<User>(USER_KEY);
    } catch (error) {
      console.error('Failed to get stored user:', error);
      return null;
    }
  }

  /**
   * Store authentication token
   * @param token - JWT token
   */
  async storeToken(token: string): Promise<void> {
    try {
      await StorageService.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store token:', error);
      throw error;
    }
  }

  /**
   * Store user data
   * @param user - User object
   */
  async storeUser(user: User): Promise<void> {
    try {
      await StorageService.setItem(USER_KEY, user);
    } catch (error) {
      console.error('Failed to store user:', error);
      throw error;
    }
  }

  /**
   * Clear all authentication data
   */
  async clearAuth(): Promise<void> {
    try {
      await StorageService.removeItem(TOKEN_KEY);
      await StorageService.removeItem(USER_KEY);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
      throw error;
    }
  }

  /**
   * Restore authentication state from storage
   * This should be called on app startup
   * @returns User object if authenticated, null otherwise
   */
  async restoreAuth(): Promise<User | null> {
    try {
      const token = await this.getStoredToken();
      const user = await this.getStoredUser();

      if (token && user) {
        // Set token in API service
        apiService.setToken(token);
        return user;
      }

      return null;
    } catch (error) {
      console.error('Failed to restore auth:', error);
      return null;
    }
  }
}

// Export a singleton instance
export default new AuthService();

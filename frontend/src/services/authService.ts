/**
 * Authentication service
 * Handles all auth-related API calls
 */

import { apiClient, getErrorMessage } from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'project_manager' | 'validator' | 'auditor' | 'user';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

class AuthService {
  private readonly basePath = '/api/v1/auth';

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>(
        `${this.basePath}/login`,
        {
          email: credentials.email,
          password: credentials.password,
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async logout(): Promise<void> {
    try {
      await apiClient.post(`${this.basePath}/logout`);
    } catch {
      // Ignore logout errors
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const response = await apiClient.post<RefreshTokenResponse>(
        `${this.basePath}/refresh`,
        null,
        {
          headers: {
            Authorization: `Bearer ${refreshToken}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  async getCurrentUser(): Promise<UserResponse> {
    try {
      const response = await apiClient.get<UserResponse>(`${this.basePath}/me`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
}

export const authService = new AuthService();

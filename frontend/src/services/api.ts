/**
 * API client configuration with JWT token handling
 * Implements request/response interceptors for authentication
 */

import axios, {
  type AxiosInstance,
  type AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string): void {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function onRefreshFailed(): void {
  refreshSubscribers = [];
}

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    this.setupRequestInterceptor();
    this.setupResponseInterceptor();
  }

  private setupRequestInterceptor(): void {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );
  }

  private setupResponseInterceptor(): void {
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & {
          _retry?: boolean;
        };

        // Handle 401 Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (isRefreshing) {
            // Wait for the ongoing refresh to complete
            return new Promise((resolve, reject) => {
              subscribeTokenRefresh((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.client(originalRequest));
              });
              // Add timeout to prevent hanging
              setTimeout(() => reject(error), 10000);
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const success = await useAuthStore.getState().refreshToken();
            
            if (success) {
              const newToken = useAuthStore.getState().tokens?.accessToken;
              if (newToken) {
                onTokenRefreshed(newToken);
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }
                return this.client(originalRequest);
              }
            }
            
            // Refresh failed, logout user
            onRefreshFailed();
            useAuthStore.getState().logout();
            return Promise.reject(error);
          } catch (refreshError) {
            onRefreshFailed();
            useAuthStore.getState().logout();
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getAccessToken(): string | null {
    return useAuthStore.getState().getAccessToken();
  }

  public get<T>(url: string, config = {}): Promise<AxiosResponse<T>> {
    return this.client.get<T>(url, config);
  }

  public post<T>(
    url: string,
    data?: unknown,
    config = {}
  ): Promise<AxiosResponse<T>> {
    return this.client.post<T>(url, data, config);
  }

  public put<T>(
    url: string,
    data?: unknown,
    config = {}
  ): Promise<AxiosResponse<T>> {
    return this.client.put<T>(url, data, config);
  }

  public patch<T>(
    url: string,
    data?: unknown,
    config = {}
  ): Promise<AxiosResponse<T>> {
    return this.client.patch<T>(url, data, config);
  }

  public delete<T>(url: string, config = {}): Promise<AxiosResponse<T>> {
    return this.client.delete<T>(url, config);
  }

  public getBaseUrl(): string {
    return API_BASE_URL;
  }
}

export const apiClient = new ApiClient();

// Export types for use in services
export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

export interface ApiError {
  message: string;
  detail?: string;
  statusCode: number;
}

export function isApiError(error: unknown): error is AxiosError<ApiError> {
  return axios.isAxiosError(error);
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    const data = error.response?.data;
    // Handle various error response formats
    if (typeof data === 'string') {
      return data;
    }
    if (data && typeof data === 'object') {
      // FastAPI validation errors
      if ('detail' in data) {
        const detail = (data as { detail: unknown }).detail;
        if (typeof detail === 'string') {
          return detail;
        }
        // Handle array of validation errors
        if (Array.isArray(detail)) {
          return detail.map((err: { msg?: string; message?: string }) => 
            err.msg || err.message || JSON.stringify(err)
          ).join(', ');
        }
        // Handle object detail
        if (typeof detail === 'object' && detail !== null) {
          return JSON.stringify(detail);
        }
      }
      if ('message' in data) {
        const message = (data as { message: unknown }).message;
        if (typeof message === 'string') {
          return message;
        }
      }
    }
    return error.message || 'An unexpected error occurred';
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

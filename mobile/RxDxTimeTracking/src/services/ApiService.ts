import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import {ErrorType, AppError} from '../types/errors';

/**
 * ApiService handles all HTTP requests to the RxDx backend API
 */
class ApiService {
  private axiosInstance: AxiosInstance;
  private token: string | null = null;

  /**
   * Create ApiService instance with base URL configuration
   * @param baseUrl - Base URL for the API (default: http://localhost:8000)
   */
  constructor(baseUrl: string = 'http://localhost:8000') {
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Set up request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor to add Authorization header
    this.axiosInstance.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      },
    );

    // Response interceptor to handle 401 errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - clear token
          this.clearToken();
          // You can emit an event here to trigger logout in the app
          console.warn('Authentication failed - token cleared');
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Set the authentication token
   * @param token - JWT token
   */
  setToken(token: string): void {
    this.token = token;
  }

  /**
   * Clear the authentication token
   */
  clearToken(): void {
    this.token = null;
  }

  /**
   * Map axios error to AppError
   * @param error - Axios error
   * @returns AppError
   */
  private mapError(error: unknown): AppError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{detail?: string}>;

      // Network error (no response)
      if (!axiosError.response) {
        return {
          type: ErrorType.NETWORK_ERROR,
          message: 'Unable to connect. Please check your internet connection.',
          details: axiosError.message,
        };
      }

      // Get error message from response
      const message =
        axiosError.response.data?.detail ||
        axiosError.message ||
        'An error occurred';

      // Map status codes to error types
      switch (axiosError.response.status) {
        case 401:
        case 403:
          return {
            type: ErrorType.AUTH_ERROR,
            message: message || 'Authentication failed',
            details: axiosError.response.data,
          };
        case 400:
        case 422:
          return {
            type: ErrorType.VALIDATION_ERROR,
            message: message || 'Validation failed',
            details: axiosError.response.data,
          };
        case 500:
        case 502:
        case 503:
        case 504:
          return {
            type: ErrorType.SERVER_ERROR,
            message: 'Something went wrong. Please try again later.',
            details: axiosError.response.data,
          };
        default:
          return {
            type: ErrorType.UNKNOWN_ERROR,
            message: message || 'An unexpected error occurred',
            details: axiosError.response.data,
          };
      }
    }

    // Non-axios error
    return {
      type: ErrorType.UNKNOWN_ERROR,
      message: error instanceof Error ? error.message : 'An unknown error occurred',
      details: error,
    };
  }

  /**
   * Generic request method
   * @param method - HTTP method
   * @param endpoint - API endpoint
   * @param data - Request data (optional)
   * @param config - Additional axios config (optional)
   * @returns Promise with response data
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      let response: AxiosResponse<T>;

      switch (method) {
        case 'GET':
          response = await this.axiosInstance.get<T>(endpoint, config);
          break;
        case 'POST':
          response = await this.axiosInstance.post<T>(endpoint, data, config);
          break;
        case 'PUT':
          response = await this.axiosInstance.put<T>(endpoint, data, config);
          break;
        case 'PATCH':
          response = await this.axiosInstance.patch<T>(endpoint, data, config);
          break;
        case 'DELETE':
          response = await this.axiosInstance.delete<T>(endpoint, config);
          break;
      }

      return response.data;
    } catch (error) {
      const appError = this.mapError(error);
      throw appError;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, config);
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>('POST', endpoint, data, config);
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>('PUT', endpoint, data, config);
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>('PATCH', endpoint, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, config);
  }

  /**
   * Update the base URL
   * @param baseUrl - New base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.axiosInstance.defaults.baseURL = baseUrl;
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string | undefined {
    return this.axiosInstance.defaults.baseURL;
  }
}

// Export the class
export {ApiService};

// Export a default singleton instance for convenience
const apiServiceInstance = new ApiService();
export default apiServiceInstance;

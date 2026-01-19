/**
 * Unit tests for API client
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import { apiClient, getErrorMessage, isApiError } from './api';
import { useAuthStore } from '../stores/authStore';

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof import('axios')>('axios');
  return {
    ...actual,
    default: {
      create: vi.fn(() => ({
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() },
        },
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        delete: vi.fn(),
      })),
      isAxiosError: actual.default.isAxiosError,
    },
  };
});

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should be defined', () => {
    expect(apiClient).toBeDefined();
  });

  it('should have HTTP methods', () => {
    expect(apiClient.get).toBeDefined();
    expect(apiClient.post).toBeDefined();
    expect(apiClient.put).toBeDefined();
    expect(apiClient.patch).toBeDefined();
    expect(apiClient.delete).toBeDefined();
  });

  it('should return base URL', () => {
    expect(apiClient.getBaseUrl()).toBe('http://localhost:8000');
  });
});

describe('getErrorMessage', () => {
  it('should return message from axios error response', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          detail: 'Detailed error message',
        },
      },
      message: 'Request failed',
    };

    // Mock isAxiosError to return true for this error
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const message = getErrorMessage(error);
    expect(message).toBe('Detailed error message');
  });

  it('should return message field if detail is not present', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {
          message: 'Error message',
        },
      },
      message: 'Request failed',
    };

    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const message = getErrorMessage(error);
    expect(message).toBe('Error message');
  });

  it('should return axios error message if no response data', () => {
    const error = {
      isAxiosError: true,
      response: {
        data: {},
      },
      message: 'Network Error',
    };

    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    const message = getErrorMessage(error);
    expect(message).toBe('Network Error');
  });

  it('should return Error message for standard errors', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);

    const error = new Error('Standard error');
    const message = getErrorMessage(error);
    expect(message).toBe('Standard error');
  });

  it('should return default message for unknown errors', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);

    const message = getErrorMessage('unknown error');
    expect(message).toBe('An unexpected error occurred');
  });

  it('should return default message for null', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);

    const message = getErrorMessage(null);
    expect(message).toBe('An unexpected error occurred');
  });
});

describe('isApiError', () => {
  it('should return true for axios errors', () => {
    const error = {
      isAxiosError: true,
      response: { status: 400 },
    };

    vi.spyOn(axios, 'isAxiosError').mockReturnValue(true);

    expect(isApiError(error)).toBe(true);
  });

  it('should return false for non-axios errors', () => {
    vi.spyOn(axios, 'isAxiosError').mockReturnValue(false);

    expect(isApiError(new Error('test'))).toBe(false);
    expect(isApiError('string error')).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});

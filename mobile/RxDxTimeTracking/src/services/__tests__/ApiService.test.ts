import axios, {AxiosError} from 'axios';
import {ErrorType} from '../../types/errors';

// Mock axios
jest.mock('axios', () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: {
        use: jest.fn((successHandler, errorHandler) => {
          // Store handlers for testing if needed
          return 0;
        }),
      },
      response: {
        use: jest.fn((successHandler, errorHandler) => {
          // Store handlers for testing if needed
          return 0;
        }),
      },
    },
    defaults: {
      baseURL: 'http://localhost:8000',
    },
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn(() => mockAxiosInstance),
      isAxiosError: jest.fn(),
    },
    create: jest.fn(() => mockAxiosInstance),
    isAxiosError: jest.fn(),
  };
});

const mockedAxios = axios as jest.Mocked<typeof axios>;

// Now import ApiService after mocking
import {ApiService} from '../ApiService';

describe('ApiService', () => {
  let apiService: ApiService;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mock instance that was created
    mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[0]?.value;
    
    // Create a new instance for testing
    apiService = new ApiService('http://localhost:8000');
    
    // Get the latest mock instance
    mockAxiosInstance = (mockedAxios.create as jest.Mock).mock.results[
      (mockedAxios.create as jest.Mock).mock.results.length - 1
    ]?.value;
    
    // Reset defaults
    if (mockAxiosInstance) {
      mockAxiosInstance.defaults.baseURL = 'http://localhost:8000';
    }
  });

  describe('constructor', () => {
    it('should create axios instance with base URL', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:8000',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should setup interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('setToken and clearToken', () => {
    it('should set token', () => {
      const token = 'test-token-123';
      apiService.setToken(token);
      expect((apiService as any).token).toBe(token);
    });

    it('should clear token', () => {
      apiService.setToken('test-token');
      apiService.clearToken();
      expect((apiService as any).token).toBeNull();
    });
  });

  describe('request method', () => {
    it('should make GET request', async () => {
      const mockData = {id: '1', name: 'Test'};
      mockAxiosInstance.get.mockResolvedValueOnce({data: mockData});

      const result = await apiService.request('GET', '/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(mockData);
    });

    it('should make POST request', async () => {
      const mockData = {id: '1', name: 'Test'};
      const postData = {name: 'Test'};
      mockAxiosInstance.post.mockResolvedValueOnce({data: mockData});

      const result = await apiService.request('POST', '/test', postData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/test',
        postData,
        undefined,
      );
      expect(result).toEqual(mockData);
    });

    it('should make PUT request', async () => {
      const mockData = {id: '1', name: 'Updated'};
      const putData = {name: 'Updated'};
      mockAxiosInstance.put.mockResolvedValueOnce({data: mockData});

      const result = await apiService.request('PUT', '/test/1', putData);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/test/1',
        putData,
        undefined,
      );
      expect(result).toEqual(mockData);
    });

    it('should make PATCH request', async () => {
      const mockData = {id: '1', name: 'Patched'};
      const patchData = {name: 'Patched'};
      mockAxiosInstance.patch.mockResolvedValueOnce({data: mockData});

      const result = await apiService.request('PATCH', '/test/1', patchData);

      expect(mockAxiosInstance.patch).toHaveBeenCalledWith(
        '/test/1',
        patchData,
        undefined,
      );
      expect(result).toEqual(mockData);
    });

    it('should make DELETE request', async () => {
      const mockData = {success: true};
      mockAxiosInstance.delete.mockResolvedValueOnce({data: mockData});

      const result = await apiService.request('DELETE', '/test/1');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith(
        '/test/1',
        undefined,
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('convenience methods', () => {
    it('should call get method', async () => {
      const mockData = {id: '1'};
      mockAxiosInstance.get.mockResolvedValueOnce({data: mockData});

      const result = await apiService.get('/test');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
      expect(result).toEqual(mockData);
    });

    it('should call post method', async () => {
      const mockData = {id: '1'};
      const postData = {name: 'Test'};
      mockAxiosInstance.post.mockResolvedValueOnce({data: mockData});

      const result = await apiService.post('/test', postData);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/test',
        postData,
        undefined,
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('error handling', () => {
    it('should map network error', async () => {
      const networkError = {
        isAxiosError: true,
        message: 'Network Error',
        response: undefined,
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValueOnce(networkError);

      try {
        await apiService.get('/test');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.type).toBe(ErrorType.NETWORK_ERROR);
        expect(error.message).toContain('Unable to connect');
      }
    });

    it('should map 401 auth error', async () => {
      const authError = {
        isAxiosError: true,
        message: 'Unauthorized',
        response: {
          status: 401,
          data: {detail: 'Invalid credentials'},
        },
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValueOnce(authError);

      try {
        await apiService.get('/test');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.type).toBe(ErrorType.AUTH_ERROR);
        expect(error.message).toBe('Invalid credentials');
      }
    });

    it('should map 400 validation error', async () => {
      const validationError = {
        isAxiosError: true,
        message: 'Bad Request',
        response: {
          status: 400,
          data: {detail: 'Validation failed'},
        },
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.post.mockRejectedValueOnce(validationError);

      try {
        await apiService.post('/test', {});
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.type).toBe(ErrorType.VALIDATION_ERROR);
        expect(error.message).toBe('Validation failed');
      }
    });

    it('should map 500 server error', async () => {
      const serverError = {
        isAxiosError: true,
        message: 'Internal Server Error',
        response: {
          status: 500,
          data: {detail: 'Server error'},
        },
      } as AxiosError;

      mockedAxios.isAxiosError.mockReturnValue(true);
      mockAxiosInstance.get.mockRejectedValueOnce(serverError);

      try {
        await apiService.get('/test');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.type).toBe(ErrorType.SERVER_ERROR);
        expect(error.message).toContain('Something went wrong');
      }
    });

    it('should map unknown error', async () => {
      const unknownError = new Error('Unknown error');

      mockedAxios.isAxiosError.mockReturnValue(false);
      mockAxiosInstance.get.mockRejectedValueOnce(unknownError);

      try {
        await apiService.get('/test');
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.type).toBe(ErrorType.UNKNOWN_ERROR);
        expect(error.message).toBe('Unknown error');
      }
    });
  });

  describe('base URL management', () => {
    it('should set base URL', () => {
      const newUrl = 'https://api.example.com';
      apiService.setBaseUrl(newUrl);
      expect(mockAxiosInstance.defaults.baseURL).toBe(newUrl);
    });

    it('should get base URL', () => {
      const url = apiService.getBaseUrl();
      expect(url).toBe('http://localhost:8000');
    });
  });
});

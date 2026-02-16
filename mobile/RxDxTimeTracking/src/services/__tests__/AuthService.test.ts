import AuthService from '../AuthService';
import apiService from '../ApiService';
import StorageService from '../StorageService';
import {User, LoginResponse} from '../../types/user';

// Mock dependencies
jest.mock('../ApiService', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    setToken: jest.fn(),
    clearToken: jest.fn(),
  },
}));

jest.mock('../StorageService', () => ({
  __esModule: true,
  default: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

describe('AuthService', () => {
  const mockUser: User = {
    id: '123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: 'user',
  };

  const mockLoginResponse: LoginResponse = {
    access_token: 'test-token-123',
    token_type: 'bearer',
    user: mockUser,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should login successfully and store credentials', async () => {
      (apiService.post as jest.Mock).mockResolvedValueOnce(mockLoginResponse);
      (StorageService.setItem as jest.Mock).mockResolvedValue(undefined);

      const result = await AuthService.login('test@example.com', 'password123');

      expect(apiService.post).toHaveBeenCalledWith(
        '/api/v1/auth/login',
        {
          username: 'test@example.com',
          password: 'password123',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      expect(StorageService.setItem).toHaveBeenCalledWith(
        'auth_token',
        'test-token-123',
      );
      expect(StorageService.setItem).toHaveBeenCalledWith(
        'auth_user',
        mockUser,
      );
      expect(apiService.setToken).toHaveBeenCalledWith('test-token-123');
      expect(result).toEqual(mockUser);
    });

    it('should throw error when login fails', async () => {
      const error = new Error('Invalid credentials');
      (apiService.post as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        AuthService.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should logout and clear auth data', async () => {
      (StorageService.removeItem as jest.Mock).mockResolvedValue(undefined);

      await AuthService.logout();

      expect(apiService.clearToken).toHaveBeenCalled();
      expect(StorageService.removeItem).toHaveBeenCalledWith('auth_token');
      expect(StorageService.removeItem).toHaveBeenCalledWith('auth_user');
    });

    it('should throw error when logout fails', async () => {
      const error = new Error('Storage error');
      (StorageService.removeItem as jest.Mock).mockRejectedValueOnce(error);

      await expect(AuthService.logout()).rejects.toThrow('Storage error');
    });
  });

  describe('getStoredToken', () => {
    it('should retrieve stored token', async () => {
      (StorageService.getItem as jest.Mock).mockResolvedValueOnce(
        'stored-token',
      );

      const token = await AuthService.getStoredToken();

      expect(StorageService.getItem).toHaveBeenCalledWith('auth_token');
      expect(token).toBe('stored-token');
    });

    it('should return null when no token is stored', async () => {
      (StorageService.getItem as jest.Mock).mockResolvedValueOnce(null);

      const token = await AuthService.getStoredToken();

      expect(token).toBeNull();
    });

    it('should return null when retrieval fails', async () => {
      (StorageService.getItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error'),
      );

      const token = await AuthService.getStoredToken();

      expect(token).toBeNull();
    });
  });

  describe('getStoredUser', () => {
    it('should retrieve stored user', async () => {
      (StorageService.getItem as jest.Mock).mockResolvedValueOnce(mockUser);

      const user = await AuthService.getStoredUser();

      expect(StorageService.getItem).toHaveBeenCalledWith('auth_user');
      expect(user).toEqual(mockUser);
    });

    it('should return null when no user is stored', async () => {
      (StorageService.getItem as jest.Mock).mockResolvedValueOnce(null);

      const user = await AuthService.getStoredUser();

      expect(user).toBeNull();
    });

    it('should return null when retrieval fails', async () => {
      (StorageService.getItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error'),
      );

      const user = await AuthService.getStoredUser();

      expect(user).toBeNull();
    });
  });

  describe('storeToken', () => {
    it('should store token', async () => {
      (StorageService.setItem as jest.Mock).mockResolvedValue(undefined);

      await AuthService.storeToken('new-token');

      expect(StorageService.setItem).toHaveBeenCalledWith(
        'auth_token',
        'new-token',
      );
    });

    it('should throw error when storage fails', async () => {
      const error = new Error('Storage error');
      (StorageService.setItem as jest.Mock).mockRejectedValueOnce(error);

      await expect(AuthService.storeToken('new-token')).rejects.toThrow(
        'Storage error',
      );
    });
  });

  describe('storeUser', () => {
    it('should store user', async () => {
      (StorageService.setItem as jest.Mock).mockResolvedValue(undefined);

      await AuthService.storeUser(mockUser);

      expect(StorageService.setItem).toHaveBeenCalledWith(
        'auth_user',
        mockUser,
      );
    });

    it('should throw error when storage fails', async () => {
      const error = new Error('Storage error');
      (StorageService.setItem as jest.Mock).mockRejectedValueOnce(error);

      await expect(AuthService.storeUser(mockUser)).rejects.toThrow(
        'Storage error',
      );
    });
  });

  describe('clearAuth', () => {
    it('should clear all auth data', async () => {
      (StorageService.removeItem as jest.Mock).mockResolvedValue(undefined);

      await AuthService.clearAuth();

      expect(StorageService.removeItem).toHaveBeenCalledWith('auth_token');
      expect(StorageService.removeItem).toHaveBeenCalledWith('auth_user');
    });

    it('should throw error when clear fails', async () => {
      const error = new Error('Storage error');
      (StorageService.removeItem as jest.Mock).mockRejectedValueOnce(error);

      await expect(AuthService.clearAuth()).rejects.toThrow('Storage error');
    });
  });

  describe('restoreAuth', () => {
    it('should restore auth state when token and user exist', async () => {
      (StorageService.getItem as jest.Mock)
        .mockResolvedValueOnce('stored-token')
        .mockResolvedValueOnce(mockUser);

      const user = await AuthService.restoreAuth();

      expect(apiService.setToken).toHaveBeenCalledWith('stored-token');
      expect(user).toEqual(mockUser);
    });

    it('should return null when no token is stored', async () => {
      (StorageService.getItem as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockUser);

      const user = await AuthService.restoreAuth();

      expect(apiService.setToken).not.toHaveBeenCalled();
      expect(user).toBeNull();
    });

    it('should return null when no user is stored', async () => {
      (StorageService.getItem as jest.Mock)
        .mockResolvedValueOnce('stored-token')
        .mockResolvedValueOnce(null);

      const user = await AuthService.restoreAuth();

      expect(apiService.setToken).not.toHaveBeenCalled();
      expect(user).toBeNull();
    });

    it('should return null when restore fails', async () => {
      (StorageService.getItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error'),
      );

      const user = await AuthService.restoreAuth();

      expect(user).toBeNull();
    });
  });
});

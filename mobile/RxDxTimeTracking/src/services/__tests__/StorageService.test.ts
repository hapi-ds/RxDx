import AsyncStorage from '@react-native-async-storage/async-storage';
import StorageService from '../StorageService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setItem', () => {
    it('should store a string value', async () => {
      const key = 'testKey';
      const value = 'testValue';

      await StorageService.setItem(key, value);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify(value),
      );
    });

    it('should store an object value', async () => {
      const key = 'userKey';
      const value = {id: '123', name: 'John Doe', email: 'john@example.com'};

      await StorageService.setItem(key, value);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify(value),
      );
    });

    it('should store an array value', async () => {
      const key = 'tasksKey';
      const value = [{id: '1', title: 'Task 1'}, {id: '2', title: 'Task 2'}];

      await StorageService.setItem(key, value);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        key,
        JSON.stringify(value),
      );
    });

    it('should throw error when storage fails', async () => {
      const key = 'testKey';
      const value = 'testValue';
      const error = new Error('Storage error');

      (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(error);

      await expect(StorageService.setItem(key, value)).rejects.toThrow(
        'Failed to store item',
      );
    });
  });

  describe('getItem', () => {
    it('should retrieve a string value', async () => {
      const key = 'testKey';
      const value = 'testValue';

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(value),
      );

      const result = await StorageService.getItem<string>(key);

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(key);
      expect(result).toBe(value);
    });

    it('should retrieve an object value', async () => {
      const key = 'userKey';
      const value = {id: '123', name: 'John Doe', email: 'john@example.com'};

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(value),
      );

      const result = await StorageService.getItem<typeof value>(key);

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(key);
      expect(result).toEqual(value);
    });

    it('should return null when key does not exist', async () => {
      const key = 'nonExistentKey';

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await StorageService.getItem<string>(key);

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(key);
      expect(result).toBeNull();
    });

    it('should throw error when retrieval fails', async () => {
      const key = 'testKey';
      const error = new Error('Retrieval error');

      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(error);

      await expect(StorageService.getItem<string>(key)).rejects.toThrow(
        'Failed to retrieve item',
      );
    });
  });

  describe('removeItem', () => {
    it('should remove an item', async () => {
      const key = 'testKey';

      await StorageService.removeItem(key);

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(key);
    });

    it('should throw error when removal fails', async () => {
      const key = 'testKey';
      const error = new Error('Removal error');

      (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(error);

      await expect(StorageService.removeItem(key)).rejects.toThrow(
        'Failed to remove item',
      );
    });
  });

  describe('clear', () => {
    it('should clear all storage', async () => {
      await StorageService.clear();

      expect(AsyncStorage.clear).toHaveBeenCalled();
    });

    it('should throw error when clear fails', async () => {
      const error = new Error('Clear error');

      (AsyncStorage.clear as jest.Mock).mockRejectedValueOnce(error);

      await expect(StorageService.clear()).rejects.toThrow(
        'Failed to clear storage',
      );
    });
  });

  describe('type safety', () => {
    it('should maintain type safety for complex objects', async () => {
      interface User {
        id: string;
        name: string;
        email: string;
        roles: string[];
      }

      const key = 'userKey';
      const user: User = {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
        roles: ['admin', 'user'],
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(user),
      );

      const result = await StorageService.getItem<User>(key);

      expect(result).toEqual(user);
      // TypeScript should enforce type safety at compile time
      if (result) {
        expect(result.id).toBe('123');
        expect(result.roles).toContain('admin');
      }
    });
  });
});

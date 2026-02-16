import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * StorageService provides a type-safe wrapper around AsyncStorage
 * for persisting data locally on the device.
 */
class StorageService {
  /**
   * Store a value in AsyncStorage with type safety
   * @param key - Storage key
   * @param value - Value to store (will be JSON stringified)
   */
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error(`Error storing item with key "${key}":`, error);
      throw new Error(`Failed to store item: ${error}`);
    }
  }

  /**
   * Retrieve a value from AsyncStorage with type safety
   * @param key - Storage key
   * @returns The stored value or null if not found
   */
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue === null) {
        return null;
      }
      return JSON.parse(jsonValue) as T;
    } catch (error) {
      console.error(`Error retrieving item with key "${key}":`, error);
      throw new Error(`Failed to retrieve item: ${error}`);
    }
  }

  /**
   * Remove a value from AsyncStorage
   * @param key - Storage key to remove
   */
  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing item with key "${key}":`, error);
      throw new Error(`Failed to remove item: ${error}`);
    }
  }

  /**
   * Clear all data from AsyncStorage
   * WARNING: This will remove all stored data
   */
  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
      throw new Error(`Failed to clear storage: ${error}`);
    }
  }
}

// Export a singleton instance
export default new StorageService();

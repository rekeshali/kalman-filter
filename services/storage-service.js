/**
 * LocalStorage abstraction with error handling
 * Provides safe persistence for application state
 */
class StorageService {
  /**
   * Save data to localStorage
   * @param {string} key - Storage key
   * @param {*} data - Data to store (will be JSON stringified)
   * @returns {boolean} Success status
   */
  static save(key, data) {
    try {
      const serialized = JSON.stringify(data);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error(`StorageService: Failed to save "${key}"`, error);
      return false;
    }
  }

  /**
   * Load data from localStorage
   * @param {string} key - Storage key
   * @returns {*|null} Parsed data or null if not found/error
   */
  static load(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`StorageService: Failed to load "${key}"`, error);
      return null;
    }
  }

  /**
   * Remove item from localStorage
   * @param {string} key - Storage key
   * @returns {boolean} Success status
   */
  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`StorageService: Failed to remove "${key}"`, error);
      return false;
    }
  }

  /**
   * Clear all localStorage
   */
  static clear() {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('StorageService: Failed to clear storage', error);
    }
  }

  /**
   * Check if a key exists in storage
   * @param {string} key - Storage key
   * @returns {boolean} True if key exists
   */
  static has(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error(`StorageService: Failed to check "${key}"`, error);
      return false;
    }
  }
}

// Export to global scope
window.StorageService = StorageService;

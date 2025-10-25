
const API_KEY_STORAGE_KEY = 'promptcraft-api-key';

/**
 * Retrieves the API key from local storage.
 * @returns {string} The stored API key, or an empty string if not found.
 */
export const getApiKey = (): string => {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  } catch (error) {
    console.error("Failed to retrieve API key from localStorage:", error);
    return '';
  }
};

/**
 * Saves the API key to local storage.
 * @param {string} key The API key to save.
 */
export const saveApiKey = (key: string): void => {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  } catch (error) {
    console.error("Failed to save API key to localStorage:", error);
  }
};

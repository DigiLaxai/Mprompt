
export interface HistoryItem {
  id: string;
  prompt: string;
  imageData: string; // base64 string
  timestamp: number;
}

const HISTORY_KEY = 'promptcraft-history';
const MAX_HISTORY_ITEMS = 50;

/**
 * Retrieves the generation history from local storage.
 * @returns {HistoryItem[]} An array of history items, sorted from newest to oldest.
 */
export const getHistory = (): HistoryItem[] => {
  try {
    const storedHistory = localStorage.getItem(HISTORY_KEY);
    if (storedHistory) {
      const parsed = JSON.parse(storedHistory) as HistoryItem[];
      // Sort by timestamp descending to ensure newest is always first
      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    }
    return [];
  } catch (error) {
    console.error("Failed to parse history from localStorage:", error);
    return [];
  }
};

/**
 * Adds a new item to the generation history.
 * @param {Omit<HistoryItem, 'id' | 'timestamp'>} newItem - The new item to add.
 * @returns {HistoryItem[]} The updated history array.
 */
export const addToHistory = (newItem: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem[] => {
  const newHistoryItem: HistoryItem = {
    ...newItem,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };

  const currentHistory = getHistory();
  
  const updatedHistory = [newHistoryItem, ...currentHistory].slice(0, MAX_HISTORY_ITEMS);

  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error("Failed to save history to localStorage:", error);
  }
  
  return updatedHistory;
};

/**
 * Clears the entire generation history from local storage.
 */
export const clearHistory = (): void => {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error("Failed to clear history from localStorage:", error);
  }
};

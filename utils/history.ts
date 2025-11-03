
export interface HistoryItem {
    id: number;
    uploadedImage: { data: string; mimeType: string; } | null;
    basePrompt: string;
    selectedStyle: string;
    selectedFraming: string;
    selectedLighting: string;
    generatedImage?: { data: string; mimeType: string; } | null;
}

const HISTORY_KEY = 'promptcraft-history';

export const getHistory = (): HistoryItem[] => {
    try {
        const storedHistory = localStorage.getItem(HISTORY_KEY);
        if (storedHistory) {
            return JSON.parse(storedHistory);
        }
    } catch (error) {
        console.error("Failed to parse history from localStorage", error);
        return [];
    }
    return [];
};

export const saveHistory = (history: HistoryItem[]): void => {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
        console.error("Failed to save history to localStorage", error);
    }
};

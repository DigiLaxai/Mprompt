
// This file now acts as a client to our own backend proxy.
// It no longer uses the @google/genai SDK directly.

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// No longer need ApiKeyNotFoundError as the key is handled by the backend.

const handleProxyError = async (response: Response) => {
    const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response.' }));
    const errorMessage = errorData.error || 'An unknown error occurred.';

    if (response.status === 429 || errorMessage.toLowerCase().includes('quota')) {
        throw new RateLimitError("You've exceeded the API's free tier limit. Please wait a moment and try again.");
    }
    
    throw new Error(errorMessage);
}


interface Image {
    data: string;
    mimeType: string;
}

export interface StructuredPrompt {
  subject: string;
  setting: string;
  style: string;
  lighting: string;
  colors: string;
  composition: string;
  mood: string;
}

const callProxy = async (body: object) => {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        await handleProxyError(response);
    }

    const data = await response.json();
    return data.result;
}


export const generatePromptFromImage = async (image: Image): Promise<StructuredPrompt> => {
    return callProxy({ action: 'generatePrompt', image });
}

export const generateImage = async (prompt: string, image: Image | null): Promise<string> => {
    return callProxy({ action: 'generateImage', prompt, image });
}

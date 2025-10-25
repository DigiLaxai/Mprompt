
// This file uses a backend proxy to securely communicate with the Google AI API.
// The API key is managed on the server, not in the client.

export interface StructuredPrompt {
  subject: string;
  setting: string;
  style: string;
  lighting: string;
  colors: string;
  composition: string;
  mood: string;
}

/**
 * A wrapper to call our backend API proxy.
 * @param action The specific AI action to perform ('generatePrompt' or 'generateImage').
 * @param body The payload for the action.
 * @returns The result from the AI model.
 */
const callApiProxy = async <T>(action: string, body: object): Promise<T> => {
    const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, ...body }),
    });

    const data = await response.json();

    if (!response.ok) {
        // The backend provides a specific error message in the 'error' property.
        throw new Error(data.error || 'An unknown error occurred while communicating with the server.');
    }

    return data.result;
};

/**
 * Calls the backend to generate a structured prompt from an image.
 * @param image The image data and MIME type.
 * @returns A promise that resolves to a StructuredPrompt object.
 */
export const generatePromptFromImage = async (image: { data: string; mimeType: string; }): Promise<StructuredPrompt> => {
    return callApiProxy('generatePrompt', { image });
};


/**
 * Calls the backend to generate an image from a prompt (and optionally, a source image).
 * @param prompt The text prompt for image generation.
 * @param image An optional source image for image-to-image tasks.
 * @returns A promise that resolves to the base64-encoded image data string.
 */
export const generateImage = async (prompt: string, image: { data: string; mimeType: string; } | null): Promise<string> => {
    return callApiProxy('generateImage', { prompt, image });
};

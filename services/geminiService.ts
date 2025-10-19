import { GoogleGenAI } from "@google/genai";

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyError';
  }
}

const getAiClient = (apiKey: string) => {
    if (!apiKey) {
        throw new ApiKeyError("API Key is missing. Please provide a valid API key.");
    }
    return new GoogleGenAI({ apiKey });
}

const handleApiError = (error: any) => {
    // The Gemini SDK throws errors that have a `message` property.
    // We can inspect this message to provide more specific feedback.
    if (error?.message) {
        const message = error.message.toLowerCase();
        if (message.includes('api key not valid') || message.includes('permission denied') || message.includes('api_key')) {
            throw new ApiKeyError('Your API Key is invalid or lacks permissions. Please check it and try again.');
        }
        if (message.includes('429') || message.includes('quota')) {
            throw new RateLimitError("The API's free tier has a per-minute request limit. Please wait 60 seconds and try again.");
        }
    }
    // For other errors, throw a generic message
    throw new Error(error?.message || 'An unknown error occurred with the Gemini API.');
}

const imagePromptingSystemInstruction = `You are an expert at analyzing images and creating descriptive prompts for AI image generation. Describe the provided image in vivid detail. Cover the main subject, the background/setting, the artistic style (e.g., photorealistic, illustration, painting), the lighting, the color palette, composition, and overall mood. The description must be a single, coherent paragraph suitable for use as a prompt for a text-to-image AI model. Do not add any preamble or explanation.`;

interface Image {
    data: string;
    mimeType: string;
}

export const generatePromptFromImage = async (image: Image, apiKey: string): Promise<string> => {
    try {
        const ai = getAiClient(apiKey);
        const contents = {
            parts: [{
                inlineData: {
                    data: image.data,
                    mimeType: image.mimeType,
                },
            },
            { text: "Describe this image for a text-to-image AI model." }
        ]};

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: imagePromptingSystemInstruction,
                temperature: 0.4,
            },
        });

        return response.text.trim();
    } catch (error) {
        handleApiError(error);
        return ""; // Should not be reached due to handleApiError throwing
    }
}

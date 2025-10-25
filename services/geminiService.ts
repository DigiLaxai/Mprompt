
import { GoogleGenAI, Modality } from "@google/genai";

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ApiKeyNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyNotFoundError';
  }
}

const handleApiError = (error: any) => {
    if (error?.message) {
        const message = error.message.toLowerCase();
        if (message.includes('api key not valid') || message.includes('permission denied') || message.includes('api_key') || message.includes('invalid') || message.includes('requested entity was not found')) {
            throw new ApiKeyNotFoundError('The provided API Key is invalid or missing required permissions.');
        }
        if (message.includes('429') || message.includes('quota')) {
            throw new RateLimitError("You've exceeded the API's free tier limit. Please wait a moment and try again.");
        }
    }
    throw new Error(error?.message || 'An unknown error occurred with the Gemini API.');
}

const imagePromptingSystemInstruction = `You are an expert at analyzing images and creating descriptive prompts for AI image generation. Describe the provided image in vivid detail. Cover the main subject, the background/setting, the artistic style (e.g., photorealistic, illustration, painting), the lighting, the color palette, composition, and overall mood. The description must be a single, coherent paragraph suitable for use as a prompt for a text-to-image AI model. Do not add any preamble or explanation.`;

interface Image {
    data: string;
    mimeType: string;
}

export const generatePromptFromImage = async (image: Image): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
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
            model: "gemini-2.5-flash-image",
            contents,
            config: {
                systemInstruction: imagePromptingSystemInstruction,
                temperature: 0.4,
            },
        });

        return response.text.trim();
    } catch (error) {
        handleApiError(error);
        return ""; // Should not be reached
    }
}

export const generateImage = async (prompt: string, image: Image | null): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // Build the parts array for the request. If an image is provided,
        // it's used as context for the text prompt.
        const parts: any[] = [];
        if (image) {
            parts.push({
                inlineData: {
                    data: image.data,
                    mimeType: image.mimeType,
                },
            });
        }
        parts.push({ text: prompt });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts,
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }

        throw new Error('No image data was found in the API response.');

    } catch (error) {
        handleApiError(error);
        return ""; // Should not be reached
    }
}

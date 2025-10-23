import { GoogleGenAI, Modality } from "@google/genai";

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

const handleApiError = (error: any) => {
    if (error instanceof ApiKeyError) {
        throw error;
    }
    if (error?.message) {
        const message = error.message.toLowerCase();
        if (message.includes('api key not valid') || message.includes('permission denied') || message.includes('api_key') || message.includes('requested entity was not found')) {
            throw new ApiKeyError('Your API Key is invalid or missing required permissions. Please select a new key.');
        }
        if (message.includes('429') || message.includes('quota')) {
            throw new RateLimitError("The API's free tier has a per-minute request limit. Please wait 60 seconds and try again.");
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
        return "";
    }
}

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: prompt }],
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
        return "";
    }
}

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

// --- DEVELOPER ACTION REQUIRED ---
// To make this app work for your clients, replace the placeholder below
// with your actual Google Gemini API key.
// IMPORTANT: This makes your API key visible in the client-side code.
// This is suitable for demos or internal tools, but for a public-facing
// application, it's recommended to use a backend proxy to secure your key.
const DEVELOPER_API_KEY = "PASTE_YOUR_GEMINI_API_KEY_HERE";


const getAiClient = () => {
    if (!DEVELOPER_API_KEY || DEVELOPER_API_KEY === "PASTE_YOUR_GEMINI_API_KEY_HERE") {
        // This error is for the developer, not the end-user.
        throw new ApiKeyError("Developer action required: Please open services/geminiService.ts and replace the placeholder API key with your own.");
    }
    return new GoogleGenAI({ apiKey: DEVELOPER_API_KEY });
}

const handleApiError = (error: any) => {
    if (error instanceof ApiKeyError) {
        throw error; // Re-throw the specific developer-facing error.
    }
    if (error?.message) {
        const message = error.message.toLowerCase();
        // This error is for the developer, as the user can't fix an invalid key.
        if (message.includes('api key not valid') || message.includes('permission denied') || message.includes('api_key')) {
            throw new ApiKeyError('The application\'s API Key is invalid or lacks permissions. Please check the key in services/geminiService.ts.');
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

export const generatePromptFromImage = async (image: Image): Promise<string> => {
    try {
        const ai = getAiClient();
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
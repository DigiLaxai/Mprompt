
import { GoogleGenAI, Type, Modality, GenerateContentResponse, Candidate, Part } from "@google/genai";

let ai: GoogleGenAI | null = null;

export class ApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiKeyError';
  }
}

export const initializeApi = (apiKey: string) => {
  if (!apiKey) {
    ai = null;
    return;
  }
  ai = new GoogleGenAI({ apiKey });
};

export const isApiInitialized = (): boolean => !!ai;

export interface StructuredPrompt {
  subject: string;
  setting: string;
  style: string;
  lighting: string;
  colors: string;
  composition: string;
  mood: string;
}

const imagePromptingSystemInstruction = `You are an expert at analyzing images and creating descriptive prompts for AI image generation. Analyze the provided image and describe it in vivid detail by filling out the JSON schema. Be descriptive and creative.`;

const promptSchema = {
    type: Type.OBJECT,
    properties: {
        subject: { type: Type.STRING, description: 'A detailed description of the main subject(s) of the image.' },
        setting: { type: Type.STRING, description: 'A description of the background, environment, or setting.' },
        style: { type: Type.STRING, description: 'The artistic style of the image (e.g., Photorealistic, Illustration, Anime, Oil Painting).' },
        lighting: { type: Type.STRING, description: 'A description of the lighting, such as "soft morning light" or "dramatic studio lighting".' },
        colors: { type: Type.STRING, description: 'A description of the color palette, such as "vibrant and saturated" or "monochromatic and muted".' },
        composition: { type: Type.STRING, description: 'A description of the composition, such as "centered close-up" or "wide-angle shot".' },
        mood: { type: Type.STRING, description: 'The overall mood or feeling of the image, such as "peaceful and serene" or "chaotic and energetic".' },
    },
    required: ['subject', 'setting', 'style', 'lighting', 'colors', 'composition', 'mood'],
};


function validateApiResponse(response: GenerateContentResponse): Candidate {
    const candidate = response.candidates?.[0];

    if (!candidate) {
        throw new Error('The AI model did not provide a valid response.');
    }

    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        let errorMessage = `The model stopped generating for the following reason: ${candidate.finishReason}.`;
        
        if (candidate.finishReason === 'SAFETY' && candidate.safetyRatings?.length) {
            const blockedCategories = candidate.safetyRatings
                .map(rating => rating.category.replace('HARM_CATEGORY_', ''))
                .join(', ');
            
            errorMessage = `Your request was blocked for safety reasons related to: ${blockedCategories}. Please adjust your input.`;
        }
        
        throw new Error(errorMessage);
    }

    if (!candidate.content?.parts?.length) {
        throw new Error('The AI model returned an empty response, which may be due to content safety policies or an internal error.');
    }

    return candidate;
}

const handleApiError = (error: any): never => {
    console.error("Gemini API Error:", error);
    if (error.message?.includes('API key not valid')) {
        throw new ApiKeyError('Your API key is invalid. Please check it and try again.');
    }
    if (error.message?.toLowerCase().includes('quota') || error.message?.includes('429')) {
         throw new Error("You've exceeded the API's free tier limit. Please wait a moment and try again or check your billing status.");
    }
    throw new Error(error.message || 'An unknown error occurred while communicating with the AI service.');
};


export const generatePromptFromImage = async (image: { data: string; mimeType: string; }): Promise<StructuredPrompt> => {
    if (!ai) throw new ApiKeyError('API is not initialized. Please provide your Google AI API key.');

    try {
        const contents = {
            parts: [{
                inlineData: { data: image.data, mimeType: image.mimeType },
            }, { 
                text: "Describe this image for a text-to-image AI model." 
            }]
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: imagePromptingSystemInstruction,
                temperature: 0.5,
                responseMimeType: "application/json",
                responseSchema: promptSchema,
            },
        });
        
        const candidate = validateApiResponse(response);
        const text = candidate.content.parts[0]?.text;

        if (!text) {
            throw new Error('The AI model returned an empty text response.');
        }

        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse JSON response from AI:", text);
            throw new Error(`The AI returned a response that was not in the expected format. The model said: "${text}"`);
        }
    } catch (error) {
        handleApiError(error);
    }
};

export const generateImage = async (prompt: string, image: { data: string; mimeType: string; } | null): Promise<string> => {
    if (!ai) throw new ApiKeyError('API is not initialized. Please provide your Google AI API key.');
    
    try {
        const parts: Part[] = [];
        if (image) {
            parts.push({
                inlineData: { data: image.data, mimeType: image.mimeType },
            });
        }
        parts.push({ text: prompt });
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        const candidate = validateApiResponse(response);
        
        for (const part of candidate.content.parts) {
            if (part.inlineData?.data) {
                return part.inlineData.data;
            }
        }
        
        const textExplanation = candidate.content.parts.find(p => p.text)?.text;
        if (textExplanation) {
             throw new Error(`The model did not return an image. It responded with: "${textExplanation}"`);
        }

        throw new Error('No image data was found in the API response. The response may have been blocked or empty.');
    } catch (error) {
        handleApiError(error);
    }
};


import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";

export interface GeneratedPrompt {
  prompt: string;
  style: string;
}

const imagePromptingSystemInstruction = `You are an expert at analyzing images and creating a single, descriptive prompt for AI image generation. Also identify the primary artistic style. Fill out the JSON schema. The prompt should be a detailed, comma-separated descriptive string for an image generation model, based on the image. It should describe the subject, setting, composition, lighting, colors, and mood, but should NOT include an artistic style phrase like "in the style of...".`;

const inspirationSystemInstruction = `You are a creative assistant for an AI artist. Your task is to look at an image and generate three distinct, creative, and inspiring prompts for a text-to-image model. Each prompt should offer a unique artistic direction, re-imagining the image's subject in a different style, context, or mood. The prompts should be concise but evocative. Return the three prompts as a JSON object with a key 'prompts' containing an array of strings.`;

const promptSchema = {
    type: Type.OBJECT,
    properties: {
        prompt: { type: Type.STRING, description: 'A detailed, comma-separated descriptive prompt for an image generation model, based on the image. This should describe the subject, setting, composition, lighting, colors, and mood, but should NOT include an artistic style phrase like "in the style of...".' },
        style: { type: Type.STRING, description: 'The primary artistic style of the image (e.g., Photorealistic, Illustration, Anime, Oil Painting, Pixel Art). If none apply, describe the style briefly.' },
    },
    required: ['prompt', 'style'],
};

const inspirationSchema = {
    type: Type.OBJECT,
    properties: {
        prompts: {
            type: Type.ARRAY,
            description: "An array of three distinct, creative prompts.",
            items: { type: Type.STRING },
        },
    },
    required: ['prompts'],
};

const processApiError = (error: any): Error => {
  let message = 'An unexpected error occurred. Please try again.';
  if (error instanceof Error) {
    const lowerCaseMessage = error.message.toLowerCase();
    if (lowerCaseMessage.includes('api key not valid') || lowerCaseMessage.includes('permission denied')) {
      message = 'Your API key is invalid or lacks permissions. Please check your key and try again.';
    } else if (lowerCaseMessage.includes('api key must be set')) {
      message = 'Your API key is not set. Please add it in the settings.';
    } else if (lowerCaseMessage.includes('quota')) {
      message = 'You have exceeded your API quota. Please check your Google AI Studio account for details.';
    } else if (lowerCaseMessage.includes('network') || lowerCaseMessage.includes('failed to fetch')) {
      message = 'A network error occurred. Please check your internet connection and try again.';
    } else {
      message = error.message;
    }
  }
  return new Error(message);
};

function validateResponse(response: GenerateContentResponse) {
    if (!response.candidates?.length) {
        throw new Error('The model did not provide a valid response. This may be due to the safety policy.');
    }
    const candidate = response.candidates[0];

    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        let errorMessage = `The model stopped generating for an unexpected reason: ${candidate.finishReason}.`;
        switch (candidate.finishReason) {
            case 'SAFETY':
                const blockedCategories = candidate.safetyRatings?.filter(r => r.blocked).map(rating => rating.category.replace('HARM_CATEGORY_', '')).join(', ') || 'unspecified safety concerns';
                errorMessage = `Your request was blocked for safety reasons related to: ${blockedCategories}. Please adjust your input.`;
                break;
            case 'RECITATION':
                errorMessage = `The response was blocked because it contained content that was too similar to a source. Please try a different prompt.`;
                break;
            case 'MAX_TOKENS':
                errorMessage = `The response was cut off because it reached the maximum length. Try a more concise prompt.`;
                break;
            default:
                errorMessage = `The generation failed due to an unhandled reason: ${candidate.finishReason}.`;
                break;
        }
        throw new Error(errorMessage);
    }

    if (!candidate.content?.parts?.length) {
        throw new Error('The model returned an empty response. This might be due to a content filter.');
    }
}

export const generatePromptFromImage = async (image: { data: string; mimeType: string; }, apiKey: string): Promise<GeneratedPrompt> => {
    if (!apiKey) throw new Error('API Key not found. Please set your API key in the settings.');
    try {
        const ai = new GoogleGenAI({ apiKey });
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

        validateResponse(response);
        const text = response.text;
        
        if (!text) {
            throw new Error('The AI model returned an empty text response.');
        }
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse JSON response from AI:", text);
            throw new Error(`The AI returned a response that was not in the expected format.`);
        }
    } catch (error: any) {
        console.error("Gemini API Error (generatePromptFromImage):", error);
        throw processApiError(error);
    }
};

export const generateInspirationFromImage = async (image: { data: string; mimeType: string; }, apiKey: string): Promise<string[]> => {
    if (!apiKey) throw new Error('API Key not found. Please set your API key in the settings.');
    try {
        const ai = new GoogleGenAI({ apiKey });
        const contents = {
            parts: [{
                inlineData: { data: image.data, mimeType: image.mimeType },
            }, { 
                text: "Give me three creative prompts based on this image." 
            }]
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction: inspirationSystemInstruction,
                temperature: 0.8,
                responseMimeType: "application/json",
                responseSchema: inspirationSchema,
            },
        });
        
        validateResponse(response);
        const text = response.text;

        if (!text) {
            throw new Error('The AI model returned an empty text response.');
        }
        
        try {
            const result = JSON.parse(text);
            if (Array.isArray(result.prompts) && result.prompts.length > 0) {
                return result.prompts;
            }
            throw new Error("The AI returned an invalid format for inspiration prompts.");
        } catch (e) {
            console.error("Failed to parse JSON response from AI:", text);
            throw new Error(`The AI returned a response that was not in the expected format.`);
        }
    } catch (error: any) {
        console.error("Gemini API Error (generateInspirationFromImage):", error);
        throw processApiError(error);
    }
};

export const generateImage = async (prompt: string, image: { data: string; mimeType: string; } | null, apiKey: string): Promise<string> => {
    if (!apiKey) throw new Error('API Key not found. Please set your API key in the settings.');
    try {
        const ai = new GoogleGenAI({ apiKey });
        const parts: any[] = [];
        let finalPrompt = prompt;

        if (image) {
            parts.push({
                inlineData: { data: image.data, mimeType: image.mimeType },
            });
            // A more general instruction for image editing
            finalPrompt = `Using the provided image as a base, generate a new image that incorporates the following changes or description: ${prompt}`;
        }
        parts.push({ text: finalPrompt });


        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        validateResponse(response);
        const candidate = response.candidates![0];
        
        for (const part of candidate.content.parts) {
            if (part.inlineData?.data) {
                return part.inlineData.data;
            }
        }
        
        const textExplanation = candidate.content.parts.find((p: any) => p.text)?.text;
        if (textExplanation) {
             throw new Error(`The model did not return an image. It responded with: "${textExplanation}"`);
        }
        
        throw new Error('No image data was found in the API response. The response may have been blocked or empty.');
    } catch (error: any) {
        console.error("Gemini API Error (generateImage):", error);
        throw processApiError(error);
    }
};

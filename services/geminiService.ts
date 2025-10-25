
import { GoogleGenAI, Modality, Type, GenerateContentResponse } from "@google/genai";

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

function validateApiResponse(response: GenerateContentResponse) {
    const candidate = response.candidates?.[0];

    if (!candidate) {
        throw new Error('The AI model did not provide a valid response.');
    }

    if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        let errorMessage = `The model stopped generating for the following reason: ${candidate.finishReason}.`;
        if (candidate.finishReason === 'SAFETY' && candidate.safetyRatings?.length) {
            const blockedCategories = candidate.safetyRatings.map(rating => rating.category.replace('HARM_CATEGORY_', '')).join(', ');
            errorMessage = `Your request was blocked for safety reasons related to: ${blockedCategories}. Please adjust your input.`;
        }
        throw new Error(errorMessage);
    }

    if (!candidate.content?.parts?.length) {
        throw new Error('The AI model returned an empty response.');
    }

    return candidate;
}

const getAiClient = (apiKey: string) => {
    if (!apiKey) {
        throw new Error('API key must be set. Please add your Gemini API key in the settings menu.');
    }
    return new GoogleGenAI({ apiKey });
};


export const generatePromptFromImage = async (apiKey: string, image: { data: string; mimeType: string; }): Promise<StructuredPrompt> => {
    try {
        const ai = getAiClient(apiKey);
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
            throw new Error(`The AI returned a response that was not in the expected format.`);
        }
    } catch (error: any) {
        console.error("Gemini API Error (generatePromptFromImage):", error);
        if (error.message.includes('API key not valid')) {
            throw new Error('Your API key is not valid. Please check it in the settings.');
        }
        throw new Error(error.message || 'An unexpected error occurred while generating the prompt.');
    }
};

export const generateImage = async (apiKey: string, prompt: string, image: { data: string; mimeType: string; } | null): Promise<string> => {
    try {
        const ai = getAiClient(apiKey);
        const parts: any[] = [];
        let finalPrompt = prompt;

        if (image) {
            parts.push({
                inlineData: { data: image.data, mimeType: image.mimeType },
            });
            // Add a specific instruction to preserve the face from the original image
            finalPrompt = `Based on the provided image, create a new version that matches this description. It is crucial to preserve the exact likeness and facial features of any person in the original image. Description: ${prompt}`;
        }
        parts.push({ text: finalPrompt });


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
        
        const textExplanation = candidate.content.parts.find((p: any) => p.text)?.text;
        if (textExplanation) {
             throw new Error(`The model did not return an image. It responded with: "${textExplanation}"`);
        }
        
        throw new Error('No image data was found in the API response. The response may have been blocked or empty.');
    } catch (error: any) {
        console.error("Gemini API Error (generateImage):", error);
        if (error.message.includes('API key not valid')) {
            throw new Error('Your API key is not valid. Please check it in the settings.');
        }
        throw new Error(error.message || 'An unexpected error occurred while generating the image.');
    }
};

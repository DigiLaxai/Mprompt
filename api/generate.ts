
import { GoogleGenAI, Modality, Type, GenerateContentResponse, Candidate } from "@google/genai";

// This is a Vercel Serverless Function acting as a backend proxy.

const imagePromptingSystemInstruction = `You are an expert at analyzing images and creating descriptive prompts for AI image generation. Analyze the provided image and describe it in vivid detail by filling out the JSON schema. Be descriptive and creative.`;

const promptSchema = {
    type: Type.OBJECT,
    properties: {
        subject: {
            type: Type.STRING,
            description: 'A detailed description of the main subject(s) of the image.',
        },
        setting: {
            type: Type.STRING,
            description: 'A description of the background, environment, or setting.',
        },
        style: {
            type: Type.STRING,
            description: 'The artistic style of the image (e.g., Photorealistic, Illustration, Anime, Oil Painting).',
        },
        lighting: {
            type: Type.STRING,
            description: 'A description of the lighting, such as "soft morning light" or "dramatic studio lighting".',
        },
        colors: {
            type: Type.STRING,
            description: 'A description of the color palette, such as "vibrant and saturated" or "monochromatic and muted".',
        },
        composition: {
            type: Type.STRING,
            description: 'A description of the composition, such as "centered close-up" or "wide-angle shot".',
        },
        mood: {
            type: Type.STRING,
            description: 'The overall mood or feeling of the image, such as "peaceful and serene" or "chaotic and energetic".',
        },
    },
    required: ['subject', 'setting', 'style', 'lighting', 'colors', 'composition', 'mood'],
};


interface Image {
    data: string;
    mimeType: string;
}

/**
 * Validates the response from the Gemini API.
 * Throws an error if the response is invalid, blocked, or empty.
 * @param response - The GenerateContentResponse from the API.
 * @returns The first valid Candidate from the response.
 */
function validateApiResponse(response: GenerateContentResponse): Candidate {
    const candidate = response.candidates?.[0];

    if (!candidate) {
        throw new Error('The AI model did not provide a valid response. This could be due to a network issue or an internal model error.');
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

// Vercel exports a handler function for serverless execution.
// Note: Vercel's hobby tier might not support TypeScript type annotations for req/res. Using 'any' for broader compatibility.
export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    if (!process.env.API_KEY) {
        return res.status(500).json({ error: 'API key is not configured on the server.' });
    }

    try {
        const { action, image, prompt } = req.body;

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        if (action === 'generatePrompt') {
            if (!image) {
                return res.status(400).json({ error: 'Image data is required to generate a prompt.' });
            }

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
                return res.status(200).json({ result: JSON.parse(text) });
            } catch (e) {
                console.error("Failed to parse JSON response from AI:", text);
                throw new Error(`The AI returned a response that was not in the expected format. The model said: "${text}"`);
            }

        } else if (action === 'generateImage') {
            if (!prompt) {
                return res.status(400).json({ error: 'A prompt is required to generate an image.' });
            }

            const parts: any[] = [];
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
                    return res.status(200).json({ result: part.inlineData.data });
                }
            }
            
            const textExplanation = candidate.content.parts.find(p => p.text)?.text;
            if (textExplanation) {
                 throw new Error(`The model did not return an image. It responded with: "${textExplanation}"`);
            }
            
            throw new Error('No image data was found in the API response. The response may have been blocked or empty.');

        } else {
            return res.status(400).json({ error: 'Invalid action specified.' });
        }

    } catch (error: any) {
        console.error("Error in API proxy:", error);
        // A more generic error message is safer for the client.
        res.status(500).json({ error: error.message || 'An internal server error occurred while communicating with the AI service.' });
    }
}

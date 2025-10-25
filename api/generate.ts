
import { GoogleGenAI, Modality, Type } from "@google/genai";

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

            const firstCandidate = response.candidates?.[0];
            if (!firstCandidate) {
                 throw new Error('The AI model did not provide a response. This might be due to a network issue or an internal error.');
            }
            if (firstCandidate.finishReason && firstCandidate.finishReason !== 'STOP') {
                throw new Error(`Prompt generation failed. Reason: ${firstCandidate.finishReason}. Please check your input image for any policy violations.`);
            }

            const text = response.text;
            if (!text) {
                throw new Error('The AI model returned an empty response.');
            }
            
            try {
                return res.status(200).json({ result: JSON.parse(text) });
            } catch (e) {
                console.error("Failed to parse JSON response from AI:", text);
                throw new Error("The AI returned a response that was not in the expected format.");
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

            const firstCandidate = response.candidates?.[0];
            if (!firstCandidate) {
                throw new Error('The AI model did not provide a response. This might be due to a network issue or an internal error.');
            }

            if (firstCandidate.finishReason && firstCandidate.finishReason !== 'STOP') {
                throw new Error(`Image generation failed. Reason: ${firstCandidate.finishReason}. Please check your prompt for any policy violations.`);
            }

            if (firstCandidate.content?.parts) {
                for (const part of firstCandidate.content.parts) {
                    if (part.inlineData?.data) {
                        return res.status(200).json({ result: part.inlineData.data });
                    }
                }
            }
            
            const textExplanation = firstCandidate.content?.parts?.find(p => p.text)?.text;
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

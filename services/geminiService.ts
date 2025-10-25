import { GoogleGenAI, Modality } from "@google/genai";

// Creates a new GoogleGenAI instance for each call.
// This is crucial for ensuring the latest API key from the selection dialog is used.
const getAIClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY! });
};

const imagePromptingSystemInstruction = `You are an expert at analyzing images and creating descriptive prompts for AI image generation. Describe the provided image in vivid detail. Cover the main subject, the background/setting, the artistic style (e.g., photorealistic, illustration, painting), the lighting, the color palette, composition, and overall mood. The description must be a single, coherent paragraph suitable for use as a prompt for a text-to-image AI model. Do not add any preamble or explanation.`;

interface Image {
    data: string;
    mimeType: string;
}

export const generatePromptFromImage = async (image: Image): Promise<string> => {
    const ai = getAIClient();
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
}

export const generateImageFromPrompt = async (prompt: string): Promise<{ data: string; mimeType: string; }> => {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: prompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
    if (imagePart && imagePart.inlineData) {
        return {
            data: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType,
        };
    }

    throw new Error('Image generation failed or no image was returned from the API.');
}
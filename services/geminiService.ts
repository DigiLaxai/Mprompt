import { GoogleGenAI, Modality } from "@google/genai";

const getAIClient = (apiKey: string) => {
    return new GoogleGenAI({ apiKey });
};

const imagePromptingSystemInstruction = `You are an expert at analyzing images to create descriptive, editable prompts for AI image generation. Your goal is to create a prompt that allows a user to easily change the setting while keeping the main subject consistent. Describe the main subject (person or character) in detail first, then describe the background/setting. The description should be a single, coherent paragraph. For example: "A photorealistic portrait of a woman with curly red hair, smiling, wearing a black leather jacket, standing on a busy street in New York City at dusk." Do not add any preamble or explanation.`;

interface Image {
    data: string;
    mimeType: string;
}

export const generatePromptFromImage = async (image: Image, apiKey: string): Promise<string> => {
    if (!apiKey) throw new Error("API Key is not configured.");
    const ai = getAIClient(apiKey);
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

export const generateImageFromPrompt = async (prompt: string, originalImage: Image, apiKey: string): Promise<{ data: string; mimeType: string; }> => {
    if (!apiKey) throw new Error("API Key is not configured.");
    const ai = getAIClient(apiKey);

    // Add a prefix to guide the model for better character consistency.
    const finalPrompt = `Using the person from the provided reference image as the main subject, create a new image based on this description: "${prompt}"`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                {
                    inlineData: {
                        data: originalImage.data,
                        mimeType: originalImage.mimeType,
                    },
                },
                { text: finalPrompt }
            ],
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
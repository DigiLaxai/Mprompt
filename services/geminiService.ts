
import { GoogleGenAI, Modality } from "@google/genai";

const getAIClient = (apiKey: string) => {
    return new GoogleGenAI({ apiKey });
};

const imagePromptingSystemInstruction = `You are an expert at analyzing images and creating highly detailed, descriptive prompts for AI image generation. Your goal is to capture every possible detail from the image, including the subject's appearance, clothing, expression, pose, the background, lighting, and overall mood. The more detailed the prompt, the better. The description should be a single, coherent paragraph. Do not add any preamble or explanation.`;

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
import { GoogleGenAI, Modality, Type } from "@google/genai";

const getAIClient = (apiKey: string) => {
    return new GoogleGenAI({ apiKey });
};

const imagePromptingSystemInstruction = `You are an expert at analyzing images and creating highly detailed, descriptive prompts for AI image generation. Your goal is to capture the essence of the image and express it in three distinct, creative variations.
1.  **Descriptive:** A straightforward, detailed description of the scene, subjects, and lighting.
2.  **Evocative:** A more artistic and moody description, focusing on the feeling and atmosphere.
3.  **Narrative:** A prompt that suggests a story or action taking place.
Provide the output as a JSON array of strings, with exactly three strings corresponding to these variations. Do not add any preamble, explanation, or markdown formatting like \`\`\`json. The output should be a raw JSON array.`;

interface Image {
    data: string;
    mimeType: string;
}

export const generatePromptVariationsFromImage = async (image: Image, apiKey: string): Promise<string[]> => {
    if (!apiKey) throw new Error("API Key is not configured.");
    const ai = getAIClient(apiKey);
    const contents = {
        parts: [{
            inlineData: {
                data: image.data,
                mimeType: image.mimeType,
            },
        },
        { text: "Describe this image for a text-to-image AI model, providing three creative variations." }
    ]};

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
            systemInstruction: imagePromptingSystemInstruction,
            temperature: 0.6,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                description: "A list of three distinct creative prompt variations.",
                items: {
                    type: Type.STRING,
                    description: "A single prompt variation."
                }
            }
        },
    });

    try {
        const prompts = JSON.parse(response.text);
        if (Array.isArray(prompts) && prompts.length > 0 && prompts.every(p => typeof p === 'string')) {
            return prompts;
        }
        throw new Error("Invalid response format from API.");
    } catch (e) {
        console.error("Failed to parse prompt variations:", response.text, e);
        return [response.text.trim()];
    }
}

export const generateImageFromPrompt = async (prompt: string, originalImage: Image, apiKey: string): Promise<{ data: string; mimeType: string; }> => {
    if (!apiKey) throw new Error("API Key is not configured.");
    const ai = getAIClient(apiKey);

    // Enhanced prompt to guide the model for better quality, style, and face recognition.
    const finalPrompt = `Your task is to create a new image based on the provided reference image and text description. It is crucial to maintain the exact facial features, likeness, and identity of the person from the reference image. The final image should be a masterpiece with a glossy finish, ultra-high detail, 4K resolution quality, featuring photorealistic skin and hair detail beautifully blended with stylized airbrush shading. Create an image based on this description: "${prompt}"`;

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

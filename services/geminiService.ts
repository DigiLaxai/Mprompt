
import { GoogleGenAI, Modality, Type } from "@google/genai";

let customApiKey: string | null = null;

/**
 * Allows setting the API key dynamically from the application.
 * @param key The Google AI API key.
 */
export const setGeminiApiKey = (key: string) => {
    customApiKey = key;
};

const getAIClient = () => {
    // Priority: 1. Custom key set from UI, 2. Environment variable.
    const apiKey = customApiKey || process.env.API_KEY;

    if (!apiKey) {
        // This should not be hit if the UI logic is correct, but it's a good safeguard.
        throw new Error("API key not found. Please set your API key.");
    }
    
    return new GoogleGenAI({ apiKey });
};

interface Image {
    data: string;
    mimeType: string;
}

interface AnalyzedPrompt {
    characterDescription: string;
    sceneDescription: string;
}

const analysisSystemInstruction = `You are an expert image analyst for an AI image generation prompt builder. Analyze the user's image and break it down into two key components.
1.  **characterDescription**: A detailed, neutral description of the main person or character. Focus on stable physical attributes like facial features (eye color, nose shape, face shape), hair color and style, and any unique, permanent identifiers like scars or tattoos. Avoid describing clothing, expression, or setting, as these are transient. The description should be concise and act as a 'character sheet' for an AI image generator to recreate the person consistently.
2.  **sceneDescription**: A description of the character's action, the environment, background, and overall setting. Describe what the character is doing.

Return the result as a single JSON object with keys "characterDescription" and "sceneDescription". Do not add any preamble, explanation, or markdown formatting. Only return the raw JSON object.`;


export const analyzeImageForPrompt = async (image: Image): Promise<AnalyzedPrompt> => {
    const ai = getAIClient();
    const contents = {
        parts: [{
            inlineData: {
                data: image.data,
                mimeType: image.mimeType,
            },
        },
        { text: "Analyze this image and generate a character and scene description as a JSON object." }
    ]};

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
            systemInstruction: analysisSystemInstruction,
            temperature: 0.3,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    characterDescription: { type: Type.STRING },
                    sceneDescription: { type: Type.STRING }
                },
                required: ["characterDescription", "sceneDescription"]
            }
        },
    });

    try {
        const jsonText = response.text.trim();
        const result = JSON.parse(jsonText);
        if (result.characterDescription && result.sceneDescription) {
            return result;
        }
        throw new Error("Invalid format for analyzed prompt components.");
    } catch (e) {
        console.error("Failed to parse analyzed prompt JSON:", e);
        throw new Error("Could not understand the response from the AI. Please try again.");
    }
}

export const generateImageFromPrompt = async (prompt: string, originalImage: Image): Promise<{ data: string; mimeType: string; }> => {
    const ai = getAIClient();

    const finalPrompt = `Your task is to create a new image based on the provided reference image and text description. Use the reference image primarily to understand the character's base facial structure and identity, but strictly follow the text description for all details, including any modifications to appearance (like hair color), clothing, and scene. The final image should be a high-quality, detailed, and visually appealing artwork. Create an image based on this description: "${prompt}"`;

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

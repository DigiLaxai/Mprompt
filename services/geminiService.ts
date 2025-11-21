
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
1.  **characterDescription**: A detailed, neutral description of the main person or character. Focus ONLY on stable physical attributes: facial features (eye color, nose shape, face shape, skin tone), hair color and style, age, and body type. CRITICAL: Do NOT describe clothing, accessories, pose, expression, or background. This must describe ONLY the person's permanent identity.
2.  **sceneDescription**: A comprehensive description of the character's current clothing, their action/pose, the environment, background, lighting, and overall setting.

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

export const generateImageFromPrompt = async (
    prompt: string, 
    originalImage: Image,
    numberOfImages: number,
): Promise<{ data: string; mimeType: string; }[]> => {
    const ai = getAIClient();

    // Stronger instruction to override image context
    const finalPrompt = `INSTRUCTIONS:
1. REFERENCE IMAGE: Use the provided image ONLY as a reference for the character's facial features and physical identity. IGNORE the clothing, background, pose, and style in the reference image.
2. TEXT PROMPT: "${prompt}"
3. GOAL: Generate a new image of the character from the reference image, but strictly following the scene, clothing, action, and style described in the TEXT PROMPT. 
   - If the text describes different clothes, the character MUST wear the new clothes.
   - If the text describes a different setting, the background MUST change.
   - The output must be a high-quality, detailed artwork matching the text description.`;

    const imagePromises = [];
    for (let i = 0; i < numberOfImages; i++) {
        imagePromises.push(ai.models.generateContent({
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
        }));
    }

    const responses = await Promise.all(imagePromises);

    const images = responses.map(response => {
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
        if (imagePart && imagePart.inlineData) {
            return {
                data: imagePart.inlineData.data,
                mimeType: imagePart.inlineData.mimeType,
            };
        }
        throw new Error('Image generation failed for one of the images.');
    });

    if (images.length !== numberOfImages) {
      throw new Error('Image generation failed or not all images were returned from the API.');
    }
    
    return images;
}

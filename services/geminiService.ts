
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

const analysisSystemInstruction = `You are an expert image analyst. Your task is to extract a physical description of the person in the image, STRICTLY separating their permanent physical identity from their temporary context.

1.  **characterDescription**: Describe ONLY the person's permanent physical traits: facial features, skin tone, eye color, hair color/texture, age, body shape, and ethnicity.
    *   **CRITICAL NEGATIVE CONSTRAINT**: Do NOT describe their clothing, hat, glasses (unless prescription), pose, facial expression, background, or lighting.
    *   Example: "A young woman with olive skin, almond-shaped brown eyes, and long wavy black hair."

2.  **sceneDescription**: Describe the *current* context: clothing, accessories, pose, action, background, environment, lighting, and artistic style.
    *   Example: "Wearing a red hoodie, standing in a crowded cyberpunk street, neon lighting, rain."

Return the result as a raw JSON object with keys "characterDescription" and "sceneDescription".`;


export const analyzeImageForPrompt = async (image: Image): Promise<AnalyzedPrompt> => {
    const ai = getAIClient();
    const contents = {
        parts: [{
            inlineData: {
                data: image.data,
                mimeType: image.mimeType,
            },
        },
        { text: "Analyze this image and return the JSON object." }
    ]};

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
            systemInstruction: analysisSystemInstruction,
            temperature: 0.1, // Lower temperature for more factual extraction
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

export interface PromptComponents {
    character: string;
    scene: string;
    style: string;
}

export const generateImageFromPrompt = async (
    components: PromptComponents,
    originalImage: Image,
    numberOfImages: number,
): Promise<{ data: string; mimeType: string; }[]> => {
    const ai = getAIClient();

    // Construct a structured prompt that strictly separates identity (image) from context (text).
    const finalPrompt = `
    TASK: Generate a new image based on the provided REFERENCE IMAGE and the text descriptions below.

    [1. REFERENCE IMAGE INSTRUCTIONS]
    - **ROLE**: The reference image defines the **PERMANENT IDENTITY** (Face, Hair, Skin, Body Structure) of the character.
    - **ACTION**: You MUST preserve the facial likeness and physical identity of the person in the reference image.
    - **NEGATIVE CONSTRAINT**: IGNORE the clothing, background, pose, expression, and lighting of the reference image.

    [2. NEW CONTENT SPECIFICATIONS]
    - **SCENE, CLOTHING & ACTION**: "${components.scene}"
      (This is the **ABSOLUTE AUTHORITY** for the character's outfit, pose, and environment. It OVERRIDES the reference image.)
    
    - **CHARACTER TRAITS**: "${components.character}"
      (Use this to reinforce the identity features found in the reference image.)

    - **ARTISTIC STYLE**: "${components.style}"

    [3. GENERATION GOAL]
    - Create a seamless integration of the *identity* from the Reference Image into the *scene/clothing* defined in the Text.
    - If the text says "wearing a space suit", the character MUST be wearing a space suit, even if the reference image is wearing a t-shirt.
    `;

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
                // aspect ratio could be added here if we had a control for it, defaulting to 1:1 for now
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

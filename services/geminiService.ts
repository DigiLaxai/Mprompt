
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

// System instruction for the Analysis step
const analysisSystemInstruction = `You are an expert image analyst. Your task is to extract a physical description of the person in the image, STRICTLY separating their permanent physical identity from their temporary context.

1.  **characterDescription**: Describe ONLY the person's permanent physical traits: facial features, skin tone, eye color, hair color/texture, age, body shape, and ethnicity.
    *   **CRITICAL**: Do NOT describe their clothing, hat, glasses (unless prescription), pose, facial expression, background, or lighting. Focus ONLY on the biological features.
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
            temperature: 0.1, 
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
    preserveFace: boolean,
): Promise<{ data: string; mimeType: string; }[]> => {
    const ai = getAIClient();
    let contents;

    if (preserveFace) {
        // We structure the prompt to explicitly tell the model that the IMAGE is for identity
        // and the TEXT is for the scene/clothing.
        const finalPrompt = `
        You are a professional digital artist executing a "Costume and Set Change".

        SOURCE MATERIAL:
        1. Reference Image (Attached): Use this STRICTLY for the person's face, hair, and body type (Identity).
        2. Instructions (Text Below): Use this STRICTLY for the clothing, background, and action (Context).

        TASK:
        Generate a NEW image of the person from the Reference Image, but place them in the following context:
        
        [NEW SCENE & OUTFIT]
        "${components.scene}"

        [CHARACTER IDENTITY]
        (Maintain these traits from the image): "${components.character}"

        [ARTISTIC STYLE]
        ${components.style}

        CRITICAL RULES:
        1. **IGNORE THE ORIGINAL CLOTHES**: If the reference image has a suit, but the text says "t-shirt", you MUST generate a t-shirt.
        2. **IGNORE THE ORIGINAL BACKGROUND**: Do not reproduce the background from the reference image.
        3. **PRIORITY**: The Text Description overrides the Reference Image for all non-facial details.
        `;

        contents = {
            parts: [
                // Image first establishes the subject
                {
                    inlineData: {
                        data: originalImage.data,
                        mimeType: originalImage.mimeType,
                    },
                },
                // Text second provides the directive for transformation
                { text: finalPrompt },
            ],
        };
    } else {
        // PURE TEXT GENERATION MODE
        // We do not send the image, forcing the model to generate a new face based purely on the description.
        const finalPrompt = `
        You are a professional digital artist.

        TASK:
        Generate an image based on the following description:

        [SCENE & OUTFIT]
        "${components.scene}"

        [CHARACTER DESCRIPTION]
        "${components.character}"

        [ARTISTIC STYLE]
        ${components.style}
        `;

        contents = {
            parts: [{ text: finalPrompt }],
        };
    }

    const imagePromises = [];
    for (let i = 0; i < numberOfImages; i++) {
        imagePromises.push(ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: contents,
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

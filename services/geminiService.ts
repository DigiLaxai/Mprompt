
import { GoogleGenAI, Modality, Type } from "@google/genai";

const getAIClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const variationsSystemInstruction = `You are an expert prompt writer for AI image generation models. Analyze the user's image and generate three distinct and creative prompt variations. Return these variations as a JSON array of strings.
1.  **Descriptive:** A straightforward, detailed description of the image, focusing on subjects, setting, colors, and lighting.
2.  **Evocative:** A more artistic and emotional prompt that captures the mood, feeling, or atmosphere of the image.
3.  **Narrative:** A prompt that suggests a story or a moment in time, giving the characters or scene a backstory or future.
Do not add any preamble, explanation, or markdown formatting. Only return the raw JSON array.`;

interface Image {
    data: string;
    mimeType: string;
}

export const generatePromptVariationsFromImage = async (image: Image): Promise<string[]> => {
    const ai = getAIClient();
    const contents = {
        parts: [{
            inlineData: {
                data: image.data,
                mimeType: image.mimeType,
            },
        },
        { text: "Generate three creative prompt variations for this image." }
    ]};

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents,
        config: {
            systemInstruction: variationsSystemInstruction,
            temperature: 0.7,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.STRING
                }
            }
        },
    });

    try {
        const jsonText = response.text.trim();
        const variations = JSON.parse(jsonText);
        if (Array.isArray(variations) && variations.every(v => typeof v === 'string') && variations.length > 0) {
            return variations;
        }
         throw new Error("Invalid format for prompt variations.");
    } catch (e) {
        console.error("Failed to parse prompt variations JSON:", e);
        // Fallback for unexpected non-JSON response
        if (response.text) {
             // Attempt to create a single prompt as a fallback
            return [response.text.trim()];
        }
        throw new Error("Could not understand the response from the AI. Please try again.");
    }
}

export const generateImageFromPrompt = async (prompt: string, originalImage: Image): Promise<{ data: string; mimeType: string; }> => {
    const ai = getAIClient();

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

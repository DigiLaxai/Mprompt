
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

// System instruction for the Analysis step - Refined for high-detail identity extraction
const analysisSystemInstruction = `You are a high-precision forensic artist and image analyst. Your task is to extract an extremely detailed physical description of the person in the image.

1.  **characterDescription**: Describe the person's biological identity with clinical precision. Include:
    *   Specific eye shape (e.g., hooded, almond) and color.
    *   Nose structure (e.g., bridge height, tip shape).
    *   Jawline and cheekbone definition.
    *   Exact skin undertone and texture.
    *   Hair hairline, texture, and natural color.
    *   Do NOT describe clothing or background.

2.  **sceneDescription**: Describe the temporary context:
    *   Clothing, accessories, pose, action, background, environment, and current lighting.

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
        model: "gemini-3-flash-preview",
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
    framing?: string;
    lighting?: string;
}

export const generateImageFromPrompt = async (
    components: PromptComponents,
    originalImage: Image,
    numberOfImages: number,
    preserveFace: boolean,
    imageSize: string = "1K"
): Promise<{ data: string; mimeType: string; }[]> => {
    const ai = getAIClient();
    let contents;

    const style = components.style || "None";
    const framing = components.framing || "None";
    const lighting = components.lighting || "None";

    const isArtStyle = style !== "None" && style !== "Photorealistic";

    let styleAndSetup = "";
    if (isArtStyle) {
        styleAndSetup += `
        ART STYLE AND RENDERING MANDATE:
        - The absolute target art style is: **${style}**.
        - Render the entire image, subject, clothing, face, and background, strictly in this ${style} style. 
        - Transform the reference subject's face, hair, and features seamlessly to fully fit this ${style} artistic style, while preserving their unique likeness, bone structure, and identity attributes. Do not render a realistic photo if the style is ${style}!`;
    } else if (style === "Photorealistic") {
        styleAndSetup += `
        ART STYLE AND RENDERING MANDATE:
        - The target style is: High-quality, lifelike, photorealistic professional portrait photography.
        - Render realistic textures, hair strands, and skin details.`;
    }

    if (framing && framing !== "None") {
        styleAndSetup += `\n        - CAMERA SHOT TYPE: Use a ${framing.toLowerCase()} composition.`;
    }
    if (lighting && lighting !== "None") {
        styleAndSetup += `\n        - LIGHTING SETUP: Apply a ${lighting.toLowerCase()} lighting environment.`;
    }

    if (preserveFace) {
        let finalPrompt = `
        MANDATORY IDENTITY PRESERVATION & STYLE TRANSFORMATION TASK:
        
        REFERENCE SUBJECT: Attached Image.
        
        CORE REQUIREMENT: The output MUST feature the same recognizable human subject as the one in the attached reference image. Keep their specific facial features, eyes, nose, mouth shape, and unique biological identity recognizable.
        
        ${styleAndSetup}
        
        INSTRUCTIONS FOR TRANSFORMATION:
        1. Fully respect the selected style and scene details above.
        2. Keep the core structural face and identity of the reference subject.
        3. Place the subject in:
           - [SCENE & ACTION]: "${components.scene}"
        
        BIOLOGICAL TRAITS TO INTEGRATE AND MAINTAIN:
        "${components.character}"
        `;
        
        if (!isArtStyle) {
            finalPrompt += `\n        This is a photo-consistent identity task. The output person should look like the reference subject has simply changed clothes and walked into a different room with the specified lighting and camera framing.`;
        } else {
            finalPrompt += `\n        Because an artistic style (${style}) is active, do not make it a realistic photo. Redraw their face and features to perfectly match the ${style} format, keeping their identity recognizable within that artistic style.`;
        }

        contents = {
            parts: [
                {
                    inlineData: {
                        data: originalImage.data,
                        mimeType: originalImage.mimeType,
                    },
                },
                { text: finalPrompt },
            ],
        };
    } else {
        const finalPrompt = `
        Artistic Portrait Generation Task:
        
        [SUBJECT DESCRIPTION]: "${components.character}"
        [SCENE & ACTION]: "${components.scene}"
        
        ${styleAndSetup}
        `;

        contents = {
            parts: [{ text: finalPrompt }],
        };
    }

    const imagePromises = [];
    for (let i = 0; i < numberOfImages; i++) {
        // Upgraded to Gemini 3 Pro Image for professional identity preservation
        imagePromises.push(ai.models.generateContent({
            model: 'gemini-3-pro-image',
            contents: contents,
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
                    imageSize: imageSize as any
                }
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
        throw new Error('Image generation failed. Please try a different prompt.');
    });

    if (images.length !== numberOfImages) {
      throw new Error('Not all images were returned. The safety filter may have blocked some content.');
    }
    
    return images;
}

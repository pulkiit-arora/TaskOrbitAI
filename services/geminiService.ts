import { AISuggestion, Priority } from "../types";

let ai: any = null;
let Type: any = null;
let Schema: any = null;

// Lazy load the Gemini library
const initializeGemini = async () => {
  if (ai !== null) return; // Already initialized
  
  try {
    const genai = await import("@google/genai");
    const GoogleGenAI = genai.GoogleGenAI;
    Type = genai.Type;
    Schema = genai.Schema;
    
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  } catch (error) {
    console.error("Failed to import GoogleGenAI:", error);
    ai = false; // Mark as failed to avoid retrying
  }
};

// For backward compatibility, try synchronous import but don't crash if it fails
try {
  const { GoogleGenAI, Type: GenType, Schema: GenSchema } = require("@google/genai");
  Type = GenType;
  Schema = GenSchema;
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
} catch (error) {
  console.warn("GoogleGenAI not available, AI features will be disabled");
}

const getSuggestionSchema = () => {
  if (!Type || !Schema) return null;
  return {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        priority: { type: Type.STRING, enum: [Priority.LOW, Priority.MEDIUM, Priority.HIGH] }
      },
      required: ["title", "description", "priority"]
    }
  };
};

export const generateTaskSuggestions = async (goal: string): Promise<AISuggestion[]> => {
  if (!ai) {
    console.warn("Gemini API Key is missing. AI suggestions will be disabled.");
    return [];
  }

  try {
    const suggestionSchema = getSuggestionSchema();
    if (!suggestionSchema) {
      console.warn("Gemini schema not available");
      return [];
    }

    const response = await ai!.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Break down the following personal goal or activity into 3-5 concrete, manageable steps: "${goal}".
      Return them as a JSON list. Keep descriptions concise. Assign reasonable priorities based on urgency and impact.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: suggestionSchema,
        systemInstruction: "You are a helpful personal productivity assistant. You break complex personal goals (like 'Move house', 'Get fit', 'Plan vacation') into small, manageable items.",
      }
    });

    const text = response.text;
    if (!text) return [];

    const data = JSON.parse(text) as AISuggestion[];
    return data;
  } catch (error) {
    console.error("Failed to generate suggestions:", error);
    return [];
  }
};
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AISuggestion, Priority } from "../types";

// Initialize Gemini client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const suggestionSchema: Schema = {
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

export const generateTaskSuggestions = async (goal: string): Promise<AISuggestion[]> => {
  if (!process.env.API_KEY) {
    console.warn("Gemini API Key is missing.");
    return [];
  }

  try {
    const response = await ai.models.generateContent({
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
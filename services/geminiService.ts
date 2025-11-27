import { GoogleGenAI } from "@google/genai";
import { DifficultyLevel } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStory = async (level: DifficultyLevel): Promise<string> => {
  const modelId = "gemini-2.5-flash";

  const systemInstruction = `
    You are a children's book author specializing in literacy education.
    Your task is to write engaging, educational short stories for children in Portuguese (Brazil).
    
    Levels:
    - facil: Simple sentences, basic vocabulary, ~30-40 words.
    - medio: Compound sentences, slightly more descriptive, ~50-70 words.
    - dificil: Complex sentence structures, advanced vocabulary, ~80-100 words.
    
    Return ONLY the raw text of the story. Do not include titles, markdown formatting, or JSON.
  `;

  // Random topics to keep it fresh if the user keeps clicking
  const topics = [
    "uma aventura no fundo do mar",
    "um dragão que cospe bolhas de sabão",
    "uma viagem para a lua em uma caixa de papelão",
    "o dia em que os brinquedos ganharam vida",
    "um cachorro detetive",
    "uma floresta feita de doces",
    "um robô que queria ser jardineiro",
    "a escola de magia para animais"
  ];
  const randomTopic = topics[Math.floor(Math.random() * topics.length)];

  const prompt = `Escreva uma pequena história sobre ${randomTopic} para o nível de leitura '${level}'.`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8, 
      }
    });

    return response.text?.trim() || "Não foi possível criar a história agora. Tente novamente.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
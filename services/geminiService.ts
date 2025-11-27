
import { GoogleGenAI } from "@google/genai";
import { DifficultyLevel, GeminiAnalysisResponse } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStory = async (level: DifficultyLevel): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  // Simplified for brevity, keeping existing functionality
  const prompt = `Escreva uma pequena história educativa em Português do Brasil para o nível de leitura '${level}'. Retorne apenas o texto.`;
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text?.trim() || "Erro ao gerar história.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const analyzeReadingAudio = async (
  audioBase64: string, 
  referenceText: string,
  mimeType: string = 'audio/webm'
): Promise<GeminiAnalysisResponse> => {
  const modelId = "gemini-2.5-flash"; // Using flash for speed/cost effectiveness with multimodal

  const systemInstruction = `Você é um avaliador de fluência leitora. Sua tarefa é ouvir o áudio fornecido e compará-lo palavra por palavra com o texto de referência fornecido. Você deve ignorar ruídos de fundo e focar na fala da criança. Retorne APENAS um objeto JSON com a seguinte estrutura: { "total_words_reference": number, "total_words_read_correctly": number, "duration_seconds": number, "transcription": string, "words": [ { "word": "exemplo", "status": "correct" | "approximate" | "wrong" | "skipped", "timestamp_start": number, "timestamp_end": number } ] }. Classifique como "approximate" pequenas variações de pronúncia aceitáveis na alfabetização e "wrong" apenas erros graves de troca ou omissão.`;

  const prompt = `Texto de referência: "${referenceText}"`;

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType,
                data: audioBase64
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1, // Low temperature for consistent analysis
      }
    });

    const jsonText = response.text || "{}";
    const result = JSON.parse(jsonText) as GeminiAnalysisResponse;
    
    // Fallback validation if Gemini returns nulls
    if (!result.words) result.words = [];
    return result;

  } catch (error) {
    console.error("Gemini Audio Analysis Error:", error);
    throw new Error("Falha ao analisar o áudio. Tente novamente.");
  }
};
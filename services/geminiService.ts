
import { GoogleGenAI, Type } from "@google/genai";
import { DifficultyLevel, AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const analyzeReading = async (audioBlob: Blob, referenceText: string): Promise<AnalysisResult> => {
  const modelId = "gemini-2.5-flash"; // Supports multimodal (audio+text)

  const base64Audio = await blobToBase64(audioBlob);

  const systemInstruction = `
    Você é um avaliador de fluência leitora. Sua tarefa é ouvir o áudio fornecido e compará-lo palavra por palavra com o texto de referência fornecido.
    Você deve ignorar ruídos de fundo e focar na fala da criança.
    
    Retorne APENAS um objeto JSON com a seguinte estrutura:
    {
      "total_words_reference": number,
      "total_words_read_correctly": number,
      "duration_seconds": number,
      "transcription": string,
      "words": [
        {
          "word": "exemplo",
          "status": "correct" | "approximate" | "wrong" | "skipped",
          "timestamp_start": number,
          "timestamp_end": number
        }
      ]
    }.
    
    Classifique como "approximate" pequenas variações de pronúncia aceitáveis na alfabetização (sotaques, correções rápidas) e "wrong" apenas erros graves de troca ou omissão.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      total_words_reference: { type: Type.INTEGER },
      total_words_read_correctly: { type: Type.INTEGER },
      duration_seconds: { type: Type.NUMBER },
      transcription: { type: Type.STRING },
      words: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            status: { type: Type.STRING, enum: ["correct", "approximate", "wrong", "skipped"] },
            timestamp_start: { type: Type.NUMBER },
            timestamp_end: { type: Type.NUMBER }
          },
          required: ["word", "status"]
        }
      }
    },
    required: ["total_words_reference", "total_words_read_correctly", "duration_seconds", "words"]
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: [
        {
          role: "user",
          parts: [
            { text: `Texto de Referência: "${referenceText}"` },
            {
              inlineData: {
                mimeType: audioBlob.type || "audio/webm",
                data: base64Audio
              }
            }
          ]
        }
      ],
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1, // Low temperature for consistent grading
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Sem resposta da IA");
    
    return JSON.parse(jsonText) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const generateStory = async (level: DifficultyLevel): Promise<string> => {
  const modelId = "gemini-2.5-flash";
  const prompt = `Escreva uma pequena história infantil educativa (30-50 palavras) para o nível '${level}'. Retorne apenas o texto.`;
  
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });
    return response.text?.trim() || "Erro ao gerar história.";
  } catch (error) {
    return "Era uma vez um gato que gostava de ler...";
  }
};

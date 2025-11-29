import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const SYSTEM_INSTRUCTION_BASE = `
Você é um assistente amigável.
Respostas curtas, objetivas e sem formatação markdown (sem asteriscos).
Você não tem um nome. Não invente um nome para si mesmo. Se perguntarem seu nome, diga que não tem um, a menos que o usuário lhe dê um.
`;

// Fallback questions in case of API quota error
const FALLBACK_QUESTIONS = [
    {
        question: "O que usamos para cortar papel?",
        options: ["Tesoura", "Colher", "Pedra"],
        correctAnswer: "Tesoura",
        explanation: "A tesoura corta."
    },
    {
        question: "Qual destas é uma fruta?",
        options: ["Mesa", "Banana", "Carro"],
        correctAnswer: "Banana",
        explanation: "Banana é fruta."
    },
    {
        question: "Qual letra vem depois do A?",
        options: ["C", "B", "D"],
        correctAnswer: "B",
        explanation: "A, B, C."
    }
];

export const analyzeImageText = async (base64Data: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
          { text: "Extraia o texto. Apenas o texto puro." }
        ]
      }
    });
    return response.text || "Não li nada.";
  } catch (error) {
    return "Erro ao ler imagem.";
  }
};

export const generateLiteracyGame = async (promptContext: string = "alfabetização"): Promise<any> => {
  try {
    // We construct a prompt that embeds the specific logic requested by the App
    // but ensures the output matches the GameQuestion interface structure.
    const fullPrompt = `
      ${promptContext}
      
      OUTPUT JSON EXCLUSIVAMENTE (sem markdown):
      {
        "question": "A pergunta gerada",
        "options": ["Opção1", "Opção2", "Opção3"],
        "correctAnswer": "A opção correta (deve ser idêntica a uma das options)",
        "explanation": "Explicação muito breve do porquê."
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fullPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation"]
        }
      }
    });
    
    if (response.text) {
        return JSON.parse(response.text);
    }
    throw new Error("Empty");
  } catch (error) {
    const randomFallback = FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
    return randomFallback;
  }
};

export const checkWriting = async (text: string): Promise<{ corrected: string; changes: string[]; feedback: string }> => {
  try {
    const prompt = `
      Corrija: "${text}".
      JSON ONLY:
      {
        "corrected": "Texto corrigido",
        "changes": ["Erro tal -> Correção tal"],
        "feedback": "Comentário curto."
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                corrected: { type: Type.STRING },
                changes: { type: Type.ARRAY, items: { type: Type.STRING } },
                feedback: { type: Type.STRING }
            }
        }
      }
    });
    if (response.text) {
        return JSON.parse(response.text);
    }
    throw new Error("Empty");
  } catch (error) {
    return { corrected: text, changes: ["Erro na conexão."], feedback: "Tente novamente." };
  }
};

export const askAssistant = async (query: string): Promise<{ text: string; urls?: Array<{ title: string; uri: string }> }> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: query,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: SYSTEM_INSTRUCTION_BASE,
      }
    });

    const text = response.text || "Não entendi.";
    
    let urls: Array<{ title: string; uri: string }> = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    if (chunks) {
      chunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          urls.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    return { text, urls };
  } catch (error) {
    return { text: "Erro na busca." };
  }
};
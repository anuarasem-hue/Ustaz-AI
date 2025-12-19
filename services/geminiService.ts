import { GoogleGenAI } from "@google/genai";

// 1. Инициализация с правильным ключом для Vite
const getAIInstance = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error("API Key is missing! Check Netlify environment variables.");
    // Возвращаем dummy-клиент или выбрасываем ошибку, чтобы не крашить всё приложение сразу
    throw new Error("API Key is missing");
  }
  
  return new GoogleGenAI({ apiKey });
};

// 2. Вспомогательная функция для получения текста (учитывает особенности новой SDK)
const getResponseText = async (response: any) => {
  // В новой SDK текст может лежать в response.text() как функция или свойство
  if (typeof response.text === 'function') {
    return response.text();
  }
  return response.text || "";
};

export const fetchCurriculumData = async (subject: string, grade: string) => {
  try {
    const ai = getAIInstance();
    const prompt = `Предоставь КТП для предмета "${subject}" и класса "${grade}" на 2024-2025 уч. год. 
    Верни JSON: { "units": [{ "title": "Раздел", "topics": [{ "name": "Тема", "objectives": ["ЦО"] }] }] }`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp', 
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = await getResponseText(response);
    return JSON.parse(text);
  } catch (e) {
    console.error(e);
    return { units: [] };
  }
};

export const generateSORSOCH = async (data: any) => {
  const ai = getAIInstance();
  const points = data.type === 'SOR' ? '10-16 баллов' : '25 баллов';
   
  const prompt = `
    Составь задания для ${data.type} по предмету ${data.subject}, ${data.grade} класс.
    Раздел: ${data.unit}. ЦО: ${data.objectives}.
    Общий балл: ${points}. Обязательно таблицу баллов в конце. Markdown.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt
  });

  return getResponseText(response);
};

export const analyzeSORWork = async (fileBase64: string, mimeType: string) => {
  const ai = getAIInstance();
  const prompt = `Проанализируй работу ученика. Ошибки, рекомендации.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: {
      parts: [
        { inlineData: { data: fileBase64, mimeType: mimeType } },
        { text: prompt }
      ]
    }
  });

  return getResponseText(response);
};

export const analyzeTableData = async (stats: string) => {
  const ai = getAIInstance();
  const prompt = `Анализ результатов класса: ${stats}. Рекомендации.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt,
  });
  return getResponseText(response);
};

export const analyzeSOR = async (stats: string, qualitative: string) => {
  const ai = getAIInstance();
  const prompt = `Анализ СОР: ${stats}. Комментарий: ${qualitative}. Выводы.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt,
  });
  return getResponseText(response);
};

export const generateKSP = async (data: any) => {
  const ai = getAIInstance();
  const prompt = `КСП. Предмет: ${data.subject}, Тема: ${data.topic}.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt
  });
  return getResponseText(response);
};

export const generateParentMessage = async (name: string, issue: string, positive: string) => {
  const ai = getAIInstance();
  const prompt = `Сообщение родителю ${name}. Позитив: ${positive}, Проблема: ${issue}.`;
  const response = await ai.models.generateContent({ 
    model: 'gemini-2.0-flash-exp', 
    contents: prompt 
  });
  return getResponseText(response);
};


import { GoogleGenAI } from "@google/genai";

// Use direct process.env.API_KEY for initialization as per guidelines
const getAIInstance = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const fetchCurriculumData = async (subject: string, grade: string) => {
  const ai = getAIInstance();
  const prompt = `Предоставь КТП для предмета "${subject}" и класса "${grade}" на 2024-2025 уч. год. 
  Верни JSON: { "units": [{ "title": "Раздел", "topics": [{ "name": "Тема", "objectives": ["ЦО"] }] }] }`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  try { return JSON.parse(response.text); } catch { return { units: [] }; }
};

export const generateSORSOCH = async (data: {
  type: 'SOR' | 'SOCH',
  subject: string,
  unit: string,
  grade: string,
  objectives: string
}) => {
  const ai = getAIInstance();
  const points = data.type === 'SOR' ? '10-16 баллов' : '25 баллов';
  
  const prompt = `
    Составь задания для ${data.type} (Суммативное оценивание) по предмету ${data.subject}, ${data.grade} класс.
    Раздел/Тема: ${data.unit}. 
    Цели обучения (ЦО): ${data.objectives}.
    
    ТРЕБОВАНИЯ ПРИКАЗА №130:
    1. Общий балл: ${points}.
    2. Разнообразные уровни мыслительных навыков (знание, применение, высокий уровень).
    3. Четкие инструкции для учащихся.
    4. В КОНЦЕ ОБЯЗАТЕЛЬНО: Таблица "Схема выставления баллов и дескрипторы" для каждого задания.
    
    Формат: Markdown с таблицами.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 4000 } }
  });

  return response.text;
};

export const analyzeSORWork = async (fileBase64: string, mimeType: string) => {
  const ai = getAIInstance();
  const prompt = `Проанализируй эту работу ученика (СОР/СОЧ). 
  1. Определи достигнутые и недостигнутые цели обучения.
  2. Выяви типичные ошибки.
  3. Дай рекомендации для коррекционной работы.
  Ответ оформи профессионально в виде отчета педагога по Приказу №130.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { data: fileBase64, mimeType: mimeType } },
        { text: prompt }
      ]
    }
  });

  return response.text;
};

export const analyzeTableData = async (stats: string) => {
  const ai = getAIInstance();
  const prompt = `Проведи подробный педагогический анализ результатов класса (СОР/СОЧ) на основе следующих данных:
  ${stats}
  
  В отчете укажи:
  1. Качество знаний (%) и Успеваемость (%).
  2. Анализ уровней учебных достижений (Высокий, Средний, Низкий).
  3. Перечень целей обучения, которые усвоены хорошо.
  4. Перечень целей обучения, по которым учащиеся допустили ошибки (западающие темы).
  5. План коррекционной работы (рекомендации).
  
  Формат: Академический стиль, Markdown, использование таблиц для наглядности.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text;
};

// Added analyzeSOR for SORAnalyst component compatibility
export const analyzeSOR = async (stats: string, qualitative: string) => {
  const ai = getAIInstance();
  const prompt = `Проведи педагогический анализ результатов СОР: ${stats}. 
  Комментарии учителя: ${qualitative}.
  Рассчитай (если не указано) и прокомментируй Качество знаний и Успеваемость. 
  Сделай выводы о том, какие темы требуют повторения. Используй Markdown.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text;
};

export const generateKSP = async (data: any) => {
  const ai = getAIInstance();
  const prompt = `Составь КСП по Приказу №130. Предмет: ${data.subject}, Тема: ${data.topic}, ЦО: ${data.objective}. Используй Markdown таблицы.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 4000 } }
  });
  return response.text;
};

export const generateParentMessage = async (name: string, issue: string, positive: string) => {
  const ai = getAIInstance();
  const prompt = `Напиши вежливое сообщение родителю ученика ${name} в WhatsApp. Начни с успеха (${positive}), затем деликатно о проблеме (${issue}).`;
  const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
  return response.text;
};

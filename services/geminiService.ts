// @google/genai Service for Educational Document Generation and Analysis
import { GoogleGenAI } from "@google/genai";

const getAIInstance = () => {
  // ИСПРАВЛЕНИЕ: Используем import.meta.env для Vite и правильное имя ключа VITE_GEMINI_API_KEY
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("API Key is missing! Check Netlify environment variables.");
    throw new Error("API Key is missing");
  }
  return new GoogleGenAI({ apiKey });
};

// Вспомогательная функция для безопасного получения текста
const getResponseText = (response: any) => {
    if (response.text && typeof response.text === 'function') {
        return response.text();
    }
    return response.text || "";
};

// Map textbook content to quarters for Informatics 11 EMC (Kazakhstan)
const INFORMATICS_11_EMC_MAP: Record<string, string> = {
  "1": "Раздел I: Искусственный интеллект. Темы: Понятие ИИ, тест Тьюринга, нейронные сети, структура нейрона, моделирование в Excel, линейная регрессия, машинное обучение, кластеризация.",
  "2": "Разделы II и III: 3D моделирование и Аппаратное обеспечение. Темы: VR/AR, 3D панорамы, виртуальные машины, характеристики мобильных устройств.",
  "3": "Раздел IV: Интернет вещей. Темы: IoT, Умный дом, Cisco Packet Tracer, MIT App Inventor.",
  "4": "Разделы V и VI: IT Startup и Цифровая грамотность. Темы: Startup, Crowdfunding, маркетинг, Big Data, Smart City, Blockchain, ЭЦП, egov.kz."
};

// Context for other subjects based on Kazakhstan's National Curriculum (GOSO)
const GOSO_CONTEXT_MAP: Record<string, string> = {
  "Математика": "Для 1-6 классов - интеграция арифметики и геометрии. С 7 класса - разделение на Алгебру и Геометрию. 10-11 класс ЕМЦ включает производные, интегралы и комплексные числа.",
  "История Казахстана": "Соблюдай хронологию: Древний мир, Средневековье (Золотая Орда, Казахское ханство), Новое время. Акцент на этногенез и государственность.",
  "Биология": "Соблюдай спиральный принцип: от цитологии в 7-9 классах до молекулярной биологии и генетики в 10-11 классах ЕМЦ.",
  "Физика": "В 10-11 классах ЕМЦ - упор на квантовую физику, термодинамику и электродинамику."
};

export const fetchCurriculumData = async (subject: string, grade: string) => {
  const ai = getAIInstance();
  
  if (subject.includes('Информатика') && grade === '11') {
    return {
      units: [
        { title: "Раздел I: Искусственный интеллект", objectives: ["11.3.4.1 Объяснять принципы машинного обучения", "11.3.4.2 Проектировать нейронную сеть", "11.3.4.3 Описывать сферы применения ИИ"] },
        { title: "Раздел II: 3D моделирование", objectives: ["11.2.4.1 Назначение VR и AR", "11.2.4.2 Создавать 3D панораму", "11.2.4.3 Влияние VR на здоровье"] },
        { title: "Раздел III: Аппаратное обеспечение", objectives: ["11.1.1.1 Назначение виртуальных машин", "11.1.1.2 Характеристики мобильных устройств"] },
        { title: "Раздел IV: Интернет вещей", objectives: ["11.1.2.1 Принципы работы IoT", "11.1.2.2 Мобильные приложения", "11.1.2.3 Умный дом"] },
        { title: "Раздел V: IT Startup", objectives: ["11.4.1.1 Понятие Startup", "11.4.1.2 Crowdfunding", "11.4.2.1 Маркетинг"] },
        { title: "Раздел VI: Цифровая грамотность", objectives: ["11.6.1.1 Цифровизация", "11.6.1.2 Blockchain", "11.5.1.1 ЭЦП"] }
      ]
    };
  }

  const prompt = `Предоставь официальное КТП РК для предмета "${subject}", ${grade} класс.
  Верни JSON объект: { "units": [{ "title": "Название раздела", "objectives": ["Код и описание ЦО"] }] }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp', // Используем стабильную experimental модель
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(getResponseText(response) || '{"units":[]}'); 
  } catch (e) { 
    console.error(e);
    return { units: [] }; 
  }
};

export const generateSORSOCH = async (data: any) => {
  const ai = getAIInstance();
  
  let subjectContext = GOSO_CONTEXT_MAP[data.subject] || "";
  
  if (data.subject.includes('Информатика') && data.grade === '11' && data.direction === 'ЕМЦ') {
    const quarterInfo = INFORMATICS_11_EMC_MAP[data.quarter || "1"] || "";
    subjectContext += `\nВАЖНО (СПЕЦИФИКА УЧЕБНИКА 11 ЕМЦ): ${quarterInfo}`;
  }

  const prompt = `
    СТРОГОЕ ЗАДАНИЕ: Составь ${data.type} (Суммативное оценивание) по стандартам РК.
    Предмет: ${data.subject}, Класс: ${data.grade}, Четверть: ${data.quarter}.
    ${data.type === 'SOR' ? `Раздел: ${data.unit}` : 'Тип: СОЧ'}.
    Цели: ${data.objectives?.join('; ') || 'Стандартные'}.
    КОНТЕКСТ: ${subjectContext}
    ТРЕБОВАНИЯ ПРИКАЗА №130:
    1. Баллы: ${data.type === 'SOR' ? '12-15' : '25'}.
    2. Структура Markdown: Спецификация, Задания (МВО, краткий, развернутый ответ), Схема выставления баллов.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: prompt
  });

  return getResponseText(response);
};

export const analyzeSOR = async (stats: string, qualitative?: string) => {
  const ai = getAIInstance();
  const prompt = `Пед. анализ результатов (Приказ №130 РК). Статистика: ${stats}. Комментарий: ${qualitative}.
  Формат Markdown: Таблица успеваемости, Анализ ошибок, Список западающих ЦО, План коррекции.`;
  
  const response = await ai.models.generateContent({ model: 'gemini-2.0-flash-exp', contents: prompt });
  return getResponseText(response);
};

export const analyzeSORWork = async (fileBase64: string, mimeType: string) => {
  const ai = getAIInstance();
  const prompt = `Эксперт по проверке СОР/СОЧ. Проверь работу, сверь с дескрипторами, выставь баллы, укажи ошибки.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-exp',
    contents: { parts: [{ inlineData: { data: fileBase64, mimeType: mimeType } }, { text: prompt }] }
  });
  return getResponseText(response);
};

export const generateKSP = async (data: any) => {
  const ai = getAIInstance();
  const prompt = `КСП по Приказу №130. Предмет: ${data.subject}, Тема: ${data.topic}. Табличный вид Markdown.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-thinking-exp', // Thinking модель для сложных планов
    contents: prompt
  });
  return getResponseText(response);
};

export const generateParentMessage = async (name: string, issue: string, positive: string) => {
  const ai = getAIInstance();
  const prompt = `Сообщение родителю (${name}). Похвала: ${positive}. Проблема: ${issue}.`;
  
  const response = await ai.models.generateContent({ model: 'gemini-2.0-flash-exp', contents: prompt });
  return getResponseText(response);
};

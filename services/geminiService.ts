
// @google/genai Service for Educational Document Generation and Analysis
import { GoogleGenAI, Type } from "@google/genai";

const getAIInstance = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Map textbook content to quarters for Informatics 11 EMC (Kazakhstan)
const INFORMATICS_11_EMC_MAP: Record<string, string> = {
  "1": "Раздел I: Искусственный интеллект. Темы: Понятие ИИ, тест Тьюринга, биологические и искусственные нейронные сети, структура нейрона (входы, синапсы, веса, активационная функция), моделирование простейшего нейрона в Excel (формулы активации, дельта-вес, скорость обучения), линейная регрессия и прогнозирование в Excel (функции ПРЕДСКАЗ, ДОВЕРИТ), машинное обучение (с учителем и без), кластеризация.",
  "2": "Разделы II и III: 3D моделирование и Аппаратное обеспечение. Темы: Виртуальная и дополненная реальностей (VR/AR), виды VR (простой, 3D-модель, многопользовательский), 3D панорамы (плоскостная, сферическая, кубическая, цилиндрическая), программы (Dermandar, Autostitch, Hugin), виртуальные машины (VirtualBox, VMware, Microsoft Virtual PC), характеристики и модули мобильных устройств (АКБ, контроллер питания, CPU, RAM, сенсоры).",
  "3": "Раздел IV: Интернет вещей. Темы: Понятие и архитектура IoT (уровни приложения, сети, поддержки, устройства), промышленный и пользовательский IoT, системы 'Умный дом' (датчики движения, протечки, задымления, умные розетки), симуляция в Cisco Packet Tracer, разработка мобильных приложений в MIT App Inventor (режимы Дизайнер и Блоки, работа с компонентами, событиями и сенсором акселерометра).",
  "4": "Разделы V и VI: IT Startup и Цифровая грамотность. Темы: Понятие Startup, Crowdfunding (Kickstarter, Starttime.kz), этапы развития стартапа (Pre-seed, Seed, Prototype, Alpha, Beta), маркетинг и реклама (инфографика, виды рекламы), цифровизация в РК (Big Data, Smart City), Blockchain (публичный и приватный), правовая защита информации (авторское и патентное право), ЭЦП (RSA, AUTH_RSA), электронное правительство egov.kz."
};

// Context for other subjects based on Kazakhstan's National Curriculum (GOSO)
const GOSO_CONTEXT_MAP: Record<string, string> = {
  "Математика": "Для 1-6 классов - интеграция арифметики и геометрии. С 7 класса - разделение на Алгебру и Геометрию. 10-11 класс ЕМЦ включает производные, интегралы и комплексные числа.",
  "История Казахстана": "Соблюдай хронологию: Древний мир (саки, гунны), Средневековье (Тюркский каганат, Золотая Орда, Казахское ханство), Новое и Новейшее время. Акцент на этногенез и государственность.",
  "Биология": "Соблюдай спиральный принцип: от цитологии в 7-9 классах до молекулярной биологии и генетики в 10-11 классах ЕМЦ.",
  "Физика": "В 10-11 классах ЕМЦ - упор на квантовую физику, термодинамику и электродинамику с применением сложного математического аппарата."
};

export const fetchCurriculumData = async (subject: string, grade: string) => {
  const ai = getAIInstance();
  
  if (subject.includes('Информатика') && grade === '11') {
    return {
      units: [
        { title: "Раздел I: Искусственный интеллект", objectives: ["11.3.4.1 Объяснять принципы машинного обучения и нейронных сетей", "11.3.4.2 Проектировать нейронную сеть в электронных таблицах", "11.3.4.3 Описывать сферы применения ИИ"] },
        { title: "Раздел II: 3D моделирование", objectives: ["11.2.4.1 Объяснять назначение VR и AR", "11.2.4.2 Создавать 3D панораму", "11.2.4.3 Рассуждать о влиянии VR на здоровье"] },
        { title: "Раздел III: Аппаратное обеспечение", objectives: ["11.1.1.1 Описывать назначение виртуальных машин", "11.1.1.2 Сравнивать характеристики мобильных устройств"] },
        { title: "Раздел IV: Интернет вещей", objectives: ["11.1.2.1 Описывать принципы работы IoT", "11.1.2.2 Разрабатывать мобильные приложения в конструкторе", "11.1.2.3 Создавать проекты умного дома"] },
        { title: "Раздел V: IT Startup", objectives: ["11.4.1.1 Описывать понятие Startup", "11.4.1.2 Знать принципы работы Crowdfunding", "11.4.2.1 Создавать маркетинговую рекламу"] },
        { title: "Раздел VI: Цифровая грамотность", objectives: ["11.6.1.1 Анализировать тенденции цифровизации", "11.6.1.2 Объяснять принципы Blockchain", "11.5.1.1 Описывать назначение ЭЦП и сертификата"] }
      ]
    };
  }

  const prompt = `Предоставь официальное КТП Республики Казахстан для предмета "${subject}", ${grade} класс.
  Верни JSON объект строго в формате: { "units": [{ "title": "Название раздела", "objectives": ["Код и описание цели обучения"] }] }
  Используй только актуальные цели обучения (ЦО) из типовой программы РК.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: { responseMimeType: "application/json" }
  });

  try { return JSON.parse(response.text || '{"units":[]}'); } catch { return { units: [] }; }
};

export const generateSORSOCH = async (data: {
  type: 'SOR' | 'SOCH',
  subject: string,
  unit: string,
  grade: string,
  objectives: string[],
  direction?: 'ЕМЦ' | 'ОГН',
  quarter?: string
}) => {
  const ai = getAIInstance();
  
  let subjectContext = GOSO_CONTEXT_MAP[data.subject] || "";
  
  // Specific Informatics 11 EMC mapping
  if (data.subject.includes('Информатика') && data.grade === '11' && data.direction === 'ЕМЦ') {
    const quarterInfo = INFORMATICS_11_EMC_MAP[data.quarter || "1"] || "";
    subjectContext += `\nВАЖНО (СПЕЦИФИКА УЧЕБНИКА 11 ЕМЦ): ${quarterInfo}`;
  }

  const prompt = `
    СТРОГОЕ ЗАДАНИЕ: Составь документ ${data.type} (Суммативное оценивание) по стандартам Республики Казахстан.
    
    ПАРАМЕТРЫ:
    - Предмет: ${data.subject}
    - Класс: ${data.grade}
    - Направление: ${data.direction || 'Общее'}
    - Четверть: ${data.quarter || '1'}
    - ${data.type === 'SOR' ? `Раздел: ${data.unit}` : 'Тип: Итоговая работа за четверть (СОЧ)'}
    - Цели обучения: ${data.objectives.length > 0 ? data.objectives.join('; ') : 'Используй стандартные за эту четверть'}
    
    ДОПОЛНИТЕЛЬНЫЙ КОНТЕКСТ ГОСО: ${subjectContext}
    
    ТРЕБОВАНИЯ К ОФОРМЛЕНИЮ (ПРИКАЗ №130):
    1. ОБЩИЙ БАЛЛ: ${data.type === 'SOR' ? '12-15 баллов' : 'СТРОГО 25 баллов (не больше и не меньше)'}.
    2. УРОВНИ МЫШЛЕНИЯ: Знание и понимание (30%), Применение (40%), Навыки высокого порядка (30%).
    3. СТРУКТУРА В MARKDOWN:
       - Спецификация суммативного оценивания (таблица: цели, уровни, время, баллы). Сумма баллов в таблице должна быть ровно ${data.type === 'SOR' ? '12-15' : '25'}.
       - Текст заданий: МВО (тесты), задания с кратким ответом, задания с развернутым ответом.
       - Схема выставления баллов (таблица с дескрипторами для каждого задания).
    
    ЯЗЫК: Русский. Тон: Официально-педагогический.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 4000 } }
  });

  return response.text;
};

export const analyzeSOR = async (stats: string, qualitative?: string) => {
  const ai = getAIInstance();
  const prompt = `Проведи педагогический анализ результатов (Приказ №130 РК). 
  Статистические данные: ${stats}. 
  Комментарий учителя: ${qualitative}. 
  
  Выдай отчет в формате Markdown:
  1. Таблица успеваемости (ФИО не нужны, только цифры).
  2. Анализ наиболее часто допускаемых ошибок.
  3. Список целей обучения, требующих повторения.
  4. Конкретный план коррекционной работы (мероприятия).`;
  
  const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
  return response.text;
};

export const analyzeSORWork = async (fileBase64: string, mimeType: string) => {
  const ai = getAIInstance();
  const prompt = `Ты — эксперт по проверке СОР/СОЧ в Казахстане. 
  Проанализируй скан работы ученика. Сверь ответы с дескрипторами Приказа №130. 
  Выставь баллы по каждому заданию, укажи ошибки и дай рекомендации для ученика.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ inlineData: { data: fileBase64, mimeType: mimeType } }, { text: prompt }] }
  });
  return response.text;
};

export const generateKSP = async (data: any) => {
  const ai = getAIInstance();
  const prompt = `Составь КСП (Краткосрочный план урока) по Приказу №130 РК. 
  Предмет: ${data.subject}, Тема: ${data.topic}, Класс: ${data.grade}. 
  Разделы: Цели обучения, Критерии оценивания, Ход урока (Начало, Середина, Конец), Дифференциация, Оценивание, Здоровье и техника безопасности. 
  Оформление: Табличный вид в Markdown.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: { thinkingConfig: { thinkingBudget: 4000 } }
  });
  return response.text;
};

export const generateParentMessage = async (name: string, issue: string, positive: string) => {
  const ai = getAIInstance();
  const prompt = `Напиши корректное, вежливое сообщение родителю ученика по имени ${name}. 
  Начни с похвалы (${positive}), затем аккуратно упомяни проблему (${issue}) и предложи способ решения.`;
  
  const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
  return response.text;
};

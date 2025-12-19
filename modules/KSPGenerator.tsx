
import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateKSP, fetchCurriculumData } from '../services/geminiService';
import { metricsService } from '../services/metricsService';
// Corrected import: StoredItem instead of non-existent StoredKSP
import { historyService, StoredItem } from '../services/historyService';

interface CurriculumTopic {
  name: string;
  objectives: string[];
}

interface CurriculumUnit {
  title: string;
  topics: CurriculumTopic[];
}

const GRADE_SUBJECTS_MAP: Record<string, string[]> = {
  'primary': ['Обучение грамоте / Букварь', 'Математика', 'Казахский язык', 'Русский язык', 'Английский язык', 'Цифровая грамотность', 'Познание мира', 'Естествознание', 'Музыка', 'Художественный труд', 'Самопознание', 'Физическая культура'],
  'middle_early': ['Математика', 'Казахский язык', 'Казахская литература', 'Русский язык', 'Русская литература', 'Английский язык', 'История Казахстана', 'Всемирная история', 'География', 'Биология', 'Информатика', 'Естествознание (5 класс)', 'Музыка', 'Художественный труд', 'Физическая культура'],
  'middle_late': ['Алгебра', 'Геометрия', 'Информатика', 'Физика', 'Химия', 'Биология', 'География', 'История Казахстана', 'Всемирная история', 'Казахский язык', 'Казахская литература', 'Русский язык', 'Русская литература', 'Английский язык', 'Основы права (9 класс)', 'Художественный труд', 'Физическая культура'],
  'senior': ['Алгебра и начала анализа', 'Геометрия', 'Информатика', 'Физика', 'Химия', 'Биология', 'География', 'История Казахстана', 'Всемирная история', 'Казахский язык', 'Казахская литература', 'Русский язык', 'Русская литература', 'Английский язык', 'Основы права', 'Графика и проектирование', 'Основы предпринимательства и бизнеса', 'Начальная военная и технологическая подготовка', 'Физическая культура']
};

const KSPGenerator: React.FC = () => {
  const [grade, setGrade] = useState('7');
  const [subject, setSubject] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [unit, setUnit] = useState('');
  const [objective, setObjective] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCurriculumLoading, setIsCurriculumLoading] = useState(false);
  const [curriculum, setCurriculum] = useState<CurriculumUnit[]>([]);
  const [result, setResult] = useState<string | null>(null);
  // Corrected history state type to StoredItem[]
  const [history, setHistory] = useState<StoredItem[]>([]);
  
  const resultRef = useRef<HTMLDivElement>(null);

  const gradeCategory = useMemo(() => {
    const g = parseInt(grade);
    if (g >= 1 && g <= 4) return 'primary';
    if (g >= 5 && g <= 6) return 'middle_early';
    if (g >= 7 && g <= 9) return 'middle_late';
    return 'senior';
  }, [grade]);

  const availableSubjects = useMemo(() => {
    return [...GRADE_SUBJECTS_MAP[gradeCategory], 'Другой предмет...'];
  }, [gradeCategory]);

  const allTopics = useMemo(() => {
    const list: { name: string, unitTitle: string, objectives: string[] }[] = [];
    curriculum.forEach(u => {
      u.topics.forEach(t => {
        list.push({ name: t.name, unitTitle: u.title, objectives: t.objectives });
      });
    });
    return list;
  }, [curriculum]);

  useEffect(() => {
    if (!availableSubjects.includes(subject)) {
      setSubject(availableSubjects[0]);
    }
  }, [availableSubjects]);

  useEffect(() => {
    const loadCurriculum = async () => {
      const finalSubject = subject === 'Другой предмет...' ? customSubject : subject;
      if (!finalSubject || finalSubject === 'Другой предмет...') return;
      
      setIsCurriculumLoading(true);
      try {
        const data = await fetchCurriculumData(finalSubject, grade);
        setCurriculum(data.units || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsCurriculumLoading(false);
      }
    };
    loadCurriculum();
  }, [subject, grade, customSubject]);

  const handleTopicChange = (topicName: string) => {
    setTopic(topicName);
    const found = allTopics.find(t => t.name === topicName);
    if (found) {
      setUnit(found.unitTitle);
      setObjective(found.objectives.join('\n'));
    }
  };

  const downloadAsWord = () => {
    if (!resultRef.current) return;

    // Get the HTML from the preview div
    const content = resultRef.current.innerHTML;
    
    // Construct a Word-friendly HTML wrapper
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Краткосрочный план урока</title>
        <style>
          @page { size: A4; margin: 1.5cm 1.5cm 1.5cm 2cm; }
          body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.2; }
          table { border-collapse: collapse; width: 100%; border: 1px solid black; margin-bottom: 15px; page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          th, td { border: 1px solid black; padding: 6px; vertical-align: top; text-align: left; word-wrap: break-word; }
          th { background-color: #f2f2f2; font-weight: bold; }
          h3 { text-align: center; font-size: 14pt; margin: 10px 0; text-transform: uppercase; }
          p { margin: 5px 0; }
          strong { font-weight: bold; }
        </style>
      </head>
      <body>
        <h3 style="text-align: center;">КРАТКОСРОЧНЫЙ ПЛАН УРОКА (КСП)</h3>
        ${content}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', header], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `KSP_${grade}cl_${subject.replace(/\s+/g, '_')}_${topic.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const updateHistory = () => setHistory(historyService.getAll());
    updateHistory();
    window.addEventListener('historyUpdated', updateHistory);
    return () => window.removeEventListener('historyUpdated', updateHistory);
  }, []);

  const handleGenerate = async () => {
    const finalSubject = subject === 'Другой предмет...' ? customSubject : subject;
    if (!finalSubject || !topic) {
      alert('Пожалуйста, выберите тему из списка или укажите вручную.');
      return;
    }
    setIsLoading(true);
    const startTime = Date.now();
    try {
      const kspText = await generateKSP({ 
        subject: finalSubject, unit, grade, topic, objective, teacherName: teacherName || 'Учитель', date
      });
      metricsService.saveGeneration('KSP', Date.now() - startTime);
      // Fixed: changed non-existent historyService.saveKSP to correct generic historyService.save
      historyService.save({ type: 'KSP', subject: finalSubject, topic, grade, content: kspText });
      setResult(kspText);
    } catch (error) {
      alert('Ошибка при генерации. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 pb-20 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex-1 space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Мастер КСП</h3>
              <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-semibold italic">Генерация по Приказу №130 РК</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Класс обучения</label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer">
                {[...Array(11)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1} класс</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Предмет</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer">
                {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
              Тема урока (из КТП)
              {isCurriculumLoading && <span className="text-[10px] text-blue-500 animate-pulse font-bold">ПОИСК В КТП...</span>}
            </label>
            <select 
              value={topic} 
              onChange={(e) => handleTopicChange(e.target.value)}
              disabled={isCurriculumLoading || (allTopics.length === 0 && subject !== 'Другой предмет...')}
              className="w-full p-3 bg-white border-2 border-blue-50 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-800 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
            >
              <option value="">{isCurriculumLoading ? 'Загрузка...' : '--- Выберите тему ---'}</option>
              {allTopics.map((t, idx) => (
                <option key={idx} value={t.name}>{t.name}</option>
              ))}
              {subject === 'Другой предмет...' && <option value="manual">Ввести тему вручную</option>}
            </select>
            {subject === 'Другой предмет...' && topic === 'manual' && (
              <input 
                type="text" 
                placeholder="Напишите тему урока" 
                onChange={(e) => setTopic(e.target.value)} 
                className="w-full p-3 mt-2 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Раздел (авто)</label>
              <input type="text" value={unit} readOnly className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-500 cursor-not-allowed text-sm font-medium" placeholder="Раздел подтянется автоматически" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Дата проведения</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">Цели обучения (ЦО)</label>
            <textarea rows={2} value={objective} readOnly className="w-full p-3 bg-slate-50/50 border border-slate-200 rounded-2xl text-slate-500 text-xs cursor-not-allowed resize-none leading-snug" placeholder="Цели обучения будут добавлены из типовой программы" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700">ФИО преподавателя</label>
            <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Для автоматической шапки документа" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <button onClick={handleGenerate} disabled={isLoading || !topic} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-5 rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center space-x-3 transform hover:scale-[1.01] active:scale-95">
            {isLoading ? <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Формирование документа...</span></> : <span>Создать КСП по стандарту №130</span>}
          </button>
        </div>

        {result && (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
               <div>
                 <h3 className="text-lg font-bold text-slate-800">Предпросмотр КСП</h3>
                 <p className="text-xs text-slate-400">Формат Times New Roman • Табличный вид</p>
               </div>
               <button onClick={downloadAsWord} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg flex items-center gap-2 transform hover:-translate-y-1 active:translate-y-0">
                <span className="text-lg">📥</span> Скачать в Word (.doc)
              </button>
            </div>
            
            <div className="bg-slate-50/30 p-8 rounded-2xl border border-slate-100 overflow-x-auto min-h-[500px]">
              <div ref={resultRef} className="prose prose-slate max-w-none prose-sm selection:bg-blue-100">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="w-full lg:w-80 space-y-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-8">
          <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
            <span className="text-lg">🕒</span> История за 3 часа
          </h4>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {history.length > 0 ? (
              history.map(item => (
                <div key={item.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all group" onClick={() => setResult(item.content)}>
                  <div className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mb-1">{item.subject}</div>
                  <div className="text-sm font-bold text-slate-800 line-clamp-2 leading-snug">{item.topic}</div>
                  <div className="flex justify-between items-center mt-3 text-[10px] text-slate-400 font-medium">
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-bold">{item.grade} кл</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-xs text-slate-400 italic">Сгенерируйте первый план, чтобы он появился здесь.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KSPGenerator;

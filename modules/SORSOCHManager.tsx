
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateSORSOCH, analyzeSORWork, analyzeTableData, fetchCurriculumData } from '../services/geminiService';
import { metricsService } from '../services/metricsService';
import { historyService } from '../services/historyService';

interface ScoreEntry {
  points: number;
  count: number;
}

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

// Subjects that typically have only 1 hour per week and thus NO SOCH according to standard KZ curriculum
const ONE_HOUR_SUBJECTS = [
  'Музыка', 'Художественный труд', 'Самопознание', 'Цифровая грамотность', 
  'Графика и проектирование', 'Основы права', 'Основы предпринимательства и бизнеса'
];

const SORSOCHManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'analyze_pdf' | 'analyze_table'>('generate');
  const [loading, setLoading] = useState(false);
  const [isCurriculumLoading, setIsCurriculumLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Form State
  const [type, setType] = useState<'SOR' | 'SOCH'>('SOR');
  const [grade, setGrade] = useState('7');
  const [subject, setSubject] = useState('');
  const [quarter, setQuarter] = useState('1');
  const [curriculum, setCurriculum] = useState<CurriculumUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedObjectives, setSelectedObjectives] = useState('');

  // Table Analysis State
  const [totalStudents, setTotalStudents] = useState<number>(25);
  const [absentStudents, setAbsentStudents] = useState<number>(0);
  const [scoreEntries, setScoreEntries] = useState<ScoreEntry[]>([
    { points: 15, count: 5 },
    { points: 12, count: 10 },
    { points: 8, count: 5 },
  ]);

  const gradeCategory = useMemo(() => {
    const g = parseInt(grade);
    if (g >= 1 && g <= 4) return 'primary';
    if (g >= 5 && g <= 6) return 'middle_early';
    if (g >= 7 && g <= 9) return 'middle_late';
    return 'senior';
  }, [grade]);

  const availableSubjects = useMemo(() => GRADE_SUBJECTS_MAP[gradeCategory], [gradeCategory]);

  const isOneHourSubject = useMemo(() => ONE_HOUR_SUBJECTS.some(s => subject.includes(s)), [subject]);

  // If subject is 1-hour, force SOR
  useEffect(() => {
    if (isOneHourSubject && type === 'SOCH') {
      setType('SOR');
    }
  }, [isOneHourSubject]);

  useEffect(() => {
    if (!availableSubjects.includes(subject)) {
      setSubject(availableSubjects[0]);
    }
  }, [availableSubjects]);

  useEffect(() => {
    const loadCurriculum = async () => {
      if (!subject) return;
      setIsCurriculumLoading(true);
      try {
        const data = await fetchCurriculumData(subject, grade);
        setCurriculum(data.units || []);
        if (data.units?.length > 0) {
          setSelectedUnit(data.units[0].title);
          // Auto pick all objectives for SOR/SOCH typically covers multiple
          const allObj = data.units[0].topics.flatMap(t => t.objectives).join('\n');
          setSelectedObjectives(allObj);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsCurriculumLoading(false);
      }
    };
    loadCurriculum();
  }, [subject, grade]);

  const handleUnitChange = (unitTitle: string) => {
    setSelectedUnit(unitTitle);
    const unit = curriculum.find(u => u.title === unitTitle);
    if (unit) {
      setSelectedObjectives(unit.topics.flatMap(t => t.objectives).join('\n'));
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const content = await generateSORSOCH({ 
        type, 
        subject, 
        unit: selectedUnit, 
        grade, 
        objectives: selectedObjectives 
      });
      setResult(content);
      metricsService.saveGeneration(type, Date.now() - start);
      historyService.save({ type, topic: selectedUnit, subject, grade, content });
    } catch (e) { alert('Ошибка генерации'); }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    const start = Date.now();
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const analysis = await analyzeSORWork(base64, file.type);
        setResult(analysis);
        metricsService.saveGeneration('ANALYSIS', Date.now() - start);
        historyService.save({ type: 'ANALYSIS', topic: 'Анализ работы', subject, grade, content: analysis });
      } catch (e) { alert('Ошибка анализа файла'); }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const presentCount = totalStudents - absentStudents;
  const enteredCount = scoreEntries.reduce((sum, entry) => sum + entry.count, 0);
  const maxPoints = type === 'SOR' ? 16 : 25;

  const statsCalculated = (() => {
    let high = 0; let medium = 0; let low = 0;
    scoreEntries.forEach(entry => {
      const percentage = (entry.points / maxPoints) * 100;
      if (percentage >= 85) high += entry.count;
      else if (percentage >= 50) medium += entry.count;
      else low += entry.count;
    });
    const success = presentCount > 0 ? Math.round(((high + medium) / presentCount) * 100) : 0;
    return { high, medium, low, success };
  })();

  const handleTableAnalysis = async () => {
    setLoading(true);
    const start = Date.now();
    const dataString = `
      Тип: ${type}, Предмет: ${subject}, Четверть: ${quarter}, Класс: ${grade}.
      Всего: ${totalStudents}, Отсутствует: ${absentStudents}.
      Распределение баллов: ${scoreEntries.map(e => `${e.points}б:${e.count}чел`).join(', ')}.
    `;
    try {
      const analysis = await analyzeTableData(dataString);
      setResult(analysis);
      metricsService.saveGeneration('ANALYSIS', Date.now() - start);
      historyService.save({ type: 'ANALYSIS', topic: `Анализ ${type}`, subject, grade, content: analysis });
    } catch (e) { alert('Ошибка анализа'); }
    setLoading(false);
  };

  const downloadAsWord = () => {
    if (!resultRef.current) return;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><style>body{font-family:'Times New Roman'; font-size:12pt;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid black;padding:5px;}</style></head>
    <body><h3 style="text-align:center">${type} - ${subject} - ${grade} класс</h3>${resultRef.current.innerHTML}</body></html>`;
    const blob = new Blob(['\ufeff', header], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${type}_${subject}_${grade}.doc`;
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        <div className="flex bg-slate-50 border-b overflow-x-auto whitespace-nowrap scrollbar-hide">
          <button onClick={() => setActiveTab('generate')} className={`px-8 py-4 font-bold text-sm transition-all ${activeTab === 'generate' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Генератор СОР/СОЧ</button>
          <button onClick={() => setActiveTab('analyze_pdf')} className={`px-8 py-4 font-bold text-sm transition-all ${activeTab === 'analyze_pdf' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Анализ PDF работ</button>
          <button onClick={() => setActiveTab('analyze_table')} className={`px-8 py-4 font-bold text-sm transition-all ${activeTab === 'analyze_table' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-500'}`}>Интерактивный анализ</button>
        </div>

        <div className="p-8">
          {activeTab === 'generate' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div className="flex gap-3">
                  <button onClick={() => setType('SOR')} className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${type === 'SOR' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'border-slate-100 text-slate-400 hover:bg-slate-50'}`}>СОР (10-16 б)</button>
                  <button 
                    onClick={() => setType('SOCH')} 
                    disabled={isOneHourSubject}
                    title={isOneHourSubject ? "Для предметов с нагрузкой 1 час/неделя СОЧ не проводится" : ""}
                    className={`flex-1 py-3 rounded-2xl font-bold border-2 transition-all ${type === 'SOCH' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' : 'border-slate-100 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                  >
                    СОЧ (25 б)
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Класс</label>
                    <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                      {[...Array(11)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1} класс</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Предмет</label>
                    <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                      {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Четверть</label>
                    <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none">
                      {[1,2,3,4].map(q => <option key={q} value={q}>{q} четверть</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase flex justify-between">
                      Раздел / Тема 
                      {isCurriculumLoading && <span className="text-blue-500 animate-pulse">Загрузка...</span>}
                    </label>
                    <select 
                      value={selectedUnit} 
                      onChange={(e) => handleUnitChange(e.target.value)}
                      disabled={isCurriculumLoading || curriculum.length === 0}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                    >
                      {curriculum.map((u, i) => <option key={i} value={u.title}>{u.title}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Цели обучения (ЦО)</label>
                  <textarea 
                    value={selectedObjectives} 
                    onChange={(e) => setSelectedObjectives(e.target.value)}
                    rows={4} 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Выберите раздел выше для автозаполнения ЦО..."
                  />
                </div>

                <button 
                  onClick={handleGenerate} 
                  disabled={loading || !subject || !selectedUnit} 
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <span>Сгенерировать задания и дескрипторы</span>}
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <span className="text-lg">ℹ️</span> Особенности программы
                  </h4>
                  <ul className="text-blue-800 text-xs space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                      <span>Для предметов с нагрузкой <strong>1 час в неделю</strong> (Музыка, ИЗО, Право и др.) проводится только СОР.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                      <span>Максимальный балл СОР по Приказу №130 составляет <strong>10-16 баллов</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                      <span>Максимальный балл СОЧ - <strong>25 баллов</strong>.</span>
                    </li>
                  </ul>
                </div>
                {isOneHourSubject && (
                  <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 flex items-center gap-4">
                    <div className="text-2xl animate-bounce">⚠️</div>
                    <div>
                      <div className="text-sm font-bold text-amber-900">Внимание: Предмет с малой нагрузкой</div>
                      <div className="text-xs text-amber-800">По предмету "{subject}" предусмотрен только СОР. СОЧ заблокирован.</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'analyze_pdf' && (
            <div className="text-center py-20 space-y-6">
              <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner">📄</div>
              <h3 className="text-2xl font-black text-slate-800">Анализ сканированных работ</h3>
              <p className="text-slate-500 max-w-md mx-auto">Загрузите PDF или фото работы ученика. ИИ проверит правильность, сопоставит с дескрипторами и выявит типичные ошибки.</p>
              <input type="file" accept="application/pdf,image/*" onChange={handleFileUpload} className="hidden" id="pdf-upload" />
              <label htmlFor="pdf-upload" className="inline-block bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold cursor-pointer hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all hover:-translate-y-1">
                {loading ? 'Анализируем...' : 'Выбрать файл работы'}
              </label>
            </div>
          )}

          {activeTab === 'analyze_table' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Учеников в классе</label>
                    <input type="number" value={totalStudents} onChange={e => setTotalStudents(+e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Отсутствовало</label>
                    <input type="number" value={absentStudents} onChange={e => setAbsentStudents(+e.target.value)} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-lg text-red-600 focus:ring-2 focus:ring-red-500 outline-none" />
                  </div>
                </div>

                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100">
                  <div className="flex justify-between items-center mb-6">
                    <h4 className="font-black text-slate-700 uppercase tracking-wider">Баллы учащихся</h4>
                    <button onClick={() => setScoreEntries([...scoreEntries, { points: 0, count: 0 }])} className="text-[10px] bg-slate-900 text-white px-4 py-2 rounded-full font-bold hover:bg-black transition-all">+ Добавить балл</button>
                  </div>
                  <div className="space-y-3">
                    {scoreEntries.map((e, idx) => (
                      <div key={idx} className="flex items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className="flex-1">
                          <label className="text-[8px] font-bold text-slate-400 block mb-1">БАЛЛ (0-{maxPoints})</label>
                          <input type="number" value={e.points} onChange={val => {
                            const newArr = [...scoreEntries];
                            newArr[idx].points = +val.target.value;
                            setScoreEntries(newArr);
                          }} className="w-full font-black text-blue-600 outline-none" />
                        </div>
                        <div className="h-8 w-px bg-slate-100" />
                        <div className="flex-1">
                          <label className="text-[8px] font-bold text-slate-400 block mb-1">КОЛ-ВО УЧЕНИКОВ</label>
                          <input type="number" value={e.count} onChange={val => {
                            const newArr = [...scoreEntries];
                            newArr[idx].count = +val.target.value;
                            setScoreEntries(newArr);
                          }} className="w-full font-black text-slate-800 outline-none" />
                        </div>
                        <button onClick={() => setScoreEntries(scoreEntries.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex justify-between items-center text-xs font-bold text-slate-400 uppercase">
                    <span>Всего набрано:</span>
                    <span className={enteredCount === presentCount ? 'text-emerald-500' : 'text-amber-500'}>{enteredCount} / {presentCount} уч.</span>
                  </div>
                </div>

                <button onClick={handleTableAnalysis} disabled={loading} className="w-full bg-emerald-600 text-white py-5 rounded-3xl font-black shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95">
                  {loading ? 'Формирование отчета...' : 'Сгенерировать педагогический анализ'}
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-8">
                  <div className="text-center">
                    <div className="text-6xl font-black text-slate-800">{statsCalculated.success}%</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Успеваемость класса</div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl">
                      <span className="text-xs font-bold text-emerald-700">ВЫСОКИЙ УРОВЕНЬ</span>
                      <span className="font-black text-emerald-800">{statsCalculated.high} уч.</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-amber-50 rounded-2xl">
                      <span className="text-xs font-bold text-amber-700">СРЕДНИЙ УРОВЕНЬ</span>
                      <span className="font-black text-amber-800">{statsCalculated.medium} уч.</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-red-50 rounded-2xl">
                      <span className="text-xs font-bold text-red-700">НИЗКИЙ УРОВЕНЬ</span>
                      <span className="font-black text-red-800">{statsCalculated.low} уч.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="bg-white p-10 rounded-[2.5rem] border shadow-2xl animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="flex justify-between items-center mb-8 border-b pb-6">
            <div>
              <h3 className="font-black text-2xl text-slate-800">Результат формирования</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Документ готов к печати • Приказ №130 РК</p>
            </div>
            <button onClick={downloadAsWord} className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all hover:-translate-y-1 active:translate-y-0">
              <span className="text-xl">📄</span> Скачать в Word (.doc)
            </button>
          </div>
          <div ref={resultRef} className="prose prose-slate max-w-none prose-sm selection:bg-blue-100">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default SORSOCHManager;

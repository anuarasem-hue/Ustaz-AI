
import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { generateSORSOCH, analyzeSORWork, analyzeSOR, fetchCurriculumData } from '../services/geminiService';
import { metricsService } from '../services/metricsService';
import { historyService } from '../services/historyService';

interface ScoreEntry {
  points: number;
  count: number;
}

interface CurriculumUnit {
  title: string;
  objectives: string[];
}

const GRADE_SUBJECTS_MAP: Record<string, string[]> = {
  'primary': ['Математика', 'Казахский язык', 'Русский язык', 'Цифровая грамотность', 'Познание мира', 'Естествознание', 'Музыка', 'Художественный труд'],
  'middle': ['Алгебра', 'Геометрия', 'Информатика', 'Физика', 'Химия', 'Биология', 'География', 'История Казахстана', 'Всемирная история', 'Английский язык'],
  'senior': ['Алгебра и начала анализа', 'Физика', 'Химия', 'Биология', 'География', 'Информатика', 'Основы предпринимательства']
};

const AUTO_ONE_HOUR_SUBJECTS = ['Музыка', 'Художественный труд', 'Самопознание', 'Графика и проектирование'];

const SORSOCHManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'analyze_table' | 'analyze_pdf'>('generate');
  const [loading, setLoading] = useState(false);
  const [isCurriculumLoading, setIsCurriculumLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Form State
  const [type, setType] = useState<'SOR' | 'SOCH'>('SOR');
  const [grade, setGrade] = useState('7');
  const [subject, setSubject] = useState('Информатика');
  const [direction, setDirection] = useState<'ЕМЦ' | 'ОГН'>('ЕМЦ');
  const [quarter, setQuarter] = useState('1');
  const [manualOneHour, setManualOneHour] = useState(false);
  const [curriculum, setCurriculum] = useState<CurriculumUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedObjectives, setSelectedObjectives] = useState<string[]>([]);

  // Analysis State
  const [totalStudents, setTotalStudents] = useState(25);
  const [absentStudents, setAbsentStudents] = useState(0);
  const [scoreEntries, setScoreEntries] = useState<ScoreEntry[]>([{ points: 15, count: 5 }]);

  const isSenior = parseInt(grade) >= 10;
  const isOneHour = manualOneHour || AUTO_ONE_HOUR_SUBJECTS.includes(subject);

  // Load Curriculum
  useEffect(() => {
    const load = async () => {
      setIsCurriculumLoading(true);
      try {
        const data = await fetchCurriculumData(subject, grade);
        setCurriculum(data.units || []);
        if (data.units?.length > 0) {
          setSelectedUnit(data.units[0].title);
          setSelectedObjectives([]);
        }
      } catch (err) { console.error(err); }
      setIsCurriculumLoading(false);
    };
    load();
    // Reset manual toggle on subject change
    if (AUTO_ONE_HOUR_SUBJECTS.includes(subject)) {
      setManualOneHour(true);
    } else {
      setManualOneHour(false);
    }
  }, [subject, grade]);

  // Adjust type based on load
  useEffect(() => {
    if (isOneHour && type === 'SOCH') setType('SOR');
  }, [isOneHour, type]);

  const handleObjToggle = (obj: string) => {
    setSelectedObjectives(prev => 
      prev.includes(obj) ? prev.filter(i => i !== obj) : [...prev, obj]
    );
  };

  const handleGenerate = async () => {
    if (type === 'SOR' && selectedObjectives.length === 0) {
      return alert('Выберите хотя бы одну цель обучения для СОР!');
    }
    
    setLoading(true);
    const start = Date.now();
    try {
      const content = await generateSORSOCH({
        type, 
        subject, 
        grade, 
        unit: type === 'SOR' ? selectedUnit : 'Итоговый за четверть',
        objectives: type === 'SOR' ? selectedObjectives : [],
        direction: isSenior ? direction : undefined,
        quarter
      });
      setResult(content);
      metricsService.saveGeneration(type, Date.now() - start);
      historyService.save({ 
        type, 
        subject, 
        grade, 
        topic: type === 'SOR' ? selectedUnit : `${quarter}-я четверть`, 
        content 
      });
    } catch (e) { alert('Ошибка генерации'); }
    setLoading(false);
  };

  const handleAnalysis = async () => {
    setLoading(true);
    const statsStr = `Тип: ${type}, Класс: ${grade}, Всего: ${totalStudents}, Отсутствует: ${absentStudents}, Распределение баллов: ${scoreEntries.map(s => `${s.points}б:${s.count}чел`).join(', ')}`;
    try {
      const content = await analyzeSOR(statsStr);
      setResult(content);
    } catch (e) { alert('Ошибка анализа'); }
    setLoading(false);
  };

  const downloadWord = () => {
    if (!resultRef.current) return;
    const content = resultRef.current.innerHTML;
    const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Document_${subject}_${grade}.doc`;
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="flex bg-slate-50 border-b">
          <button onClick={() => setActiveTab('generate')} className={`px-8 py-4 font-bold text-sm ${activeTab === 'generate' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Генератор</button>
          <button onClick={() => setActiveTab('analyze_table')} className={`px-8 py-4 font-bold text-sm ${activeTab === 'analyze_table' ? 'bg-white text-blue-600 border-b-2 border-blue-600' : 'text-slate-400'}`}>Анализ (Ведомость)</button>
        </div>

        <div className="p-8">
          {activeTab === 'generate' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <button onClick={() => setType('SOR')} className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${type === 'SOR' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'border-slate-100 text-slate-400'}`}>СОР (Раздел)</button>
                  <button 
                    onClick={() => setType('SOCH')} 
                    disabled={isOneHour}
                    className={`flex-1 py-3 rounded-xl font-bold border-2 transition-all ${type === 'SOCH' ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'border-slate-100 text-slate-400 disabled:opacity-30'}`}
                  >
                    СОЧ (Четверть)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Класс</label>
                    <select value={grade} onChange={e => setGrade(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                      {[...Array(11)].map((_, i) => <option key={i+1} value={i+1}>{i+1} класс</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Четверть</label>
                    <select value={quarter} onChange={e => setQuarter(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500">
                      {[1,2,3,4].map(q => <option key={q} value={q}>{q} четверть</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                   <input 
                    type="checkbox" 
                    id="onehour" 
                    checked={manualOneHour} 
                    onChange={e => setManualOneHour(e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                   />
                   <label htmlFor="onehour" className="text-xs font-medium text-slate-700 cursor-pointer">
                     Предмет ведется 1 час в неделю (СОЧ не проводится)
                   </label>
                </div>

                {isSenior && (
                  <div className="flex gap-4">
                    <button onClick={() => setDirection('ЕМЦ')} className={`flex-1 py-2 rounded-lg font-bold text-xs border ${direction === 'ЕМЦ' ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 text-slate-400'}`}>ЕМЦ</button>
                    <button onClick={() => setDirection('ОГН')} className={`flex-1 py-2 rounded-lg font-bold text-xs border ${direction === 'ОГН' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 text-slate-400'}`}>ОГН</button>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Предмет</label>
                    <select value={subject} onChange={e => setSubject(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl font-bold">
                      {Object.values(GRADE_SUBJECTS_MAP).flat().map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {type === 'SOR' ? (
                    <>
                      <div className="space-y-1 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase flex justify-between">
                          Раздел 
                          {isCurriculumLoading && <span className="animate-pulse text-blue-500">Загрузка...</span>}
                        </label>
                        <select value={selectedUnit} onChange={e => setSelectedUnit(e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl outline-none">
                          {curriculum.map(u => <option key={u.title} value={u.title}>{u.title}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Выберите цели обучения (ЦО)</label>
                        <div className="max-h-48 overflow-y-auto border rounded-xl p-4 bg-slate-50 space-y-2 custom-scrollbar">
                          {curriculum.find(u => u.title === selectedUnit)?.objectives.map(obj => (
                            <label key={obj} className="flex items-start gap-3 cursor-pointer p-2 hover:bg-white rounded-lg transition-colors">
                              <input type="checkbox" checked={selectedObjectives.includes(obj)} onChange={() => handleObjToggle(obj)} className="mt-1 accent-blue-600" />
                              <span className="text-xs text-slate-700">{obj}</span>
                            </label>
                          )) || <div className="text-xs text-slate-400 italic">Цели обучения не найдены. Вы можете сгенерировать СОЧ или попробовать другой предмет.</div>}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                      <p className="text-xs text-emerald-800 font-medium">
                        ✨ <strong>СОЧ по предмету "{subject}"</strong> генерируется за всю <strong>{quarter}-ю четверть</strong>. 
                        Система сформирует спецификацию строго на <strong>25 баллов</strong> согласно Приказу №130.
                      </p>
                    </div>
                  )}
                </div>

                <button onClick={handleGenerate} disabled={loading} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-black transition-all flex justify-center items-center gap-3 active:scale-95 disabled:opacity-50">
                  {loading ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : `Сгенерировать ${type === 'SOR' ? 'СОР' : 'СОЧ'} (Приказ №130)`}
                </button>
              </div>

              <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xl font-bold">!</div>
                  <h4 className="font-bold text-slate-800">Стандарты качества РК</h4>
                </div>
                <ul className="space-y-4">
                  <li className="flex gap-3 text-xs text-slate-600">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Баллы распределяются согласно уровню сложности: от репродуктивных до аналитических.</span>
                  </li>
                  <li className="flex gap-3 text-xs text-slate-600">
                    <span className="text-emerald-500 font-bold">✓</span>
                    <span>Для каждого задания формируется дескриптор, понятный ученику и родителю.</span>
                  </li>
                  {type === 'SOCH' && (
                    <li className="flex gap-3 text-xs text-slate-600">
                      <span className="text-blue-500 font-bold">ℹ</span>
                      <span>Для СОЧ спецификация охватывает все разделы за четверть. <strong>Сумма баллов: ровно 25.</strong></span>
                    </li>
                  )}
                  {isOneHour && (
                    <li className="p-3 bg-amber-100 text-amber-800 rounded-xl font-bold animate-pulse text-xs">
                      ⚠️ Внимание: Для предметов с нагрузкой 1 час/неделя СОЧ не предусмотрен. Будет сгенерирован СОР.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'analyze_table' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Учеников в классе</label>
                    <input type="number" value={totalStudents} onChange={e => setTotalStudents(+e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Отсутствовало</label>
                    <input type="number" value={absentStudents} onChange={e => setAbsentStudents(+e.target.value)} className="w-full p-3 bg-slate-50 border rounded-xl text-red-500 font-bold" />
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h5 className="font-bold text-slate-700">Распределение баллов</h5>
                    <button onClick={() => setScoreEntries([...scoreEntries, { points: 0, count: 0 }])} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg shadow-sm hover:bg-blue-700 transition-all">+ Добавить балл</button>
                  </div>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                    {scoreEntries.map((e, i) => (
                      <div key={i} className="flex gap-4 items-center animate-in slide-in-from-left-2 duration-200" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex-1">
                          <input type="number" placeholder="Балл" value={e.points} onChange={v => {
                            const n = [...scoreEntries]; n[i].points = +v.target.value; setScoreEntries(n);
                          }} className="w-full p-2 border rounded-lg text-sm bg-white" />
                        </div>
                        <div className="flex-1">
                          <input type="number" placeholder="Кол-во" value={e.count} onChange={v => {
                            const n = [...scoreEntries]; n[i].count = +v.target.value; setScoreEntries(n);
                          }} className="w-full p-2 border rounded-lg text-sm bg-white" />
                        </div>
                        <button onClick={() => setScoreEntries(scoreEntries.filter((_, idx) => idx !== i))} className="text-red-400 px-2 hover:text-red-600 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={handleAnalysis} disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50">
                  {loading ? 'Обработка...' : 'Сформировать педагогический анализ'}
                </button>
              </div>

              <div className="flex items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center">
                 <div className="max-w-xs">
                    <div className="text-6xl mb-4 grayscale opacity-50">📊</div>
                    <h4 className="font-bold text-slate-800">Автоматический отчет</h4>
                    <p className="text-slate-400 text-xs mt-2 leading-relaxed">Введите данные из бумажного журнала или ведомости для получения мгновенного анализа качества знаний согласно стандартам РК.</p>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="bg-white p-10 rounded-[2.5rem] border shadow-2xl animate-in slide-in-from-bottom-6 duration-700">
          <div className="flex justify-between items-center mb-8 border-b pb-6">
            <div>
              <h3 className="font-black text-2xl text-slate-800">Готовый документ</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Приказ №130 МП РК • Система оценивания</p>
            </div>
            <button onClick={downloadWord} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 shadow-xl transition-all transform hover:-translate-y-1">
              <span>📄</span> Экспорт (.doc)
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

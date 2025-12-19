
import React, { useState } from 'react';
import { analyzeSOR } from '../services/geminiService';
import { metricsService } from '../services/metricsService';

const SORAnalyst: React.FC = () => {
  const [five, setFive] = useState(5);
  const [four, setFour] = useState(10);
  const [three, setThree] = useState(3);
  const [two, setTwo] = useState(0);
  const [qualitative, setQualitative] = useState('Учащиеся хорошо справились с задачей на циклы, но 5 человек ошиблись в условии выхода из цикла.');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const total = five + four + three + two;
  const quality = total > 0 ? Math.round(((five + four) / total) * 100) : 0;
  const success = total > 0 ? Math.round(((five + four + three) / total) * 100) : 0;

  const handleAnalyze = async () => {
    setIsLoading(true);
    const startTime = Date.now();
    const statsStr = `5: ${five}, 4: ${four}, 3: ${three}, 2: ${two}, Итого: ${total}, Качество: ${quality}%, Успеваемость: ${success}%`;
    try {
      const report = await analyzeSOR(statsStr, qualitative);
      const duration = Date.now() - startTime;
      metricsService.saveGeneration('SOR', duration);
      setAnalysis(report);
    } catch (error) {
      console.error(error);
      alert('Ошибка анализа');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-800 border-b pb-4">Ввод данных оценок</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Оценка "5"</label>
              <input type="number" value={five} onChange={e => setFive(Number(e.target.value))} className="w-full p-2 bg-slate-50 border rounded-lg" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Оценка "4"</label>
              <input type="number" value={four} onChange={e => setFour(Number(e.target.value))} className="w-full p-2 bg-slate-50 border rounded-lg" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Оценка "3"</label>
              <input type="number" value={three} onChange={e => setThree(Number(e.target.value))} className="w-full p-2 bg-slate-50 border rounded-lg" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Оценка "2"</label>
              <input type="number" value={two} onChange={e => setTwo(Number(e.target.value))} className="w-full p-2 bg-slate-50 border rounded-lg" />
            </div>
          </div>
          <button 
            onClick={handleAnalyze}
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all"
          >
            {isLoading ? 'Анализируем...' : 'Сформировать Анализ'}
          </button>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-center text-center space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-blue-50 rounded-2xl">
                <div className="text-3xl font-black text-blue-700">{quality}%</div>
                <div className="text-xs font-medium text-blue-500">Качество</div>
             </div>
             <div className="p-4 bg-emerald-50 rounded-2xl">
                <div className="text-3xl font-black text-emerald-700">{success}%</div>
                <div className="text-xs font-medium text-emerald-500">Успеваемость</div>
             </div>
          </div>
        </div>
      </div>

      {analysis && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
          <div className="prose prose-sm prose-emerald max-w-none whitespace-pre-wrap bg-slate-50 p-6 rounded-xl">
            {analysis}
          </div>
        </div>
      )}
    </div>
  );
};

export default SORAnalyst;

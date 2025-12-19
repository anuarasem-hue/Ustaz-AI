
import React, { useState } from 'react';
import { generateParentMessage } from '../services/geminiService';
import { metricsService } from '../services/metricsService';

const Communicator: React.FC = () => {
  const [studentName, setStudentName] = useState('');
  const [issue, setIssue] = useState('');
  const [positive, setPositive] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!studentName || !issue) return;
    setIsLoading(true);
    const startTime = Date.now();
    try {
      const msg = await generateParentMessage(studentName, issue, positive || 'в целом старается');
      const duration = Date.now() - startTime;
      metricsService.saveGeneration('COMM', duration);
      setResult(msg);
    } catch (error) {
      console.error(error);
      alert('Ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="space-y-4">
          <input 
            type="text" 
            value={studentName}
            onChange={e => setStudentName(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
            placeholder="Имя ученика"
          />
          <textarea 
            rows={3}
            value={issue}
            onChange={e => setIssue(e.target.value)}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl resize-none"
            placeholder="Суть проблемы"
          />
        </div>
        <button 
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all"
        >
          {isLoading ? 'Генерируем...' : 'Сгенерировать сообщение'}
        </button>
      </div>

      {result && (
        <div className="bg-[#e7fed2] p-6 rounded-3xl border border-[#c1e6a1] animate-in zoom-in-95 duration-300">
           <div className="text-slate-800 text-sm leading-relaxed italic">{result}</div>
        </div>
      )}
    </div>
  );
};

export default Communicator;

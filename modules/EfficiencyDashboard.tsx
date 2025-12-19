
import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { metricsService } from '../services/metricsService';
import { historyService } from '../services/historyService';

const EfficiencyDashboard: React.FC = () => {
  const [stats, setStats] = useState(metricsService.getStats());
  const [history, setHistory] = useState(historyService.getAll());

  useEffect(() => {
    const update = () => {
      setStats(metricsService.getStats());
      setHistory(historyService.getAll());
    };
    window.addEventListener('metricsUpdated', update);
    window.addEventListener('historyUpdated', update);
    return () => {
      window.removeEventListener('metricsUpdated', update);
      window.removeEventListener('historyUpdated', update);
    };
  }, []);

  const totalAiTimeSec = stats.recent.reduce((acc, m) => acc + (m.durationMs / 1000), 0);
  const totalManualTimeMin = stats.recent.reduce((acc, m) => acc + m.manualEstimateMin, 0);

  const chartData = [
    { name: 'Ручной труд', value: totalManualTimeMin, color: '#94a3b8', unit: 'мин' },
    { name: 'Ustaz-AI', value: Math.round(totalAiTimeSec / 60 * 10) / 10, color: '#3b82f6', unit: 'мин' }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2rem] border shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Сэкономлено времени</p>
          <p className="text-5xl font-black text-blue-600 mt-4">
            {stats.timeSavedMin > 60 
              ? `${Math.floor(stats.timeSavedMin / 60)}ч ${stats.timeSavedMin % 60}м` 
              : `${stats.timeSavedMin}м`}
          </p>
          <div className="mt-6 flex items-center text-[10px] text-emerald-600 font-bold bg-emerald-50 w-fit px-3 py-1 rounded-full border border-emerald-100">
             ⚡️ На {stats.count24h} работах
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] border shadow-sm flex flex-col justify-between">
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Средняя скорость ИИ</p>
          <p className="text-4xl font-black text-slate-800 mt-4">~{Math.round(totalAiTimeSec / (stats.count24h || 1))} сек</p>
          <p className="text-[10px] text-slate-400 mt-4 font-bold italic">Против 40-60 минут вручную</p>
        </div>

        <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl shadow-slate-200">
          <p className="text-blue-400 text-xs font-black uppercase tracking-widest">Активные файлы (3ч)</p>
          <p className="text-5xl font-black mt-4">{history.length}</p>
          <p className="text-[10px] text-slate-500 mt-4 font-bold uppercase">Документы готовы к экспорту</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm">
          <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
            Сравнение затрат времени <span className="text-xs font-normal text-slate-400">(в минутах)</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{top: 0, right: 30, left: 0, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 700}} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold'}}
                />
                <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={50}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-10 rounded-[2.5rem] border shadow-sm flex flex-col justify-center">
          <h3 className="text-xl font-black text-slate-800 mb-6">Почему Ustaz-AI?</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold shrink-0">1</div>
              <p className="text-sm text-slate-600 leading-relaxed"><span className="font-bold text-slate-800">Стандарты Приказа №130:</span> Все документы формируются строго по государственным требованиям РК.</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold shrink-0">2</div>
              <p className="text-sm text-slate-600 leading-relaxed"><span className="font-bold text-slate-800">Мультимодальность:</span> Мы анализируем не только цифры, но и сканы реальных работ учеников через Gemini Vision.</p>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold shrink-0">3</div>
              <p className="text-sm text-slate-600 leading-relaxed"><span className="font-bold text-slate-800">Экономия ресурса:</span> Учитель освобождается от рутинной верстки таблиц дескрипторов.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EfficiencyDashboard;


import React, { useEffect, useState } from 'react';
import { AppView } from '../types';
import { metricsService } from '../services/metricsService';
import { historyService, StoredItem } from '../services/historyService';

interface LayoutProps {
  children: React.ReactNode;
  activeView: AppView;
  onViewChange: (view: AppView) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeView, onViewChange }) => {
  const [savedTime, setSavedTime] = useState(metricsService.getStats().timeSavedMin);
  const [history, setHistory] = useState<StoredItem[]>([]);

  useEffect(() => {
    const update = () => {
      setSavedTime(metricsService.getStats().timeSavedMin);
      setHistory(historyService.getAll());
    };
    window.addEventListener('metricsUpdated', update);
    window.addEventListener('historyUpdated', update);
    update();
    const interval = setInterval(update, 60000);
    return () => {
      window.removeEventListener('metricsUpdated', update);
      window.removeEventListener('historyUpdated', update);
      clearInterval(interval);
    };
  }, []);

  const menuItems = [
    { id: AppView.DASHBOARD, label: 'Дашборд', icon: '📊' },
    { id: AppView.KSP, label: 'Генератор КСП', icon: '📝' },
    { id: AppView.SOR_SOCH, label: 'СОР / СОЧ', icon: '🎯' },
    { id: AppView.COMMUNICATOR, label: 'Коммуникатор', icon: '💬' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-black bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Ustaz-AI</h1>
          <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Office v2.5</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 ${
                activeView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 translate-x-2' 
                  : 'hover:bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-bold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 bg-slate-800/20">
          <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">История за 3ч:</div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
            {history.slice(0, 5).map(h => (
              <div key={h.id} className="p-2 bg-slate-800 rounded-lg text-[10px] truncate cursor-pointer hover:bg-slate-700 transition-colors">
                <span className="text-blue-400 font-bold">[{h.type}]</span> {h.topic || h.subject}
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 shadow-sm z-10">
          <div>
            <h2 className="text-xl font-black text-slate-800">{menuItems.find(i => i.id === activeView)?.label}</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Казахстан • Приказ №130</p>
          </div>
          <div className="flex items-center space-x-6">
             <div className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 hidden md:block">
               <span className="text-xs font-bold text-emerald-700">⏱ Сэкономлено: ~{savedTime} мин</span>
             </div>
             <div className="flex items-center gap-3">
               <div className="text-right">
                 <div className="text-xs font-bold text-slate-800 uppercase">Учитель</div>
                 <div className="text-[10px] text-slate-400">ID: 48102</div>
               </div>
               <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-lg">U</div>
             </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-10 bg-slate-50/50">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;

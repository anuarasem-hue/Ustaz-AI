
export interface StoredItem {
  id: string;
  type: 'KSP' | 'SOR' | 'SOCH' | 'ANALYSIS';
  topic: string;
  subject: string;
  grade: string;
  content: string;
  timestamp: number;
}

const STORAGE_KEY = 'ustaz_ai_combined_history';
const TTL_MS = 3 * 60 * 60 * 1000;

export const historyService = {
  save: (item: Omit<StoredItem, 'id' | 'timestamp'>) => {
    const history = historyService.getAll();
    const newItem: StoredItem = {
      ...item,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    };
    history.unshift(newItem);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    window.dispatchEvent(new Event('historyUpdated'));
  },

  getAll: (): StoredItem[] => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as StoredItem[];
      const now = Date.now();
      return parsed.filter(item => (now - item.timestamp) < TTL_MS);
    } catch { return []; }
  }
};

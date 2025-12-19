
import { GenerationMetric, GenerationType } from '../types';

const STORAGE_KEY = 'ustaz_ai_metrics';

// Fixed missing properties SOCH and ANALYSIS in MANUAL_ESTIMATES mapping
const MANUAL_ESTIMATES: Record<GenerationType, number> = {
  KSP: 40,
  SOR: 60,
  SOCH: 60,
  ANALYSIS: 30,
  COMM: 10
};

export const metricsService = {
  saveGeneration: (type: GenerationType, durationMs: number) => {
    const metrics = metricsService.getAll();
    const newMetric: GenerationMetric = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      timestamp: Date.now(),
      durationMs,
      manualEstimateMin: MANUAL_ESTIMATES[type]
    };
    metrics.push(newMetric);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
    // Trigger local event for header update
    window.dispatchEvent(new Event('metricsUpdated'));
  },

  getAll: (): GenerationMetric[] => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as GenerationMetric[];
      // Filter out data older than 24 hours
      const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
      return parsed.filter(m => m.timestamp > dayAgo);
    } catch {
      return [];
    }
  },

  getStats: () => {
    const recent = metricsService.getAll();
    const totalSavedMin = recent.reduce((acc, m) => {
      const aiTimeMin = m.durationMs / 60000;
      return acc + (m.manualEstimateMin - aiTimeMin);
    }, 0);

    const lastGen = recent.length > 0 ? recent[recent.length - 1] : null;

    return {
      count24h: recent.length,
      timeSavedMin: Math.round(totalSavedMin),
      lastGenDurationSec: lastGen ? Math.round(lastGen.durationMs / 1000) : 0,
      lastGenType: lastGen ? lastGen.type : null,
      recent
    };
  }
};

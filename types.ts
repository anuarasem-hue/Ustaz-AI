
export enum AppView {
  DASHBOARD = 'DASHBOARD',
  KSP = 'KSP',
  SOR_SOCH = 'SOR_SOCH',
  COMMUNICATOR = 'COMMUNICATOR'
}

export type GenerationType = 'KSP' | 'SOR' | 'SOCH' | 'ANALYSIS' | 'COMM';

export interface GenerationMetric {
  id: string;
  type: GenerationType;
  timestamp: number;
  durationMs: number;
  manualEstimateMin: number;
}

export interface SORSOCHItem {
  id: string;
  type: 'SOR' | 'SOCH';
  subject: string;
  topic: string;
  grade: string;
  content: string;
  timestamp: number;
}

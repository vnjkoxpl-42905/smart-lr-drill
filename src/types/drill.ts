// Drill mode types and interfaces

export type DrillMode = 'adaptive' | 'full-section' | 'type-drill';

export type TimerMode = '35' | '52.5' | '70' | 'custom' | 'unlimited';

export interface TimerConfig {
  mode: TimerMode;
  customMinutes?: number;
  isPaused: boolean;
  elapsedMs: number;
  startedAt: number;
}

export interface FullSectionConfig {
  pt: number;
  section: number;
  timer: TimerConfig;
}

export interface TypeDrillConfig {
  qtypes: string[];
  difficulties: number[];
  pts: number[];
  count: number; // number of questions to drill
}

export interface DrillSession {
  mode: DrillMode;
  fullSectionConfig?: FullSectionConfig;
  typeDrillConfig?: TypeDrillConfig;
  questionQueue: string[]; // qids
  currentIndex: number;
  redoQueue: string[]; // qids marked for redo
  attempts: Map<string, {
    selectedAnswer: string;
    correct: boolean;
    timeMs: number;
    timestamp: number;
    confidence?: number; // 1-5
    reviewDone?: boolean;
  }>;
}

export interface DrillSummary {
  totalQuestions: number;
  answered: number;
  correct: number;
  avgTimeMs: number;
  byDifficulty: Record<number, { correct: number; total: number }>;
  byQType: Record<string, { correct: number; total: number }>;
}

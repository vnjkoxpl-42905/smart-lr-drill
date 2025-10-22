// Drill mode types and interfaces

export type DrillMode = 'adaptive' | 'full-section' | 'type-drill' | 'natural-drill';

export type { Highlight, HighlightColor } from '@/lib/highlightUtils';

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
  selectedQids?: string[]; // optional pre-selected question IDs
}

export interface DrillSession {
  mode: DrillMode;
  fullSectionConfig?: FullSectionConfig;
  typeDrillConfig?: TypeDrillConfig;
  questionQueue: string[]; // qids
  currentIndex: number;
  attempts: Map<string, {
    selectedAnswer: string;
    correct: boolean;
    timeMs: number;
    timestamp: number;
    confidence?: number; // 1-5
    reviewDone?: boolean;
    brMarked?: boolean; // Marked for Blind Review
    switchCount?: number; // Number of answer changes
    revisitCount?: number; // Number of times returned to question
  }>;
  sessionId?: string; // For tracking BR sessions
}

// Unified Blind Review Result interface
export interface BlindReviewResult {
  qid: string;
  preAnswer: string;
  brAnswer: string;
  brRationale: string;
  brTimeMs: number;
  brChanged: boolean;
  correct: boolean;
  preCorrect: boolean;
  switchCount?: number;
  revisitCount?: number;
}

export interface DrillSummary {
  totalQuestions: number;
  answered: number;
  correct: number;
  avgTimeMs: number;
  byDifficulty: Record<number, { correct: number; total: number }>;
  byQType: Record<string, { correct: number; total: number }>;
}

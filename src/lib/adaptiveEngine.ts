// Deterministic adaptive question selection engine

import { LRQuestion } from './questionLoader';
import { supabase } from '@/integrations/supabase/client';

export interface StudentAbility {
  overall: number;
  byQType: Record<string, number>;
}

export interface AttemptRecord {
  qid: string;
  correct: boolean;
  time_ms: number;
  qtype: string;
  difficulty: number;
  timestamp: Date;
}

export interface WeakAreaAnalysis {
  weakQTypes: string[];
  weakDifficulties: number[];
  recommendedSize: number;
  explanation: string;
  sampleSize: number;
}

export class AdaptiveEngine {
  private cooldowns: Map<string, Date> = new Map();
  private recentAttempts: AttemptRecord[] = [];

  // Epsilon-greedy selection
  selectNextQuestion(
    pool: LRQuestion[],
    ability: StudentAbility,
    exploreRatio: number = 0.15
  ): LRQuestion | null {
    if (pool.length === 0) return null;

    // Filter out recently attempted (cooldown)
    const now = new Date();
    const eligible = pool.filter((q) => {
      const lastSeen = this.cooldowns.get(q.qid);
      if (!lastSeen) return true;
      const hoursSince = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
      return hoursSince > 2; // 2-hour cooldown
    });

    if (eligible.length === 0) return pool[0]; // Fallback

    // Explore vs exploit
    const explore = Math.random() < exploreRatio;
    
    if (explore) {
      // Random selection for exploration
      return eligible[Math.floor(Math.random() * eligible.length)];
    }

    // Exploit: find question closest to target difficulty
    const targetDifficulty = Math.max(1, Math.min(5, Math.round(ability.overall)));
    
    let best: LRQuestion | null = null;
    let bestScore = -Infinity;

    for (const q of eligible) {
      // Prefer questions matching target difficulty
      const difficultyMatch = -Math.abs(q.difficulty - targetDifficulty);
      
      // Prefer weaker question types
      const qtypeAbility = ability.byQType[q.qtype] || ability.overall;
      const qtypeWeight = -qtypeAbility;
      
      const score = difficultyMatch * 2 + qtypeWeight;
      
      if (score > bestScore) {
        bestScore = score;
        best = q;
      }
    }

    return best || eligible[0];
  }

  recordAttempt(attempt: AttemptRecord): void {
    this.recentAttempts.push(attempt);
    this.cooldowns.set(attempt.qid, attempt.timestamp);
    
    // Keep only recent 100 attempts
    if (this.recentAttempts.length > 100) {
      this.recentAttempts.shift();
    }
  }

  calculateAbility(attempts: AttemptRecord[]): StudentAbility {
    if (attempts.length === 0) {
      return {
        overall: 3,
        byQType: {},
      };
    }

    // Simple ability estimation based on recent performance
    const recent = attempts.slice(-20); // Last 20 attempts
    const correctCount = recent.filter((a) => a.correct).length;
    const accuracy = correctCount / recent.length;

    // Base ability (1-5 scale)
    let overall = 1 + accuracy * 4;

    // Adjust for average difficulty of correct answers
    const correctAttempts = recent.filter((a) => a.correct);
    if (correctAttempts.length > 0) {
      const avgDifficulty = correctAttempts.reduce((sum, a) => sum + a.difficulty, 0) / correctAttempts.length;
      overall = (overall + avgDifficulty) / 2;
    }

    overall = Math.max(1, Math.min(5, overall));

    // Calculate per-qtype ability
    const byQType: Record<string, number> = {};
    const byQTypeAttempts: Record<string, AttemptRecord[]> = {};

    for (const a of recent) {
      if (!byQTypeAttempts[a.qtype]) {
        byQTypeAttempts[a.qtype] = [];
      }
      byQTypeAttempts[a.qtype].push(a);
    }

    for (const [qtype, qtypeAttempts] of Object.entries(byQTypeAttempts)) {
      const qtypeCorrect = qtypeAttempts.filter((a) => a.correct).length;
      const qtypeAccuracy = qtypeCorrect / qtypeAttempts.length;
      byQType[qtype] = 1 + qtypeAccuracy * 4;
    }

    return { overall, byQType };
  }

  async analyzeWeakAreas(classId: string): Promise<WeakAreaAnalysis | null> {
    try {
      const { data: attempts, error } = await supabase
        .from('attempts')
        .select('qtype, level, correct, timestamp_iso')
        .eq('class_id', classId)
        .order('timestamp_iso', { ascending: false })
        .limit(100);

      if (error || !attempts || attempts.length < 10) {
        return null; // Not enough data
      }

      // Calculate accuracy by question type
      const qtypeStats: Record<string, { correct: number; total: number }> = {};
      attempts.forEach(a => {
        if (!qtypeStats[a.qtype]) {
          qtypeStats[a.qtype] = { correct: 0, total: 0 };
        }
        qtypeStats[a.qtype].total++;
        if (a.correct) qtypeStats[a.qtype].correct++;
      });

      // Find weakest question types (accuracy < 60% and at least 5 attempts)
      const weakQTypes = Object.entries(qtypeStats)
        .filter(([_, stats]) => stats.total >= 5)
        .map(([qtype, stats]) => ({
          qtype,
          accuracy: stats.correct / stats.total,
          total: stats.total,
        }))
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 3)
        .filter(q => q.accuracy < 0.6)
        .map(q => q.qtype);

      // Calculate accuracy by difficulty (using 'level' field)
      const diffStats: Record<number, { correct: number; total: number }> = {};
      attempts.forEach(a => {
        if (!diffStats[a.level]) {
          diffStats[a.level] = { correct: 0, total: 0 };
        }
        diffStats[a.level].total++;
        if (a.correct) diffStats[a.level].correct++;
      });

      // Find difficulty range where accuracy dips
      const weakDifficulties = Object.entries(diffStats)
        .filter(([_, stats]) => stats.total >= 3)
        .map(([diff, stats]) => ({
          diff: parseInt(diff),
          accuracy: stats.correct / stats.total,
        }))
        .filter(d => d.accuracy < 0.65)
        .map(d => d.diff);

      // Generate explanation
      const qtypeList = weakQTypes.length > 0 
        ? weakQTypes.join(', ')
        : 'various types';
      const diffRange = weakDifficulties.length > 0
        ? `levels ${Math.min(...weakDifficulties)}-${Math.max(...weakDifficulties)}`
        : 'mixed difficulties';

      return {
        weakQTypes: weakQTypes.length > 0 ? weakQTypes : [],
        weakDifficulties: weakDifficulties.length > 0 ? weakDifficulties : [2, 3, 4],
        recommendedSize: Math.min(20, Math.max(10, Math.floor(attempts.length / 5))),
        explanation: `Based on your last ${attempts.length} attempts, focusing on ${qtypeList} at ${diffRange} will help strengthen your weak areas.`,
        sampleSize: attempts.length,
      };
    } catch (err) {
      console.error('Error analyzing weak areas:', err);
      return null;
    }
  }
}

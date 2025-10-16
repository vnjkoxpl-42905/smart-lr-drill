// Deterministic adaptive question selection engine

import { LRQuestion } from './questionLoader';

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
}

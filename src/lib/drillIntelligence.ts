// Advanced drill intelligence and pattern detection

import { supabase } from '@/integrations/supabase/client';

export interface DrillRecommendation {
  title: string;
  description: string;
  config: {
    qtypes: string[];
    difficulties: number[];
    pts: number[];
    count: number;
  };
  priority: 'high' | 'medium' | 'low';
  reasoning: string;
  confidence: number; // 0-1
}

export interface LearningPattern {
  type: 'time_of_day' | 'fatigue' | 'stimulus_length' | 'improvement_trend';
  description: string;
  confidence: number;
  data: Record<string, any>;
}

export interface LearningVelocity {
  qtype: string;
  improvementRate: number; // % per session
  sessionsToMastery: number; // estimated
  currentMastery: number; // 0-1
  breakthroughMoments: Date[];
}

export class DrillIntelligence {
  /**
   * Detect patterns in user performance
   */
  async detectPatterns(classId: string): Promise<LearningPattern[]> {
    const { data: attempts, error } = await supabase
      .from('attempts')
      .select('*')
      .eq('class_id', classId)
      .order('timestamp_iso', { ascending: true })
      .limit(200);

    if (error || !attempts || attempts.length < 20) {
      return [];
    }

    const patterns: LearningPattern[] = [];

    // 1. Time of day pattern
    const timePattern = this.detectTimeOfDayPattern(attempts);
    if (timePattern) patterns.push(timePattern);

    // 2. Fatigue detection
    const fatiguePattern = this.detectFatigue(attempts);
    if (fatiguePattern) patterns.push(fatiguePattern);

    // 3. Stimulus length sensitivity
    const stimulusPattern = this.detectStimulusLengthSensitivity(attempts);
    if (stimulusPattern) patterns.push(stimulusPattern);

    // 4. Improvement trends
    const improvementPattern = this.detectImprovementTrend(attempts);
    if (improvementPattern) patterns.push(improvementPattern);

    return patterns;
  }

  /**
   * Generate personalized drill recommendations
   */
  async generateRecommendations(classId: string): Promise<DrillRecommendation[]> {
    const { data: attempts, error } = await supabase
      .from('attempts')
      .select('*')
      .eq('class_id', classId)
      .order('timestamp_iso', { ascending: false })
      .limit(100);

    if (error || !attempts || attempts.length < 15) {
      return [{
        title: "Build Foundation",
        description: "Practice a variety of question types to establish baseline performance",
        config: {
          qtypes: [],
          difficulties: [1, 2, 3],
          pts: [],
          count: 15,
        },
        priority: 'high',
        reasoning: "You need more practice data to generate personalized recommendations.",
        confidence: 0.5,
      }];
    }

    const recommendations: DrillRecommendation[] = [];

    // 1. Weak area drilling
    const weakAreas = this.identifyWeakAreas(attempts);
    if (weakAreas.qtypes.length > 0) {
      recommendations.push({
        title: "Target Weak Areas",
        description: `Focus on ${weakAreas.qtypes.slice(0, 3).join(', ')}`,
        config: {
          qtypes: weakAreas.qtypes.slice(0, 3),
          difficulties: weakAreas.difficulties,
          pts: [],
          count: 20,
        },
        priority: 'high',
        reasoning: `Your accuracy is below 60% on these question types. Focused practice will help.`,
        confidence: weakAreas.confidence,
      });
    }

    // 2. Difficulty progression
    const progressionRec = this.suggestDifficultyProgression(attempts);
    if (progressionRec) {
      recommendations.push(progressionRec);
    }

    // 3. Breadth maintenance
    const breadthRec = this.suggestBreadthPractice(attempts);
    if (breadthRec) {
      recommendations.push(breadthRec);
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Track learning velocity per question type
   */
  async trackLearningVelocity(classId: string): Promise<LearningVelocity[]> {
    const { data: attempts, error } = await supabase
      .from('attempts')
      .select('*')
      .eq('class_id', classId)
      .order('timestamp_iso', { ascending: true });

    if (error || !attempts || attempts.length < 30) {
      return [];
    }

    const velocities: LearningVelocity[] = [];
    const byQType = this.groupByQType(attempts);

    for (const [qtype, qtypeAttempts] of Object.entries(byQType)) {
      if (qtypeAttempts.length < 10) continue;

      const velocity = this.calculateVelocity(qtype, qtypeAttempts);
      velocities.push(velocity);
    }

    return velocities.sort((a, b) => a.sessionsToMastery - b.sessionsToMastery);
  }

  // Private helper methods

  private detectTimeOfDayPattern(attempts: any[]): LearningPattern | null {
    const byHour: Record<number, { correct: number; total: number }> = {};

    attempts.forEach(a => {
      const hour = new Date(a.timestamp_iso).getHours();
      if (!byHour[hour]) byHour[hour] = { correct: 0, total: 0 };
      byHour[hour].total++;
      if (a.correct) byHour[hour].correct++;
    });

    const hourStats = Object.entries(byHour)
      .map(([hour, stats]) => ({
        hour: parseInt(hour),
        accuracy: stats.correct / stats.total,
        total: stats.total,
      }))
      .filter(s => s.total >= 5);

    if (hourStats.length < 3) return null;

    const avgAccuracy = hourStats.reduce((sum, s) => sum + s.accuracy, 0) / hourStats.length;
    const bestHours = hourStats.filter(s => s.accuracy > avgAccuracy + 0.1);
    const worstHours = hourStats.filter(s => s.accuracy < avgAccuracy - 0.1);

    if (bestHours.length === 0) return null;

    return {
      type: 'time_of_day',
      description: `You perform best between ${bestHours.map(h => `${h.hour}:00`).join(', ')}`,
      confidence: Math.min(0.9, hourStats.length / 10),
      data: { bestHours: bestHours.map(h => h.hour), avgAccuracy },
    };
  }

  private detectFatigue(attempts: any[]): LearningPattern | null {
    // Group attempts into sessions (within 2-hour windows)
    const sessions: any[][] = [];
    let currentSession: any[] = [];
    
    attempts.forEach((attempt, idx) => {
      if (idx === 0) {
        currentSession.push(attempt);
      } else {
        const prevTime = new Date(attempts[idx - 1].timestamp_iso).getTime();
        const currTime = new Date(attempt.timestamp_iso).getTime();
        const hoursDiff = (currTime - prevTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 2) {
          sessions.push(currentSession);
          currentSession = [attempt];
        } else {
          currentSession.push(attempt);
        }
      }
    });
    if (currentSession.length > 0) sessions.push(currentSession);

    // Look for accuracy drop within sessions
    let fatigueCount = 0;
    sessions.forEach(session => {
      if (session.length < 10) return;
      
      const firstHalf = session.slice(0, Math.floor(session.length / 2));
      const secondHalf = session.slice(Math.floor(session.length / 2));
      
      const firstAccuracy = firstHalf.filter(a => a.correct).length / firstHalf.length;
      const secondAccuracy = secondHalf.filter(a => a.correct).length / secondHalf.length;
      
      if (firstAccuracy - secondAccuracy > 0.15) {
        fatigueCount++;
      }
    });

    if (fatigueCount >= sessions.length * 0.5) {
      return {
        type: 'fatigue',
        description: `Your accuracy drops by ~15% after ${Math.floor(sessions[0].length / 2)} questions. Consider shorter sessions.`,
        confidence: fatigueCount / sessions.length,
        data: { sessionsAnalyzed: sessions.length },
      };
    }

    return null;
  }

  private detectStimulusLengthSensitivity(attempts: any[]): LearningPattern | null {
    // This would require access to question data, which we'd need to fetch
    // For now, return null - can be enhanced later
    return null;
  }

  private detectImprovementTrend(attempts: any[]): LearningPattern | null {
    if (attempts.length < 30) return null;

    const recentAccuracy = attempts.slice(-20).filter(a => a.correct).length / 20;
    const oldAccuracy = attempts.slice(0, 20).filter(a => a.correct).length / 20;
    
    const improvement = recentAccuracy - oldAccuracy;

    if (Math.abs(improvement) < 0.05) {
      return {
        type: 'improvement_trend',
        description: "Your performance is stable. Focus on weak areas to break through.",
        confidence: 0.7,
        data: { improvement, recentAccuracy, oldAccuracy },
      };
    }

    return {
      type: 'improvement_trend',
      description: improvement > 0 
        ? `Great progress! Your accuracy improved by ${Math.round(improvement * 100)}%`
        : `Your accuracy declined by ${Math.round(Math.abs(improvement) * 100)}%. Consider taking a break.`,
      confidence: 0.8,
      data: { improvement, recentAccuracy, oldAccuracy },
    };
  }

  private identifyWeakAreas(attempts: any[]): {
    qtypes: string[];
    difficulties: number[];
    confidence: number;
  } {
    const qtypeStats: Record<string, { correct: number; total: number }> = {};
    const diffStats: Record<number, { correct: number; total: number }> = {};

    attempts.forEach(a => {
      if (!qtypeStats[a.qtype]) qtypeStats[a.qtype] = { correct: 0, total: 0 };
      if (!diffStats[a.level]) diffStats[a.level] = { correct: 0, total: 0 };
      
      qtypeStats[a.qtype].total++;
      diffStats[a.level].total++;
      
      if (a.correct) {
        qtypeStats[a.qtype].correct++;
        diffStats[a.level].correct++;
      }
    });

    const weakQTypes = Object.entries(qtypeStats)
      .filter(([_, stats]) => stats.total >= 5)
      .map(([qtype, stats]) => ({ qtype, accuracy: stats.correct / stats.total }))
      .filter(q => q.accuracy < 0.6)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3)
      .map(q => q.qtype);

    const weakDiffs = Object.entries(diffStats)
      .filter(([_, stats]) => stats.total >= 5)
      .map(([diff, stats]) => ({ diff: parseInt(diff), accuracy: stats.correct / stats.total }))
      .filter(d => d.accuracy < 0.65)
      .map(d => d.diff);

    return {
      qtypes: weakQTypes,
      difficulties: weakDiffs.length > 0 ? weakDiffs : [2, 3, 4],
      confidence: Math.min(0.95, attempts.length / 50),
    };
  }

  private suggestDifficultyProgression(attempts: any[]): DrillRecommendation | null {
    const recent = attempts.slice(0, 30);
    const avgDifficulty = recent.reduce((sum, a) => sum + a.level, 0) / recent.length;
    const accuracy = recent.filter(a => a.correct).length / recent.length;

    if (accuracy > 0.75 && avgDifficulty < 4) {
      return {
        title: "Level Up Challenge",
        description: "You're ready for harder questions",
        config: {
          qtypes: [],
          difficulties: [Math.ceil(avgDifficulty), Math.ceil(avgDifficulty) + 1],
          pts: [],
          count: 15,
        },
        priority: 'medium',
        reasoning: `With ${Math.round(accuracy * 100)}% accuracy at level ${Math.round(avgDifficulty)}, you're ready to progress.`,
        confidence: 0.8,
      };
    }

    return null;
  }

  private suggestBreadthPractice(attempts: any[]): DrillRecommendation | null {
    const qtypeCounts: Record<string, number> = {};
    attempts.slice(0, 50).forEach(a => {
      qtypeCounts[a.qtype] = (qtypeCounts[a.qtype] || 0) + 1;
    });

    const practiced = Object.keys(qtypeCounts);
    const avgPractice = Object.values(qtypeCounts).reduce((a, b) => a + b, 0) / practiced.length;
    const underPracticed = practiced.filter(q => qtypeCounts[q] < avgPractice * 0.5);

    if (underPracticed.length >= 2) {
      return {
        title: "Maintain Breadth",
        description: "Practice underrepresented question types",
        config: {
          qtypes: underPracticed.slice(0, 3),
          difficulties: [2, 3, 4],
          pts: [],
          count: 12,
        },
        priority: 'low',
        reasoning: "Ensure you're comfortable with all question types before test day.",
        confidence: 0.7,
      };
    }

    return null;
  }

  private groupByQType(attempts: any[]): Record<string, any[]> {
    const groups: Record<string, any[]> = {};
    attempts.forEach(a => {
      if (!groups[a.qtype]) groups[a.qtype] = [];
      groups[a.qtype].push(a);
    });
    return groups;
  }

  private calculateVelocity(qtype: string, attempts: any[]): LearningVelocity {
    // Split into early and recent
    const early = attempts.slice(0, Math.floor(attempts.length / 2));
    const recent = attempts.slice(Math.floor(attempts.length / 2));

    const earlyAccuracy = early.filter(a => a.correct).length / early.length;
    const recentAccuracy = recent.filter(a => a.correct).length / recent.length;

    const improvementRate = ((recentAccuracy - earlyAccuracy) / earlyAccuracy) * 100;
    const currentMastery = recentAccuracy;

    // Estimate sessions to mastery (0.85 accuracy)
    const remainingGap = 0.85 - currentMastery;
    const sessionsToMastery = improvementRate > 0
      ? Math.ceil(remainingGap / (improvementRate / 100))
      : 999;

    // Detect breakthroughs (sudden improvements)
    const breakthroughs: Date[] = [];
    for (let i = 5; i < attempts.length; i++) {
      const prev5 = attempts.slice(i - 5, i).filter(a => a.correct).length / 5;
      const curr5 = attempts.slice(i, i + 5).filter(a => a.correct).length / 5;
      if (curr5 - prev5 > 0.3) {
        breakthroughs.push(new Date(attempts[i].timestamp_iso));
      }
    }

    return {
      qtype,
      improvementRate,
      sessionsToMastery,
      currentMastery,
      breakthroughMoments: breakthroughs,
    };
  }
}

export const drillIntelligence = new DrillIntelligence();

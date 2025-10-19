import { supabase } from "@/integrations/supabase/client";
import type { XPGain, UserStats, AttemptData } from "./gamification";
import type { StreakUpdate } from "./streakSystem";

export interface Achievement {
  id: string;
  badge_id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xp_reward: number;
  tier: string;
}

export interface AttemptContext {
  attempt: AttemptData;
  xpGain: XPGain;
  streakUpdate: StreakUpdate;
  userStats: UserStats;
}

class AchievementEngine {
  // Check and award achievements
  async checkAndAwardAchievements(
    classId: string,
    context: AttemptContext
  ): Promise<Achievement[]> {
    const newAchievements: Achievement[] = [];
    
    // Check milestone achievements
    const milestoneAchievements = await this.checkMilestoneAchievements(classId, context);
    newAchievements.push(...milestoneAchievements);
    
    // Check streak achievements
    const streakAchievements = await this.checkStreakAchievements(classId, context);
    newAchievements.push(...streakAchievements);
    
    // Check accuracy achievements
    const accuracyAchievements = await this.checkAccuracyAchievements(classId, context);
    newAchievements.push(...accuracyAchievements);
    
    // Award XP and save achievements
    if (newAchievements.length > 0) {
      await this.awardAchievements(classId, newAchievements);
    }
    
    return newAchievements;
  }
  
  private async checkMilestoneAchievements(
    classId: string,
    context: AttemptContext
  ): Promise<Achievement[]> {
    const earned: Achievement[] = [];
    const totalQuestions = context.userStats.overall_answered;
    
    // Get all milestone achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('category', 'milestone');
    
    if (!achievements) return earned;
    
    // Check each milestone
    for (const achievement of achievements) {
      const req = achievement.requirement as any;
      
      if (req.type === 'questions_total') {
        if (totalQuestions === req.value) {
          // Check if already earned
          const { data: existing } = await supabase
            .from('user_achievements')
            .select('id')
            .eq('class_id', classId)
            .eq('achievement_id', achievement.id)
            .single();
          
          if (!existing) {
            earned.push(achievement);
          }
        }
      }
      
      if (req.type === 'practice_time') {
        const hour = new Date().getHours();
        const isMatch = 
          (req.value === 'late' && hour >= 0 && hour < 6) ||
          (req.value === 'early' && hour >= 5 && hour < 7);
        
        if (isMatch) {
          const { data: existing } = await supabase
            .from('user_achievements')
            .select('id')
            .eq('class_id', classId)
            .eq('achievement_id', achievement.id)
            .single();
          
          if (!existing) {
            earned.push(achievement);
          }
        }
      }
    }
    
    return earned;
  }
  
  private async checkStreakAchievements(
    classId: string,
    context: AttemptContext
  ): Promise<Achievement[]> {
    const earned: Achievement[] = [];
    
    if (!context.streakUpdate.streakIncreased) {
      return earned;
    }
    
    const currentStreak = context.streakUpdate.newStreak;
    
    // Get all streak achievements
    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')
      .eq('category', 'streak');
    
    if (!achievements) return earned;
    
    for (const achievement of achievements) {
      const req = achievement.requirement as any;
      
      if (req.type === 'streak' && currentStreak === req.value) {
        const { data: existing } = await supabase
          .from('user_achievements')
          .select('id')
          .eq('class_id', classId)
          .eq('achievement_id', achievement.id)
          .single();
        
        if (!existing) {
          earned.push(achievement);
        }
      }
    }
    
    return earned;
  }
  
  private async checkAccuracyAchievements(
    classId: string,
    context: AttemptContext
  ): Promise<Achievement[]> {
    const earned: Achievement[] = [];
    
    // Check for "perfect 10" - 10 correct in a row
    if (context.attempt.correct) {
      const { data: recentAttempts } = await supabase
        .from('attempts')
        .select('correct')
        .eq('class_id', classId)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (recentAttempts && recentAttempts.length === 10) {
        const allCorrect = recentAttempts.every(a => a.correct);
        
        if (allCorrect) {
          const { data: achievement } = await supabase
            .from('achievements')
            .select('*')
            .eq('badge_id', 'perfect_10')
            .single();
          
          if (achievement) {
            const { data: existing } = await supabase
              .from('user_achievements')
              .select('id')
              .eq('class_id', classId)
              .eq('achievement_id', achievement.id)
              .single();
            
            if (!existing) {
              earned.push(achievement);
            }
          }
        }
      }
    }
    
    return earned;
  }
  
  private async awardAchievements(
    classId: string,
    achievements: Achievement[]
  ): Promise<void> {
    // Insert user achievements
    const userAchievements = achievements.map(a => ({
      class_id: classId,
      achievement_id: a.id,
      progress: 100
    }));
    
    await supabase
      .from('user_achievements')
      .insert(userAchievements);
    
    // Award XP
    const totalXP = achievements.reduce((sum, a) => sum + a.xp_reward, 0);
    
    if (totalXP > 0) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('xp_total')
        .eq('class_id', classId)
        .single();
      
      if (profile) {
        await supabase
          .from('profiles')
          .update({ xp_total: profile.xp_total + totalXP })
          .eq('class_id', classId);
      }
    }
  }
}

export const achievementEngine = new AchievementEngine();

import { supabase } from "@/integrations/supabase/client";

export interface StreakUpdate {
  newStreak: number;
  streakBroken: boolean;
  streakIncreased: boolean;
  daysToGoal: number;
  questionsToday: number;
  goalReached: boolean;
}

const QUESTIONS_PER_DAY_GOAL = 5;

// Check and update streak status
export const updateStreak = async (classId: string): Promise<StreakUpdate> => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  // Get today's stats
  const { data: todayStats } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('class_id', classId)
    .eq('date', today)
    .single();
  
  // Get yesterday's stats
  const { data: yesterdayStats } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('class_id', classId)
    .eq('date', yesterday)
    .single();
  
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_current, last_practice_date, longest_streak, daily_goal_questions')
    .eq('class_id', classId)
    .single();
  
  if (!profile) {
    return {
      newStreak: 0,
      streakBroken: false,
      streakIncreased: false,
      daysToGoal: QUESTIONS_PER_DAY_GOAL,
      questionsToday: 0,
      goalReached: false
    };
  }
  
  const questionsToday = todayStats?.questions_answered || 0;
  const goalReached = questionsToday >= (profile.daily_goal_questions || QUESTIONS_PER_DAY_GOAL);
  const daysToGoal = Math.max(0, (profile.daily_goal_questions || QUESTIONS_PER_DAY_GOAL) - questionsToday);
  
  let newStreak = profile.streak_current || 0;
  let streakBroken = false;
  let streakIncreased = false;
  
  // Only update streak if goal is reached today
  if (goalReached) {
    // Check if this is the first time reaching goal today
    if (profile.last_practice_date !== today) {
      if (profile.last_practice_date === yesterday) {
        // Continue streak
        newStreak += 1;
        streakIncreased = true;
      } else if (!profile.last_practice_date || profile.last_practice_date < yesterday) {
        // Streak broken, start new
        if (profile.streak_current > 0) {
          streakBroken = true;
        }
        newStreak = 1;
        streakIncreased = true;
      }
      
      // Update profile
      await supabase
        .from('profiles')
        .update({
          streak_current: newStreak,
          longest_streak: Math.max(newStreak, profile.longest_streak || 0),
          last_practice_date: today
        })
        .eq('class_id', classId);
    }
  }
  
  return {
    newStreak,
    streakBroken,
    streakIncreased,
    daysToGoal,
    questionsToday,
    goalReached
  };
};

// Check if streak is at risk (practiced yesterday but not today)
export const checkStreakAtRisk = async (classId: string): Promise<boolean> => {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('streak_current, last_practice_date')
    .eq('class_id', classId)
    .single();
  
  if (!profile || profile.streak_current === 0) {
    return false;
  }
  
  // Streak at risk if last practice was yesterday and haven't practiced today
  const { data: todayStats } = await supabase
    .from('daily_stats')
    .select('questions_answered')
    .eq('class_id', classId)
    .eq('date', today)
    .single();
  
  const questionsToday = todayStats?.questions_answered || 0;
  return profile.last_practice_date === yesterday && questionsToday < QUESTIONS_PER_DAY_GOAL;
};

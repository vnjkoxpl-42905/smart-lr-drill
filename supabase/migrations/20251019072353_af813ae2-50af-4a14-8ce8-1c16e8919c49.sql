-- Create achievements table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  badge_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('milestone', 'streak', 'accuracy', 'speed', 'mastery')),
  requirement JSONB NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  tier TEXT NOT NULL CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id TEXT NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress INTEGER DEFAULT 0,
  UNIQUE(class_id, achievement_id)
);

-- Create challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('daily', 'weekly', 'special')),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements JSONB NOT NULL,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  bonus_rewards JSONB,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

-- Create user_challenges table
CREATE TABLE public.user_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id TEXT NOT NULL,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  progress JSONB NOT NULL DEFAULT '{}',
  completed_at TIMESTAMP WITH TIME ZONE,
  claimed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(class_id, challenge_id)
);

-- Create daily_stats table for tracking daily practice
CREATE TABLE public.daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id TEXT NOT NULL,
  date DATE NOT NULL,
  questions_answered INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  time_spent_ms BIGINT NOT NULL DEFAULT 0,
  UNIQUE(class_id, date)
);

-- Update profiles table with gamification fields
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS daily_goal_questions INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS last_practice_date DATE,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX idx_user_achievements_class_id ON public.user_achievements(class_id);
CREATE INDEX idx_user_achievements_achievement_id ON public.user_achievements(achievement_id);
CREATE INDEX idx_user_challenges_class_id ON public.user_challenges(class_id);
CREATE INDEX idx_user_challenges_challenge_id ON public.user_challenges(challenge_id);
CREATE INDEX idx_daily_stats_class_id_date ON public.daily_stats(class_id, date);
CREATE INDEX idx_challenges_active_ends_at ON public.challenges(active, ends_at);

-- Enable RLS on new tables
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for achievements (public read, no user writes)
CREATE POLICY "Achievements are viewable by everyone" 
ON public.achievements FOR SELECT USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements FOR SELECT 
USING (class_id = current_setting('request.jwt.claims', true)::json->>'class_id');

CREATE POLICY "Users can insert their own achievements" 
ON public.user_achievements FOR INSERT 
WITH CHECK (class_id = current_setting('request.jwt.claims', true)::json->>'class_id');

-- RLS Policies for challenges (public read for active challenges)
CREATE POLICY "Active challenges are viewable by everyone" 
ON public.challenges FOR SELECT 
USING (active = true);

-- RLS Policies for user_challenges
CREATE POLICY "Users can view their own challenges" 
ON public.user_challenges FOR SELECT 
USING (class_id = current_setting('request.jwt.claims', true)::json->>'class_id');

CREATE POLICY "Users can insert their own challenges" 
ON public.user_challenges FOR INSERT 
WITH CHECK (class_id = current_setting('request.jwt.claims', true)::json->>'class_id');

CREATE POLICY "Users can update their own challenges" 
ON public.user_challenges FOR UPDATE 
USING (class_id = current_setting('request.jwt.claims', true)::json->>'class_id');

-- RLS Policies for daily_stats
CREATE POLICY "Users can view their own daily stats" 
ON public.daily_stats FOR SELECT 
USING (class_id = current_setting('request.jwt.claims', true)::json->>'class_id');

CREATE POLICY "Users can insert their own daily stats" 
ON public.daily_stats FOR INSERT 
WITH CHECK (class_id = current_setting('request.jwt.claims', true)::json->>'class_id');

CREATE POLICY "Users can update their own daily stats" 
ON public.daily_stats FOR UPDATE 
USING (class_id = current_setting('request.jwt.claims', true)::json->>'class_id');

-- Seed initial achievement data
INSERT INTO public.achievements (badge_id, name, description, icon, category, requirement, xp_reward, tier) VALUES
-- Milestone Badges
('first_step', 'First Step', 'Complete your first drill', '🎯', 'milestone', '{"type": "questions_total", "value": 1}', 10, 'bronze'),
('getting_started', 'Getting Started', 'Answer 10 questions', '📚', 'milestone', '{"type": "questions_total", "value": 10}', 25, 'bronze'),
('century_club', 'Century Club', 'Answer 100 questions', '💯', 'milestone', '{"type": "questions_total", "value": 100}', 50, 'silver'),
('question_master', 'Question Master', 'Answer 1000 questions', '👑', 'milestone', '{"type": "questions_total", "value": 1000}', 200, 'platinum'),
('night_owl', 'Night Owl', 'Practice after midnight', '🦉', 'milestone', '{"type": "practice_time", "value": "late"}', 20, 'bronze'),
('early_bird', 'Early Bird', 'Practice before 7 AM', '🌅', 'milestone', '{"type": "practice_time", "value": "early"}', 20, 'bronze'),

-- Streak Badges
('on_fire', 'On Fire', 'Maintain a 3-day streak', '🔥', 'streak', '{"type": "streak", "value": 3}', 30, 'bronze'),
('unstoppable', 'Unstoppable', 'Maintain a 7-day streak', '⚡', 'streak', '{"type": "streak", "value": 7}', 100, 'silver'),
('dedicated', 'Dedicated', 'Maintain a 14-day streak', '💪', 'streak', '{"type": "streak", "value": 14}', 200, 'gold'),
('legendary', 'Legendary', 'Maintain a 30-day streak', '🏆', 'streak', '{"type": "streak", "value": 30}', 500, 'platinum'),

-- Accuracy Badges
('perfect_10', 'Perfect 10', 'Get 10 correct answers in a row', '✨', 'accuracy', '{"type": "streak_correct", "value": 10}', 100, 'gold'),
('sharpshooter', 'Sharpshooter', '90%+ accuracy on 20+ questions', '🎯', 'accuracy', '{"type": "accuracy_threshold", "min_questions": 20, "min_accuracy": 0.9}', 150, 'gold'),
('perfectionist', 'Perfectionist', '100% accuracy on a full section', '💎', 'accuracy', '{"type": "perfect_section", "value": 1}', 300, 'platinum'),

-- Speed Badges
('lightning_fast', 'Lightning Fast', 'Answer 10 questions 30% faster than average', '⚡', 'speed', '{"type": "speed_bonus", "questions": 10, "faster_by": 0.3}', 80, 'silver'),
('speedster', 'Speedster', 'Complete 35-min section in under 30 minutes', '🏃', 'speed', '{"type": "section_time", "max_minutes": 30}', 120, 'gold'),

-- Mastery Badges
('level_5_conqueror', 'Level 5 Conqueror', '75%+ accuracy on 50 Level 5 questions', '🎖️', 'mastery', '{"type": "difficulty_mastery", "difficulty": 5, "min_questions": 50, "min_accuracy": 0.75}', 300, 'platinum'),
('well_rounded', 'Well-Rounded', '70%+ accuracy on all question types', '🌟', 'mastery', '{"type": "all_types_mastery", "min_accuracy": 0.7}', 200, 'gold'),
('difficulty_slayer', 'Difficulty Slayer', 'Pass all difficulty levels with 70%+', '⚔️', 'mastery', '{"type": "all_difficulties_mastery", "min_accuracy": 0.7}', 150, 'gold');
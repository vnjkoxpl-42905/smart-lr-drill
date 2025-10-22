-- Fix CLIENT_SIDE_AUTH and PUBLIC_DATA_EXPOSURE issues
-- Add user_id column to students table to link to auth.users
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create unique index on user_id
CREATE UNIQUE INDEX IF NOT EXISTS students_user_id_key ON public.students(user_id);

-- Create security definer function to get user's class_id
CREATE OR REPLACE FUNCTION public.get_user_class_id(uid UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT class_id FROM students WHERE user_id = uid LIMIT 1;
$$;

-- Drop existing overly permissive policies and replace with secure ones

-- attempts table
DROP POLICY IF EXISTS "Students can view own attempts" ON public.attempts;
DROP POLICY IF EXISTS "Students can insert own attempts" ON public.attempts;
CREATE POLICY "Users can view own attempts" ON public.attempts
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own attempts" ON public.attempts
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));

-- profiles table
DROP POLICY IF EXISTS "Students can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Students can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Students can update own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));

-- drill_templates table
DROP POLICY IF EXISTS "Users can view own templates" ON public.drill_templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON public.drill_templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.drill_templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.drill_templates;
CREATE POLICY "Users can view own templates" ON public.drill_templates
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own templates" ON public.drill_templates
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can update own templates" ON public.drill_templates
  FOR UPDATE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can delete own templates" ON public.drill_templates
  FOR DELETE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));

-- flagged_questions table
DROP POLICY IF EXISTS "Users can manage their own flagged questions" ON public.flagged_questions;
CREATE POLICY "Users can view own flagged questions" ON public.flagged_questions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can insert own flagged questions" ON public.flagged_questions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own flagged questions" ON public.flagged_questions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can delete own flagged questions" ON public.flagged_questions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- wrong_answer_journal table
DROP POLICY IF EXISTS "Students can view own WAJ entries" ON public.wrong_answer_journal;
DROP POLICY IF EXISTS "Students can insert own WAJ entries" ON public.wrong_answer_journal;
DROP POLICY IF EXISTS "Students can update own WAJ entries" ON public.wrong_answer_journal;
CREATE POLICY "Users can view own WAJ entries" ON public.wrong_answer_journal
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own WAJ entries" ON public.wrong_answer_journal
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can update own WAJ entries" ON public.wrong_answer_journal
  FOR UPDATE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));

-- voice_coaching_sessions table
DROP POLICY IF EXISTS "Users can view own voice sessions" ON public.voice_coaching_sessions;
DROP POLICY IF EXISTS "Users can insert own voice sessions" ON public.voice_coaching_sessions;
CREATE POLICY "Users can view own voice sessions" ON public.voice_coaching_sessions
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own voice sessions" ON public.voice_coaching_sessions
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));

-- daily_stats table
DROP POLICY IF EXISTS "Users can view their own daily stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Users can insert their own daily stats" ON public.daily_stats;
DROP POLICY IF EXISTS "Users can update their own daily stats" ON public.daily_stats;
CREATE POLICY "Users can view own daily stats" ON public.daily_stats
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own daily stats" ON public.daily_stats
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can update own daily stats" ON public.daily_stats
  FOR UPDATE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));

-- section_history table
DROP POLICY IF EXISTS "Users can view own section history" ON public.section_history;
DROP POLICY IF EXISTS "Users can insert own section history" ON public.section_history;
CREATE POLICY "Users can view own section history" ON public.section_history
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own section history" ON public.section_history
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));

-- sessions table
DROP POLICY IF EXISTS "Students can view own session" ON public.sessions;
DROP POLICY IF EXISTS "Students can insert own session" ON public.sessions;
DROP POLICY IF EXISTS "Students can update own session" ON public.sessions;
CREATE POLICY "Users can view own session" ON public.sessions
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own session" ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can update own session" ON public.sessions
  FOR UPDATE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));

-- settings table
DROP POLICY IF EXISTS "Students can view own settings" ON public.settings;
DROP POLICY IF EXISTS "Students can insert own settings" ON public.settings;
DROP POLICY IF EXISTS "Students can update own settings" ON public.settings;
CREATE POLICY "Users can view own settings" ON public.settings
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own settings" ON public.settings
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can update own settings" ON public.settings
  FOR UPDATE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));

-- students table
DROP POLICY IF EXISTS "Students can view own data" ON public.students;
DROP POLICY IF EXISTS "Students can update own data" ON public.students;
CREATE POLICY "Users can view own data" ON public.students
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Users can update own data" ON public.students
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- user_voice_settings table
DROP POLICY IF EXISTS "Users manage own voice settings" ON public.user_voice_settings;
CREATE POLICY "Users can view own voice settings" ON public.user_voice_settings
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own voice settings" ON public.user_voice_settings
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can update own voice settings" ON public.user_voice_settings
  FOR UPDATE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can delete own voice settings" ON public.user_voice_settings
  FOR DELETE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));

-- question_usage table (already uses auth.jwt properly but let's make it more secure)
DROP POLICY IF EXISTS "Users can view own question usage" ON public.question_usage;
DROP POLICY IF EXISTS "Users can insert own question usage" ON public.question_usage;
DROP POLICY IF EXISTS "Users can update own question usage" ON public.question_usage;
DROP POLICY IF EXISTS "Users can delete own question usage" ON public.question_usage;
CREATE POLICY "Users can view own question usage" ON public.question_usage
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own question usage" ON public.question_usage
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can update own question usage" ON public.question_usage
  FOR UPDATE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can delete own question usage" ON public.question_usage
  FOR DELETE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));

-- blind_review_sessions table
DROP POLICY IF EXISTS "Users can manage own BR sessions" ON public.blind_review_sessions;
CREATE POLICY "Users can view own BR sessions" ON public.blind_review_sessions
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own BR sessions" ON public.blind_review_sessions
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can update own BR sessions" ON public.blind_review_sessions
  FOR UPDATE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can delete own BR sessions" ON public.blind_review_sessions
  FOR DELETE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));

-- events table
DROP POLICY IF EXISTS "Students can view own events" ON public.events;
DROP POLICY IF EXISTS "Students can insert own events" ON public.events;
CREATE POLICY "Users can view own events" ON public.events
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own events" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));

-- user_achievements table (already uses proper checks but making consistent)
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own achievements" ON public.user_achievements
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));

-- user_challenges table
DROP POLICY IF EXISTS "Users can view their own challenges" ON public.user_challenges;
DROP POLICY IF EXISTS "Users can insert their own challenges" ON public.user_challenges;
DROP POLICY IF EXISTS "Users can update their own challenges" ON public.user_challenges;
CREATE POLICY "Users can view own challenges" ON public.user_challenges
  FOR SELECT TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can insert own challenges" ON public.user_challenges
  FOR INSERT TO authenticated
  WITH CHECK (class_id = public.get_user_class_id(auth.uid()));
CREATE POLICY "Users can update own challenges" ON public.user_challenges
  FOR UPDATE TO authenticated
  USING (class_id = public.get_user_class_id(auth.uid()));
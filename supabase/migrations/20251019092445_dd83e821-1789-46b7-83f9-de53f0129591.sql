-- Add user_id column to flagged_questions table
ALTER TABLE public.flagged_questions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop the old RLS policy
DROP POLICY IF EXISTS "Users manage own flags" ON public.flagged_questions;

-- Create new RLS policy using auth.uid()
CREATE POLICY "Users can manage their own flagged questions"
ON public.flagged_questions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_flagged_questions_user_id ON public.flagged_questions(user_id);

-- Migrate existing data: set user_id from class_id if possible
-- This is a best-effort migration since we're changing the auth system
UPDATE public.flagged_questions
SET user_id = auth.uid()
WHERE user_id IS NULL AND auth.uid() IS NOT NULL;
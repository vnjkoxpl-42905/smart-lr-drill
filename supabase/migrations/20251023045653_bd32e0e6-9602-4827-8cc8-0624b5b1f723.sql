-- Add user_id column to attempts table
ALTER TABLE public.attempts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON public.attempts(user_id);
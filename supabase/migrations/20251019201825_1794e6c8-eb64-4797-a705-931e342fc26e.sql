-- Add Blind Review fields to attempts table
ALTER TABLE public.attempts 
ADD COLUMN IF NOT EXISTS br_marked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pre_answer text,
ADD COLUMN IF NOT EXISTS br_selected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS br_answer text,
ADD COLUMN IF NOT EXISTS br_rationale text,
ADD COLUMN IF NOT EXISTS br_time_ms integer,
ADD COLUMN IF NOT EXISTS br_changed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS br_outcome text,
ADD COLUMN IF NOT EXISTS br_delta text;

-- Create blind_review_sessions table to track BR session metadata
CREATE TABLE IF NOT EXISTS public.blind_review_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  session_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  br_items_count integer NOT NULL DEFAULT 0,
  br_corrected_count integer NOT NULL DEFAULT 0,
  br_stuck_count integer NOT NULL DEFAULT 0,
  br_regret_count integer NOT NULL DEFAULT 0,
  br_confirmed_count integer NOT NULL DEFAULT 0,
  br_median_time_ms integer
);

-- Enable RLS on blind_review_sessions
ALTER TABLE public.blind_review_sessions ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own BR sessions
CREATE POLICY "Users can manage own BR sessions" 
ON public.blind_review_sessions 
FOR ALL 
USING (true) 
WITH CHECK (true);
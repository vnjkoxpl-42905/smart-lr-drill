-- Create section_history table for persisting section analytics
CREATE TABLE IF NOT EXISTS public.section_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Section identification
  pt INTEGER NOT NULL,
  section INTEGER NOT NULL,
  section_mode TEXT NOT NULL, -- 'full-section', 'type-drill', etc.
  
  -- Initial attempt scores
  initial_score INTEGER NOT NULL,
  initial_total INTEGER NOT NULL,
  initial_percent INTEGER NOT NULL,
  
  -- Blind review scores (nullable if BR not used)
  br_score INTEGER,
  br_total INTEGER,
  br_percent INTEGER,
  br_delta INTEGER, -- BR score - Initial score
  
  -- Timing
  total_time_ms INTEGER NOT NULL,
  avg_time_ms INTEGER NOT NULL,
  unanswered_count INTEGER NOT NULL DEFAULT 0,
  
  -- Question type breakdown
  by_qtype_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  by_difficulty_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Metadata
  br_used BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.section_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own section history"
ON public.section_history
FOR SELECT
USING (class_id = (auth.jwt() ->> 'class_id'::text));

CREATE POLICY "Users can insert own section history"
ON public.section_history
FOR INSERT
WITH CHECK (class_id = (auth.jwt() ->> 'class_id'::text));

-- Index for performance
CREATE INDEX idx_section_history_class_id ON public.section_history(class_id);
CREATE INDEX idx_section_history_created_at ON public.section_history(created_at DESC);
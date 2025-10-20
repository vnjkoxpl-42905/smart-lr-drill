-- Create table to track question usage per user
CREATE TABLE public.question_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id text NOT NULL,
  qid text NOT NULL,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  times_seen integer NOT NULL DEFAULT 1,
  mode text NOT NULL, -- 'adaptive', 'full-section', 'type-drill', 'natural-drill'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(class_id, qid, mode)
);

-- Enable RLS
ALTER TABLE public.question_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view own question usage"
ON public.question_usage
FOR SELECT
USING (class_id = (auth.jwt() ->> 'class_id'));

-- Users can insert their own usage
CREATE POLICY "Users can insert own question usage"
ON public.question_usage
FOR INSERT
WITH CHECK (class_id = (auth.jwt() ->> 'class_id'));

-- Users can update their own usage
CREATE POLICY "Users can update own question usage"
ON public.question_usage
FOR UPDATE
USING (class_id = (auth.jwt() ->> 'class_id'));

-- Users can delete their own usage (for reset)
CREATE POLICY "Users can delete own question usage"
ON public.question_usage
FOR DELETE
USING (class_id = (auth.jwt() ->> 'class_id'));

-- Create index for performance
CREATE INDEX idx_question_usage_class_qid ON public.question_usage(class_id, qid, mode);
CREATE INDEX idx_question_usage_last_seen ON public.question_usage(class_id, last_seen_at);
-- Create flagged_questions table
CREATE TABLE IF NOT EXISTS public.flagged_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  qid TEXT NOT NULL,
  pt INTEGER NOT NULL,
  section INTEGER NOT NULL,
  qnum INTEGER NOT NULL,
  note TEXT,
  flagged_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, qid)
);

ALTER TABLE public.flagged_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own flags" ON public.flagged_questions 
FOR ALL USING (class_id = (auth.jwt() ->> 'class_id')) 
WITH CHECK (class_id = (auth.jwt() ->> 'class_id'));
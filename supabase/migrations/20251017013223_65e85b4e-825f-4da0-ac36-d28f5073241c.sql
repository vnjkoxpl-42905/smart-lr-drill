-- Create update timestamp function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create Wrong Answer Journal table
CREATE TABLE public.wrong_answer_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id TEXT NOT NULL,
  qid TEXT NOT NULL,
  pt INTEGER NOT NULL,
  section INTEGER NOT NULL,
  qnum INTEGER NOT NULL,
  qtype TEXT NOT NULL,
  level INTEGER NOT NULL,
  first_wrong_at_iso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_status TEXT NOT NULL CHECK (last_status IN ('wrong', 'right')),
  revisit_count INTEGER NOT NULL DEFAULT 0,
  history_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(class_id, qid)
);

-- Enable RLS
ALTER TABLE public.wrong_answer_journal ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Students can view own WAJ entries"
  ON public.wrong_answer_journal
  FOR SELECT
  USING (true);

CREATE POLICY "Students can insert own WAJ entries"
  ON public.wrong_answer_journal
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Students can update own WAJ entries"
  ON public.wrong_answer_journal
  FOR UPDATE
  USING (true);

-- Index for faster lookups
CREATE INDEX idx_waj_class_qid ON public.wrong_answer_journal(class_id, qid);
CREATE INDEX idx_waj_class_last_status ON public.wrong_answer_journal(class_id, last_status);
CREATE INDEX idx_waj_class_qtype ON public.wrong_answer_journal(class_id, qtype);

-- Trigger to update updated_at
CREATE TRIGGER update_waj_updated_at
  BEFORE UPDATE ON public.wrong_answer_journal
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
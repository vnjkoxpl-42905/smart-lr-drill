-- Create drill_templates table for saved drill configurations
CREATE TABLE drill_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  template_name text NOT NULL,
  qtypes text[] NOT NULL,
  difficulties integer[] NOT NULL,
  pts integer[] NOT NULL,
  set_size integer NOT NULL DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE drill_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own templates"
  ON drill_templates FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own templates"
  ON drill_templates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own templates"
  ON drill_templates FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own templates"
  ON drill_templates FOR DELETE
  USING (true);

-- Auto-update timestamp trigger
CREATE TRIGGER update_drill_templates_updated_at
  BEFORE UPDATE ON drill_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
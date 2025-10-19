-- Create voice_coaching_sessions table
CREATE TABLE voice_coaching_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  qid text NOT NULL,
  attempt_id uuid,
  voice_duration_ms integer NOT NULL,
  spoken_words text,
  transcript_full text,
  coach_reply_id text NOT NULL,
  coach_reply_text text NOT NULL,
  action_taken text,
  contrast_shown boolean DEFAULT false,
  teach_back_given boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE voice_coaching_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice_coaching_sessions
CREATE POLICY "Users can insert own voice sessions"
  ON voice_coaching_sessions FOR INSERT
  WITH CHECK (class_id = (SELECT class_id FROM profiles WHERE class_id = (auth.jwt()->>'class_id')));

CREATE POLICY "Users can view own voice sessions"
  ON voice_coaching_sessions FOR SELECT
  USING (class_id = (auth.jwt()->>'class_id'));

-- Update attempts table
ALTER TABLE attempts ADD COLUMN IF NOT EXISTS voice_used boolean DEFAULT false;

-- Create user_voice_settings table
CREATE TABLE user_voice_settings (
  class_id text PRIMARY KEY,
  voice_coach_enabled boolean DEFAULT true,
  show_contrast boolean DEFAULT false,
  teach_back_on_correct boolean DEFAULT false,
  section_debrief_enabled boolean DEFAULT false,
  store_full_transcript boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_voice_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for voice_settings
CREATE POLICY "Users manage own voice settings"
  ON user_voice_settings FOR ALL
  USING (class_id = (auth.jwt()->>'class_id'))
  WITH CHECK (class_id = (auth.jwt()->>'class_id'));
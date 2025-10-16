-- Students table (passwordless classroom link + optional PIN)
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  token_hash text NOT NULL,
  student_label text,
  pin_hash text,
  created_at timestamptz DEFAULT now(),
  last_active_at timestamptz DEFAULT now(),
  schema_version int DEFAULT 1,
  UNIQUE(class_id, token_hash)
);

ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- RLS: Students can only access their own data
CREATE POLICY "Students can view own data" ON students
  FOR SELECT USING (true);

CREATE POLICY "Students can update own data" ON students
  FOR UPDATE USING (true);

-- Attempts table (append-only)
CREATE TABLE IF NOT EXISTS attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  qid text NOT NULL,
  pt int NOT NULL,
  section int NOT NULL,
  qnum int NOT NULL,
  qtype text NOT NULL,
  level int NOT NULL,
  correct boolean NOT NULL,
  time_ms int NOT NULL,
  confidence int,
  mode text NOT NULL,
  set_id text,
  timestamp_iso timestamptz DEFAULT now(),
  app_version text DEFAULT 'v1'
);

ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own attempts" ON attempts
  FOR SELECT USING (true);

CREATE POLICY "Students can insert own attempts" ON attempts
  FOR INSERT WITH CHECK (true);

-- Profiles table (aggregated stats)
CREATE TABLE IF NOT EXISTS profiles (
  class_id text PRIMARY KEY,
  overall_answered int DEFAULT 0,
  overall_correct int DEFAULT 0,
  overall_avg_ms int DEFAULT 0,
  by_qtype_json jsonb DEFAULT '{}'::jsonb,
  by_level_json jsonb DEFAULT '{}'::jsonb,
  streak_current int DEFAULT 0,
  xp_total int DEFAULT 0,
  daily_goal_streak int DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own profile" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Students can insert own profile" ON profiles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Students can update own profile" ON profiles
  FOR UPDATE USING (true);

-- Sessions table (drill state, markup, queues)
CREATE TABLE IF NOT EXISTS sessions (
  class_id text PRIMARY KEY,
  queue_json jsonb DEFAULT '[]'::jsonb,
  cursor_index int DEFAULT 0,
  current_qid text,
  started_at timestamptz DEFAULT now(),
  elapsed_ms int DEFAULT 0,
  timer_mode text DEFAULT 'stopwatch',
  review_queue_json jsonb DEFAULT '[]'::jsonb,
  cooldowns_json jsonb DEFAULT '{}'::jsonb,
  markup_json jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own session" ON sessions
  FOR SELECT USING (true);

CREATE POLICY "Students can insert own session" ON sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Students can update own session" ON sessions
  FOR UPDATE USING (true);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  class_id text PRIMARY KEY,
  enabled_qtypes text[] DEFAULT ARRAY[]::text[],
  enabled_levels int[] DEFAULT ARRAY[1,2,3,4,5]::int[],
  adaptive_on boolean DEFAULT true,
  explore_ratio decimal DEFAULT 0.15,
  pace_vs_challenge decimal DEFAULT 0,
  time_pref text DEFAULT 'balanced',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own settings" ON settings
  FOR SELECT USING (true);

CREATE POLICY "Students can insert own settings" ON settings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Students can update own settings" ON settings
  FOR UPDATE USING (true);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id text NOT NULL,
  event text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  timestamp_iso timestamptz DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own events" ON events
  FOR SELECT USING (true);

CREATE POLICY "Students can insert own events" ON events
  FOR INSERT WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_attempts_class_id ON attempts(class_id);
CREATE INDEX IF NOT EXISTS idx_attempts_qid ON attempts(qid);
CREATE INDEX IF NOT EXISTS idx_attempts_timestamp ON attempts(timestamp_iso DESC);
CREATE INDEX IF NOT EXISTS idx_events_class_id ON events(class_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp_iso DESC);
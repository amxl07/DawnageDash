-- Migration to add new tables: onboarding_questionnaire and workout_logs
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- ONBOARDING QUESTIONNAIRE TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS onboarding_questionnaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answers TEXT, -- JSON string of answers
  completed_sections TEXT, -- JSON string of completed section IDs
  status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_onboarding_questionnaire_user_id ON onboarding_questionnaire(user_id);

-- Enable RLS
ALTER TABLE onboarding_questionnaire ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onboarding_questionnaire
CREATE POLICY "Users can view their own questionnaire"
  ON onboarding_questionnaire FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own questionnaire"
  ON onboarding_questionnaire FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own questionnaire"
  ON onboarding_questionnaire FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- WORKOUT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title VARCHAR(100) NOT NULL,
  content TEXT, -- JSON string of flexible workout data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON workout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_date ON workout_logs(date DESC);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_date ON workout_logs(user_id, date DESC);

-- Enable RLS
ALTER TABLE workout_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workout_logs
CREATE POLICY "Users can view their own workout logs"
  ON workout_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workout logs"
  ON workout_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workout logs"
  ON workout_logs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workout logs"
  ON workout_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================
-- Replace 'YOUR_USER_ID_HERE' with your actual user ID
-- You can find your user ID by running: SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- Example: INSERT INTO workout_logs (user_id, date, title, content) VALUES
INSERT INTO workout_logs (user_id, date, title, content) VALUES
('7fb9f278-2317-421d-a422-0daa7259615e', CURRENT_DATE, 'Upper Body Strength', 
 '[
   {"Exercise": "Bench Press", "Sets": 4, "Reps": "8-10", "Weight": "80kg", "Rest": "90s"},
   {"Exercise": "Rows", "Sets": 4, "Reps": "10-12", "Weight": "60kg", "Rest": "60s"},
   {"Exercise": "Shoulder Press", "Sets": 3, "Reps": "10", "Weight": "30kg", "Rest": "60s"}
 ]'::TEXT
);

INSERT INTO workout_logs (user_id, date, title, content) VALUES
('7fb9f278-2317-421d-a422-0daa7259615e', CURRENT_DATE - INTERVAL '1 day', 'Leg Day', 
 '[
   {"Exercise": "Squats", "Sets": 5, "Reps": "5", "Weight": "120kg", "Rest": "3min"},
   {"Exercise": "Romanian Deadlifts", "Sets": 3, "Reps": "12", "Weight": "80kg", "Rest": "90s"},
   {"Exercise": "Leg Press", "Sets": 3, "Reps": "15", "Weight": "200kg", "Rest": "60s"}
 ]'::TEXT
);

INSERT INTO workout_logs (user_id, date, title, content) VALUES
('7fb9f278-2317-421d-a422-0daa7259615e', CURRENT_DATE - INTERVAL '2 days', 'Cardio & Core', 
 '[
   {"Exercise": "Treadmill Run", "Duration": "20 min", "Speed": "10 km/h"},
   {"Exercise": "Plank", "Sets": 3, "Duration": "60s"},
   {"Exercise": "Russian Twists", "Sets": 3, "Reps": "20"}
 ]'::TEXT
);

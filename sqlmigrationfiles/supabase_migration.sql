-- ============================================================================
-- Supabase Migration for Fitness Dashboard
-- ============================================================================
-- This migration file sets up the database schema and Row Level Security (RLS)
-- policies to ensure users can only access their own data.
--
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE (Synced with Supabase Auth)
-- ============================================================================
-- Drop existing users table if it exists
DROP TABLE IF EXISTS users CASCADE;

-- Create users table that references auth.users
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone_number TEXT, -- Stores full phone number with country code (e.g., +911234567890)
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- DAILY CHECK-INS TABLE
-- ============================================================================
DROP TABLE IF EXISTS daily_check_ins CASCADE;

CREATE TABLE daily_check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_number INTEGER,

  -- Vitals
  morning_weight DECIMAL(5, 2),
  sleep_hours DECIMAL(3, 1),

  -- Workout
  workout_status VARCHAR(20), -- 'done', 'no', 'cardio_day', 'rest_day'
  workout_performance INTEGER, -- 1-10

  -- Nutrition
  nutrition_score INTEGER, -- 1-10
  calorie_intake INTEGER,
  water_liters DECIMAL(3, 1),
  daily_steps INTEGER,
  protein DECIMAL(5, 1),
  carbs DECIMAL(5, 1),
  fats DECIMAL(5, 1),

  -- Wellbeing
  energy_level INTEGER, -- 1-10
  hunger_level INTEGER, -- 1-10
  stress_level INTEGER, -- 1-10
  digestion VARCHAR(20), -- 'none', 'bloated', 'constipated', 'diarrhea'

  -- Notes
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE daily_check_ins ENABLE ROW LEVEL SECURITY;

-- Users can only view their own check-ins
CREATE POLICY "Users can view own check-ins"
  ON daily_check_ins FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own check-ins
CREATE POLICY "Users can insert own check-ins"
  ON daily_check_ins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own check-ins
CREATE POLICY "Users can update own check-ins"
  ON daily_check_ins FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own check-ins
CREATE POLICY "Users can delete own check-ins"
  ON daily_check_ins FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- BODY MEASUREMENTS TABLE
-- ============================================================================
DROP TABLE IF EXISTS body_measurements CASCADE;

CREATE TABLE body_measurements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  weight DECIMAL(5, 2),
  body_fat_percentage DECIMAL(4, 2),
  muscle_mass DECIMAL(5, 2),
  chest DECIMAL(5, 2),
  waist DECIMAL(5, 2),
  hips DECIMAL(5, 2),
  thighs DECIMAL(5, 2),
  arms DECIMAL(5, 2),
  neck DECIMAL(5, 2),
  calves DECIMAL(5, 2),

  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own measurements"
  ON body_measurements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own measurements"
  ON body_measurements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own measurements"
  ON body_measurements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own measurements"
  ON body_measurements FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- WORKOUT PLANS TABLE
-- ============================================================================
DROP TABLE IF EXISTS workout_plans CASCADE;

CREATE TABLE workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week VARCHAR(10) NOT NULL, -- 'Monday', 'Tuesday', etc.
  focus VARCHAR(100),
  exercises TEXT, -- JSON string of exercises
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout plans"
  ON workout_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout plans"
  ON workout_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout plans"
  ON workout_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout plans"
  ON workout_plans FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- MEAL PLANS TABLE
-- ============================================================================
DROP TABLE IF EXISTS meal_plans CASCADE;

CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week VARCHAR(10) NOT NULL,
  meal_type VARCHAR(20) NOT NULL, -- 'Breakfast', 'Lunch', 'Dinner', 'Snacks'
  description TEXT,
  calories INTEGER,
  protein DECIMAL(5, 1),
  carbs DECIMAL(5, 1),
  fats DECIMAL(5, 1),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal plans"
  ON meal_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal plans"
  ON meal_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plans"
  ON meal_plans FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal plans"
  ON meal_plans FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PROGRESS PHOTOS TABLE
-- ============================================================================
DROP TABLE IF EXISTS progress_photos CASCADE;

CREATE TABLE progress_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  photo_url TEXT NOT NULL,
  photo_type VARCHAR(20), -- 'front', 'side', 'back'
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own photos"
  ON progress_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photos"
  ON progress_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own photos"
  ON progress_photos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
  ON progress_photos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- USER GOALS TABLE
-- ============================================================================
DROP TABLE IF EXISTS user_goals CASCADE;

CREATE TABLE user_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type VARCHAR(50) NOT NULL, -- 'weight_loss', 'muscle_gain', etc.
  target_value DECIMAL(10, 2),
  current_value DECIMAL(10, 2),
  start_date DATE,
  target_date DATE,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'abandoned'
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON user_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own goals"
  ON user_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON user_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON user_goals FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER TO AUTO-CREATE USER PROFILE
-- ============================================================================
-- This function automatically creates a user profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone_number)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone_number'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone_number = EXCLUDED.phone_number,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- INDEXES FOR BETTER QUERY PERFORMANCE
-- ============================================================================
CREATE INDEX idx_daily_check_ins_user_id ON daily_check_ins(user_id);
CREATE INDEX idx_daily_check_ins_date ON daily_check_ins(date);
CREATE INDEX idx_body_measurements_user_id ON body_measurements(user_id);
CREATE INDEX idx_body_measurements_date ON body_measurements(date);
CREATE INDEX idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX idx_progress_photos_user_id ON progress_photos(user_id);
CREATE INDEX idx_progress_photos_date ON progress_photos(date);
CREATE INDEX idx_user_goals_user_id ON user_goals(user_id);

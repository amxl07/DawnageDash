-- ============================================================================
-- HIERARCHICAL WORKOUT PLANS MIGRATION
-- ============================================================================
-- This migration:
-- 1. Updates workout_plans table with hierarchical columns
-- 2. Creates workout_templates table for GLOBAL templates (no user_id)
-- 3. Inserts master templates that all users can access
-- ============================================================================

-- Step 1: Add new columns to workout_plans
ALTER TABLE workout_plans 
ADD COLUMN IF NOT EXISTS workout_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS sub_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS days_per_week INTEGER,
ADD COLUMN IF NOT EXISTS day_number INTEGER;

-- Step 2: Drop the old day_of_week column
ALTER TABLE workout_plans DROP COLUMN IF EXISTS day_of_week;

-- Step 3: Update level values from 'Professional' to 'Advanced'
UPDATE workout_plans SET level = 'Advanced' WHERE level = 'Professional';

-- Step 4: Create indexes for workout_plans
CREATE INDEX IF NOT EXISTS idx_workout_plans_hierarchy 
ON workout_plans(user_id, level, workout_type, sub_category, days_per_week);

-- ============================================================================
-- Step 5: Create workout_templates table (GLOBAL - no user_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level VARCHAR(20) NOT NULL DEFAULT 'Beginner',
  workout_type VARCHAR(50) NOT NULL,
  sub_category VARCHAR(50),
  days_per_week INTEGER NOT NULL,
  day_number INTEGER NOT NULL,
  focus VARCHAR(100),
  exercises TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for template lookups
CREATE INDEX IF NOT EXISTS idx_workout_templates_hierarchy 
ON workout_templates(level, workout_type, sub_category, days_per_week);

-- ============================================================================
-- TEMPLATE DATA: Beginner - GYM_WORKOUT - 0_EXPERIENCE - 3-day
-- ============================================================================

-- Day 1: Full Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'GYM_WORKOUT',
  '0_EXPERIENCE',
  3,
  1,
  'Full Body',
  '[
    {"name": "Push Ups", "sets": 1, "reps": "12"},
    {"name": "Chest Press Machine", "sets": 1, "reps": "12"},
    {"name": "Pull Ups (Assisted)", "sets": 1, "reps": "12"},
    {"name": "Leg Extension", "sets": 1, "reps": "12"},
    {"name": "DB Lateral Raise", "sets": 1, "reps": "12"},
    {"name": "OH Single Arm DB", "sets": 1, "reps": "12"},
    {"name": "Preacher Curl Machine", "sets": 1, "reps": "12"}
  ]'::TEXT
);

-- Day 2: Full Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '0_EXPERIENCE',
  3,
  2,
  'Full Body',
  '[
    {"name": "Lat Pull Down", "sets": 1, "reps": "12"},
    {"name": "DB Chest Press", "sets": 1, "reps": "12"},
    {"name": "Wide Grip Cable Row", "sets": 1, "reps": "12"},
    {"name": "Smith Machine", "sets": 1, "reps": "12"},
    {"name": "Lunges", "sets": 1, "reps": "12"},
    {"name": "Plank & Crunches", "sets": 1, "reps": "12"}
  ]'::TEXT
);

-- Day 3: Full Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '0_EXPERIENCE',
  3,
  3,
  'Full Body',
  '[
    {"name": "Squat", "sets": 1, "reps": "12"},
    {"name": "Single Arm DB Row", "sets": 1, "reps": "12"},
    {"name": "Hamstring Curl Machine", "sets": 1, "reps": "12"},
    {"name": "Pec Fly", "sets": 1, "reps": "12"},
    {"name": "Shrugs", "sets": 1, "reps": "12"},
    {"name": "Hammer Curl", "sets": 1, "reps": "12"},
    {"name": "Cable Push Down", "sets": 1, "reps": "12"}
  ]'::TEXT
);

-- ============================================================================
-- TEMPLATE DATA: Beginner - GYM_WORKOUT - 0_EXPERIENCE - 4-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '0_EXPERIENCE',
  4,
  1,
  'Push',
  '[
    {"name": "Push Ups", "sets": 1, "reps": "12"},
    {"name": "Incline DB Press", "sets": 1, "reps": "12"},
    {"name": "DB Shoulder Press", "sets": 1, "reps": "12"},
    {"name": "Close Grip Push Ups", "sets": 1, "reps": "12"},
    {"name": "OH Single Arm DB", "sets": 1, "reps": "12"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '0_EXPERIENCE',
  4,
  2,
  'Pull',
  '[
    {"name": "Pull Ups (Assisted)", "sets": 1, "reps": "12"},
    {"name": "Lat Pull Down", "sets": 1, "reps": "12"},
    {"name": "Wide Grip Cable Row", "sets": 1, "reps": "12"},
    {"name": "Cable Bicep Curl", "sets": 1, "reps": "12"},
    {"name": "Reverse Curl", "sets": 1, "reps": "12"}
  ]'::TEXT
);

-- Day 3: Leg
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '0_EXPERIENCE',
  4,
  3,
  'Leg',
  '[
    {"name": "Squats", "sets": 1, "reps": "12"},
    {"name": "Leg Extension", "sets": 1, "reps": "12"},
    {"name": "Hamstring Curl & Calf Raise", "sets": 1, "reps": "12"}
  ]'::TEXT
);

-- Day 4: Full Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '0_EXPERIENCE',
  4,
  4,
  'Full Body',
  '[
    {"name": "Chest Press Machine", "sets": 1, "reps": "12"},
    {"name": "Single-Arm DB Rows", "sets": 1, "reps": "12"},
    {"name": "Lunges", "sets": 1, "reps": "12"},
    {"name": "Smith Machine", "sets": 1, "reps": "12"},
    {"name": "DB Lateral Raise", "sets": 1, "reps": "12"},
    {"name": "Preacher Curl", "sets": 1, "reps": "12"},
    {"name": "DB Skull Crush", "sets": 1, "reps": "12"}
  ]'::TEXT
);

-- ============================================================================
-- TEMPLATE DATA: Beginner - GYM_WORKOUT - 6_MONTH_EXPERIENCE - 4-day
-- ============================================================================

-- Day 1: Upper Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  4,
  1,
  'Upper Body',
  '[
    {"name": "BB Chest Press", "sets": 3, "reps": "12"},
    {"name": "Pull Ups", "sets": 3, "reps": "12"},
    {"name": "Incline DB Press", "sets": 3, "reps": "12"},
    {"name": "DB Shoulder Press", "sets": 3, "reps": "12"},
    {"name": "Cable Push Down", "sets": 3, "reps": "12"},
    {"name": "DB Hammer Curl", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- Day 2: Lower Body & Abs
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  4,
  2,
  'Lower Body & Abs',
  '[
    {"name": "BB Squats", "sets": 3, "reps": "12"},
    {"name": "Walking Lunges", "sets": 3, "reps": "12"},
    {"name": "Leg Extension", "sets": 3, "reps": "12"},
    {"name": "Hamstring Curl", "sets": 3, "reps": "12"},
    {"name": "Standing Calf Raise", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- Day 3: Upper Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  4,
  3,
  'Upper Body',
  '[
    {"name": "Lat Pull Down", "sets": 3, "reps": "12"},
    {"name": "Chest Press Machine", "sets": 3, "reps": "12"},
    {"name": "Wide Cable Row", "sets": 3, "reps": "12"},
    {"name": "Lateral Raise", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- Day 4: Lower Body & Abs
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  4,
  4,
  'Lower Body & Abs',
  '[
    {"name": "BB RDL", "sets": 3, "reps": "12"},
    {"name": "Bulgarian Split Squats", "sets": 3, "reps": "12"},
    {"name": "Hamstring Curls", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- ============================================================================
-- TEMPLATE DATA: Beginner - GYM_WORKOUT - 6_MONTH_EXPERIENCE - 5-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  5,
  1,
  'Push',
  '[
    {"name": "BB Chest Press", "sets": 3, "reps": "12"},
    {"name": "Incline DB Press", "sets": 3, "reps": "12"},
    {"name": "Shoulder Press", "sets": 3, "reps": "12"},
    {"name": "DB Lateral Raise", "sets": 3, "reps": "12"},
    {"name": "Cable Push Down", "sets": 3, "reps": "12"},
    {"name": "OH Tricep Extension", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  5,
  2,
  'Pull',
  '[
    {"name": "Pull Up", "sets": 3, "reps": "12"},
    {"name": "Lat Pull Down", "sets": 3, "reps": "12"},
    {"name": "Single Arm DB Row", "sets": 3, "reps": "12"},
    {"name": "BB Shrugs", "sets": 3, "reps": "12"},
    {"name": "Seated Incline Curls", "sets": 3, "reps": "12"},
    {"name": "Reverse Curls", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- Day 3: Leg & Abs
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  5,
  3,
  'Leg & Abs',
  '[
    {"name": "Leg Press", "sets": 3, "reps": "12"},
    {"name": "Leg Extension", "sets": 3, "reps": "12"},
    {"name": "Seated Calf Raise", "sets": 3, "reps": "12"},
    {"name": "Hamstring Curls", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- Day 4: Upper Body
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  5,
  4,
  'Upper Body',
  '[
    {"name": "BB Chest Press", "sets": 3, "reps": "12"},
    {"name": "Pull Ups", "sets": 3, "reps": "12"},
    {"name": "Incline DB Press", "sets": 3, "reps": "12"},
    {"name": "DB Shoulder Press", "sets": 3, "reps": "12"},
    {"name": "Cable Push Down", "sets": 3, "reps": "12"},
    {"name": "DB Hammer Curl", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- Day 5: Lower Body & Abs
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  5,
  5,
  'Lower Body & Abs',
  '[
    {"name": "BB Squats", "sets": 3, "reps": "12"},
    {"name": "Walking Lunges", "sets": 3, "reps": "12"},
    {"name": "Leg Extension", "sets": 3, "reps": "12"},
    {"name": "Hamstring Curl", "sets": 3, "reps": "12"},
    {"name": "Standing Calf Raise", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- ============================================================================
-- TEMPLATE DATA: Beginner - GYM_WORKOUT - 6_MONTH_EXPERIENCE - 6-day
-- ============================================================================

-- Day 1: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  6,
  1,
  'Push',
  '[
    {"name": "BB Chest Press", "sets": 3, "reps": "12"},
    {"name": "Incline DB Press", "sets": 3, "reps": "12"},
    {"name": "Shoulder Press", "sets": 3, "reps": "12"},
    {"name": "DB Lateral Raise", "sets": 3, "reps": "12"},
    {"name": "Cable Push Down", "sets": 3, "reps": "12"},
    {"name": "OH Tricep Extension", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- Day 2: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  6,
  2,
  'Pull',
  '[
    {"name": "Pull Up", "sets": 3, "reps": "12"},
    {"name": "Reverse Grip Lat Pull Down", "sets": 3, "reps": "12"},
    {"name": "Single Arm DB Row", "sets": 3, "reps": "12"},
    {"name": "BB Shrugs", "sets": 3, "reps": "12"},
    {"name": "Seated Incline Biceps Curls", "sets": 3, "reps": "12"},
    {"name": "Reverse Curls", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- Day 3: Leg & Abs
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  6,
  3,
  'Leg & Abs',
  '[
    {"name": "Leg Press", "sets": 3, "reps": "12"},
    {"name": "Leg Extension", "sets": 3, "reps": "12"},
    {"name": "Seated Calf Raise", "sets": 3, "reps": "12"},
    {"name": "Hamstring Curls", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- Day 4: Push
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  6,
  4,
  'Push',
  '[
    {"name": "BB Chest Press", "sets": 3, "reps": "12"},
    {"name": "Incline DB Press", "sets": 3, "reps": "12"},
    {"name": "Shoulder Press", "sets": 3, "reps": "12"},
    {"name": "CB Lateral Raise", "sets": 3, "reps": "12"},
    {"name": "Cable Push Down", "sets": 3, "reps": "12"},
    {"name": "OH Tricep Extension", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- Day 5: Pull
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  6,
  5,
  'Pull',
  '[
    {"name": "Pull Up", "sets": 3, "reps": "12"},
    {"name": "Reverse Grip Lat Pull Down", "sets": 3, "reps": "12"},
    {"name": "Single Arm DB Row", "sets": 3, "reps": "12"},
    {"name": "BB Shrugs", "sets": 3, "reps": "12"},
    {"name": "Seated Incline Curls", "sets": 3, "reps": "12"},
    {"name": "Preacher Curls", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- Day 6: Leg & Abs
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  
  'Beginner',
  'GYM_WORKOUT',
  '6_MONTH_EXPERIENCE',
  6,
  6,
  'Leg & Abs',
  '[
    {"name": "Leg Press", "sets": 3, "reps": "12"},
    {"name": "Leg Extension", "sets": 3, "reps": "12"},
    {"name": "Seated Calf Raise", "sets": 3, "reps": "12"},
    {"name": "Hamstring Curls", "sets": 3, "reps": "12"}
  ]'::TEXT
);

-- ============================================================================
-- TEMPLATE DATA: Beginner - HOME_WORKOUT - JUST_BODYWEIGHT - 3-day
-- ============================================================================

-- Day 1: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  3,
  1,
  'Full',
  '[
    {"name": "Hindu Pushups", "sets": 3, "reps": "MAX"},
    {"name": "Bed Sheet Rows", "sets": 3, "reps": "12-15"},
    {"name": "Squat", "sets": 3, "reps": "15-20"},
    {"name": "Incline Pushups", "sets": 3, "reps": "15"}
  ]'::TEXT
);

-- Day 2: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  3,
  2,
  'Full',
  '[
    {"name": "Stationary Lunges", "sets": 3, "reps": "15-20"},
    {"name": "Incline Close Grip Pushups", "sets": 3, "reps": "15"},
    {"name": "Hip Thrusts", "sets": 3, "reps": "10-15"},
    {"name": "Bed Sheet Wide Rows", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);

-- Day 3: Full
INSERT INTO workout_templates (level, workout_type, sub_category, days_per_week, day_number, focus, exercises)
VALUES (
  'Beginner',
  'HOME_WORKOUT',
  'JUST_BODYWEIGHT',
  3,
  3,
  'Full',
  '[
    {"name": "Bed Sheet Single Arm Rows", "sets": 3, "reps": "12-15"},
    {"name": "Incline Pushups", "sets": 3, "reps": "15"},
    {"name": "Weighted Curls", "sets": 3, "reps": "15-20"},
    {"name": "Bodyweight Skullcrushers", "sets": 3, "reps": "12-15"}
  ]'::TEXT
);


-- Add active_workout_plan column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS active_workout_plan TEXT;

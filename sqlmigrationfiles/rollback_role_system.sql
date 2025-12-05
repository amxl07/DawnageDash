-- ============================================================================
-- ROLLBACK: Remove Role-Based System Changes
-- Run this in Supabase SQL Editor to undo the role-based system migration
-- ============================================================================

-- Remove the coach-related RLS policies (if they exist)
DROP POLICY IF EXISTS "Coaches can view client check-ins" ON daily_check_ins;
DROP POLICY IF EXISTS "Coaches can view client measurements" ON body_measurements;
DROP POLICY IF EXISTS "Coaches can view client workout plans" ON workout_plans;
DROP POLICY IF EXISTS "Coaches can view client meal plans" ON meal_plans;
DROP POLICY IF EXISTS "Coaches can view client goals" ON user_goals;
DROP POLICY IF EXISTS "Coaches can view client workout logs" ON workout_logs;
DROP POLICY IF EXISTS "Coaches can view client photos" ON progress_photos;

DROP POLICY IF EXISTS "Coaches can view assigned clients" ON users;
DROP POLICY IF EXISTS "Coaches can view unassigned clients" ON users;
DROP POLICY IF EXISTS "Coaches can assign clients" ON users;

-- Remove check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS check_valid_role;

-- Remove indexes
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_coach_id;

-- Remove the columns
ALTER TABLE users DROP COLUMN IF EXISTS role;
ALTER TABLE users DROP COLUMN IF EXISTS coach_id;

-- Verify the rollback
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'users';

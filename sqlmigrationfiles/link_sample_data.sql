-- ============================================================================
-- Link Sample Data to Your User Account
-- ============================================================================
-- Run this in Supabase SQL Editor AFTER you've signed up
--
-- Step 1: First, get your user ID by running this query:
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;
--
-- Step 2: Copy your user ID from the result
-- Step 3: Replace 'YOUR_USER_ID_HERE' below with your actual user ID
-- Step 4: Run the UPDATE statements below
-- ============================================================================

-- REPLACE THIS WITH YOUR ACTUAL USER ID (it looks like: 12345678-1234-1234-1234-123456789abc)
-- Get it from the query above
DO $$
DECLARE
  my_user_id UUID := '7fb9f278-2317-421d-a422-0daa7259615e'; -- REPLACE WITH YOUR USER ID
BEGIN
  -- Update daily_check_ins
  UPDATE daily_check_ins
  SET user_id = my_user_id
  WHERE user_id IS NOT NULL OR user_id IS NULL;

  -- Update body_measurements
  UPDATE body_measurements
  SET user_id = my_user_id
  WHERE user_id IS NOT NULL OR user_id IS NULL;

  -- Update workout_plans
  UPDATE workout_plans
  SET user_id = my_user_id
  WHERE user_id IS NOT NULL OR user_id IS NULL;

  -- Update meal_plans
  UPDATE meal_plans
  SET user_id = my_user_id
  WHERE user_id IS NOT NULL OR user_id IS NULL;

  -- Update progress_photos
  UPDATE progress_photos
  SET user_id = my_user_id
  WHERE user_id IS NOT NULL OR user_id IS NULL;

  -- Update user_goals
  UPDATE user_goals
  SET user_id = my_user_id
  WHERE user_id IS NOT NULL OR user_id IS NULL;

  RAISE NOTICE 'Successfully linked all sample data to user %', my_user_id;
END $$;

-- Verify the data is linked
SELECT
  'daily_check_ins' as table_name,
  COUNT(*) as record_count
FROM daily_check_ins
WHERE user_id = '7fb9f278-2317-421d-a422-0daa7259615e'

UNION ALL

SELECT
  'body_measurements' as table_name,
  COUNT(*) as record_count
FROM body_measurements
WHERE user_id = '7fb9f278-2317-421d-a422-0daa7259615e'

UNION ALL

SELECT
  'workout_plans' as table_name,
  COUNT(*) as record_count
FROM workout_plans
WHERE user_id = '7fb9f278-2317-421d-a422-0daa7259615e'

UNION ALL

SELECT
  'meal_plans' as table_name,
  COUNT(*) as record_count
FROM meal_plans
WHERE user_id = '7fb9f278-2317-421d-a422-0daa7259615e';

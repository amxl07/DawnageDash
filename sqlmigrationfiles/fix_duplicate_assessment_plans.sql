-- ============================================================================
-- FIX DUPLICATE ASSESSMENT PLAN ENTRIES
-- ============================================================================
-- Removes duplicate rows from workout_templates and workout_plans
-- where the same day_number appears multiple times for an assessment plan.
-- Keeps only the most recent entry (highest id) for each day_number.
-- ============================================================================

-- 1. Fix duplicates in workout_templates for ASSESSMENT plans
DELETE FROM workout_templates
WHERE id NOT IN (
  SELECT MAX(id)
  FROM workout_templates
  WHERE workout_type = 'ASSESSMENT' AND sub_category = '5_DAY_PLAN'
  GROUP BY level, workout_type, sub_category, days_per_week, day_number
)
AND workout_type = 'ASSESSMENT'
AND sub_category = '5_DAY_PLAN';

-- 2. Fix duplicates in workout_plans for ASSESSMENT plans (per user)
DELETE FROM workout_plans
WHERE id NOT IN (
  SELECT MAX(id)
  FROM workout_plans
  WHERE workout_type = 'ASSESSMENT' AND sub_category = '5_DAY_PLAN'
  GROUP BY user_id, level, workout_type, sub_category, days_per_week, day_number
)
AND workout_type = 'ASSESSMENT'
AND sub_category = '5_DAY_PLAN';

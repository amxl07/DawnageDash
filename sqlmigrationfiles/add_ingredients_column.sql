
-- Add ingredients column to meal_plans
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS ingredients TEXT;

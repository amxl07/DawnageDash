
-- Add active_meal_plan column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_meal_plan TEXT;

-- Create meal_templates table
CREATE TABLE IF NOT EXISTS meal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  calories_target INTEGER NOT NULL,
  diet_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add new columns to meal_plans
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS diet_type VARCHAR(50);
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS calories_target INTEGER;

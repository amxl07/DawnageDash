-- ============================================================================
-- MIGRATION: TEMPLATE BUILDER - COACH TEMPLATES + PERMISSIONS
-- ============================================================================

-- 1. Add coach_id to workout_templates (NULL = global, non-NULL = coach-private)
ALTER TABLE workout_templates
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 2. Add template_name to workout_templates for friendly identification
ALTER TABLE workout_templates
ADD COLUMN IF NOT EXISTS template_name VARCHAR(100);

-- 3. Add coach_id to meal_templates (NULL = global, non-NULL = coach-private)
ALTER TABLE meal_templates
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 4. Add permission flag to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS can_edit_global_templates BOOLEAN DEFAULT FALSE;

-- 5. Grant admin the permission by default
UPDATE users SET can_edit_global_templates = TRUE WHERE role = 'admin';

-- 6. Create indexes for coach-specific template queries
CREATE INDEX IF NOT EXISTS idx_workout_templates_coach
ON workout_templates(coach_id);

CREATE INDEX IF NOT EXISTS idx_meal_templates_coach
ON meal_templates(coach_id);

-- 7. Enable RLS on template tables (if not already enabled)
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR workout_templates
-- ============================================================================

-- Anyone can read global workout templates
DROP POLICY IF EXISTS "Anyone can read global workout templates" ON workout_templates;
CREATE POLICY "Anyone can read global workout templates"
ON workout_templates FOR SELECT
USING (coach_id IS NULL);

-- Coaches can read their own workout templates
DROP POLICY IF EXISTS "Coaches can read own workout templates" ON workout_templates;
CREATE POLICY "Coaches can read own workout templates"
ON workout_templates FOR SELECT
USING (coach_id = auth.uid());

-- Admins can read all workout templates
DROP POLICY IF EXISTS "Admins can read all workout templates" ON workout_templates;
CREATE POLICY "Admins can read all workout templates"
ON workout_templates FOR SELECT
USING (public.is_admin());

-- Coaches can insert their own templates; authorized users can insert global
DROP POLICY IF EXISTS "Authorized users can insert workout templates" ON workout_templates;
CREATE POLICY "Authorized users can insert workout templates"
ON workout_templates FOR INSERT
WITH CHECK (
  coach_id = auth.uid()
  OR (coach_id IS NULL AND (
    public.is_admin()
    OR (SELECT can_edit_global_templates FROM users WHERE id = auth.uid())
  ))
);

-- Coaches can update their own templates; authorized users can update global
DROP POLICY IF EXISTS "Authorized users can update workout templates" ON workout_templates;
CREATE POLICY "Authorized users can update workout templates"
ON workout_templates FOR UPDATE
USING (
  coach_id = auth.uid()
  OR (coach_id IS NULL AND (
    public.is_admin()
    OR (SELECT can_edit_global_templates FROM users WHERE id = auth.uid())
  ))
);

-- Coaches can delete their own templates; authorized users can delete global
DROP POLICY IF EXISTS "Authorized users can delete workout templates" ON workout_templates;
CREATE POLICY "Authorized users can delete workout templates"
ON workout_templates FOR DELETE
USING (
  coach_id = auth.uid()
  OR (coach_id IS NULL AND (
    public.is_admin()
    OR (SELECT can_edit_global_templates FROM users WHERE id = auth.uid())
  ))
);

-- ============================================================================
-- RLS POLICIES FOR meal_templates
-- ============================================================================

-- Anyone can read global meal templates
DROP POLICY IF EXISTS "Anyone can read global meal templates" ON meal_templates;
CREATE POLICY "Anyone can read global meal templates"
ON meal_templates FOR SELECT
USING (coach_id IS NULL);

-- Coaches can read their own meal templates
DROP POLICY IF EXISTS "Coaches can read own meal templates" ON meal_templates;
CREATE POLICY "Coaches can read own meal templates"
ON meal_templates FOR SELECT
USING (coach_id = auth.uid());

-- Admins can read all meal templates
DROP POLICY IF EXISTS "Admins can read all meal templates" ON meal_templates;
CREATE POLICY "Admins can read all meal templates"
ON meal_templates FOR SELECT
USING (public.is_admin());

-- Coaches can insert their own meal templates; authorized users can insert global
DROP POLICY IF EXISTS "Authorized users can insert meal templates" ON meal_templates;
CREATE POLICY "Authorized users can insert meal templates"
ON meal_templates FOR INSERT
WITH CHECK (
  coach_id = auth.uid()
  OR (coach_id IS NULL AND (
    public.is_admin()
    OR (SELECT can_edit_global_templates FROM users WHERE id = auth.uid())
  ))
);

-- Coaches can update their own meal templates; authorized users can update global
DROP POLICY IF EXISTS "Authorized users can update meal templates" ON meal_templates;
CREATE POLICY "Authorized users can update meal templates"
ON meal_templates FOR UPDATE
USING (
  coach_id = auth.uid()
  OR (coach_id IS NULL AND (
    public.is_admin()
    OR (SELECT can_edit_global_templates FROM users WHERE id = auth.uid())
  ))
);

-- Coaches can delete their own meal templates; authorized users can delete global
DROP POLICY IF EXISTS "Authorized users can delete meal templates" ON meal_templates;
CREATE POLICY "Authorized users can delete meal templates"
ON meal_templates FOR DELETE
USING (
  coach_id = auth.uid()
  OR (coach_id IS NULL AND (
    public.is_admin()
    OR (SELECT can_edit_global_templates FROM users WHERE id = auth.uid())
  ))
);

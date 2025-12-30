-- ============================================================================
-- MIGRATION: ENABLE COACH "VIEW AS" ACCESS (Refined)
-- ============================================================================

-- GOAL: Allow caches to SELECT data from tables where the user_id belongs to a client assigned to them.
-- LOGIC: (auth.uid() = user_id) OR (EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.coach_id = auth.uid()))

-- 1. Helper Function (Optional but cleaner)
-- Checks if the current auth user is the coach of the target user_id
CREATE OR REPLACE FUNCTION public.is_coach_of(target_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.users 
    WHERE id = target_user_id 
      AND coach_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update Policies for Data Tables

-- Table: daily_check_ins
DROP POLICY IF EXISTS "Users can manage own checkins" ON public.daily_check_ins;
CREATE POLICY "Users and Coaches can view checkins"
ON public.daily_check_ins FOR SELECT
USING (
  auth.uid() = user_id OR public.is_coach_of(user_id)
);
-- Allow users to insert/update their own (Coaches CANNOT edit these)
CREATE POLICY "Users can insert own checkins"
ON public.daily_check_ins FOR INSERT
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own checkins"
ON public.daily_check_ins FOR UPDATE
USING (auth.uid() = user_id);


-- Table: body_measurements
DROP POLICY IF EXISTS "Users can manage own measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Users and Coaches can view measurements" ON public.body_measurements;
DROP POLICY IF EXISTS "Users can insert own measurements" ON public.body_measurements;

CREATE POLICY "Users and Coaches can view measurements"
ON public.body_measurements FOR SELECT
USING (
  auth.uid() = user_id OR public.is_coach_of(user_id)
);
-- Coaches CANNOT edit these
CREATE POLICY "Users can insert own measurements"
ON public.body_measurements FOR INSERT
WITH CHECK (auth.uid() = user_id);


-- Table: workout_plans
DROP POLICY IF EXISTS "Users can manage own workout plans" ON public.workout_plans;
CREATE POLICY "Users and Coaches can view workout plans"
ON public.workout_plans FOR SELECT
USING (
  auth.uid() = user_id OR public.is_coach_of(user_id)
);
-- Allow Coaches to manage plans (FULL ACCESS for Coaches on Plans)
CREATE POLICY "Coaches and Users can manage workout plans"
ON public.workout_plans FOR ALL
USING (
  auth.uid() = user_id OR public.is_coach_of(user_id)
);


-- Table: meal_plans
DROP POLICY IF EXISTS "Users can manage own meal plans" ON public.meal_plans;
CREATE POLICY "Users and Coaches can view meal plans"
ON public.meal_plans FOR SELECT
USING (
  auth.uid() = user_id OR public.is_coach_of(user_id)
);
-- Allow Coaches to manage plans (FULL ACCESS for Coaches on Plans)
CREATE POLICY "Coaches and Users can manage meal plans"
ON public.meal_plans FOR ALL
USING (
  auth.uid() = user_id OR public.is_coach_of(user_id)
);


-- Table: workout_logs
DROP POLICY IF EXISTS "Users can manage own logs" ON public.workout_logs;
CREATE POLICY "Users and Coaches can view workout logs"
ON public.workout_logs FOR SELECT
USING (
  auth.uid() = user_id OR public.is_coach_of(user_id)
);
-- Coaches CANNOT edit these
CREATE POLICY "Users can insert own logs"
ON public.workout_logs FOR INSERT
WITH CHECK (auth.uid() = user_id);


-- Table: user_goals
DROP POLICY IF EXISTS "Users can manage own goals" ON public.user_goals;
CREATE POLICY "Users and Coaches can view goals"
ON public.user_goals FOR SELECT
USING (
  auth.uid() = user_id OR public.is_coach_of(user_id)
);
-- Coaches CANNOT edit these
CREATE POLICY "Users can manage own goals"
ON public.user_goals FOR ALL
USING (auth.uid() = user_id);

-- ============================================================================
-- MIGRATION: ENABLE COACH WORKOUT LOG EDITING
-- ============================================================================
-- GOAL: Allow coaches to create and edit workout logs for their assigned clients

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can insert own logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users and Coaches can view workout logs" ON public.workout_logs;

-- Create new policies that allow coaches to manage workout logs
CREATE POLICY "Users and Coaches can view workout logs"
ON public.workout_logs FOR SELECT
USING (
  auth.uid() = user_id OR public.is_coach_of(user_id)
);

CREATE POLICY "Users and Coaches can insert workout logs"
ON public.workout_logs FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR public.is_coach_of(user_id)
);

CREATE POLICY "Users and Coaches can update workout logs"
ON public.workout_logs FOR UPDATE
USING (
  auth.uid() = user_id OR public.is_coach_of(user_id)
);

CREATE POLICY "Users and Coaches can delete workout logs"
ON public.workout_logs FOR DELETE
USING (
  auth.uid() = user_id OR public.is_coach_of(user_id)
);

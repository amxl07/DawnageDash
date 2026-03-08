-- ============================================================================
-- MIGRATION: ENABLE ADMIN ROLE & RLS POLICIES
-- ============================================================================
-- Run this in Supabase SQL Editor to grant admin full read access.
-- After running, manually set role='admin' on your admin user in the users table
-- and in auth.users raw_user_meta_data: {"role": "admin"}

-- 1. Helper function: checks if the current auth user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Admin can view ALL users (coaches + clients)
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users"
ON public.users FOR SELECT
USING (public.is_admin());


-- 3. Admin can view ALL daily_check_ins
DROP POLICY IF EXISTS "Admins can view all checkins" ON public.daily_check_ins;
CREATE POLICY "Admins can view all checkins"
ON public.daily_check_ins FOR SELECT
USING (public.is_admin());


-- 4. Admin can view ALL body_measurements
DROP POLICY IF EXISTS "Admins can view all measurements" ON public.body_measurements;
CREATE POLICY "Admins can view all measurements"
ON public.body_measurements FOR SELECT
USING (public.is_admin());


-- 5. Admin can view ALL workout_plans
DROP POLICY IF EXISTS "Admins can view all workout plans" ON public.workout_plans;
CREATE POLICY "Admins can view all workout plans"
ON public.workout_plans FOR SELECT
USING (public.is_admin());


-- 6. Admin can view ALL meal_plans
DROP POLICY IF EXISTS "Admins can view all meal plans" ON public.meal_plans;
CREATE POLICY "Admins can view all meal plans"
ON public.meal_plans FOR SELECT
USING (public.is_admin());


-- 7. Admin can view ALL workout_logs
DROP POLICY IF EXISTS "Admins can view all workout logs" ON public.workout_logs;
CREATE POLICY "Admins can view all workout logs"
ON public.workout_logs FOR SELECT
USING (public.is_admin());


-- 8. Admin can view ALL weekly_check_ins
DROP POLICY IF EXISTS "Admins can view all weekly checkins" ON public.weekly_check_ins;
CREATE POLICY "Admins can view all weekly checkins"
ON public.weekly_check_ins FOR SELECT
USING (public.is_admin());


-- 9. Admin can view ALL user_goals
DROP POLICY IF EXISTS "Admins can view all goals" ON public.user_goals;
CREATE POLICY "Admins can view all goals"
ON public.user_goals FOR SELECT
USING (public.is_admin());


-- 10. Admin can view ALL progress_photos
DROP POLICY IF EXISTS "Admins can view all progress photos" ON public.progress_photos;
CREATE POLICY "Admins can view all progress photos"
ON public.progress_photos FOR SELECT
USING (public.is_admin());


-- 11. Admin can view ALL weekly_progress_photos
DROP POLICY IF EXISTS "Admins can view all weekly progress photos" ON public.weekly_progress_photos;
CREATE POLICY "Admins can view all weekly progress photos"
ON public.weekly_progress_photos FOR SELECT
USING (public.is_admin());


-- 12. Admin can view ALL onboarding_questionnaire
DROP POLICY IF EXISTS "Admins can view all questionnaires" ON public.onboarding_questionnaire;
CREATE POLICY "Admins can view all questionnaires"
ON public.onboarding_questionnaire FOR SELECT
USING (public.is_admin());

-- ============================================================
-- COMPREHENSIVE DATABASE FIX MIGRATION
-- Generated: 2026-03-08
--
-- This script fixes all confirmed database issues:
--   1. Enable RLS on 6 unprotected tables
--   2. Add missing RLS policies
--   3. Fix overly-permissive coach policies on users table
--   4. Remove duplicate policies
--   5. Fix coach_id foreign key cascade rule
--   6. Add missing indexes
--   7. Add unique constraints
--
-- RUN THIS IN SUPABASE SQL EDITOR (Dashboard > SQL Editor)
-- Review each section before running.
-- ============================================================

BEGIN;

-- ============================================================
-- SECTION 1: ENABLE RLS ON UNPROTECTED TABLES
-- These 6 tables currently have NO row-level security,
-- meaning any authenticated user can read/write anything.
-- ============================================================

ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 2: ADD MISSING RLS POLICIES
-- ============================================================

-- ---- food_items (shared reference table, no user_id) ----
-- Everyone authenticated can read food items
CREATE POLICY "Authenticated users can view food items"
  ON public.food_items FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify food items
CREATE POLICY "Admins can manage food items"
  ON public.food_items FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---- meal_templates (shared template table, no user_id) ----
-- Everyone authenticated can read meal templates
CREATE POLICY "Authenticated users can view meal templates"
  ON public.meal_templates FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify meal templates
CREATE POLICY "Admins can manage meal templates"
  ON public.meal_templates FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---- workout_templates (shared template table, no user_id) ----
-- Everyone authenticated can read workout templates
CREATE POLICY "Authenticated users can view workout templates"
  ON public.workout_templates FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify workout templates
CREATE POLICY "Admins can manage workout templates"
  ON public.workout_templates FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ---- weekly_progress_photos (has user_id, missing user CRUD) ----
-- Users can view their own photos
CREATE POLICY "Users can view own weekly progress photos"
  ON public.weekly_progress_photos FOR SELECT
  USING (auth.uid() = user_id);

-- Users can upload their own photos
CREATE POLICY "Users can insert own weekly progress photos"
  ON public.weekly_progress_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own photos
CREATE POLICY "Users can update own weekly progress photos"
  ON public.weekly_progress_photos FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own photos
CREATE POLICY "Users can delete own weekly progress photos"
  ON public.weekly_progress_photos FOR DELETE
  USING (auth.uid() = user_id);


-- ============================================================
-- SECTION 3: FIX COACH POLICIES ON USERS TABLE
-- Currently any coach can see/update ALL clients.
-- Fix: restrict to only their assigned clients (coach_id = auth.uid())
-- ============================================================

-- Drop the overly-permissive coach policies
DROP POLICY IF EXISTS "Coaches can view all clients" ON public.users;
DROP POLICY IF EXISTS "Coaches can update clients" ON public.users;

-- Recreate with proper restriction: coach can only see/update their OWN clients
CREATE POLICY "Coaches can view assigned clients"
  ON public.users FOR SELECT
  USING (
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'coach'::text)
    AND (role = 'client'::text)
    AND (coach_id = auth.uid())
  );

CREATE POLICY "Coaches can update assigned clients"
  ON public.users FOR UPDATE
  USING (
    (((auth.jwt() -> 'user_metadata'::text) ->> 'role'::text) = 'coach'::text)
    AND (role = 'client'::text)
    AND (coach_id = auth.uid())
  );


-- ============================================================
-- SECTION 4: REMOVE DUPLICATE POLICIES
-- daily_check_ins has duplicate INSERT and UPDATE policies.
-- users has duplicate SELECT and UPDATE policies.
-- ============================================================

-- daily_check_ins duplicates (keep the ones with hyphens, drop the ones without)
DROP POLICY IF EXISTS "Users can insert own checkins" ON public.daily_check_ins;
DROP POLICY IF EXISTS "Users can update own checkins" ON public.daily_check_ins;

-- daily_check_ins: "Users can view own check-ins" is redundant because
-- "Users and Coaches can view checkins" already covers auth.uid() = user_id
DROP POLICY IF EXISTS "Users can view own check-ins" ON public.daily_check_ins;

-- users duplicates (keep "own data", drop "own profile")
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;


-- ============================================================
-- SECTION 5: FIX FOREIGN KEY CASCADE RULE
-- users.coach_id currently has NO ACTION on delete.
-- If a coach user is deleted, all their clients would be orphaned.
-- Fix: SET NULL so clients become unassigned instead of blocking.
-- ============================================================

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_coach_id_fkey;

ALTER TABLE public.users
  ADD CONSTRAINT users_coach_id_fkey
  FOREIGN KEY (coach_id) REFERENCES public.users(id)
  ON DELETE SET NULL;


-- ============================================================
-- SECTION 6: ADD MISSING INDEXES
-- These columns are frequently queried but have no index.
-- ============================================================

-- users.coach_id — used in every coach query to find assigned clients
CREATE INDEX IF NOT EXISTS idx_users_coach_id
  ON public.users (coach_id);

-- users.role — used in RLS policies and filtered queries
CREATE INDEX IF NOT EXISTS idx_users_role
  ON public.users (role);

-- weekly_check_ins.user_id — used in coach client dashboard queries
CREATE INDEX IF NOT EXISTS idx_weekly_check_ins_user_id
  ON public.weekly_check_ins (user_id);

-- weekly_progress_photos.user_id — used in photo queries
CREATE INDEX IF NOT EXISTS idx_weekly_progress_photos_user_id
  ON public.weekly_progress_photos (user_id);

-- weekly_progress_photos.date — used in date-range queries
CREATE INDEX IF NOT EXISTS idx_weekly_progress_photos_date
  ON public.weekly_progress_photos (date);

-- food_items.name — used in search queries
CREATE INDEX IF NOT EXISTS idx_food_items_name
  ON public.food_items (name);

-- coach_client_history composite — used for retention calculations
CREATE INDEX IF NOT EXISTS idx_cch_coach_event
  ON public.coach_client_history (coach_id, event_type);


-- ============================================================
-- SECTION 7: ADD UNIQUE CONSTRAINTS
-- Prevent duplicate data entries.
-- ============================================================

-- Prevent duplicate daily check-ins for same user on same date
-- First check if any duplicates exist and keep only the latest
DELETE FROM public.daily_check_ins a
  USING public.daily_check_ins b
  WHERE a.user_id = b.user_id
    AND a.date = b.date
    AND a.id < b.id;

ALTER TABLE public.daily_check_ins
  ADD CONSTRAINT uq_daily_check_ins_user_date
  UNIQUE (user_id, date);


COMMIT;

-- ============================================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================================

-- Check RLS is enabled on all tables:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check all policies:
-- SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- Check foreign keys:
-- SELECT tc.table_name, kcu.column_name, rc.delete_rule
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public';

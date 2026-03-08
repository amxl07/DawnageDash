-- ============================================================================
-- GRANT ADMIN ACCESS TO A SPECIFIC USER BY EMAIL
-- ============================================================================
-- Run this in Supabase SQL Editor.
-- Replace 'your-email@example.com' with the actual email address.

DO $$
DECLARE
  target_email TEXT := 'your-email@example.com';  -- <-- CHANGE THIS
  target_user_id UUID;
BEGIN
  -- Find the user's UUID from auth.users
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user found with email: %', target_email;
  END IF;

  -- 1. Update role in public.users table
  UPDATE public.users
  SET role = 'admin', updated_at = NOW()
  WHERE id = target_user_id;

  -- 2. Update raw_user_meta_data in auth.users table
  UPDATE auth.users
  SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
  WHERE id = target_user_id;

  RAISE NOTICE 'Admin access granted to % (id: %)', target_email, target_user_id;
END $$;

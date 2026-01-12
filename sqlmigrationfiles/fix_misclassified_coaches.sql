-- ============================================================================
-- FIX MISCLASSIFIED COACHES
-- ============================================================================
-- This script updates the 'role' in the public.users table to 'coach'
-- for any user who selected 'coach' during signup (checked via auth.users metadata)
-- but was incorrectly assigned 'client' due to the trigger bug.
-- ============================================================================

UPDATE public.users
SET role = 'coach'
FROM auth.users
WHERE public.users.id = auth.users.id
  AND auth.users.raw_user_meta_data->>'role' = 'coach'
  AND public.users.role = 'client';

-- Verify the changes
SELECT id, email, role, full_name 
FROM public.users 
WHERE role = 'coach';

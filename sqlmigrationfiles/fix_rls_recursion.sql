-- ============================================================================
-- FIX: RESOLVE RLS INFINITE RECURSION
-- ============================================================================

-- The previous policies caused an infinite loop because checking if a user
-- is a coach required reading the 'users' table, which triggered the policy again.

-- We will switch to checking the 'user_metadata' inside the JWT token (auth.jwt()).
-- This is faster and avoids touching the table to check permissions.

-- 1. Drop the problematic recursive policies
DROP POLICY IF EXISTS "Coaches can view all clients" ON public.users;
DROP POLICY IF EXISTS "Coaches can update clients" ON public.users;


-- 2. Re-create policies using JWT metadata check

-- A. Allow Coaches (identified by metadata) to view all Clients
CREATE POLICY "Coaches can view all clients"
ON public.users FOR SELECT
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  AND role = 'client'
);

-- B. Allow Coaches to UPDATE clients
CREATE POLICY "Coaches can update clients"
ON public.users FOR UPDATE
USING (
  (auth.jwt() -> 'user_metadata' ->> 'role') = 'coach'
  AND role = 'client'
);

-- Note: The "Users can view own profile" policy needs no change as it doesn't recurse in a harmful way 
-- (it just checks ID equality).

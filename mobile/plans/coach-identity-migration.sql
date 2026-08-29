-- ============================================================================
-- Dawnage · A1 "Coach identity" — unblock client → coach reads
-- Additive only. No table, column, or existing policy is altered.
-- ============================================================================
--
-- WHY NOT A PLAIN RLS POLICY
-- The obvious fix is:
--     CREATE POLICY "Clients can view their assigned coach"
--     ON public.users FOR SELECT
--     USING (id = (SELECT coach_id FROM public.users WHERE id = auth.uid()));
--
-- That works, but RLS is ROW-level: it would expose the coach's ENTIRE row to
-- every one of their clients — email, phone_number, profile_data, package
-- fields, everything. The app needs exactly three columns.
--
-- A SECURITY DEFINER function returns only those three. It also matches the
-- convention already used in this codebase (is_coach_of, handle_new_user).
--
-- REVERSIBLE:  DROP FUNCTION IF EXISTS public.get_my_coach();
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_coach()
RETURNS TABLE (id uuid, full_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.full_name, c.avatar_url
  FROM public.users c
  WHERE c.id = (
    SELECT u.coach_id
    FROM public.users u
    WHERE u.id = auth.uid()
  );
$$;

-- Only signed-in users may call it. It is scoped to the caller's own coach,
-- so a client can never read anyone else's.
REVOKE ALL ON FUNCTION public.get_my_coach() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_coach() TO authenticated;

-- ============================================================================
-- VERIFY (run as a signed-in client — should return exactly one row):
--   SELECT * FROM public.get_my_coach();
--
-- VERIFY it leaks nothing else — this must still return 0 rows for a client:
--   SELECT id FROM public.users WHERE role = 'coach';
-- ============================================================================

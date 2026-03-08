-- ============================================================================
-- BACKFILL: Insert 'assigned' events for all currently assigned clients
-- ============================================================================
-- Run this AFTER create_coach_client_history.sql
-- This creates an initial 'assigned' event for every client that already
-- has a coach_id, so retention tracking works immediately.

INSERT INTO public.coach_client_history (coach_id, client_id, event_type, package_type, package_duration, reason, created_at)
SELECT
  u.coach_id,
  u.id,
  'assigned',
  u.package_type,
  u.package_duration,
  'Backfilled from existing assignment',
  COALESCE(u.updated_at, u.created_at, now())
FROM public.users u
WHERE u.role = 'client'
  AND u.coach_id IS NOT NULL
  AND NOT EXISTS (
    -- Skip if an 'assigned' event already exists for this coach-client pair
    SELECT 1 FROM public.coach_client_history h
    WHERE h.coach_id = u.coach_id
      AND h.client_id = u.id
      AND h.event_type = 'assigned'
  );

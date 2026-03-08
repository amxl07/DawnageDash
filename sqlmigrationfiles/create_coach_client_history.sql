-- ============================================================================
-- MIGRATION: CREATE coach_client_history TABLE FOR RETENTION TRACKING
-- ============================================================================
-- Run this in Supabase SQL Editor.
-- This table logs every assign/unassign event so we can calculate
-- true retention, churn, and client tenure per coach.

CREATE TABLE IF NOT EXISTS public.coach_client_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL,   -- 'assigned' or 'unassigned'
  package_type TEXT,                  -- Package at time of event (snapshot)
  package_duration INTEGER,           -- Duration at time of event (snapshot)
  reason TEXT,                        -- Optional context
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by coach
CREATE INDEX IF NOT EXISTS idx_cch_coach_id ON public.coach_client_history(coach_id);
-- Index for fast lookups by client
CREATE INDEX IF NOT EXISTS idx_cch_client_id ON public.coach_client_history(client_id);
-- Index for event filtering
CREATE INDEX IF NOT EXISTS idx_cch_event_type ON public.coach_client_history(event_type);

-- Enable RLS
ALTER TABLE public.coach_client_history ENABLE ROW LEVEL SECURITY;

-- Coaches can view their own history
DROP POLICY IF EXISTS "Coaches can view own history" ON public.coach_client_history;
CREATE POLICY "Coaches can view own history"
ON public.coach_client_history FOR SELECT
USING (coach_id = auth.uid());

-- Coaches can insert their own history records
DROP POLICY IF EXISTS "Coaches can insert own history" ON public.coach_client_history;
CREATE POLICY "Coaches can insert own history"
ON public.coach_client_history FOR INSERT
WITH CHECK (coach_id = auth.uid());

-- Admins can view all history
DROP POLICY IF EXISTS "Admins can view all history" ON public.coach_client_history;
CREATE POLICY "Admins can view all history"
ON public.coach_client_history FOR SELECT
USING (public.is_admin());

-- ============================================================================
-- MIGRATION: ADD SUPPLEMENTS DATA COLUMN TO USERS TABLE
-- ============================================================================
-- Add structured supplements data column for storing supplement plan as JSON

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS supplements_data TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.users.supplements_data IS 'Structured supplements plan stored as JSON array: [{id, name, serving, timing}]';

-- ============================================================================
-- MIGRATION: ADD TRAINING AND NUTRITION NOTES TO USERS TABLE
-- ============================================================================
-- Add general training and nutrition notes columns to users table

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS training_note TEXT,
ADD COLUMN IF NOT EXISTS nutrition_note TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.users.training_note IS 'General training notes and instructions';
COMMENT ON COLUMN public.users.nutrition_note IS 'General nutrition notes and guidelines';

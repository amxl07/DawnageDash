-- Add onboarding_step column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;

-- Update RLS policies to ensure user can update their own onboarding step
-- (Assuming existing update policy covers this, but good to verify or be safe)
-- Usually "enable_update_for_users_own_rows" covers all columns, so this should be fine.

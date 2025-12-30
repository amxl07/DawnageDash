-- Add profile_data JSONB column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_data JSONB DEFAULT '{}'::jsonb;

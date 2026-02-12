-- Add supplements_note column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS supplements_note TEXT;

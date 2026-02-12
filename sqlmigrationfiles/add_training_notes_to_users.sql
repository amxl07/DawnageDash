-- Add cardio_note and steps_note columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS cardio_note TEXT,
ADD COLUMN IF NOT EXISTS steps_note TEXT;

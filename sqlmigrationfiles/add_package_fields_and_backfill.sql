-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS package_duration INTEGER,
ADD COLUMN IF NOT EXISTS package_start_date DATE;

-- Backfill package_start_date for users who have already checked in
-- Set it to the date of their VERY FIRST check-in
UPDATE users u
SET package_start_date = (
    SELECT MIN(date)
    FROM daily_check_ins dci
    WHERE dci.user_id = u.id
)
WHERE package_start_date IS NULL
AND EXISTS (
    SELECT 1 
    FROM daily_check_ins dci 
    WHERE dci.user_id = u.id
);

-- Optional: Set default duration to 3 months for existing active clients if null
-- You can remove this if you prefer them to be null until set by coach
-- UPDATE users SET package_duration = 3 WHERE package_duration IS NULL AND role = 'client';

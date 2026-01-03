-- Add package_type column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS package_type text;

-- Add comment to document values
COMMENT ON COLUMN users.package_type IS 'Client package tier: premium, intermediate, or basic';

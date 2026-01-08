-- ============================================================================
-- Migration: Remove day_number column from daily_check_ins table
-- ============================================================================
-- Run this in your Supabase SQL Editor
-- 
-- This removes the day_number column as it's now computed dynamically
-- from the date field in the frontend code.
-- ============================================================================

-- Drop the day_number column from daily_check_ins table
ALTER TABLE daily_check_ins DROP COLUMN IF EXISTS day_number;

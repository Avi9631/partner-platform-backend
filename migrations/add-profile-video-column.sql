-- Migration: Add profile video column to platform_user table
-- Created: 2025-11-14

-- Add profile video URL column
ALTER TABLE platform_user 
ADD COLUMN user_profile_video VARCHAR(500) NULL;

-- Add index for faster queries
CREATE INDEX idx_profile_video ON platform_user(user_profile_video);

-- Comments
COMMENT ON COLUMN platform_user.user_profile_video IS 'URL/path to user verification video stored in Supabase/S3';

-- Migration: Add profile_completed column to platform_users table
-- Date: 2025-11-13

-- Add the profile_completed column
ALTER TABLE platform_users 
ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;

-- Set existing users to have profile_completed = TRUE if they have firstName, lastName, and phone
UPDATE platform_users 
SET profile_completed = TRUE 
WHERE user_first_name IS NOT NULL 
  AND user_last_name IS NOT NULL 
  AND user_phone IS NOT NULL;

-- Add comment to column
COMMENT ON COLUMN platform_users.profile_completed IS 'Indicates whether the user has completed their profile setup';

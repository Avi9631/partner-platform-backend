-- Migration: Add location and profile image columns to platform_user table
-- Created: 2025-11-14

-- Add latitude column
ALTER TABLE platform_user 
ADD COLUMN user_latitude DECIMAL(10, 8) NULL;

-- Add longitude column
ALTER TABLE platform_user 
ADD COLUMN user_longitude DECIMAL(11, 8) NULL;

-- Add address column
ALTER TABLE platform_user 
ADD COLUMN user_address TEXT NULL;

-- Add profile image URL column
ALTER TABLE platform_user 
ADD COLUMN user_profile_image VARCHAR(500) NULL;

-- Add verification status column
ALTER TABLE platform_user 
ADD COLUMN verification_status ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING';

-- Add verification notes column (for admin notes during verification)
ALTER TABLE platform_user 
ADD COLUMN verification_notes TEXT NULL;

-- Add verified at timestamp
ALTER TABLE platform_user 
ADD COLUMN verified_at DATETIME NULL;

-- Create index on verification status
CREATE INDEX idx_verification_status ON platform_user(verification_status);

-- Comments
COMMENT ON COLUMN platform_user.user_latitude IS 'User location latitude coordinate';
COMMENT ON COLUMN platform_user.user_longitude IS 'User location longitude coordinate';
COMMENT ON COLUMN platform_user.user_address IS 'User formatted address from geolocation';
COMMENT ON COLUMN platform_user.user_profile_image IS 'URL/path to user profile image';
COMMENT ON COLUMN platform_user.verification_status IS 'Profile verification status';
COMMENT ON COLUMN platform_user.verification_notes IS 'Admin notes for verification';
COMMENT ON COLUMN platform_user.verified_at IS 'Timestamp when profile was verified';

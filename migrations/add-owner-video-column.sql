-- Migration: Add owner_video column to partner_business table
-- Date: 2024-11-21
-- Description: Adds owner_video field to store the URL of the owner verification video

-- Add owner_video column
ALTER TABLE partner_business 
ADD COLUMN IF NOT EXISTS owner_video TEXT;

-- Add comment for documentation
COMMENT ON COLUMN partner_business.owner_video IS 'URL to the owner verification video stored in Supabase/S3';

-- Create index for faster lookups on verification status (if not exists)
CREATE INDEX IF NOT EXISTS idx_partner_business_verification_status 
ON partner_business(verification_status);

-- Create index for userId lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_partner_business_user_id 
ON partner_business(user_id);

-- Verify the change
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'partner_business' 
AND column_name = 'owner_video';

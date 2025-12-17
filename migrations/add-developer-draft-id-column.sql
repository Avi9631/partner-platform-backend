-- Migration: Add draft_id column to developer table
-- Description: Adds draft_id foreign key to track which draft was used to create the developer profile
--              Ensures that each draft can only be published once (one-to-one relationship)
-- Date: 2025-12-17

-- Add draft_id column to developer table
ALTER TABLE developer
ADD COLUMN IF NOT EXISTS draft_id INTEGER UNIQUE;

-- Add foreign key constraint to listing_draft table
ALTER TABLE developer
ADD CONSTRAINT fk_developer_draft
FOREIGN KEY (draft_id) 
REFERENCES listing_draft(draft_id)
ON DELETE SET NULL;

-- Create unique index to ensure one draft = one published developer
CREATE UNIQUE INDEX IF NOT EXISTS idx_developer_draft_id_unique ON developer(draft_id);

-- Add comment to explain the column purpose
COMMENT ON COLUMN developer.draft_id IS 'Reference to the draft used to create this developer profile. Each draft can only be published once (enforced by unique constraint).';

-- Optional: Update existing developer records to link them with drafts if applicable
-- Note: This would require custom logic based on your existing data
-- UPDATE developer d
-- SET draft_id = (
--     SELECT ld.draft_id 
--     FROM listing_draft ld 
--     WHERE ld.user_id = d.user_id 
--     AND ld.draft_type = 'DEVELOPER'
--     AND ld.draft_status = 'PUBLISHED'
--     LIMIT 1
-- )
-- WHERE d.draft_id IS NULL;

-- Migration: Add draft_id column to property table
-- This column links properties to their originating draft in listing_draft table
-- Allows tracking which draft was used to publish each property

-- Add draft_id column to property table
ALTER TABLE property
ADD COLUMN IF NOT EXISTS draft_id INTEGER;

-- Add comment to the column
COMMENT ON COLUMN property.draft_id IS 'Reference to the draft used to publish this property';

-- Add foreign key constraint
ALTER TABLE property
ADD CONSTRAINT fk_property_draft_id
FOREIGN KEY (draft_id)
REFERENCES listing_draft(draft_id)
ON UPDATE CASCADE
ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_property_draft_id ON property(draft_id);

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully added draft_id column to property table';
END $$;

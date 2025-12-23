-- Migration: Add lat and lng columns to pg_colive_hostel table
-- Date: 2025-12-23
-- Description: Add separate lat and lng columns for easier access to coordinates

-- Add lat and lng columns
ALTER TABLE pg_colive_hostel
ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8);

-- Add comments
COMMENT ON COLUMN pg_colive_hostel.lat IS 'Latitude coordinate for easy access';
COMMENT ON COLUMN pg_colive_hostel.lng IS 'Longitude coordinate for easy access';

-- Create indexes for lat/lng for potential range queries
CREATE INDEX IF NOT EXISTS idx_pg_hostel_lat ON pg_colive_hostel(lat);
CREATE INDEX IF NOT EXISTS idx_pg_hostel_lng ON pg_colive_hostel(lng);

-- Update existing records to populate lat/lng from coordinates JSONB
UPDATE pg_colive_hostel
SET 
    lat = CAST(coordinates->>'lat' AS DECIMAL(10, 8)),
    lng = CAST(coordinates->>'lng' AS DECIMAL(11, 8))
WHERE coordinates IS NOT NULL
    AND coordinates->>'lat' IS NOT NULL
    AND coordinates->>'lng' IS NOT NULL
    AND lat IS NULL
    AND lng IS NULL;

COMMIT;

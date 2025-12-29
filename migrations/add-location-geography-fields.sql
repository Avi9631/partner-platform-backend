-- Migration: Add PostGIS GEOGRAPHY location fields to Property and Project tables
-- Created: 2025-12-29
-- Description: Adds location GEOGRAPHY(POINT, 4326) fields and updates existing lat/lng for spatial queries

-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- ====================================
-- PROPERTY TABLE UPDATES
-- ====================================

-- Add location GEOGRAPHY field to property table
ALTER TABLE property 
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Add comment to location field
COMMENT ON COLUMN property.location IS 'PostGIS geography point (SRID 4326) for efficient spatial queries';

-- Update comments for lat/lng fields
COMMENT ON COLUMN property.lat IS 'Latitude coordinate for easy access';
COMMENT ON COLUMN property.lng IS 'Longitude coordinate for easy access';

-- Populate location field from existing lat/lng data
UPDATE property 
SET location = ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography
WHERE lat IS NOT NULL AND lng IS NOT NULL AND location IS NULL;

-- Create spatial index on location field (GIST index for spatial queries)
CREATE INDEX IF NOT EXISTS property_location_gist_idx 
ON property USING GIST(location);

-- Add indexes for city, locality, and status
CREATE INDEX IF NOT EXISTS property_city_idx ON property(city);
CREATE INDEX IF NOT EXISTS property_locality_idx ON property(locality);
CREATE INDEX IF NOT EXISTS property_status_idx ON property(status);

-- ====================================
-- PROJECT TABLE UPDATES
-- ====================================

-- Add location fields to project table
ALTER TABLE project 
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

ALTER TABLE project 
ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8);

ALTER TABLE project 
ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8);

-- Add comments to project location fields
COMMENT ON COLUMN project.location IS 'PostGIS geography point (SRID 4326) for efficient spatial queries';
COMMENT ON COLUMN project.lat IS 'Latitude coordinate for easy access';
COMMENT ON COLUMN project.lng IS 'Longitude coordinate for easy access';

-- Populate project location field if lat/lng exist in project_details JSONB
-- (This assumes location might be stored in projectDetails JSONB)
-- Uncomment and modify if you have existing location data in project_details
-- UPDATE project 
-- SET 
--   lat = (project_details->>'lat')::DECIMAL(10, 8),
--   lng = (project_details->>'lng')::DECIMAL(11, 8),
--   location = ST_SetSRID(ST_MakePoint(
--     (project_details->>'lng')::FLOAT,
--     (project_details->>'lat')::FLOAT
--   ), 4326)::geography
-- WHERE project_details->>'lat' IS NOT NULL 
--   AND project_details->>'lng' IS NOT NULL;

-- Create spatial index on project location field
CREATE INDEX IF NOT EXISTS project_location_gist_idx 
ON project USING GIST(location);

-- Add index for project lat/lng
CREATE INDEX IF NOT EXISTS project_lat_lng_idx ON project(lat, lng);

-- ====================================
-- TRIGGER TO AUTO-UPDATE LOCATION
-- ====================================

-- Create trigger function to automatically update location when lat/lng change
CREATE OR REPLACE FUNCTION update_location_from_coordinates()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lat IS NOT NULL AND NEW.lng IS NOT NULL THEN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326)::geography;
  ELSE
    NEW.location := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to property table
DROP TRIGGER IF EXISTS property_location_trigger ON property;
CREATE TRIGGER property_location_trigger
BEFORE INSERT OR UPDATE OF lat, lng ON property
FOR EACH ROW
EXECUTE FUNCTION update_location_from_coordinates();

-- Apply trigger to project table
DROP TRIGGER IF EXISTS project_location_trigger ON project;
CREATE TRIGGER project_location_trigger
BEFORE INSERT OR UPDATE OF lat, lng ON project
FOR EACH ROW
EXECUTE FUNCTION update_location_from_coordinates();

-- ====================================
-- VERIFICATION QUERIES
-- ====================================

-- Verify property table structure
-- SELECT column_name, data_type, udt_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'property' AND column_name IN ('location', 'lat', 'lng');

-- Verify project table structure
-- SELECT column_name, data_type, udt_name 
-- FROM information_schema.columns 
-- WHERE table_name = 'project' AND column_name IN ('location', 'lat', 'lng');

-- Check spatial indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('property', 'project') 
-- AND indexname LIKE '%location%';

-- Sample spatial query: Find properties within 5km of a point
-- SELECT property_id, property_name, 
--        ST_Distance(location, ST_GeographyFromText('POINT(77.5946 12.9716)')) as distance_meters
-- FROM property
-- WHERE ST_DWithin(
--   location,
--   ST_GeographyFromText('POINT(77.5946 12.9716)'),
--   5000  -- 5km in meters
-- )
-- ORDER BY distance_meters;

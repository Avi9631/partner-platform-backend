-- Migration: Update property table with detailed columns
-- This migration adds all the specific columns for property data instead of using a generic JSONB field
-- Run this migration to upgrade the property table schema

-- Add Basic Information columns
ALTER TABLE property
ADD COLUMN IF NOT EXISTS title VARCHAR(500),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS property_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS listing_type VARCHAR(10) CHECK (listing_type IN ('sale', 'rent', 'lease')),
ADD COLUMN IF NOT EXISTS is_new_property BOOLEAN DEFAULT FALSE;

-- Add Location columns
ALTER TABLE property
ADD COLUMN IF NOT EXISTS city VARCHAR(100),
ADD COLUMN IF NOT EXISTS locality VARCHAR(200),
ADD COLUMN IF NOT EXISTS landmark VARCHAR(200),
ADD COLUMN IF NOT EXISTS address_text TEXT,
ADD COLUMN IF NOT EXISTS lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS show_map_exact BOOLEAN DEFAULT FALSE;

-- Add Property Specification columns
ALTER TABLE property
ADD COLUMN IF NOT EXISTS bedrooms VARCHAR(20),
ADD COLUMN IF NOT EXISTS bathrooms VARCHAR(20),
ADD COLUMN IF NOT EXISTS facing VARCHAR(50),
ADD COLUMN IF NOT EXISTS view VARCHAR(50),
ADD COLUMN IF NOT EXISTS floor_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS total_floors VARCHAR(20),
ADD COLUMN IF NOT EXISTS unit_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS tower_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_unit_number_private BOOLEAN DEFAULT FALSE;

-- Add Area Measurement columns
ALTER TABLE property
ADD COLUMN IF NOT EXISTS carpet_area VARCHAR(50),
ADD COLUMN IF NOT EXISTS super_area VARCHAR(50),
ADD COLUMN IF NOT EXISTS area_config JSONB,
ADD COLUMN IF NOT EXISTS measurement_method VARCHAR(50);

-- Add Property Status & Type columns
ALTER TABLE property
ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS furnishing_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS possession_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS age_of_property VARCHAR(50),
ADD COLUMN IF NOT EXISTS property_position VARCHAR(50),
ADD COLUMN IF NOT EXISTS available_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS possession_date TIMESTAMP;

-- Add Pricing columns
ALTER TABLE property
ADD COLUMN IF NOT EXISTS pricing JSONB,
ADD COLUMN IF NOT EXISTS is_price_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_price_negotiable BOOLEAN DEFAULT FALSE;

-- Add Project & Names columns
ALTER TABLE property
ADD COLUMN IF NOT EXISTS project_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS custom_property_name VARCHAR(200);

-- Add Features & Amenities columns (JSONB arrays)
ALTER TABLE property
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS flooring_types JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS smart_home_devices JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS maintenance_includes JSONB DEFAULT '[]'::jsonb;

-- Add Boolean Flag columns
ALTER TABLE property
ADD COLUMN IF NOT EXISTS is_gated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS fire_safety BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_intercom BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_emergency_exit BOOLEAN DEFAULT FALSE;

-- Add RERA & Documents columns
ALTER TABLE property
ADD COLUMN IF NOT EXISTS rera_ids JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;

-- Add Media columns
ALTER TABLE property
ADD COLUMN IF NOT EXISTS media_data JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS property_plans JSONB DEFAULT '[]'::jsonb;

-- Add Additional Details columns
ALTER TABLE property
ADD COLUMN IF NOT EXISTS furnishing_details JSONB;

-- Add comments to columns
COMMENT ON COLUMN property.title IS 'Property listing title';
COMMENT ON COLUMN property.description IS 'Detailed property description';
COMMENT ON COLUMN property.property_type IS 'apartment, villa, plot, etc.';
COMMENT ON COLUMN property.listing_type IS 'Type of listing: sale, rent, or lease';
COMMENT ON COLUMN property.lat IS 'Latitude coordinate';
COMMENT ON COLUMN property.lng IS 'Longitude coordinate';
COMMENT ON COLUMN property.show_map_exact IS 'Show exact location on map';
COMMENT ON COLUMN property.area_config IS 'Breakdown of area (balcony, common, parking, etc.)';
COMMENT ON COLUMN property.measurement_method IS 'self_measured, architect_measured, etc.';
COMMENT ON COLUMN property.ownership_type IS 'freehold, leasehold, co-operative';
COMMENT ON COLUMN property.furnishing_status IS 'furnished, semi_furnished, unfurnished';
COMMENT ON COLUMN property.possession_status IS 'ready, under_construction, etc.';
COMMENT ON COLUMN property.property_position IS 'corner, middle, end';
COMMENT ON COLUMN property.pricing IS 'Array of pricing details with type, unit, value';
COMMENT ON COLUMN property.features IS 'Array of property features';
COMMENT ON COLUMN property.amenities IS 'Array of amenities';
COMMENT ON COLUMN property.flooring_types IS 'Array of flooring types';
COMMENT ON COLUMN property.smart_home_devices IS 'Array of smart home devices';
COMMENT ON COLUMN property.maintenance_includes IS 'Array of maintenance inclusions';
COMMENT ON COLUMN property.rera_ids IS 'Array of RERA IDs';
COMMENT ON COLUMN property.documents IS 'Array of property documents';
COMMENT ON COLUMN property.media_data IS 'Array of property images and videos';
COMMENT ON COLUMN property.property_plans IS 'Array of property floor plans';
COMMENT ON COLUMN property.furnishing_details IS 'Detailed furnishing information';

-- Create additional indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_property_city ON property(city);
CREATE INDEX IF NOT EXISTS idx_property_locality ON property(locality);
CREATE INDEX IF NOT EXISTS idx_property_type ON property(property_type);
CREATE INDEX IF NOT EXISTS idx_property_listing_type ON property(listing_type);
CREATE INDEX IF NOT EXISTS idx_property_bedrooms ON property(bedrooms);
CREATE INDEX IF NOT EXISTS idx_property_lat_lng ON property(lat, lng);
CREATE INDEX IF NOT EXISTS idx_property_possession_status ON property(possession_status);
CREATE INDEX IF NOT EXISTS idx_property_furnishing_status ON property(furnishing_status);

-- Create GiST index for location-based queries (if using PostGIS)
-- Uncomment if you have PostGIS extension enabled
-- CREATE INDEX IF NOT EXISTS idx_property_location_gist ON property USING GIST(ST_MakePoint(lng, lat));

-- Display success message
DO $$
BEGIN
  RAISE NOTICE 'Successfully updated property table with detailed columns';
  RAISE NOTICE 'Total new columns added: 50+';
  RAISE NOTICE 'All indexes created successfully';
END $$;

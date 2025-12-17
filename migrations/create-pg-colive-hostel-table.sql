-- Migration: Create pg_colive_hostel table
-- Date: 2025-12-17
-- Description: Create table for storing PG/Colive/Hostel listings

CREATE TABLE IF NOT EXISTS pg_colive_hostel (
    pg_hostel_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    draft_id INTEGER NOT NULL UNIQUE REFERENCES listing_draft(draft_id) ON UPDATE CASCADE ON DELETE CASCADE,
    property_name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    gender_allowed VARCHAR(50),
    description TEXT,
    is_brand_managed BOOLEAN DEFAULT FALSE,
    brand_name VARCHAR(255),
    year_built VARCHAR(50),
    coordinates JSONB,
    city VARCHAR(100),
    locality VARCHAR(255),
    address_text TEXT,
    landmark VARCHAR(255),
    room_types JSONB,
    common_amenities JSONB,
    common_amenities_legacy JSONB,
    room_amenities JSONB,
    food_mess JSONB,
    rules JSONB,
    media_data JSONB,
    publish_status VARCHAR(50) DEFAULT 'PENDING_REVIEW' CHECK (publish_status IN ('PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED')),
    verification_status VARCHAR(50) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    pg_hostel_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pg_hostel_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pg_hostel_deleted_at TIMESTAMP WITH TIME ZONE
);

-- Add comments
COMMENT ON TABLE pg_colive_hostel IS 'Stores PG/Colive/Hostel listing information';
COMMENT ON COLUMN pg_colive_hostel.draft_id IS 'Ensures one draft can only be published once';
COMMENT ON COLUMN pg_colive_hostel.slug IS 'URL-friendly unique identifier';
COMMENT ON COLUMN pg_colive_hostel.coordinates IS 'Stores { lat, lng }';
COMMENT ON COLUMN pg_colive_hostel.room_types IS 'Array of room type objects with pricing, amenities, images, availability';
COMMENT ON COLUMN pg_colive_hostel.common_amenities IS 'Array of common amenity objects';
COMMENT ON COLUMN pg_colive_hostel.food_mess IS 'Food and mess details including meals, menu, timings';
COMMENT ON COLUMN pg_colive_hostel.rules IS 'Array of rule objects';
COMMENT ON COLUMN pg_colive_hostel.media_data IS 'Array of media objects (images, videos)';
COMMENT ON COLUMN pg_colive_hostel.publish_status IS 'Publication status';
COMMENT ON COLUMN pg_colive_hostel.verification_status IS 'Verification status';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pg_hostel_user_id ON pg_colive_hostel(user_id);
CREATE INDEX IF NOT EXISTS idx_pg_hostel_draft_id ON pg_colive_hostel(draft_id);
CREATE INDEX IF NOT EXISTS idx_pg_hostel_slug ON pg_colive_hostel(slug);
CREATE INDEX IF NOT EXISTS idx_pg_hostel_property_name ON pg_colive_hostel(property_name);
CREATE INDEX IF NOT EXISTS idx_pg_hostel_city ON pg_colive_hostel(city);
CREATE INDEX IF NOT EXISTS idx_pg_hostel_locality ON pg_colive_hostel(locality);
CREATE INDEX IF NOT EXISTS idx_pg_hostel_publish_status ON pg_colive_hostel(publish_status);
CREATE INDEX IF NOT EXISTS idx_pg_hostel_verification_status ON pg_colive_hostel(verification_status);
CREATE INDEX IF NOT EXISTS idx_pg_hostel_created_at ON pg_colive_hostel(pg_hostel_created_at);

-- Trigger to update pg_hostel_updated_at automatically
CREATE OR REPLACE FUNCTION update_pg_hostel_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.pg_hostel_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pg_hostel_updated_at
    BEFORE UPDATE ON pg_colive_hostel
    FOR EACH ROW
    EXECUTE FUNCTION update_pg_hostel_updated_at();

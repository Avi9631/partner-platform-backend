-- Migration: Create Listing Table
-- Description: Comprehensive denormalized listing table for property listings
-- Created: 2024-11-24

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS listing CASCADE;

-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE listing_type_enum AS ENUM ('sale', 'rent', 'lease');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ownership_type_enum AS ENUM ('freehold', 'leasehold', 'poa', 'co_operative');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE possession_status_enum AS ENUM ('ready', 'under_construction', 'resale');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE geo_tag_status_enum AS ENUM ('pending', 'success', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE furnishing_status_enum AS ENUM ('unfurnished', 'semi', 'fully');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE power_backup_enum AS ENUM ('none', 'partial', 'full');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE listing_status_enum AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ACTIVE', 'INACTIVE', 'ARCHIVED', 'SOLD', 'RENTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create the listing table
CREATE TABLE listing (
    -- Primary Key
    listing_id SERIAL PRIMARY KEY,
    
    -- Property Type
    property_type VARCHAR(50) NOT NULL,
    
    -- ============ BASIC DETAILS ============
    listing_type listing_type_enum NOT NULL DEFAULT 'sale',
    ownership_type ownership_type_enum NOT NULL DEFAULT 'freehold',
    project_name VARCHAR(255),
    custom_property_name VARCHAR(255),
    is_new_property BOOLEAN DEFAULT false,
    rera_ids JSONB,
    age_of_property INTEGER,
    possession_status possession_status_enum,
    possession_date DATE,
    
    -- ============ LOCATION SELECTION ============
    coordinates JSONB,
    show_map_exact BOOLEAN DEFAULT false,
    city VARCHAR(100),
    locality VARCHAR(255),
    address_text TEXT,
    landmark VARCHAR(255),
    
    -- ============ LOCATION ATTRIBUTES ============
    facing VARCHAR(20),
    view VARCHAR(50),
    property_position VARCHAR(50),
    overlooking JSONB,
    
    -- ============ GEO TAG ============
    geo_tag_status geo_tag_status_enum DEFAULT 'pending',
    geo_tag_coordinates JSONB,
    geo_tag_distance DECIMAL(10, 2),
    geo_tag_timestamp TIMESTAMP WITH TIME ZONE,
    
    -- ============ BASIC CONFIGURATION (Building Type) ============
    bedrooms VARCHAR(10),
    bathrooms VARCHAR(10),
    additional_rooms JSONB,
    room_dimensions JSONB,
    
    -- ============ AREA DETAILS (Building Type) ============
    carpet_area DECIMAL(10, 2),
    super_area DECIMAL(10, 2),
    measurement_method VARCHAR(50),
    area_config JSONB,
    built_up_to_carpet_ratio DECIMAL(5, 2),
    
    -- ============ FLOOR DETAILS (Building Type) ============
    floor_number INTEGER,
    total_floors INTEGER,
    tower_name VARCHAR(100),
    unit_number VARCHAR(50),
    is_unit_number_private BOOLEAN DEFAULT false,
    lift_available BOOLEAN DEFAULT false,
    fire_exit_proximity VARCHAR(50),
    has_emergency_exit BOOLEAN DEFAULT false,
    staircase_type VARCHAR(50),
    has_intercom BOOLEAN DEFAULT false,
    
    -- ============ FURNISHING (Building Type) ============
    furnishing_status furnishing_status_enum DEFAULT 'unfurnished',
    furnishing_details JSONB,
    flooring_types JSONB,
    smart_home_devices JSONB,
    furniture_condition VARCHAR(50),
    
    -- ============ PARKING & UTILITIES (Building Type) ============
    covered_parking INTEGER DEFAULT 0,
    open_parking INTEGER DEFAULT 0,
    power_backup power_backup_enum DEFAULT 'none',
    ev_charging_type VARCHAR(50),
    ev_charging_points INTEGER,
    has_visitor_parking BOOLEAN DEFAULT false,
    visitor_parking_spaces INTEGER,
    parking_type VARCHAR(50),
    parking_security_type VARCHAR(50),
    
    -- ============ AMENITIES (Building Type) ============
    features JSONB,
    amenities JSONB,
    is_gated BOOLEAN DEFAULT false,
    fire_safety BOOLEAN DEFAULT false,
    pet_friendly BOOLEAN DEFAULT false,
    
    -- ============ LAND ATTRIBUTES (Land Type) ============
    plot_area DECIMAL(10, 2),
    area_unit VARCHAR(20),
    plot_dimension VARCHAR(100),
    land_use VARCHAR(50),
    road_width DECIMAL(10, 2),
    terrain_level VARCHAR(50),
    soil_type VARCHAR(50),
    fencing BOOLEAN DEFAULT false,
    irrigation_source VARCHAR(50),
    
    -- ============ SUITABLE FOR (Rent/Lease) ============
    suitable_for JSONB,
    
    -- ============ PRICING ============
    pricing JSONB,
    is_price_negotiable BOOLEAN DEFAULT false,
    available_from DATE,
    
    -- ============ LISTING INFO ============
    title VARCHAR(500),
    description TEXT,
    
    -- ============ MEDIA ============
    media_data JSONB,
    
    -- ============ DOCUMENTS ============
    documents JSONB,
    
    -- ============ PROPERTY PLANS ============
    property_plans JSONB,
    
    -- ============ METADATA ============
    status listing_status_enum DEFAULT 'DRAFT',
    created_by INTEGER NOT NULL REFERENCES "user"(user_id) ON UPDATE CASCADE ON DELETE CASCADE,
    approved_by INTEGER REFERENCES "user"(user_id) ON UPDATE CASCADE ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    view_count INTEGER DEFAULT 0,
    contact_count INTEGER DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    featured_until TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    listing_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    listing_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    listing_deleted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance optimization
CREATE INDEX idx_listing_property_type ON listing(property_type);
CREATE INDEX idx_listing_listing_type ON listing(listing_type);
CREATE INDEX idx_listing_status ON listing(status);
CREATE INDEX idx_listing_city ON listing(city);
CREATE INDEX idx_listing_locality ON listing(locality);
CREATE INDEX idx_listing_created_by ON listing(created_by);
CREATE INDEX idx_listing_carpet_area ON listing(carpet_area);
CREATE INDEX idx_listing_super_area ON listing(super_area);
CREATE INDEX idx_listing_plot_area ON listing(plot_area);
CREATE INDEX idx_listing_bedrooms ON listing(bedrooms);
CREATE INDEX idx_listing_bathrooms ON listing(bathrooms);
CREATE INDEX idx_listing_created_at ON listing(listing_created_at);
CREATE INDEX idx_listing_available_from ON listing(available_from);
CREATE INDEX idx_listing_approved_at ON listing(approved_at);
CREATE INDEX idx_listing_is_featured ON listing(is_featured);
CREATE INDEX idx_listing_featured_until ON listing(featured_until);

-- Composite indexes for common queries
CREATE INDEX idx_listing_type_status ON listing(property_type, listing_type, status);
CREATE INDEX idx_listing_location_status ON listing(city, locality, status);
CREATE INDEX idx_listing_rooms_status ON listing(bedrooms, bathrooms, status);
CREATE INDEX idx_listing_featured_recent ON listing(status, is_featured, listing_created_at);

-- GIN indexes for JSONB columns (efficient for array/object searches)
CREATE INDEX idx_listing_features_gin ON listing USING gin(features);
CREATE INDEX idx_listing_amenities_gin ON listing USING gin(amenities);
CREATE INDEX idx_listing_coordinates_gin ON listing USING gin(coordinates);
CREATE INDEX idx_listing_suitable_for_gin ON listing USING gin(suitable_for);
CREATE INDEX idx_listing_pricing_gin ON listing USING gin(pricing);

-- Add comments for documentation
COMMENT ON TABLE listing IS 'Comprehensive denormalized property listing table storing all property information';
COMMENT ON COLUMN listing.property_type IS 'Type of property: apartment, villa, duplex, plot, farmhouse, etc.';
COMMENT ON COLUMN listing.rera_ids IS 'Array of RERA registration IDs: [{id: RERA123}]';
COMMENT ON COLUMN listing.coordinates IS 'Geo coordinates: {lat: 28.5355, lng: 77.3910}';
COMMENT ON COLUMN listing.geo_tag_distance IS 'Distance in meters from property location';
COMMENT ON COLUMN listing.additional_rooms IS 'Array: [{id, type: balcony, count: 2}]';
COMMENT ON COLUMN listing.room_dimensions IS 'Array: [{id, roomName, length, width, unit}]';
COMMENT ON COLUMN listing.area_config IS 'Array: [{type: terrace, value: 200}]';
COMMENT ON COLUMN listing.furnishing_details IS 'Object: {wardrobe: true, ac: true, ...}';
COMMENT ON COLUMN listing.flooring_types IS 'Array: [Vitrified, Marble, Wooden]';
COMMENT ON COLUMN listing.smart_home_devices IS 'Array: [smart_door_lock, smart_lights]';
COMMENT ON COLUMN listing.features IS 'Property-level features: [gym, swimming_pool, clubhouse]';
COMMENT ON COLUMN listing.amenities IS 'Unit-level amenities: [air_conditioning, modular_kitchen]';
COMMENT ON COLUMN listing.suitable_for IS 'Array: [family, bachelors, company, students]';
COMMENT ON COLUMN listing.pricing IS 'Array: [{type: asking_price, value: 5000000, unit: total}]';
COMMENT ON COLUMN listing.media_data IS 'Array of media objects: [{id, file, preview, title, category, description, type, docType}]';
COMMENT ON COLUMN listing.documents IS 'Array of document objects: [{id, fileName, fileSize, fileType, category, title, description, docType, uploadedAt}]';
COMMENT ON COLUMN listing.property_plans IS 'Array of floor plan objects: [{id, fileName, fileSize, fileType, preview, category, title, description, docType, uploadedAt}]';

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_listing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.listing_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_listing_timestamp
BEFORE UPDATE ON listing
FOR EACH ROW
EXECUTE FUNCTION update_listing_updated_at();

-- Grant permissions (adjust based on your user roles)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON listing TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE listing_listing_id_seq TO your_app_user;

COMMIT;

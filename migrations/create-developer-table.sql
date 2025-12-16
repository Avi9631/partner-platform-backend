-- Migration: Create developer table
-- Description: Creates the developer table for storing developer/builder profiles
-- Date: 2025-12-16

-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE developer_type_enum AS ENUM (
        'International Developer',
        'National Developer',
        'Regional Developer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE developer_publish_status_enum AS ENUM (
        'DRAFT',
        'PENDING_REVIEW',
        'APPROVED',
        'REJECTED',
        'PUBLISHED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE developer_verification_status_enum AS ENUM (
        'PENDING',
        'AUTOMATED_REVIEW',
        'MANUAL_REVIEW',
        'APPROVED',
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create developer table
CREATE TABLE IF NOT EXISTS developer (
    developer_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES platform_user(user_id) ON DELETE CASCADE,
    
    -- Basic Information
    developer_name VARCHAR(200) NOT NULL,
    developer_type developer_type_enum NOT NULL,
    description TEXT,
    established_year INTEGER NOT NULL,
    registration_number VARCHAR(100),
    
    -- Contact Information
    primary_contact_email VARCHAR(150) NOT NULL,
    primary_contact_phone VARCHAR(20) NOT NULL,
    social_links JSONB DEFAULT '[]'::jsonb,
    
    -- Projects & Portfolio
    total_projects_completed INTEGER DEFAULT 0,
    total_projects_ongoing INTEGER DEFAULT 0,
    total_units_delivered INTEGER DEFAULT 0,
    project_types TEXT[] DEFAULT '{}',
    operating_states TEXT[] DEFAULT '{}',
    
    -- Publishing & Verification Status
    publish_status developer_publish_status_enum DEFAULT 'DRAFT',
    verification_status developer_verification_status_enum DEFAULT 'PENDING',
    verification_notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by INTEGER REFERENCES platform_user(user_id),
    published_at TIMESTAMP WITH TIME ZONE,
    
    -- SEO & Metadata
    slug VARCHAR(300) UNIQUE,
    meta_title VARCHAR(200),
    meta_description TEXT,
    
    -- Analytics
    view_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    developer_created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    developer_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    developer_deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT developer_slug_unique UNIQUE (slug),
    CONSTRAINT developer_established_year_check CHECK (established_year >= 1900 AND established_year <= EXTRACT(YEAR FROM CURRENT_DATE))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_developer_user_id ON developer(user_id);
CREATE INDEX IF NOT EXISTS idx_developer_slug ON developer(slug);
CREATE INDEX IF NOT EXISTS idx_developer_publish_status ON developer(publish_status);
CREATE INDEX IF NOT EXISTS idx_developer_type ON developer(developer_type);
CREATE INDEX IF NOT EXISTS idx_developer_verification_status ON developer(verification_status);
CREATE INDEX IF NOT EXISTS idx_developer_created_at ON developer(developer_created_at);

-- Create GIN indexes for array and JSONB columns
CREATE INDEX IF NOT EXISTS idx_developer_project_types ON developer USING GIN(project_types);
CREATE INDEX IF NOT EXISTS idx_developer_operating_states ON developer USING GIN(operating_states);
CREATE INDEX IF NOT EXISTS idx_developer_social_links ON developer USING GIN(social_links);

-- Add comments
COMMENT ON TABLE developer IS 'Stores developer/builder profiles with their portfolio and verification details';
COMMENT ON COLUMN developer.developer_id IS 'Primary key - auto-incrementing developer ID';
COMMENT ON COLUMN developer.user_id IS 'Foreign key to platform_user table';
COMMENT ON COLUMN developer.developer_name IS 'Name of the developer/builder company';
COMMENT ON COLUMN developer.developer_type IS 'Type of developer: International, National, or Regional';
COMMENT ON COLUMN developer.description IS 'Detailed description of the developer';
COMMENT ON COLUMN developer.established_year IS 'Year the developer company was established';
COMMENT ON COLUMN developer.social_links IS 'JSONB array of social media links with type and url';
COMMENT ON COLUMN developer.project_types IS 'Array of project types handled (Residential, Commercial, etc.)';
COMMENT ON COLUMN developer.operating_states IS 'Array of states where developer operates';
COMMENT ON COLUMN developer.publish_status IS 'Current publishing status of the developer profile';
COMMENT ON COLUMN developer.verification_status IS 'Current verification status';
COMMENT ON COLUMN developer.slug IS 'URL-friendly unique slug for developer profile';

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_developer_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.developer_updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_developer_updated_at
    BEFORE UPDATE ON developer
    FOR EACH ROW
    EXECUTE FUNCTION update_developer_updated_at();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Developer table created successfully with all indexes and triggers';
END $$;

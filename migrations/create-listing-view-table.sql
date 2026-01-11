-- Migration: Create listing_view table for tracking views
-- Description: Tracks views and view time for properties, projects, PG hostels, and developers
-- Date: 2026-01-07

-- Create listing_view table
CREATE TABLE IF NOT EXISTS listing_view (
    view_id SERIAL PRIMARY KEY,
    listing_type VARCHAR(20) NOT NULL CHECK (listing_type IN ('property', 'project', 'pg_hostel', 'developer')),
    listing_id INTEGER NOT NULL,
    view_duration INTEGER,
    viewer_id INTEGER,
    session_id VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer VARCHAR(500),
    device_type VARCHAR(20) DEFAULT 'unknown' CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
    country VARCHAR(100),
    city VARCHAR(100),
    viewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint for viewer_id
    CONSTRAINT fk_listing_view_viewer
        FOREIGN KEY (viewer_id)
        REFERENCES platform_user(user_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
);

-- Add comments to the table and columns
COMMENT ON TABLE listing_view IS 'Tracks views and analytics for all listing types';
COMMENT ON COLUMN listing_view.listing_type IS 'Type of listing being viewed (property, project, pg_hostel, developer)';
COMMENT ON COLUMN listing_view.listing_id IS 'ID of the listing being viewed';
COMMENT ON COLUMN listing_view.view_duration IS 'Duration of the view in seconds';
COMMENT ON COLUMN listing_view.viewer_id IS 'User ID if viewer is logged in';
COMMENT ON COLUMN listing_view.session_id IS 'Session ID for anonymous users';
COMMENT ON COLUMN listing_view.ip_address IS 'IPv4 or IPv6 address of the viewer';
COMMENT ON COLUMN listing_view.user_agent IS 'Browser/device user agent string';
COMMENT ON COLUMN listing_view.referrer IS 'Source URL/referrer';
COMMENT ON COLUMN listing_view.device_type IS 'Type of device used for viewing';
COMMENT ON COLUMN listing_view.country IS 'Country of the viewer';
COMMENT ON COLUMN listing_view.city IS 'City of the viewer';
COMMENT ON COLUMN listing_view.viewed_at IS 'Timestamp when the view occurred';
COMMENT ON COLUMN listing_view.metadata IS 'Additional metadata (scroll depth, interactions, etc.)';

-- Create indexes for better query performance
CREATE INDEX idx_listing_type_id ON listing_view(listing_type, listing_id);
CREATE INDEX idx_viewer_id ON listing_view(viewer_id);
CREATE INDEX idx_session_id ON listing_view(session_id);
CREATE INDEX idx_viewed_at ON listing_view(viewed_at);
CREATE INDEX idx_listing_views_composite ON listing_view(listing_type, listing_id, viewed_at);

-- Create a trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_listing_view_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_listing_view_updated_at
    BEFORE UPDATE ON listing_view
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_view_updated_at();

-- Optional: Create a view for aggregated statistics
CREATE OR REPLACE VIEW listing_view_stats AS
SELECT 
    listing_type,
    listing_id,
    COUNT(*) as total_views,
    COUNT(DISTINCT viewer_id) as unique_viewers,
    COUNT(DISTINCT session_id) as unique_sessions,
    AVG(view_duration) as avg_view_duration,
    MAX(view_duration) as max_view_duration,
    MIN(view_duration) as min_view_duration,
    COUNT(*) FILTER (WHERE device_type = 'mobile') as mobile_views,
    COUNT(*) FILTER (WHERE device_type = 'tablet') as tablet_views,
    COUNT(*) FILTER (WHERE device_type = 'desktop') as desktop_views,
    MAX(viewed_at) as last_viewed_at,
    MIN(viewed_at) as first_viewed_at
FROM listing_view
GROUP BY listing_type, listing_id;

COMMENT ON VIEW listing_view_stats IS 'Aggregated statistics for listing views';

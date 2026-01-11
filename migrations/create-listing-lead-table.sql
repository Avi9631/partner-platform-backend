-- Create listing_lead table for tracking customer inquiries and leads
CREATE TABLE IF NOT EXISTS listing_lead (
    lead_id SERIAL PRIMARY KEY,
    
    -- Polymorphic relationship to different listing types
    listing_type VARCHAR(50) NOT NULL CHECK (listing_type IN ('PROPERTY', 'PG_COLIVING', 'PROJECT', 'DEVELOPER')),
    listing_id INTEGER NOT NULL,
    
    -- Lead reason/source
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('CONNECT_AGENT', 'CALLBACK_REQUEST', 'VIRTUAL_TOUR')),
    
    -- Customer information
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_message TEXT,
    
    -- Lead status
    status VARCHAR(50) DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED')),
    
    -- Additional information
    location VARCHAR(255),
    preferred_contact_time VARCHAR(100),
    scheduled_at TIMESTAMP,
    
    -- Property owner (partner) information
    partner_id INTEGER REFERENCES platform_user(user_id) ON DELETE SET NULL,
    
    -- Tracking fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    contacted_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Metadata for flexible storage
    metadata JSONB
);

-- Create indexes for better query performance
CREATE INDEX idx_listing_lead_listing ON listing_lead(listing_type, listing_id);
CREATE INDEX idx_listing_lead_partner ON listing_lead(partner_id);
CREATE INDEX idx_listing_lead_status ON listing_lead(status);
CREATE INDEX idx_listing_lead_reason ON listing_lead(reason);
CREATE INDEX idx_listing_lead_created ON listing_lead(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_listing_lead_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_listing_lead_updated_at
    BEFORE UPDATE ON listing_lead
    FOR EACH ROW
    EXECUTE FUNCTION update_listing_lead_updated_at();

-- Comments for documentation
COMMENT ON TABLE listing_lead IS 'Stores customer inquiries and leads for all listing types';
COMMENT ON COLUMN listing_lead.listing_type IS 'Type of listing: PROPERTY, PG_COLIVING, PROJECT, or DEVELOPER';
COMMENT ON COLUMN listing_lead.reason IS 'Reason for lead: CONNECT_AGENT, CALLBACK_REQUEST, or VIRTUAL_TOUR';
COMMENT ON COLUMN listing_lead.status IS 'Lead status: NEW, CONTACTED, IN_PROGRESS, COMPLETED, or CLOSED';

-- Migration: Create partner_business table for agency/business details
-- Date: 2025-11-14
-- Description: Creates a separate table to store business information for partners (agencies, developers, etc.)

-- Create partner_business table
CREATE TABLE IF NOT EXISTS partner_business (
    business_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    business_name VARCHAR(200) NOT NULL,
    registration_number VARCHAR(100) NOT NULL,
    business_address TEXT NOT NULL,
    business_email VARCHAR(100) NOT NULL,
    business_phone VARCHAR(20) NOT NULL,
    business_type ENUM('AGENCY', 'DEVELOPER', 'BUILDER', 'CONSULTANT') DEFAULT 'AGENCY',
    business_status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION') DEFAULT 'PENDING_VERIFICATION',
    verification_status ENUM('PENDING', 'VERIFIED', 'REJECTED') DEFAULT 'PENDING',
    verification_notes TEXT,
    verified_at DATETIME,
    verified_by INT,
    business_created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    business_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    business_deleted_at DATETIME,
    
    -- Foreign key constraint
    FOREIGN KEY (user_id) REFERENCES platform_user(user_id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_partner_business_user_id (user_id),
    INDEX idx_partner_business_name (business_name),
    INDEX idx_partner_business_registration (registration_number),
    INDEX idx_partner_business_status (business_status),
    INDEX idx_partner_business_verification (verification_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add comments
ALTER TABLE partner_business COMMENT = 'Stores business/agency information for partner users';

-- Update platform_user accountType enum to include AGENCY
ALTER TABLE platform_user 
MODIFY COLUMN user_account_type ENUM('INDIVIDUAL', 'AGENT', 'AGENCY') DEFAULT 'INDIVIDUAL';

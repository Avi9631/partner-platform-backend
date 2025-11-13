const AWS = require('aws-sdk');
require('dotenv').config();

// S3 Configuration
const s3Config = {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    region: process.env.S3_REGION || 'ap-south-1',
    signatureVersion: 'v4'
};

// Handle S3-compatible services
if (process.env.S3_ENDPOINT) {
    s3Config.endpoint = process.env.S3_ENDPOINT;
    s3Config.s3ForcePathStyle = true; // Force path style for S3-compatible services
    
    // For Supabase and other S3-compatible services, we need to ensure proper configuration
    if (process.env.S3_ENDPOINT.includes('supabase.co')) {
        // Special handling for Supabase S3 API
        s3Config.s3BucketEndpoint = false;
        s3Config.s3ForcePathStyle = true;
    }
} else {
    // AWS S3 default configuration
    s3Config.s3ForcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';
}

// Create S3 instance
const s3 = new AWS.S3(s3Config);

// Default bucket name
const defaultBucket = process.env.S3_DEFAULT_BUCKET || 'uploads';

// Export configuration and instance
module.exports = {
    s3,
    defaultBucket,
    config: s3Config
};
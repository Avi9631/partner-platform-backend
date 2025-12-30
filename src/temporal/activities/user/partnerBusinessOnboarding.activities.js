/**
 * Partner Business Onboarding Activities
 * 
 * Activities for validating business profiles and uploading owner verification videos to Supabase.
 * 
 * @module temporal/activities/user/partnerBusinessOnboarding
 */

const logger = require('../../../config/winston.config');
const { s3, defaultBucket } = require('../../../config/s3.config');
const db = require('../../../entity/index');
const path = require('path');

/**
 * Validate Business Onboarding Data Activity
 * 
 * Validates all required fields for business partner onboarding.
 * 
 * @param {Object} validationData - Validation data containing business details
 * @param {number} validationData.userId - User ID
 * @param {Object} validationData.businessData - Business data
 * @param {Buffer} validationData.videoBuffer - Owner verification video buffer
 * @returns {Promise<{success: boolean, errors?: string[]}>}
 */
async function validateBusinessOnboardingData(validationData) {
    try {
        const { userId, businessData, videoBuffer } = validationData;
        
        logger.info(`[Validate Business Onboarding] Starting validation for user ${userId}`);
        
        const errors = [];
        
        if (!businessData) {
            errors.push('Business data is required');
            return { success: false, errors };
        }
        
        // Required field validations
        if (!businessData.businessName || businessData.businessName.trim().length === 0) {
            errors.push('Business name is required');
        } else if (businessData.businessName.trim().length < 2) {
            errors.push('Business name must be at least 2 characters');
        }
        
        if (!businessData.registrationNumber || businessData.registrationNumber.trim().length === 0) {
            errors.push('Business registration number is required');
        }
        
        if (!businessData.businessAddress || businessData.businessAddress.trim().length === 0) {
            errors.push('Business address is required');
        } else if (businessData.businessAddress.trim().length < 10) {
            errors.push('Business address must be at least 10 characters');
        }
        
        if (!businessData.businessEmail || businessData.businessEmail.trim().length === 0) {
            errors.push('Business email is required');
        } else {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(businessData.businessEmail)) {
                errors.push('Invalid business email format');
            }
        }
        
        // Validate business phones array
        if (!businessData.businessPhones || !Array.isArray(businessData.businessPhones) || businessData.businessPhones.length === 0) {
            errors.push('At least one business phone number is required');
        } else {
            // Validate each phone in the array
            const phoneRegex = /^[+]?[\d\s\-()]+$/;
            for (let i = 0; i < businessData.businessPhones.length; i++) {
                const phoneObj = businessData.businessPhones[i];
                
                if (!phoneObj.phone || phoneObj.phone.trim().length === 0) {
                    errors.push(`Phone number at index ${i} is empty`);
                } else if (!phoneRegex.test(phoneObj.phone)) {
                    errors.push(`Invalid phone number format at index ${i}: ${phoneObj.phone}`);
                }
            }
        }
        
        // Check for owner verification video buffer
        if (!videoBuffer) {
            errors.push('Owner verification video is required');
        } else if (!Buffer.isBuffer(videoBuffer) && !videoBuffer.data) {
            errors.push('Invalid video buffer format');
        }
        
        if (errors.length > 0) {
            logger.warn(`[Validate Business Onboarding] Validation failed for user ${userId}:`, errors);
            return { success: false, errors };
        }
        
        logger.info(`[Validate Business Onboarding] Validation successful for user ${userId}`);
        return { success: true };
        
    } catch (error) {
        logger.error(`[Validate Business Onboarding] Error validating:`, error);
        throw error;
    }
}

/**
 * Upload Owner Video to Supabase Activity
 * 
 * Uploads the owner verification video to Supabase Storage using S3 protocol.
 * 
 * @param {Object} uploadData - Upload data containing video buffer
 * @param {number} uploadData.userId - User ID
 * @param {Buffer} uploadData.videoBuffer - Owner verification video buffer
 * @param {string} uploadData.originalFilename - Original video filename
 * @param {string} uploadData.videoMimetype - Video MIME type
 * @returns {Promise<{success: boolean, videoUrl: string, s3Key: string}>}
 */
async function uploadOwnerVideoToSupabase(uploadData) {
    const { userId, videoBuffer, originalFilename, videoMimetype } = uploadData;
    
    try {
        logger.info(`[Upload Owner Video] Starting upload for user ${userId}`);
        
        // Validate video buffer
        if (!videoBuffer) {
            throw new Error('No video buffer provided');
        }
        
        // Determine file extension
        const ext = path.extname(originalFilename || '.mp4');
        const timestamp = Date.now();
        const s3Key = `business-owners/${userId}/verification-video-${timestamp}${ext}`;
        
        // Ensure buffer is a Buffer instance
        const fileBuffer = Buffer.isBuffer(videoBuffer) 
            ? videoBuffer 
            : Buffer.from(videoBuffer);
        
        logger.info(`[Upload Owner Video] Buffer size: ${fileBuffer.length} bytes`);
        
        // Upload to S3/Supabase
        const uploadParams = {
            Bucket: process.env.S3_PARTNER_BUSINESS_BUCKET || defaultBucket,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: videoMimetype || 'video/mp4',
            ACL: 'private', // Private for security
        };
        
        logger.info(`[Upload Owner Video] Uploading to S3: ${s3Key}`);
        const uploadResult = await s3.upload(uploadParams).promise();
        
        // Construct video URL
        const videoUrl = uploadResult.Location || `${process.env.S3_ENDPOINT}/${uploadParams.Bucket}/${s3Key}`;
        
        logger.info(`[Upload Owner Video] Upload successful for user ${userId}: ${videoUrl}`);
        
        return {
            success: true,
            videoUrl,
            s3Key,
        };
        
    } catch (error) {
        logger.error(`[Upload Owner Video] Failed to upload video for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Create Partner Business Record Activity
 * 
 * Creates the business record in partner_business table with all details.
 * 
 * @param {Object} businessInput - Business creation data
 * @param {number} businessInput.userId - User ID (business owner)
 * @param {Object} businessInput.businessData - Business data
 * @param {string} businessInput.ownerVideoUrl - Owner verification video URL
 * @returns {Promise<{success: boolean, business: Object}>}
 */
async function createPartnerBusinessRecord(businessInput) {
    const { userId, businessData, ownerVideoUrl } = businessInput;
    
    try {
        logger.info(`[Create Business Record] Creating business for user ${userId}`);
        
        // Check if user exists
        const user = await db.PlatformUser.findByPk(userId);
        
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }
        
        // Check if business already exists for this user
        let business = await db.PartnerBusiness.findOne({
            where: { userId: userId }
        });
        
        // Prepare business fields (verification status will be updated separately)
        const businessFields = {
            userId: userId,
            businessName: businessData.businessName,
            registrationNumber: businessData.registrationNumber,
            businessAddress: businessData.businessAddress,
            businessEmail: businessData.businessEmail,
            businessPhone: businessData.businessPhones, // Store as JSONB array
            ownerVideo: ownerVideoUrl, // Store owner verification video URL
        };
        
        if (business) {
            // Update existing business
            await business.update(businessFields);
            logger.info(`[Create Business Record] Updated existing business for user ${userId}`);
        } else {
            // Create new business
            business = await db.PartnerBusiness.create(businessFields);
            logger.info(`[Create Business Record] Created new business for user ${userId}, ID: ${business.businessId}`);
        }
        
        return {
            success: true,
            business: business.toJSON(),
        };
        
    } catch (error) {
        logger.error(`[Create Business Record] Failed for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Update Partner Business Verification Status Activity
 * 
 * Updates the verification status in the partner_business table.
 * 
 * @param {Object} updateData - Update data
 * @param {number} updateData.userId - User ID
 * @param {string} updateData.verificationStatus - Verification status (null, 'PENDING', 'APPROVED', 'REJECTED')
 * @returns {Promise<{success: boolean, business: Object}>}
 */
async function updateBusinessVerificationStatus(updateData) {
    const { userId, verificationStatus } = updateData;
    
    try {
        logger.info(`[Update Business Verification Status] Updating business for user ${userId} to status: ${verificationStatus}`);
        
        // Validate verification status
        const validStatuses = [null, 'PENDING', 'APPROVED', 'REJECTED'];
        if (!validStatuses.includes(verificationStatus)) {
            throw new Error(`Invalid verification status: ${verificationStatus}. Must be one of: ${validStatuses.join(', ')}`);
        }
        
        // Find business record
        const business = await db.PartnerBusiness.findOne({
            where: { userId: userId }
        });
        
        if (!business) {
            throw new Error(`Business record not found for user: ${userId}`);
        }
        
        // Update verification status
        await business.update({ verificationStatus });
        
        logger.info(`[Update Business Verification Status] Successfully updated business for user ${userId} to status ${verificationStatus}`);
        
        return {
            success: true,
            business: business.toJSON(),
        };
        
    } catch (error) {
        logger.error(`[Update Business Verification Status] Failed for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Send Business Onboarding Notification Activity
 * 
 * Sends email notification about business profile submission and next steps.
 * 
 * @param {Object} notificationData - Notification data
 * @param {number} notificationData.userId - User ID
 * @param {string} notificationData.email - Business owner email
 * @param {string} notificationData.businessName - Business name
 * @returns {Promise<{success: boolean}>}
 */
async function sendBusinessOnboardingNotification(notificationData) {
    const { userId, email, businessName } = notificationData;
    
    try {
        logger.info(`[Business Onboarding Notification] Sending to ${email}`);
        
        // Import sendEmail activity
        const { sendEmail } = require('./user.activities');
        
        await sendEmail({
            to: email,
            subject: 'Business Profile Submitted for Verification - Partner Platform',
            body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #2563eb;">Business Profile Submitted Successfully!</h1>
                    <p>Dear Business Owner,</p>
                    
                    <p>Thank you for submitting your business profile for <strong>${businessName}</strong> on Partner Platform.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h2 style="color: #1f2937; margin-top: 0;">What's Next?</h2>
                        <ol style="color: #4b5563;">
                            <li><strong>Business Verification:</strong> Our team will review your business details and owner verification video within 24-48 hours.</li>
                            <li><strong>Document Review:</strong> We'll verify your registration number and business information.</li>
                            <li><strong>Approval Notification:</strong> You'll receive an email once your business profile is approved.</li>
                            <li><strong>Platform Access:</strong> After approval, you'll have full access to all business partner features.</li>
                        </ol>
                    </div>
                    
                    <div style="background-color: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                        <p style="margin: 0; color: #92400e;">
                            <strong>Current Status:</strong> <span style="color: #f59e0b;">Pending Verification</span>
                        </p>
                    </div>
                    
                    <p><strong>Business Name:</strong> ${businessName}</p>
                    <p><strong>Submission Date:</strong> ${new Date().toLocaleDateString()}</p>
                    
                    <p>If you have any questions about your submission, please don't hesitate to contact our support team.</p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <p style="color: #6b7280; font-size: 14px;">
                        Best regards,<br>
                        Partner Platform Team
                    </p>
                </div>
            `,
        });
        
        logger.info(`[Business Onboarding Notification] Sent to ${email}`);
        
        return { success: true };
        
    } catch (error) {
        logger.error(`[Business Onboarding Notification] Failed to send to ${email}:`, error);
        // Don't throw - notification failure shouldn't fail the workflow
        return { success: false, error: error.message };
    }
}

module.exports = {
    validateBusinessOnboardingData,
    uploadOwnerVideoToSupabase,
    createPartnerBusinessRecord,
    updateBusinessVerificationStatus,
    sendBusinessOnboardingNotification,
};

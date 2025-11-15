/**
 * Partner User Onboarding Activities
 * 
 * Activities for validating partner profiles and uploading verification videos to Supabase.
 * 
 * @module temporal/activities/user/partnerOnboarding
 */

const logger = require('../../../config/winston.config');
const { s3, defaultBucket } = require('../../../config/s3.config');
const db = require('../../../entity/index');
const PartnerBusinessService = require('../../../service/PartnerBusiness.service');
const fs = require('fs').promises;
const path = require('path');

/**
 * Validate Business Data Activity
 * 
 * Validates business/agency information for AGENCY account type.
 * 
 * @param {Object} businessData - Business data to validate
 * @returns {Promise<{success: boolean, errors?: string[]}>}
 */
async function validateBusinessData(businessData) {
    try {
        logger.info('[Validate Business] Starting validation');
        
        const errors = [];
        
        if (!businessData) {
            errors.push('Business data is required for AGENCY account type');
            return { success: false, errors };
        }
        
        // Required field validations
        if (!businessData.agencyName || businessData.agencyName.trim().length === 0) {
            errors.push('Business/Agency name is required');
        }
        
        if (!businessData.agencyRegistrationNumber || businessData.agencyRegistrationNumber.trim().length === 0) {
            errors.push('Registration number is required');
        }
        
        if (!businessData.agencyAddress || businessData.agencyAddress.trim().length === 0) {
            errors.push('Business address is required');
        }
        
        if (!businessData.agencyEmail || businessData.agencyEmail.trim().length === 0) {
            errors.push('Business email is required');
        } else {
            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(businessData.agencyEmail)) {
                errors.push('Invalid business email format');
            }
        }
        
        if (!businessData.agencyPhone || businessData.agencyPhone.trim().length === 0) {
            errors.push('Business phone is required');
        } else {
            // Validate phone format
            const phoneRegex = /^[+]?[\d\s\-()]+$/;
            if (!phoneRegex.test(businessData.agencyPhone)) {
                errors.push('Invalid business phone format');
            }
        }
        
        if (errors.length > 0) {
            logger.warn('[Validate Business] Validation failed:', errors);
            return { success: false, errors };
        }
        
        logger.info('[Validate Business] Validation successful');
        return { success: true };
        
    } catch (error) {
        logger.error('[Validate Business] Error validating business data:', error);
        throw error;
    }
}

/**
 * Validate Profile Data Activity
 * 
 * Validates all required fields for partner user profile completion.
 * 
 * @param {Object} profileData - Profile data to validate
 * @returns {Promise<{success: boolean, errors?: string[]}>}
 */
async function validateProfileData(profileData) {
    try {
        logger.info(`[Validate Profile] Starting validation for user ${profileData.userId}`);
        
        const errors = [];
        
        // Required field validations
        if (!profileData.firstName || profileData.firstName.trim().length === 0) {
            errors.push('First name is required');
        }
        
        if (!profileData.lastName || profileData.lastName.trim().length === 0) {
            errors.push('Last name is required');
        }
        
        if (!profileData.phone || profileData.phone.trim().length === 0) {
            errors.push('Phone number is required');
        } else {
            // Validate phone format
            const phoneRegex = /^[+]?[\d\s\-()]+$/;
            if (!phoneRegex.test(profileData.phone)) {
                errors.push('Invalid phone number format');
            }
        }
        
        // Validate location data
        if (!profileData.latitude || !profileData.longitude) {
            errors.push('Location (latitude and longitude) is required');
        } else {
            const lat = parseFloat(profileData.latitude);
            const lon = parseFloat(profileData.longitude);
            
            if (isNaN(lat) || lat < -90 || lat > 90) {
                errors.push('Invalid latitude value (must be between -90 and 90)');
            }
            
            if (isNaN(lon) || lon < -180 || lon > 180) {
                errors.push('Invalid longitude value (must be between -180 and 180)');
            }
        }
        
        // Validate account type if provided
        if (profileData.accountType) {
            const validTypes = ['INDIVIDUAL', 'AGENT', 'AGENCY'];
            if (!validTypes.includes(profileData.accountType)) {
                errors.push(`Invalid account type. Must be one of: ${validTypes.join(', ')}`);
            }
        }
        
        // Check for video file
        if (!profileData.videoPath && !profileData.videoBuffer) {
            errors.push('Profile verification video is required');
        }
        
        if (errors.length > 0) {
            logger.warn(`[Validate Profile] Validation failed for user ${profileData.userId}:`, errors);
            return { success: false, errors };
        }
        
        logger.info(`[Validate Profile] Validation successful for user ${profileData.userId}`);
        return { success: true };
        
    } catch (error) {
        logger.error(`[Validate Profile] Error validating profile:`, error);
        throw error;
    }
}

/**
 * Upload Video to Supabase Activity
 * 
 * Uploads the profile verification video to Supabase Storage using S3 protocol.
 * 
 * @param {Object} uploadData - Upload data containing video path/buffer
 * @returns {Promise<{success: boolean, videoUrl: string}>}
 */
async function uploadVideoToSupabase(uploadData) {
    const { userId, videoPath, videoBuffer, originalFilename } = uploadData;
    
    try {
        logger.info(`[Upload Video] Starting upload for user ${userId}`);
        
        // Determine file extension
        const ext = path.extname(originalFilename || videoPath || '.mp4');
        const timestamp = Date.now();
        const s3Key = `partner-profiles/${userId}/verification-video-${timestamp}${ext}`;
        
        let fileBuffer;
        
        // Get file buffer
        if (videoBuffer) {
            fileBuffer = videoBuffer;
        } else if (videoPath) {
            fileBuffer = await fs.readFile(videoPath);
        } else {
            throw new Error('No video data provided');
        }
        
        // Upload to S3/Supabase
        const uploadParams = {
            Bucket: process.env.S3_PARTNER_PROFILE_BUCKET || defaultBucket,
            Key: s3Key,
            Body: fileBuffer,
            ContentType: 'video/mp4',
            ACL: 'private', // Changed to private for security
        };
        
        logger.info(`[Upload Video] Uploading to S3: ${s3Key}`);
        const uploadResult = await s3.upload(uploadParams).promise();
        
        // Construct video URL
        const videoUrl = uploadResult.Location || `${process.env.S3_ENDPOINT}/${uploadParams.Bucket}/${s3Key}`;
        
        logger.info(`[Upload Video] Upload successful for user ${userId}: ${videoUrl}`);
        
        // Clean up temporary file if it exists
        if (videoPath) {
            try {
                await fs.unlink(videoPath);
                logger.info(`[Upload Video] Cleaned up temporary file: ${videoPath}`);
            } catch (cleanupError) {
                logger.warn(`[Upload Video] Failed to clean up temp file:`, cleanupError);
            }
        }
        
        return {
            success: true,
            videoUrl,
            s3Key,
        };
        
    } catch (error) {
        logger.error(`[Upload Video] Failed to upload video for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Update Partner User Activity
 * 
 * Updates the partner user record with profile data and video URL.
 * 
 * @param {Object} updateData - User update data
 * @returns {Promise<{success: boolean, user: Object}>}
 */
async function updatePartnerUser(updateData) {
    const { userId, profileData, videoUrl, verificationStatus } = updateData;
    
    try {
        logger.info(`[Update Partner User] Updating user ${userId}`);
        
        const user = await db.PlatformUser.findByPk(userId);
        
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }
        
        // Prepare update fields
        // Note: profileCompleted is NOT set here - it will be set when admin verifies
        const updateFields = {
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            phone: profileData.phone,
            latitude: parseFloat(profileData.latitude),
            longitude: parseFloat(profileData.longitude),
            address: profileData.address,
            profileVideo: videoUrl,
            userStatus: 'ACTIVE',
            verificationStatus: verificationStatus || 'PENDING',
        };
        
        // Update name initial
        if (profileData.firstName || profileData.lastName) {
            const firstName = profileData.firstName || user.firstName;
            const lastName = profileData.lastName || user.lastName;
            updateFields.nameInitial = getInitials(`${firstName} ${lastName}`);
        }
        
        // Add account type if provided
        if (profileData.accountType) {
            updateFields.accountType = profileData.accountType;
        }
        
        // Update user
        await user.update(updateFields);
        
        logger.info(`[Update Partner User] User ${userId} updated successfully`);
        
        return {
            success: true,
            user: user.toJSON(),
        };
        
    } catch (error) {
        logger.error(`[Update Partner User] Failed to update user ${userId}:`, error);
        throw error;
    }
}


/**
 * Update Partner Business Activity
 * 
 * Updates the partner business record with business data.
 * 
 * @param {Object} updateData - Business update data
 * @returns {Promise<{success: boolean, business: Object}>}
 */
async function updatePartnerBusiness(updateData) {
    const { businessId, businessData } = updateData;
    
    try {
        logger.info(`[Update Partner Business] Updating business for businessId ${businessId}`);
        
        const business = await db.PartnerBusiness.findByPk(businessId);
        
        if (!business) {
            throw new Error(`Business not found: ${businessId}`);
        }
        
        // Prepare update fields for business entity (matching PartnerBusiness.entity.js schema)
        const updateFields = {};
        
        // Map agency fields to business fields based on the entity schema
        if (businessData.agencyName) {
            updateFields.businessName = businessData.agencyName;
        }
        
        if (businessData.agencyRegistrationNumber) {
            updateFields.registrationNumber = businessData.agencyRegistrationNumber;
        }
        
        if (businessData.agencyAddress) {
            updateFields.businessAddress = businessData.agencyAddress;
        }
        
        if (businessData.agencyEmail) {
            updateFields.businessEmail = businessData.agencyEmail;
        }
        
        if (businessData.agencyPhone) {
            updateFields.businessPhone = businessData.agencyPhone;
        }
        
        // Add verification notes if provided
        if (businessData.verificationNotes) {
            updateFields.verificationNotes = businessData.verificationNotes;
        }
        
        // Update verification status to PENDING for new submissions
        if (!business.verificationStatus || business.verificationStatus === 'PENDING') {
            updateFields.verificationStatus = 'PENDING';
        }
        
        // Update business
        await business.update(updateFields);
        
        logger.info(`[Update Partner Business] Business ${businessId} updated successfully`);
        
        return {
            success: true,
            business: business.toJSON(),
        };
        
    } catch (error) {
        logger.error(`[Update Partner Business] Failed to update business ${businessId}:`, error);
        throw error;
    }
}

/**
 * Send Onboarding Notification Activity
 * 
 * Sends email notification about profile submission and next steps.
 * 
 * @param {Object} notificationData - Notification data
 * @returns {Promise<{success: boolean}>}
 */
async function sendOnboardingNotification(notificationData) {
    const { userId, email, name } = notificationData;
    
    try {
        logger.info(`[Onboarding Notification] Sending to ${email}`);
        
        // Import sendEmail activity
        const { sendEmail } = require('./user.activities');
        
        await sendEmail({
            to: email,
            subject: 'Profile Submitted for Verification - Partner Platform',
            body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h1 style="color: #2563eb;">Profile Submitted Successfully!</h1>
                    <p>Dear ${name},</p>
                    
                    <p>Thank you for completing your partner profile on Partner Platform.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h2 style="color: #1f2937; margin-top: 0;">What's Next?</h2>
                        <ol style="color: #4b5563;">
                            <li><strong>Profile Review:</strong> Our team will review your profile and verification video within 24-48 hours.</li>
                            <li><strong>Verification:</strong> You'll receive an email once your profile is approved.</li>
                            <li><strong>Get Started:</strong> After approval, you'll have full access to all partner features.</li>
                        </ol>
                    </div>
                    
                    <p>Your current status: <strong style="color: #f59e0b;">Pending Verification</strong></p>
                    
                    <p>If you have any questions, please don't hesitate to contact our support team.</p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                    
                    <p style="color: #6b7280; font-size: 14px;">
                        Best regards,<br>
                        Partner Platform Team
                    </p>
                </div>
            `,
        });
        
        logger.info(`[Onboarding Notification] Sent to ${email}`);
        
        return { success: true };
        
    } catch (error) {
        logger.error(`[Onboarding Notification] Failed to send to ${email}:`, error);
        // Don't throw - notification failure shouldn't fail the workflow
        return { success: false, error: error.message };
    }
}

/**
 * Create Partner Business Activity
 * 
 * Creates or updates business/agency profile for partner users.
 * 
 * @param {Object} businessInput - Business creation data
 * @returns {Promise<{success: boolean, business: Object}>}
 */
async function createPartnerBusiness(businessInput) {
    const { userId, businessData } = businessInput;
    
    try {
        logger.info(`[Create Partner Business] Creating/updating business for user ${userId}`);
        
        // Validate business data first
        const validationResult = await validateBusinessData(businessData);
        if (!validationResult.success) {
            throw new Error(`Business validation failed: ${validationResult.errors.join(', ')}`);
        }
        
        // Create or update business record
        const business = await PartnerBusinessService.createOrUpdateBusiness(userId, businessData);
        
        logger.info(`[Create Partner Business] Business created/updated successfully for user ${userId}`);
        
        return {
            success: true,
            business,
        };
        
    } catch (error) {
        logger.error(`[Create Partner Business] Failed for user ${userId}:`, error);
        throw error;
    }
}

/**
 * Helper function to generate initials
 */
function getInitials(name) {
    const trimmedName = name.trim();
    
    if (!trimmedName.includes(' ')) {
        return trimmedName.slice(0, 2).toUpperCase();
    }
    
    const words = trimmedName.split(' ').filter((word) => word.length > 0);
    const initials = words.map((word) => word.charAt(0).toUpperCase()).join('');
    
    return initials.slice(0, 2);
}

module.exports = {
    validateProfileData,
    validateBusinessData,
    uploadVideoToSupabase,
    updatePartnerUser,
    updatePartnerBusiness,
    createPartnerBusiness,
    sendOnboardingNotification,
};

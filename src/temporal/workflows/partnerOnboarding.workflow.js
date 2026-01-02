/**
 * Partner User Onboarding Workflow
 * 
 * Handles the complete partner user profile completion and verification process.
 * This workflow validates profile details, uploads verification video to Supabase,
 * and updates the user record.
 * 
 * @module temporal/workflows/partnerOnboarding.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');
const { ACTIVITY_OPTIONS } = require('../config/constants');

/** @typedef {import('../../types').WorkflowResult} WorkflowResult */

// Proxy partner onboarding activities with appropriate timeouts
const {
    validateProfileData,
    // validateBusinessData,
    uploadVideoToSupabase,
    updatePartnerUser,
    // createPartnerBusiness,
    sendOnboardingNotification,
} = proxyActivities({
    startToCloseTimeout: '5 minutes', // Longer timeout for video upload
    retry: {
        initialInterval: '1s',
        maximumInterval: '30s',
        backoffCoefficient: 2,
        maximumAttempts: 3,
    },
});

/**
 * Partner User Onboarding Workflow
 * 
 * Orchestrates the partner profile completion process:
 * 1. Validates all profile details (no verification entity creation)
 * 2. Uploads verification video to Supabase using S3 protocol
 * 3. Stores video URL in platform_user table
 * 4. Updates user status and profile completion flags
 * 5. Sends onboarding notification email
 * 
 * @param {Object} workflowInput - Workflow input data
 * @param {number} workflowInput.userId - User ID
 * @param {string} workflowInput.email - User email
 * @param {Object} workflowInput.profileData - Profile data (firstName, lastName, phone, location, etc.)
 * @param {Object} workflowInput.businessData - Business/agency data (for BUSINESS account type)
 * @param {Buffer} workflowInput.videoBuffer - Video file buffer
 * @param {string} workflowInput.originalFilename - Original video filename
 * @param {string} workflowInput.videoMimetype - Video MIME type
 * @param {number} workflowInput.videoSize - Video file size in bytes
 * @returns {Promise<WorkflowResult>} - Workflow result
 * 
 * @example
 * await startWorkflow('partnerUserOnboarding', {
 *   userId: 123,
 *   email: 'partner@example.com',
 *   profileData: {
 *     firstName: 'John',
 *     lastName: 'Doe',
 *     phone: '+1234567890',
 *     latitude: 40.7128,
 *     longitude: -74.0060,
 *     address: '123 Main St, New York, NY',
 *     accountType: 'AGENT'
 *   },
 *   videoBuffer: Buffer.from(...),
 *   originalFilename: 'verification-video.mp4',
 *   videoMimetype: 'video/mp4',
 *   videoSize: 1024000
 * });
 */
async function partnerUserOnboarding(workflowInput) {
    const { 
        userId, 
        email, 
        profileData, 
        businessData,
        videoBuffer, 
        originalFilename,
        videoMimetype,
        videoSize
    } = workflowInput;
    
    console.log(`[Partner Onboarding Workflow] Starting for user ${userId}`);
    
    try {
        // Step 1: Validate profile data
        console.log(`[Partner Onboarding] Step 1: Validating profile data`);
        
        const validationResult = await validateProfileData({
            userId,
            ...profileData,
            videoBuffer,
        });
        
        if (!validationResult.success) {
            console.error(`[Partner Onboarding] Validation failed:`, validationResult.errors);
            throw new Error(`Profile validation failed: ${validationResult.errors.join(', ')}`);
        }
        
        console.log(`[Partner Onboarding] Profile validation successful`);
        
        // // Step 1.5: Validate business data if BUSINESS account type
        // if (profileData.accountType === 'BUSINESS' && businessData) {
        //     console.log(`[Partner Onboarding] Step 1.5: Validating business data`);
            
        //     const businessValidationResult = await validateBusinessData(businessData);
            
        //     if (!businessValidationResult.success) {
        //         console.error(`[Partner Onboarding] Business validation failed:`, businessValidationResult.errors);
        //         throw new Error(`Business validation failed: ${businessValidationResult.errors.join(', ')}`);
        //     }
            
        //     console.log(`[Partner Onboarding] Business validation successful`);
        // }
        
        // Step 2: Upload video to Supabase using S3 protocol
        console.log(`[Partner Onboarding] Step 2: Uploading video to Supabase`);
        
        const uploadResult = await uploadVideoToSupabase({
            userId,
            videoBuffer,
            originalFilename,
            videoMimetype,
        });
        
        if (!uploadResult.success) {
            throw new Error('Failed to upload video to Supabase');
        }
        
        console.log(`[Partner Onboarding] Video uploaded successfully: ${uploadResult.videoUrl}`);
        
        // Step 3: Update partner user record with video URL
        console.log(`[Partner Onboarding] Step 3: Updating user record`);
        
        const updateResult = await updatePartnerUser({
            userId,
            profileData,
            videoUrl: uploadResult.videoUrl,
            verificationStatus: 'APPROVED',
        });
        
        if (!updateResult.success) {
            throw new Error('Failed to update user record');
        }
        
        console.log(`[Partner Onboarding] User record updated successfully`);
        
        // Step 3.5: Create business profile if BUSINESS account type
        // let businessResult = null;
        // if (profileData.accountType === 'BUSINESS' && businessData) {
        //     console.log(`[Partner Onboarding] Step 3.5: Creating business profile`);
            
        //     businessResult = await createPartnerBusiness({
        //         userId,
        //         businessData,
        //     });
            
        //     if (!businessResult.success) {
        //         console.error(`[Partner Onboarding] Business creation failed`);
        //         // Don't fail the entire workflow, just log the error
        //     } else {
        //         console.log(`[Partner Onboarding] Business profile created successfully`);
        //     }
        // }
        
        // Step 4: Send onboarding notification email
        console.log(`[Partner Onboarding] Step 4: Sending notification email`);
        
        await sendOnboardingNotification({
            userId,
            email,
            name: `${profileData.firstName} ${profileData.lastName}`,
        });
        
        console.log(`[Partner Onboarding] Notification sent`);
        
        // Return success result
        return {
            success: true,
            userId,
            message: 'Partner user profile submitted for verification. profileCompleted will be set upon approval.',
            data: {
                profileSetupSubmitted: true,
                verificationStatus: 'PENDING',
                videoUrl: uploadResult.videoUrl,
                user: updateResult.user,
            },
        };
        
    } catch (error) {
        console.error(`[Partner Onboarding Workflow] Failed for user ${userId}:`, error);
        
        // Return failure result
        return {
            success: false,
            userId,
            message: `Partner user onboarding failed: ${error.message}`,
            error: error.message,
        };
    }
}

module.exports = {
    partnerUserOnboarding,
};

/**
 * Partner User Onboarding Workflow - Direct Execution (Non-Temporal)
 * 
 * This is the direct execution version of partnerOnboarding.workflow.js
 * It has the SAME logic but without Temporal's proxyActivities.
 * 
 * MAINTENANCE: Keep this in sync with partnerOnboarding.workflow.js
 * 
 * @module temporal/workflows/partnerOnboarding-non.workflow
 */

// Import Partner Onboarding specific activities
const partnerOnboardingActivities = require('../../activities/partnerOnboarding.activities');

// Combine all activities into a single object
const activities = {
    ...partnerOnboardingActivities,
    // Add more activity imports here if needed
};

/**
 * Partner User Onboarding Workflow - Direct Execution
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
 * @returns {Promise<Object>} - Workflow result
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
    
    console.log(`[Partner Onboarding Workflow - Direct] Starting for user ${userId}`);
    
    try {
        // Step 1: Validate profile data
        console.log(`[Partner Onboarding] Step 1: Validating profile data`);
        
        const validationResult = await activities.validateProfileData({
            userId,
            ...profileData,
            videoBuffer,
        });
        
        if (!validationResult.success) {
            console.error(`[Partner Onboarding] Validation failed:`, validationResult.errors);
            throw new Error(`Profile validation failed: ${validationResult.errors.join(', ')}`);
        }
        
        console.log(`[Partner Onboarding] Profile validation successful`);
        
        // Step 2: Upload video to Supabase using S3 protocol
        console.log(`[Partner Onboarding] Step 2: Uploading verification video to Supabase`);
        
        const uploadResult = await activities.uploadVideoToSupabase({
            videoBuffer,
            originalFilename,
            videoMimetype,
            videoSize,
            userId,
            uploadType: 'profile-video'
        });
        
        if (!uploadResult.success) {
            console.error(`[Partner Onboarding] Video upload failed:`, uploadResult.error);
            throw new Error(`Video upload failed: ${uploadResult.error}`);
        }
        
        console.log(`[Partner Onboarding] Video uploaded successfully: ${uploadResult.videoUrl}`);
        
        // Step 3: Update partner user with profile data and video URL
        console.log(`[Partner Onboarding] Step 3: Updating user profile with video URL`);
        
        const updateResult = await activities.updatePartnerUser({
            userId,
            profileData,
            videoUrl: uploadResult.videoUrl,
            verificationStatus: 'APPROVED',
        });
        
        if (!updateResult.success) {
            console.error(`[Partner Onboarding] User update failed:`, updateResult.error);
            throw new Error(`User update failed: ${updateResult.error}`);
        }
        
        console.log(`[Partner Onboarding] User profile updated successfully`);
        
        // Step 4: Send onboarding notification email
        console.log(`[Partner Onboarding] Step 4: Sending notification email`);
        
        await activities.sendOnboardingNotification({
            userId,
            email,
            name: `${profileData.firstName} ${profileData.lastName}`,
        });
        
        console.log(`[Partner Onboarding] Notification sent`);
        
        // Step 5: Add welcome bonus credits
        console.log(`[Partner Onboarding] Step 5: Adding welcome bonus credits`);
        
        const creditResult = await activities.addCredits({
            userId,
            amount: 200,
            reason: 'Welcome bonus for completing profile onboarding',
            metadata: { type: 'ONBOARDING_BONUS', workflowType: 'partnerUserOnboarding' },
        });
        
        if (creditResult.success) {
            console.log(`[Partner Onboarding] Added 200 credits to user wallet`);
        } else {
            console.error(`[Partner Onboarding] Failed to add credits: ${creditResult.message}`);
            // Don't fail the entire workflow for credit addition failure
        }
        
        console.log(`[Partner Onboarding Workflow] Completed successfully for user ${userId}`);
        
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

module.exports = { partnerUserOnboarding };

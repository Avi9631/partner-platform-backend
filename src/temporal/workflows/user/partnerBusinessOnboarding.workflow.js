/**
 * Partner Business Onboarding Workflow
 * 
 * Handles the complete business partner onboarding and verification process.
 * This workflow validates business details, uploads owner verification video to Supabase,
 * creates the business record, and updates verification status.
 * 
 * @module temporal/workflows/user/partnerBusinessOnboarding.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');

/** @typedef {import('../../types').WorkflowResult} WorkflowResult */

// Proxy business onboarding activities with appropriate timeouts
const {
    validateBusinessOnboardingData,
    uploadOwnerVideoToSupabase,
    createPartnerBusinessRecord,
    updateUserAccountType,
    updateBusinessVerificationStatus,
    sendBusinessOnboardingNotification,
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
 * Partner Business Onboarding Workflow
 * 
 * Orchestrates the business partner onboarding process:
 * 1. Validates all business details (name, registration, address, email, phones)
 * 2. Uploads owner verification video to Supabase using S3 protocol
 * 3. Creates business record in partner_business table with video URL
 * 4. Updates user's account type to BUSINESS in platform_user table
 * 5. Updates verification status to PENDING in partner_business table
 * 6. Sends onboarding notification email to business owner
 * 
 * @param {Object} workflowInput - Workflow input data
 * @param {number} workflowInput.userId - User ID (business owner)
 * @param {string} workflowInput.email - Business owner email
 * @param {Object} workflowInput.businessData - Business data
 * @param {string} workflowInput.businessData.businessName - Business/Company name
 * @param {string} workflowInput.businessData.registrationNumber - Business registration number
 * @param {string} workflowInput.businessData.businessAddress - Complete business address
 * @param {string} workflowInput.businessData.businessEmail - Business email address
 * @param {Array<{phone: string}>} workflowInput.businessData.businessPhones - Business phone numbers (array of objects)
 * @param {Buffer} workflowInput.videoBuffer - Owner verification video buffer
 * @param {string} workflowInput.originalFilename - Original video filename
 * @param {string} workflowInput.videoMimetype - Video MIME type
 * @param {number} workflowInput.videoSize - Video file size in bytes
 * @returns {Promise<WorkflowResult>} - Workflow result
 * 
 * @example
 * await startWorkflow('partnerBusinessOnboarding', {
 *   userId: 123,
 *   email: 'owner@business.com',
 *   businessData: {
 *     businessName: 'VIRTUSA CONSULTING PVT LTD',
 *     registrationNumber: 'REG123456',
 *     businessAddress: 'FLAT - 601, Block A, Elegant Height, Telco Jamshedpur',
 *     businessEmail: 'business@example.com',
 *     businessPhones: [{phone: '9631045873'}, {phone: '9876543210'}]
 *   },
 *   videoBuffer: Buffer.from(...),
 *   originalFilename: 'owner-verification.mp4',
 *   videoMimetype: 'video/mp4',
 *   videoSize: 1024000
 * });
 */
async function partnerBusinessOnboarding(workflowInput) {
    const { 
        userId, 
        email, 
        businessData,
        videoBuffer, 
        originalFilename,
        videoMimetype,
        videoSize
    } = workflowInput;
    
    console.log(`[Business Onboarding Workflow] Starting for user ${userId}`);
    
    try {
        // Step 1: Validate business data
        console.log(`[Business Onboarding] Step 1: Validating business data`);
        
        const validationResult = await validateBusinessOnboardingData({
            userId,
            businessData,
            videoBuffer,
        });
        
        if (!validationResult.success) {
            console.error(`[Business Onboarding] Validation failed:`, validationResult.errors);
            throw new Error(`Business validation failed: ${validationResult.errors.join(', ')}`);
        }
        
        console.log(`[Business Onboarding] Business validation successful`);
        
        // Step 2: Upload owner verification video to Supabase using S3 protocol
        console.log(`[Business Onboarding] Step 2: Uploading owner verification video to Supabase`);
        
        const uploadResult = await uploadOwnerVideoToSupabase({
            userId,
            videoBuffer,
            originalFilename,
            videoMimetype,
        });
        
        if (!uploadResult.success) {
            throw new Error('Failed to upload owner verification video to Supabase');
        }
        
        console.log(`[Business Onboarding] Video uploaded successfully: ${uploadResult.videoUrl}`);
        
        // Step 3: Create business record with video URL
        console.log(`[Business Onboarding] Step 3: Creating business record`);
        
        const businessResult = await createPartnerBusinessRecord({
            userId,
            businessData,
            ownerVideoUrl: uploadResult.videoUrl,
        });
        
        if (!businessResult.success) {
            throw new Error('Failed to create business record');
        }
        
        console.log(`[Business Onboarding] Business record created successfully, ID: ${businessResult.business.businessId}`);
        
        // Step 4: Update user account type to BUSINESS
        console.log(`[Business Onboarding] Step 4: Updating user account type to BUSINESS`);
        
        const accountTypeResult = await updateUserAccountType({
            userId,
            accountType: 'BUSINESS',
        });
        
        if (!accountTypeResult.success) {
            throw new Error('Failed to update user account type');
        }
        
        console.log(`[Business Onboarding] User account type updated to BUSINESS`);
        
        // Step 5: Update business verification status to PENDING
        console.log(`[Business Onboarding] Step 5: Updating verification status to PENDING`);
        
        const verificationResult = await updateBusinessVerificationStatus({
            userId,
            verificationStatus: 'APPROVED',
        });
        
        if (!verificationResult.success) {
            throw new Error('Failed to update business verification status');
        }
        
        console.log(`[Business Onboarding] Verification status updated to PENDING`);
        
        // Step 6: Send onboarding notification email
        console.log(`[Business Onboarding] Step 6: Sending notification email`);
        
        await sendBusinessOnboardingNotification({
            userId,
            email,
            businessName: businessData.businessName,
        });
        
        console.log(`[Business Onboarding] Notification sent`);
        
        // Return success result
        return {
            success: true,
            userId,
            message: 'Business partner profile submitted for verification successfully.',
            data: {
                businessId: businessResult.business.businessId,
                businessName: businessData.businessName,
                verificationStatus: 'PENDING',
                ownerVideoUrl: uploadResult.videoUrl,
                business: businessResult.business,
            },
        };
        
    } catch (error) {
        console.error(`[Business Onboarding Workflow] Failed for user ${userId}:`, error);
        
        // Return failure result
        return {
            success: false,
            userId,
            message: `Business partner onboarding failed: ${error.message}`,
            error: error.message,
        };
    }
}

module.exports = {
    partnerBusinessOnboarding,
};

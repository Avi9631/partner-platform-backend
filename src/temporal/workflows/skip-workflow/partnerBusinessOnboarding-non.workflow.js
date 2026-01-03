/**
 * Partner Business Onboarding Workflow - Direct Execution (Non-Temporal)
 * 
 * This is the direct execution version of partnerBusinessOnboarding.workflow.js
 * It has the SAME logic but without Temporal's proxyActivities.
 * 
 * MAINTENANCE: Keep this in sync with partnerBusinessOnboarding.workflow.js
 * 
 * @module temporal/workflows/partnerBusinessOnboarding-non.workflow
 */

// Import Partner Business Onboarding specific activities
const partnerBusinessOnboardingActivities = require('../../activities/partnerBusinessOnboarding.activities');

// Combine all activities into a single object
const activities = {
    ...partnerBusinessOnboardingActivities,
    // Add more activity imports here if needed
};

/**
 * Partner Business Onboarding Workflow - Direct Execution
 */
async function partnerBusinessOnboarding(workflowInput) {
    const { 
        userId, 
        email, 
        businessData
    } = workflowInput;
    
    console.log(`[Business Onboarding Workflow] Starting for user ${userId}`);
    
    try {
        // Step 1: Validate business data
        console.log(`[Business Onboarding] Step 1: Validating business data`);
        
        const validationResult = await activities.validateBusinessOnboardingData({
            userId,
            businessData,
        });
        
        if (!validationResult.success) {
            console.error(`[Business Onboarding] Validation failed:`, validationResult.errors);
            throw new Error(`Business validation failed: ${validationResult.errors.join(', ')}`);
        }
        
        console.log(`[Business Onboarding] Business validation successful`);
        
        // Step 2: Create business record
        console.log(`[Business Onboarding] Step 2: Creating business record`);
        
        const businessResult = await activities.createPartnerBusinessRecord({
            userId,
            businessData,
        });
        
        if (!businessResult.success) {
            throw new Error('Failed to create business record');
        }
        
        console.log(`[Business Onboarding] Business record created successfully, ID: ${businessResult.business.businessId}`);
        
        // Step 3: Update business verification status to APPROVED
        console.log(`[Business Onboarding] Step 3: Updating verification status to APPROVED`);
        
        const verificationResult = await activities.updateBusinessVerificationStatus({
            userId,
            verificationStatus: 'APPROVED',
        });
        
        if (!verificationResult.success) {
            throw new Error('Failed to update business verification status');
        }
        
        console.log(`[Business Onboarding] Verification status updated to APPROVED`);
        
        // Step 4: Send onboarding notification email
        console.log(`[Business Onboarding] Step 4: Sending notification email`);
        
        await activities.sendBusinessOnboardingNotification({
            userId,
            email,
            businessName: businessData.businessName,
        });
        
        console.log(`[Business Onboarding] Notification sent`);
        
        // Step 5: Add welcome bonus credits
        console.log(`[Business Onboarding] Step 5: Adding welcome bonus credits`);
        
        const creditResult = await activities.addCredits({
            userId,
            amount: 200,
            reason: 'Welcome bonus for completing business onboarding',
            metadata: { type: 'ONBOARDING_BONUS', workflowType: 'partnerBusinessOnboarding', businessName: businessData.businessName },
        });
        
        if (creditResult.success) {
            console.log(`[Business Onboarding] Added 200 credits to user wallet`);
        } else {
            console.error(`[Business Onboarding] Failed to add credits: ${creditResult.message}`);
            // Don't fail the entire workflow for credit addition failure
        }
        
        // Return success result
        return {
            success: true,
            userId,
            message: 'Business partner profile submitted for verification successfully.',
            data: {
                businessId: businessResult.business.businessId,
                businessName: businessData.businessName,
                verificationStatus: 'PENDING',
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

module.exports = { partnerBusinessOnboarding };

/**
 * Partner Business Onboarding Workflow
 * 
 * Handles the complete business partner onboarding and verification process.
 * This workflow validates business details, creates the business record, and updates verification status.
 * 
 * @module temporal/workflows/partnerBusinessOnboarding.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');

/** @typedef {import('../../types').WorkflowResult} WorkflowResult */

// Proxy business onboarding activities with appropriate timeouts
const {
    validateBusinessOnboardingData,
    createPartnerBusinessRecord,
    updateBusinessVerificationStatus,
    sendBusinessOnboardingNotification,
    addCredits,
} = proxyActivities({
    startToCloseTimeout: '2 minutes',
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
 * 2. Creates business record in partner_business table
 * 3. Updates verification status to APPROVED in partner_business table
 * 4. Sends onboarding notification email to business owner
 * 
 * Note: accountType is no longer stored in platform_user. It is derived dynamically:
 * - BUSINESS: when a verified (APPROVED) partner_business record exists for the user
 * - INDIVIDUAL: otherwise
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
 *   }
 * });
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
        
        const validationResult = await validateBusinessOnboardingData({
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
        
        const businessResult = await createPartnerBusinessRecord({
            userId,
            businessData,
        });
        
        if (!businessResult.success) {
            throw new Error('Failed to create business record');
        }
        
        console.log(`[Business Onboarding] Business record created successfully, ID: ${businessResult.business.businessId}`);
        
        // Step 3: Update business verification status to APPROVED
        console.log(`[Business Onboarding] Step 3: Updating verification status to APPROVED`);
        
        const verificationResult = await updateBusinessVerificationStatus({
            userId,
            verificationStatus: 'APPROVED',
        });
        
        if (!verificationResult.success) {
            throw new Error('Failed to update business verification status');
        }
        
        console.log(`[Business Onboarding] Verification status updated to APPROVED`);
        
        // Step 4: Send onboarding notification email
        console.log(`[Business Onboarding] Step 4: Sending notification email`);
        
        await sendBusinessOnboardingNotification({
            userId,
            email,
            businessName: businessData.businessName,
        });
        
        console.log(`[Business Onboarding] Notification sent`);
        
        // Step 5: Add welcome bonus credits
        console.log(`[Business Onboarding] Step 5: Adding welcome bonus credits`);
        
        const creditResult = await addCredits({
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

module.exports = {
    partnerBusinessOnboarding,
};

/**
 * Developer Publishing Workflow
 * 
 * Handles the complete developer profile publishing and verification process.
 * This workflow validates developer data, creates the developer record,
 * performs automated verification checks, and sends notifications.
 * 
 * @module temporal/workflows/developerPublishing.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');

/** @typedef {import('../../types').WorkflowResult} WorkflowResult */

// Proxy developer publishing activities with appropriate timeouts
const {
    validateDeveloperData,
    checkDeveloperExists,
    getUserEmail,
    sendDeveloperPublishingNotification,
    updateListingDraftStatus,
    getDeveloperDraftData,
} = proxyActivities({
    startToCloseTimeout: '2 minutes',
    retry: {
        initialInterval: '1s',
        maximumInterval: '30s',
        backoffCoefficient: 2,
        maximumAttempts: 3,
    },
});

// Separate proxies for create and update with different retry policies
const { createDeveloperRecord } = proxyActivities({
    startToCloseTimeout: '3 minutes',
    retry: {
        initialInterval: '2s',
        maximumInterval: '1m',
        backoffCoefficient: 2,
        maximumAttempts: 5,
    },
});

const { updateDeveloperRecord } = proxyActivities({
    startToCloseTimeout: '2 minutes',
    retry: {
        initialInterval: '1s',
        maximumInterval: '30s',
        backoffCoefficient: 2,
        maximumAttempts: 3,
    },
});

/**
 * Developer Publishing Workflow
 * 
 * Orchestrates the developer profile publishing process:
 * 1. Fetches developer data from ListingDraft entity using draftId
 * 2. Validates all developer data (name, type, contact info, projects, etc.)
 * 3. Checks if developer already exists for the draft
 * 4. Creates or updates developer record in database (based on existence)
 * 5. Updates draft status to PUBLISHED
 * 6. Sends notification email to user (final step)
 * 
 * @param {Object} workflowInput - Workflow input data
 * @param {number} workflowInput.userId - User ID
 * @param {number} workflowInput.draftId - Draft ID (required, ensures one draft = one publish)
 * @returns {Promise<WorkflowResult>} - Workflow result
 * 
 * @example
 * await startWorkflow('developerPublishing', {
 *   userId: 123,
 *   draftId: 456
 * });
 */
async function developerPublishing(workflowInput) {
    const { 
        userId,
        draftId
    } = workflowInput;
    
    console.log(`[Developer Publishing Workflow] Starting for user ${userId}`);
    
    try {
        // Step 1: Fetch developer data from ListingDraft
        console.log(`[Developer Publishing] Step 1: Fetching developer data from draft ${draftId}`);
        
        const draftDataResult = await getDeveloperDraftData({ draftId });
        
        if (!draftDataResult.success) {
            console.error(`[Developer Publishing] Failed to fetch draft data:`, draftDataResult.message);
            return {
                success: false,
                message: draftDataResult.message || 'Failed to fetch developer draft data'
            };
        }
        
        const developerData = draftDataResult.data;
        console.log(`[Developer Publishing] Developer data fetched successfully`);
        
        // Step 2: Validate developer data
        console.log(`[Developer Publishing] Step 2: Validating developer data`);
        
        const validationResult = await validateDeveloperData({
            userId,
            draftId,
            developerData,
        });
        
        if (!validationResult.success) {
            console.error(`[Developer Publishing] Validation failed:`, validationResult.errors);
            return {
                success: false,
                message: 'Validation failed',
                errors: validationResult.errors
            };
        }
        
        console.log(`[Developer Publishing] Validation successful`);
        
        // Step 3: Check if developer already exists
        console.log(`[Developer Publishing] Step 3: Checking if developer exists`);
        
        const checkResult = await checkDeveloperExists({ draftId });
        
        if (!checkResult.success) {
            console.error(`[Developer Publishing] Failed to check developer existence`);
            return {
                success: false,
                message: 'Failed to check developer existence'
            };
        }
        
        let developer;
        let developerId;
        let action;
        
        // Step 4: Create or update based on existence
        if (checkResult.exists) {
            console.log(`[Developer Publishing] Step 4: Updating existing developer ${checkResult.data.developerId}`);
            
            const updateResult = await updateDeveloperRecord({
                developerId: checkResult.data.developerId,
                userId,
                developerData
            });
            
            if (!updateResult.success) {
                console.error(`[Developer Publishing] Failed to update developer record`);
                return {
                    success: false,
                    message: updateResult.message || 'Failed to update developer record'
                };
            }
            
            developer = updateResult.data;
            developerId = developer.developerId;
            action = 'updated';
            
        } else {
            console.log(`[Developer Publishing] Step 4: Creating new developer record`);
            
            const createResult = await createDeveloperRecord({
                userId,
                draftId,
                developerData
            });
            
            if (!createResult.success) {
                console.error(`[Developer Publishing] Failed to create developer record`);
                return {
                    success: false,
                    message: createResult.message || 'Failed to create developer record'
                };
            }
            
            developer = createResult.data;
            developerId = developer.developerId;
            action = 'created';
        }
        
        console.log(`[Developer Publishing] Developer record ${action} with ID: ${developerId}`);
        
        // Step 5: Update ListingDraft status to PUBLISHED
        console.log(`[Developer Publishing] Step 5: Updating ListingDraft status`);
        
        try {
            await updateListingDraftStatus({ draftId });
            console.log(`[Developer Publishing] ListingDraft status updated to PUBLISHED`);
        } catch (updateError) {
            // Log but don't fail the workflow
            console.error(`[Developer Publishing] Failed to update ListingDraft status:`, updateError);
        }
        
        // Step 6: Send notification email (final step)
        console.log(`[Developer Publishing] Step 6: Sending notification email`);
        
        try {
            const emailResult = await getUserEmail({ userId });
            
            if (emailResult.success && emailResult.email) {
                const notificationResult = await sendDeveloperPublishingNotification({
                    userId,
                    email: emailResult.email,
                    developerData,
                    developerId
                });
                
                if (notificationResult.success) {
                    console.log(`[Developer Publishing] Notification email sent successfully`);
                } else {
                    console.warn(`[Developer Publishing] Failed to send notification: ${notificationResult.message}`);
                }
            } else {
                console.warn(`[Developer Publishing] Could not retrieve user email, skipping notification`);
            }
        } catch (notificationError) {
            // Log but don't fail the workflow
            console.error(`[Developer Publishing] Error sending notification:`, notificationError);
        }
        
        console.log(`[Developer Publishing] Workflow completed successfully`);
        
        // Return success result
        return {
            success: true,
            message: `Developer profile ${action} successfully`,
            data: {
                developerId,
                isUpdate: action === 'updated',
                developer: {
                    developerId: developer.developerId,
                    developerName: developer.developerName,
                    publishStatus: developer.publishStatus,
                    verificationStatus: developer.verificationStatus
                }
            }
        };
        
    } catch (error) {
        console.error(`[Developer Publishing Workflow] Error:`, error);
        
        return {
            success: false,
            message: error.message || 'Failed to publish developer profile',
            error: error.toString()
        };
    }
}

module.exports = {
    developerPublishing
};

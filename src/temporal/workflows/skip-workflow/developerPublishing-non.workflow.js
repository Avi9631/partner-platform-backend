/**
 * Developer Publishing Workflow - Direct Execution (Non-Temporal)
 * 
 * This is the direct execution version of developerPublishing.workflow.js
 * It has the SAME logic but without Temporal's proxyActivities.
 * 
 * MAINTENANCE: Keep this in sync with developerPublishing.workflow.js
 * 
 * @module temporal/workflows/developerPublishing-non.workflow
 */
const logger = require('../../../config/winston.config');

// Import Developer specific activities
const developerActivities = require('../../activities/developerPublishing.activities');

// Combine all activities into a single object
const activities = {
    ...developerActivities,
    // Add more activity imports here if needed
};

/**
 * Developer Publishing Workflow - Direct Execution
 */
async function developerPublishing(workflowInput) {
    const { 
        userId,
        draftId
    } = workflowInput;
    
    logger.info(`[Developer Publishing Workflow] Starting for user ${userId}`);
    
    try {
        // Step 1: Fetch developer data from ListingDraft
        logger.info(`[Developer Publishing] Step 1: Fetching developer data from draft ${draftId}`);
        
        const draftDataResult = await activities.getDeveloperDraftData({ draftId });
        
        if (!draftDataResult.success) {
            logger.error(`[Developer Publishing] Failed to fetch draft data:`, draftDataResult.message);
            return {
                success: false,
                message: draftDataResult.message || 'Failed to fetch developer draft data'
            };
        }
        
        const developerData = draftDataResult.data;
        logger.info(`[Developer Publishing] Developer data fetched successfully`);
        
        // Step 2: Validate developer data
        logger.info(`[Developer Publishing] Step 2: Validating developer data`);
        
        const validationResult = await activities.validateDeveloperData({
            userId,
            draftId,
            developerData,
        });
        
        if (!validationResult.success) {
            logger.error(`[Developer Publishing] Validation failed:`, validationResult.errors);
            return {
                success: false,
                message: 'Validation failed',
                errors: validationResult.errors
            };
        }
        
        logger.info(`[Developer Publishing] Validation successful`);
        
        // Step 3: Check if developer already exists
        logger.info(`[Developer Publishing] Step 3: Checking if developer exists`);
        
        const checkResult = await activities.checkDeveloperExists({ draftId });
        
        if (!checkResult.success) {
            logger.error(`[Developer Publishing] Failed to check developer existence`);
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
            logger.info(`[Developer Publishing] Step 4: Updating existing developer ${checkResult.data.developerId}`);
            
            const updateResult = await activities.updateDeveloperRecord({
                developerId: checkResult.data.developerId,
                userId,
                developerData
            });
            
            if (!updateResult.success) {
                logger.error(`[Developer Publishing] Failed to update developer record`);
                return {
                    success: false,
                    message: updateResult.message || 'Failed to update developer record'
                };
            }
            
            developer = updateResult.data;
            developerId = developer.developerId;
            action = 'updated';
            
        } else {
            logger.info(`[Developer Publishing] Step 4: Creating new developer record`);
            
            const createResult = await activities.createDeveloperRecord({
                userId,
                draftId,
                developerData
            });
            
            if (!createResult.success) {
                logger.error(`[Developer Publishing] Failed to create developer record`);
                return {
                    success: false,
                    message: createResult.message || 'Failed to create developer record'
                };
            }
            
            developer = createResult.data;
            developerId = developer.developerId;
            action = 'created';
        }
        
        logger.info(`[Developer Publishing] Developer record ${action} with ID: ${developerId}`);
        
        // Step 5: Deduct publishing credits
        logger.info(`[Developer Publishing] Step 5: Deducting publishing credits`);
        
        const creditResult = await activities.deductPublishingCredits({
            userId,
            developerId,
            amount: 10
        });
        
        if (!creditResult.success) {
            logger.error(`[Developer Publishing] Failed to deduct credits:`, creditResult.message);
            return {
                success: false,
                message: creditResult.message || 'Failed to deduct publishing credits',
            };
        }
        
        logger.info(`[Developer Publishing] Credits deducted successfully. New balance: ${creditResult.transaction.balanceAfter}`);
        
        // Step 6: Update ListingDraft status to PUBLISHED
        logger.info(`[Developer Publishing] Step 6: Updating ListingDraft status`);
        
        try {
            await activities.updateListingDraftStatus({ draftId });
            logger.info(`[Developer Publishing] ListingDraft status updated to PUBLISHED`);
        } catch (updateError) {
            // Log but don't fail the workflow
            logger.error(`[Developer Publishing] Failed to update ListingDraft status:`, updateError);
        }
        
        // Step 7: Send notification email (final step)
        logger.info(`[Developer Publishing] Step 7: Sending notification email`);
        
        try {
            const emailResult = await activities.getUserEmail({ userId });
            
            if (emailResult.success && emailResult.email) {
                const notificationResult = await activities.sendDeveloperPublishingNotification({
                    userId,
                    email: emailResult.email,
                    developerData,
                    developerId
                });
                
                if (notificationResult.success) {
                    logger.info(`[Developer Publishing] Notification email sent successfully`);
                } else {
                    logger.warn(`[Developer Publishing] Failed to send notification: ${notificationResult.message}`);
                }
            } else {
                logger.warn(`[Developer Publishing] Could not retrieve user email, skipping notification`);
            }
        } catch (notificationError) {
            // Log but don't fail the workflow
            logger.error(`[Developer Publishing] Error sending notification:`, notificationError);
        }
        
        logger.info(`[Developer Publishing] Workflow completed successfully`);
        
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
        logger.error(`[Developer Publishing Workflow] Error:`, error);
        
        return {
            success: false,
            message: error.message || 'Failed to publish developer profile',
            error: error.toString()
        };
    }
}

module.exports = { developerPublishing };

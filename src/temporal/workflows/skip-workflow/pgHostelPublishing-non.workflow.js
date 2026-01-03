/**
 * PG/Colive/Hostel Publishing Workflow - Direct Execution (Non-Temporal)
 * 
 * This is the direct execution version of pgHostelPublishing.workflow.js
 * It has the SAME logic but without Temporal's proxyActivities.
 * 
 * MAINTENANCE: Keep this in sync with pgHostelPublishing.workflow.js
 * 
 * @module temporal/workflows/pgHostelPublishing-non.workflow
 */
const logger = require('../../../config/winston.config');

// Import PG/Hostel specific activities
const pgHostelActivities = require('../../activities/pgHostelPublishing.activities');

// Combine all activities into a single object
const activities = {
    ...pgHostelActivities,
    // Add more activity imports here if needed
};

/**
 * PG/Colive/Hostel Publishing Workflow - Direct Execution
 */
async function pgHostelPublishing(workflowInput) {
    const { 
        userId,
        draftId
    } = workflowInput;
    
    logger.info(`[PG Hostel Publishing Workflow] Starting for user ${userId}, draft ${draftId}`);
    
    try {
        // Step 1: Fetch PG/Hostel data from ListingDraft
        logger.info(`[PG Hostel Publishing] Step 1: Fetching PG/Hostel data from draft ${draftId}`);
        
        const fetchResult = await activities.fetchListingDraftData({
            userId,
            draftId
        });
        
        if (!fetchResult.success) {
            logger.error(`[PG Hostel Publishing] Failed to fetch draft data:`, fetchResult.message);
            return {
                success: false,
                message: fetchResult.message || 'Failed to fetch draft data',
                step: 'fetch'
            };
        }
        
        const pgHostelData = fetchResult.data;
        logger.info(`[PG Hostel Publishing] Draft data fetched successfully`);
        
        // Step 2: Validate PG/Hostel data
        logger.info(`[PG Hostel Publishing] Step 2: Validating PG/Hostel data`);
        
        const validationResult = await activities.validatePgHostelData({
            userId,
            draftId,
            pgHostelData,
        });
        
        if (!validationResult.success) {
            logger.error(`[PG Hostel Publishing] Validation failed:`, validationResult.errors);
            return {
                success: false,
                message: 'PG/Hostel data validation failed',
                errors: validationResult.errors,
                step: 'validation'
            };
        }
        
        logger.info(`[PG Hostel Publishing] Validation passed`);
        
        const isUpdate = validationResult.isUpdate || false;
        const existingPgHostelId = validationResult.existingPgHostelId;
        
        // Step 3: Create or Update PG/Hostel record in database
        logger.info(`[PG Hostel Publishing] Step 3: ${isUpdate ? 'Updating' : 'Creating'} PG/Hostel record`);
        
        let operationResult;
        
        if (isUpdate) {
            // Update existing record
            operationResult = await activities.updatePgHostelRecord({
                pgHostelId: existingPgHostelId,
                userId,
                pgHostelData,
            });
        } else {
            // Create new record
            operationResult = await activities.createPgHostelRecord({
                userId,
                draftId,
                pgHostelData,
            });
        }
        
        if (!operationResult.success) {
            logger.error(`[PG Hostel Publishing] Record ${isUpdate ? 'update' : 'creation'} failed:`, operationResult);
            return {
                success: false,
                message: `Failed to ${isUpdate ? 'update' : 'create'} PG/Hostel record`,
                error: operationResult.message,
                step: isUpdate ? 'update' : 'creation'
            };
        }
        
        logger.info(`[PG Hostel Publishing] Record ${isUpdate ? 'updated' : 'created'}: ${operationResult.data.pgHostelId}`);
        
        const { pgHostelId, slug, propertyName } = operationResult.data;
        
        // Step 4: Deduct publishing credits
        logger.info(`[PG Hostel Publishing] Step 4: Deducting publishing credits`);
        
        const creditResult = await activities.deductPublishingCredits({
            userId,
            pgHostelId,
            amount: 10
        });
        
        if (!creditResult.success) {
            logger.error(`[PG Hostel Publishing] Failed to deduct credits:`, creditResult.message);
            return {
                success: false,
                message: creditResult.message || 'Failed to deduct publishing credits',
            };
        }
        
        logger.info(`[PG Hostel Publishing] Credits deducted successfully. New balance: ${creditResult.transaction.balanceAfter}`);
        
        // Step 5: Update ListingDraft status to PUBLISHED (only for new creations)
        if (!isUpdate) {
            logger.info(`[PG Hostel Publishing] Step 5: Updating ListingDraft status`);
            
            try {
                await activities.updateListingDraftStatus({ draftId });
                logger.info(`[PG Hostel Publishing] ListingDraft status updated to PUBLISHED`);
            } catch (updateError) {
                // Log but don't fail the workflow
                logger.error(`[PG Hostel Publishing] Failed to update ListingDraft status:`, updateError);
            }
        } else {
            logger.info(`[PG Hostel Publishing] Skipping ListingDraft update (update operation)`);
        }
        
        // Step 6: Send notification to user
        logger.info(`[PG Hostel Publishing] Step 6: Sending notification`);
        
        try {
            await activities.sendPgHostelPublishingNotification({
                userId,
                propertyName,
                status: 'success'
            });
        } catch (notificationError) {
            // Log but don't fail the workflow
            logger.error(`[PG Hostel Publishing] Notification failed:`, notificationError);
        }
        
        logger.info(`[PG Hostel Publishing] Workflow completed successfully`);
        
        // Return success result
        return {
            success: true,
            message: `PG/Hostel ${isUpdate ? 'updated' : 'published'} successfully`,
            data: {
                pgHostelId,
                slug,
                propertyName,
                isUpdate,
                publishStatus: 'PENDING_REVIEW',
                verificationStatus: 'PENDING'
            }
        };
        
    } catch (error) {
        logger.error(`[PG Hostel Publishing] Workflow error:`, error);
        
        // Try to send failure notification
        try {
            await activities.sendPgHostelPublishingNotification({
                userId,
                propertyName: pgHostelData.propertyName,
                status: 'failed'
            });
        } catch (notificationError) {
            logger.error(`[PG Hostel Publishing] Failed to send failure notification:`, notificationError);
        }
        
        return {
            success: false,
            message: 'PG/Hostel publishing workflow failed',
            error: error.message,
            step: 'unknown'
        };
    }
}


module.exports = { pgHostelPublishing };

/**
 * Property Publishing Workflow - Direct Execution (Non-Temporal)
 * 
 * This is the direct execution version of propertyPublishing.workflow.js
 * It has the SAME logic but without Temporal's proxyActivities.
 * 
 * MAINTENANCE: Keep this in sync with propertyPublishing.workflow.js
 * 
 * @module temporal/workflows/propertyPublishing-non.workflow
 */
const logger = require('../../../config/winston.config');

// Import Property specific activities
const propertyActivities = require('../../activities/propertyPublishing.activities');

// Combine all activities into a single object
const activities = {
    ...propertyActivities,
    // Add more activity imports here if needed
};

/**
 * Property Publishing Workflow - Direct Execution
 */
async function propertyPublishing(workflowInput) {
    const { 
        userId,
        draftId
    } = workflowInput;
    
    logger.info(`[Property Publishing Workflow] Starting for user ${userId}, draft ${draftId}`);
    
    try {
        // Step 1: Fetch property data from ListingDraft
        logger.info(`[Property Publishing] Step 1: Fetching property data from draft ${draftId}`);
        
        const fetchResult = await activities.fetchListingDraftData({
            userId,
            draftId
        });
        
        if (!fetchResult.success) {
            logger.error(`[Property Publishing] Failed to fetch draft data:`, fetchResult.message);
            return {
                success: false,
                message: fetchResult.message || 'Failed to fetch draft data',
            };
        }
   
        const propertyData = fetchResult.data;
        logger.info(`[Property Publishing] Draft data transformed successfully`);
        
        // Step 3: Validate property data
        logger.info(`[Property Publishing] Step 3: Validating property data`);
        
        const validationResult = await activities.validatePropertyData({
            userId,
            draftId,
            propertyData,
        });
        
        if (!validationResult.success) {
            logger.error(`[Property Publishing] Validation failed:`, validationResult.errors);
            return {
                success: false,
                message: 'Property data validation failed',
                errors: validationResult.errors,
            };
        }
        
        logger.info(`[Property Publishing] Validation successful`);
        
        // Step 4: Check if this is an update or new property
        const existingProperty = validationResult.existingProperty;
        const isUpdate = !!existingProperty;
        
        let propertyResult;
        
        if (isUpdate) {
            // Update existing property
            logger.info(`[Property Publishing] Step 4: Updating existing property ${existingProperty.propertyId}`);
            
            propertyResult = await activities.updatePropertyRecord({
                propertyId: existingProperty.propertyId,
                userId,
                propertyData,
            });
        } else {
            // Create new property
            logger.info(`[Property Publishing] Step 4: Creating new property`);
            
            propertyResult = await activities.createPropertyRecord({
                userId,
                draftId,
                propertyData,
            });
        }
        
        if (!propertyResult.success) {
            logger.error(`[Property Publishing] Failed to ${isUpdate ? 'update' : 'create'} property:`, propertyResult.message);
            return {
                success: false,
                message: propertyResult.message || `Failed to ${isUpdate ? 'update' : 'create'} property`,
            };
        }
        
        const property = propertyResult.data;
        logger.info(`[Property Publishing] Property ${isUpdate ? 'updated' : 'created'} successfully: ${property.propertyId}`);
        
        // Step 5: Deduct publishing credits
        logger.info(`[Property Publishing] Step 5: Deducting publishing credits`);
        
        const creditResult = await activities.deductPublishingCredits({
            userId,
            propertyId: property.propertyId,
            amount: 10
        });
        
        if (!creditResult.success) {
            logger.error(`[Property Publishing] Failed to deduct credits:`, creditResult.message);
            return {
                success: false,
                message: creditResult.message || 'Failed to deduct publishing credits',
            };
        }
        
        logger.info(`[Property Publishing] Credits deducted successfully. New balance: ${creditResult.transaction.balanceAfter}`);
        
        // Step 6: Update draft status
        logger.info(`[Property Publishing] Step 6: Updating draft status`);
        
        await activities.updateListingDraftStatus({
            draftId,
            status: 'PUBLISHED',
        });
        
        logger.info(`[Property Publishing] Draft status updated`);
        
        // Step 7: Send notification
        logger.info(`[Property Publishing] Step 7: Sending notification`);
        
        try {
            await activities.sendPropertyPublishingNotification({
                userId,
                propertyId: property.propertyId,
                propertyName: property.propertyName,
                isUpdate,
            });
            logger.info(`[Property Publishing] Notification sent successfully`);
        } catch (notificationError) {
            logger.error(`[Property Publishing] Failed to send notification:`, notificationError);
            // Don't fail the workflow if notification fails
        }
        
        // Return success result
        logger.info(`[Property Publishing] Workflow completed successfully`);
        return {
            success: true,
            message: `Property ${isUpdate ? 'updated' : 'published'} successfully`,
            data: {
                propertyId: property.propertyId,
                propertyName: property.propertyName,
                isUpdate,
            },
        };
        
    } catch (error) {
        logger.error(`[Property Publishing] Workflow error:`, error);
        return {
            success: false,
            message: error.message || 'Property publishing workflow failed',
            error: error.toString(),
        };
    }
}

module.exports = { propertyPublishing };

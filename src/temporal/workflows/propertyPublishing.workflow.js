/**
 * Property Publishing Workflow
 * 
 * Handles the complete property publishing and verification process.
 * This workflow validates property data, creates the record,
 * performs automated verification checks, and sends notifications.
 * 
 * @module temporal/workflows/propertyPublishing.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');

/** @typedef {import('../../types').WorkflowResult} WorkflowResult */

// Proxy property publishing activities with appropriate timeouts
const {
    fetchListingDraftData,
    validatePropertyData,
    createPropertyRecord,
    updatePropertyRecord,
    sendPropertyPublishingNotification,
    updateListingDraftStatus,
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
 * Property Publishing Workflow
 * 
 * Orchestrates the property publishing process:
 * 1. Fetches property data from ListingDraft entity
 * 2. Validates all property data (property details, metadata, etc.)
 * 3. Creates or updates property record in database
 * 4. Updates draft status
 * 5. Sends notification to user
 * 
 * @param {Object} workflowInput - Workflow input data
 * @param {number} workflowInput.userId - User ID
 * @param {number} workflowInput.draftId - Draft ID (required, ensures one draft = one publish)
 * @returns {Promise<WorkflowResult>} - Workflow result
 * 
 * @example
 * await startWorkflow('propertyPublishing', {
 *   userId: 123,
 *   draftId: 456
 * });
 */
async function propertyPublishing(workflowInput) {
    const { 
        userId,
        draftId
    } = workflowInput;
    
    console.log(`[Property Publishing Workflow] Starting for user ${userId}, draft ${draftId}`);
    
    try {
        // Step 1: Fetch property data from ListingDraft
        console.log(`[Property Publishing] Step 1: Fetching property data from draft ${draftId}`);
        
        const fetchResult = await fetchListingDraftData({
            userId,
            draftId
        });
        
        if (!fetchResult.success) {
            console.error(`[Property Publishing] Failed to fetch draft data:`, fetchResult.message);
            return {
                success: false,
                message: fetchResult.message || 'Failed to fetch draft data',
            };
        }
        
        const propertyData = fetchResult.data;
        console.log(`[Property Publishing] Draft data fetched successfully`);
        
        // Step 2: Validate property data
        console.log(`[Property Publishing] Step 2: Validating property data`);
        
        const validationResult = await validatePropertyData({
            userId,
            draftId,
            propertyData,
        });
        
        if (!validationResult.success) {
            console.error(`[Property Publishing] Validation failed:`, validationResult.errors);
            return {
                success: false,
                message: 'Property data validation failed',
                errors: validationResult.errors,
            };
        }
        
        console.log(`[Property Publishing] Validation successful`);
        
        // Step 3: Check if this is an update or new property
        const existingProperty = validationResult.existingProperty;
        const isUpdate = !!existingProperty;
        
        let propertyResult;
        
        if (isUpdate) {
            // Update existing property
            console.log(`[Property Publishing] Step 3: Updating existing property ${existingProperty.propertyId}`);
            
            propertyResult = await updatePropertyRecord({
                propertyId: existingProperty.propertyId,
                userId,
                propertyData,
            });
        } else {
            // Create new property
            console.log(`[Property Publishing] Step 3: Creating new property`);
            
            propertyResult = await createPropertyRecord({
                userId,
                draftId,
                propertyData,
            });
        }
        
        if (!propertyResult.success) {
            console.error(`[Property Publishing] Failed to ${isUpdate ? 'update' : 'create'} property:`, propertyResult.message);
            return {
                success: false,
                message: propertyResult.message || `Failed to ${isUpdate ? 'update' : 'create'} property`,
            };
        }
        
        const property = propertyResult.data;
        console.log(`[Property Publishing] Property ${isUpdate ? 'updated' : 'created'} successfully: ${property.propertyId}`);
        
        // Step 4: Update draft status
        console.log(`[Property Publishing] Step 4: Updating draft status`);
        
        await updateListingDraftStatus({
            draftId,
            status: 'PUBLISHED',
        });
        
        console.log(`[Property Publishing] Draft status updated`);
        
        // Step 5: Send notification
        console.log(`[Property Publishing] Step 5: Sending notification`);
        
        try {
            await sendPropertyPublishingNotification({
                userId,
                propertyId: property.propertyId,
                propertyName: property.propertyName,
                isUpdate,
            });
            console.log(`[Property Publishing] Notification sent successfully`);
        } catch (notificationError) {
            console.error(`[Property Publishing] Failed to send notification:`, notificationError);
            // Don't fail the workflow if notification fails
        }
        
        // Return success result
        console.log(`[Property Publishing] Workflow completed successfully`);
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
        console.error(`[Property Publishing] Workflow error:`, error);
        return {
            success: false,
            message: error.message || 'Property publishing workflow failed',
            error: error.toString(),
        };
    }
}

module.exports = { propertyPublishing };

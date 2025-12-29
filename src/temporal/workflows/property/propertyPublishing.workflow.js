/**
 * Property Publishing Workflow
 * 
 * Handles the complete property publishing and verification process.
 * This workflow validates property data, creates the record,
 * performs automated verification checks, and sends notifications.
 * 
 * @module temporal/workflows/property/propertyPublishing.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');

/** @typedef {import('../../types').WorkflowResult} WorkflowResult */

// Proxy property publishing activities with appropriate timeouts
const {
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
 * 1. Validates all property data (property details, metadata, etc.)
 * 2. Creates or updates property record in database
 * 3. Updates draft status
 * 4. Sends notification to user
 * 
 * @param {Object} workflowInput - Workflow input data
 * @param {number} workflowInput.userId - User ID
 * @param {number} workflowInput.draftId - Draft ID (required, ensures one draft = one publish)
 * @param {Object} workflowInput.propertyData - Property data
 * @param {string} workflowInput.propertyData.propertyName - Property name (required)
 * @param {number} workflowInput.propertyData.projectId - Project ID (optional)
 * @param {Object} workflowInput.propertyData.propertyDetails - Property details (optional)
 * @param {string} workflowInput.propertyData.status - Property status (optional, default: ACTIVE)
 * @returns {Promise<WorkflowResult>} - Workflow result
 * 
 * @example
 * await startWorkflow('propertyPublishing', {
 *   userId: 123,
 *   draftId: 456,
 *   propertyData: {
 *     propertyName: 'Luxury Apartment 3BHK',
 *     projectId: 789,
 *     propertyDetails: {
 *       area: '1500 sqft',
 *       bedrooms: 3,
 *       bathrooms: 2
 *     },
 *     status: 'ACTIVE'
 *   }
 * });
 */
async function propertyPublishing(workflowInput) {
    const { 
        userId,
        draftId,
        propertyData
    } = workflowInput;
    
    console.log(`[Property Publishing Workflow] Starting for user ${userId}`);
    
    try {
        // Step 1: Validate property data
        console.log(`[Property Publishing] Step 1: Validating property data`);
        
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
        
        // Step 2: Check if this is an update or new property
        const existingProperty = validationResult.existingProperty;
        const isUpdate = !!existingProperty;
        
        let propertyResult;
        
        if (isUpdate) {
            // Update existing property
            console.log(`[Property Publishing] Step 2: Updating existing property ${existingProperty.propertyId}`);
            
            propertyResult = await updatePropertyRecord({
                propertyId: existingProperty.propertyId,
                userId,
                propertyData,
            });
        } else {
            // Create new property
            console.log(`[Property Publishing] Step 2: Creating new property`);
            
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
        
        // Step 3: Update draft status
        console.log(`[Property Publishing] Step 3: Updating draft status`);
        
        await updateListingDraftStatus({
            draftId,
            status: 'PUBLISHED',
        });
        
        console.log(`[Property Publishing] Draft status updated`);
        
        // Step 4: Send notification
        console.log(`[Property Publishing] Step 4: Sending notification`);
        
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

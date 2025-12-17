/**
 * PG/Colive/Hostel Publishing Workflow
 * 
 * Handles the complete PG/Colive/Hostel publishing and verification process.
 * This workflow validates PG/Hostel data, creates the record,
 * performs automated verification checks, and sends notifications.
 * 
 * @module temporal/workflows/pgHostel/pgHostelPublishing.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');

/** @typedef {import('../../types').WorkflowResult} WorkflowResult */

// Proxy PG/Hostel publishing activities with appropriate timeouts
const {
    validatePgHostelData,
    createPgHostelRecord,
    sendPgHostelPublishingNotification,
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
 * PG/Colive/Hostel Publishing Workflow
 * 
 * Orchestrates the PG/Hostel publishing process:
 * 1. Validates all PG/Hostel data (property details, room types, amenities, etc.)
 * 2. Creates PG/Hostel record in database
 * 3. Sends notification to user
 * 
 * @param {Object} workflowInput - Workflow input data
 * @param {number} workflowInput.userId - User ID
 * @param {number} workflowInput.draftId - Draft ID (required, ensures one draft = one publish)
 * @param {Object} workflowInput.pgHostelData - PG/Hostel data
 * @param {string} workflowInput.pgHostelData.propertyName - Property name (required)
 * @param {string} workflowInput.pgHostelData.genderAllowed - Gender allowed (required)
 * @param {string} workflowInput.pgHostelData.description - Description (optional)
 * @param {boolean} workflowInput.pgHostelData.isBrandManaged - Brand managed flag (optional)
 * @param {string} workflowInput.pgHostelData.brandName - Brand name (optional)
 * @param {string} workflowInput.pgHostelData.yearBuilt - Year built (optional)
 * @param {Object} workflowInput.pgHostelData.coordinates - Coordinates {lat, lng} (optional)
 * @param {string} workflowInput.pgHostelData.city - City (optional)
 * @param {string} workflowInput.pgHostelData.locality - Locality (optional)
 * @param {string} workflowInput.pgHostelData.addressText - Full address (optional)
 * @param {string} workflowInput.pgHostelData.landmark - Landmark (optional)
 * @param {Array} workflowInput.pgHostelData.roomTypes - Room types (required)
 * @param {Array} workflowInput.pgHostelData.commonAmenities - Common amenities (optional)
 * @param {Object} workflowInput.pgHostelData.foodMess - Food/mess details (optional)
 * @param {Array} workflowInput.pgHostelData.rules - Rules (optional)
 * @param {Array} workflowInput.pgHostelData.mediaData - Media data (optional)
 * @returns {Promise<WorkflowResult>} - Workflow result
 * 
 * @example
 * await startWorkflow('pgHostelPublishing', {
 *   userId: 123,
 *   draftId: 456,
 *   pgHostelData: {
 *     propertyName: 'Sunrise PG',
 *     genderAllowed: 'Gents',
 *     description: 'Premium PG accommodation...',
 *     city: 'Bangalore',
 *     roomTypes: [...],
 *     commonAmenities: [...]
 *   }
 * });
 */
async function pgHostelPublishing(workflowInput) {
    const { 
        userId,
        draftId,
        pgHostelData
    } = workflowInput;
    
    console.log(`[PG Hostel Publishing Workflow] Starting for user ${userId}`);
    
    try {
        // Step 1: Validate PG/Hostel data
        console.log(`[PG Hostel Publishing] Step 1: Validating PG/Hostel data`);
        
        const validationResult = await validatePgHostelData({
            userId,
            draftId,
            pgHostelData,
        });
        
        if (!validationResult.success) {
            console.error(`[PG Hostel Publishing] Validation failed:`, validationResult.errors);
            return {
                success: false,
                message: 'PG/Hostel data validation failed',
                errors: validationResult.errors,
                step: 'validation'
            };
        }
        
        console.log(`[PG Hostel Publishing] Validation passed`);
        
        // Step 2: Create PG/Hostel record in database
        console.log(`[PG Hostel Publishing] Step 2: Creating PG/Hostel record`);
        
        const creationResult = await createPgHostelRecord({
            userId,
            draftId,
            pgHostelData,
        });
        
        if (!creationResult.success) {
            console.error(`[PG Hostel Publishing] Record creation failed:`, creationResult);
            return {
                success: false,
                message: 'Failed to create PG/Hostel record',
                error: creationResult.message,
                step: 'creation'
            };
        }
        
        console.log(`[PG Hostel Publishing] Record created: ${creationResult.data.pgHostelId}`);
        
        const { pgHostelId, slug, propertyName } = creationResult.data;
        
        // Step 3: Send notification to user
        console.log(`[PG Hostel Publishing] Step 3: Sending notification`);
        
        try {
            await sendPgHostelPublishingNotification({
                userId,
                propertyName,
                status: 'success'
            });
        } catch (notificationError) {
            // Log but don't fail the workflow
            console.error(`[PG Hostel Publishing] Notification failed:`, notificationError);
        }
        
        console.log(`[PG Hostel Publishing] Workflow completed successfully`);
        
        // Return success result
        return {
            success: true,
            message: 'PG/Hostel published successfully',
            data: {
                pgHostelId,
                slug,
                propertyName,
                publishStatus: 'PENDING_REVIEW',
                verificationStatus: 'PENDING'
            }
        };
        
    } catch (error) {
        console.error(`[PG Hostel Publishing] Workflow error:`, error);
        
        // Try to send failure notification
        try {
            await sendPgHostelPublishingNotification({
                userId,
                propertyName: pgHostelData.propertyName,
                status: 'failed'
            });
        } catch (notificationError) {
            console.error(`[PG Hostel Publishing] Failed to send failure notification:`, notificationError);
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

/**
 * PG/Colive/Hostel Publishing Workflow
 * 
 * Handles the complete PG/Colive/Hostel publishing and verification process.
 * This workflow validates PG/Hostel data, creates the record,
 * performs automated verification checks, and sends notifications.
 * 
 * @module temporal/workflows/pgHostelPublishing.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');

/** @typedef {import('../../types').WorkflowResult} WorkflowResult */

// Proxy PG/Hostel publishing activities with appropriate timeouts
const {
    fetchListingDraftData,
    validatePgHostelData,
    createPgHostelRecord,
    updatePgHostelRecord,
    sendPgHostelPublishingNotification,
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
 * PG/Colive/Hostel Publishing Workflow
 * 
 * Orchestrates the PG/Hostel publishing process:
 * 1. Fetches PG/Hostel data from ListingDraft entity
 * 2. Validates all PG/Hostel data (property details, room types, amenities, etc.)
 * 3. Creates or updates PG/Hostel record in database
 * 4. Updates draft status
 * 5. Sends notification to user
 * 
 * @param {Object} workflowInput - Workflow input data
 * @param {number} workflowInput.userId - User ID
 * @param {number} workflowInput.draftId - Draft ID (required, ensures one draft = one publish)
 * @returns {Promise<WorkflowResult>} - Workflow result
 * 
 * @example
 * await startWorkflow('pgHostelPublishing', {
 *   userId: 123,
 *   draftId: 456
 * });
 */
async function pgHostelPublishing(workflowInput) {
    const { 
        userId,
        draftId
    } = workflowInput;
    
    console.log(`[PG Hostel Publishing Workflow] Starting for user ${userId}, draft ${draftId}`);
    
    try {
        // Step 1: Fetch PG/Hostel data from ListingDraft
        console.log(`[PG Hostel Publishing] Step 1: Fetching PG/Hostel data from draft ${draftId}`);
        
        const fetchResult = await fetchListingDraftData({
            userId,
            draftId
        });
        
        if (!fetchResult.success) {
            console.error(`[PG Hostel Publishing] Failed to fetch draft data:`, fetchResult.message);
            return {
                success: false,
                message: fetchResult.message || 'Failed to fetch draft data',
                step: 'fetch'
            };
        }
        
        const pgHostelData = fetchResult.data;
        console.log(`[PG Hostel Publishing] Draft data fetched successfully`);
        
        // Step 2: Validate PG/Hostel data
        console.log(`[PG Hostel Publishing] Step 2: Validating PG/Hostel data`);
        
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
        
        const isUpdate = validationResult.isUpdate || false;
        const existingPgHostelId = validationResult.existingPgHostelId;
        
        // Step 3: Create or Update PG/Hostel record in database
        console.log(`[PG Hostel Publishing] Step 3: ${isUpdate ? 'Updating' : 'Creating'} PG/Hostel record`);
        
        let operationResult;
        
        if (isUpdate) {
            // Update existing record
            operationResult = await updatePgHostelRecord({
                pgHostelId: existingPgHostelId,
                userId,
                pgHostelData,
            });
        } else {
            // Create new record
            operationResult = await createPgHostelRecord({
                userId,
                draftId,
                pgHostelData,
            });
        }
        
        if (!operationResult.success) {
            console.error(`[PG Hostel Publishing] Record ${isUpdate ? 'update' : 'creation'} failed:`, operationResult);
            return {
                success: false,
                message: `Failed to ${isUpdate ? 'update' : 'create'} PG/Hostel record`,
                error: operationResult.message,
                step: isUpdate ? 'update' : 'creation'
            };
        }
        
        console.log(`[PG Hostel Publishing] Record ${isUpdate ? 'updated' : 'created'}: ${operationResult.data.pgHostelId}`);
        
        const { pgHostelId, slug, propertyName } = operationResult.data;
        
        // Step 4: Update ListingDraft status to PUBLISHED (only for new creations)
        if (!isUpdate) {
            console.log(`[PG Hostel Publishing] Step 4: Updating ListingDraft status`);
            
            try {
                await updateListingDraftStatus({ draftId });
                console.log(`[PG Hostel Publishing] ListingDraft status updated to PUBLISHED`);
            } catch (updateError) {
                // Log but don't fail the workflow
                console.error(`[PG Hostel Publishing] Failed to update ListingDraft status:`, updateError);
            }
        } else {
            console.log(`[PG Hostel Publishing] Skipping ListingDraft update (update operation)`);
        }
        
        // Step 5: Send notification to user
        console.log(`[PG Hostel Publishing] Step 5: Sending notification`);
        
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

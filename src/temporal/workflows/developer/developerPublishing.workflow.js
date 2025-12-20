/**
 * Developer Publishing Workflow
 * 
 * Handles the complete developer profile publishing and verification process.
 * This workflow validates developer data, creates the developer record,
 * performs automated verification checks, and sends notifications.
 * 
 * @module temporal/workflows/developer/developerPublishing.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');

/** @typedef {import('../../types').WorkflowResult} WorkflowResult */

// Proxy developer publishing activities with appropriate timeouts
const {
    validateDeveloperData,
    createDeveloperRecord,
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
 * Developer Publishing Workflow
 * 
 * Orchestrates the developer profile publishing process:
 * 1. Validates all developer data (name, type, contact info, projects, etc.)
 * 2. Creates developer record in database
 * 
 * @param {Object} workflowInput - Workflow input data
 * @param {number} workflowInput.userId - User ID
 * @param {number} workflowInput.draftId - Draft ID (required, ensures one draft = one publish)
 * @param {Object} workflowInput.developerData - Developer profile data
 * @param {string} workflowInput.developerData.developerName - Developer/Company name (required)
 * @param {string} workflowInput.developerData.developerType - Type: International/National/Regional (optional)
 * @param {string} workflowInput.developerData.description - Description (optional)
 * @param {number} workflowInput.developerData.establishedYear - Year established (optional)
 * @param {string} workflowInput.developerData.registrationNumber - Registration number (optional)
 * @param {string} workflowInput.developerData.primaryContactEmail - Primary contact email (optional)
 * @param {string} workflowInput.developerData.primaryContactPhone - Primary contact phone (optional)
 * @param {Array} workflowInput.developerData.socialLinks - Social media links (optional)
 * @param {number} workflowInput.developerData.totalProjectsCompleted - Total completed projects (optional)
 * @param {number} workflowInput.developerData.totalProjectsOngoing - Total ongoing projects (optional)
 * @param {number} workflowInput.developerData.totalUnitsDelivered - Total units delivered (optional)
 * @param {Array<string>} workflowInput.developerData.projectTypes - Types of projects (optional)
 * @param {Array<string>} workflowInput.developerData.operatingStates - Operating states (optional)
 * @returns {Promise<WorkflowResult>} - Workflow result
 * 
 * @example
 * await startWorkflow('developerPublishing', {
 *   userId: 123,
 *   developerData: {
 *     developerName: 'Godrej Properties',
 *     developerType: 'National Developer',
 *     description: 'Leading real estate developer in India...',
 *     establishedYear: 1990,
 *     registrationNumber: 'REG123456',
 *     primaryContactEmail: 'contact@godrejproperties.com',
 *     primaryContactPhone: '+919876543210',
 *     socialLinks: [
 *       { type: 'website', url: 'https://godrejproperties.com' },
 *       { type: 'linkedin', url: 'https://linkedin.com/company/godrej' }
 *     ],
 *     totalProjectsCompleted: 150,
 *     totalProjectsOngoing: 25,
 *     totalUnitsDelivered: 50000,
 *     projectTypes: ['Residential', 'Commercial', 'Integrated Township'],
 *     operatingStates: ['Maharashtra', 'Karnataka', 'NCR', 'Tamil Nadu']
 *   }
 * });
 */
async function developerPublishing(workflowInput) {
    const { 
        userId,
        draftId,
        developerData
    } = workflowInput;
    
    console.log(`[Developer Publishing Workflow] Starting for user ${userId}`);
    
    try {
        // Step 1: Validate developer data
        console.log(`[Developer Publishing] Step 1: Validating developer data`);
        
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
        
        // Step 2: Create developer record
        console.log(`[Developer Publishing] Step 2: Creating developer record`);
        
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
        
        const developer = createResult.data;
        const developerId = developer.developerId;
        
        console.log(`[Developer Publishing] Developer record created with ID: ${developerId}`);
        
        // Step 3: Update ListingDraft status to PUBLISHED
        console.log(`[Developer Publishing] Step 3: Updating ListingDraft status`);
        
        try {
            await updateListingDraftStatus({ draftId });
            console.log(`[Developer Publishing] ListingDraft status updated to PUBLISHED`);
        } catch (updateError) {
            // Log but don't fail the workflow
            console.error(`[Developer Publishing] Failed to update ListingDraft status:`, updateError);
        }
        
        console.log(`[Developer Publishing] Workflow completed successfully`);
        
        // Return success result
        return {
            success: true,
            message: 'Developer profile created successfully',
            data: {
                developerId,
                developer: {
                    developerId: developer.developerId,
                    developerName: developer.developerName,
                    developerType: developer.developerType,
                    slug: developer.slug,
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

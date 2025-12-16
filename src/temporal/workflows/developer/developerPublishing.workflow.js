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
    updateDeveloperPublishStatus,
    updateDeveloperVerificationStatus,
    performAutomatedVerification,
    sendDeveloperPublishingNotification,
    logDeveloperEvent,
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
 * 2. Creates developer record in database with PENDING_REVIEW status
 * 3. Performs automated verification checks
 * 4. Updates verification status based on automated checks
 * 5. Logs publishing event for analytics
 * 6. Sends notification email to user
 * 
 * @param {Object} workflowInput - Workflow input data
 * @param {number} workflowInput.userId - User ID
 * @param {Object} workflowInput.developerData - Developer profile data
 * @param {string} workflowInput.developerData.developerName - Developer/Company name
 * @param {string} workflowInput.developerData.developerType - Type: International/National/Regional
 * @param {string} workflowInput.developerData.description - Description (optional)
 * @param {number} workflowInput.developerData.establishedYear - Year established
 * @param {string} workflowInput.developerData.registrationNumber - Registration number (optional)
 * @param {string} workflowInput.developerData.primaryContactEmail - Primary contact email
 * @param {string} workflowInput.developerData.primaryContactPhone - Primary contact phone
 * @param {Array} workflowInput.developerData.socialLinks - Social media links (optional)
 * @param {number} workflowInput.developerData.totalProjectsCompleted - Total completed projects
 * @param {number} workflowInput.developerData.totalProjectsOngoing - Total ongoing projects
 * @param {number} workflowInput.developerData.totalUnitsDelivered - Total units delivered (optional)
 * @param {Array<string>} workflowInput.developerData.projectTypes - Types of projects
 * @param {Array<string>} workflowInput.developerData.operatingStates - Operating states
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
        developerData
    } = workflowInput;
    
    console.log(`[Developer Publishing Workflow] Starting for user ${userId}`);
    
    try {
        // Step 1: Validate developer data
        console.log(`[Developer Publishing] Step 1: Validating developer data`);
        
        const validationResult = await validateDeveloperData({
            userId,
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
        
        // Step 3: Perform automated verification
        console.log(`[Developer Publishing] Step 3: Performing automated verification`);
        
        const verificationResult = await performAutomatedVerification({
            developerId,
            developerData
        });
        
        console.log(`[Developer Publishing] Automated verification completed:`, verificationResult.data);
        
        // Step 4: Update verification status based on automated checks
        console.log(`[Developer Publishing] Step 4: Updating verification status`);
        
        const verificationStatus = verificationResult.data.verificationStatus;
        const verificationNotes = `Automated verification score: ${verificationResult.data.checks.overallScore}/100. ` +
                                  `Requires manual review: ${verificationResult.data.requiresManualReview}`;
        
        await updateDeveloperVerificationStatus({
            developerId,
            status: verificationStatus,
            verifiedBy: 1, // System user ID
            notes: verificationNotes
        });
        
        console.log(`[Developer Publishing] Verification status updated to: ${verificationStatus}`);
        
        // Step 5: Update publish status
        // If automated verification passed, move to APPROVED, otherwise keep in PENDING_REVIEW
        const publishStatus = verificationStatus === 'AUTOMATED_REVIEW' ? 'APPROVED' : 'PENDING_REVIEW';
        
        console.log(`[Developer Publishing] Step 5: Updating publish status to ${publishStatus}`);
        
        await updateDeveloperPublishStatus({
            developerId,
            status: publishStatus,
            notes: verificationNotes
        });
        
        // Step 6: Log publishing event
        console.log(`[Developer Publishing] Step 6: Logging publishing event`);
        
        await logDeveloperEvent({
            userId,
            developerId,
            eventType: 'DEVELOPER_PUBLISHED',
            metadata: {
                developerName: developerData.developerName,
                developerType: developerData.developerType,
                publishStatus,
                verificationStatus,
                automatedVerificationScore: verificationResult.data.checks.overallScore
            }
        });
        
        // Step 7: Send notification email
        console.log(`[Developer Publishing] Step 7: Sending notification email`);
        
        await sendDeveloperPublishingNotification({
            userId,
            email: developerData.primaryContactEmail,
            developerData,
            developerId
        });
        
        console.log(`[Developer Publishing] Workflow completed successfully`);
        
        // Return success result
        return {
            success: true,
            message: 'Developer profile published successfully',
            data: {
                developerId,
                publishStatus,
                verificationStatus,
                requiresManualReview: verificationResult.data.requiresManualReview,
                automatedVerificationScore: verificationResult.data.checks.overallScore,
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

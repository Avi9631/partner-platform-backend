/**
 * Project Publishing Workflow
 * 
 * Handles the complete project publishing and verification process.
 * This workflow validates project data, creates the record,
 * performs automated verification checks, and sends notifications.
 * 
 * @module temporal/workflows/project/projectPublishing.workflow
 */

const { proxyActivities } = require('@temporalio/workflow');

/** @typedef {import('../../types').WorkflowResult} WorkflowResult */

// Proxy project publishing activities with appropriate timeouts
const {
    validateProjectData,
    createProjectRecord,
    updateProjectRecord,
    sendProjectPublishingNotification,
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
 * Project Publishing Workflow
 * 
 * Orchestrates the project publishing process:
 * 1. Validates all project data (project details, metadata, etc.)
 * 2. Creates or updates project record in database
 * 3. Updates draft status (if draft provided)
 * 4. Sends notification to user
 * 
 * @param {Object} workflowInput - Workflow input data
 * @param {number} workflowInput.userId - User ID
 * @param {number} [workflowInput.draftId] - Draft ID (optional)
 * @param {Object} workflowInput.projectData - Project data
 * @param {string} workflowInput.projectData.projectName - Project name (required)
 * @param {Object} workflowInput.projectData.coordinates - Coordinates (optional)
 * @param {Object} workflowInput.projectData.projectDetails - Project details (optional)
 * @param {string} workflowInput.projectData.status - Project status (optional, default: ACTIVE)
 * @returns {Promise<WorkflowResult>} - Workflow result
 * 
 * @example
 * await startWorkflow('projectPublishing', {
 *   userId: 123,
 *   draftId: 456,
 *   projectData: {
 *     projectName: 'Green Valley Residency',
 *     coordinates: { lat: 28.6139, lng: 77.2090 },
 *     projectDetails: {
 *       totalUnits: 500,
 *       totalTowers: 5,
 *       amenities: ['Swimming Pool', 'Gym', 'Club House']
 *     },
 *     status: 'ACTIVE'
 *   }
 * });
 */
async function projectPublishing(workflowInput) {
    const { 
        userId,
        draftId,
        projectData
    } = workflowInput;
    
    console.log(`[Project Publishing Workflow] Starting for user ${userId}`);
    
    try {
        // Step 1: Validate project data
        console.log(`[Project Publishing] Step 1: Validating project data`);
        
        const validationResult = await validateProjectData({
            userId,
            draftId,
            projectData,
        });
        
        if (!validationResult.success) {
            console.error(`[Project Publishing] Validation failed:`, validationResult.errors);
            return {
                success: false,
                message: 'Project data validation failed',
                errors: validationResult.errors,
            };
        }
        
        console.log(`[Project Publishing] Validation successful`);
        
        // Step 2: Check if this is an update or new project
        const existingProject = validationResult.existingProject;
        const isUpdate = !!existingProject;
        
        console.log(`[Project Publishing] Step 2: ${isUpdate ? 'Updating' : 'Creating'} project record`);
        
        let projectResult;
        
        if (isUpdate) {
            // Update existing project
            projectResult = await updateProjectRecord({
                projectId: existingProject.projectId,
                userId,
                projectData,
            });
        } else {
            // Create new project
            projectResult = await createProjectRecord({
                userId,
                draftId: draftId || null,
                projectData,
            });
        }
        
        if (!projectResult.success) {
            console.error(`[Project Publishing] Failed to ${isUpdate ? 'update' : 'create'} project:`, projectResult.message);
            return {
                success: false,
                message: `Failed to ${isUpdate ? 'update' : 'create'} project`,
                error: projectResult.message,
            };
        }
        
        console.log(`[Project Publishing] Project ${isUpdate ? 'updated' : 'created'} successfully:`, projectResult.data.projectId);
        
        // Step 3: Update draft status if draft was provided
        if (draftId) {
            console.log(`[Project Publishing] Step 3: Updating draft status`);
            
            await updateListingDraftStatus({
                draftId,
                status: 'PUBLISHED',
                publishedId: projectResult.data.projectId,
                publishedType: 'PROJECT'
            });
            
            console.log(`[Project Publishing] Draft status updated`);
        }
        
        // Step 4: Send notification to user
        console.log(`[Project Publishing] Step 4: Sending notification`);
        
        await sendProjectPublishingNotification({
            userId,
            projectId: projectResult.data.projectId,
            projectName: projectResult.data.projectName,
            isUpdate,
        });
        
        console.log(`[Project Publishing] Notification sent`);
        
        // Step 5: Return success result
        console.log(`[Project Publishing] Workflow completed successfully`);
        
        return {
            success: true,
            message: `Project ${isUpdate ? 'updated' : 'published'} successfully`,
            data: {
                projectId: projectResult.data.projectId,
                projectName: projectResult.data.projectName,
                status: projectResult.data.status,
                isUpdate,
            },
        };
        
    } catch (error) {
        console.error(`[Project Publishing] Workflow failed:`, error);
        
        return {
            success: false,
            message: 'Project publishing workflow failed',
            error: error.message,
            stack: error.stack,
        };
    }
}

module.exports = {
    projectPublishing,
};
